"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Wallet, TrendingUp, Building2, Bitcoin, PiggyBank, 
    Plus, Trash2, ShieldCheck, Euro // <--- J'ai ajouté l'import Euro ici
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { triggerHaptic } from "@/lib/haptics";

// Interface alignée avec l'Onboarding (utilise "value")
type Asset = {
    id: string;
    name: string;
    value: number; 
    type: string;
    color?: string;
};

export default function PatrimoinePage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [totalValue, setTotalValue] = useState(0);

    // Formulaire d'ajout
    const [newAssetName, setNewAssetName] = useState("");
    const [newAssetValue, setNewAssetValue] = useState("");
    const [newAssetType, setNewAssetType] = useState("Bourse");

    // CHARGEMENT
    useEffect(() => {
        const saved = localStorage.getItem("myAssets");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setAssets(parsed);
                    const total = parsed.reduce((acc: number, item: Asset) => acc + (item.value || 0), 0);
                    setTotalValue(total);
                }
            } catch (e) { console.error("Erreur lecture patrimoine", e); }
        }
    }, []);

    // SAUVEGARDE & CALCUL
    const updateStorage = (newAssets: Asset[]) => {
        setAssets(newAssets);
        const total = newAssets.reduce((acc, item) => acc + (item.value || 0), 0);
        setTotalValue(total);
        localStorage.setItem("myAssets", JSON.stringify(newAssets));
    };

    // AJOUT
    const handleAdd = () => {
        if (!newAssetName || !newAssetValue) return;
        
        triggerHaptic("success");
        const val = parseFloat(newAssetValue);
        
        const newItem: Asset = {
            id: Date.now().toString(),
            name: newAssetName,
            value: isNaN(val) ? 0 : val,
            type: newAssetType,
            color: "#fff" // On pourrait affiner la couleur selon le type
        };

        const updated = [...assets, newItem];
        updateStorage(updated);
        
        // Reset
        setNewAssetName("");
        setNewAssetValue("");
    };

    // SUPPRESSION
    const handleDelete = (id: string) => {
        triggerHaptic("medium");
        const updated = assets.filter(a => a.id !== id);
        updateStorage(updated);
    };

    // FORMATEUR
    const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

    // ICONES
    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes("immo")) return <Building2 className="text-blue-500" size={24} />;
        if (t.includes("bourse") || t.includes("etf")) return <TrendingUp className="text-emerald-500" size={24} />;
        if (t.includes("crypto")) return <Bitcoin className="text-purple-500" size={24} />;
        return <PiggyBank className="text-amber-500" size={24} />;
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black text-zinc-100 font-sans">
            <Sidebar />
            
            <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8 pb-24 md:pb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
                    
                    {/* EN-TÊTE */}
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Mon Patrimoine<span className="text-emerald-500">.</span></h1>
                            <p className="text-zinc-400">Gérez vos actifs et visualisez votre répartition en temps réel.</p>
                        </div>
                    </div>

                    {/* BLOC TOTAL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between min-h-[200px]">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-zinc-400 font-medium">
                                    <ShieldCheck size={18} className="text-emerald-500"/> Valeur Nette Totale
                                </div>
                                <div className="text-5xl font-black text-white tracking-tighter">{formatEuro(totalValue)}</div>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                    ↗ + Actifs
                                </div>
                                <div className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold">
                                    {assets.length} lignes
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-center items-center text-center">
                            <div className="flex items-center gap-2 mb-4 text-zinc-400 font-medium self-start">
                                <TrendingUp size={18} className="text-blue-500"/> Allocation d'Actifs
                            </div>
                            {assets.length > 0 ? (
                                <div className="w-full space-y-3">
                                    {/* Simple barre de répartition visuelle */}
                                    <div className="h-4 w-full flex rounded-full overflow-hidden bg-zinc-800">
                                         <div className="bg-blue-500 h-full" style={{ width: `${(assets.filter(a => a.type.includes('Immo')).reduce((acc, i) => acc + i.value, 0) / totalValue) * 100}%` }} />
                                         <div className="bg-emerald-500 h-full" style={{ width: `${(assets.filter(a => a.type.includes('Bourse')).reduce((acc, i) => acc + i.value, 0) / totalValue) * 100}%` }} />
                                         <div className="bg-purple-500 h-full" style={{ width: `${(assets.filter(a => a.type.includes('Crypto')).reduce((acc, i) => acc + i.value, 0) / totalValue) * 100}%` }} />
                                         <div className="bg-amber-500 h-full" style={{ width: `${(assets.filter(a => a.type.includes('Cash')).reduce((acc, i) => acc + i.value, 0) / totalValue) * 100}%` }} />
                                    </div>
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>Diversification</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-zinc-600 text-sm italic">Aucun actif pour le moment.</p>
                            )}
                        </div>
                    </div>

                    {/* BARRE D'AJOUT (CORRIGÉE : Euro + No Spinners) */}
                    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row gap-3 items-center">
                        <div className="bg-emerald-500/10 h-10 w-10 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                            <Plus size={20} />
                        </div>
                        <span className="font-bold text-white mr-auto text-sm md:text-base whitespace-nowrap">Nouvel Actif</span>
                        
                        <div className="flex gap-2 w-full md:w-auto">
                            <Input 
                                placeholder="Nom (ex: Appartement)" 
                                value={newAssetName} 
                                onChange={(e) => setNewAssetName(e.target.value)} 
                                className="bg-zinc-950 border-zinc-800 text-white"
                            />
                            
                            <Select value={newAssetType} onValueChange={setNewAssetType}>
                                <SelectTrigger className="w-[140px] bg-zinc-950 border-zinc-800 text-white">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    <SelectItem value="Immobilier">Immobilier</SelectItem>
                                    <SelectItem value="Bourse">Bourse / ETF</SelectItem>
                                    <SelectItem value="Crypto">Crypto</SelectItem>
                                    <SelectItem value="Cash">Cash / Épargne</SelectItem>
                                    <SelectItem value="Autre">Autre</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="relative w-32">
                                {/* CORRECTION 1 : Icône Euro */}
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                    <Euro size={14} />
                                </div>
                                {/* CORRECTION 2 : Classes CSS pour cacher les flèches */}
                                <Input 
                                    type="number" 
                                    placeholder="Valeur" 
                                    value={newAssetValue} 
                                    onChange={(e) => setNewAssetValue(e.target.value)} 
                                    className="pl-8 bg-zinc-950 border-zinc-800 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>

                            <Button onClick={handleAdd} className="bg-white text-black hover:bg-zinc-200 font-bold">
                                Ajouter
                            </Button>
                        </div>
                    </div>

                    {/* LISTE DES ACTIFS */}
                    <div className="space-y-3 pb-12">
                        <AnimatePresence>
                            {assets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 space-y-4">
                                    <Wallet size={48} className="opacity-20" />
                                    <p className="text-sm">Votre coffre-fort est vide. Ajoutez votre premier actif ci-dessus.</p>
                                </div>
                            ) : (
                                assets.map((asset) => (
                                    <motion.div 
                                        key={asset.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="group relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-zinc-800/50 p-4 flex items-center justify-between hover:bg-zinc-900 hover:border-zinc-700 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                                                {getIcon(asset.type)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base">{asset.name}</h3>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 uppercase tracking-wide">
                                                    {asset.type}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-lg md:text-xl font-bold text-white tracking-tight">
                                                {formatEuro(asset.value)}
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(asset.id)}
                                                className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                </motion.div>
            </main>
        </div>
    );
}