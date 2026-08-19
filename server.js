require("dotenv").config({ quiet: true });
const connectDB = require("./src/db/connectDB");
const app = require("./src/app");

const PORT = process.env.PORT || 3001;

connectDB()
  .then(() => {
    app.listen(PORT, function () {
      console.log(`app is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log(`Error while connecting to the DB ${error}`);
  });
