"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ug-center-screen">
      <div className="ug-card ug-card-pad" style={{ width: 380 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <Image src="/ultraguard-logo.png" alt="Ultra-Guard" width={220} height={54} priority />
        </div>
        <h1 style={{ fontSize: "1.15rem", textAlign: "center", margin: "0 0 0.25rem" }}>Admin Portal</h1>
        <p style={{ color: "var(--ug-text-secondary)", textAlign: "center", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
          Sign in to manage residents, properties and gate activity.
        </p>

        {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="ug-field">
            <label className="ug-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="ug-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ultraguard.co.za"
              required
              autoFocus
            />
          </div>
          <div className="ug-field">
            <label className="ug-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="ug-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="ug-btn ug-btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
