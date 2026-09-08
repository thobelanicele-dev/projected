import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export interface DayPrice {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Candle {
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

  const rateLimit = checkRateLimit(`verify:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const date = req.nextUrl.searchParams.get("date")?.trim();

  if (!symbol || !date) {
    return NextResponse.json({ error: "Symbol and date are required." }, { status: 400 });
  }

  const target = new Date(date);
  if (isNaN(target.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing TWELVE_DATA_API_KEY." }, { status: 500 });
  }

  // Look a few days back in case the target date falls on a weekend/holiday with no candle.
  const start = new Date(target.getTime() - 5 * 24 * 60 * 60 * 1000);
  const end = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&start_date=${fmt(start)}&end_date=${fmt(end)}&apikey=${apiKey}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    const candles: Candle[] = Array.isArray(data?.values) ? data.values : [];

    if (data?.status === "error" || candles.length === 0) {
      return NextResponse.json(
        { error: data?.message ?? "No historical data available for this date." },
        { status: 502 }
      );
    }

    // Candles are newest-first; find the most recent one on or before the target date.
    const targetStr = fmt(target);
    const match = candles.find((c) => c.datetime.slice(0, 10) <= targetStr) ?? candles[candles.length - 1];

    const dayPrice: DayPrice = {
      symbol,
      date: match.datetime.slice(0, 10),
      open: parseFloat(match.open),
      high: parseFloat(match.high),
      low: parseFloat(match.low),
      close: parseFloat(match.close),
    };

    return NextResponse.json(dayPrice);
  } catch (error) {
    console.error("Historical day price fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch historical price." }, { status: 500 });
  }
}
