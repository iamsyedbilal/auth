jest.mock("../../services/email.service.js", () => {
  return jest.fn().mockResolvedValue({
    id: "test-email-id",
  });
});

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../app");

const Auth = require("../../models/auth.model");

describe("POST /api/auth/signin", () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    await Auth.create({
      username: "signinuser",
      email: "signin@example.com",
      password: passwordHash,
      emailVerified: true,
      isActive: true,
      role: "user",
    });
  });

  it("should login with valid credentials", async () => {
    const response = await request(app).post("/api/auth/signin").send({
      email: "signin@example.com",
      password: "Password123",
    });

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("message");
  });

  it("should reject an invalid email", async () => {
    const response = await request(app).post("/api/auth/signin").send({
      email: "not-an-email",
      password: "Password123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });

  it("should reject a wrong password", async () => {
    const response = await request(app).post("/api/auth/signin").send({
      email: "signin@example.com",
      password: "WrongPassword123",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should reject a non-existent user", async () => {
    const response = await request(app).post("/api/auth/signin").send({
      email: "doesnotexist@example.com",
      password: "Password123",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should reject an unverified email", async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    await Auth.create({
      username: "unverifieduser",
      email: "unverified@example.com",
      password: passwordHash,
      isEmailVerified: false,
    });

    const response = await request(app).post("/api/auth/signin").send({
      email: "unverified@example.com",
      password: "Password123",
    });

    expect(response.statusCode).toBe(403);
  });
});
