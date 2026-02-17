"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, User, Building2, TrendingUp, Bitcoin, PiggyBank, Briefcase, Home, ShoppingCart, Car, Coffee, ShieldCheck, PieChart, Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

interface OnboardingProps {
  onFinish: () => void;
}

const cleanNumber = (val: any): number => {
    if (!val) return 0;
    const cleanStr = String(val).replace(/,/g, ".").replace(/\s/g, "").trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
};

const PremiumInput = ({ value, onValueChange, placeholder, icon: Icon, autoFocus = false, onEnter, numeric = true }: any) => (
  <div className="group relative transition-all duration-300 w-full">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
      <Icon size={20} />
    </div>
    <Input
      autoFocus={autoFocus}
      type="text"
      inputMode={numeric ? "decimal" : "text"} 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      placeholder={placeholder}
      className="pl-12 h-16 bg-zinc-900/50 border-zinc-800 text-white text-lg placeholder:text-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 rounded-2xl transition-all"
    />
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc }: any) => (
    <div className="flex gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl items-center hover:border-emerald-500/20 transition-colors">
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
  const [loading, setLoading] = useState(false);
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", age: "" });
  const [assets, setAssets] = useState({ realEstate: "", stocks: "", crypto: "", cash: "" });
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState({ housing: "", food: "", transport: "", leisure: "" });

  const handleNext = () => setStep((prev) => prev + 1);

  const handleFinish = async () => {
    setLoading(true);
    
    // Préparation des données
    const finalAssets = [
        { type: "Immobilier", value: cleanNumber(assets.realEstate), name: "Immobilier Principal", id: "init-re" },
        { type: "Bourse", value: cleanNumber(assets.stocks), name: "Portefeuille Bourse", id: "init-st" },
        { type: "Crypto", value: cleanNumber(assets.crypto), name: "Portefeuille Crypto", id: "init-cr" },
        { type: "Cash", value: cleanNumber(assets.cash), name: "Cash & Épargne", id: "init-ca" }
    ].filter(a => a.value > 0);

    const finalIncome = cleanNumber(income);
    const finalExpensesDetails = [
        { id: "1", name: "Logement", amount: cleanNumber(expenses.housing) },
        { id: "2", name: "Alimentation", amount: cleanNumber(expenses.food) },
        { id: "3", name: "Transport", amount: cleanNumber(expenses.transport) },
        { id: "4", name: "Loisirs & Abos", amount: cleanNumber(expenses.leisure) },
    ];
    const totalExpenses = finalExpensesDetails.reduce((acc, item) => acc + item.amount, 0);

    // Sauvegarde SUPABASE
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Mise à jour du nom
        if (identity.firstName) {
            await supabase.auth.updateUser({ data: { full_name: `${identity.firstName} ${identity.lastName}` } });
        }

        // Sauvegarde Profil (Patrimoine + Budget)
        await supabase.from('profiles').upsert({
            id: user.id,
            assets_json: finalAssets,
            budget_json: { income: finalIncome, expenses: totalExpenses, details: finalExpensesDetails },
            net_worth: finalAssets.reduce((acc, a) => acc + a.value, 0),
            updated_at: new Date()
        });
    }

    setLoading(false);
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg bg-[#09090b] border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Progress Bar */}
          <div className="pt-8 px-8 pb-2 shrink-0">
            {step > 1 && step < 10 && (<div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${((step - 1) / 9) * 100}%` }} className="h-full bg-emerald-500" /></div>)}
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col justify-center min-h-[400px]">
            <AnimatePresence mode="wait">
                
                {/* 0. INTRO */}
                {step === 0 && (
                <motion.div key="intro0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 text-center my-auto">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/50 mb-6">
                        <TrendingUp size={40} className="text-black" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-3">Bienvenue sur <span className="text-emerald-500">Nexus</span></h1>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">Votre centre de contrôle patrimonial intelligent. Centralisez, analysez et optimisez.</p>
                    </div>
                </motion.div>
                )}

                {/* 1. FEATURES */}
                {step === 1 && (
                <motion.div key="intro1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6 my-auto">
                    <div className="text-center mb-6"><h2 className="text-2xl font-bold text-white mb-1">Cockpit Financier 🚀</h2><p className="text-zinc-500 text-xs">Tout ce dont vous avez besoin.</p></div>
                    <div className="space-y-3">
                        <FeatureCard icon={ShieldCheck} title="Patrimoine Global" desc="Suivi en temps réel de la Valeur Nette." />
                        <FeatureCard icon={PieChart} title="Budget & Cashflow" desc="Analyse des flux et taux d'épargne." />
                        <FeatureCard icon={Calculator} title="Simulateur Expert" desc="Rentabilité, Fiscalité LMNP, PDF..." />
                    </div>
                </motion.div>
                )}

                {/* 2. IDENTITY */}
                {step === 2 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 my-auto">
                    <div className="text-center space-y-2"><h2 className="text-2xl font-bold text-white">Profil Investisseur 👤</h2></div>
                    <div className="space-y-4 pt-4">
                        <PremiumInput autoFocus icon={User} placeholder="Prénom" value={identity.firstName} onValueChange={(val: string) => setIdentity({...identity, firstName: val})} numeric={false} />
                        <PremiumInput icon={User} placeholder="Nom" value={identity.lastName} onValueChange={(val: string) => setIdentity({...identity, lastName: val})} numeric={false} />
                    </div>
                </motion.div>
                )}

                {/* 3. ASSETS */}
                {step === 3 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 my-auto">
                    <div className="text-center space-y-2"><h2 className="text-2xl font-bold text-white">Patrimoine Actuel 🏛️</h2><p className="text-zinc-500 text-xs">Estimation (laisser vide si 0).</p></div>
                    <div className="space-y-3 pt-2">
                        <PremiumInput autoFocus icon={Building2} placeholder="Immobilier" value={assets.realEstate} onValueChange={(val: string) => setAssets({...assets, realEstate: val})} />
                        <PremiumInput icon={TrendingUp} placeholder="Bourse (PEA/CTO)" value={assets.stocks} onValueChange={(val: string) => setAssets({...assets, stocks: val})} />
                        <PremiumInput icon={Bitcoin} placeholder="Crypto" value={assets.crypto} onValueChange={(val: string) => setAssets({...assets, crypto: val})} />
                        <PremiumInput icon={PiggyBank} placeholder="Cash / Épargne" value={assets.cash} onValueChange={(val: string) => setAssets({...assets, cash: val})} onEnter={handleNext} />
                    </div>
                </motion.div>
                )}

                {/* 4. REVENUS */}
                {step === 4 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 my-auto">
                    <div className="text-center space-y-2"><h2 className="text-2xl font-bold text-white">Vos Revenus 💸</h2><p className="text-zinc-500 text-xs">Net Mensuel avant impôt.</p></div>
                    <div className="space-y-4 py-8"><PremiumInput autoFocus icon={Briefcase} placeholder="Montant Net Mensuel" value={income} onValueChange={(val: string) => setIncome(val)} onEnter={handleNext} /></div>
                </motion.div>
                )}

                {/* 5-8. DEPENSES */}
                {[5, 6, 7, 8].includes(step) && (
                    <motion.div key={`step${step}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6 my-auto">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">{step === 5 ? "Logement 🏠" : step === 6 ? "Alimentation 🛒" : step === 7 ? "Transport 🚗" : "Loisirs & Abos 🍿"}</h2>
                            <p className="text-zinc-500 text-xs">Moyenne mensuelle estimée.</p>
                        </div>
                        <div className="space-y-4 py-8">
                            {step === 5 && <PremiumInput autoFocus icon={Home} placeholder="Loyer ou Crédit" value={expenses.housing} onValueChange={(val: string) => setExpenses({...expenses, housing: val})} onEnter={handleNext} />}
                            {step === 6 && <PremiumInput icon={ShoppingCart} placeholder="Supermarché & Repas" value={expenses.food} onValueChange={(val: string) => setExpenses({...expenses, food: val})} onEnter={handleNext} />}
                            {step === 7 && <PremiumInput icon={Car} placeholder="Essence, Transport" value={expenses.transport} onValueChange={(val: string) => setExpenses({...expenses, transport: val})} onEnter={handleNext} />}
                            {step === 8 && <PremiumInput icon={Coffee} placeholder="Loisirs, Abos..." value={expenses.leisure} onValueChange={(val: string) => setExpenses({...expenses, leisure: val})} onEnter={handleNext} />}
                        </div>
                    </motion.div>
                )}

                {/* 9. FINISH */}
                {step === 9 && (
                <motion.div key="step10" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-8 my-auto">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-pulse"><Check size={32} className="text-black font-bold" /></div>
                    <div><h2 className="text-2xl font-bold text-white">Tout est prêt !</h2><p className="text-zinc-400 mt-2 text-sm">Votre tableau de bord a été généré.</p></div>
                    <Button onClick={handleFinish} disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-14 rounded-2xl text-lg mt-4">{loading ? <Loader2 className="animate-spin"/> : "Lancer Nexus"}</Button>
                </motion.div>
                )}
            </AnimatePresence>
          </div>
          
          {step < 9 && (
            <div className="p-6 border-t border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md pb-safe shrink-0">
                <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-emerald-900/20 transition-all active:scale-95">
                    {step === 0 ? "Commencer" : "Continuer"} <ArrowRight size={18} className="ml-2" />
                </Button>
            </div>
          )}
      </motion.div>
    </div>
  );
}