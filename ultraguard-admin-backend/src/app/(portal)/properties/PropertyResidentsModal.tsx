"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { Property, ResidentUnit } from "@/lib/types";
import { AddExistingResidentModal } from "./AddExistingResidentModal";

export function PropertyResidentsModal({
  property,
  onClose,
  onChanged,
}: {
  property: Property;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [showAddResident, setShowAddResident] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // "Add Resident" picks from unassigned residents (see GET /api/residents?unassigned=true)
  // — the API scopes that pool per role: Super Admin sees every unassigned resident
  // system-wide, a Property Admin only sees ones previously associated with this same
  // property (via lastPropertyId), so this button is safe to show to both roles.

  // Derived from the already-loaded property.units[].residents[] — no separate fetch.
  const residentRows = useMemo(() => {
    const rows: { ru: ResidentUnit; unitLabel: string }[] = [];
    for (const unit of property.units) {
      for (const ru of unit.residents ?? []) {
        rows.push({ ru, unitLabel: unit.label });
      }
    }
    return rows.sort((a, b) => (a.ru.resident?.name ?? "").localeCompare(b.ru.resident?.name ?? ""));
  }, [property]);

  async function handleRemove(residentId: string, residentName: string) {
    if (
      !confirm(
        `Remove ${residentName} from ${property.name}? They will NOT be deleted — just unlinked from this property.`,
      )
    ) {
      return;
    }
    setRemovingId(residentId);
    setError(null);
    try {
      await apiFetch(`/api/properties/${property.id}/residents/${residentId}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to remove resident");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Modal title={`Residents — ${property.name}`} onClose={onClose}>
        {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
          <button className="ug-btn ug-btn-primary ug-btn-sm" onClick={() => setShowAddResident(true)}>
            + Add Resident
          </button>
        </div>

        <div className="ug-table-scroll">
          <table className="ug-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone/Email</th>
                <th>Unit</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {residentRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ug-table-empty">
                    No residents assigned to this property yet.
                  </td>
                </tr>
              ) : (
                residentRows.map(({ ru, unitLabel }) => (
                  <tr key={ru.id}>
                    <td>{ru.resident?.name ?? "—"}</td>
                    <td className="ug-cell-wrap">{ru.resident?.phone ?? ru.resident?.email ?? "—"}</td>
                    <td>{unitLabel}</td>
                    <td>{ru.resident ? <StatusBadge status={ru.resident.status} /> : "—"}</td>
                    <td>
                      <button
                        className="ug-btn ug-btn-danger-outline ug-btn-sm"
                        disabled={removingId === ru.residentId}
                        onClick={() => ru.resident && handleRemove(ru.residentId, ru.resident.name)}
                      >
                        {removingId === ru.residentId ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {showAddResident ? (
        <AddExistingResidentModal
          property={property}
          onClose={() => setShowAddResident(false)}
          onAdded={onChanged}
        />
      ) : null}
    </>
  );
}
