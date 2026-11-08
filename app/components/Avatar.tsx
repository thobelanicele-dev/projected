"use client";

import { useEffect, useState } from "react";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";
import { AVATAR_CHANGED_EVENT, loadAvatar } from "@/app/lib/avatar";

/** The person's picture if they set one, otherwise the first letter of their username. Size comes from className. */
export function Avatar({ username, className = "h-9 w-9 text-sm" }: { username: string; className?: string }) {
  const userId = useCurrentUserId();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSrc(loadAvatar(userId));
    const timeout = setTimeout(sync, 0);
    window.addEventListener(AVATAR_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener(AVATAR_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 font-medium text-zinc-100 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small picture saved in this browser; there is nothing for next/image to optimise
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        username.charAt(0).toUpperCase()
      )}
    </span>
  );
}
