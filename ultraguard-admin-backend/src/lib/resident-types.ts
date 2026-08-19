export type ResidentUnitSummary = {
  id: string;
  unit: {
    id: string;
    label: string;
    property: { id: string; name: string; address: string };
  };
};

export type ResidentStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";

export type ResidentSession = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: ResidentStatus;
  units: ResidentUnitSummary[];
};

export type AccessCodeType = "ONE_TIME" | "TIME_BOUND" | "RECURRING";
export type AccessCodeStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export type AccessCode = {
  id: string;
  code: string;
  qrToken: string;
  type: AccessCodeType;
  status: AccessCodeStatus;
  visitorName: string;
  visitorPhone: string | null;
  visitorIdNumber: string | null;
  validFrom: string;
  validUntil: string;
  recurrenceRule: string | null;
  maxUses: number;
  useCount: number;
  createdAt: string;
};

export type EntryResult = "SUCCESS" | "EXPIRED" | "DENIED" | "INVALID" | "WRONG_LOCATION";
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

// --- Security Guard mode (endpoints are unauthenticated; used here from within an
// authenticated resident session) ---

export type Gate = {
  id: string;
  name: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
};

export type GuardResultCode = "NOT_FOUND" | "WRONG_LOCATION" | "REVOKED" | "USED" | "EXPIRED" | "DENIED" | "SUCCESS";

export type GuardVisit = {
  visitorName: string;
  gate: { id: string; name: string };
  property: { id: string; name: string; address: string };
};

export type GuardVerifyResult = {
  resultCode: GuardResultCode;
  message: string;
  visit?: GuardVisit;
};
