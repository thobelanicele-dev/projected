const STORAGE_KEY = "fxinsites.cookieConsent";

export function hasAcknowledgedCookies(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // If we can't read localStorage, don't nag with a banner we also can't dismiss.
    return true;
  }
}

export function acknowledgeCookies(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore — worst case the banner reappears next visit
  }
}
