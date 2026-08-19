const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  if (!process.env.DB_NAME) {
    throw new Error("DB_NAME is not defined");
  }

  const connectionString = `${process.env.MONGO_URI}/${process.env.DB_NAME}`;

  const connection = await mongoose.connect(connectionString);

  console.log(`MongoDB connected: ${connection.connection.host}`);
}

module.exports = connectDB;
