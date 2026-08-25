jest.mock("../../services/email.service.js", () => {
  return jest.fn().mockResolvedValue({
    id: "test-email-id",
  });
});

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
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    user = await Auth.create({
      username: `signout-${suffix}`,
      email: `signout-${crypto.randomUUID()}@example.com`,
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

    const activeSessions = await Session.countDocuments({
      user: user._id,
      revokedAt: null,
    });

    expect(activeSessions).toBe(0);
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

    const sessionsAfter = await Session.find({ user: user._id });

    expect(sessionsAfter).toHaveLength(2);
    expect(sessionsAfter.every((session) => session.revokedAt)).toBe(true);
  });
});
