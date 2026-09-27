"use client";

/* ============================================================
   PAGE : /plan3d/[id]  —  ATELIER PLAN 3D
   Espace de l'agent pour construire la maquette 3D d'un bien :
   import d'un plan 2D (PDF / photo) lu par l'IA, ou plan
   schématique à partir des surfaces. Éditeur 2D et vue 3D
   synchronisés, styles d'aménagement, ameublement automatique.
   Le plan est enregistré dans le dossier (data_json.plan3d)
   et présenté au client dans le mode rendez-vous.
   ============================================================ */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle, ArrowLeft, Box, Check, ChevronLeft, CircleAlert, FileUp, Info, LayoutGrid, Loader2, Plus, Presentation,
    RotateCcw, Sofa, Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getAuthHeaders } from "@/lib/apiHelpers";
import { usePatrimTheme } from "@/lib/patrimTheme";
import ThemeToggle from "@/components/estimation/ThemeToggle";
import PlanEditor2D from "@/components/plan3d/PlanEditor2D";
import type { ViewMode } from "@/components/plan3d/Scene3D";
import { autoFurnish } from "@/lib/plan3d/furnish";
import { fileToPlanImage, isPdfFile } from "@/lib/plan3d/pdfToImage";
import { analyzeDdt, openPdf, pageThumbnail, type CarrezTable, type DdtAnalysis } from "@/lib/plan3d/ddt";
import DdtReview from "@/components/plan3d/DdtReview";
import { planFromDrawing, refineWithTable, seedsFromPlan, seedsFromTexts } from "@/lib/plan3d/readDrawing";
import { defaultRoomSpecs, indoorArea, kindLabel, schematicPlan, type RoomSpec } from "@/lib/plan3d/geometry";
import { STYLE_LIST } from "@/lib/plan3d/styles";
import { DEFAULT_WALL_HEIGHT, OUTDOOR_KINDS, ROOM_KINDS, type ExtractResponse, type Plan3D, type RoomKind, type StyleId } from "@/lib/plan3d/types";

/* ─────────────────────────── TYPES & OUTILS ─────────────────────────── */

type Dossier = {
    propertyAddress?: string;
    surface?: number;
    rooms?: number;
    propertyType?: string;
    clientName?: string;
    plan3d?: Plan3D | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type Pane = "2d" | "3d";
type SpecRow = { key: string; kind: RoomKind; name: string; area: string };
type ImportState = { phase: "idle" | "busy" | "error"; step: number; error: string; notes: string[]; preview: string | null };

const IMPORT_STEPS = ["Lecture du plan", "Détection des pièces et des ouvertures", "Mise à l'échelle", "Construction de la 3D"];
const VIEWS: { id: ViewMode; label: string }[] = [
    { id: "dollhouse", label: "Maquette" },
    { id: "top", label: "Dessus" },
    { id: "walk", label: "Visite" },
];
const BRAND_GRADIENT = "linear-gradient(135deg, #8a0e01, #d35f52)";
const SEGMENT_ON = "bg-[var(--p-segment)] text-[var(--p-fg)] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)]";
const IDLE_IMPORT: ImportState = { phase: "idle", step: 0, error: "", notes: [], preview: null };

/** Plan exploitable (enregistré ou renvoyé par l'API) : tableaux et valeurs par défaut garantis, sinon null */
const toPlan = (v: unknown): Plan3D | null => {
    if (!v || typeof v !== "object") return null;
    const p = v as Partial<Plan3D>;
    const rooms = Array.isArray(p.rooms) ? p.rooms.filter(r => r && Array.isArray(r.polygon) && r.polygon.length >= 3) : [];
    if (!rooms.length) return null;
    return {
        ...p,
        version: 1,
        rooms,
        openings: Array.isArray(p.openings) ? p.openings : [],
        furniture: Array.isArray(p.furniture) ? p.furniture : [],
        wallHeight: typeof p.wallHeight === "number" && p.wallHeight > 0 ? p.wallHeight : DEFAULT_WALL_HEIGHT,
        style: STYLE_LIST.some(s => s.id === p.style) ? (p.style as StyleId) : "contemporain",
    };
};
const positiveOrUndef = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : undefined; };

