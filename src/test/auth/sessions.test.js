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

describe("Session management", () => {
  let user;
  let accessToken;
  let sessionId;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    user = await Auth.create({
      username: `session${Date.now()}`,
      email: `session-${crypto.randomUUID()}@example.com`,
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

    sessionId = crypto.randomUUID();

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
      ip: "127.0.0.1",
      userAgent: "Jest",
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  });

  describe("GET /api/auth/sessions", () => {
    it("should return the authenticated user's active sessions", async () => {
      const response = await request(app)
        .get("/api/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(200);

      expect(response.body).toHaveProperty("sessions");
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions).toHaveLength(1);

      expect(response.body.sessions[0]).toMatchObject({
        id: sessionId,
        ip: "127.0.0.1",
        userAgent: "Jest",
        current: false,
      });
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).get("/api/auth/sessions");

      expect(response.statusCode).toBe(401);

      expect(response.body).toEqual({
        message: "Authentication required",
      });
    });

    it("should return multiple active sessions for the same user", async () => {
      const secondSessionId = crypto.randomUUID();

      const secondRefreshToken = jwt.sign(
        {
          id: user._id.toString(),
          sessionId: secondSessionId,
          jti: crypto.randomUUID(),
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "7d",
        },
      );

      const secondRefreshTokenHash = await bcrypt.hash(secondRefreshToken, 12);

      await Session.create({
        user: user._id,
        sessionId: secondSessionId,
        refreshTokenHash: secondRefreshTokenHash,
        ip: "192.168.1.10",
        userAgent: "Second Device",
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get("/api/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.sessions).toHaveLength(2);

      const sessionIds = response.body.sessions.map((session) => session.id);

      expect(sessionIds).toEqual(
        expect.arrayContaining([sessionId, secondSessionId]),
      );
    });

    it("should not return revoked sessions", async () => {
      await Session.updateOne(
        { sessionId },
        {
          revokedAt: new Date(),
        },
      );

      const response = await request(app)
        .get("/api/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.sessions).toHaveLength(0);
    });

    it("should not return expired sessions", async () => {
      await Session.updateOne(
        { sessionId },
        {
          expiresAt: new Date(Date.now() - 1000),
        },
      );

      const response = await request(app)
        .get("/api/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.sessions).toHaveLength(0);
    });
  });

  describe("DELETE /api/auth/sessions/:sessionId", () => {
    it("should revoke the authenticated user's session", async () => {
      const response = await request(app)
        .delete(`/api/auth/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(200);

      expect(response.body).toEqual({
        message: "Session revoked successfully",
      });

      const session = await Session.findOne({ sessionId });

      expect(session).toBeTruthy();
      expect(session.revokedAt).toBeTruthy();
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).delete(
        `/api/auth/sessions/${sessionId}`,
      );

      expect(response.statusCode).toBe(401);

      expect(response.body).toEqual({
        message: "Authentication required",
      });
    });

    it("should return 404 for a non-existent session", async () => {
      const response = await request(app)
        .delete(`/api/auth/sessions/${crypto.randomUUID()}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(404);

      expect(response.body).toEqual({
        message: "Session not found",
      });
    });

    it("should not allow a user to revoke another user's session", async () => {
      const otherUserPasswordHash = await bcrypt.hash("Password123", 10);

      const otherUser = await Auth.create({
        username: `other${Date.now()}`,
        email: `other-${crypto.randomUUID()}@example.com`,
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
        .delete(`/api/auth/sessions/${otherSessionId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(404);

      expect(response.body).toEqual({
        message: "Session not found",
      });

      const session = await Session.findOne({
        sessionId: otherSessionId,
      });

      expect(session.revokedAt).toBeFalsy();
    });
  });
});
