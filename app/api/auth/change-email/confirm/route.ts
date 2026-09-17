import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { hashToken } from "@/app/lib/auth/tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/change-email?error=missing-token", req.url));
  }

  const tokenHash = hashToken(token);

  try {
    const rows = await query<{ user_id: string; new_email: string; expires_at: string }>(
      "SELECT user_id, new_email, expires_at FROM email_change_tokens WHERE token_hash = $1",
      [tokenHash]
    );
    const row = rows[0];

    if (!row || Number(row.expires_at) <= Date.now()) {
      await query("DELETE FROM email_change_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.redirect(new URL("/change-email?error=invalid-or-expired", req.url));
    }

    const taken = await query<{ id: string }>("SELECT id FROM users WHERE email = $1 AND id != $2", [
      row.new_email,
      row.user_id,
    ]);
    if (taken[0]) {
      await query("DELETE FROM email_change_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.redirect(new URL("/change-email?error=email-taken", req.url));
    }

    await query("UPDATE users SET email = $1, email_verified = TRUE WHERE id = $2", [
      row.new_email,
      row.user_id,
    ]);
    await query("DELETE FROM email_change_tokens WHERE token_hash = $1", [tokenHash]);

    return NextResponse.redirect(new URL("/change-email?success=true", req.url));
  } catch (error) {
    console.error("Email change confirm failed", error);
    return NextResponse.redirect(new URL("/change-email?error=server-error", req.url));
  }
}
