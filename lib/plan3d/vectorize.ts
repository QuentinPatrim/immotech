/* ============================================================
   PLAN 3D — LECTURE DIRECTE D'UN DESSIN DE PLAN (sans IA)
   Pour les croquis nets (DDT, plans de vente) : les murs sont des
   traits sombres, les fenêtres souvent en bleu, le nom de chaque
   pièce est écrit dedans. On isole les traits, on referme les
   ouvertures (portes, passages) le long des murs, puis chaque
   zone fermée qui contient un nom de pièce devient une pièce.
   Les ouvertures refermées donnent les portes, les traits bleus
   les fenêtres. Sortie : relevé normalisé 0..1000 (ModelPlan),
   converti en mètres par planFromModel.
   ============================================================ */

import type { ModelOpening, ModelPlan, ModelPoint, ModelRoom } from "@/lib/plan3d/modelPlan";
import type { RoomKind } from "@/lib/plan3d/types";

export interface RasterImage { width: number; height: number; data: Uint8ClampedArray }

/** Nom de pièce repéré sur le dessin (position en pixels de l'image) */
export interface Seed { name: string; kind: RoomKind; x: number; y: number; area: number | null }

export interface VectorizeResult {
    plan: ModelPlan;
    /** Noms de pièces retrouvés dans une zone fermée / non retrouvés */
    found: string[];
    missing: string[];
    /** Placards repérés à leur symbole (portes coulissantes) : nom du placard → pièce qui le dessert */
    placards: { name: string; owner: string }[];
}

const INK_LUM = 150;

/** Traits du dessin : encre sombre (murs, cloisons) et bleu (fenêtres) */
function masks(img: RasterImage) {
    const { width: W, height: H, data } = img;
    const ink = new Uint8Array(W * H), blue = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < W * H; i++, p += 4) {
        const r = data[p], g = data[p + 1], b = data[p + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (b - Math.max(r, g) > 22 && lum < 245) blue[i] = 1;
        else if (lum < INK_LUM) ink[i] = 1;
    }
    return { ink, blue };
}

