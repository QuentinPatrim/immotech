"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Home, Building, Wallet, Landmark, CheckCircle, XCircle, PieChart as PieIcon, ArrowRight, Percent, Euro, PiggyBank, Scale, BedDouble, Armchair, Briefcase, Save, HelpCircle, FileText, Trash2, FolderOpen, MousePointerClick, TrendingUp, AlertCircle, Crown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

// --- COMPOSANT PEDAGOGIQUE ---
const Help = ({ title, text }: { title: string, text: string }) => (
  <div className="group/help relative inline-flex items-center ml-2 align-middle cursor-help z-[999]">
    <HelpCircle size={14} className="text-zinc-500 group-hover/help:text-indigo-400 transition-colors duration-300"/>
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 p-4 bg-[#121217] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/help:visible group-hover/help:opacity-100 transition-all duration-200 z-[9999] translate-y-2 group-hover/help:translate-y-0 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{title}</span>
        </div>
        <span className="block text-xs text-zinc-300 leading-relaxed font-light">{text}</span>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121217] border-b border-r border-white/10 rotate-45"></div>
    </div>
  </div>
);

// --- SLIDER PREMIUM ---
const PremiumSlider = ({ label, value, min, max, step, unit, onChange }: any) => (
    <div className="group relative bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
        <div className="flex justify-between items-end mb-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{label}</label>
            <div className="font-mono text-xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-cyan-400 transition-all">
                {value} <span className="text-sm text-zinc-600 font-medium">{unit}</span>
            </div>
        </div>
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="py-2 cursor-grab active:cursor-grabbing" />
        <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/50 transition-all duration-500"></div>
    </div>
);

// --- CARTE PREMIUM ---
const PremiumCard = ({ children, className = "", color = "indigo" }: { children: React.ReactNode, className?: string, color?: string }) => {
    const borderColor = color === "emerald" ? "hover:border-emerald-500/30" : color === "rose" ? "hover:border-rose-500/30" : color === "amber" ? "hover:border-amber-500/30" : color === "blue" ? "hover:border-blue-500/30" : "hover:border-indigo-500/30";
    const shadowColor = color === "emerald" ? "hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)]" : color === "rose" ? "hover:shadow-[0_0_40px_-10px_rgba(244,63,94,0.15)]" : color === "amber" ? "hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)]" : color === "blue" ? "hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]" : "hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.15)]";
    
    return (
        <div className={`relative rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 transition-all duration-500 ${borderColor} ${shadowColor} hover:bg-zinc-900/60 group ${className}`}>
            {children}
        </div>
    );
};

