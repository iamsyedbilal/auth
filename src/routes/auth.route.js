const express = require("express");

const {
  signup,
  signin,
  signout,
  getUser,
  refreshToken,
  signoutAll,
  verifyEmail,
  resendVerification,
} = require("../controllers/auth.controller");

const auth = require("../middlewares/auth.middleware");

const {
  authRateLimiter,
  signupRateLimiter,
  refreshRateLimiter,
} = require("../middlewares/rate-limit.middleware");

const authRouter = express.Router();

authRouter.post("/signup", signupRateLimiter, signup);

authRouter.post("/verify-email", authRateLimiter, verifyEmail);

authRouter.post("/resend-verification", authRateLimiter, resendVerification);

authRouter.post("/signin", authRateLimiter, signin);

authRouter.post("/signout", signout);

authRouter.post("/signout-all", auth, signoutAll);

authRouter.post("/refreshToken", refreshRateLimiter, refreshToken);

authRouter.get("/me", auth, getUser);

module.exports = authRouter;
