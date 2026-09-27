/* ============================================================
   PLAN 3D — TEXTURES PROCÉDURALES
   Sols dessinés sur canvas (aucune image ni requête réseau) :
   parquet à l'anglaise, point de Hongrie, carrelage 60×60,
   béton ciré et lames de terrasse. Les sols de la scène ont des
   UV en mètres (repère du monde) : la répétition de la texture
   est fixée ici, une fois pour toutes, par TEXTURE_METERS.
   ============================================================ */

import * as THREE from "three";
import type { FloorKind } from "@/lib/plan3d/styles";

/**
 * Mètres couverts par une répétition de texture, par type de sol.
 * Choisis pour que le motif boucle exactement : 12 lames de 18 cm,
 * 2 colonnes de 40 cm en point de Hongrie, 2 × 2 carreaux de 60 cm,
 * 15 lames de terrasse de 14 cm.
 */
export const TEXTURE_METERS: Record<FloorKind, number> = {
    parquet: 2.16,
    parquet_chevron: 0.8,
    tiles: 1.2,
    concrete: 3,
    decking: 2.1,
};

/** Rugosité conseillée par type de sol (vernis mat, céramique satinée, béton ciré…) */
export const FLOOR_ROUGHNESS: Record<FloorKind, number> = {
    parquet: 0.55,
    parquet_chevron: 0.5,
    tiles: 0.3,
    concrete: 0.62,
    decking: 0.85,
};

const SIZE = 1024;
const cache = new Map<string, THREE.Texture>();

/** Générateur pseudo-aléatoire déterministe (mulberry32) */
function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hash(s: string) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

/** Mélange de deux couleurs CSS, avec variation de luminosité `light` (-1..1) */
function mix(a: string, b: string, t: number, light = 0): string {
    tmpA.set(a);
    tmpB.set(b);
    tmpA.lerp(tmpB, Math.max(0, Math.min(1, t)));
    if (light) tmpA.offsetHSL(0, 0, light);
    return `#${tmpA.getHexString()}`;
}

function luminance(c: string) {
    tmpA.set(c);
    return 0.2126 * tmpA.r + 0.7152 * tmpA.g + 0.0722 * tmpA.b;
}

/** Fibres du bois : traits fins ondulés, peu opaques, le long de l'axe (x0,y0)→(x1,y1) du contexte courant */
function grain(ctx: CanvasRenderingContext2D, rand: () => number, x: number, y: number, len: number, width: number, color: string) {
    const lines = Math.max(3, Math.round(width / 5));
    ctx.strokeStyle = color;
    for (let i = 0; i < lines; i++) {
        const yy = y + (i + 0.5) * (width / lines) + (rand() - 0.5) * 2;
        ctx.globalAlpha = 0.05 + rand() * 0.08;
        ctx.lineWidth = 0.6 + rand() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yy);
        const amp = 0.6 + rand() * 1.6, freq = 0.01 + rand() * 0.02, phase = rand() * 6.28;
        for (let s = 0; s <= len; s += 12) ctx.lineTo(x + s, yy + Math.sin(s * freq + phase) * amp);
        ctx.stroke();
    }
    // Nœuds discrets
    if (rand() < 0.35) {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x + rand() * len, y + width * (0.3 + rand() * 0.4), 4 + rand() * 6, 1.5 + rand() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

/** Parquet à l'anglaise : lames de 18 cm, joints décalés, fibres */
function drawParquet(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    const rows = 12;
    const rowH = SIZE / rows;
    const grainColor = mix(alt, "#3a2414", 0.55);
    for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        // Longueur de lame : moitié ou tiers de la répétition pour boucler sans couture
        const parts = rand() < 0.5 ? 2 : 3;
        const len = SIZE / parts;
        const offset = rand() * len;
        for (let k = -1; k < parts; k++) {
            const x = offset + k * len;
            const shade = mix(base, alt, rand(), (rand() - 0.5) * 0.05);
            const seed = Math.floor(rand() * 1e9);
            for (const dx of [0, -SIZE, SIZE]) {
                const px = x + dx;
                if (px > SIZE || px + len < 0) continue;
                ctx.fillStyle = shade;
                ctx.fillRect(px, y, len, rowH);
                // Même graine pour les copies de bord : la lame se raccorde sans couture
                grain(ctx, rng(seed), px, y, len, rowH, grainColor);
                // Joint d'about
                ctx.fillStyle = "rgba(40, 24, 12, 0.35)";
                ctx.fillRect(px, y, 1.5, rowH);
            }
        }
        // Joint longitudinal
        ctx.fillStyle = "rgba(40, 24, 12, 0.28)";
        ctx.fillRect(0, y, SIZE, 1.5);
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.fillRect(0, y + 1.5, SIZE, 1);
    }
}

