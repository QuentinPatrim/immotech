"use client";

/* ============================================================
   PLAN 3D — VÉRIFICATION D'UN DDT IMPORTÉ
   Pages du dossier (miniatures) avec la page du croquis repérée,
   tableau des surfaces du mesurage Carrez relevé dans le PDF,
   choix : croquis mis à l'échelle par les surfaces, ou plan
   généré à partir des seules surfaces. Report possible de la
   surface Carrez dans le dossier d'estimation.
   ============================================================ */

import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, FileText, LayoutGrid, Loader2, Ruler, ScanLine } from "lucide-react";
import type { DdtAnalysis } from "@/lib/plan3d/ddt";

const BRAND_GRADIENT = "linear-gradient(135deg, #8a0e01, #d35f52)";
const m2 = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;

export default function DdtReview({ fileName, analysis, page, thumbs, declared, surfaceApplied, applying, onPage, onBuild, onSurfacesOnly, onApplySurface, onBack }: {
    fileName: string;
    analysis: DdtAnalysis;
    page: number;
    thumbs: Record<number, string>;
    declared: number;
    surfaceApplied: boolean;
    applying: boolean;
    onPage: (index: number) => void;
    onBuild: () => void;
    onSurfacesOnly: () => void;
    onApplySurface: () => void;
    onBack: () => void;
}) {
    const t = analysis.carrez;
    const shown = analysis.pages.slice(0, 40);
    const gap = t && declared > 0 ? Math.abs(t.total - declared) : 0;
    const label = t?.kind === "habitable" ? "Surface habitable" : "Mesurage Carrez";

    return (
        <motion.section key="ddt" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--p-muted)] hover:text-[var(--p-fg)]">
                <ChevronLeft size={16}/> Retour
            </button>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--p-accent)] mt-5">Dossier de diagnostic</p>
            <h1 className="mp-display text-[30px] sm:text-4xl leading-[1.05] text-[var(--p-fg)] mt-2">Vérifiez le plan et les surfaces</h1>
            <p className="text-[15px] text-[var(--p-fg-2)] mt-3 max-w-2xl flex items-center gap-2 flex-wrap">
                <FileText size={15} className="text-[var(--p-muted)]"/> <span className="truncate max-w-[60vw]">{fileName}</span>
                <span className="text-[var(--p-muted)]">· {analysis.numPages} page{analysis.numPages > 1 ? "s" : ""}</span>
            </p>

            <div className="mt-7 grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
                {/* Pages : choix du croquis */}
                <div className="rounded-[28px] border border-[var(--p-line)] p-4 sm:p-6 shadow-[var(--p-shadow)]" style={{ backgroundColor: "var(--p-card)" }}>
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <p className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2"><ScanLine size={16} className="text-[var(--p-accent)]"/> Page du croquis</p>
                        <p className="text-xs text-[var(--p-muted)]">Touchez la page à utiliser</p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[520px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                        {shown.map(p => {
                            const on = p.index === page;
                            const detected = p.index === analysis.planPage;
                            return (
                                <button key={p.index} type="button" onClick={() => onPage(p.index)} aria-pressed={on} aria-label={`Page ${p.index + 1}`}
                                    className={`relative rounded-2xl overflow-hidden border-2 transition-all text-left ${on ? "border-[var(--p-accent)] shadow-lg" : "border-transparent hover:border-[var(--p-line-strong)]"}`}
                                    style={{ backgroundColor: "var(--p-sunken)" }}>
                                    <div className="aspect-[3/4] bg-white flex items-center justify-center">
                                        {thumbs[p.index]
                                            ? <img src={thumbs[p.index]} alt="" className="w-full h-full object-contain"/>
                                            : <Loader2 size={16} className="animate-spin text-[#aeaeb2]"/>}
                                    </div>
                                    <span className="absolute left-1.5 bottom-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[rgba(0,0,0,0.6)] text-white tabular-nums">{p.index + 1}</span>
                                    {detected && <span className="absolute right-1.5 top-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: BRAND_GRADIENT }}>Croquis</span>}
                                    {on && <span className="absolute left-1.5 top-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-[var(--p-accent)] text-white"><Check size={12}/></span>}
                                </button>
                            );
                        })}
                    </div>
                    {analysis.numPages > shown.length && <p className="text-[11px] text-[var(--p-muted)] mt-3">Seules les {shown.length} premières pages sont affichées.</p>}
                </div>

                {/* Surfaces relevées */}
                <div className="rounded-[28px] border border-[var(--p-line)] p-4 sm:p-6 shadow-[var(--p-shadow)]" style={{ backgroundColor: "var(--p-card)" }}>
                    <p className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2"><Ruler size={16} className="text-[var(--p-accent)]"/> {t ? label : "Surfaces"}</p>
                    {t ? (
                        <>
                            <div className="mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--p-sunken)" }}>
                                {t.rooms.map((r, i) => (
                                    <div key={`${r.name}${i}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5 border-b border-[var(--p-line)] last:border-b-0">
                                        <span className="text-sm text-[var(--p-fg)] truncate">{r.name}</span>
                                        <span className="text-sm font-semibold tabular-nums text-[var(--p-fg)]">{m2(r.area)}</span>
                                    </div>
                                ))}
                            </div>
                            {t.outdoor.length > 0 && (
                                <div className="mt-3 px-1 space-y-1">
                                    {t.outdoor.map((r, i) => (
                                        <p key={`${r.name}${i}`} className="text-xs text-[var(--p-muted)] flex justify-between gap-3"><span>{r.name} (non comptée)</span><span className="tabular-nums">{m2(r.area)}</span></p>
                                    ))}
                                </div>
                            )}
                            <div className="mt-4 flex items-baseline justify-between gap-3 px-1">
                                <span className="text-sm font-semibold text-[var(--p-fg)]">Total {t.kind === "carrez" ? "Carrez" : "habitable"}</span>
                                <span className="mp-display text-2xl tabular-nums text-[var(--p-fg)]">{m2(t.total)}</span>
                            </div>
                            {!t.totalWritten && <p className="text-[11px] text-[var(--p-muted)] px-1 mt-1">Somme des pièces (total non trouvé dans le rapport).</p>}
                            {declared > 0 && gap >= 0.5 && (
                                <div className="mt-4 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ backgroundColor: "var(--p-accent-soft)" }}>
                                    <p className="text-xs text-[var(--p-fg-2)]">Surface du dossier : <b className="tabular-nums">{m2(declared)}</b></p>
                                    {surfaceApplied
                                        ? <span className="text-xs font-semibold text-[var(--p-positive)] inline-flex items-center gap-1"><Check size={13}/> Surface reportée</span>
                                        : (
                                            <button type="button" onClick={onApplySurface} disabled={applying}
                                                className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] inline-flex items-center gap-1.5 disabled:opacity-60">
                                                {applying && <Loader2 size={13} className="animate-spin"/>} Reporter {m2(t.total)} dans le dossier
                                            </button>
                                        )}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-[var(--p-muted)] mt-3">
                            Aucun tableau de surfaces (Carrez ou habitable) trouvé dans ce PDF. Le croquis sera mis à l&apos;échelle avec les cotes lisibles, sinon la surface du dossier.
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={onBuild}
                    className="h-12 px-6 rounded-2xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shadow-lg" style={{ background: BRAND_GRADIENT }}>
                    Construire la 3D avec la page {page + 1}{t ? " et les surfaces" : ""} <ArrowRight size={16}/>
                </button>
                {t && (
                    <button type="button" onClick={onSurfacesOnly}
                        className="h-12 px-6 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2 border border-[var(--p-line-strong)] text-[var(--p-fg)] hover:bg-[var(--p-hover)]">
                        <LayoutGrid size={16}/> Plan à partir des surfaces seules
                    </button>
                )}
            </div>
            <p className="text-xs text-[var(--p-muted)] mt-3 max-w-2xl">
                Le croquis d&apos;un diagnostiqueur est souvent sommaire : l&apos;IA le relève, les surfaces du rapport donnent l&apos;échelle et les noms des pièces. Si le dessin est inexploitable, préférez le plan à partir des surfaces, puis ajustez-le dans l&apos;éditeur 2D.
            </p>
        </motion.section>
    );
}
