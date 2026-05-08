"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, Building, Wallet, Landmark, FolderOpen,
  Scale, Save, FileText, Trash2, MousePointerClick,
  BarChart3, Check, Printer, PiggyBank, BookOpen,
  X, ArrowRight, Sparkles, Coins, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, CartesianGrid } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import { useReactToPrint } from "react-to-print";
import FiscaliteEngine from "./Fiscaliteengine";
import DossierBancairePro from "./DossierBancairePro";
import RapportFiscalPDF from "./RapportFiscalpdf";
import HelpTooltip from "@/components/HelpTooltip";
import { formatEuro } from "@/lib/formatters";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════════════
//   NEXUS SIMULATEUR IMMO V2 — REFONTE JETONS (PAY-PER-USE)
// ═══════════════════════════════════════════════════════════════════════════

const TAB_THEMES = {
  CAPACITE:    { color: "#6366f1", name: "indigo",   label: "Capacité" },
  RENTABILITE: { color: "#10b981", name: "emerald",  label: "Rentabilité" },
  FISCALITE:   { color: "#eab308", name: "amber",    label: "Fiscalité" },
  PROJETS:     { color: "#a855f7", name: "purple",   label: "Projets" },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
//   TUTORIAL MODAL
// ═══════════════════════════════════════════════════════════════════════════

const TUTORIAL_STEPS = [
  {
    title: "Devenez un investisseur pro",
    subtitle: "LE SIMULATEUR IMMOBILIER",
    description: "L'immobilier est le meilleur moyen de s'enrichir grâce à l'argent de la banque. Ce simulateur est divisé en 4 étapes pour vous guider de la recherche de votre budget jusqu'à l'impression de votre dossier bancaire.",
    icon: Building, accent: "#6366f1",
  },
  {
    title: "Étape 1 : Le Budget",
    subtitle: "ONGLET CAPACITÉ",
    description: "Avant de visiter des biens, il faut savoir combien la banque peut vous prêter. Renseignez vos revenus et votre apport. L'algorithme calcule instantanément votre enveloppe d'achat maximale.",
    icon: Wallet, accent: "#3b82f6",
  },
  {
    title: "Étape 2 : Le vrai rendement",
    subtitle: "ONGLET RENTABILITÉ",
    description: "Vous avez repéré une annonce ? Entrez son prix et le loyer espéré. Nexus va générer votre tableau d'amortissement et vous donner le chiffre clé : le Cashflow (l'argent net qui rentre ou sort de votre poche chaque mois).",
    icon: Calculator, accent: "#10b981",
  },
  {
    title: "Étape 3 : Gommer l'impôt",
    subtitle: "ONGLET FISCALITÉ",
    description: "Les impôts peuvent tuer la rentabilité d'un projet. Cet onglet compare les régimes fiscaux (LMNP, Micro, Réel) pour vous montrer comment utiliser l'amortissement comptable afin de payer 0€ d'impôt légalement.",
    icon: Scale, accent: "#eab308",
  },
  {
    title: "Étape 4 : Convaincre la banque",
    subtitle: "ONGLET PROJETS",
    description: "Sauvegardez vos meilleures simulations. En échange d'un Jeton Nexus, générez un dossier PDF professionnel et chiffré à poser sur le bureau de votre banquier pour obtenir votre prêt plus facilement.",
    icon: FolderOpen, accent: "#a855f7",
  },
];

function SimulateurTutorialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => { if (isOpen) setCurrentStep(0); }, [isOpen]);
  if (!isOpen) return null;
  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) setCurrentStep(p => p + 1);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }} className="relative w-full max-w-2xl bg-[#0A0A0C] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <motion.div key={currentStep} initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ duration: 0.7 }} className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: step.accent }} />
        <div className="absolute inset-x-0 top-0 h-px transition-all duration-700" style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }} />
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors z-20 bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/5"><X size={18} /></button>

        <div className="p-8 sm:p-12 relative z-10 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl blur-xl" style={{ backgroundColor: step.accent, opacity: 0.4 }} />
                <div className="relative w-20 h-20 rounded-3xl bg-[#121214] border border-white/10 flex items-center justify-center shadow-2xl" style={{ color: step.accent }}>
                  <StepIcon size={36} strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: step.accent }}>{step.subtitle}</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">{step.title}<span style={{ color: step.accent }}>.</span></h2>
              </div>
              <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-xl font-light">{step.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="bg-[#121214]/80 backdrop-blur-sm border-t border-white/10 p-6 sm:p-8 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all duration-500" style={{ width: i === currentStep ? 32 : 8, backgroundColor: i === currentStep ? step.accent : "#3f3f46", boxShadow: i === currentStep ? `0 0 12px ${step.accent}` : "none" }} />
            ))}
          </div>
          <Button onClick={handleNext} className="bg-white hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 text-black font-black uppercase tracking-widest rounded-xl px-8 py-6 text-sm transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {currentStep === TUTORIAL_STEPS.length - 1 ? <span className="flex items-center gap-3">J'ai compris <Check size={16} /></span> : <span className="flex items-center gap-3">Suivant <ArrowRight size={16} /></span>}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   COMPOSANTS UI
