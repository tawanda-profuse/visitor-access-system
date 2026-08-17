"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth, type AdminUser } from "@/lib/auth-context";
import { needsOnboarding } from "@/lib/roles";
import type { GateApiKeyReveal } from "@/lib/types";

type GateRow = { key: string; id?: string; name: string };
type OnboardingGate = { id: string; name: string; status: string; lastSeenAt: string | null; createdAt: string };
type OnboardingProperty = { id: string; name: string; address: string; gates: OnboardingGate[] };
type OnboardingState = { name: string; onboardingCompletedAt: string | null; property: OnboardingProperty | null };

let rowKeySeq = 0;
function nextRowKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

export default function OnboardingPage() {
  const { admin, loading, setSession } = useAuth();
  const router = useRouter();
  // POST .../complete swaps in a fresh, already-onboarded admin via setSession, which
  // would otherwise make the redirect-guard effect below immediately bounce the user to
  // /dashboard before they've had a chance to read/copy the just-revealed gate API keys.
  // Once the wizard reaches its own "done" screen it flips this so the guard stands down.
  const [completedThisSession, setCompletedThisSession] = useState(false);

  useEffect(() => {
    if (loading || completedThisSession) return;
    if (!admin) {
      router.replace("/login");
    } else if (!needsOnboarding(admin)) {
      router.replace("/dashboard");
    }
  }, [loading, admin, router, completedThisSession]);

  if (loading || !admin || (!needsOnboarding(admin) && !completedThisSession)) {
    return (
      <div className="ug-center-screen">
        <div className="ug-spinner" />
      </div>
    );
  }

  return <OnboardingWizard admin={admin} setSession={setSession} onCompleted={() => setCompletedThisSession(true)} />;
}

