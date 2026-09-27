/* ============================================================
   PLAN 3D — OPÉRATIONS D'ÉDITION (immuables)
   Partagées par l'éditeur 2D et la vue 3D : chaque opération
   renvoie un nouveau plan.
   - Mur : une cloison est portée par plusieurs pièces (côté
     commun) ; la déplacer agrandit une pièce et réduit sa voisine.
   - Surface / dimensions d'une pièce : cloisons recalées au plus
     juste (les autres pièces gardent au mieux leur surface).
   - Ouvertures : glissées le long des murs, d'un mur à l'autre,
     élargies par leurs extrémités.
   ============================================================ */

import { dist, edgePoint, nearestEdge, pointInPolygon, polygonArea, roomArea, roomEdge, uid } from "@/lib/plan3d/geometry";
import type { Opening, OpeningKind, Plan3D, Pt, Room } from "@/lib/plan3d/types";

export const OPENING_WIDTH: Record<OpeningKind, number> = { door: 0.83, window: 1.2, french: 2 };
export const NEW_ROOM = "Nouvelle pièce";
const GRID = 0.05;
/** Deux coordonnées à moins de 3 cm : même cloison */
const EPS = 0.03;
/** Largeur minimale conservée d'une pièce quand on pousse une cloison */
const MIN_ROOM = 0.4;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const r3 = (v: number) => Math.round(v * 1000) / 1000;
export const snapGrid = (v: number) => r3(Math.round(v / GRID) * GRID);

/* ─────────────────────────── PIÈCES ─────────────────────────── */

export const mapRoom = (plan: Plan3D, roomId: string, fn: (r: Room) => Room): Plan3D =>
    ({ ...plan, rooms: plan.rooms.map(r => (r.id === roomId ? fn(r) : r)) });

export const setVertex = (plan: Plan3D, roomId: string, index: number, p: Pt): Plan3D =>
    mapRoom(plan, roomId, r => ({ ...r, polygon: r.polygon.map((q, i) => (i === index ? { x: r3(p.x), y: r3(p.y) } : q)) }));

/** Déplace une pièce et ses meubles */
export function translateRoom(plan: Plan3D, roomId: string, d: Pt): Plan3D {
    return {
        ...mapRoom(plan, roomId, r => ({ ...r, polygon: r.polygon.map(p => ({ x: r3(p.x + d.x), y: r3(p.y + d.y) })) })),
        furniture: plan.furniture.map(f => (f.roomId === roomId ? { ...f, x: f.x + d.x, y: f.y + d.y } : f)),
    };
}

/** Insère un sommet à la fraction s du côté `edge` ; les ouvertures suivent (index et fraction) */
export function insertVertex(plan: Plan3D, roomId: string, edge: number, s: number): Plan3D {
    const room = plan.rooms.find(r => r.id === roomId);
    if (!room) return plan;
    const { a, b } = roomEdge(room, edge);
    const p = { x: r3(a.x + (b.x - a.x) * s), y: r3(a.y + (b.y - a.y) * s) };
    const polygon = [...room.polygon.slice(0, edge + 1), p, ...room.polygon.slice(edge + 1)];
    return {
        ...mapRoom(plan, roomId, r => ({ ...r, polygon })),
        openings: plan.openings.map(o => {
            if (o.roomId !== roomId) return o;
            if (o.edge > edge) return { ...o, edge: o.edge + 1 };
            if (o.edge < edge) return o;
            return o.t < s ? { ...o, t: o.t / s } : { ...o, edge: edge + 1, t: (o.t - s) / (1 - s) };
        }),
    };
}

/** Supprime un sommet (≥ 3 restants) ; les ouvertures des deux côtés fusionnés sont reprojetées */
export function deleteVertex(plan: Plan3D, roomId: string, v: number): Plan3D | null {
    const room = plan.rooms.find(r => r.id === roomId);
    if (!room || room.polygon.length <= 3) return null;
    const n = room.polygon.length;
    const next: Room = { ...room, polygon: room.polygon.filter((_, i) => i !== v) };
    const merged = v === 0 ? n - 2 : v - 1;
    const openings: Opening[] = [];
    for (const o of plan.openings) {
        if (o.roomId !== roomId) { openings.push(o); continue; }
        const onMerged = v === 0 ? o.edge === n - 1 || o.edge === 0 : o.edge === v - 1 || o.edge === v;
        if (onMerged) {
            const c = edgePoint(room, o.edge, o.t);
            const { a, b, length } = roomEdge(next, merged);
            if (length < 0.2) continue;
            const t = clamp(((c.x - a.x) * (b.x - a.x) + (c.y - a.y) * (b.y - a.y)) / (length * length), 0, 1);
            openings.push({ ...o, edge: merged, t });
        } else {
            openings.push({ ...o, edge: v === 0 || o.edge > v ? o.edge - 1 : o.edge });
        }
    }
    return { ...mapRoom(plan, roomId, () => next), openings };
}

