/* ============================================================
   PLAN 3D — RECALAGE DES SURFACES
   Le croquis d'un diagnostiqueur n'est souvent pas à l'échelle ;
   le tableau des surfaces (Carrez / Boutin), lui, fait foi.
   On déplace les cloisons (droites verticales et horizontales
   partagées par les pièces) pour que chaque pièce atteigne sa
   surface, en gardant la disposition du dessin : minimisation
   des écarts relatifs de surface + rappel vers la position
   d'origine, par descente de gradient.
   ============================================================ */

import { polygonArea, round2 } from "@/lib/plan3d/geometry";
import type { Plan3D, Pt } from "@/lib/plan3d/types";

const SNAP = 0.12;       // deux coordonnées à moins de 12 cm = même cloison
const MIN_GAP = 0.45;    // largeur minimale conservée entre deux cloisons (m)

/** Regroupe des valeurs proches ; renvoie les valeurs de référence et l'index de chaque valeur */
function clusters(values: number[]) {
    const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const centers: number[] = [];
    const index = new Array<number>(values.length);
    let group: number[] = [];
    const flush = () => {
        if (!group.length) return;
        centers.push(group.reduce((s, i) => s + values[i], 0) / group.length);
        for (const i of group) index[i] = centers.length - 1;
        group = [];
    };
    for (const [v, i] of order) {
        if (group.length && v - values[group[group.length - 1]] > SNAP) flush();
        group.push(i);
    }
    flush();
    return { centers, index };
}

/**
 * Une même droite peut porter des cloisons sans contact (mur séjour / cuisine et, plus
 * loin, mur dégagement / salle de bain) : chaque tronçon continu devient une droite
 * indépendante, sinon recaler l'une dérègle l'autre.
 */
function splitDisjoint(cl: { centers: number[]; index: number[] }, along: number[], edges: [number, number][]) {
    // Tronçons par droite : intervalles des côtés portés par cette droite (sommets k1, k2)
    const parent = cl.index.map((_, k) => k);
    const find = (k: number): number => (parent[k] === k ? k : (parent[k] = find(parent[k])));
    const spans = cl.centers.map(() => [] as { lo: number; hi: number; a: number; b: number }[]);
    for (const [a, b] of edges) {
        if (cl.index[a] !== cl.index[b]) continue;
        parent[find(a)] = find(b);
        spans[cl.index[a]].push({ lo: Math.min(along[a], along[b]), hi: Math.max(along[a], along[b]), a, b });
    }
    // Tronçons qui se touchent ou se recouvrent : même cloison
    for (const list of spans) {
        list.sort((p, q) => p.lo - q.lo);
        let cur: (typeof list)[number] | null = null, hi = -Infinity;
        for (const sp of list) {
            if (cur && sp.lo <= hi + SNAP) parent[find(sp.a)] = find(cur.a);
            else cur = sp;
            hi = Math.max(hi, sp.hi);
        }
    }
    // Sommets sans côté sur cette droite : rattachés au tronçon le plus proche
    const byLine = cl.centers.map(() => [] as number[]);
    cl.index.forEach((line, k) => byLine[line].push(k));
    for (let line = 0; line < cl.centers.length; line++) {
        const withEdge = byLine[line].filter(k => spans[line].some(sp => sp.a === k || sp.b === k));
        for (const k of byLine[line]) {
            if (withEdge.includes(k) || !withEdge.length) continue;
            const near = withEdge.reduce((m, j) => (Math.abs(along[j] - along[k]) < Math.abs(along[m] - along[k]) ? j : m), withEdge[0]);
            parent[find(k)] = find(near);
        }
    }
    const ids = new Map<number, number>();
    const centers: number[] = [], index = new Array<number>(cl.index.length);
    cl.index.forEach((line, k) => {
        const root = find(k);
        if (!ids.has(root)) { ids.set(root, centers.length); centers.push(cl.centers[line]); }
        index[k] = ids.get(root) as number;
    });
    return { centers, index };
}

export interface FitResult { plan: Plan3D; before: number; after: number; fitted: number }

/**
 * Ajuste le plan pour que les pièces ciblées atteignent leur surface.
 * targets : identifiant de pièce → surface (m²). Renvoie l'écart relatif
 * moyen avant / après (0.05 = 5 %).
 */
