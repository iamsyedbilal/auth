require("dotenv").config({ quiet: true });

const connectDB = require("./src/db/connectDB");
const app = require("./src/app");

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
