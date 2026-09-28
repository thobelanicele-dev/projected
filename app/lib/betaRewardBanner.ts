// Same dismiss-once-forever pattern as cookieConsent.ts.
const STORAGE_KEY = "fxinsites.betaRewardBannerDismissed";

export function hasAcknowledgedBetaBanner(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function acknowledgeBetaBanner(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore; worst case the banner reappears next visit
  }
}
