"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { 
  Brain, ShieldCheck, TrendingUp, AlertTriangle, Loader2, CheckCircle, 
  Sparkles, RefreshCw, Layers, TrendingDown, Zap, BarChart2, Scale, 
  Info, FileText, Target, BookOpen, ArrowRight, HelpCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, 
  AreaChart, Area, XAxis, Tooltip, BarChart, Bar, Legend, CartesianGrid, 
  YAxis
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { Slider } from "@/components/ui/slider";

// --- UTILITAIRES DE FORMATAGE ---
const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
const formatPercent = (val: number) => new Intl.NumberFormat("fr-FR", { style: "percent", minimumFractionDigits: 1 }).format(val / 100);

// --- MOTEUR D'ANALYSE (LE "CERVEAU") ---
const analyzePortfolio = (assets: any[], budget: any) => {
    const totalAssets = assets.reduce((acc, a) => acc + a.value, 0);
    
    // Segmentation des actifs
    const cash = assets.filter(a => a.type === 'Cash').reduce((acc, a) => acc + a.value, 0);
    const risky = assets.filter(a => a.type === 'Bourse' || a.type === 'Crypto').reduce((acc, a) => acc + a.value, 0);
    const immo = assets.filter(a => a.type === 'Immobilier').reduce((acc, a) => acc + a.value, 0);
    
    // Budget & Flux
    const income = budget.income || 0;
    const expenses = budget.expenses || 2000; 
    const cashFlow = Math.max(0, income - expenses);
    const savingsRate = income > 0 ? (cashFlow / income) * 100 : 0;

    // Ratios Clés
    const monthsOfSafety = cash / (expenses || 1);
    const riskExposure = risky / (totalAssets || 1);
    const diversificationScore = 1 - Math.max(cash, risky, immo) / (totalAssets || 1); // 0 = concentré, 1 = hyper diversifié

    // --- ALGORITHME DE SCORING (Max 100) ---
    let score = 0;
    const roadmap = []; // Liste des actions pour atteindre 100

    // 1. Sécurité (30 pts) - La base de la pyramide
    if (monthsOfSafety >= 6) { 
        score += 30; 
        roadmap.push({ done: true, text: "Matelas de sécurité > 6 mois", points: 30 });
    } else if (monthsOfSafety >= 3) { 
        score += 15; 
        roadmap.push({ done: true, text: "Matelas de sécurité > 3 mois", points: 15 });
        roadmap.push({ done: false, text: "Sécuriser 3 mois de charges supplémentaires", points: "+15 pts" });
    } else { 
        score += 5;
        roadmap.push({ done: false, text: "Urgence : Constituer 3 mois de sécurité", points: "+25 pts" });
    }

    // 2. Flux & Croissance (30 pts) - Le moteur
    if (savingsRate >= 20) {
        score += 30;
        roadmap.push({ done: true, text: "Taux d'épargne 'Machine de Guerre' (>20%)", points: 30 });
    } else if (savingsRate >= 10) {
        score += 15;
        roadmap.push({ done: true, text: "Taux d'épargne sain (>10%)", points: 15 });
        roadmap.push({ done: false, text: "Optimiser les dépenses pour atteindre 20% d'épargne", points: "+15 pts" });
    } else {
        roadmap.push({ done: false, text: "Dégager un cashflow positif mensuel", points: "+30 pts" });
    }

    // 3. Allocation d'Actifs (20 pts) - L'équilibre
    if (riskExposure >= 0.3 && riskExposure <= 0.8) {
        score += 20;
        roadmap.push({ done: true, text: "Exposition aux actifs productifs équilibrée (30-80%)", points: 20 });
    } else if (riskExposure < 0.3) {
        score += 10;
        roadmap.push({ done: false, text: "Trop défensif. Augmenter l'exposition actions/immo (Inflation risk)", points: "+10 pts" });
    } else {
        score += 10;
        roadmap.push({ done: false, text: "Trop agressif. Sécuriser une partie des gains", points: "+10 pts" });
    }

    // 4. Diversification (20 pts) - Ne pas mettre tous ses oeufs
    if (diversificationScore > 0.4) { // Au moins 2 classes d'actifs majeures
        score += 20;
        roadmap.push({ done: true, text: "Patrimoine diversifié sur plusieurs piliers", points: 20 });
    } else {
        score += 5;
        roadmap.push({ done: false, text: "Investir dans une nouvelle classe d'actif (Immo/Bourse)", points: "+15 pts" });
    }

    return { 
        score: Math.min(100, Math.round(score)), 
        stats: { monthsOfSafety, riskExposure, savingsRate, diversificationScore },
        roadmap,
        totals: { wealth: totalAssets, risky, cash }
    };
};