/** Supprime une pièce, ses ouvertures et ses meubles */
export const deleteRoom = (plan: Plan3D, roomId: string): Plan3D => ({
    ...plan,
    rooms: plan.rooms.filter(r => r.id !== roomId),
    openings: plan.openings.filter(o => o.roomId !== roomId),
    furniture: plan.furniture.filter(f => f.roomId !== roomId),
});

/** Copie décalée de 50 cm (avec ses ouvertures) */
export function duplicateRoom(plan: Plan3D, roomId: string): { plan: Plan3D; id: string } | null {
    const room = plan.rooms.find(r => r.id === roomId);
    if (!room) return null;
    const id = uid("r");
    const copy: Room = { ...room, id, name: `${room.name} (copie)`, polygon: room.polygon.map(p => ({ x: r3(p.x + 0.5), y: r3(p.y + 0.5) })) };
    const openings = plan.openings.filter(o => o.roomId === roomId).map(o => ({ ...o, id: uid("o"), roomId: id }));
    return { plan: { ...plan, rooms: [...plan.rooms, copy], openings: [...plan.openings, ...openings] }, id };
}

export function addRoom(plan: Plan3D, c: Pt): { plan: Plan3D; id: string } {
    const id = uid("r");
    const x = snapGrid(c.x), y = snapGrid(c.y);
    const room: Room = {
        id, name: NEW_ROOM, kind: "autre",
        polygon: [{ x: r3(x - 1.5), y: r3(y - 1.5) }, { x: r3(x + 1.5), y: r3(y - 1.5) }, { x: r3(x + 1.5), y: r3(y + 1.5) }, { x: r3(x - 1.5), y: r3(y + 1.5) }],
    };
    return { plan: { ...plan, rooms: [...plan.rooms, room] }, id };
}

/* ─────────────────────────── MURS ─────────────────────────── */

/** Cloison saisie : sommets (de toutes les pièces) qui la portent, direction de déplacement et bornes */
export interface WallGrab {
    roomId: string;
    edge: number;
    /** Normale unitaire, vers l'extérieur de la pièce saisie */
    n: Pt;
    refs: { roomId: string; index: number; p: Pt }[];
    /** Déplacement permis le long de n (m) */
    min: number;
    max: number;
    /** Côté saisi (pour l'affichage) */
    a: Pt;
    b: Pt;
}

