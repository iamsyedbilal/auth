const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const generateOTP = require("../utils/otp");
const sendVerificationEmail = require("../services/email.service");

const Auth = require("../models/auth.model");
const Session = require("../models/session.model");
const EmailVerification = require("../models/email-verification.model");

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const OTP_EXPIRES_IN = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN = 60 * 1000;

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
}

function createAccessToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

function createRefreshToken(userId, sessionId) {
  return jwt.sign(
    {
      id: userId.toString(),
      sessionId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    },
  );
}

function getSessionExpirationDate() {
  return new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
}

/**
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters",
      });
    }

    if (normalizedUsername.length > 30) {
      return res.status(400).json({
        message: "Username must not exceed 30 characters",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    const existingUser = await Auth.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await Auth.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      emailVerified: false,
    });

    const otp = generateOTP();

    const otpHash = await bcrypt.hash(otp, 10);

    await EmailVerification.create({
      user: user._id,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRES_IN),
      attempts: 0,
      lastSentAt: new Date(),
    });

    await sendVerificationEmail(user.email, user.username, otp);

    return res.status(201).json({
      message: "Account created successfully. Please verify your email.",
      email: user.email,
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/auth/signin
 */
async function signin(req, res) {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: "Email/username and password are required",
      });
    }

    const identifier = (username || email).trim().toLowerCase();

    const user = await Auth.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is disabled",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before signing in",
        emailVerified: false,
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const sessionId = crypto.randomUUID();

    const refreshToken = createRefreshToken(user._id, sessionId);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await Session.create({
      user: user._id,
      sessionId,
      refreshTokenHash,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      lastUsedAt: new Date(),
      expiresAt: getSessionExpirationDate(),
    });

    const accessToken = createAccessToken(user);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/auth/signout
 */
async function signout(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );

        await Session.findOneAndUpdate(
          {
            sessionId: decoded.sessionId,
            user: decoded.id,
          },
          {
            revokedAt: new Date(),
          },
        );
      } catch {
        // Invalid/expired refresh tokens are still cleared.
      }
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Signout error:", error);

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      message: "Logged out successfully",
    });
  }
}

/**
 * POST /api/auth/signoutAll
 */
async function signoutAll(req, res) {
  try {
    await Session.updateMany(
      {
        user: req.user.id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      },
    );

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    console.error("Signout all error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/auth/me
 */
async function getUser(req, res) {
  try {
    const user = await Auth.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/auth/refreshToken
 */
async function refreshToken(req, res) {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Invalid or expired refresh token",
      });
    }

    const session = await Session.findOne({
      sessionId: decoded.sessionId,
      user: decoded.id,
    });

    if (!session) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Invalid session",
      });
    }

    /*
     * A revoked session means its refresh token has already
     * been rotated or explicitly revoked.
     *
     * If somebody presents that old token again, treat it as
     * refresh-token reuse.
     */

    if (session.revokedAt) {
      await Session.updateMany(
        {
          user: session.user,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        },
      );

      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Refresh token reuse detected",
      });
    }

    if (session.expiresAt <= new Date()) {
      session.revokedAt = new Date();

      await session.save();

      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Session has expired",
      });
    }

    /*
     * Check that the refresh token presented by the client
     * matches the hash stored for this session.
     */
    const tokenMatches = await bcrypt.compare(
      oldRefreshToken,
      session.refreshTokenHash,
    );

    if (!tokenMatches) {
      /*
       * This token does not belong to the current rotation.
       *
       * Treat it as suspicious and revoke the user's active
       * sessions.
       */
      await Session.updateMany(
        {
          user: session.user,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        },
      );

      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Refresh token reuse detected",
      });
    }

    const user = await Auth.findById(decoded.id);

    if (!user || !user.isActive) {
      session.revokedAt = new Date();
      await session.save();

      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "User is not available",
      });
    }

    /*
     * Generate the new refresh token using the SAME sessionId.
     *
     * This is the important change:
     *
     * Old:
     * session A → revoked
     * session B → created
     *
     * New:
     * session A → refresh hash replaced
     */

    const newRefreshToken = createRefreshToken(user._id, session.sessionId);

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
    /*
     * Atomic update.
     *
     * We include the old hash in the query so two simultaneous
     * refresh requests cannot both successfully rotate the token.
     */
    const updatedSession = await Session.findOneAndUpdate(
      {
        _id: session._id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
      },
      {
        $set: {
          refreshTokenHash: newRefreshTokenHash,
          lastUsedAt: new Date(),
        },
      },
      {
        new: true,
      },
    );

    /*
     * If no document was updated, another request already
     * rotated this token.
     */
    if (!updatedSession) {
      await Session.updateMany(
        {
          user: session.user,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        },
      );

      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Refresh token reuse detected",
      });
    }

    const accessToken = createAccessToken(user);

    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    clearRefreshTokenCookie(res);

    return res.status(401).json({
      message: "Invalid or expired refresh token",
    });
  }
}

