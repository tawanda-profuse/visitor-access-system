"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { useLiveEvents } from "@/lib/live-events-context";
import { useAuth } from "@/lib/auth-context";
import { isPropertyAdmin } from "@/lib/roles";
import type { Gate, Property } from "@/lib/types";

export default function GatesPage() {
  const { admin } = useAuth();
  const [gates, setGates] = useState<Gate[] | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
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

  // Gate status/last-seen updates (heartbeats, validations) refresh the connectivity table live.
  useLiveEvents(["gate"], () => load());

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!gates ? (
              <tr>
                <td colSpan={5} className="ug-table-empty">
                  Loading…
                </td>
              </tr>
            ) : gates.length === 0 ? (
              <tr>
                <td colSpan={5} className="ug-table-empty">
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
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button className="ug-btn ug-btn-secondary ug-btn-sm" onClick={() => setEditingGate(gate)}>
                        Edit
                      </button>
                    </div>
                  </td>
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
          lockedPropertyId={isPropertyAdmin(admin) ? admin!.propertyId : null}
          onClose={() => setShowAdd(false)}
          onSaved={(gateName, key) => {
            setShowAdd(false);
            setNewApiKey({ gateName, key });
            load();
          }}
        />
      ) : null}

      {editingGate ? (
        <EditGateModal
          gate={editingGate}
          onClose={() => setEditingGate(null)}
          onSaved={() => {
            setEditingGate(null);
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
  lockedPropertyId,
  onClose,
  onSaved,
}: {
  properties: Property[];
  // When set (a Property Admin adding a gate), there's only one valid property — hide
  // the picker and submit this id automatically instead.
  lockedPropertyId?: string | null;
  onClose: () => void;
  onSaved: (gateName: string, key: string) => void;
}) {
  const [name, setName] = useState("");
  const [propertyId, setPropertyId] = useState(lockedPropertyId || properties[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ gate: Gate; apiKey: string }>("/api/gates", {
        method: "POST",
        body: { name, propertyId: lockedPropertyId || propertyId },
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
        {!lockedPropertyId ? (
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
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting || !(lockedPropertyId || propertyId)}>
            {submitting ? "Saving…" : "Add Gate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditGateModal({ gate, onClose, onSaved }: { gate: Gate; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(gate.name);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/gates/${gate.id}`, { method: "PATCH", body: { name } });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to rename gate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Gate" onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="ug-field">
          <label className="ug-label">Gate Name</label>
          <input className="ug-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
