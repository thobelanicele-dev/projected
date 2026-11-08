import type { Metadata } from "next";
import { getSession } from "@/app/lib/auth/session";
import { HomeLauncher } from "@/app/components/HomeLauncher";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const session = await getSession();
  return <HomeLauncher username={session?.username ?? ""} />;
}
