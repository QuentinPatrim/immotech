"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown, TrendingUp, Wallet, Zap, AlertTriangle,
  ChevronRight, RefreshCw, CheckCircle2, Loader2,
  BarChart2, Bell, ArrowUpRight, ArrowDownRight, Minus,
  Building2, Target, Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info" | "positive";
type Category = "epargne" | "emprunt" | "dca" | "marche";

interface PulseAlert {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  body: string;
  value?: string;
  delta?: string;
  deltaPositive?: boolean;
  cta?: { label: string; href: string };
  ts: Date;
}

interface Asset {
  type: string;
  name?: string;
  ticker?: string;
  value: number;
  quantity?: number;
  buyPrice?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)} %`;

// ─── Config catégories ────────────────────────────────────────────────────────

const CATEGORIES: Record<Category, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  epargne:  { label: "Épargne",         icon: Activity,   color: "#10b981", bg: "#10b98112" },
  emprunt:  { label: "Capacité d'emprunt", icon: Building2,  color: "#3b82f6", bg: "#3b82f612" },
  dca:      { label: "DCA & Tréso",     icon: Zap,        color: "#a855f7", bg: "#a855f712" },
  marche:   { label: "Marchés",         icon: BarChart2,  color: "#eab308", bg: "#eab30812" },
};

const SEVERITY_CONFIG: Record<Severity, { dot: string; border: string }> = {
  critical: { dot: "#ef4444", border: "border-red-500/20" },
  warning:  { dot: "#eab308", border: "border-yellow-500/20" },
  info:     { dot: "#3b82f6", border: "border-blue-500/15" },
  positive: { dot: "#10b981", border: "border-emerald-500/20" },
};

// ─── Fetch prix live — même logique que /app/patrimoine ─────────────────────

async function fetchLivePrices(ticker: string): Promise<{ curr: number; prev: number } | null> {
  const endpoints = [
    `/api/price?ticker=${encodeURIComponent(ticker)}`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.price && json.previousClose) return { curr: json.price, prev: json.previousClose };
      const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const valid = closes.filter((v): v is number => v != null && !isNaN(v));
      if (valid.length >= 2) return { curr: valid[valid.length - 1], prev: valid[valid.length - 2] };
    } catch { continue; }
  }
  return null;
}

// ─── Moteur d'alertes ─────────────────────────────────────────────────────────

async function buildAlerts(profile: {
  assets_json: Array<Asset>;
  budget_json: { income?: number; expenses?: number; details?: Array<{ amount: number }> };
  monthly_history?: Array<{ month: string; income: number; expenses: number }>;
}): Promise<PulseAlert[]> {
  const alerts: PulseAlert[] = [];
  const now = new Date();

  const assets = Array.isArray(profile.assets_json) ? profile.assets_json : [];
  const bj = (profile.budget_json || {}) as { income?: number; expenses?: number; details?: Array<{ amount: number }> };

  const income = Number(bj.income) || 0;
  const expenses = Array.isArray(bj.details)
    ? bj.details.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    : Number(bj.expenses) || 0;
  const savings = Math.max(0, income - expenses);
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const totalWealth = assets.reduce((s, a) => s + (Number(a.value) || 0), 0);
  const cash = assets.filter(a => a.type === "Cash").reduce((s, a) => s + Number(a.value), 0);
  const stock = assets.filter(a => a.type === "Bourse").reduce((s, a) => s + Number(a.value), 0);
  const crypto = assets.filter(a => a.type === "Crypto").reduce((s, a) => s + Number(a.value), 0);

  // ── 1. ÉPARGNE — taux vs mois précédent ──────────────────────────────────
  const history = Array.isArray(profile.monthly_history) ? profile.monthly_history : [];
  if (history.length >= 2) {
    const [prev, curr] = history.slice(-2);
    const prevRate = prev.income > 0 ? ((prev.income - prev.expenses) / prev.income) * 100 : 0;
    const currRate = curr.income > 0 ? ((curr.income - curr.expenses) / curr.income) * 100 : 0;
    const diff = currRate - prevRate;

    if (diff < -5) {
      alerts.push({
        id: "savings-drop",
        category: "epargne",
        severity: "warning",
        title: "Taux d'épargne en baisse",
        body: `Votre taux est passé de ${prevRate.toFixed(0)}% à ${currRate.toFixed(0)}% ce mois-ci. Identifiez le poste responsable dans votre budget.`,
        value: `${currRate.toFixed(0)} %`,
        delta: fmtPct(diff),
        deltaPositive: false,
        cta: { label: "Voir mon budget", href: "/budget" },
        ts: now,
      });
    } else if (diff > 5) {
      alerts.push({
        id: "savings-up",
        category: "epargne",
        severity: "positive",
        title: "Taux d'épargne en hausse",
        body: `Bravo — votre épargne a progressé de ${diff.toFixed(0)} points ce mois. Pensez à automatiser ce surplus vers votre PEA.`,
        value: `${currRate.toFixed(0)} %`,
        delta: fmtPct(diff),
        deltaPositive: true,
        cta: { label: "Simuler la projection", href: "/projection" },
        ts: now,
      });
    }
  }

  // Alerte taux d'épargne absolu faible
  if (savingsRate > 0 && savingsRate < 10) {
    alerts.push({
      id: "savings-low",
      category: "epargne",
      severity: "critical",
      title: "Épargne insuffisante",
      body: `Avec ${savingsRate.toFixed(0)}% d'épargne, votre capacité d'investissement est très limitée. Objectif recommandé : 20% minimum.`,
      value: `${savingsRate.toFixed(0)} %`,
      cta: { label: "Revoir mon budget", href: "/budget" },
      ts: now,
    });
  } else if (savingsRate >= 30) {
    alerts.push({
      id: "savings-excellent",
      category: "epargne",
      severity: "positive",
      title: "Excellent taux d'épargne",
      body: `${savingsRate.toFixed(0)}% d'épargne — vous êtes dans le top 5% des épargnants français. Votre DCA mensuel peut être optimisé.`,
      value: `${savingsRate.toFixed(0)} %`,
      cta: { label: "Optimiser ma projection", href: "/projection" },
      ts: now,
    });
  }

  // ── 2. CAPACITÉ D'EMPRUNT ─────────────────────────────────────────────────
  if (income > 0) {
    // Règle des 35% d'endettement max
    const maxMonthly = income * 0.35;
    const loanCapacity = maxMonthly * 12 * 20; // 20 ans horizon
    const ltvBonus = cash * 4; // apport × 4 = levier immobilier
    const totalBorrowingPower = loanCapacity + ltvBonus;

    alerts.push({
      id: "borrow-capacity",
      category: "emprunt",
      severity: "info",
      title: "Capacité d'emprunt estimée",
      body: `Avec ${fmt(income)}/mois de revenus et ${fmt(cash)} d'apport, votre enveloppe d'achat estimée est de ${fmt(totalBorrowingPower)}. Simulez un projet.`,
      value: fmt(totalBorrowingPower),
      cta: { label: "Simuler un achat", href: "/simulateur" },
      ts: now,
    });

    // Alerte si taux endettement critique
    const debtRatio = expenses / income;
    if (debtRatio > 0.5) {
      alerts.push({
        id: "debt-high",
        category: "emprunt",
        severity: "critical",
        title: "Charges élevées",
        body: `Vos charges représentent ${(debtRatio * 100).toFixed(0)}% de vos revenus. Au-delà de 50%, les banques refusent généralement tout nouveau crédit.`,
        value: `${(debtRatio * 100).toFixed(0)} %`,
        cta: { label: "Analyser mon budget", href: "/budget" },
        ts: now,
      });
    }
  }

  // ── 3. DCA & TRÉSORERIE ────────────────────────────────────────────────────
  const runwayMonths = expenses > 0 ? cash / expenses : 0;

  if (runwayMonths > 12 && totalWealth > 0) {
    const surplus = cash - expenses * 6;
    alerts.push({
      id: "dca-opportunity",
      category: "dca",
      severity: "warning",
      title: "Cash dormant détecté",
      body: `Vous avez ${runwayMonths.toFixed(0)} mois de charges en cash. Au-delà de 6 mois, le surplus (${fmt(surplus)}) perd de la valeur face à l'inflation.`,
      value: fmt(surplus),
      cta: { label: "Optimiser via DCA", href: "/projection" },
      ts: now,
    });
  } else if (runwayMonths < 3 && income > 0) {
    alerts.push({
      id: "cash-critical",
      category: "dca",
      severity: "critical",
      title: "Réserve de sécurité insuffisante",
      body: `Seulement ${runwayMonths.toFixed(1)} mois de charges en cash. Constituez un matelas de 3 à 6 mois avant d'investir.`,
      value: `${runwayMonths.toFixed(1)} mois`,
      cta: { label: "Ajuster mon budget", href: "/budget" },
      ts: now,
    });
  }

  if (savings > 0 && stock === 0 && crypto === 0) {
    alerts.push({
      id: "dca-start",
      category: "dca",
      severity: "info",
      title: "DCA non démarré",
      body: `Vous épargnez ${fmt(savings)}/mois mais aucun actif financier n'est déclaré. Même ${fmt(Math.round(savings * 0.5))}/mois en PEA sur 10 ans fait une différence considérable.`,
      value: fmt(savings) + "/mois",
      cta: { label: "Simuler le DCA", href: "/projection" },
      ts: now,
    });
  }

  // ── 4. ALERTES MARCHÉ — positions réelles du portefeuille ──────────────────
  const stockAssets = assets.filter(a => a.type === "Bourse" && a.ticker);
  const cryptoAssets = assets.filter(a => a.type === "Crypto" && a.ticker);
  const watchAssets = [...stockAssets, ...cryptoAssets].slice(0, 6); // max 6 requêtes

  if (watchAssets.length > 0) {
    await Promise.all(
      watchAssets.map(async (asset) => {
        const prices = await fetchLivePrices(asset.ticker!);
        if (!prices) return;

        const { curr, prev } = prices;
        const pctChange = ((curr - prev) / prev) * 100;
        const name = asset.name || asset.ticker!;

        // Calcul impact sur la position réelle
        const qty = Number(asset.quantity) || 0;
        const positionValue = qty > 0 ? qty * curr : Number(asset.value) || 0;
        const positionImpact = positionValue * (pctChange / 100);

        // Plus-value latente si buyPrice renseigné
        const buyPrice = Number(asset.buyPrice) || 0;
        const latentPnL = buyPrice > 0 && qty > 0
          ? (curr - buyPrice) * qty
          : null;
        const latentPct = buyPrice > 0 ? ((curr - buyPrice) / buyPrice) * 100 : null;

        // Seuils : 2% pour les cryptos (plus volatiles), 1.5% pour les actions
        const threshold = asset.type === "Crypto" ? 2 : 1.5;

        if (Math.abs(pctChange) >= threshold) {
          const isBig = Math.abs(pctChange) >= 5;
          alerts.push({
            id: `market-${asset.ticker}`,
            category: "marche",
            severity: pctChange <= -5 ? "critical" : pctChange < 0 ? "warning" : "positive",
            title: pctChange < 0
              ? `${name} — ${isBig ? "forte baisse" : "baisse"}`
              : `${name} — ${isBig ? "forte hausse" : "hausse"}`,
            body: [
              `Variation hier : ${pctChange > 0 ? "+" : ""}${pctChange.toFixed(2)}% · Cours actuel : ${curr.toFixed(2)}€`,
              `Impact sur votre position : ${positionImpact > 0 ? "+" : ""}${fmt(positionImpact)}`,
              latentPnL !== null
                ? `PnL total : ${latentPnL >= 0 ? "+" : ""}${fmt(latentPnL)} (${latentPct! >= 0 ? "+" : ""}${latentPct!.toFixed(1)}% vs prix d'achat)`
                : "",
            ].filter(Boolean).join(" · "),
            value: `${pctChange > 0 ? "+" : ""}${pctChange.toFixed(2)} %`,
            deltaPositive: pctChange > 0,
            cta: { label: "Voir mon patrimoine", href: "/patrimoine" },
            ts: now,
          });
        } else if (latentPnL !== null && Math.abs(latentPct!) >= 15) {
          // Alerte PnL même sans mouvement journalier si PnL latent important
          alerts.push({
            id: `market-pnl-${asset.ticker}`,
            category: "marche",
            severity: latentPnL >= 0 ? "positive" : "warning",
            title: latentPnL >= 0
              ? `${name} — Plus-value latente significative`
              : `${name} — Moins-value latente`,
            body: `Cours actuel : ${curr.toFixed(2)}€ · Achat à ${buyPrice.toFixed(2)}€ · PnL : ${latentPnL >= 0 ? "+" : ""}${fmt(latentPnL)} (${latentPct! >= 0 ? "+" : ""}${latentPct!.toFixed(1)}%)`,
            value: `${latentPct! >= 0 ? "+" : ""}${latentPct!.toFixed(1)} %`,
            deltaPositive: latentPnL >= 0,
            cta: { label: "Voir mon patrimoine", href: "/patrimoine" },
            ts: now,
          });
        }
      })
    );

    // Si aucune alerte marché générée — tout est stable
    const hasMarketAlert = alerts.some(a => a.category === "marche");
    if (!hasMarketAlert) {
      alerts.push({
        id: "market-stable",
        category: "marche",
        severity: "positive",
        title: "Portefeuille stable",
        body: `Vos ${watchAssets.length} position(s) suivie(s) n'ont pas connu de mouvement significatif sur la journée.`,
        value: `${watchAssets.length} actifs`,
        cta: { label: "Voir mon patrimoine", href: "/patrimoine" },
        ts: now,
      });
    }
  } else if (stock > 0 || crypto > 0) {
    // Actifs sans ticker renseigné
    alerts.push({
      id: "market-no-ticker",
      category: "marche",
      severity: "info",
      title: "Alertes cours non configurées",
      body: `Vous avez ${fmt(stock + crypto)} en actifs financiers mais sans ticker renseigné. Ajoutez le ticker (ex: AAPL, BTC-EUR) pour suivre vos positions en temps réel.`,
      value: fmt(stock + crypto),
      cta: { label: "Configurer mes actifs", href: "/patrimoine" },
      ts: now,
    });
  } else {
    alerts.push({
      id: "market-empty",
      category: "marche",
      severity: "info",
      title: "Aucune position suivie",
      body: "Ajoutez des actifs boursiers ou crypto avec leur ticker dans la page Patrimoine pour recevoir des alertes de cours personnalisées.",
      cta: { label: "Ajouter des actifs", href: "/patrimoine" },
      ts: now,
    });
  }

  return alerts;
}

