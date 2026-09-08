import { NextRequest, NextResponse } from "next/server";
import type { Candle } from "@/app/lib/backtestEngine";
import { getSession } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

interface RawCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`candles:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 365;

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required." }, { status: 400 });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing TWELVE_DATA_API_KEY." },
      { status: 500 }
    );
  }

  const outputsize = Math.min(Math.max(isNaN(days) ? 365 : days, 30), 5000);

  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${outputsize}&apikey=${apiKey}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    const values: RawCandle[] = Array.isArray(data?.values) ? data.values : [];

    if (data?.status === "error" || values.length === 0) {
      return NextResponse.json(
        { error: data?.message ?? "No historical data available for this symbol." },
        { status: 502 }
      );
    }

    // Twelve Data returns newest-first; the backtest engine needs oldest-first.
    const candles: Candle[] = values
      .map((v) => ({
        date: v.datetime.slice(0, 10),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
      }))
      .reverse();

    return NextResponse.json({ symbol, candles });
  } catch (error) {
    console.error("Candle fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch historical candles." }, { status: 500 });
  }
}
