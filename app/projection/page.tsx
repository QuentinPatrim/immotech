"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, ShieldCheck, Globe, Info, Loader2, Percent, SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabaseClient";
import AnimatedNumber from "@/components/AnimatedNumber";

// --- CONFIGURATION FISCALE (CONSTANTE) ---
const TAX = {
  PEA: 0.172, // 17.2% Prélèvements sociaux
  CTO: 0.30   // 30% Flat Tax
};

// --- FONCTION UTILITAIRE ---
const formatK = (val: number) => {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + "M€";
  if (val >= 1000) return (val / 1000).toFixed(0) + "k€";
  return val.toFixed(0) + "€";
};

export default function ProjectionPage() {
  const [loading, setLoading] = useState(true);

  // --- DONNÉES UTILISATEUR (SUPABASE) ---
  const [initialCapital, setInitialCapital] = useState(0);
  const [monthlyContrib, setMonthlyContrib] = useState(0);
  
  // --- PARAMÈTRES MODIFIABLES (SIMULATION) ---
  const [simCapital, setSimCapital] = useState(0);
  const [simMonthly, setSimMonthly] = useState(0);
  const [duration, setDuration] = useState(20);

  // --- NOUVEAU : RENDEMENTS CIBLES ---
  const [yieldMarket, setYieldMarket] = useState(8); // Bourse (Défaut 8%)
  const [yieldSafe, setYieldSafe] = useState(3);     // Livret (Défaut 3%)

  // --- 1. CHARGEMENT DONNÉES ---
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('budget_json, net_worth')
          .eq('id', user.id)
          .single();

        if (profile) {
            // Capital
            const netWorth = profile.net_worth || 0;
            setInitialCapital(netWorth);
            setSimCapital(netWorth);

            // Capacité mensuelle
            let capacity = 0;
            if (profile.budget_json) {
                const b = profile.budget_json as any;
                const income = Number(b.income) || 0;
                let expenses = 0;
                if (typeof b.expenses === 'number') expenses = b.expenses;
                else if (b.details && Array.isArray(b.details)) {
                    expenses = b.details.reduce((acc: number, item: any) => acc + item.amount, 0);
                }
                capacity = Math.max(0, income - expenses);
            }
            setMonthlyContrib(capacity);
            setSimMonthly(capacity);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- 2. MOTEUR DE CALCUL DYNAMIQUE ---
  const generateData = () => {
    const data = [];
    let capitalLivret = simCapital;
    let capitalPEA = simCapital;
    let capitalCTO = simCapital;
    let totalInvested = simCapital;

    // Conversion % en décimales (ex: 8% -> 0.08)
    const rateMarket = yieldMarket / 100;
    const rateSafe = yieldSafe / 100;

    for (let year = 0; year <= duration; year++) {
        if (year > 0) {
            // Calcul Intérêts Composés
            // Formule simplifiée : (Capital + Apport Annuel) * (1 + Taux)
            
            const annualInjection = simMonthly * 12;
            totalInvested += annualInjection;

            // Livret (Sécurisé)
            capitalLivret = (capitalLivret + annualInjection) * (1 + rateSafe);
            
            // Bourse (PEA / CTO)
            capitalPEA = (capitalPEA + annualInjection) * (1 + rateMarket);
            capitalCTO = (capitalCTO + annualInjection) * (1 + rateMarket);
        }

        // Calcul de la Fiscalité en cas de sortie
        const gainsPEA = Math.max(0, capitalPEA - totalInvested);
        const netPEA = capitalPEA - (gainsPEA * TAX.PEA);

        const gainsCTO = Math.max(0, capitalCTO - totalInvested);
        const netCTO = capitalCTO - (gainsCTO * TAX.CTO);

        data.push({
            year: `An ${year}`,
            invested: Math.round(totalInvested),
            livret: Math.round(capitalLivret),
            pea: Math.round(netPEA),
            cto: Math.round(netCTO),
        });
    }
    return { data, finalInvested: totalInvested, finalPEA: data[data.length-1].pea, finalLivret: data[data.length-1].livret };
  };

  const { data: chartData, finalPEA, finalLivret } = generateData();
  const interestPEA = finalPEA - (generateData().finalInvested);
  const interestLivret = finalLivret - (generateData().finalInvested);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-8">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Projection Patrimoniale<span className="text-emerald-500">.</span></h1>
                <p className="text-zinc-400 mt-1">Simulez votre enrichissement futur en ajustant vos rendements.</p>
              </div>
              
              <div className="flex gap-4">
                  <div className="text-right">
                      <p className="text-[10px] uppercase text-zinc-500 font-bold">Capital Final (PEA)</p>
                      <p className="text-3xl font-black text-emerald-500"><AnimatedNumber value={finalPEA}/> €</p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- COLONNE GAUCHE : PARAMÈTRES --- */}
            <div className="space-y-6 lg:col-span-1">
                
                {/* 1. FLUX FINANCIERS */}
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-8">
                    <h3 className="font-bold text-white flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Flux Financiers</h3>
                    
                    {/* Capital */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Capital de départ</span>
                            <span className="text-white font-bold">{simCapital.toLocaleString()} €</span>
                        </div>
                        <Slider 
                            defaultValue={[initialCapital]} 
                            max={500000} step={1000} 
                            value={[simCapital]} 
                            onValueChange={(v) => setSimCapital(v[0])}
                            className="py-2"
                        />
                    </div>

                    {/* Mensuel */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Apport Mensuel</span>
                            <span className="text-emerald-400 font-bold">+{simMonthly.toLocaleString()} € /mois</span>
                        </div>
                        <Slider 
                            defaultValue={[monthlyContrib]} 
                            max={10000} step={50} 
                            value={[simMonthly]} 
                            onValueChange={(v) => setSimMonthly(v[0])}
                        />
                    </div>

                    {/* Durée */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Horizon de temps</span>
                            <span className="text-white font-bold">{duration} ans</span>
                        </div>
                        <Slider 
                            defaultValue={[20]} 
                            max={40} step={1} 
                            value={[duration]} 
                            onValueChange={(v) => setDuration(v[0])}
                        />
                    </div>
                </div>

                {/* 2. HYPOTHÈSES DE RENDEMENT (NOUVEAU) */}
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-8">
                    <h3 className="font-bold text-white flex items-center gap-2"><SlidersHorizontal size={18} className="text-purple-500"/> Hypothèses de Rendement</h3>

                    {/* Taux Bourse */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Bourse / Crypto</span>
                            <span className="text-purple-400 font-bold">{yieldMarket}% /an</span>
                        </div>
                        <Slider 
                            defaultValue={[8]} 
                            min={2} max={15} step={0.5} 
                            value={[yieldMarket]} 
                            onValueChange={(v) => setYieldMarket(v[0])}
                        />
                        <p className="text-[10px] text-zinc-500 text-right">Moyenne historique S&P500 : ~8-10%</p>
                    </div>

                    {/* Taux Livret */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Sécurisé (Livret)</span>
                            <span className="text-yellow-500 font-bold">{yieldSafe}% /an</span>
                        </div>
                        <Slider 
                            defaultValue={[3]} 
                            min={0.5} max={6} step={0.1} 
                            value={[yieldSafe]} 
                            onValueChange={(v) => setYieldSafe(v[0])}
                        />
                        <p className="text-[10px] text-zinc-500 text-right">Livret A actuel : 3%</p>
                    </div>
                </div>

                {/* 3. ANALYSE RAPIDE */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/30 to-zinc-900 border border-indigo-500/20">
                    <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Info size={18} className="text-indigo-400"/> L'Effet de Levier</h3>
                    <div className="space-y-3 text-sm text-zinc-300">
                        <p>En augmentant votre rendement de <strong>{yieldSafe}%</strong> à <strong>{yieldMarket}%</strong>, vous générez :</p>
                        <div className="text-2xl font-bold text-white text-center py-2">
                            +{formatK(interestPEA - interestLivret)}
                        </div>
                        <p className="text-xs text-center text-indigo-300">de richesse supplémentaire sur {duration} ans.</p>
                    </div>
                </div>

            </div>

            {/* --- COLONNE DROITE : GRAPHIQUE --- */}
            <div className="lg:col-span-2 space-y-6">
                
                <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 h-[450px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCto" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} interval={Math.floor(duration/5)} />
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} 
                                itemStyle={{ fontSize: '12px' }}
                                labelStyle={{ color: '#a1a1aa', marginBottom: '5px' }}
                                formatter={(value: any) => [Math.round(Number(value)).toLocaleString() + " €"]}
                            />
                            
                            <Area type="monotone" dataKey="invested" stackId="1" stroke="#52525b" strokeWidth={2} fill="transparent" name="Capital Investi" />
                            <Area type="monotone" dataKey="livret" stroke="#eab308" strokeWidth={2} fill="transparent" name={`Livret (${yieldSafe}%)`} />
                            <Area type="monotone" dataKey="cto" stroke="#a855f7" strokeWidth={2} fill="url(#colorCto)" name={`Compte Titres (${yieldMarket}%)`} />
                            <Area type="monotone" dataKey="pea" stroke="#10b981" strokeWidth={3} fill="url(#colorPea)" name={`PEA (${yieldMarket}%)`} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* KPI Comparatifs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold text-xs uppercase"><ShieldCheck size={14}/> Livret A / LDDS</div>
                        <div className="text-xl font-bold text-zinc-300">{formatK(finalLivret)}</div>
                        <div className="text-xs text-zinc-500 mt-1">Rendement {yieldSafe}% net</div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                         <div className="flex items-center gap-2 mb-2 text-purple-500 font-bold text-xs uppercase"><Globe size={14}/> Compte Titres (CTO)</div>
                         <div className="text-xl font-bold text-zinc-300">{formatK(chartData[chartData.length-1].cto)}</div>
                         <div className="text-xs text-zinc-500 mt-1">Fiscalité 30%</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 blur-xl rounded-full"></div>
                         <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 text-emerald-500 font-bold text-xs uppercase"><TrendingUp size={14}/> PEA (Optimisé)</div>
                            <div className="text-2xl font-black text-white">{formatK(finalPEA)}</div>
                            <div className="text-xs text-emerald-400 mt-1">Fiscalité 17.2%</div>
                         </div>
                    </div>
                </div>

            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}