// ═══════════════════════════════════════════════════════════════════════════

const PremiumSlider = ({ label, value, min, max, step, unit, onChange, accent = "#6366f1" }: any) => (
  <div className="group relative bg-black/30 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all duration-300 w-full overflow-hidden">
    <div className="flex justify-between items-baseline mb-3">
      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] group-hover:text-zinc-300 transition-colors">
        {label}
      </label>
      <div className="font-black text-xl text-white tabular-nums">
        {value}<span className="text-xs text-zinc-500 font-medium ml-0.5">{unit}</span>
      </div>
    </div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="py-2 cursor-grab active:cursor-grabbing w-full" />
  </div>
);

const EditorialCard = ({ children, className = "", accent, topBorder = false }: any) => (
  <div className={`relative w-full overflow-hidden rounded-[24px] bg-zinc-900/40 backdrop-blur-md border border-white/[0.06] transition-all duration-500 hover:bg-zinc-900/60 hover:border-white/10 ${className}`}>
    {topBorder && accent && <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />}
    {children}
  </div>
);

const EditorialInput = ({ label, value, onChange, type = "number", step, accent = "#6366f1", emphasis = false }: any) => (
  <div className="min-w-0 w-full">
    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] block mb-1.5">{label}</label>
    <Input type={type} value={value} step={step} onChange={onChange} className={`h-11 text-base font-bold w-full transition-all ${emphasis ? "bg-emerald-900/10 border-emerald-500/20 text-emerald-300 focus:border-emerald-500/50" : "bg-black/40 border-white/10 text-white focus:border-white/25"}`} style={emphasis ? undefined : ({ "--accent": accent } as React.CSSProperties)} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
