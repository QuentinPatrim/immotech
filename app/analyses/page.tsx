"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, Loader2, ChevronUp, ChevronDown, X, Clock,
  TrendingUp, TrendingDown, Shield, Target, Eye, Zap, AlertTriangle,
  Activity, Layers, Crosshair, BarChart3, ArrowRight,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, CartesianGrid, BarChart,
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// PALETTE — Neurodesign: warm neutral bg, deep blue accents
// ═══════════════════════════════════════════════════════════════

const P = {
  bg: "#faf9f7",         // warm off-white (low cognitive load)
  card: "#ffffff",        // pure white cards
  cardAlt: "#f5f4f1",    // subtle warm gray
  border: "#eae8e4",     // warm border
  borderLight: "#f0eeeb",
  text: "#1a1a2e",       // near-black (high contrast)
  textMid: "#5a5a72",    // mid gray
  textLight: "#9a98a8",  // light gray
  textMuted: "#c4c2cc",
  blue: "#2563eb",       // primary action
  blueLight: "#dbeafe",
  blueSoft: "#eff6ff",
  green: "#059669",      // positive / opportunity
  greenLight: "#d1fae5",
  greenSoft: "#ecfdf5",
  red: "#dc2626",        // negative / risk (used sparingly)
  redLight: "#fee2e2",
  redSoft: "#fef2f2",
  amber: "#d97706",      // neutral / wait
  amberLight: "#fef3c7",
  amberSoft: "#fffbeb",
};

// ═══════════════════════════════════════════════════════════════
// STOCK DATABASE
// ═══════════════════════════════════════════════════════════════

interface StockInfo { name: string; ticker: string; country: string; sector: string; }

const STOCKS: StockInfo[] = [
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
];

function searchStocks(q: string): StockInfo[] {
  if (!q || q.length < 2) return [];
  const lq = q.toLowerCase();
  return STOCKS.filter(s => s.name.toLowerCase().includes(lq) || s.ticker.toLowerCase().includes(lq) || s.sector.toLowerCase().includes(lq)).slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OHLCV { time: number; open: number; close: number; high: number; low: number; volume: number; }

interface TechResult {
  rsi: number[]; stochRsi: { k: number[]; d: number[] };
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bb: { upper: number[]; middle: number[]; lower: number[] };
  ma20: number[]; ma50: number[]; ma200: number[]; obv: number[];
  atr: number[]; ichimoku: { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[] };
  fibonacci: { levels: { label: string; price: number }[] };
  supports: number[]; resistances: number[];
}

interface LayerSignal { layer: "price_action" | "technique" | "volume" | "structure"; name: string; verdict: "bullish" | "bearish" | "neutral"; confidence: number; detail: string; }

interface Confluence { score: number; action: "OPPORTUNITÉ" | "ATTENDRE" | "RISQUÉ"; layers: LayerSignal[]; bullCount: number; bearCount: number; summary: string; entryZone: { min: number; max: number }; stopLoss: number; targets: number[]; riskReward: number; }

// ═══════════════════════════════════════════════════════════════
// TECHNICAL ENGINE (compact)
// ═══════════════════════════════════════════════════════════════

const smaC = (d: number[], p: number) => d.map((_, i) => i < p - 1 ? NaN : d.slice(i - p + 1, i + 1).reduce((s, v) => s + v, 0) / p);
function emaC(d: number[], p: number) { const k = 2 / (p + 1), r = new Array(d.length).fill(NaN); const fv = d.findIndex(v => !isNaN(v)); if (fv === -1 || fv + p > d.length) return r; r[fv + p - 1] = d.slice(fv, fv + p).reduce((s, v) => s + v, 0) / p; for (let i = fv + p; i < d.length; i++) r[i] = d[i] * k + r[i - 1] * (1 - k); return r; }
function rsiCalc(c: number[], p = 14) { const r = new Array(c.length).fill(NaN); if (c.length < p + 1) return r; let ag = 0, al = 0; for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d > 0) ag += d; else al -= d; } ag /= p; al /= p; r[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); for (let i = p + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p; al = (al * (p - 1) + (d < 0 ? -d : 0)) / p; r[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); } return r; }
function stochRsiCalc(rsi: number[], period = 14) { const stoch = new Array(rsi.length).fill(NaN); for (let i = period - 1; i < rsi.length; i++) { const sl = rsi.slice(i - period + 1, i + 1).filter(v => !isNaN(v)); if (sl.length < period) continue; const lo = Math.min(...sl), hi = Math.max(...sl); stoch[i] = hi === lo ? 50 : ((rsi[i] - lo) / (hi - lo)) * 100; } return { k: smaC(stoch.map(v => isNaN(v) ? 0 : v), 3), d: smaC(smaC(stoch.map(v => isNaN(v) ? 0 : v), 3).map(v => isNaN(v) ? 0 : v), 3) }; }
function macdCalc(c: number[]) { const f = emaC(c, 12), s = emaC(c, 26); const m = c.map((_, i) => isNaN(f[i]) || isNaN(s[i]) ? NaN : f[i] - s[i]); const sig = emaC(m.map(v => isNaN(v) ? 0 : v), 9); return { macd: m, signal: sig, histogram: m.map((v, i) => isNaN(v) || isNaN(sig[i]) ? NaN : v - sig[i]) }; }
function bbCalc(c: number[], p = 20) { const mid = smaC(c, p); const band = (mult: number) => c.map((_, i) => { if (isNaN(mid[i])) return NaN; const sl = c.slice(i - p + 1, i + 1); return mid[i] + mult * Math.sqrt(sl.reduce((a, v) => a + (v - mid[i]) ** 2, 0) / p); }); return { upper: band(2), middle: mid, lower: band(-2) }; }
function atrCalc(o: OHLCV[], p = 14) { const tr = o.map((c, i) => i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - o[i - 1].close), Math.abs(c.low - o[i - 1].close))); return smaC(tr, p); }
function ichimokuCalc(o: OHLCV[]) { const hs = o.map(c => c.high), ls = o.map(c => c.low); const mp = (h: number[], l: number[], p: number, i: number) => i < p - 1 ? NaN : (Math.max(...h.slice(i - p + 1, i + 1)) + Math.min(...l.slice(i - p + 1, i + 1))) / 2; const tk = o.map((_, i) => mp(hs, ls, 9, i)); const kj = o.map((_, i) => mp(hs, ls, 26, i)); return { tenkan: tk, kijun: kj, senkouA: tk.map((t, i) => isNaN(t) || isNaN(kj[i]) ? NaN : (t + kj[i]) / 2), senkouB: o.map((_, i) => mp(hs, ls, 52, i)) }; }
function fibCalc(o: OHLCV[]) { const r = o.slice(-60); const hi = Math.max(...r.map(c => c.high)), lo = Math.min(...r.map(c => c.low)), rng = hi - lo; return { levels: [{ label: "0%", price: hi }, { label: "23.6%", price: hi - rng * 0.236 }, { label: "38.2%", price: hi - rng * 0.382 }, { label: "50%", price: hi - rng * 0.5 }, { label: "61.8%", price: hi - rng * 0.618 }, { label: "100%", price: lo }] }; }
function obvCalc(c: number[], v: number[]) { const r = [0]; for (let i = 1; i < c.length; i++) r.push(r[i - 1] + (c[i] > c[i - 1] ? v[i] : c[i] < c[i - 1] ? -v[i] : 0)); return r; }
function srCalc(o: OHLCV[], lb = 15) { const hs = o.map(c => c.high), ls = o.map(c => c.low); const ph: number[] = [], pl: number[] = []; for (let i = lb; i < o.length - lb; i++) { if (hs[i] === Math.max(...hs.slice(i - lb, i + lb + 1))) ph.push(hs[i]); if (ls[i] === Math.min(...ls.slice(i - lb, i + lb + 1))) pl.push(ls[i]); } const cl = (a: number[]) => { const s = [...a].sort((x, y) => x - y), out: number[] = []; let i = 0; while (i < s.length) { let j = i; while (j < s.length && (s[j] - s[i]) / s[i] < 0.005) j++; out.push(s.slice(i, j).reduce((x, y) => x + y, 0) / (j - i)); i = j; } return out.slice(-4); }; return { supports: cl(pl), resistances: cl(ph) }; }

