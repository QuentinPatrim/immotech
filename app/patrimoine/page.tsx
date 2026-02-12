"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar"; // <--- SIDEBAR PRÉSENTE
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Building, Bitcoin, Landmark, Plus, Trash2, TrendingUp, PieChart as PieIcon, ArrowUpRight, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";

// --- CONFIGURATION ---
type AssetType = "Immobilier" | "Bourse" | "Crypto" | "Cash" | "Autre";
type Asset = { id: string; name: string; value: number; type: AssetType; };

const ASSET_CONFIG: Record<AssetType, { color: string; gradient: string; icon: any; label: string }> = {
  Immobilier: { color: "#3b82f6", gradient: "from-blue-600 to-blue-400", icon: Building, label: "Immobilier" },
  Bourse: { color: "#10b981", gradient: "from-emerald-600 to-emerald-400", icon: TrendingUp, label: "Bourse / PEA" },
  Crypto: { color: "#8b5cf6", gradient: "from-purple-600 to-purple-400", icon: Bitcoin, label: "Cryptomonnaies" },
  Cash: { color: "#f59e0b", gradient: "from-yellow-600 to-yellow-400", icon: Landmark, label: "Cash & Livrets" },
  Autre: { color: "#71717a", gradient: "from-zinc-600 to-zinc-400", icon: Wallet, label: "Autre" },
};

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