//   COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function SimulateurPage() {
  const [mode, setMode] = useState<"CAPACITE" | "RENTABILITE" | "FISCALITE" | "PROJETS">("CAPACITE");
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [projectName, setProjectName] = useState("");
  const [importingId, setImportingId] = useState<number | null>(null);
  
  // Remplacement isPro par tokens
  const [tokens, setTokens] = useState<number>(0);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [isConsumingToken, setIsConsumingToken] = useState(false);

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const componentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);

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

  // ─── LOGIQUE MÉTIER ────────────────────────────────────
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

  const handleInput = (setter: (v: any) => void, val: string) => {
    if (val === "") setter("");
    else setter(Number(val));
  };

  // ─── INIT : tutoriel + Supabase profile ───────────────────────
  useEffect(() => {
    const init = async () => {
      const hasSeenTutorial = localStorage.getItem("nexus_simulateur_tuto_seen");
      if (!hasSeenTutorial) setTimeout(() => setIsTutorialOpen(true), 800);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('tokens, simulations_json').eq('id', session.user.id).single();
        if (data) {
          // --- CORRECTIF SYNCHRONISATION JETONS ---
          let userTokens = data.tokens;
          // Si le solde est vide (compte créé avant l'ajout de la colonne), on force à 3
          if (userTokens === null || userTokens === undefined) {
            userTokens = 3;
            await supabase.from('profiles').update({ tokens: 3 }).eq('id', session.user.id);
          }
          setTokens(userTokens);
          
          if (data.simulations_json) setSavedSimulations(data.simulations_json);
        }
      }
    };
    init();
  }, []);

  // ─── CONSOMMATION DES JETONS ──────────────────────────────────
  const handleConsumeToken = async (actionCallback: () => void) => {
    if (tokens <= 0) {
      setShowTokenModal(true);
      return;
    }

    setIsConsumingToken(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newTokens = tokens - 1;
      const { error } = await supabase.from('profiles').update({ tokens: newTokens }).eq('id', user.id);

      if (error) throw error;

      setTokens(newTokens);
      actionCallback(); // Déclenche la génération du PDF
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'utilisation du jeton.");
    } finally {
      setIsConsumingToken(false);
    }
  };

  // ─── CALCULS FISCAUX 2026 ────────────────────
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
      if (rentalStrategy === "NUE") abattement = 0.30;
      else if (rentalStrategy === "LMNP") abattement = 0.50;
      else if (rentalStrategy === "LCD") abattement = 0.71;
      const baseMicro = Math.max(0, annualRent * (1 - abattement));
      const taxMicro = baseMicro * (userTMI / 100) + baseMicro * 0.172;
      let amo = 0;
      if (rentalStrategy !== "NUE") {
        const bati = safePrice * 0.85;
        amo = (bati / 30) + (safeWorks / 15) + (5000 / 7) + (notFees / 25);
      }
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
      const grossGain = Math.max(0, (Number(resalePrice) || 0) - acquisitionRetenue);
      let taxTotal = 0;
      if (projectType === "RS") {
        const abattementApprox = Math.min(1, Math.max(0, (holdingYears - 5) * 0.06));
        taxTotal = grossGain * (1 - abattementApprox) * (0.362);
      }
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
        price, works, notaryRate, notaryFees, apport, rent, charges, tax,
        duration, rate, totalCreditCost, monthlyPayment, cashflowNetImpots,
        yieldNet, projectType, rentalStrategy, revenue, credits,
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
    const d = sim.data;
    setPrice(d.price); setWorks(d.works); setNotaryRate(d.notaryRate || 8);
    setApport(d.apport); setRent(d.rent); setCharges(d.charges); setTax(d.tax);
    setDuration(d.duration); setRate(d.rate);
    setProjectType(d.projectType); setRentalStrategy(d.rentalStrategy);
    setMode("RENTABILITE");
  };

  const importToPatrimoine = async (sim: any) => {
    setImportingId(sim.id);
    const d = sim.data;
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

  const currentTheme = TAB_THEMES[mode];

  // ═══════════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 relative overflow-hidden selection:bg-indigo-500/30 selection:text-white">

      <SimulateurTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          localStorage.setItem("nexus_simulateur_tuto_seen", "true");
        }}
      />

      {/* ── MODAL PLUS DE JETONS ── */}
      <AnimatePresence>
        {showTokenModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowTokenModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-[#0A0A0C] border border-purple-500/20 rounded-3xl shadow-2xl p-8 text-center overflow-hidden">
               <div className="absolute top-0 right-0 p-24 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none" />
               <div className="relative z-10">
                   <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
                       <AlertTriangle size={24} className="text-purple-400" />
                   </div>
                   <h3 className="text-2xl font-black text-white mb-2">Solde insuffisant.</h3>
                   <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                       Vous n'avez plus de <strong className="text-purple-400">Jetons Nexus</strong> disponibles pour générer un export PDF officiel.
                   </p>
                   <div className="flex flex-col gap-3">
                       <Link href="/tarifs" className="w-full">
                           <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] active:scale-95 text-white font-black uppercase tracking-widest h-12 rounded-xl text-xs shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all">
                               Recharger mes jetons
                           </Button>
                       </Link>
                       <Button variant="ghost" onClick={() => setShowTokenModal(false)} className="w-full text-zinc-500 hover:text-white uppercase tracking-widest text-[10px] font-bold">
                           Annuler
                       </Button>
                   </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Sidebar />

      {/* ── ATMOSPHÈRE DE FOND : halo coloré qui change selon l'onglet ─────── */}
      <div className="fixed top-0 left-0 right-0 h-screen pointer-events-none z-0">
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.8 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px]"
          style={{
            background: `radial-gradient(ellipse at center, ${currentTheme.color}20 0%, ${currentTheme.color}06 30%, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />
        <motion.div
          key={`${mode}-2`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1 }}
          className="absolute top-[40vh] -right-40 w-[500px] h-[500px]"
          style={{
            background: `radial-gradient(circle, ${currentTheme.color}15 0%, transparent 70%)`,
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

      <main className="md:ml-64 print:ml-0 print:p-0 print:overflow-visible flex-1 w-full md:w-auto min-w-0 p-3 sm:p-4 md:p-8 relative z-10 overflow-x-hidden">

        {/* PDFs cachés (impression uniquement) */}
        <DossierBancairePro refProp={componentRef} data={printData} />
        <RapportFiscalPDF
          refProp={fiscalRef}
          price={Number(price)} works={Number(works)} notaryFees={notaryFees}
          rent={Number(rent)} charges={Number(charges)} tax={Number(tax)}
          monthlyPayment={monthlyPayment} yearOneInterest={yearOneInterest}
          totalCost={totalCost} projectType={projectType} rentalStrategy={rentalStrategy}
          duration={duration} rate={rate} revenue={Number(revenue)}
        />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="max-w-[1600px] w-full mx-auto space-y-5 md:space-y-7">

          {/* ══════════════════════════════════════════════════════════════
               HEADER ÉDITORIAL
             ══════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                  <span className="block w-6 h-px" style={{ backgroundColor: `${currentTheme.color}80` }} />
                  Module · Simulateur immobilier
                </p>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.05]">
                  Construisez votre{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(90deg, ${currentTheme.color}, ${currentTheme.color}aa)` }}>
                    projet immobilier
                  </span>
                  <span style={{ color: currentTheme.color }}>.</span>
                </h1>
                <p className="text-zinc-500 text-sm mt-2 max-w-xl leading-relaxed">
                  De la capacité d'emprunt au dossier bancaire — fiscalité française, à jour 2026.
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-3">
                {/* COMPTEUR DE JETONS */}
                <div className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                  <Coins size={13} /> {tokens} Jetons
                </div>
                <button onClick={() => setIsTutorialOpen(true)} className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all text-xs font-bold uppercase tracking-[0.22em] backdrop-blur-sm shrink-0">
                  <BookOpen size={13} /> Guide
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                 TABS — segmented control verre dépoli
               ══════════════════════════════════════════════════════════════ */}
            <div className="relative bg-zinc-900/50 backdrop-blur-xl p-1.5 rounded-2xl border border-white/[0.06] grid grid-cols-2 xl:flex gap-1 w-full xl:w-auto shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]">
              {[
                { id: "CAPACITE",    label: "Capacité",    icon: Wallet },
                { id: "RENTABILITE", label: "Rentabilité", icon: Calculator },
                { id: "FISCALITE",   label: "Fiscalité",   icon: Scale }, // Plus de restriction Premium !
                { id: "PROJETS",     label: "Projets",     icon: FolderOpen }, // Plus de restriction Premium !
              ].map((tab) => {
                const tabTheme = TAB_THEMES[tab.id as keyof typeof TAB_THEMES];
                const isActive = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id as any)}
                    className={`relative flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 md:py-3 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] transition-all duration-300 ${isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                    style={isActive ? { backgroundColor: `${tabTheme.color}20`, boxShadow: `0 0 24px -8px ${tabTheme.color}80, inset 0 1px 0 ${tabTheme.color}40` } : undefined}
                  >
                    <tab.icon size={13} className="shrink-0" style={{ color: isActive ? tabTheme.color : undefined }} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
               CONTENU DES ONGLETS
             ══════════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">

            {/* ─────────────────────────────────────────────────────────────
                 ONGLET CAPACITÉ
               ───────────────────────────────────────────────────────────── */}
            {mode === "CAPACITE" && (
              <motion.div key="capa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
                {/* Colonne gauche : inputs */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <EditorialCard accent="#6366f1" topBorder className="p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center"><Wallet size={14} className="text-indigo-400" /></div>
                      <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">Vos revenus</h3>
                    </div>
                    <div className="space-y-3">
                      <EditorialInput label="Salaire net / mois" value={revenue} onChange={(e: any) => handleInput(setRevenue, e.target.value)} />
                      <EditorialInput label="Crédits en cours" value={credits} onChange={(e: any) => handleInput(setCredits, e.target.value)} />
                      <div className="pt-3 border-t border-white/5"><EditorialInput label="Apport personnel" value={apportCapacity} onChange={(e: any) => handleInput(setApportCapacity, e.target.value)} emphasis /></div>
                    </div>
                  </EditorialCard>

                  <EditorialCard accent="#3b82f6" topBorder className="p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center"><Landmark size={14} className="text-blue-400" /></div>
                      <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">Conditions banque</h3>
                    </div>
                    <div className="space-y-3">
                      <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration} />
                      <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate} />
                    </div>
                  </EditorialCard>
                </div>

                {/* Colonne droite : ENVELOPPE D'ACHAT */}
                <div className="lg:col-span-8">
                  <div className="relative h-full min-h-[500px] rounded-[32px] overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent z-20" />
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-indigo-950/20 backdrop-blur-sm" />
                    <div className="absolute inset-0 border border-white/[0.06] rounded-[32px]" />
                    <motion.div animate={{ opacity: [0.25, 0.4, 0.25], scale: [1, 1.05, 1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[80px] bg-indigo-500/30 pointer-events-none" />
                    <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 400 400">
                      <circle cx="200" cy="200" r="180" fill="none" stroke="#6366f1" strokeWidth="0.5" />
                      <circle cx="200" cy="200" r="140" fill="none" stroke="#6366f1" strokeWidth="0.5" />
                      <circle cx="200" cy="200" r="100" fill="none" stroke="#6366f1" strokeWidth="0.5" />
                    </svg>

                    <div className="relative z-10 p-6 md:p-12 flex flex-col items-center justify-center text-center min-h-[500px] gap-8">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-300 mb-3 flex items-center justify-center gap-2">
                          <span className="block w-6 h-px bg-indigo-400/40" />Enveloppe d'achat globale<HelpTooltip text="La somme totale que vous pouvez dépenser (Apport + Prêt). Endettement maximal légal : 35%." /><span className="block w-6 h-px bg-indigo-400/40" />
                        </p>
                        <p className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Apport + Prêt maximum</p>
                      </div>

                      <div className="font-black text-white tracking-tighter leading-none w-full text-center tabular-nums" style={{ fontSize: "clamp(2.5rem, 11vw, 7.5rem)", textShadow: "0 0 40px rgba(99,102,241,0.3)" }}>
                        <AnimatedNumber value={totalEnvelope} />
                      </div>

                      <div className="w-full max-w-2xl space-y-3">
                        {(() => {
                          const apportNum = Number(apportCapacity) || 0;
                          const total = totalEnvelope || 1;
                          const apportPct = (apportNum / total) * 100;
                          const loanPct = 100 - apportPct;
                          return (
                            <>
                              <div className="relative h-2 w-full bg-white/[0.04] rounded-full overflow-hidden flex">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${loanPct}%` }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-l-full" style={{ boxShadow: "0 0 12px rgba(59,130,246,0.5)" }} />
                                <motion.div initial={{ width: 0 }} animate={{ width: `${apportPct}%` }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.5 }} className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r-full" style={{ boxShadow: "0 0 12px rgba(16,185,129,0.5)" }} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-left">
                                  <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ boxShadow: "0 0 8px #3b82f6" }} /><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.22em]">Prêt bancaire</span></div>
                                  <div className="text-2xl font-black text-white tabular-nums tracking-tight">{formatEuro(maxLoan)}</div>
                                  <p className="text-[10px] text-zinc-600 mt-0.5">{duration} ans · {rate}% · {formatEuro(maxMonthly)}/mois</p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-2 mb-1"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.22em]">Apport</span><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 8px #10b981" }} /></div>
                                  <div className="text-2xl font-black text-emerald-300 tabular-nums tracking-tight">{formatEuro(Number(apportCapacity))}</div>
                                  <p className="text-[10px] text-zinc-600 mt-0.5">{apportPct.toFixed(0)}% du total</p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                 ONGLET RENTABILITÉ
               ───────────────────────────────────────────────────────────── */}
            {mode === "RENTABILITE" && (
              <motion.div key="renta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full">
                {/* Colonne gauche : inputs */}
                <div className="xl:col-span-4 space-y-4">
                  <EditorialCard accent="#10b981" topBorder className="p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center"><Building size={14} className="text-emerald-400" /></div>
                      <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">Le projet</h3>
                    </div>

                    <div className="bg-black/40 p-3 rounded-xl mb-4 border border-white/5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] block mb-2">Usage du bien</label>
                      <div className="grid grid-cols-3 gap-1">
                        {([{ id: "LOC", label: "Invest." }, { id: "RP", label: "Principale" }, { id: "RS", label: "Secondaire" }] as const).map(t => (
                          <button key={t.id} onClick={() => setProjectType(t.id)} className={`text-[10px] font-bold py-2 rounded-lg transition-all uppercase tracking-wider ${projectType === t.id ? "bg-white text-black" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}>{t.label}</button>
                        ))}
                      </div>
                      {projectType === "LOC" && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] block mb-2">Stratégie locative</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(["LMNP", "NUE", "LCD"] as const).map(s => (
                              <button key={s} onClick={() => setRentalStrategy(s)} className={`text-[10px] font-bold py-2 rounded-lg transition-all ${rentalStrategy === s ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-zinc-500 hover:text-white hover:bg-white/5"}`} style={rentalStrategy === s ? { boxShadow: "0 0 16px -4px rgba(16,185,129,0.4)" } : undefined}>{s}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <EditorialInput label="Prix d'achat" value={price} onChange={(e: any) => handleInput(setPrice, e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <EditorialInput label="Travaux" value={works} onChange={(e: any) => handleInput(setWorks, e.target.value)} />
                        <EditorialInput label="Apport" value={apport} onChange={(e: any) => handleInput(setApport, e.target.value)} />
                      </div>
                      <EditorialInput label="Notaire (%)" type="number" step="0.1" value={notaryRate} onChange={(e: any) => handleInput(setNotaryRate, e.target.value)} />
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3 mt-4">
                      <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.22em] flex items-center gap-2"><Landmark size={10} /> Financement bancaire</h4>
                      <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate} />
                      <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration} />
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3 mt-4">
                      {projectType === "LOC" && <EditorialInput label="Loyer mensuel CC" value={rent} onChange={(e: any) => handleInput(setRent, e.target.value)} emphasis />}
                      <div className="grid grid-cols-2 gap-2">
                        <EditorialInput label="Charges /mois" value={charges} onChange={(e: any) => handleInput(setCharges, e.target.value)} />
                        <EditorialInput label="Taxe fonc. /an" value={tax} onChange={(e: any) => handleInput(setTax, e.target.value)} />
                      </div>
                    </div>
                  </EditorialCard>
                </div>

                {/* Colonne droite : RÉSULTATS */}
                <div className="xl:col-span-8 space-y-4">
                  {projectType === "LOC" ? (
                    <div className="relative rounded-[32px] overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-px" style={{ background: cashflowNetImpots > 0 ? "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)" : "linear-gradient(90deg, transparent, rgba(244,63,94,0.6), transparent)" }} />
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-black/40 backdrop-blur-sm" />
                      <div className="absolute inset-0 border border-white/[0.06] rounded-[32px]" />
                      <motion.div animate={{ opacity: [0.2, 0.35, 0.2], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: cashflowNetImpots > 0 ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)" }} />

                      <div className="relative z-10 p-6 md:p-10 text-center flex flex-col items-center gap-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: cashflowNetImpots > 0 ? "#10b981" : "#f43f5e" }}>
                          <span className="block w-6 h-px bg-current opacity-40" />Cashflow net mensuel<HelpTooltip title="Cashflow Net" text="Loyers - (Crédit + Charges + Taxe Foncière + Impôts). C'est le vrai chiffre qui compte à la fin du mois." /><span className="block w-6 h-px bg-current opacity-40" />
                        </p>
                        <div className="font-black tracking-tighter leading-none tabular-nums" style={{ fontSize: "clamp(2.5rem, 10vw, 6.5rem)", color: cashflowNetImpots > 0 ? "#34d399" : "#fb7185", textShadow: cashflowNetImpots > 0 ? "0 0 40px rgba(16,185,129,0.4)" : "0 0 40px rgba(244,63,94,0.4)" }}>
                          {cashflowNetImpots > 0 ? "+" : ""}<AnimatedNumber value={Math.round(cashflowNetImpots)} />
                        </div>
                        <div className="grid grid-cols-2 gap-6 max-w-md w-full pt-4 border-t border-white/5">
                          <div className="text-left">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] mb-1.5">Avant impôt</p>
                            <p className="text-xl font-black text-white tabular-nums">{cashflowBrut > 0 ? "+" : ""}{Math.round(cashflowBrut)}€</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] mb-1.5">Fiscalité estimée</p>
                            <p className="text-xl font-black text-amber-400 tabular-nums">-{Math.round(Math.min(fiscalData.micro.total, fiscalData.reel.total) / 12)}€</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-[32px] overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-amber-950/20 backdrop-blur-sm" />
                      <div className="absolute inset-0 border border-amber-500/20 rounded-[32px]" />
                      <div className="relative z-10 p-6 md:p-10 text-center flex flex-col items-center gap-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400 flex items-center gap-2"><span className="block w-6 h-px bg-amber-400/40" />Coût mensuel total<span className="block w-6 h-px bg-amber-400/40" /></p>
                        <div className="font-black text-white tracking-tighter leading-none tabular-nums" style={{ fontSize: "clamp(2.5rem, 10vw, 6.5rem)", textShadow: "0 0 40px rgba(251,191,36,0.3)" }}>-<AnimatedNumber value={Math.round(monthlyPayment + Number(charges) + (Number(tax) / 12))} /></div>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-bold text-zinc-500 bg-black/30 px-4 py-2.5 rounded-xl border border-white/5">
                          <span>Crédit · {Math.round(monthlyPayment)}€</span><span className="text-zinc-700">·</span><span>Charges · {Math.round(Number(charges))}€</span><span className="text-zinc-700">·</span><span>Taxe · {Math.round(Number(tax) / 12)}€</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <EditorialCard className="p-4 md:p-5 flex flex-col items-center justify-center min-h-[100px] relative">
                      <div className="absolute top-2 right-2"><HelpTooltip title="Coût Projet" text="Prix + Travaux + Notaire. Ne prend pas en compte le coût du crédit." /></div>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] mb-2">Coût projet</p>
                      <div className="text-2xl md:text-4xl font-black text-white tabular-nums leading-none tracking-tighter">{Math.round(totalCost / 1000)}<span className="text-indigo-400 text-base ml-0.5">k€</span></div>
                    </EditorialCard>

                    {projectType === "LOC" ? (
                      <EditorialCard className="p-4 md:p-5 flex flex-col items-center justify-center min-h-[100px] relative">
                        <div className="absolute top-2 right-2"><HelpTooltip title="Rendement Brut" text="(Loyer annuel / Coût d'achat total) * 100." /></div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] mb-2">Rendement brut</p>
                        <div className="text-2xl md:text-4xl font-black text-white tabular-nums leading-none tracking-tighter">{yieldNet.toFixed(2)}<span className="text-emerald-400 text-base ml-0.5">%</span></div>
                      </EditorialCard>
                    ) : (
                      <EditorialCard className="p-4 md:p-5 flex flex-col items-center justify-center min-h-[100px] relative">
                        <div className="absolute top-2 right-2"><HelpTooltip title="Coût du crédit" text="Total des intérêts versés à la banque." /></div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.22em] mb-2">Coût crédit</p>
                        <div className="text-2xl md:text-4xl font-black text-white tabular-nums leading-none tracking-tighter">{Math.round(totalCreditCost / 1000)}<span className="text-rose-400 text-base ml-0.5">k€</span></div>
                      </EditorialCard>
                    )}
                  </div>

                  <EditorialCard className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center"><BarChart3 size={12} className="text-blue-400" /></div>
                        <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">Amortissement</h4>
                        <HelpTooltip text="Courbe bleue = capital restant dû. Rouge = intérêts cumulés payés à la banque." />
                      </div>
                      <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">{duration} ans · {rate}%</span>
                    </div>
                    <div className="h-[160px] md:h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={amortizationSchedule} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                          <XAxis dataKey="year" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val, index) => index % 5 === 0 ? val : ''} />
                          <Tooltip contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #27272a', borderRadius: '12px', fontSize: '11px', backdropFilter: 'blur(8px)' }} itemStyle={{ color: '#fff' }} formatter={(val: any) => formatEuro(val)} />
                          <Area type="monotone" dataKey="capital" stackId="1" stroke="#3b82f6" fill="url(#colorCapital)" name="Capital restant" strokeWidth={2} />
                          <Area type="monotone" dataKey="interests" stackId="2" stroke="#f43f5e" fill="url(#colorInterest)" name="Intérêts cumulés" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </EditorialCard>

                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Input placeholder="Nom du projet…" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-zinc-900/60 backdrop-blur-sm border-white/10 h-12 rounded-xl text-white focus:border-emerald-500/50 w-full text-sm" />
                    <Button onClick={saveSimulation} className="h-12 px-6 bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 font-black uppercase tracking-widest rounded-xl gap-2 shrink-0 w-full sm:w-auto text-xs transition-all shadow-[0_8px_24px_-8px_rgba(255,255,255,0.3)]">
                      <Save size={14} /> Sauvegarder
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                 ONGLET FISCALITÉ (Maintenant accessible à tous, PDF = 1 Jeton)
               ───────────────────────────────────────────────────────────── */}
            {mode === "FISCALITE" && (
              <motion.div key="fiscal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full space-y-4">
                <div className="flex justify-end">
                  {/* BOUTON PDF (PAYANT) */}
                  <button
                    onClick={() => handleConsumeToken(() => setIsFiscalPrintReady(true))}
                    disabled={isConsumingToken}
                    className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-[0.22em] text-white transition-all hover:scale-[1.02] active:scale-95 overflow-hidden disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", boxShadow: "0 8px 30px -8px rgba(109,40,217,0.5)" }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Printer size={13} className="relative" />
                    <span className="relative">Rapport fiscal client PDF <span className="opacity-70 font-medium ml-1">(-1 Jeton)</span></span>
                  </button>
                </div>
                <FiscaliteEngine price={Number(price)} works={Number(works)} notaryFees={notaryFees} rent={Number(rent)} charges={Number(charges)} tax={Number(tax)} monthlyPayment={monthlyPayment} duration={duration} yearOneInterest={yearOneInterest} totalCost={totalCost} projectType={projectType} formatEuro={formatEuro} HelpTooltip={HelpTooltip} />
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                 ONGLET PROJETS (Maintenant accessible à tous, PDF = 1 Jeton)
               ───────────────────────────────────────────────────────────── */}
            {mode === "PROJETS" && (
              <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="space-y-4 w-full">
                {savedSimulations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-purple-500/30 rounded-3xl blur-2xl" />
                      <div className="relative w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center backdrop-blur-sm"><FileText size={32} className="text-purple-400" strokeWidth={1.5} /></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">Aucun projet sauvegardé<span className="text-purple-400">.</span></h3>
                    <p className="text-zinc-500 text-sm md:text-base max-w-md leading-relaxed">Complétez l'onglet Rentabilité, sauvegardez votre simulation, et générez un dossier bancaire PDF prêt à présenter à votre banquier.</p>
                    <button onClick={() => setMode("RENTABILITE")} className="mt-8 group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.22em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)] overflow-hidden">
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-300/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <span className="relative">Créer une simulation</span><ArrowRight size={14} className="relative" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">{savedSimulations.length} simulation{savedSimulations.length > 1 ? "s" : ""} sauvegardée{savedSimulations.length > 1 ? "s" : ""}</p>
                      <span className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest">Dernière · {new Date(savedSimulations[0]?.date).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                      {savedSimulations.map((sim, idx) => {
                        const d = sim.data;
                        const isLoc = d.projectType === "LOC";
                        const isRP = d.projectType === "RP";
                        const totalCostSim = (d.price || 0) + (d.works || 0) + (d.notaryFees || 0);
                        const apportPct = totalCostSim > 0 ? (d.apport / totalCostSim) * 100 : 0;
                        const endettement = d.revenue > 0 ? ((d.credits + d.monthlyPayment) / d.revenue) * 100 : 0;
                        const cardAccent = isLoc ? "#a855f7" : isRP ? "#f59e0b" : "#3b82f6";

                        return (
                          <motion.div key={sim.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.05 }} className="group relative rounded-[24px] bg-zinc-900/40 backdrop-blur-md border border-white/[0.06] hover:border-white/15 hover:bg-zinc-900/60 transition-all duration-500 overflow-hidden flex flex-col">
                            <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${cardAccent}, transparent)`, boxShadow: `0 0 12px ${cardAccent}` }} />
                            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-40 transition-opacity duration-700" style={{ backgroundColor: cardAccent }} />
                            <div className="relative z-10 p-5 flex flex-col gap-4 flex-1">
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-base font-black text-white tracking-tight mb-2 truncate">{sim.name}</h4>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] px-2 py-0.5 rounded-md uppercase tracking-[0.18em] font-bold" style={{ backgroundColor: `${cardAccent}15`, color: cardAccent, border: `1px solid ${cardAccent}30` }}>{d.projectType === "LOC" ? `LOC · ${d.rentalStrategy || "—"}` : d.projectType === "RP" ? "Résidence" : "Secondaire"}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-[0.18em] font-bold ${endettement < 35 ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-rose-500/10 text-rose-300 border border-rose-500/20"}`}>{endettement.toFixed(0)}% endett.</span>
                                  </div>
                                </div>
                                <p className="text-[9px] text-zinc-600 font-mono shrink-0 uppercase tracking-wider">{new Date(sim.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5"><p className="text-[9px] text-zinc-500 uppercase tracking-[0.22em] mb-1.5">Coût total</p><p className="text-base font-black text-white tabular-nums">{Math.round(totalCostSim / 1000)}k€</p></div>
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5"><p className="text-[9px] text-zinc-500 uppercase tracking-[0.22em] mb-1.5">Apport</p><p className="text-base font-black text-white tabular-nums">{apportPct.toFixed(0)}%</p></div>
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5"><p className="text-[9px] text-zinc-500 uppercase tracking-[0.22em] mb-1.5">Mensualité</p><p className="text-base font-black text-white tabular-nums">{Math.round(d.monthlyPayment)}€</p></div>
                                <div className={`rounded-xl p-3 border ${isLoc ? d.cashflowNetImpots >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20" : "bg-black/30 border-white/5"}`}><p className="text-[9px] text-zinc-500 uppercase tracking-[0.22em] mb-1.5">{isLoc ? "Cashflow/mois" : "Durée"}</p><p className={`text-base font-black tabular-nums ${isLoc ? d.cashflowNetImpots >= 0 ? "text-emerald-300" : "text-rose-300" : "text-white"}`}>{isLoc ? `${Math.round(d.cashflowNetImpots) > 0 ? "+" : ""}${Math.round(d.cashflowNetImpots)}€` : `${d.duration} ans`}</p></div>
                              </div>
                              <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-white/5">
                                
                                {/* BOUTON PDF (PAYANT) */}
                                <button
                                  onClick={() => handleConsumeToken(() => prepareAndPrint(sim))}
                                  disabled={isConsumingToken}
                                  className="group/btn relative w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-[0.22em] text-white transition-all hover:scale-[1.02] active:scale-95 overflow-hidden disabled:opacity-50"
                                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 24px -8px rgba(79,70,229,0.5)" }}
                                >
                                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                  <Printer size={13} className="relative" />
                                  <span className="relative">Dossier bancaire PDF <span className="opacity-70 font-medium ml-1">(-1 Jeton)</span></span>
                                </button>

                                <div className="grid grid-cols-3 gap-2">
                                  <button onClick={() => loadSimulation(sim)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.08] font-bold text-[10px] uppercase tracking-[0.18em] transition-all"><MousePointerClick size={12} /> Ouvrir</button>
                                  <button onClick={() => importToPatrimoine(sim)} disabled={importingId === sim.id} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 font-bold text-[10px] uppercase tracking-[0.18em] transition-all disabled:opacity-50"><Check size={12} /> {importingId === sim.id ? "..." : "Valider"}</button>
                                  <button onClick={() => deleteSimulation(sim.id)} className="flex items-center justify-center py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"><Trash2 size={13} /></button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}