function OnboardingWizard({
  admin,
  setSession,
  onCompleted,
}: {
  admin: AdminUser;
  setSession: (token: string, admin: AdminUser) => void;
  onCompleted: () => void;
}) {
  const router = useRouter();

  const [initializing, setInitializing] = useState(true);
  const [step, setStep] = useState(0); // 0 = property, 1 = gates, 2 = display name, 3 = done
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [gateRows, setGateRows] = useState<GateRow[]>([{ key: nextRowKey(), name: "" }]);
  const [adminName, setAdminName] = useState(admin.name);
  const [revealedKeys, setRevealedKeys] = useState<GateApiKeyReveal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const revealedNames = useRef<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<OnboardingState>("/api/admin/onboarding")
      .then((data) => {
        if (data.name) setAdminName(data.name);
        if (data.property) {
          setPropertyName(data.property.name);
          setPropertyAddress(data.property.address);
          if (data.property.gates.length > 0) {
            setGateRows(data.property.gates.map((g) => ({ key: nextRowKey(), id: g.id, name: g.name })));
          }
        }
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load onboarding state"))
      .finally(() => setInitializing(false));
  }, []);

  function addGateRow() {
    setGateRows((rows) => [...rows, { key: nextRowKey(), name: "" }]);
  }

  function removeGateRow(key: string) {
    setGateRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
  }

  function updateGateRow(key: string, name: string) {
    setGateRows((rows) => rows.map((r) => (r.key === key ? { ...r, name } : r)));
  }

  async function savePropertyAndGates(includeAdminName: boolean) {
    const body: { propertyName: string; propertyAddress: string; gates: { id?: string; name: string }[]; adminName?: string } = {
      propertyName,
      propertyAddress,
      gates: gateRows.map((r) => (r.id ? { id: r.id, name: r.name } : { name: r.name })),
    };
    if (includeAdminName) body.adminName = adminName;

    const data = await apiFetch<{ property: OnboardingProperty; newlyCreatedGates: GateApiKeyReveal[] }>(
      "/api/admin/onboarding",
      { method: "PUT", body },
    );

    // Sync local rows with server-assigned ids so re-saving doesn't recreate gates.
    setGateRows(data.property.gates.map((g) => ({ key: nextRowKey(), id: g.id, name: g.name })));

    for (const g of data.newlyCreatedGates) {
      if (!revealedNames.current.has(`${g.name}:${g.apiKey}`)) {
        revealedNames.current.add(`${g.name}:${g.apiKey}`);
        setRevealedKeys((prev) => [...prev, g]);
      }
    }
    return data;
  }

  async function handleNextFromProperty(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!propertyName.trim() || !propertyAddress.trim()) return;
    setStep(1);
  }

  async function handleNextFromGates(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validRows = gateRows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      setError("Add at least one gate before continuing.");
      return;
    }
    setSubmitting(true);
    try {
      await savePropertyAndGates(false);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to save property/gates");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!adminName.trim()) return;
    setSubmitting(true);
    try {
      await savePropertyAndGates(true);
      const data = await apiFetch<{ token: string; admin: AdminUser }>("/api/admin/onboarding/complete", {
        method: "POST",
      });
      onCompleted();
      setSession(data.token, data.admin);
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  if (initializing) {
    return (
      <div className="ug-center-screen">
        <div className="ug-spinner" />
      </div>
    );
  }

  return (
    <div className="ug-center-screen">
      <div className="ug-card ug-card-pad" style={{ width: 520 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <Image src="/ultraguard-logo.png" alt="Ultra-Guard" width={200} height={49} priority />
        </div>

        {step < 3 ? <StepIndicator step={step} /> : null}

        {error ? <div className="ug-banner ug-banner-danger">{error}</div> : null}

        {step === 0 ? (
          <form onSubmit={handleNextFromProperty}>
            <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.25rem" }}>Set up your property</h2>
            <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: "0 0 1.1rem" }}>
              Tell us about the estate or building you&apos;ll be managing.
            </p>
            <div className="ug-field">
              <label className="ug-label">Property Name</label>
              <input
                className="ug-input"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="Willow Creek Estate"
                required
                autoFocus
              />
            </div>
            <div className="ug-field">
              <label className="ug-label">Address</label>
              <input
                className="ug-input"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="123 Willow Creek Drive"
                required
              />
            </div>
            <button type="submit" className="ug-btn ug-btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
              Next
            </button>
          </form>
        ) : null}

        {step === 1 ? (
          <form onSubmit={handleNextFromGates}>
            <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.25rem" }}>Add your gates</h2>
            <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: "0 0 1.1rem" }}>
              Every entry point (gate, boom, intercom) needs its own record. You can add more later.
            </p>
            {gateRows.map((row, idx) => (
              <div key={row.key} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem" }}>
                <input
                  className="ug-input"
                  style={{ flex: 1 }}
                  value={row.name}
                  onChange={(e) => updateGateRow(row.key, e.target.value)}
                  placeholder={`Gate ${idx + 1} name`}
                  required
                />
                <button
                  type="button"
                  className="ug-btn ug-btn-secondary ug-btn-sm"
                  onClick={() => removeGateRow(row.key)}
                  disabled={gateRows.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="ug-btn ug-btn-secondary ug-btn-sm" onClick={addGateRow} style={{ marginBottom: "1rem" }}>
              + Add another gate
            </button>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button type="button" className="ug-btn ug-btn-secondary" style={{ flex: 1 }} onClick={() => setStep(0)}>
                Back
              </button>
              <button type="submit" className="ug-btn ug-btn-primary" style={{ flex: 1 }} disabled={submitting}>
                {submitting ? "Saving…" : "Next"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={handleComplete}>
            <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.25rem" }}>What is your name?</h2>
            <p style={{ color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: "0 0 1.1rem" }}>
              This is how you&apos;ll appear in the sidebar and throughout the portal.
            </p>
            <div className="ug-field">
              <label className="ug-label">Your Name</label>
              <input className="ug-input" value={adminName} onChange={(e) => setAdminName(e.target.value)} required autoFocus />
            </div>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button type="button" className="ug-btn ug-btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)} disabled={submitting}>
                Back
              </button>
              <button type="submit" className="ug-btn ug-btn-primary" style={{ flex: 1 }} disabled={submitting}>
                {submitting ? "Finishing…" : "Complete Setup"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <div>
            <div className="ug-banner ug-banner-success">Setup complete! Your property and gates are ready.</div>
            {revealedKeys.length > 0 ? (
              <>
                <p style={{ fontSize: "0.85rem", color: "var(--ug-text-secondary)", margin: "0 0 0.75rem" }}>
                  Copy these gate API keys now — they will not be shown again.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  {revealedKeys.map((g) => (
                    <div key={`${g.name}-${g.apiKey}`} className="ug-field" style={{ marginBottom: 0 }}>
                      <label className="ug-label">{g.name}</label>
                      <input className="ug-input" readOnly value={g.apiKey} onFocus={(e) => e.target.select()} />
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            <button
              type="button"
              className="ug-btn ug-btn-primary"
              style={{ width: "100%" }}
              onClick={() => router.replace("/dashboard")}
            >
              Continue to Dashboard
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const labels = ["Property", "Gates", "Your Name"];
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
      {labels.map((label, idx) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: idx <= step ? "var(--ug-red)" : "var(--ug-neutral-bg)",
              color: idx <= step ? "var(--ug-white)" : "var(--ug-text-secondary)",
            }}
          >
            {idx + 1}
          </div>
          <span style={{ fontSize: "0.78rem", color: idx === step ? "var(--ug-text)" : "var(--ug-text-secondary)" }}>{label}</span>
          {idx < labels.length - 1 ? <span style={{ width: 16, height: 1, background: "var(--ug-border)" }} /> : null}
        </div>
      ))}
    </div>
  );
}
