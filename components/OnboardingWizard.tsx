"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, User, Wallet, Activity, TrendingUp, Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

interface OnboardingProps {
  onFinish: () => void;
}

const SLIDES = [
  {
    id: "welcome",
    icon: Sparkles,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    title: "Bienvenue sur Nexus",
    desc: "L'outil ultime pour structurer, analyser et propulser votre patrimoine vers de nouveaux sommets."
  },
  {
    id: "patrimoine",
    icon: Wallet,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    title: "Vue 360°",
    desc: "Centralisez Immobilier, Bourse, Crypto et Cash. Visualisez votre Valeur Nette en temps réel."
  },
  {
    id: "flux",
    icon: Activity,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    title: "Maîtrise des Flux",
    desc: "Analysez vos revenus et dépenses pour dégager une capacité d'investissement maximale."
  },
  {
    id: "futur",
    icon: TrendingUp,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    title: "Projection & Futur",
    desc: "Simulez vos rentabilités locatives et projetez votre richesse sur 10, 20 ou 30 ans."
  }
];

const PremiumInput = ({ value, onChange, placeholder, icon: Icon, type = "text" }: any) => (
  <div className="group relative w-full">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors">
      <Icon size={20} />
    </div>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-12 h-14 bg-zinc-900/50 border-white/10 text-white text-lg placeholder:text-zinc-600 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
    />
  </div>
);

export default function OnboardingWizard({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", age: "" });
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step < SLIDES.length + 1) {
      setDirection(1);
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (!identity.firstName) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. On met à jour le profil
      await supabase.auth.updateUser({
        data: { 
            full_name: `${identity.firstName} ${identity.lastName}`,
            onboarding_complete: true // <--- LA CLEF EST ICI (Flag de fin)
        }
      });
      
      // 2. On s'assure qu'une ligne existe dans la table profiles
      await supabase.from('profiles').upsert({
        id: user.id,
        updated_at: new Date(),
      });
    }
    setLoading(false);
    onFinish(); // On ferme le wizard
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-[40px] shadow-2xl shadow-blue-900/20 relative overflow-hidden flex flex-col min-h-[550px]">
        
        <div className="px-8 pt-8 flex gap-2">
            {Array.from({ length: SLIDES.length + 2 }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-gradient-to-r from-blue-500 to-violet-500" : "bg-white/10"}`}></div>
            ))}
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 relative">
          <AnimatePresence custom={direction} mode="wait">
            {step < SLIDES.length ? (
                <motion.div key={step} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="text-center space-y-8">
                    {(() => { const Icon = SLIDES[step].icon; return (<div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center ${SLIDES[step].bg} ${SLIDES[step].color} shadow-lg shadow-black/50 border border-white/5`}><Icon size={40} strokeWidth={1.5} /></div>); })()}
                    <div><h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">{SLIDES[step].title}</h2><p className="text-zinc-400 text-lg font-light leading-relaxed">{SLIDES[step].desc}</p></div>
                </motion.div>
            ) : step === SLIDES.length ? (
                <motion.div key="identity" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-8">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center text-white mb-6 border border-white/10 shadow-lg"><User size={36} /></div>
                        <h2 className="text-2xl font-bold text-white mb-2">Faisons connaissance</h2>
                        <p className="text-zinc-400 text-sm">Ces informations personnalisent votre interface.</p>
                    </div>
                    <div className="space-y-4">
                        <PremiumInput icon={User} placeholder="Prénom" value={identity.firstName} onChange={(val: string) => setIdentity({...identity, firstName: val})} />
                        <PremiumInput icon={User} placeholder="Nom" value={identity.lastName} onChange={(val: string) => setIdentity({...identity, lastName: val})} />
                        <PremiumInput icon={Activity} placeholder="Âge (Optionnel)" type="number" value={identity.age} onChange={(val: string) => setIdentity({...identity, age: val})} />
                    </div>
                </motion.div>
            ) : (
                <motion.div key="finish" variants={variants} initial="enter" animate="center" className="text-center space-y-8">
                    <div className="w-28 h-28 mx-auto bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center text-white shadow-[0_0_60px_-10px_rgba(79,70,229,0.5)] animate-pulse"><Check size={48} strokeWidth={3} /></div>
                    <div><h2 className="text-3xl font-black text-white">Tout est prêt !</h2><p className="text-zinc-400 mt-2">Votre cockpit a été généré avec succès.</p></div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 flex items-center justify-between gap-4 bg-zinc-950/50 backdrop-blur-md border-t border-white/5">
            {step < SLIDES.length + 1 && (
                <Button onClick={handleBack} disabled={step === 0} className={`h-14 w-14 rounded-2xl border border-white/10 bg-zinc-900 text-white hover:bg-zinc-800 transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><ArrowLeft size={20} /></Button>
            )}
            {step < SLIDES.length + 1 ? (
                <Button onClick={handleNext} className="flex-1 h-14 bg-white text-black hover:bg-zinc-200 font-bold rounded-2xl text-lg shadow-lg transition-all">{step === SLIDES.length ? "Terminer" : "Continuer"} <ArrowRight size={20} className="ml-2" /></Button>
            ) : (
                <Button onClick={handleFinish} disabled={loading} className="w-full h-14 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black uppercase tracking-wide rounded-2xl text-lg shadow-lg shadow-violet-900/20 transition-all">{loading ? <Loader2 className="animate-spin" /> : "Lancer l'expérience"}</Button>
            )}
        </div>
      </motion.div>
    </div>
  );
}