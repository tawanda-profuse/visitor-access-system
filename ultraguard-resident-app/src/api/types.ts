export type ResidentUnitSummary = {
  id: string;
  residentId: string;
  unitId: string;
  isPrimary: boolean;
  createdAt: string;
  unit: {
    id: string;
    label: string;
    propertyId: string;
    createdAt: string;
    property: {
      id: string;
      name: string;
      address: string;
      createdAt: string;
      updatedAt: string;
    };
  };
};

export type ResidentStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";

export type Resident = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  houseNumber: string | null;
  streetName: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  passwordSetAt: string | null;
  pushToken: string | null;
  status: ResidentStatus;
  createdAt: string;
  updatedAt: string;
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
  residentId: string;
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

// --- Security Guard mode (unauthenticated) ---

export type Gate = {
  id: string;
  name: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
};

export type GuardResultCode =
  | "NOT_FOUND"
  | "WRONG_LOCATION"
  | "REVOKED"
  | "USED"
  | "EXPIRED"
  | "DENIED"
  | "SUCCESS";

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
