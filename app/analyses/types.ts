// ═══════════════════════════════════════════════════════════════
// NEXUS STOCKS — Shared Types
// ═══════════════════════════════════════════════════════════════

export interface StockInfo {
  name: string;
  ticker: string;
  country: string;
  sector: string;
}

export interface OHLCV {
  time: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface TechResult {
  rsi: number[];
  stochRsi: { k: number[]; d: number[] };
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bb: { upper: number[]; middle: number[]; lower: number[] };
  ma20: number[];
  ma50: number[];
  ma200: number[];
  obv: number[];
  atr: number[];
  ichimoku: { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[] };
  fibonacci: { levels: { label: string; price: number }[] };
  supports: number[];
  resistances: number[];
}

export interface LayerSignal {
  layer: "price_action" | "technique" | "volume" | "structure" | "fondamental";
  name: string;
  verdict: "bullish" | "bearish" | "neutral";
  confidence: number;
  detail: string;
}

export interface Confluence {
  score: number;
  action: "OPPORTUNITÉ" | "ATTENDRE" | "RISQUÉ";
  layers: LayerSignal[];
  bullCount: number;
  bearCount: number;
  summary: string;
  entryZone: { min: number; max: number };
  stopLoss: number;
  targets: number[];
  riskReward: number;
}

export interface Fundamentals {
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  eps: number | null;
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

export interface PortfolioPosition {
  ticker: string;
  name: string;
  quantity: number;
  pru: number;
  addedAt: string;
}

export interface ScanResult {
  stock: StockInfo;
  score: number;
  action: string;
  price: number;
  change: number;
}

export interface Meta {
  name: string;
  currency: string;
  curr: number;
  prev: number;
  change: number;
  pct: number;
}

// ── 3 Visual Scores (revolutionary stock card) ──
export interface HealthScore {
  score: number; // 0-100
  label: string;
  details: { name: string; value: string; verdict: "good" | "warning" | "bad" | "neutral" }[];
}

export interface ValuationScore {
  score: number;
  label: string;
  details: { name: string; value: string; verdict: "good" | "warning" | "bad" | "neutral" }[];
}

export interface MomentumScore {
  score: number;
  label: string;
  details: { name: string; value: string; verdict: "good" | "warning" | "bad" | "neutral" }[];
}

// ── Collections ──
export interface Collection {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tickers: string[];
  gradient: string;
}

// ── Investor Profile ──
export type RiskLevel = "conservateur" | "equilibre" | "dynamique" | "agressif";
export type Horizon = "court" | "moyen" | "long";
export type ExpertiseLevel = "debutant" | "initie" | "expert";

export interface InvestorProfile {
  risk: RiskLevel;
  horizon: Horizon;
  level: ExpertiseLevel;
  excludedSectors: string[];
  createdAt: string;
}