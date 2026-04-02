"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, AlertTriangle, RefreshCw, Loader2, BarChart2,
  ChevronUp, ChevronDown, Zap, Shield, Target, X, Activity,
  Eye, Clock, DollarSign, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, CartesianGrid, BarChart, LineChart, Area,
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// STOCKS LIST
// ═══════════════════════════════════════════════════════════════════════════════

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
  { name: "Société Générale", ticker: "GLE.PA", country: "France", sector: "Finance" },
  { name: "Safran", ticker: "SAF.PA", country: "France", sector: "Aéronautique" },
  { name: "Vinci", ticker: "DG.PA", country: "France", sector: "Construction" },
  { name: "Capgemini", ticker: "CAP.PA", country: "France", sector: "Technologie" },
  { name: "Crédit Agricole", ticker: "ACA.PA", country: "France", sector: "Finance" },
  { name: "Pernod Ricard", ticker: "RI.PA", country: "France", sector: "Spiritueux" },
  { name: "Renault", ticker: "RNO.PA", country: "France", sector: "Automobile" },
  { name: "Saint-Gobain", ticker: "SGO.PA", country: "France", sector: "Matériaux" },
  { name: "Engie", ticker: "ENGI.PA", country: "France", sector: "Énergie" },
  { name: "Orange", ticker: "ORA.PA", country: "France", sector: "Télécom" },
  { name: "Thales", ticker: "HO.PA", country: "France", sector: "Défense" },
  { name: "Dassault Systèmes", ticker: "DSY.PA", country: "France", sector: "Logiciel" },
  { name: "Stellantis", ticker: "STLAM.MI", country: "Italie", sector: "Automobile" },
  { name: "SAP", ticker: "SAP.DE", country: "Allemagne", sector: "Logiciel" },
  { name: "Siemens", ticker: "SIE.DE", country: "Allemagne", sector: "Industrie" },
  { name: "Allianz", ticker: "ALV.DE", country: "Allemagne", sector: "Assurance" },
  { name: "BMW", ticker: "BMW.DE", country: "Allemagne", sector: "Automobile" },
  { name: "Mercedes-Benz", ticker: "MBG.DE", country: "Allemagne", sector: "Automobile" },
  { name: "Adidas", ticker: "ADS.DE", country: "Allemagne", sector: "Sport" },
  { name: "Shell", ticker: "SHEL.L", country: "UK", sector: "Énergie" },
  { name: "AstraZeneca", ticker: "AZN.L", country: "UK", sector: "Santé" },
  { name: "HSBC", ticker: "HSBA.L", country: "UK", sector: "Finance" },
  { name: "Unilever", ticker: "ULVR.L", country: "UK", sector: "Consommation" },
  { name: "Inditex (Zara)", ticker: "ITX.MC", country: "Espagne", sector: "Mode" },
  { name: "Ferrari", ticker: "RACE.MI", country: "Italie", sector: "Automobile" },
  { name: "ASML", ticker: "ASML.AS", country: "Pays-Bas", sector: "Semi-conducteurs" },
  { name: "Nestlé", ticker: "NESN.SW", country: "Suisse", sector: "Alimentation" },
  { name: "Novartis", ticker: "NOVN.SW", country: "Suisse", sector: "Santé" },
  { name: "Apple", ticker: "AAPL", country: "USA", sector: "Technologie" },
  { name: "Microsoft", ticker: "MSFT", country: "USA", sector: "Technologie" },
  { name: "Nvidia", ticker: "NVDA", country: "USA", sector: "Semi-conducteurs" },
  { name: "Alphabet (Google)", ticker: "GOOGL", country: "USA", sector: "Technologie" },
  { name: "Amazon", ticker: "AMZN", country: "USA", sector: "Commerce" },
  { name: "Meta", ticker: "META", country: "USA", sector: "Tech" },
  { name: "Tesla", ticker: "TSLA", country: "USA", sector: "Automobile" },
  { name: "JPMorgan Chase", ticker: "JPM", country: "USA", sector: "Finance" },
  { name: "Bitcoin", ticker: "BTC-EUR", country: "Crypto", sector: "Crypto" },
  { name: "Ethereum", ticker: "ETH-EUR", country: "Crypto", sector: "Crypto" },
  { name: "Solana", ticker: "SOL-EUR", country: "Crypto", sector: "Crypto" },
];

