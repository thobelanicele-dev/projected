import { userScopedKey } from "@/app/lib/userScopedStorage";

// The profile picture lives only in this browser (like the journal), keyed by
// account so two people sharing a computer don't see each other's picture.
// Nothing is uploaded; the privacy page says so.
const BASE_KEY = "fxinsites.avatar";
export const AVATAR_CHANGED_EVENT = "fxinsites:avatar-changed";
export const AVATAR_SIZE = 192;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/** The biggest centred square inside a picture of this size, so a wide or tall photo is cropped, not squashed. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: (width - side) / 2, sy: (height - side) / 2, side };
}

export function loadAvatar(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(userScopedKey(BASE_KEY, userId));
    return value && value.startsWith("data:image/") ? value : null;
  } catch {
    return null;
  }
}

function announce() {
  window.dispatchEvent(new Event(AVATAR_CHANGED_EVENT));
}

export function saveAvatar(userId: string, dataUrl: string): void {
  window.localStorage.setItem(userScopedKey(BASE_KEY, userId), dataUrl);
  announce();
}

export function removeAvatar(userId: string): void {
  try {
    window.localStorage.removeItem(userScopedKey(BASE_KEY, userId));
  } catch {
    // Nothing to remove if storage is blocked.
  }
  announce();
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We couldn't read that image. Try a JPG or PNG."));
    };
    img.src = url;
  });
}

/** Turns a chosen photo into a small, square, re-encoded picture ready to store. Throws a message fit to show the user. */
export async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Choose a photo (JPG, PNG or WebP).");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That photo is too large. Choose one under 8 MB.");
  }

  const img = await loadImage(file);
  const { sx, sy, side } = squareCrop(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that image.");

  // A see-through PNG would turn black when saved as a JPEG, so paint white first.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return canvas.toDataURL("image/jpeg", 0.85);
}
