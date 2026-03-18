"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Coins, Home, ShoppingCart, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

interface BudgetWizardProps {
  onComplete: () => void;
}

export default function BudgetWizard({ onComplete }: BudgetWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Les données qu'on récolte
  const [income, setIncome] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState("");
  const [variableExpenses, setVariableExpenses] = useState("");

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Formatage des données pour ton architecture Supabase actuelle
      const budgetData = {
        income: Number(income) || 0,
        details: [
          { name: "Charges fixes (Loyer, Factures)", amount: Number(fixedExpenses) || 0 },
          { name: "Dépenses courantes (Courses, Loisirs)", amount: Number(variableExpenses) || 0 }
        ]
      };

      await supabase.from('profiles').update({
        budget_json: budgetData
      }).eq('id', user.id);

      onComplete(); // Ferme le guide et recharge la page

    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#020202] text-white flex flex-col items-center justify-center p-6">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        
        {/* Barre de progression */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-yellow-500" : "bg-white/10"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ÉTAPE 1 : REVENUS */}
          {step === 1 && (
            <motion.div key="step1" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center">
              <div className="w-20 h-20 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mb-6">
                <Coins size={36} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black">Quels sont vos revenus nets mensuels ?</h2>
              <p className="text-zinc-400">Salaires, aides, revenus locatifs nets.</p>
              
              <div className="relative max-w-xs mx-auto pt-6">
                <Input 
                  type="number" value={income} onChange={(e) => setIncome(e.target.value)} autoFocus
                  className="bg-white/5 border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-yellow-500/50"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-3">€</span>
              </div>

              <Button onClick={handleNext} disabled={!income} className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg rounded-2xl mt-8">
                Continuer <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* ÉTAPE 2 : CHARGES FIXES */}
          {step === 2 && (
            <motion.div key="step2" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center">
              <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-6">
                <Home size={36} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black">Combien vous coûtent vos charges fixes ?</h2>
              <p className="text-zinc-400">Loyer, crédits, assurances, abonnements (les dépenses obligatoires).</p>
              
              <div className="relative max-w-xs mx-auto pt-6">
                <Input 
                  type="number" value={fixedExpenses} onChange={(e) => setFixedExpenses(e.target.value)} autoFocus
                  className="bg-white/5 border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-blue-500/50"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-3">€</span>
              </div>

              <div className="flex gap-4 mt-8">
                <Button variant="ghost" onClick={handleBack} className="h-14 px-6 text-zinc-400 hover:text-white"><ArrowLeft /></Button>
                <Button onClick={handleNext} disabled={!fixedExpenses} className="flex-1 h-14 bg-white hover:bg-zinc-200 text-black font-bold text-lg rounded-2xl">
                  Continuer
                </Button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 3 : DÉPENSES COURANTES */}
          {step === 3 && (
            <motion.div key="step3" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center">
              <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6">
                <ShoppingCart size={36} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black">Et pour vivre au quotidien ?</h2>
              <p className="text-zinc-400">Estimation mensuelle pour les courses, restaurants, loisirs et shopping.</p>
              
              <div className="relative max-w-xs mx-auto pt-6">
                <Input 
                  type="number" value={variableExpenses} onChange={(e) => setVariableExpenses(e.target.value)} autoFocus
                  className="bg-white/5 border-white/10 text-center text-3xl h-20 rounded-2xl pr-12 focus:border-emerald-500/50"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-black mt-3">€</span>
              </div>

              <div className="flex gap-4 mt-8">
                <Button variant="ghost" onClick={handleBack} className="h-14 px-6 text-zinc-400 hover:text-white"><ArrowLeft /></Button>
                <Button onClick={handleSave} disabled={!variableExpenses || loading} className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : "Générer mon budget"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}