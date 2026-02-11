"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";
import { TrendingUp, Clock, ShieldCheck, Globe, Info, Loader2, SlidersHorizontal, Snowflake, Wallet, Calculator, Coins, PiggyBank, Landmark, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabaseClient";
import AnimatedNumber from "@/components/AnimatedNumber";

// --- CONFIGURATION ---
const TAX = {
  PEA: 0.172, // 17.2% Prélèvements sociaux
  CTO: 0.30   // 30% Flat Tax (Impôt + Prélèvements)
};

// --- UTILITAIRE ---
const formatK = (val: number) => {
  if (val >= 1000000) return (val / 1000000).toFixed(2) + "M€";
  if (val >= 1000) return (val / 1000).toFixed(0) + "k€";
  return val.toFixed(0) + "€";
};

export default function ProjectionPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"growth" | "dividends">("growth");

  // --- DONNÉES UTILISATEUR (INIT) ---
  const [initialCapital, setInitialCapital] = useState(0);
  const [monthlyContrib, setMonthlyContrib] = useState(0);

  // --- PARAMÈTRES COMMUNS ---
  const [duration, setDuration] = useState(15);
  
  // --- PARAMÈTRES MODE CROISSANCE (GROWTH) ---
  const [simCapitalG, setSimCapitalG] = useState(0);
  const [simMonthlyG, setSimMonthlyG] = useState(0);
  const [yieldMarket, setYieldMarket] = useState(8);
  const [yieldSafe, setYieldSafe] = useState(3);

  // --- PARAMÈTRES MODE DIVIDENDES (SNOWBALL) ---
  const [simCapitalD, setSimCapitalD] = useState(0);
  const [simMonthlyD, setSimMonthlyD] = useState(0);
  const [dividendYield, setDividendYield] = useState(4.5);
  const [dividendGrowth, setDividendGrowth] = useState(5);
  const [shareGrowth, setShareGrowth] = useState(4);

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
            const netWorth = profile.net_worth || 0;
            setInitialCapital(netWorth);
            setSimCapitalG(netWorth);
            setSimCapitalD(netWorth);

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
            setSimMonthlyG(capacity);
            setSimMonthlyD(capacity);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- MOTEUR 1 : CROISSANCE COMPARÉE ---
  const generateGrowthData = () => {
    const data = [];
    let capitalLivret = simCapitalG;
    let capitalPEA = simCapitalG;
    let capitalCTO = simCapitalG;
    let totalInvested = simCapitalG;

    const rateMarket = yieldMarket / 100;
    const rateSafe = yieldSafe / 100;

    for (let year = 0; year <= duration; year++) {
        if (year > 0) {
            const annualInj = simMonthlyG * 12;
            totalInvested += annualInj;
            capitalLivret = (capitalLivret + annualInj) * (1 + rateSafe);
            capitalPEA = (capitalPEA + annualInj) * (1 + rateMarket);
            capitalCTO = (capitalCTO + annualInj) * (1 + rateMarket);
        }
        
        // Fiscalité Sortie (Simulation retrait total)
        const gainsPEA = Math.max(0, capitalPEA - totalInvested);
        const taxPEA = gainsPEA * TAX.PEA;
        const netPEA = capitalPEA - taxPEA;

        const gainsCTO = Math.max(0, capitalCTO - totalInvested);
        const taxCTO = gainsCTO * TAX.CTO;
        const netCTO = capitalCTO - taxCTO;

        data.push({
            year: `An ${year}`,
            invested: Math.round(totalInvested),
            livret: Math.round(capitalLivret),
            brutPEA: Math.round(capitalPEA), // Pour calcul final
            netPEA: Math.round(netPEA),
            taxPEA: Math.round(taxPEA),
            brutCTO: Math.round(capitalCTO), // Pour calcul final
            netCTO: Math.round(netCTO),
            taxCTO: Math.round(taxCTO),
        });
    }
    const final = data[data.length-1];
    
    // Données pour le graphique "Match Fiscal" (Bar Chart)
    const comparisonData = [
        { name: "Livret A", Investi: final.invested, GainsNet: final.livret - final.invested, Impôts: 0 },
        { name: "PEA", Investi: final.invested, GainsNet: final.netPEA - final.invested, Impôts: final.taxPEA },
        { name: "CTO", Investi: final.invested, GainsNet: final.netCTO - final.invested, Impôts: final.taxCTO },
    ];

    return { data, final, comparisonData };
  };

  // --- MOTEUR 2 : DIVIDENDES SNOWBALL ---
  const generateDividendData = () => {
    const data = [];
    let sharesValue = simCapitalD;
    let totalInvested = simCapitalD;
    let totalDividendsAccumulated = 0;
    let annualDividendIncome = simCapitalD * (dividendYield / 100);

    data.push({ year: "Start", invested: totalInvested, gains: 0, dividends: 0, total: sharesValue, annualPassive: annualDividendIncome });

    for (let i = 1; i <= duration; i++) {
        const annualContrib = simMonthlyD * 12;
        totalInvested += annualContrib;
        sharesValue += annualContrib;

        // Croissance prix action
        sharesValue = sharesValue * (1 + shareGrowth / 100);

        // Dividendes perçus
        const currentYield = dividendYield / 100;
        const dividendsReceived = sharesValue * currentYield;
        
        // Réinvestissement (Snowball)
        sharesValue += dividendsReceived;
        totalDividendsAccumulated += dividendsReceived;

        // Boost croissance dividende
        const growthFactor = Math.pow(1 + (dividendGrowth/100), 1); 
        annualDividendIncome = dividendsReceived * growthFactor;

        data.push({
            year: `An ${i}`,
            invested: Math.round(totalInvested),
            gains: Math.round(sharesValue - totalInvested - totalDividendsAccumulated),
            dividends: Math.round(totalDividendsAccumulated),
            total: Math.round(sharesValue),
            annualPassive: Math.round(annualDividendIncome)
        });
    }
    return { data, finalTotal: data[data.length-1].total, finalPassive: data[data.length-1].annualPassive, totalDivs: totalDividendsAccumulated };
  };

  const growthResult = generateGrowthData();
  const dividendResult = generateDividendData();

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-24 md:pb-8">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-8">
          
          {/* HEADER & TABS */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Laboratoire de Projection<span className="text-emerald-500">.</span></h1>
                <p className="text-zinc-400 mt-1">Simulez vos futurs scénarios et faites les bons choix fiscaux.</p>
              </div>
              
              <div className="bg-zinc-900 p-1 rounded-xl flex gap-1 border border-zinc-800">
                <button 
                    onClick={() => setActiveTab("growth")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "growth" ? "bg-zinc-800 text-white shadow-lg border border-zinc-700" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    <TrendingUp size={16}/> Comparateur Fiscal
                </button>
                <button 
                    onClick={() => setActiveTab("dividends")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "dividends" ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    <Snowflake size={16}/> Rente Dividendes
                </button>
              </div>
          </div>

          {/* --- TAB 1 : COMPARATEUR FISCAL (REFONDU) --- */}
          {activeTab === "growth" && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
                
                {/* 1. EXPLICATION PEDAGOGIQUE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold uppercase text-xs"><ShieldCheck size={14}/> Livret A / LDDS</div>
                            <p className="text-sm text-zinc-300">L'épargne de précaution. Garanti par l'État, disponible tout de suite, mais rendement faible.</p>
                        </div>
                        <div className="mt-4 flex justify-between text-xs font-bold bg-black/30 p-2 rounded-lg">
                            <span className="text-zinc-500">Fiscalité</span>
                            <span className="text-emerald-400">0% (Nulle)</span>
                        </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-zinc-900 border border-emerald-500/20 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-emerald-500 font-bold uppercase text-xs"><TrendingUp size={14}/> PEA (Plan Épargne Action)</div>
                            <p className="text-sm text-zinc-300">Le roi de l'investissement en France. Idéal pour investir en Bourse (Actions EU) à long terme.</p>
                        </div>
                        <div className="mt-4 flex justify-between text-xs font-bold bg-black/30 p-2 rounded-lg">
                            <span className="text-zinc-500">Fiscalité (Gains)</span>
                            <span className="text-emerald-400">17.2% (après 5 ans)</span>
                        </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-purple-500 font-bold uppercase text-xs"><Globe size={14}/> Compte Titres (CTO)</div>
                            <p className="text-sm text-zinc-300">La liberté totale (Actions US, Monde). Mais l'État prend sa part (Flat Tax).</p>
                        </div>
                        <div className="mt-4 flex justify-between text-xs font-bold bg-black/30 p-2 rounded-lg">
                            <span className="text-zinc-500">Fiscalité (Gains)</span>
                            <span className="text-red-400">30%</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLONNE GAUCHE : PARAMETRES */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-8">
                            <h3 className="font-bold text-white flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Paramètres</h3>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm"><span className="text-zinc-400">Capital initial</span><span className="font-bold">{formatK(simCapitalG)}</span></div>
                                <Slider value={[simCapitalG]} max={200000} step={1000} onValueChange={(v) => setSimCapitalG(v[0])} />
                                
                                <div className="flex justify-between text-sm"><span className="text-zinc-400">Apport Mensuel</span><span className="font-bold text-emerald-400">+{simMonthlyG} €</span></div>
                                <Slider value={[simMonthlyG]} max={5000} step={50} onValueChange={(v) => setSimMonthlyG(v[0])} />

                                <div className="flex justify-between text-sm"><span className="text-zinc-400">Horizon (Durée)</span><span className="font-bold">{duration} ans</span></div>
                                <Slider value={[duration]} max={40} step={1} onValueChange={(v) => setDuration(v[0])} />
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-8">
                            <h3 className="font-bold text-white flex items-center gap-2"><SlidersHorizontal size={18} className="text-purple-500"/> Rendements</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm"><span className="text-zinc-400">Bourse (Actions)</span><span className="font-bold text-purple-400">{yieldMarket}%</span></div>
                                <Slider value={[yieldMarket]} min={2} max={15} step={0.5} onValueChange={(v) => setYieldMarket(v[0])} />
                                <p className="text-[10px] text-zinc-600 text-right">S&P500 historique : ~10% /an</p>
                                
                                <div className="flex justify-between text-sm"><span className="text-zinc-400">Sécurisé (Livret)</span><span className="font-bold text-yellow-500">{yieldSafe}%</span></div>
                                <Slider value={[yieldSafe]} min={0.5} max={6} step={0.1} onValueChange={(v) => setYieldSafe(v[0])} />
                                <p className="text-[10px] text-zinc-600 text-right">Livret A : 3% (Plafonné)</p>
                            </div>
                        </div>
                    </div>

                    {/* COLONNE DROITE : LE MATCH */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* GRAPHIQUE BARRES : LE VRAI COÛT */}
                        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 h-[320px]">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Landmark size={16}/> Le Match Fiscal : Net dans la poche (An {duration})</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={growthResult.comparisonData} layout="vertical" margin={{top: 0, right: 30, left: 20, bottom: 0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false}/>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} width={60} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                                    <Bar dataKey="Investi" stackId="a" fill="#52525b" radius={[0,0,0,0]} barSize={30} name="Votre Argent" />
                                    <Bar dataKey="GainsNet" stackId="a" fill="#10b981" radius={[0,0,0,0]} barSize={30} name="Gains Net" />
                                    <Bar dataKey="Impôts" stackId="a" fill="#ef4444" radius={[0,4,4,0]} barSize={30} name="Impôts Payés" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* GRAPHIQUE COURBES : ÉVOLUTION */}
                        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 h-[300px]">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={16}/> Trajectoire Patrimoniale</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={growthResult.data}>
                                    <defs>
                                        <linearGradient id="colorPea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} interval={Math.floor(duration/5)} />
                                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} formatter={(val:any) => [Math.round(Number(val)).toLocaleString() + " €"]} />
                                    <Area type="monotone" dataKey="netPEA" stroke="#10b981" strokeWidth={3} fill="url(#colorPea)" name="PEA (Net)" />
                                    <Area type="monotone" dataKey="netCTO" stroke="#a855f7" strokeWidth={2} fill="transparent" name="CTO (Net)" />
                                    <Area type="monotone" dataKey="livret" stroke="#eab308" strokeWidth={2} fill="transparent" name="Livret" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* VERDICT */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-zinc-900 border border-emerald-500/20 flex items-start gap-4">
                            <Info className="text-emerald-500 shrink-0 mt-1" size={20}/>
                            <div>
                                <h4 className="font-bold text-white text-sm">Le Conseil Nexus</h4>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Sur <strong className="text-white">{duration} ans</strong>, le PEA vous fait économiser <strong className="text-emerald-400">{formatK(growthResult.comparisonData[1].Impôts - growthResult.comparisonData[2].Impôts).replace('-','')} d'impôts</strong> par rapport au Compte Titres (CTO).
                                    C'est l'enveloppe à privilégier pour vos actions européennes et ETF monde (éligibles).
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </motion.div>
          )}

          {/* --- TAB 2 : DIVIDENDES SNOWBALL (IDENTIQUE V3) --- */}
          {activeTab === "dividends" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* GAUCHE : PARAMETRES */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
                        <h3 className="font-bold text-white flex items-center gap-2"><Calculator size={18} className="text-emerald-500"/> Paramètres PEA</h3>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Capital actuel</span><span className="font-bold">{formatK(simCapitalD)}</span></div>
                            <Slider value={[simCapitalD]} max={150000} step={500} onValueChange={(v) => setSimCapitalD(v[0])} />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Apport Mensuel</span><span className="font-bold text-emerald-400">+{simMonthlyD} €</span></div>
                            <Slider value={[simMonthlyD]} max={3000} step={50} onValueChange={(v) => setSimMonthlyD(v[0])} />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Durée</span><span className="font-bold">{duration} ans</span></div>
                            <Slider value={[duration]} max={35} step={1} onValueChange={(v) => setDuration(v[0])} />
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
                        <h3 className="font-bold text-white flex items-center gap-2"><Coins size={18} className="text-yellow-500"/> Performance Dividende</h3>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Rendement (Yield)</span><span className="text-blue-400 font-bold">{dividendYield}%</span></div>
                            <Slider value={[dividendYield]} max={10} step={0.1} onValueChange={(v) => setDividendYield(v[0])} />
                            <p className="text-[10px] text-zinc-600">Ex: TotalEnergies ~5%</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Croissance Dividende</span><span className="text-emerald-400 font-bold">{dividendGrowth}% /an</span></div>
                            <Slider value={[dividendGrowth]} max={15} step={0.5} onValueChange={(v) => setDividendGrowth(v[0])} />
                            <p className="text-[10px] text-zinc-600">Le secret : vos rentes augmentent chaque année.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Croissance Prix</span><span className="text-zinc-300 font-bold">{shareGrowth}% /an</span></div>
                            <Slider value={[shareGrowth]} max={10} step={0.5} onValueChange={(v) => setShareGrowth(v[0])} />
                        </div>
                    </div>
                </div>

                {/* DROITE : GRAPHIQUE */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dividendResult.data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDiv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
                                </defs>
                                <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} interval={Math.floor(duration/5)} />
                                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} formatter={(val:any) => [Math.round(Number(val)).toLocaleString() + " €"]} />
                                <Area type="monotone" dataKey="value" stroke="#34d399" fill="url(#colorVal)" name="Valeur Portefeuille" />
                                <Area type="monotone" dataKey="dividends" stroke="#60a5fa" fill="url(#colorDiv)" name="Dividendes Cumulés" />
                                <Area type="monotone" dataKey="invested" stroke="#52525b" fill="transparent" strokeDasharray="5 5" name="Argent Investi" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
                            <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Capital Final</p>
                            <p className="text-2xl font-black text-white">{formatK(dividendResult.finalTotal)}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-zinc-900 border border-blue-500/20 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-xs font-bold text-blue-400 uppercase mb-2">Rente Annuelle (An {duration})</p>
                                <p className="text-3xl font-black text-white">{formatK(dividendResult.finalPassive)}</p>
                                <p className="text-xs text-zinc-400 mt-1">soit ~{Math.round(dividendResult.finalPassive/12)}€ / mois</p>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
                            <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Dividendes Reçus</p>
                            <p className="text-3xl font-black text-emerald-400">{formatK(dividendResult.totalDivs)}</p>
                            <p className="text-xs text-zinc-500 mt-1">Réinvestis automatiquement</p>
                        </div>
                    </div>
                </div>
            </motion.div>
          )}

        </motion.div>
      </main>
    </div>
  );
}