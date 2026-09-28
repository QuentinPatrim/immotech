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
import type { WallTexKind } from "@/lib/plan3d/finishes";

/** Tous les motifs dessinables : sols, murs et plafonds */
export type TexKind = FloorKind | WallTexKind;

/**
 * Mètres couverts par une répétition de texture, par type de sol.
 * Choisis pour que le motif boucle exactement : 12 lames de 18 cm,
 * 2 colonnes de 40 cm en point de Hongrie, 2 × 2 carreaux de 60 cm,
 * 15 lames de terrasse de 14 cm.
 */
export const TEXTURE_METERS: Record<TexKind, number> = {
    parquet: 2.16,
    parquet_chevron: 0.8,
    tiles: 1.2,
    concrete: 3,
    decking: 2.1,
    grass: 2,
    tiles_large: 2.4,
    cement_tiles: 0.8,
    tomettes: 1.09,
    marble: 1.2,
    carpet: 1,
    stone: 1.2,
    droplets: 0.5,
    metro: 0.6,
    large_tiles: 1.2,
    brick: 0.92,
    lambris: 1.2,
};

/** Rugosité conseillée par type de sol (vernis mat, céramique satinée, béton ciré…) */
export const FLOOR_ROUGHNESS: Record<FloorKind, number> = {
    parquet: 0.55,
    parquet_chevron: 0.5,
    tiles: 0.3,
    concrete: 0.62,
    decking: 0.85,
    grass: 0.95,
    tiles_large: 0.25,
    cement_tiles: 0.45,
    tomettes: 0.7,
    marble: 0.12,
    carpet: 1,
    stone: 0.8,
};

