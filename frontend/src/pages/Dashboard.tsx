import { useNavigate } from "react-router";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useGetMe } from "../features/auth/hooks/useGetMe";

export default function Dashboard() {
  const { logout, logoutAll } = useAuth();
  const navigate = useNavigate();

  const { data: user, isLoading, isError } = useGetMe();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate("/login", { replace: true });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !user) {
    return <div>Unable to load your account.</div>;
  }

  return (
    <main>
      <section>
        <p>Dashboard</p>

        <h1>Welcome back, {user.user?.username}</h1>

        <p>Username: {user.user?.username}</p>
        <p>Email: {user.user?.email}</p>

        <p>
          You are signed in. Manage your account and active sessions from here.
        </p>

        <div>
          <button onClick={handleLogout}>Sign out</button>

          <button onClick={handleLogoutAll}>Sign out all devices</button>
        </div>
      </section>
    </main>
  );
}
