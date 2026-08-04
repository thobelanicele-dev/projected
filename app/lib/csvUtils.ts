export function stripBom(text: string): string {
  return text.replace(/^﻿/, "");
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function matchHeader(headers: string[], aliases: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Handles both US (1,234.56) and European (1.234,56) formatting, plus
// plain forex-style decimals (1.0850) and thousands-only European ints (1.234).
export function parseLocaleNumber(raw: string): number | null {
  let s = raw.trim().replace(/[^0-9.,\-]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // A lone comma followed by anything other than exactly 3 digits can't be a
    // thousands group (those are always 3 digits), so it must be a decimal —
    // this covers forex pip precision (e.g. "1,0850") that a 2-digit-cents
    // assumption would misread as a thousands-grouped integer.
    const decimalPart = s.slice(lastComma + 1);
    const hasSingleGroup = s.indexOf(",") === lastComma;
    s = hasSingleGroup && decimalPart.length !== 3 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      s = s.slice(0, lastDot).replace(/\./g, "") + s.slice(lastDot);
    }
  }

  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// MT4's native export uses "YYYY.MM.DD HH:MM[:SS]" which Date can't parse directly.
export function parseFlexibleDate(raw: string): number | null {
  let s = raw.trim();
  const mt4Match = s.match(/^(\d{4})\.(\d{2})\.(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (mt4Match) {
    const [, y, mo, d, h = "00", mi = "00", se = "00"] = mt4Match;
    s = `${y}-${mo}-${d}T${h}:${mi}:${se}`;
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
}
