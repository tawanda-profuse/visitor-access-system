"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Webpack/Next.js breaks Leaflet's default marker icon path resolution; pointing at the
// same-version CDN copy is the standard workaround (no API key, still free).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Harare, Zimbabwe — a reasonable default center when a resident has no pin yet.
const DEFAULT_CENTER = { lat: -17.8292, lng: 31.0522 };

export type LatLng = { lat: number; lng: number };

function ClickHandler({ onChange }: { onChange: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position }: { position: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);
  return null;
}

export default function ResidentLocationMap({
  position,
  onChange,
  readOnly,
}: {
  position: LatLng | null;
  onChange?: (pos: LatLng) => void;
  readOnly?: boolean;
}) {
  const center = position ?? DEFAULT_CENTER;

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={position ? 16 : 12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter position={position} />
      {!readOnly && onChange ? <ClickHandler onChange={onChange} /> : null}
      {position ? (
        <Marker
          position={[position.lat, position.lng]}
          draggable={!readOnly}
          eventHandlers={
            !readOnly && onChange
              ? {
                  dragend: (e) => {
                    const { lat, lng } = (e.target as L.Marker).getLatLng();
                    onChange({ lat, lng });
                  },
                }
              : undefined
          }
        />
      ) : null}
    </MapContainer>
  );
}
