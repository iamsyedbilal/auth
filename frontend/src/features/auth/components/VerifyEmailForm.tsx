import { useState } from "react";
import type React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useVerifyEmail } from "../hooks/useVerifyEmail";
import { useResendVerification } from "../hooks/useResendVerification";
import "./VerifyEmailForm.css";

interface LocationState {
  email?: string;
}

export default function VerifyEmailForm() {
  const [otp, setOtp] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  const email = (location.state as LocationState | null)?.email;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || otp.length !== 6) {
      return;
    }

    verifyMutation.mutate(
      { email, otp },
      {
        onSuccess: () => {
          navigate("/login");
        },
      },
    );
  };

  const handleResend = () => {
    if (!email) {
      return;
    }

    resendMutation.mutate({ email });
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
        {verifyMutation.isError && (
          <p className="verify-email-form__error" role="alert">
            {verifyMutation.error.message}
          </p>
        )}
        {resendMutation.isSuccess && (
          <p className="verify-email-form__success" role="status">
            {resendMutation.data.message}
          </p>
        )}
        {resendMutation.isError && (
          <p className="verify-email-form__error" role="alert">
            {resendMutation.error.message}
          </p>
        )}
        <button
          type="submit"
          className="verify-email-form__submit"
          disabled={!email || otp.length !== 6 || verifyMutation.isPending}
        >
          {verifyMutation.isPending ? "Verifying..." : "Verify email"}{" "}
        </button>
      </form>

      <div className="verify-email-form__resend">
        <span>Didn't receive the code?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={!email || resendMutation.isPending}
        >
          {resendMutation.isPending ? "Sending..." : "Resend code"}{" "}
        </button>{" "}
      </div>

      <div className="verify-email-form__back">
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
