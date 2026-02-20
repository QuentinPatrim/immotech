"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Building, Bitcoin, Landmark, Plus, Trash2, TrendingUp, PieChart as PieIcon, ArrowUpRight, ShieldCheck, Loader2, Save, Home, HelpCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";

// --- CONFIGURATION ---
type AssetType = "Immobilier" | "Bourse" | "Crypto" | "AssuranceVie" | "Cash" | "Autre";

type Asset = { 
    id: string; 
    name: string; 
    value: number; 
    type: AssetType;
    
    quantity?: number;    
    unitPrice?: number;   
    buyPrice?: number; 

    notaryFees?: number;
    workCost?: number;
    loanCost?: number; 
};

const ASSET_CONFIG: Record<AssetType, { color: string; gradient: string; icon: any; label: string }> = {
  Immobilier: { color: "#3b82f6", gradient: "from-blue-600 to-blue-400", icon: Building, label: "Immobilier" },
  Bourse: { color: "#10b981", gradient: "from-emerald-600 to-emerald-400", icon: TrendingUp, label: "Bourse / PEA" },
  Crypto: { color: "#8b5cf6", gradient: "from-purple-600 to-purple-400", icon: Bitcoin, label: "Cryptomonnaies" },
  AssuranceVie: { color: "#ec4899", gradient: "from-pink-600 to-pink-400", icon: ShieldCheck, label: "Assurance Vie" },
  Cash: { color: "#f59e0b", gradient: "from-yellow-600 to-yellow-400", icon: Landmark, label: "Cash & Livrets" },
  Autre: { color: "#71717a", gradient: "from-zinc-600 to-zinc-400", icon: Wallet, label: "Autre" },
};

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
const getVal = (v: any) => (typeof v === 'string' ? parseFloat(v) : v) || 0;

