"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Plus, Trash2, Home, Target, ShieldCheck, Loader2, ChevronLeft, ChevronRight,
  Save, AlertTriangle, Coffee, ArrowRight, ScanLine, Check, BookOpen, Info, X,
  PiggyBank, Rocket, Coins, ShoppingCart, ArrowLeft, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ═══════════════════════════════════════════════════════════════════════════
//   NEXUS BUDGET V2 — REFONTE VISUELLE
//   Direction : Cinématique éditorial · Sérénité maîtrisée
//   Métaphore : descente en cascade (l'argent coule étape par étape)
//
//   Toute la logique métier (Supabase, calculs base zéro, scan IA, wizard)
//   est INCHANGÉE.
// ═══════════════════════════════════════════════════════════════════════════

const formatEuro = (val: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

// ═══════════════════════════════════════════════════════════════════════════
//   1. WIZARD D'INSTALLATION (NOUVEL UTILISATEUR) — relifté
//   ⚠️ Toute la logique de save Supabase est conservée à l'identique
// ═══════════════════════════════════════════════════════════════════════════

interface BudgetWizardProps { onComplete: () => void; }

function BudgetWizard({ onComplete }: BudgetWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [income, setIncome] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState("");
  const [variableExpenses, setVariableExpenses] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const budgetData = {
        income: Number(income) || 0,
        details: [
          { id: `bw-1-${Date.now()}`, name: "Charges fixes (Loyer, Factures)", amount: Number(fixedExpenses) || 0, category: "BESOIN" },
          { id: `bw-2-${Date.now()}`, name: "Dépenses courantes (Courses, Loisirs)", amount: Number(variableExpenses) || 0, category: "ENVIE" }
        ]
      };

      await supabase.from('profiles').update({ budget_json: budgetData }).eq('id', user.id);
      onComplete();
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
    } finally {
      setLoading(false);
    }
  };

  const slideVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  // Couleur dynamique selon l'étape
  const stepAccents = ["#eab308", "#3b82f6", "#10b981"];
  const accent = stepAccents[step - 1];

  return (
    <div className="fixed inset-0 z-[99999] bg-[#020203] text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Halo d'ambiance qui change de couleur selon l'étape */}
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.8 }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none"
        style={{ backgroundColor: `${accent}20` }}
      />

      {/* Grille subtile */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="w-full max-w-lg relative z-10">
        {/* Indicateur de progression éditorial */}
        <div className="flex items-center gap-3 mb-12 justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
            Étape {step} · sur 3
          </p>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === step ? 32 : 8,
                  backgroundColor: i <= step ? accent : "rgba(255,255,255,0.1)",
                  boxShadow: i === step ? `0 0 12px ${accent}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-yellow-500/30 rounded-3xl blur-2xl" />
                <div className="relative w-20 h-20 mx-auto rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 backdrop-blur-sm">
                  <Coins size={32} strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  Quels sont vos revenus<br />nets mensuels<span className="text-yellow-400">?</span>
                </h2>
                <p className="text-zinc-400 text-sm mt-3 font-light">Salaires, aides, revenus locatifs nets.</p>
              </div>

              <div className="relative max-w-xs mx-auto pt-4">
                <Input
                  type="number" value={income} onChange={(e) => setIncome(e.target.value)} autoFocus
                  className="bg-white/[0.03] backdrop-blur-sm border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-yellow-500/50 focus:ring-yellow-500/20 placeholder:text-zinc-700 text-white font-black"
                  placeholder="0"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-2">€</span>
              </div>

              <Button onClick={handleNext} disabled={!income} className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-[0.22em] text-sm rounded-2xl mt-6 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_8px_30px_-8px_rgba(234,179,8,0.6)]">
                Continuer <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-2xl" />
                <div className="relative w-20 h-20 mx-auto rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 backdrop-blur-sm">
                  <Home size={32} strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  Combien vous coûtent<br />vos charges fixes<span className="text-blue-400">?</span>
                </h2>
                <p className="text-zinc-400 text-sm mt-3 font-light">Loyer, crédits, assurances, abonnements obligatoires.</p>
              </div>

              <div className="relative max-w-xs mx-auto pt-4">
                <Input
                  type="number" value={fixedExpenses} onChange={(e) => setFixedExpenses(e.target.value)} autoFocus
                  className="bg-white/[0.03] backdrop-blur-sm border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-zinc-700 text-white font-black"
                  placeholder="0"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-2">€</span>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={handleBack} className="h-14 px-5 text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl">
                  <ArrowLeft size={16} />
                </Button>
                <Button onClick={handleNext} disabled={!fixedExpenses} className="flex-1 h-14 bg-white hover:bg-zinc-100 text-black font-black uppercase tracking-[0.22em] text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.3)]">
                  Continuer <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-3xl blur-2xl" />
                <div className="relative w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 backdrop-blur-sm">
                  <ShoppingCart size={32} strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  Et pour vivre<br />au quotidien<span className="text-emerald-400">?</span>
                </h2>
                <p className="text-zinc-400 text-sm mt-3 font-light">Estimation mensuelle pour les courses, restaurants et loisirs.</p>
              </div>

              <div className="relative max-w-xs mx-auto pt-4">
                <Input
                  type="number" value={variableExpenses} onChange={(e) => setVariableExpenses(e.target.value)} autoFocus
                  className="bg-white/[0.03] backdrop-blur-sm border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder:text-zinc-700 text-white font-black"
                  placeholder="0"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-2">€</span>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={handleBack} className="h-14 px-5 text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl">
                  <ArrowLeft size={16} />
                </Button>
                <Button onClick={handleSave} disabled={!variableExpenses || loading} className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.22em] text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-[0_8px_30px_-8px_rgba(16,185,129,0.6)]">
                  {loading ? <Loader2 className="animate-spin" /> : <>Générer mon budget <Sparkles className="ml-2 w-4 h-4" /></>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   2. POP-UP TUTORIEL : LE BUDGET BASE ZÉRO — relifté
// ═══════════════════════════════════════════════════════════════════════════

const TUTORIAL_STEPS = [
  { title: "Le Budget Base Zéro", subtitle: "LA MÉTHODE DES PROS", description: "Bienvenue dans votre Budget. Ici, chaque euro gagné doit avoir un objectif précis. À la fin de la page, votre solde non alloué doit être investi. Laissez-vous guider étape par étape.", icon: Target, accent: "#10b981" },
  { title: "Revenus & Dépenses", subtitle: "ÉTAPES 1 & 2", description: "Renseignez vos revenus, puis listez vos charges incompressibles (Besoins) et vos dépenses plaisir (Envies). Vous pouvez utiliser l'IA pour scanner vos tickets de caisse.", icon: Coffee, accent: "#3b82f6" },
  { title: "Le Reste à Vivre", subtitle: "ÉTAPE 3", description: "C'est votre Capacité d'Épargne Brute. C'est l'argent qu'il vous reste une fois vos dépenses payées. Cet argent ne doit surtout pas dormir sur votre compte courant !", icon: Target, accent: "#eab308" },
  { title: "Les Enveloppes", subtitle: "ÉTAPE 4", description: "Répartissez une partie de ce 'Reste à Vivre' pour vos futurs projets (Vacances, Voiture) ou pour consolider votre Matelas de Sécurité. Cet argent sera dépensé à court/moyen terme.", icon: PiggyBank, accent: "#a855f7" },
  { title: "La Machine à Richesse", subtitle: "ÉTAPE 5", description: "L'argent qu'il reste à la toute fin est votre Investissement Pur (DCA). C'est ce montant qui partira en Bourse ou en Crypto tous les mois. Un bouton vous permettra de le projeter sur 30 ans !", icon: Rocket, accent: "#10b981" }
];

function BudgetTutorialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
        className="relative w-full max-w-2xl bg-[#0A0A0C] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }} animate={{ opacity: 0.3 }}
          transition={{ duration: 0.7 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
          style={{ backgroundColor: step.accent }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px transition-all duration-700"
          style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }}
        />

        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors z-20 bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/5">
          <X size={18} />
        </button>

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
                <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: step.accent }}>
                  {step.subtitle}
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  {step.title}<span style={{ color: step.accent }}>.</span>
                </h2>
              </div>
              <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-xl font-light">{step.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="bg-[#121214]/80 backdrop-blur-sm border-t border-white/10 p-6 sm:p-8 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: i === currentStep ? 32 : 8,
                  backgroundColor: i === currentStep ? step.accent : "#3f3f46",
                  boxShadow: i === currentStep ? `0 0 12px ${step.accent}` : "none",
                }}
              />
            ))}
          </div>
          <Button onClick={handleNext} className="bg-white hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 text-black font-black uppercase tracking-widest rounded-xl px-8 py-6 text-sm transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {currentStep === TUTORIAL_STEPS.length - 1
              ? <span className="flex items-center gap-3">J'ai compris <Check size={16} /></span>
              : <span className="flex items-center gap-3">Suivant <ArrowRight size={16} /></span>}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   3. BULLE D'AIDE — légèrement raffinée
// ═══════════════════════════════════════════════════════════════════════════

const HelpTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      className="relative inline-flex items-center ml-1.5 cursor-pointer z-50"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className={`p-1 rounded-full transition-colors ${isOpen ? "bg-white/15 text-white" : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300"}`}>
        <Info size={11} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[130%] left-1/2 -translate-x-1/2 w-64 p-4 bg-[#1A1A1E]/95 backdrop-blur-xl text-white text-xs rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/10 text-center leading-relaxed font-sans normal-case tracking-normal z-[99999]"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1A1A1E]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//   COMPOSANT D'EN-TÊTE D'ÉTAPE — éditorial (kicker + filet horizontal)
// ═══════════════════════════════════════════════════════════════════════════

function StepKicker({ num, label, accent }: { num: string; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 px-2">
      <span
        className="text-[10px] font-black uppercase tracking-[0.3em] tabular-nums"
        style={{ color: accent }}
      >
        Étape {num}
      </span>
      <span className="block w-8 h-px" style={{ backgroundColor: `${accent}60` }} />
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.28em]">
        {label}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   4. PAGE BUDGET PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════

type BudgetItem = { id: string; name: string; amount: number; category: string; target?: number; startMonth?: string };

export default function BudgetPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExistingMonth, setIsExistingMonth] = useState(false);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState<BudgetItem[]>([]);

  const [newNeedName, setNewNeedName] = useState("");
  const [newNeedAmount, setNewNeedAmount] = useState("");
  const [newWantName, setNewWantName] = useState("");
  const [newWantAmount, setNewWantAmount] = useState("");
  const [newSaveName, setNewSaveName] = useState("");
  const [newSaveAmount, setNewSaveAmount] = useState("");
  const [newSaveTarget, setNewSaveTarget] = useState("");

  const [currentCash, setCurrentCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<BudgetItem[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => { loadMonthData(selectedDate); }, [selectedDate]);

  useEffect(() => {
    if (!loading && !needsSetup) {
      const hasSeenTutorial = localStorage.getItem("nexus_budget_tuto_seen");
      if (!hasSeenTutorial) setTimeout(() => setIsTutorialOpen(true), 800);
    }
  }, [loading, needsSetup]);

  // ─── LOGIQUE MÉTIER : INCHANGÉE INTÉGRALEMENT ────────────────────────────
  const loadMonthData = async (date: Date) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const user = session.user;
    const startOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];

    const { data: profile } = await supabase.from('profiles').select('budget_json, assets_json').eq('id', user.id).single();

    if (!profile?.budget_json || (profile.budget_json as any).income === undefined) {
      setNeedsSetup(true);
    } else {
      setNeedsSetup(false);
    }

    if (profile && Array.isArray(profile.assets_json)) {
      const cash = (profile.assets_json as any[]).filter(a => a.type === "Cash" || (a.type && a.type.includes("Livret"))).reduce((acc, a) => acc + (a.value || 0), 0);
      setCurrentCash(cash);
    }

    const { data: history } = await supabase.from('monthly_history').select('*').eq('user_id', user.id).eq('month', startOfMonth).maybeSingle();

    if (history) {
      setIsExistingMonth(true);
      setIncome(history.income || 0);
      if (history.details_json && Array.isArray(history.details_json)) setExpenses(history.details_json);
    } else {
      setIsExistingMonth(false);
      if (profile && profile.budget_json) {
        const b = profile.budget_json as any;
        setIncome(Number(b.income) || 0);
        let templateDetails = b.details || [];
        templateDetails = templateDetails.filter((item: any) => {
          if (item.category === 'EPARGNE' && item.target && item.startMonth) {
            const start = new Date(item.startMonth);
            const futureDate = new Date(startOfMonth);
            const diffMonths = (futureDate.getFullYear() - start.getFullYear()) * 12 + (futureDate.getMonth() - start.getMonth());
            const monthsNeeded = Math.ceil(item.target / item.amount);
            return diffMonths < monthsNeeded;
          }
          return true;
        });
        setExpenses(templateDetails);
      } else { setIncome(0); setExpenses([]); }
    }
    fetchHistoryGraph(user.id);
    setIsDirty(false);
    setLoading(false);
  };

  const fetchHistoryGraph = async (userId: string) => {
    const { data: hist } = await supabase.from('monthly_history').select('*').eq('user_id', userId).order('month', { ascending: true }).limit(6);
    if (hist && hist.length > 0) {
      const formatted = hist.map(h => {
        let needs = 0; let wants = 0; let savings = 0;
        if (h.details_json && Array.isArray(h.details_json)) {
          needs = h.details_json.filter((e: any) => e.category === 'BESOIN').reduce((acc: number, i: any) => acc + (i.amount || 0), 0);
          wants = h.details_json.filter((e: any) => e.category === 'ENVIE').reduce((acc: number, i: any) => acc + (i.amount || 0), 0);
          savings = h.details_json.filter((e: any) => e.category === 'EPARGNE').reduce((acc: number, i: any) => acc + (i.amount || 0), 0);
        } else needs = Number(h.expenses) || 0;
        return { name: new Date(h.month).toLocaleDateString('fr-FR', { month: 'short' }), Revenus: h.income, Besoins: needs, Loisirs: wants, Epargne: savings };
      });
      setHistoryData(formatted);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  // ─── MOTEUR FINANCIER BASE ZÉRO (INCHANGÉ) ───────────────────────────────
  const needsList = expenses.filter(e => e.category === 'BESOIN');
  const wantsList = expenses.filter(e => e.category === 'ENVIE');
  const saveList = expenses.filter(e => e.category === 'EPARGNE');

  const safeIncome = isNaN(income) ? 0 : income;
  const needsTotal = needsList.reduce((acc, i) => acc + (isNaN(i.amount) ? 0 : i.amount), 0);
  const wantsTotal = wantsList.reduce((acc, i) => acc + (isNaN(i.amount) ? 0 : i.amount), 0);
  const savesTotal = saveList.reduce((acc, i) => acc + (isNaN(i.amount) ? 0 : i.amount), 0);
  const totalExp = needsTotal + wantsTotal + savesTotal;

  const capaciteEpargneBrute = Math.max(0, safeIncome - needsTotal - wantsTotal);
  const investissementPurDCA = capaciteEpargneBrute - savesTotal;

  const safetyTarget = (needsTotal + wantsTotal) * 6;
  const isSafe = currentCash >= safetyTarget && safetyTarget > 0;

  const needsPct = safeIncome > 0 ? (needsTotal / safeIncome) * 100 : 0;
  const wantsPct = safeIncome > 0 ? (wantsTotal / safeIncome) * 100 : 0;
  const savingsPct = safeIncome > 0 ? (capaciteEpargneBrute / safeIncome) * 100 : 0;

  const calculateRemainingMonths = (item: BudgetItem) => {
    if (!item.target || item.amount <= 0) return 0;
    const start = item.startMonth ? new Date(item.startMonth) : new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    const current = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    const diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
    const totalMonthsNeeded = Math.ceil(item.target / item.amount);
    return Math.max(0, totalMonthsNeeded - diffMonths);
  };

  const saveCurrentMonth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const saveDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];

    await supabase.from('monthly_history').upsert({
      user_id: user.id, month: saveDate, income: safeIncome, expenses: needsTotal + wantsTotal, invested: investissementPurDCA, details_json: expenses
    }, { onConflict: 'user_id, month' });

    triggerHaptic("success");
    setIsExistingMonth(true);
    setIsDirty(false);

    const recurringExpenses = expenses.filter(e => e.category === 'BESOIN' || e.category === 'EPARGNE');

    if (selectedDate >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
      await supabase.from('profiles').update({ budget_json: { income: safeIncome, details: recurringExpenses } }).eq('id', user.id);
    }

    const nextMonthDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)).toISOString().split('T')[0];
    const { data: futureHistory } = await supabase.from('monthly_history').select('*').eq('user_id', user.id).gte('month', nextMonthDate);

    if (futureHistory && futureHistory.length > 0) {
      for (const fh of futureHistory) {
        const existingWants = (fh.details_json || []).filter((e: any) => e.category === 'ENVIE');
        const validRecurringForFuture = recurringExpenses.filter(item => {
          if (item.category === 'EPARGNE' && item.target && item.startMonth) {
            const start = new Date(item.startMonth);
            const futureDate = new Date(fh.month);
            const diffMonths = (futureDate.getFullYear() - start.getFullYear()) * 12 + (futureDate.getMonth() - start.getMonth());
            const monthsNeeded = Math.ceil(item.target / item.amount);
            return diffMonths < monthsNeeded;
          }
          return true;
        });

        const newDetails = [...existingWants, ...validRecurringForFuture];
        const fNeeds = validRecurringForFuture.filter(e => e.category === 'BESOIN').reduce((s, i) => s + i.amount, 0);
        const fWants = existingWants.reduce((s: number, i: any) => s + i.amount, 0);
        const fSaves = validRecurringForFuture.filter(e => e.category === 'EPARGNE').reduce((s, i) => s + i.amount, 0);

        await supabase.from('monthly_history').update({
          details_json: newDetails, expenses: fNeeds + fWants, invested: Math.max(0, fh.income - fNeeds - fWants) - fSaves
        }).eq('id', fh.id);
      }
    }

    fetchHistoryGraph(user.id);
    setIsDirty(false);
    setLoading(false);
  };

  const addExpense = (name: string, amount: string, category: string, target?: string) => {
    if (!name || !amount) return;
    const val = parseFloat(amount); if (isNaN(val)) return;
    const targetVal = target ? parseFloat(target) : undefined;
    const currentMonthStr = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];
    setExpenses([...expenses, { id: Date.now().toString(), name, amount: val, category, target: targetVal, startMonth: currentMonthStr }]);
    setIsDirty(true);
  };

  const updateAmount = (id: string, newAmount: string) => {
    const val = parseFloat(newAmount);
    setExpenses(expenses.map(e => e.id === id ? { ...e, amount: isNaN(val) ? 0 : val } : e));
    setIsDirty(true);
  };

  const removeExpense = (id: string) => { setExpenses(expenses.filter(e => e.id !== id)); setIsDirty(true); };

  const triggerScanner = () => fileInputRef.current?.click();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      let base64Image = "";
      if (file.type === "application/pdf") {
        try {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height; canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
            base64Image = canvas.toDataURL("image/jpeg", 0.9);
          } else throw new Error("Erreur canvas");
        } catch (err) { throw new Error("Impossible de lire ce PDF. Essayez une capture d'écran."); }
      } else { base64Image = await fileToBase64(file); }

      const response = await fetch('/api/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image })
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Erreur serveur"); }
      const data = await response.json();

      if (data.expenses && data.expenses.length > 0) {
        const formattedItems = data.expenses.map((item: any, index: number) => ({
          id: `ai-${Date.now()}-${index}`, name: item.name || "Dépense IA", amount: item.amount || 0,
          category: item.category === "ENVIE" ? "ENVIE" : "BESOIN"
        }));
        setScannedItems(formattedItems); setShowValidation(true);
      } else alert("L'IA n'a détecté aucune dépense.");
    } catch (error: any) { alert("Erreur IA : " + error.message); } finally {
      setIsScanning(false); if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading && expenses.length === 0 && !needsSetup) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-500" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      {needsSetup && (
        <BudgetWizard onComplete={() => { setNeedsSetup(false); loadMonthData(selectedDate); }} />
      )}

      <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-yellow-500/30 selection:text-white relative overflow-hidden">

        {/* OVERLAYS IA — Scanner + Validation, refondus */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-3xl blur-2xl bg-purple-500/40"
                  />
                  <motion.div
                    animate={{ y: [-6, 6, -6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-24 h-24 rounded-3xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 overflow-hidden backdrop-blur-sm"
                  >
                    <ScanLine size={36} className="relative z-10" />
                    <motion.div
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 w-full h-px bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,1)] z-20"
                    />
                  </motion.div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em] mb-2">
                    Analyse IA · GPT-4o
                  </p>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Lecture de votre ticket<span className="text-purple-400">…</span>
                  </h3>
                </div>
              </div>
            </motion.div>
          )}

          {showValidation && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
                onClick={() => setShowValidation(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
                className="relative w-full max-w-lg bg-[#0A0A0C] border border-purple-500/20 rounded-[28px] flex flex-col overflow-hidden max-h-[80vh]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                      <ScanLine size={16} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.28em]">
                        Validation IA
                      </p>
                      <h3 className="text-base font-black text-white">Confirmer les dépenses détectées</h3>
                    </div>
                  </div>
                  <button onClick={() => setShowValidation(false)} className="text-zinc-500 hover:text-white p-2">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-3">
                  {scannedItems.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl gap-4">
                      <div className="flex-1 min-w-0 w-full">
                        <p className="font-bold text-white text-sm truncate">{item.name}</p>
                        <p className="text-lg font-black text-emerald-300 tabular-nums mt-1">{formatEuro(item.amount)}</p>
                      </div>
                      <Select value={item.category} onValueChange={(val) => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, category: val } : i))}>
                        <SelectTrigger className="w-full sm:w-36 bg-zinc-900/60 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white z-[999]">
                          <SelectItem value="BESOIN">🏠 Besoin</SelectItem>
                          <SelectItem value="ENVIE">☕ Loisir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-white/5 bg-black/50">
                  <Button
                    onClick={() => { setExpenses([...expenses, ...scannedItems]); setShowValidation(false); setScannedItems([]); }}
                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.01] active:scale-95 text-white font-black uppercase tracking-[0.22em] rounded-xl text-sm transition-all shadow-[0_8px_30px_-8px_rgba(168,85,247,0.6)]"
                  >
                    Importer ces {scannedItems.length} dépense{scannedItems.length > 1 ? "s" : ""}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <BudgetTutorialModal isOpen={isTutorialOpen} onClose={() => { setIsTutorialOpen(false); localStorage.setItem("nexus_budget_tuto_seen", "true"); }} />
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />

        <Sidebar />

        {/* ── ATMOSPHÈRE DE FOND ─────────────────────────────────────────────
            Ambiance amber dominante (couleur de l'onglet Budget) + accents
           ─────────────────────────────────────────────────────────────────── */}
        <div className="fixed top-0 left-0 right-0 h-screen pointer-events-none z-0">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-50"
            style={{
              background: "radial-gradient(ellipse at center, rgba(234,179,8,0.10) 0%, rgba(234,179,8,0.03) 30%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute top-[80vh] -left-40 w-[500px] h-[500px] opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute top-[180vh] -right-40 w-[500px] h-[500px] opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute top-[280vh] left-1/2 w-[600px] h-[600px] opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        {/* Grille subtile */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <main className="md:ml-64 flex-1 w-full md:w-auto min-w-0 p-4 md:p-8 relative z-10 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[1600px] w-full mx-auto space-y-10 md:space-y-16 pb-20"
          >

            {/* ══════════════════════════════════════════════════════════════
                 HEADER ÉDITORIAL
               ══════════════════════════════════════════════════════════════ */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                  <span className="block w-6 h-px bg-yellow-400/60" />
                  Module · Budget base zéro
                </p>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.05]">
                  Donnez un rôle{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400">
                    à chaque euro
                  </span>
                  <span className="text-yellow-400">.</span>
                </h1>
                <p className="text-zinc-500 text-sm mt-2 max-w-xl leading-relaxed">
                  La méthode Base Zéro en 5 étapes — chaque euro gagné est alloué, rien ne dort.
                </p>
              </div>
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all text-xs font-bold uppercase tracking-[0.22em] backdrop-blur-sm shrink-0"
              >
                <BookOpen size={13} /> Guide
              </button>
            </header>

            {/* ══════════════════════════════════════════════════════════════
                 ÉTAPE 1 — REVENUS DU MOIS
                 (sélecteur mois + revenus + bouton sauvegarde)
               ══════════════════════════════════════════════════════════════ */}
            <section>
              <StepKicker num="01" label="Vos revenus" accent="#eab308" />

              <div className="relative rounded-[28px] overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent z-20" />
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-yellow-950/10 backdrop-blur-sm" />
                <div className="absolute inset-0 border border-white/[0.06] rounded-[28px]" />

                {/* Halo coloré subtil */}
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-[80px] bg-yellow-500/10 pointer-events-none" />

                <div className="relative z-10 p-5 md:p-7 flex flex-col xl:flex-row justify-between items-center gap-5 md:gap-7">

                  {/* Sélecteur de mois */}
                  <div className="flex items-center justify-between w-full xl:w-auto gap-3 md:gap-5">
                    <Button
                      variant="outline" size="icon"
                      onClick={() => changeMonth(-1)}
                      className="rounded-2xl bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white w-10 h-10 md:w-11 md:h-11 shrink-0 backdrop-blur-sm"
                    >
                      <ChevronLeft size={18} />
                    </Button>
                    <div className="text-center min-w-[160px] md:min-w-[200px]">
                      <h2 className="text-xl md:text-2xl font-black text-white capitalize tracking-tight truncate">
                        {formatMonth(selectedDate)}
                      </h2>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.28em] mt-1 flex items-center justify-center gap-1.5">
                        <span
                          className="block w-1 h-1 rounded-full"
                          style={{ backgroundColor: isExistingMonth ? "#10b981" : "#eab308" }}
                        />
                        {isExistingMonth ? "Données enregistrées" : "Mode édition"}
                      </p>
                    </div>
                    <Button
                      variant="outline" size="icon"
                      onClick={() => changeMonth(1)}
                      className="rounded-2xl bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white w-10 h-10 md:w-11 md:h-11 shrink-0 backdrop-blur-sm"
                    >
                      <ChevronRight size={18} />
                    </Button>
                  </div>

                  {/* Revenus + bouton sauvegarde */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto justify-end">
                    <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.28em] mb-2 flex items-center gap-1.5">
                        Revenus du mois
                        <HelpTooltip text="Votre salaire net et toutes autres rentrées d'argent régulières." />
                      </p>
                      <div className="flex items-center gap-2 bg-black/40 border border-white/10 backdrop-blur-sm rounded-xl px-4 py-2 relative">
                        <Input
                          type="number" value={income === 0 ? "" : income}
                          onChange={(e) => { setIncome(parseFloat(e.target.value)); setIsDirty(true); }}
                          className="h-9 w-32 bg-transparent border-none text-right text-2xl font-black text-white p-0 pr-6 focus-visible:ring-0 tabular-nums"
                        />
                        <span className="text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-base">€</span>
                      </div>
                    </div>
                    <Button
                      onClick={saveCurrentMonth}
                      className={`w-full sm:w-auto h-12 px-6 font-black uppercase tracking-[0.22em] rounded-xl text-xs shrink-0 transition-all hover:scale-[1.02] active:scale-95 ${
                        isDirty
                          ? "bg-gradient-to-r from-yellow-500 to-orange-400 text-black shadow-[0_8px_30px_-8px_rgba(234,179,8,0.6)]"
                          : "bg-emerald-500 text-black shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]"
                      }`}
                    >
                      <Save size={14} className="mr-2" />
                      {isDirty ? "Sauvegarder*" : "Sauvegardé"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                 ÉTAPE 2 — DÉPENSES (BESOINS + ENVIES + SCANNER IA)
               ══════════════════════════════════════════════════════════════ */}
            <section>
              <StepKicker num="02" label="Vos dépenses du mois" accent="#3b82f6" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

                {/* BESOINS */}
                <ExpensePanel
                  title="Charges fixes & besoins"
                  subtitle="Loyer, crédit, courses, électricité, assurances"
                  icon={Home}
                  accent="#3b82f6"
                  newName={newNeedName} setNewName={setNewNeedName}
                  newAmount={newNeedAmount} setNewAmount={setNewNeedAmount}
                  onAdd={() => { addExpense(newNeedName, newNeedAmount, "BESOIN"); setNewNeedName(""); setNewNeedAmount(""); }}
                  items={needsList}
                  onUpdate={updateAmount}
                  onRemove={removeExpense}
                  placeholder="Ex : Loyer, Électricité…"
                />

                {/* ENVIES */}
                <ExpensePanel
                  title="Loisirs & envies"
                  subtitle="Restaurants, cinéma, vêtements, abonnements"
                  icon={Coffee}
                  accent="#eab308"
                  newName={newWantName} setNewName={setNewWantName}
                  newAmount={newWantAmount} setNewAmount={setNewWantAmount}
                  onAdd={() => { addExpense(newWantName, newWantAmount, "ENVIE"); setNewWantName(""); setNewWantAmount(""); }}
                  items={wantsList}
                  onUpdate={updateAmount}
                  onRemove={removeExpense}
                  placeholder="Ex : Restaurant…"
                />
              </div>

              {/* Scanner IA — bouton premium */}
              <motion.button
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                onClick={triggerScanner}
                className="group relative w-full flex items-center justify-center gap-4 p-5 md:p-6 rounded-[24px] overflow-hidden transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 backdrop-blur-sm" />
                <div className="absolute inset-0 border border-purple-500/20 group-hover:border-purple-400/40 rounded-[24px] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

                {/* Halo qui pulse subtilement */}
                <motion.div
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-500/30 blur-[60px] pointer-events-none"
                />

                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 md:p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-300 group-hover:scale-110 transition-transform shadow-[0_0_24px_-4px_rgba(168,85,247,0.6)]">
                    <ScanLine size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.28em] mb-1 flex items-center gap-2">
                      Reconnaissance automatique
                      <span className="text-[8px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-1.5 py-0.5 rounded-md font-black tracking-widest">
                        GPT-4o
                      </span>
                    </p>
                    <h4 className="text-white font-black text-base md:text-lg tracking-tight">
                      Scanner un ticket de caisse<span className="text-purple-400">.</span>
                    </h4>
                  </div>
                </div>
              </motion.button>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                 ÉTAPE 3 — LE BILAN (CAPACITÉ D'ÉPARGNE BRUTE) — pièce clé
               ══════════════════════════════════════════════════════════════ */}
            <section>
              <StepKicker num="03" label="Le bilan · capacité d'épargne" accent="#10b981" />

              <div className="relative rounded-[36px] overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent z-20" />

                {/* Fond verre dépoli + halos */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-emerald-950/20 backdrop-blur-sm" />
                <div className="absolute inset-0 border border-emerald-500/15 rounded-[36px]" />

                <motion.div
                  animate={{ opacity: [0.2, 0.35, 0.2], scale: [1, 1.05, 1] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] bg-emerald-500/25 pointer-events-none"
                />

                <div className="relative z-10 p-6 md:p-10">

                  {/* Hero : grand chiffre + total dépenses */}
                  <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-8">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                        <Target size={11} />
                        Capacité d'épargne brute
                        <HelpTooltip text="Revenus - Besoins - Envies. C'est l'argent que vous n'avez pas encore dépensé et que vous DEVEZ allouer à l'étape suivante." />
                      </p>
                      <div
                        className="font-black text-white tracking-tighter leading-none tabular-nums"
                        style={{
                          fontSize: "clamp(2.5rem, 11vw, 7rem)",
                          textShadow: "0 0 40px rgba(16,185,129,0.4)",
                        }}
                      >
                        <AnimatedNumber value={capaciteEpargneBrute} />
                      </div>
                      <p className="text-zinc-400 text-sm mt-3 max-w-md leading-relaxed font-light">
                        L'argent qu'il vous reste après vos dépenses. Vous allez l'allouer aux enveloppes, le solde final partira en investissement.
                      </p>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                      <div className="bg-black/40 backdrop-blur-md p-5 md:p-7 rounded-3xl border border-white/[0.06] shadow-inner text-center min-w-[200px]">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.28em] mb-2">
                          Total dépenses
                        </p>
                        <p className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tighter">
                          {formatEuro(needsTotal + wantsTotal)}
                        </p>
                        <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Besoins</p>
                            </div>
                            <p className="text-sm font-black text-white tabular-nums">{formatEuro(needsTotal)}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Envies</p>
                            </div>
                            <p className="text-sm font-black text-white tabular-nums">{formatEuro(wantsTotal)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analyse 50/30/20 */}
                  <div className="bg-black/30 backdrop-blur-md p-5 md:p-6 rounded-[24px] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <h4 className="text-white font-black text-xs md:text-sm uppercase tracking-[0.28em] flex items-center gap-2">
                        Équilibre 50 / 30 / 20
                        <HelpTooltip text="La méthode idéale pour s'enrichir : 50% max pour les Besoins, 30% max pour les Envies, et 20% minimum de Capacité d'Épargne." />
                      </h4>
                    </div>

                    {/* Légende améliorée */}
                    <div className="grid grid-cols-3 gap-3 md:gap-6 mb-4">
                      {[
                        { label: "Besoins", pct: needsPct, target: 50, ok: needsPct <= 50, color: "#3b82f6", warning: needsPct > 50 ? "Trop élevé" : null },
                        { label: "Envies",  pct: wantsPct, target: 30, ok: wantsPct <= 30, color: "#eab308", warning: wantsPct > 30 ? "Trop élevé" : null },
                        { label: "Épargne", pct: savingsPct, target: 20, ok: savingsPct >= 20, color: "#10b981", warning: savingsPct < 20 ? "Trop faible" : null },
                      ].map((it) => (
                        <div key={it.label} className="text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: it.ok ? it.color : "#f43f5e" }} />
                            <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: it.ok ? "#a1a1aa" : "#fb7185" }}>
                              {it.label}
                            </p>
                          </div>
                          <p className="text-2xl font-black text-white tabular-nums leading-none">
                            {it.pct.toFixed(0)}<span className="text-base text-zinc-500 ml-0.5">%</span>
                          </p>
                          {it.warning && (
                            <p className="text-[9px] text-rose-400 font-bold mt-1 uppercase tracking-wider">{it.warning}</p>
                          )}
                          <p className="text-[9px] text-zinc-600 mt-0.5 tabular-nums">
                            {it.label === "Épargne" ? `min ${it.target}%` : `max ${it.target}%`}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Barre 50/30/20 */}
                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-black/40 border border-white/5">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${needsPct}%` }}
                        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                        className={needsPct > 50 ? "bg-rose-500/80" : "bg-blue-500"}
                        style={{ boxShadow: needsPct > 50 ? "0 0 12px rgba(244,63,94,0.6)" : "0 0 12px rgba(59,130,246,0.5)" }}
                      />
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${wantsPct}%` }}
                        transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={wantsPct > 30 ? "bg-rose-500/80" : "bg-yellow-500"}
                        style={{ boxShadow: wantsPct > 30 ? "0 0 12px rgba(244,63,94,0.6)" : "0 0 12px rgba(234,179,8,0.5)" }}
                      />
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${savingsPct}%` }}
                        transition={{ duration: 1.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className={savingsPct < 20 ? "bg-orange-500" : "bg-emerald-500"}
                        style={{ boxShadow: savingsPct < 20 ? "0 0 12px rgba(249,115,22,0.6)" : "0 0 12px rgba(16,185,129,0.6)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                 ÉTAPE 4 — ENVELOPPES & MATELAS DE SÉCURITÉ
               ══════════════════════════════════════════════════════════════ */}
            <section>
              <StepKicker num="04" label="Prévoir l'avenir · enveloppes" accent="#a855f7" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ENVELOPPES */}
                <div className="relative rounded-[28px] overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent z-20" />
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-purple-950/15 backdrop-blur-sm" />
                  <div className="absolute inset-0 border border-purple-500/15 rounded-[28px]" />
                  <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-[80px] bg-purple-500/15 pointer-events-none" />

                  <div className="relative z-10 p-5 md:p-7">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                        <PiggyBank size={14} className="text-purple-400" />
                      </div>
                      <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">
                        Enveloppes & projets
                      </h3>
                      <HelpTooltip text="Répartissez votre Épargne Brute ici. Créez des provisions (Vacances, Voiture), ou remplissez votre Matelas de sécurité. Ces charges se copient sur les mois suivants." />
                    </div>

                    {/* Form add */}
                    <div className="bg-purple-500/[0.04] border border-purple-500/15 rounded-2xl p-3 mb-4 space-y-2">
                      <Input
                        placeholder="Ex : Vacances été 2026, Matelas…"
                        value={newSaveName}
                        onChange={(e) => setNewSaveName(e.target.value)}
                        className="bg-black/40 border-white/10 text-white h-10 focus-visible:ring-purple-500/50 text-sm"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <div className="flex-1 min-w-[100px] bg-black/40 rounded-lg border border-white/10 relative">
                          <Input
                            type="number" placeholder="Objectif (€)"
                            value={newSaveTarget}
                            onChange={(e) => setNewSaveTarget(e.target.value)}
                            className="bg-transparent border-none text-white text-right h-10 font-medium p-0 px-3 focus-visible:ring-0 text-xs"
                          />
                        </div>
                        <div className="flex-1 min-w-[100px] bg-purple-500/[0.08] rounded-lg border border-purple-500/25 relative">
                          <Input
                            type="number" placeholder="Mensualité"
                            value={newSaveAmount}
                            onChange={(e) => setNewSaveAmount(e.target.value)}
                            className="bg-transparent border-none text-purple-200 text-right h-10 font-bold p-0 pr-8 pl-3 focus-visible:ring-0 text-sm placeholder:text-purple-700"
                          />
                          <span className="text-purple-400 text-[10px] absolute right-2 top-1/2 -translate-y-1/2 font-bold">€/m</span>
                        </div>
                        <Button
                          onClick={() => { addExpense(newSaveName, newSaveAmount, "EPARGNE", newSaveTarget); setNewSaveName(""); setNewSaveAmount(""); setNewSaveTarget(""); }}
                          className="bg-purple-500 hover:bg-purple-400 text-white h-10 w-10 p-0 rounded-lg shrink-0"
                        >
                          <Plus size={18} />
                        </Button>
                      </div>
                    </div>

                    {/* Liste enveloppes */}
                    <div className="space-y-2">
                      <AnimatePresence>
                        {saveList.map((item) => {
                          const remaining = calculateRemainingMonths(item);
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              key={item.id}
                              className="p-3 bg-black/30 backdrop-blur-sm rounded-xl border border-white/[0.06] hover:border-purple-500/25 transition-colors"
                            >
                              <div className="flex justify-between items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-zinc-100 font-bold truncate text-sm">{item.name}</p>
                                  {item.target ? (
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                      <span className="text-[9px] text-zinc-500 bg-black/40 border border-white/5 px-1.5 py-0.5 rounded-md tabular-nums">
                                        Cible · {formatEuro(item.target)}
                                      </span>
                                      {remaining > 0 && (
                                        <span className="text-[9px] text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded-md font-bold tabular-nums">
                                          {remaining} mois restant{remaining > 1 ? "s" : ""}
                                        </span>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="w-24 bg-black/50 rounded-lg border border-white/[0.06] relative">
                                    <Input
                                      type="number" value={item.amount === 0 ? "" : item.amount}
                                      onChange={(e) => updateAmount(item.id, e.target.value)}
                                      className="bg-transparent border-none text-right text-purple-200 font-bold h-9 p-0 pr-8 pl-2 focus-visible:ring-0 text-xs tabular-nums"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 text-[9px] pointer-events-none font-bold">€/m</span>
                                  </div>
                                  <button
                                    onClick={() => removeExpense(item.id)}
                                    className="text-zinc-600 hover:text-rose-400 p-1 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* MATELAS + GRAPHIQUE */}
                <div className="space-y-4">

                  {/* Matelas de sécurité */}
                  <div className={`relative rounded-[28px] overflow-hidden ${isSafe ? "" : ""}`}>
                    <div
                      className="absolute inset-x-0 top-0 h-px"
                      style={{
                        background: isSafe
                          ? "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)"
                          : "linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)",
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-black/40 backdrop-blur-sm" />
                    <div
                      className="absolute inset-0 rounded-[28px]"
                      style={{ borderColor: isSafe ? "rgba(16,185,129,0.15)" : "rgba(249,115,22,0.15)", borderWidth: "1px", borderStyle: "solid" }}
                    />

                    <div className="relative z-10 p-5 md:p-7">
                      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: isSafe ? "rgba(16,185,129,0.15)" : "rgba(249,115,22,0.15)",
                              borderWidth: "1px",
                              borderColor: isSafe ? "rgba(16,185,129,0.25)" : "rgba(249,115,22,0.25)",
                            }}
                          >
                            <ShieldCheck size={14} style={{ color: isSafe ? "#10b981" : "#f97316" }} />
                          </div>
                          <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">
                            Matelas de sécurité
                          </h3>
                          <HelpTooltip text="L'épargne d'urgence présente sur l'onglet Patrimoine. Elle sert UNIQUEMENT en cas de perte d'emploi. Recommandé : 6 mois de charges." />
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono bg-black/40 border border-white/5 px-2 py-1 rounded-md tabular-nums">
                          Cible · {formatEuro(safetyTarget)}
                        </span>
                      </div>

                      <div className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tighter mb-4">
                        <AnimatedNumber value={currentCash} />
                        <span className="text-lg text-zinc-600 ml-1">€</span>
                      </div>

                      <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (currentCash / (safetyTarget || 1)) * 100)}%` }}
                          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full"
                          style={{
                            backgroundColor: isSafe ? "#10b981" : "#f97316",
                            boxShadow: isSafe
                              ? "0 0 12px rgba(16,185,129,0.6)"
                              : "0 0 12px rgba(249,115,22,0.6)",
                          }}
                        />
                      </div>

                      {!isSafe && (
                        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-orange-500/[0.06] border border-orange-500/15">
                          <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-orange-300 leading-relaxed">
                            Jauge incomplète. Ajoutez une enveloppe « Matelas » pour la combler progressivement.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graphique historique */}
                  <div className="relative rounded-[28px] overflow-hidden">
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
                    <div className="absolute inset-0 border border-white/[0.06] rounded-[28px]" />

                    <div className="relative z-10 p-5 md:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
                          <Target size={12} className="text-zinc-400" />
                        </div>
                        <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">
                          Historique · 6 mois
                        </h3>
                      </div>

                      <div className="h-[180px] md:h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historyData} barGap={2} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip
                              cursor={{ fill: "#ffffff05" }}
                              contentStyle={{
                                backgroundColor: "rgba(10,10,12,0.95)",
                                backdropFilter: "blur(12px)",
                                borderColor: "rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                fontSize: "11px",
                                color: "#fff",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
                              }}
                              itemStyle={{ color: "#fff" }}
                              formatter={(val: any) => formatEuro(val)}
                            />
                            <Legend
                              iconType="circle"
                              wrapperStyle={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.18em" }}
                            />
                            <Bar dataKey="Revenus" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={6} />
                            <Bar dataKey="Besoins" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={6} />
                            <Bar dataKey="Loisirs" fill="#eab308" radius={[4, 4, 0, 0]} barSize={6} />
                            <Bar dataKey="Epargne" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={6} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                 ÉTAPE 5 — INVESTISSEMENT PUR DCA · L'APOTHÉOSE
               ══════════════════════════════════════════════════════════════ */}
            <section>
              <StepKicker num="05" label="La machine à richesse" accent="#10b981" />

              <div className="relative rounded-[40px] overflow-hidden">
                {investissementPurDCA > 0 ? (
                  <>
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent z-20" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-teal-950/30 backdrop-blur-sm" />
                    <div className="absolute inset-0 border border-emerald-500/25 rounded-[40px]" />

                    {/* Halos qui pulsent */}
                    <motion.div
                      animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full blur-[120px] bg-emerald-500/30 pointer-events-none"
                    />
                    <motion.div
                      animate={{ opacity: [0.2, 0.35, 0.2], scale: [1, 1.08, 1] }}
                      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] bg-teal-500/20 pointer-events-none"
                    />

                    {/* Cercles décoratifs */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 600 400">
                      <circle cx="500" cy="100" r="200" fill="none" stroke="#10b981" strokeWidth="0.5" />
                      <circle cx="500" cy="100" r="280" fill="none" stroke="#10b981" strokeWidth="0.5" />
                      <circle cx="500" cy="100" r="360" fill="none" stroke="#10b981" strokeWidth="0.5" />
                    </svg>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
                    <div className="absolute inset-0 border border-white/[0.06] rounded-[40px]" />
                  </>
                )}

                <div className="relative z-10 p-8 md:p-14 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">

                  {/* Fusée décollage */}
                  <motion.div
                    animate={investissementPurDCA > 0 ? { y: [0, -6, 0] } : {}}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    {investissementPurDCA > 0 && (
                      <div className="absolute inset-0 bg-emerald-500/40 rounded-3xl blur-2xl" />
                    )}
                    <div
                      className="relative p-5 rounded-3xl"
                      style={{
                        backgroundColor: investissementPurDCA > 0 ? "rgba(16,185,129,0.15)" : "rgba(63,63,70,0.4)",
                        borderWidth: "1px",
                        borderColor: investissementPurDCA > 0 ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)",
                        color: investissementPurDCA > 0 ? "#34d399" : "#71717a",
                        boxShadow: investissementPurDCA > 0 ? "0 0 40px rgba(16,185,129,0.4)" : "none",
                      }}
                    >
                      <Rocket size={36} strokeWidth={1.5} />
                    </div>
                  </motion.div>

                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2"
                      style={{ color: investissementPurDCA > 0 ? "#34d399" : "#71717a" }}
                    >
                      <span
                        className="block w-6 h-px"
                        style={{ backgroundColor: investissementPurDCA > 0 ? "rgba(52,211,153,0.5)" : "rgba(113,113,122,0.5)" }}
                      />
                      Investissement pur · DCA
                      <HelpTooltip text="Votre Capacité d'Épargne MOINS vos Enveloppes Projets. C'est l'argent 'libre' qu'il vous reste à la fin. Vous devez absolument l'investir (Bourse, Crypto, Immo) pour générer des intérêts composés." />
                      <span
                        className="block w-6 h-px"
                        style={{ backgroundColor: investissementPurDCA > 0 ? "rgba(52,211,153,0.5)" : "rgba(113,113,122,0.5)" }}
                      />
                    </p>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                      Votre solde libre, prêt à travailler<span style={{ color: investissementPurDCA > 0 ? "#34d399" : "#71717a" }}>.</span>
                    </h3>
                    <p className="text-zinc-400 text-sm mt-3 font-light max-w-md mx-auto leading-relaxed">
                      Transférez ce montant vers vos courtiers et observez-le travailler grâce aux intérêts composés.
                    </p>
                  </div>

                  {/* Le chiffre — apothéose */}
                  <div
                    className="font-black tracking-tighter leading-none tabular-nums"
                    style={{
                      fontSize: "clamp(3rem, 13vw, 8rem)",
                      ...(investissementPurDCA > 0
                        ? {
                            background: "linear-gradient(135deg, #6ee7b7, #10b981, #14b8a6)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            textShadow: "0 0 60px rgba(16,185,129,0.4)",
                          }
                        : { color: "#52525b" }),
                    }}
                  >
                    {formatEuro(investissementPurDCA)}
                  </div>

                  {investissementPurDCA > 0 ? (
                    <Link href={`/projection?dca=${investissementPurDCA}`}>
                      <Button className="group relative h-14 md:h-16 px-8 md:px-10 bg-white hover:bg-zinc-100 text-black font-black uppercase tracking-[0.22em] rounded-2xl transition-all hover:scale-[1.02] active:scale-95 text-sm md:text-base flex items-center gap-3 overflow-hidden shadow-[0_8px_40px_-8px_rgba(255,255,255,0.4)]">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-300/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span className="relative">Projeter sur 30 ans</span>
                        <ArrowRight size={18} className="relative" />
                      </Button>
                    </Link>
                  ) : investissementPurDCA < 0 ? (
                    <div className="inline-flex items-center gap-2 bg-rose-500/[0.08] border border-rose-500/20 text-rose-300 px-6 py-3.5 rounded-2xl font-bold text-sm">
                      <AlertTriangle size={16} /> Vous allouez plus que vous ne gagnez. Réduisez vos enveloppes.
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/10 text-zinc-400 px-6 py-3.5 rounded-2xl font-bold text-sm">
                      <Info size={16} /> Tout votre argent est alloué aux projets.
                    </div>
                  )}
                </div>
              </div>
            </section>

          </motion.div>
        </main>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   PANNEAU "DÉPENSES" RÉUTILISABLE (Besoins + Envies)
// ═══════════════════════════════════════════════════════════════════════════

function ExpensePanel({
  title, subtitle, icon: Icon, accent,
  newName, setNewName, newAmount, setNewAmount,
  onAdd, items, onUpdate, onRemove, placeholder,
}: {
  title: string;
  subtitle: string;
  icon: any;
  accent: string;
  newName: string;
  setNewName: (v: string) => void;
  newAmount: string;
  setNewAmount: (v: string) => void;
  onAdd: () => void;
  items: BudgetItem[];
  onUpdate: (id: string, val: string) => void;
  onRemove: (id: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative rounded-[28px] overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }}
      />
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
      <div
        className="absolute inset-0 rounded-[28px]"
        style={{ borderWidth: "1px", borderColor: `${accent}15` }}
      />
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none"
        style={{ backgroundColor: accent, opacity: 0.08 }}
      />

      <div className="relative z-10 p-5 md:p-7">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${accent}15`,
              borderWidth: "1px",
              borderColor: `${accent}25`,
            }}
          >
            <Icon size={14} style={{ color: accent }} />
          </div>
          <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.28em]">
            {title}
          </h3>
        </div>
        <p className="text-zinc-500 text-xs mb-5 ml-10">{subtitle}</p>

        {/* Form add */}
        <div
          className="flex flex-col sm:flex-row gap-2 mb-4 p-2.5 rounded-xl"
          style={{
            backgroundColor: `${accent}05`,
            borderWidth: "1px",
            borderColor: `${accent}15`,
          }}
        >
          <Input
            placeholder={placeholder}
            value={newName} onChange={(e) => setNewName(e.target.value)}
            className="bg-black/30 border-white/[0.06] text-white h-10 placeholder:text-zinc-600 focus-visible:ring-0 flex-1 min-w-0 text-sm"
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-28 bg-black/40 rounded-lg flex items-center px-2 border border-white/[0.06] relative">
              <Input
                type="number" placeholder="0"
                value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                className="bg-transparent border-none text-white text-right h-10 font-bold p-0 pr-5 focus-visible:ring-0 w-full tabular-nums"
              />
              <span className="text-zinc-500 text-xs absolute right-2 pointer-events-none">€</span>
            </div>
            <Button
              onClick={onAdd}
              className="text-white font-black h-10 w-10 p-0 rounded-lg shrink-0 hover:scale-105 active:scale-95 transition-all"
              style={{
                backgroundColor: accent,
                boxShadow: `0 8px 24px -8px ${accent}80`,
              }}
            >
              <Plus size={18} />
            </Button>
          </div>
        </div>

        {/* Liste */}
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                key={item.id}
                className="flex justify-between items-center p-2.5 bg-black/30 backdrop-blur-sm rounded-xl border border-white/[0.06] hover:border-white/15 transition-colors gap-2"
              >
                <p className="pl-2 text-zinc-200 font-medium truncate text-xs flex-1">{item.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="w-20 relative">
                    <Input
                      type="number" value={item.amount === 0 ? "" : item.amount}
                      onChange={(e) => onUpdate(item.id, e.target.value)}
                      className="bg-zinc-900/50 border-white/[0.06] text-right text-white font-bold h-8 p-0 pr-5 focus-visible:ring-0 text-xs rounded-lg tabular-nums"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] pointer-events-none">€</span>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-zinc-600 hover:text-rose-400 p-1.5 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}