function searchStocks(q: string): StockInfo[] {
  if (!q || q.length < 2) return [];
  const lq = q.toLowerCase();
  return STOCKS.filter(s => s.name.toLowerCase().includes(lq) || s.ticker.toLowerCase().includes(lq) || s.country.toLowerCase().includes(lq) || s.sector.toLowerCase().includes(lq)).slice(0, 7);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface OHLCV { time: number; open: number; close: number; high: number; low: number; volume: number; }
interface IchimokuResult { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[]; chikou: number[]; }
interface TechResult {
  rsi: number[]; stochRsi: { k: number[]; d: number[] };
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bb: { upper: number[]; middle: number[]; lower: number[] };
  ma20: number[]; ma50: number[]; ma200: number[]; obv: number[];
  atr: number[]; ichimoku: IchimokuResult;
  fibonacci: { levels: { label: string; price: number }[] };
  supports: number[]; resistances: number[];
}
interface Signal { name: string; value: string; signal: "BUY" | "SELL" | "NEUTRAL"; strength: number; description: string; }
interface TradeAdvice { entryZone: { min: number; max: number }; stopLoss: number; targets: { t1: number; t2: number; t3: number }; riskReward: number; timeframe: string; rationale: string; }
interface Verdict { action: "ACHETER" | "ATTENDRE" | "VENDRE"; score: number; confidence: number; signals: Signal[]; summary: string; tradeAdvice: TradeAdvice; }

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICAL ENGINE (unchanged logic)
// ═══════════════════════════════════════════════════════════════════════════════

const smaCal = (d: number[], p: number) => d.map((_, i) => i < p - 1 ? NaN : d.slice(i - p + 1, i + 1).reduce((s, v) => s + v, 0) / p);
function emaCal(d: number[], p: number) { const k = 2 / (p + 1), r = new Array(d.length).fill(NaN); const fv = d.findIndex(v => !isNaN(v)); if (fv === -1 || fv + p > d.length) return r; r[fv + p - 1] = d.slice(fv, fv + p).reduce((s, v) => s + v, 0) / p; for (let i = fv + p; i < d.length; i++) r[i] = d[i] * k + r[i - 1] * (1 - k); return r; }
function rsiCalc(c: number[], p = 14) { const r = new Array(c.length).fill(NaN); if (c.length < p + 1) return r; let ag = 0, al = 0; for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d > 0) ag += d; else al -= d; } ag /= p; al /= p; r[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); for (let i = p + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p; al = (al * (p - 1) + (d < 0 ? -d : 0)) / p; r[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); } return r; }
function stochRsiCalc(rsi: number[], period = 14, kSmooth = 3, dSmooth = 3) { const stoch = new Array(rsi.length).fill(NaN); for (let i = period - 1; i < rsi.length; i++) { const slice = rsi.slice(i - period + 1, i + 1).filter(v => !isNaN(v)); if (slice.length < period) continue; const lo = Math.min(...slice), hi = Math.max(...slice); stoch[i] = hi === lo ? 50 : ((rsi[i] - lo) / (hi - lo)) * 100; } const k2 = smaCal(stoch.map(v => isNaN(v) ? 0 : v), kSmooth); const d2 = smaCal(k2.map(v => isNaN(v) ? 0 : v), dSmooth); return { k: k2, d: d2 }; }
function macdCalc(c: number[]) { const f = emaCal(c, 12), s = emaCal(c, 26); const m = c.map((_, i) => isNaN(f[i]) || isNaN(s[i]) ? NaN : f[i] - s[i]); const sig = emaCal(m.map(v => isNaN(v) ? 0 : v), 9); return { macd: m, signal: sig, histogram: m.map((v, i) => isNaN(v) || isNaN(sig[i]) ? NaN : v - sig[i]) }; }
function bbCalc(c: number[], p = 20) { const mid = smaCal(c, p); const band = (mult: number) => c.map((_, i) => { if (isNaN(mid[i])) return NaN; const sl = c.slice(i - p + 1, i + 1); const std = Math.sqrt(sl.reduce((a, v) => a + (v - mid[i]) ** 2, 0) / p); return mid[i] + mult * std; }); return { upper: band(2), middle: mid, lower: band(-2) }; }
function atrCalc(ohlcv: OHLCV[], p = 14) { const tr = ohlcv.map((c, i) => { if (i === 0) return c.high - c.low; const prev = ohlcv[i - 1].close; return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev)); }); return smaCal(tr, p); }
function ichimokuCalc(ohlcv: OHLCV[]): IchimokuResult { const hs = ohlcv.map(c => c.high), ls = ohlcv.map(c => c.low), cs = ohlcv.map(c => c.close); const mp = (h: number[], l: number[], p: number, i: number) => { if (i < p - 1) return NaN; return (Math.max(...h.slice(i - p + 1, i + 1)) + Math.min(...l.slice(i - p + 1, i + 1))) / 2; }; const tenkan = ohlcv.map((_, i) => mp(hs, ls, 9, i)); const kijun = ohlcv.map((_, i) => mp(hs, ls, 26, i)); const senkouA = tenkan.map((t, i) => isNaN(t) || isNaN(kijun[i]) ? NaN : (t + kijun[i]) / 2); const senkouB = ohlcv.map((_, i) => mp(hs, ls, 52, i)); const chikou = cs.map((c, i) => i + 26 < cs.length ? cs[i + 26] : NaN); return { tenkan, kijun, senkouA, senkouB, chikou }; }
function fibonacciCalc(ohlcv: OHLCV[]) { const recent = ohlcv.slice(-60); const hi = Math.max(...recent.map(c => c.high)); const lo = Math.min(...recent.map(c => c.low)); const range = hi - lo; return { levels: [ { label: "100%", price: hi }, { label: "78.6%", price: hi - range * 0.236 }, { label: "61.8%", price: hi - range * 0.382 }, { label: "50%", price: hi - range * 0.5 }, { label: "38.2%", price: hi - range * 0.618 }, { label: "23.6%", price: hi - range * 0.764 }, { label: "0%", price: lo } ] }; }
function obvCalc(c: number[], v: number[]) { const r = [0]; for (let i = 1; i < c.length; i++) r.push(r[i - 1] + (c[i] > c[i - 1] ? v[i] : c[i] < c[i - 1] ? -v[i] : 0)); return r; }
function srCalc(ohlcv: OHLCV[], lb = 15) { const hs = ohlcv.map(c => c.high), ls = ohlcv.map(c => c.low); const ph: number[] = [], pl: number[] = []; for (let i = lb; i < ohlcv.length - lb; i++) { const wh = hs.slice(i - lb, i + lb + 1), wl = ls.slice(i - lb, i + lb + 1); if (hs[i] === Math.max(...wh)) ph.push(hs[i]); if (ls[i] === Math.min(...wl)) pl.push(ls[i]); } const cluster = (lvls: number[]) => { const s = [...lvls].sort((a, b) => a - b), out: number[] = []; let i = 0; while (i < s.length) { let j = i; while (j < s.length && (s[j] - s[i]) / s[i] < 0.005) j++; out.push(s.slice(i, j).reduce((a, v) => a + v, 0) / (j - i)); i = j; } return out.slice(-4); }; return { supports: cluster(pl), resistances: cluster(ph) }; }

