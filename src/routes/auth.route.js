const express = require("express");

const {
  signup,
  signin,
  signout,
  getUser,
  refreshToken,
} = require("../controllers/auth.controller");

const auth = require("../middlewares/auth.middleware");

const {
  authRateLimiter,
  signupRateLimiter,
  refreshRateLimiter,
} = require("../middlewares/rate-limit.middleware");

const authRouter = express.Router();

authRouter.post("/signup", signupRateLimiter, signup);

authRouter.post("/signin", authRateLimiter, signin);

authRouter.post("/signout", signout);

authRouter.post("/refreshToken", refreshRateLimiter, refreshToken);

authRouter.get("/me", auth, getUser);

module.exports = authRouter;