/** Point de Hongrie : colonnes de lames coupées à 45°, alternées pour former les chevrons */
function drawChevron(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    const cols = 2;
    const colW = SIZE / cols;
    const step = SIZE / 6;
    const grainColor = mix(alt, "#2e1a0c", 0.6);
    for (let c = 0; c < cols; c++) {
        const x0 = c * colW;
        const dir = c % 2 === 0 ? 1 : -1;
        // Pente de 45° : décalage vertical = largeur de colonne
        const rise = colW * dir;
        // Teintes et graines par lame, périodiques sur 6 pas pour boucler verticalement
        const planks = Array.from({ length: 6 }, () => ({ shade: mix(base, alt, rand(), (rand() - 0.5) * 0.06), seed: Math.floor(rand() * 1e9) }));
        for (let i = -5; i < 11; i++) {
            const y = i * step;
            const { shade, seed } = planks[((i % 6) + 6) % 6];
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x0 + colW, y + rise);
            ctx.lineTo(x0 + colW, y + rise + step);
            ctx.lineTo(x0, y + step);
            ctx.closePath();
            ctx.fillStyle = shade;
            ctx.fill();
            ctx.clip();
            // Fibres dans l'axe de la lame
            ctx.translate(x0, y);
            ctx.rotate(Math.atan2(rise, colW));
            grain(ctx, rng(seed), -10, 0, colW * Math.SQRT2 + 20, step / Math.SQRT2, grainColor);
            ctx.restore();
            ctx.strokeStyle = "rgba(40, 22, 10, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x0 + colW, y + rise);
            ctx.stroke();
        }
        ctx.fillStyle = "rgba(40, 22, 10, 0.4)";
        ctx.fillRect(x0, 0, 1.5, SIZE);
    }
}

/** Carrelage 60 × 60 (ou damier 20 × 20 si les deux teintes contrastent fortement) */
function drawTiles(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    const contrast = Math.abs(luminance(base) - luminance(alt)) > 0.35;
    const n = contrast ? 6 : 2;
    const t = SIZE / n;
    const grout = mix(base, "#ffffff", 0.45, contrast ? 0 : -0.03);
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const g = contrast ? 2 : 3;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const color = contrast ? ((i + j) % 2 === 0 ? base : alt) : mix(base, alt, rand() * 0.6);
            ctx.fillStyle = color;
            ctx.fillRect(i * t + g / 2, j * t + g / 2, t - g, t - g);
            // Léger voile pour casser l'uniformité
            const grad = ctx.createLinearGradient(i * t, j * t, (i + 1) * t, (j + 1) * t);
            grad.addColorStop(0, "rgba(255, 255, 255, 0.05)");
            grad.addColorStop(1, "rgba(0, 0, 0, 0.04)");
            ctx.fillStyle = grad;
            ctx.fillRect(i * t + g / 2, j * t + g / 2, t - g, t - g);
        }
    }
    speckle(ctx, rand, 2500, 0.025);
}

