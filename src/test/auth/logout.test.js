jest.mock("../../services/email.service.js", () => {
  return jest.fn().mockResolvedValue({
    id: "test-email-id",
  });
});

const request = require("supertest");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = require("../../app");

const Auth = require("../../models/auth.model");
const Session = require("../../models/session.model");

describe("POST /api/auth/signout", () => {
  let user;
  let sessionId;
  let refreshToken;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    user = await Auth.create({
      username: `logout${Date.now()}`,
      email: `logout-${crypto.randomUUID()}@example.com`,
      password: passwordHash,
      emailVerified: true,
      isActive: true,
      role: "user",
    });

    sessionId = crypto.randomUUID();

    refreshToken = jwt.sign(
      {
        id: user._id.toString(),
        sessionId,
        jti: crypto.randomUUID(),
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await Session.create({
      user: user._id,
      sessionId,
      refreshTokenHash,
      ip: "127.0.0.1",
      userAgent: "Jest",
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  });

  it("should logout successfully and revoke the current session", async () => {
    const response = await request(app)
      .post("/api/auth/signout")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      message: "Logged out successfully",
    });

    const session = await Session.findOne({ sessionId });

    expect(session).toBeTruthy();
    expect(session.revokedAt).toBeTruthy();
  });

  it("should clear the refresh token cookie", async () => {
    const response = await request(app)
      .post("/api/auth/signout")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(response.statusCode).toBe(200);

    const cookies = response.headers["set-cookie"];

    expect(cookies).toBeDefined();

    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/Max-Age=0|Expires=/i);
  });

  it("should logout successfully when no refresh token is present", async () => {
    const response = await request(app).post("/api/auth/signout");

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      message: "Logged out successfully",
    });
  });

  it("should still clear the cookie when the refresh token is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/signout")
      .set("Cookie", ["refreshToken=invalid-refresh-token"]);

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      message: "Logged out successfully",
    });

    const cookies = response.headers["set-cookie"];

    expect(cookies).toBeDefined();

    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/Max-Age=0|Expires=/i);
  });
});

describe("POST /api/auth/signout-all", () => {
  let user;
  let accessToken;
  let sessionIds;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    user = await Auth.create({
      username: `logoutall${Date.now()}`,
      email: `logoutall-${crypto.randomUUID()}@example.com`,
      password: passwordHash,
      emailVerified: true,
      isActive: true,
      role: "user",
    });

    accessToken = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      },
    );

    sessionIds = [];

    for (let i = 0; i < 3; i++) {
      const sessionId = crypto.randomUUID();

      sessionIds.push(sessionId);

      const refreshToken = jwt.sign(
        {
          id: user._id.toString(),
          sessionId,
          jti: crypto.randomUUID(),
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "7d",
        },
      );

      const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

      await Session.create({
        user: user._id,
        sessionId,
        refreshTokenHash,
        ip: `127.0.0.${i + 1}`,
        userAgent: `Device ${i + 1}`,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }
  });

  it("should logout the user from all devices", async () => {
    const response = await request(app)
      .post("/api/auth/signout-all")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      message: "Logged out from all devices successfully",
    });

    const sessions = await Session.find({
      user: user._id,
    });

    expect(sessions).toHaveLength(3);

    for (const session of sessions) {
      expect(session.revokedAt).toBeTruthy();
    }
  });

  it("should reject logout-all without authentication", async () => {
    const response = await request(app).post("/api/auth/signout-all");

    expect(response.statusCode).toBe(401);

    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("should clear the current refresh token cookie", async () => {
    const response = await request(app)
      .post("/api/auth/signout-all")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", ["refreshToken=dummy-refresh-token"]);

    expect(response.statusCode).toBe(200);

    const cookies = response.headers["set-cookie"];

    expect(cookies).toBeDefined();

    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/Max-Age=0|Expires=/i);
  });

  it("should not revoke another user's sessions", async () => {
    const otherUserPasswordHash = await bcrypt.hash("Password123", 10);

    const otherUser = await Auth.create({
      username: `otherlogout${Date.now()}`,
      email: `otherlogout-${crypto.randomUUID()}@example.com`,
      password: otherUserPasswordHash,
      emailVerified: true,
      isActive: true,
      role: "user",
    });

    const otherSessionId = crypto.randomUUID();

    const otherRefreshToken = jwt.sign(
      {
        id: otherUser._id.toString(),
        sessionId: otherSessionId,
        jti: crypto.randomUUID(),
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const otherRefreshTokenHash = await bcrypt.hash(otherRefreshToken, 12);

    await Session.create({
      user: otherUser._id,
      sessionId: otherSessionId,
      refreshTokenHash: otherRefreshTokenHash,
      ip: "10.0.0.1",
      userAgent: "Other User",
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post("/api/auth/signout-all")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);

    const otherSession = await Session.findOne({
      sessionId: otherSessionId,
    });

    expect(otherSession.revokedAt).toBeFalsy();
  });
});
