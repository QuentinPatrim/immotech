"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home, MapPin, Image as ImageIcon, TrendingUp, CheckCircle,
    Printer, ArrowRight, ArrowLeft, Plus, Trash2, UploadCloud, FileText,
    List, Edit, X, Leaf, ThumbsUp, ThumbsDown, BarChart3, Loader2, Euro, Building2, Banknote,
    Sparkles, Star, Globe, Wand2, Search, Target, AlertCircle, Check,
    Camera, Satellite, RefreshCw, User, KeyRound, ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import { DossierStatus, formatSurface, formatMonthYear, median, centralPrice, PATRIM_AGENTS } from "@/lib/dossier";
import { fetchAddressPhoto, type AddressSuggestion } from "@/lib/addressClient";
import AddressInput from "@/components/estimation/AddressInput";
import ListingCard from "@/components/estimation/ListingCard";
import ThemeToggle from "@/components/estimation/ThemeToggle";
import { daysOnline, initialPrice, priceDrop, pricePerSqm, type MarketListing } from "@/lib/marketListings";
import { deleteListing, fetchListingPhoto, fetchListings, LAST_ESTIMATION_KEY, setListingSelected } from "@/lib/captureClient";

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

// --- LISTE DES COLLABORATEURS --- (partagée avec /mes-biens, voir lib/dossier.ts)
const AGENTS = PATRIM_AGENTS;

// --- TYPES ---
/** Photo trouvée automatiquement à partir de l'adresse (vue de rue Panoramax ou vue aérienne IGN) */
export interface AutoPhotoInfo {
    variant: number;        // n° de la vue (bouton « Autre vue »)
    credit: string;         // mention de la source, reprise dans le PDF
}
export interface Comparable {
    id: string; address: string; surface: number; price: number; photoUrl: string;
    soldDate?: string;      // date de vente (DVF ou saisie manuelle)
    distance?: number;      // mètres depuis le bien (DVF)
    rooms?: number;
    source?: "dvf" | "manual" | "portal";
    lat?: number; lon?: number;
    photoAuto?: AutoPhotoInfo | null;
    // Annonce en vente capturée sur un portail (outil « annonces »)
    listingId?: string;
    portal?: string;
    url?: string;
    publishedAt?: string;   // date de parution
    firstSeenAt?: string;   // 1re capture (à défaut de date de parution)
    initialPrice?: number;  // prix de départ si baisse
    highlight?: string;     // particularité
}
export interface MarketStats {
    count: number; median: number; p25: number; p75: number;
    radius: number; years: number[]; fetchedAt: string;
}
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
    // Suivi commercial (hub Mes biens)
    status?: DossierStatus;
    statusUpdatedAt?: string;
    mandateType?: "simple" | "exclusif" | "";
    followUpNote?: string;
    // Référence marché DVF (dernière recherche)
    marketStats?: MarketStats | null;
    // Localisation du bien (adresse choisie dans les suggestions) et photo de couverture automatique
    propertyLat?: number;
    propertyLon?: number;
    mainPhotoAuto?: AutoPhotoInfo | null;
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
    status: "en_cours",
    statusUpdatedAt: "",
    mandateType: "",
    followUpNote: "",
    marketStats: null,
};

const STEPS = [
    { id: 1, label: "Le bien" },
    { id: 2, label: "Photos" },
    { id: 3, label: "Marché" },
    { id: 4, label: "Valeur" },
];

interface DvfSaleResult {
    id: string; date: string; price: number; surface: number; rooms: number; address: string;
    city: string; distance: number; pricePerSqm: number; dependances: number; landSurface: number; photoUrl: string;
    lat?: number; lon?: number;
}

// Champs de suivi gérés depuis "Mes biens" : l'éditeur ne les écrase jamais
// (on reprend la valeur en base au moment d'enregistrer).
const HUB_KEYS = ["status", "statusUpdatedAt", "lastFollowUpAt", "mandateType", "followUpNote"] as const;

// Prix au m² d'un comparable (0 si surface ou prix manquant, exclu des médianes)
const sqmOf = (c: { price: number; surface: number }) => (c.price > 0 && c.surface > 0 ? c.price / c.surface : 0);

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

