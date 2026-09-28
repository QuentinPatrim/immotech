"use client";

/* ============================================================
   ENVOI DE L'AVIS DE VALEUR PAR E-MAIL
   Message pré-rédigé (civilité, nom du client, bien, téléphone,
   signature), PDF de l'avis préparé en pièce jointe.
   - Téléphone : feuille de partage → Gmail, Outlook, Mail… avec
     le PDF joint et le texte prêt (adresse du client copiée).
   - Ordinateur : Gmail, Outlook ou la messagerie de l'ordinateur
     s'ouvrent pré-remplis ; le PDF est téléchargé pour être glissé
     dans le message.
   L'envoi part de la boîte mail de l'agent (sa messagerie pro).
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Download, FileText, Link2, Loader2, Mail, RotateCcw, Send, X } from "lucide-react";
import { pagesToPdf, pdfFileName } from "@/lib/avisPdf";
import {
    CIVILITIES, DEFAULT_TEMPLATE, PROVIDER_KEY, TEMPLATE_KEY, agentPhone, composeUrl, fillTemplate, greeting, guessCivility,
    isEmail, mailSubject, phoneKey, propertyPhrase, signature, type Civility, type MailProvider,
} from "@/lib/estimationMail";

export interface MailDossier {
    clientName: string;
    clientEmail?: string;
    clientCivility?: Civility;
    propertyType: string;
    propertyAddress: string;
    agentId: string;
}

export interface MailSent {
    clientEmail: string;
    clientCivility: Civility;
    /** Lien de consultation en ligne ajouté : l'avis doit être partagé */
    shareAvis: boolean;
    mailSentAt: string;
}

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

const PROVIDERS: { id: MailProvider; label: string; hint: string }[] = [
    { id: "gmail", label: "Gmail", hint: "Gmail / Google Workspace" },
    { id: "outlook", label: "Outlook", hint: "Outlook / Microsoft 365" },
    { id: "device", label: "Autre messagerie", hint: "Mail, Outlook, Thunderbird…" },
];