export default function SimulateurPage() {
  const [mode, setMode] = useState<"CAPACITE" | "RENTABILITE" | "FISCALITE" | "PROJETS">("CAPACITE");
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [projectName, setProjectName] = useState("");

  // --- PARAMÈTRES GLOBAUX ---
  const [revenue, setRevenue] = useState<number | string>(2500);
  const [credits, setCredits] = useState<number | string>(0);
  const [duration, setDuration] = useState(25);
  const [rate, setRate] = useState(3.8);
  const [apportCapacity, setApportCapacity] = useState<number | string>(30000); 
  const [maxLoan, setMaxLoan] = useState(0);
  const [maxMonthly, setMaxMonthly] = useState(0);
  const [totalEnvelope, setTotalEnvelope] = useState(0); 

  // --- PARAMÈTRES PROJET ---
  const [price, setPrice] = useState<number | string>(200000);
  const [works, setWorks] = useState<number | string>(0);
  const [notaryRate, setNotaryRate] = useState<number | string>(8); 
  const [apport, setApport] = useState<number | string>(20000);

  // CONFIGURATION
  const [projectType, setProjectType] = useState<"RP" | "RS" | "LOC">("LOC"); 
  const [rentalStrategy, setRentalStrategy] = useState<"NUE" | "LMNP" | "LCD">("LMNP"); 
  const [userTMI, setUserTMI] = useState(30); 
  
  const [resalePrice, setResalePrice] = useState<number | string>(300000);
  const [holdingYears, setHoldingYears] = useState(10);

  const [rent, setRent] = useState<number | string>(1200);
  const [charges, setCharges] = useState<number | string>(100);
  const [tax, setTax] = useState<number | string>(800); 

  // RÉSULTATS
  const [cashflowBrut, setCashflowBrut] = useState(0); 
  const [cashflowNetImpots, setCashflowNetImpots] = useState(0); 
  const [yieldNet, setYieldNet] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [notaryFees, setNotaryFees] = useState(0);
  const [totalCreditCost, setTotalCreditCost] = useState(0); // NOUVEAU: Coût total crédit
  
  // DONNÉES DATA VIZ
  const [fiscalData, setFiscalData] = useState({ micro: { total: 0, base: 0 }, reel: { total: 0, charges: 0, interests: 0, amortissement: 0, base: 0 } });
  const [capitalGainData, setCapitalGainData] = useState({ grossGain: 0, acquisitionPrice: 0, totalTax: 0, netGain: 0 });
  const [yearOneInterest, setYearOneInterest] = useState(0);
  const [amortizationSchedule, setAmortizationSchedule] = useState<any[]>([]); // NOUVEAU: Données du graphique

  const handleInput = (setter: (v: any) => void, val: string) => {
      if (val === "") setter("");
      else setter(Number(val));
  };

  useEffect(() => {
    const loadProjets = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('simulations_json').eq('id', session.user.id).single();
            if (data && data.simulations_json) setSavedSimulations(data.simulations_json);
        }
    };
    loadProjets();
  }, []);

  // --- ENGINE DE CALCUL ---
  useEffect(() => {
    const safeRevenue = Number(revenue) || 0;
    const safeCredits = Number(credits) || 0;
    const safeApportCap = Number(apportCapacity) || 0;
    
    // 1. CAPACITÉ
    const availableIncome = (safeRevenue * 0.35) - safeCredits;
    const mRate = rate / 100 / 12;
    const nMonths = duration * 12;
    let capacity = 0;
    if (availableIncome > 0) capacity = availableIncome * (1 - Math.pow(1 + mRate, -nMonths)) / mRate;
    
    setMaxLoan(Math.max(0, Math.round(capacity)));
    setMaxMonthly(Math.max(0, Math.round(availableIncome)));
    setTotalEnvelope(Math.max(0, Math.round(capacity)) + safeApportCap);

    // 2. PROJET & RENTABILITÉ
    const safePrice = Number(price) || 0;
    const safeWorks = Number(works) || 0;
    const safeNotaryRate = Number(notaryRate) || 0;
    const safeApportProj = Number(apport) || 0;
    const safeRent = Number(rent) || 0;
    const safeCharges = Number(charges) || 0;
    const safeTax = Number(tax) || 0;

    const notFees = safePrice * (safeNotaryRate / 100);
    setNotaryFees(notFees);
    const total = safePrice + safeWorks + notFees;
    setTotalCost(total);
    
    const loanAmount = Math.max(0, total - safeApportProj);
    let mensu = 0;
    let y1Interest = 0;
    let costCredit = 0;
    let schedule = [];

    if (loanAmount > 0) {
        mensu = loanAmount * (mRate / (1 - Math.pow(1 + mRate, -nMonths)));
        
        // --- TABLEAU D'AMORTISSEMENT ---
        let remainingCapital = loanAmount;
        let cumulativeInterests = 0;

        for (let y = 1; y <= duration; y++) {
            let interestYear = 0;
            for (let m = 0; m < 12; m++) {
                const interestMonth = remainingCapital * mRate;
                interestYear += interestMonth;
                const capitalRepaid = mensu - interestMonth;
                remainingCapital -= capitalRepaid;
            }
            if (y === 1) y1Interest = interestYear; // Intérêts année 1 pour fiscalité
            cumulativeInterests += interestYear;
            
            schedule.push({
                year: `An ${y}`,
                capital: Math.max(0, Math.round(remainingCapital)),
                interests: Math.round(cumulativeInterests)
            });
        }
        costCredit = (mensu * nMonths) - loanAmount;
    }
    
    setMonthlyPayment(mensu);
    setYearOneInterest(y1Interest);
    setTotalCreditCost(costCredit);
    setAmortizationSchedule(schedule);

    // Cashflow Brut
    const annualRent = safeRent * 12;
    const annualCharges = (safeCharges * 12) + safeTax;
    const annualCredit = mensu * 12;
    const cfBrutAnnual = annualRent - annualCharges - annualCredit;
    setCashflowBrut(cfBrutAnnual / 12);

    // 3. MOTEUR FISCALITÉ
    if (projectType === "LOC") {
        // MICRO
        let abattement = 0;
        if (rentalStrategy === "NUE") abattement = 0.30; 
        else if (rentalStrategy === "LMNP") abattement = 0.50; 
        else if (rentalStrategy === "LCD") abattement = 0.71; 

        const baseMicro = Math.max(0, annualRent * (1 - abattement));
        const taxMicro = baseMicro * (userTMI / 100) + baseMicro * 0.172;

        // RÉEL
        const interestAvg = costCredit / duration; // Moyenne pour estimation rapide
        let amo = 0;
        if (rentalStrategy !== "NUE") {
            const bati = safePrice * 0.85; 
            amo = (bati / 30) + (safeWorks / 15) + (5000 / 7) + (notFees / 25);
        }

        const resultatComptable = annualRent - annualCharges - y1Interest - amo; // On prend Y1 ici pour le scénario réel
        const baseReel = Math.max(0, resultatComptable);
        const taxReel = baseReel * (userTMI / 100) + baseReel * 0.172;

        setFiscalData({ 
            micro: { base: baseMicro, total: taxMicro }, 
            reel: { base: baseReel, total: taxReel, charges: annualCharges, interests: y1Interest, amortissement: amo } 
        });

        const bestTax = Math.min(taxMicro, taxReel);
        setCashflowNetImpots((cfBrutAnnual - bestTax) / 12);
        setYieldNet(total > 0 ? ((annualRent - annualCharges) / total) * 100 : 0);

    } else {
        // RP / RS (Cashflow = Coût)
        setCashflowNetImpots(-(mensu + safeCharges + (safeTax / 12)));
        setYieldNet(0); 
        
        // Calcul PV (inchangé)
        const notaireRetenu = Math.max(notFees, safePrice * 0.075);
        const travauxRetenus = holdingYears > 5 ? Math.max(safeWorks, safePrice * 0.15) : safeWorks;
        const acquisitionRetenue = safePrice + notaireRetenu + travauxRetenus;
        const grossGain = Math.max(0, (Number(resalePrice)||0) - acquisitionRetenue);
        
        let taxTotal = 0;
        if (projectType === "RS") {
             const abattementApprox = Math.min(1, Math.max(0, (holdingYears - 5) * 0.06)); 
             taxTotal = grossGain * (1 - abattementApprox) * (0.362); // 19% + 17.2%
        }
        setCapitalGainData({ grossGain, acquisitionPrice: acquisitionRetenue, totalTax: taxTotal, netGain: grossGain - taxTotal });
    }

  }, [revenue, credits, duration, rate, apportCapacity, price, works, notaryRate, apport, rent, charges, tax, projectType, rentalStrategy, userTMI, resalePrice, holdingYears]);

  const saveSimulation = async () => {
      if (!projectName) { alert("Nommez votre projet !"); return; }
      const newSim = { id: Date.now(), name: projectName, date: new Date().toISOString(), data: { price, works, rent, cashflowNetImpots, yieldNet, projectType, rentalStrategy } };
      const updated = [newSim, ...savedSimulations];
      setSavedSimulations(updated);
      setProjectName("");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ simulations_json: updated }).eq('id', user.id);
      setMode("PROJETS");
  };

  const loadSimulation = (sim: any) => {
      const d = sim.data; setPrice(d.price); setWorks(d.works); setRent(d.rent); setProjectType(d.projectType); setRentalStrategy(d.rentalStrategy); setMode("RENTABILITE");
  };

  const deleteSimulation = async (id: number) => {
      const updated = savedSimulations.filter(s => s.id !== id);
      setSavedSimulations(updated);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ simulations_json: updated }).eq('id', user.id);
  };

  const dataCost = [
    { name: 'Prix Net', value: Number(price) || 0, color: '#3b82f6' },
    { name: 'Travaux', value: Number(works) || 0, color: '#eab308' },
    { name: 'Notaire', value: notaryFees, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        {/* Glows */}
        <div className="fixed top-0 left-64 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none"></div>
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] mx-auto space-y-10 relative z-10">
          
          {/* HEADER */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 pl-2 border-l-4 border-indigo-600 py-2">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                Mon Simulateur <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Immobilier</span>
              </h1>
              <p className="text-zinc-400 text-sm md:text-base font-light tracking-wide mt-2">Analysez, optimisez fiscalement et structurez vos investissements</p>
            </div>
            
            <div className="bg-zinc-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 flex flex-wrap gap-1 w-full xl:w-auto shadow-2xl">
                {[{ id: "CAPACITE", label: "Capacité", icon: Wallet }, { id: "RENTABILITE", label: "Projet & Renta", icon: Calculator }, { id: "FISCALITE", label: "Fiscalité Expert", icon: Scale }, { id: "PROJETS", label: "Portefeuille", icon: FolderOpen }].map((tab) => (
                    <button key={tab.id} onClick={() => setMode(tab.id as any)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${mode === tab.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}><tab.icon size={16}/> {tab.label}</button>
                ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
          
          {/* --- VUE CAPACITÉ --- */}
          {mode === "CAPACITE" && (
            <motion.div key="capa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <PremiumCard className="p-8">
                        <h3 className="text-xs font-black text-indigo-400 uppercase mb-8 flex items-center gap-3 tracking-widest"><Wallet size={18}/> Revenus</h3>
                        <div className="space-y-6">
                            <div className="space-y-2"><div className="flex justify-between"><label className="text-[10px] font-bold text-zinc-500 uppercase">Salaire Net / Mois</label></div><Input type="number" value={revenue} onChange={e => handleInput(setRevenue, e.target.value)} className="bg-black/40 border-white/10 h-14 text-white font-bold text-xl focus:border-indigo-500"/></div>
                            <div className="space-y-2"><div className="flex justify-between"><label className="text-[10px] font-bold text-zinc-500 uppercase">Crédits en cours</label></div><Input type="number" value={credits} onChange={e => handleInput(setCredits, e.target.value)} className="bg-black/40 border-white/10 h-14 text-white font-bold text-xl focus:border-indigo-500"/></div>
                            <div className="space-y-2 pt-4 border-t border-white/5"><label className="text-[10px] font-bold text-emerald-500 uppercase">Apport Perso</label><Input type="number" value={apportCapacity} onChange={e => handleInput(setApportCapacity, e.target.value)} className="bg-emerald-900/10 border-emerald-500/20 h-14 text-emerald-400 font-bold text-xl focus:border-emerald-500"/></div>
                        </div>
                    </PremiumCard>
                    <PremiumCard className="p-8">
                        <h3 className="text-xs font-black text-blue-400 uppercase mb-8 flex items-center gap-3 tracking-widest"><Landmark size={18}/> Banque</h3>
                        <div className="space-y-6">
                            <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                            <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                        </div>
                    </PremiumCard>
                </div>
                <div className="lg:col-span-8 p-16 rounded-[48px] bg-gradient-to-br from-zinc-900 via-black to-blue-950/20 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.4em] mb-8">ENVELOPPE GLOBALE (EMPRUNT + APPORT)</p>
                        <div className="text-7xl lg:text-[9rem] font-black text-white tracking-tighter transition-all duration-500 hover:scale-105 cursor-default"><AnimatedNumber value={totalEnvelope} /></div>
                        <div className="mt-10 flex gap-6 justify-center text-sm font-bold text-zinc-500 bg-white/5 px-8 py-4 rounded-full border border-white/5 backdrop-blur-md">
                             <span className="flex items-center gap-2"><Landmark size={14} className="text-blue-500"/> Banque: {formatEuro(maxLoan)}</span>
                             <span className="text-zinc-700 mx-2">|</span>
                             <span className="flex items-center gap-2"><PiggyBank size={14} className="text-emerald-500"/> Apport: {formatEuro(Number(apportCapacity))}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
          )}

          {/* --- VUE RENTABILITÉ --- */}
          {mode === "RENTABILITE" && (
            <motion.div key="renta" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Configuration */}
                <div className="xl:col-span-4 space-y-6">
                    <PremiumCard className="p-6">
                        <h3 className="text-xs font-black text-white uppercase flex items-center gap-3 mb-6 tracking-widest"><Building size={18}/> Le Projet</h3>
                        <div className="bg-black/40 p-4 rounded-2xl mb-6 border border-white/5">
                            <div className="mb-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Usage</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['LOC', 'RP', 'RS'].map(t => (
                                        <button key={t} onClick={() => setProjectType(t as any)} className={`text-[10px] font-bold py-2 rounded-lg transition-all ${projectType === t ? "bg-zinc-700 text-white shadow-inner" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{t === 'LOC' ? 'Invest.' : t === 'RP' ? 'Principale' : 'Secondaire'}</button>
                                    ))}
                                </div>
                            </div>
                            {projectType === "LOC" && (
                                <div className="animate-in slide-in-from-top-2 fade-in">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stratégie Locative</label>
                                        <Help title="Stratégie Locative" text="LMNP (Meublé) : Permet l'amortissement du bien. NU (Foncier) : Revenus fonciers classiques."/>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['LMNP', 'NUE', 'LCD'].map(s => (
                                            <button key={s} onClick={() => setRentalStrategy(s as any)} className={`text-[10px] font-bold py-2 rounded-lg transition-all ${rentalStrategy === s ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Prix Achat</label><Input type="number" value={price} onChange={e => handleInput(setPrice, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Travaux</label><Input type="number" value={works} onChange={e => handleInput(setWorks, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Apport</label><Input type="number" value={apport} onChange={e => handleInput(setApport, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Notaire (%)</label>
                                    <Help title="Frais de Notaire" text="~8% dans l'ancien, ~2.5% dans le neuf."/>
                                </div>
                                <Input type="number" step="0.1" value={notaryRate} onChange={e => handleInput(setNotaryRate, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/>
                            </div>
                            
                            <div className="pt-4 border-t border-white/5 space-y-3">
                                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"><Landmark size={12}/> Financement Bancaire</h4>
                                <div className="space-y-3">
                                    <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                                    <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-4">
                                <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2"><Home size={12}/> Exploitation & Charges</h4>
                                
                                {projectType === "LOC" && (
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Loyer Mensuel CC</label><Input type="number" value={rent} onChange={e => handleInput(setRent, e.target.value)} className="bg-black/40 border-white/10 h-12 text-emerald-400 font-bold"/></div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Charges /m</label><Input type="number" value={charges} onChange={e => handleInput(setCharges, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Taxe Foncière /an</label><Input type="number" value={tax} onChange={e => handleInput(setTax, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                                </div>
                            </div>
                        </div>
                    </PremiumCard>
                </div>

                {/* Dashboard Results */}
                <div className="xl:col-span-8 space-y-6">
                    {projectType === "LOC" ? (
                        <PremiumCard className={`p-10 text-center flex flex-col items-center justify-center min-h-[300px] border transition-all duration-500 ${cashflowNetImpots < 0 ? 'border-rose-500/40 shadow-[0_0_50px_-10px_rgba(225,29,72,0.3)]' : 'border-emerald-500/20 shadow-[0_0_50px_-10px_rgba(16,185,129,0.15)]'}`}>
                            <div className="flex items-center gap-2 mb-6 justify-center">
                                <span className={`text-xs font-black uppercase tracking-[0.3em] ${cashflowNetImpots > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>CASHFLOW NET D'IMPÔT / MOIS</span>
                                <Help title="Cashflow Net d'Impôt" text="Loyers - (Crédit + Charges + Taxe Fonc. + Impôts). C'est votre cash réel."/>
                            </div>
                            <div className={`text-8xl font-black tracking-tighter mb-8 transition-colors duration-500 ${cashflowNetImpots > 0 ? 'text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-300 drop-shadow-[0_0_40px_rgba(52,211,153,0.4)]' : 'text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]'}`}>
                                {cashflowNetImpots > 0 ? '+':''}<AnimatedNumber value={Math.round(cashflowNetImpots)}/>
                            </div>
                            <div className="flex justify-center gap-12 text-sm font-bold w-full max-w-lg bg-black/30 p-4 rounded-2xl border border-white/5">
                                <div className="text-zinc-400 flex flex-col">Avant Impôt <span className="text-white text-lg">{cashflowBrut > 0 ? "+":""}{Math.round(cashflowBrut)}€</span></div>
                                <div className="w-[1px] bg-white/10"></div>
                                <div className="text-zinc-400 flex flex-col">Fiscalité Moy. <span className="text-amber-500 text-lg">-{Math.round(Math.min(fiscalData.micro.total, fiscalData.reel.total)/12)}€</span></div>
                            </div>
                        </PremiumCard>
                    ) : (
                        <PremiumCard className="p-10 text-center flex flex-col items-center justify-center min-h-[300px] border-amber-500/20">
                            <div className="flex items-center gap-2 mb-4 justify-center">
                                <span className="text-xs font-black text-amber-500 uppercase tracking-[0.4em]">COÛT MENSUEL TOTAL</span>
                                <Help title="Coût Mensuel" text="Sortie de trésorerie totale : Crédit + Charges + Taxe Foncière lissée."/>
                            </div>
                            <div className="text-7xl font-black text-white tracking-tighter mb-4">-<AnimatedNumber value={Math.round(monthlyPayment + Number(charges) + (Number(tax)/12))}/></div>
                            <div className="flex gap-4 text-xs font-bold text-zinc-500 bg-white/5 px-6 py-2 rounded-full border border-white/10">
                                <span>Crédit: {Math.round(monthlyPayment)}€</span>
                                <span>Charges: {Math.round(Number(charges))}€</span>
                                <span>Taxe: {Math.round(Number(tax)/12)}€</span>
                            </div>
                        </PremiumCard>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        {projectType === "LOC" ? (
                            <PremiumCard color="emerald" className="p-6 flex flex-col items-center justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Rendement Brut</p>
                                    <Help title="Rendement Brut" text="(Loyer Annuel / Coût Total Projet) x 100."/>
                                </div>
                                <div className="text-5xl font-black text-white">{yieldNet.toFixed(2)}<span className="text-emerald-500 text-2xl">%</span></div>
                            </PremiumCard>
                        ) : (
                            // POUR RP/RS : On remplace Rendement par Coût Crédit Total
                            <PremiumCard color="rose" className="p-6 flex flex-col items-center justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Coût Total Crédit</p>
                                    <Help title="Coût Crédit" text="Total des intérêts payés à la banque sur toute la durée."/>
                                </div>
                                <div className="text-5xl font-black text-white">{formatEuro(Math.round(totalCreditCost))}<span className="text-rose-500 text-2xl text-xs ml-2">Intérêts</span></div>
                            </PremiumCard>
                        )}
                        <PremiumCard color="indigo" className="p-6 flex flex-col items-center justify-center">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Coût Projet</p>
                            <div className="text-5xl font-black text-white">{Math.round(totalCost/1000)}<span className="text-indigo-500 text-2xl">k€</span></div>
                        </PremiumCard>
                    </div>

                    {/* GRAPHIQUE AMORTISSEMENT CRÉDIT (NOUVEAU) */}
                    <PremiumCard className="p-8 border-white/5 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3"><BarChart3 size={18} className="text-blue-500"/> Amortissement du Capital</h4>
                            <div className="text-xs text-zinc-500 font-mono">Projection sur {duration} ans</div>
                        </div>
                        <div className="h-[250px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={amortizationSchedule} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val, index) => index % 5 === 0 ? val : ''} />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize:'12px' }} itemStyle={{ color: '#fff' }} formatter={(val: any) => formatEuro(val)}/>
                                    <Area type="monotone" dataKey="capital" stackId="1" stroke="#3b82f6" fill="url(#colorCapital)" name="Capital Restant" strokeWidth={2}/>
                                    <Area type="monotone" dataKey="interests" stackId="2" stroke="#ef4444" fill="url(#colorInterest)" name="Intérêts Cumulés" strokeWidth={2}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </PremiumCard>

                    {/* PIE CHART COÛT */}
                    <PremiumCard className="p-8 flex flex-col md:flex-row items-center gap-8 border-white/5">
                        <div className="w-full md:w-1/2 space-y-6">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3"><PieIcon size={18} className="text-zinc-500"/> Répartition du Coût</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3"><div className="w-2 h-8 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div><span className="text-xs font-bold text-zinc-300">Prix Net</span></div>
                                    <span className="text-base font-black text-white">{formatEuro(Number(price) || 0)}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3"><div className="w-2 h-8 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div><span className="text-xs font-bold text-zinc-300">Travaux</span></div>
                                    <span className="text-base font-black text-white">{formatEuro(Number(works) || 0)}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3"><div className="w-2 h-8 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div><span className="text-xs font-bold text-zinc-300">Frais Notaire</span></div>
                                    <span className="text-base font-black text-white">{formatEuro(notaryFees)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dataCost} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={10}>
                                        {dataCost.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid #333', color:'#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff' }} formatter={(value:any) => formatEuro(value)}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </PremiumCard>

                    <div className="flex gap-4">
                        <Input placeholder="Nom du projet (ex: Studio Lille)" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-zinc-900 border-white/10 h-14 rounded-2xl text-white focus:border-indigo-500"/>
                        <Button onClick={saveSimulation} className="h-14 px-8 bg-white text-black hover:bg-zinc-200 font-bold rounded-2xl gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"><Save size={20}/> Sauvegarder</Button>
                    </div>
                </div>
            </motion.div>
          )}

          {/* --- VUE FISCALITÉ EXPERT --- */}
          {mode === "FISCALITE" && (
            <motion.div key="fiscal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-8">
                
                {projectType === "LOC" ? (
                    // --- MATRICE LOCATIVE ---
                    <PremiumCard className="p-10 bg-gradient-to-br from-[#0B0B0F] to-black border-indigo-500/20">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30"><Scale size={24}/></div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Matrice Fiscale <span className="text-indigo-500">Expert</span></h2>
                                    <p className="text-zinc-400 text-sm">Comparatif détaillé des régimes fiscaux pour votre situation.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-xl border border-white/5">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase ml-2 flex items-center gap-2">Votre TMI <Help title="TMI" text="Taux Marginal d'Imposition. Le taux auquel sont taxés vos revenus supplémentaires."/></span>
                                <div className="flex gap-1">
                                    {[0, 11, 30, 41, 45].map((t) => (
                                        <button key={t} onClick={() => setUserTMI(t)} className={`h-8 w-10 rounded-lg text-xs font-bold transition-all ${userTMI === t ? "bg-indigo-600 text-white shadow-md" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}>{t}%</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* TABLEAU */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Labels */}
                            <div className="space-y-4 pt-16 text-right text-sm text-zinc-400 font-medium">
                                <div className="h-10 flex items-center justify-end gap-2">Recettes Locatives <Help title="Recettes" text="Loyer Hors Charges encaissé sur l'année."/></div>
                                <div className="h-10 flex items-center justify-end gap-2">Charges Déductibles <Help title="Charges" text="Taxe foncière, Charges de copro, Assurances, Gestion, Réparations..."/></div>
                                <div className="h-10 flex items-center justify-end gap-2 text-blue-400">Intérêts d'Emprunt <Help title="Intérêts (Année 1)" text="Pour cette simulation, nous prenons les intérêts de la 1ère année (les plus élevés) afin de maximiser le déficit au démarrage. Ils sont 100% déductibles au Réel."/></div>
                                <div className="h-10 flex items-center justify-end gap-2 text-indigo-400">Amortissement (LMNP) <Help title="Amortissement" text="Charge fictive calculée sur la valeur du bien (Hors terrain) + Travaux + Meubles. Elle réduit drastiquement votre base imposable sans sortir de trésorerie."/></div>
                                <div className="h-1 p-0 m-0"></div>
                                <div className="h-10 flex items-center justify-end text-white font-bold">Base Imposable</div>
                                <div className="h-10 flex items-center justify-end gap-2 text-amber-500">Impôt Final (TMI + PS) <Help title="Impôt Final" text={`Calculé ainsi : Base Imposable x (${userTMI}% TMI + 17.2% Prélèvements Sociaux).`}/></div>
                            </div>

                            {/* Colonne MICRO */}
                            <div className={`rounded-2xl p-6 border transition-all duration-500 ${fiscalData.micro.total < fiscalData.reel.total ? "bg-emerald-900/10 border-emerald-500/50 relative overflow-hidden" : "bg-black/20 border-white/5"}`}>
                                {fiscalData.micro.total < fiscalData.reel.total && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>}
                                <div className="text-center mb-6">
                                    <h4 className="font-black text-white uppercase tracking-wider">Régime Micro</h4>
                                    <span className="text-[10px] text-zinc-500">Abattement forfaitaire</span>
                                </div>
                                <div className="space-y-4 text-center font-mono text-sm">
                                    <div className="h-10 flex items-center justify-center text-white">{formatEuro(Number(rent)*12)}</div>
                                    <div className="h-10 flex items-center justify-center text-zinc-600 italic">Forfaitaire</div>
                                    <div className="h-10 flex items-center justify-center text-zinc-600 italic">Non déductible</div>
                                    <div className="h-10 flex items-center justify-center text-zinc-600 italic">Non applicable</div>
                                    <div className="h-1 bg-white/5 my-2"></div>
                                    <div className="h-10 flex items-center justify-center text-white font-bold text-lg">{formatEuro(fiscalData.micro.base)}</div>
                                    <div className="h-10 flex items-center justify-center text-amber-500 font-bold">{formatEuro(fiscalData.micro.total)}</div>
                                </div>
                            </div>

                            {/* Colonne RÉEL */}
                            <div className={`rounded-2xl p-6 border transition-all duration-500 ${fiscalData.reel.total <= fiscalData.micro.total ? "bg-emerald-900/10 border-emerald-500/50 relative overflow-hidden" : "bg-black/20 border-white/5"}`}>
                                {fiscalData.reel.total <= fiscalData.micro.total && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>}
                                <div className="text-center mb-6">
                                    <h4 className="font-black text-white uppercase tracking-wider">Régime Réel</h4>
                                    <span className="text-[10px] text-zinc-500">Charges + Amortissement</span>
                                </div>
                                <div className="space-y-4 text-center font-mono text-sm">
                                    <div className="h-10 flex items-center justify-center text-white">{formatEuro(Number(rent)*12)}</div>
                                    <div className="h-10 flex items-center justify-center text-zinc-300">-{formatEuro(fiscalData.reel.charges)}</div>
                                    <div className="h-10 flex items-center justify-center text-blue-400 font-bold">-{formatEuro(Math.round(yearOneInterest))}</div>
                                    <div className="h-10 flex items-center justify-center text-indigo-400 font-bold">-{formatEuro(Math.round(fiscalData.reel.amortissement))}</div>
                                    <div className="h-1 bg-white/5 my-2"></div>
                                    <div className="h-10 flex items-center justify-center text-white font-bold text-lg">{fiscalData.reel.base === 0 ? "0 € (Déficit)" : formatEuro(fiscalData.reel.base)}</div>
                                    <div className="h-10 flex items-center justify-center text-amber-500 font-bold">{formatEuro(fiscalData.reel.total)}</div>
                                </div>
                            </div>
                        </div>

                        {/* EXPLICATION CALCUL RÉEL */}
                        <div className="mt-8 p-6 bg-zinc-900/50 rounded-2xl border border-white/5 flex gap-4">
                            <div className="shrink-0 pt-1"><AlertCircle size={18} className="text-blue-400"/></div>
                            <div className="text-xs text-zinc-400 leading-relaxed">
                                <p className="text-white font-bold mb-1">Détail du Résultat Fiscal (Année 1)</p>
                                Le résultat fiscal au régime Réel est l'opération exacte appliquée par l'administration : <strong className="text-white">Loyers perçus</strong> moins <strong className="text-white">Charges Réelles</strong>, moins <strong className="text-blue-400">Intérêts Bancaires</strong>, moins <strong className="text-indigo-400">Amortissement Comptable</strong>. Un résultat négatif = Déficit foncier (reportable les années suivantes) et 0€ d'impôt.
                            </div>
                        </div>
                    </PremiumCard>
                ) : (
                    // --- MODE PLUS-VALUE (RP / RS) ---
                    <PremiumCard color="emerald" className="p-10 bg-gradient-to-br from-[#0B0B0F] to-black border-emerald-500/20">
                        {/* (Code identique à la version précédente pour la Plus-Value, je le garde pour la cohérence) */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30"><TrendingUp size={24}/></div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Plus-Value <span className="text-emerald-500">Immobilière</span></h2>
                                <p className="text-zinc-400 text-sm">Simulation à la revente (Régime des particuliers 2026)</p>
                            </div>
                        </div>

                        {projectType === "RP" ? (
                            // CARTE GOLD EXONERATION RP
                            <div className="p-10 rounded-3xl bg-gradient-to-br from-amber-900/20 via-zinc-900 to-black border border-amber-500/30 text-center relative overflow-hidden shadow-[0_0_50px_-10px_rgba(245,158,11,0.2)]">
                                <div className="absolute top-0 right-0 p-32 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="inline-flex p-4 rounded-full bg-amber-500/20 text-amber-400 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                                    <Crown size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-wide">Le Graal Fiscal : <span className="text-amber-400">Exonération Totale</span></h3>
                                <p className="text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-8">
                                    En droit français, la vente de la résidence principale est le seul acte d'enrichissement massif qui échappe totalement à l'impôt. 
                                    La plus-value réalisée (différence entre prix d'achat et prix de vente) est <strong className="text-white">100% exonérée d'Impôt sur le Revenu ET de Prélèvements Sociaux</strong> (17.2%), peu importe le montant du gain et la durée de détention.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
                                    <div className="bg-black/50 p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase">Prix Revente Estimé</p>
                                            <Help title="Revente" text="Montant estimé auquel vous vendrez le bien dans quelques années."/>
                                        </div>
                                        <Input type="number" value={resalePrice} onChange={e => handleInput(setResalePrice, e.target.value)} className="bg-transparent border-white/10 h-14 text-white font-black text-3xl px-0 focus-visible:ring-0 focus:border-amber-500"/>
                                    </div>
                                    <div className="bg-black/50 p-6 rounded-2xl border border-amber-500/20 relative overflow-hidden">
                                        <div className="absolute right-0 top-0 h-full w-2 bg-amber-500"></div>
                                        <p className="text-[10px] text-amber-500 font-bold uppercase mb-2">Net Vendeur (Gain Brut)</p>
                                        <p className="text-4xl font-black text-white">{formatEuro(Math.max(0, (Number(resalePrice)||0) - Number(price)))}</p>
                                        <p className="text-xs text-zinc-500 mt-2 font-bold flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500"/> 0€ d'impôt à payer</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // CARTE RS
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="p-8 bg-zinc-900/50 rounded-3xl border border-white/5 space-y-6">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Paramètres de sortie</h4>
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Prix de Revente Estimé</label><Input type="number" value={resalePrice} onChange={e => handleInput(setResalePrice, e.target.value)} className="bg-black/40 border-white/10 h-14 text-white font-bold text-xl"/></div>
                                    <PremiumSlider label="Années de détention" value={holdingYears} min={1} max={35} step={1} unit="ans" onChange={setHoldingYears}/>
                                </div>

                                <div className="p-8 bg-zinc-900/50 rounded-3xl border border-white/5 flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                                        <span className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">Base Acquisition <Help title="Base d'Acquisition" text="Prix d'achat majoré des frais de notaire et travaux (Réels ou forfaits fiscaux de 7.5% et 15%). Ceci permet de baisser artificiellement la plus-value."/></span>
                                        <span className="text-lg font-bold text-white">{formatEuro(capitalGainData.acquisitionPrice)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-zinc-400">Plus-Value Brute</span>
                                        <span className="text-xl font-bold text-white">{formatEuro(capitalGainData.grossGain)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="text-sm text-zinc-400 flex items-center gap-2">Impôt Total (IR + PS) <Help title="Impôt et Abattement" text={`Calculé sur la PV Brute avec un abattement pour durée de détention (${holdingYears} ans). L'impôt sur le revenu (19%) s'annule après 22 ans, et la CSG (17.2%) après 30 ans.`}/></span>
                                        <span className={`text-xl font-bold ${capitalGainData.totalTax > 0 ? "text-red-500" : "text-emerald-500"}`}>-{formatEuro(capitalGainData.totalTax)}</span>
                                    </div>
                                    <div className="pt-6 border-t border-white/10">
                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 block mb-2">PLUS-VALUE NETTE (DANS LA POCHE)</span>
                                        <span className="text-5xl font-black text-white tracking-tighter">{formatEuro(capitalGainData.netGain)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </PremiumCard>
                )}
            </motion.div>
          )}

          {/* --- VUE MES PROJETS --- */}
          {mode === "PROJETS" && (
            <motion.div key="list" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedSimulations.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-[40px]">
                        <FolderOpen size={48} className="mb-4 opacity-50"/>
                        <p className="font-bold">Aucun projet sauvegardé</p>
                        <p className="text-sm">Lancez une simulation pour commencer</p>
                    </div>
                )}
                {savedSimulations.map((sim) => (
                    <PremiumCard key={sim.id} className="p-6 group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-lg font-bold text-white mb-1">{sim.name}</h4>
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded uppercase tracking-wider">{sim.data.projectType} • {sim.data.rentalStrategy}</span>
                            </div>
                            <p className="text-[10px] text-zinc-600 font-mono">{new Date(sim.date).toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="text-xs text-zinc-500 font-bold uppercase">Cashflow Net</span>
                                <span className={`text-xl font-black ${sim.data.cashflowNetImpots > 0 ? "text-emerald-400" : "text-rose-500"}`}>{Math.round(sim.data.cashflowNetImpots)}€</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="text-xs text-zinc-500 font-bold uppercase">Rendement</span>
                                <span className="text-xl font-black text-white">{Number(sim.data.yieldNet).toFixed(2)}%</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => loadSimulation(sim)} className="flex-1 bg-white text-black hover:bg-zinc-200 h-10 rounded-xl text-xs font-bold uppercase shadow-lg"><MousePointerClick size={14} className="mr-2"/> Ouvrir</Button>
                            <Button onClick={() => deleteSimulation(sim.id)} className="w-10 bg-red-500/10 text-red-500 hover:bg-red-500/20 h-10 rounded-xl"><Trash2 size={14}/></Button>
                        </div>
                    </PremiumCard>
                ))}
            </motion.div>
          )}

          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}