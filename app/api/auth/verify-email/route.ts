import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { hashToken } from "@/app/lib/auth/tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing-token", req.url));
  }

  const tokenHash = hashToken(token);

  try {
    const rows = await query<{ user_id: string; expires_at: string }>(
      "SELECT user_id, expires_at FROM email_verification_tokens WHERE token_hash = $1",
      [tokenHash]
    );
    const row = rows[0];

    if (!row || Number(row.expires_at) <= Date.now()) {
      await query("DELETE FROM email_verification_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.redirect(new URL("/verify-email?error=invalid-or-expired", req.url));
    }

    await query("UPDATE users SET email_verified = TRUE WHERE id = $1", [row.user_id]);
    await query("DELETE FROM email_verification_tokens WHERE token_hash = $1", [tokenHash]);

    // No session is created here. The link only proves the mailbox, and signing
    // in whoever opens it would let anyone hand a victim a link that puts them
    // into the link owner's account.
    return NextResponse.redirect(new URL("/verify-email?success=true", req.url));
  } catch (error) {
    console.error("Email verification failed", error);
    return NextResponse.redirect(new URL("/verify-email?error=server-error", req.url));
  }
}