const fmtArea = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m²`;
const parseArea = (s: string) => { const n = Number(s.replace(",", ".").replace(/\s/g, "")); return Number.isFinite(n) && n > 0 ? n : 0; };
const areaText = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Signature de la géométrie (pièces + ouvertures) : sert à proposer un réaménagement */
const geometryKey = (p: Plan3D) =>
    JSON.stringify([p.rooms.map(r => [r.id, r.kind, r.polygon]), p.openings.map(o => [o.roomId, o.edge, o.t, o.width, o.kind])]);

let rowSeq = 0;
const rowKey = () => `row${++rowSeq}`;
const toRows = (specs: RoomSpec[]): SpecRow[] => specs.map(s => ({ key: rowKey(), kind: s.kind, name: s.name ?? "", area: areaText(s.area) }));

/* Écran large (≥ 1024 px) : éditeur 2D et vue 3D côte à côte */
const DESKTOP_QUERY = "(min-width: 1024px)";
const subscribeDesktop = (cb: () => void) => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
};
const useIsDesktop = () => useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);

/* ─────────────────────────── SQUELETTE 3D ─────────────────────────── */

function Scene3DSkeleton() {
    return (
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "var(--p-card)" }}>
            <motion.div className="absolute inset-0" style={{ background: "linear-gradient(110deg, transparent 30%, var(--p-hover) 50%, transparent 70%)", backgroundSize: "220% 100%" }}
                animate={{ backgroundPosition: ["120% 0", "-120% 0"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}/>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[var(--p-muted)]">
                <motion.div className="h-14 w-14 rounded-[18px] flex items-center justify-center text-[#fff] shadow-lg" style={{ background: BRAND_GRADIENT }}
                    animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
                    <Box size={24}/>
                </motion.div>
                <p className="text-sm font-medium">Préparation de la maquette…</p>
            </div>
        </div>
    );
}

const Scene3D = dynamic(() => import("@/components/plan3d/Scene3D"), { ssr: false, loading: () => <Scene3DSkeleton/> });

/* ─────────────────────────── ILLUSTRATION ─────────────────────────── */

/** Projection isométrique d'un point du plan (mètres) dans le dessin d'accueil */
const iso = (x: number, y: number, z = 0): [number, number] => [125 + (x - y) * 11, 52 + (x + y) * 5.6 - z * 12];
const pts = (...p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const HERO_ROOMS: { x0: number; y0: number; x1: number; y1: number; fill: string }[] = [
    { x0: 0, y0: 0, x1: 6, y1: 4, fill: "#c9a27a" },
    { x0: 6, y0: 0, x1: 10, y1: 4, fill: "#d9d4cc" },
    { x0: 0, y0: 4, x1: 4, y1: 7, fill: "#b98f68" },
    { x0: 4, y0: 4, x1: 6.5, y1: 7, fill: "#cfd6da" },
    { x0: 6.5, y0: 4, x1: 10, y1: 7, fill: "#c29a72" },
];
const HERO_WALLS: [number, number, number, number][] = [
    [0, 0, 10, 0], [0, 0, 0, 7], [6, 0, 6, 4], [0, 4, 10, 4], [4, 4, 4, 7], [6.5, 4, 6.5, 7], [10, 0, 10, 7], [0, 7, 10, 7],
].sort((a, b) => (a[0] + a[1] + a[2] + a[3]) - (b[0] + b[1] + b[2] + b[3])) as [number, number, number, number][];

function HeroIllustration() {
    const h = 1.1;
    return (
        <motion.svg viewBox="0 0 250 150" className="w-full max-w-[320px] h-auto" aria-hidden
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: [0, -4, 0] }} transition={{ opacity: { duration: 0.6 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}>
            <defs>
                <linearGradient id="p3d-wall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffffff"/>
                    <stop offset="1" stopColor="#e9e5df"/>
                </linearGradient>
            </defs>
            <polygon points={pts(iso(-0.4, -0.4), iso(10.4, -0.4), iso(10.4, 7.4), iso(-0.4, 7.4))} fill="#000" opacity="0.12" transform="translate(0 6)"/>
            {HERO_ROOMS.map((r, i) => (
                <polygon key={i} points={pts(iso(r.x0, r.y0), iso(r.x1, r.y0), iso(r.x1, r.y1), iso(r.x0, r.y1))} fill={r.fill}/>
            ))}
            {HERO_WALLS.map(([x0, y0, x1, y1], i) => (
                <g key={i}>
                    <polygon points={pts(iso(x0, y0), iso(x1, y1), iso(x1, y1, h), iso(x0, y0, h))} fill="url(#p3d-wall)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5"/>
                    <polyline points={pts(iso(x0, y0, h), iso(x1, y1, h))} fill="none" stroke="#8a0e01" strokeWidth="1.6" strokeLinecap="round"/>
                </g>
            ))}
        </motion.svg>
    );
}

/* ─────────────────────────── CONTRÔLES ─────────────────────────── */

function Segmented<T extends string>({ value, options, onChange, label, glass }: {
    value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string; glass?: boolean;
}) {
    return (
        <div className={`flex p-1 rounded-xl gap-1 ${glass ? "pointer-events-auto border border-[var(--p-line)] backdrop-blur-xl shadow-lg" : ""}`}
            style={{ backgroundColor: glass ? "var(--p-glass)" : "var(--p-sunken)" }} role="radiogroup" aria-label={label}>
            {options.map(o => (
                <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${value === o.id ? SEGMENT_ON : "text-[var(--p-muted)] hover:text-[var(--p-fg)]"}`}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function GlassButton({ onClick, label, icon, active, className }: { onClick: () => void; label: string; icon: ReactNode; active?: boolean; className?: string }) {
    return (
        <button type="button" onClick={onClick} title={label} aria-label={label} aria-pressed={active}
            className={`h-8 px-2 sm:px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${active ? "text-[var(--p-accent)] bg-[var(--p-accent-soft)]" : "text-[var(--p-fg-2)] hover:bg-[var(--p-hover)]"} ${className ?? ""}`}>
            {icon}<span className="hidden sm:inline lg:hidden xl:inline">{label}</span>
        </button>
    );
}

function SaveBadge({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
    if (state === "error") {
        return (
            <button type="button" onClick={onRetry} className="h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--p-negative)] hover:bg-[var(--p-hover)]" title="Réessayer l'enregistrement">
                <CircleAlert size={14}/><span className="hidden sm:inline">Non enregistré · Réessayer</span>
            </button>
        );
    }
    const saving = state === "saving";
    return (
        <span className="h-8 px-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--p-muted)]" aria-live="polite">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14} className="text-[var(--p-positive)]"/>}
            <span className="hidden sm:inline">{saving ? "Enregistrement…" : "Enregistré"}</span>
        </span>
    );
}

/* ─────────────────────────── IMPORT : PROGRESSION ─────────────────────────── */

