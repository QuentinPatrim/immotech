"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { TrendingUp, Target, Sparkles, Loader2, Info, Coins, Scale, AlertTriangle, Calendar, CheckCircle, ArrowRight, Percent, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, YAxis } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import PremiumGuard from "@/components/PremiumGuard"; 

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

const getVal = (v: number | string) => (typeof v === 'string' ? parseFloat(v) : v) || 0;

export default function ProjectionPage() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false); 
  
  // --- PARAMÈTRES UTILISATEUR ---
  const [initialCapital, setInitialCapital] = useState<number | string>(0); 
  const [monthlyContribution, setMonthlyContribution] = useState<number | string>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0); 
  
  // --- PARAMÈTRES SIMULATION ---
  const [stockGrowth, setStockGrowth] = useState(6);
  const [dividendYield, setDividendYield] = useState(3);
  const [years, setYears] = useState(20);
  const [isDividendStrategy, setIsDividendStrategy] = useState(false); 

  // --- RÉSULTATS ---
  const [chartData, setChartData] = useState<any[]>([]);
  const [finalPEA, setFinalPEA] = useState(0);
  const [taxDragCost, setTaxDragCost] = useState(0); 
  const [passiveIncome, setPassiveIncome] = useState(0); 
  const [fireYear, setFireYear] = useState<number | null>(null); 
  const [fireTarget, setFireTarget] = useState(0); 

  // --- 1. CHARGEMENT DONNÉES ---
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('is_pro, assets_json, budget_json').eq('id', session.user.id).single();
      
      if (profile) {
          setIsPro(profile.is_pro === true);

          const assets = profile.assets_json || [];
          const financialWealth = assets.filter((a: any) => a.type !== 'Immobilier').reduce((acc: number, a: any) => acc + a.value, 0);
          // CORRECTION : Arrondi propre à 2 décimales
          setInitialCapital(Number(financialWealth.toFixed(2)));

          const budget = profile.budget_json || { income: 0, expenses: 0 };
          const income = Number(budget.income) || 0;
          let expenses = Number(budget.expenses) || 0;
          if (expenses === 0 && Array.isArray(budget.details)) {
              expenses = budget.details.reduce((acc: number, item: any) => acc + item.amount, 0);
          }
          
          // CORRECTION : Arrondi propre à 2 décimales
          const epargne = Math.max(0, income - expenses);
          setMonthlyContribution(Number(epargne.toFixed(2)));
          
          setMonthlyExpenses(expenses);
          setFireTarget(expenses * 12 * 25); 
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- 2. MOTEUR DE SIMULATION ---
  useEffect(() => {
      if (loading) return;

      const startCap = getVal(initialCapital);
      const monthlyAdd = getVal(monthlyContribution);

      const data = [];
      let currentPEA = startCap;
      let currentCTO = startCap;
      let totalInvested = startCap;
      
      const growthRate = stockGrowth / 100 / 12; 
      const divRateAnnual = isDividendStrategy ? (dividendYield / 100) : 0;
      const divRateMonthly = divRateAnnual / 12;
      
      let foundFire = false;
      const target = monthlyExpenses * 12 * 25; 
      setFireTarget(target);

      for (let year = 0; year <= years; year++) {
          const gainPEA = currentPEA - totalInvested;
          const netPEA = currentPEA - (gainPEA > 0 ? gainPEA * 0.172 : 0);

          const gainCTO = currentCTO - totalInvested;
          const netCTO = currentCTO - (gainCTO > 0 ? gainCTO * 0.30 : 0);

          data.push({
              name: `An ${year}`,
              PEA: Math.round(netPEA), 
              CTO: Math.round(netCTO),
              Investi: Math.round(totalInvested),
              FireLine: target
          });

          if (!foundFire && netPEA >= target && target > 0) {
              setFireYear(year);
              foundFire = true;
          }

          for (let m = 0; m < 12; m++) {
              currentPEA = currentPEA * (1 + growthRate + divRateMonthly) + monthlyAdd;
              const dividendNet = divRateMonthly * (1 - 0.30); 
              currentCTO = currentCTO * (1 + growthRate + dividendNet) + monthlyAdd;

              if(year < years) totalInvested += monthlyAdd;
          }
      }

      if (!foundFire) setFireYear(null);
      setChartData(data);
      setFinalPEA(data[years].PEA);
      setTaxDragCost(data[years].PEA - data[years].CTO);
      
      const withdrawalRate = isDividendStrategy ? (dividendYield / 100) : 0.04;
      setPassiveIncome(data[years].PEA * withdrawalRate);

  }, [initialCapital, monthlyContribution, monthlyExpenses, stockGrowth, dividendYield, years, isDividendStrategy, loading]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center w-full max-w-[100vw]"><Loader2 className="animate-spin text-emerald-500 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      <Sidebar />
      {/* CORRECTION : w-full md:w-auto min-w-0 pour le responsive PC */}
      <main className="md:ml-64 flex-1 w-full md:w-auto min-w-0 p-4 md:p-8 relative overflow-x-hidden">
        
        <div className="absolute top-0 left-64 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[1800px] w-full mx-auto space-y-6 md:space-y-10 relative z-10">
          
          <header className="flex flex-col gap-1 md:gap-2 border-l-4 border-emerald-500 pl-4 md:pl-6 py-2 max-w-full">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase truncate">
              Ma <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Projection</span>
            </h1>
            <p className="text-zinc-400 text-[10px] md:text-lg font-light tracking-wide truncate">Projection financière haute fidélité & Optimisation fiscale.</p>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 w-full min-w-0">
              
              {/* --- GAUCHE : PANNEAU DE CONTRÔLE (Toujours visible pour teaser) --- */}
              <div className="xl:col-span-3 space-y-4 md:space-y-6 w-full min-w-0">
                  {/* Carte Paramètres */}
                  <div className="p-4 md:p-6 rounded-[24px] md:rounded-[30px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all shadow-2xl w-full min-w-0">
                      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                          <div className="h-6 md:h-8 w-1 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                          <h3 className="text-[10px] md:text-sm font-bold text-white uppercase tracking-widest">Entrées</h3>
                      </div>
                      <div className="space-y-4 md:space-y-6 w-full min-w-0">
                          <div className="space-y-2 group w-full min-w-0">
                              <label className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white transition-colors">Capital Départ</label>
                              <div className="relative w-full min-w-0">
                                  <Input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className="bg-black/50 border-white/10 text-white font-mono text-sm md:text-lg h-12 md:h-14 pr-8 md:pr-10 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all rounded-xl w-full"/>
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-sm">€</span>
                              </div>
                          </div>
                          <div className="space-y-2 group w-full min-w-0">
                              <label className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white transition-colors">Épargne Mensuelle</label>
                              <div className="relative w-full min-w-0">
                                  <Input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} className="bg-black/50 border-white/10 text-white font-mono text-sm md:text-lg h-12 md:h-14 pr-10 md:pr-14 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all rounded-xl w-full"/>
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-[10px] md:text-sm">€/m</span>
                              </div>
                          </div>
                          <div className="space-y-3 md:space-y-4 pt-4 border-t border-white/5 w-full">
                              <div className="flex justify-between items-end"><label className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-500">Horizon</label><span className="text-xl md:text-2xl font-black text-white">{years} <span className="text-[10px] md:text-sm text-zinc-500 font-normal">Ans</span></span></div>
                              <Slider value={[years]} min={5} max={40} step={1} onValueChange={(v) => setYears(v[0])} className="w-full" />
                          </div>
                      </div>
                  </div>

                  {/* Carte Stratégie */}
                  <div className="p-4 md:p-6 rounded-[24px] md:rounded-[30px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all shadow-2xl w-full min-w-0">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6 w-full">
                          <div className="flex items-center gap-2 md:gap-3">
                              <div className="h-6 md:h-8 w-1 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                              <h3 className="text-[10px] md:text-sm font-bold text-white uppercase tracking-widest">Stratégie</h3>
                          </div>
                          <div className="flex items-center gap-2 bg-black/30 px-2 py-1 md:px-3 rounded-full border border-white/5 shrink-0">
                              <span className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase">Dividendes</span>
                              <Switch checked={isDividendStrategy} onCheckedChange={setIsDividendStrategy} className="scale-75 md:scale-100 origin-right"/>
                          </div>
                      </div>
                      <div className="space-y-4 md:space-y-6 w-full min-w-0">
                          <div className="space-y-3 md:space-y-4 w-full">
                              <div className="flex justify-between items-end"><label className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-500">Croissance Prix</label><span className="text-lg md:text-xl font-black text-emerald-400">{stockGrowth}%</span></div>
                              <Slider value={[stockGrowth]} min={0} max={15} step={0.5} onValueChange={(v) => setStockGrowth(v[0])} className="w-full" />
                          </div>
                          {isDividendStrategy && (
                              <div className="space-y-3 md:space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 w-full">
                                  <div className="flex justify-between items-end"><label className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-500">Rendt Dividende</label><span className="text-lg md:text-xl font-bold text-blue-400">{dividendYield}%</span></div>
                                  <Slider value={[dividendYield]} min={0} max={10} step={0.5} onValueChange={(v) => setDividendYield(v[0])} className="w-full" />
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* --- DROITE : VISUALISATION --- */}
              <div className="xl:col-span-9 space-y-6 md:space-y-8 w-full min-w-0">
                  
                  {/* KPI CARDS (Partiellement floutées en gratuit) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full min-w-0">
                      
                      {/* 1. FIRE (Visible mais statique en gratuit) */}
                      <div className={`p-3 md:p-6 rounded-[20px] md:rounded-[26px] border relative overflow-hidden flex flex-col justify-between h-28 md:h-40 transition-all group w-full min-w-0 ${fireYear ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-zinc-900/40 border-white/5'}`}>
                          <div className="flex justify-between items-start relative z-10">
                              <p className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest truncate pr-1 ${fireYear ? "text-emerald-400" : "text-zinc-500"}`}>Liberté Financière</p>
                              <Target size={14} className={`shrink-0 md:w-[18px] md:h-[18px] ${fireYear ? "text-emerald-400" : "text-zinc-600"}`}/>
                          </div>
                          <div className="relative z-10 w-full min-w-0">
                              {fireYear ? (
                                  <>
                                      <div className="text-xl sm:text-2xl md:text-4xl font-black text-white mb-1 truncate">Dans {fireYear} ans</div>
                                      <div className="h-1 w-full bg-emerald-900/50 rounded-full mt-1 md:mt-2 overflow-hidden"><div className="h-full bg-emerald-500 w-full animate-pulse"></div></div>
                                  </>
                              ) : ( <div className="text-sm sm:text-xl md:text-3xl font-bold text-zinc-500 truncate">Non atteinte</div> )}
                          </div>
                      </div>

                      {/* 2. NET WORTH (Visible) */}
                      <div className="p-3 md:p-6 rounded-[20px] md:rounded-[26px] bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col justify-between h-28 md:h-40 group hover:border-white/10 transition-all w-full min-w-0">
                          <div className="flex justify-between items-start">
                              <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate pr-1">Patrimoine Final</p>
                              <Sparkles size={14} className="text-yellow-500 shrink-0 md:w-[18px] md:h-[18px]"/>
                          </div>
                          <div className="w-full min-w-0">
                              <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left truncate max-w-full">
                                <AnimatedNumber value={finalPEA} />
                              </div>
                              <p className="text-[7px] md:text-[10px] text-emerald-400 mt-1 md:mt-2 font-bold truncate">+ Optimisation PEA</p>
                          </div>
                      </div>

                      {/* 3. PASSIVE INCOME (Flouté si pas pro) */}
                      <div className="p-3 md:p-6 rounded-[20px] md:rounded-[26px] bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col justify-between h-28 md:h-40 group relative overflow-hidden w-full min-w-0">
                          <div className="flex justify-between items-start">
                              <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate pr-1">Rente Mensuelle</p>
                              <Coins size={14} className="text-blue-500 shrink-0 md:w-[18px] md:h-[18px]"/>
                          </div>
                          
                          {isPro ? (
                              <div className="w-full min-w-0">
                                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter truncate max-w-full">~{formatEuro(passiveIncome / 12)}</div>
                                  <p className="text-[7px] md:text-[10px] text-zinc-500 mt-1 md:mt-2 truncate">Basé sur Rendement {isDividendStrategy ? "Div." : "4%"}</p>
                              </div>
                          ) : (
                              <div className="relative w-full min-w-0">
                                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter blur-sm md:blur-md select-none opacity-50 truncate max-w-full">~2 450 €</div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <Lock size={16} className="text-white drop-shadow-lg md:w-6 md:h-6"/>
                                  </div>
                                  <p className="text-[7px] md:text-[10px] text-zinc-500 mt-1 md:mt-2 flex items-center gap-1 truncate"><Lock size={8} className="shrink-0"/> <span className="truncate">Réservé membres</span></p>
                              </div>
                          )}
                      </div>

                      {/* 4. TAX LOSS (Flouté si pas pro) */}
                      <div className="p-3 md:p-6 rounded-[20px] md:rounded-[26px] bg-red-950/10 backdrop-blur-md border border-red-500/20 flex flex-col justify-between h-28 md:h-40 relative overflow-hidden w-full min-w-0">
                          <div className="absolute -right-2 -top-2 md:-right-4 md:-top-4 w-16 h-16 md:w-24 md:h-24 bg-red-500/20 blur-[20px] md:blur-[40px] rounded-full"></div>
                          <div className="flex justify-between items-start relative z-10">
                              <p className="text-[8px] md:text-[10px] text-red-400 font-bold uppercase tracking-widest truncate pr-1">Manque (CTO)</p>
                              <AlertTriangle size={14} className="text-red-500 shrink-0 md:w-[18px] md:h-[18px]"/>
                          </div>
                          
                          {isPro ? (
                              <div className="relative z-10 w-full min-w-0">
                                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-red-500 tracking-tighter truncate max-w-full">-<AnimatedNumber value={taxDragCost} /></div>
                                  <p className="text-[7px] md:text-[10px] text-red-400/70 mt-1 md:mt-2 truncate">Impôt sur div. & PV</p>
                              </div>
                          ) : (
                             <div className="relative z-10 w-full min-w-0">
                                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-red-500 tracking-tighter blur-sm md:blur-md select-none opacity-60 truncate max-w-full">-85 000 €</div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <Lock size={16} className="text-red-200 drop-shadow-lg md:w-6 md:h-6"/>
                                  </div>
                                  <p className="text-[7px] md:text-[10px] text-red-400/70 mt-1 md:mt-2 truncate">Combien perdez-vous ?</p>
                             </div>
                          )}
                      </div>
                  </div>

                  {/* --- ZONE PREMIUM UNIFIÉE --- */}
                  <PremiumGuard isPro={isPro} title="Débloquez la Projection Complète" description="Accédez au graphique interactif sur 40 ans, à la comparaison fiscale PEA vs CTO et à l'analyse stratégique par IA.">
                    <div className="space-y-6 md:space-y-8 w-full min-w-0">
                        {/* CHART */}
                        <div className="p-1 rounded-[24px] md:rounded-[32px] bg-gradient-to-b from-white/10 to-transparent w-full min-w-0">
                            <div className="p-4 md:p-8 rounded-[22px] md:rounded-[30px] bg-[#0A0A0A] border border-white/5 h-[300px] md:h-[500px] relative overflow-hidden w-full min-w-0">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 relative z-10 w-full min-w-0 gap-2">
                                    <div className="w-full min-w-0">
                                        <h3 className="text-sm md:text-lg font-black text-white flex items-center gap-2 truncate"><TrendingUp size={16} className="text-emerald-500 md:w-5 md:h-5 shrink-0"/> PROTOCOLE DE RICHESSE</h3>
                                        <p className="text-[9px] md:text-xs text-zinc-500 font-mono mt-1 truncate">Croissance {stockGrowth}% + {isDividendStrategy ? `Dividende ${dividendYield}%` : "Capitalisation"}</p>
                                    </div>
                                    {fireYear && (
                                        <div className="flex items-center gap-1.5 md:gap-2 bg-emerald-500/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-emerald-500/20 animate-pulse shrink-0">
                                            <CheckCircle size={12} className="text-emerald-500 md:w-[14px] md:h-[14px] shrink-0"/>
                                            <span className="text-[9px] md:text-xs font-bold text-emerald-400 uppercase tracking-wider">Atteint : An {fireYear}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="absolute inset-0 pt-20 md:pt-24 pb-2 md:pb-4 px-2 md:px-4 w-full min-w-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPEA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                                <linearGradient id="colorCTO" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} tickMargin={10} interval={'preserveStartEnd'} />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '12px', color:'#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
                                                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                                formatter={(val: any) => formatEuro(Number(val))}
                                                cursor={{ stroke: '#ffffff20', strokeWidth: 1 }}
                                            />
                                            <Area type="monotone" dataKey="PEA" stroke="#10b981" strokeWidth={3} fill="url(#colorPEA)" name="Net (PEA)" animationDuration={1500} />
                                            <Area type="monotone" dataKey="CTO" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#colorCTO)" name="Net (CTO)" animationDuration={1500} />
                                            <ReferenceLine y={fireTarget} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'insideTopLeft',  value: 'Cible Liberté', fill: '#3b82f6', fontSize: 9, fontWeight: 'bold' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* VERDICT IA */}
                        <div className="p-4 md:p-6 rounded-[20px] md:rounded-[26px] bg-blue-600/5 border border-blue-500/20 flex flex-col sm:flex-row items-start gap-3 md:gap-4 w-full min-w-0">
                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0"><Info className="text-blue-400 md:w-5 md:h-5 w-4 h-4"/></div>
                            <div className="space-y-1.5 md:space-y-2 min-w-0 w-full">
                                <h4 className="text-xs md:text-sm font-bold text-blue-400 uppercase tracking-wide truncate">Verdict de l'Expert</h4>
                                <p className="text-[10px] md:text-sm text-zinc-300 leading-relaxed font-light">
                                    {isDividendStrategy 
                                        ? "En stratégie dividende, l'impact fiscal du CTO est immédiat : chaque année, 30% de vos gains dividendes sont confisqués avant d'être réinvestis. Le PEA est vital pour laisser les intérêts composés agir à 100%."
                                        : "Même en stratégie de capitalisation (Growth), l'avantage fiscal final du PEA (17.2%) contre le CTO (30%) crée un écart de richesse significatif à long terme."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                  </PremiumGuard>

              </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}