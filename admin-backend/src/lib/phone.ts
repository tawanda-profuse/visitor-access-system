import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { ApiError } from "./api-response";

// Default region assumed when a resident types a local/national-format number without a
// country code (e.g. "0778822943"). Configurable since managed properties may span regions.
const DEFAULT_PHONE_COUNTRY = (process.env.DEFAULT_PHONE_COUNTRY as CountryCode | undefined) ?? "ZW";

// Normalizes any resident-entered phone number to E.164 (e.g. "+263778822943") so that
// "0778822943" and "+263778822943" resolve to the same stored/looked-up value.
export function normalizePhone(input: string): string {
  const parsed = parsePhoneNumberFromString(input.trim(), DEFAULT_PHONE_COUNTRY);
  if (!parsed || !parsed.isValid()) {
    throw new ApiError(`"${input}" is not a valid phone number`, 422);
  }
  return parsed.number;
}
