"use client";

/* ============================================================
   PAGE : /estimation/express
   Estimation en rendez-vous, depuis le téléphone : adresse et
   quelques questions → ventes DVF autour du bien → fourchette
   ajustée et expliquée. Un clic crée le dossier et ouvre la
   présentation client (mode rendez-vous) ou l'éditeur complet.
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Building2, Home, Minus, Plus, Loader2, Sparkles, MapPin, Presentation, PencilRuler, RotateCcw, AlertCircle, Check, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AddressInput from "@/components/estimation/AddressInput";
import ThemeToggle from "@/components/estimation/ThemeToggle";
import type { AddressSuggestion } from "@/lib/addressClient";
import MarketBar from "@/components/rdv/MarketBar";
import { CONDITIONS, expressEstimate, fmtEur, fmtPct, type Condition, type ExpressResult } from "@/lib/expressEstimate";

interface DvfSale { id: string; date: string; price: number; surface: number; rooms: number; address: string; city: string; distance: number; pricePerSqm: number; lat?: number; lon?: number }
interface DvfStats { count: number; median: number; p25: number; p75: number }

const DPE_COLORS: Record<string, string> = { A: "#00A06D", B: "#52B153", C: "#A5CC74", D: "#F3E724", E: "#F0B328", F: "#EB8235", G: "#D7221F" };

export default function ExpressEstimationPage() {
    const router = useRouter();
    const [address, setAddress] = useState("");
    const [place, setPlace] = useState<AddressSuggestion | null>(null);
    const [propertyType, setPropertyType] = useState<"Appartement" | "Maison">("Appartement");
    const [surface, setSurface] = useState("");
    const [rooms, setRooms] = useState(3);
    const [floor, setFloor] = useState(1);
    const [hasElevator, setHasElevator] = useState(false);
    const [condition, setCondition] = useState<Condition>("bon");
    const [outdoor, setOutdoor] = useState(false);
    const [parking, setParking] = useState(false);
    const [dpe, setDpe] = useState("");
    const [clientName, setClientName] = useState("");

    const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
    const [error, setError] = useState("");
    const [stats, setStats] = useState<DvfStats | null>(null);
    const [sales, setSales] = useState<DvfSale[]>([]);
    const [radius, setRadius] = useState(500);
    const [years, setYears] = useState<number[]>([]);
    const [saving, setSaving] = useState<"" | "rdv" | "edit">("");
    const [dossierId, setDossierId] = useState<string | null>(null);

    useEffect(() => {
        void supabase.auth.getUser().then(({ data: { user } }) => { if (!user) router.replace("/login?next=/estimation/express"); });
    }, [router]);

    const S = Number(surface.replace(",", ".")) || 0;
    const ready = address.trim().length > 5 && S > 8;

    const result: ExpressResult | null = useMemo(() => stats ? expressEstimate({
        propertyType, surface: S, rooms, floor: propertyType === "Appartement" ? floor : null, hasElevator,
        condition, outdoor, parking, dpe,
    }, { medianSqm: stats.median, p25: stats.p25, p75: stats.p75, count: stats.count }) : null,
    [stats, propertyType, S, rooms, floor, hasElevator, condition, outdoor, parking, dpe]);

    const estimate = async () => {
        if (!ready) return;
        setPhase("loading");
        setError("");
        setDossierId(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const call = async (r: number) => {
                const res = await fetch("/api/comparables", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
                    body: JSON.stringify({ address: place?.label || address, surface: S, propertyType, radius: r, surfaceTolerance: 0.25, rooms: 0 }),
                });
                return { ok: res.ok, json: await res.json().catch(() => ({})) };
            };
            let r = 500;
            let out = await call(r);
            // Peu de ventes : on élargit automatiquement
            if (!out.ok || !out.json.stats || out.json.stats.count < 6) { r = 1000; out = await call(r); }
            if (!out.ok || !out.json.stats) throw new Error(out.json.error || "Aucune vente comparable trouvée autour de cette adresse.");
            setStats(out.json.stats);
            setSales(out.json.sales || []);
            setRadius(out.json.radius || r);
            setYears(out.json.years || []);
            setPhase("result");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Estimation impossible.");
            setPhase("form");
        }
    };

    const topSales = useMemo(() => [...sales]
        .sort((a, b) => Math.abs(a.surface - S) / (S || 1) + a.distance / 1000 - (Math.abs(b.surface - S) / (S || 1) + b.distance / 1000))
        .slice(0, 3), [sales, S]);

    /** Crée le dossier (une seule fois) puis ouvre la présentation ou l'éditeur */
    const openDossier = async (target: "rdv" | "edit") => {
        if (!result || !stats) return;
        setSaving(target);
        try {
            let id = dossierId;
            if (!id) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Session expirée — reconnectez-vous.");
                const amenities = [...(outdoor ? [propertyType === "Maison" ? "jardin" : "balcon"] : []), ...(parking ? ["parking"] : [])];
                const data_json = {
                    clientName, propertyAddress: place?.label || address, propertyType, surface: S, rooms,
                    floor: propertyType === "Appartement" ? (floor === 0 ? "RDC" : String(floor)) : "",
                    hasElevator: propertyType === "Appartement" ? hasElevator : false,
                    dpe, amenities, condition,
                    lowPrice: result.low, highPrice: result.high,
                    propertyLat: place?.lat, propertyLon: place?.lon,
                    marketStats: { count: stats.count, median: stats.median, p25: stats.p25, p75: stats.p75, radius, years, fetchedAt: new Date().toISOString() },
                    soldComparables: topSales.map(s => ({
                        id: `dvf-${s.id}`, address: s.city ? `${s.address}, ${s.city}` : s.address, surface: s.surface, price: s.price,
                        photoUrl: "", soldDate: s.date, distance: s.distance, rooms: s.rooms, source: "dvf", lat: s.lat, lon: s.lon,
                    })),
                    forSaleComparables: [],
                    express: { baseSqm: result.baseSqm, adjustments: result.adjustments, confidence: result.confidence, at: new Date().toISOString() },
                    status: "en_cours", statusUpdatedAt: new Date().toISOString(),
                };
                const { data: row, error: err } = await supabase.from("estimations")
                    .insert({ user_id: user.id, client_name: clientName || "Dossier Sans Nom", address: data_json.propertyAddress, data_json })
                    .select("id").single();
                if (err || !row) throw err || new Error("Création impossible");
                id = row.id as string;
                setDossierId(id);
            }
            router.push(target === "rdv" ? `/rdv/${id}` : `/estimation/${id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Création du dossier impossible.");
            setSaving("");
        }
    };

    const card = "rounded-3xl border border-[var(--p-line)] p-5";
    const label = "text-[11px] uppercase tracking-[0.04em] text-[var(--p-muted)] font-semibold";

    return (
        <div className="patrim-ui xp-body min-h-screen pb-36">
            <style>{`                .xp-body { font-family: var(--font-ios); }
                .xp-display { font-family: var(--font-ios); font-weight: 700; letter-spacing: -0.028em; }
                .xp-num { font-variant-numeric: tabular-nums; }`}</style>
            <div className="pointer-events-none fixed inset-x-0 top-0 h-72 opacity-70" style={{ background: "radial-gradient(60% 100% at 50% 0%, var(--p-accent-soft), transparent)" }}/>

            <header className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-5 flex items-center justify-between">
                <Link href="/mes-biens" className="h-10 w-10 rounded-full border border-[var(--p-line)] flex items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-fg)]" aria-label="Retour à Mes biens"><ArrowLeft size={17}/></Link>
                <ThemeToggle/>
            </header>

            <main className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
                <AnimatePresence mode="wait">
                    {phase !== "result" ? (
                        <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--p-accent)] font-semibold flex items-center gap-2"><Sparkles size={13}/> Estimation express</p>
                                <h1 className="xp-display text-[34px] sm:text-5xl leading-[1.05] text-[var(--p-fg)] mt-2">Le prix du bien,<br/>en deux minutes.</h1>
                                <p className="text-sm text-[var(--p-muted)] mt-2">Ventes réelles DVF autour de l&apos;adresse, ajustées selon l&apos;étage, l&apos;état et les prestations.</p>
                            </div>

                            <section className={card} style={{ backgroundColor: "var(--p-card)" }}>
                                <p className={label}>Adresse du bien</p>
                                <AddressInput value={address} onChange={v => { setAddress(v); setPlace(null); }} onSelect={s => { setAddress(s.label); setPlace(s); }}
                                    placeholder="Ex : 12 rue des Filatiers, Toulouse" className="mt-2 h-12 text-base"/>
                                {place && <p className="text-[11px] text-[var(--p-positive)] mt-2 flex items-center gap-1"><MapPin size={11}/> Adresse localisée</p>}
                            </section>

                            <section className={`${card} space-y-5`} style={{ backgroundColor: "var(--p-card)" }}>
                                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl" style={{ backgroundColor: "var(--p-sunken)" }}>
                                    {([["Appartement", Building2], ["Maison", Home]] as const).map(([t, Icon]) => (
                                        <button key={t} type="button" onClick={() => setPropertyType(t)} aria-pressed={propertyType === t}
                                            className={`h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${propertyType === t ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] shadow-md" : "text-[var(--p-muted)]"}`}>
                                            <Icon size={16}/> {t}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className={label}>Surface</span>
                                        <div className="relative mt-2">
                                            <input type="number" inputMode="decimal" min={0} value={surface} onChange={e => setSurface(e.target.value)} placeholder="68"
                                                className="xp-num w-full h-14 rounded-2xl border px-4 pr-12 text-2xl font-semibold outline-none"/>
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--p-muted)]">m²</span>
                                        </div>
                                    </label>
                                    <Stepper label="Pièces" value={rooms} min={1} max={12} onChange={setRooms}/>
                                </div>

                                {propertyType === "Appartement" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Stepper label="Étage" value={floor} min={0} max={30} onChange={setFloor} format={v => (v === 0 ? "RDC" : `${v}e`)}/>
                                        <div>
                                            <span className={label}>Ascenseur</span>
                                            <Toggle checked={hasElevator} onChange={setHasElevator} label={hasElevator ? "Oui" : "Non"}/>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className={`${card} space-y-4`} style={{ backgroundColor: "var(--p-card)" }}>
                                <p className={label}>État du bien</p>
                                <div className="flex flex-wrap gap-2">
                                    {CONDITIONS.map(c => (
                                        <button key={c.id} type="button" onClick={() => setCondition(c.id)} aria-pressed={condition === c.id}
                                            className={`h-10 px-4 rounded-full text-sm font-medium border transition-all ${condition === c.id ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] border-transparent" : "border-[var(--p-line-strong)] text-[var(--p-fg-2)]"}`}>
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-1">
                                    <div><span className={label}>{propertyType === "Maison" ? "Jardin / extérieur" : "Balcon / terrasse"}</span><Toggle checked={outdoor} onChange={setOutdoor} label={outdoor ? "Oui" : "Non"}/></div>
                                    <div><span className={label}>Stationnement</span><Toggle checked={parking} onChange={setParking} label={parking ? "Oui" : "Non"}/></div>
                                </div>
                                <div>
                                    <span className={label}>DPE (si connu)</span>
                                    <div className="mt-2 flex gap-1.5">
                                        {"ABCDEFG".split("").map(l => (
                                            <button key={l} type="button" onClick={() => setDpe(dpe === l ? "" : l)} aria-pressed={dpe === l}
                                                className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${dpe === l ? "ring-2 ring-offset-2 ring-offset-[var(--p-card)] ring-[var(--p-fg)] scale-105" : "opacity-80"}`}
                                                style={{ backgroundColor: DPE_COLORS[l], color: "CDE".includes(l) ? "#1a1a1a" : "#fff" }}>{l}</button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className={card} style={{ backgroundColor: "var(--p-card)" }}>
                                <label className="block">
                                    <span className={label}>Client (facultatif)</span>
                                    <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="M. et Mme Martin" className="mt-2 w-full h-12 rounded-2xl border px-4 text-base outline-none"/>
                                </label>
                            </section>

                            {error && <p className="text-sm text-[var(--p-negative)] flex items-center gap-2"><AlertCircle size={15}/> {error}</p>}
                        </motion.div>
                    ) : result && stats && (
                        <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                            <div className="relative overflow-hidden rounded-[32px] p-6 sm:p-8 text-[#fff]" style={{ background: "radial-gradient(120% 140% at 0% 0%, #b3261a 0%, #8a0e01 40%, #2a0a06 100%)", boxShadow: "0 30px 80px -30px rgba(138,14,1,0.55)" }}>
                                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full opacity-25 blur-2xl" style={{ background: "#ffb4a8" }}/>
                                <p className="relative text-[11px] uppercase tracking-[0.06em] text-[rgba(255,255,255,0.7)] font-semibold">Valeur estimée</p>
                                <p className="relative xp-display xp-num text-[44px] sm:text-6xl leading-none mt-3">{fmtEur(result.central)}</p>
                                <p className="relative xp-num text-sm text-[rgba(255,255,255,0.8)] mt-3">Fourchette {fmtEur(result.low)} – {fmtEur(result.high)}</p>
                                <div className="relative mt-5 flex flex-wrap gap-2 text-[11px]">
                                    <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.14)] xp-num">{result.sqm.toLocaleString("fr-FR")} €/m²</span>
                                    <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.14)]">Fiabilité {result.confidence}</span>
                                    <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.14)] xp-num">{stats.count} ventes · {radius} m</span>
                                </div>
                            </div>

                            <section className={card} style={{ backgroundColor: "var(--p-card)" }}>
                                <p className={label}>Position dans le marché</p>
                                <MarketBar p25={stats.p25} p75={stats.p75} median={stats.median} value={result.sqm}/>
                            </section>

                            <section className={`${card} space-y-3`} style={{ backgroundColor: "var(--p-card)" }}>
                                <p className={label}>Détail du calcul</p>
                                <Row label={`Prix médian des ventes (${years.length ? `${years[0]}–${years[years.length - 1]}` : "DVF"})`} value={`${result.baseSqm.toLocaleString("fr-FR")} €/m²`}/>
                                {result.adjustments.map(a => <Row key={a.label} label={a.label} value={fmtPct(a.pct)} tone={a.pct >= 0 ? "pos" : "neg"}/>)}
                                <div className="border-t border-[var(--p-line)] pt-3"><Row label={`${result.sqm.toLocaleString("fr-FR")} €/m² × ${S} m²`} value={fmtEur(result.central)} strong/></div>
                            </section>

                            {topSales.length > 0 && (
                                <section className="space-y-2">
                                    <p className={`${label} px-1`}>Ventes les plus proches</p>
                                    {topSales.map(s => (
                                        <div key={s.id} className="rounded-2xl border border-[var(--p-line)] p-4 flex items-center gap-3" style={{ backgroundColor: "var(--p-card)" }}>
                                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--p-accent-soft)" }}><TrendingUp size={16} className="text-[var(--p-accent)]"/></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-[var(--p-fg)] truncate">{s.address}</p>
                                                <p className="text-[11px] text-[var(--p-muted)] xp-num">{new Date(s.date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} · {Math.round(s.surface)} m² · à {Math.round(s.distance)} m</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-[var(--p-fg)] xp-num">{fmtEur(s.price)}</p>
                                                <p className="text-[11px] text-[var(--p-muted)] xp-num">{Math.round(s.pricePerSqm).toLocaleString("fr-FR")} €/m²</p>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}
                            <p className="text-[11px] text-[var(--p-faint)] px-1">Ventes notariées publiées par l&apos;État (DVF, délai de publication d&apos;environ 6 mois). Estimation indicative, à affiner avec la visite et les annonces en cours.</p>
                            {error && <p className="text-sm text-[var(--p-negative)] flex items-center gap-2"><AlertCircle size={15}/> {error}</p>}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Barre d'actions fixe (pouce) */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--p-line)] backdrop-blur-xl" style={{ backgroundColor: "var(--p-glass)", paddingBottom: "env(safe-area-inset-bottom)" }}>
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex gap-2">
                    {phase === "result" ? (
                        <>
                            <button type="button" onClick={() => { setPhase("form"); setDossierId(null); }} className="h-12 w-12 shrink-0 rounded-2xl border border-[var(--p-line-strong)] flex items-center justify-center text-[var(--p-fg)]" aria-label="Modifier"><RotateCcw size={17}/></button>
                            <button type="button" onClick={() => void openDossier("edit")} disabled={!!saving} className="h-12 flex-1 rounded-2xl border border-[var(--p-line-strong)] text-sm font-semibold text-[var(--p-fg)] flex items-center justify-center gap-2 disabled:opacity-50">
                                {saving === "edit" ? <Loader2 size={16} className="animate-spin"/> : <PencilRuler size={16}/>} Affiner
                            </button>
                            <button type="button" onClick={() => void openDossier("rdv")} disabled={!!saving} className="h-12 flex-[1.4] rounded-2xl text-sm font-semibold text-[#fff] flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}>
                                {saving === "rdv" ? <Loader2 size={16} className="animate-spin"/> : <Presentation size={16}/>} Présenter au client
                            </button>
                        </>
                    ) : (
                        <button type="button" onClick={() => void estimate()} disabled={!ready || phase === "loading"}
                            className="h-14 w-full rounded-2xl text-base font-semibold text-[#fff] flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.99]"
                            style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}>
                            {phase === "loading" ? <><Loader2 size={18} className="animate-spin"/> Analyse des ventes…</> : <><Sparkles size={18}/> Estimer le bien</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stepper({ label, value, min, max, onChange, format }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; format?: (v: number) => string }) {
    return (
        <div>
            <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--p-muted)] font-semibold">{label}</span>
            <div className="mt-2 h-14 rounded-2xl border border-[var(--p-line-strong)] flex items-center justify-between px-1.5" style={{ backgroundColor: "var(--p-field)" }}>
                <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-11 w-11 rounded-xl flex items-center justify-center text-[var(--p-fg)] hover:bg-[var(--p-hover)] active:scale-95" aria-label={`${label} moins`}><Minus size={17}/></button>
                <span className="text-2xl font-semibold text-[var(--p-fg)] tabular-nums">{format ? format(value) : value}</span>
                <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="h-11 w-11 rounded-xl flex items-center justify-center text-[var(--p-fg)] hover:bg-[var(--p-hover)] active:scale-95" aria-label={`${label} plus`}><Plus size={17}/></button>
            </div>
        </div>
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
            className="mt-2 h-14 w-full rounded-2xl border border-[var(--p-line-strong)] flex items-center justify-between px-4 text-base font-medium text-[var(--p-fg)]" style={{ backgroundColor: "var(--p-field)" }}>
            {label}
            <span className={`w-12 h-7 rounded-full p-1 transition-colors ${checked ? "bg-[var(--p-accent)]" : "bg-[var(--p-line-strong)]"}`}>
                <span className={`flex items-center justify-center w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`}>{checked && <Check size={11} className="text-[var(--p-accent)]"/>}</span>
            </span>
        </button>
    );
}

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: "pos" | "neg"; strong?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className={strong ? "font-semibold text-[var(--p-fg)]" : "text-[var(--p-fg-2)]"}>{label}</span>
            <span className={`tabular-nums font-semibold whitespace-nowrap shrink-0 ${tone === "pos" ? "text-[var(--p-positive)]" : tone === "neg" ? "text-[var(--p-negative)]" : "text-[var(--p-fg)]"} ${strong ? "text-base" : ""}`}>{value}</span>
        </div>
    );
}
