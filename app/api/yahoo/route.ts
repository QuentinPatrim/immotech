import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy Yahoo Finance — évite les restrictions CORS browser
 * Endpoints :
 *   /api/yahoo?endpoint=chart&ticker=AAPL&range=6mo&interval=1d
 *   /api/yahoo?endpoint=search&q=LVMH
 *   /api/yahoo?endpoint=quote&ticker=MC.PA
 *   /api/yahoo?endpoint=quoteSummary&ticker=MC.PA
 */

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY CACHE
// ═══════════════════════════════════════════════════════════════

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

// TTL in ms per endpoint type — more volatile data gets shorter TTL
const CACHE_TTL: Record<string, number> = {
  chart: 5 * 60 * 1000,        // 5 min — OHLCV data
  quote: 60 * 1000,             // 1 min — real-time price
  search: 10 * 60 * 1000,       // 10 min — search autocomplete
  quoteSummary: 15 * 60 * 1000, // 15 min — fundamentals change slowly
};

const cache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown, ttl: number): void {
  // Evict oldest entry if cache is getting too large (>200 entries)
  if (cache.size >= 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ═══════════════════════════════════════════════════════════════
// INPUT VALIDATION WHITELISTS
// ═══════════════════════════════════════════════════════════════

const VALID_RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]);
const VALID_INTERVALS = new Set(["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"]);
// Ticker: only allow letters, digits, dots, dashes, carets (Yahoo suffixes like ^FCHI)
const TICKER_RE = /^[A-Z0-9.^=-]{1,20}$/i;
const SEARCH_RE = /^.{1,100}$/;

// ═══════════════════════════════════════════════════════════════
// FETCH HELPER (query1 → query2 fallback)
// ═══════════════════════════════════════════════════════════════

const HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
  "Cache-Control": "no-cache",
  Origin: "https://finance.yahoo.com",
  Referer: "https://finance.yahoo.com/",
};

async function yahooFetch(url: string): Promise<Response> {
  let response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const fallback = url.replace("query1.finance.yahoo.com", "query2.finance.yahoo.com");
    response = await fetch(fallback, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
  }
  return response;
}

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const endpoint = searchParams.get("endpoint");

  try {
    let yahooUrl = "";
    let cacheKey = "";
    const ttl = CACHE_TTL[endpoint ?? ""] ?? 5 * 60 * 1000;

    // ── Chart OHLCV ──
    if (endpoint === "chart") {
      const ticker = searchParams.get("ticker");
      const range = searchParams.get("range") || "6mo";
      const interval = searchParams.get("interval") || "1d";

      if (!ticker || !TICKER_RE.test(ticker))
        return NextResponse.json({ error: "ticker invalide" }, { status: 400 });
      if (!VALID_RANGES.has(range))
        return NextResponse.json({ error: `range invalide. Valeurs autorisees : ${[...VALID_RANGES].join(", ")}` }, { status: 400 });
      if (!VALID_INTERVALS.has(interval))
        return NextResponse.json({ error: `interval invalide. Valeurs autorisees : ${[...VALID_INTERVALS].join(", ")}` }, { status: 400 });

      cacheKey = `chart:${ticker}:${range}:${interval}`;
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`;
    }

    // ── Search (autocomplete) ──
    else if (endpoint === "search") {
      const q = searchParams.get("q");
      if (!q || !SEARCH_RE.test(q))
        return NextResponse.json({ error: "q invalide" }, { status: 400 });

      cacheKey = `search:${q.toLowerCase()}`;
      yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=true&enableCb=false`;
    }

    // ── Quote (prix temps réel) ──
    else if (endpoint === "quote") {
      const ticker = searchParams.get("ticker");
      if (!ticker || !TICKER_RE.test(ticker))
        return NextResponse.json({ error: "ticker invalide" }, { status: 400 });

      cacheKey = `quote:${ticker}`;
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    }

    // ── QuoteSummary (fondamentaux + dividendes + financials) ──
    else if (endpoint === "quoteSummary") {
      const ticker = searchParams.get("ticker");
      if (!ticker || !TICKER_RE.test(ticker))
        return NextResponse.json({ error: "ticker invalide" }, { status: 400 });

      const modules = [
        "summaryDetail", "defaultKeyStatistics", "calendarEvents",
        "financialData", "price", "summaryProfile",
      ].join(",");

      cacheKey = `quoteSummary:${ticker}`;
      yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
    }

    // ── Invalid endpoint ──
    else {
      return NextResponse.json(
        { error: "endpoint invalide. Valeurs autorisees : chart | search | quote | quoteSummary" },
        { status: 400 }
      );
    }

    // ── Cache hit? ──
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "X-Cache": "HIT",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      });
    }

    // ── Fetch from Yahoo ──
    const response = await yahooFetch(yahooUrl);

    if (!response.ok) {
      const status = response.status;
      const hint =
        status === 404 ? "Ticker introuvable sur Yahoo Finance." :
        status === 429 ? "Trop de requetes — reessayez dans quelques secondes." :
        status === 403 ? "Acces refuse par Yahoo Finance." :
        `Yahoo Finance a retourne ${status}.`;
      return NextResponse.json({ error: hint, status }, { status });
    }

    const data = await response.json();

    // Store in cache
    setCached(cacheKey, data, ttl);

    return NextResponse.json(data, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("abort");
    return NextResponse.json(
      { error: isTimeout ? "Yahoo Finance n'a pas repondu a temps (timeout 10s)." : msg },
      { status: isTimeout ? 504 : 500 }
    );
  }
}