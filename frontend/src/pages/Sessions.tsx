import { useSessions } from "../features/auth/hooks/useSessions";
import { useRevokeSession } from "../features/auth/hooks/useRevokeSession";

function Sessions() {
  const { data, isLoading, isError, error } = useSessions();

  const revokeMutation = useRevokeSession();

  if (isLoading) {
    return <div>Loading sessions...</div>;
  }

  if (isError) {
    return (
      <div>
        <p>Unable to load sessions.</p>
        <p>{error.message}</p>
      </div>
    );
  }

  const sessions = data?.sessions ?? [];
  console.log(sessions);
  return (
    <main>
      <section>
        <h1>Active Sessions</h1>

        <p>Manage the devices currently signed in to your account.</p>

        {sessions.length === 0 ? (
          <p>No active sessions found.</p>
        ) : (
          <div>
            {sessions.map((session) => (
              <article key={session.id}>
                <div>
                  <h2>Session</h2>

                  <p>Created: {new Date(session.createdAt).toLocaleString()}</p>

                  <p>
                    Last activity:{" "}
                    {session.lastUsedAt
                      ? new Date(session.lastUsedAt).toLocaleString()
                      : "Unknown"}
                  </p>

                  {session.userAgent && <p>Device: {session.userAgent}</p>}

                  {session.ipAddress && <p>IP: {session.ipAddress}</p>}
                </div>

                <button
                  onClick={() => revokeMutation.mutate(session.id)}
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending ? "Revoking..." : "Sign out"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Sessions;
