"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, User, Building2, TrendingUp, Bitcoin, PiggyBank, Briefcase, Home, ShoppingCart, Car, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";

interface OnboardingProps {
  onFinish: () => void;
}

// --- CORRECTION DU BUG CLAVIER ---
// Le composant doit être défini À L'EXTÉRIEUR de la fonction principale
const PremiumInput = ({ value, onChange, placeholder, icon: Icon, type = "text", autoFocus = false, onEnter }: any) => (
  <div className="group relative transition-all duration-300 w-full">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
      <Icon size={20} />
    </div>
    <Input
      autoFocus={autoFocus}
      type={type}
      value={value === 0 ? "" : value} // Affiche vide si 0 pour éviter de devoir effacer
      onChange={onChange}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      placeholder={placeholder}
      className="pl-12 h-14 bg-zinc-900/50 border-zinc-800 text-white text-lg placeholder:text-zinc-600 focus:ring-emerald-500/50 focus:border-emerald-500 rounded-xl transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  </div>
);

export default function OnboardingWizard({ onFinish }: OnboardingProps) {
  // 0: Identité, 1: Patrimoine, 2: Revenus, 3: Loyer, 4: Courses, 5: Transport, 6: Loisirs, 7: Fin
  const [step, setStep] = useState(0);
  
  // DATA STATES
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", age: "" });
  const [assets, setAssets] = useState({ realEstate: "", stocks: "", crypto: "", cash: "" });
  const [income, setIncome] = useState("");
  
  // Dépenses détaillées
  const [expenses, setExpenses] = useState({
    housing: "",    // Loyer / Crédit
    food: "",       // Courses
    transport: "",  // Essence / Metro
    leisure: ""     // Abos / Sorties
  });

  const handleNext = () => {
    triggerHaptic("light");
    setStep((prev) => prev + 1);
  };

  const handleFinish = () => {
    triggerHaptic("success");
    
    // Calcul du total des dépenses
    const totalExpenses = 
      (parseFloat(expenses.housing) || 0) +
      (parseFloat(expenses.food) || 0) +
      (parseFloat(expenses.transport) || 0) +
      (parseFloat(expenses.leisure) || 0);

    const userData = {
      identity,
      assets: {
        realEstate: parseFloat(assets.realEstate) || 0,
        stocks: parseFloat(assets.stocks) || 0,
        crypto: parseFloat(assets.crypto) || 0,
        cash: parseFloat(assets.cash) || 0,
      },
      budget: {
        income: parseFloat(income) || 0,
        expenses: totalExpenses, // On stocke le total pour le dashboard simple
        details: expenses // On garde le détail pour plus tard
      },
      onboardingComplete: true
    };
    
    localStorage.setItem("userProfile", JSON.stringify(userData));
    localStorage.setItem("myBudget", JSON.stringify({ 
        income: userData.budget.income,
        expenses: [
            { id: "1", name: "Logement", amount: parseFloat(expenses.housing) || 0 },
            { id: "2", name: "Alimentation", amount: parseFloat(expenses.food) || 0 },
            { id: "3", name: "Transport", amount: parseFloat(expenses.transport) || 0 },
            { id: "4", name: "Loisirs & Abos", amount: parseFloat(expenses.leisure) || 0 },
        ] 
    }));
    
    onFinish();
  };

  // Titres dynamiques selon l'étape
  const getStepTitle = () => {
    if (step === 3) return "Logement 🏠";
    if (step === 4) return "Alimentation 🛒";
    if (step === 5) return "Transport 🚗";
    if (step === 6) return "Loisirs & Abos 🍿";
    return "Vos Dépenses";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)] min-h-[400px] flex flex-col">
          
          {/* BARRE DE PROGRESSION */}
          <div className="flex gap-1 mb-8">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-emerald-500" : "bg-zinc-800"}`} />
            ))}
          </div>

          <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            
            {/* ETAPE 0 : IDENTITÉ */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Bienvenue 👋</h2>
                  <p className="text-zinc-400">Quelques infos pour paramétrer votre profil.</p>
                </div>
                <div className="space-y-4">
                    <PremiumInput icon={User} placeholder="Prénom" value={identity.firstName} onChange={(e: any) => setIdentity({...identity, firstName: e.target.value})} />
                    <PremiumInput icon={User} placeholder="Nom" value={identity.lastName} onChange={(e: any) => setIdentity({...identity, lastName: e.target.value})} />
                    <PremiumInput type="number" icon={Check} placeholder="Âge" value={identity.age} onChange={(e: any) => setIdentity({...identity, age: e.target.value})} onEnter={handleNext} />
                </div>
              </motion.div>
            )}

            {/* ETAPE 1 : PATRIMOINE */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Votre Patrimoine 🏛️</h2>
                  <p className="text-zinc-400">Estimation de vos actifs actuels.</p>
                </div>
                <div className="space-y-3">
                  <PremiumInput type="number" icon={Building2} placeholder="Immobilier" value={assets.realEstate} onChange={(e: any) => setAssets({...assets, realEstate: e.target.value})} />
                  <PremiumInput type="number" icon={TrendingUp} placeholder="Bourse" value={assets.stocks} onChange={(e: any) => setAssets({...assets, stocks: e.target.value})} />
                  <PremiumInput type="number" icon={Bitcoin} placeholder="Crypto" value={assets.crypto} onChange={(e: any) => setAssets({...assets, crypto: e.target.value})} />
                  <PremiumInput type="number" icon={PiggyBank} placeholder="Cash / Épargne" value={assets.cash} onChange={(e: any) => setAssets({...assets, cash: e.target.value})} onEnter={handleNext} />
                </div>
              </motion.div>
            )}

            {/* ETAPE 2 : REVENUS */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                 <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Vos Revenus 💸</h2>
                  <p className="text-zinc-400">Salaire Net Mensuel (avant impôt).</p>
                </div>
                <div className="space-y-4 py-4">
                    <PremiumInput autoFocus type="number" icon={Briefcase} placeholder="Montant Net Mensuel" value={income} onChange={(e: any) => setIncome(e.target.value)} onEnter={handleNext} />
                </div>
              </motion.div>
            )}

            {/* ETAPES DEPENSES (3, 4, 5, 6) */}
            {[3, 4, 5, 6].includes(step) && (
                <motion.div key={`step${step}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-white">{getStepTitle()}</h2>
                        <p className="text-zinc-400">Estimation mensuelle.</p>
                    </div>
                    <div className="space-y-4 py-4">
                        {step === 3 && <PremiumInput autoFocus type="number" icon={Home} placeholder="Loyer ou Crédit" value={expenses.housing} onChange={(e: any) => setExpenses({...expenses, housing: e.target.value})} onEnter={handleNext} />}
                        {step === 4 && <PremiumInput autoFocus type="number" icon={ShoppingCart} placeholder="Supermarché & Repas" value={expenses.food} onChange={(e: any) => setExpenses({...expenses, food: e.target.value})} onEnter={handleNext} />}
                        {step === 5 && <PremiumInput autoFocus type="number" icon={Car} placeholder="Essence, Transport, Assurance" value={expenses.transport} onChange={(e: any) => setExpenses({...expenses, transport: e.target.value})} onEnter={handleNext} />}
                        {step === 6 && <PremiumInput autoFocus type="number" icon={Coffee} placeholder="Netflix, Sport, Sorties..." value={expenses.leisure} onChange={(e: any) => setExpenses({...expenses, leisure: e.target.value})} onEnter={handleNext} />}
                    </div>
                </motion.div>
            )}

             {/* ETAPE 7 : FINISH */}
             {step === 7 && (
              <motion.div key="step7" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-6">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    <Check size={40} className="text-black font-bold" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white">Profil Configuré !</h2>
                    <p className="text-zinc-400 mt-2">Votre tableau de bord est prêt.</p>
                </div>
                <Button onClick={handleFinish} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-14 rounded-xl text-lg mt-4">
                    Accéder à Immotech
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
          </div>

          {/* NAVIGATION BUTTONS */}
          {step < 7 && (
            <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
                <Button 
                    onClick={handleNext} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-12 rounded-xl font-semibold shadow-lg shadow-emerald-900/20 w-full md:w-auto"
                >
                    Suivant <ArrowRight size={18} className="ml-2" />
                </Button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}