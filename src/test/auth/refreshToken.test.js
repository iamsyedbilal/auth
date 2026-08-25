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

describe("POST /api/auth/refreshToken", () => {
  let user;
  let refreshToken;
  let sessionId;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    user = await Auth.create({
      username: `refresh${Date.now()}`,
      email: `refresh-${crypto.randomUUID()}@example.com`,
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
      { expiresIn: "7d" },
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

  it("should refresh the access token with a valid refresh token", async () => {
    const response = await request(app)
      .post("/api/auth/refreshToken")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Access token refreshed successfully",
    );
    expect(response.body).toHaveProperty("accessToken");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")]),
    );
  });

  it("should reject the request when refresh token is missing", async () => {
    const response = await request(app).post("/api/auth/refreshToken");

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("should reject an invalid refresh token", async () => {
    const response = await request(app)
      .post("/api/auth/refreshToken")
      .set("Cookie", ["refreshToken=invalid-token"]);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid or expired refresh token",
    });
  });

  it("should reject a refresh token with an invalid session", async () => {
    const invalidSessionToken = jwt.sign(
      {
        id: user._id.toString(),
        sessionId: crypto.randomUUID(),
        jti: crypto.randomUUID(),
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    const response = await request(app)
      .post("/api/auth/refreshToken")
      .set("Cookie", [`refreshToken=${invalidSessionToken}`]);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid session",
    });
  });

  it("should reject a revoked session", async () => {
    await Session.updateOne(
      { sessionId },
      { revokedAt: new Date() },
    );

    const response = await request(app)
      .post("/api/auth/refreshToken")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: "Refresh token reuse detected",
    });
  });

  it("should rotate the refresh token", async () => {
    const response = await request(app)
      .post("/api/auth/refreshToken")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(response.statusCode).toBe(200);

    const cookie = response.headers["set-cookie"].find((value) =>
      value.startsWith("refreshToken="),
    );

    expect(cookie).toBeDefined();

    const newRefreshToken = cookie
      .split(";")[0]
      .replace("refreshToken=", "");

    expect(newRefreshToken).not.toBe(refreshToken);

    const session = await Session.findOne({
      sessionId,
      user: user._id,
    }).lean();

    expect(session).toBeTruthy();
    expect(
      await bcrypt.compare(newRefreshToken, session.refreshTokenHash),
    ).toBe(true);
    expect(
      await bcrypt.compare(refreshToken, session.refreshTokenHash),
    ).toBe(false);
  });

  it("should reject the old refresh token after rotation", async () => {
    const oldRefreshToken = refreshToken;

    const firstResponse = await request(app)
      .post("/api/auth/refreshToken")
      .set("Cookie", [`refreshToken=${oldRefreshToken}`]);

    expect(firstResponse.statusCode).toBe(200);

    const cookie = firstResponse.headers["set-cookie"].find((value) =>
      value.startsWith("refreshToken="),
    );

    expect(cookie).toBeDefined();

    const newRefreshToken = cookie
      .split(";")[0]
      .replace("refreshToken=", "");

    expect(newRefreshToken).not.toBe(oldRefreshToken);

    const session = await Session.findOne({
      sessionId,
      user: user._id,
    });

    expect(session).toBeTruthy();
    expect(
      await bcrypt.compare(newRefreshToken, session.refreshTokenHash),
    ).toBe(true);
    expect(
      await bcrypt.compare(oldRefreshToken, session.refreshTokenHash),
    ).toBe(false);

    const secondResponse = await request(app)
      .post("/api/auth/refreshToken")
      .set("Cookie", [`refreshToken=${oldRefreshToken}`]);

    expect(secondResponse.statusCode).toBe(401);
    expect(secondResponse.body).toEqual({
      message: "Refresh token reuse detected",
    });
  });
});
