"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { 
  Brain, ShieldCheck, TrendingUp, AlertTriangle, Loader2, CheckCircle, 
  Sparkles, RefreshCw, Layers, TrendingDown, Zap, BarChart2, Target, 
  Info, Rocket, Percent, Wallet, Scale, Lock, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, 
  AreaChart, Area, XAxis, Tooltip
} from "recharts";
import { supabase } from "@/lib/supabaseClient";

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

// --- MOTEUR D'ANALYSE & CONSEILS ---
const runDeepAnalysis = (assets: any[], budget: any, simulations: any[]) => {
    // 1. AGGREGATION DONNÉES
    const totalWealth = assets.reduce((acc, a) => acc + (Number(a.value) || 0), 0);
    const cash = assets.filter(a => a.type === 'Cash').reduce((acc, a) => acc + Number(a.value), 0);
    const crypto = assets.filter(a => a.type === 'Crypto').reduce((acc, a) => acc + Number(a.value), 0);
    const stock = assets.filter(a => a.type === 'Bourse').reduce((acc, a) => acc + Number(a.value), 0);
    const realEstate = assets.filter(a => a.type === 'Immobilier').reduce((acc, a) => acc + Number(a.value), 0);
    
    // Simulations (Dette potentielle)
    const projectedDebt = simulations.reduce((acc, sim) => acc + (sim.data?.totalCreditCost > 0 ? (sim.data.price - sim.data.apport) : 0), 0);
    
    const income = Number(budget.income) || 0;
    const monthlyExpenses = budget.expenses || 1; // Eviter division par 0
    const savings = Math.max(0, income - monthlyExpenses);
    
    // 2. CALCUL RATIOS
    const liquidityRatio = cash / (totalWealth || 1); // % de cash
    const runwayMonths = cash / monthlyExpenses; // Mois de survie
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const cryptoExposure = crypto / (totalWealth || 1);
    
    // Score de Diversification (HHI inversé simplifié)
    const assetCounts = [cash, crypto, stock, realEstate].filter(v => v > 0).length;
    const diversificationScore = Math.min(100, (assetCounts / 4) * 100);

    // 3. GÉNÉRATION INSIGHTS (Alertes & Succès)
    const insights = [];
    let score = 50; // Base neutre

    if (runwayMonths >= 6) { 
        score += 15; 
        insights.push({ type: "success", title: "Matelas de Sécurité Solide", text: `Vous avez ${runwayMonths.toFixed(1)} mois d'avance. Excellent.` });
    } else if (runwayMonths < 3) {
        score -= 10;
        insights.push({ type: "danger", title: "Liquidité Critique", text: `Attention, seulement ${runwayMonths.toFixed(1)} mois de charges devant vous.` });
    }

    if (cryptoExposure > 0.30) {
        score -= 5;
        insights.push({ type: "warning", title: "Exposition Crypto Élevée", text: `La crypto représente ${(cryptoExposure*100).toFixed(0)}% de votre patrimoine.` });
    }

    if (savingsRate > 20) {
        score += 15;
        insights.push({ type: "success", title: "Machine à Cash", text: `Taux d'épargne de ${savingsRate.toFixed(0)}%.` });
    } else if (savingsRate < 5) {
        score -= 10;
        insights.push({ type: "danger", title: "Flux Tendu", text: "Capacité d'épargne trop faible pour investir sereinement." });
    }

    if (totalWealth > 100000) score += 10;
    if (assetCounts >= 3) score += 10;
    
    const finalScore = Math.min(100, Math.max(0, score));

    // 4. GÉNÉRATION CONSEILS PERSONNALISÉS (Nouveauté)
    const tips = [];

    // Conseil Cash Trop Plein
    if (runwayMonths > 12) {
        const surplus = cash - (monthlyExpenses * 6);
        tips.push({
            icon: TrendingUp,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            title: "Optimisez votre Trésorerie",
            text: `Vous avez ~${formatEuro(surplus)} de "cash dormant" au-delà des 6 mois de sécurité. Pensez au DCA en Bourse (PEA/CTO) pour battre l'inflation.`
        });
    }

    // Conseil Immobilier
    if ((realEstate / totalWealth) > 0.75) {
        tips.push({
            icon: Scale,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            title: "Diversification Requise",
            text: "L'immobilier pèse très lourd (>75%). Votre patrimoine est peu liquide. Orientez votre nouvelle épargne vers des actifs financiers (Bourse, Assurance Vie)."
        });
    }

    // Conseil Crypto Secure
    if (cryptoExposure > 0.4 && totalWealth > 50000) {
        tips.push({
            icon: Lock,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
            title: "Sécurisation des Gains",
            text: "Votre exposition crypto est forte. Envisagez de 'cranter' vos plus-values en les réallouant vers des actifs plus stables (Stablecoins ou Immo)."
        });
    }

    // Conseil Épargne Boost
    if (savingsRate < 15 && income > 2500) {
        tips.push({
            icon: Zap,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            title: "Boostez l'Épargne",
            text: `Avec ${formatEuro(income)} de revenus, visez au moins 20% d'épargne. Automatisez un virement de ${formatEuro(income * 0.2)} en début de mois.`
        });
    }

    // Conseil Défaut (si tout est équilibré)
    if (tips.length === 0) {
        tips.push({
            icon: Rocket,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            title: "Maintenez le Cap",
            text: "Votre allocation est équilibrée et cohérente. Continuez votre stratégie d'investissement régulière (DCA) et surveillez vos opportunités."
        });
    }

    return {
        metrics: { runwayMonths, savingsRate, liquidityRatio, cryptoExposure, projectedDebt },
        totals: { cash, crypto, stock, realEstate, totalWealth, cashFlow: savings },
        score: finalScore,
        insights,
        tips, // On retourne les nouveaux conseils
        radar: [
            { subject: 'Sécurité', A: Math.min(100, runwayMonths * 15), fullMark: 100 },
            { subject: 'Croissance', A: Math.min(100, (stock + crypto + realEstate) / 1000), fullMark: 100 },
            { subject: 'Flux', A: Math.min(100, savingsRate * 3), fullMark: 100 },
            { subject: 'Diversif.', A: diversificationScore, fullMark: 100 },
            { subject: 'Levier', A: Math.min(100, (projectedDebt / (totalWealth || 1)) * 50), fullMark: 100 },
        ]
    };
};