export default function EstimationMailDialog({ dossier, id, getPages, onSent, onClose }: {
    dossier: MailDossier;
    id: string | null;
    /** Pages A4 de l'avis affichées à l'écran */
    getPages: () => HTMLElement[];
    onSent: (s: MailSent) => void;
    onClose: () => void;
}) {
    const [to, setTo] = useState(dossier.clientEmail ?? "");
    const [civility, setCivility] = useState<Civility>(dossier.clientCivility ?? guessCivility(dossier.clientName));
    const [phone, setPhone] = useState(() => read(phoneKey(dossier.agentId)) || agentPhone(dossier.agentId));
    const [template, setTemplate] = useState(() => read(TEMPLATE_KEY) || DEFAULT_TEMPLATE);
    const [subject, setSubject] = useState(() => mailSubject(dossier.propertyType, dossier.propertyAddress));
    const [withLink, setWithLink] = useState(false);
    const [provider, setProvider] = useState<MailProvider>(() => (read(PROVIDER_KEY) as MailProvider) || "gmail");
    const filled = useMemo(() => fillTemplate(template, {
        clientName: dossier.clientName, civility, propertyType: dossier.propertyType, propertyAddress: dossier.propertyAddress, agentId: dossier.agentId, phone,
    }), [template, dossier, civility, phone]);
    // Message retouché à la main : il n'est plus régénéré par les champs
    const [custom, setCustom] = useState<string | null>(null);
    const body = custom ?? filled;
    const link = id && typeof window !== "undefined" ? `${window.location.origin}/avis/${id}` : "";
    const fullBody = withLink && link ? `${body}\n\nConsulter l'avis de valeur en ligne : ${link}` : body;

    // PDF préparé dès l'ouverture : le partage doit partir directement du geste de l'utilisateur
    const [pdf, setPdf] = useState<{ file: File; url: string } | null>(null);
    const [pdfState, setPdfState] = useState<{ done: number; total: number; error?: string }>({ done: 0, total: 0 });
    const getPagesRef = useRef(getPages);
    useEffect(() => {
        let live = true;
        let url = "";
        const name = pdfFileName(dossier.propertyAddress);
        // Laisse la fenêtre s'afficher avant le calcul
        const t = window.setTimeout(() => {
            pagesToPdf(getPagesRef.current(), (done, total) => { if (live) setPdfState({ done, total }); })
                .then(blob => {
                    if (!live) return;
                    url = URL.createObjectURL(blob);
                    setPdf({ file: new File([blob], name, { type: "application/pdf" }), url });
                })
                .catch(e => { if (live) setPdfState(s => ({ ...s, error: e instanceof Error ? e.message : "PDF impossible à préparer." })); });
        }, 120);
        return () => { live = false; window.clearTimeout(t); if (url) URL.revokeObjectURL(url); };
    }, [dossier.propertyAddress]);

    const canShareFiles = useMemo(() => {
        if (typeof navigator === "undefined" || !navigator.canShare || !pdf) return false;
        // Feuille de partage réservée aux écrans tactiles (sur ordinateur, elle n'ouvre pas la messagerie)
        const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
        try { return !!touch && navigator.canShare({ files: [pdf.file] }); } catch { return false; }
    }, [pdf]);

    const [done, setDone] = useState<null | "shared" | "opened">(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const validTo = isEmail(to);

    const remember = () => {
        write(phoneKey(dossier.agentId), phone.trim() && phone.trim() !== agentPhone(dossier.agentId) ? phone.trim() : null);
        onSent({ clientEmail: to.trim(), clientCivility: civility, shareAvis: withLink, mailSentAt: new Date().toISOString() });
    };

    const download = () => {
        if (!pdf) return;
        const a = document.createElement("a");
        a.href = pdf.url;
        a.download = pdf.file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const copyTo = async () => {
        try { await navigator.clipboard.writeText(to.trim()); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* presse-papiers refusé */ }
    };

    const share = async () => {
        if (!pdf) return;
        setError("");
        // Adresse du client copiée : la feuille de partage ne sait pas remplir le destinataire
        if (validTo) navigator.clipboard?.writeText(to.trim()).catch(() => {});
        try {
            await navigator.share({ files: [pdf.file], title: subject, text: fullBody });
            remember();
            setDone("shared");
        } catch (e) {
            if ((e as DOMException)?.name !== "AbortError") setError("Partage impossible : utilisez Gmail, Outlook ou votre messagerie ci-dessous.");
        }
    };

    const open = (p: MailProvider) => {
        setProvider(p);
        write(PROVIDER_KEY, p);
        const url = composeUrl(p, to.trim(), subject, fullBody);
        if (pdf) download();
        if (p === "device") window.location.assign(url);
        else window.open(url, "_blank", "noopener");
        remember();
        setDone("opened");
    };

    /** Le message retouché devient le modèle (les informations du dossier redeviennent des repères) */
    const saveTemplate = () => {
        const g = greeting(civility, dossier.clientName);
        const b = propertyPhrase(dossier.propertyType, dossier.propertyAddress);
        const sig = signature(dossier.agentId);
        let t = body;
        for (const [v, k] of [[g, "{bonjour}"], [b, "{bien}"], [sig, "{signature}"], [phone.trim(), "{telephone}"]] as const) if (v) t = t.split(v).join(k);
        write(TEMPLATE_KEY, t);
        setTemplate(t);
        setCustom(null);
    };
    const resetTemplate = () => { write(TEMPLATE_KEY, null); setTemplate(DEFAULT_TEMPLATE); setCustom(null); };

    const field = "w-full h-11 px-3.5 rounded-xl border border-[var(--p-line)] bg-[var(--p-field,var(--p-card))] text-[15px] text-[var(--p-fg)] outline-none focus:border-[var(--p-accent,#8a0e01)] transition-colors";
    const label = "block px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--p-muted)]";
    const ordered = [...PROVIDERS].sort((a, b) => (a.id === provider ? -1 : b.id === provider ? 1 : 0));

    return (
        <motion.div className="patrim-ui font-sans print-hidden fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm sm:p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div role="dialog" aria-modal aria-label="Envoyer l'avis de valeur par e-mail" onClick={e => e.stopPropagation()}
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="w-full sm:max-w-[640px] max-h-[94dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] border border-[var(--p-line)] shadow-2xl overflow-hidden"
                style={{ backgroundColor: "var(--p-card-2, var(--p-card))" }}>
                <div className="flex items-center gap-3 px-5 sm:px-6 pt-5 pb-3">
                    <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}><Mail size={18}/></span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-bold tracking-tight text-[var(--p-fg)]">Envoyer l&apos;avis de valeur</p>
                        <p className="text-[12.5px] text-[var(--p-muted)] truncate">Depuis votre messagerie professionnelle, PDF en pièce jointe</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-muted)] hover:text-[var(--p-fg)]"><X size={16}/></button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 pb-4 space-y-4">
                    <AnimatePresence initial={false}>
                        {done && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="rounded-2xl p-3.5 text-[13px] leading-snug border" style={{ backgroundColor: "rgba(52,199,89,0.1)", borderColor: "rgba(52,199,89,0.3)", color: "var(--p-fg)" }}>
                                <p className="font-semibold flex items-center gap-1.5"><Check size={15} className="text-[#34c759]"/> {done === "shared" ? "Message préparé dans votre application mail" : "Message ouvert dans votre messagerie"}</p>
                                <p className="mt-1 text-[var(--p-fg-2,var(--p-muted))]">
                                    {done === "shared"
                                        ? "Collez l'adresse du client dans « À » (elle est copiée), vérifiez puis envoyez."
                                        : "Le PDF vient d'être téléchargé : glissez-le dans le message (ou « Joindre un fichier »), vérifiez puis envoyez."}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                        <div>
                            <label className={label} htmlFor="mail-to">Destinataire</label>
                            <div className="relative">
                                <input id="mail-to" type="email" inputMode="email" autoComplete="off" value={to} onChange={e => setTo(e.target.value)}
                                    placeholder="adresse@client.fr" className={`${field} pr-10`}/>
                                {validTo && (
                                    <button type="button" onClick={copyTo} aria-label="Copier l'adresse" title="Copier l'adresse"
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-fg)]">
                                        {copied ? <Check size={15} className="text-[#34c759]"/> : <Copy size={15}/>}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <span className={label}>Civilité</span>
                            <div className="flex gap-1 p-1 rounded-xl bg-[var(--p-sunken)]" role="radiogroup" aria-label="Civilité">
                                {CIVILITIES.slice(0, 3).map(c => (
                                    <button key={c.id} type="button" role="radio" aria-checked={civility === c.id} onClick={() => setCivility(civility === c.id ? "" : c.id)}
                                        className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${civility === c.id ? "bg-[var(--p-card)] text-[var(--p-fg)] shadow-sm" : "text-[var(--p-muted)] hover:text-[var(--p-fg)]"}`}>
                                        {c.id === "M. et Mme" ? "Couple" : c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-[1fr_180px] gap-3">
                        <div>
                            <label className={label} htmlFor="mail-subject">Objet</label>
                            <input id="mail-subject" value={subject} onChange={e => setSubject(e.target.value)} className={field}/>
                        </div>
                        <div>
                            <label className={label} htmlFor="mail-phone">Votre téléphone</label>
                            <input id="mail-phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} className={field}/>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <label className={label} htmlFor="mail-body">Message</label>
                            <div className="flex items-center gap-3 pb-1.5 text-[11.5px] font-semibold">
                                {custom !== null && <button type="button" onClick={saveTemplate} className="text-[var(--p-accent,#8a0e01)] hover:opacity-80">Garder comme modèle</button>}
                                {(custom !== null || template !== DEFAULT_TEMPLATE) && (
                                    <button type="button" onClick={resetTemplate} className="inline-flex items-center gap-1 text-[var(--p-muted)] hover:text-[var(--p-fg)]"><RotateCcw size={11}/> Modèle d&apos;origine</button>
                                )}
                            </div>
                        </div>
                        <textarea id="mail-body" value={body} onChange={e => setCustom(e.target.value)} rows={12}
                            className="w-full px-3.5 py-3 rounded-xl border border-[var(--p-line)] bg-[var(--p-field,var(--p-card))] text-[14px] leading-relaxed text-[var(--p-fg)] outline-none focus:border-[var(--p-accent,#8a0e01)] resize-y"/>
                    </div>

                    <div className="rounded-2xl border border-[var(--p-line)] bg-[var(--p-card)] divide-y divide-[var(--p-line)]">
                        <div className="flex items-center gap-3 px-3.5 py-3">
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(138,14,1,0.1)", color: "#b3261a" }}><FileText size={17}/></span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-semibold text-[var(--p-fg)] truncate">{pdfFileName(dossier.propertyAddress)}</p>
                                <p className="text-[12px] text-[var(--p-muted)]">
                                    {pdfState.error ? <span className="text-[var(--p-negative,#d70015)]">{pdfState.error}</span>
                                        : pdf ? `Pièce jointe prête · ${(pdf.file.size / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`
                                        : `Préparation du PDF… ${pdfState.total ? `page ${Math.min(pdfState.done + 1, pdfState.total)} / ${pdfState.total}` : ""}`}
                                </p>
                            </div>
                            {pdf ? (
                                <button type="button" onClick={download} className="h-9 px-3 rounded-xl text-[12.5px] font-semibold bg-[var(--p-sunken)] text-[var(--p-fg)] inline-flex items-center gap-1.5"><Download size={14}/> PDF</button>
                            ) : !pdfState.error && <Loader2 size={17} className="animate-spin text-[var(--p-muted)]"/>}
                        </div>
                        {id && (
                            <label className="flex items-center gap-3 px-3.5 py-3 cursor-pointer">
                                <input type="checkbox" checked={withLink} onChange={e => setWithLink(e.target.checked)} className="w-4 h-4 accent-[#8a0e01]"/>
                                <span className="flex-1 min-w-0 text-[13px] text-[var(--p-fg)]">
                                    <span className="font-semibold inline-flex items-center gap-1.5"><Link2 size={13}/> Ajouter le lien de consultation en ligne</span>
                                    <span className="block text-[12px] text-[var(--p-muted)]">L&apos;avis devient consultable par ce lien (sans le nom du client).</span>
                                </span>
                            </label>
                        )}
                    </div>
                    {error && <p className="text-[13px] text-[var(--p-negative,#d70015)]">{error}</p>}
                </div>

                <div className="px-5 sm:px-6 pt-3 pb-5 border-t border-[var(--p-line)] space-y-2.5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
                    {!validTo && to.trim() && <p className="text-[12px] text-[var(--p-warning,#b25000)]">Adresse e-mail à vérifier.</p>}
                    {canShareFiles && (
                        <button type="button" onClick={share} disabled={!pdf}
                            className="w-full h-12 rounded-2xl text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)", boxShadow: "0 10px 26px -10px rgba(138,14,1,0.6)" }}>
                            <Send size={16}/> Envoyer avec mon application mail
                        </button>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        {ordered.map((p, i) => {
                            const primary = !canShareFiles && i === 0;
                            return (
                                <button key={p.id} type="button" onClick={() => open(p.id)} disabled={!pdf && !pdfState.error} title={p.hint}
                                    className={`h-12 rounded-2xl px-2 text-[13.5px] font-semibold inline-flex flex-col items-center justify-center leading-tight disabled:opacity-50 transition-opacity ${primary ? "text-white" : "bg-[var(--p-sunken)] text-[var(--p-fg)]"}`}
                                    style={primary ? { background: "linear-gradient(135deg, #8a0e01, #d35f52)", boxShadow: "0 10px 26px -10px rgba(138,14,1,0.6)" } : undefined}>
                                    <span className="inline-flex items-center gap-1.5">{primary && <Send size={14}/>}{p.label}</span>
                                    <span className={`text-[10.5px] font-medium ${primary ? "text-white/75" : "text-[var(--p-muted)]"} hidden sm:block`}>{p.id === "device" ? "de l'appareil" : "dans le navigateur"}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
