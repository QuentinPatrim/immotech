"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, ShoppingBag, Home, Target, ShieldCheck, Loader2, ChevronLeft, ChevronRight, Save, TrendingUp, AlertTriangle, Coffee, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; // <--- AJOUT IMPORTANT

// --- UTILITAIRES ---
const formatMonth = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
};

// --- DETECTION CATEGORIE ---
const detectCategory = (name: string) => {
  const n = name.toLowerCase();
  const keywords = {
    besoin: ["loyer", "crédit", "immo", "courses", "eau", "elec", "gaz", "internet", "assurance", "impôt", "transport", "essence", "charges", "abonnement", "box", "téléphone"],
    epargne: ["bourse", "crypto", "livret", "cash", "action", "etf", "dca"]
  };
  if (keywords.besoin.some(k => n.includes(k))) return "BESOIN";
  if (keywords.epargne.some(k => n.includes(k))) return "EPARGNE";
  return "ENVIE"; 
};

export default function BudgetPage() {
    // --- ÉTATS ---
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [isExistingMonth, setIsExistingMonth] = useState(false); 

    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState<{id: string, name: string, amount: number, category: string}[]>([]);
    
    // UI
    const [newItemName, setNewItemName] = useState("");
    const [newItemAmount, setNewItemAmount] = useState("");

    const [currentCash, setCurrentCash] = useState(0);
    const [loading, setLoading] = useState(true);
    const [safetyAllocation, setSafetyAllocation] = useState(50);
    
    const [historyData, setHistoryData] = useState<any[]>([]);

    // --- 1. CHARGEMENT ---
    useEffect(() => {
        loadMonthData(selectedDate);
    }, [selectedDate]);

    const loadMonthData = async (date: Date) => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const user = session.user;

        const startOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().split('T')[0];

        // 1. Chercher si ce mois existe déjà
        const { data: history } = await supabase
            .from('monthly_history')
            .select('*')
            .eq('user_id', user.id)
            .eq('month', startOfMonth)
            .maybeSingle();

        if (history) {
            setIsExistingMonth(true);
            setIncome(history.income || 0);
            if (history.details_json && Array.isArray(history.details_json)) {
                setExpenses(history.details_json);
            }
        } else {
            setIsExistingMonth(false);
            // Template profil par défaut
            const { data: profile } = await supabase.from('profiles').select('budget_json, assets_json').eq('id', user.id).single();
            if (profile) {
                if (profile.budget_json) {
                    const b = profile.budget_json as any;
                    setIncome(Number(b.income) || 0);
                    if (Array.isArray(b.details)) setExpenses(b.details);
                }
                if (Array.isArray(profile.assets_json)) {
                    const cash = (profile.assets_json as any[])
                        .filter(a => a.type === "Cash" || (a.type && a.type.includes("Livret")))
                        .reduce((acc, a) => acc + (a.value || 0), 0);
                    setCurrentCash(cash);
                }
            }
        }
        fetchHistoryGraph(user.id);
        setLoading(false);
    };

    const fetchHistoryGraph = async (userId: string) => {
        const { data: hist } = await supabase
            .from('monthly_history')
            .select('*')
            .eq('user_id', userId)
            .order('month', { ascending: true })
            .limit(6);
        
        if (hist && hist.length > 0) {
            const formatted = hist.map(h => {
                let needs = 0;
                let wants = 0;
                if (h.details_json && Array.isArray(h.details_json)) {
                    needs = h.details_json.filter((e:any) => e.category === 'BESOIN').reduce((acc:number, i:any) => acc + i.amount, 0);
                    wants = h.details_json.filter((e:any) => e.category !== 'BESOIN').reduce((acc:number, i:any) => acc + i.amount, 0);
                } else {
                    needs = Number(h.expenses) || 0;
                }

                return {
                    name: new Date(h.month).toLocaleDateString('fr-FR', { month: 'short' }),
                    Revenus: h.income,
                    Besoins: needs,
                    Loisirs: wants,
                    Investi: h.invested
                };
            });
            setHistoryData(formatted);
        }
    };

    // --- 2. ACTIONS ---
    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedDate(newDate);
    };

    const saveCurrentMonth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setLoading(true);

        const totalExp = expenses.reduce((acc, i) => acc + i.amount, 0);
        const investCapacity = Math.max(0, income - totalExp);
        const saveDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];

        const { error } = await supabase.from('monthly_history').upsert({
            user_id: user.id,
            month: saveDate,
            income: income,
            expenses: totalExp,
            invested: investCapacity * (1 - (safetyAllocation/100)),
            saved: investCapacity * (safetyAllocation/100),
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

    // --- 3. LOGIQUE METIER ---
    const addExpense = () => {
        if (!newItemName || !newItemAmount) return;
        const val = parseFloat(newItemAmount);
        if (isNaN(val)) return;
        const newExp = [...expenses, { id: Date.now().toString(), name: newItemName, amount: val, category: detectCategory(newItemName) }];
        setExpenses(newExp);
        setNewItemName(""); setNewItemAmount("");
    };
    const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

    // Calculs
    const needsList = expenses.filter(e => e.category === 'BESOIN');
    const wantsList = expenses.filter(e => e.category !== 'BESOIN' && e.category !== 'EPARGNE');

    const totalExp = expenses.reduce((acc, i) => acc + i.amount, 0);
    const investCapacity = Math.max(0, income - totalExp);
    
    // Matelas
    const safetyTarget = totalExp * 6;
    const safetyGap = Math.max(0, safetyTarget - currentCash);
    const isSafe = currentCash >= safetyTarget && safetyTarget > 0;
    
    const flowToSafety = investCapacity * (isSafe ? 0 : safetyAllocation/100);
    const flowToInvest = investCapacity * (1 - (isSafe ? 0 : safetyAllocation/100));

    if (loading && expenses.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans pb-24 md:pb-8">
            <Sidebar />
            <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
                    
                    {/* --- HEADER --- */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} className="rounded-full border-zinc-700 hover:bg-zinc-800 text-white"><ChevronLeft size={20}/></Button>
                            <div className="text-center min-w-[150px]">
                                <h2 className="text-2xl font-bold text-white capitalize">{formatMonth(selectedDate)}</h2>
                                <p className="text-xs text-zinc-500">{isExistingMonth ? "Données enregistrées" : "Mode Édition"}</p>
                            </div>
                            <Button variant="outline" size="icon" onClick={() => changeMonth(1)} className="rounded-full border-zinc-700 hover:bg-zinc-800 text-white"><ChevronRight size={20}/></Button>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Revenus du mois</span>
                                <div className="flex items-center gap-2 bg-black px-3 py-1 rounded-lg border border-zinc-800">
                                    <Input type="number" value={income || ""} onChange={(e) => setIncome(parseFloat(e.target.value))} className="h-8 w-24 bg-transparent border-none text-right text-lg font-bold text-white p-0 focus-visible:ring-0" />
                                    <span className="text-zinc-500">€</span>
                                </div>
                            </div>
                            <Button onClick={saveCurrentMonth} className="h-12 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]"><Save size={18} className="mr-2"/> Enregistrer</Button>
                        </div>
                    </div>

                    {/* --- GRAPHIQUE ÉVOLUTION --- */}
                    <div className="hidden md:block p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800 h-[300px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Évolution & Répartition</h3>
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={historyData} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                    cursor={{fill: '#ffffff05'}}
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize:'12px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }} 
                                />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                                    formatter={(value) => <span className="text-zinc-400 ml-1">{value}</span>}
                                />
                                <Bar dataKey="Revenus" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={16} />
                                <Bar dataKey="Besoins" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                                <Bar dataKey="Loisirs" fill="#eab308" radius={[4, 4, 0, 0]} barSize={16} />
                                <Bar dataKey="Investi" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* --- KPI INVESTISSEMENT + BOUTON PROJECTION (AJOUTÉ ICI) --- */}
                    <div className="relative p-8 rounded-3xl bg-gradient-to-br from-emerald-950 to-zinc-900 border border-emerald-500/20 overflow-hidden text-center md:text-left">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex-1">
                                <p className="text-emerald-500 font-medium text-sm flex items-center justify-center md:justify-start gap-2 mb-1"><Target size={16}/> Capacité d'Investissement Réelle</p>
                                <div className="text-5xl md:text-7xl font-black text-white tracking-tighter"><AnimatedNumber value={investCapacity} /></div>
                                <p className="text-zinc-400 text-sm mt-2 mb-6">Ce qu'il reste vraiment à la fin du mois pour votre futur.</p>
                                
                                {/* LE BOUTON MAGIQUE */}
                                <Link href="/projection">
                                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl px-6 h-12 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:scale-105 transition-transform">
                                        Projeter cette richesse <ArrowRight size={18} className="ml-2"/>
                                    </Button>
                                </Link>
                            </div>
                            
                            <div className="h-40 w-40 rounded-full border-8 border-zinc-800 flex items-center justify-center relative shrink-0">
                                <div className="absolute inset-0 border-8 border-emerald-500 rounded-full" style={{ clipPath: `inset(0 ${100 - (income > 0 ? (investCapacity/income)*100 : 0)}% 0 0)` }}></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-bold text-white">{income > 0 ? ((investCapacity/income)*100).toFixed(0) : 0}%</span>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Taux d'Épargne</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ZONE DÉPENSES SÉPARÉE --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        <div className="space-y-8">
                            
                            {/* Input Ajout Rapide */}
                            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                                <h3 className="text-xs font-bold text-white uppercase mb-3">Ajouter une dépense</h3>
                                <div className="flex gap-2">
                                    <Input placeholder="Nom..." value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="bg-black border-zinc-700 text-white h-10" />
                                    <div className="w-28"><Input type="number" placeholder="€" value={newItemAmount} onChange={(e) => setNewItemAmount(e.target.value)} className="bg-black border-zinc-700 text-white text-right h-10 font-bold" /></div>
                                    <Button onClick={addExpense} className="bg-white text-black hover:bg-zinc-200 h-10 w-10"><Plus size={20} /></Button>
                                </div>
                            </div>

                            {/* LISTE 1 : CHARGES FIXES */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-blue-400 flex items-center gap-2"><Home size={18}/> Charges Fixes & Besoins</h3>
                                <div className="space-y-2">
                                    {needsList.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/30 border-l-4 border-l-blue-500">
                                            <div>
                                                <p className="text-zinc-200 text-sm font-medium">{item.name}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-white">{item.amount} €</span>
                                                <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {needsList.length === 0 && <p className="text-xs text-zinc-600 italic">Aucune charge fixe.</p>}
                                </div>
                            </div>

                            {/* LISTE 2 : LOISIRS */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-yellow-400 flex items-center gap-2"><Coffee size={18}/> Loisirs & Exceptionnel</h3>
                                <div className="space-y-2">
                                    {wantsList.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/30 border-l-4 border-l-yellow-500">
                                            <div>
                                                <p className="text-zinc-200 text-sm font-medium">{item.name}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-white">{item.amount} €</span>
                                                <button onClick={() => removeExpense(item.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {wantsList.length === 0 && <p className="text-xs text-zinc-600 italic">Aucun loisir ce mois-ci.</p>}
                                </div>
                            </div>
                        </div>

                        {/* DROITE: STRATÉGIE */}
                        <div className="space-y-6">
                            <div className={`p-5 rounded-2xl border ${isSafe ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-orange-950/20 border-orange-500/20'}`}>
                                <div className="flex justify-between mb-2">
                                    <div className="flex items-center gap-2 font-bold text-sm text-white"><ShieldCheck size={16} className={isSafe ? "text-emerald-500" : "text-orange-500"}/> Matelas Sécurité</div>
                                    <span className="text-xs text-zinc-500">Cible: {Math.round(safetyTarget)}€ (6 mois)</span>
                                </div>
                                <div className="text-2xl font-bold text-white mb-2"><AnimatedNumber value={currentCash}/> €</div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (currentCash/(safetyTarget || 1))*100)}%`}} className={`h-full ${isSafe ? 'bg-emerald-500':'bg-orange-500'}`} />
                                </div>
                                {!isSafe && <div className="mt-3 text-xs text-orange-300 flex gap-2"><AlertTriangle size={12}/> <span>Manque {Math.round(safetyGap)}€.</span></div>}
                            </div>

                            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                                <h3 className="font-bold text-white text-sm mb-4">Répartition du Surplus ({Math.round(investCapacity)}€)</h3>
                                <input 
                                    type="range" min="0" max="100" step="10" 
                                    value={safetyAllocation} onChange={(e) => setSafetyAllocation(Number(e.target.value))} 
                                    disabled={isSafe}
                                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                                />
                                <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-emerald-500">Investir {100-safetyAllocation}% ({Math.round(flowToInvest)}€)</span>
                                    <span className={isSafe ? "text-zinc-600" : "text-orange-500"}>Sécuriser {safetyAllocation}% ({Math.round(flowToSafety)}€)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}