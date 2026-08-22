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
  getSessions,
  revokeSession,
  adminTest,
} = require("../controllers/auth.controller");

const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  authRateLimiter,
  signupRateLimiter,
  refreshRateLimiter,
} = require("../middlewares/rate-limit.middleware");

const authRouter = express.Router();

authRouter.post("/signup", signupRateLimiter, signup);

authRouter.post("/verify-email", authRateLimiter, verifyEmail);

authRouter.post("/resend-verification", authRateLimiter, resendVerification);

authRouter.get("/sessions", auth, getSessions);

authRouter.delete("/sessions/:sessionId", auth, revokeSession);

authRouter.post("/signin", authRateLimiter, signin);

authRouter.post("/signout", signout);

authRouter.post("/signout-all", auth, signoutAll);

authRouter.post("/refreshToken", refreshRateLimiter, refreshToken);

authRouter.get("/me", auth, getUser);

authRouter.get("/test", auth, authorize("admin"), adminTest);

module.exports = authRouter;