function ImportProgress({ step, preview }: { step: number; preview: string | null }) {
    return (
        <div className="flex flex-col sm:flex-row gap-5 items-stretch">
            <div className="relative sm:w-40 h-36 sm:h-auto shrink-0 rounded-2xl overflow-hidden border border-[var(--p-line)] bg-white">
                {preview && <img src={preview} alt="Plan importé" className="absolute inset-0 w-full h-full object-contain p-2"/>}
                <motion.div className="absolute inset-x-0 h-10 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent, rgba(211,95,82,0.28), transparent)" }}
                    animate={{ top: ["-20%", "100%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}/>
            </div>
            <ol className="flex-1 space-y-3" aria-live="polite">
                {IMPORT_STEPS.map((label, i) => {
                    const done = i < step, current = i === step;
                    return (
                        <li key={label} className="flex items-center gap-3">
                            <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${done ? "bg-[var(--p-positive)] text-[#fff]" : current ? "text-[#fff]" : "bg-[var(--p-sunken)] text-[var(--p-faint)]"}`}
                                style={current ? { background: BRAND_GRADIENT } : undefined}>
                                {done ? <Check size={14} strokeWidth={3}/> : current ? <Loader2 size={14} className="animate-spin"/> : <span className="text-[11px] font-semibold">{i + 1}</span>}
                            </span>
                            <span className={`text-sm ${current ? "font-semibold text-[var(--p-fg)]" : done ? "text-[var(--p-fg-2)]" : "text-[var(--p-faint)]"}`}>{label}</span>
                        </li>
                    );
                })}
                <li className="pt-1 text-xs text-[var(--p-muted)]">L&apos;analyse prend généralement 20 à 40 secondes.</li>
            </ol>
        </div>
    );
}

/* ─────────────────────────── SURFACES : ÉDITEUR ─────────────────────────── */

function SpecsEditor({ rows, onChange, declared, onBack, onGenerate }: {
    rows: SpecRow[]; onChange: (rows: SpecRow[]) => void; declared: number; onBack: () => void; onGenerate: () => void;
}) {
    const indoor = rows.filter(r => !OUTDOOR_KINDS.includes(r.kind)).reduce((s, r) => s + parseArea(r.area), 0);
    const outdoor = rows.filter(r => OUTDOOR_KINDS.includes(r.kind)).reduce((s, r) => s + parseArea(r.area), 0);
    const gap = declared > 0 ? (indoor - declared) / declared : 0;
    const ok = declared <= 0 || Math.abs(gap) <= 0.03;
    const canGenerate = rows.some(r => parseArea(r.area) > 0);
    const update = (key: string, patch: Partial<SpecRow>) => onChange(rows.map(r => (r.key === key ? { ...r, ...patch } : r)));

    return (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.3 }}
            className="rounded-[28px] border border-[var(--p-line)] p-4 sm:p-7 shadow-[var(--p-shadow)]" style={{ backgroundColor: "var(--p-card)" }}>
            <button type="button" onClick={onBack} className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--p-accent)]">
                <ChevronLeft size={17}/> Retour
            </button>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="mp-display text-2xl sm:text-[28px] text-[var(--p-fg)]">Pièces du bien</h2>
                    <p className="text-sm text-[var(--p-muted)] mt-1">Ajustez la liste et les surfaces : le plan est composé automatiquement.</p>
                </div>
            </div>

            <div className="mt-5 space-y-2">
                <AnimatePresence initial={false}>
                    {rows.map(r => (
                        <motion.div key={r.key} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                            <div className="grid grid-cols-[minmax(0,1fr)_96px_36px] sm:grid-cols-[170px_minmax(0,1fr)_112px_36px] gap-2 items-center rounded-2xl p-2" style={{ backgroundColor: "var(--p-sunken)" }}>
                                <select value={r.kind} onChange={e => update(r.key, { kind: e.target.value as RoomKind })} aria-label="Type de pièce"
                                    className="order-1 h-10 min-w-0 rounded-xl border px-2.5 text-sm font-medium outline-none">
                                    {ROOM_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                                </select>
                                <input value={r.name} onChange={e => update(r.key, { name: e.target.value })} placeholder={kindLabel(r.kind)} aria-label="Nom de la pièce" maxLength={40}
                                    data-slot="input" className="order-4 col-span-2 sm:order-2 sm:col-span-1 h-10 min-w-0 rounded-xl border px-3 text-sm outline-none"/>
                                <div className="order-2 sm:order-3 relative">
                                    <input value={r.area} inputMode="decimal" onChange={e => update(r.key, { area: e.target.value.replace(/[^\d.,]/g, "") })} aria-label="Surface en m²"
                                        data-slot="input" className="w-full h-10 rounded-xl border pl-3 pr-9 text-sm text-right tabular-nums outline-none"/>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--p-muted)] pointer-events-none">m²</span>
                                </div>
                                <button type="button" onClick={() => onChange(rows.filter(x => x.key !== r.key))} aria-label="Supprimer la pièce"
                                    className="order-3 sm:order-4 h-9 w-9 rounded-full flex items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-negative)] hover:bg-[var(--p-hover)]">
                                    <Trash2 size={15}/>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <button type="button" onClick={() => onChange([...rows, { key: rowKey(), kind: "chambre", name: "", area: "10" }])}
                    className="w-full h-11 rounded-2xl border border-dashed border-[var(--p-line-strong)] text-sm font-semibold text-[var(--p-accent)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--p-hover)]">
                    <Plus size={16}/> Ajouter une pièce
                </button>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                <div className="text-sm">
                    <p className="text-[var(--p-fg)]">
                        <span className="font-semibold tabular-nums">{fmtArea(indoor)}</span> habitables
                        {outdoor > 0 && <span className="text-[var(--p-muted)]"> · {fmtArea(outdoor)} extérieurs</span>}
                    </p>
                    {declared > 0 && (
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${ok ? "text-[var(--p-positive)]" : "text-[var(--p-warning)]"}`}>
                            {ok ? <Check size={12}/> : <AlertTriangle size={12}/>}
                            Surface déclarée : {fmtArea(declared)}{!ok && ` (écart ${gap > 0 ? "+" : ""}${Math.round(gap * 100)} %)`}
                        </p>
                    )}
                </div>
                <button type="button" onClick={onGenerate} disabled={!canGenerate}
                    className="h-12 px-6 rounded-2xl text-sm font-semibold text-[#fff] inline-flex items-center justify-center gap-2 shadow-lg disabled:opacity-50" style={{ background: BRAND_GRADIENT }}>
                    <Sparkles size={16}/> Générer le plan 3D
                </button>
            </div>
        </motion.section>
    );
}

/* ─────────────────────────── PAGE ─────────────────────────── */

export default function Plan3DPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { theme } = usePatrimTheme();
    const isDesktop = useIsDesktop();

    const [data, setData] = useState<Dossier | null>(null);
    const [userId, setUserId] = useState("");
    const [error, setError] = useState("");
    const [plan, setPlan] = useState<Plan3D | null>(null);
    const [save, setSave] = useState<SaveState>("idle");
    const [selected, setSelected] = useState<string | null>(null);
    const [view, setView] = useState<ViewMode>("dollhouse");
    const [furniture, setFurniture] = useState(true);
    const [pane, setPane] = useState<Pane>("3d");
    const [suggest, setSuggest] = useState(false);
    const [notes, setNotes] = useState<string[]>([]);
    const [confirmReset, setConfirmReset] = useState(false);
    const [mode, setMode] = useState<"choose" | "surfaces">("choose");
    const [rows, setRows] = useState<SpecRow[]>([]);
    const [imp, setImp] = useState<ImportState>(IDLE_IMPORT);
    const [drag, setDrag] = useState(false);
    const [ddt, setDdt] = useState<{ file: File; analysis: DdtAnalysis; page: number } | null>(null);
    const [thumbs, setThumbs] = useState<Record<number, string>>({});
    const [surfaceApplied, setSurfaceApplied] = useState(false);
    const [applying, setApplying] = useState(false);
    const pdfRef = useRef<Awaited<ReturnType<typeof openPdf>> | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Valeur en attente d'écriture : plan, null (suppression) ou undefined (rien) */
    const pending = useRef<Plan3D | null | undefined>(undefined);
    const chain = useRef<Promise<void>>(Promise.resolve());
    const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const previewUrl = useRef<string | null>(null);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace(`/login?next=${encodeURIComponent(`/plan3d/${id}`)}`); return; }
            const { data: row, error: err } = await supabase.from("estimations").select("data_json").eq("id", id).eq("user_id", user.id).maybeSingle();
            if (err || !row) { setError("Dossier introuvable."); return; }
            const d: Dossier = row.data_json || {};
            setUserId(user.id);
            setData(d);
            const saved = toPlan(d.plan3d);
            if (saved) setPlan(saved);
        })();
    }, [id, router]);

    /** Écrit quelques clés dans data_json sans toucher au reste (relu juste avant) ; undefined supprime la clé */
    const patch = useCallback(async (values: Record<string, unknown>) => {
        const { data: row, error: err } = await supabase.from("estimations").select("data_json").eq("id", id).maybeSingle();
        if (err || !row) throw err || new Error("Dossier introuvable");
        const next: Record<string, unknown> = { ...(row.data_json || {}) };
        for (const [k, v] of Object.entries(values)) {
            if (v === undefined) delete next[k];
            else next[k] = v;
        }
        const { error: upErr } = await supabase.from("estimations").update({ data_json: next }).eq("id", id);
        if (upErr) throw upErr;
    }, [id]);

    /** Écritures en série (jamais deux enregistrements concurrents dans le désordre) */
    const flushSave = useCallback(() => {
        if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
        const value = pending.current;
        if (value === undefined) return;
        pending.current = undefined;
        setSave("saving");
        chain.current = chain.current
            .then(() => patch({ plan3d: value ? { ...value, updatedAt: new Date().toISOString() } : undefined }))
            .then(
                () => { if (pending.current === undefined) setSave("saved"); },
                () => { if (pending.current === undefined) { pending.current = value; setSave("error"); } },
            );
    }, [patch]);

    const scheduleSave = useCallback((value: Plan3D | null, delay = 1000) => {
        pending.current = value;
        setSave("saving");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(flushSave, delay);
    }, [flushSave]);

    // En quittant la page : écrit tout de suite la dernière modification, libère les minuteries
    useEffect(() => {
        const timers = stepTimers.current;
        const onHide = () => flushSave();
        const onVisibility = () => { if (document.visibilityState === "hidden") flushSave(); };
        window.addEventListener("pagehide", onHide);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            window.removeEventListener("pagehide", onHide);
            document.removeEventListener("visibilitychange", onVisibility);
            flushSave();
            timers.forEach(clearTimeout);
            if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        };
    }, [flushSave]);

    /** Quitte la page une fois la dernière modification écrite (la page suivante relit le dossier) */
    const leave = (href: string) => async (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (pending.current === undefined && save !== "saving") return;
        e.preventDefault();
        flushSave();
        await chain.current;
        router.push(href);
    };

    /** Nouvelle version du plan (affichage immédiat, enregistrement différé) */
    const commit = (next: Plan3D, delay = 1000) => {
        setPlan(next);
        scheduleSave(next, delay);
    };

    const createPlan = (next: Plan3D) => {
        commit(next, 0);
        setSelected(null);
        setSuggest(false);
        setPane("3d");
        setView("dollhouse");
        setFurniture(true);
    };

    const onEditorChange = (next: Plan3D) => {
        if (plan && geometryKey(next) !== geometryKey(plan)) setSuggest(true);
        commit(next);
    };

    const refurnish = () => {
        if (!plan) return;
        commit({ ...plan, furniture: autoFurnish(plan) });
        setFurniture(true);
        setSuggest(false);
    };

    const setStyle = (style: StyleId) => { if (plan && plan.style !== style) commit({ ...plan, style }); };

    const resetPlan = () => {
        setConfirmReset(false);
        setPlan(null);
        setSelected(null);
        setSuggest(false);
        setNotes([]);
        setMode("choose");
        setImp(IDLE_IMPORT);
        scheduleSave(null, 0);
    };

    /* ── Import d'un plan 2D ── */

    const clearStepTimers = () => { stepTimers.current.forEach(clearTimeout); stepTimers.current.length = 0; };
    const advance = (step: number) => setImp(s => (s.phase === "busy" ? { ...s, step: Math.max(s.step, step) } : s));

    const setPreview = (blob: Blob | null) => {
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        const url = blob ? URL.createObjectURL(blob) : null;
        previewUrl.current = url;
        setImp(s => ({ ...s, preview: url }));
    };

    /** Libère le PDF ouvert pour les miniatures (et arrête leur génération) */
    const closePdf = () => {
        const pdf = pdfRef.current;
        pdfRef.current = null;
        if (pdf) void pdf.destroy();
    };

    /** Miniatures des pages, générées une à une (la page repérée d'abord) */
    const loadThumbs = async (pdf: NonNullable<typeof pdfRef.current>, analysis: DdtAnalysis) => {
        const order = [analysis.planPage, ...analysis.pages.slice(0, 40).map(p => p.index).filter(i => i !== analysis.planPage)];
        for (const i of order) {
            if (pdfRef.current !== pdf) return;
            try {
                const url = await pageThumbnail(pdf, i);
                if (pdfRef.current !== pdf) return;
                setThumbs(t => ({ ...t, [i]: url }));
            } catch (e) { console.warn("Miniature de page impossible :", e); }
        }
    };

    /**
     * Fichier importé : un PDF de plusieurs pages (DDT) ou contenant un tableau
     * de surfaces ouvre l'écran de vérification ; sinon lecture directe.
     */
    const startImport = async (file: File) => {
        if (!userId || imp.phase === "busy") return;
        if (!isPdfFile(file)) { void runExtract(file); return; }
        clearStepTimers();
        setImp({ ...IDLE_IMPORT, phase: "busy" });
        closePdf();
        try {
            const pdf = await openPdf(file);
            const analysis = await analyzeDdt(pdf);
            if (analysis.numPages > 1 || analysis.carrez) {
                pdfRef.current = pdf;
                setThumbs({});
                setSurfaceApplied(false);
                setImp(IDLE_IMPORT);
                setDdt({ file, analysis, page: analysis.planPage });
                void loadThumbs(pdf, analysis);
                return;
            }
            void pdf.destroy();
        } catch { /* PDF non analysable : lecture directe de la première page */ }
        setImp(IDLE_IMPORT);
        void runExtract(file);
    };

    const buildFromDdt = () => {
        if (!ddt) return;
        const { file, page, analysis } = ddt;
        closePdf();
        setDdt(null);
        void runExtract(file, page, analysis.carrez);
    };

    const surfacesFromDdt = () => {
        const t = ddt?.analysis.carrez;
        if (!t) return;
        closePdf();
        setDdt(null);
        setRows(toRows([...t.rooms, ...t.outdoor].map(r => ({ kind: r.kind, name: r.name, area: r.area }))));
        setMode("surfaces");
    };

    const applyCarrezSurface = async () => {
        const total = ddt?.analysis.carrez?.total;
        if (!total || applying) return;
        setApplying(true);
        try {
            await patch({ surface: Math.round(total * 100) / 100 });
            setData(d => (d ? { ...d, surface: Math.round(total * 100) / 100 } : d));
            setSurfaceApplied(true);
        } catch { /* l'agent peut réessayer */ }
        setApplying(false);
    };

    const runExtract = async (file: File, page = 0, carrez: CarrezTable | null = null) => {
        if (!userId) return;
        clearStepTimers();
        setImp({ ...IDLE_IMPORT, phase: "busy" });
        setPreview(null);
        stepTimers.current.push(setTimeout(() => advance(1), 3500), setTimeout(() => advance(2), 20000));
        try {
            let image: Awaited<ReturnType<typeof fileToPlanImage>>;
            try {
                image = await fileToPlanImage(file, { page });
            } catch (e) {
                console.warn("Lecture du fichier impossible :", e);
                throw new Error("Impossible de lire ce fichier. Importez un PDF ou une image (JPEG, PNG).");
            }
            setPreview(image.blob);
            const path = `${userId}/plans/${Date.now()}.jpg`;
            const { error: upErr } = await supabase.storage.from("estimation-photos").upload(path, image.blob, { contentType: "image/jpeg" });
            if (upErr) throw new Error("Envoi du plan impossible. Vérifiez votre connexion et réessayez.");
            const { data: { publicUrl } } = supabase.storage.from("estimation-photos").getPublicUrl(path);
            advance(1);
            const declaredSurface = positiveOrUndef(data?.surface);

            // 1. Lecture directe du dessin (noms de pièces lus dans le PDF), sans IA
            let result: { plan: Plan3D; notes: string[] } | null = null;
            const textSeeds = seedsFromTexts(image.texts, carrez);
            if (textSeeds.length >= 2) {
                const direct = planFromDrawing(image, textSeeds, carrez, { declared: declaredSurface, imageUrl: publicUrl, textBoxes: image.texts });
                const plan = direct ? toPlan(direct.plan) : null;
                if (direct && plan) result = { plan, notes: direct.notes };
            }

            // 2. Sinon lecture par l'IA, puis affinée sur le dessin et recalée sur le tableau des surfaces
            if (!result) {
                const res = await fetch("/api/plan3d/extract", {
                    method: "POST",
                    headers: { ...(await getAuthHeaders()), "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image: publicUrl, width: image.width, height: image.height,
                        surface: declaredSurface, rooms: positiveOrUndef(data?.rooms), propertyType: data?.propertyType || undefined,
                        carrez: carrez ? { rooms: carrez.rooms, outdoor: carrez.outdoor, total: carrez.total } : undefined,
                    }),
                });
                const json: ExtractResponse = await res.json().catch(() => ({ success: false }));
                const notesOf = Array.isArray(json.notes) ? json.notes.filter((n): n is string => typeof n === "string") : [];
                const got = res.ok && json.success ? toPlan(json.plan) : null;
                if (!got) {
                    const err = new Error(json.error || "Le plan n'a pas pu être lu. Essayez une image plus nette ou créez le plan à partir des surfaces.");
                    setImp(s => ({ ...s, notes: notesOf }));
                    throw err;
                }
                const aiSeeds = seedsFromPlan(got, carrez);
                const drawn = planFromDrawing(image, aiSeeds, carrez, { declared: declaredSurface, imageUrl: publicUrl });
                const drawnPlan = drawn ? toPlan(drawn.plan) : null;
                if (drawn && drawnPlan) result = { plan: drawnPlan, notes: ["Pièces identifiées par l'IA, contours relevés sur le dessin.", ...drawn.notes.slice(1)] };
                else {
                    const refined = refineWithTable(got, carrez);
                    result = { plan: toPlan(refined.plan) ?? got, notes: refined.note ? [...notesOf, refined.note] : notesOf };
                }
            }
            const got = result.plan;
            const notesOf = result.notes;
            clearStepTimers();
            advance(3);
            const built: Plan3D = { ...got, furniture: autoFurnish(got) };
            await wait(650);
            setImp(IDLE_IMPORT);
            setPreview(null);
            setNotes(notesOf);
            createPlan(built);
        } catch (e) {
            clearStepTimers();
            setImp(s => ({ ...s, phase: "error", error: e instanceof Error && e.message ? e.message : "Une erreur est survenue." }));
        }
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void startImport(file);
    };

    const openSurfaces = () => {
        setRows(toRows(defaultRoomSpecs(Number(data?.surface) || 60, Number(data?.rooms) || 3)));
        setMode("surfaces");
    };

    const generate = () => {
        const specs: RoomSpec[] = rows
            .map(r => ({ kind: r.kind, name: r.name.trim() || undefined, area: parseArea(r.area) }))
            .filter(s => s.area > 0);
        if (!specs.length) return;
        const base = schematicPlan(specs);
        setNotes([]);
        createPlan({ ...base, furniture: autoFurnish(base) });
    };

    /* ── Rendu ── */

    if (error && !data) return <div className="patrim-ui min-h-screen flex items-center justify-center text-[var(--p-muted)]">{error}</div>;
    if (!data) return <div className="patrim-ui min-h-screen flex items-center justify-center text-[var(--p-muted)]"><Loader2 className="animate-spin" size={22}/></div>;

    const street = data.propertyAddress?.split(",")[0]?.trim() || "";
    const declared = Number(data.surface) || 0;
    const selectedRoomId = plan && selected && plan.rooms.some(r => r.id === selected) ? selected : null;
    const show2D = isDesktop || pane === "2d";
    const show3D = isDesktop || pane === "3d";

    const suggestChip = suggest && plan && (
        <motion.div key="suggest" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[var(--p-line)] backdrop-blur-xl pl-1 pr-1 py-1 shadow-lg" style={{ backgroundColor: "var(--p-glass)" }}>
            <button type="button" onClick={refurnish} className="h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--p-accent)] bg-[var(--p-accent-soft)]">
                <Wand2 size={13}/> Réaménager ?
            </button>
            <button type="button" onClick={() => setSuggest(false)} aria-label="Ignorer" className="h-7 w-7 rounded-full flex items-center justify-center text-[var(--p-muted)] hover:bg-[var(--p-hover)]"><X size={13}/></button>
        </motion.div>
    );

    return (
        <div className={`patrim-ui ${plan ? "h-[100dvh] overflow-hidden flex flex-col" : "min-h-screen"}`}>
            {/* Barre supérieure */}
            <header className="sticky top-0 z-40 border-b border-[var(--p-line)] backdrop-blur-xl" style={{ backgroundColor: "var(--p-glass)" }}>
                <div className="h-14 px-2 sm:px-4 flex items-center gap-1.5 sm:gap-3">
                    <Link href={`/estimation/${id}`} onClick={leave(`/estimation/${id}`)} className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-fg)] hover:bg-[var(--p-hover)]" aria-label="Retour au dossier">
                        <ArrowLeft size={18}/>
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] sm:text-[17px] font-semibold text-[var(--p-fg)] leading-tight tracking-[-0.02em]">Plan 3D</p>
                        <p className="text-xs text-[var(--p-muted)] truncate">
                            {street || data.clientName || "Dossier"}
                            {plan && <span className="tabular-nums"> · {fmtArea(indoorArea(plan))}</span>}
                        </p>
                    </div>
                    {(plan || save === "saving" || save === "error") && <SaveBadge state={save} onRetry={() => { if (pending.current === undefined) pending.current = plan; flushSave(); }}/>}
                    <ThemeToggle className="!rounded-xl !w-10 !h-10 shrink-0"/>
                    <Link href={`/rdv/${id}#visite-3d`} onClick={leave(`/rdv/${id}#visite-3d`)} className="h-10 px-3 sm:px-4 shrink-0 rounded-xl text-sm font-semibold text-[#fff] inline-flex items-center gap-2 shadow-md" style={{ background: BRAND_GRADIENT }} aria-label="Présenter">
                        <Presentation size={16}/><span className="hidden sm:inline">Présenter</span>
                    </Link>
                </div>
            </header>

            {plan ? (
                /* ── Atelier ── */
                <main className="flex-1 min-h-0 flex flex-col">
                    {!isDesktop && (
                        <div className="px-3 pt-3 flex items-center justify-between gap-2">
                            <Segmented label="Affichage" value={pane} onChange={setPane} options={[{ id: "2d", label: "Plan 2D" }, { id: "3d", label: "3D" }]}/>
                            <AnimatePresence>{pane === "2d" && suggestChip}</AnimatePresence>
                        </div>
                    )}
                    <div className="flex-1 min-h-0 p-3 grid gap-3 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                        {show2D && (
                            <section className="relative min-h-0 rounded-[24px] overflow-hidden border border-[var(--p-line)] shadow-[var(--p-shadow)]" style={{ backgroundColor: "var(--p-card)" }} aria-label="Plan 2D">
                                <PlanEditor2D plan={plan} onChange={onEditorChange} selectedRoomId={selectedRoomId} onSelectRoom={setSelected}
                                    declaredSurface={declared || undefined} showSource={!!plan.source} className="absolute inset-0"/>
                            </section>
                        )}
                        {/* La scène 3D reste montée (masquée sur téléphone en mode Plan 2D) : pas de démontage du canvas à chaque bascule */}
                        {(
                            <section className={`relative min-h-0 rounded-[24px] overflow-hidden border border-[var(--p-line)] shadow-[var(--p-shadow)] ${show3D ? "" : "hidden"}`} style={{ backgroundColor: "var(--p-card)" }} aria-label="Vue 3D" aria-hidden={!show3D}>
                                <Scene3D plan={plan} view={view} showFurniture={furniture} showLabels selectedRoomId={selectedRoomId} onSelectRoom={setSelected}
                                    theme={theme} className="absolute inset-0"/>

                                {/* Commandes flottantes */}
                                <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 pointer-events-none">
                                    <Segmented label="Vue" value={view} onChange={setView} options={VIEWS} glass/>
                                    <div className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-xl border border-[var(--p-line)] backdrop-blur-xl shadow-lg" style={{ backgroundColor: "var(--p-glass)" }}>
                                        <GlassButton label="Meubles" icon={<Sofa size={15}/>} active={furniture} onClick={() => setFurniture(v => !v)}/>
                                        <GlassButton label="Réaménager" icon={<Wand2 size={15}/>} onClick={refurnish}/>
                                        <GlassButton label="Recommencer" icon={<RotateCcw size={15}/>} onClick={() => setConfirmReset(true)}/>
                                    </div>
                                </div>

                                <div className="absolute bottom-3 inset-x-3 flex flex-col items-center gap-2 pointer-events-none">
                                    <AnimatePresence>{suggestChip}</AnimatePresence>
                                    <div className="pointer-events-auto max-w-full flex gap-1 p-1 rounded-2xl border border-[var(--p-line)] backdrop-blur-xl shadow-lg overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                        style={{ backgroundColor: "var(--p-glass)" }} role="radiogroup" aria-label="Style d'aménagement">
                                        {STYLE_LIST.map(s => {
                                            const on = plan.style === s.id;
                                            return (
                                                <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setStyle(s.id)} title={s.description}
                                                    className={`h-9 pl-2 pr-3 shrink-0 rounded-xl inline-flex items-center gap-2 text-xs font-semibold transition-all ${on ? SEGMENT_ON : "text-[var(--p-fg-2)] hover:bg-[var(--p-hover)]"}`}>
                                                    <span className="h-4 w-4 rounded-full border border-[rgba(0,0,0,0.12)] shrink-0"
                                                        style={{ background: `linear-gradient(135deg, ${s.floor("sejour").base} 0 50%, ${s.fabric} 50% 78%, ${s.accent} 78%)` }}/>
                                                    {s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </main>
            ) : (
                /* ── Accueil : choix de la méthode ── */
                <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14" style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}>
                    <AnimatePresence mode="wait">
                        {ddt ? (
                            <DdtReview key="ddt" fileName={ddt.file.name} analysis={ddt.analysis} page={ddt.page} thumbs={thumbs} declared={declared}
                                surfaceApplied={surfaceApplied} applying={applying}
                                onPage={i => setDdt(d => (d ? { ...d, page: i } : d))} onBuild={buildFromDdt} onSurfacesOnly={surfacesFromDdt}
                                onApplySurface={() => void applyCarrezSurface()} onBack={() => { closePdf(); setDdt(null); }}/>
                        ) : mode === "surfaces" ? (
                            <SpecsEditor key="surfaces" rows={rows} onChange={setRows} declared={declared} onBack={() => setMode("choose")} onGenerate={generate}/>
                        ) : (
                            <motion.div key="choose" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
                                <div className="grid md:grid-cols-[minmax(0,1fr)_auto] items-center gap-6 md:gap-10">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--p-accent)]">Visite 3D</p>
                                        <h1 className="mp-display text-[34px] sm:text-5xl leading-[1.05] text-[var(--p-fg)] mt-2">Donnez du volume<br className="hidden sm:block"/> au plan du bien.</h1>
                                        <p className="text-[15px] sm:text-base text-[var(--p-fg-2)] mt-4 max-w-xl">
                                            Une maquette meublée, à l&apos;échelle, que vous ferez visiter à vos clients pendant le rendez-vous. Deux façons de commencer.
                                        </p>
                                    </div>
                                    <div className="flex justify-center md:justify-end"><HeroIllustration/></div>
                                </div>

                                <div className="mt-8 sm:mt-12 grid md:grid-cols-2 gap-4 sm:gap-5">
                                    {/* Importer un plan */}
                                    <div className="rounded-[28px] border border-[var(--p-line)] p-5 sm:p-7 shadow-[var(--p-shadow)] flex flex-col" style={{ backgroundColor: "var(--p-card)" }}>
                                        <div className="flex items-start gap-4">
                                            <span className="h-12 w-12 shrink-0 rounded-[16px] flex items-center justify-center text-[#fff] shadow-md" style={{ background: BRAND_GRADIENT }}><FileUp size={22}/></span>
                                            <div className="min-w-0">
                                                <h2 className="text-xl font-bold tracking-[-0.02em] text-[var(--p-fg)]">Importer un plan</h2>
                                                <p className="text-sm text-[var(--p-muted)] mt-1">PDF ou photo du plan : l&apos;IA relève les pièces, portes et fenêtres, puis met à l&apos;échelle.</p>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex-1 flex flex-col">
                                            {imp.phase === "busy" ? (
                                                <ImportProgress step={imp.step} preview={imp.preview}/>
                                            ) : (
                                                <>
                                                    <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()}
                                                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                                                        onDragOver={e => { e.preventDefault(); if (!drag) setDrag(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false); }} onDrop={onDrop}
                                                        className={`flex-1 min-h-[168px] rounded-[22px] border-2 border-dashed flex flex-col items-center justify-center text-center gap-2 px-4 py-6 cursor-pointer transition-colors ${drag ? "border-[var(--p-accent)] bg-[var(--p-accent-soft)]" : "border-[var(--p-line-strong)] hover:bg-[var(--p-hover)]"}`}>
                                                        <motion.span animate={drag ? { y: -4, scale: 1.05 } : { y: 0, scale: 1 }} className="h-11 w-11 rounded-full flex items-center justify-center text-[var(--p-accent)] bg-[var(--p-accent-soft)]"><FileUp size={20}/></motion.span>
                                                        <p className="text-sm font-semibold text-[var(--p-fg)]">Déposez le plan ici</p>
                                                        <p className="text-xs text-[var(--p-muted)]">ou <span className="text-[var(--p-accent)] font-semibold">choisissez un fichier</span> · PDF, JPEG, PNG</p>
                                                    </div>
                                                    {imp.phase === "error" && (
                                                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl p-3.5 border border-[var(--p-line)]" style={{ backgroundColor: "var(--p-sunken)" }} role="alert">
                                                            <p className="text-sm text-[var(--p-negative)] flex items-start gap-2"><CircleAlert size={16} className="shrink-0 mt-0.5"/>{imp.error}</p>
                                                            {imp.notes.length > 0 && (
                                                                <ul className="mt-2 ml-6 space-y-0.5 text-xs text-[var(--p-muted)] list-disc">{imp.notes.slice(0, 4).map((n, i) => <li key={i}>{n}</li>)}</ul>
                                                            )}
                                                            <button type="button" onClick={openSurfaces} className="mt-2.5 ml-6 text-sm font-semibold text-[var(--p-accent)] inline-flex items-center gap-1.5">
                                                                <LayoutGrid size={14}/> Créer à partir des surfaces
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </>
                                            )}
                                            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                                                onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void startImport(f); }}/>
                                        </div>
                                    </div>

                                    {/* Créer à partir des surfaces */}
                                    <button type="button" onClick={openSurfaces} disabled={imp.phase === "busy"}
                                        className="group text-left rounded-[28px] border border-[var(--p-line)] p-5 sm:p-7 shadow-[var(--p-shadow)] flex flex-col transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0" style={{ backgroundColor: "var(--p-card)" }}>
                                        <div className="flex items-start gap-4">
                                            <span className="h-12 w-12 shrink-0 rounded-[16px] flex items-center justify-center bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] shadow-md"><LayoutGrid size={22}/></span>
                                            <div className="min-w-0">
                                                <h2 className="text-xl font-bold tracking-[-0.02em] text-[var(--p-fg)]">Créer à partir des surfaces</h2>
                                                <p className="text-sm text-[var(--p-muted)] mt-1">Pas de plan sous la main ? Listez les pièces et leurs surfaces : un plan schématique est composé pour vous.</p>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex-1 min-h-[168px] rounded-[22px] p-4 flex flex-col justify-between gap-4" style={{ backgroundColor: "var(--p-sunken)" }}>
                                            <div className="space-y-2">
                                                {defaultRoomSpecs(declared || 60, Number(data.rooms) || 3).slice(0, 4).map((s, i) => (
                                                    <div key={i} className="flex items-center justify-between text-sm">
                                                        <span className="text-[var(--p-fg-2)]">{s.name || kindLabel(s.kind)}</span>
                                                        <span className="tabular-nums text-[var(--p-muted)]">{fmtArea(s.area)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="self-start h-10 px-4 rounded-xl text-sm font-semibold bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] inline-flex items-center gap-2 transition-transform group-hover:translate-x-0.5">
                                                Commencer <ChevronLeft size={16} className="rotate-180"/>
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            )}

            {/* Notes de lecture du plan */}
            <AnimatePresence>
                {plan && notes.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="fixed z-40 left-3 right-3 sm:left-5 sm:right-auto sm:w-[400px] rounded-[22px] border border-[var(--p-line)] backdrop-blur-xl p-4 shadow-2xl"
                        style={{ backgroundColor: "var(--p-glass)", bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }} role="status">
                        <div className="flex items-start gap-3">
                            <span className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[var(--p-accent)] bg-[var(--p-accent-soft)]"><Info size={16}/></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[var(--p-fg)]">Lecture du plan</p>
                                <ul className="mt-1 space-y-1 text-xs text-[var(--p-fg-2)] max-h-40 overflow-y-auto">
                                    {notes.map((n, i) => <li key={i}>{n}</li>)}
                                </ul>
                            </div>
                            <button type="button" onClick={() => setNotes([])} aria-label="Fermer" className="h-8 w-8 shrink-0 -mr-1 -mt-1 rounded-full flex items-center justify-center text-[var(--p-muted)] hover:bg-[var(--p-hover)]"><X size={15}/></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation : recommencer */}
            <AnimatePresence>
                {confirmReset && (
                    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="absolute inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm" onClick={() => setConfirmReset(false)}/>
                        <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} role="alertdialog" aria-modal aria-labelledby="p3d-reset-title"
                            className="relative w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] border border-[var(--p-line)] p-6 space-y-4"
                            style={{ backgroundColor: "var(--p-card)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                            <span className="h-11 w-11 rounded-full flex items-center justify-center text-[var(--p-negative)] bg-[var(--p-accent-soft)]"><RotateCcw size={19}/></span>
                            <div>
                                <p id="p3d-reset-title" className="mp-display text-xl text-[var(--p-fg)]">Recommencer le plan ?</p>
                                <p className="text-sm text-[var(--p-muted)] mt-1">Le plan 2D, la maquette 3D et l&apos;aménagement de ce dossier seront supprimés.</p>
                            </div>
                            <div className="grid gap-2">
                                <button type="button" onClick={resetPlan} className="h-12 rounded-2xl text-sm font-semibold text-[#fff] bg-[var(--p-negative)]">Supprimer le plan</button>
                                <button type="button" onClick={() => setConfirmReset(false)} className="h-12 rounded-2xl text-sm font-semibold text-[var(--p-fg)] hover:bg-[var(--p-hover)]" style={{ backgroundColor: "var(--p-sunken)" }}>Annuler</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
