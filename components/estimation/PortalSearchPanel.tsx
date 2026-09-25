"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Search, Loader2, CheckCircle2, AlertTriangle, SlidersHorizontal, ExternalLink, Download, Circle } from "lucide-react";
import { formatNumber } from "@/lib/formatters";
import { sendCapture } from "@/lib/captureClient";
import { detectExtension, MIN_SEARCH_VERSION, runPortalSearches, supportsSearch, type SearchProgress, type SearchedPage } from "@/lib/extensionBridge";
import { buildPortalSearches, defaultCriteria, normalizeCriteria, PORTALS, resolveCommune, type PortalKey, type SearchCriteria } from "@/lib/portalSearch";

/* ============================================================
   « Chercher les annonces similaires » (étape Marché)
   Un clic : l'extension ouvre les recherches pré-remplies sur les
   portails, lit les pages de résultats, puis chaque page est
   analysée (IA) et triée (biens similaires) avant d'arriver dans
   le dossier.
   ============================================================ */

interface Props {
    estimationId: string | null;
    subject: {
        propertyType: string; propertyAddress: string; surface: number; rooms: number;
        lowPrice: number; highPrice: number; propertyLat?: number; propertyLon?: number;
    };
    /** Appelé quand de nouvelles annonces ont été ajoutées au dossier */
    onImported: () => void;
}

type RowState = { label: string; status: "waiting" | "reading" | "read" | "empty" | "blocked" | "error" | "analyzing" | "done" | "failed"; detail?: string };

const PORTALS_KEY = "patrim:searchPortals";

/* État d'une recherche, par dossier, conservé hors du composant : changer d'étape
   pendant la recherche ne la perd pas (et n'en relance pas une seconde). */
interface RunState {
    running: boolean;
    rows: RowState[];
    summary: string;
    error: string;
    overrides: Partial<SearchCriteria>;
    commune: { city: string; code?: string; lat?: number; lon?: number } | null;
}
const EMPTY_RUN: RunState = { running: false, rows: [], summary: "", error: "", overrides: {}, commune: null };
const runStates = new Map<string, RunState>();
const runListeners = new Set<() => void>();
const getRun = (key: string) => runStates.get(key) ?? EMPTY_RUN;
const updateRun = (key: string, fn: (s: RunState) => RunState) => {
    runStates.set(key, fn(getRun(key)));
    runListeners.forEach(l => l());
};
const subscribeRuns = (l: () => void) => { runListeners.add(l); return () => { runListeners.delete(l); }; };

