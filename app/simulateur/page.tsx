"use client";

import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Home, Building, Wallet, Landmark, CheckCircle, PieChart as PieIcon, Scale, BedDouble, Armchair, Briefcase, Save, HelpCircle, FileText, Trash2, FolderOpen, MousePointerClick, TrendingUp, AlertTriangle, Crown, BarChart3, Check, Printer, Shield, PiggyBank, BookOpen, X, Info, ArrowRight } from "lucide-react";
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

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

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

// ==========================================
// 2. TOOLTIP — CORRIGÉ Z-INDEX + MOBILE
// ==========================================
const HelpTooltip = ({ title, text }: { title?: string, text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top: r.top + window.scrollY - 8,   // au-dessus du bouton
        left: r.left + r.width / 2 + window.scrollX,
      });
    }
    setIsOpen(true);
  };

  // Ferme au clic extérieur (mobile)
  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [isOpen]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`relative inline-flex items-center justify-center ml-2 cursor-pointer p-1.5 rounded-full transition-colors flex-shrink-0 ${isOpen ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"}`}
        onMouseEnter={open}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => { e.stopPropagation(); isOpen ? setIsOpen(false) : open(); }}
        aria-label="Aide"
      >
        <Info size={14} />
      </button>
      <AnimatePresence>
        {isOpen && typeof window !== "undefined" && ReactDOM.createPortal(
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              transform: "translate(-50%, -100%)",
              zIndex: 99999,
              pointerEvents: "none",
            }}
            className="w-64 sm:w-72 p-4 bg-[#1A1A1E] text-white text-xs rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] border border-zinc-600 text-center leading-relaxed font-sans normal-case tracking-normal"
          >
            {title && <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2">{title}</span>}
            {text}
            {/* Flèche bas */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1A1A1E]" />
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-zinc-600 -z-10 mt-[1px]" />
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
};

