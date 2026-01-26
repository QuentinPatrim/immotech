"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, User, Wallet, Building2, TrendingUp, Bitcoin, PiggyBank, Briefcase, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";

interface OnboardingProps {
  onFinish: () => void;
}

export default function OnboardingWizard({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0);
  
  // DATA STATES
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", age: "" });
  const [assets, setAssets] = useState({ realEstate: "", stocks: "", crypto: "", cash: "" });
  const [budget, setBudget] = useState({ income: "", expenses: "" });

  // CSS pour cacher les flèches des inputs nombres
  const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const handleNext = () => {
    triggerHaptic("light");
    setStep((prev) => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
        // Validation simple : on avance si ce n'est pas la dernière étape
        if (step < 3) handleNext();
        else handleFinish();
    }
  };

  const handleFinish = () => {
    triggerHaptic("success");
    // Sauvegarde globale
    const userData = {
      identity,
      assets: {
        realEstate: parseFloat(assets.realEstate) || 0,
        stocks: parseFloat(assets.stocks) || 0,
        crypto: parseFloat(assets.crypto) || 0,
        cash: parseFloat(assets.cash) || 0,
      },
      budget: {
        income: parseFloat(budget.income) || 0,
        expenses: parseFloat(budget.expenses) || 0,
      },
      onboardingComplete: true
    };
    
    localStorage.setItem("userProfile", JSON.stringify(userData));
    localStorage.setItem("myBudget", JSON.stringify({ // Compatibilité avec l'ancien système
        income: userData.budget.income,
        expenses: [{ id: "1", name: "Charges Globales", amount: userData.budget.expenses }] 
    }));
    
    onFinish();
  };

  // Composant pour les Inputs "Premium"
  const PremiumInput = ({ value, onChange, placeholder, icon: Icon, type = "text", autoFocus = false }: any) => (
    <div className="group relative transition-all duration-300">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
        <Icon size={20} />
      </div>
      <Input
        autoFocus={autoFocus}
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`pl-12 h-14 bg-zinc-900/50 border-zinc-800 text-white text-lg placeholder:text-zinc-600 focus:ring-emerald-500/50 focus:border-emerald-500 rounded-xl transition-all ${type === 'number' ? noSpinnerClass : ''}`}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black">
      {/* Background Ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)]">
          
          {/* PROGRESS BAR */}
          <div className="flex gap-2 mb-8">
            {[0, 1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? "bg-emerald-500" : "bg-zinc-800"}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            
            {/* ETAPE 0 : IDENTITÉ */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Bienvenue 👋</h2>
                  <p className="text-zinc-400">Commençons par faire connaissance.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInput 
                        autoFocus
                        icon={User} 
                        placeholder="Prénom" 
                        value={identity.firstName} 
                        onChange={(e: any) => setIdentity({...identity, firstName: e.target.value})} 
                    />
                    <PremiumInput 
                        icon={User} 
                        placeholder="Nom" 
                        value={identity.lastName} 
                        onChange={(e: any) => setIdentity({...identity, lastName: e.target.value})} 
                    />
                  </div>
                  <PremiumInput 
                    type="number"
                    icon={Check} 
                    placeholder="Votre âge" 
                    value={identity.age} 
                    onChange={(e: any) => setIdentity({...identity, age: e.target.value})} 
                  />
                </div>
              </motion.div>
            )}

            {/* ETAPE 1 : PATRIMOINE */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Votre Patrimoine 🏛️</h2>
                  <p className="text-zinc-400">Estimez la valeur actuelle de vos actifs.</p>
                </div>

                <div className="space-y-3">
                  <PremiumInput type="number" icon={Building2} placeholder="Immobilier (Estimation)" value={assets.realEstate} onChange={(e: any) => setAssets({...assets, realEstate: e.target.value})} />
                  <PremiumInput type="number" icon={TrendingUp} placeholder="Bourse (PEA, CTO...)" value={assets.stocks} onChange={(e: any) => setAssets({...assets, stocks: e.target.value})} />
                  <PremiumInput type="number" icon={Bitcoin} placeholder="Cryptomonnaies" value={assets.crypto} onChange={(e: any) => setAssets({...assets, crypto: e.target.value})} />
                  <PremiumInput type="number" icon={PiggyBank} placeholder="Épargne & Cash" value={assets.cash} onChange={(e: any) => setAssets({...assets, cash: e.target.value})} />
                </div>
              </motion.div>
            )}

            {/* ETAPE 2 : BUDGET */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                 <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Vos Flux Mensuels 💸</h2>
                  <p className="text-zinc-400">Pour calculer votre capacité d'épargne.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider ml-1">Entrées</label>
                        <PremiumInput autoFocus type="number" icon={Briefcase} placeholder="Revenus Nets Mensuels" value={budget.income} onChange={(e: any) => setBudget({...budget, income: e.target.value})} />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-red-400 uppercase tracking-wider ml-1">Sorties</label>
                        <PremiumInput type="number" icon={CreditCard} placeholder="Total Dépenses Fixes" value={budget.expenses} onChange={(e: any) => setBudget({...budget, expenses: e.target.value})} />
                    </div>
                </div>
              </motion.div>
            )}

             {/* ETAPE 3 : FINISH */}
             {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-6">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    <Check size={40} className="text-black font-bold" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white">Tout est prêt !</h2>
                    <p className="text-zinc-400 mt-2">Votre tableau de bord a été configuré avec succès.</p>
                </div>
                <Button onClick={handleFinish} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-14 rounded-xl text-lg mt-4">
                    Accéder à mon Dashboard
                </Button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* NAVIGATION BUTTONS */}
          {step < 3 && (
            <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
                <Button 
                    onClick={handleNext} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-12 rounded-xl font-semibold shadow-lg shadow-emerald-900/20"
                >
                    {step === 2 ? "Terminer" : "Suivant"} <ArrowRight size={18} className="ml-2" />
                </Button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}