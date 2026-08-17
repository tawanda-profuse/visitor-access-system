"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PasswordInput } from "./PasswordInput";

// Rendered at /set-password?token=...&role=admin|resident — the link the backend emails
// for admin invite, admin forgot-password, resident invite, AND resident forgot-password
// (same page for all four; `role` picks which subject's set-password endpoint to call).
export function SetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const role = searchParams.get("role") === "resident" ? "resident" : "admin";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/auth/${role}/set-password`, { method: "POST", body: { token, password } });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "This link is invalid or has expired.");
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
        <h1 style={{ fontSize: "1.15rem", textAlign: "center", margin: "0 0 0.25rem" }}>Set Your Password</h1>

        {!token ? (
          <div className="ug-banner ug-banner-danger">
            This link is missing its reset token. Please use the link from your email, or request a new one.
          </div>
        ) : null}

        {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

        {success ? (
          <>
            <div className="ug-banner ug-banner-success">
              Password updated.{" "}
              {role === "resident" ? "You can now sign in from the Ultra-Guard mobile app." : "You can now sign in."}
            </div>
            {role === "admin" ? (
              <Link href="/login" className="ug-btn ug-btn-primary" style={{ width: "100%", textDecoration: "none" }}>
                Go to Sign In
              </Link>
            ) : null}
          </>
        ) : (
          <>
            {token ? (
              <form onSubmit={handleSubmit}>
                <div className="ug-field">
                  <label className="ug-label" htmlFor="password">
                    New Password
                  </label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    autoFocus
                  />
                </div>
                <div className="ug-field">
                  <label className="ug-label" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="ug-btn ug-btn-primary"
                  style={{ width: "100%", marginTop: "0.5rem" }}
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Set Password"}
                </button>
              </form>
            ) : null}
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <Link href="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)" }}>
                Request a new link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
