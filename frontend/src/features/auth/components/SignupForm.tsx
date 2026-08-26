import { useState } from "react";
import type React from "react";
import { Link } from "react-router";
import "./SignupForm.css";

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // UI only for now.
    console.log("Signup submitted");
  };

  return (
    <div className="signup-form">
      <div className="signup-form__header">
        <h2>Create your account</h2>
        <p>Start your journey with a secure account.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="signup-form__field">
          <label htmlFor="username">Username</label>

          <input
            id="username"
            name="username"
            type="text"
            placeholder="Enter your username"
            autoComplete="username"
          />
        </div>

        <div className="signup-form__field">
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="signup-form__field">
          <label htmlFor="password">Password</label>

          <div className="signup-form__password">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              autoComplete="new-password"
            />

            <button
              type="button"
              className="signup-form__password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <span className="signup-form__hint">Use at least 8 characters.</span>
        </div>

        <div className="signup-form__field">
          <label htmlFor="confirmPassword">Confirm password</label>

          <div className="signup-form__password">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />

            <button
              type="button"
              className="signup-form__password-toggle"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <label className="signup-form__terms">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(event) => setAgreeToTerms(event.target.checked)}
          />

          <span>
            I agree to the <a href="#">Terms of Service</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </span>
        </label>

        <button
          type="submit"
          className="signup-form__submit"
          disabled={!agreeToTerms}
        >
          Create account
        </button>
      </form>

      <div className="signup-form__login">
        <span>Already have an account?</span>

        <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}
