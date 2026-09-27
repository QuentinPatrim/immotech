"use client";

/* ============================================================
   VISITE 3D (présentation client : rendez-vous et lien partagé)
   Maquette 3D du bien meublée : vues maquette / dessus / visite,
   essai des styles d'aménagement, liste des pièces et surfaces.
   Les changements de style restent locaux (rien n'est enregistré).
   ============================================================ */

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Box, Eye, LayoutGrid, Sofa, Loader2 } from "lucide-react";
import type { Plan3D, StyleId } from "@/lib/plan3d/types";
import type { ViewMode } from "@/components/plan3d/Scene3D";
import { STYLE_LIST } from "@/lib/plan3d/styles";
import { indoorArea, isOutdoor, roomArea } from "@/lib/plan3d/geometry";

const Scene3D = dynamic(() => import("@/components/plan3d/Scene3D"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center text-[var(--p-muted)] gap-2 text-sm">
            <Loader2 size={16} className="animate-spin"/> Chargement de la maquette 3D…
        </div>
    ),
});

/** Thème clair / sombre de l'espace Patrim (attribut posé sur <html>) */
const subscribeTheme = (cb: () => void) => {
    const obs = new MutationObserver(cb);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-patrim-theme"] });
    return () => obs.disconnect();
};
const readTheme = () => (document.documentElement.getAttribute("data-patrim-theme") === "light" ? "light" : "dark");

const VIEWS: { id: ViewMode; label: string; icon: typeof Box }[] = [
    { id: "dollhouse", label: "Maquette", icon: Box },
    { id: "top", label: "Dessus", icon: LayoutGrid },
    { id: "walk", label: "Visite", icon: Eye },
];

const m2 = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m²`;

export default function VisitSection({ plan }: { plan: Plan3D }) {
    const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as const);
    const [view, setView] = useState<ViewMode>("dollhouse");
    const [style, setStyle] = useState<StyleId>(plan.style);
    const [furniture, setFurniture] = useState(true);
    const [selected, setSelected] = useState<string | null>(null);
    const shown: Plan3D = style === plan.style ? plan : { ...plan, style };
    const rooms = [...plan.rooms].sort((a, b) => roomArea(b) - roomArea(a));

    return (
        <div>
            <div className="relative rounded-[28px] overflow-hidden border border-[var(--p-line)] h-[64vh] min-h-[420px] max-h-[760px]" style={{ backgroundColor: "var(--p-card)" }}>
                <Scene3D plan={shown} view={view} showFurniture={furniture} showLabels selectedRoomId={selected} onSelectRoom={setSelected} theme={theme} className="absolute inset-0"/>
                {/* Commandes */}
                <div className="absolute top-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <div className="pointer-events-auto flex p-1 rounded-[14px] gap-0.5 backdrop-blur-xl border border-[var(--p-line)]" style={{ backgroundColor: "var(--p-glass)" }} role="radiogroup" aria-label="Vue">
                        {VIEWS.map(v => (
                            <button key={v.id} type="button" role="radio" aria-checked={view === v.id} onClick={() => setView(v.id)}
                                className={`h-9 px-3 rounded-[11px] text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${view === v.id ? "bg-[var(--p-segment)] text-[var(--p-fg)] shadow-[0_3px_8px_rgba(0,0,0,0.12)]" : "text-[var(--p-muted)]"}`}>
                                <v.icon size={14}/>{v.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => setFurniture(f => !f)} aria-pressed={furniture}
                        className="pointer-events-auto h-11 px-3.5 rounded-[14px] text-xs font-semibold inline-flex items-center gap-1.5 backdrop-blur-xl border border-[var(--p-line)] text-[var(--p-fg)]" style={{ backgroundColor: "var(--p-glass)" }}>
                        <Sofa size={14} className={furniture ? "text-[var(--p-accent)]" : "text-[var(--p-muted)]"}/>{furniture ? "Meublé" : "Vide"}
                    </button>
                </div>
                <div className="absolute bottom-3 inset-x-3 flex gap-2 overflow-x-auto [scrollbar-width:none] pointer-events-auto">
                    {STYLE_LIST.map(s => (
                        <button key={s.id} type="button" onClick={() => setStyle(s.id)} aria-pressed={style === s.id}
                            className={`shrink-0 h-10 pl-1.5 pr-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 backdrop-blur-xl border transition-all ${style === s.id ? "border-[var(--p-accent)] text-[var(--p-fg)]" : "border-[var(--p-line)] text-[var(--p-muted)]"}`}
                            style={{ backgroundColor: "var(--p-glass)" }}>
                            <span className="w-7 h-7 rounded-full border border-[var(--p-line)]" style={{ background: `linear-gradient(135deg, ${s.floor("sejour").base} 50%, ${s.fabric} 50%)` }}/>
                            {s.label}
                        </button>
                    ))}
                </div>
                {view === "walk" && (
                    <p className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[11px] font-medium px-3 py-1.5 rounded-full backdrop-blur-xl text-[var(--p-fg)] pointer-events-none whitespace-nowrap" style={{ backgroundColor: "var(--p-glass)" }}>
                        Faites glisser pour regarder · touchez le sol pour avancer
                    </p>
                )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full text-[var(--p-fg)]" style={{ backgroundColor: "var(--p-sunken)" }}>Surface habitable {m2(indoorArea(plan))}</span>
                {rooms.map(r => (
                    <button key={r.id} type="button" onClick={() => setSelected(s => (s === r.id ? null : r.id))}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${selected === r.id ? "bg-[var(--p-accent-soft)] text-[var(--p-accent)] font-semibold" : "text-[var(--p-fg-2)]"}`}
                        style={selected === r.id ? undefined : { backgroundColor: "var(--p-sunken)" }}>
                        {r.name} · {m2(roomArea(r))}{isOutdoor(r) ? " (extérieur)" : ""}
                    </button>
                ))}
            </div>
            <p className="text-[11px] text-[var(--p-faint)] mt-3">Maquette indicative réalisée à partir du plan et des surfaces du bien ; l&apos;aménagement proposé est une suggestion.</p>
        </div>
    );
}
