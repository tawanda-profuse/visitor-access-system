"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import type { Gate, Property } from "@/lib/types";

export default function GatesPage() {
  const [gates, setGates] = useState<Gate[] | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{ gateName: string; key: string } | null>(null);

  async function load() {
    try {
      const data = await apiFetch<{ gates: Gate[] }>("/api/gates");
      setGates(data.gates);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load gates");
    }
  }

  useEffect(() => {
    load();
    apiFetch<{ properties: Property[] }>("/api/properties")
      .then((data) => setProperties(data.properties))
      .catch(() => {});
  }, []);

  return (
    <>
      <PageHeader
        title="Gates"
        subtitle="Gate/intercom device inventory and connectivity status."
        actions={
          <button className="ug-btn ug-btn-primary" onClick={() => setShowAdd(true)}>
            + Add Gate
          </button>
        }
      />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      <div className="ug-card">
        <div className="ug-table-scroll">
        <table className="ug-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Property</th>
              <th>Status</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {!gates ? (
              <tr>
                <td colSpan={4} className="ug-table-empty">
                  Loading…
                </td>
              </tr>
            ) : gates.length === 0 ? (
              <tr>
                <td colSpan={4} className="ug-table-empty">
                  No gates registered yet.
                </td>
              </tr>
            ) : (
              gates.map((gate) => (
                <tr key={gate.id}>
                  <td>{gate.name}</td>
                  <td>{gate.property?.name ?? "—"}</td>
                  <td>
                    <StatusBadge status={gate.status} />
                  </td>
                  <td>{gate.lastSeenAt ? new Date(gate.lastSeenAt).toLocaleString() : "Never"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showAdd ? (
        <AddGateModal
          properties={properties}
          onClose={() => setShowAdd(false)}
          onSaved={(gateName, key) => {
            setShowAdd(false);
            setNewApiKey({ gateName, key });
            load();
          }}
        />
      ) : null}

      {newApiKey ? (
        <Modal title="Gate API Key" onClose={() => setNewApiKey(null)}>
          <div className="ug-banner ug-banner-success">
            &ldquo;{newApiKey.gateName}&rdquo; was created. Copy this API key now — it will not be shown again.
          </div>
          <div className="ug-field">
            <label className="ug-label">API Key</label>
            <input className="ug-input" readOnly value={newApiKey.key} onFocus={(e) => e.target.select()} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="ug-btn ug-btn-primary" onClick={() => setNewApiKey(null)}>
              Done
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function AddGateModal({
  properties,
  onClose,
  onSaved,
}: {
  properties: Property[];
  onClose: () => void;
  onSaved: (gateName: string, key: string) => void;
}) {
  const [name, setName] = useState("");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ gate: Gate; apiKey: string }>("/api/gates", {
        method: "POST",
        body: { name, propertyId },
      });
      onSaved(data.gate.name, data.apiKey);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add gate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Gate" onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Gate Name</label>
          <input className="ug-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Gate" required />
        </div>
        <div className="ug-field">
          <label className="ug-label">Property</label>
          <select className="ug-select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
            {properties.length === 0 ? <option value="">No properties yet</option> : null}
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting || !propertyId}>
            {submitting ? "Saving…" : "Add Gate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
