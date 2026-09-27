"use client";

/* ============================================================
   PAGE : /rdv/[id]  —  MODE RENDEZ-VOUS
   Présentation client d'un dossier (téléphone, tablette,
   ordinateur). Barre de l'agent discrète : parcours vendeur /
   acquéreur, prix demandé, plein écran, fin de rendez-vous
   (avis remis → relance à J+7, partage du lien d'avis).
   Aucune donnée interne n'apparaît dans la présentation.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Maximize2, Minimize2, Share2, CheckCircle2, PencilRuler, Loader2, X, Copy, Check, MessageCircle, Mail, Link2, BellRing } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/estimation/ThemeToggle";
import MeetingPresentation, { type MeetingMode, type PresentationData } from "@/components/rdv/MeetingPresentation";
import type { FinancingState } from "@/components/rdv/FinancingSection";

type Meeting = { mode: MeetingMode; askingPrice?: number; financing?: FinancingState };
type Income = { income?: number; otherLoans?: number };

/** Le lien partagé reçoit le scénario de financement, jamais les revenus du client */
function toSaved(mode: MeetingMode, ask: string, fin?: FinancingState) {
    const askingPrice = Number(ask.replace(/\s/g, "")) || undefined;
    if (!fin) return { meeting: { mode, askingPrice } as Meeting };
    const { income, otherLoans, ...pub } = fin;
    return { meeting: { mode, askingPrice, financing: pub } as Meeting, financingIncome: { income, otherLoans } as Income };
}

