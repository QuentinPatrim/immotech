"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Check, User, Building2, TrendingUp, Bitcoin, 
  PiggyBank, Briefcase, Home, ShoppingCart, Car, Coffee, 
  LayoutDashboard, PieChart, Calculator, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";

interface OnboardingProps {
  onFinish: () => void;
}

const cleanNumber = (val: any): number => {
    if (!val) return 0;
    const cleanStr = String(val).replace(/,/g, ".").replace(/\s/g, "").trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
};

// MODIFICATION ICI : Ajout du prop "numeric" pour gérer le type de clavier
const PremiumInput = ({ value, onValueChange, placeholder, icon: Icon, autoFocus = false, onEnter, numeric = true }: any) => (
  <div className="group relative transition-all duration-300 w-full">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
      <Icon size={20} />
    </div>
    <Input
      autoFocus={autoFocus}
      type="text"
      // Si numeric est vrai (défaut), clavier chiffres. Sinon, clavier texte normal.
      inputMode={numeric ? "decimal" : "text"} 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      placeholder={placeholder}
      className="pl-12 h-16 bg-zinc-900/50 border-zinc-800 text-white text-lg placeholder:text-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 rounded-2xl transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc }: any) => (
    <div className="flex gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl items-center">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <Icon size={20} />
        </div>
        <div className="text-left">
            <h4 className="text-white font-bold text-sm">{title}</h4>
            <p className="text-zinc-400 text-xs leading-tight">{desc}</p>
        </div>
    </div>
);

