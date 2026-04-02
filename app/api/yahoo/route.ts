import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy Yahoo Finance — évite les restrictions CORS browser
 * Usage :
 *   /api/yahoo?endpoint=chart&ticker=AAPL&range=6mo&interval=1d
 *   /api/yahoo?endpoint=search&q=LVMH
 *   /api/yahoo?endpoint=quote&ticker=MC.PA
 *   /api/yahoo?endpoint=quoteSummary&ticker=MC.PA   (dividendes + profile)
 *   /api/yahoo?endpoint=yahoosearch&q=tesla          (recherche Yahoo dynamique)
 */

const HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
  "Cache-Control": "no-cache",
  Origin: "https://finance.yahoo.com",
  Referer: "https://finance.yahoo.com/",
};

async function yahooFetch(url: string) {
  let response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    const fallback = url.replace("query1.finance.yahoo.com", "query2.finance.yahoo.com");
    response = await fetch(fallback, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  }
  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const endpoint = searchParams.get("endpoint");

  try {
    let yahooUrl = "";

    // ── Chart OHLCV ──
    if (endpoint === "chart") {
      const ticker = searchParams.get("ticker");
      const range = searchParams.get("range") || "6mo";
      const interval = searchParams.get("interval") || "1d";
      if (!ticker) return NextResponse.json({ error: "ticker requis" }, { status: 400 });
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`;
    }

    // ── Local search (autocomplete) ──
    else if (endpoint === "search") {
      const q = searchParams.get("q");
      if (!q) return NextResponse.json({ error: "q requis" }, { status: 400 });
      yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=false&enableCb=false`;
    }

    // ── Yahoo dynamic search (complément de la liste locale) ──
    else if (endpoint === "yahoosearch") {
      const q = searchParams.get("q");
      if (!q) return NextResponse.json({ error: "q requis" }, { status: 400 });
      yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0&enableFuzzyQuery=true&enableCb=false&enableNavLinks=false`;
    }

    // ── Quote (prix en temps réel) ──
    else if (endpoint === "quote") {
      const ticker = searchParams.get("ticker");
      if (!ticker) return NextResponse.json({ error: "ticker requis" }, { status: 400 });
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    }

    // ── QuoteSummary (dividendes, profile, stats) ──
    else if (endpoint === "quoteSummary") {
      const ticker = searchParams.get("ticker");
      if (!ticker) return NextResponse.json({ error: "ticker requis" }, { status: 400 });
      const modules = [
        "summaryDetail",
        "defaultKeyStatistics",
        "calendarEvents",
        "assetProfile",
      ].join(",");
      yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
    }

    else {
      return NextResponse.json({ error: "endpoint invalide" }, { status: 400 });
    }

    const response = await yahooFetch(yahooUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance a retourné ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}