function outwardNormal(room: Room, a: Pt, b: Pt): Pt {
    const len = dist(a, b) || 1;
    let n = { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (pointInPolygon({ x: m.x + n.x * 0.05, y: m.y + n.y * 0.05 }, room.polygon)) n = { x: -n.x, y: -n.y };
    return n;
}

/**
 * Saisit la cloison qui porte le côté `edge` de la pièce : pour un côté droit
 * (horizontal / vertical), tous les côtés alignés et jointifs des autres pièces
 * suivent — agrandir une pièce réduit sa voisine. Un côté en biais ne déplace
 * que la pièce saisie.
 */
export function grabWall(plan: Plan3D, roomId: string, edge: number): WallGrab | null {
    const room = plan.rooms.find(r => r.id === roomId);
    if (!room) return null;
    const { a, b, length } = roomEdge(room, edge);
    if (length < 1e-6) return null;
    const n = outwardNormal(room, a, b);
    const vertical = Math.abs(a.x - b.x) < EPS, horizontal = Math.abs(a.y - b.y) < EPS;
    const n0 = room.polygon.length;
    if (!vertical && !horizontal) {
        const refs = [edge, (edge + 1) % n0].map(index => ({ roomId, index, p: room.polygon[index] }));
        return { roomId, edge, n, refs, min: -3, max: 3, a, b };
    }
    // Côtés alignés sur la même droite, de proche en proche à partir du côté saisi
    const along = (p: Pt) => (vertical ? p.y : p.x);
    const coord = vertical ? (a.x + b.x) / 2 : (a.y + b.y) / 2;
    const cands: { roomId: string; i: number; j: number; lo: number; hi: number }[] = [];
    for (const r of plan.rooms) {
        const m = r.polygon.length;
        for (let i = 0; i < m; i++) {
            const p = r.polygon[i], q = r.polygon[(i + 1) % m];
            const on = vertical
                ? Math.abs(p.x - coord) < EPS && Math.abs(q.x - coord) < EPS
                : Math.abs(p.y - coord) < EPS && Math.abs(q.y - coord) < EPS;
            if (on && dist(p, q) > 1e-6) cands.push({ roomId: r.id, i, j: (i + 1) % m, lo: Math.min(along(p), along(q)), hi: Math.max(along(p), along(q)) });
        }
    }
    let lo = Math.min(along(a), along(b)), hi = Math.max(along(a), along(b));
    const taken = new Set<number>();
    for (let grew = true; grew;) {
        grew = false;
        cands.forEach((c, k) => {
            if (taken.has(k) || c.hi < lo - EPS || c.lo > hi + EPS) return;
            taken.add(k);
            lo = Math.min(lo, c.lo); hi = Math.max(hi, c.hi);
            grew = true;
        });
    }
    const refs = new Map<string, { roomId: string; index: number; p: Pt }>();
    for (const k of taken) {
        const c = cands[k];
        const r = plan.rooms.find(x => x.id === c.roomId) as Room;
        for (const index of [c.i, c.j]) refs.set(`${c.roomId}:${index}`, { roomId: c.roomId, index, p: r.polygon[index] });
    }
    // Bornes : la cloison ne doit pas traverser les autres sommets des pièces concernées
    const nd = vertical ? n.x : n.y;
    let min = -Infinity, max = Infinity;
    for (const ref of refs.values()) {
        const r = plan.rooms.find(x => x.id === ref.roomId) as Room;
        for (let i = 0; i < r.polygon.length; i++) {
            if (refs.has(`${r.id}:${i}`)) continue;
            const other = vertical ? r.polygon[i].x : r.polygon[i].y;
            const d = (other - coord) * nd; // position de l'autre sommet le long de n
            if (Math.abs(d) < EPS) continue;
            if (d > 0) max = Math.min(max, d - MIN_ROOM);
            else min = Math.max(min, d + MIN_ROOM);
        }
    }
    return { roomId, edge, n, refs: [...refs.values()], min: Math.min(0, min === -Infinity ? -5 : min), max: Math.max(0, max === Infinity ? 5 : max), a, b };
}

/** Cloison déplacée de d (m) le long de sa normale, depuis le plan saisi */
export function moveWall(plan: Plan3D, grab: WallGrab, d: number): Plan3D {
    const off = clamp(d, grab.min, grab.max);
    const moved = new Map(grab.refs.map(r => [`${r.roomId}:${r.index}`, { x: r3(r.p.x + grab.n.x * off), y: r3(r.p.y + grab.n.y * off) }]));
    return {
        ...plan,
        rooms: plan.rooms.map(r => (grab.refs.some(x => x.roomId === r.id)
            ? { ...r, polygon: r.polygon.map((p, i) => moved.get(`${r.id}:${i}`) ?? p) }
            : r)),
    };
}

/** Position actuelle d'une cloison saisie (pour convertir un pointeur en déplacement) */
export const wallOffset = (grab: WallGrab, p: Pt) => (p.x - grab.a.x) * grab.n.x + (p.y - grab.a.y) * grab.n.y;

/* ─────────────────────────── SURFACE ET DIMENSIONS ─────────────────────────── */

/**
 * Surface souhaitée pour une pièce : on pousse d'abord une cloison partagée avec
 * une voisine (la plus longue, donc le plus petit déplacement) — l'emprise du
 * logement ne change pas ; à défaut, un mur de façade. Recalage fin au besoin.
 */
export function setRoomArea(plan: Plan3D, roomId: string, area: number): Plan3D {
    const room = plan.rooms.find(r => r.id === roomId);
    if (!room || !(area > 0.3)) return plan;
    const areaIn = (p: Plan3D) => roomArea(p.rooms.find(r => r.id === roomId) as Room);
    const grabs = room.polygon
        .map((_, e) => grabWall(plan, roomId, e))
        .filter((g): g is WallGrab => !!g && dist(g.a, g.b) > 0.3)
        .map(g => ({ g, shared: g.refs.some(r => r.roomId !== roomId), len: dist(g.a, g.b) }))
        .sort((p, q) => Number(q.shared) - Number(p.shared) || q.len - p.len);
    let out = plan;
    for (const { g: g0 } of grabs) {
        const need = area - areaIn(out);
        if (Math.abs(need) < 0.01) break;
        const g = grabWall(out, roomId, g0.edge);
        if (!g) continue;
        // Surface quasi linéaire en d (côté × d) : deux itérations de sécante
        let d = need / Math.max(0.3, dist(g.a, g.b));
        for (let k = 0; k < 3; k++) {
            const trial = moveWall(out, g, d);
            const got = areaIn(trial) - areaIn(out);
            const slope = Math.abs(d) > 1e-6 ? got / d : dist(g.a, g.b);
            if (Math.abs(slope) < 1e-6) break;
            d = clamp(need / slope, g.min, g.max);
        }
        out = moveWall(out, g, d);
    }
    return out;
}

/** Pièce rectangulaire : largeur (x) et profondeur (y) ; on pousse le côté droit / bas, sinon l'opposé */
export function setRoomSize(plan: Plan3D, roomId: string, axis: "x" | "y", size: number): Plan3D {
    const room = plan.rooms.find(r => r.id === roomId);
    if (!room || !(size > MIN_ROOM)) return plan;
    const xs = room.polygon.map(p => p.x), ys = room.polygon.map(p => p.y);
    const cur = axis === "x" ? Math.max(...xs) - Math.min(...xs) : Math.max(...ys) - Math.min(...ys);
    const delta = size - cur;
    if (Math.abs(delta) < 0.005) return plan;
    // Côtés extrêmes dans l'axe voulu
    const hi = axis === "x" ? Math.max(...xs) : Math.max(...ys), lo = axis === "x" ? Math.min(...xs) : Math.min(...ys);
    const edgeAt = (v: number) => room.polygon.findIndex((p, i) => {
        const q = room.polygon[(i + 1) % room.polygon.length];
        return axis === "x" ? Math.abs(p.x - v) < EPS && Math.abs(q.x - v) < EPS : Math.abs(p.y - v) < EPS && Math.abs(q.y - v) < EPS;
    });
    let rest = delta, out = plan;
    for (const v of [hi, lo]) {
        const e = edgeAt(v);
        if (e < 0 || Math.abs(rest) < 0.005) continue;
        const g = grabWall(out, roomId, e);
        if (!g) continue;
        const step = clamp(rest, g.min, g.max);
        out = moveWall(out, g, step);
        rest -= step;
    }
    return out;
}

/* ─────────────────────────── OUVERTURES ─────────────────────────── */

/** Pose une ouverture centrée au plus près de t, sans déborder du côté */
export function addOpening(plan: Plan3D, room: Room, edge: number, t: number, kind: OpeningKind): { plan: Plan3D; id: string } | null {
    const { length } = roomEdge(room, edge);
    const width = Math.min(OPENING_WIDTH[kind], length - 0.1);
    if (width < 0.4) return null;
    const half = width / 2 / length;
    const id = uid("o");
    const o: Opening = { id, kind, roomId: room.id, edge, t: clamp(t, half, 1 - half), width: r3(width) };
    return { plan: { ...plan, openings: [...plan.openings, o] }, id };
}

/** Ouverture entière sur son côté : largeur bornée, position recentrée si besoin */
function fitOnEdge(o: Opening, room: Room): Opening {
    const { length } = roomEdge(room, o.edge);
    const width = clamp(o.width, 0.4, Math.max(0.4, length - 0.05));
    const half = width / 2 / Math.max(length, 1e-6);
    return { ...o, width: r3(width), t: half >= 0.5 ? 0.5 : clamp(o.t, half, 1 - half) };
}

export const patchOpening = (plan: Plan3D, id: string, patch: Partial<Opening>): Plan3D => ({
    ...plan,
    openings: plan.openings.map(o => {
        if (o.id !== id) return o;
        const next = { ...o, ...patch };
        const room = plan.rooms.find(r => r.id === next.roomId);
        return room ? fitOnEdge(next, room) : next;
    }),
});

/**
 * Ouverture glissée vers p : elle suit le mur le plus proche (celui de sa pièce
 * en priorité), et peut passer sur un autre mur ou une autre pièce.
 */
export function moveOpening(plan: Plan3D, id: string, p: Pt): Plan3D {
    const o = plan.openings.find(x => x.id === id);
    if (!o) return plan;
    let best: { room: Room; edge: number; t: number; d: number } | null = null;
    for (const r of plan.rooms) {
        for (let e = 0; e < r.polygon.length; e++) {
            const { a, b, length } = roomEdge(r, e);
            if (length < Math.min(o.width, 0.6) + 0.05) continue;
            const t = clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (length * length), 0, 1);
            const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            // Léger avantage à la pièce de l'ouverture (même mur vu des deux côtés)
            const d = dist(p, q) - (r.id === o.roomId ? 0.08 : 0);
            if (!best || d < best.d) best = { room: r, edge: e, t, d };
        }
    }
    if (!best) return plan;
    const next = fitOnEdge({ ...o, roomId: best.room.id, edge: best.edge, t: best.t }, best.room);
    return { ...plan, openings: plan.openings.map(x => (x.id === id ? next : x)) };
}

