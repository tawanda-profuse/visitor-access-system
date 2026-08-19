import { getSupportEmail } from "./settings";
import { LOGO_CID } from "./email";
import { getApkBuildDate, formatApkBuildDate } from "./apk-info";

const BRAND_RED = "#D71920";
const BRAND_BLACK = "#111111";

async function baseTemplate(title: string, bodyHtml: string): Promise<string> {
  const supportEmail = await getSupportEmail();
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f2f2f2;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_RED};padding:20px 24px;text-align:center;">
                <img src="cid:${LOGO_CID}" alt="Ultra-Guard Security & Fire" height="40" style="height:40px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;color:${BRAND_BLACK};">
                <h1 style="margin:0 0 16px;font-size:20px;color:${BRAND_BLACK};">${title}</h1>
                <div style="font-size:15px;line-height:1.6;color:${BRAND_BLACK};">${bodyHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color:${BRAND_BLACK};padding:16px 24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#ffffff;">
                  Ultra-Guard Security &amp; Fire &middot; Need help? Contact <a href="mailto:${supportEmail}" style="color:${BRAND_RED};">${supportEmail}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(link: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;">
    <a href="${link}" style="background-color:${BRAND_RED};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;display:inline-block;">${label}</a>
  </p>
  <p style="font-size:12px;color:#666;word-break:break-all;">If the button doesn't work, copy and paste this link into your browser:<br/>${link}</p>`;
}

export async function residentInviteEmail(link: string) {
  const apkUrl = process.env.ANDROID_APK_URL;
  const apkBuildDateIso = apkUrl ? await getApkBuildDate() : null;
  const apkButtonLabel = apkBuildDateIso
    ? `Download Mobile App (version from ${formatApkBuildDate(apkBuildDateIso)})`
    : "Download Mobile App";
  const webAppUrl = `${process.env.BASE_URL}/resident/login`;
  const appDownloadHtml = `
    <p style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e5e5;">
      <strong>Get the mobile app</strong><br/>
      Create and manage visitor Gate Passes from your phone with the Ultra-Guard mobile app.
    </p>
    <p style="font-size:13px;color:#666;">Currently available for Android devices only.</p>
    ${apkUrl ? button(apkUrl, apkButtonLabel) : ""}
    <p style="font-size:13px;color:#666;">Using an iPhone, or prefer a browser? <a href="${webAppUrl}" style="color:${BRAND_RED};">Use the Web App</a> instead — no download required.</p>`;

  return {
    subject: "Welcome to Ultra-Guard — Set Up Your Account",
    link,
    html: await baseTemplate(
      "Welcome to Ultra-Guard",
      `<p>An account has been created for you on the Ultra-Guard Visitor Access System.</p>
       <p>Set your password to finish setting up your account, then open the Ultra-Guard mobile app and sign in with your phone number or email to start creating visitor Gate Passes.</p>
       ${button(link, "Set Your Password")}
       ${appDownloadHtml}`,
    ),
  };
}

export async function propertyAdminInviteEmail(link: string) {
  return {
    subject: "You've Been Invited as an Ultra-Guard Property Administrator",
    link,
    html: await baseTemplate(
      "You're Invited",
      `<p>You've been added as a Property Administrator on the Ultra-Guard Visitor Access System.</p>
       <p>Set your password to sign in to the admin portal. On your first sign-in you'll be guided through a short setup wizard to configure your property and gates.</p>
       ${button(link, "Set Your Password")}`,
    ),
  };
}

export async function forgotPasswordEmail(link: string) {
  return {
    subject: "Reset Your Ultra-Guard Password",
    link,
    html: await baseTemplate(
      "Reset Your Password",
      `<p>We received a request to reset your Ultra-Guard password. If you didn't request this, you can safely ignore this email.</p>
       ${button(link, "Reset Password")}
       <p style="font-size:13px;color:#666;">This link will expire in 1 hour.</p>`,
    ),
  };
}

export async function panicAlertEmail(params: { residentName: string; location: string; message: string }) {
  return {
    subject: `URGENT — PANIC ALERT: ${params.residentName}`.toUpperCase(),
    html: await baseTemplate(
      "🚨 Panic Alert Raised",
      `<p><strong>Resident:</strong> ${params.residentName}</p>
       <p><strong>Location:</strong> ${params.location}</p>
       <p><strong>Message from resident:</strong> ${params.message}</p>
       <p style="margin-top:24px;color:${BRAND_RED};font-weight:bold;">Please respond immediately.</p>`,
    ),
  };
}
