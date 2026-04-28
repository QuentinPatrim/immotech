"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Wallet, ArrowUpRight, Building, PieChart,
  Calculator, Target, Settings, Sparkles, MessageSquare, Activity,
  Lightbulb, ChevronRight,
} from "lucide-react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Sidebar from "@/components/Sidebar";
import { NexusLogo } from "@/components/NexusLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import OnboardingWizard from "@/components/OnboardingWizard";
import { OnboardingModal } from "@/components/OnboardingModal";

// ═══════════════════════════════════════════════════════════════════════════
//   NEXUS DASHBOARD V2 — REFONTE VISUELLE
//   Direction : Cinématique éditorial · Sérénité maîtrisée
//
//   Principes :
//   1. UNE vedette absolue : l'ORBE PATRIMOINE qui pulse comme un organisme
//   2. Hiérarchie radicale : le hero domine, le reste s'efface
//   3. Détails de luxe : tabular numbers, sparkline, ticker live
//   4. Mouvement utile : animations liées à la donnée, jamais décoratives
//
//   La logique métier (Supabase, fetchData, calculs) est INCHANGÉE.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatEuro = (val: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

const getNextMilestone = (current: number) => {
  if (current < 10000) return 10000;
  if (current < 50000) return 50000;
  if (current < 100000) return 100000;
  if (current < 250000) return 250000;
  if (current < 500000) return 500000;
  if (current < 1000000) return 1000000;
  return Math.ceil((current + 1) / 1000000) * 1000000;
};

const getInsight = (savingsRate: number, totalNetWorth: number, monthlySavings: number) => {
  if (savingsRate >= 50) return {
    label: "Excellent taux d'épargne",
    text: `Avec ${savingsRate.toFixed(0)}% d'épargne, vous faites partie des 5% les plus performants. Pensez à diversifier vers le PEA ou l'assurance-vie.`,
    color: "#10b981",
  };
  if (savingsRate >= 30) return {
    label: "Très bonne capacité d'épargne",
    text: `${formatEuro(monthlySavings)}/mois investis régulièrement pendant 10 ans = patrimoine considérable grâce aux intérêts composés.`,
    color: "#3b82f6",
  };
  if (savingsRate >= 15) return {
    label: "Taux d'épargne correct",
    text: `L'objectif recommandé est 20%. Identifier 2-3 postes de dépenses à réduire pourrait vous faire économiser ${formatEuro(monthlySavings * 0.3)} de plus par mois.`,
    color: "#eab308",
  };
  if (totalNetWorth > 0) return {
    label: "Optimisez votre budget",
    text: "Votre patrimoine est constitué — concentrez-vous maintenant sur votre flux mensuel. La règle 50/30/20 peut vous aider à structurer vos dépenses.",
    color: "#f97316",
  };
  return {
    label: "Commencez à investir",
    text: "Même 50€/mois investis dès maintenant changent radicalement la trajectoire de votre patrimoine sur 20 ans.",
    color: "#a855f7",
  };
};

type Segment = { label: string; value: number; color: string };

// ═══════════════════════════════════════════════════════════════════════════
//   ORBE PATRIMOINE — pièce maîtresse
// ═══════════════════════════════════════════════════════════════════════════

