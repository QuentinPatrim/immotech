"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, Wallet, TrendingUp, Zap, ShieldCheck, Loader2, ShoppingCart, Home, Car, Plane, Target, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; 

// --- LOGIQUE CATÉGORIES ---
const CATEGORIES = {
  BESOIN: { id: "need", label: "Besoins (Fixe)", color: "#3b82f6" },
  ENVIE:  { id: "want", label: "Plaisirs & Envies", color: "#eab308" },
  EPARGNE:{ id: "save", label: "Épargne", color: "#10b981" }
};

const KEYWORDS = {
  besoin: ["loyer", "crédit", "immo", "courses", "eau", "elec", "gaz", "internet", "assurance", "impôt", "transport", "essence"],
  epargne: ["bourse", "crypto", "livret", "cash", "action", "etf", "dca"],
};

const detectCategory = (name: string) => {
  const n = name.toLowerCase();
  if (KEYWORDS.besoin.some(k => n.includes(k))) return "BESOIN";
  if (KEYWORDS.epargne.some(k => n.includes(k))) return "EPARGNE";
  return "ENVIE"; 
};

export default function BudgetPage() {
    // DONNÉES BUDGET
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState<{id: string, name: string, amount: number, category: string}[]>([]);
    
    // DONNÉES OBJECTIFS (Voiture, Voyage...)
    const [goals, setGoals] = useState<{id: string, name: string, amount: number}[]>([]);
    const [newGoalName, setNewGoalName] = useState("");
    const [newGoalAmount, setNewGoalAmount] = useState("");

    // DONNÉES ACTIFS (Pour savoir combien on a déjà de cash)
    const [currentCash, setCurrentCash] = useState(0);

    // ÉTATS UI
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState("");
    const [newItemAmount, setNewItemAmount] = useState("");
    
    // STRATÉGIE (Le curseur 0 à 100%)
    const [safetyAllocation, setSafetyAllocation] = useState(50); 

    // --- 1. CHARGEMENT COMPLET (Budget + Actifs) ---
    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            
            if (user) {
                // A. Récupérer le Profil (Budget + Objectifs)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('budget_json, assets_json')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    // 1. Budget & Dépenses
                    if (profile.budget_json) {
                        const b = profile.budget_json as any;
                        setIncome(Number(b.income) || 0);

                        // Récupération intelligente des dépenses
                        let loadedExpenses: any[] = [];
                        
                        // Cas 1 : Format Objet (venant de l'Onboarding)
                        if (b.details && !Array.isArray(b.details)) { 
                            if (b.details.housing > 0) loadedExpenses.push({ id: "auto-1", name: "Loyer / Crédit", amount: b.details.housing, category: "BESOIN" });
                            if (b.details.food > 0) loadedExpenses.push({ id: "auto-2", name: "Courses & Alim.", amount: b.details.food, category: "BESOIN" });
                            if (b.details.transport > 0) loadedExpenses.push({ id: "auto-3", name: "Transport", amount: b.details.transport, category: "BESOIN" });
                            if (b.details.leisure > 0) loadedExpenses.push({ id: "auto-4", name: "Loisirs & Abos", amount: b.details.leisure, category: "ENVIE" });
                        } 
                        // Cas 2 : Format Tableau (déjà sauvegardé par cette page)
                        else if (Array.isArray(b.details)) {
                            loadedExpenses = b.details;
                        }
                        
                        setExpenses(loadedExpenses);

                        // 2. Objectifs
                        if (Array.isArray(b.goals)) {
                            setGoals(b.goals);
                        }
                    }

                    // 3. Calcul du Cash actuel (Matelas existant)
                    if (Array.isArray(profile.assets_json)) {
                        const assets = profile.assets_json as any[];
                        const cashTotal = assets
                            .filter((a: any) => a.type === "Cash" || (a.type && a.type.includes("Livret")))
                            .reduce((acc: number, a: any) => acc + (a.value || 0), 0);
                        setCurrentCash(cashTotal);
                    }
                }
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // --- 2. SAUVEGARDE GLOBALE ---
    const updateCloud = async (newInc: number, newExp: any[], newGoals: any[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const totalExp = newExp.reduce((acc, i) => acc + i.amount, 0);
            await supabase.from('profiles').update({
                budget_json: {
                    income: newInc,
                    expenses: totalExp,
                    details: newExp,
                    goals: newGoals 
                }
            }).eq('id', user.id);
        }
    };

    // --- HANDLERS DÉPENSES ---
    const addExpense = async () => {
        if (!newItemName || !newItemAmount) return;
        const val = parseFloat(newItemAmount);
        if (isNaN(val)) return;
        const catKey = detectCategory(newItemName);
        const newExp = [...expenses, { id: Date.now().toString(), name: newItemName, amount: val, category: catKey }];
        setExpenses(newExp);
        setNewItemName(""); setNewItemAmount("");
        await updateCloud(income, newExp, goals);
    };

    const removeExpense = async (id: string) => {
        const newExp = expenses.filter(e => e.id !== id);
        setExpenses(newExp);
        await updateCloud(income, newExp, goals);
    };

    // --- HANDLERS OBJECTIFS ---
    const addGoal = async () => {
        if (!newGoalName || !newGoalAmount) return;
        const val = parseFloat(newGoalAmount);
        if (isNaN(val)) return;
        const newG = [...goals, { id: "goal-" + Date.now(), name: newGoalName, amount: val }];
        setGoals(newG);
        setNewGoalName(""); setNewGoalAmount("");
        await updateCloud(income, expenses, newG);
    };

    const removeGoal = async (id: string) => {
        const newG = goals.filter(g => g.id !== id);
        setGoals(newG);
        await updateCloud(income, expenses, newG);
    };

    const handleIncomeChange = async (val: string) => {
        const v = parseFloat(val);
        const newIncome = isNaN(v) ? 0 : v;
        setIncome(newIncome);
        await updateCloud(newIncome, expenses, goals);
    };

    // --- 3. CALCULS INTELLIGENTS ---
    const needsTotal = expenses.filter(e => e.category === "BESOIN").reduce((acc, i) => acc + i.amount, 0);
    const wantsTotal = expenses.filter(e => e.category === "ENVIE").reduce((acc, i) => acc + i.amount, 0);
    const totalExpenses = expenses.reduce((acc, item) => acc + item.amount, 0);
    
    // Le "Vrai" Reste à vivre brut
    const rawInvestCapacity = Math.max(0, income - totalExpenses);

    // Allocations pour les objectifs (Voiture, etc.)
    const totalGoalsAlloc = goals.reduce((acc, g) => acc + g.amount, 0);
    
    // Capacité restante pour la stratégie (Matelas vs Invest)
    const strategyCapacity = Math.max(0, rawInvestCapacity - totalGoalsAlloc);

    // --- LOGIQUE MATELAS DE SÉCURITÉ ---
    // 1 mois de dépenses réelles = Besoins + Envies
    const oneMonthExpenses = needsTotal + wantsTotal;
    // Objectif : 6 mois de dépenses
    const safetyTarget = oneMonthExpenses * 6;
    // Combien il manque ?
    const safetyGap = Math.max(0, safetyTarget - currentCash);
    // Est-ce qu'on est safe ?
    const isSafe = currentCash >= safetyTarget;

    // --- RÉPARTITION DU FLUX SELON CURSEUR ---
    const effectiveSafetyRate = isSafe ? 0 : (safetyAllocation / 100);
    
    const flowToSafety = strategyCapacity * effectiveSafetyRate;
    const flowToInvest = strategyCapacity * (1 - effectiveSafetyRate);

    // Temps pour atteindre le matelas
    const monthsToSafety = (flowToSafety > 0 && safetyGap > 0) ? (safetyGap / flowToSafety) : 0;

    // Données Graphique
    const dataChart = [
        { name: "Besoins", value: needsTotal, color: CATEGORIES.BESOIN.color },
        { name: "Plaisirs", value: wantsTotal, color: CATEGORIES.ENVIE.color },
        { name: "Objectifs", value: totalGoalsAlloc, color: "#a855f7" }, // Violet
        { name: "Stratégie", value: strategyCapacity, color: "#10b981" },
    ].filter(d => d.value > 0);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans">
            <Sidebar />
            <main className="md:ml-64 flex-1 w-auto max-w-full overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
                    
                    {/* HEADER REVENUS */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Budget & Stratégie<span className="text-emerald-500">.</span></h1>
                            <p className="text-zinc-400">Pilotez vos flux : Dépenses, Objectifs et Investissement.</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                             <div className="text-right">
                                 <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Revenus Net</p>
                                 <div className="flex items-center justify-end gap-1">
                                    <Input type="number" value={income || ""} onChange={(e) => handleIncomeChange(e.target.value)} className="h-6 w-24 bg-transparent border-none text-right text-xl font-bold text-white p-0 focus-visible:ring-0" />
                                    <span className="text-zinc-400">€</span>
                                 </div>
                             </div>
                        </div>
                    </header>

                    {/* KPI PRINCIPAL : LE FLUX D'INVESTISSEMENT FINAL */}
                    <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/50 to-zinc-900 border border-emerald-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 text-emerald-500 font-medium"><TrendingUp size={18} /> Capacité d'Investissement Nette</div>
                            <div className="text-5xl md:text-7xl font-black text-white tracking-tighter"><AnimatedNumber value={flowToInvest} /> €</div>
                            <p className="text-zinc-400 text-sm mt-2">Montant disponible pour la Bourse / Crypto après sécurité et objectifs.</p>
                        </div>
                        
                        {/* BOUTON PROJECTION (CORRIGÉ : VERS /projection) */}
                        <Link href="/projection" className="relative z-10">
                            <Button className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105">
                                Projeter cette richesse <ArrowRight className="ml-2" />
                            </Button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* COLONNE GAUCHE : DÉPENSES & OBJECTIFS */}
                        <div className="space-y-8">
                            
                            {/* 1. GRAPHIQUE */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex items-center gap-6">
                                <div className="h-[160px] w-[160px] shrink-0 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={dataChart} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                                {dataChart.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} formatter={(value: any) => `${value} €`}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-[10px] text-zinc-500 font-bold uppercase">Entrées</span><span className="text-lg font-bold text-white">{income}€</span></div>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <h3 className="font-bold text-white mb-2">Répartition Mensuelle</h3>
                                    {dataChart.map((d, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}/> <span className="text-zinc-400">{d.name}</span></div>
                                            <span className="text-white font-medium">{d.value} €</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. OBJECTIFS MENSUELS */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Target size={18} className="text-purple-500"/> Objectifs (Épargne Projet)</h3>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                    {goals.map((g) => (
                                        <div key={g.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center"><Car size={14}/></div>
                                                <span className="text-white font-medium">{g.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-purple-400 font-bold">-{g.amount} €/mois</span>
                                                <button onClick={() => removeGoal(g.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Ajout Objectif */}
                                    <div className="flex gap-2 mt-2">
                                        <Input placeholder="Projet (ex: Voiture)" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white h-9 text-sm" />
                                        <div className="relative w-24"><Input type="number" placeholder="€" value={newGoalAmount} onChange={(e) => setNewGoalAmount(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white pr-1 h-9 text-sm text-right" /></div>
                                        <Button onClick={addGoal} size="sm" className="bg-purple-600 hover:bg-purple-500 text-white"><Plus size={16} /></Button>
                                    </div>
                                </div>
                            </div>

                            {/* 3. DÉPENSES COURANTES */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ShoppingCart size={18} className="text-blue-500"/> Dépenses Courantes</h3>
                                {/* Input Ajout Dépense */}
                                <div className="flex gap-2 mb-2">
                                    <Input placeholder="Dépense (ex: Netflix)" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white h-10" />
                                    <div className="relative w-24"><Input type="number" placeholder="€" value={newItemAmount} onChange={(e) => setNewItemAmount(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white text-right h-10" /></div>
                                    <Button onClick={addExpense} className="bg-zinc-800 hover:bg-zinc-700 text-white"><Plus size={18} /></Button>
                                </div>
                                {/* Liste Dépenses */}
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {expenses.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/30 group hover:bg-zinc-900 transition-colors">
                                            <span className="text-zinc-300 text-sm">{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-bold ${item.category === 'BESOIN' ? 'text-blue-400' : 'text-yellow-400'}`}>{item.amount} €</span>
                                                <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* COLONNE DROITE : STRATÉGIE MATELAS vs INVEST */}
                        <div className="space-y-6">
                            
                            {/* BLOC MATELAS DE SECURITÉ */}
                            <div className={`p-6 rounded-3xl border ${isSafe ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-orange-950/20 border-orange-500/30'} transition-colors`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className={`text-lg font-bold flex items-center gap-2 ${isSafe ? 'text-emerald-500' : 'text-orange-500'}`}>
                                            <ShieldCheck size={20}/> Matelas de Sécurité
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1">Objectif : 6 mois de charges ({Math.round(oneMonthExpenses)}€ /mois)</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isSafe ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-orange-500/10 border-orange-500 text-orange-500'}`}>
                                        {isSafe ? "SÉCURISÉ" : "EN COURS"}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-bold text-white"><AnimatedNumber value={currentCash} /> €</span>
                                    <span className="text-sm text-zinc-500">sur {safetyTarget} €</span>
                                </div>
                                {/* Barre de progression */}
                                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden mb-4">
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${Math.min(100, (currentCash / safetyTarget) * 100)}%` }} 
                                        className={`h-full ${isSafe ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                    />
                                </div>

                                {!isSafe && (
                                    <div className="bg-black/40 rounded-xl p-3 flex items-start gap-3 border border-orange-500/20">
                                        <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5"/>
                                        <div className="space-y-1">
                                            <p className="text-xs text-orange-200">Attention, votre épargne de précaution est insuffisante.</p>
                                            <p className="text-xs text-zinc-400">Il manque <strong>{Math.round(safetyGap)} €</strong>. À ce rythme, sécurité atteinte dans <strong>{flowToSafety > 0 ? Math.ceil(monthsToSafety) : "∞"} mois</strong>.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* BLOC CURSEUR D'ALLOCATION */}
                            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
                                <h3 className="text-lg font-bold text-white mb-6">Répartition du Reste à Vivre</h3>
                                
                                <div className="mb-8 px-2">
                                    {/* SLIDER SIMULÉ */}
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        step="10"
                                        value={safetyAllocation}
                                        onChange={(e) => setSafetyAllocation(Number(e.target.value))}
                                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        disabled={isSafe} 
                                    />
                                    <div className="flex justify-between mt-3 text-xs font-bold uppercase tracking-wider">
                                        <span className={!isSafe ? "text-emerald-500" : "text-zinc-600"}>Investir</span>
                                        <span className={!isSafe ? "text-orange-500" : "text-zinc-600"}>Sécuriser</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-2xl border ${isSafe ? 'bg-emerald-500/5 border-emerald-500/20 opacity-50' : 'bg-orange-500/10 border-orange-500/50'}`}>
                                        <p className="text-xs text-zinc-400 uppercase font-bold">Vers Matelas</p>
                                        <p className={`text-xl font-bold ${isSafe ? 'text-emerald-500' : 'text-orange-500'}`}>{isSafe ? 0 : flowToSafety.toFixed(0)} €</p>
                                        <p className="text-[10px] text-zinc-500">{isSafe ? "0%" : `${safetyAllocation}%`}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/50">
                                        <p className="text-xs text-zinc-400 uppercase font-bold">Vers Bourse/Crypto</p>
                                        <p className="text-xl font-bold text-emerald-400">{flowToInvest.toFixed(0)} €</p>
                                        <p className="text-[10px] text-zinc-500">{isSafe ? "100%" : `${100 - safetyAllocation}%`}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}