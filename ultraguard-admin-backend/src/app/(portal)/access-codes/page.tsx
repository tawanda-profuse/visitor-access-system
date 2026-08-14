"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { PaginationBar } from "@/components/PaginationBar";
import type { AccessCode, Pagination } from "@/lib/types";

const STATUS_OPTIONS = ["ACTIVE", "USED", "EXPIRED", "REVOKED"];
const PAGE_SIZE = 20;

export default function AccessCodesPage() {
  const [codes, setCodes] = useState<AccessCode[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(statusFilter: string, pageNum: number) {
    try {
      const data = await apiFetch<{ accessCodes: AccessCode[]; pagination: Pagination }>("/api/access-codes", {
        params: { status: statusFilter || undefined, page: String(pageNum), pageSize: String(PAGE_SIZE) },
      });
      setCodes(data.accessCodes);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load access codes");
    }
  }

  useEffect(() => {
    load(status, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function revoke(code: AccessCode) {
    if (!confirm(`Revoke the access code for ${code.visitorName}?`)) return;
    try {
      await apiFetch(`/api/access-codes/${code.id}`, { method: "PATCH", body: { action: "revoke" } });
      load(status, page);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to revoke code");
    }
  }

  return (
    <>
      <PageHeader title="Access Codes" subtitle="Visitor PIN/QR invites issued by residents." />

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      <div className="ug-toolbar">
        <select className="ug-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="ug-card">
        <table className="ug-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Visitor</th>
              <th>Resident</th>
              <th>Type</th>
              <th>Valid Window</th>
              <th>Uses</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!codes ? (
              <tr>
                <td colSpan={8} className="ug-table-empty">
                  Loading…
                </td>
              </tr>
            ) : codes.length === 0 ? (
              <tr>
                <td colSpan={8} className="ug-table-empty">
                  No access codes found.
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id}>
                  <td style={{ fontFamily: "monospace" }}>{code.code}</td>
                  <td>{code.visitorName}</td>
                  <td>{code.resident?.name ?? "—"}</td>
                  <td>{code.type.replace(/_/g, " ")}</td>
                  <td>
                    {new Date(code.validFrom).toLocaleDateString()} – {new Date(code.validUntil).toLocaleDateString()}
                  </td>
                  <td>
                    {code.useCount}/{code.maxUses}
                  </td>
                  <td>
                    <StatusBadge status={code.status} />
                  </td>
                  <td>
                    {code.status === "ACTIVE" ? (
                      <button className="ug-btn ug-btn-danger-outline ug-btn-sm" onClick={() => revoke(code)}>
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pagination ? <PaginationBar pagination={pagination} onPageChange={setPage} /> : null}
      </div>
    </>
  );
}
