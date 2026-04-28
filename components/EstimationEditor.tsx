"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Home, MapPin, Image as ImageIcon, TrendingUp, CheckCircle, 
    Printer, ArrowRight, ArrowLeft, Plus, Trash2, UploadCloud, FileText,
    List, Edit, X, Leaf, ThumbsUp, ThumbsDown, BarChart3, Loader2, Euro, Building2, Banknote,
    Sparkles, Shield, Star, Globe, Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";

// --- CHARTE GRAPHIQUE AGENCE PATRIM ---
const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
    gray: "#393939",
    darkBg: "#0a0a0c",
    darkCard: "#111114",
    darkBorder: "rgba(255,255,255,0.06)",
    gold: "#c9a84c",
};

// --- LISTE DES COLLABORATEURS ---
const AGENTS = [
    { id: "quentin", name: "Quentin Delsol", role: "Service Transaction", signatureUrl: "/signatures/signature-quentin.png" },
    { id: "rebecca", name: "Rebecca Gau", role: "Service Transaction", signatureUrl: "/signatures/signature-rebecca.png" },
    { id: "clement", name: "Clément Monti", role: "Service Transaction", signatureUrl: "/signatures/signature-clement.png" },
    { id: "julien", name: "Julien Passerini", role: "Service Transaction", signatureUrl: "/signatures/signature-julien.png" },
    { id: "sabri", name: "Sabri Abdesselem", role: "Service Transaction", signatureUrl: "/signatures/signature-sabri.png" },
    { id: "catherine", name: "Catherine Leloup", role: "Service Transaction", signatureUrl: "/signatures/signature-catherine.png" },
];

// --- TYPES ---
export interface Comparable { id: string; address: string; surface: number; price: number; photoUrl: string; }
export interface EstimationData {
    clientName: string; propertyAddress: string; clientAddress: string; propertyType: "Appartement" | "Maison" | "Autre";
    surface: number; rooms: number;
    floor: string; buildYear: number; hasElevator: boolean;
    plotSurface: number; gardenSurface: number;
    dpe: string; ges: string; energieFinale: number; 
    features: string; mainPhoto: string; secondaryPhotos: string[]; extraPhotos: string[];
    soldComparables: Comparable[]; forSaleComparables: Comparable[];
    strengths: string[]; weaknesses: string[]; 
    lowPrice: number; highPrice: number; agentAnalysis: string;
    hasRentalEstimation: boolean; monthlyRent: number; 
    taxeFonciere: number; isCopropriete: boolean; coproFees: number;
    amenities: string[];
    isRented: boolean;
    lowPriceRented: number;
    highPriceRented: number;
    agentId: string;
}

const ALL_AMENITIES = [
    { id: "garage",    label: "Garage",    icon: "🚗" },
    { id: "parking",   label: "Parking",   icon: "🅿️" },
    { id: "cave",      label: "Cave",      icon: "🪣" },
    { id: "cellier",   label: "Cellier",   icon: "📦" },
    { id: "balcon",    label: "Balcon",    icon: "🌿" },
    { id: "terrasse",  label: "Terrasse",  icon: "☀️" },
    { id: "loggia",    label: "Loggia",    icon: "🏛️" },
    { id: "jardin",    label: "Jardin",    icon: "🌳" },
    { id: "piscine",   label: "Piscine",   icon: "🏊" },
];

export const DEFAULT_DATA: EstimationData = {
    clientName: "", propertyAddress: "", clientAddress: "", propertyType: "Appartement",
    surface: 0, rooms: 0, floor: "", buildYear: 0, hasElevator: false,
    plotSurface: 0, gardenSurface: 0,
    dpe: "C", ges: "C", energieFinale: 0,
    features: "", mainPhoto: "", secondaryPhotos: [], extraPhotos: [],
    soldComparables: [], forSaleComparables: [],
    strengths: [], weaknesses: [],
    lowPrice: 0, highPrice: 0, agentAnalysis: "",
    hasRentalEstimation: false, monthlyRent: 0,
    taxeFonciere: 0, isCopropriete: false, coproFees: 0,
    amenities: [],
    isRented: false,
    lowPriceRented: 0,
    highPriceRented: 0,
    agentId: "",
};

const DPE_COLORS: Record<string, string> = { "A": "#00A06D", "B": "#52B153", "C": "#A5CC74", "D": "#F3E724", "E": "#F0B328", "F": "#EB8235", "G": "#D7221F" };

// --- HELPERS ---
const getPriceSizeClass = (price: number) => {
    const len = formatPrice(price).length;
    if (len >= 10) return "text-2xl";
    if (len >= 8) return "text-3xl";
    return "text-4xl";
};

const getPriceSizeClassSplit = (price: number) => {
    const len = formatPrice(price).length;
    if (len >= 10) return "text-xl";
    if (len >= 8) return "text-2xl";
    return "text-3xl";
};

const getDisplayFloor = (f: string) => {
    if (!f) return "";
    const lower = f.toLowerCase().trim();
    if (lower === "rdc" || lower === "rez-de-chaussée" || lower === "rez de chaussée") return "RDC";
    if (/^\d+$/.test(lower)) return lower === "1" ? "1er étage" : `${lower}ème étage`;
    if (!lower.includes("étage") && !lower.includes("etage") && !lower.includes("rdc")) {
        return `Étage ${f}`;
    }
    return f;
};

// ============================================================
// COMPOSANT : EstimationEditor
// ------------------------------------------------------------
// Éditeur d'estimation réutilisable (EDIT + PRINT).
// Utilisé par :
//  - /app/estimation/new/page.tsx  (initialData = DEFAULT_DATA, existingId = null)
//  - /app/estimation/[id]/page.tsx (initialData = data fetchée, existingId = id)
// ============================================================
export interface EstimationEditorProps {
    initialData: EstimationData;
    existingId: string | null;
    initialView?: "EDIT" | "PRINT";
}