function computeAll(o: OHLCV[]): TechResult { const c = o.map(x => x.close), v = o.map(x => x.volume); const { supports, resistances } = srCalc(o); return { rsi: rsiCalc(c), stochRsi: stochRsiCalc(rsiCalc(c)), macd: macdCalc(c), bb: bbCalc(c), ma20: smaC(c, 20), ma50: smaC(c, 50), ma200: smaC(c, 200), obv: obvCalc(c, v), atr: atrCalc(o), ichimoku: ichimokuCalc(o), fibonacci: fibCalc(o), supports, resistances }; }

// ═══════════════════════════════════════════════════════════════
// CONFLUENCE ENGINE
// ═══════════════════════════════════════════════════════════════

function analyzeConfluence(ohlcv: OHLCV[], t: TechResult): Confluence {
  const n = ohlcv.length - 1, price = ohlcv[n].close, layers: LayerSignal[] = [];
  // Price Action
  const rec = ohlcv.slice(-20), hs = rec.map(c => c.high), ls = rec.map(c => c.low);
  let hh = 0, ll = 0; for (let i = 5; i < rec.length; i++) { if (hs[i] > hs[i - 5]) hh++; if (ls[i] < ls[i - 5]) ll++; }
  const ts2 = (hh - ll) / rec.length;
  if (ts2 > 0.15) layers.push({ layer: "price_action", name: "Tendance haussière", verdict: "bullish", confidence: Math.min(0.9, ts2 * 3), detail: "Plus hauts et plus bas ascendants — les acheteurs dominent." });
  else if (ts2 < -0.15) layers.push({ layer: "price_action", name: "Tendance baissière", verdict: "bearish", confidence: Math.min(0.9, Math.abs(ts2) * 3), detail: "Plus bas successifs — les vendeurs contrôlent." });
  else layers.push({ layer: "price_action", name: "Consolidation", verdict: "neutral", confidence: 0.5, detail: "Pas de tendance claire. Phase d'équilibre." });

  const c0 = ohlcv[n], c1 = ohlcv[n - 1];
  const body = Math.abs(c0.close - c0.open), wLo = Math.min(c0.open, c0.close) - c0.low, avgB = rec.slice(-10).reduce((s, c2) => s + Math.abs(c2.close - c2.open), 0) / 10;
  if (wLo > body * 2 && body > 0) layers.push({ layer: "price_action", name: "Marteau", verdict: "bullish", confidence: 0.75, detail: "Longue mèche basse — les vendeurs ont été repoussés." });
  if (body < avgB * 0.15 && avgB > 0) layers.push({ layer: "price_action", name: "Doji", verdict: "neutral", confidence: 0.6, detail: "Indécision. Attendre confirmation." });
  if (c0.close > c0.open && c1.close < c1.open && c0.close > c1.open && c0.open < c1.close) layers.push({ layer: "price_action", name: "Englobante haussière", verdict: "bullish", confidence: 0.8, detail: "Les acheteurs ont absorbé toute la pression vendeuse." });
  if (c0.close < c0.open && c1.close > c1.open && c0.open > c1.close && c0.close < c1.open) layers.push({ layer: "price_action", name: "Englobante baissière", verdict: "bearish", confidence: 0.8, detail: "Les vendeurs reprennent le contrôle." });

  const nS = t.supports.find(s => Math.abs(s - price) / price < 0.02);
  const nR = t.resistances.find(r => Math.abs(r - price) / price < 0.02);
  if (nS) layers.push({ layer: "structure", name: "Support proche", verdict: "bullish", confidence: 0.7, detail: `Zone de support à ${nS.toFixed(2)} — rebond historiquement probable.` });
  if (nR) layers.push({ layer: "structure", name: "Résistance proche", verdict: "bearish", confidence: 0.7, detail: `Résistance à ${nR.toFixed(2)} — risque de rejet.` });

  // Technical
  const rsi = t.rsi[n];
  if (!isNaN(rsi)) { if (rsi < 30) layers.push({ layer: "technique", name: "RSI survendu", verdict: "bullish", confidence: 0.8, detail: `RSI à ${rsi.toFixed(0)} — les vendeurs s'épuisent.` }); else if (rsi > 70) layers.push({ layer: "technique", name: "RSI suracheté", verdict: "bearish", confidence: 0.8, detail: `RSI à ${rsi.toFixed(0)} — risque de correction.` }); else layers.push({ layer: "technique", name: `RSI ${rsi.toFixed(0)}`, verdict: "neutral", confidence: 0.3, detail: "Pas de signal extrême." }); }

  if (n >= 20) { const pL = ohlcv.slice(n - 20, n + 1).map(c2 => c2.close), rS = t.rsi.slice(n - 20, n + 1), pM = Math.min(...pL), rM = rS[pL.indexOf(pM)]; if (price <= pM * 1.01 && !isNaN(rM) && rsi > rM + 5) layers.push({ layer: "technique", name: "Divergence RSI ↑", verdict: "bullish", confidence: 0.85, detail: "Prix bas mais RSI remonte — retournement probable." }); }

  const mc = t.macd.macd[n], ms = t.macd.signal[n], mcp = t.macd.macd[n - 1], msp = t.macd.signal[n - 1];
  if (!isNaN(mc) && !isNaN(ms) && !isNaN(mcp) && !isNaN(msp)) { if (mcp < msp && mc > ms) layers.push({ layer: "technique", name: "MACD croisement ↑", verdict: "bullish", confidence: 0.85, detail: "Retournement du momentum à la hausse." }); else if (mcp > msp && mc < ms) layers.push({ layer: "technique", name: "MACD croisement ↓", verdict: "bearish", confidence: 0.85, detail: "Retournement du momentum à la baisse." }); else if (mc > ms) layers.push({ layer: "technique", name: "MACD positif", verdict: "bullish", confidence: 0.5, detail: "Momentum haussier en cours." }); else layers.push({ layer: "technique", name: "MACD négatif", verdict: "bearish", confidence: 0.5, detail: "Pression vendeuse." }); }

  const [ma20, ma50] = [t.ma20[n], t.ma50[n]];
  if (!isNaN(ma20) && !isNaN(ma50)) { if (price > ma20 && price > ma50) layers.push({ layer: "technique", name: "Prix > MAs", verdict: "bullish", confidence: 0.7, detail: "Au-dessus des moyennes mobiles 20 et 50." }); else if (price < ma20 && price < ma50) layers.push({ layer: "technique", name: "Prix < MAs", verdict: "bearish", confidence: 0.7, detail: "Sous les moyennes mobiles." }); }

  if (!isNaN(t.bb.upper[n]) && !isNaN(t.bb.lower[n])) { if (price <= t.bb.lower[n]) layers.push({ layer: "technique", name: "Bande basse Bollinger", verdict: "bullish", confidence: 0.65, detail: "Prix extrême bas — rebond statistiquement probable." }); else if (price >= t.bb.upper[n]) layers.push({ layer: "technique", name: "Bande haute Bollinger", verdict: "bearish", confidence: 0.65, detail: "Prix extrême haut — retour vers moyenne attendu." }); const w = ((t.bb.upper[n] - t.bb.lower[n]) / t.bb.middle[n]) * 100; if (w < 3) layers.push({ layer: "technique", name: "Squeeze Bollinger", verdict: "neutral", confidence: 0.7, detail: "Volatilité comprimée — explosion imminente." }); }

  const sa = t.ichimoku.senkouA[n], sb = t.ichimoku.senkouB[n];
  if (!isNaN(sa) && !isNaN(sb)) { const cl2 = Math.max(sa, sb), clL = Math.min(sa, sb); if (price > cl2) layers.push({ layer: "structure", name: "Au-dessus du nuage", verdict: "bullish", confidence: 0.75, detail: "Ichimoku confirme la tendance haussière." }); else if (price < clL) layers.push({ layer: "structure", name: "Sous le nuage", verdict: "bearish", confidence: 0.75, detail: "Ichimoku confirme la tendance baissière." }); else layers.push({ layer: "structure", name: "Dans le nuage", verdict: "neutral", confidence: 0.5, detail: "Zone d'incertitude Ichimoku." }); }

  // Volume
  const avgVol = ohlcv.slice(-20).reduce((s, c2) => s + c2.volume, 0) / 20, curVol = ohlcv[n].volume, vR = curVol / (avgVol || 1);
  const obvCh = t.obv[n] - t.obv[Math.max(0, n - 10)], prCh = price - ohlcv[Math.max(0, n - 10)].close;
  if (vR > 1.5 && prCh > 0) layers.push({ layer: "volume", name: "Volume fort ↑", verdict: "bullish", confidence: 0.85, detail: `Volume ${vR.toFixed(1)}× supérieur à la moyenne — conviction forte.` });
  else if (vR > 1.5 && prCh < 0) layers.push({ layer: "volume", name: "Volume fort ↓", verdict: "bearish", confidence: 0.85, detail: `Volume élevé avec baisse — panique vendeuse.` });
  if (obvCh > 0 && prCh < 0) layers.push({ layer: "volume", name: "Accumulation OBV", verdict: "bullish", confidence: 0.8, detail: "OBV monte malgré la baisse — accumulation discrète." });
  else if (obvCh < 0 && prCh > 0) layers.push({ layer: "volume", name: "Distribution OBV", verdict: "bearish", confidence: 0.8, detail: "OBV baisse malgré la hausse — distribution en cours." });

  // Score
  const bullish = layers.filter(l => l.verdict === "bullish"), bearish = layers.filter(l => l.verdict === "bearish");
  const bS = bullish.reduce((s, l) => s + l.confidence, 0), beS = bearish.reduce((s, l) => s + l.confidence, 0), tot = bS + beS || 1;
  const score = Math.round(Math.min(100, Math.max(0, 50 + ((bS - beS) / tot) * 50))) | 0;
  const action = score >= 65 ? "OPPORTUNITÉ" : score <= 35 ? "RISQUÉ" : "ATTENDRE";
  const atr2 = t.atr[n] || price * 0.02;
  const cSup = t.supports.length > 0 ? Math.max(...t.supports.filter(s => s < price), price * 0.95) : price * 0.95;
  const cRes = t.resistances.length > 0 ? Math.min(...t.resistances.filter(r => r > price), price * 1.05) : price * 1.05;
  const sl = score >= 65 ? cSup * 0.985 : cRes * 1.015;
  const t1 = score >= 65 ? cRes : cSup;
  const summary = score >= 65 ? `${bullish.length} signaux haussiers convergent — opportunité identifiée.` : score <= 35 ? `${bearish.length} signaux baissiers convergent — configuration défavorable.` : `Signaux mixtes (${bullish.length}↑ vs ${bearish.length}↓). Attendre une confluence plus claire.`;
  return { score, action, layers, bullCount: bullish.length, bearCount: bearish.length, summary, entryZone: { min: Math.max(cSup, price - atr2 * 0.5), max: price + atr2 * 0.3 }, stopLoss: sl, targets: [t1, t1 + (t1 - price) * 0.5, t1 + (t1 - price)], riskReward: Math.round(Math.abs(t1 - price) / Math.abs(price - sl) * 10) / 10 };
}

