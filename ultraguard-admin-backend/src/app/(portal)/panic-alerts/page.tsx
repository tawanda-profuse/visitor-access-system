"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import type { PanicAlert } from "@/lib/types";

export default function PanicAlertsPage() {
  const [alerts, setAlerts] = useState<PanicAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<{ panicAlerts: PanicAlert[] }>("/api/panic");
      setAlerts(data.panicAlerts);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load panic alerts");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(alert: PanicAlert, status: "ACKNOWLEDGED" | "RESOLVED") {
    try {
      await apiFetch(`/api/panic/${alert.id}`, { method: "PATCH", body: { status } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update alert");
    }
  }

  return (
    <>
      <PageHeader title="Panic Alerts" subtitle="Emergency alerts raised by residents, open alerts first." />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      <div className="ug-card">
        <table className="ug-table">
          <thead>
            <tr>
              <th>Resident</th>
              <th>Property</th>
              <th>Message</th>
              <th>Raised At</th>
              <th>Status</th>
              <th>Resolved By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!alerts ? (
              <tr>
                <td colSpan={7} className="ug-table-empty">
                  Loading…
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="ug-table-empty">
                  No panic alerts.
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.resident?.name ?? "—"}</td>
                  <td>{alert.property?.name ?? "—"}</td>
                  <td>{alert.message ?? "—"}</td>
                  <td>{new Date(alert.createdAt).toLocaleString()}</td>
                  <td>
                    <StatusBadge status={alert.status} />
                  </td>
                  <td>{alert.resolvedBy?.name ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      {alert.status === "OPEN" ? (
                        <button className="ug-btn ug-btn-secondary ug-btn-sm" onClick={() => updateStatus(alert, "ACKNOWLEDGED")}>
                          Acknowledge
                        </button>
                      ) : null}
                      {alert.status !== "RESOLVED" ? (
                        <button className="ug-btn ug-btn-primary ug-btn-sm" onClick={() => updateStatus(alert, "RESOLVED")}>
                          Resolve
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
