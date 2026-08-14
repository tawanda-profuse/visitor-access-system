"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth, type AdminUser } from "@/lib/auth-context";

export default function ProfilePage() {
  const { admin, updateAdmin } = useAuth();

  return (
    <>
      <PageHeader title="Profile Settings" subtitle="Manage your own account details and password." />
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 480 }}>
        <ProfileDetailsForm admin={admin} onSaved={updateAdmin} />
        <PasswordForm />
      </div>
    </>
  );
}

function ProfileDetailsForm({ admin, onSaved }: { admin: AdminUser | null; onSaved: (admin: AdminUser) => void }) {
  const [name, setName] = useState(admin?.name ?? "");
  const [email, setEmail] = useState(admin?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ admin: AdminUser }>("/api/admin/profile", {
        method: "PATCH",
        body: { name, email },
      });
      onSaved(data.admin);
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ug-card ug-card-pad">
      <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Account Details</h2>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      {success ? <div className="ug-banner ug-banner-success">{success}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Name</label>
          <input className="ug-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="ug-field">
          <label className="ug-label">Email</label>
          <input className="ug-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/admin/profile", {
        method: "PATCH",
        body: { currentPassword, newPassword },
      });
      setSuccess("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ug-card ug-card-pad">
      <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Change Password</h2>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      {success ? <div className="ug-banner ug-banner-success">{success}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Current Password</label>
          <input
            className="ug-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="ug-field">
          <label className="ug-label">New Password</label>
          <input
            className="ug-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="ug-field">
          <label className="ug-label">Confirm New Password</label>
          <input
            className="ug-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Change Password"}
        </button>
      </form>
    </div>
  );
}