// --- COMPOSANT DOSSIER BANCAIRE (VERSION FINALE PDF) ---
const DossierBancaire = ({ data, refProp }: any) => {
    const d = data || {};
    const totalCost = (d.price || 0) + (d.works || 0) + (d.notaryFees || 0);
    const isLoc = d.projectType === "LOC";
    const isRP = d.projectType === "RP";
    
    const [dateStr, setDateStr] = useState("");
    useEffect(() => { setDateStr(new Date().toLocaleDateString("fr-FR")); }, []);

    return (
      <div className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none overflow-hidden -z-50 print:static print:w-auto print:h-auto print:opacity-100 print:overflow-visible print:z-auto">
        <style type="text/css" media="print">
          {`@page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; } nav, aside, header, .sidebar-mobile, button { display: none !important; } .print-container { width: 100%; height: 100%; margin: 0; padding: 0; }`}
        </style>
        <div ref={refProp} className="print-container bg-white text-black font-sans mx-auto relative print:w-full print:max-w-[210mm] print:min-h-[297mm] print:p-[10mm]">
            <div className="flex flex-col h-full justify-between p-8 md:p-12">
                <div>
                    <div className="flex justify-between items-center border-b-2 border-black/10 pb-6 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="text-black shrink-0 w-12 h-12"><NexusLogo className="w-full h-full"/></div>
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-black leading-none">NEXUS <span className="text-indigo-600">INVEST</span></h1>
                                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">Dossier de Financement</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-base font-bold text-gray-900">{d.name || "Projet Immobilier"}</p>
                            <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide mt-1">
                                {isLoc ? "Investissement Locatif" : isRP ? "Résidence Principale" : "Résidence Secondaire"}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">{dateStr}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm break-inside-avoid">
                            <h3 className="text-[10px] font-black uppercase text-indigo-600 mb-4 flex items-center gap-2 tracking-widest"><Home size={14}/> L'Acquisition</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><span>Prix Net Vendeur</span> <span className="font-bold text-gray-900">{formatEuro(d.price)}</span></div>
                                <div className="flex justify-between"><span>Travaux Estimés</span> <span className="font-bold text-gray-900">{formatEuro(d.works)}</span></div>
                                <div className="flex justify-between"><span>Frais de Notaire</span> <span className="font-bold text-gray-900">{formatEuro(d.notaryFees)}</span></div>
                                <div className="h-px bg-gray-200 my-2"></div>
                                <div className="flex justify-between text-base font-black text-black"><span>COÛT TOTAL</span> <span>{formatEuro(totalCost)}</span></div>
                            </div>
                        </div>
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm break-inside-avoid">
                            <h3 className="text-[10px] font-black uppercase text-indigo-600 mb-4 flex items-center gap-2 tracking-widest"><Landmark size={14}/> Le Financement</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><span>Apport Personnel</span> <span className="font-bold text-gray-900">{formatEuro(d.apport)}</span></div>
                                <div className="flex justify-between"><span>Emprunt Sollicité</span> <span className="font-bold text-gray-900">{formatEuro(totalCost - d.apport)}</span></div>
                                <div className="flex justify-between"><span>Conditions</span> <span className="font-bold text-gray-900">{d.duration} ans à {d.rate}%</span></div>
                                <div className="h-px bg-gray-200 my-2"></div>
                                <div className="flex justify-between text-base font-black text-black"><span>Mensualité (Hors Ass.)</span> <span>{formatEuro(d.monthlyPayment || 0)}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 break-inside-avoid">
                        <h3 className="text-sm font-black uppercase text-gray-900 mb-4 border-l-4 border-indigo-600 pl-3">Indicateurs Financiers</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {isLoc ? (
                                <>
                                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                                        <p className="text-[9px] uppercase font-bold text-indigo-400 mb-1 tracking-wider">Rendement Brut</p>
                                        <p className="text-2xl font-black text-indigo-700">{Number(d.yieldNet).toFixed(2)}%</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                        <p className="text-[9px] uppercase font-bold text-emerald-600 mb-1 tracking-wider">Cashflow Net / Mois</p>
                                        <p className={`text-2xl font-black ${d.cashflowNetImpots > 0 ? "text-emerald-700" : "text-amber-600"}`}>{d.cashflowNetImpots > 0 ? "+":""}{Math.round(d.cashflowNetImpots)}€</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                                        <p className="text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Loyer Annuel</p>
                                        <p className="text-2xl font-black text-gray-800">{formatEuro(d.rent * 12)}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                                        <p className="text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Effort Mensuel</p>
                                        <p className="text-2xl font-black text-gray-800">{formatEuro(Math.round(d.monthlyPayment + (d.charges || 0) + ((d.tax || 0)/12)))}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                                        <p className="text-[9px] uppercase font-bold text-indigo-400 mb-1 tracking-wider">Coût Crédit</p>
                                        <p className="text-2xl font-black text-indigo-700">{formatEuro(Math.round(d.totalCreditCost))}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1 tracking-wider">Capitalisation</p>
                                        <p className="text-2xl font-black text-amber-700">~{formatEuro(Math.round(d.monthlyPayment * 0.6))}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mb-8 break-inside-avoid">
                        <h3 className="text-sm font-black uppercase text-gray-900 mb-4 border-l-4 border-indigo-600 pl-3">Analyse Stratégique</h3>
                        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                            {isLoc ? (
                                <>
                                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                                        Ce projet est structuré pour maximiser la rentabilité nette via le régime 
                                        <strong className="text-black uppercase"> {d.rentalStrategy === "LMNP" ? "LMNP (Loueur Meublé Non Pro)" : d.rentalStrategy} </strong> 
                                        au <strong className="text-black uppercase">{d.rentalStrategy !== "NUE" ? "RÉEL" : "FONCIER"}</strong>.
                                    </p>
                                    <ul className="grid grid-cols-2 gap-3 text-xs text-gray-600 font-medium">
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Déductibilité des intérêts</li>
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Amortissement comptable (Gomme l'impôt)</li>
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Optimisation du Cashflow</li>
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Effet de levier bancaire</li>
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                                        Acquisition patrimoniale à usage de <strong>{isRP ? "RÉSIDENCE PRINCIPALE" : "RÉSIDENCE SECONDAIRE"}</strong>. 
                                        L'objectif est la sécurisation du logement et la transformation d'un loyer à fonds perdus en épargne forcée.
                                    </p>
                                    <ul className="grid grid-cols-2 gap-3 text-xs text-gray-600 font-medium">
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-500 shrink-0"/> Constitution de Patrimoine</li>
                                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-500 shrink-0"/> Protection contre l'inflation</li>
                                        {isRP && <li className="flex items-center gap-2 col-span-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> <strong>Exonération Totale de Plus-Value (RP)</strong></li>}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="border-t pt-6 text-center mt-auto">
                    <p className="text-[8px] text-gray-400 font-medium uppercase tracking-widest">
                        Document généré par Nexus Invest. Ne constitue pas une offre de prêt.
                    </p>
                </div>
            </div>
        </div>
      </div>
    );
};

// --- COMPOSANTS UI ---
const PremiumSlider = ({ label, value, min, max, step, unit, onChange }: any) => (
    <div className="group relative bg-black/40 rounded-2xl p-3 md:p-4 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 w-full overflow-hidden max-w-full">
        <div className="flex justify-between items-end mb-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{label}</label>
            <div className="font-mono text-lg md:text-xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-cyan-400 transition-all">
                {value} <span className="text-xs md:text-sm text-zinc-600 font-medium">{unit}</span>
            </div>
        </div>
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="py-2 cursor-grab active:cursor-grabbing w-full" />
    </div>
);

// FIX : Suppression du overflow-hidden pour laisser les bulles Tooltips s'afficher par dessus !
const PremiumCard = ({ children, className = "", color = "indigo" }: { children: React.ReactNode, className?: string, color?: string }) => {
    const borderColor = color === "emerald" ? "hover:border-emerald-500/30" : color === "rose" ? "hover:border-rose-500/30" : color === "amber" ? "hover:border-amber-500/30" : color === "blue" ? "hover:border-blue-500/30" : "hover:border-indigo-500/30";
    return <div className={`relative w-full rounded-[24px] md:rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 transition-all duration-500 ${borderColor} hover:bg-zinc-900/60 group hover:z-50 ${className}`}>{children}</div>;
};

export default function SimulateurPage() {
  const [mode, setMode] = useState<"CAPACITE" | "RENTABILITE" | "FISCALITE" | "PROJETS">("CAPACITE");
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [projectName, setProjectName] = useState("");
  const [importingId, setImportingId] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const componentRef = useRef(null);
  const [printData, setPrintData] = useState<any>(null); 
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Dossier_Financement_Nexus",
    onAfterPrint: () => { setIsReadyToPrint(false); }
  });

  useEffect(() => {
    if (isReadyToPrint && printData) { handlePrint(); }
  }, [isReadyToPrint, printData, handlePrint]);

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
          data: { price, works, notaryRate, notaryFees, apport, rent, charges, tax, duration, rate, totalCreditCost, monthlyPayment, cashflowNetImpots, yieldNet, projectType, rentalStrategy, revenue, credits }
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('assets_json').eq('id', session.user.id).single();
      const currentAssets = profile?.assets_json || [];
      const d = sim.data;
      const newAsset = { id: Date.now().toString(), name: sim.name, type: "Immobilier", value: d.price, buyPrice: d.price, notaryFees: d.notaryFees, workCost: d.works, loanCost: d.totalCreditCost };
      const updatedAssets = [...currentAssets, newAsset];
      const newNetWorth = updatedAssets.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
      await supabase.from('profiles').update({ assets_json: updatedAssets, net_worth: newNetWorth }).eq('id', session.user.id);
      setTimeout(() => { setImportingId(null); alert("Projet importé dans votre Patrimoine !"); }, 1000);
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
      <main className="md:ml-64 flex-1 w-full md:w-auto min-w-0 p-4 md:p-8 relative overflow-x-hidden">
        
        <DossierBancaire refProp={componentRef} data={printData} />

        <div className="absolute top-0 left-64 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] w-full mx-auto space-y-6 md:space-y-10 relative z-10">
          
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

            {/* Tabs — scroll horizontal sur mobile */}
            <div className="flex items-center gap-2 -mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto scrollbar-hide pb-0.5">
              <div className="bg-zinc-900/60 backdrop-blur-xl p-1 rounded-2xl border border-white/5 flex gap-1 min-w-max shadow-2xl">
                {[
                  { id: "CAPACITE",    label: "Capacité",   icon: Wallet },
                  { id: "RENTABILITE", label: "Renta",      icon: Calculator },
                  { id: "FISCALITE",   label: "Fiscalité",  icon: Scale,      premium: true },
                  { id: "PROJETS",     label: "Projets",    icon: FolderOpen, premium: true },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                      mode === tab.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <tab.icon size={14} className="shrink-0" />
                    <span>{tab.label}</span>
                    {(tab as any).premium && <Crown size={11} className="text-yellow-400 shrink-0" />}
                  </button>
                ))}
              </div>
              {/* Guide mobile — dans la ligne des tabs */}
              <button onClick={() => setIsTutorialOpen(true)} className="sm:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest shrink-0 whitespace-nowrap">
                <BookOpen size={13} /> Guide
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
          
          {mode === "CAPACITE" && (
            <motion.div key="capa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 w-full min-w-0">
               <div className="lg:col-span-4 flex flex-col sm:grid sm:grid-cols-2 lg:flex gap-4 md:gap-6 w-full min-w-0">
                    <PremiumCard className="p-4 md:p-8">
                        <h3 className="text-xs font-black text-indigo-400 uppercase mb-4 md:mb-8 flex items-center gap-3 tracking-widest"><Wallet size={18}/> Revenus</h3>
                        <div className="space-y-4 md:space-y-6 w-full">
                            <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Salaire Net / Mois</label><Input type="number" value={revenue} onChange={e => handleInput(setRevenue, e.target.value)} className="bg-black/40 border-white/10 h-12 md:h-14 text-white font-bold text-lg md:text-xl focus:border-indigo-500 w-full min-w-0"/></div>
                            <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Crédits en cours</label><Input type="number" value={credits} onChange={e => handleInput(setCredits, e.target.value)} className="bg-black/40 border-white/10 h-12 md:h-14 text-white font-bold text-lg md:text-xl focus:border-indigo-500 w-full min-w-0"/></div>
                            <div className="space-y-2 pt-4 border-t border-white/5"><label className="text-[10px] font-bold text-emerald-500 uppercase">Apport Perso</label><Input type="number" value={apportCapacity} onChange={e => handleInput(setApportCapacity, e.target.value)} className="bg-emerald-900/10 border-emerald-500/20 h-12 md:h-14 text-emerald-400 font-bold text-lg md:text-xl focus:border-emerald-500 w-full min-w-0"/></div>
                        </div>
                    </PremiumCard>
                    <PremiumCard className="p-4 md:p-8">
                        <h3 className="text-xs font-black text-blue-400 uppercase mb-4 md:mb-8 flex items-center gap-3 tracking-widest"><Landmark size={18}/> Banque</h3>
                        <div className="space-y-4 md:space-y-6 w-full min-w-0">
                            <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                            <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                        </div>
                    </PremiumCard>
                </div>
                <div className="lg:col-span-8 p-6 sm:p-8 md:p-12 lg:p-16 rounded-[24px] md:rounded-[48px] bg-gradient-to-br from-zinc-900 via-black to-blue-950/20 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl w-full min-w-0">
                    <div className="text-zinc-500 text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4 md:mb-8 flex items-center justify-center flex-wrap gap-1">
                        ENVELOPPE GLOBALE D'ACHAT <HelpTooltip text="La somme totale que vous pouvez dépenser (Apport + Prêt bancaire). Votre taux d'endettement maximal est fixé à 35% par la loi."/>
                    </div>
                    <div className="text-[3rem] sm:text-5xl md:text-7xl lg:text-[9rem] font-black text-white tracking-tighter leading-none"><AnimatedNumber value={totalEnvelope} /></div>
                    <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center text-xs sm:text-sm font-bold text-zinc-500 bg-white/5 px-4 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-full border border-white/5 backdrop-blur-md w-full sm:w-auto max-w-full">
                            <span className="flex items-center justify-center gap-2"><Landmark size={14} className="text-blue-500 shrink-0"/> Prêt Banque: {formatEuro(maxLoan)}</span>
                            <span className="text-zinc-700 hidden sm:inline">|</span>
                            <span className="flex items-center justify-center gap-2"><PiggyBank size={14} className="text-emerald-500 shrink-0"/> Apport: {formatEuro(Number(apportCapacity))}</span>
                    </div>
                </div>
            </motion.div>
          )}

          {mode === "RENTABILITE" && (
            <motion.div key="renta" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-8 w-full min-w-0">
                <div className="xl:col-span-4 space-y-4 md:space-y-6 w-full min-w-0">
                    <PremiumCard className="p-4 md:p-6 relative z-20">
                        <h3 className="text-xs font-black text-white uppercase flex items-center gap-3 mb-4 md:mb-6 tracking-widest"><Building size={18}/> Le Projet</h3>
                        <div className="bg-black/40 p-3 md:p-4 rounded-2xl mb-4 md:mb-6 border border-white/5 min-w-0 w-full relative z-20">
                            <div className="mb-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Usage</label>
                                <div className="grid grid-cols-3 gap-1 md:gap-2">
                                    {['LOC', 'RP', 'RS'].map(t => (
                                        <button key={t} onClick={() => setProjectType(t as any)} className={`text-[9px] md:text-[10px] font-bold py-2 px-1 rounded-lg transition-all ${projectType === t ? "bg-zinc-700 text-white shadow-inner" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{t === 'LOC' ? 'Invest.' : t === 'RP' ? 'Principale' : 'Secondaire'}</button>
                                    ))}
                                </div>
                            </div>
                            {projectType === "LOC" && (
                                <div className="animate-in slide-in-from-top-2 fade-in">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Stratégie Locative</label>
                                    <div className="grid grid-cols-3 gap-1 md:gap-2">
                                        {['LMNP', 'NUE', 'LCD'].map(s => (
                                            <button key={s} onClick={() => setRentalStrategy(s as any)} className={`text-[9px] md:text-[10px] font-bold py-2 px-1 rounded-lg transition-all ${rentalStrategy === s ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4 w-full min-w-0">
                            <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Prix Achat</label><Input type="number" value={price} onChange={e => handleInput(setPrice, e.target.value)} className="bg-black/40 border-white/10 h-10 md:h-12 text-white font-bold min-w-0 w-full"/></div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase truncate block">Travaux</label><Input type="number" value={works} onChange={e => handleInput(setWorks, e.target.value)} className="bg-black/40 border-white/10 h-10 md:h-12 text-white font-bold min-w-0 w-full"/></div>
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase truncate block">Apport</label><Input type="number" value={apport} onChange={e => handleInput(setApport, e.target.value)} className="bg-black/40 border-white/10 h-10 md:h-12 text-white font-bold min-w-0 w-full"/></div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1"><label className="text-[10px] font-bold text-zinc-500 uppercase">Notaire (%)</label></div>
                                <Input type="number" step="0.1" value={notaryRate} onChange={e => handleInput(setNotaryRate, e.target.value)} className="bg-black/40 border-white/10 h-10 md:h-12 text-white font-bold min-w-0 w-full"/>
                            </div>
                            <div className="pt-4 border-t border-white/5 space-y-3 w-full">
                                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"><Landmark size={12}/> Financement Bancaire</h4>
                                <div className="space-y-3">
                                    <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                                    <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5 space-y-4 w-full">
                                {projectType === "LOC" && (
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Loyer Mensuel CC</label><Input type="number" value={rent} onChange={e => handleInput(setRent, e.target.value)} className="bg-black/40 border-white/10 h-10 md:h-12 text-emerald-400 font-bold min-w-0 w-full"/></div>
                                )}
                                <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase truncate block">Charges /m</label><Input type="number" value={charges} onChange={e => handleInput(setCharges, e.target.value)} className="bg-black/40 border-white/10 h-10 md:h-12 text-white font-bold min-w-0 w-full"/></div>
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase truncate block">Taxe Fonc. /an</label><Input type="number" value={tax} onChange={e => handleInput(setTax, e.target.value)} className="bg-black/40 border-white/10 h-10 md:h-12 text-white font-bold min-w-0 w-full"/></div>
                                </div>
                            </div>
                        </div>
                    </PremiumCard>
                </div>
                <div className="xl:col-span-8 space-y-4 md:space-y-6 w-full min-w-0">
                    {projectType === "LOC" ? (
                        <PremiumCard className={`p-5 sm:p-6 md:p-10 text-center flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px] md:min-h-[300px] border transition-all duration-500 ${cashflowNetImpots < 0 ? 'border-rose-500/40' : 'border-emerald-500/20'}`}>
                            <div className="flex items-center gap-2 mb-3 md:mb-6 justify-center z-10">
                                <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] ${cashflowNetImpots > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>CASHFLOW NET / MOIS</span>
                                <HelpTooltip title="Cashflow Net" text="Loyers - (Crédit + Charges + Taxe Foncière + Impôts). C'est le vrai chiffre qui compte à la fin du mois."/>
                            </div>
                            <div className={`text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-4 md:mb-8 z-10 ${cashflowNetImpots > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{cashflowNetImpots > 0 ? '+':''}<AnimatedNumber value={Math.round(cashflowNetImpots)}/></div>
                            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-12 text-xs font-bold w-full max-w-lg bg-black/30 p-3 md:p-4 rounded-2xl border border-white/5 z-10">
                                <div className="text-zinc-400 flex flex-row sm:flex-col justify-between sm:justify-start items-center">Avant Impôt <span className="text-white text-sm sm:text-lg ml-2 sm:ml-0">{cashflowBrut > 0 ? "+":""}{Math.round(cashflowBrut)}€</span></div>
                                <div className="hidden sm:block w-[1px] bg-white/10"></div>
                                <div className="text-zinc-400 flex flex-row sm:flex-col justify-between sm:justify-start items-center">Fiscalité Moy. <span className="text-amber-500 text-sm sm:text-lg ml-2 sm:ml-0">-{Math.round(Math.min(fiscalData.micro.total, fiscalData.reel.total)/12)}€</span></div>
                            </div>
                        </PremiumCard>
                    ) : (
                        <PremiumCard className="p-5 sm:p-6 md:p-10 text-center flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px] md:min-h-[300px] border-amber-500/20">
                            <div className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.4em] mb-3 md:mb-4">COÛT MENSUEL TOTAL</div>
                            <div className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">-<AnimatedNumber value={Math.round(monthlyPayment + Number(charges) + (Number(tax)/12))}/></div>
                            <div className="flex flex-wrap justify-center gap-2 text-[10px] sm:text-xs font-bold text-zinc-500 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                                <span>Crédit: {Math.round(monthlyPayment)}€</span><span>Charges: {Math.round(Number(charges))}€</span><span>Taxe: {Math.round(Number(tax)/12)}€</span>
                            </div>
                        </PremiumCard>
                    )}
                    <div className="grid grid-cols-2 gap-3 md:gap-6 w-full min-w-0">
                        <PremiumCard color="indigo" className="p-4 md:p-6 flex flex-col items-center justify-center relative">
                            <div className="absolute top-2 right-2"><HelpTooltip title="Coût Projet" text="Prix + Travaux + Notaire. Ne prend pas en compte le coût du crédit sur 20 ans."/></div>
                            <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase mb-1 sm:mb-2 text-center">Coût Projet</p>
                            <div className="text-2xl sm:text-3xl md:text-5xl font-black text-white">{Math.round(totalCost/1000)}<span className="text-indigo-500 text-base sm:text-lg md:text-2xl">k€</span></div>
                        </PremiumCard>
                        {projectType === "LOC" ? (
                            <PremiumCard color="emerald" className="p-4 md:p-6 flex flex-col items-center justify-center relative">
                                <div className="absolute top-2 right-2"><HelpTooltip title="Rendement Brut" text="(Loyer annuel / Coût d'achat total) * 100."/></div>
                                <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase mb-1 sm:mb-2 text-center">Rendement Brut</p>
                                <div className="text-2xl sm:text-3xl md:text-5xl font-black text-white">{yieldNet.toFixed(2)}<span className="text-emerald-500 text-base sm:text-lg md:text-2xl">%</span></div>
                            </PremiumCard>
                        ) : (
                            <PremiumCard color="rose" className="p-4 md:p-6 flex flex-col items-center justify-center relative">
                                <div className="absolute top-2 right-2"><HelpTooltip title="Coût du crédit" text="L'argent total que la banque va gagner grâce aux intérêts que vous allez lui payer."/></div>
                                <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase mb-1 sm:mb-2 text-center">Coût Crédit</p>
                                <div className="text-xl sm:text-2xl md:text-5xl font-black text-white">{formatEuro(Math.round(totalCreditCost))}</div>
                            </PremiumCard>
                        )}
                    </div>
                    {/* CHART AMORTISSEMENT — visible partout, plus compact sur mobile */}
                    <PremiumCard className="p-4 md:p-8 border-white/5 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 md:mb-6 relative z-10">
                            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 sm:gap-3"><BarChart3 size={16} className="text-blue-500 shrink-0"/> <span className="hidden sm:inline">Amortissement</span><span className="sm:hidden">Crédit</span> <HelpTooltip text="La courbe bleue montre comment votre capital restant dû diminue. La rouge montre l'accumulation de vos intérêts payés."/></h4>
                            <div className="text-[10px] text-zinc-500 font-mono shrink-0">{duration} ans</div>
                        </div>
                        <div className="h-[160px] sm:h-[200px] md:h-[250px] w-full min-w-0 relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={amortizationSchedule} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="year" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val, index) => index % 5 === 0 ? val : ''} />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize:'11px' }} itemStyle={{ color: '#fff' }} formatter={(val: any) => formatEuro(val)}/>
                                    <Area type="monotone" dataKey="capital" stackId="1" stroke="#3b82f6" fill="url(#colorCapital)" name="Capital Restant" strokeWidth={2}/>
                                    <Area type="monotone" dataKey="interests" stackId="2" stroke="#ef4444" fill="url(#colorInterest)" name="Intérêts Cumulés" strokeWidth={2}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </PremiumCard>
                    
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full min-w-0">
                        <Input placeholder="Nom du projet" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-zinc-900 border-white/10 h-12 md:h-14 rounded-2xl text-white focus:border-indigo-500 w-full min-w-0"/>
                        <Button onClick={saveSimulation} className="h-12 md:h-14 px-6 md:px-8 bg-white text-black hover:bg-zinc-200 font-bold rounded-2xl gap-2 shadow-lg w-full sm:w-auto shrink-0"><Save size={18}/> Sauvegarder</Button>
                    </div>
                </div>
            </motion.div>
          )}

          {mode === "FISCALITE" && (
            <PremiumGuard isPro={isPro} title="Fiscalité Expert" description="Comparez tous les régimes fiscaux, choisissez votre structure juridique et recevez des conseils personnalisés à jour 2026.">
                <motion.div key="fiscal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-w-0">
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
            <PremiumGuard isPro={isPro} title="Portefeuille de Projets" description="Sauvegardez vos simulations et générez des dossiers bancaires PDF illimités.">
                <motion.div key="list" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full min-w-0">
                    {savedSimulations.map((sim) => (
                        <PremiumCard key={sim.id} className="p-4 md:p-6 group flex flex-col justify-between h-full">
                            <div>
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div className="min-w-0 pr-2"><h4 className="text-base md:text-lg font-bold text-white mb-1 truncate">{sim.name}</h4><span className="text-[9px] md:text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded uppercase tracking-wider">{sim.data.projectType} • {sim.data.rentalStrategy}</span></div>
                                    <p className="text-[9px] md:text-[10px] text-zinc-600 font-mono shrink-0">{new Date(sim.date).toLocaleDateString()}</p>
                                </div>
                                <div className="space-y-3 mb-4 md:mb-6">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-2"><span className="text-[10px] md:text-xs text-zinc-500 font-bold uppercase">Cashflow</span><span className={`text-lg md:text-xl font-black ${sim.data.cashflowNetImpots > 0 ? "text-emerald-400" : "text-rose-500"}`}>{Math.round(sim.data.cashflowNetImpots)}€</span></div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 w-full min-w-0">
                                <div className="flex gap-2 w-full">
                                    <Button onClick={() => loadSimulation(sim)} className="flex-1 min-w-0 bg-white text-black hover:bg-zinc-200 h-10 rounded-xl text-[10px] md:text-xs font-bold uppercase shadow-lg"><MousePointerClick size={14} className="mr-1 md:mr-2 shrink-0"/><span className="truncate">Ouvrir</span></Button>
                                    <Button onClick={() => prepareAndPrint(sim)} className="w-10 shrink-0 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 h-10 rounded-xl"><Printer size={14}/></Button>
                                    <Button onClick={() => deleteSimulation(sim.id)} className="w-10 shrink-0 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 h-10 rounded-xl"><Trash2 size={14}/></Button>
                                </div>
                                <Button onClick={() => importToPatrimoine(sim)} disabled={importingId === sim.id} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-10 rounded-xl text-[10px] md:text-xs font-bold uppercase shadow-lg shadow-emerald-900/20 transition-all">{importingId === sim.id ? "..." : <><Check size={14} className="mr-1 md:mr-2 shrink-0"/> <span className="truncate">Valider cet investissement</span></>}</Button>
                            </div>
                        </PremiumCard>
                    ))}
                </motion.div>
            </PremiumGuard>
          )}

          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}