export default function AnalysesPage() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scanStep, setScanStep] = useState("Initialisation...");
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [radarData, setRadarData] = useState<any[]>([]);
  
  // DATA SIMULATIONS
  const [scenario, setScenario] = useState<"KRACH" | "INFLATION">("KRACH");
  const [simData, setSimData] = useState<any[]>([]);
  const [taxData, setTaxData] = useState<any[]>([]);
  const [taxDuration, setTaxDuration] = useState(20);
  const [taxGap, setTaxGap] = useState(0);

  useEffect(() => {
    setTimeout(() => { setLoading(false); runAudit(); }, 1000);
  }, []);

  // Recalcul fiscal dynamique
  useEffect(() => {
      if (analysis?.totals?.risky) runTaxSimulation(analysis.totals.risky, taxDuration);
  }, [taxDuration, analysis]);

  const runAudit = async () => {
    setAnalyzing(true);
    setShowResults(false);

    const steps = [
        "Récupération des données brutes...",
        "Calcul du ratio de liquidité...",
        "Analyse de la diversification...",
        "Stress-test Monte Carlo (5000 itérations)...",
        "Comparaison fiscale PEA/CTO...",
        "Génération du rapport stratégique..."
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

        // Radar Data Normalisée
        setRadarData([
            { subject: 'Sécurité', A: Math.min(100, result.stats.monthsOfSafety * 15), fullMark: 100 },
            { subject: 'Rendement', A: Math.min(100, result.stats.riskExposure * 150), fullMark: 100 },
            { subject: 'Flux', A: Math.min(100, result.stats.savingsRate * 3), fullMark: 100 },
            { subject: 'Diversif.', A: Math.min(100, result.stats.diversificationScore * 180), fullMark: 100 },
            { subject: 'Liquidité', A: Math.min(100, (result.stats.monthsOfSafety / 12) * 100), fullMark: 100 },
        ]);

        runCrashTest(result.totals.wealth, "KRACH", result.stats.riskExposure);
        runTaxSimulation(result.totals.risky > 0 ? result.totals.risky : 10000, 20); // Par défaut 10k si pas d'invest
    }
    setAnalyzing(false);
    setShowResults(true);
  };

  // --- 1. MOTEUR CRASH TEST (PÉDAGOGIQUE) ---
  const runCrashTest = (wealth: number, type: "KRACH" | "INFLATION", riskExposure: number) => {
      const data = [];
      let current = wealth;
      let benchmark = wealth;

      // Un portefeuille 100% actions perd 40% en crise. 
      // Un portefeuille diversifié perd moins.
      // Formule : Impact = ImpactMarché * ExpositionRisque
      const marketImpact = type === 'KRACH' ? -0.40 : -0.15; // Krach violent ou Inflation cumulée
      const userImpact = marketImpact * riskExposure; // Amortisseur

      for (let i = 0; i <= 5; i++) {
          data.push({ year: `An ${i}`, Portfolio: Math.round(current), Market: Math.round(benchmark) });
          // Scénario en V (Chute an 1, récupération lente)
          if (i === 1) { 
              current = current * (1 + userImpact);
              benchmark = benchmark * (1 + marketImpact);
          } else if (i > 1) {
              current = current * 1.06; // Rebond
              benchmark = benchmark * 1.08; 
          }
      }
      setSimData(data);
      setScenario(type);
  };

  // --- 2. MOTEUR FISCAL (LONG TERME) ---
  const runTaxSimulation = (amount: number, years: number) => {
      const annualReturn = 0.08; // 8% MSCI World historique
      
      const futureValue = amount * Math.pow(1 + annualReturn, years);
      const totalGain = futureValue - amount;

      // CTO : 30% sur les gains (Flat Tax)
      const netCTO = amount + (totalGain * 0.70);
      
      // PEA : 17.2% sur les gains (CSG-CRDS)
      const netPEA = amount + (totalGain * 0.828);

      setTaxGap(netPEA - netCTO);
      setTaxData([
          { name: "Compte Titres (CTO)", Net: Math.round(netCTO), Taxe: Math.round(totalGain * 0.30), fill: "#ef4444" },
          { name: "PEA Optimisé", Net: Math.round(netPEA), Taxe: Math.round(totalGain * 0.172), fill: "#10b981" }
      ]);
  };

  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-24 md:pb-8">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1600px] mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                Nexus AI <span className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold tracking-wide shadow-lg shadow-emerald-500/20">PRO</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-1">L'intelligence artificielle au service de votre indépendance financière.</p>
            </div>
            <Button onClick={runAudit} disabled={analyzing} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white gap-2 w-full md:w-auto">
                {analyzing ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Relancer l'audit
            </Button>
          </header>

          {analyzing ? (
              <div className="h-[60vh] flex flex-col items-center justify-center space-y-8">
                  <div className="relative">
                      <div className="h-32 w-32 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center"><Brain className="text-emerald-500 animate-pulse" size={48}/></div>
                  </div>
                  <div className="text-center space-y-2">
                      <p className="text-white font-bold text-lg tracking-wide">{scanStep}</p>
                      <p className="text-zinc-500 text-sm">Analyse de {analysis?.totals?.wealth ? formatEuro(analysis.totals.wealth) : "vos données"} en cours...</p>
                  </div>
              </div>
          ) : showResults && analysis ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                
                {/* 1. SCORING & ROADMAP (L'élément central) */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* LE SCORE */}
                    <div className="p-8 rounded-[32px] bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-40 bg-emerald-500/5 blur-[100px] rounded-full"></div>
                        <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-8">NEXUS SCORE</h2>
                        
                        <div className="relative h-56 w-56 flex items-center justify-center mb-8">
                            <svg className="absolute w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                <circle cx="112" cy="112" r="90" stroke="#27272a" strokeWidth="16" fill="transparent" />
                                <motion.circle 
                                    initial={{ strokeDasharray: "565", strokeDashoffset: "565" }} animate={{ strokeDashoffset: 565 - (565 * analysis.score) / 100 }} transition={{ duration: 2, ease: "easeOut" }}
                                    cx="112" cy="112" r="90" stroke="url(#gradientScore)" strokeWidth="16" fill="transparent" strokeLinecap="round" 
                                />
                                <defs>
                                    <linearGradient id="gradientScore" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#ef4444" />
                                        <stop offset="50%" stopColor="#eab308" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="flex flex-col items-center">
                                <span className="text-7xl font-black text-white tracking-tighter">{analysis.score}</span>
                                <span className="text-sm text-zinc-500 font-bold uppercase mt-1">/ 100</span>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-400 max-w-xs italic">
                            {analysis.score > 80 ? "Une forteresse financière digne des plus grands." : analysis.score > 50 ? "Des fondations solides, mais le potentiel de croissance est sous-exploité." : "Structure fragile. Priorité : Sécuriser les bases."}
                        </p>
                    </div>

                    {/* ROADMAP TO 100 (Checklist) */}
                    <div className="xl:col-span-2 p-8 rounded-[32px] bg-zinc-900/50 border border-zinc-800 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <Target className="text-emerald-500" size={24}/>
                            <div>
                                <h3 className="text-xl font-bold text-white">Roadmap vers les 100 points</h3>
                                <p className="text-xs text-zinc-400">Plan d'action personnalisé généré par l'IA.</p>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {analysis.roadmap.map((step: any, idx: number) => (
                                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${step.done ? "bg-emerald-950/10 border-emerald-500/20 opacity-60" : "bg-zinc-900 border-zinc-700 hover:border-zinc-500"}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center border ${step.done ? "bg-emerald-500 border-emerald-500 text-black" : "border-zinc-500 text-transparent"}`}>
                                            {step.done && <CheckCircle size={14}/>}
                                        </div>
                                        <span className={`text-sm font-medium ${step.done ? "text-emerald-400 line-through" : "text-white"}`}>{step.text}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${step.done ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/20 text-blue-400"}`}>
                                        {step.done ? "ACQUIS" : step.points}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. ANALYSE MACRO (Radar + Explications) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="p-6 rounded-[32px] bg-zinc-900 border border-zinc-800">
                        <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2"><Layers size={16} className="text-blue-500"/> Équilibre Patrimonial</h4>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#3f3f46" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 'bold' }} />
                                    <Radar name="Votre Profil" dataKey="A" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.3} />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }}/>
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="p-6 rounded-[32px] bg-zinc-900 border border-zinc-800 flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><BookOpen size={16} className="text-purple-500"/> L'Analyse de l'Architecte</h4>
                        <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
                            <p>
                                <strong className="text-white">1. Sécurité :</strong> Vous avez {formatEuro(analysis.totals.cash)} de liquidités, soit environ <strong className="text-white">{(analysis.stats.monthsOfSafety).toFixed(1)} mois</strong> de dépenses. 
                                {analysis.stats.monthsOfSafety < 6 ? " C'est un peu juste. Visez 6 mois pour une sérénité totale." : " C'est très solide."}
                            </p>
                            <p>
                                <strong className="text-white">2. Moteur de Performance :</strong> {(analysis.stats.riskExposure * 100).toFixed(0)}% de votre patrimoine est investi en actifs de rendement (Bourse/Crypto).
                                {analysis.stats.riskExposure < 0.3 ? " Votre patrimoine dort trop. L'inflation vous grignote chaque année." : " C'est un bon niveau pour générer de la richesse à long terme."}
                            </p>
                            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 mt-4">
                                <p className="text-xs text-zinc-500 italic">
                                    <Info size={12} className="inline mr-1"/>
                                    "La diversification est une protection contre l'ignorance. Si vous savez ce que vous faites, concentrez-vous." — Warren Buffett.
                                    <br/>Actuellement, votre profil est plutôt <strong>{analysis.stats.diversificationScore > 0.5 ? "Diversifié" : "Concentré"}</strong>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. SIMULATIONS AVANCÉES (CRASH + TAX) */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-1 bg-gradient-to-b from-red-500 to-orange-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-white">Laboratoire de Stress & Optimisation</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* A. CRASH TEST */}
                        <div className="p-6 rounded-[32px] bg-zinc-900 border border-zinc-800">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2 text-white font-bold text-sm"><TrendingDown size={16} className="text-red-500"/> Résistance aux Crises</div>
                                <div className="flex gap-2">
                                    <button onClick={() => runCrashTest(analysis.totals.wealth, "KRACH", analysis.stats.riskExposure)} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${scenario === 'KRACH' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>KRACH 2008</button>
                                    <button onClick={() => runCrashTest(analysis.totals.wealth, "INFLATION", analysis.stats.riskExposure)} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${scenario === 'INFLATION' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>INFLATION</button>
                                </div>
                            </div>
                            
                            <div className="h-[200px] w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={simData}>
                                        <defs>
                                            <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color:'#fff' }} formatter={(val: any) => formatEuro(Number(val))}/>
                                        <Area type="monotone" dataKey="Portfolio" stroke="#3b82f6" strokeWidth={3} fill="url(#colorP)" name="Votre Patrimoine" />
                                        <Area type="monotone" dataKey="Market" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="Le Marché" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-zinc-400 bg-black/30 p-3 rounded-lg border border-white/5">
                                <strong className="text-white">Analyse :</strong> {scenario === 'KRACH' ? "En 2008, le marché a perdu -40%. Grâce à votre diversification (Cash/Immo), votre chute serait amortie. Vous perdriez moins que l'indice de référence." : "En période d'inflation forte, le cash est votre ennemi (-6% réel/an). Vos actifs investis sont votre bouclier."}
                            </p>
                        </div>

                        {/* B. OPTIMISATION FISCALE */}
                        <div className="p-6 rounded-[32px] bg-gradient-to-br from-zinc-900 to-emerald-950/30 border border-emerald-500/20">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2 text-white font-bold text-sm"><Scale size={16} className="text-emerald-500"/> Optimisation Fiscale</div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400"><Clock size={12}/> Projection {taxDuration} ans</div>
                            </div>

                            <div className="mb-4">
                                <Slider value={[taxDuration]} min={5} max={30} step={5} onValueChange={(v) => setTaxDuration(v[0])} />
                            </div>

                            <div className="h-[180px] w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={taxData} layout="vertical" barSize={24}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={110} tick={{fill: '#a1a1aa', fontSize: 10}} />
                                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color:'#fff' }} formatter={(val: any) => formatEuro(Number(val))}/>
                                        <Bar dataKey="Net" stackId="a" fill="#10b981" radius={[0,0,0,0]} name="Net Pocket" />
                                        <Bar dataKey="Taxe" stackId="a" fill="#ef4444" radius={[0,4,4,0]} name="Impôts" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                <div>
                                    <p className="text-xs font-bold text-emerald-400 uppercase">Gain Potentiel</p>
                                    <p className="text-[10px] text-zinc-400">Si PEA vs Compte Titres</p>
                                </div>
                                <div className="text-2xl font-black text-white">+{formatEuro(taxGap)}</div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-zinc-500 space-y-1">
                                <p><strong>Méthodologie :</strong> Simulation basée sur un rendement annuel moyen de <strong>8%</strong> (Moyenne historique MSCI World).</p>
                                <p>Hypothèse fiscale : CTO (Flat Tax 30%) vs PEA (17.2% Prélèvements sociaux). L'écart représente la richesse détruite par la fiscalité sur la durée choisie.</p>
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