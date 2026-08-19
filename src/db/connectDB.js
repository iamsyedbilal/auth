const mongoose = require("mongoose");

async function connectDB() {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${process.env.DB_NAME}`,
    );

    console.log(
      `server connected to the ${connectionInstance.connection.host}`,
    );
  } catch (error) {
    console.log(`mongodb connection failed ${error}`);
    process.exit(1);
  }
}

module.exports = connectDB;
