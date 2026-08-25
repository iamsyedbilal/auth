const request = require("supertest");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = require("../../app");
const Auth = require("../../models/auth.model");
const Session = require("../../models/session.model");

describe("POST /api/auth/signout-all", () => {
  let user;
  const password = "Password123";

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(password, 10);

    user = await Auth.create({
      username: `signoutall-${crypto.randomUUID()}`,
      email: `signoutall-${crypto.randomUUID()}@example.com`,
      password: passwordHash,
      emailVerified: true,
      isActive: true,
      role: "user",
    });
  });

  it("should reject the request without authentication", async () => {
    const response = await request(app).post("/api/auth/signout-all");

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("should revoke all active sessions", async () => {
    const firstSignin = await request(app).post("/api/auth/signin").send({
      email: user.email,
      password,
    });

    const secondSignin = await request(app).post("/api/auth/signin").send({
      email: user.email,
      password,
    });

    expect(firstSignin.statusCode).toBe(200);
    expect(secondSignin.statusCode).toBe(200);

    const response = await request(app)
      .post("/api/auth/signout-all")
      .set("Authorization", `Bearer ${firstSignin.body.accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "Logged out from all devices successfully",
    });

    const sessions = await Session.find({ user: user._id });

    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.revokedAt)).toBe(true);
  });

  it("should revoke every session, not only the current device", async () => {
    const firstSignin = await request(app).post("/api/auth/signin").send({
      email: user.email,
      password,
    });

    const secondSignin = await request(app).post("/api/auth/signin").send({
      email: user.email,
      password,
    });

    expect(firstSignin.statusCode).toBe(200);
    expect(secondSignin.statusCode).toBe(200);

    const sessionsBefore = await Session.find({ user: user._id });
    expect(sessionsBefore).toHaveLength(2);

    const response = await request(app)
      .post("/api/auth/signout-all")
      .set("Authorization", `Bearer ${secondSignin.body.accessToken}`);

    expect(response.statusCode).toBe(200);

    const activeSessions = await Session.countDocuments({
      user: user._id,
      revokedAt: null,
    });

    expect(activeSessions).toBe(0);
  });
});
