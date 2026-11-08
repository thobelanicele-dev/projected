"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/app/components/Avatar";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";
import { AVATAR_CHANGED_EVENT, fileToAvatar, loadAvatar, removeAvatar, saveAvatar } from "@/app/lib/avatar";
import { showToast } from "@/app/lib/toast";

export function ProfilePictureSection({ username }: { username: string }) {
  const userId = useCurrentUserId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasPicture, setHasPicture] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setHasPicture(loadAvatar(userId) !== null);
    const timeout = setTimeout(sync, 0);
    window.addEventListener(AVATAR_CHANGED_EVENT, sync);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener(AVATAR_CHANGED_EVENT, sync);
    };
  }, [userId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again later
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      saveAvatar(userId, await fileToAvatar(file));
      showToast({ message: "Profile picture updated", tone: "success" });
    } catch (err) {
      setError(
        err instanceof DOMException
          ? "Your browser couldn't save the picture. Free up some space and try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar username={username} className="h-16 w-16 text-2xl" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Saving…" : hasPicture ? "Change photo" : "Upload photo"}
          </button>
          {hasPicture && (
            <button
              type="button"
              onClick={() => removeAvatar(userId)}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900"
            >
              Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" aria-label="Choose a profile picture" />
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}
      <p className="text-xs text-zinc-500">
        Your picture stays in this browser only. It isn&apos;t uploaded to our servers, so it won&apos;t follow you to
        another device or browser.
      </p>
    </div>
  );
}
