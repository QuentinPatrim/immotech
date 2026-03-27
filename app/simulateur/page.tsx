"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Home, Building, Wallet, Landmark, CheckCircle, PieChart as PieIcon, Scale, Briefcase, Save, HelpCircle, FileText, Trash2, FolderOpen, MousePointerClick, TrendingUp, AlertTriangle, Crown, BarChart3, Check, Printer, Shield, PiggyBank, BookOpen, X, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import { useReactToPrint } from "react-to-print"; 
import { NexusLogo } from "@/components/NexusLogo"; 
import PremiumGuard from "@/components/PremiumGuard";
import FiscaliteEngine from "./Fiscaliteengine";
import DossierBancairePro from "./DossierBancairePro";
import RapportFiscalPDF from "./RapportFiscalpdf";
import HelpTooltip from "@/components/HelpTooltip";
import { formatEuro } from "@/lib/formatters";

// ==========================================
// 1. POP-UP D'ACCUEIL : MASTERCLASS IMMO
// ==========================================
const TUTORIAL_STEPS = [
  {
    title: "Devenez un investisseur pro",
    subtitle: "LE SIMULATEUR IMMOBILIER",
    description: "L'immobilier est le meilleur moyen de s'enrichir grâce à l'argent de la banque. Ce simulateur est divisé en 4 étapes pour vous guider de la recherche de votre budget jusqu'à l'impression de votre dossier bancaire.",
    icon: Building, color: "text-indigo-400", bgGlow: "bg-indigo-500/20",
  },
  {
    title: "Étape 1 : Le Budget",
    subtitle: "ONGLET CAPACITÉ",
    description: "Avant de visiter des biens, il faut savoir combien la banque peut vous prêter. Renseignez vos revenus et votre apport. L'algorithme calcule instantanément votre enveloppe d'achat maximale.",
    icon: Wallet, color: "text-blue-400", bgGlow: "bg-blue-500/20",
  },
  {
    title: "Étape 2 : Le vrai rendement",
    subtitle: "ONGLET RENTABILITÉ",
    description: "Vous avez repéré une annonce ? Entrez son prix et le loyer espéré. Nexus va générer votre tableau d'amortissement et vous donner le chiffre clé : le Cashflow (l'argent net qui rentre ou sort de votre poche chaque mois).",
    icon: Calculator, color: "text-emerald-400", bgGlow: "bg-emerald-500/20",
  },
  {
    title: "Étape 3 : Gommer l'impôt",
    subtitle: "ONGLET FISCALITÉ (PREMIUM)",
    description: "Les impôts peuvent tuer la rentabilité d'un projet. Cet onglet compare les régimes fiscaux (LMNP, Micro, Réel) pour vous montrer comment utiliser l'amortissement comptable afin de payer 0€ d'impôt légalement.",
    icon: Scale, color: "text-yellow-400", bgGlow: "bg-yellow-500/20",
  },
  {
    title: "Étape 4 : Convaincre la banque",
    subtitle: "ONGLET PROJETS & EXPORT",
    description: "Sauvegardez vos meilleures simulations. En un clic, générez un dossier PDF professionnel et chiffré à poser sur le bureau de votre banquier pour obtenir votre prêt plus facilement.",
    icon: FolderOpen, color: "text-purple-400", bgGlow: "bg-purple-500/20",
  }
];

function SimulateurTutorialModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => { if (isOpen) setCurrentStep(0); }, [isOpen]);
  if (!isOpen) return null;
  const StepIcon = TUTORIAL_STEPS[currentStep].icon;
  const handleNext = () => { if (currentStep < TUTORIAL_STEPS.length - 1) setCurrentStep(prev => prev + 1); else onClose(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl bg-[#0A0A0C] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] blur-[100px] rounded-full transition-colors duration-700 opacity-20 pointer-events-none ${TUTORIAL_STEPS[currentStep].bgGlow}`} />
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors z-20 bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/5"><X size={20} /></button>
        <div className="p-8 sm:p-12 relative z-10 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col items-center text-center space-y-6">
              <div className={`w-20 h-20 rounded-3xl bg-[#121214] border border-white/10 flex items-center justify-center shadow-2xl ${TUTORIAL_STEPS[currentStep].color}`}><StepIcon size={40} /></div>
              <div className="space-y-3"><p className={`text-xs font-black uppercase tracking-[0.2em] ${TUTORIAL_STEPS[currentStep].color}`}>{TUTORIAL_STEPS[currentStep].subtitle}</p><h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">{TUTORIAL_STEPS[currentStep].title}</h2></div>
              <p className="text-zinc-300 text-base sm:text-lg leading-relaxed mt-4 max-w-xl font-medium">{TUTORIAL_STEPS[currentStep].description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="bg-[#121214] border-t border-white/10 p-6 sm:p-8 flex items-center justify-between relative z-10 shrink-0">
            <div className="flex gap-2.5">{TUTORIAL_STEPS.map((_, index) => (<div key={index} className={`h-2 rounded-full transition-all duration-300 ${index === currentStep ? "w-8 bg-white" : "w-2 bg-zinc-700"}`} />))}</div>
            <Button onClick={handleNext} className="bg-white hover:bg-zinc-200 hover:scale-105 active:scale-95 text-black font-black uppercase tracking-widest rounded-xl px-8 py-6 text-sm transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                {currentStep === TUTORIAL_STEPS.length - 1 ? <span className="flex items-center gap-3">J'ai compris <Check size={18} /></span> : <span className="flex items-center gap-3">Suivant <ArrowRight size={18} /></span>}
            </Button>
        </div>
      </motion.div>
    </div>
  );
}


// --- COMPOSANTS UI ---
const PremiumSlider = ({ label, value, min, max, step, unit, onChange }: any) => (
    <div className="group relative bg-black/40 rounded-2xl p-3 md:p-4 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 w-full overflow-hidden max-w-full">
        <div className="flex justify-between items-end mb-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{label}</label>
            <div className="font-mono text-lg md:text-xl font-black text-white shrink-0">
                {value}<span className="text-xs md:text-sm text-zinc-600 font-medium ml-0.5">{unit}</span>
            </div>
        </div>
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="py-2 cursor-grab active:cursor-grabbing w-full" />
    </div>
);

const PremiumCard = ({ children, className = "", color = "indigo" }: { children: React.ReactNode, className?: string, color?: string }) => {
    const borderColor = color === "emerald" ? "hover:border-emerald-500/30" : color === "rose" ? "hover:border-rose-500/30" : color === "amber" ? "hover:border-amber-500/30" : color === "blue" ? "hover:border-blue-500/30" : "hover:border-indigo-500/30";
    return <div className={`relative w-full overflow-hidden rounded-[24px] md:rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 transition-all duration-500 ${borderColor} hover:bg-zinc-900/60 group hover:z-50 ${className}`}>{children}</div>;
};

export default function SimulateurPage() {
  const [mode, setMode] = useState<"CAPACITE" | "RENTABILITE" | "FISCALITE" | "PROJETS">("CAPACITE");
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [projectName, setProjectName] = useState("");
  const [importingId, setImportingId] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const componentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<any>(null); 
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);

  // Rapport fiscal PDF
  const fiscalRef = useRef<HTMLDivElement>(null);
  const [isFiscalPrintReady, setIsFiscalPrintReady] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Dossier_Financement_Nexus",
    onAfterPrint: () => { setIsReadyToPrint(false); }
  });

  const handleFiscalPrint = useReactToPrint({
    contentRef: fiscalRef,
    documentTitle: "Rapport_Fiscal_Nexus_2026",
    onAfterPrint: () => { setIsFiscalPrintReady(false); }
  });

  useEffect(() => {
    if (isReadyToPrint && printData) { handlePrint(); }
  }, [isReadyToPrint, printData, handlePrint]);

  useEffect(() => {
    if (isFiscalPrintReady) { handleFiscalPrint(); }
  }, [isFiscalPrintReady, handleFiscalPrint]);

  const prepareAndPrint = (sim: any) => {
      setPrintData(sim.data ? { ...sim.data, name: sim.name } : null);
      setIsReadyToPrint(true);
  };

  const [revenue, setRevenue] = useState<number | string>(2500);
  const [credits, setCredits] = useState<number | string>(0);
  const [duration, setDuration] = useState(25);
  const [rate, setRate] = useState(3.8);
  const [apportCapacity, setApportCapacity] = useState<number | string>(30000); 
  const [maxLoan, setMaxLoan] = useState(0);
  const [maxMonthly, setMaxMonthly] = useState(0);
  const [totalEnvelope, setTotalEnvelope] = useState(0); 
  const [price, setPrice] = useState<number | string>(200000);
  const [works, setWorks] = useState<number | string>(0);
  const [notaryRate, setNotaryRate] = useState<number | string>(8); 
  const [apport, setApport] = useState<number | string>(20000);
  const [projectType, setProjectType] = useState<"RP" | "RS" | "LOC">("LOC"); 
  const [rentalStrategy, setRentalStrategy] = useState<"NUE" | "LMNP" | "LCD">("LMNP"); 
  const [userTMI, setUserTMI] = useState(30); 
  const [resalePrice, setResalePrice] = useState<number | string>(300000);
  const [holdingYears, setHoldingYears] = useState(10);
  const [rent, setRent] = useState<number | string>(1200);
  const [charges, setCharges] = useState<number | string>(100);
  const [tax, setTax] = useState<number | string>(800); 
  const [cashflowBrut, setCashflowBrut] = useState(0); 
  const [cashflowNetImpots, setCashflowNetImpots] = useState(0); 
  const [yieldNet, setYieldNet] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [notaryFees, setNotaryFees] = useState(0);
  const [totalCreditCost, setTotalCreditCost] = useState(0);
  const [fiscalData, setFiscalData] = useState({ micro: { total: 0, base: 0 }, reel: { total: 0, charges: 0, interests: 0, amortissement: 0, base: 0 } });
  const [capitalGainData, setCapitalGainData] = useState({ grossGain: 0, acquisitionPrice: 0, totalTax: 0, netGain: 0 });
  const [yearOneInterest, setYearOneInterest] = useState(0);
  const [amortizationSchedule, setAmortizationSchedule] = useState<any[]>([]);

  const handleInput = (setter: (v: any) => void, val: string) => { if (val === "") setter(""); else setter(Number(val)); };

  useEffect(() => {
    const init = async () => {
        const hasSeenTutorial = localStorage.getItem("nexus_simulateur_tuto_seen");
        if (!hasSeenTutorial) setTimeout(() => setIsTutorialOpen(true), 800);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('is_pro, simulations_json').eq('id', session.user.id).single();
            if (data) {
                setIsPro(data.is_pro === true);
                if (data.simulations_json) setSavedSimulations(data.simulations_json);
            }
        }
    };
    init();
  }, []);

  useEffect(() => {
    const safeRevenue = Number(revenue) || 0;
    const safeCredits = Number(credits) || 0;
    const safeApportCap = Number(apportCapacity) || 0;
    const availableIncome = (safeRevenue * 0.35) - safeCredits;
    const mRate = rate / 100 / 12;
    const nMonths = duration * 12;
    let capacity = 0;
    if (availableIncome > 0) capacity = availableIncome * (1 - Math.pow(1 + mRate, -nMonths)) / mRate;
    setMaxLoan(Math.max(0, Math.round(capacity)));
    setMaxMonthly(Math.max(0, Math.round(availableIncome)));
    setTotalEnvelope(Math.max(0, Math.round(capacity)) + safeApportCap);

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
    let mensu = 0; let y1Interest = 0; let costCredit = 0; let schedule = [];
    if (loanAmount > 0) {
        mensu = loanAmount * (mRate / (1 - Math.pow(1 + mRate, -nMonths)));
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
            if (y === 1) y1Interest = interestYear; 
            cumulativeInterests += interestYear;
            schedule.push({ year: `An ${y}`, capital: Math.max(0, Math.round(remainingCapital)), interests: Math.round(cumulativeInterests) });
        }
        costCredit = (mensu * nMonths) - loanAmount;
    }
    setMonthlyPayment(mensu); setYearOneInterest(y1Interest); setTotalCreditCost(costCredit); setAmortizationSchedule(schedule);

    const annualRent = safeRent * 12;
    const annualCharges = (safeCharges * 12) + safeTax;
    const annualCredit = mensu * 12;
    const cfBrutAnnual = annualRent - annualCharges - annualCredit;
    setCashflowBrut(cfBrutAnnual / 12);

    if (projectType === "LOC") {
        let abattement = 0;
        if (rentalStrategy === "NUE") abattement = 0.30; else if (rentalStrategy === "LMNP") abattement = 0.50; else if (rentalStrategy === "LCD") abattement = 0.71; 
        const baseMicro = Math.max(0, annualRent * (1 - abattement));
        const taxMicro = baseMicro * (userTMI / 100) + baseMicro * 0.172;
        let amo = 0;
        if (rentalStrategy !== "NUE") { const bati = safePrice * 0.85; amo = (bati / 30) + (safeWorks / 15) + (5000 / 7) + (notFees / 25); }
        const resultatComptable = annualRent - annualCharges - y1Interest - amo; 
        const baseReel = Math.max(0, resultatComptable);
        const taxReel = baseReel * (userTMI / 100) + baseReel * 0.172;
        setFiscalData({ micro: { base: baseMicro, total: taxMicro }, reel: { base: baseReel, total: taxReel, charges: annualCharges, interests: y1Interest, amortissement: amo } });
        const bestTax = Math.min(taxMicro, taxReel);
        setCashflowNetImpots((cfBrutAnnual - bestTax) / 12);
        setYieldNet(total > 0 ? ((annualRent - annualCharges) / total) * 100 : 0);
    } else {
        setCashflowNetImpots(-(mensu + safeCharges + (safeTax / 12)));
        setYieldNet(0); 
        const notaireRetenu = Math.max(notFees, safePrice * 0.075);
        const travauxRetenus = holdingYears > 5 ? Math.max(safeWorks, safePrice * 0.15) : safeWorks;
        const acquisitionRetenue = safePrice + notaireRetenu + travauxRetenus;
        const grossGain = Math.max(0, (Number(resalePrice)||0) - acquisitionRetenue);
        let taxTotal = 0;
        if (projectType === "RS") { const abattementApprox = Math.min(1, Math.max(0, (holdingYears - 5) * 0.06)); taxTotal = grossGain * (1 - abattementApprox) * (0.362); }
        setCapitalGainData({ grossGain, acquisitionPrice: acquisitionRetenue, totalTax: taxTotal, netGain: grossGain - taxTotal });
    }
  }, [revenue, credits, duration, rate, apportCapacity, price, works, notaryRate, apport, rent, charges, tax, projectType, rentalStrategy, userTMI, resalePrice, holdingYears]);

  const saveSimulation = async () => {
      if (!projectName) { alert("Nommez votre projet !"); return; }
      const newSim = {
          id: Date.now(),
          name: projectName,
          date: new Date().toISOString(),
          data: {
            // Données de base
            price, works, notaryRate, notaryFees, apport, rent, charges, tax,
            duration, rate, totalCreditCost, monthlyPayment, cashflowNetImpots,
            yieldNet, projectType, rentalStrategy, revenue, credits,
            // Données enrichies pour DossierBancairePro
            yearOneInterest, totalCost,
          }
      };
      const updated = [newSim, ...savedSimulations];
      setSavedSimulations(updated);
      setProjectName("");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ simulations_json: updated }).eq('id', user.id);
      setMode("PROJETS");
  };

  const loadSimulation = (sim: any) => {
      const d = sim.data; setPrice(d.price); setWorks(d.works); setNotaryRate(d.notaryRate || 8); setApport(d.apport); setRent(d.rent); setCharges(d.charges); setTax(d.tax); setDuration(d.duration); setRate(d.rate); setProjectType(d.projectType); setRentalStrategy(d.rentalStrategy); setMode("RENTABILITE");
  };

  const importToPatrimoine = async (sim: any) => {
      setImportingId(sim.id);
      const d = sim.data;
      // Redirige vers patrimoine avec les données encodées en URL
      const params = encodeURIComponent(JSON.stringify({
        name: sim.name,
        price: d.price,
        works: d.works,
        notaryFees: d.notaryFees,
        totalCreditCost: d.totalCreditCost,
      }));
      setTimeout(() => {
        window.location.href = `/patrimoine?import=${params}`;
      }, 400);
      setImportingId(null);
  };

  const deleteSimulation = async (id: number) => {
      const updated = savedSimulations.filter(s => s.id !== id);
      setSavedSimulations(updated);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ simulations_json: updated }).eq('id', user.id);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      
      <SimulateurTutorialModal isOpen={isTutorialOpen} onClose={() => { setIsTutorialOpen(false); localStorage.setItem("nexus_simulateur_tuto_seen", "true"); }} />
      
      <Sidebar />
      <main className="md:ml-64 flex-1 w-full md:w-auto min-w-0 p-3 sm:p-4 md:p-8 relative overflow-x-hidden">
        
        <DossierBancairePro refProp={componentRef} data={printData} />
        <RapportFiscalPDF
          refProp={fiscalRef}
          price={Number(price)} works={Number(works)} notaryFees={notaryFees}
          rent={Number(rent)} charges={Number(charges)} tax={Number(tax)}
          monthlyPayment={monthlyPayment} yearOneInterest={yearOneInterest}
          totalCost={totalCost} projectType={projectType} rentalStrategy={rentalStrategy}
          duration={duration} rate={rate} revenue={Number(revenue)}
        />

        {/* Décorations — cachées sur mobile pour éviter overflow */}
        <div className="hidden md:block absolute top-0 left-0 w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>
        <div className="hidden md:block absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] w-full mx-auto space-y-4 md:space-y-8 relative z-10">
          
          {/* ── HEADER ─────────────────────────────────────── */}
          <div className="flex flex-col gap-4 pl-3 md:pl-2 border-l-4 border-indigo-600 py-2 max-w-full">
            {/* Titre */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight uppercase leading-none">
                  Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Simulateur</span>
                </h1>
                <p className="text-zinc-400 text-[10px] sm:text-sm font-light tracking-wide mt-1">Créez votre empire immobilier, étape par étape.</p>
              </div>
              {/* Guide — visible desktop seulement ici */}
              <button onClick={() => setIsTutorialOpen(true)} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest shrink-0">
                <BookOpen size={14} /> <span className="hidden md:inline">Guide</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-zinc-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 grid grid-cols-2 xl:flex gap-1 w-full xl:w-auto max-w-full shadow-2xl">
              {[
                { id: "CAPACITE",    label: "Capacité",   icon: Wallet },
                { id: "RENTABILITE", label: "Renta",      icon: Calculator },
                { id: "FISCALITE",   label: "Fiscalité",  icon: Scale,      premium: true },
                { id: "PROJETS",     label: "Projets",    icon: FolderOpen, premium: true },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id as any)}
                  className={`flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-5 py-2.5 md:py-3 rounded-xl text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                    mode === tab.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "text-zinc-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <tab.icon size={14} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {(tab as any).premium && <Crown size={11} className="text-yellow-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
          
          {mode === "CAPACITE" && (
            <motion.div key="capa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full min-w-0">
               <div className="lg:col-span-4 flex flex-col gap-4 w-full min-w-0">
                    <PremiumCard className="p-3 md:p-6">
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase mb-4 flex items-center gap-2 tracking-widest"><Wallet size={16}/> Revenus</h3>
                        <div className="space-y-3 w-full min-w-0">
                            <div className="space-y-1.5"><label className="text-[9px] font-bold text-zinc-500 uppercase">Salaire Net / Mois</label><Input type="number" value={revenue} onChange={e => handleInput(setRevenue, e.target.value)} className="bg-black/40 border-white/10 h-11 text-white font-bold text-base focus:border-indigo-500 w-full"/></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-bold text-zinc-500 uppercase">Crédits en cours</label><Input type="number" value={credits} onChange={e => handleInput(setCredits, e.target.value)} className="bg-black/40 border-white/10 h-11 text-white font-bold text-base focus:border-indigo-500 w-full"/></div>
                            <div className="space-y-1.5 pt-3 border-t border-white/5"><label className="text-[9px] font-bold text-emerald-500 uppercase">Apport Perso</label><Input type="number" value={apportCapacity} onChange={e => handleInput(setApportCapacity, e.target.value)} className="bg-emerald-900/10 border-emerald-500/20 h-11 text-emerald-400 font-bold text-base focus:border-emerald-500 w-full"/></div>
                        </div>
                    </PremiumCard>
                    <PremiumCard className="p-3 md:p-6">
                        <h3 className="text-[10px] font-black text-blue-400 uppercase mb-4 flex items-center gap-2 tracking-widest"><Landmark size={16}/> Banque</h3>
                        <div className="space-y-3 w-full min-w-0">
                            <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                            <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                        </div>
                    </PremiumCard>
                </div>
                <div className="lg:col-span-8 p-5 md:p-10 rounded-3xl bg-gradient-to-br from-zinc-900 via-black to-blue-950/20 border border-white/10 flex flex-col items-center justify-center text-center shadow-2xl w-full min-w-0 gap-4">
                    <div className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1 flex-wrap">
                        ENVELOPPE GLOBALE D'ACHAT <HelpTooltip text="La somme totale que vous pouvez dépenser (Apport + Prêt bancaire). Votre taux d'endettement maximal est fixé à 35% par la loi."/>
                    </div>
                    <div className="font-black text-white tracking-tighter leading-none w-full text-center" style={{ fontSize: 'clamp(2.5rem, 12vw, 8rem)' }}>
                        <AnimatedNumber value={totalEnvelope} />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 justify-center text-xs font-bold text-zinc-500 bg-white/5 px-4 py-3 rounded-2xl border border-white/5 w-full sm:w-auto">
                        <span className="flex items-center justify-center gap-2"><Landmark size={13} className="text-blue-500 shrink-0"/> Prêt: {formatEuro(maxLoan)}</span>
                        <span className="text-zinc-700 hidden sm:inline">|</span>
                        <span className="flex items-center justify-center gap-2"><PiggyBank size={13} className="text-emerald-500 shrink-0"/> Apport: {formatEuro(Number(apportCapacity))}</span>
                    </div>
                </div>
            </motion.div>
          )}

          {mode === "RENTABILITE" && (
            <motion.div key="renta" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full min-w-0">
                <div className="xl:col-span-4 space-y-4 w-full min-w-0">
                    <PremiumCard className="p-3 md:p-5 relative z-20 w-full">
                        <h3 className="text-[10px] font-black text-white uppercase flex items-center gap-2 mb-3 tracking-widest"><Building size={16}/> Le Projet</h3>

                        {/* Usage */}
                        <div className="bg-black/40 p-3 rounded-xl mb-3 border border-white/5 w-full">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Usage</label>
                            <div className="grid grid-cols-3 gap-1 w-full">
                                {['LOC', 'RP', 'RS'].map(t => (
                                    <button key={t} onClick={() => setProjectType(t as any)} className={`text-[9px] font-bold py-2 rounded-lg transition-all ${projectType === t ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>
                                        {t === 'LOC' ? 'Invest.' : t === 'RP' ? 'Principale' : 'Secondaire'}
                                    </button>
                                ))}
                            </div>
                            {projectType === "LOC" && (
                                <div className="mt-2">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Stratégie Locative</label>
                                    <div className="grid grid-cols-3 gap-1 w-full">
                                        {['LMNP', 'NUE', 'LCD'].map(s => (
                                            <button key={s} onClick={() => setRentalStrategy(s as any)} className={`text-[9px] font-bold py-2 rounded-lg transition-all ${rentalStrategy === s ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Champs */}
                        <div className="space-y-2.5 w-full min-w-0">
                            <div className="min-w-0"><label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Prix Achat</label><Input type="number" value={price} onChange={e => handleInput(setPrice, e.target.value)} className="bg-black/40 border-white/10 h-10 text-white font-bold w-full text-sm"/></div>
                            <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                                <div className="min-w-0"><label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Travaux</label><Input type="number" value={works} onChange={e => handleInput(setWorks, e.target.value)} className="bg-black/40 border-white/10 h-10 text-white font-bold w-full text-sm"/></div>
                                <div className="min-w-0"><label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Apport</label><Input type="number" value={apport} onChange={e => handleInput(setApport, e.target.value)} className="bg-black/40 border-white/10 h-10 text-white font-bold w-full text-sm"/></div>
                            </div>
                            <div className="min-w-0"><label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Notaire (%)</label><Input type="number" step="0.1" value={notaryRate} onChange={e => handleInput(setNotaryRate, e.target.value)} className="bg-black/40 border-white/10 h-10 text-white font-bold w-full text-sm"/></div>
                        </div>

                        {/* Financement */}
                        <div className="pt-3 border-t border-white/5 space-y-2.5 mt-3 w-full">
                            <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"><Landmark size={11}/> Financement Bancaire</h4>
                            <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                            <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                        </div>

                        {/* Revenus locatifs */}
                        <div className="pt-3 border-t border-white/5 space-y-2.5 mt-3 w-full">
                            {projectType === "LOC" && (
                                <div className="min-w-0"><label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Loyer Mensuel CC</label><Input type="number" value={rent} onChange={e => handleInput(setRent, e.target.value)} className="bg-black/40 border-white/10 h-10 text-emerald-400 font-bold w-full text-sm"/></div>
                            )}
                            <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                                <div className="min-w-0"><label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Charges /m</label><Input type="number" value={charges} onChange={e => handleInput(setCharges, e.target.value)} className="bg-black/40 border-white/10 h-10 text-white font-bold w-full text-sm"/></div>
                                <div className="min-w-0"><label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Taxe Fonc. /an</label><Input type="number" value={tax} onChange={e => handleInput(setTax, e.target.value)} className="bg-black/40 border-white/10 h-10 text-white font-bold w-full text-sm"/></div>
                            </div>
                        </div>
                    </PremiumCard>
                </div>
                <div className="xl:col-span-8 space-y-3 w-full min-w-0">
                    {/* ── HERO CARD ── */}
                    {projectType === "LOC" ? (
                        <PremiumCard className={`p-4 md:p-8 text-center flex flex-col items-center justify-center border transition-all duration-500 ${cashflowNetImpots < 0 ? 'border-rose-500/40' : 'border-emerald-500/20'}`}>
                            <div className="flex items-center gap-2 mb-2 justify-center">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${cashflowNetImpots > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>CASHFLOW NET / MOIS</span>
                                <HelpTooltip title="Cashflow Net" text="Loyers - (Crédit + Charges + Taxe Foncière + Impôts). C'est le vrai chiffre qui compte à la fin du mois."/>
                            </div>
                            <div className={`text-[3rem] sm:text-6xl md:text-8xl font-black tracking-tighter leading-none mb-3 ${cashflowNetImpots > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{cashflowNetImpots > 0 ? '+':''}<AnimatedNumber value={Math.round(cashflowNetImpots)}/></div>
                            <div className="flex justify-center gap-6 text-[10px] font-bold w-full bg-black/30 p-2.5 rounded-xl border border-white/5">
                                <div className="text-zinc-400 flex items-center gap-1.5">Avant Impôt<span className="text-white">{cashflowBrut > 0 ? "+":""}{Math.round(cashflowBrut)}€</span></div>
                                <div className="w-px bg-white/10"></div>
                                <div className="text-zinc-400 flex items-center gap-1.5">Fiscalité<span className="text-amber-500">-{Math.round(Math.min(fiscalData.micro.total, fiscalData.reel.total)/12)}€</span></div>
                            </div>
                        </PremiumCard>
                    ) : (
                        <PremiumCard className="p-4 md:p-8 text-center flex flex-col items-center justify-center border-amber-500/20">
                            <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">COÛT MENSUEL TOTAL</div>
                            <div className="text-[3rem] sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-3">-<AnimatedNumber value={Math.round(monthlyPayment + Number(charges) + (Number(tax)/12))}/></div>
                            <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-bold text-zinc-500 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                                <span>Crédit: {Math.round(monthlyPayment)}€</span><span>·</span><span>Charges: {Math.round(Number(charges))}€</span><span>·</span><span>Taxe: {Math.round(Number(tax)/12)}€</span>
                            </div>
                        </PremiumCard>
                    )}

                    {/* ── KPI CARDS ── */}
                    <div className="grid grid-cols-2 gap-3 w-full min-w-0">
                        <PremiumCard color="indigo" className="p-3 md:p-4 flex flex-col items-center justify-center relative min-h-[80px]">
                            <div className="absolute top-1.5 right-1.5"><HelpTooltip title="Coût Projet" text="Prix + Travaux + Notaire. Ne prend pas en compte le coût du crédit."/></div>
                            <p className="text-[8px] text-zinc-500 font-bold uppercase mb-1 text-center">Coût Projet</p>
                            <div className="text-xl sm:text-2xl md:text-4xl font-black text-white leading-none">{Math.round(totalCost/1000)}<span className="text-indigo-500 text-sm">k€</span></div>
                        </PremiumCard>
                        {projectType === "LOC" ? (
                            <PremiumCard color="emerald" className="p-3 md:p-4 flex flex-col items-center justify-center relative min-h-[80px]">
                                <div className="absolute top-1.5 right-1.5"><HelpTooltip title="Rendement Brut" text="(Loyer annuel / Coût d'achat total) * 100."/></div>
                                <p className="text-[8px] text-zinc-500 font-bold uppercase mb-1 text-center">Rendement Brut</p>
                                <div className="text-xl sm:text-2xl md:text-4xl font-black text-white leading-none">{yieldNet.toFixed(2)}<span className="text-emerald-500 text-sm">%</span></div>
                            </PremiumCard>
                        ) : (
                            <PremiumCard color="rose" className="p-3 md:p-4 flex flex-col items-center justify-center relative min-h-[80px]">
                                <div className="absolute top-1.5 right-1.5"><HelpTooltip title="Coût du crédit" text="Total des intérêts versés à la banque."/></div>
                                <p className="text-[8px] text-zinc-500 font-bold uppercase mb-1 text-center">Coût Crédit</p>
                                <div className="text-lg sm:text-xl md:text-3xl font-black text-white leading-none">{Math.round(totalCreditCost/1000)}k€</div>
                            </PremiumCard>
                        )}
                    </div>

                    {/* ── GRAPHIQUE AMORTISSEMENT ── */}
                    <PremiumCard className="p-3 md:p-6 border-white/5 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 min-w-0">
                                <BarChart3 size={14} className="text-blue-500 shrink-0"/>
                                <span className="truncate">Amortissement</span>
                                <HelpTooltip text="Courbe bleue = capital restant dû. Rouge = intérêts cumulés payés à la banque."/>
                            </h4>
                            <div className="text-[9px] text-zinc-500 font-mono shrink-0 ml-2">{duration} ans</div>
                        </div>
                        <div className="h-[140px] sm:h-[180px] md:h-[220px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={amortizationSchedule} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="year" stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val, index) => index % 5 === 0 ? val : ''} />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize:'11px' }} itemStyle={{ color: '#fff' }} formatter={(val: any) => formatEuro(val)}/>
                                    <Area type="monotone" dataKey="capital" stackId="1" stroke="#3b82f6" fill="url(#colorCapital)" name="Capital Restant" strokeWidth={2}/>
                                    <Area type="monotone" dataKey="interests" stackId="2" stroke="#ef4444" fill="url(#colorInterest)" name="Intérêts Cumulés" strokeWidth={2}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </PremiumCard>

                    {/* ── SAUVEGARDE ── */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <Input placeholder="Nom du projet" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-zinc-900 border-white/10 h-11 rounded-xl text-white focus:border-indigo-500 w-full text-sm"/>
                        <Button onClick={saveSimulation} className="h-11 px-5 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl gap-2 shrink-0 w-full sm:w-auto"><Save size={15}/> Sauvegarder</Button>
                    </div>
                </div>
            </motion.div>
          )}

          {mode === "FISCALITE" && (
            <PremiumGuard isPro={isPro} title="Fiscalité Expert" description="Comparez tous les régimes fiscaux, choisissez votre structure juridique et recevez des conseils personnalisés à jour 2026.">
                <motion.div key="fiscal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-w-0 space-y-4">

                  {/* Bouton export rapport fiscal */}
                  <div className="flex justify-end w-full overflow-hidden">
                    <button
                      onClick={() => setIsFiscalPrintReady(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-95 max-w-full"
                      style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", boxShadow: "0 4px 20px -4px rgba(109,40,217,0.5)" }}
                    >
                      <Printer size={14} className="shrink-0" /> <span className="truncate">Rapport Fiscal Client PDF</span>
                    </button>
                  </div>

                  <FiscaliteEngine
                      price={Number(price)}
                      works={Number(works)}
                      notaryFees={notaryFees}
                      rent={Number(rent)}
                      charges={Number(charges)}
                      tax={Number(tax)}
                      monthlyPayment={monthlyPayment}
                      duration={duration}
                      yearOneInterest={yearOneInterest}
                      totalCost={totalCost}
                      projectType={projectType}
                      formatEuro={formatEuro}
                      HelpTooltip={HelpTooltip}
                  />
                </motion.div>
            </PremiumGuard>
          )}

          {mode === "PROJETS" && (
            <PremiumGuard isPro={isPro} title="Portefeuille de Projets" description="Sauvegardez vos simulations et générez des dossiers bancaires PDF professionnels.">
                <motion.div key="list" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-4 w-full min-w-0">

                  {savedSimulations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                        <FileText size={32} />
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">Aucun projet sauvegardé</h3>
                      <p className="text-zinc-400 text-sm max-w-sm">Complétez l'onglet Rentabilité et sauvegardez votre simulation pour générer un dossier bancaire professionnel.</p>
                      <button onClick={() => setMode("RENTABILITE")} className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all">
                        Créer une simulation →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                      {savedSimulations.map((sim) => {
                        const d = sim.data;
                        const isLoc = d.projectType === "LOC";
                        const isRP = d.projectType === "RP";
                        const totalCostSim = (d.price || 0) + (d.works || 0) + (d.notaryFees || 0);
                        const apportPct = totalCostSim > 0 ? (d.apport / totalCostSim) * 100 : 0;
                        const endettement = d.revenue > 0 ? ((d.credits + d.monthlyPayment) / d.revenue) * 100 : 0;
                        return (
                          <div key={sim.id} className="rounded-[20px] bg-zinc-900/40 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 overflow-hidden flex flex-col w-full">
                            <div className={`h-1.5 w-full ${isLoc ? "bg-gradient-to-r from-indigo-500 to-purple-500" : isRP ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-blue-500 to-cyan-500"}`} />

                            <div className="p-4 flex flex-col gap-3 flex-1">
                              {/* Titre + meta */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-bold text-white mb-1 truncate">{sim.name}</h4>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-wider">
                                      {d.projectType === "LOC" ? `LOC · ${d.rentalStrategy || "—"}` : d.projectType === "RP" ? "Résidence Principale" : "Résidence Secondaire"}
                                    </span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold ${endettement < 35 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{endettement.toFixed(0)}% endett.</span>
                                  </div>
                                </div>
                                <p className="text-[9px] text-zinc-600 font-mono shrink-0">{new Date(sim.date).toLocaleDateString()}</p>
                              </div>

                              {/* KPIs */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Coût total</p>
                                  <p className="text-base font-black text-white">{Math.round(totalCostSim/1000)}k€</p>
                                </div>
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Apport</p>
                                  <p className="text-base font-black text-white">{apportPct.toFixed(0)}%</p>
                                </div>
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Mensualité</p>
                                  <p className="text-base font-black text-white">{Math.round(d.monthlyPayment)}€</p>
                                </div>
                                <div className={`rounded-xl p-3 border ${isLoc ? (d.cashflowNetImpots >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20") : "bg-black/30 border-white/5"}`}>
                                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">{isLoc ? "Cashflow/mois" : "Durée"}</p>
                                  <p className={`text-base font-black ${isLoc ? (d.cashflowNetImpots >= 0 ? "text-emerald-400" : "text-rose-400") : "text-white"}`}>
                                    {isLoc ? `${Math.round(d.cashflowNetImpots) > 0 ? "+" : ""}${Math.round(d.cashflowNetImpots)}€` : `${d.duration} ans`}
                                  </p>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-white/5">
                                {/* Dossier bancaire — CTA principal */}
                                <button
                                  onClick={() => prepareAndPrint(sim)}
                                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95"
                                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px -4px rgba(79,70,229,0.5)" }}
                                >
                                  <Printer size={15} /> Dossier Bancaire PDF
                                </button>

                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    onClick={() => loadSimulation(sim)}
                                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all"
                                  >
                                    <MousePointerClick size={13} /> Ouvrir
                                  </button>
                                  <button
                                    onClick={() => importToPatrimoine(sim)}
                                    disabled={importingId === sim.id}
                                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                                  >
                                    <Check size={13} /> {importingId === sim.id ? "..." : "Valider"}
                                  </button>
                                  <button
                                    onClick={() => deleteSimulation(sim.id)}
                                    className="flex items-center justify-center py-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
            </PremiumGuard>
          )}

          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}