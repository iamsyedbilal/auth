const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const Auth = require("../models/auth.model");
const Session = require("../models/session.model");

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
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
    });

    const sessionId = crypto.randomUUID();

    const refreshToken = createRefreshToken(user._id, sessionId);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await Session.create({
      user: user._id,
      sessionId,
      refreshTokenHash,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      expiresAt: getSessionExpirationDate(),
    });

    const accessToken = createAccessToken(user);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      message: "User created successfully",
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
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

    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

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

    if (session.revokedAt) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Session has been revoked",
      });
    }

    if (session.expiresAt < new Date()) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Session has expired",
      });
    }

    const tokenMatches = await bcrypt.compare(
      oldRefreshToken,
      session.refreshTokenHash,
    );

    if (!tokenMatches) {
      session.revokedAt = new Date();
      await session.save();

      clearRefreshTokenCookie(res);

      return res.status(401).json({
        message: "Invalid refresh token",
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

    // Rotate refresh token.
    session.revokedAt = new Date();
    await session.save();

    const newSessionId = crypto.randomUUID();

    const newRefreshToken = createRefreshToken(user._id, newSessionId);

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);

    await Session.create({
      user: user._id,
      sessionId: newSessionId,
      refreshTokenHash: newRefreshTokenHash,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      expiresAt: getSessionExpirationDate(),
    });

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

module.exports = {
  signup,
  signin,
  signout,
  getUser,
  refreshToken,
};
