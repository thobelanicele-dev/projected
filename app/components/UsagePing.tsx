"use client";

import { useEffect } from "react";
import type { TrackedTool } from "@/app/lib/usage";

// Fire-and-forget: records that this tool's page was opened, for the
// anonymous daily usage count (see app/lib/usage.ts). Never blocks or
// affects the page; a failed ping is silently ignored.
export function UsagePing({ tool }: { tool: TrackedTool }) {
  useEffect(() => {
    fetch("/api/usage/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool }),
    }).catch(() => {});
  }, [tool]);

  return null;
}
