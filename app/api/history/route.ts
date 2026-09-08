import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export interface PriceRange {
  symbol: string;
  periodDays: number;
  high: number;
  low: number;
  highDate: string;
  lowDate: string;
  trend: "up" | "down" | "sideways";
}

interface Candle {
  datetime: string;
  high: string;
  low: string;
  close: string;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`history:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
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

  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=30&apikey=${apiKey}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    const candles: Candle[] = Array.isArray(data?.values) ? data.values : [];
    if (data?.status === "error" || candles.length === 0) {
      return NextResponse.json(
        { error: data?.message ?? "Historical data not available for this symbol." },
        { status: 502 }
      );
    }

    let high = -Infinity;
    let low = Infinity;
    let highDate = "";
    let lowDate = "";

    for (const c of candles) {
      const h = parseFloat(c.high);
      const l = parseFloat(c.low);
      if (h > high) {
        high = h;
        highDate = c.datetime;
      }
      if (l < low) {
        low = l;
        lowDate = c.datetime;
      }
    }

    // Twelve Data returns candles newest-first.
    const newestClose = parseFloat(candles[0].close);
    const oldestClose = parseFloat(candles[candles.length - 1].close);
    const changePct = ((newestClose - oldestClose) / oldestClose) * 100;
    const trend: PriceRange["trend"] =
      changePct > 1 ? "up" : changePct < -1 ? "down" : "sideways";

    const range: PriceRange = {
      symbol,
      periodDays: candles.length,
      high,
      low,
      highDate,
      lowDate,
      trend,
    };

    return NextResponse.json(range);
  } catch (error) {
    console.error("Historical price fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch historical data." }, { status: 500 });
  }
}
