"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { 
  Brain, ShieldCheck, TrendingUp, AlertTriangle, Loader2, CheckCircle, 
  Sparkles, RefreshCw, Layers, TrendingDown, Zap, BarChart2, Target, 
  Info, Rocket, Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, 
  AreaChart, Area, XAxis, Tooltip, BarChart, Bar, Legend, CartesianGrid, ReferenceLine 
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import AnimatedNumber from "@/components/AnimatedNumber";

// --- UTILITAIRES ---
const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

// --- MOTEUR D'ANALYSE ---
const analyzePortfolio = (assets: any[], budget: any) => {
    const totalAssets = assets.reduce((acc, a) => acc + a.value, 0);
    const cash = assets.filter(a => a.type === 'Cash').reduce((acc, a) => acc + a.value, 0);
    const risky = assets.filter(a => a.type === 'Bourse' || a.type === 'Crypto').reduce((acc, a) => acc + a.value, 0);
    const immo = assets.filter(a => a.type === 'Immobilier').reduce((acc, a) => acc + a.value, 0);
    
    const income = budget.income || 0;
    const expenses = budget.expenses || 2000; 
    const cashFlow = Math.max(0, income - expenses);
    const savingsRate = income > 0 ? (cashFlow / income) * 100 : 0;

    const monthsOfSafety = cash / (expenses || 1);
    const riskExposure = risky / (totalAssets || 1);
    const diversificationScore = 1 - (Math.max(cash, risky, immo) / (totalAssets || 1));

    let score = 0;
    const roadmap = [];

    // Scoring Logique
    if (monthsOfSafety >= 6) { score += 25; roadmap.push({ done: true, text: "Matelas de sécurité > 6 mois", points: 25 }); }
    else { score += 5; roadmap.push({ done: false, text: "Sécuriser 6 mois de charges", points: "+20 pts" }); }

    if (savingsRate >= 20) { score += 25; roadmap.push({ done: true, text: "Machine à épargner (>20%)", points: 25 }); }
    else { roadmap.push({ done: false, text: "Booster l'épargne vers 20%", points: "+15 pts" }); }

    if (riskExposure >= 0.3) { score += 25; roadmap.push({ done: true, text: "Moteur de croissance actif", points: 25 }); }
    else { score += 5; roadmap.push({ done: false, text: "Investir pour l'indépendance", points: "+20 pts" }); }

    if (diversificationScore > 0.3) { score += 25; roadmap.push({ done: true, text: "Patrimoine diversifié", points: 25 }); }
    else { score += 5; roadmap.push({ done: false, text: "Diversifier les piliers", points: "+20 pts" }); }

    return { 
        score: Math.min(100, Math.round(score)), 
        stats: { monthsOfSafety, riskExposure, savingsRate, diversificationScore, expenses },
        roadmap,
        totals: { wealth: totalAssets, risky, cash, cashFlow }
    };
};

