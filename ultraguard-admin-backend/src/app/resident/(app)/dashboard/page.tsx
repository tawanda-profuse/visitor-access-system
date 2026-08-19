"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useResidentAuth } from "@/lib/resident-auth-context";
import { residentApiFetch, ApiClientError } from "@/lib/resident-api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import type { AccessCode, EntryLog } from "@/lib/resident-types";

export default function ResidentDashboardPage() {
  const { resident } = useResidentAuth();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [entries, setEntries] = useState<EntryLog[]>([]);
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicMessage, setPanicMessage] = useState("");
  const [panicSending, setPanicSending] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    residentApiFetch<{ accessCodes: AccessCode[] }>("/api/access-codes")
      .then((data) => setCodes(data.accessCodes))
      .catch(() => {});
    residentApiFetch<{ entryLogs: EntryLog[] }>("/api/entry-logs")
      .then((data) => setEntries(data.entryLogs))
      .catch(() => {});
  }, []);

  const activeCodes = codes.filter((c) => c.status === "ACTIVE").slice(0, 5);
  const recentEntries = entries.slice(0, 5);

  async function sendPanic() {
    setPanicSending(true);
    try {
      await residentApiFetch("/api/panic", { method: "POST", body: { message: panicMessage.trim() || undefined } });
      setPanicOpen(false);
      setPanicMessage("");
      setBanner({ tone: "success", text: "Alert sent — security has been notified." });
    } catch (err) {
      setPanicOpen(false);
      setBanner({ tone: "danger", text: err instanceof ApiClientError ? err.message : "Failed to send alert. Please call the guard house directly." });
    } finally {
      setPanicSending(false);
    }
  }

  return (
    <div className="ug-res-page">
      <div>
        <h1 style={{ fontSize: "1.4rem", margin: "0 0 0.25rem" }}>Hi, {resident?.name.split(" ")[0]}</h1>
        <p style={{ color: "var(--ug-text-secondary)", margin: 0 }}>Manage visitor access to your property.</p>
      </div>

      {banner ? <div className={`ug-banner ug-banner-${banner.tone}`}>{banner.text}</div> : null}

      <Link href="/resident/invite">
        <button className="ug-btn ug-btn-primary" style={{ width: "100%" }}>
          Invite a Visitor
        </button>
      </Link>

      <div className="ug-card" style={{ borderColor: "var(--ug-danger)" }}>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
          Instantly alert the security guard desk or monitoring centre.
        </p>
        <button className="ug-btn ug-btn-danger-outline" style={{ width: "100%" }} onClick={() => setPanicOpen(true)}>
          Send Emergency Alert
        </button>
      </div>

      <div>
        <h2 className="ug-res-section-title">Active Visitor Passes</h2>
        <div className="ug-card">
          {activeCodes.length === 0 ? (
            <p style={{ color: "var(--ug-text-secondary)", margin: 0 }}>No active passes right now.</p>
          ) : (
            activeCodes.map((code) => (
              <div key={code.id} className="ug-res-list-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{code.visitorName}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ug-text-secondary)" }}>
                    {code.type.replace("_", " ")} · Code: {code.code}
                  </div>
                </div>
                <Link href={`/resident/codes/${code.id}`}>
                  <button className="ug-btn ug-btn-ghost ug-btn-sm">View Pass</button>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="ug-res-section-title">Recent Gate Activity</h2>
        <div className="ug-card">
          {recentEntries.length === 0 ? (
            <p style={{ color: "var(--ug-text-secondary)", margin: 0 }}>No entries logged yet.</p>
          ) : (
            recentEntries.map((entry) => (
              <div key={entry.id} className="ug-res-list-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{entry.visitorName ?? "Unknown visitor"}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ug-text-secondary)" }}>
                    {new Date(entry.occurredAt).toLocaleString()}
                  </div>
                </div>
                <StatusBadge status={entry.result} />
              </div>
            ))
          )}
        </div>
      </div>

      {panicOpen ? (
        <Modal title="Trigger Emergency Alert?" onClose={() => setPanicOpen(false)}>
          <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.9rem" }}>
            This will immediately notify the security guard desk / monitoring centre.
          </p>
          <div className="ug-field">
            <label className="ug-label" htmlFor="panic-message">
              Message (optional)
            </label>
            <textarea
              id="panic-message"
              className="ug-input"
              rows={3}
              maxLength={500}
              value={panicMessage}
              onChange={(e) => setPanicMessage(e.target.value)}
              placeholder="Add a message for security (optional)"
              style={{ resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button className="ug-btn ug-btn-ghost" style={{ flex: 1 }} onClick={() => setPanicOpen(false)} disabled={panicSending}>
              Cancel
            </button>
            <button className="ug-btn ug-btn-primary" style={{ flex: 1, background: "var(--ug-danger)" }} onClick={sendPanic} disabled={panicSending}>
              {panicSending ? "Sending…" : "Send Alert"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
