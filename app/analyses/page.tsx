"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, Loader2, X, TrendingUp, TrendingDown,
  Activity, Layers, BarChart3, BookOpen, Globe, DollarSign,
  Plus, Briefcase, ScanLine, Check, Download, FileText,
  Zap, Heart, Scale, Gauge, Sparkles, ArrowUpRight, Maximize2,
  ChevronRight, AlignLeft, Target, PieChart, TrendingUp as TrendingUpIcon,
  PiggyBank
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, CartesianGrid, BarChart as RBarChart, Area, AreaChart,
  PieChart as RechartsPieChart, Pie, Cell as PieCell
} from "recharts";

import { T, glass, scoreColor, scoreGlow, scoreBg, scoreLabel, FONT_MONO, FONT_DISPLAY, FONT_BODY } from "./theme";
import type { StockInfo, OHLCV, TechResult, Confluence, Fundamentals, PortfolioPosition, ScanResult, Meta, HealthScore, ValuationScore, MomentumScore, InvestorProfile } from "./types";
import { computeAll, analyzeConfluence, computeHealthScore, computeValuationScore, computeMomentumScore, COLLECTIONS } from "./engine";
import { STOCKS, searchStocks, SCAN_UNIVERSES, fetchChart, fetchMeta, fetchFundamentals, fetchYahooSearch, loadPortfolio, addToPortfolio } from "./api";
import type { YahooResult } from "./api";
import { exportFullPDF, exportSummaryPDF, exportStrategyPDF } from "./generateReport"; // CORRIGÉ : L'import inclut bien exportStrategyPDF
import ScoreRing from "./components/ScoreRing";
import SignalRow from "./components/SignalRow";
import TradePlanVisual from "./components/TradePlanVisual";
import InvestorProfileManager from "./components/InvestorProfile";

// CORRECTION : Ajout des accolades pour importer le composant nommé
import { NexusLogo } from "@/components/NexusLogo";

// ═══════════════════════════════════════════════════════════════
// STYLES & CONFIG
// ═══════════════════════════════════════════════════════════════

const premiumCard = {
  background: T.cardSolid,
  border: `1px solid ${T.borderMid}`,
  borderRadius: "1.5rem",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
};

const PIE_COLORS = [T.cyan, T.violet, T.blue, T.green, T.amber, T.red];

const VIEW_PERIODS = [
  { l: "1S", v: "5d", i: "1d" }, { l: "1M", v: "1mo", i: "1d" }, { l: "3M", v: "3mo", i: "1d" },
  { l: "6M", v: "6mo", i: "1d" }, { l: "1A", v: "1y", i: "1wk" }, { l: "2A", v: "2y", i: "1wk" },
];
const ANALYSIS_PERIOD = { v: "6mo", i: "1d" };
type Overlay = "ma" | "bollinger" | "ichimoku";

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number> }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-2xl px-4 py-3 text-xs shadow-2xl" style={{ ...glass, borderColor: T.borderMid }}>
      <p className="font-bold mb-2 text-[10px] uppercase tracking-wider" style={{ color: T.textSub }}>{d.label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex justify-between gap-4"><span style={{ color: T.textDim }}>Ouverture</span><span className="font-mono font-medium" style={{ color: T.text }}>{d.open?.toFixed(2)}</span></div>
        <div className="flex justify-between gap-4"><span style={{ color: T.textDim }}>Haut</span><span className="font-mono font-medium" style={{ color: T.green }}>{d.high?.toFixed(2)}</span></div>
        <div className="flex justify-between gap-4"><span style={{ color: T.textDim }}>Bas</span><span className="font-mono font-medium" style={{ color: T.red }}>{d.low?.toFixed(2)}</span></div>
        <div className="flex justify-between gap-4"><span style={{ color: T.textDim }}>Clôture</span><span className="font-mono font-bold" style={{ color: T.cyan }}>{d.close?.toFixed(2)}</span></div>
      </div>
    </div>
  );
}

// Custom Tooltip for Strategy Chart
function StratChartTip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-2xl px-4 py-3 text-xs shadow-2xl" style={{ ...glass, borderColor: T.borderMid }}>
      <p className="font-bold mb-2 text-[10px] uppercase tracking-wider" style={{ color: T.textSub }}>{data.year}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6"><span style={{ color: T.cyan }} className="font-bold">Capital total</span><span className="font-mono font-bold" style={{ color: T.text }}>{data.total.toFixed(0)} €</span></div>
        <div className="flex justify-between gap-6"><span style={{ color: T.textDim }}>Montant investi</span><span className="font-mono" style={{ color: T.textSub }}>{data.investi.toFixed(0)} €</span></div>
        <div className="flex justify-between gap-6 border-t pt-1.5 mt-1.5" style={{ borderColor: T.borderMid }}><span style={{ color: T.green }}>Plus-value</span><span className="font-mono font-bold" style={{ color: T.green }}>{data.plusValue.toFixed(0)} €</span></div>
      </div>
    </div>
  );
}