// --- BRIQUES D'INTERFACE DE L'ÉDITEUR ---
const StepHeader = ({ n, icon, title, subtitle }: { n: number; icon: React.ReactNode; title: string; subtitle?: string }) => (
    <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
            {icon}
        </div>
        <div>
            <p className="text-[10.5px] text-[var(--p-faint)] uppercase tracking-[0.22em] font-medium">Étape {n} / 4</p>
            <h2 className="text-[28px] leading-tight font-medium text-[var(--p-fg)] display-font">{title}</h2>
            {subtitle && <p className="text-[13px] text-[var(--p-muted)] mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

const Section = ({ icon, title, hint, action, children }: { icon: React.ReactNode; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) => (
    <section className="rounded-[22px] border p-5 md:p-6 space-y-4" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] flex items-center gap-2 text-[var(--p-accent)] [&_svg]:w-[14px] [&_svg]:h-[14px]">{icon} {title}</h3>
                {hint && <p className="text-xs text-[var(--p-muted)] mt-1.5">{hint}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

const Field = ({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) => (
    <div className={`space-y-2 ${className ?? ""}`}>
        <label className="text-[10.5px] font-medium text-[var(--p-muted)] uppercase tracking-[0.14em]">{label}</label>
        {children}
    </div>
);

const ToggleTile = ({ label, icon, checked, onChange }: { label: string; icon?: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between gap-3 bg-[var(--p-sunken)] px-4 h-14 rounded-2xl border" style={{ borderColor: checked ? `${COLORS.secondary}66` : "var(--p-line)" }}>
        <span className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2">{icon}{label}</span>
        <Switch checked={checked} onCheckedChange={onChange}/>
    </div>
);

/** Choix d'une option parmi quelques-unes (type de bien…) */
const Segmented = <T extends string>({ options, value, onChange }: { options: { value: T; label: string; icon?: React.ReactNode }[]; value: T; onChange: (v: T) => void }) => (
    <div className="grid gap-1 p-1 rounded-2xl bg-[var(--p-field)] border border-[var(--p-line)]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(o => (
            <button key={o.value} type="button" onClick={() => onChange(o.value)}
                className={`h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${value === o.value ? 'bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] shadow-lg' : 'text-[var(--p-muted)] hover:text-[var(--p-fg)]'}`}>
                {o.icon}{o.label}
            </button>
        ))}
    </div>
);

/** Étiquette énergétique A → G en un clic */
const LetterPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="flex items-end gap-1 h-14">
        {["A", "B", "C", "D", "E", "F", "G"].map(l => {
            const selected = value === l;
            return (
                <button key={l} type="button" onClick={() => onChange(l)} title={`Classe ${l}`}
                    className={`flex-1 rounded-lg font-black text-[#fff] transition-all ${selected ? 'h-14 text-lg ring-2 ring-[var(--p-fg)] ring-offset-2 ring-offset-[var(--p-sunken)] shadow-lg' : 'h-9 text-xs opacity-40 hover:opacity-80'}`}
                    style={{ backgroundColor: DPE_COLORS[l] }}>
                    {l}
                </button>
            );
        })}
    </div>
);

// --- SUGGESTIONS DE POINTS FORTS / FAIBLES (un clic pour les ajouter) ---
const floorNumber = (f: string) => {
    const m = (f || "").match(/\d+/);
    return m ? Number(m[0]) : /rdc|rez/i.test(f || "") ? 0 : null;
};

function suggestStrengths(d: EstimationData): string[] {
    const am = d.amenities ?? [];
    const list: string[] = [];
    if (["A", "B", "C"].includes(d.dpe)) list.push(`DPE ${d.dpe} : faible consommation`);
    if (d.hasElevator && d.propertyType !== "Maison") list.push("Immeuble avec ascenseur");
    if (am.some(a => ["balcon", "terrasse", "loggia"].includes(a))) list.push("Extérieur privatif");
    if (am.includes("jardin")) list.push("Jardin");
    if (am.some(a => ["garage", "parking"].includes(a))) list.push("Stationnement privatif");
    if (am.some(a => ["cave", "cellier"].includes(a))) list.push("Rangements annexes");
    if (am.includes("piscine")) list.push("Piscine");
    if (d.buildYear >= 2012) list.push("Construction récente");
    list.push("Lumineux", "Sans vis-à-vis", "Bon état général", "Proche commerces et transports", "Quartier recherché", "Calme", "Double exposition", "Belle hauteur sous plafond");
    return list.filter(s => !d.strengths.includes(s));
}

function suggestWeaknesses(d: EstimationData): string[] {
    const am = d.amenities ?? [];
    const floor = floorNumber(d.floor);
    const list: string[] = [];
    if (["F", "G"].includes(d.dpe)) list.push(`DPE ${d.dpe} : rénovation énergétique à prévoir`);
    if (d.dpe === "E") list.push("DPE E : travaux énergétiques à anticiper");
    if (d.propertyType !== "Maison" && !d.hasElevator && floor !== null && floor >= 3) list.push("Étage élevé sans ascenseur");
    if (d.propertyType !== "Maison" && floor === 0) list.push("Rez-de-chaussée");
    if (d.isCopropriete && d.coproFees >= 250) list.push("Charges de copropriété élevées");
    if (!am.some(a => ["balcon", "terrasse", "loggia", "jardin"].includes(a))) list.push("Pas d'extérieur");
    if (!am.some(a => ["garage", "parking"].includes(a))) list.push("Pas de stationnement");
    list.push("Travaux de rafraîchissement", "Vis-à-vis", "Rue passante", "Cuisine à rénover", "Salle de bains à rénover", "Orientation nord");
    return list.filter(s => !d.weaknesses.includes(s));
}

const LAST_AGENT_KEY = "patrim:lastAgentId";

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
    initialStep?: number;
}

export default function EstimationEditor({
    initialData,
    existingId,
    initialView = "EDIT",
    initialStep = 1,
}: EstimationEditorProps) {
    const router = useRouter();
    const [view, setView] = useState<"EDIT" | "PRINT">(initialView);
    const [step, setStep] = useState(initialStep);
    const [currentId, setCurrentId] = useState<string | null>(existingId);
    const [data, setData] = useState<EstimationData>(initialData);
    const [newStrength, setNewStrength] = useState("");
    const [newWeakness, setNewWeakness] = useState("");
    const [newAmenity, setNewAmenity] = useState("");

    // --- IMPORT WEB & AUTO-GÉNÉRATION ---
    const [listingUrl, setListingUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);
    const [isGeneratingComps, setIsGeneratingComps] = useState(false);
    const [dvfRadius, setDvfRadius] = useState<number>(500); // Rayon de recherche DVF en mètres
    const [dvfTolerance, setDvfTolerance] = useState<number>(0.25);
    const [dvfSameRooms, setDvfSameRooms] = useState<boolean>(true);
    const [dvfResults, setDvfResults] = useState<{ sales: DvfSaleResult[]; stats: any; years: number[]; radius: number } | null>(null);
    const [dvfSelected, setDvfSelected] = useState<Set<string>>(new Set());
    const [dvfError, setDvfError] = useState("");
    const [dvfInfo, setDvfInfo] = useState("");
    const [dvfVisible, setDvfVisible] = useState(30);

    const handleNext = () => setStep(s => Math.min(4, s + 1));
    const handleBack = () => setStep(s => Math.max(1, s - 1));

    // ─── SAUVEGARDE (manuelle + automatique) ───
    // Les dossiers existants sont enregistrés automatiquement 1,5 s après chaque modification.
    // Un nouveau dossier est créé dès qu'une adresse ou un nom de client est saisi.
    type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
    const [saveState, setSaveState] = useState<SaveState>(existingId ? "saved" : "idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const dataRef = useRef<EstimationData>(data);
    useEffect(() => { dataRef.current = data; }, [data]);
    const currentIdRef = useRef<string | null>(existingId);
    const lastSavedJson = useRef<string>(JSON.stringify(initialData));
    const savingRef = useRef(false);

    const persist = useCallback(async (snapshot: EstimationData, opts?: { promote?: boolean }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Session expirée — reconnectez-vous.");
        const clean: EstimationData = {
            ...snapshot,
            clientName: (snapshot.clientName || "").trim(),
            clientAddress: (snapshot.clientAddress || "").trim(),
            propertyAddress: (snapshot.propertyAddress || "").trim(),
        };
        const id = currentIdRef.current;
        if (id) {
            const { data: current, error: readError } = await supabase.from('estimations').select('data_json').eq('id', id).maybeSingle();
            if (readError) throw readError;
            const dbJson: Record<string, unknown> = current?.data_json || {};
            const merged: Record<string, unknown> = { ...clean };
            for (const k of HUB_KEYS) if (k in dbJson) merged[k] = dbJson[k];
            // Génération du PDF : un avis "en cours" passe à "remis"
            if (opts?.promote && (!merged.status || merged.status === "en_cours")) {
                merged.status = "remise";
                merged.statusUpdatedAt = new Date().toISOString();
            }
            const { error } = await supabase.from('estimations').update({
                user_id: user.id,
                client_name: clean.clientName || "Dossier Sans Nom",
                address: clean.propertyAddress || "Adresse non renseignée",
                data_json: merged,
            }).eq('id', id);
            if (error) throw error;
            return id;
        }
        if (opts?.promote) {
            clean.status = "remise";
            clean.statusUpdatedAt = new Date().toISOString();
        }
        const payload = {
            user_id: user.id,
            client_name: clean.clientName || "Dossier Sans Nom",
            address: clean.propertyAddress || "Adresse non renseignée",
            data_json: clean,
        };
        const { data: inserted, error } = await supabase.from('estimations').insert(payload).select('id').single();
        if (error || !inserted) throw error || new Error("Création impossible");
        currentIdRef.current = inserted.id;
        setCurrentId(inserted.id);
        // On remplace /estimation/new par l'URL définitive SANS recharger la page
        // (un router.replace remonterait l'éditeur et ferait perdre l'étape en cours).
        window.history.replaceState(null, "", `/estimation/${inserted.id}`);
        return inserted.id as string;
    }, []);

    const saveNow = useCallback(async (opts?: { promote?: boolean }): Promise<boolean> => {
        // Attend la fin d'un enregistrement en cours (évite les doublons à la création)
        while (savingRef.current) await new Promise(r => setTimeout(r, 80));
        const snapshot = dataRef.current;
        const json = JSON.stringify(snapshot);
        if (json === lastSavedJson.current && currentIdRef.current && !opts?.promote) {
            setSaveState("saved");
            return true;
        }
        savingRef.current = true;
        setSaveState("saving");
        try {
            // Délai max : une requête bloquée ne doit pas figer l'éditeur
            await Promise.race([
                persist(snapshot, opts),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Délai dépassé")), 20000)),
            ]);
            lastSavedJson.current = json;
            setLastSavedAt(new Date());
            setSaveState(JSON.stringify(dataRef.current) === json ? "saved" : "dirty");
            return true;
        } catch (e) {
            console.error("Erreur de sauvegarde :", e);
            setSaveState("error");
            return false;
        } finally {
            savingRef.current = false;
        }
    }, [persist]);

    // Autosave (debounce 1,5 s)
    useEffect(() => {
        const json = JSON.stringify(data);
        if (json === lastSavedJson.current) return;
        setSaveState(prev => (prev === "saving" ? prev : "dirty"));
        if (!currentIdRef.current && !data.propertyAddress.trim() && !data.clientName.trim()) return;
        const t = setTimeout(() => { void saveNow(); }, 1500);
        return () => clearTimeout(t);
    }, [data, saveNow]);

    // Enregistre ce qui est en attente si on quitte l'éditeur (retour navigateur…) ou si l'onglet passe en arrière-plan
    useEffect(() => {
        const hasPending = () =>
            JSON.stringify(dataRef.current) !== lastSavedJson.current &&
            !!(currentIdRef.current || dataRef.current.propertyAddress.trim() || dataRef.current.clientName.trim());
        const onHidden = () => { if (document.visibilityState === "hidden" && hasPending()) void saveNow(); };
        document.addEventListener("visibilitychange", onHidden);
        return () => {
            document.removeEventListener("visibilitychange", onHidden);
            if (hasPending()) void saveNow();
        };
    }, [saveNow]);

    // Alerte si on ferme l'onglet avec des modifications non enregistrées
    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (JSON.stringify(dataRef.current) !== lastSavedJson.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, []);

    // Retour à /mes-biens (on enregistre d'abord ce qui ne l'est pas)
    const goToMesBiens = async () => {
        if (JSON.stringify(dataRef.current) !== lastSavedJson.current && (currentIdRef.current || dataRef.current.propertyAddress.trim() || dataRef.current.clientName.trim())) {
            const ok = await saveNow();
            if (!ok && !confirm("L'enregistrement a échoué. Quitter quand même et perdre les dernières modifications ?")) return;
        }
        router.push('/mes-biens');
    };

    const handleSave = async (isDraft = false) => {
        if (isDraft) {
            await saveNow();
            return;
        }
        // Génération du PDF : l'avis de valeur passe au statut "remis" s'il était en cours
        const ok = await saveNow({ promote: true });
        if (!ok && !confirm("L'enregistrement a échoué. Afficher quand même le PDF ?")) return;
        setView("PRINT");
        window.scrollTo(0, 0);
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
                        newData.mainPhotoAuto = null;
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

    // ─── RECHERCHE DE VENTES RÉELLES (DVF data.gouv) ───
    const handleAutoGenerateDVF = async () => {
        if (!data.propertyAddress || !data.surface) {
            setDvfError("Renseignez l'adresse du bien et sa surface (étape 1) avant de lancer la recherche.");
            return;
        }
        setIsGeneratingComps(true);
        setDvfError("");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/comparables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    address: data.propertyAddress,
                    surface: data.surface,
                    propertyType: data.propertyType,
                    radius: dvfRadius,
                    surfaceTolerance: dvfTolerance,
                    rooms: dvfSameRooms ? data.rooms : 0,
                    knownSales: data.soldComparables
                        .filter(c => c.source !== "dvf" && c.price > 0)
                        .map(c => ({ id: c.id, price: c.price, surface: c.surface })),
                }),
            });
            const result = await response.json();
            if (result.success) {
                const already = new Set(data.soldComparables.map(c => c.id));
                // Ventes déjà saisies à la main : l'API retrouve leur date dans DVF
                const matches: Record<string, { dvfId: string; date: string; distance: number }> = result.matches || {};
                const fillDate = (c: Comparable): Comparable => {
                    const m = matches[c.id];
                    return !m || c.soldDate ? c : { ...c, soldDate: m.date, distance: c.distance ?? m.distance };
                };
                const datesFilled = data.soldComparables.filter(c => matches[c.id] && !c.soldDate).length;
                const sales: DvfSaleResult[] = result.sales.filter((s: DvfSaleResult) => !already.has(`dvf-${s.id}`));
                setDvfResults({ sales, stats: result.stats, years: result.years, radius: result.radius });
                setDvfVisible(30);
                setDvfInfo(datesFilled > 0 ? `Date de vente retrouvée dans DVF pour ${datesFilled} comparable${datesFilled > 1 ? "s" : ""} déjà saisi${datesFilled > 1 ? "s" : ""}.` : "");
                // Pré-sélection : les 3 ventes les plus pertinentes (déjà triées par l'API)
                setDvfSelected(new Set(sales.slice(0, 3).map(s => s.id)));
                setData(prev => ({
                    ...prev,
                    soldComparables: datesFilled > 0 ? prev.soldComparables.map(fillDate) : prev.soldComparables,
                    marketStats: result.stats ? {
                        count: result.stats.count, median: result.stats.median,
                        p25: result.stats.p25, p75: result.stats.p75,
                        radius: result.radius, years: result.years, fetchedAt: new Date().toISOString(),
                    } : prev.marketStats,
                }));
            } else {
                setDvfResults(null);
                setDvfError(result.error || "Aucune vente trouvée.");
            }
        } catch (error) {
            setDvfError("Erreur de connexion au serveur DVF. Réessayez dans un instant.");
        }
        setIsGeneratingComps(false);
    };

    const addSelectedDvf = () => {
        if (!dvfResults) return;
        const picked = dvfResults.sales.filter(s => dvfSelected.has(s.id));
        const comps: Comparable[] = picked.map(s => ({
            id: `dvf-${s.id}`,
            address: s.city ? `${s.address}, ${s.city}` : s.address,
            surface: s.surface,
            price: s.price,
            photoUrl: s.photoUrl || "",
            soldDate: s.date,
            distance: s.distance,
            rooms: s.rooms,
            source: "dvf",
            lat: s.lat,
            lon: s.lon,
        }));
        setData(prev => ({ ...prev, soldComparables: [...prev.soldComparables, ...comps] }));
        setDvfResults(null);
        setDvfSelected(new Set());
        // Photo de chaque vente ajoutée, sans capture d'écran
        void fillComparablePhotos(comps.map(comp => ({ type: 'sold' as const, comp })));
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

    const uploadPhotoFile = async (file: File, field: 'mainPhoto' | 'secondaryPhotos') => {
        const key = `${field}-${Date.now()}`;
        setUploadingPhotos(p => ({...p, [key]: true}));
        const url = await uploadToStorage(file, 'main');
        setUploadingPhotos(p => { const n = {...p}; delete n[key]; return n; });
        if (!url) return;
        if (field === 'mainPhoto') setData(prev => ({ ...prev, mainPhoto: url, mainPhotoAuto: null }));
        if (field === 'secondaryPhotos') setData(prev => ({ ...prev, secondaryPhotos: [...prev.secondaryPhotos, url].slice(0, 3) }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'mainPhoto' | 'secondaryPhotos') => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) await uploadPhotoFile(file, field);
    };

    /** Fichiers images déposés par glisser-déposer */
    const droppedImages = (e: React.DragEvent) => {
        e.preventDefault();
        return Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
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
        e.target.value = "";
        const key = `comp-${id}`;
        setUploadingPhotos(p => ({...p, [key]: true}));
        const url = await uploadToStorage(file, 'comparables');
        setUploadingPhotos(p => { const n = {...p}; delete n[key]; return n; });
        if (url) patchComparable(type, id, { photoUrl: url, photoAuto: null });
    };

    const isUploading = Object.keys(uploadingPhotos).length > 0;

    const patchComparable = (type: 'sold' | 'forSale', id: string, patch: Partial<Comparable>) => {
        setData(prev => {
            const list = type === 'sold' ? prev.soldComparables : prev.forSaleComparables;
            const updated = list.map(c => c.id === id ? { ...c, ...patch } : c);
            return type === 'sold'
                ? { ...prev, soldComparables: updated }
                : { ...prev, forSaleComparables: updated };
        });
    };

    const updateComparable = (type: 'sold' | 'forSale', id: string, field: keyof Comparable, value: any) =>
        patchComparable(type, id, { [field]: value } as Partial<Comparable>);

    // ─── PHOTOS AUTOMATIQUES À PARTIR DE L'ADRESSE ───
    // Vue de rue (Panoramax : photos de Toulouse Métropole, IGN…) ou, à défaut, vue aérienne IGN.
    // La photo est copiée dans le stockage du dossier, comme une photo importée.
    const [photoError, setPhotoError] = useState("");          // photo de couverture
    const [compPhotoError, setCompPhotoError] = useState("");  // photos des comparables

    const autoPhoto = async (opts: { lat?: number; lon?: number; address?: string; variant?: number; mode?: "auto" | "aerien" }) => {
        const result = await fetchAddressPhoto(opts);
        const url = await uploadToStorage(result.file, 'auto');
        if (!url) throw new Error("Enregistrement de la photo impossible.");
        return { url, result };
    };

    const setComparableAutoPhoto = async (type: 'sold' | 'forSale', comp: Pick<Comparable, 'id' | 'address' | 'lat' | 'lon' | 'photoAuto'>, next = false) => {
        const key = `comp-${comp.id}`;
        setUploadingPhotos(p => ({ ...p, [key]: true }));
        setCompPhotoError("");
        try {
            const variant = next ? (comp.photoAuto?.variant ?? -1) + 1 : 0;
            const { url, result } = await autoPhoto({ lat: comp.lat, lon: comp.lon, address: comp.address, variant });
            patchComparable(type, comp.id, {
                photoUrl: url,
                photoAuto: { variant: result.variant, credit: result.credit },
                ...(comp.lat && comp.lon ? {} : { lat: result.lat, lon: result.lon }),
            });
        } catch (e) {
            setCompPhotoError(`${comp.address || "Comparable"} : ${e instanceof Error ? e.message : "photo introuvable"}`);
        } finally {
            setUploadingPhotos(p => { const n = { ...p }; delete n[key]; return n; });
        }
    };

    /** Photos automatiques pour une liste de comparables (2 en parallèle) */
    const fillComparablePhotos = async (items: { type: 'sold' | 'forSale'; comp: Comparable }[]) => {
        const queue = items.filter(({ comp }) => !comp.photoUrl && ((comp.lat && comp.lon) || comp.address.trim().length > 5));
        const worker = async () => {
            for (let item = queue.shift(); item; item = queue.shift()) await setComparableAutoPhoto(item.type, item.comp);
        };
        await Promise.all([worker(), worker()]);
    };

    const missingCompPhotos = [
        ...data.soldComparables.map(comp => ({ type: 'sold' as const, comp })),
        ...data.forSaleComparables.map(comp => ({ type: 'forSale' as const, comp })),
    ].filter(({ comp }) => !comp.photoUrl && ((comp.lat && comp.lon) || comp.address.trim().length > 5));

    const selectComparableAddress = (type: 'sold' | 'forSale', comp: Comparable, s: AddressSuggestion) => {
        patchComparable(type, comp.id, { address: s.label, lat: s.lat, lon: s.lon });
        // Nouvelle adresse : on (re)cherche la photo, sauf si l'agent a importé la sienne
        if (!comp.photoUrl || comp.photoAuto) void setComparableAutoPhoto(type, { ...comp, address: s.label, lat: s.lat, lon: s.lon, photoAuto: null });
    };

    const setMainAutoPhoto = async (mode: "auto" | "aerien", next = false, place?: { lat?: number; lon?: number; address?: string }) => {
        const key = 'mainPhoto-auto';
        setUploadingPhotos(p => ({ ...p, [key]: true }));
        setPhotoError("");
        try {
            const d = dataRef.current;
            const where = place ?? { lat: d.propertyLat, lon: d.propertyLon, address: d.propertyAddress };
            const variant = next ? (d.mainPhotoAuto?.variant ?? -1) + 1 : 0;
            const { url, result } = await autoPhoto({ ...where, variant, mode });
            setData(prev => ({
                ...prev,
                mainPhoto: url,
                mainPhotoAuto: { variant: result.variant, credit: result.credit },
                ...(prev.propertyLat && prev.propertyLon ? {} : { propertyLat: result.lat, propertyLon: result.lon }),
            }));
        } catch (e) {
            setPhotoError(e instanceof Error ? e.message : "Photo introuvable pour cette adresse.");
        } finally {
            setUploadingPhotos(p => { const n = { ...p }; delete n[key]; return n; });
        }
    };

    const selectPropertyAddress = (s: AddressSuggestion) => {
        setData(prev => ({ ...prev, propertyAddress: s.label, propertyLat: s.lat, propertyLon: s.lon }));
        // Pas encore de photo de couverture : on met la façade automatiquement (remplaçable à l'étape 2)
        if (!dataRef.current.mainPhoto) void setMainAutoPhoto("auto", false, { lat: s.lat, lon: s.lon, address: s.label });
    };

    // ─── ANNONCES EN VENTE CAPTURÉES SUR LES PORTAILS (extension Patrim) ───
    const [listings, setListings] = useState<MarketListing[]>([]);
    const [listingsLoaded, setListingsLoaded] = useState(false);
    const [listingBusy, setListingBusy] = useState<string | null>(null);
    const [listingSort, setListingSort] = useState<"relevance" | "sqm" | "recent" | "drop">("relevance");
    const [listingError, setListingError] = useState("");

    const reloadListings = useCallback(async () => {
        const id = currentIdRef.current;
        if (!id) return;
        try {
            setListings(await fetchListings(id));
            setListingError("");
        } catch {
            setListingError("Impossible de charger les annonces capturées.");
        } finally {
            setListingsLoaded(true);
        }
    }, []);

    // Dossier courant : cible proposée aux captures ; annonces rechargées au retour sur l'onglet
    useEffect(() => {
        if (!currentId) return;
        try { localStorage.setItem(LAST_ESTIMATION_KEY, JSON.stringify({ id: currentId, at: Date.now() })); } catch { /* rien */ }
        void reloadListings();
        const onVisible = () => { if (document.visibilityState === "visible") void reloadListings(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [currentId, reloadListings]);

    const isListingUsed = (l: MarketListing) => data.forSaleComparables.some(c => c.listingId === l.id);

    const toggleListing = async (l: MarketListing) => {
        const used = isListingUsed(l);
        setListingBusy(l.id);
        try {
            await setListingSelected(l.id, !used);
            if (used) {
                setData(prev => ({ ...prev, forSaleComparables: prev.forSaleComparables.filter(c => c.listingId !== l.id) }));
            } else {
                const start = initialPrice(l);
                const comp: Comparable = {
                    id: `ml-${l.id}`,
                    listingId: l.id,
                    source: "portal",
                    address: [l.district, l.city].filter(Boolean).join(", ") || l.title || l.portal,
                    surface: l.surface,
                    price: l.price,
                    rooms: l.rooms,
                    photoUrl: l.photoUrl || "",
                    portal: l.otherPortals.length ? `${l.portal} +${l.otherPortals.length}` : l.portal,
                    url: l.url,
                    publishedAt: l.publishedAt,
                    firstSeenAt: l.firstSeenAt,
                    initialPrice: start > l.price ? start : undefined,
                    highlight: l.highlight,
                };
                setData(prev => ({ ...prev, forSaleComparables: [...prev.forSaleComparables.filter(c => c.listingId !== l.id), comp] }));
                // Photo copiée dans le stockage du dossier (le PDF reste complet si l'annonce est retirée)
                if (l.photoUrl) {
                    void (async () => {
                        const file = await fetchListingPhoto(l.photoUrl!);
                        const stored = file ? await uploadToStorage(file, 'annonces') : null;
                        if (stored) patchComparable('forSale', comp.id, { photoUrl: stored });
                    })();
                }
            }
            setListings(prev => prev.map(x => (x.id === l.id ? { ...x, selected: !used } : x)));
        } catch {
            setListingError("La sélection n'a pas pu être enregistrée.");
        } finally {
            setListingBusy(null);
        }
    };

    const removeListing = async (l: MarketListing) => {
        if (!confirm("Retirer cette annonce du dossier ?")) return;
        setListingBusy(l.id);
        try {
            await deleteListing(l.id);
            setListings(prev => prev.filter(x => x.id !== l.id));
            setData(prev => ({ ...prev, forSaleComparables: prev.forSaleComparables.filter(c => c.listingId !== l.id) }));
        } catch {
            setListingError("Suppression impossible.");
        } finally {
            setListingBusy(null);
        }
    };

    // Collaborateur : on reprend le dernier choisi sur ce poste pour un nouveau dossier
    useEffect(() => {
        if (existingId) return;
        try {
            const last = localStorage.getItem(LAST_AGENT_KEY);
            // Lecture unique du stockage local (indisponible au rendu serveur de /estimation/new)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (last && AGENTS.some(a => a.id === last)) setData(prev => (prev.agentId ? prev : { ...prev, agentId: last }));
        } catch { /* stockage local indisponible */ }
    }, [existingId]);


    // =========================================================================
    // VUE 2 : ÉDITEUR WIZARD
    // =========================================================================
    if (view === "EDIT") {
        const inputClass = "bg-[var(--p-field)] border-[var(--p-line)] h-14 rounded-2xl focus:border-[#d35f52] focus:ring-0 transition-colors text-[var(--p-fg)] placeholder:text-[var(--p-faint)]";
        const selectClass = "w-full bg-[var(--p-field)] border border-[var(--p-line)] h-14 rounded-2xl px-4 focus:border-[#d35f52] text-[var(--p-fg)] outline-none transition-colors appearance-none cursor-pointer";
        const isMaison = data.propertyType === "Maison";

        // Avancement réel de chaque étape (pastilles de la barre du haut)
        const stepDone: Record<number, boolean> = {
            1: !!data.propertyAddress.trim() && data.surface > 0,
            2: !!data.mainPhoto,
            3: data.soldComparables.length + data.forSaleComparables.length > 0,
            4: data.lowPrice > 0 && data.highPrice > 0 && !!data.agentId,
        };
        // Points à vérifier avant de générer l'avis de valeur
        const checklist = [
            { label: "Adresse du bien", ok: !!data.propertyAddress.trim(), step: 1 },
            { label: "Surface et pièces", ok: data.surface > 0 && data.rooms > 0, step: 1 },
            { label: "Photo de couverture", ok: !!data.mainPhoto, step: 2 },
            { label: "Ventes comparables", ok: data.soldComparables.length > 0, step: 3 },
            { label: "Fourchette de prix", ok: data.lowPrice > 0 && data.highPrice >= data.lowPrice, step: 4 },
            { label: "Collaborateur (signature)", ok: !!data.agentId, step: 4 },
        ];
        const photoBusy = (key: string) => Object.keys(uploadingPhotos).some(k => k.startsWith(key));

        return (
            <div className="patrim-ui min-h-screen font-sans pb-32 relative">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@300;400;500;600;700&display=swap');
                    .dash-font { font-family: 'Inter Tight', 'DM Sans', sans-serif; letter-spacing: -0.005em; }
                    .display-font { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.015em; }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--p-line-strong); border-radius: 2px; }
                    .editor-glow { background: radial-gradient(60% 40% at 50% 0%, var(--p-accent-soft), transparent 70%); }
                `}</style>
                <div className="editor-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]"/>

                {/* Nav Bar */}
                <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-50 flex justify-between items-center px-6 py-3 rounded-full border shadow-2xl dash-font"
                    style={{ backgroundColor: 'var(--p-glass)', backdropFilter: 'blur(24px)', borderColor: "var(--p-line)" }}>
                    <Button variant="ghost" onClick={goToMesBiens} className="text-[var(--p-muted)] hover:text-[var(--p-fg)] rounded-full gap-2 text-sm px-2 sm:px-4">
                        <ArrowLeft size={16}/> <span className="hidden sm:inline">Mes biens</span>
                    </Button>
                    {/* Étapes cliquables */}
                    <div className="flex items-center gap-1">
                        {STEPS.map(st => (
                            <button key={st.id} type="button" onClick={() => { setStep(st.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                title={stepDone[st.id] ? `${st.label} : complété` : st.label}
                                className={`flex items-center gap-1.5 h-8 rounded-full px-2.5 text-xs font-semibold transition-all ${step === st.id ? 'bg-[var(--p-hover)] text-[var(--p-fg)]' : 'text-[var(--p-muted)] hover:text-[var(--p-fg-2)]'}`}>
                                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                                    style={{ backgroundColor: stepDone[st.id] ? '#10b981' : step === st.id ? COLORS.secondary : 'var(--p-line-strong)', color: 'white' }}>
                                    {stepDone[st.id] ? <Check size={9} strokeWidth={3}/> : st.id}
                                </span>
                                <span className="hidden md:inline">{st.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <ThemeToggle/>
                        <span className="hidden lg:inline text-[11px] text-[var(--p-muted)] whitespace-nowrap">
                            {isUploading ? "Upload des photos…"
                                : saveState === "saving" ? "Enregistrement…"
                                : saveState === "error" ? <span className="text-rose-400 inline-flex items-center gap-1"><AlertCircle size={12}/> Non enregistré</span>
                                : saveState === "dirty" ? "Modifications en attente"
                                : saveState === "saved" && lastSavedAt ? `Enregistré à ${lastSavedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                : saveState === "saved" ? "Enregistré" : ""}
                        </span>
                        <Button onClick={() => handleSave(true)} disabled={isUploading || saveState === "saving"} className={`rounded-full h-9 px-5 text-sm font-semibold transition-all ${saveState === "saved" ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : saveState === "error" ? 'bg-rose-500 text-[#fff] hover:bg-rose-600' : isUploading ? 'bg-[var(--p-line-strong)] text-[var(--p-muted)] cursor-not-allowed' : 'bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] hover:opacity-90'}`}>
                            {isUploading || saveState === "saving" ? <><Loader2 size={14} className="animate-spin mr-1.5"/>{isUploading ? 'Upload…' : 'Enregistrement'}</> : saveState === "saved" ? <><Check size={14} className="mr-1.5"/>Enregistré</> : saveState === "error" ? 'Réessayer' : 'Enregistrer'}
                        </Button>
                    </div>
                </div>

                <div className="relative max-w-4xl mx-auto pt-24 px-4 dash-font">
                    <div className="rounded-[28px] p-8 md:p-10 border min-h-[600px] flex flex-col justify-between"
                        style={{ backgroundColor: "var(--p-card)", borderColor: "var(--p-line)", boxShadow: 'var(--p-shadow)' }}>
                        <AnimatePresence mode="wait">
                            {/* ÉTAPE 1 */}
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-5">
                                    <StepHeader n={1} icon={<Home size={18} className="text-[#fff]"/>} title="Le bien & le client"
                                        subtitle="Choisissez l'adresse dans les suggestions : la photo de façade se met automatiquement."/>

                                    <Section icon={<MapPin size={16}/>} title="Le bien">
                                        <Field label="Adresse du bien estimé">
                                            <AddressInput
                                                value={data.propertyAddress}
                                                onChange={text => setData(prev => ({ ...prev, propertyAddress: text, propertyLat: undefined, propertyLon: undefined }))}
                                                onSelect={selectPropertyAddress}
                                                className={`${inputClass} pr-10`}
                                                placeholder="Ex : 37 boulevard Jean Brunhes, Toulouse"
                                                autoFocus={!existingId}/>
                                            {data.propertyLat && data.propertyLon ? (
                                                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 pl-1">
                                                    <Check size={12}/> Adresse localisée
                                                    {photoBusy('mainPhoto') ? " · recherche de la photo de façade…" : data.mainPhotoAuto ? " · photo de façade ajoutée (modifiable à l'étape Photos)" : ""}
                                                </p>
                                            ) : data.propertyAddress.trim().length > 3 ? (
                                                <p className="text-[11px] text-[var(--p-muted)] pl-1">Choisissez une suggestion pour localiser le bien (photo automatique, ventes DVF).</p>
                                            ) : null}
                                        </Field>
                                        <Segmented
                                            value={data.propertyType}
                                            onChange={v => setData(prev => ({ ...prev, propertyType: v }))}
                                            options={[
                                                { value: "Appartement" as const, label: "Appartement", icon: <Building2 size={15}/> },
                                                { value: "Maison" as const, label: "Maison", icon: <Home size={15}/> },
                                                { value: "Autre" as const, label: "Autre" },
                                            ]}/>
                                        <div className={`grid grid-cols-2 gap-4 ${isMaison ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                                            <Field label="Surface (m²)">
                                                <Input type="number" inputMode="decimal" value={data.surface || ""} onChange={e => setData(prev => ({ ...prev, surface: Number(e.target.value) }))} className={inputClass} placeholder="0"/>
                                            </Field>
                                            <Field label="Pièces">
                                                <Input type="number" inputMode="numeric" value={data.rooms || ""} onChange={e => setData(prev => ({ ...prev, rooms: Number(e.target.value) }))} className={inputClass} placeholder="0"/>
                                            </Field>
                                            {isMaison ? (
                                                <>
                                                    <Field label="Parcelle (m²)">
                                                        <Input type="number" inputMode="numeric" value={data.plotSurface || ""} onChange={e => setData(prev => ({ ...prev, plotSurface: Number(e.target.value) }))} className={inputClass} placeholder="Ex : 450"/>
                                                    </Field>
                                                    <Field label="Jardin (m²)">
                                                        <Input type="number" inputMode="numeric" value={data.gardenSurface || ""} onChange={e => setData(prev => ({ ...prev, gardenSurface: Number(e.target.value) }))} className={inputClass} placeholder="Ex : 300"/>
                                                    </Field>
                                                </>
                                            ) : (
                                                <Field label="Étage">
                                                    <Input value={data.floor || ""} onChange={e => setData(prev => ({ ...prev, floor: e.target.value }))} className={inputClass} placeholder="Ex : 3, RDC…"/>
                                                </Field>
                                            )}
                                            <Field label="Construction">
                                                <Input type="number" inputMode="numeric" value={data.buildYear || ""} onChange={e => setData(prev => ({ ...prev, buildYear: Number(e.target.value) }))} className={inputClass} placeholder="Ex : 1985"/>
                                            </Field>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            {!isMaison && (
                                                <ToggleTile label="Ascenseur" icon={<ArrowUpDown size={15} className="text-[var(--p-muted)]"/>}
                                                    checked={data.hasElevator ?? false} onChange={v => setData(prev => ({ ...prev, hasElevator: v }))}/>
                                            )}
                                            <ToggleTile label="Vendu loué (occupé)" icon={<KeyRound size={15} className="text-[var(--p-muted)]"/>}
                                                checked={data.isRented ?? false} onChange={v => setData(prev => ({ ...prev, isRented: v }))}/>
                                        </div>
                                    </Section>

                                    <Section icon={<User size={16}/>} title="Le client">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <Field label="Nom du / des client(s)">
                                                <Input value={data.clientName} onChange={e => setData(prev => ({ ...prev, clientName: e.target.value }))} className={inputClass} placeholder="Ex : M. & Mme Dupont"/>
                                            </Field>
                                            <Field label="Adresse du / des demandant(s)">
                                                <AddressInput
                                                    value={data.clientAddress || ""}
                                                    onChange={text => setData(prev => ({ ...prev, clientAddress: text }))}
                                                    onSelect={s => setData(prev => ({ ...prev, clientAddress: s.label }))}
                                                    near={{ lat: data.propertyLat, lon: data.propertyLon }}
                                                    className={`${inputClass} pr-10`}
                                                    placeholder="Ex : 12 rue des Acacias, Toulouse"/>
                                            </Field>
                                        </div>
                                        {data.propertyAddress.trim() && !(data.clientAddress || "").trim() && (
                                            <button type="button" onClick={() => setData(prev => ({ ...prev, clientAddress: prev.propertyAddress }))}
                                                className="text-xs text-[var(--p-muted)] hover:text-[var(--p-fg)] inline-flex items-center gap-1.5 transition-colors">
                                                <Plus size={13}/> Le client habite le bien estimé
                                            </button>
                                        )}
                                    </Section>

                                    <Section icon={<Leaf size={16}/>} title="Performance énergétique">
                                        <div className="grid md:grid-cols-[1fr_1fr_170px] gap-5">
                                            <Field label="Classe DPE">
                                                <LetterPicker value={data.dpe} onChange={v => setData(prev => ({ ...prev, dpe: v }))}/>
                                            </Field>
                                            <Field label="Classe GES">
                                                <LetterPicker value={data.ges} onChange={v => setData(prev => ({ ...prev, ges: v }))}/>
                                            </Field>
                                            <Field label="Énergie finale (kWh)">
                                                <Input type="number" inputMode="numeric" value={data.energieFinale || ""} onChange={e => setData(prev => ({ ...prev, energieFinale: Number(e.target.value) }))} className={inputClass} placeholder="0"/>
                                            </Field>
                                        </div>
                                    </Section>

                                    <Section icon={<Banknote size={16}/>} title="Coûts de détention">
                                        <div className="grid md:grid-cols-3 gap-4 items-end">
                                            <Field label="Taxe foncière (€/an)">
                                                <Input type="number" inputMode="numeric" value={data.taxeFonciere || ""} onChange={e => setData(prev => ({ ...prev, taxeFonciere: Number(e.target.value) }))} className={inputClass} placeholder="Ex : 1 200"/>
                                            </Field>
                                            <ToggleTile label="Copropriété" icon={<Building2 size={15} className="text-[var(--p-muted)]"/>}
                                                checked={data.isCopropriete} onChange={v => setData(prev => ({ ...prev, isCopropriete: v }))}/>
                                            {data.isCopropriete && (
                                                <Field label="Charges (€/mois)">
                                                    <Input type="number" inputMode="numeric" value={data.coproFees || ""} onChange={e => setData(prev => ({ ...prev, coproFees: Number(e.target.value) }))} className={inputClass} placeholder="Ex : 150"/>
                                                </Field>
                                            )}
                                        </div>
                                    </Section>

                                    <Section icon={<FileText size={16}/>} title="Description & prestations" hint="Repris tel quel dans l'avis de valeur.">
                                        <textarea
                                            value={data.features}
                                            onChange={e => setData(prev => ({ ...prev, features: e.target.value }))}
                                            className="w-full bg-[var(--p-field)] border border-[var(--p-line)] rounded-2xl px-4 py-3.5 text-[var(--p-fg)] outline-none focus:border-[#d35f52] transition-colors resize-y text-sm leading-relaxed min-h-[96px]"
                                            placeholder="Ex : Appartement traversant refait à neuf, double exposition, parquet, cuisine équipée…"
                                            rows={3}
                                        />
                                    </Section>

                                    <Section icon={<Home size={16}/>} title="Équipements & annexes">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {ALL_AMENITIES.map(am => {
                                                const isChecked = (data.amenities ?? []).includes(am.id);
                                                return (
                                                    <button
                                                        key={am.id}
                                                        type="button"
                                                        onClick={() => setData(prev => ({ ...prev, amenities: isChecked ? (prev.amenities ?? []).filter(a => a !== am.id) : [...(prev.amenities ?? []), am.id] }))}
                                                        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-left transition-all"
                                                        style={{
                                                            backgroundColor: isChecked ? `${COLORS.secondary}18` : 'var(--p-sunken)',
                                                            borderColor: isChecked ? COLORS.secondary : 'var(--p-line-strong)',
                                                            color: isChecked ? 'var(--p-fg)' : 'var(--p-muted)',
                                                        }}>
                                                        <span className="text-sm font-semibold">{am.label}</span>
                                                        {isChecked && <CheckCircle size={14} className="ml-auto shrink-0" style={{ color: COLORS.secondary }}/>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newAmenity}
                                                onChange={e => setNewAmenity(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && newAmenity.trim()) { const v = newAmenity.trim(); setData(prev => ({ ...prev, amenities: [...(prev.amenities ?? []), v] })); setNewAmenity(""); } }}
                                                className="bg-[var(--p-field)] border-[var(--p-line)] rounded-xl h-11 text-sm"
                                                placeholder="Autre équipement (Entrée pour ajouter) : abri de jardin, climatisation…"
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => { if (newAmenity.trim()) { const v = newAmenity.trim(); setData(prev => ({ ...prev, amenities: [...(prev.amenities ?? []), v] })); setNewAmenity(""); } }}
                                                variant="outline"
                                                className="px-4 h-11 border-[var(--p-line-strong)] hover:bg-[var(--p-hover)] text-[var(--p-fg)] rounded-xl shrink-0">
                                                <Plus size={16}/>
                                            </Button>
                                        </div>
                                        {(data.amenities ?? []).filter(id => !ALL_AMENITIES.find(a => a.id === id)).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {(data.amenities ?? []).filter(id => !ALL_AMENITIES.find(a => a.id === id)).map(custom => (
                                                    <span key={custom} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--p-line-strong)] text-[var(--p-fg-2)] bg-[var(--p-hover)]">
                                                        {custom}
                                                        <button type="button" onClick={() => setData(prev => ({ ...prev, amenities: (prev.amenities ?? []).filter(a => a !== custom) }))} className="text-[var(--p-muted)] hover:text-red-400 transition-colors ml-1">
                                                            <X size={12}/>
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </Section>
                                </motion.div>
                            )}

                            {/* ÉTAPE 2 */}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-5">
                                    <StepHeader n={2} icon={<ImageIcon size={18} className="text-[#fff]"/>} title="Photos du bien"
                                        subtitle="Glissez-déposez vos photos, ou utilisez la photo de façade trouvée à partir de l'adresse."/>
                                    {photoError && <p className="text-xs text-amber-300 flex items-center gap-1.5"><AlertCircle size={13}/> {photoError}</p>}

                                    <Section icon={<Star size={16}/>} title="Photo de couverture" hint="En grand sur la première page de l'avis de valeur.">
                                        <div className="grid md:grid-cols-[1fr_210px] gap-4">
                                            <div className="relative border-2 border-dashed rounded-3xl h-60 flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all"
                                                style={{ borderColor: data.mainPhoto ? COLORS.primary : 'var(--p-line-strong)', backgroundColor: 'var(--p-sunken)' }}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={e => { const [f] = droppedImages(e); if (f) void uploadPhotoFile(f, 'mainPhoto'); }}>
                                                {photoBusy('mainPhoto')
                                                    ? <div className="flex flex-col items-center gap-2 text-[var(--p-muted)]"><Loader2 className="animate-spin" size={32}/><span className="text-sm">{uploadingPhotos['mainPhoto-auto'] ? "Recherche de la photo…" : "Compression & envoi…"}</span></div>
                                                    : data.mainPhoto
                                                        ? <img src={data.mainPhoto} alt="Photo de couverture" className="absolute inset-0 w-full h-full object-cover opacity-90"/>
                                                        : <div className="text-center text-[var(--p-faint)] flex flex-col items-center gap-2"><UploadCloud size={32}/><span className="text-sm font-medium">Cliquez ou déposez une photo</span></div>}
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'mainPhoto')} className="absolute inset-0 opacity-0 cursor-pointer" disabled={photoBusy('mainPhoto')}/>
                                                {data.mainPhoto && !photoBusy('mainPhoto') && (
                                                    <button type="button" title="Retirer la photo" onClick={() => setData(prev => ({ ...prev, mainPhoto: "", mainPhotoAuto: null }))}
                                                        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: COLORS.primary }}>
                                                        <X size={13} className="text-[#fff]"/>
                                                    </button>
                                                )}
                                                {data.mainPhoto && data.mainPhotoAuto?.credit && !photoBusy('mainPhoto') && (
                                                    <span className="absolute left-3 bottom-3 z-10 text-[10px] text-[rgba(255,255,255,0.85)] bg-[rgba(0,0,0,0.6)] px-2 py-1 rounded-lg pointer-events-none">{data.mainPhotoAuto.credit}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <p className="text-[11px] text-[var(--p-muted)] leading-snug">Sans capture d&apos;écran : vue prise depuis la rue (ou vue aérienne), trouvée à partir de l&apos;adresse du bien.</p>
                                                <Button type="button" onClick={() => setMainAutoPhoto("auto")} disabled={!data.propertyAddress.trim() || photoBusy('mainPhoto')}
                                                    className="h-11 rounded-xl bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] hover:opacity-90 font-semibold justify-start">
                                                    <Camera size={16} className="mr-2"/> Façade (auto)
                                                </Button>
                                                {data.mainPhotoAuto && (
                                                    <Button type="button" variant="outline" onClick={() => setMainAutoPhoto("auto", true)} disabled={photoBusy('mainPhoto')}
                                                        className="h-11 rounded-xl border-[var(--p-line-strong)] bg-transparent hover:bg-[var(--p-hover)] text-[var(--p-fg)] justify-start">
                                                        <RefreshCw size={16} className="mr-2"/> Autre vue
                                                    </Button>
                                                )}
                                                <Button type="button" variant="outline" onClick={() => setMainAutoPhoto("aerien")} disabled={!data.propertyAddress.trim() || photoBusy('mainPhoto')}
                                                    className="h-11 rounded-xl border-[var(--p-line-strong)] bg-transparent hover:bg-[var(--p-hover)] text-[var(--p-fg)] justify-start">
                                                    <Satellite size={16} className="mr-2"/> Vue aérienne
                                                </Button>
                                                {!data.propertyAddress.trim() && <p className="text-[11px] text-amber-300/80">Renseignez d&apos;abord l&apos;adresse du bien (étape 1).</p>}
                                            </div>
                                        </div>
                                    </Section>

                                    <Section icon={<ImageIcon size={16}/>} title="Photos du bien"
                                        hint="★ mettre en couverture · « Page 2 » afficher à côté des caractéristiques (3 max) · dossier photo en fin d'avis (8 max)"
                                        action={<span className="text-xs font-mono text-[var(--p-muted)]">{(data.extraPhotos ?? []).length} / 8</span>}>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => { const files = droppedImages(e); if (files.length) void handleExtraPhotosUpload(files); }}>
                                            {(data.extraPhotos ?? []).map((url, i) => {
                                                const onPage2 = data.secondaryPhotos.includes(url);
                                                const isCover = data.mainPhoto === url;
                                                return (
                                                    <div key={`${url}-${i}`} className="relative rounded-2xl overflow-hidden border aspect-[4/3]" style={{ borderColor: onPage2 ? COLORS.secondary : "var(--p-line)" }}>
                                                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover"/>
                                                        <div className="absolute inset-x-0 bottom-0 p-1.5 flex items-center gap-1 bg-gradient-to-t from-[rgba(0,0,0,0.85)] to-transparent">
                                                            <button type="button" title="Mettre en photo de couverture"
                                                                onClick={() => setData(prev => ({ ...prev, mainPhoto: url, mainPhotoAuto: null }))}
                                                                className={`h-6 px-2 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors ${isCover ? 'bg-amber-400 text-[#000]' : 'bg-[rgba(0,0,0,0.6)] text-[#fff] hover:bg-[rgba(0,0,0,0.9)]'}`}>
                                                                <Star size={10} className={isCover ? 'fill-black' : ''}/>{isCover ? 'Couverture' : ''}
                                                            </button>
                                                            <button type="button" title="Afficher en page 2 de l'avis" disabled={!onPage2 && data.secondaryPhotos.length >= 3}
                                                                onClick={() => setData(prev => ({ ...prev, secondaryPhotos: prev.secondaryPhotos.includes(url) ? prev.secondaryPhotos.filter(u => u !== url) : [...prev.secondaryPhotos, url].slice(0, 3) }))}
                                                                className={`h-6 px-2 rounded-full text-[10px] font-bold text-[#fff] transition-colors disabled:opacity-40 ${onPage2 ? '' : 'bg-[rgba(0,0,0,0.6)] hover:bg-[rgba(0,0,0,0.9)]'}`}
                                                                style={onPage2 ? { backgroundColor: COLORS.secondary } : undefined}>
                                                                Page 2
                                                            </button>
                                                            <button type="button" title="Supprimer la photo"
                                                                onClick={() => setData(prev => ({ ...prev, extraPhotos: (prev.extraPhotos ?? []).filter((_, idx) => idx !== i), secondaryPhotos: prev.secondaryPhotos.filter(u => u !== url) }))}
                                                                className="ml-auto w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
                                                                <X size={11} className="text-[#fff]"/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {(data.extraPhotos ?? []).length < 8 && (
                                                <div className="relative border-2 border-dashed rounded-2xl aspect-[4/3] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#d35f52]/50 gap-1"
                                                    style={{ borderColor: uploadingPhotos['extra'] ? COLORS.secondary : 'var(--p-line-strong)', backgroundColor: 'var(--p-sunken)' }}>
                                                    {uploadingPhotos['extra']
                                                        ? <><Loader2 className="animate-spin text-[var(--p-muted)]" size={20}/><span className="text-[10px] text-[var(--p-faint)] font-medium">Envoi…</span></>
                                                        : <><Plus className="text-[var(--p-faint)]" size={22}/><span className="text-[10px] text-[var(--p-faint)] font-medium text-center px-2">Ajouter ou déposer<br/>plusieurs photos</span></>}
                                                    <input type="file" accept="image/*" multiple
                                                        onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; void handleExtraPhotosUpload(files); }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        disabled={!!uploadingPhotos['extra']}/>
                                                </div>
                                            )}
                                        </div>
                                        {data.secondaryPhotos.length > 0 && (
                                            <p className="text-[11px] text-[var(--p-muted)] flex items-center gap-2">
                                                Page 2 : {data.secondaryPhotos.length} / 3 photo{data.secondaryPhotos.length > 1 ? 's' : ''}
                                                <button type="button" onClick={() => setData(prev => ({ ...prev, secondaryPhotos: [] }))} className="underline underline-offset-2 hover:text-[var(--p-fg)]">vider</button>
                                            </p>
                                        )}
                                    </Section>

                                    <Section icon={<Globe size={16}/>} title="Importer depuis une annonce" hint="Si le bien est déjà en ligne, collez le lien pour récupérer ses photos (et le prix).">
                                        <div className="flex gap-3 w-full flex-col sm:flex-row">
                                            <Input value={listingUrl} onChange={e => setListingUrl(e.target.value)} placeholder="https://www.patrim.fr/..." className="flex-1 bg-[var(--p-field)] border-[var(--p-line-strong)] h-12 rounded-xl text-sm text-[var(--p-fg)] focus:border-[#d35f52]"/>
                                            <Button onClick={handleImportFromUrl} disabled={isScraping} className="h-12 px-6 rounded-xl font-bold bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] hover:opacity-90 transition-colors">
                                                {isScraping ? <Loader2 className="animate-spin mr-2" size={18}/> : <Wand2 size={18} className="mr-2"/>} Importer
                                            </Button>
                                        </div>
                                    </Section>
                                </motion.div>
                            )}

                            {/* ÉTAPE 3 */}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-8">
                                    <StepHeader n={3} icon={<TrendingUp size={18} className="text-[#fff]"/>} title="Analyse du marché"
                                        subtitle="Les photos des biens comparables se mettent automatiquement à partir de leur adresse."/>

                                    {/* ── RECHERCHE DVF (ventes réelles) ── */}
                                    <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.18)' }}>
                                        <div className="flex items-start justify-between gap-4 flex-wrap">
                                            <div className="flex-1 min-w-[260px]">
                                                <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2"><Search size={15}/> Ventes réelles DVF</h3>
                                                <p className="text-xs text-[var(--p-muted)] mt-1">Actes notariés publiés par l&apos;État (data.gouv) — {data.propertyType === "Maison" ? "maisons" : "appartements"} de {data.surface ? formatSurface(data.surface) : "…"} m² ± {Math.round(dvfTolerance * 100)} % autour de l&apos;adresse du bien.</p>
                                            </div>
                                            {data.marketStats && (
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase tracking-widest text-[var(--p-muted)] font-semibold">Médiane secteur</p>
                                                    <p className="text-lg font-black text-[var(--p-fg)]">{formatPrice(data.marketStats.median)} <span className="text-xs text-[var(--p-muted)] font-semibold">€/m²</span></p>
                                                    <p className="text-[10px] text-[var(--p-muted)]">{data.marketStats.count} ventes · {data.marketStats.radius >= 1000 ? `${data.marketStats.radius / 1000} km` : `${data.marketStats.radius} m`} · {data.marketStats.years[0]}–{data.marketStats.years[data.marketStats.years.length - 1]}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <select value={dvfRadius} onChange={e => setDvfRadius(Number(e.target.value))}
                                                className="bg-[var(--p-field)] border border-[var(--p-line-strong)] text-xs text-[var(--p-fg)] outline-none px-3 h-9 rounded-xl cursor-pointer">
                                                {[100, 250, 500, 1000, 2000].map(r => <option key={r} value={r} className="bg-[var(--p-card)]">Rayon {r >= 1000 ? `${r / 1000} km` : `${r} m`}</option>)}
                                            </select>
                                            <select value={dvfTolerance} onChange={e => setDvfTolerance(Number(e.target.value))}
                                                className="bg-[var(--p-field)] border border-[var(--p-line-strong)] text-xs text-[var(--p-fg)] outline-none px-3 h-9 rounded-xl cursor-pointer">
                                                {[0.1, 0.15, 0.25, 0.35].map(t => <option key={t} value={t} className="bg-[var(--p-card)]">Surface ± {Math.round(t * 100)} %</option>)}
                                            </select>
                                            {data.rooms > 0 && (
                                                <label className="flex items-center gap-2 bg-[var(--p-field)] border border-[var(--p-line-strong)] px-3 h-9 rounded-xl text-xs text-[var(--p-fg-2)] cursor-pointer">
                                                    <input type="checkbox" checked={dvfSameRooms} onChange={e => setDvfSameRooms(e.target.checked)} className="accent-emerald-500"/>
                                                    {data.rooms} pièces ± 1
                                                </label>
                                            )}
                                            <Button onClick={handleAutoGenerateDVF} disabled={isGeneratingComps} size="sm" className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-xl h-9 px-4 text-xs font-bold">
                                                {isGeneratingComps ? <Loader2 size={13} className="animate-spin mr-1.5"/> : <Wand2 size={13} className="mr-1.5"/>}
                                                {isGeneratingComps ? "Recherche (≈ 5 s)…" : "Rechercher les ventes"}
                                            </Button>
                                        </div>
                                        {dvfError && <p className="text-xs text-amber-300 flex items-center gap-1.5"><AlertCircle size={13}/> {dvfError}</p>}
                                        {dvfInfo && <p className="text-xs text-emerald-300 flex items-center gap-1.5"><Check size={13}/> {dvfInfo}</p>}

                                        {dvfResults && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-xs text-[var(--p-muted)] flex-wrap gap-2">
                                                    <span>
                                                        <b className="text-[#fff]">{dvfResults.stats?.count ?? dvfResults.sales.length}</b> ventes comparables ({dvfResults.years[0]}–{dvfResults.years[dvfResults.years.length - 1]})
                                                        {dvfResults.stats && <> · médiane <b className="text-[#fff]">{formatPrice(dvfResults.stats.median)} €/m²</b> · 50 % entre {formatPrice(dvfResults.stats.p25)} et {formatPrice(dvfResults.stats.p75)} €/m²</>}
                                                    </span>
                                                    <button onClick={() => { setDvfResults(null); setDvfSelected(new Set()); }} className="text-[var(--p-muted)] hover:text-[var(--p-fg)]">Fermer</button>
                                                </div>
                                                <div className="max-h-[340px] overflow-y-auto custom-scrollbar rounded-xl border border-[var(--p-line)] divide-y divide-[var(--p-line)]">
                                                    {dvfResults.sales.slice(0, dvfVisible).map(sale => {
                                                        const checked = dvfSelected.has(sale.id);
                                                        return (
                                                            <label key={sale.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-emerald-500/10' : 'hover:bg-[var(--p-hover)]'}`}>
                                                                <input type="checkbox" checked={checked} className="accent-emerald-500 shrink-0"
                                                                    onChange={() => setDvfSelected(prev => { const n = new Set(prev); if (n.has(sale.id)) n.delete(sale.id); else n.add(sale.id); return n; })}/>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-[var(--p-fg)] truncate">{sale.address}</p>
                                                                    <p className="text-[11px] text-[var(--p-muted)]">
                                                                        {new Date(sale.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatSurface(sale.surface)} m² · {sale.rooms} p. · à {sale.distance} m
                                                                        {sale.dependances > 0 && ` · +${sale.dependances} dépendance${sale.dependances > 1 ? 's' : ''}`}
                                                                        {sale.landSurface > 0 && ` · terrain ${formatPrice(sale.landSurface)} m²`}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-sm font-bold text-[var(--p-fg)]">{formatPrice(sale.price)} €</p>
                                                                    <p className="text-[11px] text-emerald-300 font-semibold">{formatPrice(sale.pricePerSqm)} €/m²</p>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-[11px] text-[var(--p-muted)]">
                                                        Triées par pertinence (récence, surface, distance)
                                                        {dvfResults.sales.length > dvfVisible && (
                                                            <> · <button onClick={() => setDvfVisible(v => v + 30)} className="text-[var(--p-fg-2)] underline underline-offset-2 hover:text-[var(--p-fg)]">afficher {Math.min(30, dvfResults.sales.length - dvfVisible)} de plus</button></>
                                                        )}
                                                    </span>
                                                    <Button onClick={addSelectedDvf} disabled={dvfSelected.size === 0} className="rounded-xl h-9 px-4 text-xs font-bold bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] hover:opacity-90">
                                                        <Plus size={14} className="mr-1"/> Ajouter {dvfSelected.size} vente{dvfSelected.size > 1 ? 's' : ''} aux comparables
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── ANNONCES EN VENTE SUR LES PORTAILS (capture en 1 clic) ── */}
                                    {(() => {
                                        const S = Number(data.surface) || 0;
                                        const central = centralPrice(data.lowPrice, data.highPrice);
                                        const refSqm = central && S ? central / S : data.marketStats?.median || 0;
                                        const sqms = listings.map(pricePerSqm).filter(v => v > 0);
                                        const medSqm = median(sqms);
                                        const ages = listings.map(l => daysOnline(l)).filter((v): v is number => v !== null);
                                        const medAge = median(ages);
                                        const withDrop = listings.filter(l => priceDrop(l)).length;
                                        const dvfGap = medSqm && data.marketStats?.median ? Math.round(((medSqm - data.marketStats.median) / data.marketStats.median) * 100) : null;
                                        const sorted = [...listings].sort((a, b) =>
                                            listingSort === "sqm" ? pricePerSqm(a) - pricePerSqm(b)
                                            : listingSort === "recent" ? (b.publishedAt || b.firstSeenAt).localeCompare(a.publishedAt || a.firstSeenAt)
                                            : listingSort === "drop" ? (priceDrop(b)?.pct ?? 0) - (priceDrop(a)?.pct ?? 0)
                                            : (b.relevance ?? 0) - (a.relevance ?? 0));
                                        const usedCount = listings.filter(isListingUsed).length;
                                        return (
                                            <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--p-accent-soft)', borderColor: 'var(--p-line)' }}>
                                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                                    <div className="flex-1 min-w-[260px]">
                                                        <h3 className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2"><Globe size={15} className="text-[var(--p-accent)]"/> Annonces en vente sur les portails</h3>
                                                        <p className="text-xs text-[var(--p-muted)] mt-1">
                                                            Capturées en un clic depuis Leboncoin, SeLoger, Bien&apos;ici, PAP… avec l&apos;extension Patrim. Cochez celles à citer dans l&apos;avis de valeur.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a href="/capture/installer" target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-xl border border-[var(--p-line-strong)] text-xs font-semibold text-[var(--p-fg)] hover:bg-[var(--p-hover)] inline-flex items-center gap-1.5">
                                                            Comment capturer ?
                                                        </a>
                                                        <button type="button" onClick={() => void reloadListings()} disabled={!currentId} title="Actualiser"
                                                            className="h-9 w-9 rounded-xl border border-[var(--p-line-strong)] text-[var(--p-fg)] hover:bg-[var(--p-hover)] inline-flex items-center justify-center disabled:opacity-40">
                                                            <RefreshCw size={14}/>
                                                        </button>
                                                    </div>
                                                </div>

                                                {!currentId ? (
                                                    <p className="text-xs text-[var(--p-muted)]">Renseignez l&apos;adresse du bien (étape 1) : le dossier est créé et peut recevoir des annonces.</p>
                                                ) : listings.length === 0 ? (
                                                    <div className="grid sm:grid-cols-3 gap-3">
                                                        {[
                                                            ["1", "Sur le portail", "Faites votre recherche comme d'habitude (ville, surface, pièces)."],
                                                            ["2", "Un clic sur l'icône Patrim", "Toutes les annonces affichées sont lues et analysées par l'IA."],
                                                            ["3", "Revenez ici", "Les annonces apparaissent : cochez celles à citer dans l'avis."],
                                                        ].map(([n, title, text]) => (
                                                            <div key={n} className="rounded-xl border border-[var(--p-line)] p-3.5" style={{ backgroundColor: 'var(--p-card)' }}>
                                                                <p className="text-[11px] font-semibold text-[var(--p-accent)]">Étape {n}</p>
                                                                <p className="text-sm font-semibold text-[var(--p-fg)] mt-0.5">{title}</p>
                                                                <p className="text-xs text-[var(--p-muted)] mt-1">{text}</p>
                                                            </div>
                                                        ))}
                                                        {listingsLoaded && <p className="sm:col-span-3 text-[11px] text-[var(--p-faint)]">Aucune annonce capturée pour ce dossier pour l&apos;instant.</p>}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            {[
                                                                ["Annonces", `${listings.length}`, usedCount ? `${usedCount} dans l'avis` : "aucune retenue"],
                                                                ["Prix affiché médian", medSqm ? `${formatPrice(Math.round(medSqm))} €/m²` : "—", dvfGap !== null ? `${dvfGap > 0 ? "+" : ""}${dvfGap} % vs ventes DVF` : "sur les annonces capturées"],
                                                                ["En ligne depuis", medAge ? `${Math.round(medAge)} j` : "—", "médiane"],
                                                                ["Baisses de prix", `${withDrop}`, listings.length ? `${Math.round((withDrop / listings.length) * 100)} % des annonces` : ""],
                                                            ].map(([label, value, sub]) => (
                                                                <div key={label} className="rounded-xl border border-[var(--p-line)] px-3.5 py-3" style={{ backgroundColor: 'var(--p-card)' }}>
                                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--p-muted)] font-semibold">{label}</p>
                                                                    <p className="text-lg font-semibold text-[var(--p-fg)] mt-0.5">{value}</p>
                                                                    <p className="text-[10px] text-[var(--p-muted)]">{sub}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                            <div className="flex gap-1 p-1 rounded-xl border border-[var(--p-line)]" style={{ backgroundColor: 'var(--p-card)' }}>
                                                                {([["relevance", "Pertinence"], ["sqm", "€/m²"], ["recent", "Plus récentes"], ["drop", "Baisses"]] as const).map(([k, label]) => (
                                                                    <button key={k} type="button" onClick={() => setListingSort(k)}
                                                                        className={`h-7 px-3 rounded-lg text-[11px] font-semibold transition-colors ${listingSort === k ? 'bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)]' : 'text-[var(--p-muted)] hover:text-[var(--p-fg)]'}`}>
                                                                        {label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {refSqm > 0 && <p className="text-[11px] text-[var(--p-muted)]">Écarts calculés par rapport à {central ? "votre prix central" : "la médiane DVF"} : {formatPrice(Math.round(refSqm))} €/m²</p>}
                                                        </div>
                                                        <div className="grid sm:grid-cols-2 gap-4">
                                                            {sorted.map(l => (
                                                                <ListingCard key={l.id} listing={{ ...l, selected: isListingUsed(l) }} refSqm={refSqm || undefined}
                                                                    busy={listingBusy === l.id} onToggle={() => void toggleListing(l)} onDelete={() => void removeListing(l)}/>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                                {listingError && <p className="text-xs text-[var(--p-negative)] flex items-center gap-1.5"><AlertCircle size={13}/> {listingError}</p>}
                                            </div>
                                        );
                                    })()}

                                    {(missingCompPhotos.length > 0 || compPhotoError) && (
                                        <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border px-4 py-3" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
                                            <div className="text-xs text-[var(--p-muted)] space-y-1">
                                                {missingCompPhotos.length > 0 && (
                                                    <p className="flex items-center gap-2"><Camera size={14} className="text-[var(--p-muted)]"/>{missingCompPhotos.length} comparable{missingCompPhotos.length > 1 ? 's' : ''} sans photo</p>
                                                )}
                                                {compPhotoError && <p className="flex items-center gap-2 text-amber-300"><AlertCircle size={13}/>{compPhotoError}</p>}
                                            </div>
                                            {missingCompPhotos.length > 0 && (
                                                <Button type="button" size="sm" onClick={() => void fillComparablePhotos(missingCompPhotos)} disabled={photoBusy('comp-')}
                                                    className="rounded-xl h-8 px-3 text-xs font-bold bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] hover:opacity-90">
                                                    {photoBusy('comp-') ? <Loader2 size={13} className="animate-spin mr-1.5"/> : <Wand2 size={13} className="mr-1.5"/>}
                                                    Ajouter les photos automatiquement
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {(['sold', 'forSale'] as const).map(type => {
                                        const list = type === 'sold' ? data.soldComparables : data.forSaleComparables;
                                        const med = median(list.map(sqmOf));
                                        return (
                                        <div key={type}>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-baseline gap-3">
                                                    <h3 className="text-base font-bold text-[var(--p-fg)]">{type === 'sold' ? '🟢 Biens Vendus' : '🟡 En Vente actuellement'}</h3>
                                                    {list.length > 0 && med > 0 && <span className="text-xs text-[var(--p-muted)]">médiane {formatPrice(Math.round(med))} €/m²</span>}
                                                </div>
                                                <Button onClick={() => {
                                                    const newComp: Comparable = { id: Date.now().toString(), address: "", surface: 0, price: 0, photoUrl: "", source: "manual" };
                                                    setData(prev => type === 'sold'
                                                        ? { ...prev, soldComparables: [...prev.soldComparables, newComp] }
                                                        : { ...prev, forSaleComparables: [...prev.forSaleComparables, newComp] });
                                                }} variant="outline" size="sm" className="border-[var(--p-line-strong)] hover:bg-[var(--p-hover)] text-[var(--p-fg)] rounded-xl h-8">
                                                    <Plus size={15} className="mr-1"/> Ajouter
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {list.map(comp => {
                                                    const isUploadingPhoto = !!uploadingPhotos[`comp-${comp.id}`];
                                                    const sqm = comp.price > 0 && comp.surface > 0 ? Math.round(comp.price / comp.surface) : 0;
                                                    return (
                                                    <div key={comp.id} className="flex flex-wrap md:flex-nowrap gap-3 p-3 rounded-2xl border items-center relative pr-12" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
                                                        <div className="w-24 h-16 shrink-0 relative border border-dashed rounded-xl flex items-center justify-center overflow-hidden"
                                                            style={{ borderColor: isUploadingPhoto ? COLORS.secondary : comp.photoUrl ? 'transparent' : 'var(--p-line-strong)' }}
                                                            onDragOver={e => e.preventDefault()}
                                                            onDrop={async e => {
                                                                const [f] = droppedImages(e);
                                                                if (!f) return;
                                                                const key = `comp-${comp.id}`;
                                                                setUploadingPhotos(p => ({ ...p, [key]: true }));
                                                                const url = await uploadToStorage(f, 'comparables');
                                                                setUploadingPhotos(p => { const n = { ...p }; delete n[key]; return n; });
                                                                if (url) patchComparable(type, comp.id, { photoUrl: url, photoAuto: null });
                                                            }}>
                                                            {isUploadingPhoto
                                                                ? <Loader2 className="animate-spin text-[var(--p-muted)]" size={18}/>
                                                                : comp.photoUrl
                                                                    ? <img src={comp.photoUrl} alt="" className="w-full h-full object-cover"/>
                                                                    : (
                                                                        <button type="button" disabled={!comp.address.trim() && !(comp.lat && comp.lon)}
                                                                            onClick={() => void setComparableAutoPhoto(type, comp)}
                                                                            title={comp.address.trim() ? "Trouver la photo à partir de l'adresse" : "Renseignez l'adresse"}
                                                                            className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[var(--p-muted)] hover:text-[var(--p-fg)] disabled:hover:text-[var(--p-muted)] disabled:opacity-50 transition-colors">
                                                                            <Camera size={16}/>
                                                                            <span className="text-[9px] font-semibold">Photo auto</span>
                                                                        </button>
                                                                    )}
                                                            {!isUploadingPhoto && (
                                                                <div className="absolute bottom-1 right-1 flex gap-1 z-10">
                                                                    {comp.photoUrl && (comp.address.trim() || (comp.lat && comp.lon)) && (
                                                                        <button type="button" title={comp.photoAuto ? "Autre vue" : "Remplacer par la photo automatique"}
                                                                            onClick={() => void setComparableAutoPhoto(type, comp, !!comp.photoAuto)}
                                                                            className="w-5 h-5 rounded-full bg-[rgba(0,0,0,0.7)] hover:bg-[#000] flex items-center justify-center text-[#fff]">
                                                                            <RefreshCw size={10}/>
                                                                        </button>
                                                                    )}
                                                                    <label title="Importer une photo" className="w-5 h-5 rounded-full bg-[rgba(0,0,0,0.7)] hover:bg-[#000] flex items-center justify-center text-[#fff] cursor-pointer">
                                                                        <UploadCloud size={10}/>
                                                                        <input type="file" accept="image/*" onChange={(e) => handleComparableImageUpload(e, type, comp.id)} className="hidden"/>
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-[180px]">
                                                            <AddressInput
                                                                placeholder="Adresse du bien"
                                                                value={comp.address}
                                                                onChange={text => patchComparable(type, comp.id, { address: text, lat: undefined, lon: undefined })}
                                                                onSelect={s => selectComparableAddress(type, comp, s)}
                                                                near={{ lat: data.propertyLat, lon: data.propertyLon }}
                                                                className="bg-transparent border-[var(--p-line)] rounded-xl pr-9"/>
                                                            {(comp.source === "dvf" || comp.source === "portal" || sqm > 0) && (
                                                                <p className="text-[10px] text-[var(--p-muted)] mt-1 pl-1">
                                                                    {comp.source === "dvf" && <span className="text-emerald-400 font-semibold">DVF</span>}
                                                                    {comp.source === "dvf" && comp.distance !== undefined && ` · à ${comp.distance} m`}
                                                                    {comp.source === "portal" && (
                                                                        <a href={comp.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: COLORS.secondary }}>{comp.portal}</a>
                                                                    )}
                                                                    {comp.source === "portal" && (() => { const d = daysOnline({ publishedAt: comp.publishedAt, firstSeenAt: comp.firstSeenAt || "" }); return d !== null ? ` · en ligne depuis ${d} j` : ""; })()}
                                                                    {comp.source === "portal" && comp.initialPrice && comp.initialPrice > comp.price ? ` · baisse de ${formatPrice(comp.initialPrice - comp.price)} €` : ""}
                                                                    {sqm > 0 && `${comp.source === "dvf" || comp.source === "portal" ? " · " : ""}${formatPrice(sqm)} €/m²`}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {type === 'sold' && (
                                                            <Input type="date" title="Date de vente" value={comp.soldDate || ""} onChange={e => updateComparable(type, comp.id, 'soldDate', e.target.value)} className="w-36 bg-transparent border-[var(--p-line)] rounded-xl text-xs text-[var(--p-fg-2)] [color-scheme:dark]"/>
                                                        )}
                                                        <Input type="number" placeholder="m²" value={comp.surface||""} onChange={e => updateComparable(type, comp.id, 'surface', Number(e.target.value))} className="w-20 bg-transparent border-[var(--p-line)] rounded-xl text-center"/>
                                                        <Input type="number" placeholder="Prix €" value={comp.price||""} onChange={e => updateComparable(type, comp.id, 'price', Number(e.target.value))} className="w-32 bg-transparent border-[var(--p-line)] rounded-xl font-bold" style={{ color: COLORS.secondary }}/>
                                                        <button onClick={() => setData(prev => {
                                                            const l = type === 'sold' ? prev.soldComparables : prev.forSaleComparables;
                                                            const updated = l.filter(c => c.id !== comp.id);
                                                            return type === 'sold' ? { ...prev, soldComparables: updated } : { ...prev, forSaleComparables: updated };
                                                        })} className="absolute right-4 text-[var(--p-faint)] hover:text-red-400 transition-colors">
                                                            <Trash2 size={15}/>
                                                        </button>
                                                    </div>
                                                    );
                                                })}
                                                {list.length === 0 && (
                                                    <div className="text-center py-6 text-sm text-[var(--p-muted)] italic border border-dashed border-[var(--p-line-strong)] rounded-2xl">
                                                        {type === 'sold' ? "Lancez une recherche DVF ci-dessus ou ajoutez une vente manuellement." : "Ajoutez les biens concurrents actuellement en vente (prix affichés)."}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </motion.div>
                            )}

                            {/* ÉTAPE 4 */}
                            {step === 4 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-6">
                                    <StepHeader n={4} icon={<CheckCircle size={18} className="text-[#fff]"/>} title="Bilan expert"
                                        subtitle="Points forts et faibles, valeur retenue et conclusion."/>

                                    {/* Contrôle avant génération du PDF */}
                                    <div className="rounded-2xl border px-4 py-3 flex items-center gap-2 flex-wrap" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
                                        {checklist.every(c => c.ok) ? (
                                            <p className="text-xs text-emerald-300 flex items-center gap-1.5 font-semibold"><CheckCircle size={14}/> Dossier complet : prêt pour le PDF</p>
                                        ) : (
                                            <>
                                                <span className="text-xs text-[var(--p-muted)] font-semibold mr-1">À compléter :</span>
                                                {checklist.filter(c => !c.ok).map(c => (
                                                    <button key={c.label} type="button" onClick={() => { setStep(c.step); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-amber-400/30 text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 transition-colors">
                                                        {c.label}{c.step !== 4 ? ` · étape ${c.step}` : ""}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5">
                                        {([
                                            { key: "strengths", title: "Points forts", icon: <ThumbsUp size={15}/>, color: "text-emerald-400", dot: "bg-emerald-400", value: newStrength, setValue: setNewStrength, suggestions: suggestStrengths(data) },
                                            { key: "weaknesses", title: "Points faibles", icon: <ThumbsDown size={15}/>, color: "text-rose-400", dot: "bg-rose-400", value: newWeakness, setValue: setNewWeakness, suggestions: suggestWeaknesses(data) },
                                        ] as const).map(col => {
                                            const items = data[col.key];
                                            const add = (text: string) => {
                                                const t = text.trim();
                                                if (t) setData(prev => (prev[col.key].includes(t) ? prev : { ...prev, [col.key]: [...prev[col.key], t] }));
                                            };
                                            return (
                                                <div key={col.key} className="space-y-3 p-5 rounded-2xl border" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
                                                    <h3 className={`text-sm font-bold ${col.color} flex items-center gap-2 uppercase tracking-widest`}>{col.icon} {col.title}</h3>
                                                    <div className="flex gap-2">
                                                        <Input value={col.value} onChange={e => col.setValue(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter' && col.value.trim()) { add(col.value); col.setValue(""); } }}
                                                            className="bg-[var(--p-field)] border-[var(--p-line)] rounded-xl" placeholder="Saisir puis Entrée…"/>
                                                        <Button type="button" onClick={() => { if (col.value.trim()) { add(col.value); col.setValue(""); } }} variant="outline" className="px-3 border-[var(--p-line-strong)] hover:bg-[var(--p-hover)] rounded-xl"><Plus size={15}/></Button>
                                                    </div>
                                                    {items.length > 0 && (
                                                        <ul className="space-y-1.5">
                                                            {items.map((s, i) => (
                                                                <li key={`${s}-${i}`} className="flex justify-between items-center gap-2 text-sm bg-[var(--p-hover)] px-3 py-2 rounded-xl border border-[var(--p-line)]">
                                                                    <span className="text-[var(--p-fg)] flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.dot}`}/>{s}</span>
                                                                    <button type="button" title="Retirer" onClick={() => setData(prev => ({ ...prev, [col.key]: prev[col.key].filter((_, idx) => idx !== i) }))}>
                                                                        <X size={13} className="text-[var(--p-faint)] hover:text-red-400"/>
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {col.suggestions.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-widest text-[var(--p-faint)] font-semibold mb-1.5">Suggestions · un clic pour ajouter</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {col.suggestions.slice(0, 10).map(sg => (
                                                                    <button key={sg} type="button" onClick={() => add(sg)}
                                                                        className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--p-line-strong)] text-[var(--p-muted)] hover:text-[var(--p-fg)] hover:border-[var(--p-line-strong)] transition-colors">
                                                                        + {sg}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ── AIDE AU PRIX : références marché ── */}
                                    {(() => {
                                        const S = Number(data.surface) || 0;
                                        const soldMed = median(data.soldComparables.map(sqmOf));
                                        const saleMed = median(data.forSaleComparables.map(sqmOf));
                                        const ms = data.marketStats;
                                        if (!S || (!soldMed && !saleMed && !ms)) return null;
                                        const ref = soldMed || ms?.median || saleMed;
                                        const round1k = (v: number) => Math.round(v / 1000) * 1000;
                                        const suggestion = { low: round1k(ref * S * 0.97), high: round1k(ref * S * 1.03) };
                                        const central = centralPrice(data.lowPrice, data.highPrice);
                                        const gap = central && ref ? Math.round(((central / S - ref) / ref) * 100) : null;
                                        const refRows: { label: string; sqm: number; value: string }[] = [];
                                        if (soldMed) refRows.push({ label: `Ventes retenues (${data.soldComparables.length})`, sqm: soldMed, value: `${formatPrice(round1k(soldMed * S))} €` });
                                        if (ms) refRows.push({ label: `Marché DVF · ${ms.count} ventes à ${ms.radius >= 1000 ? `${ms.radius / 1000} km` : `${ms.radius} m`}`, sqm: ms.median, value: `${formatPrice(round1k(ms.p25 * S))} – ${formatPrice(round1k(ms.p75 * S))} €` });
                                        if (saleMed) refRows.push({ label: `En vente (${data.forSaleComparables.length}) · prix affichés`, sqm: saleMed, value: `${formatPrice(round1k(saleMed * S))} €` });
                                        return (
                                            <div className="p-5 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-[var(--p-fg-2)]"><Target size={15}/> Références pour {formatSurface(S)} m²</h3>
                                                    <Button type="button" onClick={() => setData(prev => ({ ...prev, lowPrice: suggestion.low, highPrice: suggestion.high }))}
                                                        variant="outline" size="sm" className="border-[var(--p-line-strong)] hover:bg-[var(--p-hover)] text-[var(--p-fg)] rounded-xl h-8 text-xs">
                                                        <Wand2 size={13} className="mr-1.5"/> Proposer {formatPrice(suggestion.low)} – {formatPrice(suggestion.high)} €
                                                    </Button>
                                                </div>
                                                <div className="divide-y divide-[var(--p-line)]">
                                                    {refRows.map(r => (
                                                        <div key={r.label} className="flex items-center justify-between py-2 text-sm">
                                                            <span className="text-[var(--p-muted)]">{r.label}</span>
                                                            <span className="flex items-baseline gap-4">
                                                                <span className="text-[var(--p-muted)] text-xs">{formatPrice(Math.round(r.sqm))} €/m²</span>
                                                                <span className="font-bold text-[var(--p-fg)] w-44 text-right">{r.value}</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {gap !== null && (
                                                    <p className="text-xs text-[var(--p-muted)]">
                                                        Votre prix central : <b className="text-[#fff]">{formatPrice(central)} €</b> soit {formatPrice(Math.round(central / S))} €/m²
                                                        <span className={`ml-1 font-semibold ${Math.abs(gap) <= 5 ? 'text-emerald-400' : Math.abs(gap) <= 12 ? 'text-amber-300' : 'text-rose-400'}`}>
                                                            ({gap > 0 ? '+' : ''}{gap} % vs {soldMed ? 'ventes retenues' : ms ? 'médiane DVF' : 'biens en vente'})
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    <div className="p-6 rounded-2xl border" style={{ background: `linear-gradient(135deg, ${COLORS.primary}18, ${COLORS.secondary}10)`, borderColor: `${COLORS.primary}35` }}>
                                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: COLORS.secondary }}>Valeur {data.isRented ? "Libre de toute occupation" : "Vénale Estimée"}</h3>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.secondary }}>Fourchette Basse (€)</label>
                                                <Input type="number" value={data.lowPrice||""} onChange={e => setData({...data, lowPrice: Number(e.target.value)})} className="bg-[var(--p-field)] border-[var(--p-line)] h-16 rounded-2xl text-2xl font-black text-[var(--p-fg)]"/>
                                                {data.lowPrice > 0 && <p className="text-[11px] text-[var(--p-muted)] pl-1">{formatPrice(data.lowPrice)} €{data.surface > 0 && ` · ${formatPrice(Math.round(data.lowPrice / data.surface))} €/m²`}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.secondary }}>Fourchette Haute (€)</label>
                                                <Input type="number" value={data.highPrice||""} onChange={e => setData({...data, highPrice: Number(e.target.value)})} className="bg-[var(--p-field)] border-[var(--p-line)] h-16 rounded-2xl text-2xl font-black text-[var(--p-fg)]"/>
                                                {data.highPrice > 0 && <p className="text-[11px] text-[var(--p-muted)] pl-1">{formatPrice(data.highPrice)} €{data.surface > 0 && ` · ${formatPrice(Math.round(data.highPrice / data.surface))} €/m²`}</p>}
                                                {data.lowPrice > 0 && data.highPrice > 0 && data.highPrice < data.lowPrice && <p className="text-[11px] text-rose-400 pl-1">La fourchette haute est inférieure à la basse.</p>}
                                            </div>
                                        </div>

                                        {data.isRented && (
                                            <>
                                                <h3 className="text-sm font-bold uppercase tracking-widest mt-6 mb-4" style={{ color: COLORS.gold }}>Valeur Vendu Occupé (Loué)</h3>
                                                <div className="grid grid-cols-2 gap-5">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Fourchette Basse Loué (€)</label>
                                                        <Input type="number" value={data.lowPriceRented||""} onChange={e => setData({...data, lowPriceRented: Number(e.target.value)})} className="bg-[var(--p-field)] border-[var(--p-line)] h-16 rounded-2xl text-2xl font-black text-[var(--p-fg)]"/>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Fourchette Haute Loué (€)</label>
                                                        <Input type="number" value={data.highPriceRented||""} onChange={e => setData({...data, highPriceRented: Number(e.target.value)})} className="bg-[var(--p-field)] border-[var(--p-line)] h-16 rounded-2xl text-2xl font-black text-[var(--p-fg)]"/>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: COLORS.secondary }}><Euro size={16}/> Estimation Locative</h3>
                                            <Switch checked={data.hasRentalEstimation} onCheckedChange={(checked) => setData({...data, hasRentalEstimation: checked})}/>
                                        </div>
                                        {data.hasRentalEstimation && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-[var(--p-muted)] uppercase tracking-widest">Loyer mensuel estimé (€ HC)</label>
                                                <Input type="number" value={data.monthlyRent||""} onChange={e => setData({...data, monthlyRent: Number(e.target.value)})} className="bg-[var(--p-field)] border-[var(--p-line)] h-14 rounded-2xl text-lg" placeholder="Ex: 850"/>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--p-muted)] uppercase tracking-widest">Analyse Personnalisée</label>
                                        <textarea value={data.agentAnalysis} onChange={e => setData({...data, agentAnalysis: e.target.value})} rows={Math.max(6, Math.ceil((data.agentAnalysis || "").length / 90) + (data.agentAnalysis || "").split("\n").length)} className="w-full bg-[var(--p-field)] border border-[var(--p-line)] rounded-2xl p-4 text-[var(--p-fg)] min-h-[140px] outline-none focus:border-[#d35f52] transition-colors resize-y leading-relaxed" placeholder="Rédigez votre conclusion pour le client..."/>
                                    </div>

                                    {/* SÉLECTION DU COLLABORATEUR */}
                                    <div className="space-y-2 mt-4 pb-4">
                                        <label className="text-xs font-semibold text-[var(--p-muted)] uppercase tracking-widest">Collaborateur en charge <span className="normal-case tracking-normal text-[var(--p-faint)]">(signature de l&apos;avis)</span></label>
                                        <select value={data.agentId} onChange={e => {
                                            const agentId = e.target.value;
                                            setData(prev => ({ ...prev, agentId }));
                                            try { if (agentId) localStorage.setItem(LAST_AGENT_KEY, agentId); } catch { /* stockage local indisponible */ }
                                        }} className={selectClass}>
                                            <option value="">Sélectionner un collaborateur...</option>
                                            {AGENTS.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Navigation toujours visible en bas de l'écran */}
                        <div className="sticky bottom-4 z-30 flex justify-between items-center mt-8 -mx-3 px-3 py-3 rounded-2xl border"
                            style={{ backgroundColor: 'var(--p-glass)', backdropFilter: 'blur(16px)', borderColor: "var(--p-line)" }}>
                            <Button variant="ghost" onClick={() => { handleBack(); window.scrollTo({ top: 0 }); }} disabled={step === 1} className="text-[var(--p-muted)] hover:text-[var(--p-fg)] rounded-full gap-2 disabled:opacity-30">
                                <ArrowLeft size={16}/> Retour
                            </Button>
                            {step < 4 ? (
                                <Button onClick={() => { handleNext(); window.scrollTo({ top: 0 }); }} className="bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] font-bold h-11 px-8 rounded-full hover:opacity-90 transition-all">
                                    Suivant <ArrowRight className="ml-2" size={16}/>
                                </Button>
                            ) : (
                                <Button onClick={() => handleSave(false)} className="h-11 px-8 rounded-full font-bold text-[#fff] shadow-2xl transition-all hover:scale-105"
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
    // Pagination dynamique (les pages Marché et Photos sont optionnelles)
    const hasMarketPage = data.soldComparables.length > 0 || data.forSaleComparables.length > 0;
    const hasPhotoPage = (data.extraPhotos ?? []).length > 0;
    const totalPages = 3 + (hasMarketPage ? 1 : 0) + (hasPhotoPage ? 1 : 0);
    const pageOf = (n: number) => `${n} / ${totalPages}`;
    const conclusionPage = hasMarketPage ? 4 : 3;
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const pricesPerSqm = allComps.map(sqmOf).filter(p => p > 0);
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
            // Images recadrées sur l'encre (public/signatures) : tailles fixes et lisibles
            <div className="absolute bottom-3 right-5 flex flex-col items-end z-10 pointer-events-none">
                <p className="text-[12px] font-black text-zinc-800 leading-tight">{agent.name}</p>
                <p className="text-[8.5px] text-zinc-500 uppercase tracking-widest">{agent.role}</p>
                <div className="flex items-center gap-3 mt-1.5">
                    <img
                        src={agent.signatureUrl}
                        alt="Signature"
                        className="h-16 w-auto max-w-[150px] object-contain mix-blend-multiply"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                    <img
                        src="/signatures/signature-agence.png"
                        alt="Tampon Agence"
                        className="h-[60px] w-auto object-contain mix-blend-multiply opacity-85"
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
                        {data.mainPhoto && data.mainPhotoAuto?.credit && (
                            <span className="absolute left-4 bottom-[46px] text-[7px] text-white/80 bg-black/35 px-2 py-0.5 rounded">{data.mainPhotoAuto.credit}</span>
                        )}
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
                                {data.surface > 0 && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border text-zinc-300" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>{formatSurface(data.surface)} m²</span>}
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
                        <div className="ml-auto text-white/60 text-[9px] font-mono">{pageOf(1)}</div>
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
                            <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">{pageOf(2)}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 flex-1 min-h-0">
                        <div className="flex flex-col gap-3.5 min-h-0" style={{ width: '56%' }}>
                            <div className="grid grid-cols-3 gap-3.5 shrink-0" style={{ height: '90px' }}>
                                <div className="premium-card bg-white rounded-[18px] flex flex-col justify-center items-center text-center shadow-sm border border-zinc-200 relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})` }}></div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-2">Surface</p>
                                    <div className="flex items-end justify-center gap-1.5 leading-none">
                                        <span className={`${Number.isInteger(Number(data.surface)) ? 'text-5xl' : 'text-4xl'} font-black pdf-display`} style={{ color: COLORS.gray }}>{formatSurface(data.surface)}</span>
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
                                        <p className="text-[13px] uppercase font-bold text-zinc-400 tracking-widest mb-3">{formatSurface(data.surface)} m² — {data.rooms} pièces</p>
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
                                <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">{pageOf(3)}</span>
                            </div>
                        </div>

                        {(data.lowPrice > 0 && allComps.length > 0) && (
                            <div className="premium-card bg-white rounded-[20px] p-7 mb-4 shadow-sm border border-zinc-200 shrink-0" style={{ minHeight: '90px' }}>
                                <div className="flex items-center justify-between mb-7 gap-4">
                                    <h4 className="text-[11px] uppercase tracking-widest font-bold text-zinc-400 flex items-center gap-2"><BarChart3 size={14}/> Positionnement Prix / m²</h4>
                                    {data.marketStats && (
                                        <p className="text-[9.5px] text-zinc-500 font-medium text-right">
                                            Référence DVF : médiane <b className="text-zinc-700">{formatPrice(data.marketStats.median)} €/m²</b> sur {data.marketStats.count} ventes comparables
                                            à moins de {data.marketStats.radius >= 1000 ? `${data.marketStats.radius / 1000} km` : `${data.marketStats.radius} m`} ({data.marketStats.years[0]}–{data.marketStats.years[data.marketStats.years.length - 1]})
                                        </p>
                                    )}
                                </div>
                                <div className="relative w-full" style={{ height: '64px' }}>
                                    <div className="absolute left-0 w-full h-[4px] bg-zinc-100 rounded-full" style={{ top: '32px' }}></div>
                                    <div className="absolute h-[4px] rounded-full opacity-20" style={{ backgroundColor: COLORS.primary, top: '32px', left: `${getPositionPercent(data.lowPrice / (data.surface || 1))}%`, width: `${Math.max(0, getPositionPercent(data.highPrice / (data.surface || 1)) - getPositionPercent(data.lowPrice / (data.surface || 1)))}%` }}></div>
                                    <div className="absolute h-[4px] rounded-full z-10" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`, top: '32px', left: `${getPositionPercent(data.lowPrice / (data.surface || 1))}%`, width: `${Math.max(0, getPositionPercent(data.highPrice / (data.surface || 1)) - getPositionPercent(data.lowPrice / (data.surface || 1)))}%` }}></div>
                                    <div className="absolute -translate-x-1/2 w-7 h-7 rounded-full border-[3px] border-white z-20 shadow-lg" style={{ top: '18px', left: `${getPositionPercent(estimatedPriceSqm)}%`, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-center leading-tight" style={{ color: COLORS.primary }}>
                                            <span className="block font-semibold">Notre estimation</span>
                                            <span className="block font-black text-[12px]">{formatPrice(Math.round(estimatedPriceSqm))} €/m²</span>
                                        </div>
                                    </div>
                                    {(() => {
                                        const points = allComps.filter(c => sqmOf(c) > 0).map((c, i) => ({
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
                                                        {formatPrice(pt.sqm)} €/m²
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
                                            <p className={`text-zinc-400 ${metaClass} font-medium mt-0.5`}>
                                                {formatSurface(comp.surface)} m²
                                                {comp.soldDate && ` · vendu en ${formatMonthYear(comp.soldDate)}`}
                                                {comp.distance !== undefined && comp.distance !== null && ` · à ${comp.distance} m`}
                                                {comp.source === "portal" && comp.portal && ` · ${comp.portal}`}
                                                {comp.source === "portal" && (() => { const d = daysOnline({ publishedAt: comp.publishedAt, firstSeenAt: comp.firstSeenAt || "" }); return d !== null ? ` · en ligne depuis ${d} j` : ""; })()}
                                            </p>
                                            {comp.source === "portal" && (comp.initialPrice && comp.initialPrice > comp.price || comp.highlight) && maxRows <= 4 && (
                                                <p className={`${metaClass} text-zinc-500 truncate mt-0.5`}>
                                                    {comp.initialPrice && comp.initialPrice > comp.price && <span className="font-bold text-rose-700">Baisse de {formatPrice(comp.initialPrice - comp.price)} € · </span>}
                                                    {comp.highlight}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                            <p className={`${priceClass} font-black text-zinc-800`}>{formatPrice(comp.price)} €</p>
                                            <div className="flex items-center gap-1.5">
                                                <p className={`${metaClass} font-bold`} style={{ color: accentColor }}>{formatPrice(Math.round(compSqm))} €/m²</p>
                                                {delta !== null && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{delta > 0 ? '+' : ''}{delta}%</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            };
                            // Mention des sources des photos automatiques (licences ouvertes)
                            const photoCredits = Array.from(new Set(
                                [...data.soldComparables.slice(0, 5), ...data.forSaleComparables.slice(0, 5)]
                                    .filter(c => c.photoUrl && c.photoAuto?.credit)
                                    .map(c => c.photoAuto!.credit)
                            ));
                            return (
                                <>
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
                                {photoCredits.length > 0 && (
                                    <p className="text-[6.5px] text-zinc-400 mt-2 shrink-0 truncate">Photos : {photoCredits.join(" · ")}</p>
                                )}
                                </>
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
                                <span className="text-white text-[9px] font-black">{pad2(hasMarketPage ? 3 : 2)}</span>
                            </div>
                            <h2 className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: COLORS.primary }}>Conclusion & Valorisation</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <img src="/logo-patrim.png" alt="PATRIM" className="h-6 object-contain opacity-60"/>
                            <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">{pageOf(conclusionPage)}</span>
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
                                <p className="text-xl font-black pdf-display text-zinc-800 leading-none">{formatPrice(Math.round(((data.lowPrice + data.highPrice) / 2) / (data.surface || 1)))} <span className="text-sm font-bold text-zinc-500">€/m²</span></p>
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
                                                    <span className="text-[10px] text-zinc-500 font-semibold font-mono bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">{formatPrice(Math.round(data.lowPrice / (data.surface || 1)))} €/m²</span>
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
                                                    <span className="text-[10px] text-zinc-500 font-semibold font-mono bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">{formatPrice(Math.round(data.highPrice / (data.surface || 1)))} €/m²</span>
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
                                    <span className="text-white text-[9px] font-black">{pad2(hasMarketPage ? 4 : 3)}</span>
                                </div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] pdf-font" style={{ color: COLORS.primary }}>Dossier Photographique</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src="/logo-patrim.png" alt="PATRIM" className="h-6 object-contain opacity-60"/>
                                <span className="text-[8px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded-full">
                                    {pageOf(totalPages)}
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