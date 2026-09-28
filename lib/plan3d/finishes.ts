/* ============================================================
   PLAN 3D — REVÊTEMENTS (sols, murs, plafonds)
   Catalogue des finitions choisies pièce par pièce : parquets,
   carrelages, béton ciré, moquette… ; peinture lisse, gouttelettes,
   faïence, brique ; plafond peint, gouttelettes, lambris, poutres.
   Sans choix, la pièce garde les revêtements du style.
   ============================================================ */

import type { Plan3D, Room, RoomFinish, RoomKind } from "@/lib/plan3d/types";
import { OUTDOOR_KINDS } from "@/lib/plan3d/types";
import type { FloorKind, StylePalette } from "@/lib/plan3d/styles";

export interface FloorFinish { id: string; label: string; kind: FloorKind; base: string; alt: string; outdoor?: boolean }

export const FLOOR_FINISHES: FloorFinish[] = [
    { id: "parquet_clair", label: "Parquet chêne clair", kind: "parquet", base: "#dcc3a0", alt: "#cfb28c" },
    { id: "parquet_chene", label: "Parquet chêne naturel", kind: "parquet", base: "#bf9468", alt: "#ad8258" },
    { id: "parquet_fonce", label: "Parquet noyer", kind: "parquet", base: "#7d5738", alt: "#6a472c" },
    { id: "point_hongrie", label: "Point de Hongrie", kind: "parquet_chevron", base: "#b07a48", alt: "#9c6a3d" },
    { id: "carrelage_blanc", label: "Carrelage blanc", kind: "tiles", base: "#eeebe6", alt: "#e2ded7" },
    { id: "carrelage_gris", label: "Carrelage gris", kind: "tiles", base: "#a9a7a3", alt: "#9c9a96" },
    { id: "grand_format", label: "Grand format beige", kind: "tiles_large", base: "#d8cfc2", alt: "#cdc3b5" },
    { id: "carreaux_ciment", label: "Carreaux de ciment", kind: "cement_tiles", base: "#ece6da", alt: "#2f4a5a" },
    { id: "damier", label: "Damier noir et blanc", kind: "tiles", base: "#efece6", alt: "#1f1f1f" },
    { id: "tomettes", label: "Tomettes", kind: "tomettes", base: "#b4583a", alt: "#9c4a30" },
    { id: "marbre", label: "Marbre blanc", kind: "marble", base: "#f1efeb", alt: "#9a9894" },
    { id: "beton_cire", label: "Béton ciré", kind: "concrete", base: "#b5b1ab", alt: "#a8a49e" },
    { id: "moquette", label: "Moquette", kind: "carpet", base: "#b9b2a7", alt: "#a39c91" },
    { id: "lames_bois", label: "Lames de terrasse", kind: "decking", base: "#9a7654", alt: "#876445", outdoor: true },
    { id: "dalles_pierre", label: "Dalles de pierre", kind: "stone", base: "#c9c1b3", alt: "#b7ae9f", outdoor: true },
    { id: "pelouse", label: "Pelouse", kind: "grass", base: "#6f9a4c", alt: "#557d38", outdoor: true },
];

/** Textures murales (null : peinture lisse, sans motif) */
export type WallTexKind = "droplets" | "metro" | "large_tiles" | "brick" | "concrete" | "lambris";

export interface WallFinish { id: string; label: string; tex: WallTexKind | null; /** Teinte au choix (peinture) */ paint: boolean; base?: string; alt?: string; roughness: number }

export const WALL_FINISHES: WallFinish[] = [
    { id: "peinture", label: "Peinture lisse", tex: null, paint: true, roughness: 0.9 },
    { id: "gouttelettes", label: "Gouttelettes", tex: "droplets", paint: true, roughness: 0.95 },
    { id: "faience_metro", label: "Faïence métro", tex: "metro", paint: false, base: "#f6f5f2", alt: "#dcd9d3", roughness: 0.2 },
    { id: "faience_grand", label: "Faïence grand format", tex: "large_tiles", paint: false, base: "#e4e0da", alt: "#d6d1c9", roughness: 0.25 },
    { id: "brique", label: "Brique apparente", tex: "brick", paint: false, base: "#a65a3f", alt: "#8a4631", roughness: 0.95 },
    { id: "beton", label: "Béton brut", tex: "concrete", paint: false, base: "#b3b0aa", alt: "#a29f99", roughness: 0.85 },
];

