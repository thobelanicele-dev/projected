"use client";

import { NumberTicker } from "@/app/components/beui/number-ticker";

/**
 * Shows a ready-made value such as "58%", "0.8R" or "$100" and rolls its digits
 * to the new value when the text changes. Anything that isn't a digit stays put.
 */
export function RollingText({
  text,
  className,
  duration = 0.6,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  return <NumberTicker value={0} format={() => text} duration={duration} stagger={0.03} className={className} />;
}
