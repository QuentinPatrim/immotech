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

// Génère un conseil contextuel selon le taux d'épargne
const getInsight = (savingsRate: number, totalNetWorth: number, monthlySavings: number) => {
  if (savingsRate >= 50) return {
    label: "Excellent taux d'épargne",
    text: `Avec ${savingsRate.toFixed(0)}% d'épargne, vous faites partie des 5% les plus performants. Pensez à diversifier vers le PEA ou l'assurance-vie.`,
    color: "#10b981",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
  };
  if (savingsRate >= 30) return {
    label: "Très bonne capacité d'épargne",
    text: `${formatEuro(monthlySavings)}/mois investis régulièrement pendant 10 ans = patrimoine considérable grâce aux intérêts composés.`,
    color: "#3b82f6",
    bg: "bg-blue-500/8",
    border: "border-blue-500/15",
  };
  if (savingsRate >= 15) return {
    label: "Taux d'épargne correct",
    text: `L'objectif recommandé est 20%. Identifier 2-3 postes de dépenses à réduire pourrait vous faire économiser ${formatEuro(monthlySavings * 0.3)} de plus par mois.`,
    color: "#eab308",
    bg: "bg-yellow-500/8",
    border: "border-yellow-500/15",
  };
  if (totalNetWorth > 0) return {
    label: "Optimisez votre budget",
    text: "Votre patrimoine est constitué — concentrez-vous maintenant sur votre flux mensuel. La règle 50/30/20 peut vous aider à structurer vos dépenses.",
    color: "#f97316",
    bg: "bg-orange-500/8",
    border: "border-orange-500/15",
  };
  return {
    label: "Commencez à investir",
    text: "Même 50€/mois investis dès maintenant changent radicalement la trajectoire de votre patrimoine sur 20 ans.",
    color: "#a855f7",
    bg: "bg-purple-500/8",
    border: "border-purple-500/15",
  };
};

// ─── Barre segmentée ──────────────────────────────────────────────────────────

type Segment = { label: string; value: number; color: string };

