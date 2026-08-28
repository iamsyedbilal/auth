import { useNavigate } from "react-router";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function Sessions() {
  const { logout, logoutAll } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate("/login", { replace: true });
  };

  return (
    <main>
      <section>
        <p>Account</p>

        <h1>Active sessions</h1>

        <p>Manage the devices currently signed in to your account.</p>

        <div>
          <div>
            <strong>Current device</strong>
            <p>Windows · Chrome</p>
            <span>Active now</span>
          </div>
        </div>

        <div>
          <button onClick={handleLogout}>Sign out</button>

          <button onClick={handleLogoutAll}>Sign out all devices</button>
        </div>
      </section>
    </main>
  );
}
