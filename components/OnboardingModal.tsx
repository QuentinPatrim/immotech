"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Wallet, LineChart, Rocket, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    id: "welcome",
    title: "Bienvenue dans votre cockpit.",
    subtitle: "Faisons le point, simplement.",
    description: "La finance utilise souvent des mots compliqués pour faire peur. Ici, on simplifie tout. Nexus est conçu pour vous donner une vision claire de votre argent, sans jargon inutile.",
    icon: BookOpen,
    color: "text-emerald-400",
    bgGlow: "bg-emerald-500/20",
  },
  {
    id: "patrimoine",
    title: "1. Mon Patrimoine",
    subtitle: "L'inventaire de ce que vous possédez.",
    description: "C'est la photo à l'instant T de votre richesse. Ajoutez-y l'argent sur vos comptes, la valeur de votre maison, ou vos investissements. Oubliez le terme 'PRU', on vous demandera juste : 'À quel prix l'avez-vous acheté ?'.",
    icon: Wallet,
    color: "text-indigo-400",
    bgGlow: "bg-indigo-500/20",
  },
  {
    id: "budget",
    title: "2. Mon Budget",
    subtitle: "Le moteur de votre liberté.",
    description: "Combien gagnez-vous chaque mois ? Combien dépensez-vous ? La différence entre les deux s'appelle votre 'Capacité d'épargne'. C'est ce chiffre qui va travailler pour vous.",
    icon: LineChart,
    color: "text-blue-400",
    bgGlow: "bg-blue-500/20",
  },
  {
    id: "projection",
    title: "3. Ma Projection",
    subtitle: "La machine à voyager dans le temps.",
    description: "Une fois votre Patrimoine et votre Budget remplis, notre IA prend le relais. Elle va calculer l'effet boule de neige (les intérêts composés) pour vous montrer exactement quand vous serez libre financièrement.",
    icon: Rocket,
    color: "text-violet-400",
    bgGlow: "bg-violet-500/20",
  }
];

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // On vérifie si l'utilisateur a déjà vu le tutoriel
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("nexus_tutorial_seen");
    if (!hasSeenTutorial) {
      // Petit délai pour laisser le dashboard charger derrière
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("nexus_tutorial_seen", "true");
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Fond flouté sombre */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Fenêtre modale */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Lueur dynamique en fond */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[80px] rounded-full transition-colors duration-700 opacity-30 ${STEPS[currentStep].bgGlow}`} />

        <button onClick={handleClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10">
            <X size={20} />
        </button>

        <div className="p-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className={`w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-lg ${STEPS[currentStep].color}`}>
                <StepIcon size={32} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">{STEPS[currentStep].title}</h2>
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">{STEPS[currentStep].subtitle}</p>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mt-4">
                {STEPS[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Barre de navigation */}
        <div className="bg-white/[0.02] border-t border-white/[0.05] p-6 flex items-center justify-between">
            {/* Points de progression */}
            <div className="flex gap-2">
                {STEPS.map((_, index) => (
                    <div 
                        key={index} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === currentStep ? "w-6 bg-white" : "w-1.5 bg-zinc-700"}`}
                    />
                ))}
            </div>

            <Button 
                onClick={handleNext}
                className="bg-white hover:bg-zinc-200 text-black font-bold rounded-xl px-6 transition-all"
            >
                {currentStep === STEPS.length - 1 ? (
                    <span className="flex items-center gap-2">Démarrer <Check size={16} /></span>
                ) : (
                    <span className="flex items-center gap-2">Suivant <ArrowRight size={16} /></span>
                )}
            </Button>
        </div>

      </motion.div>
    </div>
  );
}