export default function MeetingPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<(PresentationData & { meeting?: Meeting; financingIncome?: Income; shareAvis?: boolean; status?: string; clientName?: string }) | null>(null);
    const [fin, setFin] = useState<FinancingState | undefined>();
    const savedRef = useRef("");
    const [error, setError] = useState("");
    const [mode, setMode] = useState<MeetingMode>("vendeur");
    const [ask, setAsk] = useState("");
    const [chrome, setChrome] = useState(true);
    const [sheet, setSheet] = useState(false);
    const [busy, setBusy] = useState<"" | "share" | "remise">("");
    const [copied, setCopied] = useState(false);
    const [done, setDone] = useState("");

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace(`/login?next=${encodeURIComponent(`/rdv/${id}`)}`); return; }
            const { data: row, error: err } = await supabase.from("estimations").select("data_json").eq("id", id).eq("user_id", user.id).maybeSingle();
            if (err || !row) { setError("Dossier introuvable."); return; }
            const d = row.data_json || {};
            setData(d);
            if (d.meeting?.mode) setMode(d.meeting.mode);
            if (d.meeting?.askingPrice) setAsk(String(d.meeting.askingPrice));
            const f = d.meeting?.financing ? { ...d.meeting.financing, ...(d.financingIncome || {}) } : undefined;
            setFin(f);
            savedRef.current = JSON.stringify(toSaved(d.meeting?.mode || "vendeur", d.meeting?.askingPrice ? String(d.meeting.askingPrice) : "", f));
        })();
    }, [id, router]);

    /** Écrit quelques clés dans data_json sans toucher au reste (relu juste avant) */
    const patch = useCallback(async (values: Record<string, unknown>) => {
        const { data: row, error: err } = await supabase.from("estimations").select("data_json").eq("id", id).maybeSingle();
        if (err || !row) throw err || new Error("Dossier introuvable");
        const next = { ...(row.data_json || {}), ...values };
        const { error: upErr } = await supabase.from("estimations").update({ data_json: next }).eq("id", id);
        if (upErr) throw upErr;
        setData(prev => (prev ? { ...prev, ...values } : prev));
    }, [id]);

    // Parcours, prix demandé et scénario de financement mémorisés dans le dossier
    useEffect(() => {
        if (!data) return;
        const values = toSaved(mode, ask, fin);
        const key = JSON.stringify(values);
        if (key === savedRef.current) return;
        const t = setTimeout(() => { savedRef.current = key; void patch(values).catch(() => { savedRef.current = ""; }); }, 700);
        return () => clearTimeout(t);
    }, [mode, ask, fin, data, patch]);

    useEffect(() => {
        const onFs = () => setChrome(!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) { await document.exitFullscreen(); return; }
        try { await document.documentElement.requestFullscreen(); } catch { setChrome(false); }
    };

    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/avis/${id}` : "";

    const openShare = async () => {
        setSheet(true);
        if (data?.shareAvis) return;
        setBusy("share");
        try { await patch({ shareAvis: true }); } catch { setError("Partage impossible pour le moment."); }
        setBusy("");
    };

    const stopShare = async () => {
        setBusy("share");
        try { await patch({ shareAvis: false }); setSheet(false); } catch { /* rien */ }
        setBusy("");
    };

    const markDelivered = async () => {
        setBusy("remise");
        try {
            const now = new Date().toISOString();
            await patch({ status: data?.status && data.status !== "en_cours" ? data.status : "remise", statusUpdatedAt: now });
            setDone("Avis remis : relance proposée dans 7 jours dans « Mes biens ».");
        } catch { setError("Enregistrement impossible."); }
        setBusy("");
    };

    const copy = async () => {
        try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* rien */ }
    };

    if (error && !data) return <div className="patrim-ui min-h-screen flex items-center justify-center text-[var(--p-muted)]">{error}</div>;
    if (!data) return <div className="patrim-ui min-h-screen flex items-center justify-center text-[var(--p-muted)]"><Loader2 className="animate-spin" size={22}/></div>;

    const message = `Bonjour, voici l'avis de valeur de votre bien${data.propertyAddress ? ` (${data.propertyAddress.split(",")[0]})` : ""} : ${shareUrl}`;

    return (
        <div className="patrim-ui min-h-screen">
            {/* Barre de l'agent */}
            <AnimatePresence>
                {chrome && (
                    <motion.div initial={{ y: -80 }} animate={{ y: 0 }} exit={{ y: -80 }} className="fixed top-3 inset-x-3 sm:inset-x-6 z-40">
                        <div className="max-w-5xl mx-auto rounded-2xl border border-[var(--p-line)] backdrop-blur-xl px-2 py-2 flex items-center gap-2 shadow-lg" style={{ backgroundColor: "var(--p-glass)" }}>
                            <Link href="/mes-biens" className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-fg)] hover:bg-[var(--p-hover)]" aria-label="Retour"><ArrowLeft size={17}/></Link>
                            <div className="flex p-1 rounded-xl gap-1" style={{ backgroundColor: "var(--p-sunken)" }} role="radiogroup" aria-label="Parcours">
                                {(["vendeur", "acquereur"] as const).map(m => (
                                    <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                                        className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${mode === m ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] shadow" : "text-[var(--p-muted)]"}`}>
                                        {m === "vendeur" ? "Vendeur" : "Acquéreur"}
                                    </button>
                                ))}
                            </div>
                            {mode === "acquereur" && (
                                <div className="relative w-40 hidden sm:block">
                                    <input inputMode="numeric" value={ask} onChange={e => setAsk(e.target.value.replace(/[^\d\s]/g, ""))} placeholder="Prix demandé"
                                        className="w-full h-10 rounded-xl border px-3 pr-6 text-sm outline-none tabular-nums" aria-label="Prix demandé"/>
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--p-muted)]">€</span>
                                </div>
                            )}
                            <div className="ml-auto flex items-center gap-1">
                                <Link href={`/estimation/${id}`} className="hidden sm:flex h-10 w-10 rounded-xl items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-fg)] hover:bg-[var(--p-hover)]" title="Ouvrir le dossier"><PencilRuler size={16}/></Link>
                                <ThemeToggle className="!rounded-xl !w-10 !h-10"/>
                                <button type="button" onClick={() => void toggleFullscreen()} className="hidden sm:flex h-10 w-10 rounded-xl items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-fg)] hover:bg-[var(--p-hover)]" title="Plein écran"><Maximize2 size={16}/></button>
                                <button type="button" onClick={() => void openShare()} className="h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#fff] inline-flex items-center gap-2" style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}>
                                    <Share2 size={15}/><span className="hidden sm:inline">Fin de rendez-vous</span>
                                </button>
                            </div>
                        </div>
                        {mode === "acquereur" && (
                            <div className="sm:hidden max-w-5xl mx-auto mt-2 relative">
                                <input inputMode="numeric" value={ask} onChange={e => setAsk(e.target.value.replace(/[^\d\s]/g, ""))} placeholder="Prix demandé par le vendeur"
                                    className="w-full h-12 rounded-2xl border px-4 pr-8 text-base outline-none tabular-nums shadow-lg" style={{ backgroundColor: "var(--p-glass)" }} aria-label="Prix demandé (mobile)"/>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--p-muted)]">€</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            {!chrome && (
                <button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); setChrome(true); }}
                    className="fixed top-4 right-4 z-40 h-10 w-10 rounded-full bg-[rgba(0,0,0,0.45)] text-[#fff] backdrop-blur flex items-center justify-center opacity-40 hover:opacity-100" aria-label="Quitter le plein écran"><Minimize2 size={16}/></button>
            )}

            <MeetingPresentation data={data} mode={mode} askingPrice={Number(ask.replace(/\s/g, "")) || undefined} financing={fin} onFinancingChange={setFin}/>

            {/* Fin de rendez-vous */}
            <AnimatePresence>
                {sheet && (
                    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)] backdrop-blur-sm" onClick={() => setSheet(false)}/>
                        <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border border-[var(--p-line)] p-6 space-y-5"
                            style={{ backgroundColor: "var(--p-card)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10.5px] uppercase tracking-[0.22em] text-[var(--p-accent)] font-semibold">Fin de rendez-vous</p>
                                    <p className="mp-display text-2xl text-[var(--p-fg)] mt-1" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Laissez l&apos;avis au client</p>
                                </div>
                                <button type="button" onClick={() => setSheet(false)} className="h-9 w-9 rounded-full flex items-center justify-center text-[var(--p-muted)] hover:bg-[var(--p-hover)]" aria-label="Fermer"><X size={17}/></button>
                            </div>
                            {busy === "share" && !data.shareAvis ? (
                                <p className="text-sm text-[var(--p-muted)] flex items-center gap-2"><Loader2 size={15} className="animate-spin"/> Activation du lien…</p>
                            ) : (
                                <>
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-2xl bg-white shrink-0">
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&color=8a0e01&data=${encodeURIComponent(shareUrl)}`} alt="QR code de l'avis" className="w-28 h-28"/>
                                        </div>
                                        <p className="text-sm text-[var(--p-fg-2)]">Le client scanne ce code avec son téléphone : il retrouve la présentation, sans les informations internes.</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="h-16 rounded-2xl border border-[var(--p-line)] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--p-fg)] hover:bg-[var(--p-hover)]"><MessageCircle size={17}/>WhatsApp</a>
                                        <a href={`mailto:?subject=${encodeURIComponent("Votre avis de valeur Patrim")}&body=${encodeURIComponent(message)}`} className="h-16 rounded-2xl border border-[var(--p-line)] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--p-fg)] hover:bg-[var(--p-hover)]"><Mail size={17}/>E-mail</a>
                                        <button type="button" onClick={() => void copy()} className="h-16 rounded-2xl border border-[var(--p-line)] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--p-fg)] hover:bg-[var(--p-hover)]">{copied ? <Check size={17} className="text-[var(--p-positive)]"/> : <Copy size={17}/>}{copied ? "Copié" : "Copier"}</button>
                                    </div>
                                    <p className="text-[11px] text-[var(--p-muted)] flex items-center gap-1.5 truncate"><Link2 size={12}/>{shareUrl}</p>
                                </>
                            )}
                            <button type="button" onClick={() => void markDelivered()} disabled={busy === "remise"}
                                className="w-full h-12 rounded-2xl text-sm font-semibold bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] flex items-center justify-center gap-2 disabled:opacity-60">
                                {busy === "remise" ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Marquer l&apos;avis comme remis
                            </button>
                            {done && <p className="text-xs text-[var(--p-positive)] flex items-center gap-1.5"><BellRing size={13}/> {done}</p>}
                            {data.shareAvis && <button type="button" onClick={() => void stopShare()} className="text-[11px] text-[var(--p-muted)] underline underline-offset-2">Désactiver le lien partagé</button>}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
