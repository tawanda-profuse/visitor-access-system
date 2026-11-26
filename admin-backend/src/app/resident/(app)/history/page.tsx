"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { residentApiFetch } from "@/lib/resident-api-client";
import { StatusBadge } from "@/components/StatusBadge";
import type { AccessCode, EntryLog } from "@/lib/resident-types";

type Tab = "codes" | "entries";

const STATUS_OPTIONS: Record<Tab, string[]> = {
  codes: ["ACTIVE", "USED", "EXPIRED", "REVOKED"],
  entries: ["SUCCESS", "EXPIRED", "DENIED", "INVALID"],
};

function withinDateRange(iso: string, from: string, to: string) {
  const time = new Date(iso).getTime();
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

export default function ResidentHistoryPage() {
  const [tab, setTab] = useState<Tab>("codes");
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [entries, setEntries] = useState<EntryLog[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    residentApiFetch<{ accessCodes: AccessCode[] }>("/api/access-codes")
      .then((data) => setCodes(data.accessCodes))
      .catch(() => {});
    residentApiFetch<{ entryLogs: EntryLog[] }>("/api/entry-logs")
      .then((data) => setEntries(data.entryLogs))
      .catch(() => {});
  }, []);

  useEffect(() => setStatusFilter("ALL"), [tab]);

  const filteredCodes = useMemo(
    () =>
      codes.filter(
        (c) => (statusFilter === "ALL" || c.status === statusFilter) && withinDateRange(c.createdAt, dateFrom, dateTo),
      ),
    [codes, statusFilter, dateFrom, dateTo],
  );

  const filteredEntries = useMemo(
    () =>
      entries.filter(
        (e) => (statusFilter === "ALL" || e.result === statusFilter) && withinDateRange(e.occurredAt, dateFrom, dateTo),
      ),
    [entries, statusFilter, dateFrom, dateTo],
  );

  return (
    <div className="ug-res-page">
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>History</h1>

      <div className="ug-res-chip-row">
        <button
          className={`ug-res-chip ${tab === "codes" ? "ug-res-chip-active" : ""}`}
          onClick={() => setTab("codes")}
        >
          Visitor Passes
        </button>
        <button
          className={`ug-res-chip ${tab === "entries" ? "ug-res-chip-active" : ""}`}
          onClick={() => setTab("entries")}
        >
          Entry Logs
        </button>
      </div>

      <div className="ug-res-chip-row">
        {["ALL", ...STATUS_OPTIONS[tab]].map((status) => (
          <button
            key={status}
            className={`ug-res-chip ${statusFilter === status ? "ug-res-chip-active" : ""}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="ug-form-row">
        <div className="ug-field">
          <label className="ug-label" htmlFor="dateFrom">
            From
          </label>
          <input id="dateFrom" type="date" className="ug-input" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="ug-field">
          <label className="ug-label" htmlFor="dateTo">
            To
          </label>
          <input id="dateTo" type="date" className="ug-input" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="ug-card">
        {tab === "codes" ? (
          filteredCodes.length === 0 ? (
            <p style={{ color: "var(--ug-text-secondary)", margin: 0 }}>
              {codes.length === 0 ? "No visitor passes yet." : "No visitor passes match these filters."}
            </p>
          ) : (
            filteredCodes.map((code) => (
              <Link key={code.id} href={`/resident/codes/${code.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="ug-res-list-row">
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ug-text)" }}>{code.visitorName}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ug-text-secondary)" }}>
                      {code.type.replace("_", " ")} · Code {code.code}
                    </div>
                  </div>
                  <StatusBadge status={code.status} />
                </div>
              </Link>
            ))
          )
        ) : filteredEntries.length === 0 ? (
          <p style={{ color: "var(--ug-text-secondary)", margin: 0 }}>
            {entries.length === 0 ? "No entries logged yet." : "No entries match these filters."}
          </p>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="ug-res-list-row">
              <div>
                <div style={{ fontWeight: 600 }}>{entry.visitorName ?? "Unknown visitor"}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--ug-text-secondary)" }}>
                  {entry.method} · {new Date(entry.occurredAt).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={entry.result} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