async function quickScore(ticker: string) {
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

function formatLargeNumber(num: number | null | undefined) {
  if (!num) return "—";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + " T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + " Md";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + " M";
  return num.toLocaleString();
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function NexusStocksPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockInfo[]>([]);
  const [yahooResults, setYahooResults] = useState<YahooResult[]>([]);
  const [yahooLoading, setYahooLoading] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [selected, setSelected] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<OHLCV[]>([]);
  const [viewData, setViewData] = useState<OHLCV[]>([]);
  const [tech, setTech] = useState<TechResult | null>(null);
  const [confluence, setConfluence] = useState<Confluence | null>(null);
  const [viewPeriod, setViewPeriod] = useState(VIEW_PERIODS[3]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"signals" | "fundamentals">("signals");
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [valuationScore, setValuationScore] = useState<ValuationScore | null>(null);
  const [momentumScore, setMomentumScore] = useState<MomentumScore | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQty, setAddQty] = useState("1");
  const [addPru, setAddPru] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  
  // Navigation States
  const [showScanner, setShowScanner] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  
  // Scanner States
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanUniverse, setScanUniverse] = useState("cac40");
  const [scanProgress, setScanProgress] = useState(0); 
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [expandedChart, setExpandedChart] = useState<"rsi" | "macd" | "volume" | null>(null);

  // Strategy Builder States
  const [stratAmount, setStratAmount] = useState<number>(10000);
  const [stratDca, setStratDca] = useState<number>(250); // Apport mensuel
  const [stratYears, setStratYears] = useState<number>(10);
  const [stratYield, setStratYield] = useState<number>(8);
  const [stratRisk, setStratRisk] = useState<string>("equilibre");
  const [stratPlan, setStratPlan] = useState<Array<{stock: StockInfo, weight: number, amount: number, score: number, divYield?: number, entryMin?: number, entryMax?: number}>>([]);
  const [stratDivYield, setStratDivYield] = useState<number>(0); // Dividende moyen
  const [isGeneratingStrat, setIsGeneratingStrat] = useState(false);
  const [stratProgress, setStratProgress] = useState(0); 
  const [currentScanTicker, setCurrentScanTicker] = useState("");

  useEffect(() => { loadPortfolio().then(setPortfolio); }, []);

  const currentPosition = useMemo(() => selected ? portfolio.find(p => p.ticker === selected.ticker) || null : null, [selected, portfolio]);

  useEffect(() => {
    if (query.length >= 2) {
      setSuggestions(searchStocks(query)); setShowSugg(true); setYahooLoading(true);
      const t = setTimeout(async () => { setYahooResults(await fetchYahooSearch(query)); setYahooLoading(false); }, 350);
      return () => { clearTimeout(t); setYahooLoading(false); };
    } else { setSuggestions([]); setYahooResults([]); setShowSugg(false); }
  }, [query]);

  const analyze = useCallback(async (stock: StockInfo) => {
    setLoading(true); setError(null); setShowSugg(false); setFundamentals(null); setActiveSubTab("signals");
    setShowScanner(false); setShowStrategy(false);
    try {
      const [data6mo, m] = await Promise.all([fetchChart(stock.ticker, ANALYSIS_PERIOD.v, ANALYSIS_PERIOD.i), fetchMeta(stock.ticker)]);
      const currentPrice = m?.curr || (data6mo.length > 0 ? data6mo[data6mo.length - 1].close : 100);
      const fund = await fetchFundamentals(stock.ticker); 
      
      const tr = computeAll(data6mo); 
      const conf = analyzeConfluence(data6mo, tr, fund);
      
      setAnalysisData(data6mo); setViewData(data6mo); setTech(tr); setConfluence(conf); setMeta(m); setFundamentals(fund); setViewPeriod(VIEW_PERIODS[3]);
      setHealthScore(computeHealthScore(fund)); setValuationScore(computeValuationScore(fund, currentPrice)); setMomentumScore(computeMomentumScore(tr, data6mo));
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur."); } finally { setLoading(false); }
  }, []);

  const changeView = useCallback(async (per: typeof VIEW_PERIODS[0]) => {
    if (!selected) return; setViewPeriod(per);
    if (per.v === ANALYSIS_PERIOD.v) { setViewData(analysisData); return; }
    try { setViewData(await fetchChart(selected.ticker, per.v, per.i)); } catch { }
  }, [selected, analysisData]);

  const pickStock = (s: StockInfo) => { 
    setSelected(s); 
    setQuery(""); 
    setYahooResults([]); 
    setShowSugg(false); 
    analyze(s); 
  };
  
  const pickYahoo = (r: YahooResult) => { 
    const s: StockInfo = { name: r.longname || r.shortname || r.symbol, ticker: r.symbol, country: r.exchDisp || "—", sector: r.typeDisp || "—" }; 
    pickStock(s); 
  };
  
  const clear = () => { 
    setSelected(null); setQuery(""); setAnalysisData([]); setViewData([]); 
    setTech(null); setConfluence(null); setMeta(null); setError(null); 
    setFundamentals(null); setHealthScore(null); setValuationScore(null); 
    setMomentumScore(null); setShowScanner(false); setShowStrategy(false);
  };
  
  const toggleOverlay = (o: Overlay) => setOverlays(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o]);
  const lastPrice = meta?.curr ?? (analysisData.length ? analysisData[analysisData.length - 1].close : null);

  const handleAdd = async () => {
    if (!selected || !lastPrice) return; setAddSaving(true);
    const ok = await addToPortfolio(selected.ticker, selected.name, parseFloat(addQty) || 1, parseFloat(addPru) || lastPrice, selected.sector === "Crypto" ? "Crypto" : "Bourse");
    if (ok) { setAddSuccess(true); setPortfolio(await loadPortfolio()); setTimeout(() => { setShowAddModal(false); setAddSuccess(false); }, 1200); }
    setAddSaving(false);
  };

  const handleScan = async (overrideUniverse?: string) => {
    const targetUniverse = typeof overrideUniverse === 'string' ? overrideUniverse : scanUniverse;
    setScanUniverse(targetUniverse);

    const uni = SCAN_UNIVERSES.find(u => u.key === targetUniverse);
    const col = COLLECTIONS.find(c => c.id === targetUniverse);
    const tickers = uni?.tickers || col?.tickers || [];
    if (!tickers.length) return;
    
    setScanning(true); setScanResults([]); setScanProgress(0); setShowScanner(true); setShowStrategy(false); setSelected(null);
    
    const results: ScanResult[] = [];
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const stock = STOCKS.find(s => s.ticker === ticker) || { name: ticker, ticker, country: "—", sector: "—" };
      setScanProgress(Math.round(((i + 1) / tickers.length) * 100));
      const res = await quickScore(ticker);
      if (res) results.push({ stock, score: res.score, action: res.score >= 65 ? "OPPORTUNITÉ" : res.score <= 35 ? "RISQUÉ" : "ATTENDRE", price: res.price, change: res.change });
    }
    results.sort((a, b) => b.score - a.score);
    setScanResults(results); setScanning(false);
  };

  const generatePlan = async () => {
    setIsGeneratingStrat(true);
    setStratProgress(0);
    setStratPlan([]);
    setStratDivYield(0);

    const safeSectors = ["Santé", "Assurance", "Alimentation", "Énergie", "Finance", "Construction"];
    const growthSectors = ["Technologie", "Logiciel", "Semi-conducteurs", "Luxe", "Cosmétiques", "Aéronautique"];
    
    let targetSafeW = 0, targetGrowthW = 0, targetRiskW = 0;
    if (stratRisk === "conservateur") { targetSafeW = 0.7; targetGrowthW = 0.3; }
    else if (stratRisk === "equilibre") { targetSafeW = 0.4; targetGrowthW = 0.5; targetRiskW = 0.1; }
    else { targetSafeW = 0.15; targetGrowthW = 0.55; targetRiskW = 0.3; }

    const safePool = STOCKS.filter(s => safeSectors.includes(s.sector) || s.ticker === "AI.PA");
    const growthPool = STOCKS.filter(s => growthSectors.includes(s.sector));
    const riskPool = STOCKS.filter(s => ["Crypto"].includes(s.sector));

    const poolToScan = [
      ...safePool.slice(0, 5), 
      ...growthPool.slice(0, 6),
      ...(targetRiskW > 0 ? riskPool : [])
    ];

    const scoredAssets: Array<{stock: StockInfo, score: number}> = [];
    
    for (let i = 0; i < poolToScan.length; i++) {
       setCurrentScanTicker(poolToScan[i].ticker);
       const res = await quickScore(poolToScan[i].ticker);
       if (res) { 
          scoredAssets.push({ stock: poolToScan[i], score: res.score });
       }
       setStratProgress(Math.round(((i + 1) / poolToScan.length) * 100));
    }

    const finalPlan: Array<{stock: StockInfo, weight: number, amount: number, score: number, divYield?: number, entryMin?: number, entryMax?: number}> = [];
    
    const allocate = (poolArr: typeof scoredAssets, weight: number, maxAssets: number) => {
      const best = poolArr.sort((a,b) => b.score - a.score).slice(0, maxAssets);
      if(best.length === 0) return;
      const wPerAsset = weight / best.length;
      best.forEach(b => finalPlan.push({ stock: b.stock, weight: wPerAsset, amount: stratAmount * wPerAsset, score: b.score }));
    };

    allocate(scoredAssets.filter(a => safeSectors.includes(a.stock.sector) || a.stock.ticker === "AI.PA"), targetSafeW, targetSafeW >= 0.4 ? 4 : 2);
    allocate(scoredAssets.filter(a => growthSectors.includes(a.stock.sector)), targetGrowthW, targetGrowthW >= 0.4 ? 4 : 2);
    if(targetRiskW > 0) allocate(scoredAssets.filter(a => a.stock.sector === "Crypto"), targetRiskW, 2);

    const totalW = finalPlan.reduce((acc, curr) => acc + curr.weight, 0);
    let avgDiv = 0;

    if (totalW > 0) {
      for (let i = 0; i < finalPlan.length; i++) {
        finalPlan[i].weight = finalPlan[i].weight / totalW;
        finalPlan[i].amount = stratAmount * finalPlan[i].weight;
        
        setCurrentScanTicker(`Niveaux: ${finalPlan[i].stock.ticker}`);
        const [fund, ohlcv] = await Promise.all([
          fetchFundamentals(finalPlan[i].stock.ticker),
          fetchChart(finalPlan[i].stock.ticker, ANALYSIS_PERIOD.v, ANALYSIS_PERIOD.i)
        ]);
        
        const yld = fund?.dividendYield || 0;
        finalPlan[i].divYield = yld;
        avgDiv += yld * finalPlan[i].weight;

        if(ohlcv.length > 0) {
          const lastC = ohlcv[ohlcv.length - 1].close;
          finalPlan[i].entryMin = lastC * 0.985; 
          finalPlan[i].entryMax = lastC * 1.005; 
        }
      }
    }

    setStratDivYield(avgDiv);
    setStratPlan(finalPlan.sort((a,b) => b.weight - a.weight));
    setIsGeneratingStrat(false);
  };

  const projectionData = useMemo(() => {
    const data = [];
    const r = stratYield / 100;
    const n = 12; 
    const pmt = stratDca; 
    
    for(let y = 0; y <= stratYears; y++) {
      const months = y * 12;
      const compoundPrincipal = stratAmount * Math.pow(1 + r/n, months);
      const compoundDCA = pmt * ((Math.pow(1 + r/n, months) - 1) / (r/n));
      const totalValue = compoundPrincipal + compoundDCA;
      
      const totalInvested = stratAmount + (pmt * months);
      
      data.push({
        year: y === 0 ? "Aujourd'hui" : `Année ${y}`,
        total: totalValue,
        investi: totalInvested,
        plusValue: totalValue - totalInvested
      });
    }
    return data;
  }, [stratAmount, stratYears, stratYield, stratDca]);

  const expectedFutureValue = projectionData[projectionData.length - 1]?.total || 0;
  const expectedTotalInvested = projectionData[projectionData.length - 1]?.investi || 0;

  const pieClassData = useMemo(() => {
    let crypto = 0, bourse = 0;
    stratPlan.forEach(p => p.stock.sector === "Crypto" ? crypto += p.weight : bourse += p.weight);
    return [ { name: "Bourse", value: bourse * 100 }, { name: "Crypto", value: crypto * 100 } ].filter(d => d.value > 0);
  }, [stratPlan]);

  const pieSectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    stratPlan.forEach(p => { sectors[p.stock.sector] = (sectors[p.stock.sector] || 0) + (p.weight * 100); });
    return Object.entries(sectors).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [stratPlan]);

  const chartData = useMemo(() => {
    if (!viewData.length) return [];
    const tf = viewData === analysisData && tech ? tech : computeAll(viewData);
    const vis = viewData.slice(-120); const off = viewData.length - vis.length;
    return vis.map((c, i) => {
      const g = i + off; const d = new Date(c.time * 1000);
      return { label: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, up: c.close >= c.open, ma20: tf.ma20[g], ma50: tf.ma50[g], bbU: tf.bb.upper[g], bbL: tf.bb.lower[g], tenkan: tf.ichimoku.tenkan[g], kijun: tf.ichimoku.kijun[g], rsi: tf.rsi[g], macdLine: tf.macd.macd[g], macdSig: tf.macd.signal[g], macdHist: tf.macd.histogram[g] };
    });
  }, [viewData, analysisData, tech]);

  const prices = chartData.flatMap(d => [d.high, d.low].filter(v => !isNaN(v)));
  const pMin = prices.length ? Math.min(...prices) * 0.997 : 0;
  const pMax = prices.length ? Math.max(...prices) * 1.003 : 1;
  const tickN = Math.max(1, Math.floor(chartData.length / 6));

  const isTrendUp = meta ? meta.pct >= 0 : true;
  const chartColor = isTrendUp ? T.green : T.red;

  const handleExportStrategy = () => {
    exportStrategyPDF({
      amount: stratAmount,
      dca: stratDca,
      years: stratYears,
      yield: stratYield,
      risk: stratRisk,
      divYield: stratDivYield,
      plan: stratPlan
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: T.bg, color: T.text, fontFamily: FONT_BODY }}>
      
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none opacity-40 mix-blend-screen" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(0,0,0,0) 70%)" }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] pointer-events-none opacity-30 mix-blend-screen" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(0,0,0,0) 70%)" }} />

      <Sidebar />
      <main className="md:ml-64 px-4 pt-6 pb-20 md:px-8 relative z-10 min-h-screen flex flex-col">
        <div className="max-w-[1440px] mx-auto w-full flex-1 space-y-6">

          {/* ══ HEADER ══ */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 cursor-pointer" onClick={clear}>
              <div className="w-10 h-10 overflow-hidden">
                 <NexusLogo />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>
                  Nexus
                </h1>
                <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: T.green }} /><span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: T.textDim }}>Market Live</span></div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <InvestorProfileManager onProfileLoaded={(p) => {
                 setInvestorProfile(p);
                 if(p) {
                   setStratRisk(p.risk);
                   setStratYears(p.horizon === "court" ? 2 : p.horizon === "moyen" ? 5 : 10);
                   setStratYield(p.risk === "conservateur" ? 4 : p.risk === "equilibre" ? 8 : 12);
                 }
              }} />
              
              <button onClick={() => { setShowStrategy(true); setShowScanner(false); setSelected(null); }}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all"
                style={{ background: showStrategy ? T.blueBg : T.card, border: `1px solid ${showStrategy ? T.borderFocus : T.border}`, color: showStrategy ? T.cyan : T.textSub }}>
                <PieChart size={14} /> <span className="hidden md:inline">Stratégie</span>
              </button>

              <button onClick={() => { setShowScanner(true); setShowStrategy(false); setSelected(null); }}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all"
                style={{ background: showScanner ? T.blueBg : T.card, border: `1px solid ${showScanner ? T.borderFocus : T.border}`, color: showScanner ? T.cyan : T.textSub }}>
                <ScanLine size={14} /> <span className="hidden md:inline">Scanner</span>
              </button>
              
              <Link href="/analyses/guide" className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-colors hover:bg-white/5" style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textSub }}>
                <BookOpen size={14} /> <span className="hidden md:inline">Guide</span>
              </Link>
            </div>
          </div>

          {/* ══ GLOBAL SEARCH ══ */}
          <div className="relative z-50">
            <div className="flex items-center gap-3 px-5 py-4 rounded-3xl transition-all duration-300 shadow-xl" style={{ ...glass, background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
              <Search size={18} style={{ color: T.textSub }} />
              <input 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onFocus={() => query.length >= 2 && setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 200)}
                placeholder="Rechercher une action, crypto, ETF..." 
                className="flex-1 bg-transparent text-sm md:text-base outline-none font-medium placeholder:text-gray-600" 
                style={{ color: T.text }} 
              />
              {query && <button onClick={clear} className="p-1 rounded-full hover:bg-white/10 transition"><X size={16} style={{ color: T.textDim }} /></button>}
            </div>
            <AnimatePresence>
              {showSugg && (suggestions.length > 0 || yahooResults.length > 0 || yahooLoading) && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full mt-3 left-0 right-0 rounded-3xl overflow-hidden max-h-[400px] overflow-y-auto shadow-2xl" style={{ ...glass, background: T.elevated, border: `1px solid ${T.borderMid}` }}>
                  {suggestions.map((s, i) => (
                    <button key={s.ticker} onMouseDown={(e) => { e.preventDefault(); pickStock(s); }} className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5" style={{ borderBottom: i === suggestions.length - 1 && yahooResults.length === 0 ? 'none' : `1px solid ${T.border}` }}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-inner" style={{ background: T.cardHover, border: `1px solid ${T.border}` }}><span className="text-sm font-black" style={{ color: T.cyan }}>{s.name[0]}</span></div>
                        <div><span className="text-sm font-bold block mb-0.5" style={{ color: T.text }}>{s.name}</span><span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: T.textSub }}>{s.ticker}</span></div>
                      </div>
                      <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ background: T.card, color: T.textDim, border: `1px solid ${T.border}` }}>{s.sector}</span>
                    </button>
                  ))}
                  {yahooResults.filter(r => !suggestions.some(s => s.ticker === r.symbol)).map(r => (
                    <button key={r.symbol} onMouseDown={(e) => { e.preventDefault(); pickYahoo(r); }} className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-inner" style={{ background: T.violetBg, border: `1px solid rgba(139, 92, 246, 0.2)` }}><Globe size={16} style={{ color: T.violet }} /></div>
                        <div><span className="text-sm font-bold block mb-0.5" style={{ color: T.text }}>{r.longname || r.shortname}</span><span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: T.textSub }}>{r.symbol}</span></div>
                      </div>
                      <span className="text-[10px] text-right" style={{ color: T.textDim }}>{r.exchDisp}</span>
                    </button>
                  ))}
                  {yahooLoading && <div className="px-5 py-6 flex flex-col items-center justify-center gap-3"><Loader2 size={20} className="animate-spin" style={{ color: T.cyan }} /><span className="text-xs font-medium" style={{ color: T.textSub }}>Recherche mondiale...</span></div>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ══ SCANNER VIEW ══ */}
          {showScanner && !selected && !showStrategy && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-4 pb-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg shadow-cyan-500/20" style={{ background: T.gradPrimary }}>
                   <ScanLine size={24} color="white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>Scanner de Marché</h2>
                  <p className="text-sm font-medium mt-1" style={{ color: T.textSub }}>Identifiez instantanément les meilleures opportunités selon notre algorithme quantique.</p>
                </div>
              </div>

              <div className="p-6 rounded-3xl flex flex-col md:flex-row gap-4 items-end" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                 <div className="flex-1 w-full">
                   <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3" style={{color: T.textDim}}><Globe size={14}/> Univers d'investissement</label>
                   <select value={scanUniverse} onChange={e => setScanUniverse(e.target.value)} className="w-full bg-transparent text-lg font-bold outline-none cursor-pointer" style={{color: T.text}}>
                      <optgroup label="Indices" className="bg-[#0e0e1a]">
                        {SCAN_UNIVERSES.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                      </optgroup>
                      <optgroup label="Collections Thématiques" className="bg-[#0e0e1a]">
                        {COLLECTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                   </select>
                 </div>
                 <button onClick={() => handleScan()} disabled={scanning} className="w-full md:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-transform hover:scale-[1.02] shadow-xl shadow-cyan-500/10 flex justify-center items-center gap-3 shrink-0" style={{ background: T.gradPrimary, color: "#fff", opacity: scanning ? 0.8 : 1 }}>
                   {scanning ? <><Loader2 size={18} className="animate-spin" /> {scanProgress}%</> : <><Search size={18} /> Lancer l'analyse</>}
                 </button>
              </div>

              {!scanning && scanResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black" style={{ color: T.text }}>Résultats du scan</h3>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: T.greenBg, color: T.green }}>{scanResults.length} actifs analysés</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scanResults.map((res, i) => (
                      <div key={i} onClick={() => pickStock(res.stock)} className="relative p-6 rounded-3xl flex flex-col justify-between group transition-all hover:scale-[1.02] cursor-pointer shadow-lg" style={premiumCard}>
                         <div className="flex justify-between items-start mb-6">
                           <div>
                             <div className="flex items-center gap-3 mb-2">
                               <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: T.cardHover, color: T.cyan, border: `1px solid ${T.border}` }}>
                                 {res.stock.name.substring(0,2).toUpperCase()}
                               </div>
                               <div>
                                 <h4 className="text-sm font-black" style={{color: T.text}}>{res.stock.name}</h4>
                                 <span className="text-[9px] font-mono px-2 py-0.5 rounded-md mt-1 inline-block" style={{background: T.elevated, color: T.textSub}}>{res.stock.ticker}</span>
                               </div>
                             </div>
                           </div>
                           <div className="text-right">
                             <ScoreRing score={res.score} size={40} thickness={3} />
                           </div>
                         </div>
                         
                         <div className="flex items-end justify-between border-t pt-4" style={{ borderColor: T.borderMid }}>
                           <div>
                             <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{color: T.textDim}}>{res.stock.sector}</p>
                             <p className="text-[10px] font-black" style={{color: scoreColor(res.score)}}>{res.action}</p>
                           </div>
                           <div className="text-right">
                             <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{color: T.textDim}}>Prix actuel</p>
                             <p className="text-sm font-black font-mono flex items-center gap-1 justify-end" style={{color: T.text}}>
                                {res.price.toFixed(2)}
                                <span className="text-[10px] font-bold ml-1" style={{color: res.change >= 0 ? T.green : T.red}}>
                                  {res.change >= 0 ? "+" : ""}{res.change.toFixed(2)}%
                                </span>
                             </p>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ STRATEGY BUILDER VIEW (Avec DCA, Projection & Export) ══ */}
          {showStrategy && !selected && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-4 pb-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg shadow-cyan-500/20" style={{ background: T.gradPrimary }}>
                   <PieChart size={24} color="white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>Architecte de Stratégie</h2>
                  <p className="text-sm font-medium mt-1" style={{ color: T.textSub }}>Diversifiez avec un DCA planifié et notre algorithme quantique en temps réel.</p>
                </div>
              </div>

              {/* Form Controls - Passé en 5 colonnes */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-5 rounded-3xl transition-colors hover:bg-white/5" style={premiumCard}>
                   <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3" style={{color: T.textDim}}><DollarSign size={14}/> Capital initial (€)</label>
                   <input type="number" value={stratAmount} onChange={e => setStratAmount(Number(e.target.value))} className="w-full bg-transparent text-2xl font-black font-mono outline-none focus:text-cyan-400 transition-colors" style={{color: T.text}} />
                </div>
                <div className="p-5 rounded-3xl transition-colors hover:bg-white/5" style={{...premiumCard, border: `1px solid ${T.cyan}40`}}>
                   <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3" style={{color: T.cyan}}><PiggyBank size={14}/> Apport / Mois (DCA)</label>
                   <input type="number" value={stratDca} onChange={e => setStratDca(Number(e.target.value))} className="w-full bg-transparent text-2xl font-black font-mono outline-none focus:text-cyan-400 transition-colors" style={{color: T.text}} />
                </div>
                <div className="p-5 rounded-3xl transition-colors hover:bg-white/5" style={premiumCard}>
                   <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3" style={{color: T.textDim}}><Activity size={14}/> Horizon (Années)</label>
                   <input type="number" value={stratYears} onChange={e => setStratYears(Number(e.target.value))} className="w-full bg-transparent text-2xl font-black font-mono outline-none focus:text-cyan-400 transition-colors" style={{color: T.text}} />
                </div>
                <div className="p-5 rounded-3xl transition-colors hover:bg-white/5" style={premiumCard}>
                   <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3" style={{color: T.textDim}}><TrendingUpIcon size={14}/> Rendement espéré (%)</label>
                   <input type="number" value={stratYield} onChange={e => setStratYield(Number(e.target.value))} className="w-full bg-transparent text-2xl font-black font-mono outline-none focus:text-cyan-400 transition-colors" style={{color: T.text}} />
                </div>
                <div className="p-5 rounded-3xl transition-colors hover:bg-white/5" style={premiumCard}>
                   <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3" style={{color: T.textDim}}><Target size={14}/> Profil de risque</label>
                   <select value={stratRisk} onChange={e => setStratRisk(e.target.value)} className="w-full bg-transparent text-lg font-bold outline-none cursor-pointer mt-1" style={{color: T.text}}>
                      <option value="conservateur" className="bg-[#0e0e1a]">Conservateur</option>
                      <option value="equilibre" className="bg-[#0e0e1a]">Équilibré</option>
                      <option value="dynamique" className="bg-[#0e0e1a]">Dynamique</option>
                   </select>
                </div>
              </div>

              {/* Simulation Chart & Result */}
              <div className="p-6 md:p-8 rounded-3xl flex flex-col gap-8 shadow-xl" style={{ background: T.elevated, border: `1px solid ${T.borderMid}` }}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                     <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{color: T.cyan}}>Projection de l'investissement à {stratYears} ans</p>
                     <p className="text-sm font-medium leading-relaxed max-w-xl" style={{color: T.textSub}}>
                        En plaçant <strong>{stratAmount}€</strong> aujourd'hui, plus <strong>{stratDca}€</strong> chaque mois, avec un rendement estimé de <strong>{stratYield}%/an</strong>, voici l'évolution de votre capital (intérêts composés inclus).
                     </p>
                  </div>
                  <div className="text-left md:text-right shrink-0 p-4 rounded-2xl" style={{background: T.bgSub}}>
                     <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color: T.textDim}}>Capital projeté</p>
                     <p className="text-4xl font-black font-mono tracking-tighter" style={{color: T.green}}>{expectedFutureValue.toFixed(0)} €</p>
                     <p className="text-xs font-bold mt-1" style={{color: T.cyan}}>+{(expectedFutureValue - expectedTotalInvested).toFixed(0)} € générés</p>
                  </div>
                </div>

                {/* Graphique de projection AreaChart */}
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={projectionData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.cyan} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={T.cyan} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.borderMid} vertical={false} />
                      <XAxis dataKey="year" tick={{fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} tick={{fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO}} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip content={<StratChartTip />} cursor={{ stroke: T.borderMid, strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="total" stroke={T.cyan} strokeWidth={3} fill="url(#colorTotal)" activeDot={{ r: 6, fill: T.cyan, stroke: T.bg, strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="investi" stroke={T.textDim} strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <button onClick={generatePlan} disabled={isGeneratingStrat} className="w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-transform hover:scale-[1.01] shadow-xl shadow-cyan-500/10 flex justify-center items-center gap-3 relative overflow-hidden" style={{ background: T.gradPrimary, color: "#fff", opacity: isGeneratingStrat ? 0.9 : 1 }}>
                 {isGeneratingStrat ? (
                   <div className="flex flex-col items-center">
                     <div className="flex items-center gap-2 relative z-10">
                       <Loader2 size={16} className="animate-spin" />
                       <span>Scan institutionnel en cours... {stratProgress}%</span>
                     </div>
                     <span className="text-[9px] font-mono text-cyan-300 mt-1 relative z-10">{currentScanTicker}</span>
                     <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300" style={{ width: `${stratProgress}%` }} />
                   </div>
                 ) : (
                   <><Sparkles size={18} /> Générer ma répartition stratégique</>
                 )}
              </button>

              {/* Generated Plan with Pie Charts & Export button */}
              {!isGeneratingStrat && stratPlan.length > 0 && (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mt-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black" style={{ color: T.text }}>Votre allocation recommandée</h3>
                      <div className="flex gap-2">
                        {stratDivYield > 0 && (
                          <span className="text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-2" style={{ background: T.amberBg, color: T.amber }}><DollarSign size={14}/> Div. moyen: {stratDivYield.toFixed(2)}%</span>
                        )}
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-2" style={{ background: T.greenBg, color: T.green }}><Check size={14}/> {stratPlan.length} actifs</span>
                        
                        <button onClick={handleExportStrategy} className="text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform" style={{ background: T.cardSolid, color: T.textSub, border: `1px solid ${T.border}` }}>
                          <Download size={14} /> Exporter ma stratégie PDF
                        </button>
                      </div>
                    </div>

                    {/* PIE CHARTS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl flex items-center gap-6" style={premiumCard}>
                        <div className="h-32 w-32 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie data={pieClassData} innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value" stroke="none">
                                {pieClassData.map((entry, index) => <PieCell key={`cell-${index}`} fill={entry.name === "Bourse" ? T.blue : T.amber} />)}
                              </Pie>
                              <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.borderMid}`, borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: T.text }} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest mb-3" style={{color: T.textSub}}>Classes d'actifs</h4>
                          {pieClassData.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 mb-1.5">
                              <div className="w-2 h-2 rounded-full" style={{background: d.name === "Bourse" ? T.blue : T.amber}} />
                              <span className="text-xs font-bold" style={{color: T.text}}>{d.name}</span>
                              <span className="text-[10px] font-mono" style={{color: T.textDim}}>{d.value.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl flex items-center gap-6" style={premiumCard}>
                        <div className="h-32 w-32 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie data={pieSectorData} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                                {pieSectorData.map((entry, index) => <PieCell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.borderMid}`, borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: T.text }} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-black uppercase tracking-widest mb-3" style={{color: T.textSub}}>Diversification Sectorielle</h4>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                            {pieSectorData.map((d, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{background: PIE_COLORS[i % PIE_COLORS.length]}} />
                                <span className="text-[10px] font-bold truncate" style={{color: T.text}}>{d.name}</span>
                                <span className="text-[9px] font-mono ml-auto" style={{color: T.textDim}}>{d.value.toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* ASSET GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {stratPlan.map((item, i) => (
                          <div key={i} className="relative p-6 rounded-3xl flex flex-col justify-between group shadow-lg" style={premiumCard}>
                             <div className="flex justify-between items-start mb-6">
                               <div>
                                 <div className="flex items-center gap-3 mb-2">
                                   <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: T.cardHover, color: T.cyan, border: `1px solid ${T.border}` }}>
                                     {item.stock.name.substring(0,2).toUpperCase()}
                                   </div>
                                   <div>
                                     <h4 className="text-sm font-black" style={{color: T.text}}>{item.stock.name}</h4>
                                     <span className="text-[9px] font-mono px-2 py-0.5 rounded-md mt-1 inline-block" style={{background: T.elevated, color: T.textSub}}>{item.stock.ticker}</span>
                                   </div>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <p className="text-[10px] font-bold" style={{color: T.textSub}}>POIDS</p>
                                 <p className="text-lg font-black font-mono" style={{color: T.cyan}}>{(item.weight * 100).toFixed(0)}%</p>
                               </div>
                             </div>
                             
                             <div className="flex items-end justify-between border-t pt-4" style={{ borderColor: T.borderMid }}>
                               <div>
                                 <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{color: T.textDim}}>{item.stock.sector}</p>
                                 <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-medium flex items-center gap-1" style={{color: scoreColor(item.score)}}><Zap size={10}/> Score {item.score}</p>
                                    {(item.divYield ?? 0) > 0 && (
                                       <p className="text-[10px] font-medium flex items-center gap-1" style={{color: T.amber}}><DollarSign size={10}/> Div: {item.divYield?.toFixed(1)}%</p>
                                    )}
                                 </div>
                               </div>
                               <div className="text-right">
                                 <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{color: T.textDim}}>Montant (Initial)</p>
                                 <p className="text-base font-black font-mono" style={{color: T.green}}>{item.amount.toFixed(0)} €</p>
                               </div>
                             </div>

                             <button onClick={() => pickStock(item.stock)} className="absolute inset-0 z-10 bg-cyan-500/10 backdrop-blur-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer border border-cyan-500/20">
                               <span className="bg-cyan-500 text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform">Analyser l'actif &rarr;</span>
                             </button>
                          </div>
                       ))}
                    </div>
                 </motion.div>
              )}
            </motion.div>
          )}

          {/* ══ HOME VIEW (Premium Dashboard) ══ */}
          {!selected && !showScanner && !showStrategy && !loading && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pt-4 pb-10">
               
               <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                 <div>
                   <h2 className="text-3xl md:text-5xl font-black mb-3 tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>
                     Votre radar <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">financier.</span>
                   </h2>
                   <p className="text-sm font-medium" style={{ color: T.textSub }}>Scannez, analysez et générez des stratégies basées sur la donnée quantique.</p>
                 </div>
               </div>

               <div>
                 <div className="flex items-center justify-between mb-5">
                   <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.textSub }}>
                     <Sparkles size={14} style={{ color: T.amber }} /> Univers d'investissement
                   </h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {COLLECTIONS.map((col, i) => (
                     <motion.button key={col.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                       className="relative overflow-hidden rounded-3xl p-6 text-left group hover:-translate-y-1 transition-all duration-300"
                       style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}`, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                       onClick={() => handleScan(col.id)}>
                       <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ background: col.gradient }} />
                       <div className="absolute top-0 left-0 w-full h-1 opacity-70" style={{ background: col.gradient }} />
                       
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-3xl filter drop-shadow-lg">{col.emoji}</span>
                         <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                           <ChevronRight size={14} style={{ color: T.textDim }} className="group-hover:text-white transition-colors" />
                         </div>
                       </div>
                       <p className="text-base font-bold mb-1.5" style={{ color: T.text }}>{col.name}</p>
                       <p className="text-xs font-medium leading-relaxed mb-4" style={{ color: T.textSub }}>{col.description}</p>
                       
                       <div className="flex items-center gap-2">
                         <div className="flex -space-x-2">
                           {col.tickers.slice(0, 3).map((t, idx) => (
                             <div key={t} className="w-6 h-6 rounded-full border border-[#161A23] flex items-center justify-center bg-[#1E2330] text-[8px] font-bold z-10" style={{ zIndex: 3 - idx }}>
                               {t[0]}
                             </div>
                           ))}
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>{col.tickers.length} actifs</span>
                       </div>
                     </motion.button>
                   ))}
                 </div>
               </div>
             </motion.div>
          )}

          {/* ══ LOADING & ERROR ══ */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse" style={{ background: T.cyan }} />
                <div className="w-16 h-16 rounded-3xl relative z-10 flex items-center justify-center shadow-2xl border border-white/10" style={{ background: T.cardSolid }}>
                  <Loader2 size={28} className="animate-spin" style={{ color: T.cyan }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold tracking-wide" style={{ color: T.text }}>Analyse quantique en cours...</p>
                <p className="text-[11px] mt-1" style={{ color: T.textDim }}>Traitement des données techniques et fondamentales</p>
              </div>
            </div>
          )}
          {error && <div className="rounded-2xl p-5 text-center shadow-lg" style={{ background: T.redBg, border: `1px solid rgba(244,63,94,0.2)` }}><p className="text-sm font-bold" style={{ color: T.red }}>{error}</p></div>}

          {/* ══ ACTION DASHBOARD (ALTAFLY / INCOME STYLE) ══ */}
          {selected && confluence && !loading && (
            <motion.div initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.4 }} className="space-y-4">

              {/* Top Header Row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl shadow-lg" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: T.bgSub, border: `1px solid ${T.border}` }}>
                    <span className="text-xl font-black" style={{ color: T.text }}>{selected.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>{selected.name}</h2>
                      <span className="text-[10px] font-mono px-2 py-1 rounded-lg uppercase tracking-wider font-bold" style={{ background: T.elevated, color: T.textSub, border: `1px solid ${T.border}` }}>{selected.ticker}</span>
                      {currentPosition && <span className="text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1" style={{ background: T.greenBg, color: T.green, border: `1px solid rgba(16,185,129,0.2)` }}><Briefcase size={10} /> {currentPosition.quantity}</span>}
                    </div>
                    <p className="text-xs font-medium" style={{ color: T.textDim }}>{selected.sector} • {selected.country}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {meta && (
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-3xl font-black font-mono tracking-tighter" style={{ color: T.text }}>{meta.curr.toFixed(2)}</span>
                        <span className="text-sm font-bold" style={{ color: T.textDim }}>{meta.currency}</span>
                      </div>
                      <span className="text-sm font-bold font-mono flex items-center justify-end gap-1" style={{ color: meta.pct >= 0 ? T.green : T.red }}>
                        {meta.pct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {Math.abs(meta.pct).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  <div className="h-10 w-px bg-white/5 hidden md:block"></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddModal(true); setAddPru(lastPrice?.toFixed(2) || ""); }} className="flex items-center justify-center w-10 h-10 rounded-xl transition-transform hover:scale-105" style={{ background: T.gradPrimary, boxShadow: '0 4px 15px rgba(6,182,212,0.3)' }}><Plus size={18} color="white" /></button>
                    <button onClick={() => analyze(selected)} className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/5 transition-colors" style={{ border: `1px solid ${T.borderMid}` }}><RefreshCw size={16} style={{ color: T.textSub }} /></button>
                    <button onClick={clear} className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/5 transition-colors" style={{ border: `1px solid ${T.borderMid}` }}><X size={16} style={{ color: T.textSub }} /></button>
                  </div>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* ══ LEFT COLUMN: Main Chart & Stats (Col-span 8) ══ */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  
                  {/* 4 Premium Stat Cards (Altafly style) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-3xl flex flex-col justify-center" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                      <div className="flex items-center gap-2 mb-2"><AlignLeft size={14} style={{ color: T.amber }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>Market Cap</span></div>
                      <p className="text-xl font-black font-mono" style={{ color: T.text }}>{fundamentals?.marketCap ? formatLargeNumber(fundamentals.marketCap) : "—"}</p>
                    </div>
                    <div className="p-4 rounded-3xl flex flex-col justify-center" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                      <div className="flex items-center gap-2 mb-2"><AlignLeft size={14} style={{ color: T.cyan }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>Ratio P/E</span></div>
                      <p className="text-xl font-black font-mono" style={{ color: T.text }}>{fundamentals?.pe ? fundamentals.pe.toFixed(2) : "—"}</p>
                    </div>
                    <div className="p-4 rounded-3xl flex flex-col justify-center" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                      <div className="flex items-center gap-2 mb-2"><AlignLeft size={14} style={{ color: T.violet }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>BPA (EPS)</span></div>
                      <p className="text-xl font-black font-mono" style={{ color: T.text }}>{fundamentals?.eps ? fundamentals.eps.toFixed(2) : "—"}</p>
                    </div>
                    <div className="p-4 rounded-3xl flex flex-col justify-center" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                      <div className="flex items-center gap-2 mb-2"><AlignLeft size={14} style={{ color: T.green }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>Dividende</span></div>
                      <p className="text-xl font-black font-mono" style={{ color: T.text }}>{fundamentals?.dividendYield ? fundamentals.dividendYield + "%" : "—"}</p>
                    </div>
                  </div>

                  {/* Main Overview Chart */}
                  <div className="rounded-3xl p-5 flex-1 min-h-[400px] flex flex-col shadow-lg" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black tracking-wide" style={{ color: T.text }}>Aperçu Technique</h3>
                      <div className="flex gap-1 bg-[#12151C] p-1 rounded-xl border border-white/5">
                        {VIEW_PERIODS.map(p => (
                          <button key={p.l} onClick={() => changeView(p)} 
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all" 
                            style={{ background: viewPeriod.l === p.l ? T.elevated : "transparent", color: viewPeriod.l === p.l ? T.text : T.textDim, boxShadow: viewPeriod.l === p.l ? '0 2px 5px rgba(0,0,0,0.2)' : 'none' }}>
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full relative">
                      <svg width="0" height="0">
                        <defs>
                          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke={T.borderMid} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} interval={tickN} dy={10} />
                          <YAxis domain={[pMin, pMax]} tick={{ fontSize: 9, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0)} />
                          <Tooltip content={<ChartTip />} cursor={{ stroke: T.borderMid, strokeWidth: 1, strokeDasharray: '4 4' }} />
                          
                          <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={3} fillOpacity={1} fill="url(#colorArea)" activeDot={{ r: 6, fill: chartColor, stroke: T.bg, strokeWidth: 2 }} />
                          
                          {overlays.includes("ma") && <Line type="monotone" dataKey="ma20" stroke={T.amber} dot={false} strokeWidth={1.5} />}
                          {overlays.includes("ma") && <Line type="monotone" dataKey="ma50" stroke={T.violet} dot={false} strokeWidth={1.5} />}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                      <div className="flex gap-2">
                        {(["ma", "bollinger", "ichimoku"] as Overlay[]).map(o => (
                          <button key={o} onClick={() => toggleOverlay(o)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors" 
                            style={{ background: overlays.includes(o) ? T.elevated : "transparent", color: overlays.includes(o) ? T.cyan : T.textDim, border: `1px solid ${overlays.includes(o) ? T.borderFocus : T.border}` }}>
                            {o}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => {
                        exportFullPDF(selected, meta, confluence, tech!, fundamentals, currentPosition);
                        setShowExportMenu(false);
                      }} className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold hover:scale-105 transition-transform" style={{ background: T.elevated, border: `1px solid ${T.borderMid}`, color: T.text }}>
                        <Download size={12} /> Exporter PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div onClick={() => setExpandedChart("rsi")} className="h-[70px] p-2 rounded-2xl relative group cursor-pointer transition-all hover:scale-[1.02]" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                      <Maximize2 size={12} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 z-10" />
                      <ResponsiveContainer><ComposedChart data={chartData}><YAxis domain={[0, 100]} hide /><ReferenceLine y={70} stroke={T.red + "30"} strokeDasharray="2 2" /><ReferenceLine y={30} stroke={T.green + "30"} strokeDasharray="2 2" /><Line dataKey="rsi" stroke={T.violet} dot={false} strokeWidth={1.5} /></ComposedChart></ResponsiveContainer>
                      <p className="text-[9px] font-bold text-center mt-1 uppercase tracking-wider" style={{ color: T.textDim }}>Indice RSI</p>
                    </div>
                    <div onClick={() => setExpandedChart("macd")} className="h-[70px] p-2 rounded-2xl relative group cursor-pointer transition-all hover:scale-[1.02]" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                      <Maximize2 size={12} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 z-10" />
                      <ResponsiveContainer><ComposedChart data={chartData}><ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" /><Line dataKey="macdLine" stroke={T.cyan} dot={false} strokeWidth={1} /><Line dataKey="macdSig" stroke={T.amber} dot={false} strokeWidth={1} /><Bar dataKey="macdHist" barSize={2}>{chartData.map((d, i) => <Cell key={i} fill={(d.macdHist || 0) >= 0 ? T.green + "80" : T.red + "80"} />)}</Bar></ComposedChart></ResponsiveContainer>
                      <p className="text-[9px] font-bold text-center mt-1 uppercase tracking-wider" style={{ color: T.textDim }}>MACD</p>
                    </div>
                    <div onClick={() => setExpandedChart("volume")} className="h-[70px] p-2 rounded-2xl relative group cursor-pointer transition-all hover:scale-[1.02]" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                      <Maximize2 size={12} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 z-10" />
                      <ResponsiveContainer><RBarChart data={chartData}><Bar dataKey="volume" barSize={3}>{chartData.map((d, i) => <Cell key={i} fill={d.up ? T.green + "40" : T.red + "40"} />)}</Bar></RBarChart></ResponsiveContainer>
                      <p className="text-[9px] font-bold text-center mt-1 uppercase tracking-wider" style={{ color: T.textDim }}>Volume</p>
                    </div>
                  </div>

                </div>

                {/* ══ RIGHT COLUMN: Action & Intelligence (Col-span 4) ══ */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  
                  <div className="rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${scoreColor(confluence.score)}, transparent 70%)` }} />
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 relative z-10" style={{ color: T.textSub }}>Score Nexus</h3>
                    
                    <div className="relative z-10 mb-4 scale-110">
                      <ScoreRing score={confluence.score} size={120} thickness={6} />
                    </div>
                    
                    <div className="text-center relative z-10">
                      <p className="text-lg font-black tracking-wide mb-1" style={{ color: scoreColor(confluence.score) }}>{confluence.action}</p>
                      <p className="text-xs font-medium" style={{ color: T.textDim }}>{confluence.summary}</p>
                    </div>
                  </div>

                  <div className="flex p-1 rounded-2xl" style={{ background: T.elevated, border: `1px solid ${T.borderMid}` }}>
                    <button onClick={() => setActiveSubTab("signals")} className="flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all" style={{ background: activeSubTab === "signals" ? T.cardHover : "transparent", color: activeSubTab === "signals" ? T.text : T.textDim }}>Plan & Signaux</button>
                    <button onClick={() => setActiveSubTab("fundamentals")} className="flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all" style={{ background: activeSubTab === "fundamentals" ? T.cardHover : "transparent", color: activeSubTab === "fundamentals" ? T.text : T.textDim }}>Santé & Valeur</button>
                  </div>

                  <div className="flex-1 rounded-3xl p-5 overflow-hidden flex flex-col shadow-lg" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
                    
                    {activeSubTab === "signals" && (
                      <div className="space-y-6 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                        <div>
                           <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.textSub }}><TrendingUp size={12} /> Plan d'action suggéré</h4>
                           <div className="space-y-2">
                             <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: T.elevated }}>
                               <span className="text-[10px] font-bold" style={{ color: T.textDim }}>Entrée opt.</span>
                               <span className="text-xs font-black font-mono" style={{ color: T.blueBright }}>{confluence.entryZone.min.toFixed(2)} - {confluence.entryZone.max.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center p-3 rounded-xl border border-red-500/10" style={{ background: T.redBg }}>
                               <span className="text-[10px] font-bold" style={{ color: T.red }}>Stop Loss</span>
                               <span className="text-xs font-black font-mono" style={{ color: T.red }}>{confluence.stopLoss.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center p-3 rounded-xl border border-green-500/10" style={{ background: T.greenBg }}>
                               <span className="text-[10px] font-bold" style={{ color: T.green }}>Objectif 1</span>
                               <span className="text-xs font-black font-mono" style={{ color: T.green }}>{confluence.targets[0]?.toFixed(2)}</span>
                             </div>
                           </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.textSub }}><Activity size={12} /> Signaux clés ({confluence.layers.length})</h4>
                          <div className="space-y-2">
                            {confluence.layers.slice(0, 5).map((sig, i) => (
                              <div key={i} className="flex justify-between items-center p-3 rounded-xl" style={{ background: T.elevated }}>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: sig.verdict === "bullish" ? T.green : sig.verdict === "bearish" ? T.red : T.amber }} />
                                  <span className="text-[11px] font-bold" style={{ color: T.text }}>{sig.name}</span>
                                </div>
                                <span className="text-[10px] font-mono" style={{ color: T.textDim }}>{(sig.confidence * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSubTab === "fundamentals" && (
                      <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                         {[{ t: "Santé financière", icon: <Heart size={14} />, data: healthScore, c: T.green }, 
                           { t: "Valorisation", icon: <Scale size={14} />, data: valuationScore, c: T.amber }, 
                           { t: "Momentum", icon: <Gauge size={14} />, data: momentumScore, c: T.violet }
                          ].map(({ t, icon, data, c }) => data && (
                          <div key={t} className="p-4 rounded-2xl" style={{ background: T.elevated, border: `1px solid ${T.borderMid}` }}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 rounded-lg" style={{ background: `${c}15` }}><span style={{ color: c }}>{icon}</span></div>
                              <span className="text-xs font-bold" style={{ color: T.text }}>{t}</span>
                              <span className="ml-auto text-lg font-black font-mono" style={{ color: c }}>{data.score}</span>
                            </div>
                            <div className="space-y-1">
                              {data.details.map((d, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5">
                                  <span className="text-[10px] font-medium" style={{ color: T.textSub }}>{d.name}</span>
                                  <span className="text-[10px] font-mono font-bold" style={{ color: d.verdict === "good" ? T.green : d.verdict === "bad" ? T.red : d.verdict === "warning" ? T.amber : T.textSub }}>{d.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* ══ MODALE AGRANDISSEMENT GRAPHIQUES ══ */}
          <AnimatePresence>
            {expandedChart && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: "rgba(11,14,20,0.9)", backdropFilter: "blur(8px)" }} onClick={() => setExpandedChart(null)}>
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-5xl h-[70vh] rounded-[2rem] p-8 flex flex-col shadow-2xl" style={{ background: T.bgSub, border: `1px solid ${T.borderMid}` }} onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black uppercase tracking-widest" style={{ color: T.text }}>{expandedChart.toUpperCase()} Détail</h3>
                    <button onClick={() => setExpandedChart(null)} className="p-2 rounded-xl hover:bg-white/5 transition-colors"><X size={20} style={{ color: T.textSub }} /></button>
                  </div>
                  <div className="flex-1 w-full relative">
                    {expandedChart === "rsi" && (
                      <ResponsiveContainer>
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                          <CartesianGrid stroke={T.borderMid} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} interval={tickN} dy={10} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} dx={-10} />
                          <Tooltip content={<ChartTip />} cursor={{ stroke: T.borderMid, strokeWidth: 1 }} />
                          <ReferenceLine y={70} stroke={T.red} strokeDasharray="4 4" strokeOpacity={0.5} />
                          <ReferenceLine y={30} stroke={T.green} strokeDasharray="4 4" strokeOpacity={0.5} />
                          <Line dataKey="rsi" stroke={T.violet} dot={false} strokeWidth={2.5} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                    {expandedChart === "macd" && (
                      <ResponsiveContainer>
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                          <CartesianGrid stroke={T.borderMid} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} interval={tickN} dy={10} />
                          <YAxis tick={{ fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} dx={-10} />
                          <Tooltip content={<ChartTip />} cursor={{ stroke: T.borderMid, strokeWidth: 1 }} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                          <Line dataKey="macdLine" stroke={T.cyan} dot={false} strokeWidth={2} />
                          <Line dataKey="macdSig" stroke={T.amber} dot={false} strokeWidth={2} />
                          <Bar dataKey="macdHist" barSize={6} radius={[2, 2, 0, 0]}>{chartData.map((d, i) => <Cell key={i} fill={(d.macdHist || 0) >= 0 ? T.green + "CC" : T.red + "CC"} />)}</Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                    {expandedChart === "volume" && (
                      <ResponsiveContainer>
                        <RBarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                          <CartesianGrid stroke={T.borderMid} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} interval={tickN} dy={10} />
                          <YAxis tick={{ fontSize: 10, fill: T.textDim, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} dx={-10} />
                          <Tooltip content={<ChartTip />} cursor={{ stroke: T.borderMid, strokeWidth: 1 }} />
                          <Bar dataKey="volume" barSize={8} radius={[2, 2, 0, 0]}>{chartData.map((d, i) => <Cell key={i} fill={d.up ? T.green + "80" : T.red + "80"} />)}</Bar>
                        </RBarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ ADD MODAL ══ */}
          <AnimatePresence>
            {showAddModal && selected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }} onClick={() => setShowAddModal(false)}>
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-3xl p-6 shadow-2xl" style={{ background: T.elevated, border: `1px solid ${T.borderMid}` }} onClick={e => e.stopPropagation()}>
                  {addSuccess ? (
                    <div className="flex flex-col items-center py-8"><div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ background: T.greenBg, border: `1px solid rgba(16,185,129,0.2)` }}><Check size={28} style={{ color: T.green }} /></div><p className="text-sm font-bold tracking-wide" style={{ color: T.green }}>Position ajoutée !</p></div>
                  ) : (<>
                    <h3 className="text-sm font-black mb-5 tracking-wide" style={{ color: T.text }}>{currentPosition ? "Renforcer" : "Ajouter"} <span style={{ color: T.cyan }}>{selected.name}</span></h3>
                    <div className="space-y-4">
                      <div><label className="text-[10px] font-bold mb-1.5 block uppercase tracking-wider" style={{ color: T.textDim }}>Quantité</label><input value={addQty} onChange={e => setAddQty(e.target.value)} type="number" className="w-full rounded-2xl px-4 py-3 text-sm bg-black/20 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all" style={{ border: `1px solid ${T.borderMid}`, color: T.text }} /></div>
                      <div><label className="text-[10px] font-bold mb-1.5 block uppercase tracking-wider" style={{ color: T.textDim }}>Prix ({meta?.currency})</label><input value={addPru} onChange={e => setAddPru(e.target.value)} type="number" className="w-full rounded-2xl px-4 py-3 text-sm bg-black/20 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all" style={{ border: `1px solid ${T.borderMid}`, color: T.text }} /></div>
                    </div>
                    <button onClick={handleAdd} disabled={addSaving} className="w-full mt-6 py-3.5 rounded-2xl text-xs font-black text-white tracking-widest uppercase transition-transform hover:scale-[1.02] shadow-lg shadow-cyan-500/20" style={{ background: T.gradPrimary, opacity: addSaving ? 0.6 : 1 }}>{addSaving ? "Traitement..." : "Confirmer l'ajout"}</button>
                  </>)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}