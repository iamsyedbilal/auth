require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const connectDB = require("../db/connectDB");

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});