export default function AnalysesPage() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [scanText, setScanText] = useState("Connexion au Neural Engine...");
  
  // Simulations graphiques
  const [simData, setSimData] = useState<any[]>([]);
  const [compoundData, setCompoundData] = useState<any[]>([]);

  useEffect(() => {
    setTimeout(() => { setLoading(false); runFullAudit(); }, 800);
  }, []);

  const runFullAudit = async () => {
    setAnalyzing(true);
    const steps = ["Agrégation des actifs...", "Analyse des ratios...", "Génération des conseils...", "Finalisation du rapport..."];
    
    for (const step of steps) {
        setScanText(step);
        await new Promise(r => setTimeout(r, 500));
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('assets_json, budget_json, simulations_json').eq('id', session.user.id).single();
        if (profile) {
            const result = runDeepAnalysis(
                profile.assets_json || [], 
                profile.budget_json || {}, 
                profile.simulations_json || []
            );
            setData(result);
            runSimulations(result.totals.totalWealth, result.totals.cashFlow);
        }
    }
    setAnalyzing(false);
  };

  const runSimulations = (wealth: number, monthlySavings: number) => {
      // Simulation Crash
      const crash = [];
      let w = wealth;
      for(let i=0; i<=5; i++) {
          crash.push({ year: `An ${i}`, value: Math.round(w) });
          if(i===1) w = w * 0.7; // -30%
          else w = w * 1.08; // Rebond
      }
      setSimData(crash);

      // Simulation Intérêts Composés
      const compound = [];
      let capital = wealth;
      let total = wealth;
      for(let i=0; i<=10; i++) {
          compound.push({ year: `An ${i}`, Total: Math.round(total), Capital: Math.round(capital) });
          total = (total + monthlySavings*12) * 1.07;
          capital += monthlySavings*12;
      }
      setCompoundData(compound);
  };

  if (loading) return <div className="min-h-screen bg-[#050505]" />;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        <div className="fixed top-0 left-64 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] mx-auto space-y-8 relative z-10">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-l-4 border-purple-500 pl-6 py-2">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Vision</span>
              </h1>
              <p className="text-zinc-400 text-sm md:text-base font-light tracking-wide mt-2">Audit IA & Recommandations Stratégiques.</p>
            </div>
            <Button onClick={runFullAudit} disabled={analyzing} className="h-12 px-8 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {analyzing ? <Loader2 className="animate-spin mr-2"/> : <RefreshCw className="mr-2"/>} 
                {analyzing ? "ANALYSE EN COURS..." : "LANCER L'AUDIT"}
            </Button>
          </header>

          {analyzing ? (
              <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"></div>
                      <Brain className="text-white w-20 h-20 animate-bounce relative z-10" strokeWidth={1} />
                  </div>
                  <p className="text-purple-300 font-mono text-sm animate-pulse">{scanText}</p>
              </div>
          ) : data ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                
                {/* 1. SECTION SCORE & DIAGNOSTIC */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* SCORE */}
                    <div className="p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 opacity-50"></div>
                        <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em] mb-6">SCORE SANTÉ</h2>
                        <div className="relative">
                            <svg className="w-48 h-48 transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="#18181b" strokeWidth="12" fill="transparent" />
                                <motion.circle 
                                    initial={{ strokeDasharray: 553, strokeDashoffset: 553 }} 
                                    animate={{ strokeDashoffset: 553 - (553 * data.score) / 100 }} 
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                    cx="96" cy="96" r="88" 
                                    stroke={data.score > 70 ? "#10b981" : data.score > 40 ? "#eab308" : "#ef4444"} 
                                    strokeWidth="12" fill="transparent" strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-6xl font-black text-white">{data.score}</span>
                                <span className="text-xs text-zinc-500 font-bold uppercase">/ 100</span>
                            </div>
                        </div>
                    </div>

                    {/* ALERTS & INSIGHTS (DIAGNOSTIC) */}
                    <div className="lg:col-span-2 p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="text-purple-400" size={20}/>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wide">Diagnostic IA</h3>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                            {data.insights.length > 0 ? data.insights.map((insight: any, idx: number) => (
                                <div key={idx} className={`p-5 rounded-2xl border flex gap-4 items-start transition-all ${
                                    insight.type === 'success' ? 'bg-emerald-950/20 border-emerald-500/20' : 
                                    insight.type === 'danger' ? 'bg-red-950/20 border-red-500/20' : 
                                    'bg-yellow-950/20 border-yellow-500/20'
                                }`}>
                                    <div className={`p-2 rounded-lg shrink-0 ${
                                        insight.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 
                                        insight.type === 'danger' ? 'bg-red-500/20 text-red-400' : 
                                        'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                        {insight.type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold uppercase mb-1 ${
                                            insight.type === 'success' ? 'text-emerald-400' : 
                                            insight.type === 'danger' ? 'text-red-400' : 
                                            'text-yellow-400'
                                        }`}>{insight.title}</h4>
                                        <p className="text-xs text-zinc-300 leading-relaxed">{insight.text}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-zinc-500 italic">Aucune alerte majeure détectée. Votre profil est sain.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. NOUVELLE SECTION : COACH STRATÉGIQUE & CONSEILS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* CARTE CONSEILS PERSONNALISÉS */}
                    <div className="p-8 rounded-[32px] bg-gradient-to-br from-zinc-900/60 to-black border border-white/5 flex flex-col shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Lightbulb className="text-yellow-400" size={24}/>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wide">Coach Stratégique</h3>
                        </div>
                        <div className="space-y-4">
                            {data.tips.map((tip: any, idx: number) => (
                                <div key={idx} className="p-5 rounded-2xl bg-zinc-900 border border-white/5 flex gap-4 transition-all hover:bg-zinc-800/50">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tip.bg} ${tip.color}`}>
                                        <tip.icon size={20}/>
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold uppercase mb-1 ${tip.color}`}>{tip.title}</h4>
                                        <p className="text-xs text-zinc-300 leading-relaxed">{tip.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RADAR & KPIS */}
                    <div className="p-8 rounded-[32px] bg-zinc-900/40 border border-white/5 flex flex-col">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">MATRICE D'ÉQUILIBRE</h4>
                        <div className="h-[250px] w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.radar}>
                                    <PolarGrid stroke="#27272a" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} />
                                    <Radar name="Profil" dataKey="A" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.3} />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }}/>
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Épargne Mensuelle</p>
                                <p className="text-xl font-black text-white">{formatEuro(data.totals.cashFlow)}</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Runway Cash</p>
                                <p className="text-xl font-black text-white">{data.metrics.runwayMonths.toFixed(1)} <span className="text-xs text-zinc-500 font-normal">mois</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. PROJECTION INTÉRÊTS COMPOSÉS */}
                <div className="p-8 rounded-[32px] bg-zinc-900/40 border border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-white uppercase flex items-center gap-2"><TrendingUp size={20} className="text-emerald-500"/> Projection Patrimoine (10 ans)</h3>
                        <div className="text-xs text-zinc-500 font-mono">Hypothèse : 7% / an</div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={compoundData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                </defs>
                                <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} formatter={(val: any) => formatEuro(Number(val))}/>
                                <Area type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={3} fill="url(#colorTotal)" name="Patrimoine Total" stackId="1"/>
                                <Area type="monotone" dataKey="Capital" stroke="#3f3f46" strokeWidth={2} fill="transparent" name="Capital Versé" stackId="2"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </motion.div>
          ) : null}

        </motion.div>
      </main>
    </div>
  );
}