export default function PortalSearchPanel({ estimationId, subject, onImported }: Props) {
    const [ext, setExt] = useState<string | null | undefined>(undefined);
    const key = estimationId ?? "nouveau";
    const st = useSyncExternalStore(subscribeRuns, () => getRun(key), () => EMPTY_RUN);
    const { running, rows, summary, error, overrides, commune } = st;
    const set = (patch: Partial<RunState>) => updateRun(key, s => ({ ...s, ...patch }));
    // Critères : déduits du bien, avec les retouches éventuelles de l'agent par-dessus
    const subjectKey = `${subject.propertyType}|${subject.propertyAddress}|${subject.surface}|${subject.rooms}|${subject.lowPrice}|${subject.highPrice}|${subject.propertyLat}|${subject.propertyLon}`;
    const criteria = useMemo<SearchCriteria>(() => {
        const base = defaultCriteria(subject);
        const known = commune && commune.city === base.city ? commune : null;
        // Le centre de la commune reste à part : il ne remplace jamais la position du bien
        return { ...base, ...overrides, inseeCode: known?.code, centerLat: known?.lat, centerLon: known?.lon };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subjectKey, overrides, commune]);
    const [editing, setEditing] = useState(false);
    const [portals, setPortals] = useState<PortalKey[]>(() => {
        try {
            const saved = typeof window === "undefined" ? null : JSON.parse(localStorage.getItem(PORTALS_KEY) || "null");
            if (Array.isArray(saved) && saved.length) return saved.filter((k: string) => PORTALS.some(p => p.key === k));
        } catch { /* rien */ }
        return PORTALS.map(p => p.key);
    });

    useEffect(() => {
        let alive = true;
        void detectExtension().then(v => { if (alive) setExt(v); });
        return () => { alive = false; };
    }, []);

    const { searches, unsupported } = useMemo(() => buildPortalSearches(criteria, portals), [criteria, portals]);
    const canSearch = supportsSearch(ext ?? null);
    const ready = !!estimationId && !!criteria.city && portals.length > 0;

    const setField = <K extends keyof SearchCriteria>(k: K, v: SearchCriteria[K]) => updateRun(key, s => ({ ...s, overrides: { ...s.overrides, [k]: v } }));

    const togglePortal = (k: PortalKey) => {
        setPortals(prev => {
            const next = prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k];
            try { localStorage.setItem(PORTALS_KEY, JSON.stringify(next)); } catch { /* rien */ }
            return next;
        });
    };

    const patchRow = (i: number, patch: Partial<RowState>) =>
        updateRun(key, s => ({ ...s, rows: s.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)) }));

    const run = async () => {
        if (!estimationId || getRun(key).running) return;
        set({ running: true, error: "", summary: "" });
        try {
            let c = criteria;
            if (!c.inseeCode && c.city) {
                const found = await resolveCommune(c);
                set({ commune: { city: c.city, ...found } });
                c = { ...c, inseeCode: found.code, centerLat: found.lat, centerLon: found.lon };
            }
            const eff = normalizeCriteria(c);
            const list = buildPortalSearches(eff, portals).searches;
            if (!list.length) throw new Error("Aucun portail disponible pour cette commune.");
            set({ rows: list.map(s => ({ label: s.label, status: "waiting" as const })) });

            // 1) Lecture des pages de résultats par l'extension
            const onProgress = (p: SearchProgress) => {
                if (p.phase === "open") patchRow(0, { status: "reading" });
                if (p.phase === "read" && p.done) {
                    patchRow(p.done - 1, {
                        status: p.status === "ok" ? "read" : p.status === "empty" ? "empty" : p.status === "blocked" ? "blocked" : "error",
                        detail: p.status === "ok" ? `${p.cards} annonce${(p.cards ?? 0) > 1 ? "s" : ""} lue${(p.cards ?? 0) > 1 ? "s" : ""}` : undefined,
                    });
                    if (p.done < p.total) patchRow(p.done, { status: "reading" });
                }
            };
            const pages: SearchedPage[] = await runPortalSearches(list, onProgress);

            // 2) Analyse IA + tri, page par page (le dossier reste cohérent : doublons entre portails regroupés)
            const bounds = { surfaceMin: eff.surfaceMin, surfaceMax: eff.surfaceMax, roomsMin: eff.roomsMin, roomsMax: eff.roomsMax, radiusKm: eff.radiusKm };
            let added = 0, read = 0, skipped = 0, updated = 0, merged = 0, analyzed = 0, failed = 0, blocked = 0;
            for (let i = 0; i < pages.length; i++) {
                const pg = pages[i];
                if (pg.status !== "ok" || !pg.page) {
                    if (pg.status === "blocked") blocked++;
                    patchRow(i, {
                        status: pg.status === "empty" ? "empty" : pg.status === "blocked" ? "blocked" : "failed",
                        detail: pg.status === "blocked"
                            ? "vérification « je ne suis pas un robot » : validez-la dans la fenêtre restée ouverte, puis cliquez sur l'icône Patrim"
                            : pg.status === "empty"
                                ? "aucune annonce sur cette page (critères trop stricts ?)"
                                : `non lue${pg.error ? ` (${pg.error})` : ""}`,
                    });
                    continue;
                }
                patchRow(i, { status: "analyzing", detail: `${pg.page.cards.length} annonces lues — analyse…` });
                try {
                    const r = await sendCapture(estimationId, pg.page, true, bounds);
                    const sk = r.skipped?.length ?? 0;
                    analyzed++;
                    added += r.added; updated += r.updated; merged += r.merged; skipped += sk; read += r.found;
                    patchRow(i, { status: "done", detail: `${r.added} ajoutée${r.added > 1 ? "s" : ""}${r.updated ? `, ${r.updated} mise${r.updated > 1 ? "s" : ""} à jour` : ""}${r.merged ? `, ${r.merged} doublon${r.merged > 1 ? "s" : ""}` : ""} · ${sk} écartée${sk > 1 ? "s" : ""}` });
                    onImported();
                } catch (e) {
                    failed++;
                    patchRow(i, { status: "failed", detail: e instanceof Error ? e.message : "analyse impossible" });
                }
            }
            const parts: string[] = [];
            if (read) parts.push(`${added} annonce${added > 1 ? "s" : ""} similaire${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""} sur ${read} lue${read > 1 ? "s" : ""}${updated ? ` · ${updated} prix suivi${updated > 1 ? "s" : ""}` : ""}${merged ? ` · ${merged} doublon${merged > 1 ? "s" : ""} regroupé${merged > 1 ? "s" : ""}` : ""} · ${skipped} écartée${skipped > 1 ? "s" : ""} (trop différentes)`);
            else if (analyzed) parts.push("Aucune annonce de vente reconnue sur les pages lues.");
            if (failed) parts.push(`${failed} page${failed > 1 ? "s" : ""} non analysée${failed > 1 ? "s" : ""} (réessayez)`);
            if (blocked) parts.push(`${blocked} page${blocked > 1 ? "s" : ""} bloquée${blocked > 1 ? "s" : ""} par une vérification anti-robot`);
            if (!parts.length) parts.push("Aucune annonce lue : élargissez les critères (Modifier) puis relancez.");
            set({ summary: parts.join(" · ") });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Recherche impossible.";
            updateRun(key, s => ({
                ...s, error: msg,
                rows: s.rows.map(r => (["waiting", "reading", "read", "analyzing"].includes(r.status) ? { ...r, status: "failed" as const, detail: "interrompue" } : r)),
            }));
        } finally {
            set({ running: false });
        }
    };

    const chip = "text-[11px] px-2.5 py-1 rounded-full border border-[var(--p-line)] text-[var(--p-fg-2)]";
    const num = (v?: number) => (v ? formatNumber(v) : "…");
    const numInput = (k: keyof SearchCriteria, label: string, suffix: string) => (
        <label className="block">
            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--p-muted)] font-semibold">{label}</span>
            <div className="relative mt-1">
                <input type="number" inputMode="numeric" min={0} value={(criteria[k] as number | undefined) ?? ""}
                    onChange={e => setField(k, (e.target.value === "" ? undefined : Number(e.target.value)) as never)}
                    className="w-full h-9 rounded-lg border px-2.5 pr-9 text-sm outline-none"/>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--p-faint)]">{suffix}</span>
            </div>
        </label>
    );

    return (
        <div className="rounded-xl border border-[var(--p-line)] p-4 space-y-3" style={{ backgroundColor: "var(--p-card)" }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-[240px] flex-1">
                    <p className="text-sm font-semibold text-[var(--p-fg)]">Recherche automatique sur les portails</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {criteria.propertyType && <span className={chip}>{criteria.propertyType}</span>}
                        {(criteria.surfaceMin || criteria.surfaceMax) && <span className={chip}>{num(criteria.surfaceMin)} – {num(criteria.surfaceMax)} m²</span>}
                        {(criteria.roomsMin || criteria.roomsMax) && <span className={chip}>{criteria.roomsMin ?? "…"} – {criteria.roomsMax ?? "…"} pièces</span>}
                        {(criteria.priceMin || criteria.priceMax) && <span className={chip}>{num(criteria.priceMin)} – {num(criteria.priceMax)} €</span>}
                        <span className={chip}>{criteria.city ? `${criteria.city}${criteria.postcode ? ` (${criteria.postcode})` : ""}` : "Commune ?"} · rayon {Number.isFinite(criteria.radiusKm) && criteria.radiusKm > 0 ? criteria.radiusKm : 2} km</span>
                        {criteria.pages > 1 && <span className={chip}>{criteria.pages} pages / portail</span>}
                        <button type="button" onClick={() => setEditing(v => !v)} className="text-[11px] px-2.5 py-1 rounded-full text-[var(--p-accent)] font-semibold hover:bg-[var(--p-hover)] inline-flex items-center gap-1">
                            <SlidersHorizontal size={11}/> {editing ? "Fermer" : "Modifier"}
                        </button>
                    </div>
                </div>
                <button type="button" onClick={() => void run()} disabled={!ready || running || !canSearch}
                    className="h-11 px-5 rounded-full text-sm font-semibold text-[#fff] inline-flex items-center gap-2 disabled:opacity-50 transition-transform hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}>
                    {running ? <Loader2 size={15} className="animate-spin"/> : <Search size={15}/>}
                    {running ? "Recherche en cours…" : "Chercher les annonces similaires"}
                </button>
            </div>

            {editing && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {numInput("surfaceMin", "Surface min", "m²")}
                    {numInput("surfaceMax", "Surface max", "m²")}
                    {numInput("roomsMin", "Pièces min", "p.")}
                    {numInput("roomsMax", "Pièces max", "p.")}
                    {numInput("priceMin", "Prix min", "€")}
                    {numInput("priceMax", "Prix max", "€")}
                    {numInput("radiusKm", "Rayon", "km")}
                    <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--p-muted)] font-semibold">Pages par portail</span>
                        <select value={criteria.pages} onChange={e => setField("pages", Number(e.target.value))} className="mt-1 w-full h-9 rounded-lg border px-2.5 text-sm outline-none">
                            {[1, 2].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--p-muted)] font-semibold mr-1">Portails</span>
                        {PORTALS.map(p => (
                            <button key={p.key} type="button" onClick={() => togglePortal(p.key)} aria-pressed={portals.includes(p.key)}
                                className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${portals.includes(p.key) ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] border-transparent" : "border-[var(--p-line-strong)] text-[var(--p-muted)]"}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!estimationId && <p className="text-xs text-[var(--p-muted)]">Renseignez d&apos;abord l&apos;adresse du bien (étape 1).</p>}
            {unsupported.length > 0 && (
                <p className="text-[11px] text-[var(--p-muted)]">
                    {unsupported.join(", ")} : recherche automatique disponible à Toulouse uniquement pour l&apos;instant. Pour cette commune, faites la recherche sur le site puis cliquez sur l&apos;icône Patrim.
                </p>
            )}
            {estimationId && !criteria.city && <p className="text-xs text-[var(--p-warning)]">Adresse sans code postal : choisissez l&apos;adresse dans les suggestions à l&apos;étape 1.</p>}

            {ext !== undefined && !canSearch && (
                <div className="rounded-lg border border-[var(--p-line)] p-3 text-xs text-[var(--p-fg-2)] space-y-2" style={{ backgroundColor: "var(--p-sunken)" }}>
                    <p className="flex items-center gap-2">
                        <Download size={13} className="text-[var(--p-accent)]"/>
                        {ext
                            ? `Mettez à jour l'extension Patrim (version ${MIN_SEARCH_VERSION} requise) pour lancer la recherche en un clic.`
                            : `Installez l'extension Patrim, ou mettez-la à jour si vous l'avez déjà (version ${MIN_SEARCH_VERSION} requise), pour lancer la recherche en un clic.`}
                        <a href="/capture/installer#mise-a-jour" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--p-accent)] hover:underline">Voir comment</a>
                    </p>
                    <p className="text-[var(--p-muted)]">En attendant, ouvrez les recherches pré-remplies puis cliquez sur l&apos;icône Patrim sur chaque page :</p>
                    <div className="flex flex-wrap gap-2">
                        {searches.map(s => (
                            <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                                className="h-8 px-3 rounded-full border border-[var(--p-line-strong)] text-[var(--p-fg)] font-semibold inline-flex items-center gap-1.5 hover:bg-[var(--p-hover)]">
                                {s.label} <ExternalLink size={11}/>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {rows.length > 0 && (
                <ul className="space-y-1.5" aria-live="polite">
                    {rows.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                            {r.status === "done" ? <CheckCircle2 size={14} className="text-[var(--p-positive)] shrink-0 mt-px"/>
                                : r.status === "failed" || r.status === "empty" || r.status === "blocked" || r.status === "error" ? <AlertTriangle size={14} className="text-[var(--p-warning)] shrink-0 mt-px"/>
                                : r.status === "waiting" ? <Circle size={14} className="text-[var(--p-faint)] shrink-0 mt-px"/>
                                : <Loader2 size={14} className="animate-spin text-[var(--p-accent)] shrink-0 mt-px"/>}
                            <span className="font-semibold text-[var(--p-fg)] w-36 shrink-0">{r.label}</span>
                            <span className="text-[var(--p-muted)]">
                                {r.detail || (r.status === "waiting" ? "en attente" : r.status === "reading" ? "ouverture et lecture de la page…" : r.status === "read" ? "lue" : "")}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {summary && <p className="text-xs font-semibold text-[var(--p-fg)]">{summary}</p>}
            {error && <p className="text-xs text-[var(--p-negative)] flex items-center gap-1.5"><AlertTriangle size={13}/> {error}</p>}
            {canSearch && !running && rows.length === 0 && (
                <p className="text-[11px] text-[var(--p-faint)]">
                    Une fenêtre s&apos;ouvre quelques secondes sur chaque portail, le temps de lire les résultats, puis se referme. Seules les annonces proches de votre bien sont gardées.
                </p>
            )}
        </div>
    );
}
