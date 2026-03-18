"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar"; 
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Wallet, Building, Bitcoin, Landmark, Plus, Trash2, TrendingUp, PieChart as PieIcon, ShieldCheck, Loader2, Layers, AlertTriangle, Info, X, ArrowRight, Check, BookOpen, ArrowLeft, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";

// --- HELPERS ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// ==========================================
// 1. WIZARD D'INSTALLATION
// ==========================================
interface PatrimoineWizardProps { onComplete: () => void; }

function PatrimoineWizard({ onComplete }: PatrimoineWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [cashAmount, setCashAmount] = useState("");
    const [investAmount, setInvestAmount] = useState("");
    const [immoAmount, setImmoAmount] = useState("");

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

            const initialAssets: Asset[] = [];
            const now = Date.now();

            if (Number(cashAmount) > 0) initialAssets.push({ id: `${now}-1`, name: "Comptes & Livrets", value: Number(cashAmount), type: "Cash" });
            if (Number(investAmount) > 0) initialAssets.push({ id: `${now}-2`, name: "Portefeuille Global", value: Number(investAmount), type: "Bourse" });
            if (Number(immoAmount) > 0) initialAssets.push({ id: `${now}-3`, name: "Résidence / Immobilier", value: Number(immoAmount), type: "Immobilier" });

            const totalNetWorth = initialAssets.reduce((sum, item) => sum + item.value, 0);

            if (initialAssets.length > 0) {
                await supabase.from('profiles').update({ assets_json: initialAssets, net_worth: totalNetWorth }).eq('id', user.id);
            }
            onComplete();
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const slideVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-[#020202] text-white flex flex-col items-center justify-center p-6">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="w-full max-w-lg relative z-10">
                <div className="flex gap-2 mb-12">
                    {[1, 2, 3].map((i) => (<div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-emerald-500" : "bg-white/10"}`} />))}
                </div>
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center">
                            <div className="w-20 h-20 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]"><Landmark size={36} /></div>
                            <h2 className="text-3xl md:text-4xl font-black">Combien avez-vous en liquidités ?</h2>
                            <p className="text-zinc-400">La somme de vos comptes courants et livrets (Livret A, LDDS...).</p>
                            <div className="relative max-w-xs mx-auto pt-6">
                                <Input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} autoFocus className="bg-white/5 border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-amber-500/50 focus:ring-amber-500/20 text-white font-black placeholder:text-zinc-700" placeholder="0" />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-3">€</span>
                            </div>
                            <Button onClick={handleNext} className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl mt-8 transition-all">Continuer <ArrowRight className="ml-2 w-5 h-5" /></Button>
                        </motion.div>
                    )}
                    {step === 2 && (
                        <motion.div key="step2" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center">
                            <div className="w-20 h-20 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)]"><TrendingUp size={36} /></div>
                            <h2 className="text-3xl md:text-4xl font-black">Avez-vous des investissements ?</h2>
                            <p className="text-zinc-400">La valeur totale de vos actions, PEA, ou cryptomonnaies.</p>
                            <div className="relative max-w-xs mx-auto pt-6">
                                <Input type="number" value={investAmount} onChange={(e) => setInvestAmount(e.target.value)} autoFocus className="bg-white/5 border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-purple-500/50 focus:ring-purple-500/20 text-white font-black placeholder:text-zinc-700" placeholder="0" />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-3">€</span>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <Button variant="ghost" onClick={handleBack} className="h-14 px-6 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl"><ArrowLeft /></Button>
                                <Button onClick={handleNext} className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl transition-all">Continuer <ArrowRight className="ml-2 w-5 h-5" /></Button>
                            </div>
                        </motion.div>
                    )}
                    {step === 3 && (
                        <motion.div key="step3" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center">
                            <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]"><Building size={36} /></div>
                            <h2 className="text-3xl md:text-4xl font-black">Possédez-vous de l'immobilier ?</h2>
                            <p className="text-zinc-400">La valeur totale estimée de vos biens immobiliers ou SCPI.</p>
                            <div className="relative max-w-xs mx-auto pt-6">
                                <Input type="number" value={immoAmount} onChange={(e) => setImmoAmount(e.target.value)} autoFocus className="bg-white/5 border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-blue-500/50 focus:ring-blue-500/20 text-white font-black placeholder:text-zinc-700" placeholder="0" />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-3">€</span>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <Button variant="ghost" onClick={handleBack} className="h-14 px-6 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl"><ArrowLeft /></Button>
                                <Button onClick={handleSave} disabled={loading} className="flex-1 h-14 bg-white hover:bg-zinc-200 text-black font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all">
                                    {loading ? <Loader2 className="animate-spin mx-auto" /> : "Découvrir ma Valeur Nette"}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ==========================================
// 2. POP-UP D'ACCUEIL XXL
// ==========================================
const TUTORIAL_STEPS = [
  { title: "L'inventaire de votre vie financière", subtitle: "ÉTAPE 1 : LE CONCEPT", description: "Bienvenue dans l'espace Patrimoine. C'est ici que vous allez lister tout ce que vous possédez (comptes bancaires, immobilier, cryptos). Pourquoi ? Pour calculer votre 'Valeur Nette'.", icon: Wallet, color: "text-emerald-400", bgGlow: "bg-emerald-500/20" },
  { title: "Le Matelas de Sécurité", subtitle: "ÉTAPE 2 : LA RÈGLE D'OR", description: "Avant de chercher à faire des profits, il faut se protéger. Le matelas de sécurité est votre bouclier (Livret A, LDDS). Son but : pouvoir payer une grosse facture en urgence.", icon: ShieldCheck, color: "text-pink-400", bgGlow: "bg-pink-500/20" },
  { title: "La Diversification", subtitle: "ÉTAPE 3 : NE PAS TOUT MISER SUR LE MÊME CHEVAL", description: "Si tout votre argent est dans l'immobilier, une crise du logement vous mettra en danger. La diversification consiste à répartir son argent entre différents domaines : l'immobilier, la bourse, et les livrets.", icon: PieIcon, color: "text-blue-400", bgGlow: "bg-blue-500/20" },
  { title: "Comment ajouter un bien ?", subtitle: "ÉTAPE 4 : C'EST À VOUS DE JOUER", description: "Vous pouvez ajouter manuellement vos actifs ou utiliser l'IA GPT-4 pour scanner vos relevés bancaires. L'application classera tout automatiquement !", icon: Plus, color: "text-purple-400", bgGlow: "bg-purple-500/20" }
];

function PatrimoineTutorialModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
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
// 3. BULLE D'AIDE
// ==========================================
const HelpTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-2 cursor-pointer z-50" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)} onClick={() => setIsOpen(!isOpen)}>
      <div className={`p-1 rounded-full transition-colors ${isOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"}`}><Info size={14} /></div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-[130%] left-1/2 -translate-x-1/2 w-64 p-4 bg-[#1A1A1E] text-white text-xs rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-zinc-700 text-center leading-relaxed font-sans normal-case tracking-normal z-[9999]">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1A1A1E]"></div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-zinc-700 -z-10 mt-[1px]"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 4. PAGE PRINCIPALE
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
  
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  
  // États Scan IA
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<Asset[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const hasSeenTutorial = localStorage.getItem("nexus_patrimoine_tuto_seen");
    if (!hasSeenTutorial) setTimeout(() => setIsTutorialOpen(true), 800);
  }, []);

  const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('assets_json').eq('id', session.user.id).maybeSingle();
        if (data && data.assets_json && data.assets_json.length > 0) {
          setAssets(data.assets_json);
          calculateTotals(data.assets_json);
          setNeedsSetup(false);
        } else { setNeedsSetup(true); }
      }
      setLoading(false);
  };

  const calculateTotals = (currentAssets: Asset[]) => {
    const total = currentAssets.reduce((acc, a) => acc + getVal(a.value), 0);
    const cash = currentAssets.filter(a => a.type === "Cash" || a.type === "AssuranceVie" || (a.type && a.name.toLowerCase().includes("livret"))).reduce((acc, a) => acc + getVal(a.value), 0);
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

  // --- NOUVEAU SCANNER IA MULTI-PAGES ---
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
                  
                  // Fusionne jusqu'à 5 pages du PDF en une seule longue image
                  const numPages = pdf.numPages;
                  const canvases = [];
                  let totalHeight = 0;
                  let maxWidth = 0;
                  const pagesToScan = Math.min(numPages, 5); 

                  for (let i = 1; i <= pagesToScan; i++) {
                      const page = await pdf.getPage(i);
                      const viewport = page.getViewport({ scale: 1.5 }); 
                      const canvas = document.createElement("canvas");
                      const context = canvas.getContext("2d");
                      if (context) {
                          canvas.height = viewport.height; 
                          canvas.width = viewport.width;
                          await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                          canvases.push(canvas);
                          totalHeight += viewport.height;
                          maxWidth = Math.max(maxWidth, viewport.width);
                      }
                  }

                  const finalCanvas = document.createElement("canvas");
                  finalCanvas.width = maxWidth;
                  finalCanvas.height = totalHeight;
                  const finalCtx = finalCanvas.getContext("2d");
                  
                  if (finalCtx) {
                      let currentY = 0;
                      for (const canvas of canvases) {
                          finalCtx.drawImage(canvas, 0, currentY);
                          currentY += canvas.height;
                      }
                      base64Image = finalCanvas.toDataURL("image/jpeg", 0.7);
                  } else {
                      throw new Error("Erreur de fusion des pages");
                  }
              } catch (err) { throw new Error("Impossible de lire ce PDF. Essayez une capture d'écran."); }
          } else { 
              base64Image = await fileToBase64(file); 
          }
          
          const response = await fetch('/api/scan-patrimoine', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ imageBase64: base64Image }) 
          });

          if (!response.ok) throw new Error("Erreur serveur"); 
          const data = await response.json();
          
          if (data.assets && data.assets.length > 0) {
              const formattedItems = data.assets.map((item: any, index: number) => ({
                  id: `ai-${Date.now()}-${index}`, 
                  name: item.name || "Actif IA", 
                  value: Number(item.value) || 0, 
                  type: (item.type as AssetType) || "Autre",
                  quantity: item.quantity ? Number(item.quantity) : undefined,
                  unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined
              }));
              setScannedItems(formattedItems); 
              setShowValidation(true); 
          } else {
              alert("L'IA n'a détecté aucun actif sur ce document.");
          }
      } catch (error: any) { 
          alert("Erreur IA : " + error.message); 
      } finally {
          setIsScanning(false); 
          if(fileInputRef.current) fileInputRef.current.value = '';
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

  if (loading && !needsSetup) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      
      {needsSetup && <PatrimoineWizard onComplete={() => { setNeedsSetup(false); fetchData(); }} />}

      <AnimatePresence>
          {isScanning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
                  <div className="flex flex-col items-center text-center space-y-6">
                      <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                          <ScanLine size={40} className="relative z-10" />
                          <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-1 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)] z-20" />
                      </motion.div>
                      <div><h3 className="text-xl font-black text-white tracking-widest uppercase mb-2">Lecture du document...</h3></div>
                  </div>
              </motion.div>
          )}
          {showValidation && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowValidation(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl bg-[#0A0A0C] border border-emerald-500/30 rounded-3xl flex flex-col overflow-hidden max-h-[85vh]">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-emerald-900/10">
                          <div><h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2"><ScanLine size={20} className="text-emerald-400"/> Validation des actifs</h3></div>
                          <button onClick={() => setShowValidation(false)} className="text-zinc-500 hover:text-white p-2"><X size={20}/></button>
                      </div>
                      <div className="p-6 overflow-y-auto space-y-3">
                          {scannedItems.map((item) => (
                              <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-black/50 border border-white/5 rounded-2xl gap-4">
                                  <div className="flex-1 min-w-0 w-full space-y-2">
                                      <Input value={item.name} onChange={(e) => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))} className="bg-zinc-900 border-white/10 text-sm h-10 text-white font-bold" />
                                      <div className="flex gap-2 items-center">
                                          {(item.type === 'Bourse' || item.type === 'Crypto') && item.quantity && (
                                              <div className="text-xs text-zinc-500 whitespace-nowrap bg-black/50 px-2 py-1 rounded">Qté: {item.quantity}</div>
                                          )}
                                          <div className="relative w-full">
                                              <Input type="number" value={item.value} onChange={(e) => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, value: Number(e.target.value) } : i))} className="bg-zinc-900 border-white/10 text-sm h-10 text-emerald-400 font-black pr-8" />
                                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">€</span>
                                          </div>
                                      </div>
                                  </div>
                                  <Select value={item.type} onValueChange={(val) => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, type: val as AssetType } : i))}>
                                      <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-white/10 text-sm h-10"><SelectValue /></SelectTrigger>
                                      <SelectContent className="bg-zinc-900 border-white/10 text-white z-[999]">
                                          {Object.keys(ASSET_CONFIG).map((t) => (
                                              <SelectItem key={t} value={t} className="cursor-pointer">{ASSET_CONFIG[t as AssetType].label}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              </div>
                          ))}
                      </div>
                      <div className="p-6 border-t border-white/5 bg-black">
                          <Button onClick={async () => { 
                              const newAssets = [...assets, ...scannedItems];
                              setAssets(newAssets); 
                              calculateTotals(newAssets);
                              await saveToCloud(newAssets);
                              setShowValidation(false); 
                              setScannedItems([]); 
                          }} className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02]">
                              Importer ({scannedItems.length} actifs)
                          </Button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <PatrimoineTutorialModal isOpen={isTutorialOpen} onClose={() => { setIsTutorialOpen(false); localStorage.setItem("nexus_patrimoine_tuto_seen", "true"); }} />
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />

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
            <button onClick={() => setIsTutorialOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest shrink-0">
                <BookOpen size={14} /> Guide
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 w-full min-w-0">
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

            <div className="relative rounded-[24px] md:rounded-[32px] border border-pink-500/20 bg-gradient-to-b from-[#100508] to-[#0A0205] p-6 md:p-10 flex flex-col justify-center shadow-xl hover:border-pink-500/40 transition-all duration-500 w-full min-w-0 group hover:z-50">
                <div className="absolute inset-0 overflow-hidden rounded-[24px] md:rounded-[32px]"><div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none group-hover:from-pink-500/10 transition-colors duration-500"></div></div>
                <div className="inline-flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-pink-400 font-bold uppercase text-[10px] md:text-xs tracking-widest relative z-10">
                    <ShieldCheck size={18} className="md:w-5 md:h-5 shrink-0"/> Matelas de sécurité <HelpTooltip text="Votre bouclier anti-imprévus. L'argent disponible immédiatement en cas de coup dur (Comptes courants, Livret A, LDDS). Il est recommandé d'y avoir 3 à 6 mois de dépenses." />
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 truncate max-w-full relative z-10">
                    <AnimatedNumber value={liquidCash} />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8 w-full min-w-0">
            <div className="xl:col-span-2 p-[1px] rounded-[24px] md:rounded-[32px] bg-gradient-to-r from-emerald-500/30 via-blue-500/30 to-purple-500/30 w-full min-w-0 shadow-xl hover:z-50 group">
                <div className="bg-[#0A0A0C] rounded-[23px] md:rounded-[31px] p-4 md:p-8 h-full flex flex-col justify-center relative overflow-visible w-full min-w-0">
                    <div className="relative z-10 w-full min-w-0">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h3 className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2"><Plus size={16} className="text-emerald-400"/> Qu'avez-vous acheté ?</h3>
                        </div>
                        
                        <div className="flex flex-col gap-3 md:gap-4 w-full min-w-0">
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full min-w-0">
                                <div className="flex-1 min-w-0 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-sm">&gt;</span>
                                    <Input placeholder="Ex: Action Apple, Appartement, Livret A..." value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-black/60 border-white/10 text-white h-12 md:h-14 rounded-xl md:rounded-2xl text-sm md:text-base pl-10 focus:border-emerald-500/50 focus:ring-emerald-500/20 w-full min-w-0 shadow-inner"/>
                                </div>
                                <div className="w-full sm:w-48 shrink-0">
                                    <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                                        <SelectTrigger className="bg-black/60 border-white/10 text-white h-12 md:h-14 rounded-xl md:rounded-2xl w-full shadow-inner focus:ring-emerald-500/20 z-50"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                                        <SelectContent className="bg-[#111113] border-zinc-800 text-white backdrop-blur-xl z-[999]">
                                            {Object.keys(ASSET_CONFIG).map((type) => (<SelectItem key={type} value={type} className="focus:bg-white/5 focus:text-white cursor-pointer">{ASSET_CONFIG[type as AssetType].label}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 min-w-0 w-full transition-all relative z-10">
                                {isComplexAsset && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in w-full min-w-0">
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Quantité <HelpTooltip text="Combien d'actions ou de pièces cryptos possédez-vous au total ?" /></label>
                                            <Input type="number" placeholder="Ex: 10" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-purple-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Acheté (Unité) <HelpTooltip text="Aussi appelé 'PRU'. C'est le prix moyen payé pour acheter UNE seule action." /></label>
                                            <Input type="number" placeholder="€ (par unité)" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-purple-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-emerald-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Prix actuel <HelpTooltip text="Combien vaut une seule de ces actions aujourd'hui sur le marché ?" /></label>
                                            <Input type="number" placeholder="€ (par unité)" value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} className="bg-emerald-950/20 border-emerald-500/20 text-emerald-400 font-bold h-12 rounded-xl text-sm w-full min-w-0 focus:border-emerald-500" />
                                        </div>
                                    </div>
                                )}
                                {isRealEstate && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in w-full min-w-0">
                                        <div className="sm:col-span-2 md:col-span-3 relative min-w-0">
                                            <label className="text-[10px] text-emerald-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Valeur actuelle estimée <HelpTooltip text="Si vous deviez mettre en vente ce bien aujourd'hui, quel prix en demanderiez-vous ?" /></label>
                                            <Input type="number" placeholder="Ex: 250000 €" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-emerald-950/20 border-emerald-500/20 text-emerald-400 h-12 rounded-xl font-bold text-sm w-full min-w-0 focus:border-emerald-500" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Prix d'achat <HelpTooltip text="Le prix net payé à l'achat, en incluant les frais d'agence immobilière." /></label>
                                            <Input type="number" placeholder="€" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Frais de Notaire</label>
                                            <Input type="number" placeholder="€" value={newNotaryFees} onChange={(e) => setNewNotaryFees(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500/50" />
                                        </div>
                                        <div className="relative min-w-0">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Montant Travaux</label>
                                            <Input type="number" placeholder="€" value={newWorkCost} onChange={(e) => setNewWorkCost(e.target.value)} className="bg-black/50 border-white/5 text-white h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500/50" />
                                        </div>
                                        <div className="relative min-w-0 sm:col-span-2 md:col-span-3">
                                            <label className="text-[10px] text-blue-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Coût Total du Crédit <HelpTooltip text="L'argent que vous coûte la banque. C'est la somme totale des intérêts et de l'assurance prêt payés au fil des années." /></label>
                                            <Input type="number" placeholder="Ex: 45000 €" value={newLoanCost} onChange={(e) => setNewLoanCost(e.target.value)} className="bg-blue-950/20 border-blue-500/20 text-blue-300 h-12 rounded-xl text-sm w-full min-w-0 focus:border-blue-500" />
                                        </div>
                                    </div>
                                )}
                                {!isComplexAsset && !isRealEstate && (
                                    <div className="w-full relative animate-in fade-in min-w-0">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1.5 flex items-center">Montant disponible dessus <HelpTooltip text="La somme exacte présente sur ce compte à l'instant T." /></label>
                                        <div className="relative">
                                            <Input type="number" placeholder="Ex: 1500" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-black/50 border-white/5 text-white font-bold text-lg h-14 rounded-xl pr-8 w-full min-w-0 focus:border-amber-500/50 focus:ring-amber-500/20" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold pointer-events-none">€</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <Button onClick={addAsset} className="bg-white text-black hover:bg-zinc-200 font-black tracking-widest uppercase px-8 h-14 w-full rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-2 transition-all hover:scale-[1.01] active:scale-95">Ajouter à mon patrimoine</Button>
                            
                            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={triggerScanner} className="w-full flex items-center justify-center gap-3 p-4 md:p-6 rounded-[24px] bg-gradient-to-r from-[#022c22] to-[#0A0515] border border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_0_40px_rgba(16,185,129,0.15)] group transition-all relative overflow-hidden mt-2">
                                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-transparent transition-colors"></div>
                                <div className="p-3 md:p-4 bg-emerald-500/20 rounded-xl md:rounded-2xl text-emerald-400 group-hover:bg-emerald-500/40 transition-colors shadow-inner relative z-10"><ScanLine size={28} className="md:w-8 md:h-8" /></div>
                                <div className="text-left relative z-10"><h4 className="text-white font-black text-sm md:text-base tracking-wider flex items-center gap-2 uppercase">Scanner un relevé (PDF/Image) <span className="text-[8px] md:text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-black px-2 py-1 rounded shadow-lg uppercase tracking-widest font-black hidden sm:inline-block">IA GPT-4o</span></h4></div>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

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
                                                                <div className="space-y-1.5 min-w-0"><span className="text-[9px] text-zinc-500 font-bold uppercase block truncate">Achat (TTC)</span><Input type="number" value={asset.buyPrice ? Number(asset.buyPrice.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'buyPrice', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-300 px-2 focus:ring-0 shadow-none w-full" /></div>
                                                                <div className="space-y-1.5 min-w-0"><span className="text-[9px] text-zinc-500 font-bold uppercase block truncate">Notaire</span><Input type="number" value={asset.notaryFees ? Number(asset.notaryFees.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'notaryFees', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-300 px-2 focus:ring-0 shadow-none w-full" /></div>
                                                                <div className="space-y-1.5 min-w-0"><span className="text-[9px] text-zinc-500 font-bold uppercase block truncate">Travaux</span><Input type="number" value={asset.workCost ? Number(asset.workCost.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'workCost', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-300 px-2 focus:ring-0 shadow-none w-full" /></div>
                                                                <div className="space-y-1.5 min-w-0"><span className="text-[9px] text-blue-400 font-bold uppercase block truncate">Coût Crédit</span><Input type="number" value={asset.loanCost ? Number(asset.loanCost.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'loanCost', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-blue-950/20 border border-blue-500/20 rounded-md text-blue-300 px-2 focus:ring-0 shadow-none w-full" /></div>
                                                            </div>
                                                        )}

                                                        {isEditableType && (
                                                            <div className="flex flex-wrap items-end gap-3 bg-black/40 p-3 md:p-4 rounded-xl border border-white/5 w-full min-w-0 mb-3">
                                                                <div className="flex-1 min-w-[80px]"><span className="text-[9px] text-zinc-500 font-bold uppercase block mb-1.5">Quantité</span><Input type="number" value={asset.quantity ? Number(asset.quantity.toFixed(4)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'quantity', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-white font-bold px-2 w-full"/></div>
                                                                <div className="text-zinc-600 text-xs pb-2">×</div>
                                                                <div className="flex-1 min-w-[80px]"><span className="text-[9px] text-emerald-500 font-bold uppercase block mb-1.5">Prix Actuel</span><Input type="number" value={asset.unitPrice ? Number(asset.unitPrice.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'unitPrice', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-emerald-950/20 border border-emerald-500/20 rounded-md text-emerald-400 font-bold px-2 w-full"/></div>
                                                                <div className="w-[1px] h-8 bg-white/10 hidden sm:block mb-1"></div>
                                                                <div className="flex-1 min-w-[80px]"><span className="text-[9px] text-zinc-500 font-bold uppercase block mb-1.5">Acheté (Moyen)</span><Input type="number" value={asset.buyPrice ? Number(asset.buyPrice.toFixed(2)) : ""} onChange={(e) => updateAssetDetail(asset.id, 'buyPrice', e.target.value)} onBlur={handleBlur} className="h-8 text-xs bg-black/50 border border-white/5 rounded-md text-zinc-400 px-2 w-full"/></div>
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
                                                                        {(asset.loanCost || 0) > 0 && <div className="text-[8px] md:text-[9px] text-blue-400 mt-0.5 truncate border border-blue-500/20 px-1.5 py-0.5 rounded bg-blue-500/5">Rentable à partir de: {formatEuro(breakeven)}</div>}
                                                                    </>
                                                                ) : isEditableType && gainPercent !== 0 ? (
                                                                    <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shrink-0 border ${gainPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                                        {gainPercent > 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                                                                    </span>
                                                                ) : (<div className="text-xs md:text-sm font-bold text-zinc-500 truncate">Total</div>)}
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