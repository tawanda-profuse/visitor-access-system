"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth-context";
import type { Resident, Property } from "@/lib/types";
import { ResidentFormModal, flattenUnitOptions } from "./ResidentFormModal";

export default function ResidentsPage() {
  const { admin } = useAuth();
  const [residents, setResidents] = useState<Resident[] | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  async function loadResidents(searchTerm?: string) {
    try {
      const data = await apiFetch<{ residents: Resident[] }>("/api/residents", {
        params: { search: searchTerm },
      });
      setResidents(data.residents);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load residents");
    }
  }

  useEffect(() => {
    loadResidents();
    apiFetch<{ properties: Property[] }>("/api/properties")
      .then((data) => setProperties(data.properties))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadResidents(search), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function toggleSuspend(resident: Resident) {
    const nextStatus = resident.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      await apiFetch(`/api/residents/${resident.id}`, { method: "PATCH", body: { status: nextStatus } });
      loadResidents(search);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update resident");
    }
  }

  async function removeResident(resident: Resident) {
    if (!confirm(`Permanently remove ${resident.name}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/residents/${resident.id}`, { method: "DELETE" });
      loadResidents(search);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to remove resident");
    }
  }

  const unitOptions = flattenUnitOptions(properties);

  return (
    <>
      <PageHeader
        title="Residents"
        subtitle="Manage resident profiles, contact details, addresses, and unit assignments."
        actions={
          <button className="ug-btn ug-btn-primary" onClick={() => setModalMode("add")}>
            + Add Resident
          </button>
        }
      />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      <div className="ug-toolbar">
        <input
          className="ug-input"
          style={{ maxWidth: 320 }}
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ug-card">
        <table className="ug-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Unit</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!residents ? (
              <tr>
                <td colSpan={7} className="ug-table-empty">
                  Loading…
                </td>
              </tr>
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan={7} className="ug-table-empty">
                  No residents found.
                </td>
              </tr>
            ) : (
              residents.map((resident) => (
                <tr key={resident.id}>
                  <td>{resident.name}</td>
                  <td>{resident.phone}</td>
                  <td>{resident.email ?? "—"}</td>
                  <td>{resident.address ?? "—"}</td>
                  <td>
                    {resident.units.length > 0
                      ? resident.units.map((ru) => ru.unit?.label).filter(Boolean).join(", ")
                      : "—"}
                  </td>
                  <td>
                    <StatusBadge status={resident.status} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      <button
                        className="ug-btn ug-btn-secondary ug-btn-sm"
                        onClick={() => {
                          setEditingResident(resident);
                          setModalMode("edit");
                        }}
                      >
                        Edit
                      </button>
                      {resident.status !== "REMOVED" ? (
                        <button className="ug-btn ug-btn-secondary ug-btn-sm" onClick={() => toggleSuspend(resident)}>
                          {resident.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                        </button>
                      ) : null}
                      {admin?.role === "SUPER_ADMIN" ? (
                        <button className="ug-btn ug-btn-danger-outline ug-btn-sm" onClick={() => removeResident(resident)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalMode ? (
        <ResidentFormModal
          resident={modalMode === "edit" ? editingResident : null}
          unitOptions={unitOptions}
          onClose={() => {
            setModalMode(null);
            setEditingResident(null);
          }}
          onSaved={() => {
            setModalMode(null);
            setEditingResident(null);
            loadResidents(search);
          }}
        />
      ) : null}
    </>
  );
}
