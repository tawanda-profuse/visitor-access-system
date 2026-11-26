"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { residentApiFetch, ApiClientError } from "@/lib/resident-api-client";
import type { AccessCode, AccessCodeType } from "@/lib/resident-types";

const TYPE_OPTIONS: { value: AccessCodeType; label: string; helper: string }[] = [
  { value: "ONE_TIME", label: "One-Time", helper: "Expires immediately after a single entry." },
  { value: "TIME_BOUND", label: "Time-Bound", helper: "Valid for a custom date/time window." },
  { value: "RECURRING", label: "Recurring", helper: "For regular visitors like staff or contractors." },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALPHANUMERIC_ONLY = /^[a-zA-Z0-9]+$/;

function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toTimeInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toTimeString(date: Date) {
  return toTimeInput(date);
}

export default function ResidentInvitePage() {
  const router = useRouter();
  const [type, setType] = useState<AccessCodeType>("ONE_TIME");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorIdNumber, setVisitorIdNumber] = useState("");
  const [validFrom, setValidFrom] = useState(new Date());
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(day: number) {
    setRecurringDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!visitorName.trim()) {
      setError("Enter the visitor's name.");
      return;
    }
    if (type === "RECURRING" && recurringDays.length === 0) {
      setError("Select at least one day for a recurring pass.");
      return;
    }
    if (visitorIdNumber.trim() && !ALPHANUMERIC_ONLY.test(visitorIdNumber.trim())) {
      setError("Visitor ID must contain letters and numbers only (no spaces or symbols).");
      return;
    }

    setLoading(true);
    try {
      const data = await residentApiFetch<{ accessCode: AccessCode }>("/api/access-codes", {
        method: "POST",
        body: {
          type,
          visitorName: visitorName.trim(),
          visitorPhone: visitorPhone.trim() || undefined,
          visitorIdNumber: visitorIdNumber.trim() || undefined,
          validFrom: validFrom.toISOString(),
          validUntil: validUntil.toISOString(),
          recurrenceRule:
            type === "RECURRING"
              ? { daysOfWeek: recurringDays, startTime: toTimeString(startTime), endTime: toTimeString(endTime) }
              : undefined,
        },
      });
      router.replace(`/resident/codes/${data.accessCode.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create the pass. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="ug-res-page">
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Invite a Visitor</h1>

      {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

      <form onSubmit={onSubmit} className="ug-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label className="ug-label">Pass Type</label>
          <div className="ug-res-chip-row">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ug-res-chip ${type === opt.value ? "ug-res-chip-active" : ""}`}
                onClick={() => setType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            {TYPE_OPTIONS.find((o) => o.value === type)?.helper}
          </p>
        </div>

        <div className="ug-field">
          <label className="ug-label" htmlFor="visitorName">
            Visitor Name
          </label>
          <input
            id="visitorName"
            className="ug-input"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            required
          />
        </div>

        <div className="ug-form-row">
          <div className="ug-field">
            <label className="ug-label" htmlFor="visitorPhone">
              Visitor Phone (optional)
            </label>
            <input
              id="visitorPhone"
              type="tel"
              className="ug-input"
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
            />
          </div>
          <div className="ug-field">
            <label className="ug-label" htmlFor="visitorIdNumber">
              Visitor ID (optional)
            </label>
            <input
              id="visitorIdNumber"
              className="ug-input"
              style={{ textTransform: "uppercase" }}
              value={visitorIdNumber}
              onChange={(e) => setVisitorIdNumber(e.target.value)}
            />
          </div>
        </div>

        {type !== "RECURRING" ? (
          <div className="ug-form-row">
            <div className="ug-field">
              <label className="ug-label" htmlFor="validFrom">
                Valid From
              </label>
              <input
                id="validFrom"
                type="datetime-local"
                className="ug-input"
                value={toDateTimeLocal(validFrom)}
                onChange={(e) => e.target.value && setValidFrom(new Date(e.target.value))}
              />
            </div>
            <div className="ug-field">
              <label className="ug-label" htmlFor="validUntil">
                Valid Until
              </label>
              <input
                id="validUntil"
                type="datetime-local"
                className="ug-input"
                value={toDateTimeLocal(validUntil)}
                onChange={(e) => e.target.value && setValidUntil(new Date(e.target.value))}
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="ug-label">Days of the Week</label>
              <div className="ug-res-chip-row">
                {DAYS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`ug-res-chip ${recurringDays.includes(index) ? "ug-res-chip-active" : ""}`}
                    onClick={() => toggleDay(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ug-form-row">
              <div className="ug-field">
                <label className="ug-label" htmlFor="startTime">
                  Start Time
                </label>
                <input
                  id="startTime"
                  type="time"
                  className="ug-input"
                  value={toTimeInput(startTime)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [h, m] = e.target.value.split(":").map(Number);
                    const d = new Date(startTime);
                    d.setHours(h, m, 0, 0);
                    setStartTime(d);
                  }}
                />
              </div>
              <div className="ug-field">
                <label className="ug-label" htmlFor="endTime">
                  End Time
                </label>
                <input
                  id="endTime"
                  type="time"
                  className="ug-input"
                  value={toTimeInput(endTime)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [h, m] = e.target.value.split(":").map(Number);
                    const d = new Date(endTime);
                    d.setHours(h, m, 0, 0);
                    setEndTime(d);
                  }}
                />
              </div>
            </div>
            <div className="ug-field">
              <label className="ug-label" htmlFor="validUntilRecurring">
                Recurring Pass Expires On
              </label>
              <input
                id="validUntilRecurring"
                type="datetime-local"
                className="ug-input"
                value={toDateTimeLocal(validUntil)}
                onChange={(e) => e.target.value && setValidUntil(new Date(e.target.value))}
              />
            </div>
          </>
        )}

        <button type="submit" className="ug-btn ug-btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create Pass"}
        </button>
      </form>
    </div>
  );
}