const SIZE = 1024;
const cache = new Map<string, THREE.Texture>();
/** Dessin d'une carte de relief (joints en creux, reliefs clairs) plutôt que des couleurs */
let BUMP = false;

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
export function mixColor(a: string, b: string, t: number, light = 0): string {
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
    const grainColor = mixColor(alt, "#3a2414", 0.55);
    for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        // Longueur de lame : moitié ou tiers de la répétition pour boucler sans couture
        const parts = rand() < 0.5 ? 2 : 3;
        const len = SIZE / parts;
        const offset = rand() * len;
        for (let k = -1; k < parts; k++) {
            const x = offset + k * len;
            const shade = mixColor(base, alt, rand(), (rand() - 0.5) * 0.05);
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
    const grainColor = mixColor(alt, "#2e1a0c", 0.6);
    for (let c = 0; c < cols; c++) {
        const x0 = c * colW;
        const dir = c % 2 === 0 ? 1 : -1;
        // Pente de 45° : décalage vertical = largeur de colonne
        const rise = colW * dir;
        // Teintes et graines par lame, périodiques sur 6 pas pour boucler verticalement
        const planks = Array.from({ length: 6 }, () => ({ shade: mixColor(base, alt, rand(), (rand() - 0.5) * 0.06), seed: Math.floor(rand() * 1e9) }));
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
    const grout = BUMP ? "#303030" : mixColor(base, "#ffffff", 0.45, contrast ? 0 : -0.03);
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const g = contrast ? 2 : 3;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const color = contrast ? ((i + j) % 2 === 0 ? base : alt) : mixColor(base, alt, rand() * 0.6);
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
    const light = mixColor(base, "#ffffff", 0.25);
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
    ctx.fillStyle = mixColor(alt, "#000000", 0.6);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const grainColor = mixColor(alt, "#2a1a0e", 0.5);
    for (let r = 0; r < rows; r++) {
        const y = r * rowH + gap / 2;
        const h = rowH - gap;
        const parts = rand() < 0.5 ? 1 : 2;
        const len = SIZE / parts;
        const offset = rand() * len;
        for (let k = -1; k < parts; k++) {
            const x = offset + k * len;
            const shade = mixColor(base, alt, rand(), (rand() - 0.5) * 0.06);
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

/** Pelouse : fond vert nuancé, brins courts, touffes plus claires et plus sombres */
function drawGrass(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Taches de teinte (tonte, ombre, zones plus sèches)
    for (let i = 0; i < 70; i++) {
        const x = rand() * SIZE, y = rand() * SIZE, r = 40 + rand() * 140;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const c = mixColor(base, rand() < 0.5 ? alt : "#b9c46a", rand() * 0.6);
        g.addColorStop(0, c);
        g.addColorStop(1, "rgba(0,0,0,0)");
        for (const dx of [0, -SIZE, SIZE]) for (const dy of [0, -SIZE, SIZE]) {
            ctx.save();
            ctx.translate(dx, dy);
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
        }
    }
    // Brins
    ctx.lineCap = "round";
    for (let i = 0; i < 26000; i++) {
        const x = rand() * SIZE, y = rand() * SIZE, len = 4 + rand() * 9, a = -Math.PI / 2 + (rand() - 0.5) * 1.1;
        ctx.strokeStyle = mixColor(base, rand() < 0.5 ? alt : "#d8e08a", rand() * 0.7, (rand() - 0.5) * 0.12);
        ctx.lineWidth = 1 + rand() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
    }
}

/** Grand format 120 × 60, joints fins, pose à coupe de pierre */
function drawTilesLarge(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    const w = SIZE / 2, h = SIZE / 4, g = 2;
    ctx.fillStyle = BUMP ? "#303030" : mixColor(base, "#ffffff", 0.3);
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let r = 0; r < 4; r++) {
        const off = r % 2 ? w / 2 : 0;
        for (let k = -1; k < 2; k++) {
            const x = off + k * w;
            ctx.fillStyle = mixColor(base, alt, rand() * 0.7);
            ctx.fillRect(x + g / 2, r * h + g / 2, w - g, h - g);
        }
    }
    speckle(ctx, rand, 5000, 0.02);
}

/** Carreaux de ciment 20 × 20 : rosace, quarts de cercle aux angles (le motif se prolonge d'un carreau à l'autre) */
function drawCementTiles(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    const n = 4, t = SIZE / n;
    const mid = mixColor(base, alt, 0.45);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = i * t, y = j * t, cx = x + t / 2, cy = y + t / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, t, t);
        ctx.clip();
        ctx.fillStyle = base;
        ctx.fillRect(x, y, t, t);
        ctx.fillStyle = alt;
        for (const [ax, ay] of [[x, y], [x + t, y], [x, y + t], [x + t, y + t]]) {
            ctx.beginPath();
            ctx.arc(ax, ay, t * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = base;
        for (const [ax, ay] of [[x, y], [x + t, y], [x, y + t], [x + t, y + t]]) {
            ctx.beginPath();
            ctx.arc(ax, ay, t * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        // Rosace : quatre pétales et cœur
        ctx.fillStyle = mid;
        for (let a = 0; a < 4; a++) {
            ctx.beginPath();
            ctx.ellipse(cx + Math.cos(a * Math.PI / 2) * t * 0.16, cy + Math.sin(a * Math.PI / 2) * t * 0.16, t * 0.13, t * 0.06, a * Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = alt;
        ctx.beginPath();
        ctx.moveTo(cx, cy - t * 0.09); ctx.lineTo(cx + t * 0.09, cy); ctx.lineTo(cx, cy + t * 0.09); ctx.lineTo(cx - t * 0.09, cy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Patine : léger voile irrégulier
        ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + rand() * 0.05})`;
        ctx.fillRect(x, y, t, t);
        ctx.fillStyle = BUMP ? "#303030" : "rgba(60, 50, 40, 0.35)";
        ctx.fillRect(x, y, t, 1.5);
        ctx.fillRect(x, y, 1.5, t);
    }
    speckle(ctx, rand, 5000, 0.03);
}

/** Tomettes hexagonales en terre cuite, teintes irrégulières */
function drawTomettes(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    // Pavage pointe en haut : 7 colonnes × 4 paires de rangées ; écart de 1 % entre les deux axes
    const cols = 7, pairs = 4;
    const sx = SIZE / (cols * Math.sqrt(3)), sy = SIZE / (pairs * 3);
    ctx.fillStyle = BUMP ? "#303030" : mixColor(alt, "#e8dccb", 0.55);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const shades = Array.from({ length: cols * pairs * 2 }, () => mixColor(base, alt, rand(), (rand() - 0.5) * 0.08));
    for (let row = -1; row <= pairs * 2; row++) {
        for (let col = -1; col <= cols; col++) {
            const cx = (col + (row % 2 ? 0.5 : 0)) * Math.sqrt(3) * sx;
            const cy = row * 1.5 * sy;
            const idx = ((((row % (pairs * 2)) + pairs * 2) % (pairs * 2)) * cols + ((col % cols) + cols) % cols);
            ctx.fillStyle = shades[idx];
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = Math.PI / 6 + (k * Math.PI) / 3;
                const px = cx + Math.cos(a) * sx * 0.93, py = cy + Math.sin(a) * sy * 0.93;
                if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
    }
    speckle(ctx, rand, 9000, 0.05);
}

/** Marbre : dalles 60 × 60, nuages doux et veines sinueuses */
function drawMarble(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const wrap = (fn: (dx: number, dy: number) => void) => { for (const dx of [-SIZE, 0, SIZE]) for (const dy of [-SIZE, 0, SIZE]) fn(dx, dy); };
    for (let i = 0; i < 40; i++) {
        const x = rand() * SIZE, y = rand() * SIZE, r = 80 + rand() * 220;
        wrap((dx, dy) => {
            const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
            g.addColorStop(0, "rgba(150, 146, 140, 0.06)");
            g.addColorStop(1, "rgba(150, 146, 140, 0)");
            ctx.fillStyle = g;
            ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        });
    }
    ctx.lineCap = "round";
    for (let v = 0; v < 9; v++) {
        let x = rand() * SIZE, y = rand() * SIZE, a = rand() * Math.PI * 2;
        const pts: [number, number][] = [[x, y]];
        for (let s = 0; s < 70; s++) {
            a += (rand() - 0.5) * 0.5;
            x += Math.cos(a) * 12; y += Math.sin(a) * 12;
            pts.push([x, y]);
        }
        const width = 0.6 + rand() * (v < 3 ? 2.6 : 1.2);
        wrap((dx, dy) => {
            ctx.strokeStyle = alt;
            ctx.globalAlpha = v < 3 ? 0.4 : 0.22;
            ctx.lineWidth = width;
            ctx.beginPath();
            pts.forEach(([px, py], k) => (k ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy)));
            ctx.stroke();
        });
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = BUMP ? "#303030" : "rgba(120, 116, 110, 0.35)";
    for (const k of [0, SIZE / 2]) { ctx.fillRect(k, 0, 1.2, SIZE); ctx.fillRect(0, k, SIZE, 1.2); }
}

/** Moquette : fibres serrées, chiné discret */
function drawCarpet(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 60000; i++) {
        ctx.fillStyle = mixColor(base, rand() < 0.5 ? alt : "#ffffff", rand() * 0.35);
        ctx.fillRect(rand() * SIZE, rand() * SIZE, 1.5 + rand() * 1.5, 1.5 + rand() * 1.5);
    }
}

/** Dalles de pierre 60 × 40, joints larges, grain */
function drawStone(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = BUMP ? "#303030" : mixColor(alt, "#6b655c", 0.4);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const w = SIZE / 2, h = SIZE / 3, g = 6;
    for (let r = 0; r < 3; r++) {
        const off = r % 2 ? w / 2 : 0;
        for (let k = -1; k < 2; k++) {
            ctx.fillStyle = mixColor(base, alt, rand(), (rand() - 0.5) * 0.06);
            ctx.fillRect(off + k * w + g / 2, r * h + g / 2, w - g, h - g);
        }
    }
    speckle(ctx, rand, 16000, 0.05);
}

/** Gouttelettes : projections d'enduit, reliefs éclairés d'un côté */
function drawDroplets(ctx: CanvasRenderingContext2D, base: string, _alt: string, rand: () => number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const light = BUMP ? "#ffffff" : mixColor(base, "#ffffff", 0.35);
    const dark = BUMP ? "#000000" : mixColor(base, "#000000", 0.18);
    for (let i = 0; i < 9000; i++) {
        const x = rand() * SIZE, y = rand() * SIZE, r = 2 + rand() * rand() * 9;
        for (const dx of [0, -SIZE, SIZE]) for (const dy of [0, -SIZE, SIZE]) {
            const cx = x + dx, cy = y + dy;
            if (cx + r < -2 || cx - r > SIZE + 2 || cy + r < -2 || cy - r > SIZE + 2) continue;
            ctx.globalAlpha = BUMP ? 0.5 : 0.28;
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy + r * 0.3, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = BUMP ? 0.7 : 0.45;
            ctx.fillStyle = light;
            ctx.beginPath(); ctx.ellipse(cx - r * 0.15, cy - r * 0.2, r * 0.8, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

/** Joint + carreau biseauté (faïence) */
function glazedTile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    const g = 3;
    ctx.fillStyle = color;
    ctx.fillRect(x + g / 2, y + g / 2, w - g, h - g);
    if (BUMP) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(x + g, y + g, w - g * 2, h - g * 2);
        return;
    }
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    grad.addColorStop(0.12, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.88, "rgba(0, 0, 0, 0)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.12)");
    ctx.fillStyle = grad;
    ctx.fillRect(x + g / 2, y + g / 2, w - g, h - g);
}

/** Faïence métro 7,5 × 15, pose décalée */
function drawMetro(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = BUMP ? "#303030" : mixColor(alt, "#b8b4ad", 0.4);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const w = SIZE / 4, h = SIZE / 8;
    for (let r = 0; r < 8; r++) {
        const off = r % 2 ? w / 2 : 0;
        for (let k = -1; k < 4; k++) glazedTile(ctx, off + k * w, r * h, w, h, BUMP ? "#9a9a9a" : mixColor(base, alt, rand() * 0.25));
    }
}

/** Faïence 60 × 30, pose droite */
function drawLargeWallTiles(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = BUMP ? "#303030" : mixColor(alt, "#a9a49c", 0.4);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const w = SIZE / 2, h = SIZE / 4;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) glazedTile(ctx, k * w, r * h, w, h, BUMP ? "#9a9a9a" : mixColor(base, alt, rand() * 0.5));
    speckle(ctx, rand, 3000, 0.015);
}

/** Brique pleine 22 × 6,5, joints de mortier en retrait */
function drawBrick(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    ctx.fillStyle = BUMP ? "#202020" : "#b9ada0";
    ctx.fillRect(0, 0, SIZE, SIZE);
    const rows = 12, per = 4;
    const h = SIZE / rows, w = SIZE / per, g = 9;
    for (let r = 0; r < rows; r++) {
        const off = r % 2 ? w / 2 : 0;
        for (let k = -1; k < per; k++) {
            const x = off + k * w;
            ctx.fillStyle = BUMP ? "#a0a0a0" : mixColor(base, rand() < 0.15 ? "#5a2d20" : alt, rand(), (rand() - 0.5) * 0.08);
            ctx.fillRect(x + g / 2, r * h + g / 2, w - g, h - g);
        }
    }
    speckle(ctx, rand, 20000, 0.07);
}

/** Lambris : lames de 10 cm */
function drawLambris(ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) {
    drawParquet(ctx, base, alt, rand);
}

const DRAW: Record<TexKind, (ctx: CanvasRenderingContext2D, base: string, alt: string, rand: () => number) => void> = {
    parquet: drawParquet,
    parquet_chevron: drawChevron,
    tiles: drawTiles,
    concrete: drawConcrete,
    decking: drawDecking,
    grass: drawGrass,
    tiles_large: drawTilesLarge,
    cement_tiles: drawCementTiles,
    tomettes: drawTomettes,
    marble: drawMarble,
    carpet: drawCarpet,
    stone: drawStone,
    droplets: drawDroplets,
    metro: drawMetro,
    large_tiles: drawLargeWallTiles,
    brick: drawBrick,
    lambris: drawLambris,
};

/** Motifs dont le relief se voit : ils reçoivent une carte de relief */
export const HAS_RELIEF: Partial<Record<TexKind, number>> = {
    droplets: 2.2, brick: 3, stone: 2, metro: 1.5, large_tiles: 1, tomettes: 1.5, tiles: 0.8, tiles_large: 0.6, cement_tiles: 0.5, decking: 1.2,
};

function draw(kind: TexKind, base: string, alt: string, bump: boolean): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    BUMP = bump;
    try {
        if (ctx) DRAW[kind](ctx, base, alt, rng(hash(`${kind}|${bump ? "" : base}|${bump ? "" : alt}`)));
    } finally {
        BUMP = false;
    }
    return canvas;
}

/**
 * Texture procédurale, mise en cache par (type, teintes).
 * Répétition réglée sur 1 / TEXTURE_METERS : la géométrie doit fournir
 * des UV exprimés en mètres.
 */
export function makeTexture(kind: TexKind, base: string, alt: string): THREE.Texture {
    const key = `${kind}|${base}|${alt}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const tex = new THREE.CanvasTexture(draw(kind, base, alt, false));
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

/** Carte de relief du motif (indépendante des teintes), ou null si le motif est plat */
export function makeBumpTexture(kind: TexKind): THREE.Texture | null {
    if (!HAS_RELIEF[kind]) return null;
    const key = `bump|${kind}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const tex = new THREE.CanvasTexture(draw(kind, "#808080", "#707070", true));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    const m = TEXTURE_METERS[kind];
    tex.repeat.set(1 / m, 1 / m);
    tex.needsUpdate = true;
    cache.set(key, tex);
    return tex;
}

/** Texture de sol (compatibilité) */
export const makeFloorTexture = (kind: FloorKind, base: string, alt: string) => makeTexture(kind, base, alt);

const swatches = new Map<string, string>();

/** Vignette (data URL) d'un motif : un carré d'environ 50 cm, pour les sélecteurs */
export function swatchUrl(kind: TexKind, base: string, alt: string): string {
    const key = `${kind}|${base}|${alt}`;
    const hit = swatches.get(key);
    if (hit) return hit;
    const src = makeTexture(kind, base, alt).image as HTMLCanvasElement;
    const out = document.createElement("canvas");
    out.width = 96;
    out.height = 96;
    const ctx = out.getContext("2d");
    const crop = Math.min(SIZE, (SIZE * 0.6) / TEXTURE_METERS[kind]);
    if (ctx) ctx.drawImage(src, 0, 0, crop, crop, 0, 0, 96, 96);
    const url = out.toDataURL("image/jpeg", 0.85);
    swatches.set(key, url);
    return url;
}

/** Libère toutes les textures (la prochaine demande les redessine) */
export function disposeTextures() {
    for (const t of cache.values()) t.dispose();
    cache.clear();
}
