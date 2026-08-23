require("dotenv").config({
  path: ".env.test",
  quiet: true,
});

const mongoose = require("mongoose");
const connectDB = require("../db/connectDB");

beforeAll(async () => {
  await connectDB();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
