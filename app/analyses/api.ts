// ═══════════════════════════════════════════════════════════════
// NEXUS STOCKS — Data Layer (API + Supabase)
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabaseClient";
import type { StockInfo, OHLCV, Fundamentals, PortfolioPosition, Meta } from "./types";

// ═══════════════════════════════════════════════════════════════
// STOCK DATABASE
// ═══════════════════════════════════════════════════════════════

export const STOCKS: StockInfo[] = [
  { name: "LVMH", ticker: "MC.PA", country: "France", sector: "Luxe" },
  { name: "TotalEnergies", ticker: "TTE.PA", country: "France", sector: "Énergie" },
  { name: "Hermès", ticker: "RMS.PA", country: "France", sector: "Luxe" },
  { name: "Airbus", ticker: "AIR.PA", country: "France", sector: "Aéronautique" },
  { name: "Sanofi", ticker: "SAN.PA", country: "France", sector: "Santé" },
  { name: "BNP Paribas", ticker: "BNP.PA", country: "France", sector: "Finance" },
  { name: "Schneider Electric", ticker: "SU.PA", country: "France", sector: "Industrie" },
  { name: "L'Oréal", ticker: "OR.PA", country: "France", sector: "Cosmétiques" },
  { name: "Air Liquide", ticker: "AI.PA", country: "France", sector: "Chimie" },
  { name: "AXA", ticker: "CS.PA", country: "France", sector: "Assurance" },
  { name: "Danone", ticker: "BN.PA", country: "France", sector: "Alimentation" },
  { name: "Kering", ticker: "KER.PA", country: "France", sector: "Luxe" },
  { name: "Safran", ticker: "SAF.PA", country: "France", sector: "Aéronautique" },
  { name: "Vinci", ticker: "DG.PA", country: "France", sector: "Construction" },
  { name: "Engie", ticker: "ENGI.PA", country: "France", sector: "Énergie" },
  { name: "Thales", ticker: "HO.PA", country: "France", sector: "Défense" },
  { name: "Stellantis", ticker: "STLAP.PA", country: "France", sector: "Automobile" },
  { name: "Saint-Gobain", ticker: "SGO.PA", country: "France", sector: "Matériaux" },
  { name: "SAP", ticker: "SAP.DE", country: "Allemagne", sector: "Logiciel" },
  { name: "Siemens", ticker: "SIE.DE", country: "Allemagne", sector: "Industrie" },
  { name: "Allianz", ticker: "ALV.DE", country: "Allemagne", sector: "Assurance" },
  { name: "Adidas", ticker: "ADS.DE", country: "Allemagne", sector: "Sport" },
  { name: "Shell", ticker: "SHEL.L", country: "UK", sector: "Énergie" },
  { name: "ASML", ticker: "ASML.AS", country: "Pays-Bas", sector: "Semi-conducteurs" },
  { name: "Nestlé", ticker: "NESN.SW", country: "Suisse", sector: "Alimentation" },
  { name: "Apple", ticker: "AAPL", country: "USA", sector: "Technologie" },
  { name: "Microsoft", ticker: "MSFT", country: "USA", sector: "Technologie" },
  { name: "Nvidia", ticker: "NVDA", country: "USA", sector: "Semi-conducteurs" },
  { name: "Alphabet (Google)", ticker: "GOOGL", country: "USA", sector: "Technologie" },
  { name: "Amazon", ticker: "AMZN", country: "USA", sector: "Commerce" },
  { name: "Meta", ticker: "META", country: "USA", sector: "Tech" },
  { name: "Tesla", ticker: "TSLA", country: "USA", sector: "Automobile" },
  { name: "Bitcoin", ticker: "BTC-EUR", country: "Crypto", sector: "Crypto" },
  { name: "Ethereum", ticker: "ETH-EUR", country: "Crypto", sector: "Crypto" },
  { name: "Solana", ticker: "SOL-EUR", country: "Crypto", sector: "Crypto" },
];

