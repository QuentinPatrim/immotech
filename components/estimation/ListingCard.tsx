"use client";

import { ExternalLink, Trash2, TrendingDown, Check, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/formatters";
import { daysOnline, priceDrop, pricePerSqm, type MarketListing } from "@/lib/marketListings";

/* ============================================================
   Carte d'une annonce en vente (portails)
   Photo, prix, €/m² comparé au bien, date de parution / jours
   en ligne, baisses de prix, particularité et +/− (analyse IA).
   ============================================================ */

const DPE_COLORS: Record<string, string> = { A: "#00A06D", B: "#52B153", C: "#A5CC74", D: "#F3E724", E: "#F0B328", F: "#EB8235", G: "#D7221F" };

const shortDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";

interface ListingCardProps {
    listing: MarketListing;
    /** Prix au m² de référence (estimation en cours ou médiane DVF) pour situer l'annonce */
    refSqm?: number;
    onToggle?: () => void;
    onDelete?: () => void;
    busy?: boolean;
}

export default function ListingCard({ listing: l, refSqm, onToggle, onDelete, busy }: ListingCardProps) {
    const sqm = pricePerSqm(l);
    const drop = priceDrop(l);
    const days = daysOnline(l);
    const gap = refSqm && sqm ? Math.round(((sqm - refSqm) / refSqm) * 100) : null;
    const dpe = (l.dpe || "").toUpperCase().slice(0, 1);

    return (
        <article className={`group relative rounded-2xl border overflow-hidden flex flex-col transition-all ${l.selected ? "ring-2 ring-[var(--p-accent)] border-transparent" : "border-[var(--p-line)] hover:border-[var(--p-line-strong)]"}`}
            style={{ backgroundColor: "var(--p-card)" }}>
            <div className="relative aspect-[16/10] bg-[var(--p-sunken)] overflow-hidden">
                {l.photoUrl
                    ? <img src={l.photoUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/>
                    : <div className="w-full h-full flex items-center justify-center text-[11px] text-[var(--p-faint)]">Pas de photo</div>}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[rgba(0,0,0,0.62)] text-[#fff] backdrop-blur-sm">{l.portal}</span>
                    {l.otherPortals.length > 0 && (
                        <span title={l.otherPortals.map(o => o.portal).join(", ")} className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[rgba(0,0,0,0.62)] text-[#fff] backdrop-blur-sm">+{l.otherPortals.length} portail{l.otherPortals.length > 1 ? "s" : ""}</span>
                    )}
                </div>
                {drop && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-1 rounded-full bg-[#be123c] text-[#fff] flex items-center gap-1">
                        <TrendingDown size={11}/> −{String(drop.pct).replace(".", ",")} %
                    </span>
                )}
                {l.relevance !== undefined && (
                    <span className="absolute bottom-2.5 right-2.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-[rgba(0,0,0,0.62)] text-[#fff]" title="Comparabilité avec le bien estimé (analyse IA)">
                        Pertinence {l.relevance}
                    </span>
                )}
            </div>

            <div className="p-4 flex flex-col gap-2.5 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <div>
                        <p className="text-xl font-semibold tracking-tight text-[var(--p-fg)]">{formatNumber(l.price)} €</p>
                        {drop && <p className="text-[11px] text-[var(--p-muted)] line-through">{formatNumber(drop.from)} €</p>}
                    </div>
                    {sqm > 0 && (
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[var(--p-fg-2)]">{formatNumber(Math.round(sqm))} €/m²</p>
                            {gap !== null && (
                                <p className={`text-[10px] font-semibold ${Math.abs(gap) <= 5 ? "text-[var(--p-muted)]" : gap > 0 ? "text-[var(--p-negative)]" : "text-[var(--p-positive)]"}`}>
                                    {gap > 0 ? "+" : ""}{gap} % vs référence
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-[12px] text-[var(--p-fg-2)] flex items-center gap-1.5 flex-wrap">
                    {l.surface > 0 && <span>{formatNumber(l.surface)} m²</span>}
                    {l.rooms ? <span>· {l.rooms} p.</span> : null}
                    {l.floor ? <span>· {l.floor}</span> : null}
                    {(l.district || l.city) && <span className="text-[var(--p-muted)]">· {l.district || l.city}</span>}
                    {dpe && DPE_COLORS[dpe] && (
                        <span className="ml-auto text-[10px] font-black rounded px-1.5 py-0.5" style={{ backgroundColor: DPE_COLORS[dpe], color: "CDE".includes(dpe) ? "#1a1a1a" : "#fff" }}>DPE {dpe}</span>
                    )}
                </p>

                <p className="text-[11px] text-[var(--p-muted)]">
                    {l.publishedAt ? <>Parue le {shortDate(l.publishedAt)}</> : <>Vue le {shortDate(l.firstSeenAt)}</>}
                    {days !== null && <> · en ligne depuis <b className="text-[var(--p-fg-2)] font-semibold">{days} j</b></>}
                    {drop && <> · <span className="text-[var(--p-negative)] font-semibold">{drop.count > 1 ? `${drop.count} baisses` : "baisse"} de {formatNumber(drop.amount)} €</span></>}
                </p>

                {l.highlight && (
                    <p className="text-[12px] leading-snug text-[var(--p-fg)] flex gap-1.5">
                        <Sparkles size={13} className="shrink-0 mt-0.5 text-[var(--p-accent)]"/>{l.highlight}
                    </p>
                )}

                {l.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {l.features.map(f => (
                            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--p-line)] text-[var(--p-fg-2)]">{f}</span>
                        ))}
                    </div>
                )}

                {(l.pros.length > 0 || l.cons.length > 0) && (
                    <ul className="text-[11px] leading-snug space-y-0.5">
                        {l.pros.map(p => <li key={`+${p}`} className="text-[var(--p-positive)]">+ {p}</li>)}
                        {l.cons.map(c => <li key={`-${c}`} className="text-[var(--p-negative)]">− {c}</li>)}
                    </ul>
                )}

                <div className="mt-auto pt-2 flex items-center gap-2 border-t border-[var(--p-line)]">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[var(--p-muted)] hover:text-[var(--p-fg)] inline-flex items-center gap-1">
                        Voir l&apos;annonce <ExternalLink size={11}/>
                    </a>
                    {onDelete && (
                        <button type="button" onClick={onDelete} disabled={busy} title="Retirer cette annonce du dossier"
                            className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-[var(--p-faint)] hover:text-[var(--p-negative)] hover:bg-[var(--p-hover)] transition-colors">
                            <Trash2 size={13}/>
                        </button>
                    )}
                    {onToggle && (
                        <button type="button" onClick={onToggle} disabled={busy}
                            className={`${onDelete ? "" : "ml-auto"} h-8 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 ${l.selected ? "bg-[var(--p-accent)] text-[#fff]" : "border border-[var(--p-line-strong)] text-[var(--p-fg)] hover:bg-[var(--p-hover)]"}`}>
                            {l.selected ? <><Check size={12}/> Dans l&apos;avis</> : "Utiliser dans l'avis"}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
