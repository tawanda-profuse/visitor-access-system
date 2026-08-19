"use client";

import { useEffect, useState } from "react";
import { useResidentAuth } from "@/lib/resident-auth-context";
import { residentApiFetch } from "@/lib/resident-api-client";

type MobileAppInfo = { apkUrl: string | null; buildDate: string | null };

function formatBuildDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ResidentSettingsPage() {
  const { resident, logout } = useResidentAuth();
  const [appInfo, setAppInfo] = useState<MobileAppInfo | null>(null);

  useEffect(() => {
    residentApiFetch<MobileAppInfo>("/api/public/mobile-app")
      .then(setAppInfo)
      .catch(() => {});
  }, []);

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

      {appInfo?.apkUrl ? (
        <div className="ug-card">
          <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>Get the Mobile App</div>
          <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
            Available for Android devices only.
          </p>
          <a href={appInfo.apkUrl} className="ug-btn ug-btn-secondary" style={{ display: "block", textAlign: "center" }}>
            Download Mobile App{appInfo.buildDate ? ` (version from ${formatBuildDate(appInfo.buildDate)})` : ""}
          </a>
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
