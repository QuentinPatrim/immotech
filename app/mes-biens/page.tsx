"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import {
    Search, Calculator, Camera, Copy, Check, MessageCircle, Mail, ImageIcon,
    MoreVertical, ExternalLink, Home, MapPin, LayoutGrid, List, Sparkles, X,
    QrCode, Download, Layers, PlusCircle, Edit3, Trash2, Instagram // <-- AJOUT DE TRASH2 ICI
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
    gray: "#393939",
    wealth: "#059669",
    wealthLight: "#10b981",
};

type Estimation = {
    id: string;
    createdAt?: string;
    data: {
        clientName?: string;
        mainPhoto?: string;
        propertyAddress?: string;
        propertyType?: string;
        rooms?: number;
        highPrice?: number;
        monthlyRent?: number;
    };
};

export default function MesBiens() {
    const [estimations, setEstimations] = useState<Estimation[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [qrModalEstimation, setQrModalEstimation] = useState<Estimation | null>(null);

    const [baseUrl, setBaseUrl] = useState<string>("");
    useEffect(() => {
        if (typeof window !== "undefined") setBaseUrl(window.location.origin);
    }, []);

    useEffect(() => {
        const fetchEstimations = async () => {
            const { data, error } = await supabase
                .from('estimations')
                .select('id, created_at, client_name, data_json')
                .order('created_at', { ascending: false })
                .limit(40); 

            if (data && !error) {
                const normalized: Estimation[] = data.map((row: any) => ({
                    id: row.id,
                    createdAt: row.created_at,
                    data: {
                        ...row.data_json,
                        clientName: row.client_name 
                    },
                }));
                setEstimations(normalized);
            }
            setLoading(false);
        };
        fetchEstimations();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
            return () => window.removeEventListener('click', handleClickOutside);
        }
    }, [openMenuId]);

    const filteredEstimations = useMemo(() => {
        if (!search.trim()) return estimations;
        const q = search.toLowerCase().trim();
        return estimations.filter(e => {
            const addr = (e.data.propertyAddress || "").toLowerCase();
            const type = (e.data.propertyType || "").toLowerCase();
            const priceStr = String(e.data.highPrice || "");
            return addr.includes(q) || type.includes(q) || priceStr.includes(q);
        });
    }, [estimations, search]);

    const buildSimulationUrl = (e: Estimation) => `${baseUrl}/simulation/${e.id}${e.data.highPrice ? `?price=${e.data.highPrice}` : ""}`;
    const buildGalleryUrl = (e: Estimation) => `${baseUrl}/galerie/${e.id}`;

    const copyToClipboard = async (url: string, id: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = url; document.body.appendChild(textarea);
            textarea.select(); try { document.execCommand('copy'); } catch {}
            document.body.removeChild(textarea);
            setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const sendBySMS = (e: Estimation) => {
        const label = `${e.data.propertyType || "Bien"}${e.data.rooms ? ` T${e.data.rooms}` : ""}${e.data.propertyAddress ? ` (${e.data.propertyAddress})` : ""}`;
        const body = `Bonjour,\n\nVoici les informations sur ce ${label} :\n\n📸 Photos : ${buildGalleryUrl(e)}\n💰 Simulateur financier : ${buildSimulationUrl(e)}\n\nÀ votre disposition,\nPatrim`;
        window.location.href = `sms:?body=${encodeURIComponent(body)}`;
    };

    const sendByEmail = (e: Estimation) => {
        const label = `${e.data.propertyType || "Bien"}${e.data.rooms ? ` T${e.data.rooms}` : ""}`;
        const subject = `${label}${e.data.propertyAddress ? ` - ${e.data.propertyAddress}` : ""}`;
        const body = `Bonjour,\n\nSuite à notre échange, je vous transmets les informations sur ce ${label} :\n\nGalerie photo : ${buildGalleryUrl(e)}\nSimulateur financier : ${buildSimulationUrl(e)}\n\nJe reste à votre disposition pour toute question.\n\nCordialement,\nPatrim`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    // --- NOUVEAU : FONCTION DE SUPPRESSION ---
    const handleDelete = async (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible et supprimera l'accès au simulateur et à la galerie pour vos clients.")) {
            // Suppression en base de données
            const { error } = await supabase.from('estimations').delete().eq('id', id);
            
            if (!error) {
                // Mise à jour de l'affichage (on retire l'élément de la liste)
                setEstimations(prev => prev.filter(e => e.id !== id));
            } else {
                alert("Erreur lors de la suppression du bien.");
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <img src="/logo-patrim.png" className="h-12 object-contain animate-pulse" alt="Patrim"/>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-bold">Chargement de vos biens…</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#faf8f6] text-zinc-900 font-sans pb-20 selection:bg-[#d35f52]/30 relative overflow-x-hidden">
            <div className="pointer-events-none fixed top-0 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: `radial-gradient(circle, ${COLORS.secondary} 0%, transparent 70%)` }}/>
            <div className="pointer-events-none fixed top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15" style={{ background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)` }}/>

            <div className="max-w-6xl mx-auto px-5 md:px-8 pt-10 pb-6 relative z-10">

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
                    <div>
                        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xl p-3 pr-5 rounded-2xl border border-white shadow-sm inline-flex mb-4">
                            <img src="/logo-patrim.png" className="h-8 object-contain" alt="Patrim"/>
                            <div className="h-6 w-px bg-zinc-300"/>
                            <div className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                                <span className="text-[10px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Dashboard</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <h1 className="font-serif text-5xl md:text-6xl font-bold text-zinc-900 tracking-tight">{estimations.length}</h1>
                            <span className="text-base text-zinc-500 font-semibold">{estimations.length > 1 ? "biens en portefeuille" : "bien en portefeuille"}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link href="/estimation?new=true" className="flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-r from-[#8a0e01] to-[#d35f52] text-white font-bold shadow-lg hover:scale-105 transition-transform">
                            <Sparkles size={18} /> Nouvelle Estimation
                        </Link>
                        <Link href="/generateur-qr" className="flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-white text-[#8a0e01] border border-white/50 font-bold shadow-md hover:bg-zinc-50 transition-colors">
                            <QrCode size={18} /> QR Code Express
                        </Link>
                    </div>
                </div>

                <div className="mb-8 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"><Search size={16} className="text-zinc-400"/></div>
                    <Input type="text" value={search} onChange={e => setSearch(e.target.value)} className="bg-white/80 backdrop-blur-xl border-white h-14 pl-12 pr-12 text-base rounded-2xl shadow-[0_10px_30px_-10px_rgba(138,14,1,0.1)] focus:ring-2 focus:ring-[#d35f52]/20 transition-all font-semibold" placeholder="Rechercher par adresse, type ou prix…"/>
                    {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"><X size={18}/></button>}
                </div>

                {filteredEstimations.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-xl p-12 rounded-[32px] border border-white text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}20)` }}><Home size={28} style={{ color: COLORS.primary }}/></div>
                        <p className="text-sm font-black uppercase tracking-widest mb-2 text-zinc-700">{search ? "Aucun bien trouvé" : "Aucun bien pour l'instant"}</p>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto">Commencez par créer une nouvelle estimation ou générer un QR Code Express pour voir vos biens apparaître ici.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredEstimations.map(e => (
                            <EstimationRow 
                                key={e.id} 
                                estimation={e} 
                                simulationUrl={buildSimulationUrl(e)} 
                                galleryUrl={buildGalleryUrl(e)} 
                                copiedId={copiedId} 
                                openMenuId={openMenuId} 
                                setOpenMenuId={setOpenMenuId} 
                                onCopy={copyToClipboard} 
                                onSMS={() => sendBySMS(e)} 
                                onEmail={() => sendByEmail(e)} 
                                onOpenQrModal={() => setQrModalEstimation(e)} 
                                onDelete={handleDelete} // <-- On passe la fonction au composant
                            />
                        ))}
                    </div>
                )}

                <div className="text-center mt-12">
                    <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500">Tableau de bord · Patrim Agent</p>
                    </div>
                </div>
            </div>

            {qrModalEstimation && <QrModal estimation={qrModalEstimation} baseUrl={baseUrl} onClose={() => setQrModalEstimation(null)} />}
        </div>
    );
}

