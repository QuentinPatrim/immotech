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
 * targets : identifiant de pièce → surface (m²). groups : pièce rattachée → pièce
 * cible (placard compté dans la surface de l'entrée). Renvoie l'écart relatif
 * moyen avant / après (0.05 = 5 %).
 */
export function fitAreas(
    plan: Plan3D, targets: Map<string, number>, groups: Map<string, string> = new Map(),
    opts: {
        weights?: Map<string, number>; preserve?: boolean;
        /** Sommets (« idPièce:index ») dont la coordonnée x / y ne doit pas bouger (mur tenu par l'utilisateur) */
        fixed?: { x: Set<string>; y: Set<string> };
        /** Sommets dont les droites résistent davantage (façade : l'emprise du logement bouge en dernier) */
        stiff?: Set<string>;
        maxIter?: number;
        /** Poids du rappel vers la position d'origine (0,02 par défaut) */
        reg?: number;
    } = {},
): FitResult {
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
    // Droites figées : celles qui portent un sommet tenu
    const fixedX = new Set<number>(), fixedY = new Set<number>();
    const stiffX = new Set<number>(), stiffY = new Set<number>();
    verts.forEach((o, k) => {
        const key = `${rooms[o.r].id}:${o.v}`;
        if (opts.fixed?.x.has(key)) fixedX.add(xs.index[k]);
        if (opts.fixed?.y.has(key)) fixedY.add(ys.index[k]);
        if (opts.stiff?.has(key)) { stiffX.add(xs.index[k]); stiffY.add(ys.index[k]); }
    });
    // Sommet → (droite x, droite y)
    const ref = rooms.map(room => room.polygon.map(() => [0, 0] as [number, number]));
    verts.forEach((o, k) => { ref[o.r][o.v] = [xs.index[k], ys.index[k]]; });

    const idx = rooms.map((room, r) => (targets.has(room.id) ? r : -1)).filter(r => r >= 0);
    const members = rooms.map(room => rooms.map((m, k) => (groups.get(m.id) === room.id ? k : -1)).filter(k => k >= 0));
    const own = (X: number[], Y: number[], r: number) => polygonArea(ref[r].map(([i, j]) => ({ x: X[i], y: Y[j] })));
    const areaOf = (X: number[], Y: number[], r: number) => members[r].reduce((a, k) => a + own(X, Y, k), own(X, Y, r));
    const span = Math.max(x0[nx - 1] - x0[0], y0[ny - 1] - y0[0], 1);
    // Écart relatif moyen (pondéré si des poids sont donnés)
    const wOf = (r: number) => opts.weights?.get(rooms[r].id) ?? 1;
    const wSum = idx.reduce((s, r) => s + wOf(r), 0) || 1;
    const meanErr = (X: number[], Y: number[]) => idx.length
        ? idx.reduce((s, r) => { const t = targets.get(rooms[r].id) as number; return s + (wOf(r) * Math.abs(areaOf(X, Y, r) - t)) / t; }, 0) / wSum
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
    const clamp = (V: number[], pairs: [number, number, number][], fixed: Set<number>) => {
        for (let pass = 0; pass < 6; pass++) {
            let ok = true;
            for (const [lo, hi, gap] of pairs) {
                const miss = V[lo] + gap - V[hi];
                if (miss <= 1e-9) continue;
                const fl = fixed.has(lo), fh = fixed.has(hi);
                if (fl && fh) continue;
                if (fl) V[hi] += miss; else if (fh) V[lo] -= miss; else { V[lo] -= miss / 2; V[hi] += miss / 2; }
                ok = false;
            }
            if (ok) break;
        }
    };
    /* Levenberg-Marquardt sur les résidus (écarts relatifs de surface + rappel vers la
       position d'origine) : les cloisons étant couplées (une droite borde plusieurs
       pièces), la résolution conjointe converge là où une descente pas à pas s'enlise. */
    const vars: { axis: 0 | 1; i: number }[] = [];
    for (let i = 0; i < nx; i++) if (!fixedX.has(i)) vars.push({ axis: 0, i });
    for (let j = 0; j < ny; j++) if (!fixedY.has(j)) vars.push({ axis: 1, i: j });
    const regW = (v: { axis: 0 | 1; i: number }) => Math.sqrt((opts.reg ?? 0.02) * ((v.axis === 0 ? stiffX : stiffY).has(v.i) ? 3 : 1)) / span;
    const residuals = (X: number[], Y: number[]) => {
        const r: number[] = [];
        for (const k of idx) {
            const t = targets.get(rooms[k].id) as number;
            r.push(Math.sqrt(opts.weights?.get(rooms[k].id) ?? 1) * (areaOf(X, Y, k) - t) / t);
        }
        for (const v of vars) r.push(regW(v) * ((v.axis === 0 ? X[v.i] - x0[v.i] : Y[v.i] - y0[v.i])));
        // Largeurs minimales : pénalité douce (une projection bloquerait la convergence)
        for (const [lo, hi, gap] of px) r.push(4 * Math.max(0, X[lo] + gap - X[hi]));
        for (const [lo, hi, gap] of py) r.push(4 * Math.max(0, Y[lo] + gap - Y[hi]));
        return r;
    };
    const sq = (r: number[]) => r.reduce((s, v) => s + v * v, 0);
    let X = x0.slice(), Y = y0.slice();
    let res = residuals(X, Y), c = sq(res);
    let mu = 1e-3;
    const h = 1e-5;
    const iters = Math.max(20, Math.min(120, Math.round((opts.maxIter ?? 1500) / 12)));
    for (let it = 0; it < iters && c > 1e-12 && mu < 1e10; it++) {
        const n = vars.length, m = res.length;
        // Jacobien par différences finies
        const J: number[][] = vars.map(v => {
            const PX = X.slice(), PY = Y.slice();
            if (v.axis === 0) PX[v.i] += h; else PY[v.i] += h;
            const r2 = residuals(PX, PY);
            return r2.map((val, q) => (val - res[q]) / h);
        });
        const A = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => {
            let sum = 0;
            for (let q = 0; q < m; q++) sum += J[a][q] * J[b][q];
            return sum;
        }));
        const g = Array.from({ length: n }, (_, a) => { let sum = 0; for (let q = 0; q < m; q++) sum += J[a][q] * res[q]; return sum; });
        let improved = false;
        for (let tries = 0; tries < 8 && !improved; tries++) {
            // (JᵀJ + μ·diag) δ = −Jᵀr, élimination de Gauss avec pivot partiel
            const M = A.map((row, a) => [...row.map((v, b) => (a === b ? v * (1 + mu) + 1e-12 : v)), -g[a]]);
            for (let col = 0; col < n; col++) {
                let piv = col;
                for (let rr = col + 1; rr < n; rr++) if (Math.abs(M[rr][col]) > Math.abs(M[piv][col])) piv = rr;
                [M[col], M[piv]] = [M[piv], M[col]];
                const d = M[col][col] || 1e-12;
                for (let rr = col + 1; rr < n; rr++) {
                    const f = M[rr][col] / d;
                    if (f) for (let k = col; k <= n; k++) M[rr][k] -= f * M[col][k];
                }
            }
            const delta = new Array<number>(n).fill(0);
            for (let rr = n - 1; rr >= 0; rr--) {
                let sum = M[rr][n];
                for (let k = rr + 1; k < n; k++) sum -= M[rr][k] * delta[k];
                delta[rr] = sum / (M[rr][rr] || 1e-12);
            }
            const NX = X.slice(), NY = Y.slice();
            vars.forEach((v, a) => { const dv = Math.max(-1.5, Math.min(1.5, delta[a])); if (v.axis === 0) NX[v.i] += dv; else NY[v.i] += dv; });
            const nr = residuals(NX, NY), nc = sq(nr);
            if (nc < c) { X = NX; Y = NY; res = nr; c = nc; mu = Math.max(1e-7, mu / 3); improved = true; }
            else mu *= 4;
        }
        if (!improved) break;
    }
    // Ordre des droites garanti en sortie
    clamp(X, px, fixedX); clamp(Y, py, fixedY);
    const after = meanErr(X, Y);
    if (after >= before) return { plan, before, after: before, fitted: 0 };

    // Édition à la main (preserve) : plan laissé en place, image et meubles conservés
    const minX = opts.preserve ? 0 : Math.min(...X), minY = opts.preserve ? 0 : Math.min(...Y);
    const out: Plan3D = {
        ...plan,
        rooms: rooms.map((room, r) => ({ ...room, polygon: ref[r].map(([i, j]) => ({ x: round2(X[i] - minX), y: round2(Y[j] - minY) })) })),
        // L'image du plan d'origine ne se superpose plus exactement après recalage : retirée
        source: opts.preserve ? plan.source : null,
        furniture: opts.preserve ? plan.furniture : [],
    };
    return { plan: out, before, after, fitted: idx.length };
}
