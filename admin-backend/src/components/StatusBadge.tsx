const TONE_MAP: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  ONLINE: "success",
  SUCCESS: "success",
  RESOLVED: "success",
  USED: "neutral",
  SUSPENDED: "warning",
  ACKNOWLEDGED: "warning",
  UNKNOWN: "warning",
  EXPIRED: "warning",
  OFFLINE: "danger",
  DENIED: "danger",
  INVALID: "danger",
  REVOKED: "danger",
  REMOVED: "danger",
  OPEN: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONE_MAP[status] ?? "neutral";
  return <span className={`ug-badge ug-badge-${tone}`}>{status.replace(/_/g, " ")}</span>;
}
