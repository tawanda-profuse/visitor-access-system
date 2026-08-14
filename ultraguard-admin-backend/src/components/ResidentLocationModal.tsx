"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Modal } from "./Modal";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { Resident } from "@/lib/types";
import type { LatLng } from "./ResidentLocationMap";

// Leaflet touches `window` at import time, so it must never run during SSR.
const ResidentLocationMap = dynamic(() => import("./ResidentLocationMap"), {
  ssr: false,
  loading: () => <div className="ug-spinner" />,
});

export function ResidentLocationModal({
  resident,
  onClose,
  onSaved,
}: {
  resident: Resident;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [position, setPosition] = useState<LatLng | null>(
    resident.latitude != null && resident.longitude != null
      ? { lat: resident.latitude, lng: resident.longitude }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function locateFromAddress() {
    if (!resident.address) {
      setError("This resident has no address on file yet — set one first, or click the map to drop a pin manually.");
      return;
    }
    setError(null);
    setLocating(true);
    try {
      const data = await apiFetch<{ latitude: number; longitude: number }>("/api/geocode", {
        params: { query: resident.address },
      });
      setPosition({ lat: data.latitude, lng: data.longitude });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not locate that address");
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!position) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/residents/${resident.id}`, {
        method: "PATCH",
        body: { latitude: position.lat, longitude: position.lng },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`${resident.name} — Home Location`} onClose={onClose}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", marginTop: 0 }}>
        {resident.address ?? "No address on file."} Click the map or drag the pin to set the exact spot.
      </p>
      <div style={{ height: 320, borderRadius: 8, overflow: "hidden", marginBottom: "1rem" }}>
        <ResidentLocationMap position={position} onChange={setPosition} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
        <button type="button" className="ug-btn ug-btn-secondary" onClick={locateFromAddress} disabled={locating}>
          {locating ? "Locating…" : "Locate from Address"}
        </button>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ug-btn ug-btn-primary" onClick={save} disabled={saving || !position}>
            {saving ? "Saving…" : "Save Location"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
