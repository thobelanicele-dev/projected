import { NextResponse } from "next/server";
import { destroySession } from "@/app/lib/auth/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
