export type ToastTone = "success" | "warning" | "error";

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  /** Optional link shown inside the toast, e.g. "See plans". */
  href?: string;
  hrefLabel?: string;
}

export const TOAST_EVENT = "fxinsites:toast";

/** Shows a short notice in the corner of the screen. Safe to call from anywhere in the app. */
export function showToast(toast: ToastInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastInput>(TOAST_EVENT, { detail: toast }));
}
