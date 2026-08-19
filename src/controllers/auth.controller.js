// Import required dependencies
const express = require("express");
const Auth = require("../models/auth.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Session = require("../models/session.model");

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refreshToken",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function signup(req, res) {
  try {
    const { username, email, password } = req.body;

    const requiredFields = [
      { field: "username", message: "Username is required" },
      { field: "email", message: "Email is required" },
      { field: "password", message: "Password is required" },
    ];

    for (const { field, message } of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message });
      }
    }

    const isUserRegistered = await Auth.findOne({
      $or: [{ username }, { email }],
    });

    if (isUserRegistered) {
      return res.status(409).json({ message: "User is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await Auth.create({
      username,
      email,
      password: hashedPassword,
    });

    if (!user) {
      return res.status(400).json({ message: "user not created" });
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      },
    );

    // Create unique session ID
    const sessionId = crypto.randomUUID();

    // Create refresh token
    const refreshToken = jwt.sign(
      { id: user._id, sessionId },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Hash refresh token before storing it
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Save session
    await Session.create({
      user: user._id,
      sessionId,
      refreshTokenHash,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Send refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      message: `User created successfully ${user.username}`,
      accessToken,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function signin(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username && !email) {
      return res.status(400).json({ message: "Username or email is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const isUserRegistered = await Auth.findOne({
      $or: [{ username }, { email }],
    });

    if (!isUserRegistered) {
      return res.status(400).json({ message: "User is not registered" });
    }

    const comparePassword = await bcrypt.compare(
      password,
      isUserRegistered.password,
    );

    if (!comparePassword) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const accessToken = jwt.sign(
      { id: isUserRegistered._id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      },
    );

    const sessionId = crypto.randomUUID();

    const refreshToken = jwt.sign(
      { id: isUserRegistered._id, sessionId },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await Session.create({
      user: isUserRegistered._id,
      sessionId,
      refreshTokenHash,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({ message: `Something went wrong ${error}` });
  }
}

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
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
      } catch (error) {
        // Token is invalid/expired.
        // We still clear the cookie.
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refreshToken",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * Get user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUser(req, res) {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

/**
 * Refresh authentication token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function refreshToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token not found",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the session
    const session = await Session.findOne({
      sessionId: decoded.sessionId,
      user: decoded.id,
    });

    if (!session) {
      return res.status(401).json({
        message: "Invalid session",
      });
    }

    // Check if session was revoked
    if (session.revokedAt) {
      return res.status(401).json({
        message: "Session has been revoked",
      });
    }

    // Check session expiration
    if (session.expiresAt < new Date()) {
      return res.status(401).json({
        message: "Session has expired",
      });
    }

    // Compare refresh token with stored hash
    const isValidRefreshToken = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isValidRefreshToken) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    // Revoke old session
    session.revokedAt = new Date();
    await session.save();

    const accessToken = jwt.sign(
      {
        id: decoded.id,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      },
    );

    // Create new session
    const newSessionId = crypto.randomUUID();

    const newRefreshToken = jwt.sign(
      {
        id: decoded.id,
        sessionId: newSessionId,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Hash new refresh token
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    // Save new session
    await Session.create({
      user: decoded.id,
      sessionId: newSessionId,
      refreshTokenHash: newRefreshTokenHash,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Send new refresh token
    setRefreshTokenCookie(res, newRefreshToken);

    res
      .status(200)
      .json({ message: "Access token refreshed successfully", accessToken });
  } catch (error) {
    console.error(error);

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
