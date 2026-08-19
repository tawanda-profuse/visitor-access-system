"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useResidentAuth, ApiClientError } from "@/lib/resident-auth-context";
import { PasswordInput } from "@/components/PasswordInput";

export default function ResidentLoginPage() {
  const { resident, loading, login } = useResidentAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && resident) router.replace("/resident/dashboard");
  }, [loading, resident, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ug-res-login-shell">
      <div className="ug-res-login-form-panel">
        <div className="ug-card ug-card-pad" style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <Image src="/ultraguard-logo.png" alt="Ultra-Guard" width={220} height={54} priority />
          </div>
          <h1 style={{ fontSize: "1.15rem", textAlign: "center", margin: "0 0 0.25rem" }}>Resident Portal</h1>
          <p style={{ color: "var(--ug-text-secondary)", textAlign: "center", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
            Sign in to manage your visitor Gate Passes.
          </p>

          {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

          <form onSubmit={handleSubmit}>
            <div className="ug-field">
              <label className="ug-label" htmlFor="identifier">
                Phone or Email
              </label>
              <input
                id="identifier"
                type="text"
                className="ug-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="ug-field">
              <label className="ug-label" htmlFor="password">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              className="ug-btn ug-btn-primary"
              style={{ width: "100%", marginTop: "0.5rem" }}
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link href="/resident/forgot-password" style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)" }}>
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      <div className="ug-res-login-banner-panel">
        <div style={{ background: "var(--ug-white)", borderRadius: 8, padding: "0.75rem 1.25rem" }}>
          <Image
            src="/ultraguard-logo.png"
            alt="Ultra-Guard"
            width={260}
            height={64}
            style={{ height: "auto", width: "260px" }}
            priority
          />
        </div>
        <p className="ug-res-login-banner-tagline">
          Manage visitor access to your home from anywhere — create Gate Passes, track entries, and stay in
          control of who comes and goes.
        </p>
      </div>
    </div>
  );
}
