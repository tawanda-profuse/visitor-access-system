"use client";

import { useResidentAuth } from "@/lib/resident-auth-context";

export default function ResidentSettingsPage() {
  const { resident, logout } = useResidentAuth();

  return (
    <div className="ug-res-page">
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Settings</h1>

      <div className="ug-card">
        <div style={{ color: "var(--ug-text-secondary)", fontSize: "0.8rem" }}>Signed in as</div>
        <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{resident?.name}</div>
        <div style={{ color: "var(--ug-text-secondary)" }}>{resident?.phone ?? resident?.email}</div>
      </div>

      {resident?.units && resident.units.length > 0 ? (
        <div className="ug-card">
          <div style={{ color: "var(--ug-text-secondary)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>Property</div>
          {resident.units.map((ru) => (
            <div key={ru.id} style={{ fontWeight: 600 }}>
              {ru.unit.label} — {ru.unit.property.name}
            </div>
          ))}
        </div>
      ) : null}

      <button className="ug-btn ug-btn-secondary" onClick={logout}>
        Log Out
      </button>

      <div style={{ textAlign: "center" }}>
        <a href="mailto:tawandamsengezi@gmail.com" style={{ color: "var(--ug-red)", fontWeight: 600, fontSize: "0.9rem" }}>
          Contact Tech Support
        </a>
      </div>

      <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.8rem", textAlign: "center" }}>
        Ultra-Guard Security & Fire · Visitor Access Management System
      </p>
    </div>
  );
}
