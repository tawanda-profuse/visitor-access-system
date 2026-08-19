"use client";

import { useState } from "react";
import Link from "next/link";
import { residentApiFetch, ApiClientError } from "@/lib/resident-api-client";

const GENERIC_MESSAGE = "If an account exists for that phone or email, we've sent a link to reset your password.";

export default function ResidentForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await residentApiFetch("/api/auth/resident/forgot-password", { method: "POST", body: { identifier } });
      setSent(true);
    } catch (err) {
      // Mirrors the mobile app: a real API error response is still treated as the generic
      // success message (anti-enumeration), only unexpected/network errors show as errors.
      if (err instanceof ApiClientError) {
        setSent(true);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ug-center-screen">
      <div className="ug-card ug-card-pad" style={{ width: 380 }}>
        <h1 style={{ fontSize: "1.15rem", textAlign: "center", margin: "0 0 1rem" }}>Reset Password</h1>

        {sent ? (
          <>
            <div className="ug-banner ug-banner-success">{GENERIC_MESSAGE}</div>
            <Link href="/resident/login">
              <button type="button" className="ug-btn ug-btn-primary" style={{ width: "100%", marginTop: "0.75rem" }}>
                Back to Sign In
              </button>
            </Link>
          </>
        ) : (
          <>
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
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="ug-btn ug-btn-primary"
                style={{ width: "100%", marginTop: "0.5rem" }}
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <Link href="/resident/login" style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)" }}>
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
