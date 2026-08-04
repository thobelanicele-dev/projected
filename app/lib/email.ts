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
    // No RESEND_API_KEY yet — log the link so the flow is testable end-to-end locally.
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
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your FxInsites email",
    `<p>Welcome to FxInsites. Click the link below to verify your email address:</p>
     <p><a href="${link}">${link}</a></p>
     <p>This link expires in 24 hours.</p>`,
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
