const rateLimit = require("express-rate-limit");

const createRateLimiter = ({ windowMs, limit, message }) => {
  return rateLimit({
    windowMs,
    limit,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
      message,
    },

    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    },
  });
};

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many authentication attempts. Please try again later.",
});

const signupRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many signup attempts. Please try again later.",
});

const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many refresh attempts. Please try again later.",
});

module.exports = {
  authRateLimiter,
  signupRateLimiter,
  refreshRateLimiter,
};
