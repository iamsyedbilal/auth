const express = require("express");
const {
  signin,
  signup,
  signout,
  getUser,
  refreshToken,
} = require("../controllers/auth.controller");
const auth = require("../middlewares/auth.middleware");

const authRouter = express.Router();

// Signup route
authRouter.post("/signup", signup);

// Signin route
authRouter.post("/signin", signin);

// Signout route
authRouter.post("/signout", signout);

// Get User route
authRouter.get("/me", auth, getUser);

// Refresh Token
authRouter.post("/refreshToken", refreshToken);

module.exports = authRouter;