function AllocationBar({ segments, total }: { segments: Segment[]; total: number }) {
  const active = segments.filter((s) => s.value > 0);
  if (active.length === 0 || total === 0) return null;
  return (
    <div className="w-full">
      <div className="flex gap-px mb-2">
        {active.map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <div key={s.label} style={{ width: `${pct}%` }} className="overflow-hidden shrink-0">
              {pct > 8 && (
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-[11px] font-black text-white tabular-nums">{pct.toFixed(0)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex h-1 w-full rounded-full overflow-hidden gap-px">
        {active.map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <motion.div
              key={s.label}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.45 }}
              style={{ width: `${pct}%`, backgroundColor: s.color, transformOrigin: "left" }}
              className="h-full rounded-sm"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {active.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{s.label}</span>
            <span className="text-[10px] text-zinc-600 tabular-nums">{formatEuro(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
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

// ─── Composant principal ──────────────────────────────────────────────────────

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

  const milestoneProgress = milestone > 0 ? Math.min(100, (totalNetWorth / milestone) * 100) : 0;
  const insight = getInsight(savingsRate, totalNetWorth, monthlySavings);
  const heroModule = MODULES[0];
  const smallModules = MODULES.slice(1);

  const todayLabel = new Date()
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-white">
      <OnboardingModal />
      <Sidebar />
      {showOnboarding && <OnboardingWizard onFinish={() => { setShowOnboarding(false); fetchData(); }} />}

      <div className="fixed top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-emerald-950/15 to-transparent pointer-events-none z-0" />

      <main className="md:ml-64 px-4 pt-6 pb-28 md:px-10 md:pt-10 relative z-10">
        <div className="space-y-4">

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center justify-between"
          >
            {/* Gauche : logo + greeting fusionnés — adaptatif mobile/desktop */}
            <div className="flex items-center gap-3">
              {/* Logo visible sur mobile uniquement */}
              <div className="w-8 h-8 shrink-0 md:hidden">
                <NexusLogo className="w-full h-full" />
              </div>
              <div>
                {/* Desktop */}
                <p className="hidden md:block text-[10px] text-zinc-700 font-mono uppercase tracking-[0.22em] mb-0.5">
                  {todayLabel}
                </p>
                <h1 className="hidden md:block text-2xl font-black text-white tracking-tighter">
                  Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{userName}</span>
                </h1>
                {/* Mobile */}
                <p className="md:hidden text-sm text-zinc-400">
                  Bonjour <span className="text-white font-black">{userName}</span>
                </p>
              </div>
            </div>

            {/* Settings */}
            <Link
              href="/parametres"
              className="h-10 w-10 rounded-2xl bg-zinc-900/70 border border-white/5 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-zinc-800/80 transition-all group shrink-0"
            >
              <Settings size={15} className="group-hover:rotate-90 transition-transform duration-500" />
            </Link>
          </motion.div>

          {isNewUser ? (
            /* ── ONBOARDING ──────────────────────────────────────────────── */
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="mt-6"
            >
              <div className="bg-zinc-900/50 border border-white/5 rounded-[28px] p-8 md:p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-5">
                    <Sparkles size={11} /> Étape finale
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">Activez votre tableau de bord.</h2>
                  <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
                    Nexus a besoin de votre point de départ pour calculer votre valeur nette et projeter votre avenir.
                  </p>
                </div>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/patrimoine" className="group">
                    <div className="p-6 rounded-[20px] bg-black/40 border border-white/5 hover:border-emerald-500/25 transition-all duration-300 flex flex-col gap-4">
                      <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Wallet size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm mb-1">1. Mon Patrimoine</p>
                        <p className="text-zinc-500 text-xs leading-relaxed">Comptes, livrets, bourse, immobilier, crypto.</p>
                      </div>
                      <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl h-10 text-sm">
                        Ajouter mes actifs <ArrowUpRight className="ml-1.5" size={14} />
                      </Button>
                    </div>
                  </Link>
                  <Link href="/budget" className="group">
                    <div className="p-6 rounded-[20px] bg-black/40 border border-white/5 hover:border-yellow-500/25 transition-all duration-300 flex flex-col gap-4">
                      <div className="h-11 w-11 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                        <PieChart size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm mb-1">2. Mes Revenus</p>
                        <p className="text-zinc-500 text-xs leading-relaxed">Salaire et dépenses pour calculer votre épargne.</p>
                      </div>
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl h-10 text-sm">
                        Configurer mon budget <ArrowUpRight className="ml-1.5" size={14} />
                      </Button>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* ── HERO : PATRIMOINE NET ─────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              >
                <div className="rounded-[28px] bg-zinc-900/50 border border-white/5 overflow-hidden">
                  <div className="h-px w-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-blue-500/20" />
                  <div className="p-6 md:p-8">
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
                        Patrimoine Net Total
                      </p>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ backgroundColor: "#10b98108", borderColor: "#10b98120" }}>
                        <Activity size={10} className="text-emerald-500" />
                        <span className="text-[11px] font-black text-emerald-400 tabular-nums">+{savingsRate.toFixed(0)}% épargné</span>
                      </div>
                    </div>

                    <div className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter tabular-nums leading-none mb-1">
                      <AnimatedNumber value={totalNetWorth} />
                    </div>
                    <p className="text-[11px] text-zinc-600 font-mono mb-7">
                      Valeur nette · {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </p>

                    <AllocationBar segments={segments} total={totalNetWorth} />

                    <div className="my-6 h-px bg-white/5" />

                    <div className="grid grid-cols-3 gap-2 md:gap-6">
                      {[
                        { label: "Financier", value: financialWealth, icon: Wallet, iconColor: "#10b981" },
                        { label: "Immobilier", value: realEstateWealth, icon: Building, iconColor: "#3b82f6" },
                        { label: "Épargne/mois", value: monthlySavings, icon: Activity, iconColor: "#eab308", prefix: "+" },
                      ].map((kpi) => (
                        <div key={kpi.label}>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1">
                            <kpi.icon size={8} style={{ color: kpi.iconColor }} />
                            {kpi.label}
                          </p>
                          <p className="text-lg md:text-2xl font-black text-white tabular-nums leading-none">
                            {kpi.prefix ?? ""}<AnimatedNumber value={kpi.value} />
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── PALIER ───────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.16 }}
              >
                <div className="rounded-[22px] bg-zinc-900/50 border border-white/5 px-5 py-4 md:px-7 md:py-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target size={11} className="text-purple-400" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.22em]">Prochain palier</p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] tabular-nums">
                      <span className="font-black text-white"><AnimatedNumber value={totalNetWorth} /></span>
                      <span className="text-zinc-800">·</span>
                      <span className="text-zinc-600">{formatEuro(milestone)}</span>
                      <span className="font-black text-purple-400 ml-1">{milestoneProgress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-px w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${milestoneProgress}%` }}
                      transition={{ duration: 1.8, ease: "easeOut", delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    {[10000, 50000, 100000, 250000, 500000, 1000000]
                      .filter((m) => m <= milestone * 1.2).slice(0, 6)
                      .map((m) => (
                        <span key={m} className={`text-[9px] font-mono tabular-nums ${totalNetWorth >= m ? "text-zinc-500" : "text-zinc-800"}`}>
                          {m >= 1000000 ? "1M" : `${m / 1000}k`}
                        </span>
                      ))}
                  </div>
                </div>
              </motion.div>

              {/* ── CONSEIL CONTEXTUEL ───────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              >
                <Link href="/chat" className="group block">
                  <div className={`rounded-[22px] border ${insight.border} ${insight.bg} p-5 flex items-start gap-4 hover:opacity-90 transition-all`}>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${insight.color}18` }}>
                      <Lightbulb size={18} strokeWidth={1.5} style={{ color: insight.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: insight.color }}>
                        {insight.label}
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{insight.text}</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-700 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>

              {/* ── MODULES ──────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.24 }}
              >
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.28em] mb-3 pl-0.5">Accès rapide</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Hero module */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                    className="row-span-2"
                  >
                    <Link href={heroModule.href} className="group block h-full">
                      <div
                        className="h-full rounded-[22px] border border-white/5 hover:border-white/10 transition-all duration-300 p-5 md:p-6 flex flex-col relative overflow-hidden"
                        style={{ backgroundColor: `${heroModule.accent}08` }}
                      >
                        <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-[60px] opacity-25 pointer-events-none" style={{ backgroundColor: heroModule.accent }} />
                        <div className="relative z-10 flex flex-col h-full gap-4">
                          <div className="h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${heroModule.accent}20` }}>
                            <heroModule.icon size={22} strokeWidth={1.5} style={{ color: heroModule.accent }} />
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-white text-base tracking-tight leading-tight mb-1.5">{heroModule.label}</p>
                            <p className="text-xs leading-relaxed" style={{ color: `${heroModule.accent}80` }}>{heroModule.sub}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-auto">
                            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${heroModule.accent}60` }}>Simuler</span>
                            <ArrowUpRight size={12} style={{ color: `${heroModule.accent}60` }} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
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
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.34 + i * 0.05 }}
                    >
                      <Link href={mod.href} className="group block h-full">
                        <div className="h-full rounded-[20px] bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-900/70 transition-all duration-300 p-4 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${mod.accent}15` }}>
                            <mod.icon size={16} strokeWidth={1.5} style={{ color: mod.accent }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-white text-sm tracking-tight leading-tight truncate">{mod.label}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight truncate">{mod.sub}</p>
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