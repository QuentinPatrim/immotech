"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
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

const ASSET_CONFIG: Record<AssetType, { color: string; bg: string; icon: any; label: string }> = {
  Immobilier: { color: "#3b82f6", bg: "bg-blue-500/10 border-blue-500/20", icon: Building, label: "Immobilier" },
  Bourse: { color: "#10b981", bg: "bg-emerald-500/10 border-emerald-500/20", icon: TrendingUp, label: "Bourse / PEA" },
  Crypto: { color: "#8b5cf6", bg: "bg-purple-500/10 border-purple-500/20", icon: Bitcoin, label: "Cryptomonnaies" },
  Cash: { color: "#f59e0b", bg: "bg-yellow-500/10 border-yellow-500/20", icon: Landmark, label: "Cash & Livrets" },
  Autre: { color: "#71717a", bg: "bg-zinc-800 border-zinc-700", icon: Wallet, label: "Autre" },
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
        // On utilise maybeSingle() pour ne pas créer d'erreur si l'utilisateur est nouveau
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

  // --- CORRECTION MAJEURE ICI (UPSERT) ---
  const saveToCloud = async (assetsToSave: Asset[]) => {
    const { total } = calculateTotals(assetsToSave);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // On utilise UPSERT au lieu de UPDATE pour créer la ligne si elle n'existe pas
      const { error } = await supabase.from('profiles').upsert({ 
          id: user.id, // Important pour l'upsert
          assets_json: assetsToSave,
          net_worth: total,
          updated_at: new Date()
      }, { onConflict: 'id' });

      if (error) {
          console.error("Erreur sauvegarde:", error);
          alert("Erreur lors de la sauvegarde. Vérifiez votre connexion.");
      }
    }
  };

  const addAsset = async () => {
    if (!newName || !newValue) return;
    const asset: Asset = { id: Date.now().toString(), name: newName, value: parseFloat(newValue), type: newType };
    const updated = [...assets, asset];
    
    setAssets(updated); // Mise à jour locale immédiate
    calculateTotals(updated); 
    await saveToCloud(updated); // Sauvegarde Cloud sécurisée
    
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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-24 md:pb-8">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mon Patrimoine<span className="text-emerald-500">.</span></h1>
              <p className="text-zinc-400">Vue consolidée de votre richesse nette.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black p-8 flex flex-col justify-center min-h-[220px]">
                <div className="absolute top-0 right-0 p-40 bg-emerald-500/5 blur-[100px] rounded-full"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <p className="text-zinc-400 font-medium flex items-center gap-2 mb-2"><Wallet size={18} className="text-emerald-500"/> Valeur Nette Totale</p>
                        <div className="text-5xl lg:text-7xl font-black text-white tracking-tighter">
                            <AnimatedNumber value={netWorth} />
                        </div>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ArrowUpRight size={20}/></div>
                        <div><p className="text-xs text-zinc-500 font-bold uppercase">Actifs Détenus</p><p className="text-xl font-bold text-white">{assets.length}</p></div>
                    </div>
                </div>
            </div>

            <div className="relative rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-950/10 to-zinc-900 p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold uppercase text-xs"><ShieldCheck size={16}/> Épargne & Liquidité</div>
                <div className="text-4xl font-black text-white mb-2"><AnimatedNumber value={liquidCash} /></div>
                <div className="mt-auto pt-4 border-t border-yellow-500/10">
                    <p className="text-xs text-zinc-400 leading-relaxed">Matelas de Sécurité (Lien Budget).</p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 p-1 rounded-3xl bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800">
                <div className="bg-zinc-950 rounded-[22px] p-6 h-full flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2"><Plus size={16}/> Ajouter un nouvel actif</h3>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 space-y-1">
                            <Input placeholder="Nom (ex: Appartement, PEA...)" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-zinc-900 border-zinc-800 focus:ring-emerald-500 text-white h-12"/>
                        </div>
                        <div className="w-full md:w-48">
                            <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white h-12"><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    {Object.keys(ASSET_CONFIG).map((type) => (<SelectItem key={type} value={type} className="cursor-pointer focus:bg-zinc-800">{ASSET_CONFIG[type as AssetType].label}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-48 relative">
                            <Input type="number" placeholder="Valeur" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-zinc-900 border-zinc-800 pr-8 text-white h-12 text-right font-bold focus-visible:ring-0" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">€</span>
                        </div>
                        <Button onClick={addAsset} className="bg-white text-black hover:bg-zinc-200 font-bold px-6 h-12 w-full md:w-auto">Ajouter</Button>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 flex items-center justify-center relative min-h-[200px]">
                <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase"><PieIcon size={14}/> Répartition</div>
                <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} formatter={(value: any) => formatEuro(value)}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-xl font-bold text-white">Détail du Portefeuille</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {Object.keys(ASSET_CONFIG).map((type) => {
                     const categoryAssets = assets.filter(a => a.type === type);
                     if (categoryAssets.length === 0) return null;
                     const Config = ASSET_CONFIG[type as AssetType];
                     const categoryTotal = categoryAssets.reduce((acc, a) => acc + a.value, 0);
                     const percentOfTotal = netWorth > 0 ? (categoryTotal / netWorth) * 100 : 0;

                     return (
                        <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl border p-6 flex flex-col gap-4 ${Config.bg}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-black/20 flex items-center justify-center" style={{ color: Config.color }}><Config.icon size={20}/></div>
                                    <div><h4 className="font-bold text-white">{Config.label}</h4><p className="text-xs text-zinc-400">{percentOfTotal.toFixed(1)}% du patrimoine</p></div>
                                </div>
                                <div className="text-right"><p className="text-xl font-bold text-white">{formatEuro(categoryTotal)}</p></div>
                            </div>
                            <div className="space-y-2 mt-2">
                                <AnimatePresence>
                                    {categoryAssets.map((asset) => (
                                        <motion.div key={asset.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-between items-center group p-2 bg-black/20 hover:bg-black/40 rounded-xl transition-colors border border-transparent hover:border-white/5">
                                            <span className="text-sm text-zinc-200 font-medium pl-2">{asset.name}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 relative">
                                                    <Input type="number" value={asset.value} onChange={(e) => updateAssetValue(asset.id, e.target.value)} onBlur={handleBlur} className="bg-transparent border-none text-right text-white font-bold h-8 p-0 pr-6 focus-visible:ring-0"/>
                                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none pr-2">€</span>
                                                </div>
                                                <button onClick={() => removeAsset(asset.id)} className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
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