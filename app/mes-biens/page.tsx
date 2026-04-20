"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import {
    Search, Calculator, Camera, Copy, Check, MessageCircle, Mail, ImageIcon,
    MoreVertical, ExternalLink, Home, MapPin, LayoutGrid, List, Sparkles, X
} from "lucide-react";
import { Input } from "@/components/ui/input";

/* ============================================================
   PATRIM · Charte couleurs
   ============================================================ */
const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
    gray: "#393939",
    wealth: "#059669",
    wealthLight: "#10b981",
};

/* ============================================================
   Type Estimation (normalisation des données Supabase)
   ============================================================ */
type Estimation = {
    id: string;
    createdAt?: string;
    data: {
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

    // Base URL absolue — construite côté client pour que les liens copiés soient complets
    const [baseUrl, setBaseUrl] = useState<string>("");
    useEffect(() => {
        if (typeof window !== "undefined") {
            setBaseUrl(window.location.origin);
        }
    }, []);

    useEffect(() => {
        const fetchEstimations = async () => {
            // ⚠️ Quand tu brancheras l'auth, ajoute ici .eq('user_id', currentUser.id)
            const { data, error } = await supabase
                .from('estimations')
                .select('id, created_at, data_json')
                .order('created_at', { ascending: false });

            if (data && !error) {
                const normalized: Estimation[] = data.map((row: any) => ({
                    id: row.id,
                    createdAt: row.created_at,
                    data: row.data_json || {},
                }));
                setEstimations(normalized);
            }
            setLoading(false);
        };
        fetchEstimations();
    }, []);

    // Fermer les menus popovers quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
            return () => window.removeEventListener('click', handleClickOutside);
        }
    }, [openMenuId]);

    // Filtrer les biens par recherche (adresse, type)
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

    // Actions de partage
    const buildSimulationUrl = (e: Estimation) => {
        const priceParam = e.data.highPrice ? `?price=${e.data.highPrice}` : "";
        return `${baseUrl}/simulation/${e.id}${priceParam}`;
    };

    const buildGalleryUrl = (e: Estimation) => `${baseUrl}/galerie/${e.id}`;

    const copyToClipboard = async (url: string, id: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Fallback pour navigateurs qui n'autorisent pas clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); } catch {}
            document.body.removeChild(textarea);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
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

    // ---------- RENDU ----------
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
            {/* Halos d'ambiance */}
            <div className="pointer-events-none fixed top-0 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: `radial-gradient(circle, ${COLORS.secondary} 0%, transparent 70%)` }}/>
            <div className="pointer-events-none fixed top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15" style={{ background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)` }}/>

            <div className="max-w-6xl mx-auto px-5 md:px-8 pt-10 pb-6 relative z-10">

                {/* ============================================================
                    HEADER — Logo + Titre + Compteur
                    ============================================================ */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xl p-3 pr-5 rounded-2xl border border-white shadow-lg">
                            <img src="/logo-patrim.png" className="h-8 object-contain" alt="Patrim"/>
                            <div className="h-6 w-px bg-zinc-300"/>
                            <div className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                                <span className="text-[10px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Mes Biens</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <h1 className="font-serif text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight">
                            {estimations.length}
                        </h1>
                        <span className="text-sm text-zinc-500 font-semibold">
                            {estimations.length > 1 ? "biens dans votre portefeuille" : "bien dans votre portefeuille"}
                        </span>
                    </div>
                </div>

                {/* ============================================================
                    BARRE DE RECHERCHE
                    ============================================================ */}
                <div className="mb-6 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Search size={16} className="text-zinc-400"/>
                    </div>
                    <Input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-white/80 backdrop-blur-xl border-white h-14 pl-12 pr-12 text-base rounded-2xl shadow-[0_10px_30px_-10px_rgba(138,14,1,0.1)] focus:ring-2 focus:ring-[#d35f52]/20 transition-all font-semibold"
                        placeholder="Rechercher par adresse, type ou prix…"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            <X size={18}/>
                        </button>
                    )}
                </div>

                {/* ============================================================
                    LISTE DES BIENS
                    ============================================================ */}
                {filteredEstimations.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-xl p-12 rounded-[32px] border border-white text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}20)` }}>
                            <Home size={28} style={{ color: COLORS.primary }}/>
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest mb-2 text-zinc-700">
                            {search ? "Aucun bien trouvé" : "Aucun bien pour l'instant"}
                        </p>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto">
                            {search
                                ? "Essayez un autre terme de recherche ou réinitialisez le filtre."
                                : "Vos estimations créées apparaîtront ici avec un accès rapide aux liens à partager."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
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
                            />
                        ))}
                    </div>
                )}

                {/* Footer discret */}
                <div className="text-center mt-12">
                    <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500">
                            Tableau de bord · Patrim Agent
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   COMPOSANT ESTIMATION ROW — Une ligne par bien
   Layout hybride : compact comme un tableau, visuel comme une carte.
   Responsive : se réorganise en carte empilée sur mobile.
   ============================================================ */