/**
 * POST /api/auth/verify-email
 */
async function verifyEmail(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "OTP must be 6 digits",
      });
    }

    const user = await Auth.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid verification request",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const verification = await EmailVerification.findOne({
      user: user._id,
    });

    if (!verification) {
      return res.status(400).json({
        message: "Verification code has expired",
      });
    }

    if (verification.expiresAt < new Date()) {
      await EmailVerification.deleteOne({
        _id: verification._id,
      });

      return res.status(400).json({
        message: "Verification code has expired",
      });
    }

    if (verification.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    const isValidOTP = await bcrypt.compare(otp, verification.otpHash);

    if (!isValidOTP) {
      verification.attempts += 1;

      await verification.save();

      return res.status(400).json({
        message: "Invalid verification code",
        attemptsRemaining: OTP_MAX_ATTEMPTS - verification.attempts,
      });
    }

    user.emailVerified = true;

    await user.save();

    await EmailVerification.deleteOne({
      _id: verification._id,
    });

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/auth/resend-verification
 */
async function resendVerification(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await Auth.findOne({
      email: normalizedEmail,
    });

    /*
     * Don't reveal whether the email exists.
     */
    if (!user) {
      return res.status(200).json({
        message: "If the account exists, a verification code has been sent.",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const existingVerification = await EmailVerification.findOne({
      user: user._id,
    });

    if (
      existingVerification?.lastSentAt &&
      Date.now() - existingVerification.lastSentAt.getTime() <
        OTP_RESEND_COOLDOWN
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another code.",
      });
    }

    const otp = generateOTP();

    const otpHash = await bcrypt.hash(otp, 10);

    await EmailVerification.findOneAndUpdate(
      {
        user: user._id,
      },
      {
        otpHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRES_IN),
        attempts: 0,
        lastSentAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );

    await sendVerificationEmail(user.email, user.username, otp);

    return res.status(200).json({
      message: "If the account exists, a verification code has been sent.",
    });
  } catch (error) {
    console.error("Email resend verification error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/auth/sessions
 */
async function getSessions(req, res) {
  try {
    const sessions = await Session.find({
      user: req.user.id,
      revokedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    })
      .select("sessionId ip userAgent createdAt lastUsedAt expiresAt")
      .sort({
        lastUsedAt: -1,
      })
      .lean();

    const currentRefreshToken = req.cookies.refreshToken;

    let currentSessionId = null;

    /*
     * Identify the current browser/device session.
     */
    if (currentRefreshToken) {
      try {
        const decoded = jwt.verify(
          currentRefreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );

        currentSessionId = decoded.sessionId;
      } catch {
        // Ignore invalid/expired cookie.
      }
    }

    return res.status(200).json({
      sessions: sessions.map((session) => ({
        id: session.sessionId,
        ip: session.ip,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        current: session.sessionId === currentSessionId,
      })),
    });
  } catch (error) {
    console.error("Get sessions error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * DELETE /api/auth/sessions/:sessionId
 */
async function revokeSession(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        message: "Session ID is required",
      });
    }

    const session = await Session.findOne({
      sessionId,
      user: req.user.id,
      revokedAt: null,
    });

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    session.revokedAt = new Date();

    await session.save();

    /*
     * If the user revoked the current session,
     * clear the refresh cookie as well.
     */
    const currentRefreshToken = req.cookies.refreshToken;

    if (currentRefreshToken) {
      try {
        const decoded = jwt.verify(
          currentRefreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );

        if (decoded.sessionId === sessionId) {
          clearRefreshTokenCookie(res);
        }
      } catch {
        clearRefreshTokenCookie(res);
      }
    }

    return res.status(200).json({
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("Revoke session error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

const adminTest = async (req, res) => {
  return res.status(200).json({
    message: "Admin access granted",
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

module.exports = {
  signup,
  verifyEmail,
  signin,
  signout,
  getUser,
  refreshToken,
  signoutAll,
  resendVerification,
  getSessions,
  revokeSession,
  adminTest,
};
