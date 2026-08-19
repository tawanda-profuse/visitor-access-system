"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PasswordInput } from "@/components/PasswordInput";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth, type AdminUser } from "@/lib/auth-context";
import { canManageSettings } from "@/lib/roles";

export default function ProfilePage() {
  const { admin, updateAdmin } = useAuth();

  return (
    <>
      <PageHeader title="Profile Settings" subtitle="Manage your own account details and password." />
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 480 }}>
        <ProfileDetailsForm admin={admin} onSaved={updateAdmin} />
        <PasswordForm />
        {canManageSettings(admin) ? <SupportEmailForm /> : null}
        {canManageSettings(admin) ? <MobileAppLinksCard /> : null}
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
          <PasswordInput
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="ug-field">
          <label className="ug-label">New Password</label>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="ug-field">
          <label className="ug-label">Confirm New Password</label>
          <PasswordInput
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

function SupportEmailForm() {
  const [supportEmail, setSupportEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ supportEmail: string }>("/api/admin/settings")
      .then((data) => setSupportEmail(data.supportEmail))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load settings"))
      .finally(() => setLoaded(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ supportEmail: string }>("/api/admin/settings", {
        method: "PATCH",
        body: { supportEmail },
      });
      setSupportEmail(data.supportEmail);
      setSuccess("Support email updated.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update support email");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ug-card ug-card-pad">
      <h2 style={{ fontSize: "1rem", margin: "0 0 0.4rem" }}>Support Contact</h2>
      <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: "0 0 1rem" }}>
        Shown to residents who are denied access to the mobile app (e.g. an unregistered phone number).
      </p>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      {success ? <div className="ug-banner ug-banner-success">{success}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Support Email</label>
          <input
            className="ug-input"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            required
            disabled={!loaded}
          />
        </div>
        <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting || !loaded}>
          {submitting ? "Saving…" : "Save Support Email"}
        </button>
      </form>
    </div>
  );
}

function formatBuildDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function MobileAppLinksCard() {
  const [appInfo, setAppInfo] = useState<{ apkUrl: string | null; buildDate: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<{ apkUrl: string | null; buildDate: string | null }>("/api/public/mobile-app")
      .then(setAppInfo)
      .catch(() => {});
  }, []);

  async function copyResidentWebAppLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/resident/login`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="ug-card ug-card-pad">
      <h2 style={{ fontSize: "1rem", margin: "0 0 0.4rem" }}>Resident Mobile & Web Access</h2>
      <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: "0 0 1rem" }}>
        Share these with residents directly, outside of the invitation email.
      </p>

      {copied ? <div className="ug-banner ug-banner-success">Link copied to clipboard.</div> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {appInfo?.apkUrl ? (
          <a href={appInfo.apkUrl} className="ug-btn ug-btn-secondary" style={{ textAlign: "center" }}>
            Download Mobile App{appInfo.buildDate ? ` (version from ${formatBuildDate(appInfo.buildDate)})` : ""}
          </a>
        ) : (
          <div className="ug-banner ug-banner-danger">
            No Android APK URL is configured yet — set ANDROID_APK_URL to enable this.
          </div>
        )}
        <button type="button" className="ug-btn ug-btn-secondary" onClick={copyResidentWebAppLink}>
          Copy Resident Web App Link
        </button>
      </div>
    </div>
  );
}
