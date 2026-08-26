import type { ReactNode } from "react";
import "./AuthLayout.css";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <div className="auth-layout__background">
        <div className="auth-layout__glow auth-layout__glow--one" />
        <div className="auth-layout__glow auth-layout__glow--two" />
      </div>

      <section className="auth-layout__container">
        <div className="auth-layout__brand">
          <div className="auth-layout__logo">A</div>

          <div>
            <h1>Auth</h1>
            <p>Secure authentication</p>
          </div>
        </div>

        <div className="auth-layout__card">{children}</div>

        <p className="auth-layout__footer">
          Secure authentication for your application
        </p>
      </section>
    </main>
  );
}