export default function AnalysesPage() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scanStep, setScanStep] = useState("Initialisation du Core...");
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [radarData, setRadarData] = useState<any[]>([]);
  
  // SIMULATIONS
  const [scenario, setScenario] = useState<"KRACH" | "INFLATION">("KRACH");
  const [simData, setSimData] = useState<any[]>([]);
  const [compoundData, setCompoundData] = useState<any[]>([]); // Pour l'intérêt composé
  const [fireProgress, setFireProgress] = useState(0); // % d'atteinte FIRE

  useEffect(() => {
    setTimeout(() => { setLoading(false); runAudit(); }, 1000);
  }, []);

  const runAudit = async () => {
    setAnalyzing(true);
    setShowResults(false);

    const steps = [
        "Scan des actifs...", "Calculs de risque...", "Stress-test...", "Projection Indépendance...", "Génération du rapport..."
    ];

    for (const step of steps) {
        setScanStep(step);
        await new Promise(r => setTimeout(r, 600));
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase.from('profiles').select('assets_json, budget_json').eq('id', session.user.id).single();
    
    if (profile) {
        const assets = profile.assets_json || [];
        const budget = profile.budget_json || { income: 0, expenses: 0 };
        
        const result = analyzePortfolio(assets, budget);
        setAnalysis(result);

        // DATA RADAR (Corrigé pour affichage)
        setRadarData([
            { subject: 'SÉCURITÉ', A: Math.min(100, result.stats.monthsOfSafety * 15), fullMark: 100 },
            { subject: 'CROISSANCE', A: Math.min(100, result.stats.riskExposure * 150), fullMark: 100 },
            { subject: 'FLUX', A: Math.min(100, result.stats.savingsRate * 3), fullMark: 100 },
            { subject: 'DIVERSIF.', A: Math.min(100, result.stats.diversificationScore * 180), fullMark: 100 },
            { subject: 'LIQUIDITÉ', A: Math.min(100, (result.stats.monthsOfSafety / 12) * 100), fullMark: 100 },
        ]);

        // CALCUL FIRE (Règle des 4%)
        // Objectif = Dépenses Annuelles / 0.04 (ou x 25)
        const fireNumber = result.stats.expenses * 12 * 25;
        const progress = Math.min(100, (result.totals.wealth / (fireNumber || 1)) * 100);
        setFireProgress(progress);

        runCrashTest(result.totals.wealth, "KRACH", result.stats.riskExposure);
        
        // PROJECTION INTÉRÊTS COMPOSÉS (15 ans)
        // On projette le patrimoine financier actuel + épargne mensuelle
        runCompoundSimulation(result.totals.risky + result.totals.cash, result.totals.cashFlow);
    }
    setAnalyzing(false);
    setShowResults(true);
  };

  const runCrashTest = (wealth: number, type: "KRACH" | "INFLATION", riskExposure: number) => {
      const data = [];
      let current = wealth;
      let benchmark = wealth;
      const marketImpact = type === 'KRACH' ? -0.40 : -0.15;
      const userImpact = marketImpact * riskExposure; // Amortisseur

      for (let i = 0; i <= 5; i++) {
          data.push({ year: `An ${i}`, Portfolio: Math.round(current), Market: Math.round(benchmark) });
          if (i === 1) { 
              current = current * (1 + userImpact);
              benchmark = benchmark * (1 + marketImpact);
          } else if (i > 1) {
              current = current * 1.06;
              benchmark = benchmark * 1.08; 
          }
      }
      setSimData(data);
      setScenario(type);
  };

  const runCompoundSimulation = (initial: number, monthly: number) => {
      const data = [];
      let total = initial;
      let capital = initial;
      const rate = 0.08 / 12; // 8% annuel

      for (let y = 0; y <= 15; y++) {
          data.push({
              name: `An ${y}`,
              Total: Math.round(total),
              Capital: Math.round(capital),
              Interets: Math.round(total - capital)
          });
          
          for(let m=0; m<12; m++) {
              total = (total + monthly) * (1 + rate);
              capital += monthly;
          }
      }
      setCompoundData(data);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        {/* AMBIENT GLOWS */}
        <div className="fixed top-0 left-64 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[1800px] mx-auto space-y-10 relative z-10">
          
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-l-4 border-purple-500 pl-6 py-2">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">Intelligence</span>
              </h1>
              <p className="text-zinc-400 text-lg font-light tracking-wide mt-2">Audit patrimonial algorithmique & Stress-tests.</p>
            </div>
            <Button onClick={runAudit} disabled={analyzing} className="h-12 px-8 rounded-full bg-zinc-900 border border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-950/20 text-white font-bold tracking-wide transition-all shadow-lg shadow-black/50">
                {analyzing ? <Loader2 className="animate-spin mr-2" size={18}/> : <RefreshCw className="mr-2" size={18}/>} 
                {analyzing ? "SCAN EN COURS..." : "LANCER L'AUDIT"}
            </Button>
          </header>

          {analyzing ? (
              <div className="h-[60vh] flex flex-col items-center justify-center space-y-8">
                  <div className="relative">
                      <div className="h-40 w-40 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center"><Brain className="text-purple-500 animate-pulse" size={60}/></div>
                  </div>
                  <div className="text-center space-y-2">
                      <p className="text-white font-bold text-xl tracking-widest uppercase">{scanStep}</p>
                      <p className="text-zinc-500 text-sm font-mono">Traitement des données...</p>
                  </div>
              </div>
          ) : showResults && analysis ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                
                {/* 1. SCORING & ROADMAP */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* SCORE CIRCULAIRE */}
                    <div className="p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-40 bg-purple-500/10 blur-[100px] rounded-full group-hover:bg-purple-500/20 transition-all"></div>
                        <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em] mb-8">SCORE DE SANTÉ</h2>
                        
                        <div className="relative h-64 w-64 flex items-center justify-center mb-8">
                            <svg className="absolute w-full h-full transform -rotate-90 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                                <circle cx="128" cy="128" r="100" stroke="#18181b" strokeWidth="20" fill="transparent" />
                                <motion.circle 
                                    initial={{ strokeDasharray: "628", strokeDashoffset: "628" }} animate={{ strokeDashoffset: 628 - (628 * analysis.score) / 100 }} transition={{ duration: 2, ease: "easeOut" }}
                                    cx="128" cy="128" r="100" stroke="url(#gradientScore)" strokeWidth="20" fill="transparent" strokeLinecap="round" 
                                />
                                <defs>
                                    <linearGradient id="gradientScore" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#ef4444" />
                                        <stop offset="50%" stopColor="#eab308" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="flex flex-col items-center">
                                <span className="text-8xl font-black text-white tracking-tighter">{analysis.score}</span>
                                <span className="text-sm text-zinc-500 font-bold uppercase mt-2 tracking-widest">/ 100</span>
                            </div>
                        </div>
                    </div>

                    {/* ROADMAP TO 100 */}
                    <div className="xl:col-span-2 p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 flex flex-col shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                <Target size={20}/>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white uppercase tracking-wide">Roadmap vers l'Excellence</h3>
                                <p className="text-xs text-zinc-400 font-mono mt-1">Actions recommandées pour sécuriser et propulser votre avenir.</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {analysis.roadmap.map((step: any, idx: number) => (
                                <div key={idx} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.01] ${step.done ? "bg-emerald-950/20 border-emerald-500/20" : "bg-black/40 border-white/5 hover:border-white/20"}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 ${step.done ? "bg-emerald-500 border-emerald-500 text-black" : "border-zinc-600 text-transparent"}`}>
                                            {step.done && <CheckCircle size={14} strokeWidth={4}/>}
                                        </div>
                                        <span className={`text-sm font-bold ${step.done ? "text-emerald-400/80 line-through decoration-emerald-500/50" : "text-white"}`}>{step.text}</span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${step.done ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-blue-500/10 border-blue-500/30 text-blue-400"}`}>
                                        {step.done ? "ACQUIS" : step.points}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. ANALYSE MACRO (RADAR) & FIRE PROGRESS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* RADAR CHART CORRIGÉ */}
                    <div className="p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-xl border border-white/5">
                        <h4 className="text-sm font-bold text-white mb-8 flex items-center gap-3 uppercase tracking-widest"><Layers size={18} className="text-blue-500"/> Matrice d'Équilibre</h4>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#3f3f46" strokeWidth={0.5} />
                                    {/* FIX: TICK FILL EN BLANC */}
                                    <PolarAngleAxis 
                                        dataKey="subject" 
                                         
                                    />
                                    <Radar name="Votre Profil" dataKey="A" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.4} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '12px', color: '#fff' }}/>
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* FIRE PROGRESS & INSIGHTS */}
                    <div className="p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-xl border border-white/5 flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-3 uppercase tracking-widest"><Rocket size={18} className="text-emerald-500"/> Objectif Indépendance</h4>
                        
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-zinc-400">Progression FIRE (Règle des 4%)</span>
                                <span className="text-2xl font-black text-white">{fireProgress.toFixed(1)}%</span>
                            </div>
                            <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${fireProgress}%` }} 
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                Basé sur vos dépenses de {formatEuro(analysis.stats.expenses)}/mois. Vous devez accumuler encore {formatEuro((analysis.stats.expenses * 12 * 25) - analysis.totals.wealth)} pour être libre.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex gap-3">
                                <Zap className="text-yellow-500 shrink-0" size={18}/>
                                <p className="text-sm text-zinc-300 leading-relaxed">
                                    <strong className="text-white">Le moteur est allumé :</strong> Vous épargnez {formatEuro(analysis.totals.cashFlow)}/mois. C'est le carburant principal de votre liberté future.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. SIMULATIONS (CRASH + INTÉRÊTS COMPOSÉS) */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Simulations Avancées</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* CRASH TEST (Pédagogie Risque) */}
                        <div className="p-8 rounded-[32px] bg-zinc-900/40 backdrop-blur-xl border border-white/5">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-widest"><TrendingDown size={18} className="text-red-500"/> Résistance Crise</div>
                                <div className="flex gap-2 bg-black/50 p-1 rounded-lg border border-white/5">
                                    <button onClick={() => runCrashTest(analysis.totals.wealth, "KRACH", analysis.stats.riskExposure)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${scenario === 'KRACH' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'text-zinc-500 hover:text-white'}`}>KRACH 2008</button>
                                    <button onClick={() => runCrashTest(analysis.totals.wealth, "INFLATION", analysis.stats.riskExposure)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${scenario === 'INFLATION' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'text-zinc-500 hover:text-white'}`}>INFLATION</button>
                                </div>
                            </div>
                            
                            <div className="h-[250px] w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={simData}>
                                        <defs>
                                            <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '12px', color:'#fff' }} formatter={(val: any) => formatEuro(Number(val))}/>
                                        <Area type="monotone" dataKey="Portfolio" stroke="#ef4444" strokeWidth={3} fill="url(#colorP)" name="Votre Patrimoine" />
                                        <Area type="monotone" dataKey="Market" stroke="#52525b" strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="Le Marché" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-zinc-400 italic text-center">
                                {scenario === 'KRACH' ? "En 2008, le marché a perdu 40%. Grâce à votre diversification, vous amortiriez le choc." : "L'inflation est un impôt invisible. Seuls vos actifs réels (Immo/Bourse) vous protègent."}
                            </p>
                        </div>

                        {/* PUISSANCE INTÉRÊTS COMPOSÉS (Pédagogie Gain) */}
                        <div className="p-8 rounded-[32px] bg-gradient-to-br from-zinc-900/40 to-emerald-950/10 backdrop-blur-xl border border-white/5">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-widest"><TrendingUp size={18} className="text-emerald-500"/> Accélération Patrimoniale</div>
                                <div className="text-xs text-zinc-500 font-mono">Projection 15 ans</div>
                            </div>

                            <div className="h-[250px] w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={compoundData}>
                                        <defs>
                                            <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '12px', color:'#fff' }} formatter={(val: any) => formatEuro(Number(val))}/>
                                        <Area type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={3} fill="url(#colorInt)" name="Patrimoine Total" stackId="1"/>
                                        <Area type="monotone" dataKey="Capital" stroke="#3f3f46" strokeWidth={2} fill="transparent" name="Votre Effort (Capital)" stackId="2"/>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-black/40 border border-emerald-500/20 rounded-2xl">
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Effet Boule de Neige</p>
                                    <p className="text-[10px] text-zinc-500">L'écart qui se creuse est votre richesse passive.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Percent size={16} className="text-white"/>
                                    <div className="text-2xl font-black text-white">8% <span className="text-xs font-normal text-zinc-500">Moyen/An</span></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </motion.div>
          ) : null}

        </motion.div>
      </main>
    </div>
  );
}