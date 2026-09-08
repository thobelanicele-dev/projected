import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const PAIR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "NZD", "CAD"];

function currenciesForPair(pair: string): string[] {
  const symbols = pair.split("/").map((s) => s.trim().toUpperCase());
  const currencies = new Set(symbols.filter((s) => PAIR_CURRENCIES.includes(s)));
  if (currencies.size === 0 && pair.toUpperCase().includes("USD")) {
    currencies.add("USD");
  }
  return Array.from(currencies);
}

interface FmpEvent {
  date?: string;
  country?: string;
  event?: string;
  currency?: string;
  impact?: string;
}

export interface CalendarEvent {
  event: string;
  country: string;
  impact: string;
  time: string;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`calendar:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const pair = req.nextUrl.searchParams.get("pair")?.trim();
  if (!pair) {
    return NextResponse.json({ error: "Pair is required." }, { status: 400 });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing FMP_API_KEY." }, { status: 500 });
  }

  const currencies = currenciesForPair(pair);
  if (currencies.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const from = new Date();
  const to = new Date(from.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fmt(from)}&to=${fmt(to)}&apikey=${apiKey}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    const raw: FmpEvent[] = Array.isArray(data) ? data : [];

    const events: CalendarEvent[] = raw
      .filter((e) => {
        const currency = String(e.currency ?? "").toUpperCase();
        const impact = String(e.impact ?? "").toLowerCase();
        return currencies.includes(currency) && (impact === "high" || impact === "medium");
      })
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      .slice(0, 5)
      .map((e) => ({
        event: e.event ?? "Economic event",
        country: e.currency ?? e.country ?? "",
        impact: e.impact ?? "medium",
        time: e.date ?? "",
      }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Economic calendar fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch economic calendar." }, { status: 500 });
  }
}
