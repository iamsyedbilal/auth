import { useState } from "react";
import type React from "react";
import { Link } from "react-router";
import "./VerifyEmailForm.css";

export default function VerifyEmailForm() {
  const [otp, setOtp] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // UI only for now.
  };

  const handleOtpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 6);

    setOtp(value);
  };

  return (
    <div className="verify-email-form">
      <div className="verify-email-form__header">
        <h2>Verify your email</h2>

        <p>
          We've sent a 6-digit verification code to your email address. Enter it
          below to verify your account.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="verify-email-form__field">
          <label htmlFor="otp">Verification code</label>

          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={otp}
            onChange={handleOtpChange}
            maxLength={6}
            aria-describedby="otp-hint"
          />

          <span id="otp-hint" className="verify-email-form__hint">
            Enter the 6-digit code from your email.
          </span>
        </div>

        <button
          type="submit"
          className="verify-email-form__submit"
          disabled={otp.length !== 6}
        >
          Verify email
        </button>
      </form>

      <div className="verify-email-form__resend">
        <span>Didn't receive the code?</span>

        <button type="button">Resend code</button>
      </div>

      <div className="verify-email-form__back">
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
