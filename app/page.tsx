"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  Lock, 
  Building, 
  PieChart, 
  Calculator, 
  Activity
} from "lucide-react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";

// --- LOGIQUE PALIERS DYNAMIQUES ---
const getNextMilestone = (current: number) => {
  if (current < 10000) return 10000;
  if (current < 50000) return 50000;
  if (current < 100000) return 100000;
  if (current < 250000) return 250000;
  if (current < 500000) return 500000;
  if (current < 1000000) return 1000000;
  return Math.ceil((current + 1) / 1000000) * 1000000;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Investisseur");
  
  // Données
  const [financialWealth, setFinancialWealth] = useState(0);
  const [realEstateWealth, setRealEstateWealth] = useState(0);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  const [milestone, setMilestone] = useState(10000);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        if (session.user.user_metadata?.full_name) {
            setUserName(session.user.user_metadata.full_name.split(' ')[0]);
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('assets_json, budget_json')
          .eq('id', session.user.id)
          .single();

        if (profile) {
            // CALCUL PATRIMOINE
            let financial = 0;
            let realEstate = 0;

            if (Array.isArray(profile.assets_json)) {
                profile.assets_json.forEach((asset: any) => {
                    if (asset.type === "Immobilier") {
                        realEstate += asset.value;
                    } else {
                        financial += asset.value;
                    }
                });
            }
            
            const total = financial + realEstate;
            setFinancialWealth(financial);
            setRealEstateWealth(realEstate);
            setTotalNetWorth(total);
            setMilestone(getNextMilestone(total));

            // CALCUL BUDGET
            if (profile.budget_json) {
                const b = profile.budget_json as any;
                const income = Number(b.income) || 0;
                let expenses = Number(b.expenses) || 0;
                if (expenses === 0 && Array.isArray(b.details)) {
                    expenses = b.details.reduce((acc: number, item: any) => acc + item.amount, 0);
                }
                const savings = Math.max(0, income - expenses);
                setMonthlySavings(savings);
                setSavingsRate(income > 0 ? (savings / income) * 100 : 0);
            }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-24 md:pb-8">
      <Sidebar />
      
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="max-w-[1600px] mx-auto space-y-8"
        >
          
          {/* HEADER */}
          <header className="flex justify-between items-end">
            <div>
                <p className="text-zinc-400 text-sm uppercase font-bold tracking-wider mb-1">Vue d'ensemble</p>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    Bon retour, <span className="text-emerald-500">{userName}</span>
                </h1>
            </div>
            <div className="hidden md:block text-right">
                <p className="text-xs text-zinc-500 font-bold uppercase">Patrimoine Brut Total</p>
                {/* CORRECTION : Suppression du € manuel */}
                <p className="text-2xl font-black text-white"><AnimatedNumber value={totalNetWorth}/></p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CARTE 1 : FINANCIER */}
            <Link href="/patrimoine" className="group">
                <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-8 h-full transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs tracking-widest">
                                <Wallet size={16}/> Patrimoine Financier
                            </div>
                            <ArrowUpRight className="text-zinc-600 group-hover:text-white transition-colors" size={20}/>
                        </div>
                        <div>
                            {/* CORRECTION : Suppression du € manuel */}
                            <div className="text-5xl font-black text-white tracking-tighter mb-2">
                                <AnimatedNumber value={financialWealth} />
                            </div>
                            <p className="text-zinc-400 text-sm">Bourse, Crypto, Cash. <span className="text-zinc-500">(Disponible)</span></p>
                        </div>
                    </div>
                </div>
            </Link>

            {/* CARTE 2 : IMMOBILIER */}
            <Link href="/patrimoine" className="group">
                <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-8 h-full transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[80px] rounded-full group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 text-blue-400 font-bold uppercase text-xs tracking-widest">
                                <Building size={16}/> Immobilier (Brut)
                            </div>
                            <ArrowUpRight className="text-zinc-600 group-hover:text-white transition-colors" size={20}/>
                        </div>
                        <div>
                            {/* CORRECTION : Suppression du € manuel */}
                            <div className="text-5xl font-black text-white tracking-tighter mb-2">
                                <AnimatedNumber value={realEstateWealth} />
                            </div>
                            <p className="text-zinc-400 text-sm">Résidence principale & Investissements.</p>
                        </div>
                    </div>
                </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* EPARGNE MENSUELLE */}
            <Link href="/budget" className="group md:col-span-1">
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/50 transition-colors h-full flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><Activity size={14}/> Épargne Mensuelle</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${savingsRate >= 20 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {savingsRate.toFixed(0)}% Taux
                        </span>
                    </div>
                    {/* CORRECTION : Suppression du € manuel */}
                    <p className="text-3xl font-black text-white">+<AnimatedNumber value={monthlySavings}/><span className="text-lg text-zinc-500 font-normal"> /mois</span></p>
                </div>
            </Link>

            {/* OBJECTIF DYNAMIQUE */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-xs font-bold text-emerald-500 uppercase mb-1">Prochain Cap</p>
                        {/* CORRECTION : Suppression du € manuel */}
                        <p className="text-2xl font-black text-white">Objectif <AnimatedNumber value={milestone}/></p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-500">{((totalNetWorth / milestone) * 100).toFixed(1)}%</p>
                    </div>
                </div>
                <div className="h-4 w-full bg-black rounded-full overflow-hidden border border-zinc-800">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${Math.min(100, (totalNetWorth / milestone) * 100)}%` }} 
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    />
                </div>
                {/* CORRECTION : Suppression du € manuel */}
                <p className="text-xs text-zinc-500 mt-3 text-center">
                    Encore <strong><AnimatedNumber value={milestone - totalNetWorth}/></strong> pour atteindre ce palier symbolique.
                </p>
            </div>
          </div>

          {/* ACCES RAPIDE */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Accès Rapide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/projection" className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp size={20}/></div>
                    <div><p className="font-bold text-white text-sm">Projection</p><p className="text-xs text-zinc-500">Futur & Intérêts</p></div>
                </Link>
                <Link href="/simulateur" className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Calculator size={20}/></div>
                    <div><p className="font-bold text-white text-sm">Simulateur Immo</p><p className="text-xs text-zinc-500">Rentabilité</p></div>
                </Link>
                <Link href="/budget" className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center group-hover:scale-110 transition-transform"><PieChart size={20}/></div>
                    <div><p className="font-bold text-white text-sm">Mon Budget</p><p className="text-xs text-zinc-500">Flux mensuels</p></div>
                </Link>
                <div className="relative p-4 rounded-2xl bg-black border border-zinc-800 opacity-60 cursor-not-allowed flex items-center gap-4 overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="h-12 w-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center"><Lock size={20}/></div>
                    <div><p className="font-bold text-zinc-400 text-sm">Analyse IA 2.0</p><p className="text-xs text-zinc-600">Bientôt (Pro)</p></div>
                </div>
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}