/** Extrémité d'une ouverture tirée vers p : l'autre extrémité reste en place */
export function resizeOpening(plan: Plan3D, id: string, end: "a" | "b", p: Pt): Plan3D {
    const o = plan.openings.find(x => x.id === id);
    const room = o && plan.rooms.find(r => r.id === o.roomId);
    if (!o || !room) return plan;
    const { a, b, length } = roomEdge(room, o.edge);
    const s = clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (length * length), 0, 1);
    const half = o.width / 2 / length;
    const fixed = end === "a" ? o.t + half : o.t - half;
    let lo = Math.min(s, fixed), hi = Math.max(s, fixed);
    if ((hi - lo) * length < 0.4) {
        if (end === "a") lo = fixed - 0.4 / length; else hi = fixed + 0.4 / length;
    }
    lo = Math.max(0, lo); hi = Math.min(1, hi);
    const next = fitOnEdge({ ...o, t: (lo + hi) / 2, width: (hi - lo) * length }, room);
    return { ...plan, openings: plan.openings.map(x => (x.id === id ? next : x)) };
}

/** Extrémités d'une ouverture (m) */
export function openingEnds(plan: Plan3D, o: Opening): { a: Pt; b: Pt } | null {
    const room = plan.rooms.find(r => r.id === o.roomId);
    if (!room) return null;
    const { length } = roomEdge(room, o.edge);
    const half = o.width / 2 / Math.max(length, 1e-6);
    return { a: edgePoint(room, o.edge, o.t - half), b: edgePoint(room, o.edge, o.t + half) };
}

