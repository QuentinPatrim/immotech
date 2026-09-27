"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home, MapPin, Image as ImageIcon, TrendingUp, CheckCircle,
    Printer, ArrowRight, ArrowLeft, Plus, Trash2, UploadCloud, FileText,
    List, Edit, X, Leaf, ThumbsUp, ThumbsDown, BarChart3, Loader2, Euro, Building2, Banknote,
    Sparkles, Star, Globe, Wand2, Search, Target, AlertCircle, Check,
    Camera, Satellite, RefreshCw, User, KeyRound, ArrowUpDown, Box
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
import PortalSearchPanel from "@/components/estimation/PortalSearchPanel";
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
const HUB_KEYS = ["status", "statusUpdatedAt", "lastFollowUpAt", "mandateType", "followUpNote", "meeting", "shareAvis", "financingIncome", "plan3d"] as const;

// Prix au m² d'un comparable (0 si surface ou prix manquant, exclu des médianes)
const sqmOf = (c: { price: number; surface: number }) => (c.price > 0 && c.surface > 0 ? c.price / c.surface : 0);

const DPE_COLORS: Record<string, string> = { "A": "#00A06D", "B": "#52B153", "C": "#A5CC74", "D": "#F3E724", "E": "#F0B328", "F": "#EB8235", "G": "#D7221F" };