export const PAINT_COLORS: { id: string; label: string; color: string }[] = [
    { id: "blanc", label: "Blanc pur", color: "#f7f6f3" },
    { id: "blanc_casse", label: "Blanc cassé", color: "#efe9df" },
    { id: "greige", label: "Greige", color: "#d8cfc2" },
    { id: "gris_perle", label: "Gris perle", color: "#d3d3d1" },
    { id: "sauge", label: "Vert sauge", color: "#b8c2a6" },
    { id: "bleu_brume", label: "Bleu brume", color: "#b5c3cc" },
    { id: "terracotta", label: "Terracotta", color: "#c98d6e" },
    { id: "anthracite", label: "Anthracite", color: "#4b4d52" },
];

export interface CeilingFinish { id: string; label: string; tex: WallTexKind | null; beams?: boolean; base?: string; alt?: string }

export const CEILING_FINISHES: CeilingFinish[] = [
    { id: "peinture", label: "Peinture lisse", tex: null },
    { id: "gouttelettes", label: "Gouttelettes", tex: "droplets" },
    { id: "lambris", label: "Lambris bois", tex: "lambris", base: "#d6b48a", alt: "#c49f74" },
    { id: "poutres", label: "Poutres apparentes", tex: null, beams: true },
];

export const CEILING_WHITE = "#f7f6f3";
export const BEAM_COLOR = "#7a5637";

const WET: RoomKind[] = ["sdb", "wc", "buanderie", "cuisine"];

/** Famille de pièces : sert à « appliquer aux pièces semblables » */
export function roomFamily(kind: RoomKind): "outdoor" | "wet" | "dry" {
    return OUTDOOR_KINDS.includes(kind) ? "outdoor" : WET.includes(kind) ? "wet" : "dry";
}

export const findFloor = (id?: string) => FLOOR_FINISHES.find(f => f.id === id);
export const findWall = (id?: string) => WALL_FINISHES.find(f => f.id === id);
export const findCeiling = (id?: string) => CEILING_FINISHES.find(f => f.id === id);

/** Sol de la pièce : choix de la pièce, sinon celui du style */
export function floorOf(room: Room, palette: StylePalette): { kind: FloorKind; base: string; alt: string } {
    const f = findFloor(room.finish?.floor);
    return f ? { kind: f.kind, base: f.base, alt: f.alt } : palette.floor(room.kind);
}

/** Murs de la pièce quand ils diffèrent du style (null : peinture du style, rien à habiller) */
export function wallOf(room: Room): { finish: WallFinish; color: string } | null {
    const f = findWall(room.finish?.wall);
    if (!f) return null;
    return { finish: f, color: f.paint ? room.finish?.wallColor || PAINT_COLORS[0].color : f.base || "#ffffff" };
}

/** Revêtements modifiés d'une pièce (undefined : on retire le choix) */
export function setFinish(plan: Plan3D, roomId: string, patch: Partial<RoomFinish>): Plan3D {
    return {
        ...plan,
        rooms: plan.rooms.map(r => {
            if (r.id !== roomId) return r;
            const next: RoomFinish = { ...r.finish, ...patch };
            for (const k of Object.keys(next) as (keyof RoomFinish)[]) if (next[k] === undefined) delete next[k];
            return { ...r, finish: Object.keys(next).length ? next : undefined };
        }),
    };
}

/** Recopie une partie des revêtements d'une pièce sur d'autres pièces */
export function copyFinish(plan: Plan3D, fromId: string, keys: (keyof RoomFinish)[], to: (r: Room) => boolean): Plan3D {
    const src = plan.rooms.find(r => r.id === fromId);
    if (!src) return plan;
    return {
        ...plan,
        rooms: plan.rooms.map(r => {
            if (r.id === fromId || !to(r)) return r;
            const next: RoomFinish = { ...r.finish };
            for (const k of keys) {
                if (src.finish?.[k] === undefined) delete next[k];
                else next[k] = src.finish[k];
            }
            return { ...r, finish: Object.keys(next).length ? next : undefined };
        }),
    };
}
