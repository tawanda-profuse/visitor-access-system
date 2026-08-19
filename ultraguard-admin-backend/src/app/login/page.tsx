"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useResidentAuth } from "@/lib/resident-auth-context";
import { ApiClientError } from "@/lib/api-client";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginPage() {
  const { admin, loading: adminLoading, login } = useAuth();
  const { resident, loading: residentLoading } = useResidentAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Global guard: whichever role you're already signed in as, land on that role's
  // dashboard rather than a login form, regardless of which login URL you visited.
  useEffect(() => {
    if (adminLoading || residentLoading) return;
    if (admin) router.replace("/dashboard");
    else if (resident) router.replace("/resident/dashboard");
  }, [adminLoading, residentLoading, admin, resident, router]);

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
            <PasswordInput
              id="password"
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

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link href="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)" }}>
            Forgot password?
          </Link>
        </div>

        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <Link href="/resident/login" style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)" }}>
            Are you a resident? <span style={{ color: "var(--ug-red)", fontWeight: 600 }}>Sign in here</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
