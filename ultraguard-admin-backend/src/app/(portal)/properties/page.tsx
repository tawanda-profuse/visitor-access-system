"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import type { Property } from "@/lib/types";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [addingUnitTo, setAddingUnitTo] = useState<Property | null>(null);

  async function load() {
    try {
      const data = await apiFetch<{ properties: Property[] }>("/api/properties");
      setProperties(data.properties);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load properties");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle="Managed estates/buildings and the units within them."
        actions={
          <button className="ug-btn ug-btn-primary" onClick={() => setShowAddProperty(true)}>
            + Add Property
          </button>
        }
      />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      {!properties ? (
        <div className="ug-spinner" />
      ) : properties.length === 0 ? (
        <div className="ug-card ug-card-pad ug-table-empty">No properties yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {properties.map((property) => (
            <div key={property.id} className="ug-card">
              <div
                style={{
                  padding: "1.1rem 1.4rem",
                  borderBottom: "1px solid var(--ug-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "0.6rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1rem", margin: "0 0 0.2rem" }}>{property.name}</h2>
                  <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: 0 }}>{property.address}</p>
                </div>
                <button className="ug-btn ug-btn-secondary ug-btn-sm" onClick={() => setAddingUnitTo(property)}>
                  + Add Unit
                </button>
              </div>
              <table className="ug-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Residents</th>
                  </tr>
                </thead>
                <tbody>
                  {property.units.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="ug-table-empty">
                        No units yet.
                      </td>
                    </tr>
                  ) : (
                    property.units.map((unit) => (
                      <tr key={unit.id}>
                        <td>{unit.label}</td>
                        <td>
                          {unit.residents && unit.residents.length > 0
                            ? unit.residents.map((ru) => ru.resident?.name).filter(Boolean).join(", ")
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showAddProperty ? (
        <AddPropertyModal onClose={() => setShowAddProperty(false)} onSaved={() => { setShowAddProperty(false); load(); }} />
      ) : null}

      {addingUnitTo ? (
        <AddUnitModal property={addingUnitTo} onClose={() => setAddingUnitTo(null)} onSaved={() => { setAddingUnitTo(null); load(); }} />
      ) : null}
    </>
  );
}

function AddPropertyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/properties", { method: "POST", body: { name, address } });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add property");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Property" onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Property Name</label>
          <input className="ug-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Willow Creek Estate" required />
        </div>
        <div className="ug-field">
          <label className="ug-label">Address</label>
          <input className="ug-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Willow Creek Drive" required />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Add Property"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddUnitModal({ property, onClose, onSaved }: { property: Property; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/properties/${property.id}/units`, { method: "POST", body: { label } });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add unit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Add Unit to ${property.name}`} onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Unit Label</label>
          <input className="ug-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="House 12" required />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Add Unit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