/** Composantes connexes (8-voisinage) d'un masque : on retire celles dont la boîte est plus petite que minSide */
function dropSmall(mask: Uint8Array, W: number, H: number, minSide: number): { kept: Uint8Array; comps: { x0: number; y0: number; x1: number; y1: number; px: number[] }[] } {
    const seen = new Uint8Array(W * H), kept = new Uint8Array(W * H);
    const comps: { x0: number; y0: number; x1: number; y1: number; px: number[] }[] = [];
    const stack: number[] = [];
    for (let s = 0; s < W * H; s++) {
        if (!mask[s] || seen[s]) continue;
        seen[s] = 1; stack.push(s);
        const px: number[] = [];
        let x0 = W, y0 = H, x1 = 0, y1 = 0;
        while (stack.length) {
            const i = stack.pop() as number;
            px.push(i);
            const x = i % W, y = (i - x) / W;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            for (let dy = -1; dy <= 1; dy++) {
                const yy = y + dy;
                if (yy < 0 || yy >= H) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const xx = x + dx;
                    if (xx < 0 || xx >= W) continue;
                    const j = yy * W + xx;
                    if (mask[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
                }
            }
        }
        if (Math.max(x1 - x0, y1 - y0) + 1 >= minSide) {
            for (const i of px) kept[i] = 1;
            comps.push({ x0, y0, x1, y1, px });
        }
    }
    return { kept, comps };
}

interface Gap { horizontal: boolean; line: number; a: number; b: number }

/** Épaisseur de trait en chaque pixel : longueur du passage d'encre vertical (vt) et horizontal (ht) */
function thickness(mask: Uint8Array, W: number, H: number) {
    const vt = new Uint16Array(W * H), ht = new Uint16Array(W * H);
    for (let x = 0; x < W; x++) {
        let start = -1;
        for (let y = 0; y <= H; y++) {
            const on = y < H && mask[y * W + x];
            if (on && start < 0) start = y;
            if (!on && start >= 0) { for (let k = start; k < y; k++) vt[k * W + x] = y - start; start = -1; }
        }
    }
    for (let y = 0; y < H; y++) {
        let start = -1;
        for (let x = 0; x <= W; x++) {
            const on = x < W && mask[y * W + x];
            if (on && start < 0) start = x;
            if (!on && start >= 0) { for (let k = start; k < x; k++) ht[y * W + k] = x - start; start = -1; }
        }
    }
    return { vt, ht };
}

/**
 * Referme les interruptions des murs : dans chaque ligne (puis colonne), deux
 * tronçons de MUR (assez longs et épais : les battants de porte, traits fins,
 * sont ignorés) séparés de moins de maxGap sont reliés ; les micro-interruptions
 * (angles mal jointifs, jonction fenêtre / mur) sont refermées quelle que soit
 * l'épaisseur.
 */
function closeGaps(walls: Uint8Array, W: number, H: number, th: { vt: Uint16Array; ht: Uint16Array }, opt: { minRun: number; maxGap: number; crossGap: number; micro: number; minThick: number; maxThick: number; doorMax: number }, box: { x0: number; y0: number; x1: number; y1: number }) {
    const out = walls.slice();
    const gaps: Gap[] = [];
    const scan = (horizontal: boolean, src: Uint8Array, t: { vt: Uint16Array; ht: Uint16Array }) => {
        const lines = horizontal ? H : W, len = horizontal ? W : H;
        const lo = horizontal ? box.y0 : box.x0, hi = horizontal ? box.y1 : box.x1;
        const perp = horizontal ? t.vt : t.ht;
        for (let l = Math.max(0, lo); l <= Math.min(lines - 1, hi); l++) {
            const runs: { a: number; b: number; wall: boolean; cross: boolean }[] = [];
            let start = -1, thick = 0, along = 0;
            for (let k = 0; k <= len; k++) {
                const i = horizontal ? l * W + k : k * W + l;
                const on = k < len && src[i];
                if (on && start < 0) { start = k; thick = 0; along = 0; }
                // Épaisseur de mur ; au croisement d'un trait perpendiculaire, l'épaisseur mesurée n'est pas celle du trait
                if (on && perp[i] >= opt.minThick && perp[i] <= opt.maxThick) thick++;
                if (on && perp[i] >= opt.minRun) along++;
                if (!on && start >= 0) {
                    const n = k - start;
                    // cross : traversée d'un mur perpendiculaire (court ici, long dans l'autre sens),
                    // éventuellement accolé à un battant de porte
                    if (n >= 1) runs.push({ a: start, b: k - 1, wall: n >= opt.minRun && thick >= n * 0.3 && thick + along >= n * 0.6, cross: along >= n * 0.5 && n <= opt.maxThick * 3 });
                    start = -1;
                }
            }
            for (let r = 1; r < runs.length; r++) {
                const a = runs[r - 1].b + 1, b = runs[r].a - 1, g = b - a + 1;
                if (g <= 0) continue;
                const micro = g <= opt.micro;
                const A = runs[r - 1], B = runs[r];
                // Mur ↔ mur, ou mur ↔ mur perpendiculaire (porte ou passage contre un angle)
                const both = A.wall && B.wall;
                const toCorner = (A.wall && B.cross) || (B.wall && A.cross);
                // Extrémité de tronçon accrochée à un mur perpendiculaire (angle, T) : un vide entre
                // deux telles extrémités est un croisement de couloirs, pas une porte (sauf s'il est étroit)
                const anchored = (k: number, dir: number) => {
                    for (let d = 0; d <= opt.maxThick; d++) {
                        const kk = k - dir * d;
                        if (kk < 0 || kk >= len) break;
                        if (perp[horizontal ? l * W + kk : kk * W + l] >= opt.minRun) return true;
                    }
                    return false;
                };
                const endA = A.wall && anchored(A.b, 1), endB = B.wall && anchored(B.a, -1);
                const hall = (both && endA && endB && g > opt.doorMax) || (toCorner && (A.wall ? endA : endB));
                if (!micro && (hall || !((both && g <= opt.maxGap) || (toCorner && g <= opt.crossGap)))) continue;
                for (let k = a; k <= b; k++) out[horizontal ? l * W + k : k * W + l] = 1;
                if (!micro) gaps.push({ horizontal, line: l, a, b });
            }
        }
    };
    scan(true, walls, th);
    // Colonnes lues sur le résultat des lignes : une porte refermée compte comme mur pour l'angle voisin
    scan(false, out.slice(), thickness(out, W, H));
    return { closed: out, gaps };
}

/** Zones libres (4-voisinage) : identifiant par pixel, surface, boîte, contact avec le bord */
function regions(closed: Uint8Array, W: number, H: number) {
    const id = new Int32Array(W * H).fill(-1);
    const info: { area: number; x0: number; y0: number; x1: number; y1: number; border: boolean }[] = [];
    const stack: number[] = [];
    for (let s = 0; s < W * H; s++) {
        if (closed[s] || id[s] >= 0) continue;
        const r = info.length;
        const inf = { area: 0, x0: W, y0: H, x1: 0, y1: 0, border: false };
        id[s] = r; stack.push(s);
        while (stack.length) {
            const i = stack.pop() as number;
            const x = i % W, y = (i - x) / W;
            inf.area++;
            if (x < inf.x0) inf.x0 = x; if (x > inf.x1) inf.x1 = x; if (y < inf.y0) inf.y0 = y; if (y > inf.y1) inf.y1 = y;
            if (x === 0 || y === 0 || x === W - 1 || y === H - 1) inf.border = true;
            if (x > 0) { const j = i - 1; if (!closed[j] && id[j] < 0) { id[j] = r; stack.push(j); } }
            if (x < W - 1) { const j = i + 1; if (!closed[j] && id[j] < 0) { id[j] = r; stack.push(j); } }
            if (y > 0) { const j = i - W; if (!closed[j] && id[j] < 0) { id[j] = r; stack.push(j); } }
            if (y < H - 1) { const j = i + W; if (!closed[j] && id[j] < 0) { id[j] = r; stack.push(j); } }
        }
        info.push(inf);
    }
    return { id, info };
}

/** Pixel libre le plus proche d'un nom de pièce (le texte lui-même est de l'encre) */
function freePixelNear(closed: Uint8Array, W: number, H: number, x: number, y: number, radius: number): number {
    const cx = Math.round(x), cy = Math.round(y);
    for (let r = 0; r <= radius; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const xx = cx + dx, yy = cy + dy;
                if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                if (!closed[yy * W + xx]) return yy * W + xx;
            }
        }
    }
    return -1;
}

/** Contour extérieur d'une zone (suivi de Moore), en pixels */
function traceContour(inRegion: (x: number, y: number) => boolean, x0: number, y0: number, x1: number, y1: number): ModelPoint[] {
    // Premier pixel (haut-gauche) de la zone
    let sx = -1, sy = -1;
    for (let y = y0; y <= y1 && sx < 0; y++) for (let x = x0; x <= x1; x++) if (inRegion(x, y)) { sx = x; sy = y; break; }
    if (sx < 0) return [];
    const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const pts: ModelPoint[] = [{ x: sx, y: sy }];
    let cx = sx, cy = sy, back = 6; // on arrive « par le haut »
    for (let guard = 0; guard < 400000; guard++) {
        let moved = false;
        for (let k = 0; k < 8; k++) {
            const d = (back + 1 + k) % 8;
            const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
            if (inRegion(nx, ny)) {
                cx = nx; cy = ny; back = (d + 4) % 8;
                moved = true;
                break;
            }
        }
        if (!moved || (cx === sx && cy === sy)) break;
        pts.push({ x: cx, y: cy });
    }
    return pts;
}

