import { prisma } from "./prisma";

const SETTINGS_ID = "singleton";
const DEFAULT_SUPPORT_EMAIL = "admin@securegate.example.com";

export async function getSupportEmail(): Promise<string> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: SETTINGS_ID } });
  return settings?.supportEmail ?? DEFAULT_SUPPORT_EMAIL;
}

export async function setSupportEmail(supportEmail: string): Promise<string> {
  const settings = await prisma.systemSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { supportEmail },
    create: { id: SETTINGS_ID, supportEmail },
  });
  return settings.supportEmail;
}
