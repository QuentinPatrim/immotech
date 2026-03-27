import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  // Tentative 1 — query2
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, */*",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
        "Referer": "https://finance.yahoo.com/",
        "Origin": "https://finance.yahoo.com",
      },
    });
    if (res.ok) {
      const data = await res.json();
      const results = (data?.quotes ?? [])
        .filter((item: any) => item.symbol && ["EQUITY","ETF","CRYPTOCURRENCY","MUTUALFUND"].includes(item.quoteType))
        .slice(0, 10)
        .map((item: any) => ({
          ticker: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          exchange: item.exchDisp || item.exchange || "",
          type: item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : "Bourse",
          typeLabel: item.quoteType === "ETF" ? "ETF" : item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : item.quoteType === "MUTUALFUND" ? "Fonds" : "Action",
        }));
      if (results.length > 0) return NextResponse.json({ results });
    }
  } catch (_) {}

  // Tentative 2 — query1
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com/",
      },
    });
    if (res.ok) {
      const data = await res.json();
      const results = (data?.quotes ?? [])
        .filter((item: any) => item.symbol && ["EQUITY","ETF","CRYPTOCURRENCY","MUTUALFUND"].includes(item.quoteType))
        .slice(0, 10)
        .map((item: any) => ({
          ticker: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          exchange: item.exchDisp || item.exchange || "",
          type: item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : "Bourse",
          typeLabel: item.quoteType === "ETF" ? "ETF" : item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : item.quoteType === "MUTUALFUND" ? "Fonds" : "Action",
        }));
      if (results.length > 0) return NextResponse.json({ results });
    }
  } catch (_) {}

  // Fallback — actions les plus cherchées uniquement si Yahoo ne répond pas
  const FALLBACK = [
    // CAC 40
    { ticker: "AI.PA",    name: "Air Liquide",          exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "AIR.PA",   name: "Airbus",               exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "CS.PA",    name: "AXA",                  exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "BNP.PA",   name: "BNP Paribas",          exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "OR.PA",    name: "L'Oréal",              exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "MC.PA",    name: "LVMH",                 exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "RMS.PA",   name: "Hermès",               exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "SAN.PA",   name: "Sanofi",               exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "SU.PA",    name: "Schneider Electric",   exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "TTE.PA",   name: "TotalEnergies",        exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "SAF.PA",   name: "Safran",               exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "DG.PA",    name: "Vinci",                exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "DSY.PA",   name: "Dassault Systèmes",   exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "CAP.PA",   name: "Capgemini",            exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "KER.PA",   name: "Kering",               exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "EL.PA",    name: "EssilorLuxottica",     exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ACA.PA",   name: "Crédit Agricole",      exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "GLE.PA",   name: "Société Générale",     exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ENGI.PA",  name: "Engie",                exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ORA.PA",   name: "Orange",               exchange: "Paris", type: "Bourse", typeLabel: "Action" },
    // US
    { ticker: "AAPL",     name: "Apple",                exchange: "NASDAQ", type: "Bourse", typeLabel: "Action" },
    { ticker: "MSFT",     name: "Microsoft",            exchange: "NASDAQ", type: "Bourse", typeLabel: "Action" },
    { ticker: "GOOGL",    name: "Alphabet (Google)",    exchange: "NASDAQ", type: "Bourse", typeLabel: "Action" },
    { ticker: "AMZN",     name: "Amazon",               exchange: "NASDAQ", type: "Bourse", typeLabel: "Action" },
    { ticker: "NVDA",     name: "NVIDIA",               exchange: "NASDAQ", type: "Bourse", typeLabel: "Action" },
    { ticker: "META",     name: "Meta (Facebook)",      exchange: "NASDAQ", type: "Bourse", typeLabel: "Action" },
    { ticker: "TSLA",     name: "Tesla",                exchange: "NASDAQ", type: "Bourse", typeLabel: "Action" },
    { ticker: "JPM",      name: "JPMorgan Chase",       exchange: "NYSE",   type: "Bourse", typeLabel: "Action" },
    { ticker: "V",        name: "Visa",                 exchange: "NYSE",   type: "Bourse", typeLabel: "Action" },
    { ticker: "JNJ",      name: "Johnson & Johnson",    exchange: "NYSE",   type: "Bourse", typeLabel: "Action" },
    // ETF
    { ticker: "CW8.PA",   name: "Amundi MSCI World",   exchange: "Paris",    type: "Bourse", typeLabel: "ETF" },
    { ticker: "IWDA.AS",  name: "iShares MSCI World",  exchange: "Amsterdam",type: "Bourse", typeLabel: "ETF" },
    { ticker: "VWCE.DE",  name: "Vanguard All-World",  exchange: "XETRA",    type: "Bourse", typeLabel: "ETF" },
    { ticker: "SP500.PA", name: "Amundi S&P 500",       exchange: "Paris",    type: "Bourse", typeLabel: "ETF" },
    // Métaux
    { ticker: "GLD",      name: "SPDR Gold ETF",        exchange: "NYSE",   type: "Bourse", typeLabel: "ETF" },
    { ticker: "SLV",      name: "iShares Silver ETF",   exchange: "NYSE",   type: "Bourse", typeLabel: "ETF" },
    { ticker: "PHAU.L",   name: "WisdomTree Gold ETC",  exchange: "London", type: "Bourse", typeLabel: "ETF" },
    // Crypto
    { ticker: "BTC-USD",  name: "Bitcoin",              exchange: "Crypto", type: "Crypto", typeLabel: "Crypto" },
    { ticker: "ETH-USD",  name: "Ethereum",             exchange: "Crypto", type: "Crypto", typeLabel: "Crypto" },
    { ticker: "SOL-USD",  name: "Solana",               exchange: "Crypto", type: "Crypto", typeLabel: "Crypto" },
    { ticker: "BNB-USD",  name: "BNB",                  exchange: "Crypto", type: "Crypto", typeLabel: "Crypto" },
    { ticker: "XRP-USD",  name: "XRP",                  exchange: "Crypto", type: "Crypto", typeLabel: "Crypto" },
  ];

  const qLower = q.toLowerCase();
  const results = FALLBACK
    .filter(a => a.name.toLowerCase().includes(qLower) || a.ticker.toLowerCase().includes(qLower))
    .slice(0, 10);

  return NextResponse.json({ results });
}