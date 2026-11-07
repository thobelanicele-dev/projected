import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { hashToken } from "@/app/lib/auth/tokens";

// The link in the email sent to the CURRENT address of an account with no
// password. It does not change the email by itself; the new address still has
// to confirm too.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/change-email?error=missing-token", req.url));
  }

  const tokenHash = hashToken(token);

  try {
    const rows = await query<{ token_hash: string; expires_at: string }>(
      "SELECT token_hash, expires_at FROM email_change_tokens WHERE approval_token_hash = $1",
      [tokenHash]
    );
    const row = rows[0];

    if (!row || Number(row.expires_at) <= Date.now()) {
      if (row) await query("DELETE FROM email_change_tokens WHERE token_hash = $1", [row.token_hash]);
      return NextResponse.redirect(new URL("/change-email?error=invalid-or-expired", req.url));
    }

    await query("UPDATE email_change_tokens SET approval_token_hash = NULL WHERE token_hash = $1", [
      row.token_hash,
    ]);

    return NextResponse.redirect(new URL("/change-email?approved=true", req.url));
  } catch (error) {
    console.error("Email change approval failed", error);
    return NextResponse.redirect(new URL("/change-email?error=server-error", req.url));
  }
}
