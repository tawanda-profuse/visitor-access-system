"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import type { EntryLog, Gate, Resident } from "@/lib/types";

const RESULT_OPTIONS = ["SUCCESS", "EXPIRED", "DENIED", "INVALID"];

export default function EntryLogsPage() {
  const [logs, setLogs] = useState<EntryLog[] | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [residentId, setResidentId] = useState("");
  const [gateId, setGateId] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<{ entryLogs: EntryLog[] }>("/api/entry-logs", {
        params: { residentId, gateId, result, limit: "200" },
      });
      setLogs(data.entryLogs);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load entry logs");
    }
  }

  useEffect(() => {
    load();
    apiFetch<{ residents: Resident[] }>("/api/residents").then((d) => setResidents(d.residents)).catch(() => {});
    apiFetch<{ gates: Gate[] }>("/api/gates").then((d) => setGates(d.gates)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId, gateId, result]);

  function exportCsv() {
    if (!logs || logs.length === 0) return;
    const header = ["Occurred At", "Visitor", "Resident", "Gate", "Method", "Result", "Reason"];
    const rows = logs.map((log) => [
      new Date(log.occurredAt).toISOString(),
      log.visitorName ?? "",
      log.resident?.name ?? "",
      log.gate?.name ?? "",
      log.method,
      log.result,
      log.reason ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `entry-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Entry Logs"
        subtitle="Immutable audit trail of all gate entries."
        actions={
          <button className="ug-btn ug-btn-secondary" onClick={exportCsv} disabled={!logs || logs.length === 0}>
            Export CSV
          </button>
        }
      />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      <div className="ug-toolbar">
        <select className="ug-select" value={residentId} onChange={(e) => setResidentId(e.target.value)}>
          <option value="">All residents</option>
          {residents.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select className="ug-select" value={gateId} onChange={(e) => setGateId(e.target.value)}>
          <option value="">All gates</option>
          {gates.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select className="ug-select" value={result} onChange={(e) => setResult(e.target.value)}>
          <option value="">All results</option>
          {RESULT_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="ug-card">
        <table className="ug-table">
          <thead>
            <tr>
              <th>Occurred At</th>
              <th>Visitor</th>
              <th>Resident</th>
              <th>Gate</th>
              <th>Method</th>
              <th>Result</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {!logs ? (
              <tr>
                <td colSpan={7} className="ug-table-empty">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="ug-table-empty">
                  No entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.occurredAt).toLocaleString()}</td>
                  <td>{log.visitorName ?? "—"}</td>
                  <td>{log.resident?.name ?? "—"}</td>
                  <td>{log.gate?.name ?? "—"}</td>
                  <td>{log.method}</td>
                  <td>
                    <StatusBadge status={log.result} />
                  </td>
                  <td>{log.reason ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
