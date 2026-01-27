"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import OnboardingWizard from "@/components/OnboardingWizard";
// SUPPRIMÉ : import QuickBudgetWizard ... (Plus besoin)
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { 
  ShieldCheck, Wallet, TrendingUp, ArrowUpRight, 
  Activity, Target, Lock
} from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";

// --- COMPOSANT COMPTEUR (Animation Premium) ---
const Counter = ({ value, currency = true }: { value: number, currency?: boolean }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    } else {
      motionValue.set(0);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (currency) {
        setDisplayValue(new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(latest));
      } else {
        setDisplayValue(latest.toFixed(0));
      }
    });
  }, [springValue, currency]);

  return <span ref={ref}>{displayValue}</span>;
};

// --- TYPES ---
type Asset = { id: string; name: string; value: number; type: string };

export default function Dashboard() {
  const [netWorth, setNetWorth] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  const [monthlyCashflow, setMonthlyCashflow] = useState(0);
  const [userName, setUserName] = useState("Investisseur");
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // Wizards
  const [showOnboarding, setShowOnboarding] = useState(false);
  // SUPPRIMÉ : const [showBudgetWizard... (Plus besoin)

  useEffect(() => {
    try {
        const savedProfile = localStorage.getItem("userProfile");
        if (!savedProfile) { setShowOnboarding(true); return; }

        const p = JSON.parse(savedProfile);
        if (p.identity?.firstName) setUserName(p.identity.firstName);

        // PATRIMOINE
        const savedAssets = localStorage.getItem("myAssets");
        let currentAssets: Asset[] = [];
        if (savedAssets) currentAssets = JSON.parse(savedAssets);
        
        setAssets(currentAssets);
        const total = currentAssets.reduce((acc: number, item: Asset) => acc + (item.value || 0), 0);
        setNetWorth(total);

        // BUDGET
        const savedBudget = localStorage.getItem("myBudget");
        if (savedBudget) {
            const b = JSON.parse(savedBudget);
            const inc = b.income || 0;
            let exp = 0;
            if (Array.isArray(b.expenses)) exp = b.expenses.reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
            else exp = b.expenses || 0;
            
            setMonthlyCashflow(inc - exp);
            setSavingsRate(inc > 0 ? (Math.max(0, inc - exp) / inc) * 100 : 0);
        }

    } catch (e) { console.error("Erreur Dashboard", e); }
  }, []);

  const handleOnboardingFinish = () => {
    setShowOnboarding(false);
    window.location.reload();
  };

  const assetDistribution = [
      { type: "Immobilier", color: "bg-blue-500", value: assets.filter(a => a.type.includes("Immo")).reduce((acc, i) => acc + i.value, 0) },
      { type: "Bourse", color: "bg-emerald-500", value: assets.filter(a => a.type === "Bourse").reduce((acc, i) => acc + i.value, 0) },
      { type: "Crypto", color: "bg-purple-500", value: assets.filter(a => a.type === "Crypto").reduce((acc, i) => acc + i.value, 0) },
      { type: "Cash", color: "bg-amber-500", value: assets.filter(a => a.type.includes("Cash")).reduce((acc, i) => acc + i.value, 0) },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {showOnboarding && <OnboardingWizard onFinish={handleOnboardingFinish} />}
      
      {/* SUPPRIMÉ : <QuickBudgetWizard ... /> (C'est cette ligne qui causait l'erreur isOpen) */}

      <Sidebar />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="space-y-6"
        >
          
          {/* HEADER MINIMALISTE */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium mb-1">Vue d'ensemble</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Bon retour, <span className="text-zinc-400">{userName}</span>
              </h1>
            </div>
            
            <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <Activity size={18} />
            </div>
          </div>

          {/* GRILLE BENTO (Layout Premium) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            
            {/* 1. CARTE PRINCIPALE : NET WORTH */}
            <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800/60 p-8 shadow-2xl flex flex-col justify-between min-h-[260px] group">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/15 transition-all duration-700 pointer-events-none"></div>
                
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                            <ShieldCheck size={18} />
                        </div>
                        <span className="text-emerald-500 font-medium text-sm tracking-wide">Patrimoine Net</span>
                    </div>
                    <div className="text-5xl md:text-7xl font-bold text-white tracking-tighter">
                        <Counter value={netWorth} />
                    </div>
                </div>

                <div className="relative z-10 mt-8">
                    <div className="flex justify-between text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wider">
                        <span>Allocation d'actifs</span>
                        <span>100%</span>
                    </div>
                    <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-zinc-800/50">
                        {assetDistribution.length > 0 ? (
                            assetDistribution.map((a, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(a.value / netWorth) * 100}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className={`h-full ${a.color}`} 
                                />
                            ))
                        ) : (
                            <div className="w-full bg-zinc-800 h-full" />
                        )}
                    </div>
                    <div className="flex gap-4 mt-3">
                        {assetDistribution.map((a, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${a.color}`} />
                                <span className="text-xs text-zinc-500">{a.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. SIDE CARDS */}
            <div className="space-y-4 md:space-y-6">
                
                <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800 p-6 flex flex-col justify-center h-[140px] relative overflow-hidden">
                     <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full"></div>
                     <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Flux Mensuel (Est.)</p>
                     <div className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-1">
                        {monthlyCashflow > 0 ? "+" : ""}<Counter value={monthlyCashflow} />
                        <span className="text-sm font-normal text-zinc-500">/mois</span>
                     </div>
                </div>

                <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800 p-6 flex flex-col justify-center h-[140px] relative overflow-hidden">
                     <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 blur-3xl rounded-full"></div>
                     <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Taux d'Épargne</p>
                     <div className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-1">
                        <Counter value={savingsRate} currency={false} />
                        <span className="text-lg text-zinc-500">%</span>
                     </div>
                     <div className="w-full bg-zinc-800 h-1 mt-3 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${savingsRate}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full bg-purple-500"
                        />
                     </div>
                </div>

            </div>

          </div>

          {/* 3. SECTION OBJECTIFS & ACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              
              <div className="p-[1px] rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-950">
                <div className="bg-black/90 backdrop-blur-sm rounded-[23px] p-6 h-full flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <Target className="text-red-500" size={20} />
                            <span className="text-white font-bold">Prochain Cap</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-500">100K CLUB</span>
                    </div>
                    
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl font-bold text-white">100 000 €</span>
                        <span className="text-sm text-zinc-500 mb-1">objectif</span>
                    </div>
                    
                    <Progress value={Math.min(100, (netWorth / 100000) * 100)} className="h-2 bg-zinc-800" indicatorClassName="bg-gradient-to-r from-red-600 to-orange-500"/>
                    <p className="text-right text-xs text-zinc-500 mt-2">
                        {((netWorth / 100000) * 100).toFixed(1)}% atteint
                    </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <Link href="/patrimoine" className="group flex flex-col items-center justify-center p-6 rounded-3xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform mb-3">
                          <Wallet size={24} />
                      </div>
                      <span className="text-sm font-medium text-white">Mes Actifs</span>
                  </Link>
                  
                  <Link href="/simulateur" className="group flex flex-col items-center justify-center p-6 rounded-3xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform mb-3">
                          <TrendingUp size={24} />
                      </div>
                      <span className="text-sm font-medium text-white">Projection</span>
                  </Link>
              </div>

          </div>

          {/* 4. BANNIÈRE PRO */}
          <div className="w-full p-6 rounded-3xl border border-zinc-800/50 bg-gradient-to-r from-zinc-900/50 to-zinc-950 flex items-center justify-between opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-not-allowed">
              <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Lock size={18} className="text-zinc-500" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-white">Analyse IA détaillée</h3>
                      <p className="text-xs text-zinc-500">Disponible dans la version Pro.</p>
                  </div>
              </div>
              <ArrowUpRight size={18} className="text-zinc-600" />
          </div>

        </motion.div>
      </main>
    </div>
  );
}