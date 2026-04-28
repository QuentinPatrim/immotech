"use client";

/* ============================================================
   PAGE HUB "MES BIENS" — v2
   Point d'entrée central de l'app. 2 onglets :
   - Estimations : biens avec estimation complète
   - QR Codes    : biens créés via le générateur QR

   Un bien peut apparaître dans les DEUX onglets si :
   - Il a été créé comme QR puis étendu en estimation
   - Ou l'inverse (estimation convertie en QR)
   Un badge "LIÉ" est affiché dans ces cas-là.
   ============================================================ */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    Plus, Search, ChevronRight, QrCode, FileText, Home as HomeIcon,
    Image as ImageIcon, Calculator, MoreVertical, Trash2, Copy, Check,
    Sparkles, ArrowUpRight, Link2, Edit3, Wand2, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// --- CHARTE GRAPHIQUE PATRIM ---
const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
    gold: "#c9a84c",
    darkBg: "#0a0a0c",
    darkCard: "#111114",
    darkCardHover: "#1a1a1f",
    darkBorder: "rgba(255,255,255,0.08)",
};

// --- TYPES ---
type TabKey = "estimations" | "qr_codes";

interface EstimationRow {
    id: string;
    client_name: string;
    address: string;
    created_at: string;
    qr_code_id: string | null;
    data_json: any;
}

interface QrCodeRow {
    id: string;
    address: string;
    price_fai: number | null;
    property_type: string | null;
    rooms: number | null;
    surface: number | null;
    main_photo: string | null;
    extra_photos: string[];
    estimation_id: string | null;
    created_at: string;
}

