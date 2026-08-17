-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "lastPropertyId" TEXT;

-- CreateIndex
CREATE INDEX "Resident_lastPropertyId_idx" ON "Resident"("lastPropertyId");

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_lastPropertyId_fkey" FOREIGN KEY ("lastPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: residents currently assigned to a unit get lastPropertyId set to that
-- unit's property (preferring their primary unit), so existing data isn't left null.
UPDATE "Resident" r
SET "lastPropertyId" = sub."propertyId"
FROM (
  SELECT DISTINCT ON (ru."residentId") ru."residentId", u."propertyId"
  FROM "ResidentUnit" ru
  JOIN "Unit" u ON u.id = ru."unitId"
  ORDER BY ru."residentId", ru."isPrimary" DESC, ru."createdAt" ASC
) sub
WHERE r.id = sub."residentId";
