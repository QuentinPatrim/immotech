"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, Loader2, ChevronUp, ChevronDown, X, Clock,
  TrendingUp, TrendingDown, Shield, Target, Eye, Zap, AlertTriangle,
  Activity, Layers, Crosshair, BarChart3, ArrowRight, BookOpen, Globe,
  HelpCircle, DollarSign, Plus, Briefcase, ScanLine, Check, Download, FileText,
} from "lucide-react";
import { exportFullPDF, exportSummaryPDF } from "./generateReport";
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

interface LayerSignal { layer: "price_action" | "technique" | "volume" | "structure" | "fondamental"; name: string; verdict: "bullish" | "bearish" | "neutral"; confidence: number; detail: string; }

interface Confluence { score: number; action: "OPPORTUNITÉ" | "ATTENDRE" | "RISQUÉ"; layers: LayerSignal[]; bullCount: number; bearCount: number; summary: string; entryZone: { min: number; max: number }; stopLoss: number; targets: number[]; riskReward: number; }

// ═══════════════════════════════════════════════════════════════
// FUNDAMENTALS TYPE
// ═══════════════════════════════════════════════════════════════

interface Fundamentals {
  marketCap: number | null;
  pe: number | null;              // Price/Earnings (PER)
  forwardPe: number | null;
  eps: number | null;             // Earnings per share (BPA)
  dividendRate: number | null;
  dividendYield: number | null;
  exDividendDate: string | null;
  payoutRatio: number | null;
  beta: number | null;
  profitMargin: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  targetMeanPrice: number | null;
  recommendationKey: string | null;
  numberOfAnalysts: number | null;
  sector: string | null;
  industry: string | null;
}

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO TYPES & SCAN UNIVERSES
// ═══════════════════════════════════════════════════════════════

interface PortfolioPosition {
  ticker: string;
  name: string;
  quantity: number;
  pru: number;
  addedAt: string;
}

interface ScanResult {
  stock: StockInfo;
  score: number;
  action: string;
  price: number;
  change: number;
}

const SCAN_UNIVERSES: { label: string; key: string; tickers: string[] }[] = [
  { label: "CAC 40", key: "cac40", tickers: ["MC.PA", "TTE.PA", "RMS.PA", "AIR.PA", "SAN.PA", "BNP.PA", "SU.PA", "OR.PA", "AI.PA", "CS.PA", "BN.PA", "KER.PA", "SAF.PA", "DG.PA", "CAP.PA", "ENGI.PA", "ORA.PA", "HO.PA"] },
  { label: "DAX", key: "dax", tickers: ["SAP.DE", "SIE.DE", "ALV.DE", "ADS.DE", "BMW.DE", "MBG.DE", "DTE.DE", "BAYN.DE", "IFX.DE", "MUV2.DE"] },
  { label: "US Top", key: "us", tickers: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "MA"] },
  { label: "Crypto", key: "crypto", tickers: ["BTC-EUR", "ETH-EUR", "SOL-EUR"] },
];

// ═══════════════════════════════════════════════════════════════
// EDUCATIONAL TIPS (mode éducatif inline)
// ═══════════════════════════════════════════════════════════════

const EDU_TIPS: Record<string, string> = {
  "Tendance haussière": "Une succession de plus hauts et plus bas ascendants. Comme un escalier qui monte — chaque marche est plus haute que la précédente.",
  "Tendance baissière": "L'inverse : chaque rebond est plus faible que le précédent. L'escalier descend.",
  "Consolidation": "Le prix oscille dans une zone sans direction claire. Phase d'accumulation ou de distribution — un mouvement fort suivra.",
  "Marteau": "Un chandelier avec une longue mèche basse. Les vendeurs ont poussé le prix très bas mais les acheteurs les ont repoussés avec force. Signal de rebond.",
  "Doji": "Le prix a ouvert et fermé quasi au même niveau. Ni les acheteurs ni les vendeurs n'ont gagné. Indécision totale.",
  "Englobante haussière": "La bougie verte du jour englobe entièrement la bougie rouge de la veille. Les acheteurs ont repris tout le terrain perdu.",
  "Englobante baissière": "La bougie rouge du jour englobe la bougie verte de la veille. Retournement de force en faveur des vendeurs.",
  "Support proche": "Un niveau de prix où le marché a historiquement rebondi. Comme un plancher — plus il a été testé, plus il est solide.",
  "Résistance proche": "Un niveau de prix où le marché a bloqué. Comme un plafond de verre — il faut beaucoup de force pour le casser.",
  "RSI survendu": "Le RSI sous 30 signifie que les ventes ont été excessives. Statistiquement, un rebond technique est probable à court terme.",
  "RSI suracheté": "Le RSI au-dessus de 70 indique des achats excessifs. Le prix est « tendu » vers le haut — une correction est probable.",
  "Divergence RSI ↑": "Le prix fait un nouveau plus bas, mais le RSI fait un plus haut. Le momentum de vente faiblit — signal de retournement.",
  "MACD croisement ↑": "La ligne rapide (MACD) croise la ligne lente (Signal) par le haut. Le momentum passe de baissier à haussier.",
  "MACD croisement ↓": "La ligne rapide passe sous la ligne lente. Le momentum se retourne à la baisse.",
  "MACD positif": "Le MACD est au-dessus du signal. La tendance court terme est favorable aux acheteurs.",
  "MACD négatif": "Le MACD est sous le signal. La pression vendeuse domine à court terme.",
  "Prix > MAs": "Le prix est au-dessus de ses moyennes mobiles 20 et 50 jours. Structure haussière — la tendance de fond est positive.",
  "Prix < MAs": "Le prix est sous les moyennes mobiles. Structure baissière — le marché est en difficulté.",
  "Bande basse Bollinger": "Le prix touche la bande inférieure (à -2 écarts-types). Statistiquement, 95% du prix devrait rester dans les bandes — un retour vers le centre est probable.",
  "Bande haute Bollinger": "Le prix touche la bande supérieure. Mouvement excessif vers le haut — retour vers la moyenne attendu.",
  "Squeeze Bollinger": "Les bandes se resserrent (volatilité minimale). C'est le calme avant la tempête — un mouvement explosif est imminent.",
  "Au-dessus du nuage": "En Ichimoku, être au-dessus du nuage confirme que la tendance est haussière. Le nuage agit comme un support dynamique.",
  "Sous le nuage": "Être sous le nuage Ichimoku confirme la tendance baissière. Le nuage devient une résistance dynamique.",
  "Dans le nuage": "Le prix est dans la zone d'incertitude Ichimoku. Comme conduire dans le brouillard — mieux vaut attendre d'en sortir.",
  "Volume fort ↑": "Un volume très supérieur à la moyenne accompagné d'une hausse. Les acheteurs sont massivement présents — le mouvement est crédible.",
  "Volume fort ↓": "Volume élevé avec baisse. Panique vendeuse ou liquidation de positions — mouvement violent et crédible.",
  "Accumulation OBV": "L'OBV monte alors que le prix baisse. Des gros acheteurs accumulent discrètement — l'argent intelligent entre.",
  "Distribution OBV": "L'OBV baisse alors que le prix monte. Des gros vendeurs sortent discrètement — l'argent intelligent sort.",
  "PER attractif": "Le PER (Prix/Bénéfice) est sous la moyenne du secteur. L'action est potentiellement sous-évaluée par rapport à ses bénéfices.",
  "PER élevé": "Le PER est élevé. Le marché anticipe une forte croissance future OU l'action est surévaluée. À analyser avec le contexte.",
  "Rendement dividende élevé": "Un rendement dividende supérieur à 3% est attractif pour une stratégie de revenus passifs.",
  "Croissance bénéfices": "Les revenus de l'entreprise sont en croissance. Fondamentalement positif pour le cours de l'action.",
  "Dette élevée": "Un ratio dette/capitaux propres élevé indique un endettement important. Plus risqué en cas de hausse des taux ou de ralentissement.",
  "Objectif analystes ↑": "Le consensus des analystes fixe un objectif de prix supérieur au cours actuel. Le marché voit un potentiel de hausse.",
};

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

