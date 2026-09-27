"use client";

/* ============================================================
   PLAN 3D — LUMIÈRE ET VUE
   Heure du jour (position du soleil), orientation du logement
   (cap du haut du plan, boussole), angle de vue de la visite.
   ============================================================ */

import { Compass, RotateCcw, RotateCw, Sun, X } from "lucide-react";
import { cardinal } from "@/lib/plan3d/sun";

const fmtHour = (h: number) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export default function LightPanel({ hour, onHour, north, onNorth, fov, onFov, walking, located, onClose }: {
    hour: number;
    onHour: (h: number) => void;
    north: number;
    onNorth: (deg: number) => void;
    fov: number;
    onFov: (deg: number) => void;
    walking: boolean;
    /** Adresse géolocalisée (sinon soleil de Toulouse) */
    located: boolean;
    onClose: () => void;
}) {
    const n = ((Math.round(north) % 360) + 360) % 360;
    return (
        <div className="pointer-events-auto w-[min(92vw,320px)] rounded-[22px] p-4 border border-[var(--p-line)] backdrop-blur-xl shadow-[var(--p-shadow)] space-y-4"
            style={{ backgroundColor: "var(--p-glass)" }} role="dialog" aria-label="Lumière et vue">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2"><Sun size={15} className="text-[var(--p-accent)]"/> Lumière et vue</p>
                <button type="button" onClick={onClose} aria-label="Fermer" className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-muted)] hover:text-[var(--p-fg)]"><X size={14}/></button>
            </div>

            <label className="block">
                <span className="flex justify-between text-[13px]"><span className="text-[var(--p-muted)]">Heure</span><b className="tabular-nums text-[var(--p-fg)]">{fmtHour(hour)}</b></span>
                <input type="range" min={6} max={22} step={0.25} value={hour} onChange={e => onHour(Number(e.target.value))}
                    aria-label="Heure du jour" className="w-full mt-1.5 accent-[#d35f52]"/>
            </label>

            <div>
                <span className="flex justify-between text-[13px]">
                    <span className="text-[var(--p-muted)] flex items-center gap-1.5"><Compass size={13}/> Orientation</span>
                    <b className="text-[var(--p-fg)]">Haut du plan : {cardinal(n)}</b>
                </span>
                <div className="mt-2 flex items-center gap-3">
                    {/* Boussole : la flèche rouge montre le nord par rapport au plan affiché */}
                    <div className="relative w-14 h-14 shrink-0 rounded-full border border-[var(--p-line-strong)]" style={{ backgroundColor: "var(--p-sunken)" }} aria-hidden>
                        <div className="absolute inset-0 transition-transform" style={{ transform: `rotate(${-n}deg)` }}>
                            <div className="absolute left-1/2 top-1 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[20px] border-l-transparent border-r-transparent border-b-[#d35f52]"/>
                            <span className="absolute left-1/2 -translate-x-1/2 top-[22px] text-[9px] font-bold text-[#d35f52]">N</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <input type="range" min={0} max={359} step={1} value={n} onChange={e => onNorth(Number(e.target.value))}
                            aria-label="Orientation du haut du plan (degrés depuis le nord)" className="w-full accent-[#d35f52]"/>
                        <div className="flex items-center justify-between">
                            <button type="button" onClick={() => onNorth((n + 345) % 360)} aria-label="Tourner de -15°" className="h-7 px-2 rounded-lg text-xs font-semibold bg-[var(--p-sunken)] text-[var(--p-fg-2)] inline-flex items-center gap-1"><RotateCcw size={12}/> 15°</button>
                            <span className="text-xs tabular-nums text-[var(--p-muted)]">{n}°</span>
                            <button type="button" onClick={() => onNorth((n + 15) % 360)} aria-label="Tourner de +15°" className="h-7 px-2 rounded-lg text-xs font-semibold bg-[var(--p-sunken)] text-[var(--p-fg-2)] inline-flex items-center gap-1">15° <RotateCw size={12}/></button>
                        </div>
                    </div>
                </div>
                {!located && <p className="text-[11px] text-[var(--p-muted)] mt-1.5">Adresse non localisée : soleil calculé pour Toulouse.</p>}
            </div>

            {walking && (
                <label className="block">
                    <span className="flex justify-between text-[13px]"><span className="text-[var(--p-muted)]">Grand angle</span><b className="tabular-nums text-[var(--p-fg)]">{Math.round(fov)}°</b></span>
                    <input type="range" min={55} max={110} step={1} value={fov} onChange={e => onFov(Number(e.target.value))}
                        aria-label="Angle de vue de la visite" className="w-full mt-1.5 accent-[#d35f52]"/>
                </label>
            )}
        </div>
    );
}
