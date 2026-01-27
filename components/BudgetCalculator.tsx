"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp, AlertCircle, ArrowRight, Pencil, Check, Activity, Zap, Wallet, PieChart as PieIcon, CreditCard, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { useRouter } from "next/navigation";

// --- TYPES & DATA ---
type Expense = { id: string; name: string; amount: number; category?: string; };

const CATEGORIES: Record<string, { label: string, color: string, type: 'fixed' | 'variable' | 'savings' }> = {
  housing: { label: "Logement", color: "#ef4444", type: "fixed" },
  food: { label: "Alimentation", color: "#f59e0b", type: "variable" },
  transport: { label: "Transport", color: "#3b82f6", type: "fixed" },
  utilities: { label: "Abos & Factures", color: "#8b5cf6", type: "fixed" },
  fun: { label: "Loisirs", color: "#ec4899", type: "variable" },
  savings: { label: "Épargne", color: "#10b981", type: "savings" },
  other: { label: "Autre", color: "#71717a", type: "variable" }
};

const KEYWORDS: Record<string, string[]> = {
    housing: ["loyer", "crédit", "credit", "maison", "appart", "assurance habit"],
    food: ["course", "lidl", "auchan", "carrefour", "resto", "mcdo", "uber eats"],
    transport: ["essence", "uber", "train", "navigo", "péage", "parking"],
    utilities: ["edf", "gaz", "internet", "sfr", "orange", "free", "netflix", "spotify", "apple"],
    savings: ["livret", "pea", "cto", "crypto", "bitcoin", "épargne", "virement"]
};

