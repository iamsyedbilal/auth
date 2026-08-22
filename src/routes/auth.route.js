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

const validate = require("../middlewares/validate.middleware");
const {
  signupSchema,
  resendVerificationSchema,
  signinSchema,
  verifyEmailSchema,
} = require("../validators/auth.validator");

const authRouter = express.Router();

authRouter.post("/signup", signupRateLimiter, validate(signupSchema), signup);

authRouter.post(
  "/verify-email",
  authRateLimiter,
  validate(verifyEmailSchema),
  verifyEmail,
);

authRouter.post(
  "/resend-verification",
  authRateLimiter,
  validate(resendVerificationSchema),
  resendVerification,
);

authRouter.get("/sessions", auth, getSessions);

authRouter.delete("/sessions/:sessionId", auth, revokeSession);

authRouter.post("/signin", authRateLimiter, validate(signinSchema), signin);

authRouter.post("/signout", signout);

authRouter.post("/signout-all", auth, signoutAll);

authRouter.post("/refreshToken", refreshRateLimiter, refreshToken);

authRouter.get("/me", auth, getUser);

authRouter.get("/test", auth, authorize("admin"), adminTest);

module.exports = authRouter;