export default function MesBiensPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>("estimations");
    const [loading, setLoading] = useState(true);
    const [estimations, setEstimations] = useState<EstimationRow[]>([]);
    const [qrCodes, setQrCodes] = useState<QrCodeRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Détecter origin côté client (pour construire les URLs de partage)
    const [origin, setOrigin] = useState("");
    useEffect(() => {
        if (typeof window !== "undefined") setOrigin(window.location.origin);
    }, []);

    // --- FETCH DES DEUX LISTES ---
    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetch en parallèle des deux tables
        const [estimationsRes, qrCodesRes] = await Promise.all([
            supabase
                .from('estimations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('qr_codes')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
        ]);

        if (estimationsRes.data) setEstimations(estimationsRes.data);
        if (qrCodesRes.data) setQrCodes(qrCodesRes.data);
        setLoading(false);
    };

    // --- RECHERCHE FILTRÉE ---
    const filteredEstimations = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return estimations;
        return estimations.filter(e =>
            (e.address || "").toLowerCase().includes(q) ||
            (e.client_name || "").toLowerCase().includes(q)
        );
    }, [estimations, searchQuery]);

    const filteredQrCodes = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return qrCodes;
        return qrCodes.filter(qr =>
            (qr.address || "").toLowerCase().includes(q) ||
            (qr.property_type || "").toLowerCase().includes(q)
        );
    }, [qrCodes, searchQuery]);

    // --- ACTIONS ---
    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch { /* fallback silencieux */ }
    };

    const deleteItem = async (table: 'estimations' | 'qr_codes', id: string) => {
        if (!confirm("Supprimer définitivement ce dossier ?")) return;
        await supabase.from(table).delete().eq('id', id);
        fetchAll();
        setOpenMenuId(null);
    };

    /* ============================================================
       CONVERSION : QR Code → Estimation complète
       Le QR reste dans qr_codes, mais on crée une estimation liée
       en reprenant les infos déjà saisies. Les deux sont ensuite
       associés via qr_code_id / estimation_id.
       ============================================================ */
    const convertQrToEstimation = async (qr: QrCodeRow) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Si le QR a déjà une estimation liée, on ouvre simplement celle-ci
        if (qr.estimation_id) {
            router.push(`/estimation/${qr.estimation_id}`);
            return;
        }

        // Pré-remplissage de l'estimation avec les données du QR
        const estimationData = {
            clientName: "",
            propertyAddress: qr.address || "",
            propertyType: qr.property_type || "Appartement",
            rooms: qr.rooms || 0,
            surface: qr.surface || 0,
            highPrice: qr.price_fai || 0,
            mainPhoto: qr.main_photo || "",
            extraPhotos: qr.extra_photos || [],
        };

        // Création de l'estimation avec lien vers le QR
        const { data: newEstim, error } = await supabase
            .from('estimations')
            .insert({
                user_id: user.id,
                client_name: "Nouveau dossier",
                address: qr.address || "Adresse à compléter",
                qr_code_id: qr.id,
                data_json: estimationData,
            })
            .select('id')
            .single();

        if (error || !newEstim) {
            alert("Erreur lors de la création de l'estimation.");
            return;
        }

        // Mise à jour du QR pour le lier à la nouvelle estimation
        await supabase
            .from('qr_codes')
            .update({ estimation_id: newEstim.id })
            .eq('id', qr.id);

        // Redirection vers l'estimation fraîchement créée
        router.push(`/estimation/${newEstim.id}`);
    };

    // --- RENDU ---
    return (
        <div className="min-h-screen" style={{ backgroundColor: COLORS.darkBg }}>
            {/* Import de la typo Fraunces (élégante) + Inter Tight (body) */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter+Tight:wght@400;500;600;700;800&display=swap');

                .font-display {
                    font-family: 'Fraunces', serif;
                    font-optical-sizing: auto;
                    font-variation-settings: "SOFT" 50, "WONK" 0;
                }
                .font-body {
                    font-family: 'Inter Tight', sans-serif;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .stagger-item {
                    animation: fadeInUp 0.4s ease-out backwards;
                }
            `}}/>

            {/* =================== HEADER ÉDITORIAL =================== */}
            <header className="relative overflow-hidden border-b border-white/5">
                {/* Motif décoratif subtil */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                        backgroundSize: '32px 32px',
                    }}
                />
                {/* Halo rouge d'ambiance */}
                <div
                    className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
                    style={{ backgroundColor: COLORS.primary }}
                />
                <div
                    className="absolute -top-20 right-20 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
                    style={{ backgroundColor: COLORS.secondary }}
                />

                <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
                    <div className="flex items-start justify-between gap-6 mb-6">
                        <div className="flex items-center gap-4">
                            <img src="/logo-patrim.png" alt="PATRIM" className="h-10 object-contain"/>
                            <div className="hidden sm:block h-10 w-px bg-white/10"/>
                            <div className="hidden sm:block">
                                <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold font-body">Espace agent</p>
                                <p className="text-xs text-zinc-300 font-body mt-0.5">Toulouse</p>
                            </div>
                        </div>

                        {/* Boutons de création rapide (desktop) */}
                        <div className="hidden md:flex items-center gap-3">
                            <Button
                                onClick={() => router.push('/generateur-qr')}
                                className="rounded-full h-11 px-5 font-bold text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors font-body"
                            >
                                <QrCode size={15} className="mr-2"/> Nouveau QR Code
                            </Button>
                            <Button
                                onClick={() => router.push('/estimation/new')}
                                className="rounded-full h-11 px-5 font-bold text-sm text-white shadow-xl transition-transform hover:scale-105 font-body"
                                style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
                            >
                                <Plus size={15} className="mr-2"/> Nouvelle estimation
                            </Button>
                        </div>
                    </div>

                    {/* Titre éditorial énorme */}
                    <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.4em] font-bold mb-2 font-body" style={{ color: COLORS.secondary }}>
                                Vos dossiers
                            </p>
                            <h1 className="font-display text-5xl md:text-7xl text-white tracking-tight leading-[0.95]" style={{ fontWeight: 500 }}>
                                Mes biens
                            </h1>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline gap-6">
                                <div>
                                    <span className="font-display text-3xl font-bold text-white">{estimations.length}</span>
                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1.5 font-body">est.</span>
                                </div>
                                <div className="h-10 w-px bg-white/10"/>
                                <div>
                                    <span className="font-display text-3xl font-bold text-white">{qrCodes.length}</span>
                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1.5 font-body">QR</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bouton création mobile (en bas du header) */}
                    <div className="flex md:hidden gap-3 mt-6">
                        <Button
                            onClick={() => router.push('/generateur-qr')}
                            className="flex-1 rounded-full h-11 font-bold text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 font-body"
                        >
                            <QrCode size={14} className="mr-1.5"/> QR Code
                        </Button>
                        <Button
                            onClick={() => router.push('/estimation/new')}
                            className="flex-1 rounded-full h-11 font-bold text-xs text-white font-body"
                            style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
                        >
                            <Plus size={14} className="mr-1.5"/> Estimation
                        </Button>
                    </div>
                </div>
            </header>

            {/* =================== BARRE DE NAV (TABS + RECHERCHE) =================== */}
            <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/5" style={{ backgroundColor: 'rgba(10,10,12,0.85)' }}>
                <div className="max-w-7xl mx-auto px-6 md:px-10">
                    <div className="flex items-center justify-between gap-6 py-4 flex-wrap">
                        {/* Tabs */}
                        <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/5">
                            <TabButton
                                active={activeTab === "estimations"}
                                onClick={() => setActiveTab("estimations")}
                                icon={<FileText size={14}/>}
                                label="Estimations"
                                count={estimations.length}
                            />
                            <TabButton
                                active={activeTab === "qr_codes"}
                                onClick={() => setActiveTab("qr_codes")}
                                icon={<QrCode size={14}/>}
                                label="QR Codes"
                                count={qrCodes.length}
                            />
                        </div>

                        {/* Recherche */}
                        <div className="relative flex-1 max-w-sm min-w-[200px]">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Rechercher par adresse..."
                                className="bg-white/5 border-white/10 h-10 pl-10 rounded-full text-sm text-white focus:border-[#d35f52] font-body"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* =================== CONTENU =================== */}
            <main className="max-w-7xl mx-auto px-6 md:px-10 py-10">
                {loading ? (
                    <LoadingState/>
                ) : activeTab === "estimations" ? (
                    filteredEstimations.length === 0 ? (
                        <EmptyState
                            tab="estimations"
                            hasSearch={searchQuery.length > 0}
                            onCreate={() => router.push('/estimation/new')}
                        />
                    ) : (
                        <div className="space-y-3">
                            {filteredEstimations.map((estim, i) => (
                                <EstimationCard
                                    key={estim.id}
                                    estim={estim}
                                    origin={origin}
                                    hasQrLink={!!estim.qr_code_id}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                    copiedId={copiedId}
                                    onCopy={handleCopy}
                                    onOpen={() => router.push(`/estimation/${estim.id}`)}
                                    onDelete={() => deleteItem('estimations', estim.id)}
                                    delay={i * 0.04}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    filteredQrCodes.length === 0 ? (
                        <EmptyState
                            tab="qr_codes"
                            hasSearch={searchQuery.length > 0}
                            onCreate={() => router.push('/generateur-qr')}
                        />
                    ) : (
                        <div className="space-y-3">
                            {filteredQrCodes.map((qr, i) => (
                                <QrCodeCard
                                    key={qr.id}
                                    qr={qr}
                                    origin={origin}
                                    hasEstimationLink={!!qr.estimation_id}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                    copiedId={copiedId}
                                    onCopy={handleCopy}
                                    onOpen={() => router.push(`/generateur-qr?qr_id=${qr.id}`)}
                                    onConvertToEstimation={() => convertQrToEstimation(qr)}
                                    onDelete={() => deleteItem('qr_codes', qr.id)}
                                    delay={i * 0.04}
                                />
                            ))}
                        </div>
                    )
                )}
            </main>
        </div>
    );
}

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

function TabButton({ active, onClick, icon, label, count }: {
    active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number;
}) {
    return (
        <button
            onClick={onClick}
            className={`relative h-9 px-4 rounded-full flex items-center gap-2 text-sm font-semibold transition-all font-body ${
                active
                    ? 'bg-white text-black shadow-lg'
                    : 'text-zinc-400 hover:text-white'
            }`}
        >
            {icon}
            <span>{label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                active ? 'bg-black/10 text-black' : 'bg-white/10 text-zinc-300'
            }`}>
                {count}
            </span>
        </button>
    );
}