function analyzeConfluence(ohlcv: OHLCV[], t: TechResult, fund?: Fundamentals | null): Confluence {
  const n = ohlcv.length - 1, price = ohlcv[n].close, layers: LayerSignal[] = [];
  const atr = t.atr[n] || price * 0.02;

  // ══════════════ LAYER 1: PRICE ACTION ══════════════
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

  // ══════════════ LAYER 2: STRUCTURE (S/R + Ichimoku) ══════════════
  // FIX: A resistance is only bearish if price is BELOW it.
  // If price has BROKEN ABOVE a resistance, it becomes a support (bullish).
  // Same logic inverted for supports.
  const nearThreshold = 0.015; // 1.5% proximity
  const breakThreshold = 0.005; // 0.5% — confirmed break

  for (const r of t.resistances) {
    const dist = (price - r) / price;
    if (dist > breakThreshold && dist < 0.04) {
      // Price is ABOVE this resistance → it's been broken → new support
      layers.push({ layer: "structure", name: "Résistance cassée (support)", verdict: "bullish", confidence: 0.8, detail: `Ancienne résistance à ${r.toFixed(2)} franchie — devient support. Configuration haussière.` });
      break; // Only report the nearest broken resistance
    } else if (Math.abs(dist) < nearThreshold && dist <= breakThreshold) {
      // Price is near or just below this resistance → bearish
      layers.push({ layer: "structure", name: "Résistance proche", verdict: "bearish", confidence: 0.7, detail: `Résistance à ${r.toFixed(2)} — risque de rejet. Attendre la cassure pour confirmer.` });
      break;
    }
  }

  for (const s of [...t.supports].reverse()) {
    const dist = (s - price) / price;
    if (dist > breakThreshold && dist < 0.04) {
      // Price is BELOW this support → it's been broken → new resistance
      layers.push({ layer: "structure", name: "Support cassé (résistance)", verdict: "bearish", confidence: 0.8, detail: `Ancien support à ${s.toFixed(2)} cassé — devient résistance. Configuration baissière.` });
      break;
    } else if (Math.abs(dist) < nearThreshold && dist <= breakThreshold) {
      // Price is near or just above this support → bullish
      layers.push({ layer: "structure", name: "Support proche", verdict: "bullish", confidence: 0.7, detail: `Zone de support à ${s.toFixed(2)} — rebond historiquement probable.` });
      break;
    }
  }

  // Ichimoku cloud
  const sa = t.ichimoku.senkouA[n], sb = t.ichimoku.senkouB[n];
  if (!isNaN(sa) && !isNaN(sb)) { const cl2 = Math.max(sa, sb), clL = Math.min(sa, sb); if (price > cl2) layers.push({ layer: "structure", name: "Au-dessus du nuage", verdict: "bullish", confidence: 0.75, detail: "Ichimoku confirme la tendance haussière." }); else if (price < clL) layers.push({ layer: "structure", name: "Sous le nuage", verdict: "bearish", confidence: 0.75, detail: "Ichimoku confirme la tendance baissière." }); else layers.push({ layer: "structure", name: "Dans le nuage", verdict: "neutral", confidence: 0.5, detail: "Zone d'incertitude Ichimoku." }); }

  // ══════════════ LAYER 3: TECHNICAL INDICATORS ══════════════
  const rsi = t.rsi[n];
  if (!isNaN(rsi)) { if (rsi < 30) layers.push({ layer: "technique", name: "RSI survendu", verdict: "bullish", confidence: 0.8, detail: `RSI à ${rsi.toFixed(0)} — les vendeurs s'épuisent.` }); else if (rsi > 70) layers.push({ layer: "technique", name: "RSI suracheté", verdict: "bearish", confidence: 0.8, detail: `RSI à ${rsi.toFixed(0)} — risque de correction.` }); else layers.push({ layer: "technique", name: `RSI ${rsi.toFixed(0)}`, verdict: "neutral", confidence: 0.3, detail: "Pas de signal extrême." }); }

  if (n >= 20) { const pL = ohlcv.slice(n - 20, n + 1).map(c2 => c2.close), rS = t.rsi.slice(n - 20, n + 1), pM = Math.min(...pL), rM = rS[pL.indexOf(pM)]; if (price <= pM * 1.01 && !isNaN(rM) && rsi > rM + 5) layers.push({ layer: "technique", name: "Divergence RSI", verdict: "bullish", confidence: 0.85, detail: "Prix bas mais RSI remonte — retournement probable." }); }

  const mc = t.macd.macd[n], ms = t.macd.signal[n], mcp = t.macd.macd[n - 1], msp = t.macd.signal[n - 1];
  if (!isNaN(mc) && !isNaN(ms) && !isNaN(mcp) && !isNaN(msp)) { if (mcp < msp && mc > ms) layers.push({ layer: "technique", name: "MACD croisement haussier", verdict: "bullish", confidence: 0.85, detail: "Retournement du momentum à la hausse." }); else if (mcp > msp && mc < ms) layers.push({ layer: "technique", name: "MACD croisement baissier", verdict: "bearish", confidence: 0.85, detail: "Retournement du momentum à la baisse." }); else if (mc > ms) layers.push({ layer: "technique", name: "MACD positif", verdict: "bullish", confidence: 0.5, detail: "Momentum haussier en cours." }); else layers.push({ layer: "technique", name: "MACD négatif", verdict: "bearish", confidence: 0.5, detail: "Pression vendeuse." }); }

  const [ma20, ma50] = [t.ma20[n], t.ma50[n]];
  if (!isNaN(ma20) && !isNaN(ma50)) { if (price > ma20 && price > ma50) layers.push({ layer: "technique", name: "Prix > MAs", verdict: "bullish", confidence: 0.7, detail: "Au-dessus des moyennes mobiles 20 et 50." }); else if (price < ma20 && price < ma50) layers.push({ layer: "technique", name: "Prix < MAs", verdict: "bearish", confidence: 0.7, detail: "Sous les moyennes mobiles." }); }

  if (!isNaN(t.bb.upper[n]) && !isNaN(t.bb.lower[n])) { if (price <= t.bb.lower[n]) layers.push({ layer: "technique", name: "Bande basse Bollinger", verdict: "bullish", confidence: 0.65, detail: "Prix extrême bas — rebond statistiquement probable." }); else if (price >= t.bb.upper[n]) layers.push({ layer: "technique", name: "Bande haute Bollinger", verdict: "bearish", confidence: 0.65, detail: "Prix extrême haut — retour vers moyenne attendu." }); const w = ((t.bb.upper[n] - t.bb.lower[n]) / t.bb.middle[n]) * 100; if (w < 3) layers.push({ layer: "technique", name: "Squeeze Bollinger", verdict: "neutral", confidence: 0.7, detail: "Volatilité comprimée — explosion imminente." }); }

  // ══════════════ LAYER 4: VOLUME (always present) ══════════════
  const avgVol = ohlcv.slice(-20).reduce((s, c2) => s + c2.volume, 0) / 20;
  const curVol = ohlcv[n].volume;
  const vR = curVol / (avgVol || 1);
  const obvCh = t.obv[n] - t.obv[Math.max(0, n - 10)];
  const prCh = price - ohlcv[Math.max(0, n - 10)].close;

  // Volume ratio signal (always emit one)
  // FIX: Low volume on a breakout day = BEARISH (bull trap risk), not neutral
  const isDayBreakout = Math.abs(prCh / (price || 1)) > 0.02; // >2% move today
  if (vR > 1.5 && prCh > 0) {
    layers.push({ layer: "volume", name: "Volume fort haussier", verdict: "bullish", confidence: Math.min(0.95, 0.6 + vR * 0.1), detail: `Volume ${vR.toFixed(1)}x la moyenne — conviction acheteuse forte. Valide la hausse.` });
  } else if (vR > 1.5 && prCh < 0) {
    layers.push({ layer: "volume", name: "Volume fort baissier", verdict: "bearish", confidence: Math.min(0.95, 0.6 + vR * 0.1), detail: `Volume ${vR.toFixed(1)}x la moyenne avec baisse — pression vendeuse institutionnelle.` });
  } else if (vR < 0.5 && isDayBreakout && prCh > 0) {
    // BULL TRAP: breakout haussier sans volume = piège acheteur
    layers.push({ layer: "volume", name: "Bull trap potentiel", verdict: "bearish", confidence: 0.75, detail: `Cassure haussière (+${((prCh / (price - prCh)) * 100).toFixed(1)}%) sur volume faible (${(vR * 100).toFixed(0)}% moy.). Mouvement non validé par les institutionnels — risque de piège acheteur.` });
  } else if (vR < 0.5) {
    layers.push({ layer: "volume", name: "Volume faible", verdict: "bearish", confidence: 0.45, detail: `Volume à ${(vR * 100).toFixed(0)}% de la moyenne — faible conviction. Mouvement fragile, prudence.` });
  } else {
    layers.push({ layer: "volume", name: `Volume ${vR.toFixed(1)}x moy.`, verdict: "neutral", confidence: 0.3, detail: `Volume proche de la moyenne (${vR.toFixed(1)}x). Activité normale.` });
  }

  // OBV divergence
  if (obvCh > 0 && prCh < 0) layers.push({ layer: "volume", name: "Accumulation OBV", verdict: "bullish", confidence: 0.8, detail: "OBV monte malgré la baisse — accumulation institutionnelle discrète." });
  else if (obvCh < 0 && prCh > 0) layers.push({ layer: "volume", name: "Distribution OBV", verdict: "bearish", confidence: 0.8, detail: "OBV baisse malgré la hausse — distribution en cours. Les « smart money » sortent." });

  // ══════════════ LAYER 5: FONDAMENTAUX ══════════════
  if (fund) {
    if (fund.pe != null && fund.pe > 0) {
      if (fund.pe < 12) layers.push({ layer: "fondamental", name: "PER attractif", verdict: "bullish", confidence: 0.65, detail: `PER de ${fund.pe.toFixed(1)} — valorisation basse. L'action pourrait être sous-évaluée.` });
      else if (fund.pe > 35) layers.push({ layer: "fondamental", name: "PER élevé", verdict: "bearish", confidence: 0.5, detail: `PER de ${fund.pe.toFixed(1)} — valorisation tendue. Surévaluation possible.` });
    }
    if (fund.dividendYield != null && fund.dividendYield >= 3)
      layers.push({ layer: "fondamental", name: "Rendement dividende élevé", verdict: "bullish", confidence: 0.55, detail: `Rendement de ${fund.dividendYield.toFixed(1)}% — attractif pour les revenus passifs.` });
    if (fund.revenueGrowth != null) {
      if (fund.revenueGrowth > 5) layers.push({ layer: "fondamental", name: "Croissance bénéfices", verdict: "bullish", confidence: 0.6, detail: `CA en hausse de +${fund.revenueGrowth.toFixed(1)}%. Dynamique positive.` });
      else if (fund.revenueGrowth < -5) layers.push({ layer: "fondamental", name: "Revenus en baisse", verdict: "bearish", confidence: 0.6, detail: `CA en recul de ${fund.revenueGrowth.toFixed(1)}%. Fondamentaux fragilisés.` });
    }
    if (fund.debtToEquity != null && fund.debtToEquity > 150)
      layers.push({ layer: "fondamental", name: "Dette élevée", verdict: "bearish", confidence: 0.5, detail: `Ratio dette/CP de ${fund.debtToEquity.toFixed(0)}%. Endettement important.` });
    if (fund.targetMeanPrice != null && price > 0) {
      const upside = ((fund.targetMeanPrice - price) / price) * 100;
      if (upside > 15) layers.push({ layer: "fondamental", name: "Obj. analystes haussier", verdict: "bullish", confidence: 0.55, detail: `Objectif moyen ${fund.targetMeanPrice.toFixed(2)} (+${upside.toFixed(0)}%). Consensus positif.` });
      else if (upside < -10) layers.push({ layer: "fondamental", name: "Obj. analystes baissier", verdict: "bearish", confidence: 0.5, detail: `Objectif moyen ${fund.targetMeanPrice.toFixed(2)} (${upside.toFixed(0)}%). Le consensus voit un risque de baisse.` });
    }
    if (fund.profitMargin != null && fund.profitMargin > 20)
      layers.push({ layer: "fondamental", name: "Marge élevée", verdict: "bullish", confidence: 0.4, detail: `Marge nette de ${fund.profitMargin.toFixed(1)}% — excellente rentabilité.` });
  }

  // ══════════════ SCORING ══════════════
  const bullish = layers.filter(l => l.verdict === "bullish"), bearish = layers.filter(l => l.verdict === "bearish");
  const bS = bullish.reduce((s, l) => s + l.confidence, 0), beS = bearish.reduce((s, l) => s + l.confidence, 0), tot = bS + beS || 1;
  const score = Math.round(Math.min(100, Math.max(0, 50 + ((bS - beS) / tot) * 50))) | 0;
  const action = score >= 65 ? "OPPORTUNITÉ" : score <= 35 ? "RISQUÉ" : "ATTENDRE";

  // ══════════════ TRADE PLAN (asset-class-aware, realistic) ══════════════
  // FIX v3: Stops and targets must be proportional to the asset's actual profile.
  // A blue-chip like Air Liquide doesn't move +50% in 6 months.
  // Use beta and asset type to cap amplitudes.
  const isBull = score >= 50;

  // Nearest structural levels
  const nearSup = t.supports.filter(s => s < price).sort((a, b) => b - a)[0] || (price - atr * 1.5);
  const nearRes = t.resistances.filter(r => r > price).sort((a, b) => a - b)[0] || (price + atr * 1.5);

  // Determine asset volatility class from beta + sector
  const beta = (fund?.beta != null && fund.beta > 0) ? fund.beta : 1.0;
  const isCrypto2 = layers.some(l => l.layer === "fondamental") === false && atr / price > 0.04;
  // Max stop distance and max target distance based on asset class
  const maxStopPct = isCrypto2 ? 0.12 : beta > 1.3 ? 0.06 : beta > 0.9 ? 0.045 : 0.035;
  const maxT1Pct = isCrypto2 ? 0.20 : beta > 1.3 ? 0.10 : beta > 0.9 ? 0.07 : 0.05;
  const maxT2Pct = maxT1Pct * 1.6;
  const maxT3Pct = maxT1Pct * 2.5;

  let sl: number, t1: number, t2: number, t3: number;

  if (isBull) {
    // Stop: nearest support minus small buffer, capped
    sl = Math.max(nearSup - atr * 0.2, price * (1 - maxStopPct));
    sl = Math.max(sl, price * 0.85); // absolute floor
    const risk = Math.abs(price - sl);

    // Targets: R/R minimum 1:2, but capped to realistic amplitude
    t1 = Math.min(price + risk * 2, price * (1 + maxT1Pct));
    t2 = Math.min(price + risk * 3, price * (1 + maxT2Pct));
    t3 = Math.min(price + risk * 4.5, price * (1 + maxT3Pct));

    // If nearest resistance is within realistic range, use it for T1
    if (nearRes > price && nearRes < price * (1 + maxT1Pct) && nearRes > price + risk * 1.5) {
      t1 = nearRes;
    }
  } else {
    sl = Math.min(nearRes + atr * 0.2, price * (1 + maxStopPct));
    sl = Math.min(sl, price * 1.15);
    const risk = Math.abs(sl - price);

    t1 = Math.max(price - risk * 2, price * (1 - maxT1Pct));
    t2 = Math.max(price - risk * 3, price * (1 - maxT2Pct));
    t3 = Math.max(price - risk * 4.5, price * (1 - maxT3Pct));

    if (nearSup < price && nearSup > price * (1 - maxT1Pct) && nearSup < price - risk * 1.5) {
      t1 = nearSup;
    }
  }

  const riskAmt = Math.abs(price - sl);
  const rewardAmt = Math.abs(t1 - price);
  const rr = riskAmt > 0 ? Math.round((rewardAmt / riskAmt) * 10) / 10 : 0;

  const summary = score >= 65
    ? `${bullish.length} signaux haussiers convergent — opportunité identifiée.`
    : score <= 35
    ? `${bearish.length} signaux baissiers convergent — configuration défavorable.`
    : `Signaux mixtes (${bullish.length} haussiers vs ${bearish.length} baissiers). Attendre une confluence plus claire.`;

  return {
    score, action, layers,
    bullCount: bullish.length, bearCount: bearish.length,
    summary,
    entryZone: { min: Math.max(isBull ? nearSup : price - atr * 0.3, price - atr * 0.5), max: price + atr * 0.3 },
    stopLoss: sl,
    targets: [t1, t2, t3],
    riskReward: rr,
  };
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
// FETCH FUNDAMENTALS (quoteSummary)
// ═══════════════════════════════════════════════════════════════

async function fetchFundamentals(ticker: string): Promise<Fundamentals | null> {
  try {
    const res = await fetch(`/api/yahoo?endpoint=quoteSummary&ticker=${encodeURIComponent(ticker)}`);
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.quoteSummary?.result?.[0];
    if (!r) return null;
    const sd = r.summaryDetail || {};
    const ks = r.defaultKeyStatistics || {};
    const fd = r.financialData || {};
    const ce = r.calendarEvents || {};
    const pr = r.price || {};
    const sp = r.summaryProfile || {};

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
  } catch { return null; }
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
// YAHOO GLOBAL SEARCH — accès à TOUS les actifs mondiaux
// ═══════════════════════════════════════════════════════════════

interface YahooResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  typeDisp?: string;
  quoteType?: string;
}

async function fetchYahooSearch(q: string): Promise<YahooResult[]> {
  try {
    const res = await fetch(`/api/yahoo?endpoint=search&q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const json = await res.json();
    const quotes: YahooResult[] = json?.quotes ?? [];
    return quotes
      .filter(r => ["EQUITY", "ETF", "CRYPTOCURRENCY", "INDEX", "MUTUALFUND"].includes(r.quoteType || ""))
      .slice(0, 8);
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO — Supabase read/write (compatible with Patrimoine page structure)
// Assets are stored as a flat array: [{ id, name, type, ticker, quantity, buyPrice, unitPrice, value, envelope, ... }]
// ═══════════════════════════════════════════════════════════════

async function loadPortfolio(): Promise<PortfolioPosition[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from("profiles").select("assets_json").eq("id", user.id).single();
    if (!data?.assets_json) return [];
    const assets: Array<{ ticker?: string; name: string; type: string; quantity?: number; buyPrice?: number; unitPrice?: number; value: number; envelope?: string }> = data.assets_json;
    return assets
      .filter(a => (a.type === "Bourse" || a.type === "Crypto") && a.ticker)
      .map(a => ({
        ticker: a.ticker!,
        name: a.name,
        quantity: a.quantity || 0,
        pru: a.buyPrice || 0,
        addedAt: "",
      }));
  } catch { return []; }
}

async function addToPortfolio(ticker: string, name: string, quantity: number, pru: number, type: "Bourse" | "Crypto"): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from("profiles").select("assets_json").eq("id", user.id).single();
    if (!data) return false;
    const assets: Array<Record<string, unknown>> = data.assets_json || [];

    // Check if position already exists
    const existingIdx = assets.findIndex((a: Record<string, unknown>) => a.ticker === ticker);
    if (existingIdx >= 0) {
      // Average PRU
      const old = assets[existingIdx] as { quantity?: number; buyPrice?: number; unitPrice?: number };
      const oldQty = (old.quantity as number) || 0;
      const oldPru = (old.buyPrice as number) || pru;
      const totalQty = oldQty + quantity;
      const newPru = (oldQty * oldPru + quantity * pru) / totalQty;
      assets[existingIdx] = {
        ...assets[existingIdx],
        quantity: totalQty,
        buyPrice: +newPru.toFixed(4),
        unitPrice: pru, // update current price
        value: totalQty * pru,
      };
    } else {
      // New position — match Patrimoine Asset structure
      assets.push({
        id: `nexus-${Date.now()}`,
        name,
        type,
        ticker,
        quantity,
        buyPrice: pru,
        unitPrice: pru,
        value: quantity * pru,
        envelope: type === "Crypto" ? "Autre" : "CTO",
      });
    }

    const { error } = await supabase.from("profiles").update({ assets_json: assets }).eq("id", user.id);
    return !error;
  } catch { return false; }
}

async function removeFromPortfolio(ticker: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from("profiles").select("assets_json").eq("id", user.id).single();
    if (!data) return false;
    const assets: Array<Record<string, unknown>> = data.assets_json || [];
    const filtered = assets.filter((a: Record<string, unknown>) => a.ticker !== ticker);
    const { error } = await supabase.from("profiles").update({ assets_json: filtered }).eq("id", user.id);
    return !error;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════════════════
// SCANNER — Quick confluence score for a ticker
// ═══════════════════════════════════════════════════════════════

async function quickScore(ticker: string): Promise<{ score: number; price: number; change: number } | null> {
  try {
    const ohlcv = await fetchChart(ticker, "6mo", "1d");
    if (ohlcv.length < 30) return null;
    const tech = computeAll(ohlcv);
    const conf = analyzeConfluence(ohlcv, tech);
    const price = ohlcv[ohlcv.length - 1].close;
    const prev = ohlcv[ohlcv.length - 2]?.close || price;
    return { score: conf.score, price, change: ((price - prev) / prev) * 100 };
  } catch { return null; }
}

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
  const [yahooResults, setYahooResults] = useState<YahooResult[]>([]);
  const [yahooLoading, setYahooLoading] = useState(false);
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
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>(["ma"]);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Portfolio
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQty, setAddQty] = useState("1");
  const [addPru, setAddPru] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Scanner
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanUniverse, setScanUniverse] = useState<string>("cac40");
  const [showScanner, setShowScanner] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Load portfolio on mount
  useEffect(() => { loadPortfolio().then(setPortfolio); }, []);

  // Check if current stock is in portfolio
  const currentPosition = useMemo(() => {
    if (!selected) return null;
    return portfolio.find(p => p.ticker === selected.ticker) || null;
  }, [selected, portfolio]);

  useEffect(() => {
    if (query.length >= 2) {
      // Recherche locale instantanée
      setSuggestions(searchStocks(query));
      setShowSugg(true);

      // Recherche Yahoo avec debounce (350ms)
      if (query.length >= 2) {
        setYahooLoading(true);
        const timer = setTimeout(async () => {
          const results = await fetchYahooSearch(query);
          setYahooResults(results);
          setYahooLoading(false);
        }, 350);
        return () => { clearTimeout(timer); setYahooLoading(false); };
      }
    } else {
      setSuggestions([]);
      setYahooResults([]);
      setShowSugg(false);
    }
  }, [query]);

  // Main analysis — always fetches 6mo for scoring
  const analyze = useCallback(async (stock: StockInfo) => {
    setLoading(true); setError(null); setShowSugg(false); setFundamentals(null);
    try {
      const [data6mo, m, fund] = await Promise.all([
        fetchChart(stock.ticker, ANALYSIS_PERIOD.v, ANALYSIS_PERIOD.i),
        fetchMeta(stock.ticker),
        fetchFundamentals(stock.ticker),
      ]);
      const tr = computeAll(data6mo);
      setAnalysisData(data6mo); setViewData(data6mo); setTech(tr);
      setConfluence(analyzeConfluence(data6mo, tr, fund));
      setMeta(m); setFundamentals(fund);
      setViewPeriod(VIEW_PERIODS[3]);
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

  const pickStock = (s: StockInfo) => { setSelected(s); setQuery(s.name); setYahooResults([]); analyze(s); };
  const pickYahoo = (r: YahooResult) => {
    const s: StockInfo = { name: r.longname || r.shortname || r.symbol, ticker: r.symbol, country: r.exchDisp || "—", sector: r.typeDisp || "—" };
    setSelected(s); setQuery(s.name); setYahooResults([]); analyze(s);
  };
  const clear = () => { setSelected(null); setQuery(""); setAnalysisData([]); setViewData([]); setTech(null); setConfluence(null); setMeta(null); setError(null); setYahooResults([]); setFundamentals(null); setShowAddModal(false); setAddSuccess(false); setShowExportMenu(false); };
  const toggleOverlay = (o: Overlay) => setOverlays(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  const fmtV = (v: number) => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`;
  const lastPrice = meta?.curr ?? (analysisData.length ? analysisData[analysisData.length - 1].close : null);

  // Add to portfolio
  const handleAdd = async () => {
    if (!selected || !lastPrice) return;
    setAddSaving(true);
    const qty = parseFloat(addQty) || 1;
    const pru = parseFloat(addPru) || lastPrice;
    const type = selected.sector === "Crypto" ? "Crypto" : "Bourse";
    const ok = await addToPortfolio(selected.ticker, selected.name, qty, pru, type);
    if (ok) {
      setAddSuccess(true);
      const updated = await loadPortfolio();
      setPortfolio(updated);
      setTimeout(() => { setShowAddModal(false); setAddSuccess(false); }, 1200);
    }
    setAddSaving(false);
  };

  // Scanner
  const handleScan = async () => {
    const universe = SCAN_UNIVERSES.find(u => u.key === scanUniverse);
    if (!universe) return;
    setScanning(true); setScanResults([]); setScanProgress(0); setShowScanner(true);
    const results: ScanResult[] = [];
    for (let i = 0; i < universe.tickers.length; i++) {
      const ticker = universe.tickers[i];
      const stock = STOCKS.find(s => s.ticker === ticker) || { name: ticker, ticker, country: "—", sector: "—" };
      setScanProgress(Math.round(((i + 1) / universe.tickers.length) * 100));
      const res = await quickScore(ticker);
      if (res) results.push({ stock, score: res.score, action: res.score >= 65 ? "OPPORTUNITÉ" : res.score <= 35 ? "RISQUÉ" : "ATTENDRE", price: res.price, change: res.change });
    }
    results.sort((a, b) => b.score - a.score);
    setScanResults(results);
    setScanning(false);
  };

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
    fondamental: { label: "Fondamentaux", icon: <DollarSign size={13} />, color: "#059669" },
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
            <div className="flex items-center gap-2">
              <button onClick={() => setShowScanner(!showScanner)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-[12px] font-medium transition-all hover:shadow-md"
                style={{ background: showScanner ? P.blue : P.card, borderColor: showScanner ? P.blue : P.border, color: showScanner ? "#fff" : P.blue }}>
                <ScanLine size={13} />
                Scanner
              </button>
              <Link href="/analyses/guide"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-[12px] font-medium transition-all hover:shadow-md"
                style={{ background: P.card, borderColor: P.border, color: P.blue }}>
                <BookOpen size={13} />
                Guide
              </Link>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: P.textLight }}>
                <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: P.green }} />Temps réel
              </div>
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
              {showSugg && (suggestions.length > 0 || yahooResults.length > 0 || yahooLoading) && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-2 left-0 right-0 rounded-2xl border shadow-xl z-50 overflow-hidden max-h-[420px] overflow-y-auto" style={{ background: P.card, borderColor: P.border }}>

                  {/* Résultats locaux */}
                  {suggestions.length > 0 && (
                    <>
                      <div className="px-5 py-2" style={{ background: P.cardAlt }}>
                        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.textMuted }}>Populaires</span>
                      </div>
                      {suggestions.map((s, i) => (
                        <button key={s.ticker} onClick={() => pickStock(s)} className="w-full flex items-center justify-between px-6 py-3.5 transition-colors text-left hover:bg-slate-50" style={i ? { borderTop: `1px solid ${P.borderLight}` } : {}}>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: P.blueLight }}><span className="text-[10px] font-bold" style={{ color: P.blue }}>{s.name[0]}</span></div>
                            <div><span className="text-sm font-semibold" style={{ color: P.text }}>{s.name}</span><span className="text-xs ml-2" style={{ color: P.textLight }}>{s.ticker}</span></div>
                          </div>
                          <span className="text-[10px] px-2.5 py-1 rounded-lg" style={{ background: P.cardAlt, color: P.textMid }}>{s.sector}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Résultats Yahoo (tous les actifs mondiaux) */}
                  {(yahooResults.length > 0 || yahooLoading) && (
                    <>
                      <div className="px-5 py-2 flex items-center gap-2" style={{ background: P.cardAlt, borderTop: suggestions.length ? `1px solid ${P.border}` : "none" }}>
                        <Globe size={10} style={{ color: P.blue }} />
                        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.textMuted }}>Tous les marchés</span>
                        {yahooLoading && <Loader2 size={10} className="animate-spin ml-1" style={{ color: P.blue }} />}
                      </div>
                      {yahooResults
                        .filter(r => !suggestions.some(s => s.ticker === r.symbol))
                        .map((r, i) => (
                        <button key={r.symbol} onClick={() => pickYahoo(r)} className="w-full flex items-center justify-between px-6 py-3.5 transition-colors text-left hover:bg-blue-50/50" style={i ? { borderTop: `1px solid ${P.borderLight}` } : {}}>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "#eff6ff", border: `1px solid ${P.blue}15` }}>
                              <Globe size={12} style={{ color: P.blue }} />
                            </div>
                            <div>
                              <span className="text-sm font-semibold" style={{ color: P.text }}>{r.longname || r.shortname || r.symbol}</span>
                              <span className="text-xs ml-2 font-mono" style={{ color: P.blue }}>{r.symbol}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.typeDisp && <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: P.cardAlt, color: P.textMid }}>{r.typeDisp}</span>}
                            {r.exchDisp && <span className="text-[10px] px-2 py-0.5 rounded-md border" style={{ borderColor: P.borderLight, color: P.textLight }}>{r.exchDisp}</span>}
                          </div>
                        </button>
                      ))}
                      {yahooLoading && yahooResults.length === 0 && (
                        <div className="flex items-center gap-2 px-6 py-4" style={{ color: P.textLight }}>
                          <Loader2 size={14} className="animate-spin" style={{ color: P.blue }} />
                          <span className="text-xs">Recherche sur Yahoo Finance…</span>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ SCANNER PANEL ═══ */}
          <AnimatePresence>
            {showScanner && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="rounded-2xl border p-6" style={{ background: P.card, borderColor: P.border }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ScanLine size={16} style={{ color: P.blue }} />
                      <span className="text-sm font-semibold" style={{ color: P.text }}>Top Opportunités</span>
                    </div>
                    <button onClick={() => setShowScanner(false)}><X size={14} style={{ color: P.textMuted }} /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {SCAN_UNIVERSES.map(u => (
                      <button key={u.key} onClick={() => setScanUniverse(u.key)}
                        className="px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all border"
                        style={scanUniverse === u.key ? { background: P.blue, color: "#fff", borderColor: P.blue } : { background: P.cardAlt, color: P.textMid, borderColor: P.borderLight }}>
                        {u.label}
                      </button>
                    ))}
                    <button onClick={handleScan} disabled={scanning}
                      className="px-5 py-2 rounded-xl text-[12px] font-semibold transition-all ml-auto flex items-center gap-2"
                      style={{ background: scanning ? P.cardAlt : P.blue, color: scanning ? P.textMid : "#fff" }}>
                      {scanning ? <Loader2 size={13} className="animate-spin" /> : <ScanLine size={13} />}
                      {scanning ? `Scan ${scanProgress}%` : "Lancer le scan"}
                    </button>
                  </div>
                  {scanning && (
                    <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: P.cardAlt }}>
                      <motion.div className="h-full rounded-full" style={{ background: P.blue }} animate={{ width: `${scanProgress}%` }} />
                    </div>
                  )}
                  {scanResults.length > 0 && (
                    <div className="space-y-1">
                      {scanResults.map((r, i) => (
                        <button key={r.stock.ticker} onClick={() => pickStock(r.stock)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-slate-50 text-left" style={i ? { borderTop: `1px solid ${P.borderLight}` } : {}}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold tabular-nums w-8" style={{ color: r.score >= 65 ? P.green : r.score <= 35 ? P.red : P.amber }}>{r.score}</span>
                            <div>
                              <span className="text-[13px] font-semibold" style={{ color: P.text }}>{r.stock.name}</span>
                              <span className="text-[11px] ml-2" style={{ color: P.textLight }}>{r.stock.ticker}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-semibold tabular-nums" style={{ color: P.text }}>{r.price.toFixed(2)}</span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: r.change >= 0 ? P.greenSoft : P.redSoft, color: r.change >= 0 ? P.green : P.red }}>
                              {r.change >= 0 ? "+" : ""}{r.change.toFixed(2)}%
                            </span>
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: r.score >= 65 ? P.greenSoft : r.score <= 35 ? P.redSoft : P.amberSoft, color: r.score >= 65 ? P.green : r.score <= 35 ? P.red : P.amber }}>
                              {r.action}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!scanning && scanResults.length === 0 && (
                    <p className="text-[12px] text-center py-4" style={{ color: P.textLight }}>Sélectionnez un univers et lancez le scan pour trouver les meilleures opportunités.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <div className="flex items-center gap-2">
                  <button onClick={() => { setAddPru(lastPrice?.toFixed(2) || ""); setAddQty("1"); setAddSuccess(false); setShowAddModal(true); }}
                    className="h-10 px-4 rounded-xl border flex items-center gap-2 text-[12px] font-medium transition-all hover:shadow-md"
                    style={{ background: P.card, borderColor: P.border, color: P.green }}>
                    <Plus size={14} />{currentPosition ? "Renforcer" : "Ajouter"}
                  </button>
                  {/* Export PDF */}
                  <div className="relative">
                    <button onClick={() => setShowExportMenu(v => !v)}
                      className="h-10 px-4 rounded-xl border flex items-center gap-2 text-[12px] font-medium transition-all hover:shadow-md"
                      style={{ background: P.card, borderColor: P.border, color: P.blue }}>
                      <Download size={14} />PDF
                    </button>
                    <AnimatePresence>
                      {showExportMenu && (
                        <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 rounded-xl border shadow-xl z-50 overflow-hidden w-56" style={{ background: P.card, borderColor: P.border }}>
                          <button onClick={() => { exportFullPDF(selected!, meta, confluence, tech!, fundamentals, currentPosition); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50" style={{ borderBottom: `1px solid ${P.borderLight}` }}>
                            <FileText size={14} style={{ color: P.blue }} />
                            <div>
                              <p className="text-[12px] font-semibold" style={{ color: P.text }}>Rapport complet</p>
                              <p className="text-[10px]" style={{ color: P.textLight }}>Signaux + fondamentaux + PEA/CTO</p>
                            </div>
                          </button>
                          <button onClick={() => { exportSummaryPDF(selected!, meta, confluence, tech!, fundamentals, currentPosition); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50">
                            <Zap size={14} style={{ color: P.amber }} />
                            <div>
                              <p className="text-[12px] font-semibold" style={{ color: P.text }}>Résumé exécutif</p>
                              <p className="text-[10px]" style={{ color: P.textLight }}>Score + verdict + plan (1 page)</p>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={() => selected && analyze(selected)} className="h-10 w-10 rounded-xl border flex items-center justify-center transition-colors hover:bg-slate-50" style={{ borderColor: P.border, color: P.textMid }}>
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Portfolio banner */}
              {currentPosition && lastPrice && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border p-5 mb-6 flex items-center justify-between flex-wrap gap-4" style={{ background: P.greenSoft, borderColor: `${P.green}25` }}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${P.green}15` }}>
                      <Briefcase size={16} style={{ color: P.green }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: P.text }}>Vous détenez cet actif</p>
                      <p className="text-[11px]" style={{ color: P.textMid }}>
                        {currentPosition.quantity} {currentPosition.quantity > 1 ? "actions" : "action"} · PRU {currentPosition.pru.toFixed(2)} {meta?.currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: P.textLight }}>Valeur actuelle</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: P.text }}>{(currentPosition.quantity * lastPrice).toFixed(2)} {meta?.currency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: P.textLight }}>Plus-value latente</p>
                      {(() => {
                        const pv = (lastPrice - currentPosition.pru) * currentPosition.quantity;
                        const pvPct = ((lastPrice - currentPosition.pru) / currentPosition.pru) * 100;
                        return <p className="text-sm font-bold tabular-nums" style={{ color: pv >= 0 ? P.green : P.red }}>{pv >= 0 ? "+" : ""}{pv.toFixed(2)} ({pvPct >= 0 ? "+" : ""}{pvPct.toFixed(1)}%)</p>;
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Add to portfolio modal */}
              <AnimatePresence>
                {showAddModal && selected && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }}
                    onClick={() => setShowAddModal(false)}>
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                      className="rounded-2xl border p-6 w-full max-w-sm shadow-xl" style={{ background: P.card, borderColor: P.border }}
                      onClick={e => e.stopPropagation()}>
                      {addSuccess ? (
                        <div className="flex flex-col items-center py-6 gap-3">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                            className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: P.greenSoft }}>
                            <Check size={24} style={{ color: P.green }} />
                          </motion.div>
                          <p className="text-sm font-semibold" style={{ color: P.green }}>Ajouté au portefeuille</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-semibold" style={{ color: P.text }}>Ajouter {selected.name}</h3>
                            <button onClick={() => setShowAddModal(false)}><X size={16} style={{ color: P.textMuted }} /></button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[11px] font-medium block mb-1.5" style={{ color: P.textMid }}>Quantité</label>
                              <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} min="0.01" step="any"
                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all" style={{ borderColor: P.border, color: P.text }} />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium block mb-1.5" style={{ color: P.textMid }}>Prix d&apos;achat (PRU)</label>
                              <input type="number" value={addPru} onChange={e => setAddPru(e.target.value)} min="0.01" step="any"
                                placeholder={lastPrice?.toFixed(2)}
                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all" style={{ borderColor: P.border, color: P.text }} />
                              <p className="text-[10px] mt-1" style={{ color: P.textLight }}>Prix actuel : {lastPrice?.toFixed(2)} {meta?.currency}</p>
                            </div>
                            {currentPosition && (
                              <div className="rounded-xl p-3 text-[11px]" style={{ background: P.amberSoft, color: P.amber }}>
                                Position existante : {currentPosition.quantity} actions à {currentPosition.pru.toFixed(2)}. Le PRU sera recalculé en moyenne pondérée.
                              </div>
                            )}
                            <button onClick={handleAdd} disabled={addSaving}
                              className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                              style={{ background: P.blue, color: "#fff", opacity: addSaving ? 0.6 : 1 }}>
                              {addSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                              {addSaving ? "Enregistrement…" : "Ajouter au portefeuille"}
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

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

                  {/* Layer signals with edu tips */}
                  {(["price_action", "technique", "volume", "structure", "fondamental"] as const).map(layerKey => {
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
                          {sigs.map((sig, i) => {
                            const tip = EDU_TIPS[sig.name];
                            const isOpen = expandedTip === sig.name;
                            return (
                              <motion.div key={sig.name} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold" style={{ color: P.text }}>{sig.name}</span>
                                    {tip && (
                                      <button onClick={() => setExpandedTip(isOpen ? null : sig.name)}
                                        className="h-4 w-4 rounded-full flex items-center justify-center transition-all"
                                        style={{ background: isOpen ? P.blue : P.cardAlt, color: isOpen ? "#fff" : P.textMuted }}>
                                        <HelpCircle size={10} />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg" style={{
                                    background: sig.verdict === "bullish" ? P.greenSoft : sig.verdict === "bearish" ? P.redSoft : P.cardAlt,
                                    color: sig.verdict === "bullish" ? P.green : sig.verdict === "bearish" ? P.red : P.textMid,
                                  }}>
                                    {sig.verdict === "bullish" ? "Haussier" : sig.verdict === "bearish" ? "Baissier" : "Neutre"}
                                  </span>
                                </div>
                                <p className="text-[12px] leading-relaxed" style={{ color: P.textLight }}>{sig.detail}</p>
                                <AnimatePresence>
                                  {isOpen && tip && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                                      className="overflow-hidden">
                                      <div className="mt-2 px-3 py-2.5 rounded-xl text-[11px] leading-relaxed border-l-2" style={{ background: P.blueSoft, borderColor: P.blue, color: P.textMid }}>
                                        <span className="font-semibold" style={{ color: P.blue }}>💡 </span>{tip}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Fundamentals card */}
                  {fundamentals && (
                    <div className="rounded-2xl border overflow-hidden" style={{ background: P.card, borderColor: P.border }}>
                      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ borderColor: P.borderLight }}>
                        <DollarSign size={13} style={{ color: P.green }} />
                        <span className="text-[12px] font-semibold" style={{ color: P.textMid }}>Données fondamentales</span>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {[
                            fundamentals.marketCap != null && { label: "Capitalisation", value: fundamentals.marketCap >= 1e12 ? `${(fundamentals.marketCap / 1e12).toFixed(2)}T` : fundamentals.marketCap >= 1e9 ? `${(fundamentals.marketCap / 1e9).toFixed(1)}B` : `${(fundamentals.marketCap / 1e6).toFixed(0)}M`, unit: meta?.currency },
                            fundamentals.pe != null && { label: "PER (P/E)", value: fundamentals.pe.toFixed(1), color: fundamentals.pe < 15 ? P.green : fundamentals.pe > 30 ? P.red : undefined },
                            fundamentals.forwardPe != null && { label: "PER Forward", value: fundamentals.forwardPe.toFixed(1) },
                            fundamentals.eps != null && { label: "BPA (EPS)", value: fundamentals.eps.toFixed(2), unit: meta?.currency },
                            fundamentals.dividendRate != null && { label: "Dividende", value: fundamentals.dividendRate.toFixed(2), unit: `${meta?.currency || ""}${fundamentals.dividendYield ? ` (${fundamentals.dividendYield}%)` : ""}` },
                            fundamentals.exDividendDate != null && { label: "Ex-dividende", value: fundamentals.exDividendDate },
                            fundamentals.payoutRatio != null && { label: "Payout ratio", value: `${fundamentals.payoutRatio}%`, color: fundamentals.payoutRatio > 80 ? P.red : fundamentals.payoutRatio > 60 ? P.amber : P.green },
                            fundamentals.profitMargin != null && { label: "Marge nette", value: `${fundamentals.profitMargin}%`, color: fundamentals.profitMargin > 15 ? P.green : fundamentals.profitMargin < 5 ? P.red : undefined },
                            fundamentals.debtToEquity != null && { label: "Dette / Equity", value: `${fundamentals.debtToEquity.toFixed(0)}%`, color: fundamentals.debtToEquity > 150 ? P.red : undefined },
                            fundamentals.revenueGrowth != null && { label: "Croissance CA", value: `${fundamentals.revenueGrowth > 0 ? "+" : ""}${fundamentals.revenueGrowth}%`, color: fundamentals.revenueGrowth > 0 ? P.green : P.red },
                            fundamentals.beta != null && { label: "Bêta", value: fundamentals.beta.toFixed(2) },
                            fundamentals.targetMeanPrice != null && lastPrice && { label: "Objectif analystes", value: `${fundamentals.targetMeanPrice.toFixed(2)}`, unit: `(${((fundamentals.targetMeanPrice - lastPrice) / lastPrice * 100) >= 0 ? "+" : ""}${((fundamentals.targetMeanPrice - lastPrice) / lastPrice * 100).toFixed(1)}%)`, color: fundamentals.targetMeanPrice > lastPrice ? P.green : P.red },
                          ].filter(Boolean).map((item, i) => {
                            const it = item as { label: string; value: string; unit?: string; color?: string };
                            return (
                              <div key={i} className="flex justify-between py-1.5 border-b" style={{ borderColor: P.borderLight }}>
                                <span className="text-[11px]" style={{ color: P.textLight }}>{it.label}</span>
                                <span className="text-[11px] font-semibold tabular-nums" style={{ color: it.color || P.text }}>
                                  {it.value} {it.unit && <span className="font-normal" style={{ color: P.textLight }}>{it.unit}</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {fundamentals.sector && (
                          <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: P.borderLight }}>
                            {fundamentals.sector && <span className="text-[10px] px-2.5 py-1 rounded-lg" style={{ background: P.cardAlt, color: P.textMid }}>{fundamentals.sector}</span>}
                            {fundamentals.industry && <span className="text-[10px] px-2.5 py-1 rounded-lg" style={{ background: P.cardAlt, color: P.textLight }}>{fundamentals.industry}</span>}
                            {fundamentals.recommendationKey && <span className="text-[10px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: fundamentals.recommendationKey === "buy" || fundamentals.recommendationKey === "strong_buy" ? P.greenSoft : fundamentals.recommendationKey === "sell" ? P.redSoft : P.amberSoft, color: fundamentals.recommendationKey === "buy" || fundamentals.recommendationKey === "strong_buy" ? P.green : fundamentals.recommendationKey === "sell" ? P.red : P.amber }}>{fundamentals.recommendationKey === "strong_buy" ? "Achat fort" : fundamentals.recommendationKey === "buy" ? "Achat" : fundamentals.recommendationKey === "hold" ? "Conserver" : fundamentals.recommendationKey === "sell" ? "Vente" : fundamentals.recommendationKey}{fundamentals.numberOfAnalysts ? ` (${fundamentals.numberOfAnalysts} analystes)` : ""}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
              <Link href="/analyses/guide"
                className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: P.blue }}>
                <BookOpen size={15} />
                Comprendre les indicateurs techniques
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}