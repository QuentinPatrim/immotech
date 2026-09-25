"use client";

/* ============================================================
   PAGE : /capture
   Ouverte par l'extension « Patrim – Capture d'annonces » avec la
   page du portail compressée dans l'adresse (#d=…). L'agent choisit
   le dossier (le dernier ouvert est proposé), l'IA lit les annonces,
   elles rejoignent l'étape « Marché » du dossier.
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, AlertCircle, Download, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { portalFromUrl, type CapturePayload } from "@/lib/marketListings";
import { decodeCapture, sendCapture, LAST_ESTIMATION_KEY, type CaptureResult } from "@/lib/captureClient";
import ListingCard from "@/components/estimation/ListingCard";
import ThemeToggle from "@/components/estimation/ThemeToggle";

const STORAGE_KEY = "patrim:pendingCapture";

interface Dossier { id: string; address: string | null; client_name: string | null; created_at: string }

export default function CapturePage() {
    const router = useRouter();
    const [payload, setPayload] = useState<CapturePayload | null>(null);
    const [dossiers, setDossiers] = useState<Dossier[]>([]);
    const [dossierId, setDossierId] = useState("");
    const [phase, setPhase] = useState<"loading" | "empty" | "ready" | "importing" | "done">("loading");
    const [error, setError] = useState("");
    const [result, setResult] = useState<CaptureResult | null>(null);

    useEffect(() => {
        (async () => {
            // 1) Capture : dans l'adresse (#d=…) ou mise de côté avant une connexion
            let data: CapturePayload | null = null;
            const match = window.location.hash.match(/[#&]d=([^&]+)/);
            try {
                if (match) {
                    data = await decodeCapture(match[1]);
                    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    window.history.replaceState(null, "", "/capture");
                } else {
                    const saved = sessionStorage.getItem(STORAGE_KEY);
                    if (saved) data = JSON.parse(saved);
                }
            } catch {
                setError("La capture est illisible. Relancez-la depuis la page du portail.");
            }
            if (!data) { setPhase("empty"); return; }

            // 2) Connexion (on revient ici ensuite, la capture est gardée)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace(`/login?next=${encodeURIComponent("/capture")}`); return; }

            // 3) Dossiers de l'agent, le dernier ouvert en premier
            const { data: rows } = await supabase.from("estimations").select("id,address,client_name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
            const list = (rows ?? []) as Dossier[];
            let preferred = "";
            try { preferred = JSON.parse(localStorage.getItem(LAST_ESTIMATION_KEY) || "{}").id || ""; } catch { /* rien */ }
            setDossiers(list);
            setDossierId(list.some(d => d.id === preferred) ? preferred : list[0]?.id || "");
            setPayload(data);
            setPhase("ready");
        })();
    }, [router]);

    const portal = useMemo(() => (payload ? portalFromUrl(payload.url) : ""), [payload]);
    const cardCount = payload?.cards.length ?? 0;

    const runImport = async () => {
        if (!payload || !dossierId) return;
        setPhase("importing");
        setError("");
        try {
            const res = await sendCapture(dossierId, payload);
            setResult(res);
            setPhase("done");
            sessionStorage.removeItem(STORAGE_KEY);
            try { localStorage.setItem(LAST_ESTIMATION_KEY, JSON.stringify({ id: dossierId, at: Date.now() })); } catch { /* rien */ }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Import impossible.");
            setPhase("ready");
        }
    };

    const current = result?.listings
        ? [...result.listings].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
        : [];

    return (
        <div className="patrim-ui cap-body min-h-screen">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&display=swap');
                .cap-body { font-family: 'Inter Tight', Inter, sans-serif; }
                .cap-display { font-family: 'Fraunces', Georgia, serif; }`}</style>
            <header className="max-w-5xl mx-auto px-6 pt-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src="/logo-patrim.png" alt="Patrim" className="h-8 object-contain"/>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--p-muted)] font-semibold">Capture d&apos;annonces</span>
                </div>
                <ThemeToggle/>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                {phase === "loading" && (
                    <div className="py-24 text-center text-[var(--p-muted)]"><Loader2 className="animate-spin mx-auto mb-3" size={26}/>Lecture de la capture…</div>
                )}

                {phase === "empty" && (
                    <div className="max-w-xl mx-auto text-center py-16 space-y-4">
                        <h1 className="cap-display text-4xl text-[var(--p-fg)]">Aucune capture en attente</h1>
                        {error && <p className="text-sm text-[var(--p-negative)]">{error}</p>}
                        <p className="text-sm text-[var(--p-muted)]">Ouvrez une page de résultats ou une annonce sur un portail (Leboncoin, SeLoger, Bien&apos;ici, PAP…) puis cliquez sur l&apos;icône Patrim de votre navigateur.</p>
                        <Link href="/capture/installer" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] text-sm font-semibold">
                            <Download size={15}/> Installer l&apos;extension
                        </Link>
                    </div>
                )}

                {(phase === "ready" || phase === "importing") && payload && (
                    <div className="max-w-2xl mx-auto rounded-[28px] border border-[var(--p-line)] p-8 space-y-6" style={{ backgroundColor: "var(--p-card)", boxShadow: "var(--p-shadow)" }}>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--p-accent)] font-semibold">{portal}</p>
                            <h1 className="cap-display text-3xl text-[var(--p-fg)] mt-1">
                                {cardCount >= 3 ? `${cardCount} annonces détectées` : "1 annonce détectée"}
                            </h1>
                            <p className="text-xs text-[var(--p-muted)] mt-1 truncate">{payload.title}</p>
                        </div>

                        {dossiers.length === 0 ? (
                            <p className="text-sm text-[var(--p-muted)]">Créez d&apos;abord un dossier d&apos;estimation dans « Mes biens ».</p>
                        ) : (
                            <label className="block space-y-2">
                                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--p-muted)] font-semibold">Ajouter au dossier</span>
                                <select value={dossierId} onChange={e => setDossierId(e.target.value)} disabled={phase === "importing"}
                                    className="w-full h-12 rounded-2xl border px-4 text-sm outline-none cursor-pointer">
                                    {dossiers.map(d => (
                                        <option key={d.id} value={d.id}>{d.address || "Adresse non renseignée"}{d.client_name ? ` — ${d.client_name}` : ""}</option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {error && <p className="text-sm text-[var(--p-negative)] flex items-center gap-2"><AlertCircle size={15}/> {error}</p>}

                        <button type="button" onClick={runImport} disabled={phase === "importing" || !dossierId}
                            className="w-full h-12 rounded-full text-sm font-semibold text-[#fff] flex items-center justify-center gap-2 disabled:opacity-60 transition-transform hover:scale-[1.01]"
                            style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}>
                            {phase === "importing"
                                ? <><Loader2 size={16} className="animate-spin"/> Analyse des annonces par l&apos;IA…</>
                                : <><Sparkles size={16}/> Analyser et ajouter au dossier</>}
                        </button>
                        <p className="text-[11px] text-[var(--p-muted)] text-center">
                            Prix, surface, date de parution, baisses, particularités : comptez 10 à 30 secondes.
                        </p>
                    </div>
                )}

                {phase === "done" && result && (
                    <div className="space-y-8">
                        <div className="flex items-end justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--p-accent)] font-semibold flex items-center gap-2"><CheckCircle2 size={14}/> {result.portal}</p>
                                <h1 className="cap-display text-4xl text-[var(--p-fg)] mt-1">
                                    {result.added} nouvelle{result.added > 1 ? "s" : ""} annonce{result.added > 1 ? "s" : ""}
                                </h1>
                                <p className="text-sm text-[var(--p-muted)] mt-1">
                                    {result.updated > 0 && `${result.updated} mise${result.updated > 1 ? "s" : ""} à jour (prix suivis) · `}
                                    {result.merged > 0 && `${result.merged} déjà vue${result.merged > 1 ? "s" : ""} sur un autre portail · `}
                                    {result.listings.length} annonce{result.listings.length > 1 ? "s" : ""} dans le dossier
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => window.close()} className="h-11 px-5 rounded-full border border-[var(--p-line-strong)] text-sm font-semibold text-[var(--p-fg)] hover:bg-[var(--p-hover)]">
                                    Continuer sur le portail
                                </button>
                                <Link href={`/estimation/${dossierId}?step=3`} className="h-11 px-5 rounded-full bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] text-sm font-semibold inline-flex items-center gap-2">
                                    Choisir dans le dossier <ArrowRight size={15}/>
                                </Link>
                            </div>
                        </div>
                        {result.found === 0 && (
                            <p className="text-sm text-[var(--p-warning)] flex items-center gap-2"><AlertCircle size={15}/> Aucune annonce de vente reconnue sur cette page.</p>
                        )}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {current.map(l => <ListingCard key={l.id} listing={l}/>)}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
