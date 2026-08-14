"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";

type EntryLog = {
  id: string;
  visitorName: string | null;
  method: string;
  result: string;
  occurredAt: string;
  gate: { name: string } | null;
  resident: { name: string } | null;
};

type Summary = {
  residentCount: number;
  propertyCount: number;
  gatesOnline: number;
  gatesTotal: number;
  entriesLast24h: number;
  openPanicAlerts: number;
  activeAccessCodes: number;
  recentEntryLogs: EntryLog[];
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Summary>("/api/admin/dashboard/summary")
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live overview of residents, gates, and recent entry activity." />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      {!summary ? (
        <div className="ug-spinner" />
      ) : (
        <>
          <div className="ug-stat-grid">
            <StatCard label="Active Residents" value={summary.residentCount} />
            <StatCard label="Properties" value={summary.propertyCount} />
            <StatCard label="Gates Online" value={`${summary.gatesOnline} / ${summary.gatesTotal}`} />
            <StatCard label="Entries (24h)" value={summary.entriesLast24h} />
            <StatCard
              label="Open Panic Alerts"
              value={summary.openPanicAlerts}
              accent={summary.openPanicAlerts > 0}
            />
            <StatCard label="Active Access Codes" value={summary.activeAccessCodes} />
          </div>

          <div className="ug-card">
            <div style={{ padding: "1.1rem 1.4rem", borderBottom: "1px solid var(--ug-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1rem", margin: 0 }}>Recent Gate Activity</h2>
              <Link href="/entry-logs" className="ug-btn ug-btn-secondary ug-btn-sm">
                View all
              </Link>
            </div>
            <table className="ug-table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Resident</th>
                  <th>Gate</th>
                  <th>Method</th>
                  <th>Result</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentEntryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ug-table-empty">
                      No entry activity yet.
                    </td>
                  </tr>
                ) : (
                  summary.recentEntryLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.visitorName ?? "—"}</td>
                      <td>{log.resident?.name ?? "—"}</td>
                      <td>{log.gate?.name ?? "—"}</td>
                      <td>{log.method}</td>
                      <td>
                        <StatusBadge status={log.result} />
                      </td>
                      <td>{new Date(log.occurredAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="ug-card ug-card-pad">
      <p className="ug-stat-label">{label}</p>
      <p className="ug-stat-value" style={accent ? { color: "var(--ug-red)" } : undefined}>
        {value}
      </p>
    </div>
  );
}
