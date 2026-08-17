"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { isSuperAdmin } from "@/lib/roles";
import { AdminInviteModal } from "./AdminInviteModal";

type AdminListItem = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "OPERATOR" | "PROPERTY_ADMIN";
  propertyId: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  property?: { id: string; name: string; address: string } | null;
};

export default function AdminsPage() {
  const { admin } = useAuth();

  // Defense-in-depth: the nav link is already hidden for non-Super-Admins, but guard
  // direct URL access too.
  if (!isSuperAdmin(admin)) {
    return (
      <>
        <PageHeader title="Admins" />
        <div className="ug-card ug-card-pad ug-table-empty">You do not have permission to view this page.</div>
      </>
    );
  }

  return <AdminsPageContent />;
}

function AdminsPageContent() {
  const [admins, setAdmins] = useState<AdminListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<{ admins: AdminListItem[] }>("/api/admins");
      setAdmins(data.admins);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load admins");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageHeader
        title="Admins"
        subtitle="Super Admins and Property Admins with access to this portal."
        actions={
          <button className="ug-btn ug-btn-primary" onClick={() => setShowInvite(true)}>
            + Invite Property Admin
          </button>
        }
      />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      {invitedEmail ? (
        <div className="ug-banner ug-banner-success">An invite has been sent to {invitedEmail}.</div>
      ) : null}

      <div className="ug-card">
        <div className="ug-table-scroll">
          <table className="ug-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Property</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {!admins ? (
                <tr>
                  <td colSpan={5} className="ug-table-empty">
                    Loading…
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ug-table-empty">
                    No admins yet.
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className="ug-cell-wrap">{a.email}</td>
                    <td>{a.role.replace(/_/g, " ")}</td>
                    <td>
                      {a.property?.name ??
                        (a.role === "PROPERTY_ADMIN" ? "— pending onboarding —" : "—")}
                    </td>
                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite ? (
        <AdminInviteModal
          onClose={() => setShowInvite(false)}
          onSaved={(email) => {
            setShowInvite(false);
            setInvitedEmail(email);
            load();
          }}
        />
      ) : null}
    </>
  );
}
