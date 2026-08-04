import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    const price = data?.price ? parseFloat(data.price) : NaN;
    if (!data || data.status === "error" || isNaN(price)) {
      return NextResponse.json(
        { error: data?.message ?? "Live price not available for this symbol." },
        { status: 502 }
      );
    }

    return NextResponse.json({ symbol, price });
  } catch (error) {
    console.error("Live price fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch live price." }, { status: 500 });
  }
}
