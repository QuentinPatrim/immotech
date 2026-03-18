"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Building2, TrendingUp, PiggyBank, ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NexusLogo } from "@/components/NexusLogo";

export default function MagicOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fausse étape d'analyse pour l'effet "Waouh"
  useEffect(() => {
    if (step === 3) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
        setStep(4);
      }, 3000); // 3 secondes de chargement magique
      return () => clearTimeout(timer);
    }
  }, [step]);

  const nextStep = () => setStep((prev) => prev + 1);

  // FIX TypeScript : On déclare explicitement que ceci est du type "Variants"
  const slideVariants: Variants = {
    hidden: { opacity: 0, x: 50, filter: "blur(10px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, x: -50, filter: "blur(10px)", transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header (Logo + Progession) */}
      <div className="absolute top-8 left-0 right-0 flex justify-between items-center px-8 max-w-[1000px] mx-auto w-full z-50">
        <div className="flex items-center gap-2 text-emerald-500">
          <NexusLogo className="w-6 h-6" />
          <span className="text-white font-bold tracking-widest uppercase text-sm">Nexus</span>
        </div>
        {step < 4 && (
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "w-8 bg-emerald-500" : "w-4 bg-white/10"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-[600px] relative z-10">
        <AnimatePresence mode="wait">
          
          {/* ETAPE 1 : LE PRÉNOM */}
          {step === 1 && (
            <motion.div key="step1" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-white/5 border border-white/10 mb-4">
                <Sparkles className="text-emerald-400 w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">Faisons connaissance.</h1>
              <p className="text-zinc-400 text-lg">Comment souhaitez-vous que nous vous appelions ?</p>
              
              <div className="pt-8 space-y-6">
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Votre prénom" 
                  className="bg-white/5 border-white/10 text-center text-2xl h-16 rounded-2xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && name && nextStep()}
                />
                <Button 
                  onClick={nextStep} 
                  disabled={!name.trim()} 
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl transition-all"
                >
                  Continuer <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ETAPE 2 : L'OBJECTIF */}
          {step === 2 && (
            <motion.div key="step2" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Quel est votre objectif principal, {name} ?</h1>
                <p className="text-zinc-400">Nous personnaliserons votre tableau de bord en fonction.</p>
              </div>

              <div className="grid gap-4 pt-4">
                {[
                  { id: "immo", icon: Building2, title: "Investir dans l'immobilier", desc: "Créer du déficit foncier et du cashflow" },
                  { id: "retraite", icon: TrendingUp, title: "Préparer ma retraite", desc: "Intérêts composés et bourse" },
                  { id: "epargne", icon: PiggyBank, title: "Optimiser mon épargne", desc: "Faire mieux que le Livret A" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setGoal(item.id)}
                    className={`p-6 rounded-2xl border text-left transition-all duration-300 flex items-center gap-6 group ${
                      goal === item.id ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className={`p-4 rounded-full transition-colors ${goal === item.id ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 group-hover:text-white"}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${goal === item.id ? "text-white" : "text-zinc-200"}`}>{item.title}</h3>
                      <p className="text-zinc-500 text-sm mt-1">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-zinc-500 hover:text-white">Retour</Button>
                <Button onClick={nextStep} disabled={!goal} className="h-12 px-8 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl">
                  Suivant
                </Button>
              </div>
            </motion.div>
          )}

          {/* ETAPE 3 : LA MAGIE (Chargement fictif) */}
          {step === 3 && (
            <motion.div key="step3" variants={slideVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center text-center space-y-8 py-20">
              <div className="relative">
                <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin h-24 w-24"></div>
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-xl">
                  <ShieldCheck className="text-emerald-400 w-10 h-10" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold animate-pulse">Configuration de votre espace...</h2>
                <p className="text-zinc-500 text-sm">
                  {goal === 'immo' ? "Activation du simulateur LMNP/Nu..." : 
                   goal === 'retraite' ? "Mise en place de l'algorithme d'intérêts composés..." : 
                   "Calcul de vos leviers d'optimisation..."}
                </p>
              </div>
            </motion.div>
          )}

          {/* ETAPE 4 : SUCCÈS */}
          {step === 4 && (
            <motion.div key="step4" variants={slideVariants} initial="hidden" animate="visible" className="text-center space-y-8 py-10">
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]"
              >
                <CheckCircle2 className="text-black w-12 h-12" />
              </motion.div>
              
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">Tout est prêt, {name}.</h1>
                <p className="text-zinc-400 text-lg">Votre tableau de bord sécurisé vous attend.</p>
              </div>

              <div className="pt-8">
                {/* Ici on redirige vers le vrai dashboard de ton app */}
                <Button onClick={() => router.push('/dashboard')} className="h-16 px-12 bg-white hover:bg-zinc-200 text-black font-black text-lg rounded-2xl w-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all">
                  Accéder à mon espace
                </Button>
              </div>
              <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold pt-4 flex items-center justify-center gap-2">
                <Lock size={12} /> Données chiffrées de bout en bout
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}