function computeAll(ohlcv: OHLCV[]): TechResult {
  const c = ohlcv.map(o => o.close), v = ohlcv.map(o => o.volume);
  const { supports, resistances } = srCalc(ohlcv);
  const rsi = rsiCalc(c);
  return { rsi, stochRsi: stochRsiCalc(rsi), macd: macdCalc(c), bb: bbCalc(c), ma20: smaCal(c, 20), ma50: smaCal(c, 50), ma200: smaCal(c, 200), obv: obvCalc(c, v), atr: atrCalc(ohlcv), ichimoku: ichimokuCalc(ohlcv), fibonacci: fibonacciCalc(ohlcv), supports, resistances };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT ENGINE (unchanged logic, fix score to integer)
// ═══════════════════════════════════════════════════════════════════════════════

function generateVerdict(ohlcv: OHLCV[], t: TechResult): Verdict {
  const n = ohlcv.length - 1, price = ohlcv[n].close;
  const signals: Signal[] = [];
  let bull = 0, bear = 0, total = 0;
  const add = (w: number, s: Signal, side: "bull" | "bear" | "neutral", pct = 1) => { total += w; if (side === "bull") bull += w * pct; else if (side === "bear") bear += w * pct; signals.push(s); };

  const rsi = t.rsi[n];
  if (!isNaN(rsi)) { if (rsi < 30) add(0.15, { name: "RSI", value: rsi.toFixed(1), signal: "BUY", strength: (30 - rsi) / 30, description: `RSI ${rsi.toFixed(1)} en survente. Signal de retournement haussier.` }, "bull"); else if (rsi < 40) add(0.10, { name: "RSI", value: rsi.toFixed(1), signal: "BUY", strength: 0.4, description: `RSI ${rsi.toFixed(1)} — Approche zone survente.` }, "bull", 0.5); else if (rsi > 70) add(0.15, { name: "RSI", value: rsi.toFixed(1), signal: "SELL", strength: (rsi - 70) / 30, description: `RSI ${rsi.toFixed(1)} en surachat. Risque de correction.` }, "bear"); else if (rsi > 60) add(0.10, { name: "RSI", value: rsi.toFixed(1), signal: "SELL", strength: 0.3, description: `RSI ${rsi.toFixed(1)} — Approche zone surachat.` }, "bear", 0.4); else add(0.15, { name: "RSI", value: rsi.toFixed(1), signal: "NEUTRAL", strength: 0.3, description: `RSI ${rsi.toFixed(1)} — Zone neutre.` }, "neutral"); }

  const sk = t.stochRsi.k[n], sd = t.stochRsi.d[n], skp = t.stochRsi.k[n - 1], sdp = t.stochRsi.d[n - 1];
  if (!isNaN(sk) && !isNaN(sd)) { if (sk < 20 && sd < 20) add(0.10, { name: "Stoch RSI", value: `K:${sk.toFixed(0)} D:${sd.toFixed(0)}`, signal: "BUY", strength: 0.8, description: `Stoch RSI en double survente. Rebond probable.` }, "bull"); else if (sk > 80 && sd > 80) add(0.10, { name: "Stoch RSI", value: `K:${sk.toFixed(0)} D:${sd.toFixed(0)}`, signal: "SELL", strength: 0.8, description: `Stoch RSI en double surachat.` }, "bear"); else if (!isNaN(skp) && skp < sdp && sk > sd && sk < 50) add(0.10, { name: "Stoch RSI", value: `Cross ↑`, signal: "BUY", strength: 0.85, description: `Croisement haussier Stoch RSI en zone basse.` }, "bull"); else if (!isNaN(skp) && skp > sdp && sk < sd && sk > 50) add(0.10, { name: "Stoch RSI", value: `Cross ↓`, signal: "SELL", strength: 0.85, description: `Croisement baissier Stoch RSI en zone haute.` }, "bear"); else add(0.10, { name: "Stoch RSI", value: `K:${sk.toFixed(0)}`, signal: "NEUTRAL", strength: 0.2, description: `Stoch RSI ${sk.toFixed(0)} — Zone neutre.` }, "neutral"); }

  const mc = t.macd.macd[n], ms = t.macd.signal[n], mcp = t.macd.macd[n - 1], msp = t.macd.signal[n - 1];
  if (!isNaN(mc) && !isNaN(ms)) { if (!isNaN(mcp) && !isNaN(msp) && mcp < msp && mc > ms) add(0.15, { name: "MACD", value: mc.toFixed(3), signal: "BUY", strength: 0.9, description: "Croisement haussier MACD × Signal." }, "bull"); else if (!isNaN(mcp) && !isNaN(msp) && mcp > msp && mc < ms) add(0.15, { name: "MACD", value: mc.toFixed(3), signal: "SELL", strength: 0.9, description: "Croisement baissier MACD × Signal." }, "bear"); else if (mc > ms && mc > 0) add(0.15, { name: "MACD", value: mc.toFixed(3), signal: "BUY", strength: 0.5, description: "MACD positif au-dessus du signal." }, "bull", 0.6); else if (mc < ms && mc < 0) add(0.15, { name: "MACD", value: mc.toFixed(3), signal: "SELL", strength: 0.5, description: "MACD négatif sous le signal." }, "bear", 0.6); else add(0.15, { name: "MACD", value: mc.toFixed(3), signal: "NEUTRAL", strength: 0.2, description: "MACD proche du signal — indécis." }, "neutral"); }

  const [ma20, ma50, ma200v] = [t.ma20[n], t.ma50[n], t.ma200[n]];
  if (!isNaN(ma20) && !isNaN(ma50)) { const above200 = isNaN(ma200v) || price > ma200v; if (price > ma20 && price > ma50 && above200) add(0.12, { name: "Moyennes Mobiles", value: `MA20:${ma20.toFixed(1)}`, signal: "BUY", strength: 0.75, description: `Prix au-dessus des MAs. Tendance haussière.` }, "bull"); else if (price < ma20 && price < ma50 && !above200) add(0.12, { name: "Moyennes Mobiles", value: `MA20:${ma20.toFixed(1)}`, signal: "SELL", strength: 0.75, description: `Prix sous les MAs. Tendance baissière.` }, "bear"); else add(0.12, { name: "Moyennes Mobiles", value: `MA20:${ma20.toFixed(1)}`, signal: "NEUTRAL", strength: 0.3, description: "Prix entre les MAs — consolidation." }, "neutral"); }

  const [bu, bl] = [t.bb.upper[n], t.bb.lower[n]];
  if (!isNaN(bu) && !isNaN(bl)) { const pos = `${((price - bl) / (bu - bl) * 100).toFixed(0)}%`; if (price <= bl) add(0.10, { name: "Bollinger", value: pos, signal: "BUY", strength: 0.75, description: `Prix sur bande basse. Rebond probable.` }, "bull"); else if (price >= bu) add(0.10, { name: "Bollinger", value: pos, signal: "SELL", strength: 0.75, description: `Prix sur bande haute. Retour vers moyenne.` }, "bear"); else add(0.10, { name: "Bollinger", value: pos, signal: "NEUTRAL", strength: 0.3, description: `Prix dans les bandes (${pos}).` }, "neutral"); }

  const ich = t.ichimoku; const tk = ich.tenkan[n], kj = ich.kijun[n], sa = ich.senkouA[n], sb = ich.senkouB[n];
  if (!isNaN(tk) && !isNaN(kj) && !isNaN(sa) && !isNaN(sb)) { const cloud = Math.max(sa, sb), cloudLow = Math.min(sa, sb); if (price > cloud && tk > kj) add(0.12, { name: "Ichimoku", value: "Dessus Nuage", signal: "BUY", strength: 0.85, description: `Prix au-dessus du nuage. Haussier.` }, "bull"); else if (price < cloudLow && tk < kj) add(0.12, { name: "Ichimoku", value: "Dessous Nuage", signal: "SELL", strength: 0.85, description: `Prix sous le nuage. Baissier.` }, "bear"); else add(0.12, { name: "Ichimoku", value: `T:${tk.toFixed(1)}`, signal: "NEUTRAL", strength: 0.3, description: `Ichimoku neutre. Attendre breakout.` }, "neutral"); }

  const [oc, op10] = [t.obv[n], t.obv[Math.max(0, n - 10)]];
  if (oc !== undefined && op10 !== undefined) { const ot = (oc - op10) / Math.abs(op10 || 1) * 100; const pt = (ohlcv[n].close - ohlcv[Math.max(0, n - 10)].close) / ohlcv[Math.max(0, n - 10)].close * 100; if (ot > 2 && pt < 0) add(0.08, { name: "OBV", value: "Div ↑", signal: "BUY", strength: 0.9, description: "Divergence haussière OBV — accumulation." }, "bull"); else if (ot < -2 && pt > 0) add(0.08, { name: "OBV", value: "Div ↓", signal: "SELL", strength: 0.9, description: "Divergence baissière OBV — distribution." }, "bear"); else if (ot > 0) add(0.08, { name: "OBV", value: `+${ot.toFixed(1)}%`, signal: "BUY", strength: 0.4, description: "OBV en hausse — flux acheteurs." }, "bull", 0.45); else add(0.08, { name: "OBV", value: `${ot.toFixed(1)}%`, signal: "SELL", strength: 0.4, description: "OBV en baisse — flux vendeurs." }, "bear", 0.45); }

  const ns = t.supports.find(s => Math.abs(s - price) / price < 0.025);
  const nr = t.resistances.find(r => Math.abs(r - price) / price < 0.025);
  if (ns) add(0.05, { name: "Support", value: ns.toFixed(2), signal: "BUY", strength: 0.65, description: `Support majeur à ${ns.toFixed(2)}.` }, "bull");
  if (nr) add(0.05, { name: "Résistance", value: nr.toFixed(2), signal: "SELL", strength: 0.65, description: `Résistance majeure à ${nr.toFixed(2)}.` }, "bear");

  const score = Math.round(Math.min(100, Math.max(0, 50 + (total > 0 ? (bull - bear) / total : 0) * 50))) | 0;
  const confidence = Math.round(Math.min(100, (bull + bear) / (total || 1) * 100)) | 0;
  const bc = signals.filter(s => s.signal === "BUY").length, sc2 = signals.filter(s => s.signal === "SELL").length;

  const atr2 = t.atr[n] || price * 0.02;
  const closestSupport = t.supports.length > 0 ? Math.max(...t.supports.filter(s => s < price)) : price * 0.95;
  const closestResistance = t.resistances.length > 0 ? Math.min(...t.resistances.filter(r => r > price)) : price * 1.05;

  let tradeAdvice: TradeAdvice;
  if (score >= 65) { const eMin = Math.max(closestSupport, price - atr2 * 0.5), eMax = price + atr2 * 0.3, sl = closestSupport > 0 ? closestSupport * 0.985 : price - atr2 * 2, t1 = closestResistance > price ? closestResistance : price + atr2 * 2, t2 = t1 + (t1 - price) * 0.5, t3 = t2 + (t1 - price) * 0.75, rr = (t1 - price) / (price - sl); tradeAdvice = { entryZone: { min: eMin, max: eMax }, stopLoss: sl, targets: { t1, t2, t3 }, riskReward: Math.round(rr * 10) / 10, timeframe: "Court terme (1-4 sem.)", rationale: `Entrée entre ${eMin.toFixed(2)} et ${eMax.toFixed(2)}. Stop à ${sl.toFixed(2)}. Objectif ${t1.toFixed(2)}.` }; }
  else if (score <= 35) { const eMin = price - atr2 * 0.3, eMax = Math.min(closestResistance, price + atr2 * 0.5), sl = closestResistance < price * 1.1 ? closestResistance * 1.015 : price + atr2 * 2, t1 = closestSupport > 0 && closestSupport < price ? closestSupport : price - atr2 * 2, t2 = t1 - (price - t1) * 0.5, t3 = t2 - (price - t1) * 0.75, rr = (price - t1) / (sl - price); tradeAdvice = { entryZone: { min: eMin, max: eMax }, stopLoss: sl, targets: { t1, t2, t3 }, riskReward: Math.round(rr * 10) / 10, timeframe: "Court terme (1-4 sem.)", rationale: `Vente entre ${eMin.toFixed(2)} et ${eMax.toFixed(2)}. Stop à ${sl.toFixed(2)}. Objectif ${t1.toFixed(2)}.` }; }
  else { const eMin = closestSupport > 0 ? closestSupport : price * 0.97, eMax = price * 0.99, sl = eMin * 0.975, t1 = closestResistance > price ? closestResistance : price * 1.04, t2 = t1 * 1.025, t3 = t2 * 1.02; tradeAdvice = { entryZone: { min: eMin, max: eMax }, stopLoss: sl, targets: { t1, t2, t3 }, riskReward: 1.8, timeframe: "En attente", rationale: `Signaux mixtes. Attendre cassure au-dessus de ${t1.toFixed(2)} ou rupture sous ${eMin.toFixed(2)}.` }; }

  const action = score >= 65 ? "ACHETER" : score <= 35 ? "VENDRE" : "ATTENDRE";
  const summary = score >= 65 ? `${bc}/${signals.length} haussiers. Momentum favorable.` : score <= 35 ? `${sc2}/${signals.length} baissiers. Pression vendeuse.` : `${bc} haussiers vs ${sc2} baissiers. Signal mixte.`;
  return { action, score, confidence, signals, summary, tradeAdvice };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchChart(ticker: string, range: string, interval: string): Promise<OHLCV[]> {
  const res = await fetch(`/api/yahoo?endpoint=chart&ticker=${encodeURIComponent(ticker)}&range=${range}&interval=${interval}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const json = await res.json(); if (json.error) throw new Error(json.error);
  const result = json?.chart?.result?.[0]; if (!result) throw new Error("Données vides.");
  const ts: number[] = result.timestamp ?? [], q = result.indicators.quote[0]; const out: OHLCV[] = [];
  for (let i = 0; i < ts.length; i++) { if (q.open[i] == null || q.close[i] == null) continue; out.push({ time: ts[i], open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] ?? 0 }); }
  if (out.length < 20) throw new Error("Pas assez de données.");
  return out;
}

async function fetchMeta(ticker: string) {
  try { const res = await fetch(`/api/yahoo?endpoint=quote&ticker=${encodeURIComponent(ticker)}`); if (!res.ok) return null; const json = await res.json(); const m = json?.chart?.result?.[0]?.meta; if (!m) return null; const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []; const valid = closes.filter((v): v is number => v != null && !isNaN(v)); const curr = m.regularMarketPrice || valid[valid.length - 1]; const prev = m.previousClose || m.chartPreviousClose || valid[valid.length - 2]; return { name: m.longName || m.shortName || ticker, currency: m.currency || "EUR", curr, prev, change: curr - prev, pct: ((curr - prev) / prev) * 100 }; } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLASS CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Glass = ({ children, className = "", glow = "" }: { children: React.ReactNode; className?: string; glow?: string }) => (
  <div className={`relative rounded-2xl border border-white/[0.08] backdrop-blur-xl overflow-hidden ${className}`}
    style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(10,15,30,0.9))" }}>
    {glow && <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${glow}, transparent 70%)` }} />}
    <div className="relative">{children}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// RECHARTS TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number> }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 p-3 text-[11px] backdrop-blur-xl shadow-2xl" style={{ background: "rgba(10,15,30,0.95)" }}>
      <p className="text-zinc-500 font-mono text-[10px] mb-1">{d.label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-zinc-500">O</span><span className="text-white font-bold">{d.open?.toFixed(2)}</span>
        <span className="text-zinc-500">H</span><span className="text-emerald-400 font-bold">{d.high?.toFixed(2)}</span>
        <span className="text-zinc-500">L</span><span className="text-red-400 font-bold">{d.low?.toFixed(2)}</span>
        <span className="text-zinc-500">C</span><span className="text-white font-bold">{d.close?.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE GAUGE — Neon glassmorphism
// ═══════════════════════════════════════════════════════════════════════════════

function ScoreGauge({ score, action }: { score: number; action: string }) {
  const s = Math.round(score) | 0;
  const color = s >= 65 ? "#34d399" : s <= 35 ? "#f87171" : "#fbbf24";
  const glow = s >= 65 ? "#10b981" : s <= 35 ? "#ef4444" : "#f59e0b";
  const pct = s / 100;
  const r = 52, cx = 60, cy = 60, sw = 6;
  const startA = Math.PI * 0.75, totalA = Math.PI * 1.5;
  const arc = (start: number, end: number) => { const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start), x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end); return `M ${x1} ${y1} A ${r} ${r} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2}`; };

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative">
        <svg width="120" height="88" viewBox="0 0 120 88">
          <defs>
            <filter id="neonGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <path d={arc(startA, startA + totalA)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} strokeLinecap="round" />
          <motion.path d={arc(startA, startA + totalA * pct)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" filter="url(#neonGlow)"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
          <motion.span className="text-[32px] font-black leading-none" style={{ color, textShadow: `0 0 20px ${glow}40` }}
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: "spring" }}>
            {s}
          </motion.span>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className={`mt-1 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${s >= 65 ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" : s <= 35 ? "text-red-300 bg-red-500/10 border-red-500/25" : "text-amber-300 bg-amber-500/10 border-amber-500/25"}`}>
        {action === "ACHETER" ? "↑ Acheter" : action === "VENDRE" ? "↓ Vendre" : "→ Attendre"}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const PERIODS = [
  { l: "1S", v: "5d", i: "1d" }, { l: "1M", v: "1mo", i: "1d" }, { l: "3M", v: "3mo", i: "1d" },
  { l: "6M", v: "6mo", i: "1d" }, { l: "1A", v: "1y", i: "1wk" }, { l: "2A", v: "2y", i: "1wk" },
];

type Overlay = "ma" | "bollinger" | "ichimoku" | "fibonacci";

export default function AnalysesPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockInfo[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [selected, setSelected] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ohlcv, setOhlcv] = useState<OHLCV[]>([]);
  const [tech, setTech] = useState<TechResult | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [period, setPeriod] = useState(PERIODS[3]);
  const [meta, setMeta] = useState<{ name: string; currency: string; curr: number; prev: number; change: number; pct: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>(["ma", "bollinger"]);
  const [tab, setTab] = useState<"signaux" | "conseil" | "niveaux">("signaux");

  useEffect(() => { if (query.length >= 2) { setSuggestions(searchStocks(query)); setShowSugg(true); } else { setSuggestions([]); setShowSugg(false); } }, [query]);

  const analyze = useCallback(async (stock: StockInfo, per = period) => {
    setLoading(true); setError(null); setShowSugg(false);
    try { const [data, m] = await Promise.all([fetchChart(stock.ticker, per.v, per.i), fetchMeta(stock.ticker)]); const tr = computeAll(data); setOhlcv(data); setTech(tr); setVerdict(generateVerdict(data, tr)); setMeta(m); setLastUpdate(new Date()); } catch (e) { setError(e instanceof Error ? e.message : "Erreur."); } finally { setLoading(false); }
  }, [period]);

  const pickStock = (s: StockInfo) => { setSelected(s); setQuery(s.name); analyze(s); };
  const clear = () => { setSelected(null); setQuery(""); setOhlcv([]); setTech(null); setVerdict(null); setMeta(null); setError(null); };
  const toggleOverlay = (o: Overlay) => setOverlays(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);

  const fmtV = (v: number) => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`;
  const lastPrice = meta?.curr ?? (ohlcv.length ? ohlcv[ohlcv.length - 1].close : null);

  // ─── Recharts data ───
  const chartData = useMemo(() => {
    if (!ohlcv.length || !tech) return [];
    const vis = ohlcv.slice(-100);
    const off = ohlcv.length - vis.length;
    return vis.map((c, i) => {
      const gi = i + off;
      const d = new Date(c.time * 1000);
      const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      return {
        label, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
        body: [Math.min(c.open, c.close), Math.max(c.open, c.close)] as [number, number],
        up: c.close >= c.open,
        ma20: tech.ma20[gi], ma50: tech.ma50[gi], ma200: tech.ma200[gi],
        bbU: tech.bb.upper[gi], bbM: tech.bb.middle[gi], bbL: tech.bb.lower[gi],
        tenkan: tech.ichimoku.tenkan[gi], kijun: tech.ichimoku.kijun[gi],
        senkouA: tech.ichimoku.senkouA[gi], senkouB: tech.ichimoku.senkouB[gi],
        rsi: tech.rsi[gi], stochK: tech.stochRsi.k[gi],
        macdLine: tech.macd.macd[gi], macdSig: tech.macd.signal[gi], macdHist: tech.macd.histogram[gi],
        obv: tech.obv[gi],
      };
    });
  }, [ohlcv, tech]);

  const prices = chartData.flatMap(d => [d.high, d.low].filter(v => !isNaN(v)));
  const pMin = prices.length ? Math.min(...prices) * 0.997 : 0;
  const pMax = prices.length ? Math.max(...prices) * 1.003 : 1;
  const tickN = Math.max(1, Math.floor(chartData.length / 6));

  // ═══ RENDER ═══
  return (
    <div className="min-h-screen text-zinc-100 font-sans" style={{ background: "linear-gradient(180deg, #04060c 0%, #080d1a 40%, #060a14 100%)" }}>
      <Sidebar />
      <main className="md:ml-64 px-4 pt-6 pb-20 md:px-8 md:pt-8">
        <div className="space-y-6 max-w-[1600px]">

          {/* ═══ HEADER ═══ */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))", border: "1px solid rgba(59,130,246,0.2)" }}>
                <BarChart2 size={18} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Stocks</span></h1>
                <p className="text-[9px] text-zinc-600 font-mono">RSI · MACD · Bollinger · Ichimoku · Fibonacci · ATR · OBV</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.06]" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(12px)" }}>
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/40" />
              <span className="text-[10px] text-zinc-400 font-mono">Live</span>
            </div>
          </div>

          {/* ═══ SEARCH ═══ */}
          <div className="relative">
            <Glass className="flex items-center gap-3 px-5 focus-within:border-cyan-500/30 transition-all duration-300" glow="rgba(6,182,212,0.06)">
              <Search size={16} className="text-zinc-500 shrink-0" />
              <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => query.length >= 2 && setShowSugg(true)}
                placeholder="Rechercher un actif — LVMH, Apple, Bitcoin, ASML…"
                className="flex-1 bg-transparent py-4 text-sm text-white placeholder-zinc-600 outline-none" />
              {query && <button onClick={clear} className="text-zinc-600 hover:text-white transition-colors"><X size={14} /></button>}
            </Glass>
            <AnimatePresence>
              {showSugg && suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/60 z-50 backdrop-blur-xl" style={{ background: "rgba(10,15,30,0.95)" }}>
                  {suggestions.map((s, i) => (
                    <button key={s.ticker} onClick={() => pickStock(s)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.04] transition-colors text-left ${i !== 0 ? "border-t border-white/[0.04]" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(59,130,246,0.15)" }}>
                          <span className="text-[8px] font-black text-blue-300">{s.name[0]}</span>
                        </div>
                        <div><span className="text-xs font-bold text-white">{s.name}</span><span className="text-[9px] text-zinc-500 ml-2 font-mono">{s.ticker}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[8px] text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-md">{s.sector}</span>
                        <span className="text-[8px] text-zinc-600 border border-white/[0.06] px-2 py-0.5 rounded-md">{s.country}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ ERROR ═══ */}
          {error && <Glass className="flex items-center gap-3 p-4" glow="rgba(239,68,68,0.08)"><AlertTriangle size={14} className="text-red-400 shrink-0" /><span className="text-sm text-red-300">{error}</span></Glass>}

          {/* ═══ LOADING ═══ */}
          {loading && (
            <div className="flex items-center justify-center py-24 gap-4">
              <div className="relative"><Loader2 size={24} className="animate-spin text-cyan-400" /><div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse" /></div>
              <div><span className="text-sm text-zinc-300 font-medium block">Analyse en cours…</span><span className="text-[10px] text-zinc-600 font-mono">RSI · MACD · Ichimoku · Fibonacci</span></div>
            </div>
          )}

          {/* ═══ RESULTS ═══ */}
          {!loading && tech && verdict && ohlcv.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div key={selected?.ticker + period.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

                {/* ── Stock Header ── */}
                <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.12))", border: "1px solid rgba(6,182,212,0.15)" }}>
                      <span className="text-xl font-black text-cyan-300">{selected?.name?.[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{selected?.name}</h2>
                        <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">{selected?.ticker}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {lastPrice && <span className="text-2xl font-black text-white tabular-nums">{lastPrice.toFixed(2)} <span className="text-zinc-500 text-sm">{meta?.currency}</span></span>}
                        {meta && (
                          <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${meta.change >= 0 ? "text-emerald-300 bg-emerald-500/12 border border-emerald-500/20" : "text-red-300 bg-red-500/12 border border-red-500/20"}`}>
                            {meta.change >= 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {meta.change >= 0 ? "+" : ""}{meta.change.toFixed(2)} ({meta.pct >= 0 ? "+" : ""}{meta.pct.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-600">{selected?.sector} · {selected?.country}</span>
                        {lastUpdate && <span className="text-[9px] text-zinc-700 font-mono flex items-center gap-1"><Clock size={8} />{lastUpdate.toLocaleTimeString("fr-FR")}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => selected && analyze(selected)} className="h-10 w-10 rounded-xl border border-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all" style={{ background: "rgba(15,23,42,0.6)" }}>
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* ── 2 COLUMNS ── */}
                <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">

                  {/* ═══ LEFT ═══ */}
                  <div className="space-y-4">

                    {/* Verdict */}
                    <Glass glow={verdict.action === "ACHETER" ? "rgba(16,185,129,0.1)" : verdict.action === "VENDRE" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.08)"} className="p-6">
                      <ScoreGauge score={verdict.score} action={verdict.action} />
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{verdict.summary}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex-1">
                            <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Confiance</p>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${verdict.confidence}%` }} transition={{ duration: 1, delay: 0.5 }}
                                className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${verdict.action === "ACHETER" ? "#10b981, #34d399" : verdict.action === "VENDRE" ? "#ef4444, #f87171" : "#f59e0b, #fbbf24"})` }} />
                            </div>
                          </div>
                          <span className="text-sm font-black text-zinc-300 tabular-nums">{verdict.confidence}%</span>
                        </div>
                      </div>
                    </Glass>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { l: "RSI 14", v: tech.rsi[ohlcv.length - 1], fmt: (v: number) => isNaN(v) ? "—" : v.toFixed(1), color: (v: number) => v > 70 ? "#f87171" : v < 30 ? "#34d399" : "#e2e8f0", sub: (v: number) => v > 70 ? "Surachat" : v < 30 ? "Survente" : "Neutre" },
                        { l: "Stoch RSI", v: tech.stochRsi.k[ohlcv.length - 1], fmt: (v: number) => isNaN(v) ? "—" : v.toFixed(0), color: (v: number) => v > 80 ? "#f87171" : v < 20 ? "#34d399" : "#e2e8f0", sub: (v: number) => v > 80 ? "Surachat" : v < 20 ? "Survente" : "Neutre" },
                        { l: "ATR 14", v: tech.atr[ohlcv.length - 1], fmt: (v: number) => isNaN(v) ? "—" : v.toFixed(2), color: () => "#67e8f9", sub: (v: number) => lastPrice ? `±${((v / lastPrice) * 100).toFixed(1)}%` : "" },
                        { l: "MA 20", v: tech.ma20[ohlcv.length - 1], fmt: (v: number) => isNaN(v) ? "—" : v.toFixed(2), color: () => "#34d399", sub: (v: number) => lastPrice ? (lastPrice > v ? "↑ Dessus" : "↓ Sous") : "" },
                        { l: "MA 50", v: tech.ma50[ohlcv.length - 1], fmt: (v: number) => isNaN(v) ? "—" : v.toFixed(2), color: () => "#fbbf24", sub: (v: number) => lastPrice ? (lastPrice > v ? "↑ Dessus" : "↓ Sous") : "" },
                        { l: "Volume", v: ohlcv[ohlcv.length - 1].volume, fmt: (v: number) => fmtV(v), color: () => "#e2e8f0", sub: () => "" },
                      ].map((kpi, i) => (
                        <Glass key={i} className="p-3">
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">{kpi.l}</p>
                          <p className="text-[15px] font-black tabular-nums mt-1" style={{ color: kpi.color(kpi.v) }}>{kpi.fmt(kpi.v)}</p>
                          {kpi.sub(kpi.v) && <p className="text-[9px] text-zinc-600 mt-0.5">{kpi.sub(kpi.v)}</p>}
                        </Glass>
                      ))}
                    </div>

                    {/* Tabs */}
                    <Glass>
                      <div className="flex border-b border-white/[0.06]">
                        {([["signaux", "Signaux"], ["conseil", "Conseil"], ["niveaux", "Niveaux"]] as const).map(([t, l]) => (
                          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all relative ${tab === t ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
                            {l}
                            {tab === t && <motion.div layoutId="tab" className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px rgba(6,182,212,0.4)" }} />}
                          </button>
                        ))}
                      </div>

                      <div className="p-4">
                        {tab === "signaux" && (
                          <div className="space-y-2">
                            {verdict.signals.map((sig, i) => {
                              const sc = sig.signal === "BUY" ? "#34d399" : sig.signal === "SELL" ? "#f87171" : "#71717a";
                              return (
                                <motion.div key={sig.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                  className="py-2.5 border-b border-white/[0.04] last:border-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-white">{sig.name}</span>
                                      <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border" style={{ color: sc, background: `${sc}12`, borderColor: `${sc}30` }}>
                                        {sig.signal === "BUY" ? "▲ Achat" : sig.signal === "SELL" ? "▼ Vente" : "● Neutre"}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-500">{sig.value}</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 leading-relaxed">{sig.description}</p>
                                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${sig.strength * 100}%` }} transition={{ delay: i * 0.04 + 0.2, duration: 0.5 }}
                                      className="h-full rounded-full" style={{ backgroundColor: sc }} />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                        {tab === "conseil" && verdict.tradeAdvice && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2"><Clock size={10} className="text-zinc-600" /><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{verdict.tradeAdvice.timeframe}</span></div>
                            <div className={`p-3.5 rounded-xl border text-[10px] leading-relaxed ${verdict.action === "ACHETER" ? "border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-200" : verdict.action === "VENDRE" ? "border-red-500/15 bg-red-500/[0.04] text-red-200" : "border-amber-500/15 bg-amber-500/[0.04] text-amber-200"}`}>
                              {verdict.tradeAdvice.rationale}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-xl p-3 border border-cyan-500/15" style={{ background: "rgba(6,182,212,0.04)" }}>
                                <p className="text-[8px] text-cyan-400/60 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><Eye size={8} />Zone d&apos;entrée</p>
                                <p className="text-xs font-black text-cyan-300 tabular-nums">{verdict.tradeAdvice.entryZone.min.toFixed(2)}</p>
                                <p className="text-[9px] text-zinc-600">→ {verdict.tradeAdvice.entryZone.max.toFixed(2)}</p>
                              </div>
                              <div className="rounded-xl p-3 border border-red-500/15" style={{ background: "rgba(239,68,68,0.04)" }}>
                                <p className="text-[8px] text-red-400/60 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><Shield size={8} />Stop Loss</p>
                                <p className="text-xs font-black text-red-300 tabular-nums">{verdict.tradeAdvice.stopLoss.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                              <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-1"><Target size={8} />Objectifs</p>
                              {[
                                { l: "T1 — Primaire", v: verdict.tradeAdvice.targets.t1, c: "#34d399" },
                                { l: "T2 — Secondaire", v: verdict.tradeAdvice.targets.t2, c: "#60a5fa" },
                                { l: "T3 — Extension", v: verdict.tradeAdvice.targets.t3, c: "#a78bfa" },
                              ].map(t2 => (
                                <div key={t2.l} className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t2.c }} /><span className="text-[9px] text-zinc-500">{t2.l}</span></div>
                                  <span className="text-[10px] font-black tabular-nums" style={{ color: t2.c }}>{t2.v.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between items-center px-3 py-2.5 rounded-xl border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                              <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Risque / Rendement</span>
                              <span className={`text-sm font-black tabular-nums ${verdict.tradeAdvice.riskReward >= 2 ? "text-emerald-400" : verdict.tradeAdvice.riskReward >= 1.5 ? "text-amber-400" : "text-red-400"}`}>1 : {verdict.tradeAdvice.riskReward}</span>
                            </div>
                          </div>
                        )}

                        {tab === "niveaux" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[8px] text-cyan-400/60 uppercase tracking-widest font-bold mb-2 flex items-center gap-1"><Shield size={8} />Supports</p>
                                {tech.supports.length > 0 ? tech.supports.map(s => (
                                  <div key={s} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                                    <span className="text-[11px] font-black text-white tabular-nums">{s.toFixed(2)}</span>
                                    {lastPrice && <span className="text-[9px] text-cyan-400/40 font-mono">-{(((lastPrice - s) / lastPrice) * 100).toFixed(1)}%</span>}
                                  </div>
                                )) : <p className="text-[10px] text-zinc-700">—</p>}
                              </div>
                              <div>
                                <p className="text-[8px] text-red-400/60 uppercase tracking-widest font-bold mb-2 flex items-center gap-1"><Target size={8} />Résistances</p>
                                {tech.resistances.length > 0 ? tech.resistances.map(r => (
                                  <div key={r} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                                    <span className="text-[11px] font-black text-white tabular-nums">{r.toFixed(2)}</span>
                                    {lastPrice && <span className="text-[9px] text-red-400/40 font-mono">+{(((r - lastPrice) / lastPrice) * 100).toFixed(1)}%</span>}
                                  </div>
                                )) : <p className="text-[10px] text-zinc-700">—</p>}
                              </div>
                            </div>
                            <div className="pt-3 border-t border-white/[0.05]">
                              <p className="text-[8px] text-amber-400/50 uppercase tracking-widest font-bold mb-2">Fibonacci</p>
                              {tech.fibonacci.levels.map(({ label, price: fp }) => {
                                const isKey = ["61.8%", "50%", "38.2%"].includes(label);
                                return (
                                  <div key={label} className={`flex justify-between py-1 ${isKey ? "border-l-2 border-amber-500/30 pl-2" : ""}`}>
                                    <span className={`text-[9px] font-mono ${isKey ? "text-amber-400/70" : "text-zinc-700"}`}>{label}</span>
                                    <span className={`text-[10px] font-black tabular-nums ${isKey ? "text-amber-300" : "text-zinc-600"}`}>{fp.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </Glass>
                  </div>

                  {/* ═══ RIGHT — CHARTS ═══ */}
                  <div className="space-y-4">

                    {/* Chart controls */}
                    <Glass className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
                      <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        {PERIODS.map(p => (
                          <button key={p.l} onClick={() => { setPeriod(p); if (selected) analyze(selected, p); }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${period.l === p.l ? "text-white shadow-lg" : "text-zinc-600 hover:text-zinc-300"}`}
                            style={period.l === p.l ? { background: "linear-gradient(135deg, #0891b2, #2563eb)", boxShadow: "0 4px 12px rgba(6,182,212,0.25)" } : {}}>
                            {p.l}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        {([["ma", "MA", "#34d399"], ["bollinger", "BB", "#818cf8"], ["ichimoku", "ICH", "#fbbf24"], ["fibonacci", "FIB", "#fb923c"]] as [Overlay, string, string][]).map(([k, l, c]) => (
                          <button key={k} onClick={() => toggleOverlay(k)}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all border"
                            style={overlays.includes(k) ? { color: c, background: `${c}12`, borderColor: `${c}30` } : { color: "#52525b", background: "transparent", borderColor: "rgba(255,255,255,0.04)" }}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </Glass>

                    {/* Main chart */}
                    <Glass className="p-4" glow="rgba(6,182,212,0.03)">
                      <div style={{ height: 380 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="label" tick={{ fill: "#4b5563", fontSize: 9 }} axisLine={false} tickLine={false} interval={tickN} />
                            <YAxis domain={[pMin, pMax]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" width={55} />
                            <Tooltip content={<ChartTip />} />

                            {lastPrice && <ReferenceLine y={lastPrice} stroke="rgba(6,182,212,0.4)" strokeDasharray="4 6" label={{ value: lastPrice.toFixed(2), fill: "#22d3ee", fontSize: 10, position: "right" }} />}

                            {overlays.includes("fibonacci") && tech.fibonacci.levels.filter(f => ["61.8%", "50%", "38.2%"].includes(f.label)).map(f => (
                              <ReferenceLine key={f.label} y={f.price} stroke="rgba(251,191,36,0.25)" strokeDasharray="2 4" label={{ value: `Fib ${f.label}`, fill: "rgba(251,191,36,0.5)", fontSize: 8, position: "left" }} />
                            ))}

                            {overlays.includes("bollinger") && <>
                              <Line dataKey="bbU" stroke="rgba(129,140,248,0.4)" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls isAnimationActive={false} />
                              <Line dataKey="bbL" stroke="rgba(129,140,248,0.4)" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls isAnimationActive={false} />
                              <Line dataKey="bbM" stroke="rgba(129,140,248,0.2)" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                            </>}

                            {overlays.includes("ichimoku") && <>
                              <Line dataKey="tenkan" stroke="rgba(248,113,113,0.6)" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                              <Line dataKey="kijun" stroke="rgba(96,165,250,0.6)" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                              <Line dataKey="senkouA" stroke="rgba(52,211,153,0.3)" strokeWidth={0.5} dot={false} strokeDasharray="2 2" connectNulls isAnimationActive={false} />
                              <Line dataKey="senkouB" stroke="rgba(248,113,113,0.3)" strokeWidth={0.5} dot={false} strokeDasharray="2 2" connectNulls isAnimationActive={false} />
                            </>}

                            <Bar dataKey="body" barSize={Math.max(2, Math.min(7, 500 / chartData.length))} isAnimationActive={false}>
                              {chartData.map((d, i) => <Cell key={i} fill={d.up ? "#10b981" : "#ef4444"} />)}
                            </Bar>

                            {overlays.includes("ma") && <>
                              <Line dataKey="ma20" stroke="#34d399" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                              <Line dataKey="ma50" stroke="#fbbf24" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                              <Line dataKey="ma200" stroke="#f87171" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                            </>}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </Glass>

                    {/* Sub charts */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* RSI */}
                      <Glass className="p-3">
                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mb-1">RSI</p>
                        <div style={{ height: 70 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                              <YAxis domain={[0, 100]} ticks={[30, 70]} tick={{ fill: "#4b5563", fontSize: 8 }} axisLine={false} tickLine={false} orientation="right" width={20} />
                              <ReferenceLine y={70} stroke="rgba(248,113,113,0.3)" strokeDasharray="2 2" />
                              <ReferenceLine y={30} stroke="rgba(52,211,153,0.3)" strokeDasharray="2 2" />
                              <Line dataKey="rsi" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                              <Line dataKey="stochK" stroke="rgba(168,85,247,0.5)" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </Glass>

                      {/* MACD */}
                      <Glass className="p-3">
                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mb-1">MACD</p>
                        <div style={{ height: 70 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                              <YAxis tick={{ fill: "#4b5563", fontSize: 8 }} axisLine={false} tickLine={false} orientation="right" width={30} />
                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
                              <Bar dataKey="macdHist" barSize={2} isAnimationActive={false}>
                                {chartData.map((d, i) => <Cell key={i} fill={!isNaN(d.macdHist) && d.macdHist >= 0 ? "rgba(52,211,153,0.5)" : "rgba(248,113,113,0.5)"} />)}
                              </Bar>
                              <Line dataKey="macdLine" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                              <Line dataKey="macdSig" stroke="#f59e0b" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </Glass>

                      {/* Volume */}
                      <Glass className="p-3">
                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Volume</p>
                        <div style={{ height: 70 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                              <YAxis hide />
                              <Bar dataKey="volume" isAnimationActive={false}>
                                {chartData.map((d, i) => <Cell key={i} fill={d.up ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Glass>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 px-1">
                      {[["MA20", "#34d399"], ["MA50", "#fbbf24"], ["MA200", "#f87171"], ["BB", "#818cf8"], ["Tenkan", "#f87171"], ["Kijun", "#60a5fa"], ["Fib", "#fb923c"]].map(([l, c]) => (
                        <div key={l} className="flex items-center gap-1.5"><div className="h-px w-3" style={{ backgroundColor: c }} /><span className="text-[8px] font-mono" style={{ color: `${c}80` }}>{l}</span></div>
                      ))}
                    </div>

                    <p className="text-[9px] text-zinc-700 text-center px-4">⚠ Analyse technique uniquement — pas un conseil d&apos;investissement. Données ~15 min. Consultez un conseiller financier.</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ═══ EMPTY STATE ═══ */}
          {!loading && !error && !ohlcv.length && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <BarChart2 size={32} className="text-cyan-400" strokeWidth={1.5} />
                </div>
                <div className="absolute inset-0 blur-3xl bg-cyan-500/10 -z-10" />
              </div>
              <div>
                <p className="text-lg font-black text-white mb-2">Analyse technique professionnelle</p>
                <p className="text-xs text-zinc-500 max-w-md leading-relaxed">RSI · Stoch RSI · MACD · Bollinger · Ichimoku · Fibonacci · ATR · OBV · Supports & Résistances · Conseils d&apos;entrée / sortie</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {["LVMH", "Apple", "ASML", "Bitcoin", "Nvidia"].map(n => {
                  const s = STOCKS.find(st => st.name === n || st.name.startsWith(n));
                  if (!s) return null;
                  return (
                    <button key={n} onClick={() => pickStock(s)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] hover:border-cyan-500/25 text-xs font-bold text-zinc-500 hover:text-white transition-all duration-200" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)" }}>
                      <Zap size={10} className="text-cyan-400" />{n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}