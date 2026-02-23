"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, Home, Target, ShieldCheck, Loader2, ChevronLeft, ChevronRight, Save, AlertTriangle, Coffee, ArrowRight, ScanLine, Check, BookOpen, Info, X, PiggyBank, Rocket, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- HELPERS ---
const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
const formatMonth = (date: Date) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// ==========================================
// 1. POP-UP D'ACCUEIL : LE BUDGET BASE ZÉRO
// ==========================================
const TUTORIAL_STEPS = [
  {
    title: "Le Budget Base Zéro",
    subtitle: "LA MÉTHODE DES PROS",
    description: "Bienvenue dans votre Budget. Ici, chaque euro gagné doit avoir un objectif précis. À la fin de la page, votre solde non alloué doit être investi. Laissez-vous guider étape par étape.",
    icon: Target, color: "text-emerald-400", bgGlow: "bg-emerald-500/20",
  },
  {
    title: "Revenus & Dépenses",
    subtitle: "ÉTAPES 1 & 2",
    description: "Renseignez vos revenus, puis listez vos charges incompressibles (Besoins) et vos dépenses plaisir (Envies). Vous pouvez utiliser l'IA pour scanner vos tickets de caisse.",
    icon: Coffee, color: "text-blue-400", bgGlow: "bg-blue-500/20",
  },
  {
    title: "Le Reste à Vivre",
    subtitle: "ÉTAPE 3",
    description: "C'est votre Capacité d'Épargne Brute. C'est l'argent qu'il vous reste une fois vos dépenses payées. Cet argent ne doit surtout pas dormir sur votre compte courant !",
    icon: Target, color: "text-yellow-400", bgGlow: "bg-yellow-500/20",
  },
  {
    title: "Les Enveloppes",
    subtitle: "ÉTAPE 4",
    description: "Répartissez une partie de ce 'Reste à Vivre' pour vos futurs projets (Vacances, Voiture) ou pour consolider votre Matelas de Sécurité. Cet argent sera dépensé à court/moyen terme.",
    icon: PiggyBank, color: "text-purple-400", bgGlow: "bg-purple-500/20",
  },
  {
    title: "La Machine à Richesse",
    subtitle: "ÉTAPE 5",
    description: "L'argent qu'il reste à la toute fin est votre Investissement Pur (DCA). C'est ce montant qui partira en Bourse ou en Crypto tous les mois. Un bouton vous permettra de le projeter sur 30 ans !",
    icon: Rocket, color: "text-emerald-400", bgGlow: "bg-emerald-500/20",
  }
];

function BudgetTutorialModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => { if (isOpen) setCurrentStep(0); }, [isOpen]);
  if (!isOpen) return null;
  const StepIcon = TUTORIAL_STEPS[currentStep].icon || Target;
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
// 2. BULLE D'AIDE OPAQUE CORRIGÉE (Z-INDEX)
// ==========================================
const HelpTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-2 cursor-pointer z-50" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)} onClick={() => setIsOpen(!isOpen)}>
      <div className={`p-1.5 rounded-full transition-colors ${isOpen ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"}`}><Info size={14} /></div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-[130%] left-1/2 -translate-x-1/2 w-64 p-4 bg-[#1A1A1E] text-white text-xs rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-zinc-600 text-center leading-relaxed font-sans normal-case tracking-normal z-[99999]">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1A1A1E]"></div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-zinc-600 -z-10 mt-[1px]"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 3. PAGE BUDGET PRINCIPALE
// ==========================================
type BudgetItem = { id: string, name: string, amount: number, category: string, target?: number, startMonth?: string };

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

    const [isScanning, setIsScanning] = useState(false);
    const [scannedItems, setScannedItems] = useState<BudgetItem[]>([]);
    const [showValidation, setShowValidation] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    useEffect(() => {
        loadMonthData(selectedDate);
        const hasSeenTutorial = localStorage.getItem("nexus_budget_tuto_seen");
        if (!hasSeenTutorial) setTimeout(() => setIsTutorialOpen(true), 800);
    }, [selectedDate]);

    const loadMonthData = async (date: Date) => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const user = session.user;
        const startOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];

        const { data: profile } = await supabase.from('profiles').select('budget_json, assets_json').eq('id', user.id).single();
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
                
                // Moteur Temporel : Ne charge que les projets qui ne sont pas terminés
                let templateDetails = b.details || [];
                templateDetails = templateDetails.filter((item: any) => {
                    if (item.category === 'EPARGNE' && item.target && item.startMonth) {
                        const start = new Date(item.startMonth);
                        const futureDate = new Date(startOfMonth);
                        const diffMonths = (futureDate.getFullYear() - start.getFullYear()) * 12 + (futureDate.getMonth() - start.getMonth());
                        const monthsNeeded = Math.ceil(item.target / item.amount);
                        return diffMonths < monthsNeeded; // Exclu si la durée totale est dépassée
                    }
                    return true;
                });
                setExpenses(templateDetails);
            } else { setIncome(0); setExpenses([]); }
        }
        fetchHistoryGraph(user.id);
        setLoading(false);
    };

    const fetchHistoryGraph = async (userId: string) => {
        const { data: hist } = await supabase.from('monthly_history').select('*').eq('user_id', userId).order('month', { ascending: true }).limit(6);
        if (hist && hist.length > 0) {
            const formatted = hist.map(h => {
                let needs = 0; let wants = 0; let savings = 0;
                if (h.details_json && Array.isArray(h.details_json)) {
                    needs = h.details_json.filter((e:any) => e.category === 'BESOIN').reduce((acc:number, i:any) => acc + (i.amount||0), 0);
                    wants = h.details_json.filter((e:any) => e.category === 'ENVIE').reduce((acc:number, i:any) => acc + (i.amount||0), 0);
                    savings = h.details_json.filter((e:any) => e.category === 'EPARGNE').reduce((acc:number, i:any) => acc + (i.amount||0), 0);
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

    // --- LE MOTEUR FINANCIER BASE ZÉRO ---
    const needsList = expenses.filter(e => e.category === 'BESOIN');
    const wantsList = expenses.filter(e => e.category === 'ENVIE');
    const saveList = expenses.filter(e => e.category === 'EPARGNE'); 

    const safeIncome = isNaN(income) ? 0 : income;
    const needsTotal = needsList.reduce((acc, i) => acc + (isNaN(i.amount) ? 0 : i.amount), 0);
    const wantsTotal = wantsList.reduce((acc, i) => acc + (isNaN(i.amount) ? 0 : i.amount), 0);
    const savesTotal = saveList.reduce((acc, i) => acc + (isNaN(i.amount) ? 0 : i.amount), 0);
    
    const totalExp = needsTotal + wantsTotal + savesTotal;

    // ÉTAPE 3 : Le Reste à Vivre (Ce qu'il reste après les charges fixes et envies)
    const capaciteEpargneBrute = Math.max(0, safeIncome - needsTotal - wantsTotal);
    
    // ÉTAPE 5 : L'Investissement (Ce qu'il reste APRES avoir rempli les enveloppes projets)
    const investissementPurDCA = capaciteEpargneBrute - savesTotal;

    const safetyTarget = (needsTotal + wantsTotal) * 6; // Objectif 6 mois
    const isSafe = currentCash >= safetyTarget && safetyTarget > 0;

    // Calculs pour la jauge 50/30/20
    const needsPct = safeIncome > 0 ? (needsTotal / safeIncome) * 100 : 0;
    const wantsPct = safeIncome > 0 ? (wantsTotal / safeIncome) * 100 : 0;
    const savingsPct = safeIncome > 0 ? (capaciteEpargneBrute / safeIncome) * 100 : 0;

    // Calcul automatique des mois restants pour un projet
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

        // 1. Sauvegarde le mois en cours
        await supabase.from('monthly_history').upsert({ 
            user_id: user.id, month: saveDate, income: safeIncome, expenses: needsTotal + wantsTotal, invested: investissementPurDCA, details_json: expenses 
        }, { onConflict: 'user_id, month' });
        
        triggerHaptic("success");
        setIsExistingMonth(true);
        
        // 2. Gestion de la récurrence (Propagation vers le futur)
        const recurringExpenses = expenses.filter(e => e.category === 'BESOIN' || e.category === 'EPARGNE');
        
        // Mettre à jour le template global pour les nouveaux mois non créés
        if (selectedDate >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
            await supabase.from('profiles').update({ budget_json: { income: safeIncome, details: recurringExpenses } }).eq('id', user.id);
        }

        // Mettre à jour les mois FUTURS DÉJÀ CRÉÉS
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
        setLoading(false);
    };

    const addExpense = (name: string, amount: string, category: string, target?: string) => {
        if (!name || !amount) return;
        const val = parseFloat(amount); if (isNaN(val)) return;
        const targetVal = target ? parseFloat(target) : undefined;
        const currentMonthStr = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];
        setExpenses([...expenses, { id: Date.now().toString(), name, amount: val, category, target: targetVal, startMonth: currentMonthStr }]);
    };

    const updateAmount = (id: string, newAmount: string) => {
        const val = parseFloat(newAmount);
        setExpenses(expenses.map(e => e.id === id ? { ...e, amount: isNaN(val) ? 0 : val } : e));
    };

    const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

    // --- SCANNER IA ---
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
            
            const response = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64Image }) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Erreur serveur"); }
            const data = await response.json();
            
            if (data.expenses && data.expenses.length > 0) {
                const formattedItems = data.expenses.map((item: any, index: number) => ({
                    id: `ai-${Date.now()}-${index}`, name: item.name || "Dépense IA", amount: item.amount || 0, category: item.category === "ENVIE" ? "ENVIE" : "BESOIN"
                }));
                setScannedItems(formattedItems); setShowValidation(true); 
            } else alert("L'IA n'a détecté aucune dépense.");
        } catch (error: any) { alert("Erreur IA : " + error.message); } finally {
            setIsScanning(false); if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading && expenses.length === 0) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-yellow-500/30 selection:text-yellow-200 overflow-x-hidden">
            
            {/* OVERLAYS IA (SCAN & VALIDATION) */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-24 h-24 rounded-3xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.4)]">
                                <ScanLine size={40} className="relative z-10" />
                                <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-1 bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,1)] z-20" />
                            </motion.div>
                            <div><h3 className="text-xl font-black text-white tracking-widest uppercase mb-2">Analyse IA en cours...</h3></div>
                        </div>
                    </motion.div>
                )}
                {showValidation && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowValidation(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-lg bg-[#0A0A0C] border border-purple-500/30 rounded-3xl flex flex-col overflow-hidden max-h-[80vh]">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-purple-900/10">
                                <div><h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2"><ScanLine size={20} className="text-purple-400"/> Validation</h3></div>
                                <button onClick={() => setShowValidation(false)} className="text-zinc-500 hover:text-white p-2"><X size={20}/></button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-3">
                                {scannedItems.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-black/50 border border-white/5 rounded-2xl gap-4">
                                        <div className="flex-1 min-w-0 w-full"><p className="font-bold text-white text-sm truncate">{item.name}</p><p className="text-lg font-black text-emerald-400 mt-1">{formatEuro(item.amount)}</p></div>
                                        <Select value={item.category} onValueChange={(val) => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, category: val } : i))}>
                                            <SelectTrigger className="w-full sm:w-36 bg-zinc-900 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-white/10 text-white z-[999]"><SelectItem value="BESOIN">🏠 Besoin</SelectItem><SelectItem value="ENVIE">☕ Loisir</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-white/5 bg-black"><Button onClick={() => { setExpenses([...expenses, ...scannedItems]); setShowValidation(false); setScannedItems([]); }} className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-widest rounded-xl">Importer ({scannedItems.length})</Button></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <BudgetTutorialModal isOpen={isTutorialOpen} onClose={() => { setIsTutorialOpen(false); localStorage.setItem("nexus_budget_tuto_seen", "true"); }} />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />

            <Sidebar />
            <main className="md:ml-64 flex-1 w-full md:w-auto min-w-0 p-4 md:p-8 relative overflow-x-hidden">
                <div className="fixed top-0 left-64 w-[600px] h-[600px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] w-full mx-auto space-y-6 md:space-y-12 relative z-10 pb-20">
                    
                    <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-l-4 border-yellow-500 pl-4 md:pl-6 py-2 max-w-full">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase truncate">
                                Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Budget</span>
                            </h1>
                            <p className="text-zinc-400 text-[10px] md:text-lg font-light tracking-wide truncate mt-1">La méthode Base Zéro pour s'enrichir.</p>
                        </div>
                        <button onClick={() => setIsTutorialOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest shrink-0">
                            <BookOpen size={14} /> Guide
                        </button>
                    </header>

                    {/* ========================================== */}
                    {/* ÉTAPE 1 : LES REVENUS                      */}
                    {/* ========================================== */}
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-4 md:gap-6 bg-zinc-900/40 backdrop-blur-xl p-4 md:p-6 rounded-[24px] md:rounded-[30px] border border-white/5 shadow-2xl w-full min-w-0 transition-all relative z-20">
                        <div className="flex items-center justify-between w-full xl:w-auto gap-2 md:gap-6">
                            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} className="rounded-full border-white/10 hover:bg-white/10 text-white w-10 h-10 md:w-12 md:h-12 shrink-0"><ChevronLeft size={20}/></Button>
                            <div className="text-center min-w-[140px] md:min-w-[200px]">
                                <h2 className="text-xl md:text-3xl font-black text-white capitalize tracking-wide truncate">{formatMonth(selectedDate)}</h2>
                                <p className="text-[9px] md:text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1 truncate">{isExistingMonth ? "Données enregistrées" : "Mode Édition"}</p>
                            </div>
                            <Button variant="outline" size="icon" onClick={() => changeMonth(1)} className="rounded-full border-white/10 hover:bg-white/10 text-white w-10 h-10 md:w-12 md:h-12 shrink-0"><ChevronRight size={20}/></Button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full xl:w-auto justify-end mt-2 xl:mt-0">
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto bg-black/30 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest sm:mb-1 flex items-center gap-2">
                                    <span className="bg-emerald-500 text-black px-1.5 py-0.5 rounded-sm">ÉTAPE 1</span> Revenus du mois <HelpTooltip text="Votre salaire net et toutes autres rentrées d'argent régulières."/>
                                </div>
                                <div className="flex items-center gap-2 bg-black/50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-white/10 relative shrink-0">
                                    <Input type="number" value={income === 0 ? "" : income} onChange={(e) => setIncome(parseFloat(e.target.value))} className="h-8 md:h-10 w-24 md:w-32 bg-transparent border-none text-right text-xl md:text-2xl font-black text-white p-0 pr-5 md:pr-6 focus-visible:ring-0" />
                                    <span className="text-zinc-500 absolute right-2 md:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sm md:text-lg">€</span>
                                </div>
                            </div>
                            <Button onClick={saveCurrentMonth} className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:scale-105 active:scale-95 text-black font-black uppercase tracking-widest rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] text-xs md:text-sm shrink-0 transition-all"><Save size={16} className="mr-2"/> Sauvegarder</Button>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* ÉTAPE 2 : LES DÉPENSES COURANTES           */}
                    {/* ========================================== */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-md inline-block uppercase tracking-widest mt-4">ÉTAPE 2 : VOS SORTIES</div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 w-full min-w-0">
                            
                            {/* BESOINS */}
                            <div className="relative rounded-[24px] md:rounded-[32px] bg-zinc-900/30 border border-blue-500/10 backdrop-blur-md w-full transition-all hover:border-blue-500/30">
                                <div className="p-4 md:p-8 relative z-10">
                                    <div className="font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 md:gap-3 mb-4 text-xs md:text-base"><Home size={18}/> Charges Fixes & Besoins <HelpTooltip text="Vos dépenses incompressibles: Loyer, Crédit, Courses, Électricité, Assurances."/></div>
                                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4 p-2 bg-blue-500/5 rounded-xl border border-blue-500/10 relative z-20">
                                        <Input placeholder="Ex: Loyer, Électricité..." value={newNeedName} onChange={(e) => setNewNeedName(e.target.value)} className="bg-black/20 sm:bg-transparent border-white/5 sm:border-none text-white h-10 placeholder:text-zinc-600 focus-visible:ring-0 flex-1 min-w-0" />
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <div className="flex-1 sm:w-28 bg-black/40 rounded-lg flex items-center px-2 border border-white/5 relative">
                                                <Input type="number" placeholder="0" value={newNeedAmount} onChange={(e) => setNewNeedAmount(e.target.value)} className="bg-transparent border-none text-white text-right h-10 font-bold p-0 pr-5 focus-visible:ring-0 w-full" />
                                                <span className="text-zinc-500 text-xs absolute right-2 pointer-events-none">€</span>
                                            </div>
                                            <Button onClick={() => {addExpense(newNeedName, newNeedAmount, "BESOIN"); setNewNeedName(""); setNewNeedAmount("");}} className="bg-blue-600 hover:bg-blue-500 text-white font-black h-10 w-10 p-0 rounded-lg shrink-0"><Plus size={20}/></Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative z-10">
                                        <AnimatePresence>
                                            {needsList.map((item) => (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} key={item.id} className="flex justify-between items-center p-2 bg-black/30 rounded-xl border border-white/5 hover:border-blue-500/30 gap-2">
                                                    <p className="pl-2 text-zinc-200 font-bold truncate text-xs flex-1">{item.name}</p>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <div className="w-20 relative">
                                                            <Input type="number" value={item.amount === 0 ? "" : item.amount} onChange={(e) => updateAmount(item.id, e.target.value)} className="bg-zinc-900/50 sm:bg-transparent border-white/5 sm:border-none text-right text-white font-bold h-8 p-0 pr-5 focus-visible:ring-0 text-xs rounded-lg" />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] pointer-events-none">€</span>
                                                        </div>
                                                        <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 p-1.5 transition-colors"><Trash2 size={14}/></button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* ENVIES */}
                            <div className="relative rounded-[24px] md:rounded-[32px] bg-zinc-900/30 border border-yellow-500/10 backdrop-blur-md w-full transition-all hover:border-yellow-500/30">
                                <div className="p-4 md:p-8 relative z-10">
                                    <div className="font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2 md:gap-3 mb-4 text-xs md:text-base"><Coffee size={18}/> Loisirs & Envies <HelpTooltip text="Vos dépenses plaisir: Restaurants, Cinéma, Vêtements, Abonnements TV."/></div>
                                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4 p-2 bg-yellow-500/5 rounded-xl border border-yellow-500/10 relative z-20">
                                        <Input placeholder="Ex: Restaurant..." value={newWantName} onChange={(e) => setNewWantName(e.target.value)} className="bg-black/20 sm:bg-transparent border-white/5 sm:border-none text-white h-10 placeholder:text-zinc-600 focus-visible:ring-0 flex-1 min-w-0" />
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <div className="flex-1 sm:w-28 bg-black/40 rounded-lg flex items-center px-2 border border-white/5 relative">
                                                <Input type="number" placeholder="0" value={newWantAmount} onChange={(e) => setNewWantAmount(e.target.value)} className="bg-transparent border-none text-white text-right h-10 font-bold p-0 pr-5 focus-visible:ring-0 w-full" />
                                                <span className="text-zinc-500 text-xs absolute right-2 pointer-events-none">€</span>
                                            </div>
                                            <Button onClick={() => {addExpense(newWantName, newWantAmount, "ENVIE"); setNewWantName(""); setNewWantAmount("");}} className="bg-yellow-600 hover:bg-yellow-500 text-white font-black h-10 w-10 p-0 rounded-lg shrink-0"><Plus size={20}/></Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative z-10">
                                        <AnimatePresence>
                                            {wantsList.map((item) => (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} key={item.id} className="flex justify-between items-center p-2 bg-black/30 rounded-xl border border-white/5 hover:border-yellow-500/30 gap-2">
                                                    <p className="pl-2 text-zinc-200 font-bold truncate text-xs flex-1">{item.name}</p>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <div className="w-20 relative">
                                                            <Input type="number" value={item.amount === 0 ? "" : item.amount} onChange={(e) => updateAmount(item.id, e.target.value)} className="bg-zinc-900/50 sm:bg-transparent border-white/5 sm:border-none text-right text-white font-bold h-8 p-0 pr-5 focus-visible:ring-0 text-xs rounded-lg" />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] pointer-events-none">€</span>
                                                        </div>
                                                        <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 p-1.5 transition-colors"><Trash2 size={14}/></button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOUTON SCANNER (RATTACHÉ AUX DÉPENSES) */}
                        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={triggerScanner} className="w-full flex items-center justify-center gap-3 p-4 md:p-6 rounded-[24px] bg-gradient-to-r from-[#170F28] to-[#0A0515] border border-purple-500/30 hover:border-purple-400/60 shadow-[0_0_40px_rgba(168,85,247,0.15)] group transition-all relative overflow-hidden">
                            <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-transparent transition-colors"></div>
                            <div className="p-3 md:p-4 bg-purple-500/20 rounded-xl md:rounded-2xl text-purple-400 group-hover:bg-purple-500/40 transition-colors shadow-inner relative z-10"><ScanLine size={28} className="md:w-8 md:h-8" /></div>
                            <div className="text-left relative z-10">
                                <h4 className="text-white font-black text-sm md:text-lg tracking-wider flex items-center gap-2 uppercase">Scanner un ticket de caisse via IA <span className="text-[8px] md:text-[10px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-1 rounded shadow-lg uppercase tracking-widest font-black">GPT-4o</span></h4>
                            </div>
                        </motion.button>
                    </div>


                    {/* ========================================== */}
                    {/* ÉTAPE 3 : LE RESTE À VIVRE (CAPACITÉ)      */}
                    {/* ========================================== */}
                    <div className="mt-8 space-y-4">
                        <div className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-md inline-block uppercase tracking-widest">ÉTAPE 3 : LE BILAN</div>
                        <div className="relative rounded-[24px] md:rounded-[40px] border border-emerald-500/20 text-center lg:text-left shadow-2xl w-full min-w-0 transition-all hover:border-emerald-500/40 hover:z-50">
                            
                            {/* OVERFLOW HIDDEN GÉRÉ ICI SEULEMENT POUR LE FOND */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#022c22] to-black rounded-[24px] md:rounded-[40px] overflow-hidden -z-10">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full"></div>
                            </div>
                            
                            <div className="relative z-10 p-6 md:p-10 w-full min-w-0">
                                <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-6 w-full">
                                    <div className="flex-1 w-full">
                                        <div className="text-emerald-500 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] flex items-center justify-center lg:justify-start gap-2 mb-2 truncate">
                                            <Target size={16}/> Capacité d'Épargne Brute <HelpTooltip text="Revenus - Besoins - Envies. C'est l'argent que vous n'avez pas encore dépensé et que vous DEVEZ allouer à l'étape suivante."/>
                                        </div>
                                        <div className="text-5xl sm:text-7xl lg:text-[7rem] font-black text-white tracking-tighter drop-shadow-2xl truncate max-w-full leading-none">
                                            <AnimatedNumber value={capaciteEpargneBrute} />
                                        </div>
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-white/5 shadow-inner text-center lg:text-right shrink-0">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Dépenses Fixes</p>
                                        <p className="text-2xl md:text-4xl font-black text-white">{formatEuro(needsTotal + wantsTotal)}</p>
                                    </div>
                                </div>

                                {/* ANALYSE 50/30/20 */}
                                <div className="mt-8 md:mt-12 bg-[#0A0A0C]/80 p-5 md:p-6 rounded-[20px] md:rounded-[24px] border border-white/5 w-full">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-white font-black text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">Analyse de l'Équilibre (50/30/20) <HelpTooltip text="La méthode idéale pour s'enrichir : 50% max pour les Besoins, 30% max pour les Envies, et 20% minimum de Capacité d'Épargne."/></h4>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-4 md:gap-8 text-[10px] md:text-xs font-bold mb-3">
                                        <div className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${needsPct > 50 ? 'bg-red-500' : 'bg-blue-500'}`}></div><span className={needsPct > 50 ? "text-red-400" : "text-zinc-300"}>Besoins: {needsPct.toFixed(0)}% {needsPct > 50 && "(Trop élevé)"}</span></div>
                                        <div className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${wantsPct > 30 ? 'bg-red-500' : 'bg-yellow-500'}`}></div><span className={wantsPct > 30 ? "text-red-400" : "text-zinc-300"}>Envies: {wantsPct.toFixed(0)}% {wantsPct > 30 && "(Trop élevé)"}</span></div>
                                        <div className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${savingsPct < 20 ? 'bg-orange-500' : 'bg-emerald-500'}`}></div><span className={savingsPct < 20 ? "text-orange-400" : "text-zinc-300"}>Épargne brute: {savingsPct.toFixed(0)}% {savingsPct < 20 && "(Trop faible)"}</span></div>
                                    </div>

                                    <div className="w-full h-3 md:h-4 rounded-full overflow-hidden flex bg-zinc-900 border border-white/5 shadow-inner">
                                        <motion.div initial={{width:0}} animate={{width: `${needsPct}%`}} transition={{duration: 1}} className={`h-full border-r border-black/50 ${needsPct > 50 ? 'bg-red-500/80' : 'bg-blue-500'}`} />
                                        <motion.div initial={{width:0}} animate={{width: `${wantsPct}%`}} transition={{duration: 1, delay: 0.2}} className={`h-full border-r border-black/50 ${wantsPct > 30 ? 'bg-red-500/80' : 'bg-yellow-500'}`} />
                                        <motion.div initial={{width:0}} animate={{width: `${savingsPct}%`}} transition={{duration: 1, delay: 0.4}} className={`h-full ${savingsPct < 20 ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* ========================================== */}
                    {/* ÉTAPE 4 : LES ENVELOPPES                   */}
                    {/* ========================================== */}
                    <div className="mt-12 space-y-4">
                        <div className="text-[10px] font-black bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-md inline-block uppercase tracking-widest">ÉTAPE 4 : PRÉVOIR L'AVENIR</div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 w-full min-w-0">
                            
                            {/* NOUVEAU MODULE : RÉPARTITION DE L'ÉPARGNE */}
                            <div className="relative rounded-[24px] md:rounded-[32px] bg-zinc-900/40 border border-purple-500/20 backdrop-blur-md w-full transition-all hover:border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.05)] hover:z-50">
                                <div className="absolute inset-0 overflow-hidden rounded-[24px] md:rounded-[32px] -z-10"><div className="absolute top-0 right-0 p-32 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none"></div></div>
                                <div className="p-4 md:p-8 relative z-10">
                                    <div className="font-black text-purple-400 uppercase tracking-widest flex items-center justify-between gap-2 mb-4 text-xs md:text-base">
                                        <div className="flex items-center gap-2"><PiggyBank size={18}/> Enveloppes & Projets <HelpTooltip text="Répartissez votre Épargne Brute ici. Créez des provisions (Vacances, Voiture), ou remplissez votre Matelas de sécurité. Ces charges se copient sur les mois suivants."/></div>
                                    </div>
                                    
                                    <div className="flex flex-col xl:flex-row gap-2 mb-6 p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 relative z-20">
                                        <Input placeholder="Ex: Vacances, Matelas..." value={newSaveName} onChange={(e) => setNewSaveName(e.target.value)} className="bg-black/40 border-white/5 text-white h-11 focus-visible:ring-purple-500/50 text-sm flex-1" />
                                        <div className="flex gap-2">
                                            <div className="w-28 sm:w-32 bg-black/40 rounded-lg flex items-center px-2 border border-white/5 relative">
                                                <Input type="number" placeholder="Objectif (Facultatif)" value={newSaveTarget} onChange={(e) => setNewSaveTarget(e.target.value)} className="bg-transparent border-none text-white text-right h-11 font-medium p-0 pr-5 focus-visible:ring-0 w-full text-[10px] sm:text-xs" />
                                                <span className="text-zinc-500 text-xs absolute right-2">€</span>
                                            </div>
                                            <div className="w-32 sm:w-36 bg-black/60 rounded-lg flex items-center px-2 border border-purple-500/30 relative shadow-inner">
                                                <Input type="number" placeholder="Mensualité" value={newSaveAmount} onChange={(e) => setNewSaveAmount(e.target.value)} className="bg-transparent border-none text-purple-100 text-right h-11 font-bold p-0 pr-7 focus-visible:ring-0 w-full text-sm placeholder:text-purple-900" />
                                                <span className="text-purple-500 text-[10px] absolute right-2 font-bold">€/m</span>
                                            </div>
                                            <Button onClick={() => {addExpense(newSaveName, newSaveAmount, "EPARGNE", newSaveTarget); setNewSaveName(""); setNewSaveAmount(""); setNewSaveTarget("")}} className="bg-purple-600 hover:bg-purple-500 text-white font-black h-11 w-11 p-0 rounded-lg shrink-0"><Plus size={20}/></Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 relative z-10">
                                        <AnimatePresence>
                                            {saveList.map((item) => {
                                                const remaining = calculateRemainingMonths(item);
                                                return (
                                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} key={item.id} className="p-3 bg-black/40 rounded-xl border border-white/5 hover:border-purple-500/30">
                                                        <div className="flex justify-between items-center gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-zinc-100 font-bold truncate text-sm">{item.name}</p>
                                                                {item.target ? (
                                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                                        <div className="text-zinc-400 text-[10px] bg-black/60 px-2 py-1 rounded-md border border-white/5 inline-block">Objectif : {formatEuro(item.target)}</div>
                                                                        {remaining > 0 && <div className="text-purple-300 text-[10px] bg-purple-500/20 px-2 py-1 rounded-md border border-purple-500/30 inline-block font-bold">⏳ {remaining} mois restant{remaining > 1 ? 's' : ''}</div>}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="w-24 relative bg-black/50 rounded-lg border border-white/5">
                                                                    <Input type="number" value={item.amount === 0 ? "" : item.amount} onChange={(e) => updateAmount(item.id, e.target.value)} className="bg-transparent border-none text-right text-purple-300 font-bold h-9 p-0 pr-8 focus-visible:ring-0 text-xs" />
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 text-[10px] pointer-events-none">€/m</span>
                                                                </div>
                                                                <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 p-1 transition-colors"><Trash2 size={16}/></button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 md:space-y-8">
                                {/* WIDGET : VÉRIFICATION DU MATELAS */}
                                <div className={`relative p-6 rounded-[24px] md:rounded-[32px] border flex flex-col justify-center w-full transition-all hover:z-50 hover:border-white/20 ${isSafe ? 'bg-emerald-950/10 border-emerald-500/10' : 'bg-orange-950/10 border-orange-500/10'}`}>
                                    <div className="flex justify-between items-center mb-4 relative z-10">
                                        <div className="flex items-center gap-2 font-bold text-xs md:text-sm text-white uppercase tracking-widest truncate">
                                            <ShieldCheck size={18} className={isSafe ? "text-emerald-500" : "text-orange-500"}/> Matelas de Sécurité <HelpTooltip text="L'épargne d'urgence présente sur l'onglet Patrimoine. Elle sert UNIQUEMENT en cas de perte d'emploi. Recommandé : 6 mois de charges." />
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-medium bg-black/40 px-3 py-1 rounded-lg border border-white/5">Cible: {Math.round(safetyTarget)}€</span>
                                    </div>
                                    <div className="text-3xl font-black text-white mb-4 relative z-10"><AnimatedNumber value={currentCash}/> <span className="text-lg text-zinc-600">€</span></div>
                                    <div className="h-2 md:h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5 w-full relative z-10 shadow-inner">
                                        <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (currentCash/(safetyTarget || 1))*100)}%`}} transition={{duration: 1}} className={`h-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${isSafe ? 'bg-emerald-500':'bg-orange-500'}`} />
                                    </div>
                                    {!isSafe && <div className="mt-4 text-[10px] text-orange-400 flex items-center gap-2 font-bold bg-orange-500/5 p-3 rounded-xl border border-orange-500/10 relative z-10"><AlertTriangle size={16} className="shrink-0"/> Jauge incomplète. Ajoutez une enveloppe "Matelas" pour la combler.</div>}
                                </div>

                                {/* GRAPHIQUE HISTORIQUE */}
                                <div className="p-4 md:p-6 rounded-[24px] md:rounded-[32px] bg-zinc-900/40 border border-white/5 h-[200px] md:h-[250px] w-full transition-colors relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={historyData} barGap={2} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                            <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: 'rgba(26,26,30,1)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize:'12px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }} itemStyle={{ color: '#fff' }} formatter={(val: any) => formatEuro(val)}/>
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                            <Bar dataKey="Revenus" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={8} />
                                            <Bar dataKey="Besoins" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={8} />
                                            <Bar dataKey="Epargne" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={8} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* ========================================== */}
                    {/* ÉTAPE 5 : L'INVESTISSEMENT (LE RESTE FINAL) */}
                    {/* ========================================== */}
                    <div className="mt-12 space-y-4">
                        <div className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-md inline-block uppercase tracking-widest">ÉTAPE 5 : LA MACHINE À RICHESSE</div>
                        
                        <div className={`relative rounded-[32px] md:rounded-[40px] border transition-all shadow-2xl hover:z-50 w-full ${investissementPurDCA > 0 ? 'border-emerald-500/30 hover:border-emerald-500/60' : 'border-white/5'}`}>
                            
                            {/* OVERFLOW HIDDEN SEULEMENT POUR LE FOND (Z-INDEX FIX) */}
                            <div className={`absolute inset-0 rounded-[32px] md:rounded-[40px] overflow-hidden -z-10 ${investissementPurDCA > 0 ? 'bg-gradient-to-br from-[#022c22] to-black' : 'bg-zinc-900/80'}`}>
                                {investissementPurDCA > 0 && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>}
                                {investissementPurDCA > 0 && <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/20 blur-[150px] rounded-full pointer-events-none"></div>}
                            </div>

                            <div className="relative z-10 p-8 md:p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                                <div className="flex justify-center">
                                    <div className={`p-4 rounded-3xl ${investissementPurDCA > 0 ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'bg-zinc-800 text-zinc-500'}`}>
                                        <Rocket size={40} />
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg md:text-2xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
                                        Investissement Pur (DCA) <HelpTooltip text="Votre Capacité d'Épargne MOINS vos Enveloppes Projets. C'est l'argent 'libre' qu'il vous reste à la fin. Vous devez absolument l'investir (Bourse, Crypto, Immo) pour générer des intérêts composés."/>
                                    </h3>
                                    <p className="text-zinc-400 text-xs md:text-sm mt-2 font-medium">Transférez ce montant vers vos courtiers et observez-le travailler pour vous.</p>
                                </div>

                                <div className={`text-6xl md:text-8xl font-black tracking-tighter drop-shadow-2xl ${investissementPurDCA > 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400' : 'text-zinc-600'}`}>
                                    {formatEuro(investissementPurDCA)}
                                </div>

                                {investissementPurDCA > 0 ? (
                                    <Link href={`/projection?dca=${investissementPurDCA}`} className="inline-block mt-8">
                                        <Button className="h-14 md:h-16 px-8 md:px-10 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all text-sm md:text-base flex items-center gap-3">
                                            Projeter ce montant <ArrowRight size={20} />
                                        </Button>
                                    </Link>
                                ) : investissementPurDCA < 0 ? (
                                    <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl font-bold mt-6 text-sm">
                                        <AlertTriangle size={18} /> Vous allouez plus d'argent que vous n'en avez ! Réduisez vos Projets.
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-zinc-400 px-6 py-4 rounded-2xl font-bold mt-6 text-sm">
                                        <Info size={18} /> Tout votre argent est alloué aux projets. Il ne reste rien à investir.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </motion.div>
            </main>
        </div>
    );
}