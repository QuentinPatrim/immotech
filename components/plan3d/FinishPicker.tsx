"use client";

/* ============================================================
   PLAN 3D — CHOIX DES REVÊTEMENTS D'UNE PIÈCE
   Sol, murs (et teinte de peinture), plafond : vignettes dessinées
   avec les mêmes motifs que la 3D. « Style » rend la main au style
   d'aménagement. Un lien recopie le choix sur les pièces semblables.
   ============================================================ */

import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { Plan3D, Room } from "@/lib/plan3d/types";
import { isOutdoor } from "@/lib/plan3d/geometry";
import { swatchUrl, type TexKind } from "@/components/plan3d/materials";
import {
    BEAM_COLOR, CEILING_FINISHES, CEILING_WHITE, FLOOR_FINISHES, PAINT_COLORS, WALL_FINISHES,
    copyFinish, roomFamily, setFinish,
} from "@/lib/plan3d/finishes";

/** Vignette d'un motif (dessinée côté navigateur après le montage) */
function Swatch({ kind, base, alt, color, beams }: { kind?: TexKind | null; base?: string; alt?: string; color?: string; beams?: boolean }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!kind || !base) return;
        let live = true;
        // Dessin différé : les vignettes ne bloquent pas l'ouverture du panneau
        const id = window.setTimeout(() => { if (live) setUrl(swatchUrl(kind, base, alt ?? base)); }, 0);
        return () => { live = false; window.clearTimeout(id); };
    }, [kind, base, alt]);
    return (
        <span className="block w-full aspect-square rounded-xl overflow-hidden border border-[rgba(0,0,0,0.08)] relative"
            style={{ backgroundColor: color ?? base ?? "#eee", backgroundImage: url ? `url(${url})` : undefined, backgroundSize: "cover" }}>
            {beams && (
                <span className="absolute inset-0" style={{ background: `repeating-linear-gradient(90deg, transparent 0 22%, ${BEAM_COLOR} 22% 32%)` }}/>
            )}
        </span>
    );
}

function Choice({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={on} title={label}
            className={`relative text-left rounded-2xl p-1 border transition-colors ${on ? "border-[var(--p-accent)] bg-[var(--p-accent-soft)]" : "border-transparent hover:bg-[var(--p-hover)]"}`}>
            {children}
            <span className="block mt-1 px-0.5 text-[10.5px] leading-tight font-medium text-[var(--p-fg-2)] line-clamp-2">{label}</span>
            {on && <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--p-accent)] text-white flex items-center justify-center"><Check size={10} strokeWidth={3}/></span>}
        </button>
    );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <div>
            <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--p-muted)]">{title}</span>
                {action}
            </div>
            {children}
        </div>
    );
}

const FAMILY_LABEL = { wet: "aux pièces d'eau", dry: "aux pièces de vie", outdoor: "à l'extérieur" } as const;

export default function FinishPicker({ plan, room, onPlan }: { plan: Plan3D; room: Room; onPlan: (p: Plan3D) => void }) {
    const f = room.finish ?? {};
    const outdoor = isOutdoor(room);
    const family = roomFamily(room.kind);
    const floors = FLOOR_FINISHES.filter(x => (outdoor ? x.outdoor || ["tiles", "tiles_large", "concrete", "tomettes"].includes(x.kind) : !x.outdoor));
    const wall = WALL_FINISHES.find(w => w.id === f.wall);
    const others = (keys: ("floor" | "wall" | "wallColor" | "ceiling")[], same: (r: Room) => boolean) =>
        onPlan(copyFinish(plan, room.id, keys, r => r.id !== room.id && same(r)));
    const link = (label: string, onClick: () => void) => (
        <button type="button" onClick={onClick} className="text-[11.5px] font-semibold text-[var(--p-accent)] hover:opacity-80">{label}</button>
    );
    const set = (patch: Parameters<typeof setFinish>[2]) => onPlan(setFinish(plan, room.id, patch));

    return (
        <div className="flex flex-col gap-3.5">
            <Section title="Sol" action={link(`Appliquer ${FAMILY_LABEL[family]}`, () => others(["floor"], r => roomFamily(r.kind) === family))}>
                <div className="grid grid-cols-4 gap-1">
                    <Choice on={!f.floor} label="Selon le style" onClick={() => set({ floor: undefined })}>
                        <span className="block w-full aspect-square rounded-xl border border-dashed border-[var(--p-line-strong)] flex items-center justify-center text-[10px] font-semibold text-[var(--p-muted)]">Style</span>
                    </Choice>
                    {floors.map(x => (
                        <Choice key={x.id} on={f.floor === x.id} label={x.label} onClick={() => set({ floor: x.id })}>
                            <Swatch kind={x.kind} base={x.base} alt={x.alt}/>
                        </Choice>
                    ))}
                </div>
            </Section>
            {!outdoor && (
                <>
                    <Section title="Murs" action={link("Appliquer partout", () => others(["wall", "wallColor"], r => !isOutdoor(r)))}>
                        <div className="grid grid-cols-4 gap-1">
                            <Choice on={!f.wall} label="Selon le style" onClick={() => set({ wall: undefined, wallColor: undefined })}>
                                <span className="block w-full aspect-square rounded-xl border border-dashed border-[var(--p-line-strong)] flex items-center justify-center text-[10px] font-semibold text-[var(--p-muted)]">Style</span>
                            </Choice>
                            {WALL_FINISHES.map(x => (
                                <Choice key={x.id} on={f.wall === x.id} label={x.label} onClick={() => set({ wall: x.id })}>
                                    <Swatch kind={x.tex} base={x.paint ? f.wallColor || PAINT_COLORS[0].color : x.base} alt={x.paint ? undefined : x.alt}/>
                                </Choice>
                            ))}
                        </div>
                        {wall?.paint && (
                            <div className="mt-2 flex flex-wrap gap-1.5 px-1" role="radiogroup" aria-label="Teinte de la peinture">
                                {PAINT_COLORS.map(c => {
                                    const on = (f.wallColor || PAINT_COLORS[0].color) === c.color;
                                    return (
                                        <button key={c.id} type="button" role="radio" aria-checked={on} title={c.label} aria-label={c.label} onClick={() => set({ wallColor: c.color })}
                                            className={`w-7 h-7 rounded-full border ${on ? "ring-2 ring-[var(--p-accent)] ring-offset-2 ring-offset-[var(--p-card)] border-transparent" : "border-[rgba(0,0,0,0.15)]"}`}
                                            style={{ backgroundColor: c.color }}/>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                    <Section title="Plafond" action={link("Appliquer partout", () => others(["ceiling"], r => !isOutdoor(r)))}>
                        <div className="grid grid-cols-4 gap-1">
                            {CEILING_FINISHES.map(x => (
                                <Choice key={x.id} on={(f.ceiling ?? "peinture") === x.id} label={x.label} onClick={() => set({ ceiling: x.id === "peinture" ? undefined : x.id })}>
                                    <Swatch kind={x.tex} base={x.base ?? CEILING_WHITE} alt={x.alt} color={CEILING_WHITE} beams={x.beams}/>
                                </Choice>
                            ))}
                        </div>
                        <p className="px-1 pt-1 text-[11px] text-[var(--p-muted)]">Plafonds visibles en visite.</p>
                    </Section>
                </>
            )}
        </div>
    );
}
