export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Property = {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  units: Unit[];
  gates?: Gate[];
};

export type Unit = {
  id: string;
  label: string;
  propertyId: string;
  createdAt: string;
  property?: Property;
  residents?: ResidentUnit[];
};

export type ResidentUnit = {
  id: string;
  residentId: string;
  unitId: string;
  isPrimary: boolean;
  unit?: Unit;
  resident?: Resident;
};

export type Resident = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  houseNumber: string | null;
  streetName: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "ACTIVE" | "SUSPENDED" | "REMOVED";
  createdAt: string;
  units: ResidentUnit[];
};

export type Gate = {
  id: string;
  name: string;
  propertyId: string;
  status: "ONLINE" | "OFFLINE" | "UNKNOWN";
  lastSeenAt: string | null;
  createdAt: string;
  property?: Property;
};

export type AccessCode = {
  id: string;
  code: string;
  qrToken: string;
  type: "ONE_TIME" | "TIME_BOUND" | "RECURRING";
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
  residentId: string;
  visitorName: string;
  visitorPhone: string | null;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  useCount: number;
  createdAt: string;
  resident?: Resident;
};

export type EntryLog = {
  id: string;
  accessCodeId: string | null;
  residentId: string | null;
  gateId: string | null;
  visitorName: string | null;
  method: "PIN" | "QR";
  result: "SUCCESS" | "EXPIRED" | "DENIED" | "INVALID";
  reason: string | null;
  occurredAt: string;
  gate?: Gate | null;
  accessCode?: AccessCode | null;
  resident?: Resident | null;
};

export type PanicAlert = {
  id: string;
  residentId: string;
  propertyId: string | null;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  message: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resident?: Resident;
  property?: Property | null;
  resolvedBy?: { name: string } | null;
};
