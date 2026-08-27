import { useState } from "react";
import type React from "react";
import { Link, useNavigate } from "react-router";
import "./SignupForm.css";
import { useSignup } from "../hooks/useSignup";

export default function SignupForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const signupMutation = useSignup();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError("");

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    signupMutation.mutate(
      {
        username,
        email,
        password,
      },
      {
        onSuccess: () => {
          setUsername("");
          setEmail("");
          setPassword("");
          navigate("/verify-email");
        },
      },
    );
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

        {formError && (
          <p className="signup-form__error" role="alert">
            {formError}
          </p>
        )}

        {signupMutation.isError && (
          <p className="signup-form__error" role="alert">
            {signupMutation.error.message}
          </p>
        )}

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
          disabled={!agreeToTerms || signupMutation.isPending}
        >
          {signupMutation.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="signup-form__login">
        <span>Already have an account?</span>

        <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}
