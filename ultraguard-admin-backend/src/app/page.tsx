// This project is an API-only backend for the admin/security-company management portal.
// A dedicated admin dashboard UI is out of scope for this MVP phase (see README);
// this page exists only because the Next.js App Router requires a root route.
export default function StatusPage() {
  return (
    <main style={{ background: "#0a0a0a", color: "#fff", minHeight: "100vh", padding: "3rem" }}>
      <h1 style={{ color: "#e2151a" }}>Ultra-Guard Admin Backend</h1>
      <p>API service is running. See /api/health and the project README for available endpoints.</p>
    </main>
  );
}