function LoadingState() {
    return (
        <div className="flex items-center justify-center py-24">
            <div className="text-center">
                <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-[#d35f52] rounded-full animate-spin mb-4"/>
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-body">Chargement…</p>
            </div>
        </div>
    );
}

function EmptyState({ tab, hasSearch, onCreate }: {
    tab: TabKey; hasSearch: boolean; onCreate: () => void;
}) {
    const isEstim = tab === "estimations";
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.secondary}20)` }}>
                {isEstim ? <FileText size={28} className="text-[#d35f52]"/> : <QrCode size={28} className="text-[#d35f52]"/>}
            </div>
            <h3 className="font-display text-2xl text-white mb-2" style={{ fontWeight: 500 }}>
                {hasSearch
                    ? "Aucun résultat"
                    : isEstim ? "Aucune estimation" : "Aucun QR Code"}
            </h3>
            <p className="text-sm text-zinc-500 mb-6 font-body">
                {hasSearch
                    ? "Essayez un autre terme de recherche."
                    : isEstim
                        ? "Créez votre première estimation complète pour vos clients."
                        : "Générez un QR Code pour partager simulateur et galerie d'un bien."}
            </p>
            {!hasSearch && (
                <Button
                    onClick={onCreate}
                    className="rounded-full h-11 px-6 font-bold text-sm text-white font-body"
                    style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
                >
                    <Plus size={15} className="mr-2"/>
                    {isEstim ? "Nouvelle estimation" : "Nouveau QR Code"}
                </Button>
            )}
        </div>
    );
}

/* --------- CARTE ESTIMATION --------- */
function EstimationCard({
    estim, origin, hasQrLink, openMenuId, setOpenMenuId, copiedId, onCopy, onOpen, onDelete, delay,
}: any) {
    const mainPhoto = estim.data_json?.mainPhoto;
    const price = estim.data_json?.highPrice;
    const surface = estim.data_json?.surface;
    const rooms = estim.data_json?.rooms;
    const propertyType = estim.data_json?.propertyType || "Bien";

    const menuOpen = openMenuId === estim.id;

    const formattedDate = new Date(estim.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric'
    });

    return (
        <div
            className={`stagger-item group relative rounded-2xl border transition-all hover:border-white/15 ${menuOpen ? 'z-40' : ''}`}
            style={{
                backgroundColor: COLORS.darkCard,
                borderColor: COLORS.darkBorder,
                animationDelay: `${delay}s`,
            }}
        >
            <div className="flex items-stretch">
                {/* Photo */}
                <button onClick={onOpen} className="w-24 sm:w-32 flex-shrink-0 bg-black/30 cursor-pointer overflow-hidden rounded-l-2xl">
                    {mainPhoto ? (
                        <img src={mainPhoto} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt=""/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <HomeIcon size={24} className="text-white/10"/>
                        </div>
                    )}
                </button>

                {/* Infos */}
                <button onClick={onOpen} className="flex-1 min-w-0 text-left p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 font-body">{propertyType}</span>
                        {hasQrLink && (
                            <span
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-body"
                                style={{ background: COLORS.secondary + '20', color: COLORS.secondary }}
                            >
                                <Link2 size={9}/> Lié QR
                            </span>
                        )}
                    </div>
                    <p className="font-display text-white text-lg leading-tight truncate" style={{ fontWeight: 500 }}>
                        {estim.address}
                    </p>
                    {estim.client_name && estim.client_name !== "Dossier Sans Nom" && (
                        <p className="text-xs text-zinc-400 mt-0.5 truncate font-body">{estim.client_name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 font-body">
                        {rooms > 0 && <span>{rooms} pièces</span>}
                        {surface > 0 && <><span>·</span><span>{surface} m²</span></>}
                        {price > 0 && (
                            <>
                                <span>·</span>
                                <span className="font-bold" style={{ color: COLORS.secondary }}>
                                    {Number(price).toLocaleString('fr-FR')} €
                                </span>
                            </>
                        )}
                    </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-2 pr-4 pl-2">
                    <div className="hidden sm:block text-right pr-2">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold font-body">{formattedDate}</p>
                    </div>
                    <button
                        onClick={onOpen}
                        className="hidden md:flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold text-white transition-colors font-body"
                        style={{ backgroundColor: COLORS.primary }}
                    >
                        Ouvrir <ArrowUpRight size={13}/>
                    </button>

                    {/* Menu mobile / secondaire */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : estim.id); }}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <MoreVertical size={16}/>
                        </button>
                        {menuOpen && (
                            <div
                                className="absolute top-full right-0 mt-2 w-52 rounded-2xl border shadow-2xl overflow-hidden z-50"
                                style={{ backgroundColor: COLORS.darkCardHover, borderColor: COLORS.darkBorder }}
                            >
                                <button onClick={onOpen} className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-body md:hidden">
                                    <Edit3 size={13}/> Ouvrir le dossier
                                </button>
                                <button
                                    onClick={() => onCopy(`${origin}/simulation/${estim.id}`, estim.id + '-sim')}
                                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-body"
                                >
                                    {copiedId === estim.id + '-sim' ? <><Check size={13}/> Lien simu copié</> : <><Calculator size={13}/> Copier lien simulateur</>}
                                </button>
                                <button
                                    onClick={() => onCopy(`${origin}/galerie/${estim.id}`, estim.id + '-gal')}
                                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-body"
                                >
                                    {copiedId === estim.id + '-gal' ? <><Check size={13}/> Lien galerie copié</> : <><ImageIcon size={13}/> Copier lien galerie</>}
                                </button>
                                <div className="h-px bg-white/5"/>
                                <button
                                    onClick={onDelete}
                                    className="w-full px-4 py-3 text-left text-xs hover:bg-red-500/10 transition-colors flex items-center gap-2 font-body"
                                    style={{ color: '#ff6b6b' }}
                                >
                                    <Trash2 size={13}/> Supprimer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Barre latérale décorative */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity rounded-l-2xl pointer-events-none"
                style={{ background: `linear-gradient(to bottom, ${COLORS.primary}, ${COLORS.secondary})` }}
            />
        </div>
    );
}

/* --------- CARTE QR CODE --------- */
function QrCodeCard({
    qr, origin, hasEstimationLink, openMenuId, setOpenMenuId, copiedId, onCopy, onOpen, onConvertToEstimation, onDelete, delay,
}: any) {
    const menuOpen = openMenuId === qr.id;

    const formattedDate = new Date(qr.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric'
    });

    return (
        <div
            className={`stagger-item group relative rounded-2xl border transition-all hover:border-white/15 ${menuOpen ? 'z-40' : ''}`}
            style={{
                backgroundColor: COLORS.darkCard,
                borderColor: COLORS.darkBorder,
                animationDelay: `${delay}s`,
            }}
        >
            <div className="flex items-stretch">
                {/* Photo */}
                <button onClick={onOpen} className="w-24 sm:w-32 flex-shrink-0 bg-black/30 cursor-pointer overflow-hidden relative rounded-l-2xl">
                    {qr.main_photo ? (
                        <img src={qr.main_photo} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt=""/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <QrCode size={24} className="text-white/10"/>
                        </div>
                    )}
                    {/* Icône QR overlay */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <QrCode size={11} className="text-white"/>
                    </div>
                </button>

                {/* Infos */}
                <button onClick={onOpen} className="flex-1 min-w-0 text-left p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 font-body">
                            {qr.property_type || "QR Code"}
                        </span>
                        {hasEstimationLink && (
                            <span
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-body"
                                style={{ background: COLORS.secondary + '20', color: COLORS.secondary }}
                            >
                                <Link2 size={9}/> Aussi estimation
                            </span>
                        )}
                    </div>
                    <p className="font-display text-white text-lg leading-tight truncate" style={{ fontWeight: 500 }}>
                        {qr.address || "Adresse non renseignée"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 font-body">
                        {qr.rooms > 0 && <span>{qr.rooms} pièces</span>}
                        {qr.surface > 0 && <><span>·</span><span>{qr.surface} m²</span></>}
                        {qr.price_fai > 0 && (
                            <>
                                <span>·</span>
                                <span className="font-bold" style={{ color: COLORS.secondary }}>
                                    {Number(qr.price_fai).toLocaleString('fr-FR')} €
                                </span>
                            </>
                        )}
                    </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-2 pr-4 pl-2">
                    <div className="hidden sm:block text-right pr-2">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold font-body">{formattedDate}</p>
                    </div>
                    <button
                        onClick={onOpen}
                        className="hidden md:flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold text-white transition-colors font-body"
                        style={{ backgroundColor: COLORS.primary }}
                    >
                        Rouvrir <ArrowUpRight size={13}/>
                    </button>

                    {/* Menu */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : qr.id); }}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <MoreVertical size={16}/>
                        </button>
                        {menuOpen && (
                            <div
                                className="absolute top-full right-0 mt-2 w-64 rounded-2xl border shadow-2xl overflow-hidden z-50"
                                style={{ backgroundColor: COLORS.darkCardHover, borderColor: COLORS.darkBorder }}
                            >
                                <button onClick={onOpen} className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-body md:hidden">
                                    <Edit3 size={13}/> Rouvrir le QR
                                </button>
                                {!hasEstimationLink && (
                                    <button
                                        onClick={onConvertToEstimation}
                                        className="w-full px-4 py-3 text-left text-xs hover:bg-white/5 transition-colors flex items-center gap-2 font-body"
                                        style={{ color: COLORS.secondary }}
                                    >
                                        <Wand2 size={13}/> Faire l'estimation complète
                                    </button>
                                )}
                                {hasEstimationLink && (
                                    <button
                                        onClick={onConvertToEstimation}
                                        className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-body"
                                    >
                                        <FileText size={13}/> Ouvrir l'estimation liée
                                    </button>
                                )}
                                <div className="h-px bg-white/5"/>
                                <button
                                    onClick={() => onCopy(`${origin}/simulation/${qr.id}`, qr.id + '-sim')}
                                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-body"
                                >
                                    {copiedId === qr.id + '-sim' ? <><Check size={13}/> Lien simu copié</> : <><Calculator size={13}/> Copier lien simulateur</>}
                                </button>
                                <button
                                    onClick={() => onCopy(`${origin}/galerie/${qr.id}`, qr.id + '-gal')}
                                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-body"
                                >
                                    {copiedId === qr.id + '-gal' ? <><Check size={13}/> Lien galerie copié</> : <><ImageIcon size={13}/> Copier lien galerie</>}
                                </button>
                                <div className="h-px bg-white/5"/>
                                <button
                                    onClick={onDelete}
                                    className="w-full px-4 py-3 text-left text-xs hover:bg-red-500/10 transition-colors flex items-center gap-2 font-body"
                                    style={{ color: '#ff6b6b' }}
                                >
                                    <Trash2 size={13}/> Supprimer le QR
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Barre latérale décorative */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity rounded-l-2xl pointer-events-none"
                style={{ background: `linear-gradient(to bottom, ${COLORS.primary}, ${COLORS.secondary})` }}
            />
        </div>
    );
}