export function fitAreas(plan: Plan3D, targets: Map<string, number>): FitResult {
    const rooms = plan.rooms;
    const verts: { r: number; v: number; p: Pt }[] = [];
    rooms.forEach((room, r) => room.polygon.forEach((p, v) => verts.push({ r, v, p })));
    // Côtés des pièces (indices de sommets)
    const edges: [number, number][] = [];
    let base = 0;
    for (const room of rooms) {
        const n = room.polygon.length;
        for (let v = 0; v < n; v++) edges.push([base + v, base + ((v + 1) % n)]);
        base += n;
    }
    const xs = splitDisjoint(clusters(verts.map(o => o.p.x)), verts.map(o => o.p.y), edges);
    const ys = splitDisjoint(clusters(verts.map(o => o.p.y)), verts.map(o => o.p.x), edges);
    const nx = xs.centers.length, ny = ys.centers.length;
    const x0 = xs.centers.slice(), y0 = ys.centers.slice();
    // Sommet → (droite x, droite y)
    const ref = rooms.map(room => room.polygon.map(() => [0, 0] as [number, number]));
    verts.forEach((o, k) => { ref[o.r][o.v] = [xs.index[k], ys.index[k]]; });

    const idx = rooms.map((room, r) => (targets.has(room.id) ? r : -1)).filter(r => r >= 0);
    const areaOf = (X: number[], Y: number[], r: number) => polygonArea(ref[r].map(([i, j]) => ({ x: X[i], y: Y[j] })));
    const span = Math.max(x0[nx - 1] - x0[0], y0[ny - 1] - y0[0], 1);
    const cost = (X: number[], Y: number[]) => {
        let c = 0;
        for (const r of idx) {
            const t = targets.get(rooms[r].id) as number;
            const e = (areaOf(X, Y, r) - t) / t;
            c += e * e;
        }
        let reg = 0;
        for (let i = 0; i < nx; i++) reg += ((X[i] - x0[i]) / span) ** 2;
        for (let j = 0; j < ny; j++) reg += ((Y[j] - y0[j]) / span) ** 2;
        return c + 0.02 * reg;
    };
    const meanErr = (X: number[], Y: number[]) => idx.length
        ? idx.reduce((s, r) => { const t = targets.get(rooms[r].id) as number; return s + Math.abs(areaOf(X, Y, r) - t) / t; }, 0) / idx.length
        : 0;
    const before = meanErr(x0, y0);
    if (idx.length < 2) return { plan, before, after: before, fitted: 0 };

    // Ordre des droites conservé à l'intérieur de chaque pièce, avec une largeur minimale
    const pairsOf = (axis: 0 | 1, V0: number[]) => {
        const pairs: [number, number, number][] = [];
        const seen = new Set<string>();
        for (const r of ref) {
            const lines = [...new Set(r.map(v => v[axis]))].sort((a, b) => V0[a] - V0[b]);
            for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
                const lo = lines[a], hi = lines[b], key = `${lo}:${hi}`;
                if (seen.has(key)) continue;
                seen.add(key);
                pairs.push([lo, hi, Math.min(MIN_GAP, Math.max(0.02, V0[hi] - V0[lo]))]);
            }
        }
        return pairs;
    };
    const px = pairsOf(0, x0), py = pairsOf(1, y0);
    const clamp = (V: number[], pairs: [number, number, number][]) => {
        for (let pass = 0; pass < 6; pass++) {
            let ok = true;
            for (const [lo, hi, gap] of pairs) {
                const miss = V[lo] + gap - V[hi];
                if (miss > 1e-9) { V[lo] -= miss / 2; V[hi] += miss / 2; ok = false; }
            }
            if (ok) break;
        }
    };
    let X = x0.slice(), Y = y0.slice();
    let c = cost(X, Y);
    let step = span * 0.02;
    const h = 1e-4;
    for (let it = 0; it < 1500 && step > 1e-5; it++) {
        const gx = X.map((_, i) => { const P = X.slice(); P[i] += h; return (cost(P, Y) - c) / h; });
        const gy = Y.map((_, j) => { const P = Y.slice(); P[j] += h; return (cost(X, P) - c) / h; });
        const norm = Math.hypot(...gx, ...gy) || 1;
        const NX = X.map((v, i) => v - (step * gx[i]) / norm);
        const NY = Y.map((v, j) => v - (step * gy[j]) / norm);
        clamp(NX, px); clamp(NY, py);
        const nc = cost(NX, NY);
        if (nc < c) { X = NX; Y = NY; c = nc; step *= 1.15; } else step *= 0.5;
    }
    const after = meanErr(X, Y);
    if (after >= before) return { plan, before, after: before, fitted: 0 };

    const minX = Math.min(...X), minY = Math.min(...Y);
    const out: Plan3D = {
        ...plan,
        rooms: rooms.map((room, r) => ({ ...room, polygon: ref[r].map(([i, j]) => ({ x: round2(X[i] - minX), y: round2(Y[j] - minY) })) })),
        // L'image du plan d'origine ne se superpose plus exactement après recalage : retirée
        source: null,
        furniture: [],
    };
    return { plan: out, before, after, fitted: idx.length };
}