export default function PatrimoinePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [liquidCash, setLiquidCash] = useState(0);
  const [loading, setLoading] = useState(true);

  // Formulaire ajout
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<AssetType>("Bourse");

  useEffect(() => {
    const fetchAssets = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('assets_json').eq('id', session.user.id).maybeSingle();
        if (data && data.assets_json) {
          const loadedAssets = data.assets_json as Asset[];
          setAssets(loadedAssets);
          calculateTotals(loadedAssets);
        }
      }
      setLoading(false);
    };
    fetchAssets();
  }, []);

  const calculateTotals = (currentAssets: Asset[]) => {
    const total = currentAssets.reduce((acc, a) => acc + a.value, 0);
    const cash = currentAssets
        .filter(a => a.type === "Cash" || (a.type && a.type.includes("Livret")))
        .reduce((acc, a) => acc + a.value, 0);
    
    setNetWorth(total);
    setLiquidCash(cash);
    return { total, cash };
  };

  const saveToCloud = async (assetsToSave: Asset[]) => {
    const { total } = calculateTotals(assetsToSave);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({ 
          id: user.id,
          assets_json: assetsToSave,
          net_worth: total,
          updated_at: new Date()
      });
    }
  };

  const addAsset = async () => {
    if (!newName || !newValue) return;
    const asset: Asset = { id: Date.now().toString(), name: newName, value: parseFloat(newValue), type: newType };
    const updated = [...assets, asset];
    setAssets(updated); 
    calculateTotals(updated); 
    await saveToCloud(updated);
    setNewName(""); setNewValue("");
  };

  const removeAsset = async (id: string) => {
    const updated = assets.filter((a) => a.id !== id);
    setAssets(updated);
    calculateTotals(updated);
    await saveToCloud(updated);
  };

  const updateAssetValue = (id: string, newVal: string) => {
    const val = parseFloat(newVal);
    const safeVal = isNaN(val) ? 0 : val;
    const updated = assets.map(a => a.id === id ? { ...a, value: safeVal } : a);
    setAssets(updated);
    calculateTotals(updated); 
  };

  const handleBlur = async () => {
      await saveToCloud(assets);
  };

  const chartData = Object.keys(ASSET_CONFIG).map((type) => {
    const value = assets.filter((a) => a.type === type).reduce((acc, a) => acc + a.value, 0);
    return { name: ASSET_CONFIG[type as AssetType].label, value, color: ASSET_CONFIG[type as AssetType].color };
  }).filter(d => d.value > 0);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* 1. LA SIDEBAR EST ICI */}
      <Sidebar />

      {/* 2. LA MARGE md:ml-64 EST ICI */}
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        {/* AMBIENT GLOWS */}
        <div className="fixed top-0 left-64 w-[600px] h-[600px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] mx-auto space-y-10 relative z-10">
          
          <header className="flex flex-col gap-2 border-l-4 border-emerald-500 pl-6 py-2">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
              Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Patrimoine</span>
            </h1>
            <p className="text-zinc-400 text-lg font-light tracking-wide">Inventaire consolidé de votre richesse nette.</p>
          </header>

          {/* --- KPI SECTION --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* VALEUR NETTE */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-[32px] border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-10 flex flex-col justify-center min-h-[240px] shadow-2xl group hover:border-emerald-500/20 transition-all">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Wallet size={16} className="text-emerald-500"/> Valeur Nette
                        </p>
                        <div className="text-6xl lg:text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
                            <AnimatedNumber value={netWorth} /> {/* SANS DOUBLE € */}
                        </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/5">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><ArrowUpRight size={20}/></div>
                        <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">Actifs</p>
                            <p className="text-xl font-bold text-white">{assets.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* LIQUIDITÉ */}
            <div className="relative rounded-[32px] border border-yellow-500/20 bg-gradient-to-br from-yellow-950/10 to-zinc-900/40 backdrop-blur-xl p-10 flex flex-col justify-center shadow-xl">
                <div className="flex items-center gap-3 mb-4 text-yellow-500 font-bold uppercase text-xs tracking-widest">
                    <ShieldCheck size={18}/> Épargne & Liquidité
                </div>
                <div className="text-5xl font-black text-white mb-2">
                    <AnimatedNumber value={liquidCash} /> {/* SANS DOUBLE € */}
                </div>
                <div className="mt-auto pt-6 border-t border-yellow-500/10">
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        Capital immédiatement disponible. Ce montant constitue votre <span className="text-white font-bold">Matelas de Sécurité</span>.
                    </p>
                </div>
            </div>
          </div>

          {/* ... La suite du fichier reste identique ... */}
          {/* Je le remets complet pour le copier coller */}
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* FORMULAIRE AJOUT */}
            <div className="xl:col-span-2 p-1 rounded-[32px] bg-gradient-to-r from-zinc-800/50 via-zinc-700/50 to-zinc-800/50">
                <div className="bg-[#0A0A0A] rounded-[30px] p-8 h-full flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="relative z-10">
                        <h3 className="text-xs font-bold text-white uppercase mb-6 flex items-center gap-2 tracking-widest"><Plus size={16} className="text-emerald-500"/> Nouvel Actif</h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Input 
                                    placeholder="Nom (ex: Appartement Paris, PEA, Ledger...)" 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    className="bg-zinc-900/50 border-white/10 focus:ring-emerald-500 focus:border-emerald-500 text-white h-14 rounded-2xl text-lg px-4"
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                                    <SelectTrigger className="bg-zinc-900/50 border-white/10 text-white h-14 rounded-2xl"><SelectValue placeholder="Type" /></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        {Object.keys(ASSET_CONFIG).map((type) => (
                                            <SelectItem key={type} value={type} className="cursor-pointer focus:bg-zinc-800">{ASSET_CONFIG[type as AssetType].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full md:w-48 relative">
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={newValue} 
                                    onChange={(e) => setNewValue(e.target.value)} 
                                    className="bg-zinc-900/50 border-white/10 pr-10 text-white h-14 text-right font-bold text-xl rounded-2xl focus:ring-emerald-500" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold pointer-events-none">€</span>
                            </div>
                            <Button onClick={addAsset} className="bg-white text-black hover:bg-zinc-200 font-bold px-8 h-14 w-full md:w-auto rounded-2xl shadow-lg shadow-white/10">
                                Ajouter
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHART */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 flex items-center justify-center relative min-h-[250px] shadow-xl">
                <div className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest"><PieIcon size={14}/> Répartition</div>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '12px', padding: '12px' }} 
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }} 
                                formatter={(value: any) => formatEuro(value)}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* --- LISTE DÉTAILLÉE --- */}
          <div className="space-y-8">
             <h3 className="text-2xl font-black text-white uppercase tracking-tight pl-2 border-l-4 border-zinc-800">Votre Portefeuille</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {Object.keys(ASSET_CONFIG).map((type) => {
                     const categoryAssets = assets.filter(a => a.type === type);
                     if (categoryAssets.length === 0) return null;
                     
                     const Config = ASSET_CONFIG[type as AssetType];
                     const categoryTotal = categoryAssets.reduce((acc, a) => acc + a.value, 0);
                     const percentOfTotal = netWorth > 0 ? (categoryTotal / netWorth) * 100 : 0;

                     return (
                        <motion.div 
                            key={type} 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                            className="rounded-[32px] border border-white/5 bg-zinc-900/30 backdrop-blur-md p-8 flex flex-col gap-6 hover:border-white/10 transition-all shadow-lg"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${Config.gradient} flex items-center justify-center text-white shadow-lg`}>
                                        <Config.icon size={24}/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{Config.label}</h4>
                                        <div className="h-1 w-24 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-white/50" style={{ width: `${percentOfTotal}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-white">{formatEuro(categoryTotal)}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{percentOfTotal.toFixed(1)}%</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence>
                                    {categoryAssets.map((asset) => (
                                        <motion.div 
                                            key={asset.id} 
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} 
                                            className="flex justify-between items-center group p-3 bg-black/40 hover:bg-black/60 rounded-2xl transition-all border border-transparent hover:border-white/5"
                                        >
                                            <span className="text-sm text-zinc-300 font-medium pl-2">{asset.name}</span>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="w-36 relative">
                                                    <Input 
                                                        type="number" 
                                                        value={asset.value} 
                                                        onChange={(e) => updateAssetValue(asset.id, e.target.value)}
                                                        onBlur={handleBlur} 
                                                        className="bg-transparent border-none text-right text-white font-bold text-base h-10 p-0 pr-6 focus:ring-0"
                                                    />
                                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold pointer-events-none pr-2">€</span>
                                                </div>

                                                <button 
                                                    onClick={() => removeAsset(asset.id)} 
                                                    className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                     );
                 })}
             </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}