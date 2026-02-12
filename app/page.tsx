"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, Wallet, ArrowUpRight, Lock, Building, PieChart, Calculator, Activity, Plus, ArrowRight } from "lucide-react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

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
  
  // État Onboarding (Nouveau compte)
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

            // SI PAS D'ACTIFS ET PAS DE BUDGET -> NOUVEL UTILISATEUR
            if (!hasAssets && !hasBudget) {
                setIsNewUser(true);
            }
        } else {
            // Pas de profil du tout = Nouvel utilisateur
            setIsNewUser(true);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-24 md:pb-8">
      <Sidebar />
      
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="max-w-[1600px] mx-auto space-y-10"
        >
          
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-900 pb-6">
            <div>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-2">Vue d'ensemble</p>
                <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                    Bon retour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">{userName}</span>
                </h1>
            </div>
            {!isNewUser && (
                <div className="hidden md:block text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Patrimoine Brut Total</p>
                    <div className="text-3xl font-black text-white">
                        <AnimatedNumber value={totalNetWorth}/>
                    </div>
                </div>
            )}
          </header>

          {/* --- CAS ONBOARDING (NOUVEL UTILISATEUR) --- */}
          {isNewUser ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                  <Link href="/patrimoine" className="group">
                      <div className="h-full p-10 rounded-[32px] bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
                          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                              <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                                  <Wallet size={40} />
                              </div>
                              <div>
                                  <h2 className="text-2xl font-bold text-white mb-2">1. Ajouter mes Actifs</h2>
                                  <p className="text-zinc-400 text-sm max-w-xs mx-auto">Commencez par lister ce que vous possédez (Comptes, Livrets, Immo, Crypto) pour créer votre Patrimoine.</p>
                              </div>
                              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full px-8 py-6">
                                  Commencer <ArrowRight className="ml-2" size={18}/>
                              </Button>
                          </div>
                      </div>
                  </Link>

                  <Link href="/budget" className="group">
                      <div className="h-full p-10 rounded-[32px] bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 transition-all cursor-pointer relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 blur-[80px] rounded-full group-hover:bg-yellow-500/10 transition-all"></div>
                          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                              <div className="h-20 w-20 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2">
                                  <PieChart size={40} />
                              </div>
                              <div>
                                  <h2 className="text-2xl font-bold text-white mb-2">2. Définir mon Budget</h2>
                                  <p className="text-zinc-400 text-sm max-w-xs mx-auto">Renseignez vos revenus et vos dépenses (Besoins & Loisirs) pour calculer votre capacité d'épargne.</p>
                              </div>
                              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full px-8 py-6">
                                  Configurer <ArrowRight className="ml-2" size={18}/>
                              </Button>
                          </div>
                      </div>
                  </Link>
              </div>
          ) : (
            /* --- CAS NORMAL (DASHBOARD) --- */
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Link href="/patrimoine" className="group h-full">
                    <div className="relative overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 p-8 h-full transition-all duration-300 group-hover:border-emerald-500/30 group-hover:scale-[1.01] shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[180px]">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20"><Wallet size={18}/></div>
                                    <span className="text-zinc-300 font-bold text-sm tracking-wide">FINANCIER</span>
                                </div>
                                <div className="h-8 w-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:border-zinc-600 transition-colors"><ArrowUpRight size={14}/></div>
                            </div>
                            <div>
                                <div className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2">
                                    <AnimatedNumber value={financialWealth} />
                                </div>
                                <p className="text-zinc-500 text-sm font-medium">Bourse, Crypto, Cash. <span className="text-emerald-500">Liquide & Disponible.</span></p>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/patrimoine" className="group h-full">
                    <div className="relative overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 p-8 h-full transition-all duration-300 group-hover:border-blue-500/30 group-hover:scale-[1.01] shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-500"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[180px]">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20"><Building size={18}/></div>
                                    <span className="text-zinc-300 font-bold text-sm tracking-wide">IMMOBILIER</span>
                                </div>
                                <div className="h-8 w-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:border-zinc-600 transition-colors"><ArrowUpRight size={14}/></div>
                            </div>
                            <div>
                                <div className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2">
                                    <AnimatedNumber value={realEstateWealth} />
                                </div>
                                <p className="text-zinc-500 text-sm font-medium">Résidence principale & Locatif (Brut).</p>
                            </div>
                        </div>
                    </div>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/budget" className="group md:col-span-1">
                    <div className="p-8 rounded-[28px] bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all h-full flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 p-16 bg-yellow-500/5 blur-[60px] rounded-full"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2"><Activity size={14} className="text-yellow-500"/> Épargne / Mois</p>
                                <span className="text-[10px] font-black px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/20">{savingsRate.toFixed(0)}% TAUX</span>
                            </div>
                            <div className="text-4xl font-black text-white">
                                +<AnimatedNumber value={monthlySavings}/>
                            </div>
                        </div>
                    </div>
                </Link>

                <div className="md:col-span-2 p-8 rounded-[28px] bg-zinc-900/50 border border-zinc-800/50 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-50"></div>
                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                        <div>
                            <p className="text-xs font-bold text-emerald-500 uppercase mb-2 tracking-widest">Prochain Milestone</p>
                            <div className="text-3xl font-black text-white flex items-center gap-2">
                                Objectif <AnimatedNumber value={milestone}/>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl font-black text-zinc-700">{milestone > 0 ? ((totalNetWorth / milestone) * 100).toFixed(0) : 0}%</span>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-black rounded-full overflow-hidden border border-zinc-800/50 p-[2px]">
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${Math.min(100, (totalNetWorth / milestone) * 100)}%` }} 
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-4 text-center uppercase tracking-widest">
                        Plus que <strong className="text-white"><AnimatedNumber value={milestone - totalNetWorth}/></strong> pour débloquer le prochain palier
                    </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Accès Rapide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { href: "/projection", label: "Projection", sub: "Futur & Intérêts", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
                        { href: "/simulateur", label: "Simulateur Immo", sub: "Rentabilité & Cashflow", icon: Calculator, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { href: "/budget", label: "Mon Budget", sub: "Flux mensuels", icon: PieChart, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                    ].map((item) => (
                        <Link key={item.href} href={item.href} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900 transition-all flex items-center gap-4 group">
                            <div className={`h-12 w-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <item.icon size={22}/>
                            </div>
                            <div><p className="font-bold text-white text-sm">{item.label}</p><p className="text-xs text-zinc-500">{item.sub}</p></div>
                        </Link>
                    ))}
                    <div className="relative p-5 rounded-2xl bg-black border border-zinc-900 opacity-50 cursor-not-allowed flex items-center gap-4 overflow-hidden grayscale">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                        <div className="h-12 w-12 rounded-xl bg-zinc-900 text-zinc-500 flex items-center justify-center"><Lock size={22}/></div>
                        <div><p className="font-bold text-zinc-400 text-sm">Analyse IA 2.0</p><p className="text-xs text-zinc-600">Bientôt (Pro)</p></div>
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