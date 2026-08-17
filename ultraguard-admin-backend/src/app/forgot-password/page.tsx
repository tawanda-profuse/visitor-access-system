"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/api-client";

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a link to reset your password.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // The API always returns a generic success message regardless of whether the
      // email matched an account (anti-enumeration) — only a genuine network/client
      // error should be treated differently from that generic confirmation.
      await apiFetch<{ message: string }>("/api/auth/admin/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
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
        <h1 style={{ fontSize: "1.15rem", textAlign: "center", margin: "0 0 0.25rem" }}>Forgot Password</h1>
        <p style={{ color: "var(--ug-text-secondary)", textAlign: "center", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>

        {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
        {submitted ? <div className="ug-banner ug-banner-success">{GENERIC_MESSAGE}</div> : null}

        {!submitted ? (
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
            <button type="submit" className="ug-btn ug-btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={submitting}>
              {submitting ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        ) : null}

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link href="/login" style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
