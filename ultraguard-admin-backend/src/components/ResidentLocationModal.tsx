"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // The browser exits fullscreen on its own when the user presses Escape (or uses
  // browser chrome), without going through our toggle button — this keeps `isFullscreen`
  // in sync with reality either way, and only this element's fullscreen state, not any
  // other component that might independently be fullscreen.
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === modalRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement === modalRef.current) document.exitFullscreen().catch(() => {});
    };
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await modalRef.current?.requestFullscreen();
    }
  }

  async function handleClose() {
    if (document.fullscreenElement === modalRef.current) await document.exitFullscreen();
    onClose();
  }

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
    <Modal ref={modalRef} title={`${resident.name} — Home Location`} onClose={handleClose} fullscreen={isFullscreen}>
      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.6rem" }}>
        <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", marginTop: 0, flex: 1 }}>
          {resident.address ?? "No address on file."} Click the map or drag the pin to set the exact spot.
          {isFullscreen ? " Press Esc to exit full screen." : ""}
        </p>
        <button type="button" className="ug-btn ug-btn-secondary ug-btn-sm" onClick={toggleFullscreen}>
          {isFullscreen ? "Exit Full Screen" : "Full Screen"}
        </button>
      </div>
      <div
        style={{
          height: isFullscreen ? "100%" : 320,
          flex: isFullscreen ? 1 : undefined,
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: "1rem",
          minHeight: isFullscreen ? 0 : undefined,
        }}
      >
        <ResidentLocationMap position={position} onChange={setPosition} fullscreen={isFullscreen} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
        <button type="button" className="ug-btn ug-btn-secondary" onClick={locateFromAddress} disabled={locating}>
          {locating ? "Locating…" : "Locate from Address"}
        </button>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="button" className="ug-btn ug-btn-secondary" onClick={handleClose}>
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