// --- HELPERS ---


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
            <p className="text-[11px] text-[var(--p-faint)] uppercase tracking-[0.06em] font-medium">Étape {n} / 4</p>
            <h2 className="text-[28px] leading-tight font-medium text-[var(--p-fg)] display-font">{title}</h2>
            {subtitle && <p className="text-[13px] text-[var(--p-muted)] mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

const Section = ({ icon, title, hint, action, children }: { icon: React.ReactNode; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) => (
    <section className="rounded-[22px] border p-5 md:p-6 space-y-4" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] flex items-center gap-2 text-[var(--p-accent)] [&_svg]:w-[14px] [&_svg]:h-[14px]">{icon} {title}</h3>
                {hint && <p className="text-xs text-[var(--p-muted)] mt-1.5">{hint}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

const Field = ({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) => (
    <div className={`space-y-2 ${className ?? ""}`}>
        <label className="text-[11px] font-medium text-[var(--p-muted)] uppercase tracking-[0.04em]">{label}</label>
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
const Segmented = <T extends string>({ options, value, onChange }: { options: { value: T; label: string; short?: string; icon?: React.ReactNode }[]; value: T; onChange: (v: T) => void }) => (
    <div className="grid gap-0.5 p-0.5 rounded-[14px] bg-[var(--p-sunken)]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(o => (
            <button key={o.value} type="button" onClick={() => onChange(o.value)}
                className={`h-10 min-w-0 rounded-xl flex items-center justify-center gap-1.5 text-[13px] sm:text-sm font-semibold transition-all ${value === o.value ? 'bg-[var(--p-segment)] text-[var(--p-fg)] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)]' : 'text-[var(--p-muted)] hover:text-[var(--p-fg)]'}`}>
                {o.icon && <span className="hidden sm:inline-flex">{o.icon}</span>}<span className="truncate sm:hidden">{o.short || o.label}</span><span className="truncate hidden sm:inline">{o.label}</span>
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

/** Largeur de la fenêtre, pour mettre l'aperçu A4 à l'échelle de l'écran */
const subscribeResize = (cb: () => void) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };

export default function EstimationEditor({
    initialData,
    existingId,
    initialView = "EDIT",
    initialStep = 1,
}: EstimationEditorProps) {
    const router = useRouter();
    const viewportWidth = useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 1280);
    const pdfZoom = Math.min(1, (viewportWidth - 16) / 794);
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
                    .dash-font { font-family: var(--font-ios); }
                    .display-font { font-family: var(--font-ios); font-weight: 700; letter-spacing: -0.028em; }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--p-line-strong); border-radius: 2px; }
                    .editor-glow { background: radial-gradient(60% 40% at 50% 0%, var(--p-accent-soft), transparent 70%); }
                `}</style>
                <div className="editor-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]"/>

                {/* Nav Bar */}
                <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-50 flex justify-between items-center px-2.5 sm:px-6 py-2.5 sm:py-3 rounded-full border shadow-2xl dash-font"
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
                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                        <ThemeToggle/>
                        <span className="hidden lg:inline text-[11px] text-[var(--p-muted)] whitespace-nowrap">
                            {isUploading ? "Upload des photos…"
                                : saveState === "saving" ? "Enregistrement…"
                                : saveState === "error" ? <span className="text-rose-400 inline-flex items-center gap-1"><AlertCircle size={12}/> Non enregistré</span>
                                : saveState === "dirty" ? "Modifications en attente"
                                : saveState === "saved" && lastSavedAt ? `Enregistré à ${lastSavedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                : saveState === "saved" ? "Enregistré" : ""}
                        </span>
                        <Button onClick={() => handleSave(true)} disabled={isUploading || saveState === "saving"} className={`rounded-full h-9 px-3 sm:px-5 text-sm font-semibold transition-all ${saveState === "saved" ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : saveState === "error" ? 'bg-rose-500 text-[#fff] hover:bg-rose-600' : isUploading ? 'bg-[var(--p-line-strong)] text-[var(--p-muted)] cursor-not-allowed' : 'bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] hover:opacity-90'}`}>
                            {isUploading || saveState === "saving" ? <><Loader2 size={14} className="animate-spin sm:mr-1.5"/><span className="hidden sm:inline">{isUploading ? 'Upload…' : 'Enregistrement'}</span></> : saveState === "saved" ? <><Check size={14} className="sm:mr-1.5"/><span className="hidden sm:inline">Enregistré</span></> : saveState === "error" ? 'Réessayer' : 'Enregistrer'}
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
                                                { value: "Appartement" as const, label: "Appartement", short: "Appart.", icon: <Building2 size={15}/> },
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

                                    {currentId && (
                                        <a href={`/plan3d/${currentId}`} className="flex items-center gap-4 rounded-[22px] border p-4 md:p-5 transition-colors hover:bg-[var(--p-hover)]" style={{ backgroundColor: 'var(--p-sunken)', borderColor: "var(--p-line)" }}>
                                            <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}><Box size={18} className="text-[#fff]"/></span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm font-semibold text-[var(--p-fg)]">Plan 3D et aménagement</span>
                                                <span className="block text-xs text-[var(--p-muted)] mt-0.5">Importez le plan 2D (image ou PDF) ou partez des surfaces : maquette 3D meublée à montrer au client.</span>
                                            </span>
                                            <ArrowRight size={16} className="text-[var(--p-muted)] shrink-0"/>
                                        </a>
                                    )}

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
                                                    <p className="text-[11px] uppercase tracking-widest text-[var(--p-muted)] font-semibold">Médiane secteur</p>
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
                                            : (b.similarity?.score ?? b.relevance ?? 0) - (a.similarity?.score ?? a.relevance ?? 0));
                                        const usedCount = listings.filter(isListingUsed).length;
                                        return (
                                            <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--p-accent-soft)', borderColor: 'var(--p-line)' }}>
                                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                                    <div className="flex-1 min-w-[260px]">
                                                        <h3 className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2"><Globe size={15} className="text-[var(--p-accent)]"/> Annonces en vente sur les portails</h3>
                                                        <p className="text-xs text-[var(--p-muted)] mt-1">
                                                            Recherchées sur Leboncoin, SeLoger et Bien&apos;ici avec l&apos;extension Patrim, triées pour ne garder que les biens proches du vôtre. Cochez celles à citer dans l&apos;avis de valeur.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a href="/capture/installer" target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-xl border border-[var(--p-line-strong)] text-xs font-semibold text-[var(--p-fg)] hover:bg-[var(--p-hover)] inline-flex items-center gap-1.5">
                                                            Extension Patrim
                                                        </a>
                                                        <button type="button" onClick={() => void reloadListings()} disabled={!currentId} title="Actualiser"
                                                            className="h-9 w-9 rounded-xl border border-[var(--p-line-strong)] text-[var(--p-fg)] hover:bg-[var(--p-hover)] inline-flex items-center justify-center disabled:opacity-40">
                                                            <RefreshCw size={14}/>
                                                        </button>
                                                    </div>
                                                </div>

                                                <PortalSearchPanel
                                                    estimationId={currentId}
                                                    subject={{
                                                        propertyType: data.propertyType, propertyAddress: data.propertyAddress,
                                                        surface: Number(data.surface) || 0, rooms: Number(data.rooms) || 0,
                                                        lowPrice: Number(data.lowPrice) || 0, highPrice: Number(data.highPrice) || 0,
                                                        propertyLat: data.propertyLat, propertyLon: data.propertyLon,
                                                    }}
                                                    onImported={() => void reloadListings()}
                                                />

                                                {!currentId ? null : listings.length === 0 ? (
                                                    listingsLoaded && <p className="text-[11px] text-[var(--p-faint)]">Aucune annonce pour ce dossier pour l&apos;instant. Vous pouvez aussi cliquer sur l&apos;icône Patrim sur n&apos;importe quelle page de portail.</p>
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
                                                                    <p className="text-[11px] uppercase tracking-[0.04em] text-[var(--p-muted)] font-semibold">{label}</p>
                                                                    <p className="text-lg font-semibold text-[var(--p-fg)] mt-0.5">{value}</p>
                                                                    <p className="text-[10px] text-[var(--p-muted)]">{sub}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                            <div className="flex gap-1 p-1 rounded-xl border border-[var(--p-line)]" style={{ backgroundColor: 'var(--p-card)' }}>
                                                                {([["relevance", "Similarité"], ["sqm", "€/m²"], ["recent", "Plus récentes"], ["drop", "Baisses"]] as const).map(([k, label]) => (
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
                                                            <p className="text-[11px] uppercase tracking-widest text-[var(--p-faint)] font-semibold mb-1.5">Suggestions · un clic pour ajouter</p>
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
    const hasMarketPage = allComps.length > 0;
    const hasPhotoPage = (data.extraPhotos ?? []).length > 0;
    const totalPages = 3 + (hasMarketPage ? 1 : 0) + (hasPhotoPage ? 1 : 0);
    const pageOf = (n: number) => `${n} / ${totalPages}`;
    const conclusionPage = hasMarketPage ? 4 : 3;
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const pricesPerSqm = allComps.map(sqmOf).filter(p => p > 0);
    const low = data.lowPrice || 0, high = data.highPrice || 0;
    const central = low && high ? Math.round((low + high) / 2) : low || high;
    const estimatedPriceSqm = central / (data.surface || 1);
    const singleValue = !!central && (!low || !high || low === high);
    let minPriceGraph = Math.min(...pricesPerSqm, estimatedPriceSqm || Infinity);
    let maxPriceGraph = Math.max(...pricesPerSqm, estimatedPriceSqm || 0);
    if (minPriceGraph === Infinity) minPriceGraph = 0;
    minPriceGraph = minPriceGraph * 0.92; maxPriceGraph = maxPriceGraph * 1.08;
    const getPositionPercent = (price: number) => { if (maxPriceGraph === minPriceGraph) return 50; return ((price - minPriceGraph) / (maxPriceGraph - minPriceGraph)) * 100; };
    const agent = AGENTS.find(a => a.id === data.agentId);
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    // « 46 Rue de la Colombette 31000 Toulouse » → rue / code postal + ville
    const addr = data.propertyAddress || "";
    const cpMatch = addr.match(/,?\s*(\d{5}\s+.+)$/);
    const street = (cpMatch ? addr.slice(0, cpMatch.index) : addr.split(",")[0]).replace(/,\s*$/, "").trim() || "Votre bien";
    const city = cpMatch ? cpMatch[1].trim() : addr.split(",").slice(1).join(",").trim();
    const eur = (n: number) => `${formatPrice(Math.round(n))} €`;
    const amenityLabels = (data.amenities ?? []).map(id => ALL_AMENITIES.find(a => a.id === id)?.label || id);
    const dpeLetter = (data.dpe || "").toUpperCase().slice(0, 1);

    const PAGE = "print-page relative mx-auto bg-white overflow-hidden w-[210mm] h-[297mm] flex flex-col mb-8 rounded-[6px] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]";
    const LABEL = "text-[8.5px] font-semibold uppercase tracking-[0.08em] text-[#86868b]";

    const renderHeader = (n: number, title: string) => (
        <div className="flex items-center justify-between px-[14mm] pt-[11mm] shrink-0">
            <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold tabular-nums" style={{ color: COLORS.primary }}>{pad2(n)}</span>
                <span className="h-3 w-px bg-[#d2d2d7]"/>
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">{title}</span>
            </div>
            <img src="/logo-patrim.png" alt="Patrim" className="h-[18px] object-contain"/>
        </div>
    );
    const renderTitle = (title: string, subtitle?: string) => (
        <div className="px-[14mm] pt-[7mm] pb-[6mm] shrink-0">
            <h2 className="text-[30px] font-bold tracking-[-0.03em] leading-[1.05] text-[#1d1d1f]">{title}</h2>
            {subtitle && <p className="text-[12px] text-[#6e6e73] mt-1.5">{subtitle}</p>}
        </div>
    );
    const renderFooter = (n: number) => (
        <div className="mt-auto px-[14mm] pb-[8mm] pt-[4mm] shrink-0">
            <div className="h-px bg-[#e8e8ed] mb-[3mm]"/>
            <div className="flex items-center justify-between text-[7.5px] text-[#86868b]">
                <span>Agence Patrim · 45, allées Jean Jaurès, 31000 Toulouse · 05 61 99 08 08 · patrim.fr</span>
                <span className="tabular-nums font-semibold">{pageOf(n)}</span>
            </div>
        </div>
    );
    const renderEnergyRail = (current: string, label: string, caption: string) => {
        const cur = (current || "").toUpperCase().slice(0, 1);
        return (
            <div>
                <div className="flex items-baseline justify-between mb-2">
                    <p className={LABEL}>{label}</p>
                    <p className="text-[8px] text-[#86868b]">{caption}</p>
                </div>
                <div className="flex items-end gap-[3px] h-[26px]">
                    {["A", "B", "C", "D", "E", "F", "G"].map(l => {
                        const on = cur === l;
                        return (
                            <div key={l} className={`flex-1 rounded-[5px] flex items-center justify-center font-bold ${on ? "h-[26px] text-[11px] shadow-[0_2px_6px_rgba(0,0,0,0.18)]" : "h-[12px] text-[7px] opacity-30"}`}
                                style={{ backgroundColor: DPE_COLORS[l], color: "CD".includes(l) ? "#1d1d1f" : "#fff" }}>{l}</div>
                        );
                    })}
                </div>
                {!cur && <p className="text-[8px] text-[#86868b] mt-1.5">Non communiqué</p>}
            </div>
        );
    };
    const renderSignature = () => (
        <div className="flex items-end justify-between gap-6">
            <div>
                <p className={LABEL}>Fait à Toulouse, le {today}</p>
                <p className="text-[14px] font-semibold text-[#1d1d1f] mt-2">{agent?.name || "Agence Patrim"}</p>
                <p className="text-[10px] text-[#6e6e73]">{agent?.role || "Service Transaction"} · Patrim Toulouse</p>
            </div>
            <div className="flex items-center gap-4">
                {agent?.signatureUrl && <img src={agent.signatureUrl} alt="Signature" className="h-[15mm] w-auto max-w-[38mm] object-contain mix-blend-multiply" onError={e => { e.currentTarget.style.display = "none"; }}/>}
                <img src="/signatures/signature-agence.png" alt="Tampon de l'agence" className="h-[15mm] w-auto object-contain mix-blend-multiply opacity-90" onError={e => { e.currentTarget.style.display = "none"; }}/>
            </div>
        </div>
    );
    const renderCompRow = (comp: Comparable, accent: string) => {
        const compSqm = sqmOf(comp);
        const ref = estimatedPriceSqm > 0 ? estimatedPriceSqm : (pricesPerSqm.length ? pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length : 0);
        const delta = ref > 0 && compSqm > 0 ? Math.round(((compSqm - ref) / ref) * 100) : null;
        const d = comp.source === "portal" ? daysOnline({ publishedAt: comp.publishedAt, firstSeenAt: comp.firstSeenAt || "" }) : null;
        const meta = [
            comp.surface ? `${formatSurface(comp.surface)} m²` : "",
            comp.soldDate ? `vendu en ${formatMonthYear(comp.soldDate)}` : "",
            comp.distance !== undefined && comp.distance !== null ? `à ${comp.distance} m` : "",
            comp.source === "portal" && comp.portal ? comp.portal : "",
            d !== null ? `en ligne depuis ${d} j` : "",
        ].filter(Boolean).join(" · ");
        return (
            <div key={comp.id} className="flex items-center gap-3.5 py-[2.6mm] border-b border-[#f0f0f2] last:border-b-0">
                {comp.photoUrl
                    ? <img src={comp.photoUrl} alt="" className="w-[15mm] h-[15mm] rounded-[10px] object-cover shrink-0"/>
                    : <div className="w-[15mm] h-[15mm] rounded-[10px] bg-[#f5f5f7] shrink-0 flex items-center justify-center"><Home size={15} className="text-[#aeaeb2]"/></div>}
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#1d1d1f] truncate">{comp.address}</p>
                    <p className="text-[9px] text-[#86868b] mt-0.5 truncate">{meta}</p>
                    {comp.source === "portal" && comp.initialPrice && comp.initialPrice > comp.price
                        ? <p className="text-[8.5px] font-semibold text-[#d70015] mt-0.5">Baisse de {eur(comp.initialPrice - comp.price)}</p> : null}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-[#1d1d1f] tabular-nums tracking-[-0.01em]">{eur(comp.price)}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {compSqm > 0 && <span className="text-[9px] font-semibold tabular-nums" style={{ color: accent }}>{formatPrice(Math.round(compSqm))} €/m²</span>}
                        {delta !== null && <span className={`text-[8px] font-bold px-1.5 py-[1px] rounded-full tabular-nums ${delta > 0 ? "bg-[#e8f7ec] text-[#248a3d]" : "bg-[#fdecec] text-[#d70015]"}`}>{delta > 0 ? "+" : ""}{delta} %</span>}
                    </div>
                </div>
            </div>
        );
    };

    const soldList = data.soldComparables.slice(0, 5);
    const saleList = data.forSaleComparables.slice(0, soldList.length >= 5 ? 4 : 5);
    const photoCredits = Array.from(new Set([...soldList, ...saleList].filter(c => c.photoUrl && c.photoAuto?.credit).map(c => c.photoAuto!.credit)));
    const extra = data.extraPhotos ?? [];
    const photoRows = extra.length <= 2 ? 1 : extra.length <= 4 ? 2 : extra.length <= 6 ? 3 : 4;
    const photoCols = extra.length === 1 ? 1 : extra.length > 8 ? 3 : 2;
    const hasCharges = data.taxeFonciere > 0 || data.isCopropriete;
    const hasOpinion = data.strengths.length > 0 || data.weaknesses.length > 0;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                .pdf-font { font-family: var(--font-ios); -webkit-font-smoothing: antialiased; letter-spacing: -0.005em; }
                .pdf-stage { zoom: var(--pdf-zoom, 1); }
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    html, body { background: #ffffff !important; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0 !important; padding: 0 !important; }
                    .print-hidden { display: none !important; }
                    .pdf-stage { zoom: 1 !important; padding: 0 !important; background: none !important; }
                    .print-page { margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; break-after: page; page-break-after: always; }
                    .print-page:last-child { break-after: auto; page-break-after: auto; }
                }
            `}}/>

            {/* Barre d'actions : pilule sur ordinateur, barre pleine largeur sur téléphone */}
            <div className="print-hidden fixed z-50 bottom-0 inset-x-0 sm:bottom-8 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 border-t sm:border sm:rounded-full shadow-2xl text-white"
                style={{ backgroundColor: "rgba(28,28,30,0.82)", backdropFilter: "saturate(180%) blur(24px)", WebkitBackdropFilter: "saturate(180%) blur(24px)", borderColor: "rgba(255,255,255,0.1)", paddingBottom: "env(safe-area-inset-bottom)" }}>
                <div className="grid grid-cols-4 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-2">
                    <button type="button" onClick={() => setView("EDIT")} className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-0 sm:h-10 sm:px-4 rounded-full text-[11px] sm:text-sm font-medium text-[rgba(235,235,245,0.7)] hover:text-white">
                        <Edit size={17} className="sm:w-[15px] sm:h-[15px]"/> Modifier
                    </button>
                    <button type="button" onClick={goToMesBiens} className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-0 sm:h-10 sm:px-4 rounded-full text-[11px] sm:text-sm font-medium text-[rgba(235,235,245,0.7)] hover:text-white">
                        <List size={17} className="sm:w-[15px] sm:h-[15px]"/> Mes biens
                    </button>
                    <button type="button" onClick={() => router.push(`/plaquette/${currentId}`)} className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-0 sm:h-10 sm:px-4 rounded-full text-[11px] sm:text-sm font-semibold text-white">
                        <Sparkles size={17} className="sm:w-[15px] sm:h-[15px] text-[#ff6159]"/> Plaquette
                    </button>
                    <div className="flex items-center justify-center p-1.5 sm:p-0 sm:ml-1">
                        <button type="button" onClick={() => window.print()} className="w-full sm:w-auto h-full sm:h-10 min-h-[44px] rounded-2xl sm:rounded-full px-3 sm:px-6 font-semibold text-[11px] sm:text-sm text-white flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2"
                            style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, boxShadow: "0 8px 24px -8px rgba(138,14,1,0.6)" }}>
                            <Printer size={16} className="sm:w-[15px] sm:h-[15px]"/> <span className="sm:hidden">PDF</span><span className="hidden sm:inline">Imprimer / PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="pdf-stage pdf-font min-h-screen py-6 sm:py-10 pb-32 sm:pb-36 print:p-0" style={{ backgroundColor: "#e5e5ea", ["--pdf-zoom" as string]: pdfZoom }}>

                {/* ============ PAGE 1 : COUVERTURE ============ */}
                <div className={PAGE}>
                    <div className="relative h-[168mm] shrink-0 bg-[#1c1c1e]">
                        {data.mainPhoto
                            ? <img src={data.mainPhoto} alt="" className="absolute inset-0 w-full h-full object-cover"/>
                            : <div className="absolute inset-0" style={{ background: "radial-gradient(120% 100% at 20% 0%, #5a1208, #120807 70%)" }}/>}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.25) 100%)" }}/>
                        <div className="absolute top-[11mm] inset-x-[14mm] flex items-start justify-between">
                            <span className="inline-flex items-center rounded-[14px] bg-white px-3.5 py-2.5 shadow-lg"><img src="/logo-patrim.png" alt="Patrim" className="h-[26px] object-contain"/></span>
                            <div className="text-right text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>
                                <p className="text-[8.5px] font-semibold uppercase tracking-[0.08em] opacity-80">Document établi le</p>
                                <p className="text-[13px] font-semibold mt-0.5">{today}</p>
                            </div>
                        </div>
                        {data.mainPhoto && data.mainPhotoAuto?.credit && <span className="absolute left-[14mm] bottom-[4mm] text-[7px] text-white/85 bg-black/35 px-2 py-0.5 rounded">{data.mainPhotoAuto.credit}</span>}
                    </div>
                    <div className="flex-1 flex flex-col px-[14mm] pt-[10mm]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: COLORS.primary }}>Avis de valeur</p>
                        <h1 className="text-[40px] font-bold tracking-[-0.035em] leading-[1.02] text-[#1d1d1f] mt-2">{street}</h1>
                        {city && <p className="text-[15px] text-[#6e6e73] mt-1.5">{city}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-5">
                            {[data.propertyType, data.surface > 0 ? `${formatSurface(data.surface)} m²` : "", data.rooms > 0 ? `${data.rooms} pièces` : "", data.floor ? getDisplayFloor(data.floor) : "", data.buildYear > 0 ? `Construit en ${data.buildYear}` : ""].filter(Boolean).map(t => (
                                <span key={t} className="text-[10px] font-medium text-[#1d1d1f] bg-[#f5f5f7] px-3 py-1.5 rounded-full">{t}</span>
                            ))}
                            {dpeLetter && DPE_COLORS[dpeLetter] && <span className="text-[10px] font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: DPE_COLORS[dpeLetter], color: "CD".includes(dpeLetter) ? "#1d1d1f" : "#fff" }}>DPE {dpeLetter}</span>}
                        </div>
                        <div className="mt-[11mm]">
                            <p className={`${LABEL} mb-2.5`}>Sommaire</p>
                            <div className="grid grid-cols-2 gap-x-8">
                                {[
                                    { t: "Le bien", p: 2 },
                                    ...(hasMarketPage ? [{ t: "Le marché", p: 3 }] : []),
                                    { t: "Notre estimation", p: conclusionPage },
                                    ...(hasPhotoPage ? [{ t: "Photographies", p: totalPages }] : []),
                                ].map((x, i) => (
                                    <div key={x.t} className="flex items-baseline gap-3 py-2 border-b border-[#f0f0f2]">
                                        <span className="text-[10px] font-bold tabular-nums" style={{ color: COLORS.primary }}>{pad2(i + 1)}</span>
                                        <span className="text-[11.5px] font-medium text-[#1d1d1f] flex-1">{x.t}</span>
                                        <span className="text-[9.5px] text-[#86868b] tabular-nums">p. {x.p}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-auto grid grid-cols-2 gap-8 pt-[6mm] border-t border-[#e8e8ed]">
                            <div>
                                <p className={LABEL}>Établi pour</p>
                                <p className="text-[14px] font-semibold text-[#1d1d1f] mt-1.5">{data.clientName || "—"}</p>
                                {data.clientAddress && <p className="text-[10px] text-[#6e6e73] mt-0.5 leading-snug">{data.clientAddress}</p>}
                            </div>
                            <div>
                                <p className={LABEL}>Votre conseiller</p>
                                <p className="text-[14px] font-semibold text-[#1d1d1f] mt-1.5">{agent?.name || "Agence Patrim"}</p>
                                <p className="text-[10px] text-[#6e6e73] mt-0.5">{agent?.role || "Service Transaction"} · Patrim Toulouse</p>
                            </div>
                        </div>
                    </div>
                    <div className="px-[14mm] pb-[8mm] pt-[6mm] shrink-0 flex items-center justify-between text-[7.5px] text-[#86868b]">
                        <span>SAS Patrim · Carte professionnelle CPI 3101 2016 000 013 177 · RCS Toulouse B 403 231 145</span>
                        <span className="tabular-nums font-semibold">{pageOf(1)}</span>
                    </div>
                </div>

                {/* ============ PAGE 2 : LE BIEN ============ */}
                <div className={PAGE}>
                    {renderHeader(1, "Le bien")}
                    {renderTitle("Le bien", `${data.propertyType}${data.surface > 0 ? ` de ${formatSurface(data.surface)} m²` : ""}${data.rooms > 0 ? ` · ${data.rooms} pièces` : ""}${city ? ` · ${city}` : ""}`)}
                    <div className="px-[14mm] flex-1 flex flex-col gap-[5mm] min-h-0 pb-[2mm]">
                        {/* Chiffres clés */}
                        <div className="grid grid-cols-4 rounded-[18px] bg-[#f5f5f7] py-[5mm]">
                            {[
                                { l: "Surface", v: data.surface > 0 ? formatSurface(data.surface) : "—", u: "m²", sub: "surface déclarée" },
                                { l: "Pièces", v: data.rooms > 0 ? String(data.rooms) : "—", u: "", sub: "" },
                                data.propertyType === "Maison"
                                    ? { l: "Terrain", v: data.plotSurface > 0 ? formatPrice(data.plotSurface) : "—", u: data.plotSurface > 0 ? "m²" : "", sub: data.gardenSurface > 0 ? `jardin ${formatPrice(data.gardenSurface)} m²` : "" }
                                    : { l: "Étage", v: data.floor ? getDisplayFloor(data.floor).replace(/\s*étage/i, "") : "—", u: "", sub: data.floor ? (data.hasElevator ? "avec ascenseur" : "sans ascenseur") : "" },
                                { l: "Construction", v: data.buildYear > 0 ? String(data.buildYear) : "—", u: "", sub: "" },
                            ].map((k, i) => (
                                <div key={k.l} className={`px-[5mm] ${i > 0 ? "border-l border-[#e3e3e8]" : ""}`}>
                                    <p className={LABEL}>{k.l}</p>
                                    <p className="mt-1.5 text-[#1d1d1f] leading-none whitespace-nowrap"><span className="text-[26px] font-bold tracking-[-0.03em] tabular-nums">{k.v}</span>{k.u && <span className="text-[10px] font-medium text-[#6e6e73] ml-1">{k.u}</span>}</p>
                                    {k.sub && <p className="text-[8.5px] text-[#86868b] mt-1.5">{k.sub}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Photos : occupent l'espace disponible */}
                        {data.secondaryPhotos.length > 0 && (
                            <div className={`grid gap-[3mm] flex-1 min-h-[72mm] max-h-[135mm] ${data.secondaryPhotos.length === 1 ? "grid-cols-1" : data.secondaryPhotos.length === 2 ? "grid-cols-2" : "grid-cols-3 grid-rows-2"}`}>
                                {data.secondaryPhotos.slice(0, 3).map((url, i) => (
                                    <div key={i} className={`rounded-[16px] overflow-hidden bg-[#f5f5f7] ${data.secondaryPhotos.length >= 3 && i === 0 ? "col-span-2 row-span-2" : ""}`}>
                                        <img src={url} alt="" className="w-full h-full object-cover"/>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Énergie & charges */}
                        <div className={`grid gap-[4mm] ${hasCharges ? "grid-cols-[1.35fr_1fr]" : "grid-cols-1"}`}>
                            <div className="rounded-[18px] border border-[#e8e8ed] p-[5mm]">
                                <p className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 mb-[4mm]"><Leaf size={13} className="text-[#248a3d]"/> Performance énergétique</p>
                                <div className="grid grid-cols-2 gap-[6mm]">
                                    {renderEnergyRail(data.dpe, "DPE", "énergie")}
                                    {renderEnergyRail(data.ges, "GES", "climat")}
                                </div>
                            </div>
                            {hasCharges && (
                                <div className="rounded-[18px] border border-[#e8e8ed] p-[5mm]">
                                    <p className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 mb-[4mm]"><Banknote size={13} style={{ color: COLORS.primary }}/> Charges annuelles</p>
                                    <div className="space-y-2.5">
                                        {data.taxeFonciere > 0 && (
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-[10.5px] text-[#6e6e73]">Taxe foncière</span>
                                                <span className="text-[14px] font-bold text-[#1d1d1f] tabular-nums">{eur(data.taxeFonciere)}</span>
                                            </div>
                                        )}
                                        {data.isCopropriete && (
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-[10.5px] text-[#6e6e73]">Charges de copropriété</span>
                                                <span className="text-[14px] font-bold text-[#1d1d1f] tabular-nums">{data.coproFees > 0 ? eur(data.coproFees * 12) : "—"}</span>
                                            </div>
                                        )}
                                        {data.isCopropriete && data.coproFees > 0 && <p className="text-[9px] text-[#86868b] text-right">soit {eur(data.coproFees)} par mois</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {amenityLabels.length > 0 && (
                            <div>
                                <p className={`${LABEL} mb-2`}>Équipements et annexes</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {amenityLabels.map(l => <span key={l} className="text-[10px] font-medium text-[#1d1d1f] bg-[#f5f5f7] px-3 py-1.5 rounded-full">{l}</span>)}
                                </div>
                            </div>
                        )}

                        {data.features?.trim() && (
                            <div>
                                <p className={`${LABEL} mb-2`}>Descriptif et prestations</p>
                                <p className="text-[10.5px] leading-[1.55] text-[#3a3a3c] whitespace-pre-wrap line-clamp-[10]">{data.features}</p>
                            </div>
                        )}
                    </div>
                    {renderFooter(2)}
                </div>

                {/* ============ PAGE 3 : MARCHÉ ============ */}
                {hasMarketPage && (
                    <div className={PAGE}>
                        {renderHeader(2, "Le marché")}
                        {renderTitle("Le marché", "Ventes notariées et biens actuellement en vente autour de l'adresse")}
                        <div className="px-[14mm] flex flex-col gap-[5mm] min-h-0">
                            {data.marketStats && (
                                <div className="grid grid-cols-4 rounded-[18px] bg-[#f5f5f7] py-[4.5mm]">
                                    {[
                                        { l: "Prix médian vendu", v: `${formatPrice(data.marketStats.median)}`, u: "€/m²" },
                                        { l: "Ventes analysées", v: String(data.marketStats.count), u: "actes DVF" },
                                        { l: "Périmètre", v: data.marketStats.radius >= 1000 ? `${data.marketStats.radius / 1000}` : String(data.marketStats.radius), u: data.marketStats.radius >= 1000 ? "km" : "m" },
                                        { l: "Notre estimation", v: estimatedPriceSqm > 0 ? formatPrice(Math.round(estimatedPriceSqm)) : "—", u: "€/m²", accent: true },
                                    ].map((k, i) => (
                                        <div key={k.l} className={`px-[5mm] ${i > 0 ? "border-l border-[#e3e3e8]" : ""}`}>
                                            <p className={LABEL}>{k.l}</p>
                                            <p className="mt-1.5 leading-none"><span className="text-[21px] font-bold tracking-[-0.03em] tabular-nums" style={{ color: k.accent ? COLORS.primary : "#1d1d1f" }}>{k.v}</span><span className="text-[9.5px] font-medium text-[#6e6e73] ml-1">{k.u}</span></p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {central > 0 && pricesPerSqm.length > 0 && (
                                <div className="rounded-[18px] border border-[#e8e8ed] px-[6mm] pt-[5mm] pb-[3mm]">
                                    <div className="flex items-baseline justify-between">
                                        <p className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-1.5"><BarChart3 size={13} style={{ color: COLORS.primary }}/> Positionnement au m²</p>
                                        {data.marketStats && <p className="text-[8.5px] text-[#86868b]">Ventes {data.marketStats.years[0]}–{data.marketStats.years[data.marketStats.years.length - 1]}</p>}
                                    </div>
                                    <div className="relative w-full h-[27mm] mt-2">
                                        <div className="absolute inset-x-0 h-[4px] rounded-full bg-[#f0f0f2]" style={{ top: "12mm" }}/>
                                        {!singleValue && (
                                            <div className="absolute h-[4px] rounded-full" style={{ top: "12mm", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`, left: `${getPositionPercent(low / (data.surface || 1))}%`, width: `${Math.max(0, getPositionPercent(high / (data.surface || 1)) - getPositionPercent(low / (data.surface || 1)))}%` }}/>
                                        )}
                                        {(() => {
                                            const points = allComps.filter(c => sqmOf(c) > 0).map((c, i) => ({ i, pct: getPositionPercent(sqmOf(c)), sqm: Math.round(sqmOf(c)) })).sort((a, b) => a.pct - b.pct);
                                            return points.map((pt, idx) => (
                                                <div key={pt.i} className="absolute -translate-x-1/2 w-[9px] h-[9px] rounded-full border-2 border-white bg-[#aeaeb2]" style={{ top: "calc(12mm - 2.5px)", left: `${pt.pct}%` }}>
                                                    <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[7.5px] font-medium text-[#6e6e73] tabular-nums" style={{ top: idx % 2 === 0 ? "11px" : "22px" }}>{formatPrice(pt.sqm)}</span>
                                                </div>
                                            ));
                                        })()}
                                        <div className="absolute -translate-x-1/2 w-[18px] h-[18px] rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(138,14,1,0.45)]" style={{ top: "calc(12mm - 7px)", left: `${getPositionPercent(estimatedPriceSqm)}%`, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                            <span className="absolute left-1/2 -translate-x-1/2 -top-[22px] whitespace-nowrap text-[9.5px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]" style={{ color: COLORS.primary }}>Notre estimation · {formatPrice(Math.round(estimatedPriceSqm))} €/m²</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {soldList.length > 0 && (
                                <div>
                                    <p className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 mb-1"><CheckCircle size={13} className="text-[#248a3d]"/> Vendus récemment <span className="text-[#86868b] font-normal">· ventes notariées</span></p>
                                    <div>{soldList.map(c => renderCompRow(c, "#248a3d"))}</div>
                                </div>
                            )}
                            {saleList.length > 0 && (
                                <div>
                                    <p className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 mb-1"><TrendingUp size={13} className="text-[#c93400]"/> Actuellement en vente <span className="text-[#86868b] font-normal">· concurrence</span></p>
                                    <div>{saleList.map(c => renderCompRow(c, "#c93400"))}</div>
                                </div>
                            )}
                            {photoCredits.length > 0 && <p className="text-[6.5px] text-[#aeaeb2] truncate">Photos : {photoCredits.join(" · ")}</p>}
                        </div>
                        {renderFooter(3)}
                    </div>
                )}

                {/* ============ PAGE 4 : ESTIMATION ============ */}
                <div className={PAGE}>
                    {renderHeader(hasMarketPage ? 3 : 2, "Notre estimation")}
                    {renderTitle("Notre estimation", "Valeur vénale du bien au regard du marché et de ses caractéristiques")}
                    <div className="px-[14mm] flex-1 flex flex-col gap-[5mm] min-h-0">
                        {data.isRented ? (
                            <div className="grid grid-cols-2 gap-[4mm]">
                                {[
                                    { t: "Valeur libre", lo: low, hi: high, bg: `radial-gradient(120% 140% at 0% 0%, #b3261a 0%, ${COLORS.primary} 45%, #2a0804 100%)` },
                                    { t: "Valeur occupée (vendu loué)", lo: data.lowPriceRented, hi: data.highPriceRented, bg: "radial-gradient(120% 140% at 0% 0%, #3a3a3c 0%, #1c1c1e 55%, #000 100%)" },
                                ].map(v => {
                                    const c = v.lo && v.hi ? Math.round((v.lo + v.hi) / 2) : v.lo || v.hi;
                                    return (
                                        <div key={v.t} className="rounded-[22px] p-[7mm] text-white" style={{ background: v.bg }}>
                                            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/70">{v.t}</p>
                                            <p className="text-[30px] font-bold tracking-[-0.035em] tabular-nums mt-2 leading-none">{c ? eur(c) : "—"}</p>
                                            {v.lo > 0 && v.hi > 0 && v.lo !== v.hi && <p className="text-[10.5px] text-white/80 mt-2 tabular-nums">de {eur(v.lo)} à {eur(v.hi)}</p>}
                                            {c > 0 && data.surface > 0 && <span className="inline-block mt-4 text-[9.5px] font-semibold px-2.5 py-1 rounded-full bg-white/15 tabular-nums">{formatPrice(Math.round(c / data.surface))} €/m²</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-[24px] px-[9mm] py-[9mm] text-white" style={{ background: `radial-gradient(120% 140% at 0% 0%, #b3261a 0%, ${COLORS.primary} 45%, #2a0804 100%)` }}>
                                <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-25 blur-3xl bg-[#ffb4a8]"/>
                                <p className="relative text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/70">Valeur vénale estimée</p>
                                <p className="relative text-[52px] font-bold tracking-[-0.04em] leading-none tabular-nums mt-3">{central ? eur(central) : "—"}</p>
                                <div className="relative flex flex-wrap items-center gap-2 mt-5">
                                    {!singleValue && <span className="text-[10.5px] font-semibold px-3 py-1.5 rounded-full bg-white/15 tabular-nums">Fourchette {eur(low)} – {eur(high)}</span>}
                                    {central > 0 && data.surface > 0 && <span className="text-[10.5px] font-semibold px-3 py-1.5 rounded-full bg-white/15 tabular-nums">{formatPrice(Math.round(central / data.surface))} €/m²</span>}
                                    {data.marketStats && <span className="text-[10.5px] font-semibold px-3 py-1.5 rounded-full bg-white/15 tabular-nums">Médiane du secteur {formatPrice(data.marketStats.median)} €/m²</span>}
                                </div>
                            </div>
                        )}

                        {data.hasRentalEstimation && data.monthlyRent > 0 && (
                            <div className="grid grid-cols-3 rounded-[18px] bg-[#f5f5f7] py-[4.5mm]">
                                {[
                                    { l: "Valeur locative", v: eur(data.monthlyRent), u: "HC / mois" },
                                    { l: "Rendement brut", v: `${((data.monthlyRent * 12) / (central || 1) * 100).toFixed(1).replace(".", ",")} %`, u: "sur la valeur centrale" },
                                    { l: "Loyer au m²", v: `${Math.round(data.monthlyRent / (data.surface || 1))} €`, u: "par mois" },
                                ].map((k, i) => (
                                    <div key={k.l} className={`px-[5mm] ${i > 0 ? "border-l border-[#e3e3e8]" : ""}`}>
                                        <p className={LABEL}>{k.l}</p>
                                        <p className="text-[20px] font-bold tracking-[-0.03em] tabular-nums text-[#1d1d1f] mt-1.5 leading-none">{k.v}</p>
                                        <p className="text-[8.5px] text-[#86868b] mt-1">{k.u}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {hasOpinion && (
                            <div className="grid grid-cols-2 gap-[4mm]">
                                {[
                                    { t: "Points forts", items: data.strengths, icon: ThumbsUp, c: "#248a3d", bg: "#e8f7ec" },
                                    { t: "Points de vigilance", items: data.weaknesses, icon: ThumbsDown, c: "#c93400", bg: "#fff1e6" },
                                ].filter(b => b.items.length > 0).map(b => (
                                    <div key={b.t} className="rounded-[18px] border border-[#e8e8ed] p-[5mm]">
                                        <p className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-2 mb-3">
                                            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: b.bg }}><b.icon size={12} style={{ color: b.c }}/></span>{b.t}
                                        </p>
                                        <ul className="space-y-1.5">
                                            {b.items.slice(0, 6).map((s, i) => <li key={i} className="flex gap-2 text-[10.5px] text-[#3a3a3c] leading-snug"><span className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0" style={{ backgroundColor: b.c }}/>{s}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {data.agentAnalysis?.trim() && (
                            <div className="rounded-[18px] bg-[#f5f5f7] p-[6mm]">
                                <p className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 mb-2"><Star size={13} style={{ color: COLORS.primary }}/> L&apos;analyse de votre conseiller</p>
                                <p className="text-[11px] leading-[1.6] text-[#3a3a3c] whitespace-pre-wrap line-clamp-[12]">{data.agentAnalysis}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-[3mm]">
                            {[
                                { n: "1", t: "Ventes réelles", d: data.marketStats ? `${data.marketStats.count} ventes notariées (DVF) à moins de ${data.marketStats.radius >= 1000 ? `${data.marketStats.radius / 1000} km` : `${data.marketStats.radius} m`}` : `${data.soldComparables.length} ventes comparables du secteur` },
                                { n: "2", t: "Offre concurrente", d: data.forSaleComparables.length ? `${data.forSaleComparables.length} bien${data.forSaleComparables.length > 1 ? "s" : ""} comparable${data.forSaleComparables.length > 1 ? "s" : ""} actuellement en vente` : "Biens en vente du quartier analysés" },
                                { n: "3", t: "Visite du bien", d: "État, prestations, étage, extérieurs et performance énergétique" },
                            ].map(m => (
                                <div key={m.n} className="rounded-[16px] border border-[#e8e8ed] p-[4mm]">
                                    <span className="w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>{m.n}</span>
                                    <p className="text-[11px] font-semibold text-[#1d1d1f] mt-2">{m.t}</p>
                                    <p className="text-[9px] text-[#6e6e73] mt-0.5 leading-snug">{m.d}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto pt-[2mm]">{renderSignature()}</div>
                    </div>
                    <div className="mt-auto px-[14mm] pt-[4mm] shrink-0">
                        <p className="text-[6.5px] leading-[1.55] text-[#aeaeb2] text-justify">
                            Sous réserve que l&apos;étude des diagnostics techniques et du carnet numérique du logement ne révèle pas d&apos;anomalie ni de non-conformité affectant sa valeur. Document à usage strictement privé. Conformément à la réglementation, le professionnel de l&apos;immobilier n&apos;est en aucun cas qualifié pour déterminer la surface du bien de manière réglementaire. La surface indiquée a été communiquée par le propriétaire, lue sur le titre de propriété ou sur l&apos;avis de taxe foncière. Pour toute commercialisation de ce bien, le mandant fera appel à un diagnostiqueur professionnel dont la loi impose la qualification pour attester de la surface Carrez s&apos;il s&apos;agit d&apos;un bien en copropriété ou de la surface de plancher pour les maisons de ville ou pavillons. Le professionnel de l&apos;immobilier, rédacteur du présent avis de valeur, n&apos;assume aucune responsabilité sur la surface qui serait attestée par le diagnostiqueur et qui servirait de base juridique dans l&apos;avant-contrat et l&apos;acte définitif, ni sur les conséquences qui y seraient liées. De même, le présent document n&apos;engage pas la responsabilité du professionnel de l&apos;immobilier quant à la conformité de l&apos;état du bâti face aux divers diagnostics (amiante, plomb, gaz, électricité, assainissement, termites, mérules).
                        </p>
                    </div>
                    {renderFooter(conclusionPage)}
                </div>

                {/* ============ PAGE 5 : PHOTOS ============ */}
                {hasPhotoPage && (
                    <div className={PAGE}>
                        {renderHeader(hasMarketPage ? 4 : 3, "Photographies")}
                        {renderTitle("Le bien en images", `${extra.length} vue${extra.length > 1 ? "s" : ""} · ${street}`)}
                        <div className="px-[14mm] flex-1 min-h-0">
                            <div className="grid gap-[3mm] h-full" style={{ gridTemplateColumns: `repeat(${photoCols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${photoCols === 3 ? Math.ceil(extra.length / 3) : photoRows}, minmax(0, 1fr))` }}>
                                {extra.slice(0, 12).map((url, i) => (
                                    <div key={i} className="rounded-[14px] overflow-hidden bg-[#f5f5f7] min-h-0">
                                        <img src={url} alt="" className="w-full h-full object-cover"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {renderFooter(totalPages)}
                    </div>
                )}
            </div>
        </>
    );
}