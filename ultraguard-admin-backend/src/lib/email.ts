import path from "path";
import nodemailer from "nodemailer";
import { devLog } from "./dev-log";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Ultra-Guard Security & Fire <no-reply@ultraguard.local>";

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

export const LOGO_CID = "ultraguard-logo";

/**
 * Sends a branded HTML email via the configured Brevo (or any) SMTP relay. If no SMTP
 * credentials are configured (local dev), the email is logged instead of sent so local
 * running/testing is never blocked on an external provider.
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  link?: string; // invite/reset templates echo the raw link back here purely for a clean, copy-paste-safe dev-log line
}) {
  if (!transporter) {
    devLog(`Email not sent (SMTP not configured) -> to=${params.to} subject="${params.subject}"`);
    if (params.link) {
      // Logged on its own line, separately from the full HTML dump below, since that HTML
      // wraps across many terminal lines and makes the link error-prone to copy by hand.
      devLog(`Link: ${params.link}`);
    }
    devLog(params.html);
    return;
  }

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: [
      {
        filename: "ultraguard-logo.png",
        path: path.join(process.cwd(), "public", "ultraguard-logo.png"),
        cid: LOGO_CID,
      },
    ],
  });
}