/** Pièce dont un côté passe au plus près de p (pour poser une ouverture) */
export function nearestWall(plan: Plan3D, p: Pt, tol: number, prefer?: Room | null): { room: Room; edge: number; t: number } | null {
    if (prefer) {
        const ne = nearestEdge(prefer, p);
        if (ne.dist < tol * 1.5) return { room: prefer, edge: ne.edge, t: ne.t };
    }
    let hit: { room: Room; edge: number; t: number; dist: number } | null = null;
    for (const r of plan.rooms) {
        const ne = nearestEdge(r, p);
        if (ne.dist < tol && (!hit || ne.dist < hit.dist)) hit = { room: r, ...ne };
    }
    return hit;
}

/** Plan valide après édition : pièces d'aire non nulle */
export const isSane = (plan: Plan3D) => plan.rooms.every(r => r.polygon.length < 3 || polygonArea(r.polygon) > 0.05);

/**
 * Emplacement de la poignée d'un mur (fraction du côté) : au milieu de la plus
 * longue partie libre, pour ne pas recouvrir une porte ou une fenêtre.
 */
export function wallHandleT(plan: Plan3D, room: Room, edge: number): number {
    const { a, b, length } = roomEdge(room, edge);
    if (length < 1e-6) return 0.5;
    const ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
    const covered: [number, number][] = [];
    for (const o of plan.openings) {
        const ends = openingEnds(plan, o);
        if (!ends) continue;
        // Ouverture sur la même droite que ce côté (de cette pièce ou de la voisine)
        const off = (p: Pt) => Math.abs((p.x - a.x) * uy - (p.y - a.y) * ux);
        if (off(ends.a) > 0.15 || off(ends.b) > 0.15) continue;
        const sa = ((ends.a.x - a.x) * ux + (ends.a.y - a.y) * uy) / length, sb = ((ends.b.x - a.x) * ux + (ends.b.y - a.y) * uy) / length;
        const m = 0.12 / length;
        covered.push([Math.min(sa, sb) - m, Math.max(sa, sb) + m]);
    }
    if (!covered.length) return 0.5;
    covered.sort((p, q) => p[0] - q[0]);
    let best: [number, number] = [0, 0], cursor = 0.04;
    for (const [lo, hi] of [...covered, [0.96, 2] as [number, number]]) {
        if (lo - cursor > best[1] - best[0]) best = [cursor, lo];
        cursor = Math.max(cursor, hi);
    }
    return best[1] > best[0] ? (best[0] + best[1]) / 2 : 0.5;
}
