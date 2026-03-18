"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, Wallet, ArrowUpRight, Lock, Building, PieChart, Calculator, Activity, Target, Settings, Sparkles } from "lucide-react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Sidebar from "@/components/Sidebar";
import { NexusLogo } from "@/components/NexusLogo"; 
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import OnboardingWizard from "@/components/OnboardingWizard"; 
import NexusChat from "@/components/NexusChat"; 
import { OnboardingModal } from "@/components/OnboardingModal"; 

// Helper pour formater les chiffres envoyés à l'IA
const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

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
  
  // États Financiers
  const [financialWealth, setFinancialWealth] = useState(0);
  const [realEstateWealth, setRealEstateWealth] = useState(0);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  const [milestone, setMilestone] = useState(10000);
  
  // États UX / Premium
  const [isNewUser, setIsNewUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isPro, setIsPro] = useState(false); 
  const [aiContext, setAiContext] = useState<any>(null); 

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    if (session?.user) {
      if (session.user.user_metadata?.full_name) {
          setUserName(session.user.user_metadata.full_name.split(' ')[0]);
      }

      const hasCompletedOnboarding = session.user.user_metadata?.onboarding_complete === true;
      setShowOnboarding(!hasCompletedOnboarding);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro, assets_json, budget_json')
        .eq('id', session.user.id)
        .maybeSingle();
      
      let hasAssets = false;
      let total = 0;
      let savings = 0;

      let currentIncome = 0;
      let currentExpenses = 0;
      let hasBudget = false;

      // Variables pour construire le cerveau de l'IA
      let cash = 0;
      let crypto = 0;
      let stock = 0;
      let financial = 0; 
      let realEstate = 0;

      if (profile) {
          setIsPro(profile.is_pro === true);

          if (Array.isArray(profile.assets_json) && profile.assets_json.length > 0) {
              hasAssets = true;
              profile.assets_json.forEach((asset: any) => {
                  const val = Number(asset.value) || 0;
                  if (asset.type === "Immobilier") { 
                      realEstate += val; 
                  } else { 
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
          setMilestone(getNextMilestone(total));
      }

      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0];
      const { data: currentMonthHistory } = await supabase.from('monthly_history').select('*').eq('user_id', session.user.id).eq('month', startOfMonth).maybeSingle();

      if (currentMonthHistory) {
          currentIncome = Number(currentMonthHistory.income) || 0;
          currentExpenses = Number(currentMonthHistory.expenses) || 0;
          hasBudget = true;
      } else if (profile && profile.budget_json) {
          const b = profile.budget_json as any;
          currentIncome = Number(b.income) || 0;
          if (Array.isArray(b.details)) {
              currentExpenses = b.details.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
          } else {
              currentExpenses = Number(b.expenses) || 0;
          }
          if (currentIncome > 0) hasBudget = true;
      }

      savings = Math.max(0, currentIncome - currentExpenses);
      setMonthlySavings(savings);
      setSavingsRate(currentIncome > 0 ? (savings / currentIncome) * 100 : 0);

      if (profile) {
          setAiContext({
            patrimoine: {
              total: formatEuro(total),
              repartition: `Immobilier ${total > 0 ? ((realEstate/total)*100).toFixed(0) : 0}%, Bourse ${total > 0 ? ((stock/total)*100).toFixed(0) : 0}%, Crypto ${total > 0 ? ((crypto/total)*100).toFixed(0) : 0}%, Cash ${total > 0 ? ((cash/total)*100).toFixed(0) : 0}%`,
              liste_des_actifs: profile.assets_json || [] 
            },
            budget_mensuel: {
              revenus_totaux: formatEuro(currentIncome),
              depenses_totales: formatEuro(currentExpenses),
              cashflow_epargne: formatEuro(savings),
              details_des_depenses: (profile.budget_json as any)?.details || []
            }
          });
      }

      if (hasCompletedOnboarding && !hasAssets && !hasBudget) {
          setIsNewUser(true);
      } else {
          setIsNewUser(false);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="min-h-screen bg-[#050505]" />;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative">
      
      <OnboardingModal />
      <Sidebar />
      {showOnboarding && <OnboardingWizard onFinish={() => { setShowOnboarding(false); fetchData(); }} />}

      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 pt-6 pb-24 md:p-8 relative overflow-hidden">
        
        <div className="fixed top-0 left-64 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] mx-auto space-y-8 md:space-y-12 relative z-10">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-l-4 border-emerald-500 pl-4 md:pl-6 py-2">
            <div>
                <div className="flex items-center gap-3 mb-5 md:hidden">
                    <div className="w-12 h-12 min-w-[3rem] min-h-[3rem]"><NexusLogo className="w-full h-full" /></div>
                    <span className="text-2xl font-black text-white tracking-tighter uppercase font-sans opacity-90">NEXUS</span>
                </div>
                <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-1 md:mb-2">VUE D'ENSEMBLE</p>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tighter uppercase break-words">
                    Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">{userName}</span>
                </h1>
            </div>
            
            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                {!isNewUser && (
                    <div className="bg-zinc-900/50 backdrop-blur-md p-3 md:p-4 rounded-[20px] md:rounded-2xl border border-white/5 shadow-xl flex-1 md:flex-none">
                        <p className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Wallet size={12} className="text-emerald-500"/> Patrimoine Net</p>
                        <div className="text-2xl md:text-3xl font-black text-white tracking-tight"><AnimatedNumber value={totalNetWorth}/></div>
                    </div>
                )}
                <Link href="/parametres" className="h-14 w-14 md:h-20 md:w-20 rounded-[20px] md:rounded-2xl bg-zinc-900/50 border border-white/5 flex shrink-0 items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-xl backdrop-blur-md group">
                    <Settings className="w-6 h-6 md:w-7 md:h-7 group-hover:rotate-90 transition-transform duration-500"/>
                </Link>
            </div>
          </header>

          {isNewUser ? (
              // =======================================================
              // NOUVEL ÉTAT "VIDE" - GUIDE DE DÉMARRAGE INTUITIF
              // =======================================================
              <div className="mt-8 md:mt-16 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="bg-zinc-900/40 border border-white/10 rounded-[32px] md:rounded-[40px] p-6 md:p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                      
                      {/* Entête du guide */}
                      <div className="flex flex-col items-center text-center mb-10 md:mb-14 relative z-10">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6">
                              <Sparkles size={16} /> Étape finale
                          </div>
                          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Activez votre moteur financier.</h2>
                          <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto font-medium leading-relaxed">
                              Nexus a besoin de connaître votre point de départ pour calculer votre Valeur Nette et projeter votre avenir. Par quoi voulez-vous commencer ?
                          </p>
                      </div>

                      {/* Les 2 missions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10">
                          
                          {/* Carte 1 : Patrimoine */}
                          <Link href="/patrimoine" className="group">
                              <div className="h-full p-8 md:p-10 rounded-[24px] bg-black/40 border border-white/10 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col items-center text-center shadow-lg">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
                                  <div className="h-20 w-20 mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                      <Wallet size={36} strokeWidth={1.5} />
                                  </div>
                                  <h3 className="text-2xl font-black text-white mb-3">1. Mon Patrimoine</h3>
                                  <p className="text-zinc-400 text-sm mb-8 flex-1 leading-relaxed">
                                      Comptes courants, livrets, bourse, immobilier ou crypto. Connectez ou déclarez ce que vous possédez.
                                  </p>
                                  <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl h-14 text-base transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                                      Ajouter mes actifs <ArrowUpRight className="ml-2" size={20}/>
                                  </Button>
                              </div>
                          </Link>

                          {/* Carte 2 : Budget */}
                          <Link href="/budget" className="group">
                              <div className="h-full p-8 md:p-10 rounded-[24px] bg-black/40 border border-white/10 hover:border-yellow-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col items-center text-center shadow-lg">
                                  <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/10 blur-[50px] rounded-full group-hover:bg-yellow-500/20 transition-all"></div>
                                  <div className="h-20 w-20 mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                                      <PieChart size={36} strokeWidth={1.5} />
                                  </div>
                                  <h3 className="text-2xl font-black text-white mb-3">2. Mes Revenus</h3>
                                  <p className="text-zinc-400 text-sm mb-8 flex-1 leading-relaxed">
                                      Définissez votre salaire et vos revenus mensuels pour calculer instantanément votre capacité d'épargne.
                                  </p>
                                  <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl h-14 text-base transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                                      Configurer mon budget <ArrowUpRight className="ml-2" size={20}/>
                                  </Button>
                              </div>
                          </Link>

                      </div>
                  </div>
              </div>
              // =======================================================
          ) : (
            <>
              {/* VUE UTILISATEUR CLASSIQUE */}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-8">
                <Link href="/patrimoine" className="group h-full">
                    <div className="relative overflow-hidden rounded-[24px] md:rounded-[40px] border border-white/5 bg-zinc-900/40 backdrop-blur-md p-4 md:p-10 h-full transition-all duration-500 hover:border-emerald-500/30 hover:bg-zinc-900/60 shadow-2xl flex flex-col justify-between min-h-[150px] md:min-h-[220px]">
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start mb-6 md:mb-10">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-lg"><Wallet className="w-5 h-5 md:w-6 md:h-6"/></div>
                                    <div><span className="text-white font-black text-sm md:text-xl tracking-wide uppercase block">Financier</span><span className="text-[9px] md:text-xs text-zinc-500 font-mono hidden md:block">LIQUIDITÉ & BOURSE</span></div>
                                </div>
                                <div className="hidden md:flex h-10 w-10 rounded-full border border-white/10 items-center justify-center text-zinc-500 group-hover:text-white transition-colors"><ArrowUpRight size={18}/></div>
                            </div>
                            <div><div className="text-2xl sm:text-3xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter mb-2 md:mb-3 group-hover:translate-x-2 transition-transform"><AnimatedNumber value={financialWealth} /></div><div className="h-1 w-12 md:w-24 bg-emerald-500 rounded-full group-hover:w-full transition-all duration-700 ease-out"></div></div>
                        </div>
                    </div>
                </Link>
                <Link href="/patrimoine" className="group h-full">
                    <div className="relative overflow-hidden rounded-[24px] md:rounded-[40px] border border-white/5 bg-zinc-900/40 backdrop-blur-md p-4 md:p-10 h-full transition-all duration-500 hover:border-blue-500/30 hover:bg-zinc-900/60 shadow-2xl flex flex-col justify-between min-h-[150px] md:min-h-[220px]">
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start mb-6 md:mb-10">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-lg"><Building className="w-5 h-5 md:w-6 md:h-6"/></div>
                                    <div><span className="text-white font-black text-sm md:text-xl tracking-wide uppercase block">Immobilier</span><span className="text-[9px] md:text-xs text-zinc-500 font-mono hidden md:block">PIERRE & SCPI</span></div>
                                </div>
                                <div className="hidden md:flex h-10 w-10 rounded-full border border-white/10 items-center justify-center text-zinc-500 group-hover:text-white transition-colors"><ArrowUpRight size={18}/></div>
                            </div>
                            <div><div className="text-2xl sm:text-3xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter mb-2 md:mb-3 group-hover:translate-x-2 transition-transform"><AnimatedNumber value={realEstateWealth} /></div><div className="h-1 w-12 md:w-24 bg-blue-500 rounded-full group-hover:w-full transition-all duration-700 ease-out"></div></div>
                        </div>
                    </div>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                <Link href="/budget" className="group md:col-span-1">
                    <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 hover:border-yellow-500/30 transition-all h-full flex flex-col justify-center relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6 md:mb-8"><p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 tracking-widest"><Activity size={14} className="text-yellow-500"/> Flux Mensuel</p><span className="text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500">{savingsRate.toFixed(0)}% TAUX</span></div>
                            <div className="text-4xl md:text-5xl font-black text-white tracking-tighter">+<AnimatedNumber value={monthlySavings}/></div>
                            <p className="text-[10px] md:text-xs text-zinc-500 mt-2 font-medium">Épargne disponible ce mois-ci</p>
                        </div>
                    </div>
                </Link>
                <div className="md:col-span-2 p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col justify-center relative overflow-hidden shadow-xl group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-30 group-hover:opacity-60 transition-opacity"></div>
                    <div className="flex flex-row justify-between items-end mb-6 md:mb-8 gap-4">
                        <div><p className="text-[10px] md:text-xs font-bold text-purple-400 uppercase mb-2 md:mb-3 tracking-[0.2em] flex items-center gap-2"><Target size={14}/> Prochain Palier</p><div className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-white tracking-tighter"><AnimatedNumber value={milestone}/></div></div>
                        <div className="text-right"><span className="text-4xl md:text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors">{milestone > 0 ? ((totalNetWorth / milestone) * 100).toFixed(0) : 0}%</span></div>
                    </div>
                    <div className="h-3 md:h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-[2px]"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (totalNetWorth / milestone) * 100)}%` }} transition={{ duration: 1.5, ease: "circOut" }} className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full" /></div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 md:mb-6 pl-2">Accès Rapide</h3>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {[{ href: "/projection", label: "Projection", sub: "Futur & Intérêts", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10", border: "hover:border-purple-500/30" }, { href: "/simulateur", label: "Simulateur Immo", sub: "Rentabilité", icon: Calculator, color: "text-blue-400", bg: "bg-blue-500/10", border: "hover:border-blue-500/30" }, { href: "/budget", label: "Mon Budget", sub: "Flux mensuels", icon: PieChart, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "hover:border-yellow-500/30" },].map((item) => (
                        <Link key={item.href} href={item.href} className={`p-4 md:p-6 rounded-[20px] md:rounded-[24px] bg-zinc-900/40 border border-white/5 ${item.border} hover:bg-zinc-900/60 transition-all flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 group backdrop-blur-sm`}>
                            <div className={`h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}><item.icon className="w-5 h-5 md:w-6 md:h-6"/></div>
                            <div><p className="font-bold text-white text-sm md:text-base tracking-wide">{item.label}</p><p className="text-[9px] md:text-xs text-zinc-500">{item.sub}</p></div>
                        </Link>
                    ))}
                    
                    <div onClick={() => {}} className="relative p-4 md:p-6 rounded-[20px] md:rounded-[24px] bg-indigo-900/20 border border-indigo-500/30 hover:bg-indigo-900/40 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 overflow-hidden group">
                        <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Activity className="w-5 h-5 md:w-6 md:h-6"/></div>
                        <div><p className="font-bold text-white text-sm md:text-base">CFO Assistant</p><p className="text-[9px] md:text-xs text-indigo-300">Chat avec l'IA</p></div>
                    </div>
                </div>
              </div>
            </>
          )}

          {!isNewUser && aiContext && (
             <NexusChat isPro={isPro} financialData={aiContext} />
          )}

        </motion.div>
      </main>
    </div>
  );
}