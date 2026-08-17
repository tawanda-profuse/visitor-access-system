"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { apiFetch, ApiClientError } from "@/lib/api-client";

export function AdminInviteModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invited, setInvited] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/admins", { method: "POST", body: { name, email } });
      setInvited(email);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  }

  if (invited) {
    return (
      <Modal title="Invite Sent" onClose={() => onSaved(invited)}>
        <div className="ug-banner ug-banner-success">
          An invite has been sent to {invited}. They&apos;ll receive an email with a link to set their password and
          complete property setup.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="ug-btn ug-btn-primary" onClick={() => onSaved(invited)}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Invite Property Admin" onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Full Name</label>
          <input className="ug-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="ug-field">
          <label className="ug-label">Email</label>
          <input className="ug-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.8rem", marginTop: "-0.4rem" }}>
          They&apos;ll be invited as a Property Admin, scoped to a single property once they complete onboarding.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting}>
            {submitting ? "Sending…" : "Send Invite"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
