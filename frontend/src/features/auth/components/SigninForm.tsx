import { useState } from "react";
import type React from "react";
import { Link } from "react-router";
import "./SigninForm.css";

export default function SigninForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // UI only for now.
  };

  return (
    <div className="signin-form">
      <div className="signin-form__header">
        <h2>Welcome back</h2>
        <p>Sign in to continue to your account.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="signin-form__field">
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="signin-form__field">
          <div className="signin-form__label-row">
            <label htmlFor="password">Password</label>
          </div>

          <div className="signin-form__password">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
            />

            <button
              type="button"
              className="signin-form__password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <label className="signin-form__remember">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />

          <span>Remember me</span>
        </label>

        <button type="submit" className="signin-form__submit">
          Sign in
        </button>
      </form>

      <div className="signin-form__signup">
        <span>Don't have an account?</span>

        <Link to="/signup">Create account</Link>
      </div>
    </div>
  );
}