// ═══════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════

async function fetchChart(ticker: string, range: string, interval: string): Promise<OHLCV[]> {
  const res = await fetch(`/api/yahoo?endpoint=chart&ticker=${encodeURIComponent(ticker)}&range=${range}&interval=${interval}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`); const json = await res.json(); if (json.error) throw new Error(json.error);
  const result = json?.chart?.result?.[0]; if (!result) throw new Error("Données vides.");
  const ts: number[] = result.timestamp ?? [], q = result.indicators.quote[0]; const out: OHLCV[] = [];
  for (let i = 0; i < ts.length; i++) { if (q.open[i] == null || q.close[i] == null) continue; out.push({ time: ts[i], open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] ?? 0 }); }
  if (out.length < 20) throw new Error("Pas assez de données."); return out;
}

async function fetchMeta(ticker: string) {
  try { const res = await fetch(`/api/yahoo?endpoint=quote&ticker=${encodeURIComponent(ticker)}`); if (!res.ok) return null; const json = await res.json(); const m = json?.chart?.result?.[0]?.meta; if (!m) return null; const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []; const valid = closes.filter((v): v is number => v != null && !isNaN(v)); const curr = m.regularMarketPrice || valid[valid.length - 1]; const prev = m.previousClose || m.chartPreviousClose || valid[valid.length - 2]; return { name: m.longName || m.shortName || ticker, currency: m.currency || "EUR", curr, prev, change: curr - prev, pct: ((curr - prev) / prev) * 100 }; } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
// RECHARTS TOOLTIP
// ═══════════════════════════════════════════════════════════════

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number> }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-2xl border px-4 py-3 text-xs shadow-lg" style={{ background: P.card, borderColor: P.border }}>
      <p className="font-mono text-[10px] mb-1" style={{ color: P.textLight }}>{d.label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span style={{ color: P.textLight }}>O</span><span className="font-semibold" style={{ color: P.text }}>{d.open?.toFixed(2)}</span>
        <span style={{ color: P.textLight }}>H</span><span className="font-semibold" style={{ color: P.green }}>{d.high?.toFixed(2)}</span>
        <span style={{ color: P.textLight }}>L</span><span className="font-semibold" style={{ color: P.red }}>{d.low?.toFixed(2)}</span>
        <span style={{ color: P.textLight }}>C</span><span className="font-semibold" style={{ color: P.text }}>{d.close?.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

const VIEW_PERIODS = [
  { l: "1S", v: "5d", i: "1d" }, { l: "1M", v: "1mo", i: "1d" }, { l: "3M", v: "3mo", i: "1d" },
  { l: "6M", v: "6mo", i: "1d" }, { l: "1A", v: "1y", i: "1wk" }, { l: "2A", v: "2y", i: "1wk" },
];

// Analysis is ALWAYS computed on 6mo daily data (fixed)
const ANALYSIS_PERIOD = { v: "6mo", i: "1d" };

type Overlay = "ma" | "bollinger" | "ichimoku";

export default function NexusStocksPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockInfo[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [selected, setSelected] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<OHLCV[]>([]); // Fixed 6mo data for analysis
  const [viewData, setViewData] = useState<OHLCV[]>([]);          // Variable data for chart display
  const [tech, setTech] = useState<TechResult | null>(null);
  const [confluence, setConfluence] = useState<Confluence | null>(null);
  const [viewPeriod, setViewPeriod] = useState(VIEW_PERIODS[3]);
  const [meta, setMeta] = useState<{ name: string; currency: string; curr: number; prev: number; change: number; pct: number } | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>(["ma"]);

  useEffect(() => { if (query.length >= 2) { setSuggestions(searchStocks(query)); setShowSugg(true); } else { setSuggestions([]); setShowSugg(false); } }, [query]);

  // Main analysis — always fetches 6mo for scoring
  const analyze = useCallback(async (stock: StockInfo) => {
    setLoading(true); setError(null); setShowSugg(false);
    try {
      const [data6mo, m] = await Promise.all([fetchChart(stock.ticker, ANALYSIS_PERIOD.v, ANALYSIS_PERIOD.i), fetchMeta(stock.ticker)]);
      const tr = computeAll(data6mo);
      setAnalysisData(data6mo); setViewData(data6mo); setTech(tr);
      setConfluence(analyzeConfluence(data6mo, tr)); setMeta(m);
      setViewPeriod(VIEW_PERIODS[3]); // Reset view to 6M
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur."); }
    finally { setLoading(false); }
  }, []);

  // View period change — only changes the chart display, NOT the analysis
  const changeView = useCallback(async (per: typeof VIEW_PERIODS[0]) => {
    if (!selected) return;
    setViewPeriod(per);
    if (per.v === ANALYSIS_PERIOD.v) { setViewData(analysisData); return; }
    try {
      const data = await fetchChart(selected.ticker, per.v, per.i);
      setViewData(data);
    } catch { /* keep current data if fetch fails */ }
  }, [selected, analysisData]);

  const pickStock = (s: StockInfo) => { setSelected(s); setQuery(s.name); analyze(s); };
  const clear = () => { setSelected(null); setQuery(""); setAnalysisData([]); setViewData([]); setTech(null); setConfluence(null); setMeta(null); setError(null); };
  const toggleOverlay = (o: Overlay) => setOverlays(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  const fmtV = (v: number) => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`;
  const lastPrice = meta?.curr ?? (analysisData.length ? analysisData[analysisData.length - 1].close : null);

  // Recharts data — based on VIEW data (for zooming)
  const chartData = useMemo(() => {
    if (!viewData.length) return [];
    // For chart overlays, we need tech data aligned to viewData
    // If viewData === analysisData, we use tech directly
    // If viewData is different period, we compute fresh tech
    const techForView = viewData === analysisData && tech ? tech : computeAll(viewData);
    const vis = viewData.slice(-120);
    const off = viewData.length - vis.length;
    return vis.map((c, i) => {
      const gi = i + off; const d = new Date(c.time * 1000);
      return {
        label: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`,
        open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
        body: [Math.min(c.open, c.close), Math.max(c.open, c.close)] as [number, number],
        up: c.close >= c.open,
        ma20: techForView.ma20[gi], ma50: techForView.ma50[gi],
        bbU: techForView.bb.upper[gi], bbL: techForView.bb.lower[gi],
        tenkan: techForView.ichimoku.tenkan[gi], kijun: techForView.ichimoku.kijun[gi],
        rsi: techForView.rsi[gi],
        macdLine: techForView.macd.macd[gi], macdSig: techForView.macd.signal[gi], macdHist: techForView.macd.histogram[gi],
      };
    });
  }, [viewData, analysisData, tech]);

  const prices = chartData.flatMap(d => [d.high, d.low].filter(v => !isNaN(v)));
  const pMin = prices.length ? Math.min(...prices) * 0.997 : 0;
  const pMax = prices.length ? Math.max(...prices) * 1.003 : 1;
  const tickN = Math.max(1, Math.floor(chartData.length / 6));

  const layerMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    price_action: { label: "Price Action", icon: <BarChart3 size={13} />, color: P.blue },
    technique: { label: "Indicateurs", icon: <Activity size={13} />, color: "#7c3aed" },
    volume: { label: "Volume", icon: <TrendingUp size={13} />, color: P.green },
    structure: { label: "Structure", icon: <Layers size={13} />, color: P.amber },
  };

  return (
    <div className="min-h-screen" style={{ background: P.bg, color: P.text, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      <main className="md:ml-64 px-5 pt-8 pb-20 md:px-10">
        <div className="max-w-[1440px] mx-auto space-y-8">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight" style={{ color: P.text }}>
              Nexus <span style={{ color: P.blue }}>Stocks</span>
            </h1>
            <div className="flex items-center gap-2 text-[11px]" style={{ color: P.textLight }}>
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: P.green }} />Temps réel
            </div>
          </div>

          {/* SEARCH */}
          <div className="relative">
            <div className="flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all duration-300 focus-within:shadow-lg" style={{ background: P.card, borderColor: P.border }}>
              <Search size={18} style={{ color: P.textMuted }} />
              <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => query.length >= 2 && setShowSugg(true)}
                placeholder="Rechercher un actif…"
                className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400" style={{ color: P.text }} />
              {query && <button onClick={clear}><X size={16} style={{ color: P.textMuted }} /></button>}
            </div>
            <AnimatePresence>
              {showSugg && suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-2 left-0 right-0 rounded-2xl border shadow-xl z-50 overflow-hidden" style={{ background: P.card, borderColor: P.border }}>
                  {suggestions.map((s, i) => (
                    <button key={s.ticker} onClick={() => pickStock(s)} className="w-full flex items-center justify-between px-6 py-4 transition-colors text-left hover:bg-slate-50" style={i ? { borderTop: `1px solid ${P.borderLight}` } : {}}>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: P.blueLight }}><span className="text-xs font-bold" style={{ color: P.blue }}>{s.name[0]}</span></div>
                        <div><span className="text-sm font-semibold" style={{ color: P.text }}>{s.name}</span><span className="text-xs ml-2" style={{ color: P.textLight }}>{s.ticker}</span></div>
                      </div>
                      <span className="text-[11px] px-2.5 py-1 rounded-lg" style={{ background: P.cardAlt, color: P.textMid }}>{s.sector}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && <div className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm" style={{ background: P.redSoft, color: P.red }}><AlertTriangle size={16} />{error}</div>}
          {loading && <div className="flex flex-col items-center py-32 gap-4"><Loader2 size={28} className="animate-spin" style={{ color: P.blue }} /><p className="text-sm" style={{ color: P.textMid }}>Analyse en cours…</p></div>}

          {/* RESULTS */}
          {!loading && confluence && analysisData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              {/* Ticker + Price */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: P.blueLight }}>
                    <span className="text-xl font-bold" style={{ color: P.blue }}>{selected?.name?.[0]}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{selected?.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      {lastPrice && <span className="text-2xl font-bold tabular-nums">{lastPrice.toFixed(2)} <span className="text-base font-normal" style={{ color: P.textLight }}>{meta?.currency}</span></span>}
                      {meta && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: meta.change >= 0 ? P.greenSoft : P.redSoft, color: meta.change >= 0 ? P.green : P.red }}>
                          {meta.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {meta.change >= 0 ? "+" : ""}{meta.pct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: P.textLight }}>{selected?.sector} · {selected?.country}</p>
                  </div>
                </div>
                <button onClick={() => selected && analyze(selected)} className="h-10 w-10 rounded-xl border flex items-center justify-center transition-colors hover:bg-slate-50" style={{ borderColor: P.border, color: P.textMid }}>
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* 2 COLUMNS */}
              <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-7">

                {/* LEFT — ANALYSIS */}
                <div className="space-y-5">

                  {/* Score — THE main element */}
                  <div className="rounded-3xl border p-8 relative overflow-hidden" style={{ background: P.card, borderColor: P.border }}>
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: confluence.score >= 65 ? `linear-gradient(90deg, ${P.green}, #34d399)` : confluence.score <= 35 ? `linear-gradient(90deg, ${P.red}, #f87171)` : `linear-gradient(90deg, ${P.amber}, #fbbf24)` }} />

                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-[11px] uppercase tracking-widest font-medium mb-2" style={{ color: P.textLight }}>Score de confluence</p>
                        <motion.span className="text-6xl font-bold tabular-nums leading-none" style={{ color: confluence.score >= 65 ? P.green : confluence.score <= 35 ? P.red : P.amber }}
                          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                          {confluence.score}
                        </motion.span>
                        <span className="text-xl ml-1" style={{ color: P.textMuted }}>/100</span>
                      </div>
                      <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: confluence.score >= 65 ? P.greenSoft : confluence.score <= 35 ? P.redSoft : P.amberSoft, color: confluence.score >= 65 ? P.green : confluence.score <= 35 ? P.red : P.amber }}>
                        {confluence.action}
                      </motion.div>
                    </div>

                    <p className="text-[13px] leading-relaxed mb-5" style={{ color: P.textMid }}>{confluence.summary}</p>

                    {/* Confluence bar */}
                    <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mb-2" style={{ background: P.cardAlt }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(confluence.bullCount / (confluence.bullCount + confluence.bearCount || 1)) * 100}%` }} transition={{ duration: 0.8 }}
                        className="h-full rounded-full" style={{ background: P.green }} />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(confluence.bearCount / (confluence.bullCount + confluence.bearCount || 1)) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-full rounded-full" style={{ background: P.red }} />
                    </div>
                    <div className="flex justify-between text-[11px]" style={{ color: P.textLight }}>
                      <span>{confluence.bullCount} haussiers</span><span>{confluence.bearCount} baissiers</span>
                    </div>

                    <p className="text-[10px] mt-4 pt-3 border-t" style={{ color: P.textMuted, borderColor: P.borderLight }}>
                      Analyse calculée sur 6 mois de données quotidiennes (référence fixe).
                    </p>
                  </div>

                  {/* Layer signals */}
                  {(["price_action", "technique", "volume", "structure"] as const).map(layerKey => {
                    const sigs = confluence.layers.filter(l => l.layer === layerKey);
                    if (!sigs.length) return null;
                    const lm = layerMeta[layerKey];
                    return (
                      <div key={layerKey} className="rounded-2xl border overflow-hidden" style={{ background: P.card, borderColor: P.border }}>
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ borderColor: P.borderLight }}>
                          <span style={{ color: lm.color }}>{lm.icon}</span>
                          <span className="text-[12px] font-semibold" style={{ color: P.textMid }}>{lm.label}</span>
                          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: P.cardAlt, color: P.textLight }}>{sigs.length}</span>
                        </div>
                        <div className="p-5 space-y-4">
                          {sigs.map((sig, i) => (
                            <motion.div key={sig.name} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[13px] font-semibold" style={{ color: P.text }}>{sig.name}</span>
                                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg" style={{
                                  background: sig.verdict === "bullish" ? P.greenSoft : sig.verdict === "bearish" ? P.redSoft : P.cardAlt,
                                  color: sig.verdict === "bullish" ? P.green : sig.verdict === "bearish" ? P.red : P.textMid,
                                }}>
                                  {sig.verdict === "bullish" ? "Haussier" : sig.verdict === "bearish" ? "Baissier" : "Neutre"}
                                </span>
                              </div>
                              <p className="text-[12px] leading-relaxed" style={{ color: P.textLight }}>{sig.detail}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Trade plan */}
                  {confluence.score >= 55 && (
                    <div className="rounded-2xl border p-5 space-y-4" style={{ background: P.card, borderColor: P.border }}>
                      <div className="flex items-center gap-2"><Crosshair size={14} style={{ color: P.blue }} /><span className="text-[12px] font-semibold" style={{ color: P.textMid }}>Plan de trade</span></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3.5" style={{ background: P.blueSoft }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: P.blue }}>Zone d&apos;entrée</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: P.text }}>{confluence.entryZone.min.toFixed(2)} — {confluence.entryZone.max.toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl p-3.5" style={{ background: P.redSoft }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: P.red }}>Stop Loss</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: P.text }}>{confluence.stopLoss.toFixed(2)}</p>
                        </div>
                      </div>
                      {confluence.targets.map((t2, i) => (
                        <div key={i} className="flex justify-between py-1"><span className="text-xs" style={{ color: P.textLight }}>Objectif {i + 1}</span><span className="text-xs font-bold tabular-nums" style={{ color: P.green }}>{t2.toFixed(2)}</span></div>
                      ))}
                      <div className="flex justify-between pt-3 border-t" style={{ borderColor: P.borderLight }}>
                        <span className="text-[11px]" style={{ color: P.textLight }}>Risque / Rendement</span>
                        <span className="text-sm font-bold" style={{ color: confluence.riskReward >= 2 ? P.green : P.amber }}>1 : {confluence.riskReward}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT — CHART */}
                <div className="space-y-4">

                  {/* Controls */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-1 p-1 rounded-xl border" style={{ background: P.cardAlt, borderColor: P.borderLight }}>
                      {VIEW_PERIODS.map(p => (
                        <button key={p.l} onClick={() => changeView(p)}
                          className="px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all"
                          style={viewPeriod.l === p.l ? { background: P.blue, color: "#fff" } : { color: P.textMid }}>
                          {p.l}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {([["ma", "MA"], ["bollinger", "BB"], ["ichimoku", "Ichimoku"]] as [Overlay, string][]).map(([k, l]) => (
                        <button key={k} onClick={() => toggleOverlay(k)}
                          className="px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border"
                          style={overlays.includes(k) ? { color: P.blue, background: P.blueSoft, borderColor: P.blue + "30" } : { color: P.textMuted, borderColor: P.borderLight }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="rounded-2xl border p-5" style={{ background: P.card, borderColor: P.border }}>
                    <div style={{ height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={P.borderLight} />
                          <XAxis dataKey="label" tick={{ fill: P.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={tickN} />
                          <YAxis domain={[pMin, pMax]} tick={{ fill: P.textLight, fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" width={55} />
                          <Tooltip content={<ChartTip />} />

                          {lastPrice && <ReferenceLine y={lastPrice} stroke={P.blue + "40"} strokeDasharray="4 8" />}
                          {tech?.supports.map(s => <ReferenceLine key={`s${s}`} y={s} stroke={P.blue + "18"} strokeDasharray="2 4" />)}
                          {tech?.resistances.map(r => <ReferenceLine key={`r${r}`} y={r} stroke={P.red + "18"} strokeDasharray="2 4" />)}

                          {overlays.includes("bollinger") && <>
                            <Line dataKey="bbU" stroke={P.textMuted + "60"} strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls isAnimationActive={false} />
                            <Line dataKey="bbL" stroke={P.textMuted + "60"} strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls isAnimationActive={false} />
                          </>}
                          {overlays.includes("ichimoku") && <>
                            <Line dataKey="tenkan" stroke="#f87171" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} opacity={0.6} />
                            <Line dataKey="kijun" stroke="#60a5fa" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} opacity={0.6} />
                          </>}

                          <Bar dataKey="body" barSize={Math.max(2, Math.min(7, 500 / chartData.length))} isAnimationActive={false}>
                            {chartData.map((d, i) => <Cell key={i} fill={d.up ? P.green : P.red} fillOpacity={0.85} />)}
                          </Bar>

                          {overlays.includes("ma") && <>
                            <Line dataKey="ma20" stroke={P.blue} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                            <Line dataKey="ma50" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                          </>}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Sub charts */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { title: "RSI", render: (
                        <ComposedChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                          <YAxis domain={[0, 100]} ticks={[30, 70]} tick={{ fill: P.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} orientation="right" width={22} />
                          <ReferenceLine y={70} stroke={P.red + "30"} strokeDasharray="2 2" />
                          <ReferenceLine y={30} stroke={P.green + "30"} strokeDasharray="2 2" />
                          <Line dataKey="rsi" stroke={P.blue} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                        </ComposedChart>
                      )},
                      { title: "MACD", render: (
                        <ComposedChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                          <YAxis tick={{ fill: P.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} orientation="right" width={30} />
                          <ReferenceLine y={0} stroke={P.border} />
                          <Bar dataKey="macdHist" barSize={2} isAnimationActive={false}>
                            {chartData.map((d, i) => <Cell key={i} fill={!isNaN(d.macdHist) && d.macdHist >= 0 ? P.green + "60" : P.red + "60"} />)}
                          </Bar>
                          <Line dataKey="macdLine" stroke={P.blue} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                          <Line dataKey="macdSig" stroke="#f59e0b" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                        </ComposedChart>
                      )},
                      { title: "Volume", render: (
                        <BarChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                          <YAxis hide /><Bar dataKey="volume" isAnimationActive={false}>
                            {chartData.map((d, i) => <Cell key={i} fill={d.up ? P.green + "35" : P.red + "35"} />)}
                          </Bar>
                        </BarChart>
                      )},
                    ].map(({ title, render }) => (
                      <div key={title} className="rounded-2xl border p-4" style={{ background: P.card, borderColor: P.border }}>
                        <p className="text-[11px] font-semibold mb-2" style={{ color: P.textLight }}>{title}</p>
                        <div style={{ height: 80 }}><ResponsiveContainer width="100%" height="100%">{render}</ResponsiveContainer></div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-center pt-2" style={{ color: P.textMuted }}>
                    Analyse technique uniquement. Données ~15 min de délai. Ce n&apos;est pas un conseil en investissement.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* EMPTY STATE */}
          {!loading && !error && !analysisData.length && (
            <div className="flex flex-col items-center py-32 gap-8">
              <div className="h-20 w-20 rounded-3xl flex items-center justify-center" style={{ background: P.blueLight }}>
                <Layers size={32} style={{ color: P.blue }} />
              </div>
              <div className="text-center max-w-lg">
                <p className="text-xl font-semibold mb-3" style={{ color: P.text }}>Analyse de confluence</p>
                <p className="text-sm leading-relaxed" style={{ color: P.textMid }}>
                  Identifiez les opportunités d&apos;investissement en superposant 4 couches d&apos;analyse : Price Action, Indicateurs techniques, Volume et Structure de marché.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {["LVMH", "Apple", "ASML", "Bitcoin", "Nvidia", "Tesla"].map(n => {
                  const s = STOCKS.find(st => st.name === n || st.name.startsWith(n));
                  if (!s) return null;
                  return <button key={n} onClick={() => pickStock(s)} className="px-5 py-2.5 rounded-xl border text-sm transition-all hover:shadow-md" style={{ background: P.card, borderColor: P.border, color: P.textMid }}>{n}</button>;
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}