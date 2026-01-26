"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Building, Bitcoin, Landmark, Plus, Trash2, TrendingUp, ArrowUpRight, PieChart as PieIcon, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";

// --- TYPES & CONFIG ---
type AssetType = "Immobilier" | "Bourse" | "Crypto" | "Cash" | "Autre";

type Asset = {
  id: string;
  name: string;
  value: number;
  type: AssetType;
};

const ASSET_CONFIG: Record<AssetType, { color: string; icon: any; label: string }> = {
  Immobilier: { color: "#3b82f6", icon: Building, label: "Immobilier" }, // Bleu
  Bourse: { color: "#10b981", icon: TrendingUp, label: "Bourse / ETF" }, // Émeraude
  Crypto: { color: "#8b5cf6", icon: Bitcoin, label: "Cryptomonnaies" },  // Violet
  Cash: { color: "#f59e0b", icon: Landmark, label: "Cash & Épargne" },  // Ambre
  Autre: { color: "#71717a", icon: Wallet, label: "Autre" },             // Zinc
};

export default function PatrimoinePage() {
  // --- STATES ---
  const [assets, setAssets] = useState<Asset[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Formulaire
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<AssetType>("Bourse");

  // --- CHARGEMENT & SAUVEGARDE ---
  useEffect(() => {
    const saved = localStorage.getItem("myAssets");
    if (saved) {
      setAssets(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("myAssets", JSON.stringify(assets));
      const total = assets.reduce((acc, asset) => acc + asset.value, 0);
      setNetWorth(total);
    }
  }, [assets, isLoaded]);

  // --- HANDLERS ---
  const addAsset = () => {
    if (!newName || !newValue) return;
    const asset: Asset = {
      id: Date.now().toString(),
      name: newName,
      value: parseFloat(newValue),
      type: newType,
    };
    setAssets([...assets, asset]);
    setNewName("");
    setNewValue("");
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  // --- PREPARATION DONNEES GRAPHIQUE ---
  const chartData = Object.keys(ASSET_CONFIG).map((type) => {
    const value = assets.filter((a) => a.type === type).reduce((acc, a) => acc + a.value, 0);
    return { name: ASSET_CONFIG[type as AssetType].label, value, color: ASSET_CONFIG[type as AssetType].color, type: type };
  }).filter(d => d.value > 0);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-zinc-100 font-sans">
      <Sidebar />
      <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden p-3 md:p-8 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1600px] mx-auto space-y-8"
        >
          
          {/* --- HEADER --- */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mon Patrimoine<span className="text-emerald-500">.</span></h1>
              <p className="text-zinc-400">Gérez vos actifs et visualisez votre répartition en temps réel.</p>
            </div>
          </header>

          {/* --- HERO SECTION : KPI & GRAPH --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. TOTAL NET WORTH CARD */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-8 shadow-2xl flex flex-col justify-center min-h-[250px] lg:col-span-1">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[80px] rounded-full"></div>
                <div className="relative z-10">
                    <p className="text-zinc-400 font-medium flex items-center gap-2 mb-2">
                        <Wallet size={18} className="text-emerald-500"/> Valeur Nette Totale
                    </p>
                    <div className="text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <AnimatedNumber value={netWorth} />
                    </div>
                    <div className="mt-6 flex gap-2">
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                             <ArrowUpRight size={14}/> + Actifs
                        </div>
                        <div className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold">
                             {assets.length} lignes
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. REPARTITION GRAPH */}
            <Card className="border-zinc-800 bg-zinc-900/30 lg:col-span-2">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><PieIcon size={18} className="text-blue-500"/> Allocation d'Actifs</CardTitle></CardHeader>
                <CardContent className="flex flex-col md:flex-row items-center justify-around h-[220px]">
                    {/* Le Graphique */}
                    <div className="h-full w-full md:w-1/2 min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={chartData} 
                                    innerRadius={60} 
                                    outerRadius={80} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any) => formatEuro(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* La Légende Détaillée */}
                    <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 pl-4">
                        {chartData.map((item) => (
                            <div key={item.name} className="flex flex-col p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}/>
                                    {item.name}
                                </div>
                                <span className="font-bold text-white text-sm">{formatEuro(item.value)}</span>
                                <span className="text-[10px] text-zinc-500">
                                    {netWorth > 0 ? ((item.value / netWorth) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        ))}
                        {chartData.length === 0 && <p className="text-zinc-500 text-sm italic col-span-2 text-center">Aucun actif pour le moment.</p>}
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* --- ADD ASSET BAR (NOUVEAU DESIGN) --- */}
          <div className="p-1 rounded-xl bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800">
            <div className="bg-zinc-950 rounded-lg p-4 flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                        <Plus size={20}/>
                    </div>
                    <span className="font-bold text-white whitespace-nowrap hidden md:block">Nouvel Actif</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                    <Input 
                        placeholder="Nom (ex: Appartement, BTC...)" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        className="bg-zinc-900 border-zinc-800 focus:ring-emerald-500"
                    />
                    <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            {Object.keys(ASSET_CONFIG).map((type) => (
                                <SelectItem key={type} value={type} className="focus:bg-zinc-800 cursor-pointer">
                                    {ASSET_CONFIG[type as AssetType].label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <Input 
                            type="number" 
                            placeholder="Valeur €" 
                            value={newValue} 
                            onChange={(e) => setNewValue(e.target.value)} 
                            className="bg-zinc-900 border-zinc-800 pr-8" 
                        />
                        <DollarSign className="absolute right-3 top-2.5 text-zinc-500" size={14}/>
                    </div>
                </div>

                <Button onClick={addAsset} className="w-full lg:w-auto bg-white text-black hover:bg-zinc-200 font-bold px-6">
                    Ajouter
                </Button>
            </div>
          </div>

          {/* --- ASSET LIST (GROUPED BY CATEGORY) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {Object.keys(ASSET_CONFIG).map((type) => {
                 const categoryAssets = assets.filter(a => a.type === type);
                 if (categoryAssets.length === 0) return null;
                 
                 const Config = ASSET_CONFIG[type as AssetType];
                 const Icon = Config.icon;

                 return (
                    <Card key={type} className="border-zinc-800 bg-zinc-900/20">
                        <CardHeader className="pb-3 border-b border-zinc-800/50">
                            <CardTitle className="flex items-center justify-between text-base">
                                <div className="flex items-center gap-2 text-zinc-100">
                                    <Icon size={18} style={{ color: Config.color }}/> 
                                    {Config.label}
                                </div>
                                <span className="text-sm font-mono text-zinc-400">
                                    {formatEuro(categoryAssets.reduce((acc, a) => acc + a.value, 0))}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <AnimatePresence>
                                {categoryAssets.map((asset) => (
                                    <motion.div 
                                        key={asset.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex justify-between items-center group p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: Config.color }}/>
                                            <span className="text-sm text-zinc-300 font-medium">{asset.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-white">{formatEuro(asset.value)}</span>
                                            <button 
                                                onClick={() => removeAsset(asset.id)}
                                                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                 );
             })}
          </div>

          {/* EMPTY STATE */}
          {assets.length === 0 && (
              <div className="text-center py-20 opacity-50">
                  <Wallet size={48} className="mx-auto mb-4 text-zinc-600"/>
                  <p className="text-zinc-400">Votre coffre-fort est vide. Ajoutez votre premier actif ci-dessus.</p>
              </div>
          )}

        </motion.div>
      </main>
    </div>
  );
}