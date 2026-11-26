"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { Property, Resident } from "@/lib/types";

// "Add Resident" from within a property's resident-management modal only ever picks from
// existing, currently-unassigned (standalone) residents — it never collects new resident
// details via a form. Creating brand-new residents still happens from the Residents page.
export function AddExistingResidentModal({
  property,
  onClose,
  onAdded,
}: {
  property: Property;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [residents, setResidents] = useState<Resident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [unitByResident, setUnitByResident] = useState<Record<string, string>>({});

  const needsUnitPicker = property.units.length > 1;
  const defaultUnitId = property.units[0]?.id ?? "";

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const data = await apiFetch<{ residents: Resident[] }>("/api/residents", {
          params: { unassigned: "true", search: search || undefined },
        });
        setResidents(data.residents);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to load residents");
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function handleAdd(resident: Resident) {
    if (property.units.length === 0) {
      setError("Add a unit to this property before adding residents.");
      return;
    }
    const unitId = unitByResident[resident.id] ?? defaultUnitId;
    setAddingId(resident.id);
    setError(null);
    try {
      await apiFetch(`/api/properties/${property.id}/residents`, {
        method: "POST",
        body: { residentId: resident.id, unitId },
      });
      setResidents((prev) => (prev ? prev.filter((r) => r.id !== resident.id) : prev));
      await onAdded();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add resident");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Modal title={`Add Resident — ${property.name}`} onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      <div className="ug-field">
        <input
          className="ug-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          autoFocus
        />
      </div>

      <div className="ug-table-scroll">
        <table className="ug-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone/Email</th>
              {needsUnitPicker ? <th>Unit</th> : null}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!residents ? (
              <tr>
                <td colSpan={needsUnitPicker ? 4 : 3} className="ug-table-empty">
                  Loading…
                </td>
              </tr>
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan={needsUnitPicker ? 4 : 3} className="ug-table-empty">
                  No unassigned residents found.
                </td>
              </tr>
            ) : (
              residents.map((resident) => (
                <tr key={resident.id}>
                  <td>{resident.name}</td>
                  <td className="ug-cell-wrap">{resident.phone ?? resident.email ?? "—"}</td>
                  {needsUnitPicker ? (
                    <td>
                      <select
                        className="ug-select"
                        value={unitByResident[resident.id] ?? defaultUnitId}
                        onChange={(e) =>
                          setUnitByResident((prev) => ({ ...prev, [resident.id]: e.target.value }))
                        }
                      >
                        {property.units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  ) : null}
                  <td>
                    <button
                      className="ug-btn ug-btn-primary ug-btn-sm"
                      disabled={addingId === resident.id}
                      onClick={() => handleAdd(resident)}
                    >
                      {addingId === resident.id ? "Adding…" : "Add Resident"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