export default function BudgetCalculator() {
  const router = useRouter();
  
  // CORRECTION 1 : income est géré comme string pour pouvoir l'effacer ("")
  const [income, setIncome] = useState<string | number>(""); 
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Formulaire & Edition
  const [newExpName, setNewExpName] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null); 
  
  const [riskProfile, setRiskProfile] = useState([50]);

  useEffect(() => {
    const saved = localStorage.getItem("myBudget");
    if (saved) {
        const data = JSON.parse(saved);
        if (data.income) setIncome(data.income);
        if (data.expenses) setExpenses(data.expenses);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // On sauvegarde la valeur numérique (0 si vide)
    const incomeValue = income === "" ? 0 : Number(income);
    if (isLoaded) localStorage.setItem("myBudget", JSON.stringify({ income: incomeValue, expenses }));
  }, [income, expenses, isLoaded]);

  // --- LOGIQUE ---
  const detectCategory = (name: string) => {
      const lower = name.toLowerCase();
      for (const [cat, words] of Object.entries(KEYWORDS)) {
          if (words.some(w => lower.includes(w))) return cat;
      }
      return "other";
  };

  const handleSaveExpense = () => {
    if (!newExpName || !newExpAmount) return;
    const amountVal = parseFloat(newExpAmount);
    const cat = detectCategory(newExpName);

    if (editingId) {
        setExpenses(expenses.map(e => e.id === editingId ? { ...e, name: newExpName, amount: amountVal, category: cat } : e));
        setEditingId(null);
    } else {
        setExpenses([...expenses, { id: Date.now().toString(), name: newExpName, amount: amountVal, category: cat }]);
    }
    setNewExpName(""); setNewExpAmount("");
  };

  const startEditing = (exp: Expense) => {
      setNewExpName(exp.name);
      setNewExpAmount(exp.amount.toString());
      setEditingId(exp.id);
  };

  const cancelEditing = () => {
      setNewExpName(""); setNewExpAmount("");
      setEditingId(null);
  };

  const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

  const audit = () => {
      let fixed = 0, variable = 0, saved = 0;
      const breakdownData: any[] = [];
      const groups: Record<string, number> = {};

      // On convertit income en nombre pour les calculs
      const currentIncome = Number(income) || 0;

      expenses.forEach(e => {
          const cat = e.category || detectCategory(e.name);
          const type = CATEGORIES[cat]?.type || 'variable';
          if (type === 'fixed') fixed += e.amount; else if (type === 'savings') saved += e.amount; else variable += e.amount;
          groups[cat] = (groups[cat] || 0) + e.amount;
      });

      const totalExpenses = fixed + variable;
      const realSavings = Math.max(0, currentIncome - totalExpenses); 
      const investCapacity = realSavings + saved;

      // Score
      const needsRatio = currentIncome > 0 ? (fixed / currentIncome) * 100 : 0;
      const wantsRatio = currentIncome > 0 ? (variable / currentIncome) * 100 : 0;
      const savingsRatio = currentIncome > 0 ? (investCapacity / currentIncome) * 100 : 0;
      
      let score = 100;
      if (currentIncome > 0) {
          if (needsRatio > 50) score -= (needsRatio - 50);
          if (wantsRatio > 30) score -= (wantsRatio - 30);
          if (savingsRatio < 20) score -= (20 - savingsRatio);
      } else {
          score = 0;
      }
      
      score = Math.max(0, Math.min(100, Math.round(score)));

      Object.entries(groups).forEach(([key, val]) => {
          breakdownData.push({ name: CATEGORIES[key]?.label || key, value: val, color: CATEGORIES[key]?.color || "#fff" });
      });
      if (realSavings > 0) breakdownData.push({ name: "Cashflow Libre", value: realSavings, color: "#10b981" });

      return { fixed, variable, investCapacity, score, needsRatio, wantsRatio, savingsRatio, breakdownData };
  };

  const stats = audit();
  const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  // DCA CALCUL
  const risk = riskProfile[0] / 100;
  const stockAlloc = Math.round(stats.investCapacity * (0.2 + (risk * 0.6)));
  const cryptoAlloc = Math.round(stats.investCapacity * (0.1 + (risk * 0.2)));
  const secureAlloc = Math.max(0, stats.investCapacity - stockAlloc - cryptoAlloc);

  // --- NAVIGATION VERS PROJECTION ---
  const goToProjection = () => {
      const strategy = {
          stock: stockAlloc,
          crypto: cryptoAlloc,
          secure: secureAlloc,
          total: stats.investCapacity
      };
      localStorage.setItem("dcaStrategy", JSON.stringify(strategy));
      router.push("/projection");
  };

  if (!isLoaded) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
        {/* HERO SECTION (Investissement) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 relative overflow-hidden border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-6 flex flex-col justify-center shadow-2xl">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[100px] rounded-full"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-zinc-400 font-medium flex items-center gap-2 mb-2"><Zap size={16} className="text-yellow-500"/> Capacité d'Investissement</p>
                        <div className="text-5xl md:text-6xl font-black text-white tracking-tight"><AnimatedNumber value={stats.investCapacity} /></div>
                        <p className="text-emerald-500 text-sm mt-2 font-bold">Soit {formatEuro(stats.investCapacity * 12)} / an</p>
                    </div>
                    <div className="hidden md:flex flex-col items-center">
                         <div className="relative h-24 w-24 flex items-center justify-center">
                            <svg className="h-full w-full" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="8" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke={stats.score > 75 ? "#10b981" : stats.score > 50 ? "#f59e0b" : "#ef4444"} strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * stats.score) / 100} strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-1000 ease-out" />
                            </svg>
                            <span className="absolute text-2xl font-bold text-white">{stats.score}</span>
                         </div>
                    </div>
                </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm flex flex-col justify-center">
                <CardHeader><CardTitle className="text-zinc-400 text-sm uppercase tracking-widest">Revenus Net</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 bg-zinc-950/50 p-2 rounded-xl border border-zinc-800/50">
                        {/* CORRECTION 2 : Gestion input propre (String vide si 0) */}
                        <Input 
                            type="number" 
                            value={income === 0 ? "" : income} 
                            onChange={(e) => setIncome(e.target.value)} 
                            placeholder="0"
                            className="bg-transparent border-none text-3xl font-bold text-white p-0 h-auto focus-visible:ring-0 placeholder:text-zinc-700"
                        />
                        <span className="text-zinc-500 pr-4">€</span>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GESTION DÉPENSES (Avec Edit) */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="border-zinc-800 bg-zinc-900/30 h-full">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><CreditCard size={18} className="text-blue-500"/> Charges & Dépenses</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2 relative">
                            {/* CORRECTION 3 : text-white ajouté pour la visibilité */}
                            <Input 
                                placeholder={editingId ? "Modifier..." : "Netflix, Loyer..."} 
                                value={newExpName} 
                                onChange={(e) => setNewExpName(e.target.value)} 
                                className="bg-zinc-950 border-zinc-800 text-sm text-white placeholder:text-zinc-500" 
                            />
                            <Input 
                                type="number" 
                                placeholder="€" 
                                value={newExpAmount} 
                                onChange={(e) => setNewExpAmount(e.target.value)} 
                                className="w-20 bg-zinc-950 border-zinc-800 text-sm text-white placeholder:text-zinc-500" 
                            />
                            
                            {editingId ? (
                                <div className="flex gap-1">
                                    <Button onClick={handleSaveExpense} size="icon" className="bg-blue-600 hover:bg-blue-700 h-10 w-10"><Check size={16}/></Button>
                                    <Button onClick={cancelEditing} size="icon" variant="ghost" className="text-zinc-500 hover:text-white h-10 w-10"><X size={16}/></Button>
                                </div>
                            ) : (
                                <Button onClick={handleSaveExpense} size="icon" className="bg-zinc-800 hover:bg-zinc-700 h-10 w-10"><Plus size={16}/></Button>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {expenses.map((exp) => {
                                const catKey = exp.category || detectCategory(exp.name);
                                const catColor = CATEGORIES[catKey]?.color || "#fff";
                                return (
                                    <div key={exp.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${editingId === exp.id ? "bg-blue-900/20 border-blue-500/50" : "bg-zinc-950/40 border-zinc-800/50 hover:border-zinc-700 group"}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: catColor, boxShadow: `0 0 8px ${catColor}` }} />
                                            <span className="text-sm text-zinc-300 truncate max-w-[100px]">{exp.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-white">{exp.amount}€</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditing(exp)} className="text-zinc-500 hover:text-blue-400"><Pencil size={14}/></button>
                                                <button onClick={() => removeExpense(exp.id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* DONUT CHART */}
            <div className="lg:col-span-4 space-y-6">
                 <Card className="border-zinc-800 bg-zinc-900/30 h-full flex flex-col">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><PieIcon size={18} className="text-purple-500"/> Répartition</CardTitle></CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center -mt-4">
                        <div className="h-[200px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.breakdownData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {stats.breakdownData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} formatter={(value: any) => formatEuro(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xs text-zinc-500 uppercase tracking-widest">Total</span>
                                <span className="text-xl font-bold text-white">{formatEuro(Number(income))}</span>
                            </div>
                        </div>
                        <div className="w-full space-y-3 mt-4">
                             <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Besoins (50%)</span><span className={`font-mono ${stats.needsRatio > 55 ? "text-red-400" : "text-emerald-400"}`}>{stats.needsRatio.toFixed(0)}%</span></div>
                             <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Envies (30%)</span><span className={`font-mono ${stats.wantsRatio > 35 ? "text-amber-400" : "text-blue-400"}`}>{stats.wantsRatio.toFixed(0)}%</span></div>
                             <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Épargne (20%)</span><span className={`font-mono ${stats.savingsRatio < 15 ? "text-red-400" : "text-emerald-400"}`}>{stats.savingsRatio.toFixed(0)}%</span></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* DCA STRATEGY */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="border-zinc-800 bg-zinc-900/30 h-full flex flex-col">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> Allocation DCA</CardTitle></CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-6">
                        <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Profil Risque</span>
                                <span className="text-sm font-bold text-blue-500">{riskProfile[0]}%</span>
                             </div>
                             <Slider value={riskProfile} onValueChange={setRiskProfile} max={100} step={10} />
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-md text-blue-400"><Activity size={16}/></div><span className="text-xs text-blue-300 font-bold">ETF / Bourse</span></div>
                                <span className="text-lg font-bold text-white">{formatEuro(stockAlloc)}</span>
                            </div>
                            <div className="p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3"><div className="p-2 bg-purple-500/20 rounded-md text-purple-400"><Zap size={16}/></div><span className="text-xs text-purple-300 font-bold">Crypto</span></div>
                                <span className="text-lg font-bold text-white">{formatEuro(cryptoAlloc)}</span>
                            </div>
                            <div className="p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/20 rounded-md text-emerald-400"><Wallet size={16}/></div><span className="text-xs text-emerald-300 font-bold">Sécurisé</span></div>
                                <span className="text-lg font-bold text-white">{formatEuro(secureAlloc)}</span>
                            </div>
                        </div>
                        {/* BOUTON QUI DÉCLENCHE LA SAUVEGARDE DE LA STRATÉGIE */}
                        <Button onClick={goToProjection} className="mt-auto w-full bg-white text-black hover:bg-zinc-200 font-bold">
                            Projeter cette richesse <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}