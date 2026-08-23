const request = require("supertest");
const app = require("../../app");

describe("POST /api/auth/signup", () => {
  it("should create a new user with valid data", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        username: "testuser",
        email: `test-${Date.now()}@example.com`,
        password: "Password123",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body).toHaveProperty("message");
  });

  it("should reject an invalid email", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      username: "testuser",
      email: "not-an-email",
      password: "Password123",
    });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe("Validation failed");
  });

  it("should reject a weak password", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        username: "testuser",
        email: `test-${Date.now()}@example.com`,
        password: "123",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe("Validation failed");
  });

  it("should reject a missing username", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        email: `test-${Date.now()}@example.com`,
        password: "Password123",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe("Validation failed");
  });
});
