import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";

export async function GET() {
  let user;
  try {
    user = await getSession();
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