export function searchStocks(q: string): StockInfo[] {
  if (!q || q.length < 2) return [];
  const lq = q.toLowerCase();
  return STOCKS.filter(s =>
    s.name.toLowerCase().includes(lq) ||
    s.ticker.toLowerCase().includes(lq) ||
    s.sector.toLowerCase().includes(lq)
  ).slice(0, 5);
}

export const SCAN_UNIVERSES = [
  { key: "cac40", label: "CAC 40", tickers: ["MC.PA", "TTE.PA", "RMS.PA", "AIR.PA", "SAN.PA", "BNP.PA", "SU.PA", "OR.PA", "AI.PA", "CS.PA", "BN.PA", "KER.PA", "SAF.PA", "DG.PA", "ENGI.PA", "HO.PA", "STLAP.PA", "SGO.PA"] },
  { key: "dax", label: "DAX", tickers: ["SAP.DE", "SIE.DE", "ALV.DE", "ADS.DE", "BAS.DE", "BMW.DE", "DTE.DE", "MRK.DE", "MUV2.DE", "VOW3.DE"] },
  { key: "us", label: "US Top", tickers: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH"] },
  { key: "crypto", label: "Crypto", tickers: ["BTC-EUR", "ETH-EUR", "SOL-EUR"] },
];

// ═══════════════════════════════════════════════════════════════
// YAHOO FINANCE API
// ═══════════════════════════════════════════════════════════════

export async function fetchChart(ticker: string, range: string, interval: string): Promise<OHLCV[]> {
  const res = await fetch(`/api/yahoo?endpoint=chart&ticker=${encodeURIComponent(ticker)}&range=${range}&interval=${interval}&_t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("Données vides.");
  const ts: number[] = result.timestamp ?? [], q = result.indicators.quote[0];
  const out: OHLCV[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.open[i] == null || q.close[i] == null) continue;
    out.push({ time: ts[i], open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] ?? 0 });
  }
  if (out.length < 20) throw new Error("Pas assez de données.");
  return out;
}

export async function fetchMeta(ticker: string): Promise<Meta | null> {
  try {
    const res = await fetch(`/api/yahoo?endpoint=quote&ticker=${encodeURIComponent(ticker)}&_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const m = json?.chart?.result?.[0]?.meta;
    if (!m) return null;
    const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((v): v is number => v != null && !isNaN(v));
    const curr = m.regularMarketPrice || valid[valid.length - 1];
    const prev = m.previousClose || m.chartPreviousClose || valid[valid.length - 2];
    return { name: m.longName || m.shortName || ticker, currency: m.currency || "EUR", curr, prev, change: curr - prev, pct: ((curr - prev) / prev) * 100 };
  } catch { return null; }
}

export async function fetchFundamentals(ticker: string): Promise<Fundamentals | null> {
  try {
    const modules = "summaryDetail,defaultKeyStatistics,financialData,price,summaryProfile";
    const res = await fetch(`/api/yahoo?endpoint=quoteSummary&ticker=${encodeURIComponent(ticker)}&modules=${modules}&_t=${Date.now()}`, { cache: 'no-store' });
    
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.quoteSummary?.result?.[0];
    if (!r) return null;

    const sd = r.summaryDetail || {}, ks = r.defaultKeyStatistics || {}, fd = r.financialData || {};
    const ce = r.calendarEvents || {}, pr = r.price || {}, sp = r.summaryProfile || {};
    const raw = (obj: Record<string, { raw?: number; fmt?: string }>, key: string): number | null => obj?.[key]?.raw ?? null;
    const fmt = (obj: Record<string, { raw?: number; fmt?: string }>, key: string): string | null => obj?.[key]?.fmt ?? null;
    
    return {
      marketCap: raw(sd, "marketCap") ?? raw(pr, "marketCap"),
      pe: raw(sd, "trailingPE"),
      forwardPe: raw(sd, "forwardPE") ?? raw(ks, "forwardPE"),
      eps: raw(ks, "trailingEps"),
      dividendRate: raw(sd, "dividendRate"),
      dividendYield: raw(sd, "dividendYield") != null ? +(raw(sd, "dividendYield")! * 100).toFixed(2) : null,
      exDividendDate: fmt(sd, "exDividendDate") ?? fmt(ce, "exDividendDate"),
      payoutRatio: raw(sd, "payoutRatio") != null ? +(raw(sd, "payoutRatio")! * 100).toFixed(1) : null,
      beta: raw(sd, "beta") ?? raw(ks, "beta"),
      profitMargin: raw(fd, "profitMargins") != null ? +(raw(fd, "profitMargins")! * 100).toFixed(1) : null,
      debtToEquity: raw(fd, "debtToEquity"),
      revenueGrowth: raw(fd, "revenueGrowth") != null ? +(raw(fd, "revenueGrowth")! * 100).toFixed(1) : null,
      targetMeanPrice: raw(fd, "targetMeanPrice"),
      recommendationKey: fd.recommendationKey ?? null,
      numberOfAnalysts: raw(fd, "numberOfAnalystOpinions"),
      sector: sp.sector ?? null,
      industry: sp.industry ?? null,
    };
  } catch { 
    return null;
  }
}

export interface YahooResult { symbol: string; shortname?: string; longname?: string; exchDisp?: string; typeDisp?: string; quoteType?: string; }

export async function fetchYahooSearch(q: string): Promise<YahooResult[]> {
  try {
    const res = await fetch(`/api/yahoo?endpoint=search&q=${encodeURIComponent(q)}&_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.quotes ?? []).filter((r: YahooResult) => ["EQUITY", "ETF", "CRYPTOCURRENCY", "INDEX"].includes(r.quoteType || "")).slice(0, 8);
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO
// ═══════════════════════════════════════════════════════════════

export async function loadPortfolio(): Promise<PortfolioPosition[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from("profiles").select("assets_json").eq("id", user.id).single();
    if (!data?.assets_json) return [];
    return data.assets_json.filter((a: any) => (a.type === "Bourse" || a.type === "Crypto") && a.ticker).map((a: any) => ({ ticker: a.ticker, name: a.name, quantity: a.quantity || 0, pru: a.buyPrice || 0, addedAt: "" }));
  } catch { return []; }
}

export async function addToPortfolio(ticker: string, name: string, quantity: number, pru: number, type: "Bourse" | "Crypto"): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from("profiles").select("assets_json").eq("id", user.id).single();
    if (!data) return false;
    const assets: any[] = data.assets_json || [];
    const idx = assets.findIndex((a) => a.ticker === ticker);
    if (idx >= 0) {
      const oldQty = assets[idx].quantity || 0, oldPru = assets[idx].buyPrice || pru;
      const totalQty = oldQty + quantity, newPru = (oldQty * oldPru + quantity * pru) / totalQty;
      assets[idx] = { ...assets[idx], quantity: totalQty, buyPrice: +newPru.toFixed(4), unitPrice: pru, value: totalQty * pru };
    } else {
      assets.push({ id: `nx-${Date.now()}`, name, type, ticker, quantity, buyPrice: pru, unitPrice: pru, value: quantity * pru, envelope: type === "Crypto" ? "Autre" : "CTO" });
    }
    const { error } = await supabase.from("profiles").update({ assets_json: assets }).eq("id", user.id);
    return !error;
  } catch { return false; }
}

export async function removeFromPortfolio(ticker: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from("profiles").select("assets_json").eq("id", user.id).single();
    if (!data) return false;
    const filtered = (data.assets_json || []).filter((a: any) => a.ticker !== ticker);
    const { error } = await supabase.from("profiles").update({ assets_json: filtered }).eq("id", user.id);
    return !error;
  } catch { return false; }
}