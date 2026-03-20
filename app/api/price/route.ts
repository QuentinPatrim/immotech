import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) return NextResponse.json({ error: "Ticker manquant" }, { status: 400 });

  try {
    // Obtenir un cookie de session Yahoo Finance
    const cookieRes = await fetch("https://finance.yahoo.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const sessionCookie = (cookieRes.headers.get("set-cookie") || "")
      .split(",").map((c: string) => c.split(";")[0]).join("; ");

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com",
        "Cookie": sessionCookie,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return NextResponse.json({ error: `Ticker introuvable: ${ticker}` }, { status: 404 });

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return NextResponse.json({ error: "Aucune donnée" }, { status: 404 });

    const price = meta.regularMarketPrice ?? meta.previousClose ?? null;
    if (!price) return NextResponse.json({ error: "Prix indisponible" }, { status: 404 });

    return NextResponse.json({
      ticker,
      price: Math.round(price * 100) / 100,
      currency: meta.currency ?? "USD",
      name: meta.longName ?? meta.shortName ?? ticker,
      changePercent: meta.regularMarketChangePercent
        ? Math.round(meta.regularMarketChangePercent * 100) / 100
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}