/** Douglas-Peucker sur un contour fermé */
function simplifyClosed(pts: ModelPoint[], tol: number): ModelPoint[] {
    if (pts.length < 4) return pts;
    const dp = (a: number, b: number, keep: boolean[]) => {
        let best = -1, bestD = 0;
        const A = pts[a], B = pts[b];
        const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        for (let i = a + 1; i < b; i++) {
            const d = Math.abs((B.x - A.x) * (A.y - pts[i].y) - (A.x - pts[i].x) * (B.y - A.y)) / L;
            if (d > bestD) { bestD = d; best = i; }
        }
        if (best >= 0 && bestD > tol) { keep[best] = true; dp(a, best, keep); dp(best, b, keep); }
    };
    // Coupe au point le plus éloigné du premier
    let far = 0, farD = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y); if (d > farD) { farD = d; far = i; } }
    const keep = pts.map(() => false);
    keep[0] = true; keep[far] = true;
    dp(0, far, keep);
    const ring = [...pts.slice(far), pts[0]];
    const keep2 = ring.map(() => false);
    const saved = pts;
    // second demi-contour
    const dp2 = (a: number, b: number) => {
        let best = -1, bestD = 0;
        const A = ring[a], B = ring[b];
        const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        for (let i = a + 1; i < b; i++) {
            const d = Math.abs((B.x - A.x) * (A.y - ring[i].y) - (A.x - ring[i].x) * (B.y - A.y)) / L;
            if (d > bestD) { bestD = d; best = i; }
        }
        if (best >= 0 && bestD > tol) { keep2[best] = true; dp2(a, best); dp2(best, b); }
    };
    dp2(0, ring.length - 1);
    const out: ModelPoint[] = [];
    for (let i = 0; i <= far; i++) if (keep[i]) out.push(saved[i]);
    for (let i = 1; i < ring.length - 1; i++) if (keep2[i]) out.push(ring[i]);
    return out;
}

/**
 * Lit un dessin de plan. Renvoie null si le dessin n'est pas exploitable
 * (pas de murs nets, noms introuvables dans des zones fermées).
 */
/** Zone de texte (pixels) à effacer avant l'analyse */
export interface TextBox { x0: number; y0: number; x1: number; y1: number }

