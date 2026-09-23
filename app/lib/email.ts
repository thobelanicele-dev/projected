import { Resend } from "resend";

const REPLY_TO = "thobelani.cele@icloud.com";
const FROM = process.env.EMAIL_FROM ?? "FxInsites <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

async function sendEmail(to: string, subject: string, html: string, fallbackLink: string): Promise<void> {
  const client = getClient();

  if (!client) {
    // No RESEND_API_KEY yet; log the link so the flow is testable end-to-end locally.
    console.log(`[email] RESEND_API_KEY not set. Would send "${subject}" to ${to}:\n${fallbackLink}`);
    return;
  }

  await client.emails.send({
    from: FROM,
    to,
    subject,
    html,
    replyTo: REPLY_TO,
  });
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your FxInsites email",
    `<p>Welcome to FxInsites. Click the button below to verify your email address:</p>
     <p>
       <a href="${link}"
          style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#fafafa;
                 text-decoration:none;border-radius:9999px;font-family:sans-serif;font-size:14px;
                 font-weight:500;">
         Verify email
       </a>
     </p>
     <p style="font-family:sans-serif;font-size:13px;color:#71717a;">
       Or paste this link into your browser: <a href="${link}">${link}</a>
     </p>
     <p style="font-family:sans-serif;font-size:13px;color:#71717a;">This link expires in 24 hours.</p>`,
    link
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail(
    to,
    "Reset your FxInsites password",
    `<p>We received a request to reset your password. Click the link below to choose a new one:</p>
     <p><a href="${link}">${link}</a></p>
     <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    link
  );
}

export async function sendEmailChangeConfirmation(to: string, token: string): Promise<void> {
  const link = `${APP_URL}/api/auth/change-email/confirm?token=${token}`;
  await sendEmail(
    to,
    "Confirm your new FxInsites email",
    `<p>Click the button below to confirm this address as your new FxInsites login email:</p>
     <p>
       <a href="${link}"
          style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#fafafa;
                 text-decoration:none;border-radius:9999px;font-family:sans-serif;font-size:14px;
                 font-weight:500;">
         Confirm email change
       </a>
     </p>
     <p style="font-family:sans-serif;font-size:13px;color:#71717a;">
       Or paste this link into your browser: <a href="${link}">${link}</a>
     </p>
     <p style="font-family:sans-serif;font-size:13px;color:#71717a;">This link expires in 1 hour.</p>`,
    link
  );
}

export async function sendEmailChangeNotice(to: string, newEmail: string): Promise<void> {
  await sendEmail(
    to,
    "Your FxInsites email is changing",
    `<p>A request was made to change the email on your FxInsites account to <strong>${newEmail}</strong>.</p>
     <p>The change won't take effect until that new address is confirmed. If this wasn't you, log in and change your password right away.</p>`,
    `${APP_URL}/account`
  );
}
