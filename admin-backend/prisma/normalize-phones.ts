// One-off migration: normalizes every existing resident's phone number to E.164 so lookups
// (login, admin search, uniqueness checks) treat e.g. "0778822943" and "+263778822943" as
// the same number. Safe to re-run — already-normalized numbers are left untouched.
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../src/lib/phone";

const prisma = new PrismaClient();

async function main() {
  const residents = await prisma.resident.findMany({ select: { id: true, phone: true } });
  let changed = 0;
  let failed = 0;

  for (const resident of residents) {
    if (!resident.phone) continue;
    try {
      const normalized = normalizePhone(resident.phone);
      if (normalized !== resident.phone) {
        await prisma.resident.update({ where: { id: resident.id }, data: { phone: normalized } });
        console.log(`Updated ${resident.id}: "${resident.phone}" -> "${normalized}"`);
        changed++;
      }
    } catch (err) {
      console.warn(`Could not normalize "${resident.phone}" (id ${resident.id}): ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`Done. ${changed} updated, ${failed} could not be parsed (left as-is), ${residents.length} total.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
