"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { buildAddress } from "@/lib/address";
import type { Resident, Property } from "@/lib/types";

type UnitOption = { id: string; label: string; propertyName: string };

export function ResidentFormModal({
  resident,
  unitOptions,
  onClose,
  onSaved,
}: {
  resident: Resident | null;
  unitOptions: UnitOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!resident;
  const [name, setName] = useState(resident?.name ?? "");
  const [phone, setPhone] = useState(resident?.phone ?? "");
  const [email, setEmail] = useState(resident?.email ?? "");
  const [houseNumber, setHouseNumber] = useState(resident?.houseNumber ?? "");
  const [streetName, setStreetName] = useState(resident?.streetName ?? "");
  const [city, setCity] = useState(resident?.city ?? "");
  const [country, setCountry] = useState(resident?.country ?? "");
  const [unitId, setUnitId] = useState("");
  const [status, setStatus] = useState(resident?.status ?? "ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addressPreview = buildAddress({ houseNumber, streetName, city, country });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await apiFetch(`/api/residents/${resident!.id}`, {
          method: "PATCH",
          body: {
            name,
            phone,
            email: email || null,
            houseNumber: houseNumber || null,
            streetName: streetName || null,
            city: city || null,
            country: country || null,
            status,
          },
        });
      } else {
        await apiFetch("/api/residents", {
          method: "POST",
          body: {
            name,
            phone,
            email: email || undefined,
            houseNumber: houseNumber || undefined,
            streetName: streetName || undefined,
            city: city || undefined,
            country: country || undefined,
            unitId: unitId || undefined,
          },
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to save resident");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Resident" : "Add Resident"} onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Full Name</label>
          <input className="ug-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="ug-form-row">
          <div className="ug-field">
            <label className="ug-label">Phone</label>
            <input className="ug-input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="ug-field">
            <label className="ug-label">Email (optional)</label>
            <input className="ug-input" type="email" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="ug-label" style={{ margin: "0.4rem 0 0.5rem" }}>
          Address
        </div>
        <div className="ug-form-row">
          <div className="ug-field">
            <label className="ug-label">House Number</label>
            <input className="ug-input" value={houseNumber ?? ""} onChange={(e) => setHouseNumber(e.target.value)} placeholder="32" />
          </div>
          <div className="ug-field">
            <label className="ug-label">Street Name</label>
            <input className="ug-input" value={streetName ?? ""} onChange={(e) => setStreetName(e.target.value)} placeholder="Chatsworth Road" />
          </div>
        </div>
        <div className="ug-form-row">
          <div className="ug-field">
            <label className="ug-label">City</label>
            <input className="ug-input" value={city ?? ""} onChange={(e) => setCity(e.target.value)} placeholder="Harare" />
          </div>
          <div className="ug-field">
            <label className="ug-label">Country</label>
            <input className="ug-input" value={country ?? ""} onChange={(e) => setCountry(e.target.value)} placeholder="Zimbabwe" />
          </div>
        </div>
        {addressPreview ? (
          <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.8rem", marginTop: "-0.4rem", marginBottom: "0.9rem" }}>
            Address: {addressPreview}
          </p>
        ) : null}

        {!isEdit ? (
          <div className="ug-field">
            <label className="ug-label">Assign to Unit (optional)</label>
            <select className="ug-select" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">— No unit —</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.propertyName} — {u.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {isEdit ? (
          <div className="ug-field">
            <label className="ug-label">Status</label>
            <select className="ug-select" value={status} onChange={(e) => setStatus(e.target.value as Resident["status"])}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="REMOVED">REMOVED</option>
            </select>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Resident"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function flattenUnitOptions(properties: Property[]): UnitOption[] {
  return properties.flatMap((property) =>
    property.units.map((unit) => ({ id: unit.id, label: unit.label, propertyName: property.name })),
  );
}
