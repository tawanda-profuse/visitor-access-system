// Builds the human-readable combined address string from its structured parts,
// e.g. { houseNumber: "32", streetName: "Chatsworth Road", city: "Harare", country: "Zimbabwe" }
// -> "32 Chatsworth Road, Harare, Zimbabwe."
export type AddressParts = {
  houseNumber?: string | null;
  streetName?: string | null;
  city?: string | null;
  country?: string | null;
};

export function buildAddress(parts: AddressParts): string | null {
  const line = [parts.houseNumber, parts.streetName].filter(Boolean).join(" ").trim();
  const segments = [line, parts.city, parts.country].filter((segment) => !!segment);
  if (segments.length === 0) return null;
  return `${segments.join(", ")}.`;
}