export default function PatrimoinePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [liquidCash, setLiquidCash] = useState(0);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AssetType>("Bourse");
  const [newValue, setNewValue] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newBuyPrice, setNewBuyPrice] = useState(""); 
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [newNotaryFees, setNewNotaryFees] = useState("");
  const [newWorkCost, setNewWorkCost] = useState("");
  const [newLoanCost, setNewLoanCost] = useState("");

  const isComplexAsset = newType === "Bourse" || newType === "Crypto";
  const isRealEstate = newType === "Immobilier";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('assets_json').eq('id', session.user.id).maybeSingle();
        if (data && data.assets_json) {
          setAssets(data.assets_json);
          calculateTotals(data.assets_json);
        }
      }
      setLoading(false);
  };

  const calculateTotals = (currentAssets: Asset[]) => {
    const total = currentAssets.reduce((acc, a) => acc + getVal(a.value), 0);
    const cash = currentAssets
        .filter(a => a.type === "Cash" || a.type === "AssuranceVie" || (a.type && a.name.toLowerCase().includes("livret")))
        .reduce((acc, a) => acc + getVal(a.value), 0);
    setNetWorth(total);
    setLiquidCash(cash);
  };

  const saveToCloud = async (assetsToSave: Asset[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const total = assetsToSave.reduce((acc, a) => acc + a.value, 0);
      await supabase.from('profiles').upsert({ 
          id: user.id, assets_json: assetsToSave, net_worth: total, updated_at: new Date()
      });
    }
  };

  const addAsset = async () => {
    if (!newName) return;
    let finalValue = 0;
    let assetData: Asset = { id: Date.now().toString(), name: newName, value: 0, type: newType };

    if (isComplexAsset) {
        const qty = parseFloat(newQty) || 0;
        const current = parseFloat(newUnitPrice) || 0;
        const buy = parseFloat(newBuyPrice) || 0;
        finalValue = qty * current;
        assetData = { ...assetData, value: finalValue, quantity: qty, unitPrice: current, buyPrice: buy };
    } else if (isRealEstate) {
        finalValue = parseFloat(newValue) || 0; 
        assetData = { 
            ...assetData, 
            value: finalValue, 
            buyPrice: parseFloat(newBuyPrice) || 0, 
            notaryFees: parseFloat(newNotaryFees) || 0,
            workCost: parseFloat(newWorkCost) || 0,
            loanCost: parseFloat(newLoanCost) || 0
        };
    } else {
        finalValue = parseFloat(newValue) || 0;
        assetData = { ...assetData, value: finalValue };
    }

    const updated = [...assets, assetData];
    setAssets(updated); calculateTotals(updated); await saveToCloud(updated);
    
    setNewName(""); setNewValue(""); setNewQty(""); setNewBuyPrice(""); setNewUnitPrice("");
    setNewNotaryFees(""); setNewWorkCost(""); setNewLoanCost("");
  };

  const removeAsset = async (id: string) => {
    const updated = assets.filter((a) => a.id !== id);
    setAssets(updated); calculateTotals(updated); await saveToCloud(updated);
  };

  const updateAssetDetail = (id: string, field: keyof Asset, valStr: string) => {
      const val = valStr === "" ? 0 : parseFloat(valStr);
      const updated = assets.map(a => {
          if (a.id !== id) return a;
          const newAsset = { ...a, [field]: val };
          
          if ((newAsset.type === 'Bourse' || newAsset.type === 'Crypto') && field !== 'value') {
             if (newAsset.quantity !== undefined && newAsset.unitPrice !== undefined) {
                 newAsset.value = newAsset.quantity * newAsset.unitPrice;
             }
          }
          return newAsset;
      });
      setAssets(updated); calculateTotals(updated);
  };

  const handleBlur = async () => { await saveToCloud(assets); };

  const chartData = Object.keys(ASSET_CONFIG).map((type) => {
    const value = assets.filter((a) => a.type === type).reduce((acc, a) => acc + a.value, 0);
    return { name: ASSET_CONFIG[type as AssetType].label, value, color: ASSET_CONFIG[type as AssetType].color };
  }).filter(d => d.value > 0);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    // CORRECTION : overflow-x-hidden et max-w-[100vw] à la racine
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden w-full max-w-[100vw]">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-full max-w-[100vw] md:max-w-none p-4 md:p-8 relative overflow-x-hidden">
        
        {/* Glows */}
        <div className="fixed top-0 left-64 w-[600px] h-[600px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] w-full mx-auto space-y-6 md:space-y-10 relative z-10">
          
          <header className="flex flex-col gap-1 md:gap-2 border-l-4 border-emerald-500 pl-4 md:pl-6 py-2 max-w-full">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase truncate">
              Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Patrimoine</span>
            </h1>
            <p className="text-zinc-400 text-[10px] md:text-lg font-light tracking-wide truncate">Inventaire consolidé de votre richesse nette.</p>
          </header>

          {/* --- KPI --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 w-full min-w-0">
            <div className="lg:col-span-2 relative overflow-hidden rounded-[24px] md:rounded-[32px] border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-6 md:p-10 flex flex-col justify-center min-h-[180px] md:min-h-[240px] shadow-2xl group hover:border-emerald-500/20 transition-all w-full min-w-0">
                <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-emerald-500/10 blur-[120px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 w-full min-w-0">
                    <div className="min-w-0 w-full">
                        <p className="text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-2 md:mb-4 flex items-center gap-2">
                            <Wallet size={16} className="text-emerald-500"/> Valeur Nette
                        </p>
                        <div className="text-5xl sm:text-6xl lg:text-8xl font-black text-white tracking-tighter drop-shadow-2xl truncate max-w-full">
                            <AnimatedNumber value={netWorth} />
                        </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-3 border border-white/5 shrink-0">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><ArrowUpRight size={16} className="md:w-5 md:h-5"/></div>
                        <div>
                            <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase">Actifs</p>
                            <p className="text-lg md:text-xl font-bold text-white leading-none">{assets.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] border border-pink-500/20 bg-gradient-to-br from-pink-950/10 to-zinc-900/40 backdrop-blur-xl p-6 md:p-10 flex flex-col justify-center shadow-xl w-full min-w-0">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4 text-pink-500 font-bold uppercase text-[10px] md:text-xs tracking-widest truncate">
                    <ShieldCheck size={16} className="md:w-5 md:h-5 shrink-0"/> Épargne & AV
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 truncate max-w-full">
                    <AnimatedNumber value={liquidCash} />
                </div>
                <div className="mt-auto pt-4 md:pt-6 border-t border-pink-500/10">
                    <p className="text-[10px] md:text-xs text-zinc-400 leading-relaxed font-light">
                        Capital sécurisé (Livrets, Fonds Euro, Assurance Vie).
                    </p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8 w-full min-w-0">
            {/* FORMULAIRE AJOUT */}
            <div className="xl:col-span-2 p-1 rounded-[24px] md:rounded-[32px] bg-gradient-to-r from-zinc-800/50 via-zinc-700/50 to-zinc-800/50 w-full min-w-0">
                <div className="bg-[#0A0A0A] rounded-[22px] md:rounded-[30px] p-4 md:p-8 h-full flex flex-col justify-center relative overflow-hidden w-full min-w-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="relative z-10 w-full min-w-0">
                        <h3 className="text-[10px] md:text-xs font-bold text-white uppercase mb-4 md:mb-6 flex items-center gap-2 tracking-widest"><Plus size={16} className="text-emerald-500"/> Nouvel Actif</h3>
                        <div className="flex flex-col gap-3 md:gap-4 w-full min-w-0">
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full min-w-0">
                                <div className="flex-1 min-w-0"><Input placeholder="Nom (ex: Appt, Total...)" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-zinc-900/50 border-white/10 text-white h-12 md:h-14 rounded-xl md:rounded-2xl text-sm md:text-lg px-4 w-full min-w-0"/></div>
                                <div className="w-full sm:w-40 md:w-48 shrink-0">
                                    <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                                        <SelectTrigger className="bg-zinc-900/50 border-white/10 text-white h-12 md:h-14 rounded-xl md:rounded-2xl w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                            {Object.keys(ASSET_CONFIG).map((type) => (
                                                <SelectItem key={type} value={type}>{ASSET_CONFIG[type as AssetType].label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* CAS 1 : BOURSE / CRYPTO */}
                            {isComplexAsset && (
                                <div className="grid grid-cols-3 gap-2 md:gap-4 animate-in fade-in w-full min-w-0">
                                    <div className="relative min-w-0"><label className="text-[9px] md:text-[10px] text-zinc-500 font-bold ml-1 md:ml-2 mb-1 block truncate">Quantité</label><Input type="number" placeholder="Nb" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="bg-zinc-900/50 border-white/10 text-white h-10 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm w-full min-w-0" /></div>
                                    <div className="relative min-w-0"><label className="text-[9px] md:text-[10px] text-zinc-500 font-bold ml-1 md:ml-2 mb-1 block truncate">PRU (Achat)</label><Input type="number" placeholder="€" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} className="bg-zinc-900/50 border-white/10 text-white h-10 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm w-full min-w-0" /></div>
                                    <div className="relative min-w-0"><label className="text-[9px] md:text-[10px] text-emerald-500 font-bold ml-1 md:ml-2 mb-1 block truncate">Cours</label><Input type="number" placeholder="€" value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} className="bg-zinc-900/50 border-emerald-500/30 text-white h-10 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm w-full min-w-0" /></div>
                                </div>
                            )}

                            {/* CAS 2 : IMMOBILIER */}
                            {isRealEstate && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 animate-in fade-in w-full min-w-0">
                                    <div className="col-span-2 relative min-w-0"><label className="text-[9px] md:text-[10px] text-zinc-500 font-bold ml-1 md:ml-2 mb-1 block truncate">Estimation Actuelle</label><Input type="number" placeholder="Valeur €" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-zinc-900/50 border-emerald-500/30 text-white h-10 md:h-12 rounded-lg md:rounded-xl font-bold text-xs md:text-sm w-full min-w-0" /></div>
                                    <div className="relative min-w-0"><label className="text-[9px] md:text-[10px] text-zinc-500 font-bold ml-1 md:ml-2 mb-1 block truncate">Achat (FAI)</label><Input type="number" placeholder="€" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} className="bg-zinc-900/50 border-white/10 text-white h-10 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm w-full min-w-0" /></div>
                                    <div className="relative min-w-0"><label className="text-[9px] md:text-[10px] text-zinc-500 font-bold ml-1 md:ml-2 mb-1 block truncate">Notaire</label><Input type="number" placeholder="€" value={newNotaryFees} onChange={(e) => setNewNotaryFees(e.target.value)} className="bg-zinc-900/50 border-white/10 text-white h-10 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm w-full min-w-0" /></div>
                                    <div className="relative min-w-0"><label className="text-[9px] md:text-[10px] text-zinc-500 font-bold ml-1 md:ml-2 mb-1 block truncate">Travaux</label><Input type="number" placeholder="€" value={newWorkCost} onChange={(e) => setNewWorkCost(e.target.value)} className="bg-zinc-900/50 border-white/10 text-white h-10 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm w-full min-w-0" /></div>
                                    <div className="relative min-w-0"><label className="text-[9px] md:text-[10px] text-blue-400 font-bold ml-1 md:ml-2 mb-1 block truncate">Coût Crédit</label><Input type="number" placeholder="Intérêts" value={newLoanCost} onChange={(e) => setNewLoanCost(e.target.value)} className="bg-zinc-900/50 border-blue-500/20 text-white h-10 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm w-full min-w-0" /></div>
                                </div>
                            )}

                            {/* CAS 3 : SIMPLE (CASH, AUTRE) */}
                            {!isComplexAsset && !isRealEstate && (
                                <div className="w-full relative animate-in fade-in min-w-0">
                                    <Input type="number" placeholder="Valeur Totale en €" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-zinc-900/50 border-white/10 text-right font-bold text-lg md:text-xl h-12 md:h-14 rounded-xl md:rounded-2xl pr-8 md:pr-10 w-full min-w-0" />
                                    <span className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold pointer-events-none">€</span>
                                </div>
                            )}
                            <Button onClick={addAsset} className="bg-white text-black hover:bg-zinc-200 font-bold px-8 h-12 md:h-14 w-full rounded-xl md:rounded-2xl shadow-lg mt-1 md:mt-2">Ajouter</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHART */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[24px] md:rounded-[32px] p-6 flex items-center justify-center relative min-h-[200px] md:min-h-[250px] shadow-xl w-full min-w-0">
                <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-widest"><PieIcon size={14}/> Répartition</div>
                <div className="h-[150px] md:h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', borderColor: '#333', borderRadius: '12px', fontSize: '12px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value: any) => formatEuro(value)}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* --- LISTE DÉTAILLÉE --- */}
          <div className="space-y-6 md:space-y-8 w-full min-w-0">
             <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight pl-2 border-l-4 border-zinc-800">Votre Portefeuille</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full min-w-0">
                 {Object.keys(ASSET_CONFIG).map((type) => {
                     const categoryAssets = assets.filter(a => a.type === type);
                     if (categoryAssets.length === 0) return null;
                     const Config = ASSET_CONFIG[type as AssetType];
                     const categoryTotal = categoryAssets.reduce((acc, a) => acc + getVal(a.value), 0);
                     const percentOfTotal = netWorth > 0 ? (categoryTotal / netWorth) * 100 : 0;

                     return (
                        <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] md:rounded-[32px] border border-white/5 bg-zinc-900/30 backdrop-blur-md p-4 md:p-8 flex flex-col gap-4 md:gap-6 shadow-lg w-full min-w-0">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${Config.gradient} flex items-center justify-center text-white shadow-lg shrink-0`}><Config.icon size={20} className="md:w-6 md:h-6"/></div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-white text-sm md:text-lg truncate">{Config.label}</h4>
                                        <div className="h-1 w-16 md:w-24 bg-zinc-800 rounded-full mt-1.5 md:mt-2 overflow-hidden"><div className="h-full bg-white/50" style={{ width: `${percentOfTotal}%` }}></div></div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg md:text-2xl font-black text-white">{formatEuro(categoryTotal)}</p>
                                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{percentOfTotal.toFixed(1)}%</p>
                                </div>
                            </div>

                            <div className="space-y-3 w-full min-w-0">
                                <AnimatePresence>
                                    {categoryAssets.map((asset) => {
                                        const isRealEstate = asset.type === 'Immobilier';
                                        const isEditableType = asset.type === 'Bourse' || asset.type === 'Crypto';
                                        
                                        const totalInvested = (asset.buyPrice||0) + (asset.notaryFees||0) + (asset.workCost||0);
                                        const netGain = asset.value - totalInvested;
                                        const breakeven = totalInvested + (asset.loanCost||0);
                                        
                                        let gainPercent = 0;
                                        if (isEditableType && asset.quantity && asset.buyPrice && asset.unitPrice) {
                                            const totalBuy = asset.quantity * asset.buyPrice;
                                            const currentVal = asset.quantity * asset.unitPrice;
                                            if (totalBuy > 0) gainPercent = ((currentVal - totalBuy) / totalBuy) * 100;
                                        }

                                        return (
                                            <motion.div key={asset.id} className="p-4 md:p-5 bg-black/40 hover:bg-black/60 rounded-[20px] md:rounded-3xl border border-white/5 hover:border-white/10 transition-all flex flex-col gap-3 md:gap-4 w-full min-w-0 overflow-hidden">
                                                <div className="flex justify-between items-start w-full min-w-0">
                                                    <div className="w-full min-w-0">
                                                        <div className="flex justify-between items-center w-full min-w-0 gap-2">
                                                            <span className="text-xs md:text-sm text-white font-bold truncate">{asset.name}</span>
                                                            <button onClick={() => removeAsset(asset.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-1 shrink-0"><Trash2 size={14} className="md:w-4 md:h-4"/></button>
                                                        </div>

                                                        {/* --- DETAILS IMMO EDITABLES --- */}
                                                        {isRealEstate && (
                                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 bg-white/5 p-2 md:p-3 rounded-xl border border-white/5 w-full min-w-0">
                                                                <div className="space-y-2 min-w-0">
                                                                    <div className="flex justify-between items-center gap-2">
                                                                        <span className="text-[9px] text-zinc-500 uppercase font-bold truncate">Prix Achat</span>
                                                                        <div className="relative w-16 md:w-20 shrink-0"><Input type="number" value={asset.buyPrice === 0 ? "" : asset.buyPrice} onChange={(e) => updateAssetDetail(asset.id, 'buyPrice', e.target.value)} onBlur={handleBlur} className="h-6 text-[10px] bg-zinc-900/50 border-transparent focus:border-indigo-500/50 text-right text-zinc-300 font-medium p-1 rounded" /></div>
                                                                    </div>
                                                                    <div className="flex justify-between items-center gap-2">
                                                                        <span className="text-[9px] text-zinc-500 uppercase font-bold truncate">Notaire</span>
                                                                        <div className="relative w-16 md:w-20 shrink-0"><Input type="number" value={asset.notaryFees === 0 ? "" : asset.notaryFees} onChange={(e) => updateAssetDetail(asset.id, 'notaryFees', e.target.value)} onBlur={handleBlur} className="h-6 text-[10px] bg-zinc-900/50 border-transparent focus:border-indigo-500/50 text-right text-zinc-300 font-medium p-1 rounded" /></div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2 min-w-0">
                                                                    <div className="flex justify-between items-center gap-2">
                                                                        <span className="text-[9px] text-zinc-500 uppercase font-bold truncate">Travaux</span>
                                                                        <div className="relative w-16 md:w-20 shrink-0"><Input type="number" value={asset.workCost === 0 ? "" : asset.workCost} onChange={(e) => updateAssetDetail(asset.id, 'workCost', e.target.value)} onBlur={handleBlur} className="h-6 text-[10px] bg-zinc-900/50 border-transparent focus:border-indigo-500/50 text-right text-zinc-300 font-medium p-1 rounded" /></div>
                                                                    </div>
                                                                    <div className="flex justify-between items-center gap-2">
                                                                        <span className="text-[9px] text-blue-400 uppercase font-bold truncate">Crédit</span>
                                                                        <div className="relative w-16 md:w-20 shrink-0"><Input type="number" value={asset.loanCost === 0 ? "" : asset.loanCost} onChange={(e) => updateAssetDetail(asset.id, 'loanCost', e.target.value)} onBlur={handleBlur} className="h-6 text-[10px] bg-blue-900/10 border-blue-500/20 focus:border-blue-500/50 text-right text-blue-300 font-medium p-1 rounded" /></div>
                                                                    </div>
                                                                </div>
                                                                <div className="sm:col-span-2 pt-2 border-t border-white/5 flex justify-between items-center gap-2 min-w-0">
                                                                     <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">Coût Entrée</span>
                                                                     <span className="text-xs font-black text-white shrink-0">{formatEuro(totalInvested)}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* --- DETAILS BOURSE EDITABLES --- */}
                                                        {isEditableType && (
                                                            <div className="flex flex-wrap items-center gap-2 bg-white/5 p-2 rounded-xl mt-3 w-full min-w-0">
                                                                <div className="flex flex-1 items-center gap-2 min-w-[120px]">
                                                                    <div className="relative w-14 md:w-16 shrink-0">
                                                                        <span className="absolute -top-3 left-1 text-[8px] text-zinc-500 font-bold uppercase">Qté</span>
                                                                        <Input type="number" value={asset.quantity === 0 ? "" : asset.quantity} onChange={(e) => updateAssetDetail(asset.id, 'quantity', e.target.value)} onBlur={handleBlur} className="h-7 md:h-8 text-[10px] md:text-xs bg-transparent border-none p-0 text-center font-bold text-white focus:ring-0"/>
                                                                    </div>
                                                                    <span className="text-zinc-600 text-xs">x</span>
                                                                    <div className="relative w-16 md:w-20 shrink-0">
                                                                        <span className="absolute -top-3 left-1 text-[8px] text-emerald-500 font-bold uppercase">Cours</span>
                                                                        <Input type="number" value={asset.unitPrice === 0 ? "" : asset.unitPrice} onChange={(e) => updateAssetDetail(asset.id, 'unitPrice', e.target.value)} onBlur={handleBlur} className="h-7 md:h-8 text-[10px] md:text-xs bg-transparent border-none p-0 text-center font-bold text-emerald-400 focus:ring-0"/>
                                                                    </div>
                                                                </div>
                                                                <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
                                                                <div className="relative w-16 md:w-20 text-right shrink-0">
                                                                    <span className="absolute -top-3 right-1 text-[8px] text-zinc-500 font-bold uppercase">PRU</span>
                                                                    <Input type="number" value={asset.buyPrice === 0 ? "" : asset.buyPrice} onChange={(e) => updateAssetDetail(asset.id, 'buyPrice', e.target.value)} onBlur={handleBlur} className="h-7 md:h-8 text-[10px] md:text-xs bg-transparent border-none p-0 text-right font-medium text-zinc-400 focus:ring-0"/>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* BARRE DU BAS COMMUNE */}
                                                <div className="flex items-end justify-between gap-2 mt-1">
                                                    {/* INPUT VALEUR ACTUELLE (Toujours modifiable) */}
                                                    <div className="w-28 sm:w-40 relative shrink-0">
                                                        <span className="absolute -top-3 left-1 text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase tracking-wider truncate max-w-full">Valeur Act.</span>
                                                        <Input type="number" value={asset.value === 0 ? "" : asset.value} onChange={(e) => updateAssetDetail(asset.id, 'value', e.target.value)} onBlur={handleBlur} className="bg-black/50 border-emerald-500/20 text-right text-emerald-400 font-black h-10 sm:h-12 text-sm sm:text-base pr-6 sm:pr-8 focus:ring-emerald-500/50" />
                                                        <span className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold pointer-events-none">€</span>
                                                    </div>

                                                    {/* KPI DROITE (Perf Bourse ou Immo) */}
                                                    <div className="text-right flex flex-col items-end min-w-0">
                                                        {isRealEstate ? (
                                                            <>
                                                                <div className={`text-[10px] md:text-xs font-bold flex items-center gap-1 truncate ${netGain >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                                    {netGain >= 0 ? <TrendingUp size={10} className="md:w-3 md:h-3 shrink-0"/> : <AlertTriangle size={10} className="md:w-3 md:h-3 shrink-0"/>}
                                                                    <span className="truncate">{netGain >= 0 ? "+" : ""}{formatEuro(netGain)}</span>
                                                                </div>
                                                                <span className="text-[8px] md:text-[9px] text-zinc-500 truncate">Plus-value Latente</span>
                                                                {(asset.loanCost || 0) > 0 && (
                                                                    <div className="mt-1 md:mt-2 text-[8px] md:text-[9px] text-blue-400 bg-blue-900/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-blue-500/20 truncate max-w-full">
                                                                        Rentable &gt; {formatEuro(breakeven)}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : isEditableType && gainPercent !== 0 ? (
                                                            <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md shrink-0 ${gainPercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                {gainPercent > 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                                                            </span>
                                                        ) : (
                                                            <div className="text-xs md:text-sm font-black text-zinc-500 truncate">{formatEuro(asset.value)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
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