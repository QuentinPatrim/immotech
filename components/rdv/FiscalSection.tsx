"use client";

/* ============================================================
   FISCALITÉ — LE MEILLEUR RÉGIME (parcours acquéreur, locatif)
   Classe les régimes (micro-foncier, réel, LMNP micro/réel,
   SCI IS) selon l'enrichissement net sur 10 ans, revente et
   impôt de sortie inclus, pour la tranche d'imposition du client.
   ============================================================ */

import { motion } from "framer-motion";
import { Crown, CheckCircle2, XCircle, Scale, Info } from "lucide-react";
import { TMI_OPTIONS, compareRegimes, type Tmi } from "@/lib/fiscalite";
import type { FinancingInputs } from "@/lib/financing";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${eur(Math.abs(n))}`;
const kEur = (n: number) => `${n >= 0 ? "" : "−"}${Math.round(Math.abs(n) / 1000).toLocaleString("fr-FR")} k€`;

export default function FiscalSection({ inputs, rate, tmi, onTmi }: { inputs: FinancingInputs; rate: number; tmi: Tmi; onTmi: (t: Tmi) => void }) {
    const c = compareRegimes(inputs, rate, tmi);
    const ranked = [...c.regimes].sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.netGain10 - a.netGain10);
    const maxGain = Math.max(1, ...ranked.map(r => Math.abs(r.netGain10)));
    const best = c.best;

    return (
        <div className="rounded-[28px] border border-[var(--p-line)] overflow-hidden" style={{ backgroundColor: "var(--p-card)" }}>
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--p-line)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--p-accent-soft)" }}><Scale size={17} className="text-[var(--p-accent)]"/></div>
                    <div>
                        <p className="text-sm font-semibold text-[var(--p-fg)]">Le régime fiscal le plus avantageux</p>
                        <p className="text-xs text-[var(--p-muted)]">Classement sur 10 ans, revente incluse</p>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--p-muted)] font-semibold mb-1.5">Tranche marginale d&apos;imposition</p>
                    <div className="grid grid-cols-5 p-1 rounded-xl gap-1" style={{ backgroundColor: "var(--p-sunken)" }} role="radiogroup" aria-label="Tranche marginale d'imposition">
                        {TMI_OPTIONS.map(t => (
                            <button key={t} type="button" role="radio" aria-checked={tmi === t} onClick={() => onTmi(t)}
                                className={`h-8 px-2.5 rounded-lg text-xs font-semibold mp-num transition-all ${tmi === t ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] shadow" : "text-[var(--p-muted)]"}`}>
                                {t} %
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {best && (
                <div className="relative overflow-hidden p-6 sm:p-7 text-[#fff]" style={{ background: "radial-gradient(120% 160% at 0% 0%, #b3261a 0%, #8a0e01 45%, #2a0804 100%)" }}>
                    <div className="absolute -right-10 -bottom-24 w-72 h-72 rounded-full opacity-20 blur-3xl bg-[#ffb4a8]"/>
                    <div className="relative grid sm:grid-cols-[1.3fr_1fr] gap-5 items-end">
                        <div>
                            <p className="text-[10.5px] uppercase tracking-[0.25em] text-[rgba(255,255,255,0.7)] font-semibold flex items-center gap-1.5"><Crown size={12}/> Régime recommandé</p>
                            <p className="mp-display text-[30px] sm:text-4xl leading-tight mt-2">{best.label}</p>
                            {c.savingVsDefault > 500 && <p className="mp-num text-sm text-[rgba(255,255,255,0.85)] mt-2">{signed(c.savingVsDefault)} sur 10 ans face au régime par défaut</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl px-4 py-3 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.65)] font-semibold">{best.taxPerYear < 0 ? "Économie / an" : "Impôt / an"}</p>
                                <p className="mp-num text-xl font-semibold mt-1">{eur(Math.abs(best.taxPerYear))}</p>
                            </div>
                            <div className="rounded-2xl px-4 py-3 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.65)] font-semibold">Cash-flow net</p>
                                <p className="mp-num text-xl font-semibold mt-1">{signed(best.cashflowAfterTax)}<span className="text-xs font-normal opacity-70"> /mois</span></p>
                            </div>
                        </div>
                    </div>
                    <div className="relative flex flex-wrap gap-2 mt-5">
                        {best.pros.map(p => <span key={p} className="text-xs px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.14)] inline-flex items-center gap-1.5"><CheckCircle2 size={12}/>{p}</span>)}
                    </div>
                </div>
            )}

            <div className="p-3 sm:p-4 space-y-2">
                {ranked.map((r, idx) => {
                    const isBest = best?.id === r.id;
                    const w = (Math.abs(r.netGain10) / maxGain) * 100;
                    return (
                        <div key={r.id} className={`rounded-2xl px-4 py-3.5 ${r.eligible ? "" : "opacity-50"}`} style={{ backgroundColor: isBest ? "var(--p-accent-soft)" : "var(--p-sunken)" }}>
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mp-num" style={{ backgroundColor: isBest ? "var(--p-accent)" : "var(--p-card)", color: isBest ? "#fff" : "var(--p-muted)" }}>{idx + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className="text-sm font-semibold text-[var(--p-fg)] truncate">{r.label}</p>
                                        <p className={`mp-num text-sm font-semibold shrink-0 ${r.netGain10 >= 0 ? "text-[var(--p-positive)]" : "text-[var(--p-negative)]"}`}>{kEur(r.netGain10)}</p>
                                    </div>
                                    <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "var(--p-card)" }}>
                                        <motion.div initial={false} animate={{ width: `${w}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full"
                                            style={{ background: !r.eligible ? "var(--p-faint)" : r.netGain10 < 0 ? "var(--p-negative)" : isBest ? "var(--p-accent)" : "var(--p-fg-2)" }}/>
                                    </div>
                                    <p className="text-[11px] text-[var(--p-muted)] mt-1.5 mp-num">
                                        {r.eligible
                                            ? <>{r.taxPerYear < 0 ? `Économie d'impôt ${eur(-r.taxPerYear)}/an` : `Impôt ${eur(r.taxPerYear)}/an`} · cash-flow {signed(r.cashflowAfterTax)}/mois · sortie {eur(r.exitTax)}</>
                                            : r.reason}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {best && best.cons.length > 0 && (
                <div className="px-5 sm:px-6 pb-5 flex flex-wrap gap-x-5 gap-y-1.5">
                    {best.cons.map(x => <span key={x} className="text-xs text-[var(--p-fg-2)] inline-flex items-center gap-1.5"><XCircle size={12} className="text-[var(--p-warning)]"/>{x}</span>)}
                </div>
            )}
            <p className="px-5 sm:px-6 pb-5 text-[11px] text-[var(--p-faint)] flex gap-1.5">
                <Info size={12} className="shrink-0 mt-0.5"/>
                Enrichissement net sur 10 ans = cash-flows après impôt + produit de revente net de dette et d&apos;impôt − apport. Barème 2026, loyer identique nu et meublé, hors CFE et IFI. À valider avec un expert-comptable.
            </p>
        </div>
    );
}
