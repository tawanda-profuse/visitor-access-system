"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { PaginationBar } from "@/components/PaginationBar";
import { useLiveEvents } from "@/lib/live-events-context";
import type { PanicAlert, Pagination } from "@/lib/types";

const PAGE_SIZE = 20;

export default function PanicAlertsPage() {
  const [alerts, setAlerts] = useState<PanicAlert[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [newAlertBanner, setNewAlertBanner] = useState<string | null>(null);

  async function load(pageNum: number) {
    try {
      const data = await apiFetch<{ panicAlerts: PanicAlert[]; pagination: Pagination }>("/api/panic", {
        params: { page: String(pageNum), pageSize: String(PAGE_SIZE) },
      });
      setAlerts(data.panicAlerts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load panic alerts");
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Emergency alerts need to surface the instant they're raised, not on the next manual
  // refresh — refresh the list live and flash a banner for brand-new ones.
  useLiveEvents(["panic-alert"], (event) => {
    load(page);
    if (event.action === "created") {
      const alert = event.data as PanicAlert;
      setNewAlertBanner(`New panic alert from ${alert.resident?.name ?? "a resident"}${alert.message ? `: "${alert.message}"` : ""}`);
      setTimeout(() => setNewAlertBanner(null), 8000);
    }
  });

  async function updateStatus(alert: PanicAlert, status: "ACKNOWLEDGED" | "RESOLVED") {
    try {
      await apiFetch(`/api/panic/${alert.id}`, { method: "PATCH", body: { status } });
      load(page);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update alert");
    }
  }

  return (
    <>
      <PageHeader title="Panic Alerts" subtitle="Emergency alerts raised by residents, open alerts first." />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}
      {newAlertBanner ? <div className="ug-banner ug-banner-danger">{newAlertBanner}</div> : null}

      <div className="ug-card">
        <div className="ug-table-scroll">
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
                  <td className="ug-cell-wrap">{alert.message ?? "—"}</td>
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
        {pagination ? <PaginationBar pagination={pagination} onPageChange={setPage} /> : null}
      </div>
    </>
  );
}
