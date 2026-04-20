"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    QrCode, Image as ImageIcon, Calculator, UploadCloud, 
    X, Plus, Loader2, Download, ArrowLeft, Banknote, Home, Layers, Globe, Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
};

export default function GenerateurQR() {
    const [loading, setLoading] = useState(false);
    const [generatedId, setGeneratedId] = useState<string | null>(null);
    const [domain, setDomain] = useState("");
    const [uploadingPhotos, setUploadingPhotos] = useState(false);

    // --- MODULE D'IMPORTATION WEB ---
    const [listingUrl, setListingUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);

    // --- FORMULAIRE EXPRESS ---
    const [address, setAddress] = useState("");
    const [propertyType, setPropertyType] = useState("Appartement");
    const [rooms, setRooms] = useState<number | "">("");
    const [surface, setSurface] = useState<number | "">("");
    
    const [priceFAI, setPriceFAI] = useState<number | "">("");
    const [taxeFonciere, setTaxeFonciere] = useState<number | "">("");
    const [coproFees, setCoproFees] = useState<number | "">("");
    const [monthlyRent, setMonthlyRent] = useState<number | "">("");

    const [mainPhoto, setMainPhoto] = useState<string>("");
    const [extraPhotos, setExtraPhotos] = useState<string[]>([]);

    useEffect(() => {
        if (typeof window !== "undefined") setDomain(window.location.origin);
    }, []);
// --- FONCTION D'IMPORTATION WEB ---
    const handleImportFromUrl = async () => {
        if (!listingUrl) return alert("Veuillez coller un lien valide.");
        setIsScraping(true);
        
        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: listingUrl })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 1. Remplissage du Titre/Adresse
                if (data.title) setAddress(data.title);
                
                // 2. Remplissage du Prix (Maintenant qu'il est bien nettoyé)
                if (data.price) setPriceFAI(data.price);
                
                // 3. Remplissage de TOUTES les photos
                if (data.photos && data.photos.length > 0) {
                    // La première photo va dans "Photo Principale"
                    setMainPhoto(data.photos[0]);
                    
                    // Les suivantes (jusqu'à 8 max) vont dans la galerie complémentaire
                    if (data.photos.length > 1) {
                        setExtraPhotos(data.photos.slice(1, 9));
                    }
                }
                
                alert(`Importation réussie ! \n\nPrix trouvé : ${data.price ? data.price + ' €' : 'Non trouvé'}\nPhotos trouvées : ${data.photos?.length || 0}\n\nVérifiez les données et ajoutez la surface et les pièces.`);
            } else {
                alert("Erreur: " + data.error);
            }
        } catch (error) {
            alert("Erreur de connexion. Le site de votre agence bloque peut-être la lecture automatique.");
        }

        setIsScraping(false);
    };

    // --- UPLOAD PHOTOS ---
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

    const uploadToStorage = async (file: File): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const compressed = await compressImage(file);
        const path = `${user.id}/qr-express/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error } = await supabase.storage.from('estimation-photos').upload(path, compressed, { contentType: 'image/jpeg' });
        if (error) return null;
        const { data: urlData } = supabase.storage.from('estimation-photos').getPublicUrl(path);
        return urlData.publicUrl;
    };

    const handleMainPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhotos(true);
        const url = await uploadToStorage(file);
        if (url) setMainPhoto(url);
        setUploadingPhotos(false);
    };

    const handleExtraPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploadingPhotos(true);
        const urls = await Promise.all(files.map(f => uploadToStorage(f)));
        const validUrls = urls.filter(Boolean) as string[];
        setExtraPhotos(prev => [...prev, ...validUrls]);
        setUploadingPhotos(false);
    };

    // --- GÉNÉRATION ---
    const handleGenerate = async () => {
        if (!priceFAI || !address) return alert("Veuillez renseigner au moins l'adresse et le prix.");
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payloadJson = {
            clientName: "Génération Express QR",
            propertyAddress: address,
            propertyType,
            rooms: Number(rooms),
            surface: Number(surface),
            highPrice: Number(priceFAI),
            commercialSettings: { sellingPriceFAI: Number(priceFAI) },
            taxeFonciere: Number(taxeFonciere),
            coproFees: Number(coproFees),
            monthlyRent: Number(monthlyRent),
            isCopropriete: Number(coproFees) > 0,
            dpe: "C", ges: "A",
            mainPhoto, extraPhotos,
        };

        const payload = { user_id: user.id, client_name: "QR Code Express", address: address, data_json: payloadJson };
        const { data, error } = await supabase.from('estimations').insert(payload).select('id').single();
        
        if (data) setGeneratedId(data.id);
        else alert("Erreur lors de la génération.");
        
        setLoading(false);
    };

    // --- FONCTION CŒUR : DESSINER UNE CARTE SUR UN CANVAS ---
    const drawCardOnContext = async (
        ctx: CanvasRenderingContext2D, 
        xOffset: number, 
        yOffset: number, 
        type: "SIMULATION" | "GALERIE",
        qrUrl: string
    ) => {
        const cardWidth = 1000;
        const cardHeight = 450;
        const isSimu = type === "SIMULATION";
        const mainColor = isSimu ? COLORS.primary : COLORS.secondary;
        const titleL1 = isSimu ? "SIMULATEUR" : "GALERIE";
        const titleL2 = isSimu ? "DE PRÊT" : "PHOTOS";
        const subL1 = isSimu ? "SIMULEZ VOTRE CRÉDIT ET" : "FLASHEZ POUR VISITER LE";
        const subL2 = isSimu ? "CALCULEZ VOTRE RENTABILITÉ" : "BIEN AVEC NOS PHOTOS";

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(xOffset, yOffset, cardWidth, cardHeight);
        ctx.fillStyle = mainColor;
        ctx.fillRect(xOffset, yOffset, cardWidth, 30);
        ctx.textAlign = "left";
        ctx.fillStyle = "#111111";
        ctx.font = "900 70px Arial, sans-serif";
        ctx.fillText(titleL1, xOffset + 420, yOffset + 160);
        ctx.fillText(titleL2, xOffset + 420, yOffset + 240);
        ctx.fillStyle = mainColor;
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.fillText(subL1, xOffset + 425, yOffset + 330);
        ctx.fillText(subL2, xOffset + 425, yOffset + 375);

        if (address) {
            ctx.textAlign = "right";
            ctx.fillStyle = "#888888";
            ctx.font = "italic 16px Arial, sans-serif";
            ctx.fillText(address, xOffset + 970, yOffset + 430);
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&margin=0`;

        return new Promise<void>((resolve, reject) => {
            img.onload = () => {
                ctx.drawImage(img, xOffset + 70, yOffset + 70, 310, 310);
                resolve();
            };
            img.onerror = reject;
        });
    };

    const downloadSingleQR = async (qrDataUrl: string, type: "SIMULATION" | "GALERIE") => {
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 450;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await drawCardOnContext(ctx, 0, 0, type, qrDataUrl);
        const link = document.createElement("a");
        link.download = `Patrim_QR_Express_${type}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const downloadCombinedQR = async () => {
        if (!generatedId) return;
        const simuUrl = `${domain}/simulation/${generatedId}`;
        const galerieUrl = `${domain}/galerie/${generatedId}`;
        const spacer = 50;
        const canvas = document.createElement("canvas");
        canvas.width = 1000 + spacer + 1000;
        canvas.height = 450;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#f4f4f5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await drawCardOnContext(ctx, 0, 0, "SIMULATION", simuUrl);
        await drawCardOnContext(ctx, 1000 + spacer, 0, "GALERIE", galerieUrl);

        const link = document.createElement("a");
        link.download = `Patrim_QR_Express_COMBINE.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white font-sans pb-32">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700;900&display=swap');
                .font-serif { font-family: 'Playfair Display', serif; }
            `}</style>

            {/* Header */}
            <div className="border-b border-white/10 bg-[#111114] sticky top-0 z-50 relative">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-zinc-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><ArrowLeft size={20}/></Link>
                        <div>
                            <h1 className="text-xl font-bold font-serif flex items-center gap-2"><QrCode size={20} className="text-[#d35f52]"/> Générateur de QR Codes Express</h1>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Pour mandats sans estimation</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 mt-10">
                {!generatedId ? (
                    <div className="animate-in fade-in duration-300 space-y-10">
                        
                        {/* MODULE D'IMPORTATION WEB (LeBonCoin / SeLoger) */}
                        <div className="bg-gradient-to-r from-[#111114] to-[#1a1a1f] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/5 shrink-0 border border-white/10">
                                <Globe className="text-[#d35f52]" size={24}/>
                            </div>
                            <div className="flex-1 w-full">
                                <h2 className="text-sm font-bold text-white mb-1">Importation Magique (Lien Web)</h2>
                                <p className="text-xs text-zinc-400 mb-3">Collez le lien d'une annonce SeLoger ou LeBonCoin pour pré-remplir ce formulaire et importer les photos.</p>
                                <div className="flex gap-3 w-full">
                                    <Input 
                                        value={listingUrl} 
                                        onChange={e => setListingUrl(e.target.value)} 
                                        placeholder="https://www.leboncoin.fr/ad/ventes_immobilieres/..." 
                                        className="flex-1 bg-black/50 border-white/20 h-12 text-sm text-white focus:border-[#d35f52]"
                                    />
                                    <Button 
                                        onClick={handleImportFromUrl} 
                                        disabled={isScraping}
                                        className="h-12 px-6 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-colors"
                                    >
                                        {isScraping ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} className="mr-2" />}
                                        {isScraping ? "Aspiration..." : "Importer"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* FORMULAIRE DE SAISIE MANUELLE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><Home size={16}/> Le Bien</h2>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Adresse ou Quartier (Apparaîtra sur l'image)</label>
                                        <Input value={address} onChange={e=>setAddress(e.target.value)} className="bg-black border-white/10 h-12 text-sm focus:border-[#d35f52]" placeholder="Ex: Jean-Jaurès, Toulouse"/>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Type</label>
                                            <select value={propertyType} onChange={e=>setPropertyType(e.target.value)} className="w-full bg-black border border-white/10 h-12 rounded-xl px-3 text-sm focus:border-[#d35f52] outline-none text-white">
                                                <option>Appartement</option><option>Maison</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Pièces</label>
                                            <Input type="number" value={rooms} onChange={e=>setRooms(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Surface (m²)</label>
                                            <Input type="number" value={surface} onChange={e=>setSurface(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><Banknote size={16}/> Données Financières</h2>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Prix Affiché FAI (€) *</label>
                                        <Input type="number" value={priceFAI} onChange={e=>setPriceFAI(Number(e.target.value))} className="bg-black border-white/10 h-14 text-xl font-black text-white focus:border-[#d35f52]"/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Taxe Foncière (€/an)</label>
                                            <Input type="number" value={taxeFonciere} onChange={e=>setTaxeFonciere(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Copropriété (€/mois)</label>
                                            <Input type="number" value={coproFees} onChange={e=>setCoproFees(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-[#c9a84c] mb-1 block">Loyer Mensuel Estimé (€) — Pour la renta</label>
                                            <Input type="number" value={monthlyRent} onChange={e=>setMonthlyRent(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm focus:border-[#c9a84c]"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><ImageIcon size={16}/> Médias</h2>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Photo Principale</label>
                                        <div className="relative h-40 border-2 border-dashed border-white/10 rounded-2xl bg-black flex items-center justify-center overflow-hidden hover:border-[#d35f52]/50 transition-colors">
                                            {mainPhoto ? <img src={mainPhoto} className="w-full h-full object-cover"/> : <div className="text-center text-zinc-600"><UploadCloud size={24} className="mx-auto mb-2"/><span>Cliquer pour ajouter</span></div>}
                                            <input type="file" accept="image/*" onChange={handleMainPhoto} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex justify-between">
                                            <span>Photos complémentaires ({extraPhotos.length})</span>
                                            {uploadingPhotos && <Loader2 size={12} className="animate-spin"/>}
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {extraPhotos.map((url, i) => (
                                                <div key={i} className="aspect-square rounded-xl overflow-hidden relative">
                                                    <img src={url} className="w-full h-full object-cover"/>
                                                    <button onClick={() => setExtraPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:text-rose-400"><X size={12}/></button>
                                                </div>
                                            ))}
                                            <div className="aspect-square border border-dashed border-white/20 rounded-xl flex items-center justify-center relative hover:bg-white/5 cursor-pointer">
                                                <Plus className="text-zinc-500" size={20}/>
                                                <input type="file" accept="image/*" multiple onChange={handleExtraPhotos} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleGenerate} disabled={loading || uploadingPhotos} className="w-full h-14 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#8a0e01] to-[#d35f52] shadow-xl hover:scale-[1.02] transition-transform">
                                    {loading ? <Loader2 className="animate-spin mr-2"/> : <QrCode className="mr-2"/>}
                                    Générer les Cartes QR Marketing
                                </Button>
                            </div>
                        </div>
                    </div>

                ) : (

                    /* RÉSULTAT ET TÉLÉCHARGEMENT */
                    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-12">
                        <div className="text-center">
                            <h2 className="text-3xl font-serif font-bold">Vos cartes marketing sont prêtes !</h2>
                            <p className="text-zinc-400 mt-2">Cliquez sur les boutons pour télécharger les PNG haute définition.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* PREVIEW SIMULATION */}
                            <div className="flex flex-col gap-3">
                                <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex border border-zinc-200 relative h-[180px]">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-[#8a0e01]"></div>
                                    <div className="w-[42%] flex items-center justify-center p-4 pt-6">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${domain}/simulation/${generatedId}`)}&margin=0`} className="w-full h-auto object-contain"/>
                                    </div>
                                    <div className="w-[58%] flex flex-col justify-center pr-5 pt-2 relative">
                                        <h3 className="text-2xl font-black text-zinc-900 leading-tight mb-2">SIMULATEUR<br/>DE PRÊT</h3>
                                        <p className="text-[10px] font-bold text-[#8a0e01] uppercase tracking-wide leading-snug">SIMULEZ VOTRE CRÉDIT ET<br/>CALCULEZ VOTRE RENTABILITÉ</p>
                                        {address && <span className="absolute bottom-2 right-4 text-[9px] italic text-zinc-400 font-medium">{address}</span>}
                                    </div>
                                </div>
                                <Button onClick={() => downloadSingleQR(`${domain}/simulation/${generatedId}`, "SIMULATION")} className="w-full h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs">
                                    <Download size={16} className="mr-2"/> Télécharger Carte Simulation Seule
                                </Button>
                            </div>

                            {/* PREVIEW GALERIE */}
                            <div className="flex flex-col gap-3">
                                <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex border border-zinc-200 relative h-[180px]">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-[#d35f52]"></div>
                                    <div className="w-[42%] flex items-center justify-center p-4 pt-6">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${domain}/galerie/${generatedId}`)}&margin=0`} className="w-full h-auto object-contain"/>
                                    </div>
                                    <div className="w-[58%] flex flex-col justify-center pr-5 pt-2 relative">
                                        <h3 className="text-2xl font-black text-zinc-900 leading-tight mb-2">GALERIE<br/>PHOTOS</h3>
                                        <p className="text-[10px] font-bold text-[#d35f52] uppercase tracking-wide leading-snug">FLASHEZ POUR VISITER LE<br/>BIEN AVEC NOS PHOTOS</p>
                                        {address && <span className="absolute bottom-2 right-4 text-[9px] italic text-zinc-400 font-medium">{address}</span>}
                                    </div>
                                </div>
                                <Button onClick={() => downloadSingleQR(`${domain}/galerie/${generatedId}`, "GALERIE")} className="w-full h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs">
                                    <Download size={16} className="mr-2"/> Télécharger Carte Galerie Seule
                                </Button>
                            </div>
                        </div>

                        <div className="bg-[#111114] p-8 rounded-[32px] border border-white/5 text-center shadow-2xl">
                            <h3 className="text-xl font-bold font-serif mb-2">Le Pack Marketing Complet</h3>
                            <p className="text-zinc-400 mb-6 max-w-xl mx-auto text-sm">Téléchargez une seule image large réunissant les deux cartes Patrim côte à côte. C'est le format idéal pour insérer en fin de carrousel photo sur les portails immobiliers (LeBonCoin, SeLoger).</p>
                            
                            <Button onClick={downloadCombinedQR} size="lg" className="rounded-full px-10 h-14 font-bold text-lg bg-gradient-to-r from-[#8a0e01] to-[#d35f52] shadow-xl hover:scale-105 transition-transform">
                                <Layers className="mr-2"/> Télécharger l'Image Combinée (2-en-1)
                            </Button>
                        </div>

                        <div className="mt-12 text-center pb-10">
                            <Button variant="outline" onClick={() => {setGeneratedId(null); setAddress(""); setPriceFAI(""); setMainPhoto(""); setExtraPhotos([]);}} className="rounded-full border-white/20 text-white hover:bg-white/10">
                                Créer de nouveaux QR Codes Express
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}