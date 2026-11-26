"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { residentApiFetch, ApiClientError } from "@/lib/resident-api-client";
import { StatusBadge } from "@/components/StatusBadge";
import type { AccessCode } from "@/lib/resident-types";

export default function ResidentCodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState<AccessCode | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    residentApiFetch<{ accessCode: AccessCode }>(`/api/access-codes/${id}`)
      .then((data) => setCode(data.accessCode))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Couldn't load this pass."));
  }, [id]);

  useEffect(() => {
    if (!code) return;
    QRCode.toDataURL(code.qrToken, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [code]);

  async function revoke() {
    if (!code || !confirm("Revoke this pass? The visitor will no longer be able to use this code.")) return;
    setRevoking(true);
    try {
      const data = await residentApiFetch<{ accessCode: AccessCode }>(`/api/access-codes/${code.id}`, {
        method: "PATCH",
        body: { action: "revoke" },
      });
      setCode(data.accessCode);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't revoke this pass.");
    } finally {
      setRevoking(false);
    }
  }

  if (error) {
    return (
      <div className="ug-res-page">
        <div className="ug-banner ug-banner-danger">{error}</div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="ug-res-page">
        <div className="ug-spinner" />
      </div>
    );
  }

  return (
    <div className="ug-res-page">
      <button className="ug-btn ug-btn-ghost ug-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => router.push("/resident/history")}>
        ← Back to History
      </button>

      <div className="ug-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <StatusBadge status={code.status} />

        {qrDataUrl ? (
          <div className="ug-res-qr-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Gate pass QR code" width={220} height={220} />
          </div>
        ) : null}

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)" }}>Gate PIN</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "0.2em" }}>{code.code}</div>
        </div>
      </div>

      <div className="ug-card">
        <div className="ug-res-list-row">
          <span style={{ color: "var(--ug-text-secondary)" }}>Visitor</span>
          <span style={{ fontWeight: 600 }}>{code.visitorName}</span>
        </div>
        {code.visitorIdNumber ? (
          <div className="ug-res-list-row">
            <span style={{ color: "var(--ug-text-secondary)" }}>Visitor ID</span>
            <span style={{ fontWeight: 600 }}>{code.visitorIdNumber}</span>
          </div>
        ) : null}
        <div className="ug-res-list-row">
          <span style={{ color: "var(--ug-text-secondary)" }}>Type</span>
          <span style={{ fontWeight: 600 }}>{code.type.replace("_", " ")}</span>
        </div>
        <div className="ug-res-list-row">
          <span style={{ color: "var(--ug-text-secondary)" }}>Valid From</span>
          <span style={{ fontWeight: 600 }}>{new Date(code.validFrom).toLocaleString()}</span>
        </div>
        <div className="ug-res-list-row">
          <span style={{ color: "var(--ug-text-secondary)" }}>Valid Until</span>
          <span style={{ fontWeight: 600 }}>{new Date(code.validUntil).toLocaleString()}</span>
        </div>
        <div className="ug-res-list-row">
          <span style={{ color: "var(--ug-text-secondary)" }}>Uses</span>
          <span style={{ fontWeight: 600 }}>
            {code.useCount} / {code.maxUses}
          </span>
        </div>
      </div>

      {code.status === "ACTIVE" ? (
        <button className="ug-btn ug-btn-danger-outline" onClick={revoke} disabled={revoking}>
          {revoking ? "Revoking…" : "Revoke Pass"}
        </button>
      ) : null}
    </div>
  );
}
