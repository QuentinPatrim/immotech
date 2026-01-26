"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import AnimatedNumber from "@/components/AnimatedNumber";
import QuickBudgetWizard from "@/components/QuickBudgetWizard";
import { motion } from "framer-motion";
import { ShieldCheck, Calculator, Target, ArrowRight, Activity, Wallet, PieChart, Lightbulb, PlusCircle } from "lucide-react";
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
  const [userName, setUserName] = useState("");
  const [showBudgetWizard, setShowBudgetWizard] = useState(false);
  const [structureAnalysis, setStructureAnalysis] = useState("En attente de données...");
  const [isBudgetEmpty, setIsBudgetEmpty] = useState(false); // Nouvel état pour le bouton de secours

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    try {
        // 1. Identité & Heure
        const savedProfile = localStorage.getItem("userProfile");
        const currentHour = new Date().getHours();
        if (savedProfile) {
            const p = JSON.parse(savedProfile);
            if (p.firstName) setUserName(p.firstName);
        }
        setGreeting(currentHour >= 18 ? "Bonsoir" : "Bonjour");

        // 2. Patrimoine
        const savedAssets = localStorage.getItem("myAssets");
        let currentAssets: Asset[] = [];
        let total = 0;
        if (savedAssets) {
            currentAssets = JSON.parse(savedAssets);
            setAssets(currentAssets);
            total = currentAssets.reduce((acc: number, item: Asset) => acc + item.value, 0);
            setNetWorth(total);
        }

        // 3. Budget & Logique d'ouverture
        const savedBudget = localStorage.getItem("myBudget");
        
        if (savedBudget) {
            // Cas A : Le budget existe
            const b = JSON.parse(savedBudget);
            setMonthlyIncome(b.income || 0);
            const totalExp = b.expenses ? b.expenses.reduce((acc: number, item: any) => acc + item.amount, 0) : 0;
            setMonthlyExpenses(totalExp);
            const savings = Math.max(0, (b.income || 0) - totalExp);
            setSavingsRate(b.income > 0 ? (savings / b.income) * 100 : 0);
            setIsBudgetEmpty(false);
        } else {
            // Cas B : Pas de budget -> On lance l'assistant
            setIsBudgetEmpty(true);
            
            // TIMING SÉCURISÉ : On attend 1.5s que le splash screen disparaisse
            // C'est simple et ça marche à tous les coups
            const timer = setTimeout(() => {
                console.log("Ouverture du Wizard automatique"); // Pour vérifier
                setShowBudgetWizard(true);
            }, 1500);
            
            return () => clearTimeout(timer);
        }

        // 4. ANALYSE IA
        if (total > 0) {
            const cryptoVal = currentAssets.filter(a => a.type === "Crypto").reduce((acc, i) => acc + i.value, 0);
            const immoVal = currentAssets.filter(a => a.type === "Immobilier").reduce((acc, i) => acc + i.value, 0);
            const cashVal = currentAssets.filter(a => a.type === "Cash").reduce((acc, i) => acc + i.value, 0);
            
            const cryptoShare = (cryptoVal / total) * 100;
            const immoShare = (immoVal / total) * 100;
            const cashShare = (cashVal / total) * 100;

            if (cryptoShare > 50) {
                setStructureAnalysis("Votre profil est agressif. Forte exposition crypto.");
            } else if (immoShare > 60) {
                setStructureAnalysis("Vous avez un profil de rentier immobilier.");
            } else if (cashShare > 40) {
                setStructureAnalysis("Votre profil est très défensif. Attention à l'inflation.");
            } else {
                setStructureAnalysis("Votre allocation est équilibrée. Continuez ainsi.");
            }
        } else {
            setStructureAnalysis("Ajoutez vos premiers actifs pour obtenir une analyse.");
        }

    } catch (e) { console.error("Erreur Dashboard", e); }
  }, []);

  const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  const assetDistribution = [
      { name: "Immo", value: assets.filter(a => a.type === "Immobilier").reduce((acc, i) => acc + i.value, 0), color: "#3b82f6" },
      { name: "Bourse", value: assets.filter(a => a.type === "Bourse").reduce((acc, i) => acc + i.value, 0), color: "#10b981" },
      { name: "Crypto", value: assets.filter(a => a.type === "Crypto").reduce((acc, i) => acc + i.value, 0), color: "#8b5cf6" },
      { name: "Cash", value: assets.filter(a => a.type === "Cash").reduce((acc, i) => acc + i.value, 0), color: "#f59e0b" },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-zinc-100 font-sans">
      <Sidebar />
      <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8 pb-24 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-6">
          
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{greeting}{userName ? `, ${userName}` : ""}</h1>
              <p className="text-zinc-500 text-sm">Synthèse de votre situation réelle.</p>
            </div>
            
            {/* BOUTON DE SECOURS : Apparaît seulement si le budget est vide */}
            {isBudgetEmpty && (
                <Button 
                    onClick={() => setShowBudgetWizard(true)} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                >
                    <PlusCircle size={16} className="mr-2"/> Configurer mon Budget
                </Button>
            )}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* --- LEFT COL --- */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black p-8 shadow-2xl flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                    <div>
                        <p className="text-zinc-400 font-medium text-sm flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-emerald-500"/> Patrimoine Net Total</p>
                        <div className="text-5xl md:text-6xl font-black text-white tracking-tighter"><AnimatedNumber value={netWorth} /></div>
                    </div>
                    <div className="z-10 mt-6">
                        <div className="h-2 w-full flex rounded-full overflow-hidden bg-zinc-800">
                            {assetDistribution.map((a, i) => (<div key={i} style={{ width: `${(a.value / netWorth) * 100}%`, backgroundColor: a.color }} />))}
                            {assetDistribution.length === 0 && <div className="w-full bg-zinc-800" />}
                        </div>
                    </div>
                </div>

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

                <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Taux d'Épargne</CardTitle><PieChart size={16} className="text-purple-500"/></CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div><div className="text-2xl font-bold text-white mb-1">{savingsRate.toFixed(0)}%</div></div>
                        <div className="h-16 w-16 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie><Pie data={[{value: savingsRate}, {value: 100-savingsRate}]} innerRadius={20} outerRadius={30} dataKey="value"><Cell fill={savingsRate >= 20 ? "#10b981" : "#ef4444"} stroke="none"/><Cell fill="#27272a" stroke="none"/></Pie></RechartsPie>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- RIGHT COL --- */}
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
                      <div><h3 className="font-bold text-white">Analyse de Portefeuille</h3><p className="text-sm text-zinc-400">L'IA détecte les déséquilibres.</p></div>
                  </div>
                  <Link href="/analyses"><Button className="bg-white text-black hover:bg-zinc-200 font-bold">Consulter</Button></Link>
              </div>
          </div>

        </motion.div>
      </main>
      
      {/* LE WIZARD */}
      <QuickBudgetWizard isOpen={showBudgetWizard} onClose={() => setShowBudgetWizard(false)} />
    </div>
  );
}
