"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Building, Bitcoin, Landmark, Plus, Trash2, TrendingUp, PieChart as PieIcon, ShieldCheck, Loader2, Layers, AlertTriangle, Info, X, ArrowRight, Check, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";

// ==========================================
// 1. POP-UP D'ACCUEIL XXL & PÉDAGOGIQUE
// ==========================================
const TUTORIAL_STEPS = [
  {
    title: "L'inventaire de votre vie financière",
    subtitle: "ÉTAPE 1 : LE CONCEPT",
    description: "Bienvenue dans l'espace Patrimoine. C'est ici que vous allez lister tout ce que vous possédez (comptes bancaires, immobilier, cryptos). Pourquoi ? Pour calculer votre 'Valeur Nette'. C'est le seul vrai chiffre qui compte pour savoir si vous vous enrichissez réellement d'année en année.",
    icon: Wallet,
    color: "text-emerald-400",
    bgGlow: "bg-emerald-500/20",
  },
  {
    title: "Le Matelas de Sécurité",
    subtitle: "ÉTAPE 2 : LA RÈGLE D'OR",
    description: "Avant de chercher à faire des profits, il faut se protéger. Le matelas de sécurité est votre bouclier. Il doit contenir 3 à 6 mois de vos dépenses quotidiennes sur des comptes ultra-sécurisés et toujours disponibles (comme le Livret A ou un LDDS). Son but : pouvoir payer une grosse facture ou encaisser un coup dur sans jamais devoir revendre vos autres investissements en urgence.",
    icon: ShieldCheck,
    color: "text-pink-400",
    bgGlow: "bg-pink-500/20",
  },
  {
    title: "La Diversification",
    subtitle: "ÉTAPE 3 : NE PAS TOUT MISER SUR LE MÊME CHEVAL",
    description: "Si tout votre argent est dans l'immobilier, une crise du logement vous mettra en danger. La diversification consiste à répartir son argent entre différents domaines : l'immobilier (solide), la bourse (dynamique), et les livrets (sécurisés). Notre graphique en anneau surveillera cet équilibre pour vous alerter si vous prenez trop de risques.",
    icon: PieIcon,
    color: "text-blue-400",
    bgGlow: "bg-blue-500/20",
  },
  {
    title: "Comment ajouter un bien ?",
    subtitle: "ÉTAPE 4 : C'EST À VOUS DE JOUER",
    description: "Utilisez simplement le formulaire au centre de la page. Nous avons supprimé tout le jargon de banquier. Si vous avez acheté une action en bourse, dites-nous juste combien vous en avez et à quel prix. Nexus s'occupe des mathématiques complexes et mettra à jour votre richesse en direct !",
    icon: Plus,
    color: "text-purple-400",
    bgGlow: "bg-purple-500/20",
  }
];

function PatrimoineTutorialModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Remet à zéro si on ferme et rouvre
  useEffect(() => {
      if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const StepIcon = TUTORIAL_STEPS[currentStep].icon;

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      {/* Pop-up plus grand (max-w-2xl au lieu de md) */}
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl bg-[#0A0A0C] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] blur-[100px] rounded-full transition-colors duration-700 opacity-20 pointer-events-none ${TUTORIAL_STEPS[currentStep].bgGlow}`} />
        
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors z-20 bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/5"><X size={20} /></button>
        
        <div className="p-8 sm:p-12 relative z-10 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col items-center text-center space-y-6">
              
              <div className={`w-20 h-20 rounded-3xl bg-[#121214] border border-white/10 flex items-center justify-center shadow-2xl ${TUTORIAL_STEPS[currentStep].color}`}>
                  <StepIcon size={40} />
              </div>
              
              <div className="space-y-3">
                <p className={`text-xs font-black uppercase tracking-[0.2em] ${TUTORIAL_STEPS[currentStep].color}`}>{TUTORIAL_STEPS[currentStep].subtitle}</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">{TUTORIAL_STEPS[currentStep].title}</h2>
              </div>
              
              <p className="text-zinc-300 text-base sm:text-lg leading-relaxed mt-4 max-w-xl font-medium">
                  {TUTORIAL_STEPS[currentStep].description}
              </p>

            </motion.div>
          </AnimatePresence>
        </div>

        <div className="bg-[#121214] border-t border-white/10 p-6 sm:p-8 flex items-center justify-between relative z-10 shrink-0">
            <div className="flex gap-2.5">
                {TUTORIAL_STEPS.map((_, index) => (<div key={index} className={`h-2 rounded-full transition-all duration-300 ${index === currentStep ? "w-8 bg-white" : "w-2 bg-zinc-700"}`} />))}
            </div>
            <Button onClick={handleNext} className="bg-white hover:bg-zinc-200 hover:scale-105 active:scale-95 text-black font-black uppercase tracking-widest rounded-xl px-8 py-6 text-sm transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                {currentStep === TUTORIAL_STEPS.length - 1 ? <span className="flex items-center gap-3">J'ai compris <Check size={18} /></span> : <span className="flex items-center gap-3">Suivant <ArrowRight size={18} /></span>}
            </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 2. BULLE D'AIDE OPAQUE ET CORRIGÉE
// ==========================================
const HelpTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center ml-2 cursor-pointer z-50"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className={`p-1 rounded-full transition-colors ${isOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"}`}>
          <Info size={14} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.95 }} 
            transition={{ duration: 0.15 }}
            // Le fond #1A1A1E est opaque pour empêcher toute transparence
            className="absolute bottom-[130%] left-1/2 -translate-x-1/2 w-64 p-4 bg-[#1A1A1E] text-white text-xs rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-zinc-700 text-center leading-relaxed font-sans normal-case tracking-normal z-[9999]"
          >
            {text}
            {/* Petit triangle sous la bulle */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1A1A1E]"></div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-zinc-700 -z-10 mt-[1px]"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 3. CODE PRINCIPAL DE LA PAGE
// ==========================================
type AssetType = "Immobilier" | "Bourse" | "Crypto" | "AssuranceVie" | "Cash" | "Autre";

type Asset = { 
    id: string; name: string; value: number; type: AssetType; quantity?: number; unitPrice?: number; buyPrice?: number; notaryFees?: number; workCost?: number; loanCost?: number; 
};

const ASSET_CONFIG: Record<AssetType, { color: string; gradient: string; glow: string; border: string; icon: any; label: string }> = {
  Immobilier: { color: "#3b82f6", gradient: "from-blue-600 to-blue-400", glow: "shadow-[0_0_30px_rgba(59,130,246,0.3)]", border: "border-blue-500/30", icon: Building, label: "Immobilier" },
  Bourse: { color: "#10b981", gradient: "from-emerald-600 to-emerald-400", glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]", border: "border-emerald-500/30", icon: TrendingUp, label: "Bourse / Compte Titres" },
  Crypto: { color: "#8b5cf6", gradient: "from-purple-600 to-purple-400", glow: "shadow-[0_0_30px_rgba(139,92,246,0.3)]", border: "border-purple-500/30", icon: Bitcoin, label: "Cryptomonnaies" },
  AssuranceVie: { color: "#ec4899", gradient: "from-pink-600 to-pink-400", glow: "shadow-[0_0_30px_rgba(236,72,153,0.3)]", border: "border-pink-500/30", icon: ShieldCheck, label: "Assurance Vie" },
  Cash: { color: "#f59e0b", gradient: "from-amber-500 to-yellow-400", glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]", border: "border-amber-500/30", icon: Landmark, label: "Cash & Livrets" },
  Autre: { color: "#71717a", gradient: "from-zinc-600 to-zinc-400", glow: "shadow-[0_0_30px_rgba(113,113,122,0.3)]", border: "border-zinc-500/30", icon: Layers, label: "Autre" },
};

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
const getVal = (v: any) => (typeof v === 'string' ? parseFloat(v) : v) || 0;

export default function PatrimoinePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [liquidCash, setLiquidCash] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // État pour afficher ou cacher le tutoriel
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AssetType>("Bourse");
  const [newValue, setNewValue] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newBuyPrice, setNewBuyPrice] = useState(""); 
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [newNotaryFees, setNewNotaryFees] = useState("");
  const [newWorkCost, setNewWorkCost] = useState("");
  const [newLoanCost, setNewLoanCost] = useState("");

  const isComplexAsset = newType === "Bourse" || newType === "Crypto";
  const isRealEstate = newType === "Immobilier";

  useEffect(() => {
    fetchData();
    // Lance le tuto à la première connexion
    const hasSeenTutorial = localStorage.getItem("nexus_patrimoine_tuto_seen");
    if (!hasSeenTutorial) {
      setTimeout(() => setIsTutorialOpen(true), 800);
    }
  }, []);

  const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('assets_json').eq('id', session.user.id).maybeSingle();
        if (data && data.assets_json) {
          setAssets(data.assets_json);
          calculateTotals(data.assets_json);
        }
      }
      setLoading(false);
  };

  const calculateTotals = (currentAssets: Asset[]) => {
    const total = currentAssets.reduce((acc, a) => acc + getVal(a.value), 0);
    const cash = currentAssets
        .filter(a => a.type === "Cash" || a.type === "AssuranceVie" || (a.type && a.name.toLowerCase().includes("livret")))
        .reduce((acc, a) => acc + getVal(a.value), 0);
    setNetWorth(total);
    setLiquidCash(cash);
  };

  const saveToCloud = async (assetsToSave: Asset[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const total = assetsToSave.reduce((acc, a) => acc + a.value, 0);
      await supabase.from('profiles').upsert({ id: user.id, assets_json: assetsToSave, net_worth: total, updated_at: new Date() });
    }
  };

  const addAsset = async () => {
    if (!newName) return;
    let finalValue = 0;
    let assetData: Asset = { id: Date.now().toString(), name: newName, value: 0, type: newType };

    if (isComplexAsset) {
        const qty = parseFloat(newQty) || 0;
        const current = parseFloat(newUnitPrice) || 0;
        const buy = parseFloat(newBuyPrice) || 0;
        finalValue = qty * current;
        assetData = { ...assetData, value: finalValue, quantity: qty, unitPrice: current, buyPrice: buy };
    } else if (isRealEstate) {
        finalValue = parseFloat(newValue) || 0; 
        assetData = { ...assetData, value: finalValue, buyPrice: parseFloat(newBuyPrice) || 0, notaryFees: parseFloat(newNotaryFees) || 0, workCost: parseFloat(newWorkCost) || 0, loanCost: parseFloat(newLoanCost) || 0 };
    } else {
        finalValue = parseFloat(newValue) || 0;
        assetData = { ...assetData, value: finalValue };
    }

    const updated = [...assets, assetData];
    setAssets(updated); calculateTotals(updated); await saveToCloud(updated);
    
    setNewName(""); setNewValue(""); setNewQty(""); setNewBuyPrice(""); setNewUnitPrice("");
    setNewNotaryFees(""); setNewWorkCost(""); setNewLoanCost("");
  };

  const removeAsset = async (id: string) => {
    const updated = assets.filter((a) => a.id !== id);
    setAssets(updated); calculateTotals(updated); await saveToCloud(updated);
  };

  const updateAssetDetail = (id: string, field: keyof Asset, valStr: string) => {
      const val = valStr === "" ? 0 : parseFloat(valStr);
      const updated = assets.map(a => {
          if (a.id !== id) return a;
          const newAsset = { ...a, [field]: val };
          if ((newAsset.type === 'Bourse' || newAsset.type === 'Crypto') && field !== 'value') {
             if (newAsset.quantity !== undefined && newAsset.unitPrice !== undefined) {
                 newAsset.value = newAsset.quantity * newAsset.unitPrice;
             }
          }
          return newAsset;
      });
      setAssets(updated); calculateTotals(updated);
  };

  const handleBlur = async () => { await saveToCloud(assets); };

  const chartData = Object.keys(ASSET_CONFIG).map((type) => {
    const value = assets.filter((a) => a.type === type).reduce((acc, a) => acc + a.value, 0);
    return { name: ASSET_CONFIG[type as AssetType].label, value, color: ASSET_CONFIG[type as AssetType].color };
  }).filter(d => d.value > 0);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      
      {/* POP-UP CONNECTÉ À L'ÉTAT LOCAL */}
      <PatrimoineTutorialModal isOpen={isTutorialOpen} onClose={() => { setIsTutorialOpen(false); localStorage.setItem("nexus_patrimoine_tuto_seen", "true"); }} />
      
      <Sidebar />
      <main className="md:ml-64 flex-1 w-full md:w-auto min-w-0 p-4 md:p-8 relative overflow-x-hidden">
        
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[1800px] w-full mx-auto space-y-6 md:space-y-10 relative z-10">
          
          <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-l-4 border-emerald-500 pl-4 md:pl-6 py-2 max-w-full">
            <div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase truncate">
                Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 drop-shadow-sm">Patrimoine</span>
                </h1>
                <p className="text-zinc-400 text-[10px] md:text-lg font-light tracking-wide mt-1">L'inventaire de tout ce que vous possédez, simplifié.</p>
            </div>
            
            {/* BOUTON POUR RELANCER LE GUIDE */}
            <button 
                onClick={() => setIsTutorialOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest shrink-0"
            >
                <BookOpen size={14} /> Guide
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 w-full min-w-0">
            {/* KPI VALEUR NETTE (hover:z-50 pour que les bulles passent au dessus) */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-[24px] md:rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black backdrop-blur-2xl p-6 md:p-10 flex flex-col justify-center min-h-[180px] md:min-h-[240px] shadow-2xl group hover:border-emerald-500/30 transition-all duration-500 w-full min-w-0 hover:z-50">
                <div className="absolute -top-32 -right-32 w-64 md:w-96 h-64 md:h-96 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 w-full min-w-0">
                    <div className="min-w-0 w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 md:mb-6">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-emerald-400 text-[9px] md:text-xs font-bold uppercase tracking-[0.2em]">Votre Richesse Totale</p>
                        </div>
                        <div className="text-5xl sm:text-6xl lg:text-[7rem] font-black text-white tracking-tighter drop-shadow-2xl truncate max-w-full leading-none">
                            <AnimatedNumber value={netWorth} />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI LIQUIDITÉ (hover:z-50 permet à la bulle de sortir complètement de la carte) */}
            <div className="relative rounded-[24px] md:rounded-[32px] border border-pink-500/20 bg-gradient-to-b from-[#100508] to-[#0A0205] p-6 md:p-10 flex flex-col justify-center shadow-xl hover:border-pink-500/40 transition-all duration-500 w-full min-w-0 group hover:z-50">
                <div className="absolute inset-0 overflow-hidden rounded-[24px] md:rounded-[32px]">
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none group-hover:from-pink-500/10 transition-colors duration-500"></div>
                </div>
                
                <div className="inline-flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-pink-400 font-bold uppercase text-[10px] md:text-xs tracking-widest relative z-10">
                    <ShieldCheck size={18} className="md:w-5 md:h-5 shrink-0"/> Matelas de sécurité
                    {/* LA BULLE EST ICI */}
                    <HelpTooltip text="Votre bouclier anti-imprévus. L'argent disponible immédiatement en cas de coup dur (Comptes courants, Livret A, LDDS). Il est recommandé d'y avoir 3 à 6 mois de dépenses." />
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 truncate max-w-full relative z-10">
                    <AnimatedNumber value={liquidCash} />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8 w-full min-w-0">
            {/* --- FORMULAIRE D'AJOUT (hover:z-50 pour les bulles du formulaire) --- */}
            <div className="xl:col-span-2 p-[1px] rounded-[24px] md:rounded-[32px] bg-gradient-to-r from-emerald-500/30 via-blue-500/30 to-purple-500/30 w-full min-w-0 shadow-xl hover:z-50 group">
                <div className="bg-[#0A0A0C] rounded-[23px] md:rounded-[31px] p-4 md:p-8 h-full flex flex-col justify-center relative overflow-visible w-full min-w-0">
                    <div className="relative z-10 w-full min-w-0">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h3 className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Plus size={16} className="text-emerald-400"/> Qu'avez-vous acheté ?
                            </h3>
                        </div>
                        
                        <div className="flex flex-col gap-3 md:gap-4 w-full min-w-0">
                            {/* Ligne principale */}
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full min-w-0">
                                <div className="flex-1 min-w-0 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-sm">&gt;</span>
                                    <Input placeholder="Ex: Action Apple, Appartement, Livret A..." value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-black/60 border-white/10 text-white h-12 md:h-14 rounded-xl md:rounded-2xl text-sm md:text-base pl-10 focus:border-emerald-500/50 focus:ring-emerald-500/20 w-full min-w-0 shadow-inner"/>
                                </div>
                                <div className="w-full sm:w-48 shrink-0">
                                    <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                                        <SelectTrigger className="bg-black/60 border-white/10 text-white h-12 md:h-14 rounded-xl md:rounded-2xl w-full shadow-inner focus:ring-emerald-500/20 z-50"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                                        <SelectContent className="bg-[#111113] border-zinc-800 text-white backdrop-blur-xl z-[999]">
                                            {Object.keys(ASSET_CONFIG).map((type) => (
                                                <SelectItem key={type} value={type} className="focus:bg-white/5 focus:text-white cursor-pointer">{ASSET_CONFIG[type as AssetType].label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Options dynamiques simplifiées */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 min-w-0 w-full transition-all relative z-10">
                                
                                {/* CAS 1 : BOURSE / CRYPTO */}
                                {isComplexAsset && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in w-full min-w-0">
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Quantité <HelpTooltip text="Combien d'actions ou de pièces cryptos possédez-vous au total ?" />
                                            </label>
                                            <Input type="number" placeholder="Ex: 10" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-purple-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Acheté (Unité) <HelpTooltip text="Aussi appelé 'PRU'. C'est le prix moyen payé pour acheter UNE seule action. Cela sert à calculer votre plus-value." />
                                            </label>
                                            <Input type="number" placeholder="€ (par unité)" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-purple-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-emerald-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Prix actuel <HelpTooltip text="Combien vaut une seule de ces actions aujourd'hui sur le marché ?" />
                                            </label>
                                            <Input type="number" placeholder="€ (par unité)" value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} className="bg-emerald-950/20 border-emerald-500/20 text-emerald-400 font-bold h-12 rounded-xl text-sm w-full min-w-0 focus:border-emerald-500" />
                                        </div>
                                    </div>
                                )}

                                {/* CAS 2 : IMMOBILIER */}
                                {isRealEstate && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in w-full min-w-0">
                                        <div className="sm:col-span-2 md:col-span-3 relative min-w-0">
                                            <label className="text-[10px] text-emerald-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Valeur actuelle estimée <HelpTooltip text="Si vous deviez mettre en vente ce bien aujourd'hui, quel prix en demanderiez-vous ?" />
                                            </label>
                                            <Input type="number" placeholder="Ex: 250000 €" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-emerald-950/20 border-emerald-500/20 text-emerald-400 h-12 rounded-xl font-bold text-sm w-full min-w-0 focus:border-emerald-500" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Prix d'achat <HelpTooltip text="Le prix net payé à l'achat, en incluant les frais d'agence immobilière." />
                                            </label>
                                            <Input type="number" placeholder="€" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Frais de Notaire
                                            </label>
                                            <Input type="number" placeholder="€" value={newNotaryFees} onChange={(e) => setNewNotaryFees(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Montant Travaux
                                            </label>
                                            <Input type="number" placeholder="€" value={newWorkCost} onChange={(e) => setNewWorkCost(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500/50" />
                                        </div>
                                        <div className="relative min-w-0 sm:col-span-2 md:col-span-3">
                                            <label className="text-[10px] text-blue-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                                Coût Total du Crédit <HelpTooltip text="L'argent que vous coûte la banque. C'est la somme totale des intérêts et de l'assurance prêt payés au fil des années." />
                                            </label>
                                            <Input type="number" placeholder="Ex: 45000 €" value={newLoanCost} onChange={(e) => setNewLoanCost(e.target.value)} className="bg-blue-950/20 border-blue-500/20 text-blue-300 h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500" />
                                        </div>
                                    </div>
                                )}

                                {/* CAS 3 : SIMPLE (CASH, AUTRE) */}
                                {!isComplexAsset && !isRealEstate && (
                                    <div className="w-full relative animate-in fade-in min-w-0">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">
                                            Montant disponible dessus <HelpTooltip text="La somme exacte présente sur ce compte à l'instant T." />
                                        </label>
                                        <div className="relative">
                                            <Input type="number" placeholder="Ex: 1500" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-black/50 border-white/5 text-white font-bold text-lg h-14 rounded-xl pr-8 w-full min-w-0 focus:border-amber-500/50 focus:ring-amber-500/20" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold pointer-events-none">€</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <Button onClick={addAsset} className="bg-white text-black hover:bg-zinc-200 font-black tracking-widest uppercase px-8 h-14 w-full rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-2 transition-all hover:scale-[1.01] active:scale-95">Ajouter à mon patrimoine</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- GRAPHIQUE RÉPARTITION --- */}
            <div className="bg-[#0A0A0C] border border-white/10 rounded-[24px] md:rounded-[32px] p-6 flex flex-col items-center justify-center relative min-h-[200px] md:min-h-[250px] shadow-2xl w-full min-w-0 overflow-hidden hover:border-emerald-500/30 transition-all duration-500 group">
                <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-widest z-10"><PieIcon size={14} className="group-hover:text-emerald-400 transition-colors"/> Répartition</div>
                <div className="h-[180px] md:h-[220px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={6}>
                                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 8px ${entry.color}40)` }} />))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(26,26,30,1)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value: any) => formatEuro(value)}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* --- LISTE DÉTAILLÉE PAR CATÉGORIE --- */}
          <div className="space-y-6 md:space-y-8 w-full min-w-0">
             <div className="flex items-center gap-3 pl-2">
                 <div className="h-6 w-1.5 bg-gradient-to-b from-white to-zinc-600 rounded-full"></div>
                 <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Détail de vos investissements</h3>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 w-full min-w-0">
                 {Object.keys(ASSET_CONFIG).map((type) => {
                     const categoryAssets = assets.filter(a => a.type === type);
                     if (categoryAssets.length === 0) return null;
                     const Config = ASSET_CONFIG[type as AssetType];
                     const categoryTotal = categoryAssets.reduce((acc, a) => acc + getVal(a.value), 0);
                     const percentOfTotal = netWorth > 0 ? (categoryTotal / netWorth) * 100 : 0;

                     return (
                        <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[24px] md:rounded-[32px] border ${Config.border} bg-[#0C0C0E]/80 backdrop-blur-2xl p-4 md:p-6 lg:p-8 flex flex-col gap-4 md:gap-6 shadow-2xl relative overflow-hidden w-full min-w-0 group`}>
                            <div className={`absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br ${Config.gradient} opacity-5 blur-[80px] group-hover:opacity-10 transition-opacity duration-500`}></div>
                            
                            <div className="flex justify-between items-start gap-2 relative z-10">
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${Config.gradient} flex items-center justify-center text-white ${Config.glow} shrink-0`}><Config.icon size={20} className="md:w-6 md:h-6"/></div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-white text-sm md:text-lg tracking-wide uppercase truncate">{Config.label}</h4>
                                        <div className="h-1 w-16 md:w-24 bg-zinc-800/50 rounded-full mt-1.5 md:mt-2 overflow-hidden"><div className={`h-full bg-gradient-to-r ${Config.gradient}`} style={{ width: `${percentOfTotal}%` }}></div></div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg md:text-2xl font-bold text-white">{formatEuro(categoryTotal)}</p>
                                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{percentOfTotal.toFixed(1)}% de vos biens</p>
                                </div>
                            </div>

                            <div className="space-y-3 md:space-y-4 w-full min-w-0 relative z-10">
                                <AnimatePresence>
                                    {categoryAssets.map((asset) => {
                                        const isRealEstate = asset.type === 'Immobilier';
                                        const isEditableType = asset.type === 'Bourse' || asset.type === 'Crypto';
                                        
                                        const totalInvested = (asset.buyPrice||0) + (asset.notaryFees||0) + (asset.workCost||0);
                                        const netGain = asset.value - totalInvested;
                                        const breakeven = totalInvested + (asset.loanCost||0);
                                        
                                        let gainPercent = 0;
                                        if (isEditableType && asset.quantity && asset.buyPrice && asset.unitPrice) {
                                            const totalBuy = asset.quantity * asset.buyPrice;
                                            const currentVal = asset.quantity * asset.unitPrice;
                                            if (totalBuy > 0) gainPercent = ((currentVal - totalBuy) / totalBuy) * 100;
                                        }

                                        return (
                                            <motion.div key={asset.id} layout className="p-4 bg-[#141417] hover:bg-[#1A1A1E] rounded-[20px] md:rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col gap-3 md:gap-4 w-full min-w-0 relative">
                                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b ${Config.gradient} opacity-50`}></div>
                                                
                                                <div className="flex justify-between items-start w-full min-w-0 pl-2">
                                                    <div className="w-full min-w-0">
                                                        <div className="flex justify-between items-center w-full min-w-0 gap-2 mb-2">
                                                            <span className="text-sm md:text-base text-white font-bold tracking-wide truncate">{asset.name}</span>
                                                            <button onClick={() => removeAsset(asset.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-1 shrink-0"><Trash2 size={16} className="md:w-5 md:h-5"/></button>
                                                        </div>

                                                        {isRealEstate && (
                                                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 bg-black/40 p-3 md:p-4 rounded-xl border border-white/5 w-full min-w-0 mb-3">
                                                                <div className="space-y-1.5 min-w-0">
                                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase block truncate">Achat (TTC)</span>
                                                                    <Input type="number" value={asset.buyPrice ? Number(asset.buyPrice.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'buyPrice', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-300 px-2 focus:ring-0 shadow-none w-full" />
                                                                </div>
                                                                <div className="space-y-1.5 min-w-0">
                                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase block truncate">Notaire</span>
                                                                    <Input type="number" value={asset.notaryFees ? Number(asset.notaryFees.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'notaryFees', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-300 px-2 focus:ring-0 shadow-none w-full" />
                                                                </div>
                                                                <div className="space-y-1.5 min-w-0">
                                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase block truncate">Travaux</span>
                                                                    <Input type="number" value={asset.workCost ? Number(asset.workCost.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'workCost', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-300 px-2 focus:ring-0 shadow-none w-full" />
                                                                </div>
                                                                <div className="space-y-1.5 min-w-0">
                                                                    <span className="text-[9px] text-blue-400 font-bold uppercase block truncate">Coût Crédit</span>
                                                                    <Input type="number" value={asset.loanCost ? Number(asset.loanCost.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'loanCost', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-blue-950/20 border border-blue-500/20 rounded-md text-blue-300 px-2 focus:ring-0 shadow-none w-full" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {isEditableType && (
                                                            <div className="flex flex-wrap items-end gap-3 bg-black/40 p-3 md:p-4 rounded-xl border border-white/5 w-full min-w-0 mb-3">
                                                                <div className="flex-1 min-w-[80px]">
                                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase block mb-1.5">Quantité</span>
                                                                    <Input type="number" value={asset.quantity ? Number(asset.quantity.toFixed(4)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'quantity', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-white font-bold px-2 w-full"/>
                                                                </div>
                                                                <div className="text-zinc-600 text-xs pb-2">×</div>
                                                                <div className="flex-1 min-w-[80px]">
                                                                    <span className="text-[9px] text-emerald-500 font-bold uppercase block mb-1.5">Prix Actuel</span>
                                                                    <Input type="number" value={asset.unitPrice ? Number(asset.unitPrice.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'unitPrice', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-emerald-950/20 border border-emerald-500/20 rounded-md text-emerald-400 font-bold px-2 w-full"/>
                                                                </div>
                                                                <div className="w-[1px] h-8 bg-white/10 hidden sm:block mb-1"></div>
                                                                <div className="flex-1 min-w-[80px]">
                                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase block mb-1.5">Acheté (Moyen)</span>
                                                                    <Input type="number" value={asset.buyPrice ? Number(asset.buyPrice.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'buyPrice', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-400 px-2 w-full"/>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-2">
                                                            <div className="w-full sm:w-48 relative shrink-0 mt-2">
                                                                <span className="absolute -top-3 left-2 text-[9px] font-bold text-white uppercase tracking-wider bg-[#141417] px-1 rounded-sm">Total Aujourd'hui</span>
                                                                <Input type="number" value={asset.value === 0 ? "" : Number(asset.value.toFixed(2))} onChange={(e) => updateAssetDetail(asset.id, 'value', e.target.value)} onBlur={handleBlur} className="bg-black/60 border-white/10 text-white font-bold h-10 md:h-12 text-sm md:text-lg pl-3 pr-8 focus:border-emerald-500/50 w-full rounded-xl" />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">€</span>
                                                            </div>

                                                            <div className="flex items-center sm:flex-col sm:items-end justify-between min-w-0 bg-white/5 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                                                                {isRealEstate ? (
                                                                    <>
                                                                        <div className={`text-[10px] md:text-xs font-bold flex items-center gap-1.5 truncate ${netGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                                            {netGain >= 0 ? <TrendingUp size={12} className="shrink-0"/> : <AlertTriangle size={12} className="shrink-0"/>}
                                                                            <span className="truncate">{netGain >= 0 ? "Bénéfice : +" : "Perte : "}{formatEuro(netGain)}</span>
                                                                        </div>
                                                                        {(asset.loanCost || 0) > 0 && (
                                                                            <div className="text-[8px] md:text-[9px] text-blue-400 mt-0.5 truncate border border-blue-500/20 px-1.5 py-0.5 rounded bg-blue-500/5">
                                                                                Rentable à partir de: {formatEuro(breakeven)}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : isEditableType && gainPercent !== 0 ? (
                                                                    <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shrink-0 border ${gainPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                                        {gainPercent > 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                                                                    </span>
                                                                ) : (
                                                                    <div className="text-xs md:text-sm font-bold text-zinc-500 truncate">Total</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                     );
                 })}
             </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}