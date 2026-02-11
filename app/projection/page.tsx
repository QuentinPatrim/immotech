"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { TrendingUp, Target, Sparkles, Loader2, Info, Coins, Scale, AlertTriangle, Calendar, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, YAxis } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";

// --- UTILITAIRES ---
const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

export default function ProjectionPage() {
  const [loading, setLoading] = useState(true);
  
  // --- PARAMÈTRES UTILISATEUR ---
  const [initialCapital, setInitialCapital] = useState(0); 
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0); 
  
  // --- PARAMÈTRES SIMULATION ---
  const [totalReturn, setTotalReturn] = useState(8); 
  const [dividendYield, setDividendYield] = useState(2); 
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

      const { data: profile } = await supabase.from('profiles').select('assets_json, budget_json').eq('id', session.user.id).single();
      
      if (profile) {
          const assets = profile.assets_json || [];
          const financialWealth = assets.filter((a: any) => a.type !== 'Immobilier').reduce((acc: number, a: any) => acc + a.value, 0);
          setInitialCapital(financialWealth);

          const budget = profile.budget_json || { income: 0, expenses: 0 };
          const income = Number(budget.income) || 0;
          let expenses = Number(budget.expenses) || 0;
          if (expenses === 0 && Array.isArray(budget.details)) {
              expenses = budget.details.reduce((acc: number, item: any) => acc + item.amount, 0);
          }
          
          setMonthlyContribution(Math.max(0, income - expenses));
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

      const data = [];
      let currentPEA = initialCapital;
      let currentCTO = initialCapital;
      let totalInvested = initialCapital;
      
      const growthRate = (totalReturn - (isDividendStrategy ? dividendYield : 0)) / 100 / 12; 
      const divRateMonthly = ((isDividendStrategy ? dividendYield : 0) / 100) / 12;
      
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
              currentPEA = currentPEA * (1 + growthRate + divRateMonthly) + monthlyContribution;
              const dividendNet = divRateMonthly * (1 - 0.30); 
              currentCTO = currentCTO * (1 + growthRate + dividendNet) + monthlyContribution;
              if(year < years) totalInvested += monthlyContribution;
          }
      }

      if (!foundFire) setFireYear(null);
      setChartData(data);
      setFinalPEA(data[years].PEA);
      setTaxDragCost(data[years].PEA - data[years].CTO);
      const withdrawalRate = isDividendStrategy ? (dividendYield / 100) : 0.04;
      setPassiveIncome(data[years].PEA * withdrawalRate);

  }, [initialCapital, monthlyContribution, monthlyExpenses, totalReturn, dividendYield, years, isDividendStrategy, loading]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        {/* Background Ambient Glows */}
        <div className="fixed top-0 left-64 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[1800px] mx-auto space-y-10 relative z-10">
          
          {/* HEADER */}
          <header className="flex flex-col gap-2 border-l-4 border-emerald-500 pl-6 py-2">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
              Projection <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Nexus</span>
            </h1>
            <p className="text-zinc-400 text-lg font-light tracking-wide">Projection financière haute fidélité & Optimisation fiscale.</p>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* --- GAUCHE : PANNEAU DE CONTRÔLE (Styke Cockpit) --- */}
              <div className="xl:col-span-3 space-y-6">
                  
                  {/* Carte Paramètres */}
                  <div className="p-6 rounded-[30px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all shadow-2xl">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="h-8 w-1 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Paramètres d'Entrée</h3>
                      </div>
                      
                      <div className="space-y-6">
                          <div className="space-y-2 group">
                              <label className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white transition-colors">Capital Départ (Liquidité)</label>
                              <div className="relative">
                                  <Input 
                                    type="number" 
                                    value={initialCapital} 
                                    onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)} 
                                    className="bg-black/50 border-white/10 text-white font-mono text-lg h-14 pr-10 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all rounded-xl"
                                  />
                                  <span className="absolute right-4 top-4 text-zinc-600 font-mono">€</span>
                              </div>
                          </div>

                          <div className="space-y-2 group">
                              <label className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white transition-colors">Épargne Mensuelle</label>
                              <div className="relative">
                                  <Input 
                                    type="number" 
                                    value={monthlyContribution} 
                                    onChange={(e) => setMonthlyContribution(parseFloat(e.target.value) || 0)} 
                                    className="bg-black/50 border-white/10 text-white font-mono text-lg h-14 pr-14 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all rounded-xl"
                                  />
                                  <span className="absolute right-4 top-4 text-zinc-600 font-mono">€/m</span>
                              </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-white/5">
                              <div className="flex justify-between items-end">
                                  <label className="text-[10px] uppercase font-bold text-zinc-500">Horizon</label>
                                  <span className="text-2xl font-black text-white">{years} <span className="text-sm text-zinc-500 font-normal">Ans</span></span>
                              </div>
                              <Slider value={[years]} min={5} max={40} step={1} onValueChange={(v) => setYears(v[0])} className="cursor-pointer" />
                          </div>
                      </div>
                  </div>

                  {/* Carte Stratégie */}
                  <div className="p-6 rounded-[30px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all shadow-2xl">
                      <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                              <div className="h-8 w-1 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Stratégie</h3>
                          </div>
                          <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-white/5">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase">Dividendes</span>
                              <Switch checked={isDividendStrategy} onCheckedChange={setIsDividendStrategy} />
                          </div>
                      </div>
                      
                      <div className="space-y-6">
                          <div className="space-y-4">
                              <div className="flex justify-between items-end">
                                  <label className="text-[10px] uppercase font-bold text-zinc-500">Rendement Cible</label>
                                  <span className="text-2xl font-black text-emerald-400 shadow-emerald-500/20 drop-shadow-sm">{totalReturn}%</span>
                              </div>
                              <Slider value={[totalReturn]} min={2} max={15} step={0.5} onValueChange={(v) => setTotalReturn(v[0])} />
                          </div>
                          
                          {isDividendStrategy && (
                              <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                  <div className="flex justify-between items-end">
                                      <label className="text-[10px] uppercase font-bold text-zinc-500">Dont Dividende</label>
                                      <span className="text-xl font-bold text-blue-400">{dividendYield}%</span>
                                  </div>
                                  <Slider value={[dividendYield]} min={0} max={totalReturn} step={0.5} onValueChange={(v) => setDividendYield(v[0])} />
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* --- DROITE : VISUALISATION --- */}
              <div className="xl:col-span-9 space-y-8">
                  
                  {/* KPI CARDS (HUD STYLE) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      
                      {/* 1. FIRE */}
                      <div className={`p-6 rounded-[26px] border relative overflow-hidden flex flex-col justify-between h-40 transition-all group ${fireYear ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-zinc-900/40 border-white/5'}`}>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex justify-between items-start relative z-10">
                              <p className={`text-[10px] font-bold uppercase tracking-widest ${fireYear ? "text-emerald-400" : "text-zinc-500"}`}>Liberté Financière</p>
                              <Target size={18} className={fireYear ? "text-emerald-400" : "text-zinc-600"}/>
                          </div>
                          <div className="relative z-10">
                              {fireYear ? (
                                  <>
                                      <div className="text-4xl font-black text-white mb-1">Dans {fireYear} ans</div>
                                      <div className="h-1 w-full bg-emerald-900/50 rounded-full mt-2 overflow-hidden">
                                          <div className="h-full bg-emerald-500 w-full animate-pulse"></div>
                                      </div>
                                  </>
                              ) : (
                                  <div className="text-3xl font-bold text-zinc-500">Non atteinte</div>
                              )}
                          </div>
                      </div>

                      {/* 2. NET WORTH */}
                      <div className="p-6 rounded-[26px] bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col justify-between h-40 group hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start">
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Patrimoine Final (Net)</p>
                              <Sparkles size={18} className="text-yellow-500"/>
                          </div>
                          <div>
                              <div className="text-3xl lg:text-4xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">
                                <AnimatedNumber value={finalPEA} /> €
                              </div>
                              <p className="text-[10px] text-emerald-400 mt-2 font-bold">+ Optimisation PEA Active</p>
                          </div>
                      </div>

                      {/* 3. PASSIVE INCOME */}
                      <div className="p-6 rounded-[26px] bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col justify-between h-40 group hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start">
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Rente Mensuelle</p>
                              <Coins size={18} className="text-blue-500"/>
                          </div>
                          <div>
                              <div className="text-3xl lg:text-4xl font-black text-white tracking-tighter">
                                ~{formatEuro(passiveIncome / 12)}
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-2">Règle des 4% (SWR)</p>
                          </div>
                      </div>

                      {/* 4. TAX LOSS */}
                      <div className="p-6 rounded-[26px] bg-red-950/10 backdrop-blur-md border border-red-500/20 flex flex-col justify-between h-40 relative overflow-hidden">
                          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/20 blur-[40px] rounded-full"></div>
                          <div className="flex justify-between items-start relative z-10">
                              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Manque à gagner (CTO)</p>
                              <AlertTriangle size={18} className="text-red-500"/>
                          </div>
                          <div className="relative z-10">
                              <div className="text-3xl lg:text-4xl font-black text-red-500 tracking-tighter">
                                -<AnimatedNumber value={taxDragCost} /> €
                              </div>
                              <p className="text-[10px] text-red-400/70 mt-2">Impact fiscal sur {years} ans</p>
                          </div>
                      </div>
                  </div>

                  {/* MAIN CHART */}
                  <div className="p-1 rounded-[32px] bg-gradient-to-b from-white/10 to-transparent">
                    <div className="p-8 rounded-[30px] bg-[#0A0A0A] border border-white/5 h-[500px] relative overflow-hidden">
                        {/* Header Chart */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <TrendingUp size={20} className="text-emerald-500"/> PROTOCOLE DE RICHESSE
                                </h3>
                                <p className="text-xs text-zinc-500 font-mono mt-1">Simulation Monte Carlo simplifiée • Taux {totalReturn}%</p>
                            </div>
                            {fireYear && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 animate-pulse">
                                    <CheckCircle size={14} className="text-emerald-500"/>
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Objectif atteint : An {fireYear}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Chart Area */}
                        <div className="absolute inset-0 pt-24 pb-4 px-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPEA" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorCTO" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#52525b" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={15} 
                                        interval={'preserveStartEnd'} 
                                    />
                                    <YAxis hide />
                                    
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '16px', color:'#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        formatter={(val: any) => formatEuro(Number(val))}
                                        cursor={{ stroke: '#ffffff20', strokeWidth: 1 }}
                                    />
                                    
                                    {/* Courbes */}
                                    <Area type="monotone" dataKey="PEA" stroke="#10b981" strokeWidth={4} fill="url(#colorPEA)" name="Patrimoine Net (PEA)" animationDuration={1500} />
                                    <Area type="monotone" dataKey="CTO" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" fill="url(#colorCTO)" name="Via CTO (Fiscalisé)" animationDuration={1500} />
                                    
                                    {/* Ligne FIRE */}
                                    <ReferenceLine y={fireTarget} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'top',  value: 'Cible Liberté', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                  </div>

                  {/* VERDICT BOX */}
                  <div className="p-6 rounded-[26px] bg-blue-600/5 border border-blue-500/20 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Info className="text-blue-400" size={20}/>
                      </div>
                      <div className="space-y-2">
                          <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wide">Analyse Stratégique</h4>
                          <p className="text-sm text-zinc-300 leading-relaxed font-light">
                              Pour couvrir vos dépenses actuelles de <strong className="text-white">{formatEuro(monthlyExpenses)}/mois</strong> sans travailler, vous devez accumuler <strong className="text-white">{formatEuro(fireTarget)}</strong>. 
                              {fireYear 
                                ? <> Selon la simulation, ce point de bascule sera atteint dans <strong className="text-emerald-400">{fireYear} ans</strong>. Ensuite, vos intérêts généreront plus que votre salaire.</> 
                                : " Ce cap n'est pas atteint dans la période simulée. Augmentez votre épargne ou le rendement pour accélérer le processus."}
                          </p>
                      </div>
                  </div>

              </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}