// ─── Composant AlertCard ──────────────────────────────────────────────────────

function AlertCard({ alert, index }: { alert: PulseAlert; index: number }) {
  const cat = CATEGORIES[alert.category];
  const sev = SEVERITY_CONFIG[alert.severity];
  const CatIcon = cat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
      className={`relative rounded-[22px] border ${sev.border} p-5 flex flex-col gap-4 hover:bg-white/[0.02] transition-all duration-200 group`}
      style={{ backgroundColor: `${cat.color}06` }}
    >
      {/* Dot de sévérité */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: sev.dot }}
        />
        {alert.severity === "critical" && (
          <div
            className="w-1.5 h-1.5 rounded-full animate-ping absolute"
            style={{ backgroundColor: sev.dot, opacity: 0.5 }}
          />
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: cat.bg }}
        >
          <CatIcon size={16} strokeWidth={1.5} style={{ color: cat.color }} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p
            className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5"
            style={{ color: `${cat.color}90` }}
          >
            {cat.label}
          </p>
          <p className="text-sm font-black text-white leading-tight">{alert.title}</p>
        </div>
      </div>

      {/* Valeur mise en avant */}
      {alert.value && (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tabular-nums" style={{ color: cat.color }}>
            {alert.value}
          </span>
          {alert.delta && (
            <div className="flex items-center gap-0.5">
              {alert.deltaPositive
                ? <ArrowUpRight size={13} className="text-emerald-400" />
                : <ArrowDownRight size={13} className="text-red-400" />
              }
              <span className={`text-xs font-bold ${alert.deltaPositive ? "text-emerald-400" : "text-red-400"}`}>
                {alert.delta}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Corps */}
      <p className="text-xs text-zinc-500 leading-relaxed">{alert.body}</p>

      {/* CTA */}
      {alert.cta && (
        <Link
          href={alert.cta.href}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors self-start"
          style={{ color: `${cat.color}70` }}
        >
          {alert.cta.label}
          <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </motion.div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const ALL_CATEGORIES: Array<Category | "all"> = ["all", "epargne", "emprunt", "dca", "marche"];

export default function PulsePage() {
  const [alerts, setAlerts] = useState<PulseAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [userName, setUserName] = useState("Investisseur");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    if (session.user.user_metadata?.full_name) {
      setUserName(session.user.user_metadata.full_name.split(" ")[0]);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("assets_json, budget_json")
      .eq("id", session.user.id)
      .maybeSingle();

    const { data: history } = await supabase
      .from("monthly_history")
      .select("month, income, expenses")
      .eq("user_id", session.user.id)
      .order("month", { ascending: true })
      .limit(6);

    const enriched = { ...(profile || {}), monthly_history: history || [] };
    const result = await buildAlerts(enriched as Parameters<typeof buildAlerts>[0]);

    // Tri : critical en premier, puis warning, info, positive
    const ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
    result.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

    setAlerts(result);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.category === filter);

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const positiveCount = alerts.filter(a => a.severity === "positive").length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-28 md:pb-10">
      <Sidebar />

      <main className="md:ml-64 px-4 pt-6 pb-10 md:px-10 md:pt-10 relative overflow-hidden">

        {/* Ambient */}
        <div className="fixed top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-yellow-950/10 to-transparent pointer-events-none z-0" />

        <div className="relative z-10 space-y-6">

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-start justify-between gap-4"
          >
            <div>
              <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.25em] mb-1">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^\w/, c => c.toUpperCase())}
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter">
                Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">Pulse</span>
              </h1>
              <p className="text-xs text-zinc-600 mt-0.5">Alertes & signaux patrimoniaux · {userName}</p>
            </div>

            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="h-9 w-9 rounded-xl bg-zinc-900/70 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-40"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </motion.div>

          {/* ── RÉSUMÉ ─────────────────────────────────────────────────────── */}
          {!loading && alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { label: "Alertes totales", value: alerts.length, color: "#71717a", icon: Bell },
                { label: "Critiques", value: criticalCount, color: "#ef4444", icon: AlertTriangle },
                { label: "Positives", value: positiveCount, color: "#10b981", icon: CheckCircle2 },
              ].map((s) => (
                <div key={s.label} className="rounded-[18px] bg-zinc-900/40 border border-white/5 p-3 md:p-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}12` }}>
                    <s.icon size={14} style={{ color: s.color }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white tabular-nums leading-none">{s.value}</p>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── FILTRES ────────────────────────────────────────────────────── */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            >
              {ALL_CATEGORIES.map((cat) => {
                const isAll = cat === "all";
                const cfg = isAll ? null : CATEGORIES[cat];
                const count = isAll ? alerts.length : alerts.filter(a => a.category === cat).length;
                const active = filter === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                      active
                        ? "text-white border-white/20 bg-white/8"
                        : "text-zinc-600 border-white/5 hover:text-zinc-400 hover:border-white/10"
                    }`}
                  >
                    {cfg && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />}
                    {isAll ? "Tout" : cfg!.label}
                    <span className={`tabular-nums ${active ? "text-zinc-400" : "text-zinc-700"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* ── CONTENU ────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={28} className="animate-spin text-zinc-700" />
              <p className="text-xs text-zinc-700 font-mono uppercase tracking-widest">Analyse en cours…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <CheckCircle2 size={32} className="text-emerald-500/40" />
              <p className="text-sm font-black text-white">Aucune alerte dans cette catégorie</p>
              <p className="text-xs text-zinc-600 max-w-xs">
                {filter === "all"
                  ? "Votre patrimoine ne déclenche aucun signal pour le moment."
                  : "Ajoutez des données dans cette catégorie pour voir des alertes."}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={filter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Groupement par catégorie si "all" */}
                {filter === "all" ? (
                  <div className="space-y-6">
                    {(["critical", "warning", "info", "positive"] as Severity[]).map((sev) => {
                      const group = filtered.filter(a => a.severity === sev);
                      if (group.length === 0) return null;
                      const labels: Record<Severity, string> = {
                        critical: "⚠ À traiter en priorité",
                        warning: "Surveiller",
                        info: "Informations",
                        positive: "✓ Bonne nouvelle",
                      };
                      return (
                        <div key={sev}>
                          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.25em] mb-3 pl-1">
                            {labels[sev]}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {group.map((alert, i) => (
                              <AlertCard key={alert.id} alert={alert} index={i} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filtered.map((alert, i) => (
                      <AlertCard key={alert.id} alert={alert} index={i} />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

        </div>
      </main>
    </div>
  );
}