export default function EstimationEditor({
    initialData,
    existingId,
    initialView = "EDIT",
}: EstimationEditorProps) {
    const router = useRouter();
    const [view, setView] = useState<"EDIT" | "PRINT">(initialView);
    const [step, setStep] = useState(1);
    const [currentId, setCurrentId] = useState<string | null>(existingId);
    const [data, setData] = useState<EstimationData>(initialData);
    const [newStrength, setNewStrength] = useState("");
    const [newWeakness, setNewWeakness] = useState("");
    const [newAmenity, setNewAmenity] = useState("");
    const [savedFeedback, setSavedFeedback] = useState(false);

    // --- IMPORT WEB & AUTO-GÉNÉRATION ---
    const [listingUrl, setListingUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);
    const [isGeneratingComps, setIsGeneratingComps] = useState(false);
    const [dvfRadius, setDvfRadius] = useState<number>(500); // Rayon de recherche DVF en mètres

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    // Helper pour retourner à /mes-biens
    const goToMesBiens = () => router.push('/mes-biens');

    const handleSave = async (isDraft = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const payload = { user_id: user.id, client_name: data.clientName || "Dossier Sans Nom", address: data.propertyAddress || "Adresse non renseignée", data_json: data };
        let savedId = currentId;
        if (currentId) {
            await supabase.from('estimations').update(payload).eq('id', currentId);
        } else {
            const { data: inserted } = await supabase.from('estimations').insert(payload).select('id').single();
            if (inserted) {
                setCurrentId(inserted.id);
                savedId = inserted.id;
                // Si on vient de /estimation/new, on met à jour l'URL en remplacement pour
                // que le bouton "retour" du navigateur ne ramène pas sur /new orphelin
                router.replace(`/estimation/${inserted.id}`);
            }
        }
        if (!isDraft) {
            setView("PRINT");
        } else {
            setSavedFeedback(true);
            setTimeout(() => setSavedFeedback(false), 2000);
        }
    };

    // Note : deleteEstimation, openEstimation et createNew ont été retirés.
    // La liste/suppression/création-depuis-liste est gérée dans /mes-biens.


    // ─── IMPORTATION WEB (Scraping Photos) ───
    const handleImportFromUrl = async () => {
        if (!listingUrl) return alert("Veuillez coller un lien valide.");
        setIsScraping(true);
        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: listingUrl })
            });
            const result = await response.json();
            
            if (result.success) {
                setData(prev => {
                    const newData = { ...prev };
                    if (result.title && !prev.propertyAddress) newData.propertyAddress = result.title;
                    if (result.price && prev.lowPrice === 0) {
                        newData.lowPrice = result.price;
                        newData.highPrice = result.price;
                    }
                    if (result.photos && result.photos.length > 0) {
                        newData.mainPhoto = result.photos[0];
                        if (result.photos.length > 1) {
                            newData.extraPhotos = result.photos.slice(1, 9);
                            newData.secondaryPhotos = result.photos.slice(1, 4);
                        }
                    }
                    return newData;
                });
                alert("Importation réussie !");
            } else {
                alert("Erreur: " + result.error);
            }
        } catch (error) {
            alert("Erreur de connexion.");
        }
        setIsScraping(false);
    };

    // ─── AUTO-GÉNÉRATION COMPARABLES DVF ───
    const handleAutoGenerateDVF = async () => {
        if (!data.propertyAddress || !data.surface) {
            return alert("Veuillez renseigner l'adresse du bien et sa surface (Étape 1) avant de générer.");
        }
        setIsGeneratingComps(true);
        try {
            const response = await fetch('/api/comparables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // On passe le rayon sélectionné à l'API
                body: JSON.stringify({ address: data.propertyAddress, surface: data.surface, propertyType: data.propertyType, radius: dvfRadius })
            });
            const result = await response.json();
            
            if (result.success) {
                setData(prev => ({
                    ...prev,
                    soldComparables: [...prev.soldComparables, ...result.comparables]
                }));
            } else {
                alert(result.error); // Affiche "Aucun bien trouvé, élargissez le rayon"
            }
        } catch (error) {
            alert("Erreur de connexion au serveur DVF.");
        }
        setIsGeneratingComps(false);
    };

    // ─── Upload vers Supabase Storage ───
    const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});

    const compressImage = (file: File, maxWidthPx = 1600, quality = 0.82): Promise<Blob> =>
        new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const scale = Math.min(1, maxWidthPx / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(b => resolve(b!), 'image/jpeg', quality);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        });

    const uploadToStorage = async (file: File, folder = 'photos'): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const compressed = await compressImage(file);
        const ext = 'jpg';
        const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('estimation-photos').upload(path, compressed, { contentType: 'image/jpeg', upsert: false });
        if (error) { console.error('Upload error:', error); return null; }
        const { data: urlData } = supabase.storage.from('estimation-photos').getPublicUrl(path);
        return urlData.publicUrl;
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const key = `${field}-${Date.now()}`;
        setUploadingPhotos(p => ({...p, [key]: true}));
        const url = await uploadToStorage(file, 'main');
        setUploadingPhotos(p => { const n = {...p}; delete n[key]; return n; });
        if (!url) return;
        if (field === 'mainPhoto') setData(prev => ({ ...prev, mainPhoto: url }));
        if (field === 'secondaryPhotos') setData(prev => ({ ...prev, secondaryPhotos: [...prev.secondaryPhotos, url].slice(0, 3) }));
    };

    const handleExtraPhotosUpload = async (files: File[]) => {
        const current = data.extraPhotos ?? [];
        const remaining = 8 - current.length;
        const toUpload = files.slice(0, remaining);
        if (toUpload.length === 0) return;
        setUploadingPhotos(p => ({...p, extra: true}));
        const urls = await Promise.all(toUpload.map(f => uploadToStorage(f, 'extra')));
        const valid = urls.filter(Boolean) as string[];
        setData(prev => ({ ...prev, extraPhotos: [...(prev.extraPhotos ?? []), ...valid].slice(0, 8) }));
        setUploadingPhotos(p => { const n = {...p}; delete n['extra']; return n; });
    };

    const handleComparableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sold' | 'forSale', id: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const key = `comp-${id}`;
        setUploadingPhotos(p => ({...p, [key]: true}));
        const url = await uploadToStorage(file, 'comparables');
        setUploadingPhotos(p => { const n = {...p}; delete n[key]; return n; });
        if (url) updateComparable(type, id, 'photoUrl', url);
    };

    const isUploading = Object.keys(uploadingPhotos).length > 0;

    const updateComparable = (type: 'sold' | 'forSale', id: string, field: keyof Comparable, value: any) => {
        setData(prev => {
            const list = type === 'sold' ? prev.soldComparables : prev.forSaleComparables;
            const updated = list.map(c => c.id === id ? { ...c, [field]: value } : c);
            return type === 'sold'
                ? { ...prev, soldComparables: updated }
                : { ...prev, forSaleComparables: updated };
        });
    };


    // =========================================================================
    // VUE 2 : ÉDITEUR WIZARD
    // =========================================================================
    if (view === "EDIT") {
        const inputClass = "bg-black/60 border-white/8 h-14 rounded-2xl focus:border-[#d35f52] focus:ring-0 transition-colors text-white placeholder:text-zinc-700";
        const selectClass = "w-full bg-black/60 border border-white/8 h-14 rounded-2xl px-4 focus:border-[#d35f52] text-white outline-none transition-colors appearance-none cursor-pointer";

        return (
            <div className="min-h-screen font-sans pb-32" style={{ backgroundColor: COLORS.darkBg, color: "white" }}>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
                    .dash-font { font-family: 'DM Sans', sans-serif; }
                    .display-font { font-family: 'Playfair Display', serif; }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
                `}</style>

                {/* Nav Bar */}
                <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-50 flex justify-between items-center px-6 py-3 rounded-full border shadow-2xl dash-font"
                    style={{ backgroundColor: 'rgba(17,17,20,0.85)', backdropFilter: 'blur(24px)', borderColor: COLORS.darkBorder }}>
                    <Button variant="ghost" onClick={goToMesBiens} className="text-zinc-400 hover:text-white rounded-full gap-2 text-sm">
                        <ArrowLeft size={16}/> Mes biens
                    </Button>
                    <div className="flex gap-1.5">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="h-1.5 w-8 rounded-full transition-all duration-500"
                                style={{ backgroundColor: step >= i ? COLORS.secondary : 'rgba(255,255,255,0.12)', width: step === i ? '32px' : '16px' }}/>
                        ))}
                    </div>
                    <Button onClick={() => handleSave(true)} disabled={isUploading} className={`rounded-full h-9 px-5 text-sm font-semibold transition-all ${savedFeedback ? 'bg-emerald-500 text-white' : isUploading ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}>
                        {isUploading ? <><Loader2 size={14} className="animate-spin mr-1.5"/>Upload…</> : savedFeedback ? '✓ Sauvegardé !' : 'Sauvegarder'}
                    </Button>
                </div>

                <div className="max-w-4xl mx-auto pt-24 px-4 dash-font">
                    <div className="rounded-[28px] p-8 md:p-10 border min-h-[600px] flex flex-col justify-between"
                        style={{ backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)' }}>
                        <AnimatePresence mode="wait">
                            {/* ÉTAPE 1 */}
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-6">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                            <Home size={18} className="text-white"/>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">Étape 1 / 4</p>
                                            <h2 className="text-2xl font-bold text-white display-font">Le Bien & Le Client</h2>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2 col-span-2 md:col-span-1">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nom du / des Client(s)</label>
                                            <Input value={data.clientName} onChange={e => setData({...data, clientName: e.target.value})} className={inputClass} placeholder="Ex: M. & Mme Dupont"/>
                                        </div>
                                        <div className="space-y-2 col-span-2 md:col-span-1">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Adresse du / des demandant(s)</label>
                                            <Input value={data.clientAddress||""} onChange={e => setData({...data, clientAddress: e.target.value})} className={inputClass} placeholder="Ex: 12 rue des Acacias, 31000 Toulouse"/>
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Adresse du bien estimé</label>
                                            <Input value={data.propertyAddress} onChange={e => setData({...data, propertyAddress: e.target.value})} className={inputClass} placeholder="Ex: 37, boulevard Jean Bruhne, 31000 Toulouse"/>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Type de bien</label>
                                            <select value={data.propertyType} onChange={e => setData({...data, propertyType: e.target.value as any})} className={selectClass}>
                                                <option>Appartement</option><option>Maison</option><option>Autre</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Surface (m²)</label>
                                                <Input type="number" value={data.surface||""} onChange={e => setData({...data, surface: Number(e.target.value)})} className={inputClass} placeholder="0"/>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Pièces</label>
                                                <Input type="number" value={data.rooms||""} onChange={e => setData({...data, rooms: Number(e.target.value)})} className={inputClass} placeholder="0"/>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Étage</label>
                                                <Input value={data.floor||""} onChange={e => setData({...data, floor: e.target.value})} className={inputClass} placeholder="Ex: 3, RDC…"/>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Année de construction</label>
                                                <Input type="number" value={data.buildYear||""} onChange={e => setData({...data, buildYear: Number(e.target.value)})} className={inputClass} placeholder="Ex: 1985"/>
                                            </div>
                                            <div className="flex flex-col justify-end">
                                                <div className="flex items-center justify-between bg-black/30 px-5 h-14 rounded-2xl border" style={{ borderColor: COLORS.darkBorder }}>
                                                    <label className="text-sm font-semibold text-white">Ascenseur</label>
                                                    <Switch checked={data.hasElevator ?? false} onCheckedChange={(checked) => setData({...data, hasElevator: checked})}/>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="flex items-center justify-between bg-black/30 px-5 h-14 rounded-2xl border" style={{ borderColor: COLORS.darkBorder }}>
                                                <label className="text-sm font-semibold text-white">Le bien est-il vendu loué (occupé) ?</label>
                                                <Switch checked={data.isRented ?? false} onCheckedChange={(checked) => setData({...data, isRented: checked})}/>
                                            </div>
                                        </div>

                                        {/* Champs Maison uniquement */}
                                        {data.propertyType === "Maison" && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 col-span-2">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.secondary }}>🌿 Surface de la Parcelle (m²)</label>
                                                    <Input type="number" value={data.plotSurface||""} onChange={e => setData({...data, plotSurface: Number(e.target.value)})} className={inputClass} placeholder="Ex: 450"/>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.secondary }}>🌳 Surface du Jardin (m²)</label>
                                                    <Input type="number" value={data.gardenSurface||""} onChange={e => setData({...data, gardenSurface: Number(e.target.value)})} className={inputClass} placeholder="Ex: 300"/>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 rounded-2xl space-y-5 border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: COLORS.darkBorder }}>
                                        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: COLORS.secondary }}>
                                            <Leaf size={16}/> Performance Énergétique
                                        </h3>
                                        <div className="grid grid-cols-3 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Note DPE</label>
                                                <select value={data.dpe} onChange={e => setData({...data, dpe: e.target.value})} className={selectClass}>
                                                    {["A","B","C","D","E","F","G"].map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Note GES</label>
                                                <select value={data.ges} onChange={e => setData({...data, ges: e.target.value})} className={selectClass}>
                                                    {["A","B","C","D","E","F","G"].map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Énergie Finale (kWh)</label>
                                                <Input type="number" value={data.energieFinale||""} onChange={e => setData({...data, energieFinale: Number(e.target.value)})} className={inputClass} placeholder="0"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl space-y-5 border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: COLORS.darkBorder }}>
                                        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: COLORS.secondary }}>
                                            <Banknote size={16}/> Coûts de détention
                                        </h3>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Taxe Foncière (€/an)</label>
                                                <Input type="number" value={data.taxeFonciere||""} onChange={e => setData({...data, taxeFonciere: Number(e.target.value)})} className={inputClass} placeholder="Ex: 1 200"/>
                                            </div>
                                            <div className="flex items-end">
                                                <div className="flex items-center justify-between w-full bg-black/30 px-5 h-14 rounded-2xl border" style={{ borderColor: COLORS.darkBorder }}>
                                                    <label className="text-sm font-semibold text-white flex items-center gap-2"><Building2 size={15}/> Copropriété ?</label>
                                                    <Switch checked={data.isCopropriete} onCheckedChange={(checked) => setData({...data, isCopropriete: checked})}/>
                                                </div>
                                            </div>
                                            {data.isCopropriete && (
                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Charges de copropriété (€/mois)</label>
                                                    <Input type="number" value={data.coproFees||""} onChange={e => setData({...data, coproFees: Number(e.target.value)})} className={inputClass} placeholder="Ex: 150"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Caractéristiques & Prestations</label>
                                        <textarea
                                            value={data.features}
                                            onChange={e => setData({...data, features: e.target.value})}
                                            className="w-full bg-black/60 border border-white/8 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-[#d35f52] transition-colors resize-none text-sm leading-relaxed"
                                            style={{ minHeight: '80px' }}
                                            placeholder="Ex: Appartement au 3ème étage, ascenseur, refait à neuf, double exposition..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="p-6 rounded-2xl space-y-4 border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: COLORS.darkBorder }}>
                                        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: COLORS.secondary }}>
                                            <Home size={16}/> Équipements & Annexes
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            {ALL_AMENITIES.map(am => {
                                                const isChecked = (data.amenities ?? []).includes(am.id);
                                                return (
                                                    <button
                                                        key={am.id}
                                                        type="button"
                                                        onClick={() => setData({ ...data, amenities: isChecked ? (data.amenities ?? []).filter(a => a !== am.id) : [...(data.amenities ?? []), am.id] })}
                                                        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-left transition-all"
                                                        style={{
                                                            backgroundColor: isChecked ? `${COLORS.secondary}18` : 'rgba(0,0,0,0.2)',
                                                            borderColor: isChecked ? COLORS.secondary : 'rgba(255,255,255,0.08)',
                                                            color: isChecked ? 'white' : '#71717a',
                                                        }}>
                                                        
                                                        <span className="text-sm font-semibold">{am.label}</span>
                                                        {isChecked && <CheckCircle size={14} className="ml-auto shrink-0" style={{ color: COLORS.secondary }}/>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* Équipement personnalisé */}
                                        <div className="mt-1">
                                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Ajouter un équipement</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newAmenity}
                                                    onChange={e => setNewAmenity(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && newAmenity.trim()) { setData({ ...data, amenities: [...(data.amenities ?? []), newAmenity.trim()] }); setNewAmenity(""); } }}
                                                    className="bg-black/50 border-white/8 rounded-xl h-11 text-sm"
                                                    placeholder="Ex: Balançoire, Abri de jardin…"
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={() => { if (newAmenity.trim()) { setData({ ...data, amenities: [...(data.amenities ?? []), newAmenity.trim()] }); setNewAmenity(""); } }}
                                                    variant="outline"
                                                    className="px-4 h-11 border-white/10 hover:bg-white/5 text-white rounded-xl shrink-0">
                                                    <Plus size={16}/>
                                                </Button>
                                            </div>
                                            {(data.amenities ?? []).filter(id => !ALL_AMENITIES.find(a => a.id === id)).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                    {(data.amenities ?? []).filter(id => !ALL_AMENITIES.find(a => a.id === id)).map(custom => (
                                                        <span key={custom} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10 text-zinc-300 bg-white/5">
                                                            {custom}
                                                            <button onClick={() => setData({ ...data, amenities: (data.amenities ?? []).filter(a => a !== custom) })} className="text-zinc-500 hover:text-red-400 transition-colors ml-1">
                                                                <X size={12}/>
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ÉTAPE 2 */}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                            <ImageIcon size={18} className="text-white"/>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">Étape 2 / 4</p>
                                            <h2 className="text-2xl font-bold text-white display-font">Photos du Bien</h2>
                                        </div>
                                    </div>

                                    {/* MODULE ASPIRATEUR D'ANNONCE */}
                                    <div className="bg-gradient-to-r from-[#111114] to-[#1a1a1f] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-6 mb-8">
                                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/5 shrink-0 border border-white/10">
                                            <Globe className="text-[#d35f52]" size={24}/>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <h2 className="text-sm font-bold text-white mb-1">Aspirateur d'Annonce</h2>
                                            <p className="text-xs text-zinc-400 mb-3">Si le bien est déjà en ligne, collez le lien pour importer automatiquement les photos (et le prix).</p>
                                            <div className="flex gap-3 w-full">
                                                <Input value={listingUrl} onChange={e => setListingUrl(e.target.value)} placeholder="https://www.patrim.fr/..." className="flex-1 bg-black/50 border-white/20 h-12 text-sm text-white focus:border-[#d35f52]"/>
                                                <Button onClick={handleImportFromUrl} disabled={isScraping} className="h-12 px-6 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-colors">
                                                    {isScraping ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} className="mr-2" />} Importer
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Photo de garde */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Photo de Garde <span className="text-zinc-700 normal-case tracking-normal">— apparaît sur la couverture</span></label>
                                        <div className="relative border-2 border-dashed rounded-3xl h-52 flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all"
                                            style={{ borderColor: data.mainPhoto ? COLORS.primary : 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                            {uploadingPhotos['mainPhoto-'] || Object.keys(uploadingPhotos).some(k => k.startsWith('mainPhoto'))
                                                ? <div className="flex flex-col items-center gap-2 text-zinc-500"><Loader2 className="animate-spin" size={32}/><span className="text-sm">Compression & upload…</span></div>
                                                : data.mainPhoto 
                                                    ? <img src={data.mainPhoto} className="absolute inset-0 w-full h-full object-cover opacity-90"/> 
                                                    : <div className="text-center text-zinc-600 flex flex-col items-center gap-2"><UploadCloud size={32}/><span className="text-sm font-medium">Cliquez pour ajouter</span></div>}
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'mainPhoto')} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                            {data.mainPhoto && (
                                                <button onClick={() => setData({...data, mainPhoto: ""})}
                                                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: COLORS.primary }}>
                                                    <X size={13} className="text-white"/>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Photos complémentaires */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                                                Photos Complémentaires <span className="text-zinc-700 normal-case tracking-normal">— dossier photo (max 8)</span>
                                            </label>
                                            <span className="text-xs font-mono text-zinc-600">{(data.extraPhotos ?? []).length} / 8</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                            {(data.extraPhotos ?? []).map((url, i) => (
                                                <div key={i} className="relative rounded-2xl overflow-hidden border aspect-[4/3]" style={{ borderColor: COLORS.darkBorder }}>
                                                    <img src={url} className="w-full h-full object-cover"/>
                                                    <button onClick={() => setData({...data, extraPhotos: (data.extraPhotos ?? []).filter((_, idx) => idx !== i)})}
                                                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
                                                        <X size={11} className="text-white"/>
                                                    </button>
                                                </div>
                                            ))}
                                            {(data.extraPhotos ?? []).length < 8 && (
                                                <div className="relative border-2 border-dashed rounded-2xl aspect-[4/3] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#d35f52]/50 gap-1"
                                                    style={{ borderColor: uploadingPhotos['extra'] ? COLORS.secondary : 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                    {uploadingPhotos['extra']
                                                        ? <><Loader2 className="animate-spin text-zinc-500" size={20}/><span className="text-[10px] text-zinc-600 font-medium">Upload…</span></>
                                                        : <><Plus className="text-zinc-600" size={22}/><span className="text-[10px] text-zinc-700 font-medium">Ajouter</span></>}
                                                    <input type="file" accept="image/*" multiple
                                                        onChange={(e) => handleExtraPhotosUpload(Array.from(e.target.files || []))}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        disabled={!!uploadingPhotos['extra']}/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ÉTAPE 3 */}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-8 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                            <TrendingUp size={18} className="text-white"/>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">Étape 3 / 4</p>
                                            <h2 className="text-2xl font-bold text-white display-font">Analyse du Marché</h2>
                                        </div>
                                    </div>
                                    {(['sold', 'forSale'] as const).map(type => (
                                        <div key={type}>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-base font-bold text-zinc-200">{type === 'sold' ? '🟢 Biens Vendus' : '🟡 En Vente actuellement'}</h3>
                                                    {/* NOUVEAU BOUTON MAGIQUE */}
                                                    {type === 'sold' && (
                                                        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                                                            <select 
                                                                value={dvfRadius} 
                                                                onChange={e => setDvfRadius(Number(e.target.value))}
                                                                className="bg-transparent text-xs text-white outline-none pl-2 pr-1 h-7 cursor-pointer"
                                                            >
                                                                <option value={100} className="bg-zinc-800 text-white">100m</option>
                                                                <option value={250} className="bg-zinc-800 text-white">250m</option>
                                                                <option value={500} className="bg-zinc-800 text-white">500m</option>
                                                                <option value={1000} className="bg-zinc-800 text-white">1 km</option>
                                                                <option value={2000} className="bg-zinc-800 text-white">2 km</option>
                                                            </select>
                                                            <Button onClick={handleAutoGenerateDVF} disabled={isGeneratingComps} size="sm" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg h-7 px-3 text-xs font-bold transition-all">
                                                                {isGeneratingComps ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <Wand2 size={12} className="mr-1.5" />} Auto-Générer
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button onClick={() => {
                                                    const newComp: Comparable = { id: Date.now().toString(), address: "", surface: 0, price: 0, photoUrl: "" };
                                                    setData(prev => type === 'sold'
                                                        ? { ...prev, soldComparables: [...prev.soldComparables, newComp] }
                                                        : { ...prev, forSaleComparables: [...prev.forSaleComparables, newComp] });
                                                }} variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-white rounded-xl h-8">
                                                    <Plus size={15} className="mr-1"/> Ajouter
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {(type === 'sold' ? data.soldComparables : data.forSaleComparables).map(comp => {
                                                    const isUploadingPhoto = !!uploadingPhotos[`comp-${comp.id}`];
                                                    return (
                                                    <div key={comp.id} className="flex gap-3 p-4 rounded-2xl border items-center relative pr-12" style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderColor: COLORS.darkBorder }}>
                                                        <div className="w-14 h-14 shrink-0 relative border border-dashed rounded-xl flex items-center justify-center overflow-hidden" style={{ borderColor: isUploadingPhoto ? COLORS.secondary : 'rgba(255,255,255,0.15)' }}>
                                                            {isUploadingPhoto
                                                                ? <Loader2 className="animate-spin text-zinc-500" size={18}/>
                                                                : comp.photoUrl
                                                                    ? <img src={comp.photoUrl} className="w-full h-full object-cover"/>
                                                                    : <span className="text-[9px] text-zinc-600 text-center">Photo</span>}
                                                            <input type="file" onChange={(e) => handleComparableImageUpload(e, type, comp.id)} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploadingPhoto}/>
                                                        </div>
                                                        <Input placeholder="Adresse du bien" value={comp.address} onChange={e => updateComparable(type, comp.id, 'address', e.target.value)} className="flex-1 bg-transparent border-white/8 rounded-xl"/>
                                                        <Input type="number" placeholder="m²" value={comp.surface||""} onChange={e => updateComparable(type, comp.id, 'surface', Number(e.target.value))} className="w-20 bg-transparent border-white/8 rounded-xl text-center"/>
                                                        <Input type="number" placeholder="Prix €" value={comp.price||""} onChange={e => updateComparable(type, comp.id, 'price', Number(e.target.value))} className="w-32 bg-transparent border-white/8 rounded-xl font-bold" style={{ color: COLORS.secondary }}/>
                                                        <button onClick={() => setData(prev => {
                                                            const list = type === 'sold' ? prev.soldComparables : prev.forSaleComparables;
                                                            const updated = list.filter(c => c.id !== comp.id);
                                                            return type === 'sold' ? { ...prev, soldComparables: updated } : { ...prev, forSaleComparables: updated };
                                                        })} className="absolute right-4 text-zinc-600 hover:text-red-400 transition-colors">
                                                            <Trash2 size={15}/>
                                                        </button>
                                                    </div>
                                                    );
                                                })}
                                                {type === 'sold' && data.soldComparables.length === 0 && (
                                                    <div className="text-center py-6 text-sm text-zinc-500 italic border border-dashed border-white/10 rounded-2xl">
                                                        Cliquez sur Auto-Générer ou ajoutez manuellement.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {/* ÉTAPE 4 */}
                            {step === 4 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-6 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                            <CheckCircle size={18} className="text-white"/>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">Étape 4 / 4</p>
                                            <h2 className="text-2xl font-bold text-white display-font">Bilan Expert</h2>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5 mb-6">
                                        {([['sold', 'emerald', '✓ Points Forts', data.strengths, newStrength, setNewStrength, 'strengths'], ['weak', 'rose', '✗ Points Faibles', data.weaknesses, newWeakness, setNewWeakness, 'weaknesses']] as const).map(([key, color]) => (
                                            <div key={key as string} className="space-y-4 p-5 rounded-2xl border" style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderColor: COLORS.darkBorder }}>
                                                {key === 'sold' ? (
                                                    <>
                                                        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-widest"><ThumbsUp size={15}/> Points Forts</h3>
                                                        <div className="flex gap-2">
                                                            <Input value={newStrength} onChange={e=>setNewStrength(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && newStrength){setData({...data, strengths: [...data.strengths, newStrength]}); setNewStrength("");}}} className="bg-black/50 border-white/8 rounded-xl" placeholder="Ajouter..."/>
                                                            <Button onClick={()=>{if(newStrength){setData({...data, strengths:[...data.strengths, newStrength]}); setNewStrength("");}}} variant="outline" className="px-3 border-white/10 hover:bg-white/5 rounded-xl"><Plus size={15}/></Button>
                                                        </div>
                                                        <ul className="space-y-1.5">{data.strengths.map((s,i)=><li key={i} className="flex justify-between items-center text-sm bg-white/4 px-3 py-2 rounded-xl border border-white/5"><span className="text-zinc-300">{s}</span><button onClick={()=>setData({...data, strengths: data.strengths.filter((_,idx)=>idx!==i)})}><X size={13} className="text-zinc-600 hover:text-red-400"/></button></li>)}</ul>
                                                    </>
                                                ) : (
                                                    <>
                                                        <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 uppercase tracking-widest"><ThumbsDown size={15}/> Points Faibles</h3>
                                                        <div className="flex gap-2">
                                                            <Input value={newWeakness} onChange={e=>setNewWeakness(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && newWeakness){setData({...data, weaknesses:[...data.weaknesses, newWeakness]}); setNewWeakness("");}}} className="bg-black/50 border-white/8 rounded-xl" placeholder="Ajouter..."/>
                                                            <Button onClick={()=>{if(newWeakness){setData({...data, weaknesses:[...data.weaknesses, newWeakness]}); setNewWeakness("");}}} variant="outline" className="px-3 border-white/10 hover:bg-white/5 rounded-xl"><Plus size={15}/></Button>
                                                        </div>
                                                        <ul className="space-y-1.5">{data.weaknesses.map((w,i)=><li key={i} className="flex justify-between items-center text-sm bg-white/4 px-3 py-2 rounded-xl border border-white/5"><span className="text-zinc-300">{w}</span><button onClick={()=>setData({...data, weaknesses: data.weaknesses.filter((_,idx)=>idx!==i)})}><X size={13} className="text-zinc-600 hover:text-red-400"/></button></li>)}</ul>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-6 rounded-2xl border" style={{ background: `linear-gradient(135deg, ${COLORS.primary}18, ${COLORS.secondary}10)`, borderColor: `${COLORS.primary}35` }}>
                                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: COLORS.secondary }}>Valeur {data.isRented ? "Libre de toute occupation" : "Vénale Estimée"}</h3>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.secondary }}>Fourchette Basse (€)</label>
                                                <Input type="number" value={data.lowPrice||""} onChange={e => setData({...data, lowPrice: Number(e.target.value)})} className="bg-black/50 border-white/8 h-16 rounded-2xl text-2xl font-black text-white"/>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.secondary }}>Fourchette Haute (€)</label>
                                                <Input type="number" value={data.highPrice||""} onChange={e => setData({...data, highPrice: Number(e.target.value)})} className="bg-black/50 border-white/8 h-16 rounded-2xl text-2xl font-black text-white"/>
                                            </div>
                                        </div>

                                        {data.isRented && (
                                            <>
                                                <h3 className="text-sm font-bold uppercase tracking-widest mt-6 mb-4" style={{ color: COLORS.gold }}>Valeur Vendu Occupé (Loué)</h3>
                                                <div className="grid grid-cols-2 gap-5">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Fourchette Basse Loué (€)</label>
                                                        <Input type="number" value={data.lowPriceRented||""} onChange={e => setData({...data, lowPriceRented: Number(e.target.value)})} className="bg-black/50 border-white/8 h-16 rounded-2xl text-2xl font-black text-white"/>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Fourchette Haute Loué (€)</label>
                                                        <Input type="number" value={data.highPriceRented||""} onChange={e => setData({...data, highPriceRented: Number(e.target.value)})} className="bg-black/50 border-white/8 h-16 rounded-2xl text-2xl font-black text-white"/>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: COLORS.darkBorder }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: COLORS.secondary }}><Euro size={16}/> Estimation Locative</h3>
                                            <Switch checked={data.hasRentalEstimation} onCheckedChange={(checked) => setData({...data, hasRentalEstimation: checked})}/>
                                        </div>
                                        {data.hasRentalEstimation && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Loyer mensuel estimé (€ HC)</label>
                                                <Input type="number" value={data.monthlyRent||""} onChange={e => setData({...data, monthlyRent: Number(e.target.value)})} className="bg-black/50 border-white/8 h-14 rounded-2xl text-lg" placeholder="Ex: 850"/>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Analyse Personnalisée</label>
                                        <textarea value={data.agentAnalysis} onChange={e => setData({...data, agentAnalysis: e.target.value})} className="w-full bg-black/50 border border-white/8 rounded-2xl p-4 text-white min-h-[140px] outline-none focus:border-[#d35f52] transition-colors resize-none" placeholder="Rédigez votre conclusion pour le client..."/>
                                    </div>

                                    {/* SÉLECTION DU COLLABORATEUR */}
                                    <div className="space-y-2 mt-4 pb-10">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Collaborateur en charge</label>
                                        <select value={data.agentId} onChange={e => setData({...data, agentId: e.target.value})} className={selectClass}>
                                            <option value="">Sélectionner un collaborateur...</option>
                                            {AGENTS.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-between items-center mt-10 pt-6 border-t" style={{ borderColor: COLORS.darkBorder }}>
                            <Button variant="ghost" onClick={handleBack} disabled={step === 1} className="text-zinc-500 hover:text-white rounded-full gap-2 disabled:opacity-30">
                                <ArrowLeft size={16}/> Retour
                            </Button>
                            {step < 4 ? (
                                <Button onClick={handleNext} className="bg-white text-black font-bold h-11 px-8 rounded-full hover:bg-zinc-200 transition-all">
                                    Suivant <ArrowRight className="ml-2" size={16}/>
                                </Button>
                            ) : (
                                <Button onClick={() => handleSave(false)} className="h-11 px-8 rounded-full font-bold text-white shadow-2xl transition-all hover:scale-105"
                                    style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, boxShadow: `0 8px 32px -8px rgba(138,14,1,0.5)` }}>
                                    Générer le PDF <FileText className="ml-2" size={16}/>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // VUE 3 : RAPPORT PDF — ULTRA PREMIUM
    // =========================================================================
    const allComps = [...data.soldComparables, ...data.forSaleComparables];
    const pricesPerSqm = allComps.map(c => c.price / (c.surface || 1)).filter(p => p > 0);
    const estimatedPriceSqm = ((data.lowPrice + data.highPrice) / 2) / (data.surface || 1);
    let minPriceGraph = Math.min(...pricesPerSqm, estimatedPriceSqm || Infinity);
    let maxPriceGraph = Math.max(...pricesPerSqm, estimatedPriceSqm || 0);
    if (minPriceGraph === Infinity) minPriceGraph = 0;
    minPriceGraph = minPriceGraph * 0.9; maxPriceGraph = maxPriceGraph * 1.1;
    const getPositionPercent = (price: number) => { if (maxPriceGraph === minPriceGraph) return 50; return ((price - minPriceGraph) / (maxPriceGraph - minPriceGraph)) * 100; };

    const renderEnergyRail = (currentLetter: string) => (
        <div className="flex w-full items-end h-10 gap-[2px] mt-1">
            {["A","B","C","D","E","F","G"].map((letter) => {
                const isSelected = currentLetter === letter;
                const color = DPE_COLORS[letter];
                return (
                    <div key={letter}
                        className={`flex justify-center items-center font-black text-white rounded-sm origin-bottom transition-all duration-300 ${isSelected ? 'h-12 z-10 shadow-lg text-sm border-2 border-white/80' : 'h-5 flex-1 text-[8px] opacity-35'}`}
                        style={{ backgroundColor: color, width: isSelected ? '34px' : 'auto', flexShrink: isSelected ? 0 : 1 }}>
                        {letter}
                    </div>
                );
            })}
        </div>
    );

    // COMPOSANT POUR GÉNÉRER LA SIGNATURE ET LE TAMPON
    const renderSignature = () => {
        if (!data.agentId) return null;
        const agent = AGENTS.find(a => a.id === data.agentId);
        if (!agent) return null;
        return (
            <div className="absolute bottom-2 right-2 flex items-end z-10 pointer-events-none opacity-95">
                <div className="flex flex-col items-end z-10 pb-2">
                    <p className="text-[13px] font-black text-zinc-800">{agent.name}</p>
                    <p className="text-[9px] text-zinc-500 mb-2 uppercase tracking-widest">{agent.role}</p>
                    <img 
                        src={agent.signatureUrl} 
                        alt="Signature" 
                        className="h-28 w-auto object-contain mix-blend-multiply" 
                        onError={(e) => e.currentTarget.style.display = 'none'} 
                    />
                </div>
                <div className="relative -ml-20 -mb-4 z-0 opacity-80">
                    <img 
                        src="/signatures/signature-agence.png" 
                        alt="Tampon Agence" 
                        className="h-32 w-auto object-contain mix-blend-multiply" 
                        onError={(e) => e.currentTarget.style.display = 'none'} 
                    />
                </div>
            </div>
        );
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

                @media print {
                    @page { size: A4 landscape; margin: 0; }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background-color: #f1f1f3 !important;
                        margin: 0; padding: 0;
                    }
                    .print-hidden { display: none !important; }
                    .print-page {
                        width: 297mm !important;
                        height: 210mm !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        position: relative;
                        overflow: hidden !important;
                    }
                    .premium-card {
                        background-color: #ffffff !important;
                        border: 1px solid #e8e8ec !important;
                        border-radius: 1.25rem !important;
                        box-shadow: 0 2px 12px -2px rgba(0,0,0,0.06) !important;
                    }
                    .inner-card {
                        background-color: #f5f5f7 !important;
                        border: 1px solid #e8e8ec !important;
                        border-radius: 0.75rem !important;
                    }
                    .dark-cover-half {
                        background-color: #0a0a0c !important;
                        color: white !important;
                    }
                    .print-no-blur {
                        backdrop-filter: none !important;
                        -webkit-backdrop-filter: none !important;
                        background-color: white !important;
                        box-shadow: none !important;
                    }
                    .patrim-gradient-bar {
                        background: linear-gradient(90deg, #8a0e01 0%, #d35f52 100%) !important;
                    }
                }

                .pdf-font { font-family: 'DM Sans', -apple-system, sans-serif; }
                .pdf-display { font-family: 'Playfair Display', Georgia, serif; }

                @media print {
                    .page-watermark::after {
                        content: 'PATRIM';
                        position: absolute;
                        bottom: 24px;
                        right: 32px;
                        font-size: 9px;
                        font-weight: 700;
                        letter-spacing: 0.4em;
                        color: #d0d0d8;
                        opacity: 0.4;
                        font-family: 'DM Sans', sans-serif;
                    }
                }
            `}}/>

            {/* Floating Action Bar */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-white px-8 py-4 rounded-full flex items-center gap-5 shadow-2xl z-50 print-hidden border"
                style={{ backgroundColor: 'rgba(17,17,20,0.92)', backdropFilter: 'blur(24px)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <Button variant="ghost" onClick={() => setView("EDIT")} className="text-zinc-400 hover:text-white rounded-full gap-2 text-sm">
                    <Edit size={15}/> Modifier
                </Button>
                <div className="w-px h-5 bg-white/10"></div>
                <Button variant="ghost" onClick={goToMesBiens} className="text-zinc-400 hover:text-white rounded-full gap-2 text-sm">
                    <List size={15}/> Mes biens
                </Button>
                <div className="w-px h-5 bg-white/10"></div>
                <Button 
                    variant="ghost" 
                    onClick={() => router.push(`/plaquette/${currentId}`)} 
                    className="text-zinc-300 hover:text-[#d35f52] rounded-full gap-2 text-sm font-bold"
                >
                    <Sparkles size={15} className="text-[#d35f52]"/> Plaquette Com
                </Button>
                <div className="w-px h-5 bg-white/10"></div>
                <Button onClick={() => window.print()} className="rounded-full px-7 h-10 font-bold text-sm text-white gap-2 shadow-lg transition-all hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, boxShadow: `0 8px 24px -8px rgba(138,14,1,0.5)` }}>
                    <Printer size={15}/> Imprimer / PDF
                </Button>
            </div>

            <div className="min-h-screen py-10 pdf-font print:p-0 print:py-0" style={{ backgroundColor: '#e8e8ec' }}>

                {/* ================================================================= */}
                {/* PAGE 1 : COUVERTURE                                               */}
                {/* ================================================================= */}
                <div className="print-page w-[297mm] h-[210mm] mx-auto bg-white flex overflow-hidden mb-8 shadow-2xl rounded-none relative">
                    <div className="w-[55%] h-full relative">
                        {data.mainPhoto 
                            ? <img src={data.mainPhoto} className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a1d' }}>
                                <span className="text-zinc-600 font-semibold uppercase tracking-widest text-xs">Aucune photo</span>
                              </div>}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 60%, rgba(10,10,12,0.4) 100%)' }}></div>
                        <div className="absolute right-0 top-0 h-full w-1" style={{ background: `linear-gradient(to bottom, ${COLORS.primary}, ${COLORS.secondary})` }}></div>
                    </div>

                    <div className="dark-cover-half w-[45%] h-full text-white flex flex-col justify-between relative" style={{ backgroundColor: '#0a0a0c', padding: '2.8rem 3rem 2.8rem 3rem' }}>
                        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        
                        <div className="relative z-10 flex justify-between items-start gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="bg-white rounded-2xl p-3 shadow-xl print-no-blur inline-flex items-center justify-center" style={{ minWidth: '110px' }}>
                                    <img src="/logo-patrim.png" alt="PATRIM" className="h-10 object-contain"/>
                                </div>
                                <div className="space-y-0.5 pl-0.5">
                                    <p className="text-[8px] text-zinc-600 font-semibold leading-relaxed">SAS PATRIM</p>
                                    <p className="text-[7.5px] text-zinc-700 leading-relaxed">Carte pro n° CPI31012016000013177</p>
                                    <p className="text-[7.5px] text-zinc-700 leading-relaxed">RCS Toulouse B 403 231 145</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-semibold mb-1">Document réalisé le</p>
                                <p className="text-[13px] font-bold text-white leading-tight">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>

                        <div className="relative z-10 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${COLORS.primary}, transparent)` }}></div>
                                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">Estimation immobilière</span>
                            </div>
                            <h1 className="pdf-display font-black uppercase leading-[0.88] tracking-tight" style={{ fontSize: '48px', color: COLORS.secondary }}>
                                Avis <br/>
                                <span style={{ color: '#ffffff' }}>de valeur</span>
                            </h1>
                            <div className="border-t border-white/10 pt-3 mt-3">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">A la demande de</p>
                                <p className="text-[17px] font-bold text-white leading-snug">{data.clientName || "—"}</p>
                                {(data.clientAddress) && (
                                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                                        Domicilié{data.clientName?.includes('&') || data.clientName?.toLowerCase().includes(' et ') ? '(s)' : ''} au&nbsp;
                                        <span className="text-zinc-300 font-medium">{data.clientAddress}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="relative z-10 border-l-[3px] pl-5" style={{ borderColor: COLORS.primary }}>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-bold">Le Bien Estimé</p>
                            <p className="text-[15px] font-bold text-white leading-tight">{data.propertyAddress || "Adresse non renseignée"}</p>
                            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
                                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border text-zinc-300" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>{data.propertyType}</span>
                                {data.surface > 0 && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border text-zinc-300" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>{data.surface} m²</span>}
                                {data.rooms > 0 && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border text-zinc-300" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>{data.rooms} pièces</span>}
                                {data.floor && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border text-zinc-300" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>{getDisplayFloor(data.floor)}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-[38px] flex items-center px-8 gap-5 z-30"
                        style={{ background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)` }}>
                        <span className="text-white text-[9.5px] font-bold uppercase tracking-widest">Agence Patrim</span>
                        <span className="text-white/40 text-[9px]">|</span>
                        <span className="text-white text-[9.5px] font-medium">45, allées Jean Jaurès — 31000 Toulouse</span>
                        <span className="text-white/40 text-[9px]">|</span>
                        <span className="text-white text-[9.5px] font-medium">05.61.99.08.08</span>
                        <span className="text-white/40 text-[9px]">|</span>
                        <span className="text-white text-[9.5px] font-medium">www.patrim.fr</span>
                        <div className="ml-auto text-white/60 text-[9px] font-mono">1 / 4</div>
                    </div>
                </div>

                {/* ================================================================= */}
                {/* PAGE 2 : CARACTÉRISTIQUES                                         */}
                {/* ================================================================= */}
                <div className="print-page page-watermark w-[297mm] h-[210mm] mx-auto bg-[#f5f5f7] p-9 flex flex-col mb-8 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-4 pb-3.5 border-b border-zinc-200 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                <span className="text-white text-[9px] font-black">01</span>
                            </div>
                            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] pdf-font" style={{ color: COLORS.primary }}>Le Bien & Ses Caractéristiques</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <img src="/logo-patrim.png" alt="PATRIM" className="h-6 object-contain opacity-60"/>
                            <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">2 / 4</span>
                        </div>
                    </div>

                    <div className="flex gap-4 flex-1 min-h-0">
                        <div className="flex flex-col gap-3.5 min-h-0" style={{ width: '56%' }}>
                            <div className="grid grid-cols-3 gap-3.5 shrink-0" style={{ height: '90px' }}>
                                <div className="premium-card bg-white rounded-[18px] flex flex-col justify-center items-center text-center shadow-sm border border-zinc-200 relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})` }}></div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-2">Surface</p>
                                    <div className="flex items-end justify-center gap-1.5 leading-none">
                                        <span className="text-5xl font-black pdf-display" style={{ color: COLORS.gray }}>{data.surface}</span>
                                        <span className="text-lg font-bold text-zinc-400 mb-1">m²</span>
                                    </div>
                                </div>
                                <div className="premium-card bg-white rounded-[18px] flex flex-col justify-center items-center text-center shadow-sm border border-zinc-200 relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${COLORS.secondary}, #f0a090)` }}></div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-2">Pièces</p>
                                    <div className="flex items-end justify-center gap-1.5 leading-none">
                                        <span className="text-5xl font-black pdf-display" style={{ color: COLORS.gray }}>{data.rooms}</span>
                                        <span className="text-lg font-bold text-zinc-400 mb-1">pces</span>
                                    </div>
                                </div>
                                <div className="premium-card bg-white rounded-[18px] px-4 py-3 shadow-sm border border-zinc-200 flex flex-col justify-center gap-1.5 relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, #a3a3b3, #d4d4d8)` }}></div>
                                    {data.propertyType === "Maison" ? (
                                        <>
                                            {data.plotSurface > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Parcelle</span>
                                                    <span className="text-[11px] font-black text-zinc-700">{formatPrice(data.plotSurface)} m²</span>
                                                </div>
                                            )}
                                            {data.gardenSurface > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Jardin</span>
                                                    <span className="text-[11px] font-black text-zinc-700">{formatPrice(data.gardenSurface)} m²</span>
                                                </div>
                                            )}
                                            {data.buildYear > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Construction</span>
                                                    <span className="text-[11px] font-black text-zinc-700">{data.buildYear}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {data.floor && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Étage</span>
                                                    <span className="text-[11px] font-black text-zinc-700">{getDisplayFloor(data.floor)}</span>
                                                </div>
                                            )}
                                            {data.buildYear > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Construction</span>
                                                    <span className="text-[11px] font-black text-zinc-700">{data.buildYear}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Ascenseur</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${data.hasElevator ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-500 bg-zinc-100'}`}>
                                                    {data.hasElevator ? 'Oui' : 'Non'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-rows-2 gap-3.5 flex-1 min-h-0">
                                <div className="premium-card bg-white rounded-[18px] p-5 shadow-sm border border-zinc-200 flex flex-col min-h-0">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5 shrink-0"><Leaf size={12}/> Performance Énergétique</p>
                                    <div className="grid grid-cols-2 gap-6 flex-1 items-center">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] uppercase font-bold text-zinc-400 mb-2 tracking-widest">DPE — Diagnostic de Performance</p>
                                            {renderEnergyRail(data.dpe)}
                                            <p className="text-[9px] text-zinc-400 mt-2">Consommation d'énergie primaire</p>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-[10px] uppercase font-bold text-zinc-400 mb-2 tracking-widest">GES — Émissions CO₂</p>
                                            {renderEnergyRail(data.ges)}
                                            <p className="text-[9px] text-zinc-400 mt-2">Impact sur le climat</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="premium-card bg-white rounded-[18px] px-5 py-4 shadow-sm border border-zinc-200 shrink-0">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-2">Prestations & Descriptif</p>
                                    <div className="text-[11.5px] leading-snug text-zinc-700 font-medium whitespace-pre-wrap">{data.features || "Non renseigné."}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3.5 min-h-0" style={{ width: '44%' }}>
                            <div className="premium-card bg-white rounded-[18px] p-5 shadow-sm border border-zinc-200 shrink-0">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-4 flex items-center gap-1.5"><Banknote size={12}/> Charges & Coûts Annuels</p>
                                <div className="flex gap-3">
                                    <div className="flex-1 inner-card bg-zinc-50 border border-zinc-100 rounded-[14px] px-4 py-3.5 text-center">
                                        <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider mb-1.5">Taxe Foncière</p>
                                        <p className="font-black text-xl pdf-display text-zinc-800 leading-none">{formatPrice(data.taxeFonciere)}</p>
                                        <p className="text-[10px] font-semibold text-zinc-500 mt-1">€ / an</p>
                                    </div>
                                    {data.isCopropriete ? (
                                        <div className="flex-1 inner-card border rounded-[14px] px-4 py-3.5 text-center relative overflow-hidden"
                                            style={{ backgroundColor: `${COLORS.primary}06`, borderColor: `${COLORS.primary}20` }}>
                                            <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: COLORS.primary }}>Charges Copropriété</p>
                                            <p className="font-black text-xl pdf-display text-zinc-800 leading-none">{formatPrice(data.coproFees * 12)}</p>
                                            <p className="text-[10px] font-semibold text-zinc-500 mt-1">€ / an <span className="text-zinc-400">({formatPrice(data.coproFees)} €/mois)</span></p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 inner-card bg-zinc-50 border border-zinc-100 rounded-[14px] px-4 py-3.5 text-center flex flex-col items-center justify-center">
                                            <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider mb-1.5">Statut</p>
                                            <p className="font-black text-base text-zinc-800">Individuel</p>
                                            <p className="text-[9px] text-zinc-400 mt-1">Pas de charges de copropriété</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {data.secondaryPhotos.length > 0 ? (
                                <div className="flex flex-col gap-3.5 flex-1 min-h-0">
                                    {data.secondaryPhotos.map((url, i) => (
                                        <div key={i} className="rounded-[18px] overflow-hidden shadow-sm border border-zinc-200 relative flex-1 min-h-0">
                                            <img src={url} className="w-full h-full object-cover"/>
                                            <div className="absolute inset-0 rounded-[18px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}></div>
                                        </div>
                                    ))}
                                    {(data.amenities ?? []).length > 0 && (
                                        <div className="premium-card bg-white rounded-[18px] px-4 py-3 shadow-sm border border-zinc-200 shrink-0">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 mb-2">Équipements & Annexes</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(data.amenities ?? []).map(id => {
                                                    const am = ALL_AMENITIES.find(a => a.id === id);
                                                    const label = am ? am.label : id;
                                                    return (
                                                        <span key={id} className="inline-flex items-center text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border"
                                                            style={{ backgroundColor: `${COLORS.primary}08`, borderColor: `${COLORS.primary}20`, color: COLORS.gray }}>
                                                            {label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 premium-card bg-white rounded-[18px] p-6 shadow-sm border border-zinc-200 flex flex-col justify-center items-center min-h-0">
                                    <div className="flex flex-col justify-center items-center text-center">
                                        <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4 shrink-0"
                                            style={{ background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}10)`, border: `1.5px solid ${COLORS.primary}25` }}>
                                            <Home size={30} style={{ color: COLORS.secondary }}/>
                                        </div>
                                        <p className="text-3xl font-black pdf-display text-zinc-800 mb-2">{data.propertyType}</p>
                                        <p className="text-[13px] uppercase font-bold text-zinc-400 tracking-widest mb-3">{data.surface} m² — {data.rooms} pièces</p>
                                        <div className="flex items-center gap-2.5 justify-center flex-wrap">
                                            <span className="text-[11px] font-bold px-3.5 py-1.5 rounded-full border text-zinc-600" style={{ borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#f5f5f7' }}>DPE {data.dpe}</span>
                                            <span className="text-[11px] font-bold px-3.5 py-1.5 rounded-full border text-zinc-600" style={{ borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#f5f5f7' }}>GES {data.ges}</span>
                                            {data.buildYear > 0 && <span className="text-[11px] font-bold px-3.5 py-1.5 rounded-full border text-zinc-600" style={{ borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#f5f5f7' }}>Construit en {data.buildYear}</span>}
                                            {data.floor && <span className="text-[11px] font-bold px-3.5 py-1.5 rounded-full border text-zinc-600" style={{ borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#f5f5f7' }}>{getDisplayFloor(data.floor)}</span>}
                                        </div>
                                    </div>
                                    {(data.amenities ?? []).length > 0 && (
                                        <div className="border-t border-zinc-100 pt-4 mt-5 w-full">
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-3 text-center">Équipements & Annexes</p>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {(data.amenities ?? []).map(id => {
                                                    const am = ALL_AMENITIES.find(a => a.id === id);
                                                    const label = am ? am.label : id;
                                                    return (
                                                        <span key={id} className="inline-flex items-center text-[11px] font-semibold px-3.5 py-1.5 rounded-xl border"
                                                            style={{ backgroundColor: `${COLORS.primary}08`, borderColor: `${COLORS.primary}25`, color: COLORS.gray }}>
                                                            {label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ================================================================= */}
                {/* PAGE 3 : MARCHÉ                                                  */}
                {/* ================================================================= */}
                {(data.soldComparables.length > 0 || data.forSaleComparables.length > 0) && (
                    <div className="print-page page-watermark w-[297mm] h-[210mm] mx-auto bg-[#f5f5f7] p-10 flex flex-col mb-8 shadow-2xl relative">
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-zinc-200 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, #f0a090)` }}>
                                    <span className="text-white text-[9px] font-black">02</span>
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.35em]" style={{ color: COLORS.secondary }}>Le Marché & Concurrence</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src="/logo-patrim.png" alt="PATRIM" className="h-6 object-contain opacity-60"/>
                                <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">3 / 4</span>
                            </div>
                        </div>

                        {(data.lowPrice > 0 && allComps.length > 0) && (
                            <div className="premium-card bg-white rounded-[20px] p-7 mb-4 shadow-sm border border-zinc-200 shrink-0" style={{ minHeight: '90px' }}>
                                <h4 className="text-[11px] uppercase tracking-widest font-bold mb-7 text-zinc-400 flex items-center gap-2"><BarChart3 size={14}/> Positionnement Prix / m²</h4>
                                <div className="relative w-full" style={{ height: '64px' }}>
                                    <div className="absolute left-0 w-full h-[4px] bg-zinc-100 rounded-full" style={{ top: '32px' }}></div>
                                    <div className="absolute h-[4px] rounded-full opacity-20" style={{ backgroundColor: COLORS.primary, top: '32px', left: `${getPositionPercent(data.lowPrice / (data.surface || 1))}%`, width: `${Math.max(0, getPositionPercent(data.highPrice / (data.surface || 1)) - getPositionPercent(data.lowPrice / (data.surface || 1)))}%` }}></div>
                                    <div className="absolute h-[4px] rounded-full z-10" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`, top: '32px', left: `${getPositionPercent(data.lowPrice / (data.surface || 1))}%`, width: `${Math.max(0, getPositionPercent(data.highPrice / (data.surface || 1)) - getPositionPercent(data.lowPrice / (data.surface || 1)))}%` }}></div>
                                    <div className="absolute -translate-x-1/2 w-7 h-7 rounded-full border-[3px] border-white z-20 shadow-lg" style={{ top: '18px', left: `${getPositionPercent(estimatedPriceSqm)}%`, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-center leading-tight" style={{ color: COLORS.primary }}>
                                            <span className="block font-semibold">Notre estimation</span>
                                            <span className="block font-black text-[12px]">{Math.round(estimatedPriceSqm)} €/m²</span>
                                        </div>
                                    </div>
                                    {(() => {
                                        const points = allComps.map((c, i) => ({
                                            c, i,
                                            pct: getPositionPercent(c.price / (c.surface || 1)),
                                            sqm: Math.round(c.price / (c.surface || 1)),
                                        })).sort((a, b) => a.pct - b.pct);
                                        const sides: ('top' | 'bottom')[] = [];
                                        points.forEach((pt, idx) => {
                                            if (idx === 0) { sides.push('bottom'); return; }
                                            const prev = points[idx - 1];
                                            const prevSide = sides[idx - 1];
                                            const tooClose = (pt.pct - prev.pct) < 8;
                                            sides.push(tooClose ? (prevSide === 'bottom' ? 'top' : 'bottom') : (prevSide === 'bottom' ? 'top' : 'bottom'));
                                        });
                                        return points.map((pt, idx) => {
                                            const side = sides[idx];
                                            return (
                                                <div key={pt.i} className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white z-10"
                                                    style={{ top: '26px', left: `${pt.pct}%`, backgroundColor: '#a3a3b3' }}>
                                                    <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-zinc-600 font-bold`}
                                                        style={side === 'bottom' ? { top: '16px' } : { bottom: '16px' }}>
                                                        {pt.sqm} €/m²
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}

                        {(() => {
                            const soldCount = data.soldComparables.length;
                            const saleCount = data.forSaleComparables.length;
                            const maxRows = Math.min(Math.max(soldCount, saleCount), 5);
                            const rowH = maxRows <= 1 ? '100px' : maxRows === 2 ? '80px' : maxRows === 3 ? '66px' : maxRows === 4 ? '56px' : '48px';
                            const photoSize = maxRows <= 2 ? 'w-16 h-16' : maxRows === 3 ? 'w-13 h-13' : 'w-11 h-11';
                            const priceClass = maxRows <= 2 ? 'text-xl' : maxRows === 3 ? 'text-lg' : 'text-base';
                            const addrClass = maxRows <= 2 ? 'text-[13px]' : maxRows === 3 ? 'text-[12px]' : 'text-[11px]';
                            const metaClass = maxRows <= 2 ? 'text-[11px]' : 'text-[10px]';
                            const renderRow = (comp: Comparable, accentColor: string) => {
                                const compSqm = comp.price / (comp.surface || 1);
                                const refSqm = estimatedPriceSqm > 0 ? estimatedPriceSqm : (pricesPerSqm.length > 0 ? pricesPerSqm.reduce((a,b) => a+b,0)/pricesPerSqm.length : 0);
                                const delta = refSqm > 0 && compSqm > 0 ? Math.round(((compSqm - refSqm)/refSqm)*100) : null;
                                return (
                                    <div key={comp.id} className="inner-card flex items-center bg-zinc-50 rounded-2xl border border-zinc-100 gap-4 px-4 shrink-0" style={{ height: rowH }}>
                                        {comp.photoUrl ? <img src={comp.photoUrl} className={`${photoSize} object-cover rounded-xl shrink-0`}/> : <div className={`${photoSize} bg-zinc-200 rounded-xl shrink-0 flex items-center justify-center`}><Home size={maxRows <= 2 ? 18 : 14} className="text-zinc-400"/></div>}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold ${addrClass} text-zinc-800 truncate`}>{comp.address}</p>
                                            <p className={`text-zinc-400 ${metaClass} font-medium mt-0.5`}>{comp.surface} m²</p>
                                        </div>
                                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                            <p className={`${priceClass} font-black text-zinc-800`}>{formatPrice(comp.price)} €</p>
                                            <div className="flex items-center gap-1.5">
                                                <p className={`${metaClass} font-bold`} style={{ color: accentColor }}>{Math.round(compSqm)} €/m²</p>
                                                {delta !== null && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{delta > 0 ? '+' : ''}{delta}%</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            };
                            return (
                                <div className="flex gap-5 flex-1 min-h-0">
                                    <div className="w-1/2 premium-card bg-white rounded-[20px] p-5 shadow-sm border border-zinc-200 flex flex-col gap-2.5">
                                        {soldCount > 0 ? (<>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 shrink-0" style={{ color: '#059669' }}><CheckCircle size={12}/> Vendus récemment</h4>
                                            {data.soldComparables.slice(0,5).map(c => renderRow(c, '#059669'))}
                                        </>) : <div className="flex-1 flex items-center justify-center text-zinc-300 text-xs">Aucun bien vendu renseigné</div>}
                                    </div>
                                    <div className="w-1/2 premium-card bg-white rounded-[20px] p-5 shadow-sm border border-zinc-200 flex flex-col gap-2.5">
                                        {saleCount > 0 ? (<>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 text-amber-600 shrink-0"><TrendingUp size={12}/> Actuellement en vente</h4>
                                            {data.forSaleComparables.slice(0,5).map(c => renderRow(c, '#d97706'))}
                                        </>) : <div className="flex-1 flex items-center justify-center text-zinc-300 text-xs">Aucun bien en vente renseigné</div>}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* ================================================================= */}
                {/* PAGE 4 : CONCLUSION & VALORISATION                                */}
                {/* ================================================================= */}
                <div className="print-page page-watermark w-[297mm] h-[210mm] mx-auto bg-[#f5f5f7] p-9 flex flex-col mb-8 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-200 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                <span className="text-white text-[9px] font-black">03</span>
                            </div>
                            <h2 className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: COLORS.primary }}>Conclusion & Valorisation</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <img src="/logo-patrim.png" alt="PATRIM" className="h-6 object-contain opacity-60"/>
                            <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">4 / 4</span>
                        </div>
                    </div>
                    {(data.lowPrice > 0 && data.highPrice > 0) && (
                        <div className="grid grid-cols-3 gap-3 mb-3.5 shrink-0">
                            <div className="inner-card bg-white rounded-[14px] px-4 py-3 border border-zinc-200 flex flex-col justify-center">
                                <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Prix central estimé {data.isRented ? "(Libre)" : ""}</p>
                                <p className="text-xl font-black pdf-display text-zinc-800 leading-none">{formatPrice(Math.round((data.lowPrice + data.highPrice) / 2))} <span className="text-sm font-bold text-zinc-500">€</span></p>
                            </div>
                            <div className="inner-card bg-white rounded-[14px] px-4 py-3 border border-zinc-200 flex flex-col justify-center">
                                <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Prix / m² estimé</p>
                                <p className="text-xl font-black pdf-display text-zinc-800 leading-none">{Math.round(((data.lowPrice + data.highPrice) / 2) / (data.surface || 1))} <span className="text-sm font-bold text-zinc-500">€/m²</span></p>
                            </div>
                            <div className="inner-card bg-white rounded-[14px] px-4 py-3 border border-zinc-200 flex flex-col justify-center">
                                <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Amplitude de fourchette</p>
                                <p className="text-xl font-black pdf-display leading-none" style={{ color: COLORS.secondary }}>{formatPrice(data.highPrice - data.lowPrice)} <span className="text-sm font-bold text-zinc-500">€</span></p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-5 flex-1 min-h-0">
                        <div className="w-[47%] flex flex-col gap-3 min-h-0">
                            <div className="grid grid-cols-2 gap-3" style={{ flex: '0 0 auto', minHeight: '120px' }}>
                                <div className="premium-card bg-white rounded-[16px] p-4 shadow-sm border border-zinc-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-50 border border-emerald-100 shrink-0">
                                            <ThumbsUp size={12} className="text-emerald-600"/>
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Points Forts</h4>
                                    </div>
                                    {data.strengths.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {data.strengths.map((s, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                                                    <span className="text-[12px] font-semibold text-zinc-700 leading-tight">{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-zinc-400 italic">Non renseigné</p>
                                    )}
                                </div>
                                <div className="premium-card bg-white rounded-[16px] p-4 shadow-sm border border-zinc-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-rose-50 border border-rose-100 shrink-0">
                                            <ThumbsDown size={12} className="text-rose-600"/>
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600">Freins</h4>
                                    </div>
                                    {data.weaknesses.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {data.weaknesses.map((w, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                                                    <span className="text-[12px] font-semibold text-zinc-700 leading-tight">{w}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-zinc-400 italic">Non renseigné</p>
                                    )}
                                </div>
                            </div>
                            <div className="premium-card bg-white rounded-[16px] px-4 py-4 shadow-sm border border-zinc-200 shrink-0 flex flex-col justify-between" style={{ minHeight: '180px' }}>
                                <div>
                                    <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1.5">
                                        <Star size={10}/> Analyse de l'Expertise
                                    </p>
                                    <div className="text-[10.5px] leading-relaxed text-zinc-600 italic whitespace-pre-wrap">{data.agentAnalysis || "Aucune analyse rédigée."}</div>
                                </div>
                            </div>
                        </div>

                        <div className="w-[53%] flex flex-col gap-3 min-h-0">
                            {data.isRented ? (
                                <div className="flex-1 flex flex-col gap-3 min-h-0">
                                    <div className="flex-1 premium-card bg-white rounded-[16px] shadow-sm border border-zinc-200 flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})` }}></div>
                                        <div className="px-4 py-3">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 text-center mb-3">Valeur Vénale Libre</p>
                                            <div className="flex items-stretch justify-center gap-0 w-full">
                                                <div className="text-right flex-1 pr-4">
                                                    <p className="text-zinc-400 text-[8px] font-bold uppercase mb-1 tracking-wider">Basse</p>
                                                    <div className="flex items-baseline justify-end gap-1 whitespace-nowrap">
                                                        <span className={`font-black text-zinc-800 tracking-tighter pdf-display ${getPriceSizeClassSplit(data.lowPrice)}`}>{formatPrice(data.lowPrice)}</span>
                                                        <span className="text-sm font-black text-zinc-700">€</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center shrink-0 px-2">
                                                    <div className="w-[1.5px] h-full rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${COLORS.secondary}, transparent)` }}></div>
                                                </div>
                                                <div className="text-left flex-1 pl-4">
                                                    <p className="text-zinc-400 text-[8px] font-bold uppercase mb-1 tracking-wider">Haute</p>
                                                    <div className="flex items-baseline justify-start gap-1 whitespace-nowrap">
                                                        <span className={`font-black tracking-tighter pdf-display ${getPriceSizeClassSplit(data.highPrice)}`} style={{ color: COLORS.secondary }}>{formatPrice(data.highPrice)}</span>
                                                        <span className="text-sm font-black" style={{ color: COLORS.secondary }}>€</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 premium-card bg-white rounded-[16px] shadow-sm border border-zinc-200 flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${COLORS.gold}, #e8b86d)` }}></div>
                                        <div className="px-4 py-3">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 text-center mb-3">Valeur Vénale Loué</p>
                                            <div className="flex items-stretch justify-center gap-0 w-full">
                                                <div className="text-right flex-1 pr-4">
                                                    <p className="text-zinc-400 text-[8px] font-bold uppercase mb-1 tracking-wider">Basse</p>
                                                    <div className="flex items-baseline justify-end gap-1 whitespace-nowrap">
                                                        <span className={`font-black text-zinc-800 tracking-tighter pdf-display ${getPriceSizeClassSplit(data.lowPriceRented)}`}>{formatPrice(data.lowPriceRented)}</span>
                                                        <span className="text-sm font-black text-zinc-700">€</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center shrink-0 px-2">
                                                    <div className="w-[1.5px] h-full rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${COLORS.gold}, transparent)` }}></div>
                                                </div>
                                                <div className="text-left flex-1 pl-4">
                                                    <p className="text-zinc-400 text-[8px] font-bold uppercase mb-1 tracking-wider">Haute</p>
                                                    <div className="flex items-baseline justify-start gap-1 whitespace-nowrap">
                                                        <span className={`font-black tracking-tighter pdf-display ${getPriceSizeClassSplit(data.highPriceRented)}`} style={{ color: COLORS.gold }}>{formatPrice(data.highPriceRented)}</span>
                                                        <span className="text-sm font-black" style={{ color: COLORS.gold }}>€</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* SIGNATURE DANS LA CARTE "LOUÉ" */}
                                        {renderSignature()}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 premium-card bg-white rounded-[18px] shadow-sm border border-zinc-200 flex flex-col justify-center relative overflow-hidden min-h-0">
                                    <div className="absolute inset-x-0 top-0 h-[4px]" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})` }}></div>
                                    <div className="p-7">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 text-center mb-6">Estimation de la Valeur Vénale</p>
                                        <div className="flex items-stretch justify-center gap-0 w-full">
                                            <div className="text-right flex-1 pr-5">
                                                <p className="text-zinc-400 text-[9px] font-bold uppercase mb-2 tracking-wider">Fourchette Basse</p>
                                                <div className="flex items-baseline justify-end gap-1 whitespace-nowrap">
                                                    <span className={`font-black text-zinc-800 tracking-tighter pdf-display ${getPriceSizeClass(data.lowPrice)}`}>{formatPrice(data.lowPrice)}</span>
                                                    <span className="text-xl font-black text-zinc-700">€</span>
                                                </div>
                                                <div className="mt-2.5 flex justify-end">
                                                    <span className="text-[10px] text-zinc-500 font-semibold font-mono bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">{Math.round(data.lowPrice / (data.surface || 1))} €/m²</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center shrink-0 px-1">
                                                <div className="w-[1.5px] flex-1 rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${COLORS.secondary}, transparent)` }}></div>
                                            </div>
                                            <div className="text-left flex-1 pl-5">
                                                <p className="text-zinc-400 text-[9px] font-bold uppercase mb-2 tracking-wider">Fourchette Haute</p>
                                                <div className="flex items-baseline justify-start gap-1 whitespace-nowrap">
                                                    <span className={`font-black tracking-tighter pdf-display ${getPriceSizeClass(data.highPrice)}`} style={{ color: COLORS.secondary }}>{formatPrice(data.highPrice)}</span>
                                                    <span className="text-xl font-black" style={{ color: COLORS.secondary }}>€</span>
                                                </div>
                                                <div className="mt-2.5">
                                                    <span className="text-[10px] text-zinc-500 font-semibold font-mono bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">{Math.round(data.highPrice / (data.surface || 1))} €/m²</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* SIGNATURE DANS LA CARTE "NON LOUÉ" */}
                                    {renderSignature()}
                                </div>
                            )}

                            {data.hasRentalEstimation && data.monthlyRent > 0 && (
                                <div className="premium-card bg-white rounded-[16px] shadow-sm border border-zinc-200 grid grid-cols-3 relative overflow-hidden shrink-0" style={{ height: '76px' }}>
                                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${COLORS.gold}, #e8b86d)` }}></div>
                                    <div className="flex flex-col justify-center items-center border-r border-zinc-100">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Valeur Locative</p>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-xl font-black text-zinc-800 pdf-display">{formatPrice(data.monthlyRent)}</span>
                                            <span className="text-sm font-bold text-zinc-500">€</span>
                                        </div>
                                        <p className="text-[8px] text-zinc-400 mt-0.5 font-mono">HC / mois</p>
                                    </div>
                                    <div className="flex flex-col justify-center items-center border-r border-zinc-100">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Rentabilité brute</p>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-xl font-black pdf-display" style={{ color: COLORS.gold }}>
                                                {((data.monthlyRent * 12) / (((data.lowPrice + data.highPrice) / 2) || 1) * 100).toFixed(1)}
                                            </span>
                                            <span className="text-base font-bold" style={{ color: COLORS.gold }}>%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center items-center">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Loyer / m²</p>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-xl font-black text-zinc-800 pdf-display">{Math.round(data.monthlyRent / (data.surface || 1))}</span>
                                            <span className="text-sm font-bold text-zinc-500">€/m²</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-200 shrink-0">
                        <p className="text-[6.5px] leading-relaxed text-zinc-400 text-justify" style={{ lineHeight: '1.6' }}>
                            Sous réserve que l'étude des diagnostics techniques et du carnet numérique du logement ne révèlent pas d'anomalie ni de non-conformité affectant sa valeur. Document à usage strictement privé. Conformément à la réglementation, le professionnel de l'immobilier n'est en aucun cas qualifié pour déterminer la surface du bien de manière réglementaire. La surface indiquée a été communiquée par le propriétaire, lue sur le titre de propriété ou lue sur l'avis de taxe foncière. Pour toute commercialisation de ce bien, le mandant fera appel à un diagnostiqueur professionnel dont la loi impose la qualification pour attester de la surface Carrez s'il s'agit d'un bien en copropriété ou de la surface de plancher pour les maisons de ville ou pavillons. Le professionnel de l'immobilier, rédacteur du présent avis de valeur n'assume aucune responsabilité sur la surface qui serait attestée par le diagnostiqueur et qui servirait de base juridique dans l'avant-contrat et l'acte définitif, et à toutes les conséquences qui y seraient liées. De même le présent document ne vaut ni n'engage la responsabilité du professionnel de l'immobilier quant à la conformité de l'état du bâti face aux divers diagnostics (Amiante, Plomb, Gaz, Électricité, Assainissement, Termites, Mérules).
                        </p>
                    </div>
                </div>

                {(data.extraPhotos ?? []).length > 0 && (
                    <div className="print-page page-watermark w-[297mm] h-[210mm] mx-auto bg-[#f5f5f7] p-9 flex flex-col mb-8 shadow-2xl relative">
                        <div className="flex justify-between items-center mb-5 pb-3.5 border-b border-zinc-200 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                    <span className="text-white text-[9px] font-black">04</span>
                                </div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] pdf-font" style={{ color: COLORS.primary }}>Dossier Photographique</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src="/logo-patrim.png" alt="PATRIM" className="h-6 object-contain opacity-60"/>
                                <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">
                                    {(data.soldComparables.length > 0 || data.forSaleComparables.length > 0) ? '5 / 5' : '4 / 4'}
                                </span>
                            </div>
                        </div>
                        <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 mb-4 shrink-0">
                            {data.propertyAddress} — {(data.extraPhotos ?? []).length} vue{(data.extraPhotos ?? []).length > 1 ? 's' : ''}
                        </p>
                        <div className="flex-1 min-h-0">
                            {(() => {
                                const photos = data.extraPhotos ?? [];
                                const count = photos.length;
                                const gridClass = count <= 2 ? 'grid-cols-2' : count <= 4 ? 'grid-cols-2' : count <= 6 ? 'grid-cols-3' : 'grid-cols-4';
                                const rowClass = count <= 2 ? 'grid-rows-1' : 'grid-rows-2';
                                return (
                                    <div className={`grid ${gridClass} ${rowClass} gap-3 h-full`}>
                                        {photos.map((url, i) => (
                                            <div key={i} className="rounded-[16px] overflow-hidden shadow-sm border border-zinc-200 relative">
                                                <img src={url} className="w-full h-full object-cover"/>
                                                <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                                                    <span className="text-white text-[9px] font-bold">{i + 1}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}