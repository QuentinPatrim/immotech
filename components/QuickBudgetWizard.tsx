"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Wallet, CheckCircle, Plus, Trash2, Banknote, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { triggerHaptic } from "@/lib/haptics";

interface QuickBudgetWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

// Catégories par défaut
const DEFAULT_EXPENSES = [
  { id: "1", name: "Loyer / Crédit Immo", amount: 0 },
  { id: "2", name: "Courses Alimentaires", amount: 0 },
  { id: "3", name: "Transports & Voiture", amount: 0 },
  { id: "4", name: "Abonnements (Tel, Internet, Streaming)", amount: 0 },
];

export default function QuickBudgetWizard({ isOpen, onClose }: QuickBudgetWizardProps) {
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(DEFAULT_EXPENSES);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset quand on ouvre
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      // On essaie de pré-remplir si existant
      const saved = localStorage.getItem("myBudget");
      if (saved) {
        const b = JSON.parse(saved);
        setIncome(b.income || 0);
        if (b.expenses && b.expenses.length > 0) {
            setExpenses(b.expenses);
        }
      }
    }
  }, [isOpen]);

  const handleNext = () => {
    triggerHaptic("light");
    setStep(step + 1);
  };

  const handleFinish = () => {
    triggerHaptic("success");
    // Sauvegarde
    const budgetData = {
      income,
      expenses,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("myBudget", JSON.stringify(budgetData));
    
    // Animation de succès
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      onClose();
      window.location.reload(); // Force le rafraichissement du dashboard
    }, 1500);
  };

  const updateExpense = (id: string, field: "name" | "amount", value: any) => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { id: Date.now().toString(), name: "", amount: 0 }]);
  };

  const removeExpenseRow = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* HEADER */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Wallet size={16} />
            </div>
            <h2 className="font-bold text-white text-sm">Assistant Budget</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            
            {/* ETAPE 1 : REVENUS */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-white">Vos Revenus</h3>
                    <p className="text-zinc-400 text-sm">Quel est votre salaire net mensuel (avant impôts) ?</p>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 flex flex-col items-center gap-4">
                    <Banknote size={40} className="text-emerald-500" />
                    <div className="w-full">
                        <label className="text-xs text-zinc-500 mb-1 block uppercase font-bold tracking-wider">Net Mensuel</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">€</span>
                            {/* CORRECTION ICI : Gestion du 0 et couleur du texte */}
                            <Input 
                                type="number" 
                                value={income === 0 ? "" : income} 
                                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                                className="pl-8 text-lg font-bold bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-emerald-500 h-12"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                <Button onClick={handleNext} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12 rounded-xl text-base">
                    Suivant <ArrowRight size={18} className="ml-2" />
                </Button>
              </motion.div>
            )}

            {/* ETAPE 2 : DEPENSES */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold text-white">Vos Charges fixes</h3>
                    <p className="text-zinc-400 text-xs">Estimez vos sorties d'argent mensuelles.</p>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {expenses.map((expense) => (
                        <div key={expense.id} className="flex gap-2 items-center">
                            {/* CORRECTION ICI : Inputs text-white */}
                            <Input 
                                value={expense.name}
                                onChange={(e) => updateExpense(expense.id, "name", e.target.value)}
                                placeholder="Nom (ex: Loyer)"
                                className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 text-sm h-10"
                            />
                            <div className="relative w-28 shrink-0">
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">€</span>
                                <Input 
                                    type="number"
                                    value={expense.amount === 0 ? "" : expense.amount}
                                    onChange={(e) => updateExpense(expense.id, "amount", parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="bg-zinc-900/80 border-zinc-800 text-white text-right pr-6 h-10 placeholder:text-zinc-600"
                                />
                            </div>
                            <button onClick={() => removeExpenseRow(expense.id)} className="text-zinc-600 hover:text-red-500 p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <Button onClick={addExpenseRow} variant="outline" className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-900 h-9 text-xs">
                        <Plus size={14} className="mr-1"/> Ajouter une ligne
                    </Button>
                </div>

                <div className="pt-2 border-t border-zinc-800 mt-2">
                    <div className="flex justify-between items-center mb-4 text-sm">
                        <span className="text-zinc-400">Total Dépenses :</span>
                        <span className="font-bold text-red-400">
                             {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(expenses.reduce((acc, e) => acc + e.amount, 0))}
                        </span>
                    </div>
                    <Button onClick={handleFinish} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl text-base shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        Valider mon Budget <CheckCircle size={18} className="ml-2" />
                    </Button>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>

        {/* PROGRESS BAR */}
        <div className="h-1 bg-zinc-900 w-full">
            <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: "0%" }}
                animate={{ width: step === 1 ? "50%" : "100%" }}
            />
        </div>

        {/* CONFETTI OVERLAY */}
        {showConfetti && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
                 <motion.div initial={{scale:0}} animate={{scale:1}} className="text-center">
                     <div className="text-6xl mb-4">🎉</div>
                     <h3 className="text-2xl font-bold text-white">Budget Configuré !</h3>
                 </motion.div>
             </div>
        )}

      </motion.div>
    </div>
  );
}