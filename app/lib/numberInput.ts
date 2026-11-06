// Turns what a person typed into a number. People in South Africa, much of
// Europe and elsewhere write decimals with a comma ("12,5") and group digits
// with spaces ("10 000"), which parseFloat reads as 12 and 10. These helpers
// understand those, and reject text that isn't a number at all instead of
// quietly using the digits at the front of it ("12abc").

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

function clean(raw: string): string {
  return raw.replace(/[\s  ]/g, "");
}

function finish(s: string): number {
  return NUMBER.test(s) ? Number(s) : NaN;
}

// "1,234,567" or "1.234.567": the digits before each separator come in groups of exactly three.
const GROUPED = /^[+-]?\d{1,3}([.,]\d{3})+$/;
const PLAIN_OR_GROUPED = /^[+-]?(\d+|\d{1,3}([.,]\d{3})+)$/;

/**
 * For prices, pips, percentages and ratios, where a comma is always a decimal
 * point: "12,5" is 12.5 and "1,0850" is 1.085. When both appear, the last one
 * is the decimal point: "1,234.56" and "1.234,56" are both 1234.56.
 */
export function parseDecimal(raw: string): number {
  const s = clean(raw);
  if (!s) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalIsComma = lastComma > lastDot;
    const decimalAt = decimalIsComma ? lastComma : lastDot;
    const wholeRaw = s.slice(0, decimalAt);
    if (!PLAIN_OR_GROUPED.test(wholeRaw)) return NaN;
    return finish(`${wholeRaw.replace(/[.,]/g, "")}.${s.slice(decimalAt + 1)}`);
  }
  if (lastComma !== -1) {
    // Several commas can only be thousands separators ("1,234,567").
    if (s.split(",").length > 2) return GROUPED.test(s) ? finish(s.replace(/,/g, "")) : NaN;
    return finish(s.replace(",", "."));
  }
  // Several dots can only be thousands separators too ("1.234.567").
  if (s.split(".").length > 2) return GROUPED.test(s) ? finish(s.replace(/\./g, "")) : NaN;
  return finish(s);
}

/**
 * For money amounts (a balance, a profit), where "10,000" is far more likely
 * ten thousand than ten: a single comma followed by exactly three digits is
 * a thousands separator. Everything else behaves like parseDecimal.
 */
export function parseMoney(raw: string): number {
  const s = clean(raw);
  if (/^[+-]?\d{1,3},\d{3}$/.test(s)) return finish(s.replace(",", ""));
  return parseDecimal(s);
}