export default function OnboardingWizard({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0);
  
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", age: "" });
  const [assets, setAssets] = useState({ realEstate: "", stocks: "", crypto: "", cash: "" });
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState({ housing: "", food: "", transport: "", leisure: "" });

  useEffect(() => {
    const scrollContainer = document.getElementById("onboarding-scroll");
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [step]);

  const handleNext = () => {
    triggerHaptic("light");
    setStep((prev) => prev + 1);
  };

  const handleFinish = () => {
    triggerHaptic("success");
    
    // NETTOYAGE
    const finalAssets = {
        realEstate: cleanNumber(assets.realEstate),
        stocks: cleanNumber(assets.stocks),
        crypto: cleanNumber(assets.crypto),
        cash: cleanNumber(assets.cash)
    };
    const finalIncome = cleanNumber(income);
    const finalExpenses = {
        housing: cleanNumber(expenses.housing),
        food: cleanNumber(expenses.food),
        transport: cleanNumber(expenses.transport),
        leisure: cleanNumber(expenses.leisure)
    };
    const totalExpensesVal = finalExpenses.housing + finalExpenses.food + finalExpenses.transport + finalExpenses.leisure;

    // SAUVEGARDE PROFIL
    const userData = {
      identity,
      assets: finalAssets,
      budget: {
        income: finalIncome,
        expenses: totalExpensesVal, 
        details: expenses 
      },
      onboardingComplete: true
    };
    localStorage.setItem("userProfile", JSON.stringify(userData));

    // SAUVEGARDE BUDGET
    localStorage.setItem("myBudget", JSON.stringify({ 
        income: finalIncome,
        expenses: [
            { id: "1", name: "Logement", amount: finalExpenses.housing },
            { id: "2", name: "Alimentation", amount: finalExpenses.food },
            { id: "3", name: "Transport", amount: finalExpenses.transport },
            { id: "4", name: "Loisirs & Abos", amount: finalExpenses.leisure },
        ] 
    }));

    // CREATION LISTE PATRIMOINE
    const initialAssetsList = [];

    if (finalAssets.realEstate > 0) {
        initialAssetsList.push({ id: "init-re-" + Date.now(), name: "Immobilier Principal", value: finalAssets.realEstate, type: "Immobilier", color: "#3b82f6" });
    }
    if (finalAssets.stocks > 0) {
        initialAssetsList.push({ id: "init-st-" + Date.now(), name: "Portefeuille Bourse", value: finalAssets.stocks, type: "Bourse", color: "#10b981" });
    }
    if (finalAssets.crypto > 0) {
        initialAssetsList.push({ id: "init-cr-" + Date.now(), name: "Portefeuille Crypto", value: finalAssets.crypto, type: "Crypto", color: "#8b5cf6" });
    }
    if (finalAssets.cash > 0) {
        initialAssetsList.push({ id: "init-ca-" + Date.now(), name: "Cash & Épargne", value: finalAssets.cash, type: "Cash", color: "#f59e0b" });
    }

    localStorage.setItem("myAssets", JSON.stringify(initialAssetsList));
    
    onFinish();
  };

  const getStepTitle = () => {
    if (step === 6) return "Logement 🏠";
    if (step === 7) return "Alimentation 🛒";
    if (step === 8) return "Transport 🚗";
    if (step === 9) return "Loisirs & Abos 🍿";
    return "Vos Dépenses";
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-900/10 via-black to-black" />
      <motion.div className="relative z-10 w-full h-[100dvh] flex flex-col md:h-auto md:max-w-xl md:mx-auto md:my-10 md:bg-zinc-950 md:border md:border-zinc-800 md:rounded-3xl md:shadow-2xl md:min-h-[600px] md:h-auto">
          
          <div className="pt-safe px-8 pt-6 pb-2 shrink-0">
            {step > 2 && step < 10 && (
               <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                   <motion.div initial={{ width: 0 }} animate={{ width: `${((step - 2) / 8) * 100}%` }} className="h-full bg-emerald-500" />
               </div>
            )}
          </div>

          <div id="onboarding-scroll" className="flex-1 overflow-y-auto px-8 py-4 flex flex-col justify-center">
            <AnimatePresence mode="wait">
                {step === 0 && (
                <motion.div key="intro0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 text-center my-auto">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/50 mb-6">
                        <TrendingUp size={48} className="text-black" />
                    </div>
                    <div><h1 className="text-4xl font-black text-white tracking-tight mb-4">Bienvenue sur <span className="text-emerald-500">ImmoTech</span></h1><p className="text-zinc-400 text-lg leading-relaxed">L'application tout-en-un pour piloter votre patrimoine.</p></div>
                </motion.div>
                )}
                {step === 1 && (
                <motion.div key="intro1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6 my-auto">
                    <div className="text-center mb-8"><h2 className="text-2xl font-bold text-white mb-2">Votre Cockpit Financier 🚀</h2><p className="text-zinc-400">Tout ce dont vous avez besoin, au même endroit.</p></div>
                    <div className="space-y-3">
                        <FeatureCard icon={ShieldCheck} title="Patrimoine Global" desc="Suivez l'évolution de votre Net Worth." />
                        <FeatureCard icon={PieChart} title="Budget & Cashflow" desc="Analysez vos flux mensuels." />
                        <FeatureCard icon={Calculator} title="Simulateur Immo" desc="Calculez la rentabilité de vos projets." />
                    </div>
                </motion.div>
                )}
                {step === 2 && (
                <motion.div key="intro2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center space-y-8 my-auto">
                    <div className="relative"><div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" /><LayoutDashboard size={80} className="text-white relative z-10 mx-auto" /></div>
                    <div><h2 className="text-3xl font-bold text-white mb-4">À vous de jouer !</h2><p className="text-zinc-400 text-lg">Configurons votre espace.</p></div>
                </motion.div>
                )}
                {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 my-auto">
                    <div className="text-center space-y-2"><h2 className="text-3xl font-bold text-white">Qui êtes-vous ? 👤</h2></div>
                    <div className="space-y-4 pt-4">
                        {/* MODIFICATION ICI : numeric={false} pour avoir le clavier texte */}
                        <PremiumInput autoFocus icon={User} placeholder="Prénom" value={identity.firstName} onValueChange={(val: string) => setIdentity({...identity, firstName: val})} numeric={false} />
                        <PremiumInput icon={User} placeholder="Nom" value={identity.lastName} onValueChange={(val: string) => setIdentity({...identity, lastName: val})} numeric={false} />
                        {/* L'âge reste en numérique (numeric={true} par défaut) */}
                        <PremiumInput icon={Check} placeholder="Âge" value={identity.age} onValueChange={(val: string) => setIdentity({...identity, age: val})} onEnter={handleNext} />
                    </div>
                </motion.div>
                )}
                {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 my-auto">
                    <div className="text-center space-y-2"><h2 className="text-2xl font-bold text-white">Votre Patrimoine 🏛️</h2><p className="text-zinc-400">Estimez la valeur actuelle (0 si aucun).</p></div>
                    <div className="space-y-3 pt-2">
                        <PremiumInput autoFocus icon={Building2} placeholder="Immobilier (Est.)" value={assets.realEstate} onValueChange={(val: string) => setAssets({...assets, realEstate: val})} />
                        <PremiumInput icon={TrendingUp} placeholder="Bourse (PEA/CTO)" value={assets.stocks} onValueChange={(val: string) => setAssets({...assets, stocks: val})} />
                        <PremiumInput icon={Bitcoin} placeholder="Crypto" value={assets.crypto} onValueChange={(val: string) => setAssets({...assets, crypto: val})} />
                        <PremiumInput icon={PiggyBank} placeholder="Cash / Épargne" value={assets.cash} onValueChange={(val: string) => setAssets({...assets, cash: val})} onEnter={handleNext} />
                    </div>
                </motion.div>
                )}
                {step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 my-auto">
                    <div className="text-center space-y-2"><h2 className="text-2xl font-bold text-white">Vos Revenus 💸</h2><p className="text-zinc-400">Net Mensuel avant impôt.</p></div>
                    <div className="space-y-4 py-8">
                        <PremiumInput autoFocus icon={Briefcase} placeholder="Montant Net Mensuel" value={income} onValueChange={(val: string) => setIncome(val)} onEnter={handleNext} />
                    </div>
                </motion.div>
                )}
                {[6, 7, 8, 9].includes(step) && (
                    <motion.div key={`step${step}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6 my-auto">
                        <div className="text-center space-y-2"><h2 className="text-2xl font-bold text-white">{getStepTitle()}</h2><p className="text-zinc-400">Moyenne mensuelle.</p></div>
                        <div className="space-y-4 py-8">
                            {step === 6 && <PremiumInput autoFocus icon={Home} placeholder="Loyer ou Crédit" value={expenses.housing} onValueChange={(val: string) => setExpenses({...expenses, housing: val})} onEnter={handleNext} />}
                            {step === 7 && <PremiumInput icon={ShoppingCart} placeholder="Supermarché & Repas" value={expenses.food} onValueChange={(val: string) => setExpenses({...expenses, food: val})} onEnter={handleNext} />}
                            {step === 8 && <PremiumInput icon={Car} placeholder="Essence, Transport" value={expenses.transport} onValueChange={(val: string) => setExpenses({...expenses, transport: val})} onEnter={handleNext} />}
                            {step === 9 && <PremiumInput icon={Coffee} placeholder="Loisirs, Abos..." value={expenses.leisure} onValueChange={(val: string) => setExpenses({...expenses, leisure: val})} onEnter={handleNext} />}
                        </div>
                    </motion.div>
                )}
                {step === 10 && (
                <motion.div key="step10" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-8 my-auto">
                    <div className="w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-pulse"><Check size={48} className="text-black font-bold" /></div>
                    <div><h2 className="text-3xl font-bold text-white">Tout est prêt !</h2><p className="text-zinc-400 mt-2 text-lg">Votre tableau de bord a été généré.</p></div>
                    <Button onClick={handleFinish} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-16 rounded-2xl text-xl mt-4">Lancer ImmoTech</Button>
                </motion.div>
                )}
            </AnimatePresence>
          </div>

          {step < 10 && (
            <div className="p-6 md:p-8 border-t border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md pb-safe shrink-0">
                <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full h-14 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-95">
                    {step === 0 ? "Découvrir" : step === 2 ? "Configurer mon Profil" : "Continuer"} <ArrowRight size={20} className="ml-2" />
                </Button>
            </div>
          )}
      </motion.div>
    </div>
  );
}