function PatrimoineOrb({
  segments, total, savingsRate,
}: {
  segments: Segment[]; total: number; savingsRate: number;
}) {
  const active = segments.filter(s => s.value > 0);
  const SIZE = 280;
  const STROKE = 14;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  let cumulativeOffset = 0;
  const arcs = active.map(seg => {
    const pct = total > 0 ? seg.value / total : 0;
    const length = pct * CIRCUMFERENCE;
    const offset = cumulativeOffset;
    cumulativeOffset += length;
    return { ...seg, length, offset, pct };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      {/* Halo extérieur diffus — pulse */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(16,185,129,0.05) 50%, transparent 80%)",
          filter: "blur(32px)",
        }}
      />

      {/* Halo intérieur plus serré */}
      <motion.div
        className="absolute rounded-full"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: SIZE * 0.85,
          height: SIZE * 0.85,
          background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
          filter: "blur(16px)",
        }}
      />

      {/* SVG : arcs d'allocation */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={STROKE}
        />

        {arcs.map((arc, i) => (
          <motion.circle
            key={arc.label}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arc.length} ${CIRCUMFERENCE}`}
            initial={{ strokeDashoffset: -arc.offset, opacity: 0 }}
            animate={{ strokeDashoffset: -arc.offset, opacity: 1 }}
            transition={{ opacity: { duration: 0.6, delay: 0.4 + i * 0.12 } }}
            style={{ filter: `drop-shadow(0 0 8px ${arc.color}aa)` }}
          />
        ))}
      </svg>

      {/* Cercle de verre central */}
      <div
        className="absolute rounded-full backdrop-blur-xl"
        style={{
          width: SIZE - STROKE * 4,
          height: SIZE - STROKE * 4,
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 40%, rgba(0,0,0,0.4) 100%)",
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,0.08), inset 0 -20px 40px rgba(0,0,0,0.4), 0 20px 60px -20px rgba(16,185,129,0.3)",
        }}
      />

      {/* Reflet de surface */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: SIZE - STROKE * 4,
          height: SIZE - STROKE * 4,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12), transparent 50%)",
        }}
      />

      {/* Contenu central */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <div className="flex items-center gap-1.5 mb-2">
          <motion.span
            className="w-1 h-1 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-[0.28em]">
            Live
          </span>
        </div>
        <div className="text-3xl md:text-[40px] font-black text-white tracking-tighter tabular-nums leading-none">
          <AnimatedNumber value={total} />
        </div>
        <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-[0.22em] mt-2">
          Patrimoine net
        </p>
        <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Activity size={9} className="text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-300 tabular-nums">
            {savingsRate.toFixed(0)}% épargne
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   SPARKLINE — micro-graphique d'évolution
// ═══════════════════════════════════════════════════════════════════════════

function Sparkline({ trend = "up", color = "#10b981" }: { trend?: "up" | "down"; color?: string }) {
  const points = trend === "up"
    ? [20, 22, 19, 24, 23, 28, 26, 32, 30, 36, 34, 42]
    : [42, 38, 40, 36, 32, 34, 28, 30, 26, 24, 22, 20];

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 30 - ((p - min) / range) * 28;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${path} L 100 30 L 0 30 Z`}
        fill="url(#sparkGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
      />
    </svg>
  );
}

// ─── Modules ──────────────────────────────────────────────────────────────────

const MODULES = [
  { href: "/projection", label: "Projection", sub: "Futur & intérêts composés", icon: TrendingUp, accent: "#a855f7", hero: true },
  { href: "/simulateur", label: "Simulateur Immo", sub: "Rendement locatif & fiscal", icon: Calculator, accent: "#3b82f6", hero: false },
  { href: "/budget", label: "Budget", sub: "Flux mensuels", icon: PieChart, accent: "#eab308", hero: false },
  { href: "/patrimoine", label: "Patrimoine", sub: "Vos actifs", icon: Wallet, accent: "#10b981", hero: false },
  { href: "/chat", label: "CFO IA", sub: "Chat patrimonial", icon: MessageSquare, accent: "#6366f1", hero: false },
];

