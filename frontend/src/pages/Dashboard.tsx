import { useGetMe } from "../features/auth/hooks/useGetMe";

export default function Dashboard() {
  const { data: user, isLoading, isError } = useGetMe();

  if (isLoading) {
    return <main>Loading...</main>;
  }

  if (isError || !user) {
    return <div>Unable to load your account.</div>;
  }

  return (
    <main>
      <section>
        <p>Dashboard</p>

        <h1>Welcome back</h1>

        <p>Username: {user?.user.username || "Username not available"}</p>
        <p>Email: {user?.user?.email || "email not available"}</p>

        <p>
          You are signed in. Manage your account and active sessions from here.
        </p>
      </section>
    </main>
  );
}