/** Grain fin aléatoire (clair / foncé) */
function speckle(ctx: CanvasRenderingContext2D, rand: () => number, count: number, alpha: number) {
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = rand() < 0.5 ? `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        const s = 1 + rand() * 1.5;
        ctx.fillRect(rand() * SIZE, rand() * SIZE, s, s);
    }
}

/** Béton ciré : nuages doux bouclants et grain fin */
function drawConcrete(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const light = mix(base, "#ffffff", 0.25);
    for (let i = 0; i < 140; i++) {
        const x = rand() * SIZE, y = rand() * SIZE, r = 40 + rand() * 180;
        const c = rand() < 0.5 ? alt : light;
        tmpA.set(c);
        const rgb = `${Math.round(tmpA.r * 255)}, ${Math.round(tmpA.g * 255)}, ${Math.round(tmpA.b * 255)}`;
        const a = 0.05 + rand() * 0.08;
        // Dessin répété aux 9 positions voisines pour boucler sans couture
        for (const dx of [-SIZE, 0, SIZE]) {
            for (const dy of [-SIZE, 0, SIZE]) {
                const cx = x + dx, cy = y + dy;
                if (cx + r < 0 || cx - r > SIZE || cy + r < 0 || cy - r > SIZE) continue;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, `rgba(${rgb}, ${a})`);
                grad.addColorStop(1, `rgba(${rgb}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
            }
        }
    }
    speckle(ctx, rand, 9000, 0.035);
}

/** Terrasse : lames de 14 cm, interstices sombres, vis inox */
function drawDecking(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    const rows = 15;
    const rowH = SIZE / rows;
    const gap = 4;
    ctx.fillStyle = mix(alt, "#000000", 0.6);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const grainColor = mix(alt, "#2a1a0e", 0.5);
    for (let r = 0; r < rows; r++) {
        const y = r * rowH + gap / 2;
        const h = rowH - gap;
        const parts = rand() < 0.5 ? 1 : 2;
        const len = SIZE / parts;
        const offset = rand() * len;
        for (let k = -1; k < parts; k++) {
            const x = offset + k * len;
            const shade = mix(base, alt, rand(), (rand() - 0.5) * 0.06);
            const seed = Math.floor(rand() * 1e9);
            for (const dx of [0, -SIZE, SIZE]) {
                const px = x + dx;
                if (px > SIZE || px + len < 0) continue;
                ctx.fillStyle = shade;
                ctx.fillRect(px + 1, y, len - 2, h);
                grain(ctx, rng(seed), px, y, len, h, grainColor);
                ctx.fillStyle = "rgba(210, 210, 210, 0.5)";
                for (const sx of [px + 18, px + len - 18]) {
                    ctx.beginPath();
                    ctx.arc(sx, y + h * 0.28, 1.6, 0, Math.PI * 2);
                    ctx.arc(sx, y + h * 0.72, 1.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
}

const DRAW: Record<FloorKind, (ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) => void> = {
    parquet: drawParquet,
    parquet_chevron: drawChevron,
    tiles: drawTiles,
    concrete: drawConcrete,
    decking: drawDecking,
};

/**
 * Texture de sol procédurale, mise en cache par (type, teintes).
 * Répétition réglée sur 1 / TEXTURE_METERS : la géométrie doit fournir
 * des UV exprimés en mètres.
 */
export function makeFloorTexture(kind: FloorKind, base: string, alt: string): THREE.Texture {
    const key = `${kind}|${base}|${alt}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx) DRAW[kind](ctx, base, alt, rng(hash(key)));
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const m = TEXTURE_METERS[kind];
    tex.repeat.set(1 / m, 1 / m);
    tex.needsUpdate = true;
    cache.set(key, tex);
    return tex;
}

/** Libère toutes les textures de sol (la prochaine demande les redessine) */
export function disposeTextures() {
    for (const t of cache.values()) t.dispose();
    cache.clear();
}