export function vectorizePlan(img: RasterImage, seeds: Seed[], textBoxes?: TextBox[]): VectorizeResult | null {
    const W = img.width, H = img.height;
    if (W < 50 || H < 50 || seeds.length < 2) return null;
    const { ink, blue } = masks(img);
    const diag = Math.hypot(W, H);
    // Texte effacé : un nom écrit à cheval sur une cloison ne doit pas devenir un morceau de mur.
    // Sans positions exactes (image), boîte estimée autour de chaque nom de pièce.
    const fontH = Math.max(8, diag * 0.013);
    const boxes = textBoxes?.length ? textBoxes : seeds.map(s => {
        const w = s.name.length * fontH * 0.58 + fontH * 0.6;
        return { x0: s.x - w / 2, y0: s.y - fontH * 0.8, x1: s.x + w / 2, y1: s.y + fontH * 0.8 };
    });
    // Dans ces zones, seuls les traits courts dans les deux sens (lettres) sont effacés :
    // une cloison qui traverse le nom est bien plus longue que la hauteur du texte
    const raw = thickness(ink, W, H);
    for (const b of boxes) {
        const keepLen = Math.max(12, (b.y1 - b.y0) * 1.6);
        for (let y = Math.max(0, Math.floor(b.y0)); y <= Math.min(H - 1, Math.ceil(b.y1)); y++) {
            for (let x = Math.max(0, Math.floor(b.x0)); x <= Math.min(W - 1, Math.ceil(b.x1)); x++) {
                const i = y * W + x;
                if (Math.max(raw.ht[i], raw.vt[i]) < keepLen) { ink[i] = 0; blue[i] = 0; }
            }
        }
    }
    const minSide = Math.max(6, Math.round(diag * 0.012));
    const inkClean = dropSmall(ink, W, H, minSide).kept;
    const blueComps = dropSmall(blue, W, H, minSide).comps;
    const walls = inkClean.slice();
    for (const c of blueComps) for (const i of c.px) walls[i] = 1;

    // Emprise du logement : boîte des longs traits horizontaux / verticaux, limitée au
    // tracé qui contient les noms de pièces (cartouche, titre souligné, tableau exclus)
    const longRun = Math.max(20, Math.round(Math.min(W, H) * 0.12));
    const drawn = dropSmall(walls, W, H, longRun).comps;
    const inside = (c: { x0: number; y0: number; x1: number; y1: number }) => seeds.filter(s => s.x >= c.x0 && s.x <= c.x1 && s.y >= c.y0 && s.y <= c.y1).length;
    const main = drawn.map(c => ({ c, n: inside(c), a: (c.x1 - c.x0) * (c.y1 - c.y0) })).sort((p, q) => q.n - p.n || q.a - p.a)[0];
    let lim = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
    if (main && main.n >= 2) {
        // + traits voisins détachés (mur extérieur interrompu par une fenêtre…) presque entièrement
        // compris dans l'emprise élargie ; un trait de titre ou un cadre de page la déborde largement
        const m = { ...main.c };
        for (let grow = true; grow;) {
            grow = false;
            const px = (m.x1 - m.x0) * 0.12, py = (m.y1 - m.y0) * 0.12;
            for (const c of drawn) {
                if (c.x0 >= m.x0 && c.x1 <= m.x1 && c.y0 >= m.y0 && c.y1 <= m.y1) continue;
                const ix = Math.max(0, Math.min(c.x1, m.x1 + px) - Math.max(c.x0, m.x0 - px)), iy = Math.max(0, Math.min(c.y1, m.y1 + py) - Math.max(c.y0, m.y0 - py));
                if (ix >= (c.x1 - c.x0) * 0.9 && iy >= (c.y1 - c.y0) * 0.9) {
                    m.x0 = Math.min(m.x0, c.x0); m.y0 = Math.min(m.y0, c.y0); m.x1 = Math.max(m.x1, c.x1); m.y1 = Math.max(m.y1, c.y1);
                    grow = true;
                }
            }
        }
        const pad = Math.round(Math.min(m.x1 - m.x0, m.y1 - m.y0) * 0.05);
        lim = { x0: Math.max(0, m.x0 - pad), y0: Math.max(0, m.y0 - pad), x1: Math.min(W - 1, m.x1 + pad), y1: Math.min(H - 1, m.y1 + pad) };
    }
    let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
    const scanLong = (horizontal: boolean) => {
        const lines = horizontal ? H : W, len = horizontal ? W : H;
        for (let l = 0; l < lines; l++) {
            let start = -1;
            for (let k = 0; k <= len; k++) {
                const on = k < len && walls[horizontal ? l * W + k : k * W + l];
                if (on && start < 0) start = k;
                if (!on && start >= 0) {
                    if (k - start >= longRun) {
                        const [xa, xb, ya, yb] = horizontal ? [start, k - 1, l, l] : [l, l, start, k - 1];
                        if (xa >= lim.x0 && xb <= lim.x1 && ya >= lim.y0 && yb <= lim.y1) {
                            bx0 = Math.min(bx0, xa); bx1 = Math.max(bx1, xb); by0 = Math.min(by0, ya); by1 = Math.max(by1, yb);
                        }
                    }
                    start = -1;
                }
            }
        }
    };
    scanLong(true);
    scanLong(false);
    if (bx1 <= bx0 || by1 <= by0) return null;
    const aptW = bx1 - bx0, aptH = by1 - by0, aptArea = aptW * aptH;
    const box = { x0: bx0 - 2, y0: by0 - 2, x1: bx1 + 2, y1: by1 + 2 };

    // Échelle approchée (pixels par mètre) grâce au tableau des surfaces
    const known = seeds.filter(s => s.area).reduce((a, s) => a + (s.area as number), 0);
    const ppm = known > 5 ? Math.sqrt((aptArea * 0.88) / known) : 0;
    // Tronçon de mur : au moins 30 cm (les symboles, battants et lettres sont plus courts)
    const minRun = Math.max(4, Math.round(Math.min(aptW, aptH) * 0.02), Math.round(ppm * 0.3));

    // Épaisseur des murs : médiane des épaisseurs le long des longs traits
    const th = thickness(inkClean, W, H);
    const samples: number[] = [];
    for (let y = by0; y <= by1; y += 2) for (let x = bx0; x <= bx1; x += 2) {
        const i = y * W + x;
        if (inkClean[i] && th.ht[i] >= longRun && th.vt[i] > 0) samples.push(th.vt[i]);
        else if (inkClean[i] && th.vt[i] >= longRun && th.ht[i] > 0) samples.push(th.ht[i]);
    }
    samples.sort((a, b) => a - b);
    const wallThick = samples.length ? samples[Math.floor(samples.length / 2)] : 3;
    // Les cloisons sont plus fines que les murs de façade (et moins nombreuses) : seuil sur les
    // traits longs les plus fins (10e centile), les symboles et battants restant en dessous
    const partition = samples.length ? samples[Math.floor(samples.length / 10)] : wallThick;
    const minThick = Math.max(2, Math.round(partition * 0.65));
    const micro = Math.max(3, Math.round(wallThick * 2.5));

    /* Façades de placard : une cloison ponctuée de petits carrés (portes coulissantes), sans
       nom écrit. On la referme d'un bout à l'autre ; la zone derrière deviendra le placard de
       la pièce qu'elle dessert (sa surface est comptée dans celle de la pièce). */
    const blueMask = new Uint8Array(W * H);
    for (const c of blueComps) for (const i of c.px) blueMask[i] = 1;
    const holes = regions(walls, W, H);
    const sMin = Math.max(4, Math.round(partition * 0.8)), sMax = ppm ? ppm * 0.45 : Math.min(aptW, aptH) * 0.06;
    const squares: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; r: number }[] = [];
    holes.info.forEach((h, r) => {
        const w = h.x1 - h.x0 + 1, hh = h.y1 - h.y0 + 1;
        if (h.border || w < sMin || hh < sMin || w > sMax || hh > sMax) return;
        if (Math.abs(w - hh) > Math.max(w, hh) * 0.35 || h.area < w * hh * 0.75) return;
        if (h.x0 < box.x0 || h.x1 > box.x1 || h.y0 < box.y0 || h.y1 > box.y1) return;
        // Extrémités de fenêtre (carrés accolés au trait bleu) : pas un placard
        const m = Math.max(w, hh);
        for (let y = Math.max(0, h.y0 - m); y <= Math.min(H - 1, h.y1 + m); y += 2)
            for (let x = Math.max(0, h.x0 - m); x <= Math.min(W - 1, h.x1 + m); x += 2) if (blueMask[y * W + x]) return;
        squares.push({ x0: h.x0, y0: h.y0, x1: h.x1, y1: h.y1, cx: (h.x0 + h.x1) / 2, cy: (h.y0 + h.y1) / 2, r });
    });
    const placardLines: { horizontal: boolean; line: number; a: number; b: number; depth: number }[] = [];
    for (const horizontal of [true, false]) {
        const used = new Set<number>();
        const key = (q: (typeof squares)[number]) => (horizontal ? q.cy : q.cx);
        const pos = (q: (typeof squares)[number]) => (horizontal ? q.cx : q.cy);
        const sorted = squares.map((q, i) => ({ q, i })).sort((p, q) => pos(p.q) - pos(q.q));
        for (const { q, i } of sorted) {
            if (used.has(i)) continue;
            const group = sorted.filter(o => !used.has(o.i) && Math.abs(key(o.q) - key(q)) <= Math.max(3, partition));
            // Au moins deux carrés alignés, pas trop espacés (moins de 2 m entre voisins)
            const chain = [group[0]];
            for (const o of group.slice(1)) {
                const last = chain[chain.length - 1].q;
                if (pos(o.q) - pos(last) <= (ppm ? ppm * 2 : Math.min(aptW, aptH) * 0.3)) chain.push(o);
                else break;
            }
            if (chain.length < 2) continue;
            for (const o of chain) used.add(o.i);
            const line = chain.reduce((a, o) => a + key(o.q), 0) / chain.length;
            const a = Math.min(...chain.map(o => (horizontal ? o.q.x0 : o.q.y0))), b = Math.max(...chain.map(o => (horizontal ? o.q.x1 : o.q.y1)));
            const size = Math.max(...chain.map(o => Math.max(o.q.x1 - o.q.x0, o.q.y1 - o.q.y0)));
            const half = Math.max(2, Math.round(partition / 2));
            for (let k = a; k <= b; k++) for (let d = -half; d <= half; d++) {
                const x = horizontal ? k : Math.round(line) + d, y = horizontal ? Math.round(line) + d : k;
                if (x >= 0 && y >= 0 && x < W && y < H) walls[y * W + x] = 1;
            }
            // Intérieur des carrés rempli : ce ne sont pas des zones
            for (const o of chain) for (let y = o.q.y0; y <= o.q.y1; y++) for (let x = o.q.x0; x <= o.q.x1; x++) if (holes.id[y * W + x] === o.q.r) walls[y * W + x] = 1;
            placardLines.push({ horizontal, line, a, b, depth: Math.round(size / 2 + wallThick + 4) });
        }
    }

    type Best = { closed: Uint8Array; gaps: Gap[]; reg: ReturnType<typeof regions>; hits: number[]; score: number };
    const regionOf = (closed: Uint8Array, reg: ReturnType<typeof regions>, s: Seed) => {
        // Nom hors de l'emprise du logement (tableau, légende…) : ignoré
        if (s.x < box.x0 || s.x > box.x1 || s.y < box.y0 || s.y > box.y1) return -1;
        const p = freePixelNear(closed, W, H, s.x, s.y, Math.round(diag * 0.02));
        if (p < 0) return -1;
        const r = reg.id[p], inf = reg.info[r];
        if (!inf || inf.border || inf.area > aptArea * 0.7 || inf.area < aptArea * 0.001) return -1;
        return r;
    };
    // Plusieurs tolérances de fermeture : on garde celle qui isole le plus de pièces nommées
    let best: Best | null = null;
    // Échelle approchée grâce au tableau des surfaces : tolérances en mètres réels
    // (passage ouvert ≤ 2,5 m, porte contre un angle ≤ 1,2 m) ; sinon en fraction du dessin
    const tolerances = ppm
        ? [0.9, 1.3, 1.8, 2.5].map(m => ({ maxGap: Math.round(m * ppm), crossGap: Math.round(Math.min(m, 1.2) * ppm) }))
        : [0.1, 0.16, 0.22, 0.3, 0.4].map(f => ({ maxGap: Math.round(Math.min(aptW, aptH) * f), crossGap: Math.round(Math.min(aptW, aptH) * Math.min(f, 0.16)) }));
    for (const tl of tolerances) {
        const { closed, gaps } = closeGaps(walls, W, H, th, { minRun, maxGap: tl.maxGap, crossGap: tl.crossGap, micro, minThick, maxThick: Math.round(wallThick * 2.5), doorMax: ppm ? Math.round(ppm * 1.05) : Math.round(Math.min(aptW, aptH) * 0.12) }, box);
        const reg = regions(closed, W, H);
        const hits = seeds.map(s => regionOf(closed, reg, s));
        const counts = new Map<number, number>();
        for (const h of hits) if (h >= 0) counts.set(h, (counts.get(h) ?? 0) + 1);
        const shared = [...counts.values()].filter(c => c > 1).reduce((a, c) => a + c - 1, 0);
        // Score : pièces isolées ; avec un tableau des surfaces, cohérence des proportions en plus
        let score = hits.filter(h => h >= 0).length - 0.6 * shared;
        const withArea = seeds.map((s, i) => ({ s, h: hits[i] })).filter(o => o.h >= 0 && o.s.area && (counts.get(o.h) ?? 0) === 1);
        if (withArea.length >= 3) {
            const ks = withArea.map(o => reg.info[o.h].area / (o.s.area as number)).sort((p, q) => p - q);
            const kk = ks[Math.floor(ks.length / 2)];
            const err = withArea.reduce((acc, o) => acc + Math.abs(reg.info[o.h].area / kk - (o.s.area as number)) / (o.s.area as number), 0) / withArea.length;
            score -= err * seeds.length;
        }
        if (!best || score > best.score + 0.01) best = { closed, gaps, reg, hits, score };
    }
    if (!best) return null;
    const { closed, reg, hits, gaps } = best;

    /* Zones sans nom (fin de couloir, dégagement ouvert…) rattachées à la pièce nommée voisine
       qui manque le plus de surface par rapport au tableau (ou à la plus petite si pas de tableau) */
    const parent = reg.info.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const labeled = new Set(hits.filter(h => h >= 0));
    // Placards : zone sans nom derrière une façade de placard, face à une pièce nommée
    const placardZones: { zone: number; owner: number; line: (typeof placardLines)[number] }[] = [];
    for (const pl of placardLines) {
        const votes = new Map<string, number>();
        for (const f of [0.25, 0.5, 0.75]) {
            const k = pl.a + (pl.b - pl.a) * f;
            const at = (d: number) => {
                const x = Math.round(pl.horizontal ? k : pl.line + d), y = Math.round(pl.horizontal ? pl.line + d : k);
                return x < 0 || y < 0 || x >= W || y >= H ? -1 : reg.id[y * W + x];
            };
            const sa = at(-pl.depth), sb = at(pl.depth);
            if (sa < 0 || sb < 0 || sa === sb) continue;
            const pair = labeled.has(sa) && !labeled.has(sb) ? `${sb}:${sa}` : labeled.has(sb) && !labeled.has(sa) ? `${sa}:${sb}` : "";
            if (pair) votes.set(pair, (votes.get(pair) ?? 0) + 1);
        }
        const top = [...votes.entries()].sort((p, q) => q[1] - p[1])[0];
        if (!top) continue;
        const [zone, owner] = top[0].split(":").map(Number);
        const inf = reg.info[zone];
        if (inf.border || inf.area > aptArea * 0.15 || placardZones.some(p => p.zone === zone)) continue;
        placardZones.push({ zone, owner, line: pl });
    }
    const reserved = new Set(placardZones.map(p => p.zone));
    const areaOf = new Map<number, number>();
    for (const r of labeled) areaOf.set(r, reg.info[r].area);
    const ratios = seeds.map((s, i) => (hits[i] >= 0 && s.area ? reg.info[hits[i]].area / s.area : 0)).filter(v => v > 0).sort((a, b) => a - b);
    const k = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;
    const targetOf = new Map<number, number>();
    seeds.forEach((s, i) => { if (hits[i] >= 0 && s.area && k) targetOf.set(hits[i], (targetOf.get(hits[i]) ?? 0) + s.area * k); });
    // Voisinage à travers les fermetures (pixels ajoutés)
    const adj = new Map<number, Map<number, number>>();
    const reach = Math.max(3, wallThick + 3);
    for (let y = box.y0 + 1; y < box.y1; y++) for (let x = box.x0 + 1; x < box.x1; x++) {
        const i = y * W + x;
        if (!closed[i] || walls[i]) continue;
        const ids = new Set<number>();
        for (const [dx, dy] of [[reach, 0], [-reach, 0], [0, reach], [0, -reach]]) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const r = reg.id[yy * W + xx];
            if (r >= 0 && !reg.info[r].border) ids.add(r);
        }
        const list = [...ids];
        for (let a = 0; a < list.length; a++) for (let b = 0; b < list.length; b++) {
            if (a === b) continue;
            const m = adj.get(list[a]) ?? new Map<number, number>();
            m.set(list[b], (m.get(list[b]) ?? 0) + 1);
            adj.set(list[a], m);
        }
    }
    const unlabeled = [...adj.keys()].filter(r => !labeled.has(r) && !reserved.has(r) && reg.info[r].area >= aptArea * 0.002 && reg.info[r].area < aptArea * 0.4)
        .sort((a, b) => reg.info[b].area - reg.info[a].area);
    for (let pass = 0; pass < 3; pass++) {
        for (const u of unlabeled) {
            if (labeled.has(find(u))) continue;
            let bestR = -1, bestGain = -Infinity;
            for (const [n] of adj.get(u) ?? []) {
                const root = find(n);
                if (!labeled.has(root)) continue;
                const a = areaOf.get(root) ?? 0, t = targetOf.get(root);
                const gain = t ? Math.abs(a - t) - Math.abs(a + reg.info[u].area - t) : -a;
                if (gain > bestGain) { bestGain = gain; bestR = root; }
            }
            if (bestR >= 0 && (bestGain > 0 || !targetOf.size)) {
                parent[u] = bestR;
                areaOf.set(bestR, (areaOf.get(bestR) ?? 0) + reg.info[u].area);
            }
        }
    }

    // Zone encore isolée à l'intérieur du logement (placard fermé, gaine…) : rattachée à la pièce
    // voisine, à travers la cloison, qui manque le plus de surface — un trou dans le plan serait pire
    const leftovers = [...new Set(reg.id)].filter(r => r >= 0 && !labeled.has(find(r)) && !reserved.has(r) && !reg.info[r].border
        && reg.info[r].area >= aptArea * 0.004 && reg.info[r].area < aptArea * 0.15
        && reg.info[r].x0 > box.x0 && reg.info[r].x1 < box.x1 && reg.info[r].y0 > box.y0 && reg.info[r].y1 < box.y1
        // pas l'intérieur d'un mur dessiné en double trait : zone assez large et compacte
        && Math.min(reg.info[r].x1 - reg.info[r].x0, reg.info[r].y1 - reg.info[r].y0) + 1 >= (ppm ? ppm * 0.4 : wallThick * 4)
        && reg.info[r].area >= (reg.info[r].x1 - reg.info[r].x0 + 1) * (reg.info[r].y1 - reg.info[r].y0 + 1) * 0.5);
    if (leftovers.length) {
        const wallReach = Math.max(4, Math.round(wallThick * 1.6)) + 2;
        const pending = new Set(leftovers);
        const touch = new Map<number, Map<number, number>>();
        for (let y = box.y0 + 1; y < box.y1; y++) for (let x = box.x0 + 1; x < box.x1; x++) {
            const i = y * W + x;
            const u = reg.id[i];
            if (u < 0 || !pending.has(u)) continue;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                // premier pixel libre au-delà du trait
                let d = 1;
                while (d <= wallReach && closed[(y + dy * d) * W + x + dx * d]) d++;
                if (d === 1 || d > wallReach) continue;
                const xx = x + dx * d, yy = y + dy * d;
                if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                const n = reg.id[yy * W + xx];
                if (n < 0 || n === u || reg.info[n].border) continue;
                const m = touch.get(u) ?? new Map<number, number>();
                m.set(n, (m.get(n) ?? 0) + 1);
                touch.set(u, m);
            }
        }
        for (const u of leftovers) {
            let bestR = -1, bestGain = -Infinity;
            for (const [n, len] of touch.get(u) ?? []) {
                const root = find(n);
                if (!labeled.has(root) || len < wallThick * 2) continue;
                const a = areaOf.get(root) ?? 0, t = targetOf.get(root);
                const gain = t ? Math.abs(a - t) - Math.abs(a + reg.info[u].area - t) : len;
                if (gain > bestGain) { bestGain = gain; bestR = root; }
            }
            if (bestR >= 0) { parent[u] = bestR; areaOf.set(bestR, (areaOf.get(bestR) ?? 0) + reg.info[u].area); }
        }
    }

    const found: string[] = [], missing: string[] = [];
    const rooms: ModelRoom[] = [];
    const norm = (p: ModelPoint): ModelPoint => ({ x: (p.x * 1000) / W, y: (p.y * 1000) / H });
    const tol = Math.max(1.5, wallThick * 1.2);
    const byRegion = new Map<number, number[]>();
    hits.forEach((h, i) => { if (h >= 0) byRegion.set(h, [...(byRegion.get(h) ?? []), i]); else missing.push(seeds[i].name); });
    const member = (x: number, y: number, r: number) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return false;
        const id = reg.id[y * W + x];
        return id >= 0 && find(id) === r;
    };

    for (const [r, idxs] of byRegion) {
        // Boîte de la zone fusionnée
        let rx0 = W, ry0 = H, rx1 = 0, ry1 = 0;
        reg.info.forEach((inf, i) => { if (find(i) === r) { rx0 = Math.min(rx0, inf.x0); ry0 = Math.min(ry0, inf.y0); rx1 = Math.max(rx1, inf.x1); ry1 = Math.max(ry1, inf.y1); } });
        for (const si of idxs) {
            const s = seeds[si];
            // Zone partagée par plusieurs noms : chaque pixel va au nom le plus proche
            const inRegion = idxs.length === 1
                ? (x: number, y: number) => member(x, y, r)
                : (x: number, y: number) => {
                    if (!member(x, y, r)) return false;
                    let bestI = si, bestD = Infinity;
                    for (const j of idxs) { const d = (seeds[j].x - x) ** 2 + (seeds[j].y - y) ** 2; if (d < bestD) { bestD = d; bestI = j; } }
                    return bestI === si;
                };
            let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
            for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) if (inRegion(x, y)) { area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            if (!area) { missing.push(s.name); continue; }
            const fill = area / ((x1 - x0 + 1) * (y1 - y0 + 1));
            let poly: ModelPoint[];
            if (fill > 0.9) poly = [{ x: x0, y: y0 }, { x: x1 + 1, y: y0 }, { x: x1 + 1, y: y1 + 1 }, { x: x0, y: y1 + 1 }];
            else {
                // Les fermetures entre zones fusionnées ne doivent pas creuser le contour
                // (cloison entre deux parties fusionnées comprise)
                const inside = (x: number, y: number) => inRegion(x, y) || (closed[y * W + x] === 1 && ((inRegion(x + reach, y) && inRegion(x - reach, y)) || (inRegion(x, y + reach) && inRegion(x, y - reach))));
                poly = simplifyClosed(traceContour(inside, x0, y0, x1, y1), tol);
                if (poly.length < 3) poly = [{ x: x0, y: y0 }, { x: x1 + 1, y: y0 }, { x: x1 + 1, y: y1 + 1 }, { x: x0, y: y1 + 1 }];
            }
            rooms.push({ name: s.name, kind: s.kind, surfaceOnPlan: s.area, polygon: poly.map(norm) });
            found.push(s.name);
        }
    }
    // Placards : contour de la zone, nom « Placard <pièce> », façade = ouverture
    const placards: { name: string; owner: string }[] = [];
    const placardFronts: ModelOpening[] = [];
    for (const pz of placardZones) {
        const inf = reg.info[pz.zone];
        const mid = { x: pz.line.horizontal ? (pz.line.a + pz.line.b) / 2 : pz.line.line, y: pz.line.horizontal ? pz.line.line : (pz.line.a + pz.line.b) / 2 };
        const owners = seeds.map((sd, i) => ({ sd, i })).filter(o => hits[o.i] === pz.owner);
        if (!owners.length) continue;
        const ownerSeed = owners.sort((p, q) => Math.hypot(p.sd.x - mid.x, p.sd.y - mid.y) - Math.hypot(q.sd.x - mid.x, q.sd.y - mid.y))[0].sd;
        const inZone = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && reg.id[y * W + x] === pz.zone;
        const fill = inf.area / ((inf.x1 - inf.x0 + 1) * (inf.y1 - inf.y0 + 1));
        let poly: ModelPoint[] = [{ x: inf.x0, y: inf.y0 }, { x: inf.x1 + 1, y: inf.y0 }, { x: inf.x1 + 1, y: inf.y1 + 1 }, { x: inf.x0, y: inf.y1 + 1 }];
        if (fill <= 0.9) {
            const traced = simplifyClosed(traceContour(inZone, inf.x0, inf.y0, inf.x1, inf.y1), tol);
            if (traced.length >= 3) poly = traced;
        }
        // Côtés du placard prolongés jusqu'aux pièces voisines (un battant de porte dessiné
        // contre lui épaissit localement la cloison et laisserait un vide)
        if (poly.length === 4) {
            let [x0, y0, x1, y1] = [inf.x0, inf.y0, inf.x1 + 1, inf.y1 + 1];
            const reachPx = ppm ? ppm * 0.5 : wallThick * 5;
            const others = rooms.map(rm => rm.polygon.map(q => ({ x: (q.x * W) / 1000, y: (q.y * H) / 1000 })));
            const edgesOf = (pts: ModelPoint[]) => pts.map((a, i) => [a, pts[(i + 1) % pts.length]] as const);
            let right = Infinity, left = -Infinity, down = Infinity, up = -Infinity;
            for (const pts of others) for (const [a, b] of edgesOf(pts)) {
                if (Math.abs(a.x - b.x) < 1 && Math.min(a.y, b.y) < y1 && Math.max(a.y, b.y) > y0) {
                    if (a.x >= x1 && a.x - x1 <= reachPx) right = Math.min(right, a.x);
                    if (a.x <= x0 && x0 - a.x <= reachPx) left = Math.max(left, a.x);
                }
                if (Math.abs(a.y - b.y) < 1 && Math.min(a.x, b.x) < x1 && Math.max(a.x, b.x) > x0) {
                    if (a.y >= y1 && a.y - y1 <= reachPx) down = Math.min(down, a.y);
                    if (a.y <= y0 && y0 - a.y <= reachPx) up = Math.max(up, a.y);
                }
            }
            const gap = wallThick + 1;
            if (right < Infinity && right - x1 > gap * 1.5) x1 = right - gap;
            if (left > -Infinity && x0 - left > gap * 1.5) x0 = left + gap;
            if (down < Infinity && down - y1 > gap * 1.5) y1 = down - gap;
            if (up > -Infinity && y0 - up > gap * 1.5) y0 = up + gap;
            poly = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
        }
        const name = `Placard ${ownerSeed.name}`;
        rooms.push({ name, kind: "cellier", surfaceOnPlan: null, polygon: poly.map(norm) });
        placards.push({ name, owner: ownerSeed.name });
        // Façade : portes coulissantes sur l'essentiel de la largeur
        const inset = (pz.line.b - pz.line.a) * 0.1;
        const l = { ...pz.line, a: pz.line.a + inset, b: pz.line.b - inset };
        placardFronts.push({ kind: "door", ...(l.horizontal
            ? { x1: (l.a * 1000) / W, y1: (l.line * 1000) / H, x2: ((l.b + 1) * 1000) / W, y2: (l.line * 1000) / H }
            : { x1: (l.line * 1000) / W, y1: (l.a * 1000) / H, x2: (l.line * 1000) / W, y2: ((l.b + 1) * 1000) / H }) });
    }
    if (rooms.length < 2) return null;

    // Ouvertures : traits bleus (fenêtres) et interruptions refermées entre deux zones différentes (portes, passages)
    const openings: ModelOpening[] = [];
    const segN = (x1: number, y1: number, x2: number, y2: number) => ({ x1: (x1 * 1000) / W, y1: (y1 * 1000) / H, x2: (x2 * 1000) / W, y2: (y2 * 1000) / H });
    for (const c of blueComps) {
        const w = c.x1 - c.x0, h = c.y1 - c.y0;
        if (Math.max(w, h) < minRun * 2) continue;
        if (w >= h) openings.push({ kind: "window", ...segN(c.x0, (c.y0 + c.y1) / 2, c.x1, (c.y0 + c.y1) / 2) });
        else openings.push({ kind: "window", ...segN((c.x0 + c.x1) / 2, c.y0, (c.x0 + c.x1) / 2, c.y1) });
    }
    const groups: { horizontal: boolean; l0: number; l1: number; a: number; b: number }[] = [];
    for (const g of gaps.sort((p, q) => Number(p.horizontal) - Number(q.horizontal) || p.line - q.line)) {
        const last = groups.find(q => q.horizontal === g.horizontal && g.line - q.l1 <= 2 && Math.abs(g.a - q.a) <= 3 && Math.abs(g.b - q.b) <= 3);
        if (last) { last.l1 = g.line; last.a = Math.min(last.a, g.a); last.b = Math.max(last.b, g.b); }
        else groups.push({ horizontal: g.horizontal, l0: g.line, l1: g.line, a: g.a, b: g.b });
    }
    const zoneAt = (x: number, y: number) => {
        const xx = Math.round(x), yy = Math.round(y);
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) return -2;
        const id = reg.id[yy * W + xx];
        return id < 0 ? -3 : reg.info[id].border ? -2 : find(id);
    };
    // Une ouverture par paire de pièces : la plus large (les symboles d'un placard ou d'un
    // châssis dessinés sur une cloison donnent plusieurs petits « vides » alignés)
    const doors = new Map<string, { g: (typeof groups)[number]; mid: number }>();
    for (const g of groups) {
        // (fermeture parfois fine : les deux tronçons ne se font face que sur une ou deux lignes)
        if (g.b - g.a + 1 < minRun * 1.2) continue;
        // Carrés d'une façade de placard : la façade entière est l'ouverture du placard
        if (placardLines.some(pl => pl.horizontal === g.horizontal && Math.abs(pl.line - (g.l0 + g.l1) / 2) <= pl.depth && g.a <= pl.b && g.b >= pl.a)) continue;
        const mid = (g.l0 + g.l1) / 2, c = (g.a + g.b) / 2, off = (g.l1 - g.l0) / 2 + wallThick + 2;
        const [za, zb] = g.horizontal ? [zoneAt(c, mid - off), zoneAt(c, mid + off)] : [zoneAt(mid - off, c), zoneAt(mid + off, c)];
        // Porte seulement entre deux zones distinctes, dont au moins une pièce nommée
        if (za === zb || za === -3 || zb === -3 || (!labeled.has(za) && !labeled.has(zb))) continue;
        const key = `${Math.min(za, zb)}:${Math.max(za, zb)}`;
        const prev = doors.get(key);
        if (!prev || g.b - g.a > prev.g.b - prev.g.a) doors.set(key, { g, mid });
    }
    openings.push(...placardFronts);
    for (const { g, mid } of doors.values()) openings.push({ kind: "door", ...(g.horizontal ? segN(g.a, mid, g.b + 1, mid) : segN(mid, g.a, mid, g.b + 1)) });

    return {
        plan: { rooms, openings, totalSurfaceOnPlan: null, knownDimension: null, confidence: "high", notes: [] },
        found,
        missing,
        placards,
    };
}
