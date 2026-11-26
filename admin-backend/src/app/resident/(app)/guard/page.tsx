"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { useResidentAuth } from "@/lib/resident-auth-context";
import { residentApiFetch, ApiClientError } from "@/lib/resident-api-client";
import type { Gate, GuardResultCode, GuardVerifyResult } from "@/lib/resident-types";

type Mode = "scan" | "manual";

const DENIAL_COPY: Partial<Record<GuardResultCode, string>> = {
  NOT_FOUND: "Code not recognized",
  WRONG_LOCATION: "This pass is not valid at this gate",
  REVOKED: "This pass was revoked",
  USED: "This pass has already been used",
  EXPIRED: "This pass has expired",
};

function denialCopy(result: GuardVerifyResult): string {
  return DENIAL_COPY[result.resultCode] ?? result.message;
}

export default function ResidentGuardPage() {
  const { resident } = useResidentAuth();
  const [gates, setGates] = useState<Gate[]>([]);
  const [loadingGates, setLoadingGates] = useState(true);
  const [gate, setGate] = useState<Gate | null>(null);

  const myPropertyIds = useMemo(
    () => new Set((resident?.units ?? []).map((ru) => ru.unit.property.id)),
    [resident],
  );

  useEffect(() => {
    residentApiFetch<{ gates: Gate[] }>("/api/public/gates")
      .then((data) => {
        const myGates = data.gates.filter((g) => myPropertyIds.has(g.propertyId));
        setGates(myGates);
        if (myGates.length === 1) setGate(myGates[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingGates(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ug-res-page">
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Guard the Gate</h1>

      {loadingGates ? (
        <div className="ug-spinner" />
      ) : myPropertyIds.size === 0 ? (
        <div className="ug-card">
          <p style={{ margin: 0, color: "var(--ug-text-secondary)" }}>
            You&apos;re not currently linked to a managed property, so there&apos;s no gate to verify against.
          </p>
        </div>
      ) : gates.length === 0 ? (
        <div className="ug-card">
          <p style={{ margin: 0, color: "var(--ug-text-secondary)" }}>
            Your property doesn&apos;t have any gates set up yet. Contact your property admin.
          </p>
        </div>
      ) : !gate ? (
        <div>
          <p style={{ color: "var(--ug-text-secondary)" }}>Pick a gate to verify passes against.</p>
          <div className="ug-card" style={{ padding: 0 }}>
            {gates.map((g, index) => (
              <button
                key={g.id}
                onClick={() => setGate(g)}
                className="ug-res-list-row"
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderTop: index === 0 ? "none" : "1px solid var(--ug-border)",
                  cursor: "pointer",
                  padding: "0.85rem 1rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ug-text-secondary)" }}>{g.propertyAddress}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <VerifyPanel gate={gate} onChangeGate={() => setGate(null)} />
      )}
    </div>
  );
}

function VerifyPanel({ gate, onChangeGate }: { gate: Gate; onChangeGate: () => void }) {
  const [mode, setMode] = useState<Mode>("scan");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GuardVerifyResult | null>(null);
  const scanLockRef = useRef(false);

  const resetScan = () => {
    scanLockRef.current = false;
    setResult(null);
    setSubmitError(null);
    setPin("");
  };

  const selectMode = (next: Mode) => {
    if (next === mode) return;
    resetScan();
    setMode(next);
  };

  const runVerify = async (input: string, method: "PIN" | "QR") => {
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await residentApiFetch<GuardVerifyResult>("/api/security-guard/verify", {
        method: "POST",
        body: { gateId: gate.id, input, method },
      });
      setResult(res);
    } catch (e) {
      scanLockRef.current = false; // allow an immediate retry — the QR may still be in frame
      if (e instanceof ApiClientError && e.status === 429) {
        setSubmitError("Too many attempts — please wait a moment and try again.");
      } else {
        setSubmitError(e instanceof ApiClientError ? e.message : "Couldn't verify the pass. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onQrDetected = (data: string) => {
    if (scanLockRef.current || loading || result) return;
    scanLockRef.current = true;
    runVerify(data, "QR");
  };

  const onSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setSubmitError("Enter the PIN shown on the visitor's pass.");
      return;
    }
    runVerify(pin.trim(), "PIN");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="ug-card" style={{ gap: 4 }}>
        <div style={{ color: "var(--ug-text-secondary)", fontSize: "0.75rem" }}>Verifying at</div>
        <div style={{ fontWeight: 700 }}>
          {gate.name} · {gate.propertyName}
        </div>
        <button
          onClick={onChangeGate}
          style={{ background: "none", border: "none", color: "var(--ug-red)", fontSize: "0.8rem", fontWeight: 600, padding: 0, marginTop: 4, cursor: "pointer" }}
        >
          Change Gate
        </button>
      </div>

      {!result && (
        <div className="ug-res-chip-row">
          <button className={`ug-res-chip ${mode === "scan" ? "ug-res-chip-active" : ""}`} style={{ flex: 1 }} onClick={() => selectMode("scan")}>
            Scan QR
          </button>
          <button className={`ug-res-chip ${mode === "manual" ? "ug-res-chip-active" : ""}`} style={{ flex: 1 }} onClick={() => selectMode("manual")}>
            Enter PIN
          </button>
        </div>
      )}

      {result ? (
        <ResultCard result={result} onScanNext={resetScan} />
      ) : mode === "scan" ? (
        <ScanPanel onDetected={onQrDetected} loading={loading} onEnterPinInstead={() => selectMode("manual")} />
      ) : (
        <form onSubmit={onSubmitPin} className="ug-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="ug-field">
            <label className="ug-label" htmlFor="guard-pin">
              Gate Pass PIN
            </label>
            <input
              id="guard-pin"
              className="ug-input"
              inputMode="numeric"
              placeholder="e.g. 483920"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="ug-btn ug-btn-primary" disabled={loading}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
      )}

      {submitError && !result ? <div className="ug-banner ug-banner-danger">{submitError}</div> : null}
    </div>
  );
}

function ScanPanel({
  onDetected,
  loading,
  onEnterPinInstead,
}: {
  onDetected: (data: string) => void;
  loading: boolean;
  onEnterPinInstead: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [permissionState, setPermissionState] = useState<"pending" | "granted" | "denied">("pending");
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameHandle: number;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        setPermissionState("granted");
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }

        const tick = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !loadingRef.current) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imageData.data, imageData.width, imageData.height);
              if (qr?.data) onDetectedRef.current(qr.data);
            }
          }
          frameHandle = requestAnimationFrame(tick);
        };
        frameHandle = requestAnimationFrame(tick);
      })
      .catch(() => setPermissionState("denied"));

    return () => {
      cancelled = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (permissionState === "denied") {
    return (
      <div className="ug-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ fontWeight: 700 }}>Camera Access Needed</div>
        <p style={{ margin: 0, color: "var(--ug-text-secondary)", fontSize: "0.85rem" }}>
          SecureGate needs camera access to scan visitor Gate Pass QR codes. You can also verify a pass by
          typing its PIN instead. If you already denied access, allow the camera for this site in your
          browser's address-bar settings and reload.
        </p>
        <button className="ug-btn ug-btn-secondary" onClick={onEnterPinInstead}>
          Enter PIN Instead
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ aspectRatio: "1", borderRadius: 16, overflow: "hidden", border: "1px solid var(--ug-border)", background: "#000" }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <p style={{ textAlign: "center", color: "var(--ug-text-secondary)", fontSize: "0.85rem", margin: 0 }}>
        {loading ? "Verifying…" : permissionState === "pending" ? "Requesting camera access…" : "Point the camera at the visitor's QR code."}
      </p>
      <button className="ug-btn ug-btn-ghost" onClick={onEnterPinInstead}>
        Enter PIN Instead
      </button>
    </div>
  );
}

function ResultCard({ result, onScanNext }: { result: GuardVerifyResult; onScanNext: () => void }) {
  const isSuccess = result.resultCode === "SUCCESS";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        className="ug-card"
        style={{
          borderColor: isSuccess ? "var(--ug-success)" : "var(--ug-danger)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ color: isSuccess ? "var(--ug-success)" : "var(--ug-danger)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "0.05em" }}>
          {isSuccess ? "ACCESS GRANTED" : "ACCESS DENIED"}
        </div>

        {isSuccess && result.visit ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{result.visit.visitorName}</div>
            <div style={{ color: "var(--ug-text-secondary)" }}>{result.visit.gate.name}</div>
            <div style={{ color: "var(--ug-text-secondary)" }}>{result.visit.property.name}</div>
            <div style={{ color: "var(--ug-text-secondary)", fontSize: "0.8rem" }}>{result.visit.property.address}</div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--ug-text-secondary)", textAlign: "center" }}>{denialCopy(result)}</p>
        )}
      </div>

      <button className="ug-btn ug-btn-primary" onClick={onScanNext}>
        Scan Next
      </button>
    </div>
  );
}
