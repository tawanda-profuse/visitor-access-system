import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@securegate.example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "SecureGate Super Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`Seeded admin account: ${adminEmail} / ${adminPassword}`);

  const property = await prisma.property.upsert({
    where: { id: "seed-property-1" },
    update: {},
    create: {
      id: "seed-property-1",
      name: "Willow Creek Estate",
      address: "123 Willow Creek Drive",
    },
  });

  const unit = await prisma.unit.upsert({
    where: { id: "seed-unit-1" },
    update: {},
    create: { id: "seed-unit-1", label: "House 12", propertyId: property.id },
  });

  const residentPassword = process.env.SEED_RESIDENT_PASSWORD ?? "ChangeMe123!";

  const resident = await prisma.resident.upsert({
    where: { phone: "+27820000000" },
    update: {},
    create: {
      name: "Jane Resident",
      phone: "+27820000000",
      passwordHash: await bcrypt.hash(residentPassword, 10),
      passwordSetAt: new Date(),
      houseNumber: "12",
      streetName: "Willow Creek Drive",
      city: "Cape Town",
      country: "South Africa",
      address: "12 Willow Creek Drive, Cape Town, South Africa.",
    },
  });

  await prisma.residentUnit.upsert({
    where: { residentId_unitId: { residentId: resident.id, unitId: unit.id } },
    update: {},
    create: { residentId: resident.id, unitId: unit.id, isPrimary: true },
  });

  console.log(`Seeded property "${property.name}" with resident ${resident.phone} / ${residentPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
