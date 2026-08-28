import { useState } from "react";
import type React from "react";
import { Link, useNavigate } from "react-router";
import "./SigninForm.css";
import { useSignin } from "../hooks/useSignin";
import { useAuth } from "../hooks/useAuth";

export default function SigninForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const signinMutation = useSignin();
  const { login } = useAuth();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    signinMutation.mutate(
      {
        email,
        password,
      },
      {
        onSuccess: (data) => {
          login(data);
          navigate("/dashboard");
        },
      },
    );
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {signinMutation.isError && (
          <p role="alert">{signinMutation.error.message}</p>
        )}

        <button
          type="submit"
          className="signin-form__submit"
          disabled={signinMutation.isPending}
        >
          {signinMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="signin-form__signup">
        <span>Don't have an account?</span>

        <Link to="/signup">Create account</Link>
      </div>
    </div>
  );
}