function EstimationRow({
    estimation, simulationUrl, galleryUrl, copiedId, openMenuId, setOpenMenuId, onCopy, onSMS, onEmail,
}: {
    estimation: Estimation;
    simulationUrl: string;
    galleryUrl: string;
    copiedId?: string | null;
    openMenuId?: string | null;
    setOpenMenuId: (id: string | null) => void;
    onCopy: (url: string, id: string) => void | Promise<void>;
    onSMS: () => void;
    onEmail: () => void;
}) {
    const e = estimation;
    const simCopyId = `sim-${e.id}`;
    const galCopyId = `gal-${e.id}`;
    const menuOpen = openMenuId === e.id;

    const propertyLabel = `${e.data.propertyType || "Bien"}${e.data.rooms ? ` T${e.data.rooms}` : ""}`;

    return (
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_15px_40px_-15px_rgba(138,14,1,0.15)] hover:shadow-[0_20px_50px_-15px_rgba(138,14,1,0.25)] transition-all duration-300 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-stretch">

                {/* ===== MINIATURE PHOTO ===== */}
                <div className="relative w-full md:w-36 h-40 md:h-auto flex-shrink-0 overflow-hidden md:rounded-l-3xl md:rounded-tr-none rounded-t-3xl md:rounded-t-none bg-zinc-100">
                    {e.data.mainPhoto ? (
                        <img
                            src={e.data.mainPhoto}
                            className="w-full h-full object-cover"
                            alt={propertyLabel}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={32} className="text-zinc-300"/>
                        </div>
                    )}
                    {/* Badge type sur photo */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-white shadow-md">
                        <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: COLORS.primary }}>
                            {propertyLabel}
                        </span>
                    </div>
                </div>

                {/* ===== INFOS BIEN ===== */}
                <div className="flex-1 px-5 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        {e.data.propertyAddress && (
                            <div className="flex items-start gap-2 mb-2">
                                <MapPin size={14} className="text-zinc-400 mt-0.5 flex-shrink-0"/>
                                <p className="text-sm font-bold text-zinc-800 leading-tight truncate">
                                    {e.data.propertyAddress}
                                </p>
                            </div>
                        )}
                        <div className="flex items-baseline gap-3 flex-wrap">
                            <p className="text-2xl font-black tracking-tight" style={{ color: COLORS.primary }}>
                                {formatPrice(Math.round(e.data.highPrice || 0))}
                                <span className="text-sm ml-1 opacity-70">€</span>
                            </p>
                            {e.data.monthlyRent && e.data.monthlyRent > 0 && (
                                <span className="text-xs text-zinc-500 font-semibold">
                                    Loyer est. : <span className="font-black text-emerald-700">{formatPrice(e.data.monthlyRent)} €/m</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ===== ACTIONS ===== */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">

                        {/* Bouton Simulateur */}
                        <ActionButton
                            icon={copiedId === simCopyId ? <Check size={13}/> : <Calculator size={13}/>}
                            label={copiedId === simCopyId ? "Copié !" : "Simulateur"}
                            onClick={(event) => { event.stopPropagation(); onCopy(simulationUrl, simCopyId); }}
                            variant={copiedId === simCopyId ? "success" : "primary"}
                            title={`Copier le lien du simulateur\n${simulationUrl}`}
                        />

                        {/* Bouton Galerie */}
                        <ActionButton
                            icon={copiedId === galCopyId ? <Check size={13}/> : <Camera size={13}/>}
                            label={copiedId === galCopyId ? "Copié !" : "Galerie"}
                            onClick={(event) => { event.stopPropagation(); onCopy(galleryUrl, galCopyId); }}
                            variant={copiedId === galCopyId ? "success" : "secondary"}
                            title={`Copier le lien de la galerie\n${galleryUrl}`}
                        />

                        {/* Menu ••• (SMS + Email + Ouvrir) */}
                        <div className="relative">
                            <button
                                onClick={(event) => { event.stopPropagation(); setOpenMenuId(menuOpen ? null : e.id); }}
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                                title="Plus d'actions"
                            >
                                <MoreVertical size={15}/>
                            </button>

                            {/* Popover menu */}
                            {menuOpen && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-zinc-200 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <button
                                        onClick={() => { onSMS(); setOpenMenuId(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100">
                                            <MessageCircle size={14} className="text-emerald-700"/>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-zinc-800">Envoyer par SMS</p>
                                            <p className="text-[10px] text-zinc-500">Les deux liens ensemble</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { onEmail(); setOpenMenuId(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left border-t border-zinc-100"
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.secondary}15` }}>
                                            <Mail size={14} style={{ color: COLORS.primary }}/>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-zinc-800">Envoyer par email</p>
                                            <p className="text-[10px] text-zinc-500">Message pré-rempli</p>
                                        </div>
                                    </button>

                                    <div className="border-t border-zinc-100">
                                        <Link
                                            href={`/simulation/${e.id}${e.data.highPrice ? `?price=${e.data.highPrice}` : ''}`}
                                            target="_blank"
                                            onClick={() => setOpenMenuId(null)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100">
                                                <ExternalLink size={14} className="text-zinc-600"/>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-zinc-800">Ouvrir le simulateur</p>
                                                <p className="text-[10px] text-zinc-500">Dans un nouvel onglet</p>
                                            </div>
                                        </Link>
                                        <Link
                                            href={`/galerie/${e.id}`}
                                            target="_blank"
                                            onClick={() => setOpenMenuId(null)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100">
                                                <ExternalLink size={14} className="text-zinc-600"/>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-zinc-800">Ouvrir la galerie</p>
                                                <p className="text-[10px] text-zinc-500">Dans un nouvel onglet</p>
                                            </div>
                                        </Link>
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

/* ============================================================
   COMPOSANT ACTION BUTTON — Bouton de partage unifié
   ============================================================ */
function ActionButton({
    icon, label, onClick, variant = "primary", title,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: (e: React.MouseEvent) => void;
    variant?: "primary" | "secondary" | "success";
    title?: string;
}) {
    const getStyle = () => {
        if (variant === "success") {
            return {
                background: `linear-gradient(135deg, ${COLORS.wealth}, ${COLORS.wealthLight})`,
                color: "white",
                border: "transparent",
            };
        }
        if (variant === "secondary") {
            return {
                background: "white",
                color: COLORS.primary,
                border: `${COLORS.secondary}40`,
            };
        }
        return {
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
            color: "white",
            border: "transparent",
        };
    };

    const s = getStyle();

    return (
        <button
            onClick={onClick}
            title={title}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 hover:shadow-md active:scale-100 border whitespace-nowrap"
            style={{ background: s.background, color: s.color, borderColor: s.border }}
        >
            {icon}
            {label}
        </button>
    );
}