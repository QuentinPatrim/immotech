"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import AnimatedNumber from "@/components/AnimatedNumber";
import QuickBudgetWizard from "@/components/QuickBudgetWizard";
import OnboardingWizard from "@/components/OnboardingWizard"; // <--- IMPORT AJOUTÉ
import { motion } from "framer-motion";
import { ShieldCheck, Calculator, Target, Activity, Wallet, PieChart, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer } from "recharts";

// --- TYPES ---
type Asset = { id: string; name: string; value: number; type: string };

export default function Dashboard() {
  
  // --- ÉTATS ---
  const [netWorth, setNetWorth] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  
  // --- UX ---
  const [greeting, setGreeting] = useState("Bonjour");
  const [userName, setUserName] = useState("Investisseur");
  
  // WIZARDS STATES
  const [showOnboarding, setShowOnboarding] = useState(false); // <--- NOUVEL ÉTAT
  const [showBudgetWizard, setShowBudgetWizard] = useState(false);
  const [isBudgetEmpty, setIsBudgetEmpty] = useState(false); 
  const [structureAnalysis, setStructureAnalysis] = useState("En attente de données...");

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    try {
        // 1. VÉRIFICATION PRIMORDIALE : EST-CE UN NOUVEL UTILISATEUR ?
        const savedProfile = localStorage.getItem("userProfile");
        if (!savedProfile) {
            setShowOnboarding(true); // Lance le nouvel Onboarding Premium
            return; // On arrête le chargement ici pour l'instant
        }

        // 2. Identité & Heure
        const currentHour = new Date().getHours();
        const p = JSON.parse(savedProfile);
        if (p.identity?.firstName) setUserName(p.identity.firstName);
        else if (p.firstName) setUserName(p.firstName); // Compatibilité ancienne version
        
        setGreeting(currentHour >= 18 ? "Bonsoir" : "Bonjour");

        // 3. Patrimoine (Récupération depuis le profil ou les actifs séparés)
        let currentAssets: Asset[] = [];
        let total = 0;
        
        // On essaie de construire les actifs depuis le profil utilisateur s'ils existent
        if (p.assets) {
             // Conversion simple pour l'affichage
             if (p.assets.realEstate > 0) currentAssets.push({ id: "re", name: "Immo", value: p.assets.realEstate, type: "Immobilier" });
             if (p.assets.stocks > 0) currentAssets.push({ id: "st", name: "Bourse", value: p.assets.stocks, type: "Bourse" });
             if (p.assets.crypto > 0) currentAssets.push({ id: "cr", name: "Crypto", value: p.assets.crypto, type: "Crypto" });
             if (p.assets.cash > 0) currentAssets.push({ id: "ca", name: "Cash", value: p.assets.cash, type: "Cash" });
             
             // Si on a aussi des actifs détaillés (ancien système), on les ajoute ou remplace (logique simplifiée ici)
             const savedAssetsDetail = localStorage.getItem("myAssets");
             if (savedAssetsDetail) {
                 const detailed = JSON.parse(savedAssetsDetail);
                 if (detailed.length > 0) currentAssets = detailed;
             }
        } else {
             // Fallback ancien système
             const savedAssets = localStorage.getItem("myAssets");
             if (savedAssets) currentAssets = JSON.parse(savedAssets);
        }

        setAssets(currentAssets);
        total = currentAssets.reduce((acc: number, item: Asset) => acc + item.value, 0);
        setNetWorth(total);

        // 4. Budget
        const savedBudget = localStorage.getItem("myBudget");
        if (savedBudget) {
            const b = JSON.parse(savedBudget);
            setMonthlyIncome(b.income || 0);
            // Gestion compatibilité : expenses peut être un tableau ou un chiffre total
            let totalExp = 0;
            if (Array.isArray(b.expenses)) {
                totalExp = b.expenses.reduce((acc: number, item: any) => acc + item.amount, 0);
            } else {
                totalExp = b.expenses || 0;
            }
            
            setMonthlyExpenses(totalExp);
            const savings = Math.max(0, (b.income || 0) - totalExp);
            setSavingsRate(b.income > 0 ? (savings / b.income) * 100 : 0);
            setIsBudgetEmpty(false);
        } else {
            setIsBudgetEmpty(true);
        }

        // 5. ANALYSE IA (Simplifiée)
        if (total > 0) {
            const cryptoVal = currentAssets.filter(a => a.type === "Crypto").reduce((acc, i) => acc + i.value, 0);
            const immoVal = currentAssets.filter(a => a.type === "Immobilier").reduce((acc, i) => acc + i.value, 0);
            
            if ((cryptoVal / total) > 0.5) setStructureAnalysis("Profil agressif (Crypto dominant).");
            else if ((immoVal / total) > 0.6) setStructureAnalysis("Profil Rentier Immobilier.");
            else setStructureAnalysis("Allocation équilibrée.");
        }

    } catch (e) { console.error("Erreur Dashboard", e); }
  }, []);

  const handleOnboardingFinish = () => {
    setShowOnboarding(false);
    window.location.reload(); // Rafraîchit la page pour charger les nouvelles données
  };

  const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  const assetDistribution = [
      { name: "Immo", value: assets.filter(a => a.type === "Immobilier").reduce((acc, i) => acc + i.value, 0), color: "#3b82f6" },
      { name: "Bourse", value: assets.filter(a => a.type === "Bourse").reduce((acc, i) => acc + i.value, 0), color: "#10b981" },
      { name: "Crypto", value: assets.filter(a => a.type === "Crypto").reduce((acc, i) => acc + i.value, 0), color: "#8b5cf6" },
      { name: "Cash", value: assets.filter(a => a.type === "Cash").reduce((acc, i) => acc + i.value, 0), color: "#f59e0b" },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-zinc-100 font-sans">
      
      {/* --- WIZARDS (S'affichent par dessus tout) --- */}
      {showOnboarding && <OnboardingWizard onFinish={handleOnboardingFinish} />}
      <QuickBudgetWizard isOpen={showBudgetWizard} onClose={() => setShowBudgetWizard(false)} />

      <Sidebar />
      
      <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8 pb-24 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-6">
          
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{greeting}{userName ? `, ${userName}` : ""}</h1>
              <p className="text-zinc-500 text-sm">Synthèse de votre situation réelle.</p>
            </div>
            
            {/* BOUTON MODIFIER BUDGET */}
            <Button 
                onClick={() => setShowBudgetWizard(true)} 
                variant={isBudgetEmpty ? "default" : "outline"}
                className={isBudgetEmpty ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"}
            >
                {isBudgetEmpty ? <><PlusCircle size={16} className="mr-2"/> Configurer Budget</> : "Modifier Budget"}
            </Button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* --- LEFT COL (KPIs) --- */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CARTE PATRIMOINE */}
                <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black p-8 shadow-2xl flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                    <div>
                        <p className="text-zinc-400 font-medium text-sm flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-emerald-500"/> Patrimoine Net Total</p>
                        <div className="text-5xl md:text-6xl font-black text-white tracking-tighter"><AnimatedNumber value={netWorth} /></div>
                    </div>
                    <div className="z-10 mt-6">
                        <div className="h-2 w-full flex rounded-full overflow-hidden bg-zinc-800">
                            {assetDistribution.length > 0 ? (
                                assetDistribution.map((a, i) => (<div key={i} style={{ width: `${(a.value / netWorth) * 100}%`, backgroundColor: a.color }} />))
                            ) : (
                                <div className="w-full bg-zinc-800 h-full" />
                            )}
                        </div>
                        {assetDistribution.length === 0 && <p className="text-xs text-zinc-600 mt-2">Ajoutez des actifs pour voir la répartition</p>}
                    </div>
                </div>

                {/* CARTE BUDGET */}
                <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Flux Mensuel</CardTitle><Calculator size={16} className="text-blue-500"/></CardHeader>
                    <CardContent>
                        {isBudgetEmpty ? (
                            <div className="text-sm text-zinc-500">Aucun budget défini</div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white mb-1">{formatEuro(monthlyIncome - monthlyExpenses)}</div>
                                <div className="flex justify-between text-xs mt-2"><span className="text-emerald-400">+{formatEuro(monthlyIncome)}</span><span className="text-red-400">-{formatEuro(monthlyExpenses)}</span></div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* CARTE EPARGNE */}
                <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Taux d'Épargne</CardTitle><PieChart size={16} className="text-purple-500"/></CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div><div className="text-2xl font-bold text-white mb-1">{savingsRate.toFixed(0)}%</div></div>
                        <div className="h-16 w-16 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie><Pie data={[{value: savingsRate > 0 ? savingsRate : 1}, {value: 100 - (savingsRate > 0 ? savingsRate : 1)}]} innerRadius={20} outerRadius={30} dataKey="value"><Cell fill={savingsRate >= 20 ? "#10b981" : "#ef4444"} stroke="none"/><Cell fill="#27272a" stroke="none"/></Pie></RechartsPie>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- RIGHT COL (Actions) --- */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-white"><Target size={16} className="text-red-500" /> Prochain Objectif</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end mb-2"><span className="text-2xl font-bold text-white">100k €</span></div>
                        <Progress value={Math.min(100, (netWorth / 100000) * 100)} className="h-2 bg-zinc-800" indicatorClassName="bg-gradient-to-r from-red-500 to-orange-500"/>
                        <p className="text-xs text-zinc-400 mt-2 text-right">{((netWorth / 100000) * 100).toFixed(1)}%</p>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                    <Link href="/patrimoine" className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all text-center gap-2">
                        <Wallet size={20} className="text-blue-500 mb-2"/>
                        <span className="text-xs font-medium text-zinc-300">Gérer Actifs</span>
                    </Link>
                    <Link href="/simulateur" className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all text-center gap-2">
                        <Calculator size={20} className="text-emerald-500 mb-2"/>
                        <span className="text-xs font-medium text-zinc-300">Simulateur</span>
                    </Link>
                </div>
            </div>
          </div>

          <div className="p-1 rounded-2xl bg-gradient-to-r from-zinc-800 to-zinc-900">
              <div className="bg-black rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Activity size={24}/></div>
                      <div><h3 className="font-bold text-white">Analyse de Portefeuille</h3><p className="text-sm text-zinc-400">{structureAnalysis}</p></div>
                  </div>
                  <Button variant="secondary" className="font-bold">Détails bientôt</Button>
              </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}