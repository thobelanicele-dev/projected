import { NextResponse } from "next/server";
import { destroySession } from "@/app/lib/auth/session";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Logout failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
