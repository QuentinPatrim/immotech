/* ============================================================
   PLAN 3D — STYLES D'AMÉNAGEMENT
   Palette des matériaux par style : sols (par type de pièce),
   murs, menuiseries et meubles. Partagé par l'ameublement
   automatique et la scène 3D.
   ============================================================ */

import type { RoomKind, StyleId } from "@/lib/plan3d/types";

export type FloorKind =
    | "parquet" | "parquet_chevron" | "tiles" | "concrete" | "decking" | "grass"
    | "tiles_large" | "cement_tiles" | "tomettes" | "marble" | "carpet" | "stone";

export interface StylePalette {
    id: StyleId;
    label: string;
    description: string;
    /** Couleur des murs (face intérieure) et du dessus des murs coupés */
    wall: string;
    wallCap: string;
    /** Sols : type et teintes (base, variation) par pièce */
    floor: (kind: RoomKind) => { kind: FloorKind; base: string; alt: string };
    /** Meubles : tissus, bois, métal, accent */
    fabric: string;
    fabricAlt: string;
    wood: string;
    woodDark: string;
    metal: string;
    accent: string;
    /** Plans de travail, sanitaires, électroménager */
    counter: string;
    ceramic: string;
    appliance: string;
    /** Menuiseries (portes, cadres de fenêtres) */
    joinery: string;
}

const wetRooms: RoomKind[] = ["sdb", "wc", "buanderie", "cuisine"];
const outdoor: RoomKind[] = ["balcon", "terrasse"];
/** Jardin : pelouse, même teinte quel que soit le style */
const GRASS = { kind: "grass" as const, base: "#6f9a4c", alt: "#557d38" };

export const STYLES: Record<StyleId, StylePalette> = {
    scandinave: {
        id: "scandinave",
        label: "Scandinave",
        description: "Bois clair, lin et blanc cassé",
        wall: "#f4f1ec",
        wallCap: "#2b2b2e",
        floor: k => k === "jardin" ? GRASS : outdoor.includes(k) ? { kind: "decking", base: "#b08a64", alt: "#9c7754" }
            : wetRooms.includes(k) ? { kind: "tiles", base: "#e9e6e1", alt: "#dcd8d1" }
            : { kind: "parquet", base: "#d9bf9a", alt: "#cdb08a" },
        fabric: "#d8d3cb", fabricAlt: "#9fb0a3", wood: "#d2b48c", woodDark: "#a6825c", metal: "#2b2b2e", accent: "#c98f6b",
        counter: "#f2f0ec", ceramic: "#ffffff", appliance: "#e7e7ea", joinery: "#ffffff",
    },
    contemporain: {
        id: "contemporain",
        label: "Contemporain",
        description: "Lignes pures, gris chaud et noyer",
        wall: "#f2f2f0",
        wallCap: "#1d1d1f",
        floor: k => k === "jardin" ? GRASS : outdoor.includes(k) ? { kind: "decking", base: "#8a6a4f", alt: "#7a5c43" }
            : wetRooms.includes(k) ? { kind: "tiles", base: "#cfcac3", alt: "#c3bdb5" }
            : { kind: "parquet", base: "#b9936b", alt: "#a8825c" },
        fabric: "#8e8a85", fabricAlt: "#3f4a55", wood: "#7b5a3c", woodDark: "#4e3826", metal: "#1d1d1f", accent: "#b3261a",
        counter: "#e8e6e3", ceramic: "#fbfbfb", appliance: "#2c2c2e", joinery: "#f7f7f5",
    },
    haussmannien: {
        id: "haussmannien",
        label: "Haussmannien",
        description: "Parquet en point de Hongrie, moulures, laiton",
        wall: "#f6f2ea",
        wallCap: "#2a2522",
        floor: k => k === "jardin" ? GRASS : outdoor.includes(k) ? { kind: "decking", base: "#9a7b5d", alt: "#8a6c50" }
            : wetRooms.includes(k) ? { kind: "tiles", base: "#efece6", alt: "#1f1f1f" }
            : { kind: "parquet_chevron", base: "#b07a48", alt: "#9c6a3d" },
        fabric: "#2f4a44", fabricAlt: "#c9b99a", wood: "#8b5a2b", woodDark: "#5b3a1c", metal: "#b8964f", accent: "#2f4a44",
        counter: "#f1efe9", ceramic: "#ffffff", appliance: "#d9d9dc", joinery: "#fbf8f2",
    },
    industriel: {
        id: "industriel",
        label: "Industriel",
        description: "Béton ciré, métal noir et cuir",
        wall: "#e7e4df",
        wallCap: "#18181a",
        floor: k => k === "jardin" ? GRASS : outdoor.includes(k) ? { kind: "decking", base: "#6f5a47", alt: "#5f4c3b" }
            : wetRooms.includes(k) ? { kind: "concrete", base: "#a9a6a1", alt: "#9d9a95" }
            : { kind: "concrete", base: "#b5b1ab", alt: "#a8a49e" },
        fabric: "#7a4a2e", fabricAlt: "#44474a", wood: "#6b4a2f", woodDark: "#3d2a1a", metal: "#1b1b1c", accent: "#c26a2c",
        counter: "#3a3a3c", ceramic: "#f4f4f4", appliance: "#8e8e93", joinery: "#1b1b1c",
    },
};

export const STYLE_LIST = Object.values(STYLES);
