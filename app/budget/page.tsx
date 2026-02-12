"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, Home, Target, ShieldCheck, Loader2, ChevronLeft, ChevronRight, Save, TrendingUp, AlertTriangle, Coffee, ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; 

const formatMonth = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
};

export default function BudgetPage() {
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [isExistingMonth, setIsExistingMonth] = useState(false); 
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState<{id: string, name: string, amount: number, category: string}[]>([]);
    
    // INPUTS SÉPARÉS
    const [newNeedName, setNewNeedName] = useState("");
    const [newNeedAmount, setNewNeedAmount] = useState("");
    const [newWantName, setNewWantName] = useState("");
    const [newWantAmount, setNewWantAmount] = useState("");

    const [currentCash, setCurrentCash] = useState(0);
    const [loading, setLoading] = useState(true);
    const [safetyAllocation, setSafetyAllocation] = useState(50);
    const [historyData, setHistoryData] = useState<any[]>([]);

    useEffect(() => {
        loadMonthData(selectedDate);
    }, [selectedDate]);

    const loadMonthData = async (date: Date) => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const user = session.user;
        const startOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];

        // 1. Get Profile (Cash)
        const { data: profile } = await supabase.from('profiles').select('budget_json, assets_json').eq('id', user.id).single();
        if (profile && Array.isArray(profile.assets_json)) {
            const cash = (profile.assets_json as any[])
                .filter(a => a.type === "Cash" || (a.type && a.type.includes("Livret")))
                .reduce((acc, a) => acc + (a.value || 0), 0);
            setCurrentCash(cash);
        }

        // 2. Get History
        const { data: history } = await supabase.from('monthly_history').select('*').eq('user_id', user.id).eq('month', startOfMonth).maybeSingle();

        if (history) {
            setIsExistingMonth(true);
            setIncome(history.income || 0);
            if (history.details_json && Array.isArray(history.details_json)) setExpenses(history.details_json);
        } else {
            setIsExistingMonth(false);
            if (profile && profile.budget_json) {
                const b = profile.budget_json as any;
                setIncome(Number(b.income) || 0);
                if (Array.isArray(b.details)) setExpenses(b.details);
            }
        }
        fetchHistoryGraph(user.id);
        setLoading(false);
    };

    const fetchHistoryGraph = async (userId: string) => {
        const { data: hist } = await supabase.from('monthly_history').select('*').eq('user_id', userId).order('month', { ascending: true }).limit(6);
        if (hist && hist.length > 0) {
            const formatted = hist.map(h => {
                let needs = 0; let wants = 0;
                if (h.details_json && Array.isArray(h.details_json)) {
                    needs = h.details_json.filter((e:any) => e.category === 'BESOIN').reduce((acc:number, i:any) => acc + i.amount, 0);
                    wants = h.details_json.filter((e:any) => e.category !== 'BESOIN').reduce((acc:number, i:any) => acc + i.amount, 0);
                } else {
                    needs = Number(h.expenses) || 0;
                }
                return { name: new Date(h.month).toLocaleDateString('fr-FR', { month: 'short' }), Revenus: h.income, Besoins: needs, Loisirs: wants, Investi: h.invested };
            });
            setHistoryData(formatted);
        }
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedDate(newDate);
    };

    const totalExp = expenses.reduce((acc, i) => acc + i.amount, 0);
    const totalSurplus = Math.max(0, income - totalExp); 
    
    const safetyTarget = totalExp * 6;
    const safetyGap = Math.max(0, safetyTarget - currentCash);
    const isSafe = currentCash >= safetyTarget && safetyTarget > 0;
    
    const effectiveSafetyRate = isSafe ? 0 : (safetyAllocation / 100);
    const flowToSafety = totalSurplus * effectiveSafetyRate;
    const flowToInvest = totalSurplus - flowToSafety; 

    const saveCurrentMonth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setLoading(true);
        const saveDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];

        const { error } = await supabase.from('monthly_history').upsert({
            user_id: user.id, 
            month: saveDate, 
            income: income, 
            expenses: totalExp,
            invested: flowToInvest,
            saved: flowToSafety,
            details_json: expenses,
        }, { onConflict: 'user_id, month' });

        if (!error) {
            triggerHaptic("success");
            setIsExistingMonth(true);
            const now = new Date();
            if (now.getMonth() === selectedDate.getMonth() && now.getFullYear() === selectedDate.getFullYear()) {
                 await supabase.from('profiles').update({ budget_json: { income: income, expenses: totalExp, details: expenses }}).eq('id', user.id);
            }
            fetchHistoryGraph(user.id);
        }
        setLoading(false);
    };

    const addNeed = () => {
        if (!newNeedName || !newNeedAmount) return;
        const val = parseFloat(newNeedAmount); if (isNaN(val)) return;
        setExpenses([...expenses, { id: Date.now().toString(), name: newNeedName, amount: val, category: "BESOIN" }]);
        setNewNeedName(""); setNewNeedAmount("");
    };
    const addWant = () => {
        if (!newWantName || !newWantAmount) return;
        const val = parseFloat(newWantAmount); if (isNaN(val)) return;
        setExpenses([...expenses, { id: Date.now().toString(), name: newWantName, amount: val, category: "ENVIE" }]);
        setNewWantName(""); setNewWantAmount("");
    };
    const updateAmount = (id: string, newAmount: string) => {
        const val = parseFloat(newAmount); const safeVal = isNaN(val) ? 0 : val;
        setExpenses(expenses.map(e => e.id === id ? { ...e, amount: safeVal } : e));
    };
    const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

    const needsList = expenses.filter(e => e.category === 'BESOIN');
    const wantsList = expenses.filter(e => e.category !== 'BESOIN');

    if (loading && expenses.length === 0) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
            <Sidebar />
            <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
                
                {/* AMBIENT GLOWS */}
                <div className="fixed top-0 left-64 w-[600px] h-[600px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-yellow-900/5 rounded-full blur-[120px] pointer-events-none"></div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] mx-auto space-y-10 relative z-10">
                    
                    <header className="flex flex-col gap-2 border-l-4 border-yellow-500 pl-6 py-2">
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                            Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Budget</span>
                        </h1>
                        <p className="text-zinc-400 text-lg font-light tracking-wide">Gestion des flux mensuels & Épargne.</p>
                    </header>

                    {/* MOIS & REVENUS (NAVBAR) */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-900/40 backdrop-blur-xl p-6 rounded-[30px] border border-white/5 shadow-2xl">
                        <div className="flex items-center gap-6">
                            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} className="rounded-full border-white/10 hover:bg-white/10 text-white w-12 h-12"><ChevronLeft size={24}/></Button>
                            <div className="text-center min-w-[200px]">
                                <h2 className="text-3xl font-black text-white capitalize tracking-wide">{formatMonth(selectedDate)}</h2>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">{isExistingMonth ? "Données enregistrées" : "Mode Édition"}</p>
                            </div>
                            <Button variant="outline" size="icon" onClick={() => changeMonth(1)} className="rounded-full border-white/10 hover:bg-white/10 text-white w-12 h-12"><ChevronRight size={24}/></Button>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Revenus du mois</span>
                                <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-xl border border-white/10 relative">
                                    <Input type="number" value={income || ""} onChange={(e) => setIncome(parseFloat(e.target.value))} className="h-10 w-32 bg-transparent border-none text-right text-2xl font-black text-white p-0 pr-6 focus-visible:ring-0" />
                                    <span className="text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lg">€</span>
                                </div>
                            </div>
                            <Button onClick={saveCurrentMonth} className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-lg shadow-emerald-500/20 text-lg"><Save size={20} className="mr-2"/> Sauvegarder</Button>
                        </div>
                    </div>

                    {/* KPI INVESTISSEMENT DYNAMIQUE */}
                    <div className="relative p-10 rounded-[40px] bg-gradient-to-br from-emerald-950 to-black border border-emerald-500/20 overflow-hidden text-center md:text-left shadow-2xl group">
                        <div className="absolute top-0 right-0 p-64 bg-emerald-500/10 blur-[120px] rounded-full group-hover:bg-emerald-500/15 transition-all"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                            <div className="flex-1">
                                <p className="text-emerald-500 font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center md:justify-start gap-2 mb-4"><Target size={16}/> Capacité d'Investissement Nette</p>
                                <div className="text-7xl md:text-9xl font-black text-white tracking-tighter drop-shadow-2xl">
                                    <AnimatedNumber value={flowToInvest} />
                                </div>
                                <p className="text-zinc-400 text-sm mt-4 mb-8 font-light">
                                    Disponible pour l'investissement (après <span className="text-orange-400 font-bold">{Math.round(flowToSafety)}€</span> d'épargne de précaution).
                                </p>
                                <Link href="/projection">
                                    <Button className="bg-white text-black hover:bg-zinc-200 font-bold rounded-full px-8 h-12 shadow-lg hover:scale-105 transition-transform">
                                        Projeter cette richesse <ArrowRight size={18} className="ml-2"/>
                                    </Button>
                                </Link>
                            </div>
                            
                            <div className="h-48 w-48 rounded-full border-8 border-zinc-900 bg-zinc-950 flex items-center justify-center relative shrink-0 shadow-2xl">
                                <div className="absolute inset-0 rounded-full border-8 border-emerald-500" style={{ clipPath: `inset(0 ${100 - (income > 0 ? (totalSurplus/income)*100 : 0)}% 0 0)` }}></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-4xl font-black text-white">{income > 0 ? ((totalSurplus/income)*100).toFixed(0) : 0}%</span>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Taux d'Épargne</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        <div className="space-y-8">
                            
                            {/* BESOINS (Card Glass Blue) */}
                            <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-blue-500/10 backdrop-blur-md">
                                <h3 className="font-black text-blue-400 uppercase tracking-widest flex items-center gap-3 mb-6"><Home size={20}/> Charges Fixes & Besoins</h3>
                                <div className="flex gap-3 mb-4 p-2 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                    <Input placeholder="Loyer, Crédit..." value={newNeedName} onChange={(e) => setNewNeedName(e.target.value)} className="bg-transparent border-none text-white h-12 placeholder:text-zinc-600 focus-visible:ring-0 text-lg" />
                                    <div className="w-32 bg-black/40 rounded-xl flex items-center px-3 border border-white/5 relative">
                                        <Input type="number" placeholder="0" value={newNeedAmount} onChange={(e) => setNewNeedAmount(e.target.value)} className="bg-transparent border-none text-white text-right h-12 font-bold p-0 pr-6 focus-visible:ring-0 text-lg" />
                                        <span className="text-zinc-500 text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">€</span>
                                    </div>
                                    <Button onClick={addNeed} className="bg-blue-600 hover:bg-blue-500 text-white h-12 w-12 p-0 rounded-xl"><Plus size={24} /></Button>
                                </div>
                                <div className="space-y-3">
                                    {needsList.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-black/30 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                            <div className="pl-3"><p className="text-zinc-200 font-bold">{item.name}</p></div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-28 relative">
                                                    <Input type="number" value={item.amount} onChange={(e) => updateAmount(item.id, e.target.value)} className="bg-transparent border-none text-right text-white font-bold h-10 p-0 pr-6 focus-visible:ring-0" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none pr-1">€</span>
                                                </div>
                                                <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* LOISIRS (Card Glass Yellow) */}
                            <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-yellow-500/10 backdrop-blur-md">
                                <h3 className="font-black text-yellow-400 uppercase tracking-widest flex items-center gap-3 mb-6"><Coffee size={20}/> Loisirs & Plaisirs</h3>
                                <div className="flex gap-3 mb-4 p-2 bg-yellow-500/5 rounded-2xl border border-yellow-500/10">
                                    <Input placeholder="Resto, Vacances..." value={newWantName} onChange={(e) => setNewWantName(e.target.value)} className="bg-transparent border-none text-white h-12 placeholder:text-zinc-600 focus-visible:ring-0 text-lg" />
                                    <div className="w-32 bg-black/40 rounded-xl flex items-center px-3 border border-white/5 relative">
                                        <Input type="number" placeholder="0" value={newWantAmount} onChange={(e) => setNewWantAmount(e.target.value)} className="bg-transparent border-none text-white text-right h-12 font-bold p-0 pr-6 focus-visible:ring-0 text-lg" />
                                        <span className="text-zinc-500 text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">€</span>
                                    </div>
                                    <Button onClick={addWant} className="bg-yellow-600 hover:bg-yellow-500 text-white h-12 w-12 p-0 rounded-xl"><Plus size={24} /></Button>
                                </div>
                                <div className="space-y-3">
                                    {wantsList.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-black/30 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-colors">
                                            <div className="pl-3"><p className="text-zinc-200 font-bold">{item.name}</p></div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-28 relative">
                                                    <Input type="number" value={item.amount} onChange={(e) => updateAmount(item.id, e.target.value)} className="bg-transparent border-none text-right text-white font-bold h-10 p-0 pr-6 focus-visible:ring-0" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none pr-1">€</span>
                                                </div>
                                                <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* STRATEGIE */}
                        <div className="space-y-8">
                            <div className={`p-8 rounded-[32px] border flex flex-col justify-center min-h-[200px] ${isSafe ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-orange-950/20 border-orange-500/20'}`}>
                                <div className="flex justify-between mb-4">
                                    <div className="flex items-center gap-3 font-bold text-sm text-white uppercase tracking-widest"><ShieldCheck size={20} className={isSafe ? "text-emerald-500" : "text-orange-500"}/> Matelas Sécurité</div>
                                    <span className="text-xs text-zinc-500 font-mono">Cible: {Math.round(safetyTarget)}€ (6 mois)</span>
                                </div>
                                <div className="text-5xl font-black text-white mb-6 tracking-tight"><AnimatedNumber value={currentCash}/> <span className="text-2xl text-zinc-600">€</span></div>
                                <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                    <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (currentCash/(safetyTarget || 1))*100)}%`}} className={`h-full ${isSafe ? 'bg-emerald-500':'bg-orange-500'}`} />
                                </div>
                                {!isSafe && <div className="mt-4 text-xs text-orange-400 flex gap-2 font-bold bg-orange-500/10 p-3 rounded-xl border border-orange-500/20"><AlertTriangle size={14}/> <span>Attention : Il manque {Math.round(safetyGap)}€ pour être serein.</span></div>}
                            </div>

                            <div className="p-8 rounded-[32px] bg-zinc-900/40 border border-white/5 backdrop-blur-xl">
                                <h3 className="font-black text-white text-sm uppercase tracking-widest mb-6">Répartition du Surplus ({Math.round(totalSurplus)}€)</h3>
                                <input 
                                    type="range" min="0" max="100" step="10" 
                                    value={safetyAllocation} onChange={(e) => setSafetyAllocation(Number(e.target.value))} 
                                    disabled={isSafe}
                                    className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                                />
                                <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-widest">
                                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Investir {100-safetyAllocation}% ({Math.round(flowToInvest)}€)</div>
                                    <div className={`p-3 rounded-xl border ${isSafe ? "bg-zinc-800 text-zinc-600 border-zinc-700" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}`}>Sécuriser {safetyAllocation}% ({Math.round(flowToSafety)}€)</div>
                                </div>
                            </div>

                            {/* CHART HISTORY */}
                            <div className="p-6 rounded-[32px] bg-zinc-900/40 border border-white/5 h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={historyData} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                        <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '12px', fontSize:'12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                        <Bar dataKey="Revenus" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="Besoins" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="Investi" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}