const mongoose = require("mongoose");

const emailVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      unique: true,
      index: true,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },

    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Automatically remove expired verification records.
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification = mongoose.model(
  "EmailVerification",
  emailVerificationSchema,
);

module.exports = EmailVerification;