function EstimationRow({ estimation, simulationUrl, galleryUrl, copiedId, openMenuId, setOpenMenuId, onCopy, onSMS, onEmail, onOpenQrModal, onDelete }: any) {
    const e = estimation;
    const simCopyId = `sim-${e.id}`;
    const galCopyId = `gal-${e.id}`;
    const menuOpen = openMenuId === e.id;
    const propertyLabel = `${e.data.propertyType || "Bien"}${e.data.rooms ? ` T${e.data.rooms}` : ""}`;

    return (
        <div className={`bg-white/80 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_15px_40px_-15px_rgba(138,14,1,0.15)] hover:shadow-[0_20px_50px_-15px_rgba(138,14,1,0.25)] transition-all duration-300 relative ${menuOpen ? 'z-50' : 'z-10'}`}>
            <div className="flex flex-col md:flex-row md:items-stretch">

                <div className="relative w-full md:w-36 h-40 md:h-auto flex-shrink-0 overflow-hidden md:rounded-l-3xl md:rounded-tr-none rounded-t-3xl md:rounded-t-none bg-zinc-100">
                    {e.data.mainPhoto ? <img src={e.data.mainPhoto} className="w-full h-full object-cover" alt={propertyLabel} /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-zinc-300"/></div>}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-white shadow-md">
                        <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: COLORS.primary }}>{propertyLabel}</span>
                    </div>
                </div>

                <div className="flex-1 px-5 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        {e.data.propertyAddress && (
                            <div className="flex items-start gap-2 mb-2">
                                <MapPin size={14} className="text-zinc-400 mt-0.5 flex-shrink-0"/>
                                <p className="text-sm font-bold text-zinc-800 leading-tight truncate">{e.data.propertyAddress}</p>
                            </div>
                        )}
                        <div className="flex items-baseline gap-3 flex-wrap">
                            <p className="text-2xl font-black tracking-tight" style={{ color: COLORS.primary }}>
                                {formatPrice(Math.round(e.data.highPrice || 0))} <span className="text-sm ml-1 opacity-70">€</span>
                            </p>
                            {e.data.monthlyRent && e.data.monthlyRent > 0 && (
                                <span className="text-xs text-zinc-500 font-semibold">Loyer est. : <span className="font-black text-emerald-700">{formatPrice(e.data.monthlyRent)} €/m</span></span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <ActionButton icon={copiedId === simCopyId ? <Check size={13}/> : <Calculator size={13}/>} label={copiedId === simCopyId ? "Copié !" : "Simulateur"} onClick={(event: { stopPropagation: () => void; }) => { event.stopPropagation(); onCopy(simulationUrl, simCopyId); }} variant={copiedId === simCopyId ? "success" : "primary"} title="Copier le lien du simulateur"/>
                        <ActionButton icon={copiedId === galCopyId ? <Check size={13}/> : <Camera size={13}/>} label={copiedId === galCopyId ? "Copié !" : "Galerie"} onClick={(event: { stopPropagation: () => void; }) => { event.stopPropagation(); onCopy(galleryUrl, galCopyId); }} variant={copiedId === galCopyId ? "success" : "secondary"} title="Copier le lien de la galerie"/>

                        <div className="relative">
                            <button onClick={(event) => { event.stopPropagation(); setOpenMenuId(menuOpen ? null : e.id); }} className={`h-9 w-9 flex items-center justify-center rounded-xl transition-colors ${menuOpen ? 'bg-zinc-800 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}>
                                {menuOpen ? <X size={15}/> : <MoreVertical size={15}/>}
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl border border-zinc-200 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] overflow-hidden z-[100] animate-in slide-in-from-top-2 fade-in duration-200" onClick={(event) => event.stopPropagation()}>
                                    <Link 
    href={`/social?id=${e.id}`} 
    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fuchsia-50 transition-colors text-left border-b border-zinc-100"
>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-fuchsia-100">
        <Instagram size={14} className="text-fuchsia-700"/>
    </div>
    <div className="flex-1">
        <p className="text-xs font-black text-fuchsia-900">Post Réseaux Sociaux</p>
        <p className="text-[10px] text-fuchsia-600">Visuels & Texte IA</p>
    </div>
</Link>
                                    
                                    <Link 
                                        href={e.data.clientName === "QR Code Express" || e.data.clientName === "Génération Express QR" ? `/generateur-qr?id=${e.id}` : `/estimation`} 
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-zinc-100"
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                                            <Edit3 size={14} className="text-blue-700"/>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-blue-900">Éditer les données</p>
                                            <p className="text-[10px] text-blue-600">Modifier prix, photos...</p>
                                        </div>
                                    </Link>

                                    <button onClick={() => { onOpenQrModal(); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors text-left border-b border-zinc-100">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-100"><QrCode size={14} className="text-rose-700"/></div>
                                        <div className="flex-1"><p className="text-xs font-black text-[#8a0e01]">Cartes QR Codes</p><p className="text-[10px] text-[#d35f52]">Générer les visuels</p></div>
                                    </button>
                                    <button onClick={() => { onSMS(); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100"><MessageCircle size={14} className="text-emerald-700"/></div>
                                        <div className="flex-1"><p className="text-xs font-black text-zinc-800">Envoyer par SMS</p><p className="text-[10px] text-zinc-500">Les deux liens</p></div>
                                    </button>
                                    <button onClick={() => { onEmail(); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left border-t border-zinc-100">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.secondary}15` }}><Mail size={14} style={{ color: COLORS.primary }}/></div>
                                        <div className="flex-1"><p className="text-xs font-black text-zinc-800">Envoyer par email</p><p className="text-[10px] text-zinc-500">Message pré-rempli</p></div>
                                    </button>
                                    
                                    <div className="border-t border-zinc-100 bg-zinc-50/50">
                                        <Link href={simulationUrl} target="_blank" onClick={() => setOpenMenuId(null)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-100 transition-colors">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-zinc-200"><ExternalLink size={14} className="text-zinc-600"/></div>
                                            <div className="flex-1"><p className="text-xs font-black text-zinc-800">Simulateur</p><p className="text-[10px] text-zinc-500">Nouvel onglet</p></div>
                                        </Link>
                                        <Link href={galleryUrl} target="_blank" onClick={() => setOpenMenuId(null)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-100 transition-colors border-t border-zinc-100 border-b">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-zinc-200"><ExternalLink size={14} className="text-zinc-600"/></div>
                                            <div className="flex-1"><p className="text-xs font-black text-zinc-800">Galerie</p><p className="text-[10px] text-zinc-500">Nouvel onglet</p></div>
                                        </Link>

                                        {/* NOUVEAU BOUTON : SUPPRIMER LE BIEN */}
                                        <button onClick={() => { onDelete(e.id); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left bg-red-50/30">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100"><Trash2 size={14} className="text-red-600"/></div>
                                            <div className="flex-1"><p className="text-xs font-black text-red-600">Supprimer le bien</p><p className="text-[10px] text-red-400">Action irréversible</p></div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function QrModal({ estimation, baseUrl, onClose }: any) {
    const e = estimation;
    const simuUrl = `${baseUrl}/simulation/${e.id}${e.data.highPrice ? `?price=${e.data.highPrice}` : ''}`;
    const galerieUrl = `${baseUrl}/galerie/${e.id}`;
    const address = e.data.propertyAddress || "";

    const drawCardOnContext = async (ctx: CanvasRenderingContext2D, xOffset: number, yOffset: number, type: "SIMULATION" | "GALERIE", qrUrl: string) => {
        const cardWidth = 1000; const cardHeight = 450;
        const isSimu = type === "SIMULATION";
        const mainColor = isSimu ? COLORS.primary : COLORS.secondary;
        const titleL1 = isSimu ? "SIMULATEUR" : "GALERIE";
        const titleL2 = isSimu ? "DE PRÊT" : "PHOTOS";
        const subL1 = isSimu ? "SIMULEZ VOTRE CRÉDIT ET" : "FLASHEZ POUR VISITER LE";
        const subL2 = isSimu ? "CALCULEZ VOTRE RENTABILITÉ" : "BIEN AVEC NOS PHOTOS";

        ctx.fillStyle = "#ffffff"; ctx.fillRect(xOffset, yOffset, cardWidth, cardHeight);
        ctx.fillStyle = mainColor; ctx.fillRect(xOffset, yOffset, cardWidth, 30);
        ctx.textAlign = "left"; ctx.fillStyle = "#111111"; ctx.font = "900 70px Arial, sans-serif";
        ctx.fillText(titleL1, xOffset + 420, yOffset + 160); ctx.fillText(titleL2, xOffset + 420, yOffset + 240);
        ctx.fillStyle = mainColor; ctx.font = "bold 30px Arial, sans-serif";
        ctx.fillText(subL1, xOffset + 425, yOffset + 330); ctx.fillText(subL2, xOffset + 425, yOffset + 375);

        if (address) { ctx.textAlign = "right"; ctx.fillStyle = "#888888"; ctx.font = "italic 16px Arial, sans-serif"; ctx.fillText(address, xOffset + 970, yOffset + 430); }

        const img = new Image(); img.crossOrigin = "Anonymous";
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&margin=0`;

        return new Promise<void>((resolve, reject) => { img.onload = () => { ctx.drawImage(img, xOffset + 70, yOffset + 70, 310, 310); resolve(); }; img.onerror = reject; });
    };

    const downloadSingleQR = async (qrDataUrl: string, type: "SIMULATION" | "GALERIE") => {
        const canvas = document.createElement("canvas"); canvas.width = 1000; canvas.height = 450;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        await drawCardOnContext(ctx, 0, 0, type, qrDataUrl);
        const link = document.createElement("a"); link.download = `Patrim_QR_${type}.png`; link.href = canvas.toDataURL("image/png"); link.click();
    };

    const downloadCombinedQR = async () => {
        const canvas = document.createElement("canvas"); canvas.width = 2050; canvas.height = 450;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        ctx.fillStyle = "#f4f4f5"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await drawCardOnContext(ctx, 0, 0, "SIMULATION", simuUrl); await drawCardOnContext(ctx, 1050, 0, "GALERIE", galerieUrl);
        const link = document.createElement("a"); link.download = `Patrim_QR_COMBINE.png`; link.href = canvas.toDataURL("image/png"); link.click();
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#0a0a0c] text-white w-full max-w-5xl rounded-[32px] shadow-2xl border border-white/10 flex flex-col max-h-full overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#111114]">
                    <div><h2 className="text-xl font-serif font-bold flex items-center gap-2"><QrCode className="text-[#d35f52]"/> Cartes QR Marketing</h2><p className="text-xs text-zinc-400 mt-1">{address || "Pour ce bien"}</p></div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 md:p-10 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col gap-3">
                            <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex border border-zinc-200 relative h-[180px]">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-[#8a0e01]"></div>
                                <div className="w-[42%] flex items-center justify-center p-4 pt-6"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(simuUrl)}&margin=0`} className="w-full h-auto object-contain" alt="QR"/></div>
                                <div className="w-[58%] flex flex-col justify-center pr-5 pt-2 relative text-black">
                                    <h3 className="text-2xl font-black leading-tight mb-2">SIMULATEUR<br/>DE PRÊT</h3>
                                    <p className="text-[10px] font-bold text-[#8a0e01] uppercase tracking-wide leading-snug">SIMULEZ VOTRE CRÉDIT ET<br/>CALCULEZ VOTRE RENTABILITÉ</p>
                                    {address && <span className="absolute bottom-2 right-4 text-[9px] italic text-zinc-500 font-medium truncate max-w-[90%]">{address}</span>}
                                </div>
                            </div>
                            <Button onClick={() => downloadSingleQR(simuUrl, "SIMULATION")} className="w-full h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs border border-zinc-200"><Download size={16} className="mr-2"/> Télécharger Carte Simulation</Button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex border border-zinc-200 relative h-[180px]">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-[#d35f52]"></div>
                                <div className="w-[42%] flex items-center justify-center p-4 pt-6"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(galerieUrl)}&margin=0`} className="w-full h-auto object-contain" alt="QR"/></div>
                                <div className="w-[58%] flex flex-col justify-center pr-5 pt-2 relative text-black">
                                    <h3 className="text-2xl font-black leading-tight mb-2">GALERIE<br/>PHOTOS</h3>
                                    <p className="text-[10px] font-bold text-[#d35f52] uppercase tracking-wide leading-snug">FLASHEZ POUR VISITER LE<br/>BIEN AVEC NOS PHOTOS</p>
                                    {address && <span className="absolute bottom-2 right-4 text-[9px] italic text-zinc-500 font-medium truncate max-w-[90%]">{address}</span>}
                                </div>
                            </div>
                            <Button onClick={() => downloadSingleQR(galerieUrl, "GALERIE")} className="w-full h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs border border-zinc-200"><Download size={16} className="mr-2"/> Télécharger Carte Galerie</Button>
                        </div>
                    </div>
                    <div className="mt-10 bg-[#111114] p-8 rounded-[24px] border border-white/5 text-center shadow-lg">
                        <h3 className="text-xl font-bold font-serif mb-2">Le Pack Marketing Complet</h3>
                        <p className="text-zinc-400 mb-6 max-w-xl mx-auto text-sm">Une seule image large réunissant les deux cartes côte à côte. Le format idéal pour la fin d'un carrousel photo (LeBonCoin, SeLoger).</p>
                        <Button onClick={downloadCombinedQR} size="lg" className="rounded-full px-10 h-14 font-bold text-lg bg-gradient-to-r from-[#8a0e01] to-[#d35f52] shadow-xl hover:scale-105 transition-transform"><Layers className="mr-2"/> Télécharger l'Image Combinée (2-en-1)</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon, label, onClick, variant = "primary", title }: any) {
    const getStyle = () => {
        if (variant === "success") return { background: `linear-gradient(135deg, ${COLORS.wealth}, ${COLORS.wealthLight})`, color: "white", border: "transparent" };
        if (variant === "secondary") return { background: "white", color: COLORS.primary, border: `${COLORS.secondary}40` };
        return { background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, color: "white", border: "transparent" };
    };
    const s = getStyle();
    return (
        <button onClick={onClick} title={title} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 hover:shadow-md active:scale-100 border whitespace-nowrap" style={{ background: s.background, color: s.color, borderColor: s.border }}>
            {icon}{label}
        </button>
    );
}