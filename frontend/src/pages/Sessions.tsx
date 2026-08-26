export default function Sessions() {
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

          <button type="button">Sign out</button>
        </div>

        <button type="button">Sign out of all devices</button>
      </section>
    </main>
  );
}
