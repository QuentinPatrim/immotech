"use client";

import { useState } from "react";
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

// --- COMPOSANT INPUT ---
const PremiumInput = ({ value, onChange, placeholder, icon: Icon, type = "text", autoFocus = false, onEnter }: any) => (
  <div className="group relative transition-all duration-300 w-full">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
      <Icon size={20} />
    </div>
    <Input
      autoFocus={autoFocus}
      type={type}
      value={value === 0 ? "" : value} 
      onChange={onChange}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      placeholder={placeholder}
      className="pl-12 h-16 bg-zinc-900/50 border-zinc-800 text-white text-lg placeholder:text-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 rounded-2xl transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  </div>
);

// --- COMPOSANT CARTE FEATURE ---
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
  
  // DATA STATES
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", age: "" });
  const [assets, setAssets] = useState({ realEstate: "", stocks: "", crypto: "", cash: "" });
  const [income, setIncome] = useState("");
  
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
    
    // 1. Calcul des totaux pour le profil
    const totalExpenses = 
      (parseFloat(expenses.housing) || 0) +
      (parseFloat(expenses.food) || 0) +
      (parseFloat(expenses.transport) || 0) +
      (parseFloat(expenses.leisure) || 0);

    const realEstateVal = parseFloat(assets.realEstate) || 0;
    const stocksVal = parseFloat(assets.stocks) || 0;
    const cryptoVal = parseFloat(assets.crypto) || 0;
    const cashVal = parseFloat(assets.cash) || 0;

    // 2. Sauvegarde du Profil Global
    const userData = {
      identity,
      assets: {
        realEstate: realEstateVal,
        stocks: stocksVal,
        crypto: cryptoVal,
        cash: cashVal,
      },
      budget: {
        income: parseFloat(income) || 0,
        expenses: totalExpenses, 
        details: expenses 
      },
      onboardingComplete: true
    };
    localStorage.setItem("userProfile", JSON.stringify(userData));

    // 3. Sauvegarde du Budget Détaillé
    localStorage.setItem("myBudget", JSON.stringify({ 
        income: userData.budget.income,
        expenses: [
            { id: "1", name: "Logement", amount: parseFloat(expenses.housing) || 0 },
            { id: "2", name: "Alimentation", amount: parseFloat(expenses.food) || 0 },
            { id: "3", name: "Transport", amount: parseFloat(expenses.transport) || 0 },
            { id: "4", name: "Loisirs & Abos", amount: parseFloat(expenses.leisure) || 0 },
        ] 
    }));

    // --- 4. LA CORRECTION : GÉNÉRATION DES ACTIFS POUR LA PAGE PATRIMOINE ---
    // On crée une liste d'actifs compatible avec la page "Patrimoine"
    const initialAssetsList = [];

    if (realEstateVal > 0) {
        initialAssetsList.push({
            id: "init-re-" + Date.now(),
            name: "Immobilier (Principal)",
            amount: realEstateVal,
            type: "real_estate", // Type reconnu par ton app
            color: "#10b981" // Emerald
        });
    }
    if (stocksVal > 0) {
        initialAssetsList.push({
            id: "init-st-" + Date.now(),
            name: "Portefeuille Bourse",
            amount: stocksVal,
            type: "stock",
            color: "#3b82f6" // Blue
        });
    }
    if (cryptoVal > 0) {
        initialAssetsList.push({
            id: "init-cr-" + Date.now(),
            name: "Portefeuille Crypto",
            amount: cryptoVal,
            type: "crypto",
            color: "#f59e0b" // Amber
        });
    }
    if (cashVal > 0) {
        initialAssetsList.push({
            id: "init-ca-" + Date.now(),
            name: "Épargne & Cash",
            amount: cashVal,
            type: "cash",
            color: "#6366f1" // Indigo
        });
    }

    // On enregistre cette liste sous la clé "myAssets" que la page Patrimoine utilise
    localStorage.setItem("myAssets", JSON.stringify(initialAssetsList));
    
    // Fin
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-900/10 via-black to-black" />
      <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-emerald-900/5 to-transparent pointer-events-none" />
      
      <motion.div className="w-full h-full md:h-auto md:max-w-xl relative z-10 flex flex-col">
        <div className="flex-1 flex flex-col md:bg-zinc-950 md:border md:border-zinc-800 md:rounded-3xl md:shadow-2xl md:min-h-[600px] overflow-hidden">
          
          {step > 2 && step < 10 && (
            <div className="pt-8 px-8 flex gap-1.5">
               <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                   <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((step - 2) / 8) * 100}%` }}
                        className="h-full bg-emerald-500"
                   />
               </div>
            </div>
          )}

          <div className="flex-1 p-8 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            
            {/* 0. WELCOME */}
            {step === 0 && (
              <motion.div key="intro0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/50 mb-6">
                    <TrendingUp size={48} className="text-black" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-4">
                        Bienvenue sur <span className="text-emerald-500">ImmoTech</span>
                    </h1>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        L'application tout-en-un pour piloter votre patrimoine, optimiser votre budget et simuler vos investissements.
                    </p>
                </div>
              </motion.div>
            )}

            {/* 1. FEATURES */}
            {step === 1 && (
              <motion.div key="intro1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Votre Cockpit Financier 🚀</h2>
                  <p className="text-zinc-400">Tout ce dont vous avez besoin, au même endroit.</p>
                </div>
                <div className="space-y-3">
                    <FeatureCard icon={ShieldCheck} title="Patrimoine Global" desc="Suivez l'évolution de votre Net Worth (Immo, Bourse, Crypto) en temps réel." />
                    <FeatureCard icon={PieChart} title="Budget & Cashflow" desc="Analysez vos flux mensuels pour maximiser votre capacité d'épargne." />
                    <FeatureCard icon={Calculator} title="Simulateur Immo" desc="Calculez instantanément la rentabilité et le cashflow de vos projets." />
                </div>
              </motion.div>
            )}

            {/* 2. PRE-SETUP */}
            {step === 2 && (
              <motion.div key="intro2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center space-y-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                    <LayoutDashboard size={80} className="text-white relative z-10 mx-auto" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white mb-4">À vous de jouer !</h2>
                    <p className="text-zinc-400 text-lg">Pour que la magie opère, nous avons besoin de connaître votre point de départ.</p>
                    <p className="text-zinc-500 text-sm mt-4">🔐 Vos données sont stockées uniquement sur votre téléphone (Local Storage).</p>
                </div>
              </motion.div>
            )}

            {/* 3. IDENTITÉ */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-white">Qui êtes-vous ? 👤</h2>
                  <p className="text-zinc-400">Commençons par les présentations.</p>
                </div>
                <div className="space-y-4 pt-4">
                    <PremiumInput autoFocus icon={User} placeholder="Prénom" value={identity.firstName} onChange={(e: any) => setIdentity({...identity, firstName: e.target.value})} />
                    <PremiumInput icon={User} placeholder="Nom" value={identity.lastName} onChange={(e: any) => setIdentity({...identity, lastName: e.target.value})} />
                    <PremiumInput type="number" icon={Check} placeholder="Âge" value={identity.age} onChange={(e: any) => setIdentity({...identity, age: e.target.value})} onEnter={handleNext} />
                </div>
              </motion.div>
            )}

            {/* 4. PATRIMOINE */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Votre Patrimoine 🏛️</h2>
                  <p className="text-zinc-400">Estimez la valeur actuelle de vos actifs.</p>
                </div>
                <div className="space-y-3 pt-2">
                  <PremiumInput autoFocus type="number" icon={Building2} placeholder="Immobilier (Est.)" value={assets.realEstate} onChange={(e: any) => setAssets({...assets, realEstate: e.target.value})} />
                  <PremiumInput type="number" icon={TrendingUp} placeholder="Bourse (PEA/CTO)" value={assets.stocks} onChange={(e: any) => setAssets({...assets, stocks: e.target.value})} />
                  <PremiumInput type="number" icon={Bitcoin} placeholder="Crypto" value={assets.crypto} onChange={(e: any) => setAssets({...assets, crypto: e.target.value})} />
                  <PremiumInput type="number" icon={PiggyBank} placeholder="Cash / Épargne" value={assets.cash} onChange={(e: any) => setAssets({...assets, cash: e.target.value})} onEnter={handleNext} />
                </div>
              </motion.div>
            )}

            {/* 5. REVENUS */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                 <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Vos Revenus 💸</h2>
                  <p className="text-zinc-400">Salaire Net Mensuel (avant impôt).</p>
                </div>
                <div className="space-y-4 py-8">
                    <PremiumInput autoFocus type="number" icon={Briefcase} placeholder="Montant Net Mensuel" value={income} onChange={(e: any) => setIncome(e.target.value)} onEnter={handleNext} />
                </div>
              </motion.div>
            )}

            {/* 6-9. DEPENSES */}
            {[6, 7, 8, 9].includes(step) && (
                <motion.div key={`step${step}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-white">{getStepTitle()}</h2>
                        <p className="text-zinc-400">Estimation mensuelle moyenne.</p>
                    </div>
                    <div className="space-y-4 py-8">
                        {step === 6 && <PremiumInput autoFocus type="number" icon={Home} placeholder="Loyer ou Crédit" value={expenses.housing} onChange={(e: any) => setExpenses({...expenses, housing: e.target.value})} onEnter={handleNext} />}
                        {step === 7 && <PremiumInput autoFocus type="number" icon={ShoppingCart} placeholder="Supermarché & Repas" value={expenses.food} onChange={(e: any) => setExpenses({...expenses, food: e.target.value})} onEnter={handleNext} />}
                        {step === 8 && <PremiumInput autoFocus type="number" icon={Car} placeholder="Essence, Transport, Assurance" value={expenses.transport} onChange={(e: any) => setExpenses({...expenses, transport: e.target.value})} onEnter={handleNext} />}
                        {step === 9 && <PremiumInput autoFocus type="number" icon={Coffee} placeholder="Netflix, Sport, Sorties..." value={expenses.leisure} onChange={(e: any) => setExpenses({...expenses, leisure: e.target.value})} onEnter={handleNext} />}
                    </div>
                </motion.div>
            )}

             {/* 10. FINISH */}
             {step === 10 && (
              <motion.div key="step10" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-8">
                <div className="w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-pulse">
                    <Check size={48} className="text-black font-bold" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white">Tout est prêt !</h2>
                    <p className="text-zinc-400 mt-2 text-lg">Votre tableau de bord a été généré.</p>
                </div>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <p className="text-sm text-zinc-500">
                        "L'investissement dans la connaissance paie le meilleur intérêt."
                        <br/><span className="text-emerald-500 font-bold">— Benjamin Franklin</span>
                    </p>
                </div>
                <Button onClick={handleFinish} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-16 rounded-2xl text-xl mt-4">
                    Lancer ImmoTech
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
          </div>

          {step < 10 && (
            <div className="p-8 border-t border-zinc-800/50 flex justify-end bg-zinc-950/50 backdrop-blur-md sticky bottom-0">
                <Button 
                    onClick={handleNext} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-14 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/20 w-full md:w-auto transition-all hover:scale-105 active:scale-95"
                >
                    {step === 0 ? "Découvrir" : step === 2 ? "Configurer mon Profil" : "Continuer"} 
                    <ArrowRight size={20} className="ml-2" />
                </Button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}