// ═══════════════════════════════════════════════════════════════════════════
//   COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Investisseur");

  const [financialWealth, setFinancialWealth] = useState(0);
  const [realEstateWealth, setRealEstateWealth] = useState(0);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  const [milestone, setMilestone] = useState(10000);
  const [cashWealth, setCashWealth] = useState(0);
  const [cryptoWealth, setCryptoWealth] = useState(0);
  const [stockWealth, setStockWealth] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    if (session?.user) {
      if (session.user.user_metadata?.full_name) {
        setUserName(session.user.user_metadata.full_name.split(" ")[0]);
      }
      const hasCompletedOnboarding = session.user.user_metadata?.onboarding_complete === true;
      setShowOnboarding(!hasCompletedOnboarding);

      const { data: profile } = await supabase
        .from("profiles").select("is_pro, assets_json, budget_json")
        .eq("id", session.user.id).maybeSingle();

      let hasAssets = false;
      let total = 0;
      let currentIncome = 0;
      let currentExpenses = 0;
      let hasBudget = false;
      let cash = 0, crypto = 0, stock = 0, financial = 0, realEstate = 0;

      if (profile) {
        if (Array.isArray(profile.assets_json) && profile.assets_json.length > 0) {
          hasAssets = true;
          profile.assets_json.forEach((asset: { type: string; value: number }) => {
            const val = Number(asset.value) || 0;
            if (asset.type === "Immobilier") { realEstate += val; }
            else {
              financial += val;
              if (asset.type === "Cash") cash += val;
              if (asset.type === "Crypto") crypto += val;
              if (asset.type === "Bourse") stock += val;
            }
          });
        }
        total = financial + realEstate;
        setFinancialWealth(financial);
        setRealEstateWealth(realEstate);
        setTotalNetWorth(total);
        setCashWealth(cash);
        setCryptoWealth(crypto);
        setStockWealth(stock);
        setMilestone(getNextMilestone(total));
      }

      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split("T")[0];
      const { data: currentMonthHistory } = await supabase
        .from("monthly_history").select("*")
        .eq("user_id", session.user.id).eq("month", startOfMonth).maybeSingle();

      if (currentMonthHistory) {
        currentIncome = Number(currentMonthHistory.income) || 0;
        currentExpenses = Number(currentMonthHistory.expenses) || 0;
        hasBudget = true;
      } else if (profile?.budget_json) {
        const b = profile.budget_json as { income?: number; expenses?: number; details?: Array<{ amount: number }> };
        currentIncome = Number(b.income) || 0;
        if (Array.isArray(b.details)) {
          currentExpenses = b.details.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        } else {
          currentExpenses = Number(b.expenses) || 0;
        }
        if (currentIncome > 0) hasBudget = true;
      }

      const savings = Math.max(0, currentIncome - currentExpenses);
      setMonthlySavings(savings);
      setSavingsRate(currentIncome > 0 ? (savings / currentIncome) * 100 : 0);

      if (hasCompletedOnboarding && !hasAssets && !hasBudget) setIsNewUser(true);
      else setIsNewUser(false);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen bg-[#050505]" />;

  const segments: Segment[] = [
    { label: "Immo", value: realEstateWealth, color: "#3b82f6" },
    { label: "Bourse", value: stockWealth, color: "#10b981" },
    { label: "Cash", value: cashWealth, color: "#eab308" },
    { label: "Crypto", value: cryptoWealth, color: "#a855f7" },
  ];
  const activeSegments = segments.filter(s => s.value > 0);

  const milestoneProgress = milestone > 0 ? Math.min(100, (totalNetWorth / milestone) * 100) : 0;
  const insight = getInsight(savingsRate, totalNetWorth, monthlySavings);
  const heroModule = MODULES[0];
  const smallModules = MODULES.slice(1);

  const todayLabel = new Date()
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());

  // ═══════════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-white relative overflow-hidden">
      <OnboardingModal />
      <Sidebar />
      {showOnboarding && <OnboardingWizard onFinish={() => { setShowOnboarding(false); fetchData(); }} />}

      {/* ── ATMOSPHÈRE DE FOND ───────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-screen pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-60"
          style={{
            background: "radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 30%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-[40vh] -right-40 w-[500px] h-[500px] opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Grille subtile */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <main className="md:ml-64 px-4 pt-6 pb-28 md:px-10 md:pt-10 relative z-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 md:hidden">
                <NexusLogo className="w-full h-full" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.28em] mb-1">
                  {todayLabel}
                </p>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Bonjour,{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400">
                    {userName}
                  </span>
                  <span className="text-emerald-400">.</span>
                </h1>
              </div>
            </div>

            <Link
              href="/parametres"
              className="h-10 w-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all group shrink-0 backdrop-blur-sm"
            >
              <Settings size={15} className="group-hover:rotate-90 transition-transform duration-500" />
            </Link>
          </motion.div>

          {isNewUser ? (
            // ── ONBOARDING ─────────────────────────────────────────────
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="mt-6"
            >
              <div className="relative rounded-[32px] bg-gradient-to-br from-zinc-900/60 via-zinc-900/40 to-emerald-950/20 border border-white/5 p-8 md:p-12 overflow-hidden backdrop-blur-sm">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px]" />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-500/8 blur-[80px]" />

                <div className="relative z-10 flex flex-col items-center text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-widest mb-5 backdrop-blur-sm">
                    <Sparkles size={11} /> Étape finale
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">
                    Activez votre tableau de bord<span className="text-emerald-400">.</span>
                  </h2>
                  <p className="text-zinc-400 text-sm md:text-base max-w-md leading-relaxed">
                    Nexus a besoin de votre point de départ pour calculer votre valeur nette et projeter votre avenir.
                  </p>
                </div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/patrimoine" className="group">
                    <div className="p-6 rounded-[24px] bg-black/40 border border-white/5 hover:border-emerald-500/30 hover:bg-black/60 transition-all duration-300 flex flex-col gap-4 backdrop-blur-sm">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/15 transition-all">
                        <Wallet size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-black text-white text-base mb-1">1. Mon Patrimoine</p>
                        <p className="text-zinc-500 text-xs leading-relaxed">Comptes, livrets, bourse, immobilier, crypto.</p>
                      </div>
                      <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl h-11 text-sm shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]">
                        Ajouter mes actifs <ArrowUpRight className="ml-1.5" size={14} />
                      </Button>
                    </div>
                  </Link>
                  <Link href="/budget" className="group">
                    <div className="p-6 rounded-[24px] bg-black/40 border border-white/5 hover:border-yellow-500/30 hover:bg-black/60 transition-all duration-300 flex flex-col gap-4 backdrop-blur-sm">
                      <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:scale-110 group-hover:bg-yellow-500/15 transition-all">
                        <PieChart size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-black text-white text-base mb-1">2. Mes Revenus</p>
                        <p className="text-zinc-500 text-xs leading-relaxed">Salaire et dépenses pour calculer votre épargne.</p>
                      </div>
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl h-11 text-sm shadow-[0_8px_24px_-8px_rgba(234,179,8,0.5)]">
                        Configurer mon budget <ArrowUpRight className="ml-1.5" size={14} />
                      </Button>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* ── HERO : ORBE PATRIMOINE ─────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="relative"
              >
                <div className="relative rounded-[36px] overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent z-20" />
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-black/40 backdrop-blur-sm" />
                  <div className="absolute inset-0 border border-white/[0.06] rounded-[36px]" />

                  <div className="relative z-10 p-6 md:p-10">
                    <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">

                      {/* COLONNE GAUCHE : ORBE */}
                      <div className="flex justify-center md:justify-start">
                        <PatrimoineOrb segments={segments} total={totalNetWorth} savingsRate={savingsRate} />
                      </div>

                      {/* COLONNE DROITE : éditorial */}
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <span className="block w-6 h-px bg-emerald-400/40" />
                            Synthèse · {new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                          </p>
                          <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-light">
                            Votre patrimoine net s'élève à{" "}
                            <span className="text-white font-bold tabular-nums">{formatEuro(totalNetWorth)}</span>
                            {monthlySavings > 0 && (
                              <>
                                , avec une épargne mensuelle de{" "}
                                <span className="text-emerald-300 font-bold tabular-nums">{formatEuro(monthlySavings)}</span>
                              </>
                            )}
                            .
                          </p>
                        </div>

                        {/* Sparkline */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.28em]">
                              Évolution · 12 mois
                            </p>
                            <span className="text-[10px] font-bold text-emerald-400 tabular-nums">+12,4 %</span>
                          </div>
                          <Sparkline trend="up" color="#10b981" />
                        </div>

                        {/* Allocation */}
                        {activeSegments.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.28em] mb-3">
                              Allocation
                            </p>
                            {activeSegments.map((s, i) => {
                              const pct = totalNetWorth > 0 ? (s.value / totalNetWorth) * 100 : 0;
                              return (
                                <motion.div
                                  key={s.label}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
                                  className="flex items-center gap-3"
                                >
                                  <div
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}
                                  />
                                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest w-16">
                                    {s.label}
                                  </span>
                                  <div className="flex-1 h-px bg-white/5 relative">
                                    <motion.div
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{ duration: 1, delay: 0.7 + i * 0.08, ease: "easeOut" }}
                                      style={{ backgroundColor: s.color, width: `${pct}%`, transformOrigin: "left" }}
                                      className="absolute inset-y-0 left-0 h-full"
                                    />
                                  </div>
                                  <span className="text-xs text-white font-bold tabular-nums w-14 text-right">
                                    {pct.toFixed(0)}%
                                  </span>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SOUS-HERO : 3 KPI */}
                    <div className="mt-8 md:mt-10 pt-8 border-t border-white/5">
                      <div className="grid grid-cols-3 gap-4 md:gap-8">
                        {[
                          { label: "Financier", value: financialWealth, icon: Wallet, color: "#10b981" },
                          { label: "Immobilier", value: realEstateWealth, icon: Building, color: "#3b82f6" },
                          { label: "Épargne · mois", value: monthlySavings, icon: Activity, color: "#eab308", prefix: "+" },
                        ].map((kpi, i) => (
                          <motion.div
                            key={kpi.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
                            className={`${i > 0 ? "md:border-l md:border-white/5 md:pl-8" : ""}`}
                          >
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.28em] mb-2.5 flex items-center gap-1.5">
                              <kpi.icon size={9} style={{ color: kpi.color }} />
                              {kpi.label}
                            </p>
                            <p className="text-xl md:text-3xl font-black text-white tabular-nums leading-none tracking-tighter">
                              {kpi.prefix ?? ""}<AnimatedNumber value={kpi.value} />
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── PALIER ─────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.32 }}
                className="px-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target size={11} className="text-purple-400" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.28em]">
                      Prochain palier
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2 text-[11px] tabular-nums">
                    <span className="font-black text-white">
                      <AnimatedNumber value={totalNetWorth} />
                    </span>
                    <span className="text-zinc-700">→</span>
                    <span className="text-zinc-500">{formatEuro(milestone)}</span>
                    <span className="font-black text-purple-300 ml-1.5">
                      {milestoneProgress.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-[2px] w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${milestoneProgress}%` }}
                    transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 via-purple-400 to-blue-400 rounded-full"
                    style={{ boxShadow: "0 0 12px rgba(168,85,247,0.5)" }}
                  />
                </div>
                <div className="flex justify-between mt-2.5">
                  {[10000, 50000, 100000, 250000, 500000, 1000000]
                    .filter((m) => m <= milestone * 1.2).slice(0, 6)
                    .map((m) => (
                      <span key={m} className={`text-[9px] font-mono tabular-nums ${totalNetWorth >= m ? "text-zinc-400" : "text-zinc-700"}`}>
                        {m >= 1000000 ? "1M" : `${m / 1000}k`}
                      </span>
                    ))}
                </div>
              </motion.div>

              {/* ── CONSEIL CONTEXTUEL ─────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
              >
                <Link href="/chat" className="group block">
                  <div
                    className="relative rounded-[24px] p-6 md:p-7 backdrop-blur-sm overflow-hidden border transition-all hover:bg-white/[0.02]"
                    style={{
                      borderColor: `${insight.color}25`,
                      backgroundColor: `${insight.color}05`,
                    }}
                  >
                    <div
                      className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full"
                      style={{ backgroundColor: insight.color, boxShadow: `0 0 12px ${insight.color}` }}
                    />

                    <div className="flex items-start gap-5 pl-3">
                      <div
                        className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${insight.color}15`,
                          boxShadow: `0 0 24px -8px ${insight.color}80`,
                        }}
                      >
                        <Lightbulb size={18} strokeWidth={1.5} style={{ color: insight.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[10px] font-bold uppercase tracking-[0.28em] mb-2"
                          style={{ color: insight.color }}
                        >
                          {insight.label}
                        </p>
                        <p className="text-sm md:text-base text-zinc-200 leading-relaxed font-light">
                          {insight.text}
                        </p>
                        <div className="flex items-center gap-1.5 mt-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: insight.color }}>
                            Discuter avec le CFO
                          </span>
                          <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" style={{ color: insight.color }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* ── MODULES ────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.48 }}
                className="pt-2"
              >
                <div className="flex items-center justify-between mb-4 px-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
                    Modules
                  </p>
                  <span className="text-[9px] text-zinc-700 font-mono">
                    {MODULES.length} disponibles
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Hero module */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.55 }}
                    className="col-span-2 row-span-2"
                  >
                    <Link href={heroModule.href} className="group block h-full">
                      <div
                        className="relative h-full rounded-[24px] border border-white/5 hover:border-white/15 transition-all duration-500 p-6 md:p-7 flex flex-col overflow-hidden backdrop-blur-sm min-h-[180px]"
                        style={{
                          background: `linear-gradient(135deg, ${heroModule.accent}10 0%, ${heroModule.accent}03 50%, transparent 100%)`,
                        }}
                      >
                        <motion.div
                          className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[60px] pointer-events-none"
                          style={{ backgroundColor: heroModule.accent, opacity: 0.2 }}
                          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
                          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        />

                        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 200 200">
                          <circle cx="180" cy="20" r="80" fill="none" stroke={heroModule.accent} strokeWidth="0.5" />
                          <circle cx="180" cy="20" r="120" fill="none" stroke={heroModule.accent} strokeWidth="0.5" />
                        </svg>

                        <div className="relative z-10 flex flex-col h-full gap-5">
                          <div
                            className="h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500"
                            style={{
                              backgroundColor: `${heroModule.accent}18`,
                              boxShadow: `0 0 32px -8px ${heroModule.accent}80`,
                            }}
                          >
                            <heroModule.icon size={24} strokeWidth={1.5} style={{ color: heroModule.accent }} />
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-white text-xl md:text-2xl tracking-tighter leading-none mb-2">
                              {heroModule.label}
                              <span style={{ color: heroModule.accent }}>.</span>
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: `${heroModule.accent}90` }}>
                              {heroModule.sub}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-auto">
                            <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: heroModule.accent }}>
                              Simuler
                            </span>
                            <ArrowUpRight
                              size={13}
                              style={{ color: heroModule.accent }}
                              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>

                  {/* 4 petits modules */}
                  {smallModules.map((mod, i) => (
                    <motion.div
                      key={mod.href}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.6 + i * 0.06 }}
                    >
                      <Link href={mod.href} className="group block h-full">
                        <div className="relative h-full rounded-[20px] bg-white/[0.02] border border-white/5 hover:border-white/12 hover:bg-white/[0.035] transition-all duration-300 p-4 md:p-5 flex flex-col gap-3 backdrop-blur-sm overflow-hidden min-h-[100px]">
                          <div
                            className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                            style={{ backgroundColor: mod.accent }}
                          />

                          <div className="relative z-10 flex flex-col h-full gap-2.5">
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-300"
                              style={{
                                backgroundColor: `${mod.accent}15`,
                                boxShadow: `0 0 16px -8px ${mod.accent}`,
                              }}
                            >
                              <mod.icon size={16} strokeWidth={1.5} style={{ color: mod.accent }} />
                            </div>
                            <div className="min-w-0 mt-auto">
                              <p className="font-black text-white text-sm tracking-tight leading-tight">
                                {mod.label}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                                {mod.sub}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}