export type Resident = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

export type AccessCodeType = "ONE_TIME" | "TIME_BOUND" | "RECURRING";
export type AccessCodeStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export type AccessCode = {
  id: string;
  code: string;
  qrToken: string;
  type: AccessCodeType;
  status: AccessCodeStatus;
  residentId: string;
  visitorName: string;
  visitorPhone: string | null;
  validFrom: string;
  validUntil: string;
  recurrenceRule: string | null;
  maxUses: number;
  useCount: number;
  createdAt: string;
};

export type EntryResult = "SUCCESS" | "EXPIRED" | "DENIED" | "INVALID";
export type EntryMethod = "PIN" | "QR";

export type EntryLog = {
  id: string;
  visitorName: string | null;
  method: EntryMethod;
  result: EntryResult;
  reason: string | null;
  occurredAt: string;
  gate?: { id: string; name: string } | null;
};

export type PanicStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type PanicAlert = {
  id: string;
  status: PanicStatus;
  message: string | null;
  createdAt: string;
  resolvedAt: string | null;
};
