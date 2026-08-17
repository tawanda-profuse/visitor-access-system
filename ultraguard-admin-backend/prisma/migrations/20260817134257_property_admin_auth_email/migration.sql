/*
  Warnings:

  - You are about to drop the column `otpCodeHash` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiresAt` on the `Resident` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AccessCode" ADD COLUMN     "visitorIdNumber" TEXT;

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "propertyId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EntryLog" ADD COLUMN     "verifiedVia" TEXT NOT NULL DEFAULT 'HARDWARE';

-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "otpCodeHash",
DROP COLUMN "otpExpiresAt",
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordSetAt" TIMESTAMP(3),
ALTER COLUMN "phone" DROP NOT NULL;

-- CheckConstraint: a resident must have at least one of phone/email to be reachable/loginable
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_phone_or_email_required" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);

-- CreateTable
CREATE TABLE "PasswordSetupToken" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordSetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordSetupToken_tokenHash_key" ON "PasswordSetupToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordSetupToken_subjectType_subjectId_purpose_idx" ON "PasswordSetupToken"("subjectType", "subjectId", "purpose");

-- CreateIndex
CREATE INDEX "Admin_propertyId_idx" ON "Admin"("propertyId");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
