"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, Wallet, ArrowUpRight, Lock, Building, PieChart, Calculator, Activity, Target } from "lucide-react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Sidebar from "@/components/Sidebar"; // <--- SIDEBAR PRÉSENTE
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Investisseur");
  
  // Données
  const [financialWealth, setFinancialWealth] = useState(0);
  const [realEstateWealth, setRealEstateWealth] = useState(0);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  const [milestone, setMilestone] = useState(10000);
  
  // État Onboarding
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { router.push("/login"); return; }

      if (session?.user) {
        if (session.user.user_metadata?.full_name) {
            setUserName(session.user.user_metadata.full_name.split(' ')[0]);
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('assets_json, budget_json')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
            let financial = 0;
            let realEstate = 0;
            let hasAssets = false;

            if (Array.isArray(profile.assets_json) && profile.assets_json.length > 0) {
                hasAssets = true;
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

            let hasBudget = false;
            if (profile.budget_json) {
                const b = profile.budget_json as any;
                const income = Number(b.income) || 0;
                let expenses = Number(b.expenses) || 0;
                if (income > 0 || expenses > 0) hasBudget = true;

                if (expenses === 0 && Array.isArray(b.details)) {
                    expenses = b.details.reduce((acc: number, item: any) => acc + item.amount, 0);
                }
                const savings = Math.max(0, income - expenses);
                setMonthlySavings(savings);
                setSavingsRate(income > 0 ? (savings / income) * 100 : 0);
            }

            if (!hasAssets && !hasBudget) {
                setIsNewUser(true);
            }
        } else {
            setIsNewUser(true);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  if (loading) return <div className="min-h-screen bg-[#050505]" />;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* 1. LA SIDEBAR EST ICI */}
      <Sidebar />

      {/* 2. LA MARGE md:ml-64 EST ICI */}
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        {/* AMBIENT GLOWS */}
        <div className="fixed top-0 left-64 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="max-w-[1800px] mx-auto space-y-12 relative z-10"
        >
          
          {/* HEADER PREMIUM */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-l-4 border-emerald-500 pl-6 py-2">
            <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">VUE D'ENSEMBLE</p>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">
                    Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">{userName}</span>
                </h1>
            </div>
            {!isNewUser && (
                <div className="bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-xl">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Wallet size={12} className="text-emerald-500"/> Patrimoine Net
                    </p>
                    <div className="text-3xl font-black text-white tracking-tight">
                        <AnimatedNumber value={totalNetWorth}/> {/* SANS DOUBLE € */}
                    </div>
                </div>
            )}
          </header>

          {/* ... Le reste est identique, avec les € en trop supprimés ... */}
          {/* Je remets le bloc complet pour être sûr */}
          {isNewUser ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                  <Link href="/patrimoine" className="group">
                      <div className="h-full p-12 rounded-[32px] bg-zinc-900/40 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl">
                          <div className="absolute top-0 right-0 p-40 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
                          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                              <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                  <Wallet size={40} />
                              </div>
                              <div>
                                  <h2 className="text-3xl font-black text-white uppercase tracking-wide mb-2">1. Initialisation</h2>
                                  <p className="text-zinc-400 text-sm max-w-xs mx-auto font-light">Connectez vos actifs (Comptes, Immo, Crypto) pour calibrer le moteur Nexus.</p>
                              </div>
                              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full px-10 py-6 text-lg shadow-lg shadow-emerald-500/20">
                                  Ajouter des actifs <ArrowUpRight className="ml-2" size={20}/>
                              </Button>
                          </div>
                      </div>
                  </Link>

                  <Link href="/budget" className="group">
                      <div className="h-full p-12 rounded-[32px] bg-zinc-900/40 border border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl">
                          <div className="absolute top-0 right-0 p-40 bg-yellow-500/5 blur-[80px] rounded-full group-hover:bg-yellow-500/10 transition-all"></div>
                          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                              <div className="h-24 w-24 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                  <PieChart size={40} />
                              </div>
                              <div>
                                  <h2 className="text-3xl font-black text-white uppercase tracking-wide mb-2">2. Calibration Flux</h2>
                                  <p className="text-zinc-400 text-sm max-w-xs mx-auto font-light">Définissez vos revenus et dépenses pour calculer votre capacité d'investissement réelle.</p>
                              </div>
                              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full px-10 py-6 text-lg shadow-lg shadow-yellow-500/20">
                                  Configurer Budget <ArrowUpRight className="ml-2" size={20}/>
                              </Button>
                          </div>
                      </div>
                  </Link>
              </div>
          ) : (
            /* --- DASHBOARD ACTIF --- */
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* CARTE FINANCIER */}
                <Link href="/patrimoine" className="group h-full">
                    <div className="relative overflow-hidden rounded-[40px] border border-white/5 bg-zinc-900/40 backdrop-blur-md p-10 h-full transition-all duration-500 hover:border-emerald-500/30 hover:bg-zinc-900/60 shadow-2xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-500"></div>
                        
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                            <div className="flex justify-between items-start mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform"><Wallet size={24}/></div>
                                    <div>
                                        <span className="text-white font-black text-xl tracking-wide uppercase block">Financier</span>
                                        <span className="text-xs text-zinc-500 font-mono">LIQUIDITÉ & BOURSE</span>
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:border-white/30 transition-colors"><ArrowUpRight size={18}/></div>
                            </div>
                            <div>
                                <div className="text-6xl lg:text-7xl font-black text-white tracking-tighter mb-3 group-hover:translate-x-2 transition-transform">
                                    <AnimatedNumber value={financialWealth} /> {/* SANS DOUBLE € */}
                                </div>
                                <div className="h-1 w-24 bg-emerald-500 rounded-full group-hover:w-full transition-all duration-700 ease-out"></div>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* CARTE IMMOBILIER */}
                <Link href="/patrimoine" className="group h-full">
                    <div className="relative overflow-hidden rounded-[40px] border border-white/5 bg-zinc-900/40 backdrop-blur-md p-10 h-full transition-all duration-500 hover:border-blue-500/30 hover:bg-zinc-900/60 shadow-2xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[100px] rounded-full group-hover:bg-blue-500/10 transition-all duration-500"></div>
                        
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                            <div className="flex justify-between items-start mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:scale-110 transition-transform"><Building size={24}/></div>
                                    <div>
                                        <span className="text-white font-black text-xl tracking-wide uppercase block">Immobilier</span>
                                        <span className="text-xs text-zinc-500 font-mono">PIERRE & SCPI</span>
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:border-white/30 transition-colors"><ArrowUpRight size={18}/></div>
                            </div>
                            <div>
                                <div className="text-6xl lg:text-7xl font-black text-white tracking-tighter mb-3 group-hover:translate-x-2 transition-transform">
                                    <AnimatedNumber value={realEstateWealth} /> {/* SANS DOUBLE € */}
                                </div>
                                <div className="h-1 w-24 bg-blue-500 rounded-full group-hover:w-full transition-all duration-700 ease-out"></div>
                            </div>
                        </div>
                    </div>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* CARTE EPARGNE */}
                <Link href="/budget" className="group md:col-span-1">
                    <div className="p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 hover:border-yellow-500/30 transition-all h-full flex flex-col justify-center relative overflow-hidden shadow-xl">
                        <div className="absolute bottom-0 right-0 p-24 bg-yellow-500/5 blur-[60px] rounded-full group-hover:bg-yellow-500/10 transition-all"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-8">
                                <p className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 tracking-widest"><Activity size={14} className="text-yellow-500"/> Flux Mensuel</p>
                                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">{savingsRate.toFixed(0)}% TAUX</span>
                            </div>
                            <div className="text-5xl font-black text-white tracking-tighter">
                                +<AnimatedNumber value={monthlySavings}/> {/* SANS DOUBLE € */}
                            </div>
                            <p className="text-xs text-zinc-500 mt-2 font-medium">Épargne disponible ce mois-ci</p>
                        </div>
                    </div>
                </Link>

                {/* CARTE OBJECTIF */}
                <div className="md:col-span-2 p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col justify-center relative overflow-hidden shadow-xl group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-30 group-hover:opacity-60 transition-opacity"></div>
                    <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                        <div>
                            <p className="text-xs font-bold text-purple-400 uppercase mb-3 tracking-[0.2em] flex items-center gap-2"><Target size={14}/> Prochain Palier</p>
                            <div className="text-4xl lg:text-5xl font-black text-white flex items-center gap-3 tracking-tighter">
                                <AnimatedNumber value={milestone}/> {/* SANS DOUBLE € */}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors">{milestone > 0 ? ((totalNetWorth / milestone) * 100).toFixed(0) : 0}%</span>
                        </div>
                    </div>
                    
                    {/* Barre de progression stylisée */}
                    <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-[2px]">
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${Math.min(100, (totalNetWorth / milestone) * 100)}%` }} 
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        />
                    </div>
                    
                    <div className="flex justify-between mt-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                        <span>Progression Actuelle</span>
                        <span>Manque <AnimatedNumber value={milestone - totalNetWorth}/></span> {/* SANS DOUBLE € */}
                    </div>
                </div>
              </div>

              {/* NAVIGATION RAPIDE */}
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 pl-2">Accès Rapide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { href: "/projection", label: "Projection", sub: "Futur & Intérêts", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10", border: "hover:border-purple-500/30" },
                        { href: "/simulateur", label: "Simulateur Immo", sub: "Rentabilité & Cashflow", icon: Calculator, color: "text-blue-400", bg: "bg-blue-500/10", border: "hover:border-blue-500/30" },
                        { href: "/budget", label: "Mon Budget", sub: "Flux mensuels", icon: PieChart, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "hover:border-yellow-500/30" },
                    ].map((item) => (
                        <Link key={item.href} href={item.href} className={`p-6 rounded-[24px] bg-zinc-900/40 border border-white/5 ${item.border} hover:bg-zinc-900/60 transition-all flex items-center gap-5 group backdrop-blur-sm`}>
                            <div className={`h-14 w-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
                                <item.icon size={24}/>
                            </div>
                            <div>
                                <p className="font-bold text-white text-base tracking-wide">{item.label}</p>
                                <p className="text-xs text-zinc-500">{item.sub}</p>
                            </div>
                        </Link>
                    ))}
                    
                    {/* Carte verrouillée */}
                    <div className="relative p-6 rounded-[24px] bg-black/40 border border-white/5 opacity-60 cursor-not-allowed flex items-center gap-5 overflow-hidden grayscale hover:grayscale-0 transition-all">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                        <div className="h-14 w-14 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center shadow-inner"><Lock size={24}/></div>
                        <div>
                            <p className="font-bold text-zinc-300 text-base">Analyse IA 2.0</p>
                            <p className="text-xs text-zinc-600">Bientôt (Pro)</p>
                        </div>
                    </div>
                </div>
              </div>
            </>
          )}

        </motion.div>
      </main>
    </div>
  );
}