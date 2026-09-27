/* ============================================================
   PLAN 3D — AMÉNAGEMENT AUTOMATIQUE
   Meuble chaque pièce selon sa nature et sa surface. Chaque pièce
   est traitée dans un repère local aligné sur son plus long côté ;
   les meubles sont posés dans le plus grand rectangle utilisable
   (retrait de l'épaisseur des murs), en respectant le débattement
   des portes, les portes-fenêtres, les fenêtres (pas de meuble
   haut devant) et des dégagements de circulation.

   Convention de rotation (radians, autour de l'axe vertical) :
   le meuble a sa largeur `w` le long de son axe local x et sa
   profondeur `d` le long de son axe local y ; sa FACE AVANT (assise
   du canapé, pied du lit, portes de l'armoire) regarde +y local,
   c.-à-d. le bas du plan quand rotation = 0. Un point local
   (lx, ly) du meuble a pour coordonnées dans le plan :
       x = cx + lx·cos(r) − ly·sin(r)
       y = cy + lx·sin(r) + ly·cos(r)
   Fonctions pures et déterministes (seuls les identifiants varient).
   ============================================================ */

import { computeWalls, dist, pointInPolygon, polygonArea, segDist, uid } from "@/lib/plan3d/geometry";
import type { Furniture, FurnitureType, OpeningKind, Plan3D, Pt, Room, RoomKind, Wall } from "@/lib/plan3d/types";

/* ─────────────────────────── CATALOGUE ─────────────────────────── */

/** Dimensions usuelles (m) : w largeur, d profondeur (tête de lit comprise), h hauteur */
export const FURNITURE_CATALOG: Record<FurnitureType, { label: string; w: number; d: number; h: number }> = {
    sofa: { label: "Canapé", w: 2.2, d: 0.95, h: 0.85 },
    armchair: { label: "Fauteuil", w: 0.8, d: 0.8, h: 0.8 },
    coffee_table: { label: "Table basse", w: 1.1, d: 0.6, h: 0.4 },
    tv_unit: { label: "Meuble TV", w: 1.6, d: 0.4, h: 0.5 },
    rug: { label: "Tapis", w: 2.0, d: 1.4, h: 0.01 },
    dining_table: { label: "Table à manger", w: 1.6, d: 0.9, h: 0.75 },
    chair: { label: "Chaise", w: 0.45, d: 0.5, h: 0.85 },
    bed_double: { label: "Lit double", w: 1.6, d: 2.1, h: 0.55 },
    bed_single: { label: "Lit simple", w: 0.9, d: 2.0, h: 0.55 },
    nightstand: { label: "Table de chevet", w: 0.45, d: 0.4, h: 0.5 },
    wardrobe: { label: "Armoire", w: 1.2, d: 0.6, h: 2.2 },
    desk: { label: "Bureau", w: 1.2, d: 0.6, h: 0.75 },
    office_chair: { label: "Chaise de bureau", w: 0.6, d: 0.6, h: 1.0 },
    bookshelf: { label: "Bibliothèque", w: 0.9, d: 0.35, h: 1.9 },
    kitchen_run: { label: "Linéaire de cuisine", w: 2.4, d: 0.62, h: 0.9 },
    kitchen_island: { label: "Îlot central", w: 1.8, d: 0.9, h: 0.9 },
    fridge: { label: "Réfrigérateur", w: 0.6, d: 0.65, h: 1.85 },
    bathtub: { label: "Baignoire", w: 1.7, d: 0.75, h: 0.55 },
    shower: { label: "Douche", w: 0.9, d: 0.9, h: 2.0 },
    vanity: { label: "Meuble vasque", w: 0.8, d: 0.5, h: 0.85 },
    toilet: { label: "WC", w: 0.38, d: 0.65, h: 0.8 },
    washer: { label: "Lave-linge", w: 0.6, d: 0.6, h: 0.85 },
    plant: { label: "Plante", w: 0.45, d: 0.45, h: 1.2 },
    floor_lamp: { label: "Lampadaire", w: 0.35, d: 0.35, h: 1.6 },
    outdoor_table: { label: "Table d'extérieur", w: 0.8, d: 0.8, h: 0.74 },
    lounger: { label: "Bain de soleil", w: 0.7, d: 1.9, h: 0.4 },
    console: { label: "Console", w: 1.0, d: 0.35, h: 0.8 },
    sideboard: { label: "Buffet", w: 1.8, d: 0.45, h: 0.8 },
};

export const furnitureLabel = (type: FurnitureType) => FURNITURE_CATALOG[type]?.label ?? "Meuble";

/** Dégagements (m) à garder libres : devant, derrière, de chaque côté */
const CLEARANCE: Record<FurnitureType, [number, number, number]> = {
    sofa: [0.6, 0.6, 0.1], armchair: [0.4, 0, 0], coffee_table: [0, 0, 0], tv_unit: [0.8, 0, 0], rug: [0, 0, 0],
    dining_table: [0, 0, 0], chair: [0, 0.3, 0], bed_double: [0.6, 0, 0.45], bed_single: [0.6, 0, 0],
    nightstand: [0, 0, 0], wardrobe: [0.6, 0, 0], desk: [0.7, 0, 0], office_chair: [0, 0, 0], bookshelf: [0.6, 0, 0],
    kitchen_run: [0.9, 0, 0], kitchen_island: [0.9, 0.9, 0.5], fridge: [0.8, 0, 0], bathtub: [0.6, 0, 0],
    shower: [0.6, 0, 0], vanity: [0.6, 0, 0], toilet: [0.5, 0, 0.1], washer: [0.6, 0, 0], plant: [0, 0, 0],
    floor_lamp: [0, 0, 0], outdoor_table: [0, 0, 0], lounger: [0.3, 0, 0.3], console: [0.5, 0, 0], sideboard: [0.6, 0, 0],
};

/** Meubles qui peuvent reposer sur un tapis */
const RUG_OK = new Set<FurnitureType>([
    "sofa", "armchair", "coffee_table", "dining_table", "chair", "bed_double", "bed_single", "nightstand",
    "floor_lamp", "plant", "desk", "office_chair", "tv_unit", "lounger", "outdoor_table",
]);
/** Éléments hauts tolérés devant une fenêtre (paroi vitrée, végétal, pied fin) */
const TALL_OK = new Set<FurnitureType>(["plant", "shower", "floor_lamp"]);

const DOOR_DEPTH = 0.9;
const WINDOW_DEPTH = 0.6;
const EPS = 1e-6;
const OVERLAP_TOL = 0.005;
const PI = Math.PI;

/* ─────────────────────── REPÈRES ET HELPERS PUBLICS ─────────────────────── */

const normAngle = (a: number) => {
    let r = a % (2 * PI);
    if (r <= -PI) r += 2 * PI;
    if (r > PI) r -= 2 * PI;
    return r;
};
const cleanTrig = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);

/** Point local (lx, ly) du meuble → coordonnées du plan */
export function localToPlan(f: Pick<Furniture, "x" | "y" | "rotation">, lx: number, ly: number): Pt {
    const c = Math.cos(f.rotation), s = Math.sin(f.rotation);
    return { x: f.x + lx * c - ly * s, y: f.y + lx * s + ly * c };
}

/** Coins de l'emprise au sol, dans l'ordre arrière-gauche, arrière-droit, avant-droit, avant-gauche */
export function furnitureCorners(f: Pick<Furniture, "x" | "y" | "rotation" | "w" | "d">): Pt[] {
    const hw = f.w / 2, hd = f.d / 2;
    return [localToPlan(f, -hw, -hd), localToPlan(f, hw, -hd), localToPlan(f, hw, hd), localToPlan(f, -hw, hd)];
}

export const rotateFurniture = (f: Furniture, deltaRad: number): Furniture => ({ ...f, rotation: normAngle(f.rotation + deltaRad) });
export const moveFurniture = (f: Furniture, dx: number, dy: number): Furniture => ({ ...f, x: f.x + dx, y: f.y + dy });

const wallCache = new WeakMap<Room[], Wall[]>();
function wallsOf(plan: Pick<Plan3D, "rooms" | "openings">): Wall[] {
    let walls = wallCache.get(plan.rooms);
    if (!walls) {
        walls = computeWalls({ rooms: plan.rooms, openings: [] });
        wallCache.set(plan.rooms, walls);
    }
    return walls;
}

/**
 * Le meuble tient dans la pièce : coins (et milieux des côtés) à l'intérieur
 * du contour, hors de l'épaisseur des murs, et aucun angle rentrant de la
 * pièce sous le meuble.
 */
export function fitsInRoom(f: Furniture, room: Room, plan: Pick<Plan3D, "rooms" | "openings">): boolean {
    if (room.polygon.length < 3) return false;
    const corners = furnitureCorners(f);
    const samples = corners.flatMap((p, i) => {
        const q = corners[(i + 1) % 4];
        return [p, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }];
    });
    if (!samples.every(p => pointInPolygon(p, room.polygon))) return false;
    const walls = wallsOf(plan);
    for (const p of samples) {
        for (const w of walls) if (segDist(p, w.a, w.b) < w.thickness / 2 - 0.005) return false;
    }
    const c = Math.cos(-f.rotation), s = Math.sin(-f.rotation);
    return !room.polygon.some(v => {
        const dx = v.x - f.x, dy = v.y - f.y;
        const lx = dx * c - dy * s, ly = dx * s + dy * c;
        return Math.abs(lx) < f.w / 2 - 0.005 && Math.abs(ly) < f.d / 2 - 0.005;
    });
}

/* ─────────────────────── MODÈLE INTERNE ─────────────────────── */

type Side = "N" | "E" | "S" | "W";
const SIDES: Side[] = ["N", "E", "S", "W"];
/** Rotation locale d'un meuble adossé à ce côté du rectangle (face avant vers l'intérieur) */
const SIDE_PHI: Record<Side, number> = { N: 0, E: PI / 2, S: PI, W: -PI / 2 };

interface Box { x0: number; y0: number; x1: number; y1: number }
interface Frame { o: Pt; c: number; s: number; theta: number }
interface Dims { w?: number; d?: number; h?: number }

/** Meuble posé dans le repère local de la pièce (rotation locale multiple de π/2) */
interface Item {
    type: FurnitureType;
    group: string;
    cx: number;
    cy: number;
    phi: number;
    w: number;
    d: number;
    h: number;
    box: Box;
    halo: Box;
    front: Box | null;
}

/** Zone à dégager devant une ouverture ; `side` quand elle est sur un côté du rectangle utile */
interface Zone { box: Box; kind: OpeningKind; side: Side | null; from: number; to: number }

interface Ctx {
    plan: Plan3D;
    room: Room;
    frame: Frame;
    poly: Pt[];
    rect: Box;
    zones: Zone[];
    items: Item[];
    area: number;
}

/** Placement candidat : construit à la demande, `key` sert à diversifier l'anticipation */
interface Cand { score: number; key: string; build: () => Item[] }

const toLocal = (fr: Frame, p: Pt): Pt => {
    const dx = p.x - fr.o.x, dy = p.y - fr.o.y;
    return { x: dx * fr.c + dy * fr.s, y: -dx * fr.s + dy * fr.c };
};
const toPlan = (fr: Frame, p: Pt): Pt => ({ x: fr.o.x + p.x * fr.c - p.y * fr.s, y: fr.o.y + p.x * fr.s + p.y * fr.c });

function aabb(points: Pt[]): Box {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const p of points) { b.x0 = Math.min(b.x0, p.x); b.y0 = Math.min(b.y0, p.y); b.x1 = Math.max(b.x1, p.x); b.y1 = Math.max(b.y1, p.y); }
    return b;
}
const inside = (a: Box, r: Box) => a.x0 >= r.x0 - EPS && a.y0 >= r.y0 - EPS && a.x1 <= r.x1 + EPS && a.y1 <= r.y1 + EPS;
const overlap = (a: Box, b: Box) => a.x0 < b.x1 - OVERLAP_TOL && b.x0 < a.x1 - OVERLAP_TOL && a.y0 < b.y1 - OVERLAP_TOL && b.y0 < a.y1 - OVERLAP_TOL;

/** Point local du meuble → repère de la pièce */
function itemPoint(cx: number, cy: number, phi: number, lx: number, ly: number): Pt {
    const c = cleanTrig(Math.cos(phi)), s = cleanTrig(Math.sin(phi));
    return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c };
}
const itemBox = (cx: number, cy: number, phi: number, x0: number, x1: number, y0: number, y1: number) =>
    aabb([itemPoint(cx, cy, phi, x0, y0), itemPoint(cx, cy, phi, x1, y0), itemPoint(cx, cy, phi, x1, y1), itemPoint(cx, cy, phi, x0, y1)]);

function makeItem(type: FurnitureType, cx: number, cy: number, phi: number, group = "", dims: Dims = {}): Item {
    const cat = FURNITURE_CATALOG[type];
    const w = dims.w ?? cat.w, d = dims.d ?? cat.d, h = dims.h ?? cat.h;
    const [f, b, s] = CLEARANCE[type];
    return {
        type, group, cx, cy, phi, w, d, h,
        box: itemBox(cx, cy, phi, -w / 2, w / 2, -d / 2, d / 2),
        halo: itemBox(cx, cy, phi, -w / 2 - s, w / 2 + s, -d / 2 - b, d / 2 + f),
        front: f > 0 ? itemBox(cx, cy, phi, -w / 2, w / 2, d / 2, d / 2 + f) : null,
    };
}

/** Meuble placé relativement à un autre (décalage exprimé dans le repère du meuble de base) */
function relative(base: Item, lx: number, ly: number, type: FurnitureType, dphi: number, group = base.group, dims: Dims = {}): Item {
    const p = itemPoint(base.cx, base.cy, base.phi, lx, ly);
    return makeItem(type, p.x, p.y, base.phi + dphi, group, dims);
}

/* ─────────────────────── CONTRAINTES ─────────────────────── */

const isTall = (it: Item) => it.h > 1.0 && !TALL_OK.has(it.type);

/** Sièges glissés sous leur table (chevauchement voulu) */
const TUCK: [FurnitureType, FurnitureType][] = [["chair", "dining_table"], ["chair", "outdoor_table"], ["office_chair", "desk"]];
const tucked = (a: Item, b: Item) => TUCK.some(([s, t]) => (a.type === s && b.type === t) || (a.type === t && b.type === s));

function conflict(a: Item, b: Item): boolean {
    if (a.type === "rug" || b.type === "rug") {
        if (a.type === "rug" && b.type === "rug") return overlap(a.box, b.box);
        const other = a.type === "rug" ? b : a;
        return !RUG_OK.has(other.type) && overlap(a.box, b.box);
    }
    if (a.group && a.group === b.group) return !tucked(a, b) && overlap(a.box, b.box);
    return overlap(a.box, b.box) || overlap(a.halo, b.box) || overlap(a.box, b.halo);
}

function cornersInRoom(ctx: Ctx, it: Item): boolean {
    const hw = it.w / 2 - 0.001, hd = it.d / 2 - 0.001;
    const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, ly]) => itemPoint(it.cx, it.cy, it.phi, lx, ly));
    if (!corners.every(p => pointInPolygon(p, ctx.poly))) return false;
    const b = it.box;
    return !ctx.poly.some(v => v.x > b.x0 + 0.001 && v.x < b.x1 - 0.001 && v.y > b.y0 + 0.001 && v.y < b.y1 - 0.001);
}

function fits(ctx: Ctx, it: Item, pending: Item[] = []): boolean {
    if (!inside(it.box, ctx.rect)) return false;
    if (it.front && !inside(it.front, ctx.rect)) return false;
    if (!cornersInRoom(ctx, it)) return false;
    if (it.type !== "rug") {
        for (const z of ctx.zones) {
            if (!overlap(it.box, z.box)) continue;
            if (z.kind !== "window" || isTall(it)) return false;
        }
    }
    for (const q of ctx.items) if (conflict(it, q)) return false;
    for (const q of pending) if (q !== it && conflict(it, q)) return false;
    return true;
}

const fitsAll = (ctx: Ctx, items: Item[]) => items.length > 0 && items.every(it => fits(ctx, it, items));

/** Pose le meilleur candidat qui tient ; renvoie `weight` s'il a été posé */
function place(ctx: Ctx, cands: Cand[], weight: number): number {
    const sorted = cands.slice().sort((a, b) => b.score - a.score);
    for (const c of sorted) {
        const items = c.build();
        if (fitsAll(ctx, items)) {
            ctx.items.push(...items);
            return weight;
        }
    }
    return 0;
}

/**
 * Pose l'élément structurant de la pièce (lit, cuisine, coin salon…) en
 * anticipant la suite : les meilleurs candidats (diversifiés par `key`) sont
 * essayés avec le reste du programme, et la combinaison la plus complète est
 * retenue. Renvoie false si aucun candidat ne tient (rien n'est posé).
 */
function anchor(ctx: Ctx, cands: Cand[], rest: (ctx: Ctx) => number, perKey = 2, limit = 16): boolean {
    const sorted = cands.slice().sort((a, b) => b.score - a.score);
    const perKeyCount = new Map<string, number>();
    const shortlist: { c: Cand; items: Item[] }[] = [];
    for (const c of sorted) {
        if (shortlist.length >= limit) break;
        const n = perKeyCount.get(c.key) ?? 0;
        if (n >= perKey) continue;
        const items = c.build();
        if (!fitsAll(ctx, items)) continue;
        perKeyCount.set(c.key, n + 1);
        shortlist.push({ c, items });
    }
    if (!shortlist.length) return false;
    const base = ctx.items.length;
    let best = shortlist[0], bestScore = -Infinity;
    for (const s of shortlist) {
        ctx.items.push(...s.items);
        const total = s.c.score + rest(ctx);
        ctx.items.length = base;
        if (total > bestScore + 1e-9) { bestScore = total; best = s; }
    }
    ctx.items.push(...best.items);
    rest(ctx);
    return true;
}

/* ─────────────────────── CÔTÉS ET CANDIDATS ─────────────────────── */

const sideRange = (r: Box, side: Side): [number, number] => (side === "N" || side === "S" ? [r.x0, r.x1] : [r.y0, r.y1]);
const sideDepth = (r: Box, side: Side) => (side === "N" || side === "S" ? r.y1 - r.y0 : r.x1 - r.x0);
const alongOf = (it: Item, side: Side) => (side === "N" || side === "S" ? it.cx : it.cy);

/** Meuble adossé au côté `side` du rectangle utile, centré en `along` le long de ce côté */
function placeAgainstWall(ctx: Ctx, side: Side, along: number, type: FurnitureType, group = "", dims: Dims = {}): Item {
    const off = (dims.d ?? FURNITURE_CATALOG[type].d) / 2;
    const r = ctx.rect;
    if (side === "N") return makeItem(type, along, r.y0 + off, SIDE_PHI.N, group, dims);
    if (side === "S") return makeItem(type, along, r.y1 - off, SIDE_PHI.S, group, dims);
    if (side === "W") return makeItem(type, r.x0 + off, along, SIDE_PHI.W, group, dims);
    return makeItem(type, r.x1 - off, along, SIDE_PHI.E, group, dims);
}

/** Positions (centres) d'un meuble de largeur w glissé le long d'un segment [lo, hi] */
function slots(lo: number, hi: number, w: number, step = 0.1): number[] {
    if (hi - lo < w - EPS) return [];
    const a0 = lo + w / 2, a1 = hi - w / 2;
    const out: number[] = [];
    const n = Math.floor((a1 - a0) / step + EPS);
    for (let i = 0; i <= n; i++) out.push(a0 + i * step);
    if (a1 - out[out.length - 1] > EPS) out.push(a1);
    return out;
}

const hasOpening = (ctx: Ctx, side: Side, kinds: OpeningKind[]) => ctx.zones.some(z => z.side === side && kinds.includes(z.kind));
const hasWindow = (ctx: Ctx, side: Side) => hasOpening(ctx, side, ["window", "french"]);
const windowAlong = (ctx: Ctx, side: Side, a0: number, a1: number) =>
    ctx.zones.some(z => z.side === side && z.kind !== "door" && z.from < a1 && z.to > a0);

function touchesCorner(ctx: Ctx, side: Side, along: number, w: number): boolean {
    const [lo, hi] = sideRange(ctx.rect, side);
    return Math.abs(along - w / 2 - lo) < 0.02 || Math.abs(along + w / 2 - hi) < 0.02;
}

const doorCenters = (ctx: Ctx) => ctx.zones.filter(z => z.kind !== "window").map(z => ({ x: (z.box.x0 + z.box.x1) / 2, y: (z.box.y0 + z.box.y1) / 2 }));
const nearestDoor = (ctx: Ctx, p: Pt) => doorCenters(ctx).reduce((m, c) => Math.min(m, dist(p, c)), 5);

/** Candidats le long de tous les murs ; `score(item, side, along)` */
function wallCands(
    ctx: Ctx, type: FurnitureType, score: (it: Item, side: Side, along: number) => number,
    opts: { group?: string; dims?: Dims; step?: number; sides?: Side[]; extra?: (it: Item) => Item[] } = {},
): Cand[] {
    const w = opts.dims?.w ?? FURNITURE_CATALOG[type].w;
    const out: Cand[] = [];
    for (const side of opts.sides ?? SIDES) {
        const [lo, hi] = sideRange(ctx.rect, side);
        for (const a of slots(lo, hi, w, opts.step)) {
            const it = placeAgainstWall(ctx, side, a, type, opts.group, opts.dims);
            out.push({ key: side, score: score(it, side, a), build: () => [it, ...(opts.extra ? opts.extra(it) : [])] });
        }
    }
    return out;
}

/** Candidats dans les angles du rectangle utile */
function cornerCands(ctx: Ctx, type: FurnitureType): Cand[] {
    const { w, d } = FURNITURE_CATALOG[type];
    const r = ctx.rect;
    const pts: Pt[] = [
        { x: r.x0 + w / 2, y: r.y0 + d / 2 }, { x: r.x1 - w / 2, y: r.y0 + d / 2 },
        { x: r.x1 - w / 2, y: r.y1 - d / 2 }, { x: r.x0 + w / 2, y: r.y1 - d / 2 },
    ];
    const windows = ctx.zones.filter(z => z.kind !== "door").map(z => ({ x: (z.box.x0 + z.box.x1) / 2, y: (z.box.y0 + z.box.y1) / 2 }));
    return pts.map((p, i) => ({
        key: `c${i}`,
        score: windows.some(c => dist(c, p) < 1.6) ? 1 : 0,
        build: () => [makeItem(type, p.x, p.y, 0)],
    }));
}

type Layout = "sides2" | "ends2" | "4" | "6";

/** Table et chaises (légèrement glissées sous le plateau), face avant des chaises vers la table */
function tableSet(cx: number, cy: number, phi: number, table: FurnitureType, layout: Layout, group: string, dims: Dims = {}): Item[] {
    const t = makeItem(table, cx, cy, phi, group, dims);
    const cd = FURNITURE_CATALOG.chair.d, tuck = 0.1;
    const yOff = t.d / 2 + cd / 2 - tuck, xOff = t.w / 2 + cd / 2 - tuck;
    const seats: [number, number, number][] = [];
    if (layout === "sides2") seats.push([0, yOff, PI], [0, -yOff, 0]);
    if (layout === "ends2") seats.push([xOff, 0, PI / 2], [-xOff, 0, -PI / 2]);
    if (layout === "4" || layout === "6") {
        for (const lx of [-t.w / 4, t.w / 4]) seats.push([lx, yOff, PI], [lx, -yOff, 0]);
    }
    if (layout === "6") seats.push([xOff, 0, PI / 2], [-xOff, 0, -PI / 2]);
    return [t, ...seats.map(([lx, ly, dp]) => relative(t, lx, ly, "chair", dp, group))];
}

/** Candidats de coin repas sur une grille couvrant le rectangle utile */
function tableCands(
    ctx: Ctx, table: FurnitureType, layouts: Layout[], dims: Dims, group: string,
    score: (p: Pt, phi: number) => number, step = 0.1,
): Cand[] {
    const cat = FURNITURE_CATALOG[table];
    const tw = dims.w ?? cat.w, td = dims.d ?? cat.d;
    const reach = FURNITURE_CATALOG.chair.d - 0.1;
    const out: Cand[] = [];
    const r = ctx.rect;
    for (const layout of layouts) {
        const hx = tw / 2 + (layout === "ends2" || layout === "6" ? reach : 0);
        const hy = td / 2 + (layout === "ends2" ? 0 : reach);
        for (const phi of [0, PI / 2]) {
            const ex = phi === 0 ? hx : hy, ey = phi === 0 ? hy : hx;
            for (const cx of slots(r.x0, r.x1, 2 * ex, step)) {
                for (const cy of slots(r.y0, r.y1, 2 * ey, step)) {
                    const p = { x: cx, y: cy };
                    out.push({ key: `${layout}${phi}`, score: score(p, phi), build: () => tableSet(cx, cy, phi, table, layout, group, dims) });
                }
            }
        }
    }
    return out;
}

/* ─────────────────────── CONTEXTE D'UNE PIÈCE ─────────────────────── */

/** Repère local aligné sur le plus long côté de la pièce */
function roomFrame(room: Room): Frame {
    let best = 0, len = -1;
    for (let i = 0; i < room.polygon.length; i++) {
        const l = dist(room.polygon[i], room.polygon[(i + 1) % room.polygon.length]);
        if (l > len + 1e-9) { len = l; best = i; }
    }
    const a = room.polygon[best], b = room.polygon[(best + 1) % room.polygon.length];
    const theta = Math.atan2(b.y - a.y, b.x - a.x);
    return { o: a, c: Math.cos(theta), s: Math.sin(theta), theta };
}

/** Plus grand rectangle aligné sur le repère local, contenu dans le polygone */
function largestRect(poly: Pt[]): Box | null {
    const bb = aabb(poly);
    const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
    if (bw < 0.2 || bh < 0.2) return null;
    if (Math.abs(polygonArea(poly) - bw * bh) <= 0.01 * bw * bh) return bb;
    const res = Math.min(0.2, Math.max(0.05, Math.max(bw, bh) / 80));
    const nx = Math.ceil(bw / res), ny = Math.ceil(bh / res);
    const cell = (i: number, j: number) => {
        const x0 = bb.x0 + i * res, y0 = bb.y0 + j * res;
        return [[x0, y0], [x0 + res, y0], [x0 + res, y0 + res], [x0, y0 + res], [x0 + res / 2, y0 + res / 2]]
            .every(([x, y]) => pointInPolygon({ x, y }, poly));
    };
    const heights = new Array<number>(nx).fill(0);
    let best: { area: number; i0: number; i1: number; j0: number; j1: number } | null = null;
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) heights[i] = cell(i, j) ? heights[i] + 1 : 0;
        const stack: number[] = [];
        for (let i = 0; i <= nx; i++) {
            const h = i < nx ? heights[i] : 0;
            while (stack.length && heights[stack[stack.length - 1]] >= h) {
                const top = stack.pop() as number;
                const height = heights[top];
                const left = stack.length ? stack[stack.length - 1] + 1 : 0;
                const area = height * (i - left);
                if (height > 0 && (!best || area > best.area)) best = { area, i0: left, i1: i, j0: j - height + 1, j1: j + 1 };
            }
            stack.push(i);
        }
    }
    if (!best) return null;
    return { x0: bb.x0 + best.i0 * res, x1: bb.x0 + best.i1 * res, y0: bb.y0 + best.j0 * res, y1: bb.y0 + best.j1 * res };
}

/**
 * Retrait de chaque côté du rectangle : face intérieure du mur parallèle le
 * plus proche (les murs fusionnés peuvent être décalés de quelques cm par
 * rapport au contour de la pièce).
 */
function insetRect(fr: Frame, raw: Box, walls: Wall[]): Box {
    const sides: Record<Side, { p: Pt; inward: Pt }> = {
        N: { p: { x: (raw.x0 + raw.x1) / 2, y: raw.y0 }, inward: { x: 0, y: 1 } },
        S: { p: { x: (raw.x0 + raw.x1) / 2, y: raw.y1 }, inward: { x: 0, y: -1 } },
        W: { p: { x: raw.x0, y: (raw.y0 + raw.y1) / 2 }, inward: { x: 1, y: 0 } },
        E: { p: { x: raw.x1, y: (raw.y0 + raw.y1) / 2 }, inward: { x: -1, y: 0 } },
    };
    const inset = (side: Side) => {
        const { p, inward } = sides[side];
        const pp = toPlan(fr, p);
        let v = 0.02;
        for (const w of walls) {
            const a = toLocal(fr, w.a), b = toLocal(fr, w.b);
            const len = dist(a, b);
            if (len < EPS) continue;
            // Mur parallèle au côté (produit vectoriel avec la normale ≈ ±1)
            if (Math.abs(((b.x - a.x) * inward.x + (b.y - a.y) * inward.y) / len) > 0.1) continue;
            if (segDist(pp, w.a, w.b) >= 0.3) continue;
            const signed = (a.x - p.x) * inward.x + (a.y - p.y) * inward.y;
            v = Math.max(v, signed + w.thickness / 2 + 0.02);
        }
        return v;
    };
    return { x0: raw.x0 + inset("W"), x1: raw.x1 - inset("E"), y0: raw.y0 + inset("N"), y1: raw.y1 - inset("S") };
}

/** Zones à dégager devant les portes, portes-fenêtres et fenêtres qui bordent la pièce */
function openingZones(room: Room, fr: Frame, rect: Box, walls: Wall[]): Zone[] {
    const zones: Zone[] = [];
    const n = room.polygon.length;
    for (const w of walls) {
        const len = dist(w.a, w.b);
        if (len < EPS) continue;
        const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len;
        for (const o of w.openings) {
            const p1 = { x: w.a.x + ux * o.from, y: w.a.y + uy * o.from }, p2 = { x: w.a.x + ux * o.to, y: w.a.y + uy * o.to };
            const m = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            let near = false;
            for (let i = 0; i < n && !near; i++) near = segDist(m, room.polygon[i], room.polygon[(i + 1) % n]) < 0.2;
            if (!near) continue;
            const normal = [{ x: -uy, y: ux }, { x: uy, y: -ux }].find(q => pointInPolygon({ x: m.x + q.x * 0.3, y: m.y + q.y * 0.3 }, room.polygon));
            if (!normal) continue;
            // Débattement : un vantail de porte balaie au plus sa largeur
            const depth = o.kind === "window" ? WINDOW_DEPTH : o.kind === "door" ? Math.min(DOOR_DEPTH, o.to - o.from + 0.05) : DOOR_DEPTH;
            const pts = [p1, p2, { x: p1.x + normal.x * depth, y: p1.y + normal.y * depth }, { x: p2.x + normal.x * depth, y: p2.y + normal.y * depth }];
            const b = aabb(pts.map(p => toLocal(fr, p)));
            const box = { x0: b.x0 - 0.01, y0: b.y0 - 0.01, x1: b.x1 + 0.01, y1: b.y1 + 0.01 };
            const lm = toLocal(fr, m), l1 = toLocal(fr, p1), l2 = toLocal(fr, p2);
            const nl = { x: normal.x * fr.c + normal.y * fr.s, y: -normal.x * fr.s + normal.y * fr.c };
            let side: Side | null = null;
            if (nl.y > 0.9 && Math.abs(lm.y - rect.y0) < 0.45) side = "N";
            else if (nl.y < -0.9 && Math.abs(lm.y - rect.y1) < 0.45) side = "S";
            else if (nl.x > 0.9 && Math.abs(lm.x - rect.x0) < 0.45) side = "W";
            else if (nl.x < -0.9 && Math.abs(lm.x - rect.x1) < 0.45) side = "E";
            const horizontal = side === "N" || side === "S";
            const from = horizontal ? Math.min(l1.x, l2.x) : Math.min(l1.y, l2.y);
            const to = horizontal ? Math.max(l1.x, l2.x) : Math.max(l1.y, l2.y);
            zones.push({ box, kind: o.kind, side, from, to });
        }
    }
    return zones;
}

function roomContext(plan: Plan3D, room: Room, walls: Wall[]): Ctx | null {
    const frame = roomFrame(room);
    const poly = room.polygon.map(p => toLocal(frame, p));
    const raw = largestRect(poly);
    if (!raw) return null;
    const rect = insetRect(frame, raw, walls);
    if (rect.x1 - rect.x0 < 0.3 || rect.y1 - rect.y0 < 0.3) return null;
    return { plan, room, frame, poly, rect, zones: openingZones(room, frame, rect, walls), items: [], area: polygonArea(room.polygon) };
}

/* ─────────────────────── PROGRAMMES PAR PIÈCE ─────────────────────── */

const cat = FURNITURE_CATALOG;
const rectW = (ctx: Ctx) => ctx.rect.x1 - ctx.rect.x0;
const rectH = (ctx: Ctx) => ctx.rect.y1 - ctx.rect.y0;
const findItem = (ctx: Ctx, type: FurnitureType) => ctx.items.find(i => i.type === type);
const hasSeparateDining = (ctx: Ctx) => ctx.plan.rooms.some(r => r.id !== ctx.room.id && /manger|repas/i.test(r.name));
const hasSeparateWc = (ctx: Ctx) => ctx.plan.rooms.some(r => r.kind === "wc");
const cornerBonus = (ctx: Ctx, side: Side, along: number, w: number, bonus = 1) => (touchesCorner(ctx, side, along, w) ? bonus : 0);

/** Centre (repère de la pièce) d'une autre pièce du plan, pour rapprocher le coin repas de la cuisine */
function roomCenterLocal(ctx: Ctx, kind: RoomKind): Pt | null {
    const other = ctx.plan.rooms.find(r => r.kind === kind && r.id !== ctx.room.id);
    if (!other || !other.polygon.length) return null;
    const b = aabb(other.polygon);
    return toLocal(ctx.frame, { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
}

const plantCorner = (ctx: Ctx) => place(ctx, cornerCands(ctx, "plant"), 1);

/** Table + chaises : 6 places si possible, sinon 4 */
function placeDining(ctx: Ctx, scoreAt: (p: Pt) => number, allowSix: boolean): number {
    if (allowSix) {
        const six = place(ctx, tableCands(ctx, "dining_table", ["6"], { w: 1.8 }, "dining", p => scoreAt(p)), 12);
        if (six) return six;
    }
    return place(ctx, tableCands(ctx, "dining_table", ["4"], {}, "dining", p => scoreAt(p)), 10);
}

function furnishLiving(ctx: Ctx) {
    const withDining = ctx.area >= 18 && !hasSeparateDining(ctx);
    const cands: Cand[] = [];
    for (const side of SIDES) {
        const [lo, hi] = sideRange(ctx.rect, side);
        const depth = sideDepth(ctx.rect, side);
        const penalty = (hasOpening(ctx, side, ["french"]) ? 2 : 0) + (hasOpening(ctx, side, ["window"]) ? 1 : 0);
        for (const sofaW of [2.2, 1.9]) {
            const left = depth - cat.tv_unit.d - cat.sofa.d;
            if (left < 1.6) continue;
            // Recul : canapé adossé au mur d'en face, ou flottant avec un passage derrière
            const views = [...(left <= 3.6 ? [left] : []), ...[2.6, 2.2, 1.8].filter(v => left - v >= 0.7)];
            for (const view of views) {
                const backToWall = view === left;
                for (const a of slots(lo, hi, sofaW)) {
                    const third = Math.min(2, Math.floor(((a - lo) / Math.max(EPS, hi - lo)) * 3));
                    cands.push({
                        key: `${side}${third}`,
                        score: (sofaW > 2 ? 1 : 0) + (backToWall ? 1 : 0) - Math.abs(view - 2.6) * 0.5 - penalty,
                        build: () => {
                            const tv = placeAgainstWall(ctx, side, a, "tv_unit", "living");
                            const sofa = relative(tv, 0, tv.d / 2 + view + cat.sofa.d / 2, "sofa", PI, "living", { w: sofaW });
                            const table = relative(sofa, 0, sofa.d / 2 + 0.4 + cat.coffee_table.d / 2, "coffee_table", 0);
                            return [tv, sofa, table];
                        },
                    });
                }
            }
        }
    }
    // Pièce trop étroite pour un meuble TV en vis-à-vis : canapé seul contre un mur
    for (const side of SIDES) {
        const [lo, hi] = sideRange(ctx.rect, side);
        for (const a of slots(lo, hi, 1.9)) {
            cands.push({
                key: `solo${side}`,
                score: -4,
                build: () => {
                    const sofa = placeAgainstWall(ctx, side, a, "sofa", "living", { w: 1.9 });
                    return [sofa, relative(sofa, 0, sofa.d / 2 + 0.4 + cat.coffee_table.d / 2, "coffee_table", 0)];
                },
            });
        }
    }
    const rest = (c: Ctx) => livingRest(c, withDining);
    if (!anchor(ctx, cands, rest, 2, 16)) rest(ctx);
}

function livingRest(ctx: Ctx, withDining: boolean): number {
    let s = 0;
    const sofa = findItem(ctx, "sofa");
    if (withDining) {
        const kitchen = roomCenterLocal(ctx, "cuisine");
        s += placeDining(ctx, p => (sofa ? Math.min(5, dist(p, { x: sofa.cx, y: sofa.cy })) : 0) - (kitchen ? 0.3 * dist(p, kitchen) : 0), ctx.area >= 26);
    }
    if (sofa) {
        const front = sofa.d / 2 + 0.4 + cat.coffee_table.d / 2;
        s += place(ctx, [{ key: "rug", score: 0, build: () => [relative(sofa, 0, front - 0.1, "rug", 0)] }], 1);
        if (ctx.area >= 20) {
            const off = cat.coffee_table.w / 2 + 0.35 + cat.armchair.d / 2;
            s += place(ctx, [
                { key: "r", score: 1, build: () => [relative(sofa, off, front, "armchair", PI / 2)] },
                { key: "l", score: 0, build: () => [relative(sofa, -off, front, "armchair", -PI / 2)] },
            ], 3);
        }
        const lampX = sofa.w / 2 + cat.floor_lamp.w / 2 + 0.05, lampY = -sofa.d / 2 + cat.floor_lamp.d / 2;
        s += place(ctx, [
            { key: "l", score: 1, build: () => [relative(sofa, -lampX, lampY, "floor_lamp", 0)] },
            { key: "r", score: 0, build: () => [relative(sofa, lampX, lampY, "floor_lamp", 0)] },
        ], 1);
    }
    if (ctx.area >= 28) {
        const table = findItem(ctx, "dining_table");
        s += place(ctx, wallCands(ctx, "sideboard", it => (table ? -0.3 * dist({ x: it.cx, y: it.cy }, { x: table.cx, y: table.cy }) : 0)), 2);
    }
    s += plantCorner(ctx);
    return s;
}

function furnishKitchen(ctx: Ctx) {
    const cands: Cand[] = [];
    for (const side of SIDES) {
        const [lo, hi] = sideRange(ctx.rect, side);
        const maxL = Math.min(4.2, hi - lo);
        const noWindow = hasWindow(ctx, side) ? 0 : 4;
        for (let k = Math.floor(maxL * 10 + EPS); k >= 12; k--) {
            const L = k / 10;
            for (const a of slots(lo, hi, L)) {
                cands.push({
                    key: `${side}${Math.round(L * 2)}`,
                    score: L * 1.5 + noWindow + cornerBonus(ctx, side, a, L) - (L < 1.8 ? 5 : 0),
                    build: () => [placeAgainstWall(ctx, side, a, "kitchen_run", "kitchen", { w: L })],
                });
            }
        }
    }
    if (!anchor(ctx, cands, kitchenRest, 1, 20)) kitchenRest(ctx);
}

function kitchenRest(ctx: Ctx): number {
    let s = 0;
    const run = findItem(ctx, "kitchen_run");
    if (run) {
        const side = (Object.keys(SIDE_PHI) as Side[]).find(k => Math.abs(normAngle(SIDE_PHI[k] - run.phi)) < 1e-6) ?? "N";
        const a = alongOf(run, side);
        const ends = [a - run.w / 2, a + run.w / 2];
        const adjacent: Cand[] = [-1, 1].map(sgn => ({
            key: `adj${sgn}`,
            score: 10 + (sgn < 0 ? 0.1 : 0),
            build: () => [placeAgainstWall(ctx, side, a + sgn * (run.w / 2 + cat.fridge.w / 2), "fridge")],
        }));
        const nearRun = (it: Item) => 5 - Math.min(...ends.map(e => dist({ x: it.cx, y: it.cy }, side === "N" || side === "S" ? { x: e, y: run.cy } : { x: run.cx, y: e })));
        s += place(ctx, [...adjacent, ...wallCands(ctx, "fridge", nearRun)], 8);
    } else {
        s += place(ctx, wallCands(ctx, "fridge", () => 0), 8);
    }
    const width = Math.min(rectW(ctx), rectH(ctx));
    let island = 0;
    if (run && ctx.area >= 12 && width >= 3.2) {
        const ly = run.d / 2 + 1.0 + cat.kitchen_island.d / 2;
        island = place(ctx, [0, -0.3, 0.3, -0.6, 0.6].map((dx, i) => ({
            key: `i${i}`, score: -Math.abs(dx),
            build: () => [relative(run, dx, ly, "kitchen_island", 0, "island")],
        })), 5);
        s += island;
    }
    if (!island && ctx.area >= 9) {
        const from = run ? { x: run.cx, y: run.cy } : null;
        s += place(ctx, tableCands(ctx, "dining_table", ["sides2", "ends2"], { w: 0.9, d: 0.7 }, "dining", p => (from ? Math.min(3, dist(p, from)) : 0)), 4);
    }
    return s;
}

/** Lits proposés selon la surface : 160, puis 140, puis 90 */
const BED_OPTIONS: { type: FurnitureType; dims: Dims; score: number; minArea: number }[] = [
    { type: "bed_double", dims: {}, score: 7, minArea: 9 },
    { type: "bed_double", dims: { w: 1.4, d: 2.05 }, score: 6, minArea: 9 },
    { type: "bed_single", dims: {}, score: 0, minArea: 0 },
];

function furnishBedroom(ctx: Ctx) {
    const cands = BED_OPTIONS.filter(o => ctx.area >= o.minArea).flatMap(o => {
        const w = o.dims.w ?? cat[o.type].w;
        return wallCands(ctx, o.type, (it, side, a) => {
            const [lo, hi] = sideRange(ctx.rect, side);
            return o.score + (hasWindow(ctx, side) ? 0 : 4) - 0.3 * Math.abs(a - (lo + hi) / 2) - (windowAlong(ctx, side, a - w / 2, a + w / 2) ? 1 : 0);
        }, { group: "bed", dims: o.dims }).map(c => ({ ...c, key: `${c.key}${o.type}${w}` }));
    });
    if (!anchor(ctx, cands, bedroomRest, 2, 20)) bedroomRest(ctx);
}

function bedroomRest(ctx: Ctx): number {
    let s = 0;
    const bed = findItem(ctx, "bed_double") ?? findItem(ctx, "bed_single");
    if (bed) {
        const ns = cat.nightstand;
        const lx = bed.w / 2 + ns.w / 2 + 0.03, ly = -bed.d / 2 + ns.d / 2;
        const nsItem = (sgn: number) => relative(bed, sgn * lx, ly, "nightstand", 0);
        if (bed.type === "bed_double") {
            s += place(ctx, [{ key: "l", score: 0, build: () => [nsItem(-1)] }], 2);
            s += place(ctx, [{ key: "r", score: 0, build: () => [nsItem(1)] }], 2);
        } else {
            s += place(ctx, [{ key: "r", score: 1, build: () => [nsItem(1)] }, { key: "l", score: 0, build: () => [nsItem(-1)] }], 2);
        }
    }
    s += place(ctx, wallCands(ctx, "wardrobe", (it, side, a) => (hasWindow(ctx, side) ? 0 : 2) + cornerBonus(ctx, side, a, it.w, 1.5)), 8);
    if (ctx.area >= 12) s += placeDesk(ctx, 5);
    if (bed && ctx.area >= 11) {
        s += place(ctx, [{ key: "rug", score: 0, build: () => [relative(bed, 0, bed.d / 2 - 0.3, "rug", 0)] }], 1);
    }
    return s;
}

/** Bureau (de préférence sous une fenêtre) et sa chaise */
function placeDesk(ctx: Ctx, weight: number): number {
    const w = cat.desk.w;
    const chairY = cat.desk.d / 2 + cat.office_chair.d / 2 - 0.15;
    return place(ctx, wallCands(ctx, "desk",
        (it, side, a) => (windowAlong(ctx, side, a - w / 2, a + w / 2) ? 3 : 0) + cornerBonus(ctx, side, a, w, 0.5),
        { group: "desk", extra: desk => [relative(desk, 0, chairY, "office_chair", PI)] },
    ), weight);
}

function furnishBathroom(ctx: Ctx) {
    const longest = Math.max(rectW(ctx), rectH(ctx));
    const rest = (c: Ctx) => bathRest(c);
    const tubOk = longest >= 1.7 - 0.12 && ctx.area >= 4.5;
    const fixture = (type: FurnitureType, sizes: Dims[]) => sizes.flatMap((dims, i) => wallCands(ctx, type, (it, side, a) => {
        const [lo, hi] = sideRange(ctx.rect, side);
        const alcove = Math.abs(hi - lo - it.w) < 0.15 ? 2 : 0;
        return cornerBonus(ctx, side, a, it.w, 3) + alcove - 2 * i;
    }, { group: "bath", dims }));
    if (tubOk && anchor(ctx, fixture("bathtub", [{}]), rest, 2, 12)) return;
    if (!anchor(ctx, fixture("shower", [{}, { w: 0.8, d: 0.8 }]), rest, 2, 12)) rest(ctx);
}

function bathRest(ctx: Ctx): number {
    const vanity = (dims: Dims, bonus: number) => wallCands(ctx, "vanity", (it, side) => (hasWindow(ctx, side) ? 0 : 1) + bonus, { dims });
    let s = place(ctx, [...vanity({}, 2), ...vanity({ w: 0.6, d: 0.45 }, 0)], 5);
    if (!hasSeparateWc(ctx)) s += place(ctx, wallCands(ctx, "toilet", it => 0.5 * nearestDoor(ctx, { x: it.cx, y: it.cy })), 6);
    if (ctx.area >= 6) s += place(ctx, wallCands(ctx, "washer", (it, side, a) => cornerBonus(ctx, side, a, it.w)), 3);
    return s;
}

function furnishWc(ctx: Ctx) {
    place(ctx, wallCands(ctx, "toilet", (it, side, a) => {
        const [lo, hi] = sideRange(ctx.rect, side);
        return nearestDoor(ctx, { x: it.cx, y: it.cy }) - 0.5 * Math.abs(a - (lo + hi) / 2);
    }), 1);
}

function furnishEntry(ctx: Ctx) {
    place(ctx, wallCands(ctx, "console", it => Math.min(2, nearestDoor(ctx, { x: it.cx, y: it.cy })) * 0.2), 2);
    plantCorner(ctx);
}

function furnishOffice(ctx: Ctx) {
    placeDesk(ctx, 5);
    const desk = findItem(ctx, "desk");
    place(ctx, wallCands(ctx, "bookshelf", it => (desk ? Math.min(3, dist({ x: it.cx, y: it.cy }, { x: desk.cx, y: desk.cy })) * 0.3 : 0)), 3);
    plantCorner(ctx);
}

function furnishDressing(ctx: Ctx) {
    for (let i = 0; i < 8; i++) {
        const cands = wallCands(ctx, "wardrobe", (it, side, a) => {
            const joined = ctx.items.some(q => q.type === "wardrobe" && Math.abs(normAngle(q.phi - it.phi)) < 1e-6 && Math.abs(dist({ x: q.cx, y: q.cy }, { x: it.cx, y: it.cy }) - it.w) < 0.02);
            return (joined ? 2 : 0) + cornerBonus(ctx, side, a, it.w);
        }, { step: 0.05 });
        if (!place(ctx, cands, 1)) break;
    }
}

function furnishLaundry(ctx: Ctx) {
    place(ctx, wallCands(ctx, "washer", (it, side, a) => cornerBonus(ctx, side, a, it.w)), 1);
}

function furnishOutdoor(ctx: Ctx) {
    const b = aabb(ctx.poly);
    const depth = Math.min(b.x1 - b.x0, b.y1 - b.y0);
    if (depth >= 1.2) {
        const c = { x: (ctx.rect.x0 + ctx.rect.x1) / 2, y: (ctx.rect.y0 + ctx.rect.y1) / 2 };
        const set = place(ctx, tableCands(ctx, "outdoor_table", ["sides2", "ends2"], {}, "table", p => -0.2 * dist(p, c)), 4);
        if (!set) plantCorner(ctx);
    } else {
        plantCorner(ctx);
    }
    if (ctx.room.kind === "terrasse" && ctx.area >= 8) {
        place(ctx, wallCands(ctx, "lounger", (it, side) => (hasOpening(ctx, side, ["french"]) ? 0 : 1)), 2);
        plantCorner(ctx);
    }
}

function furnishHall(ctx: Ctx) {
    if (Math.min(rectW(ctx), rectH(ctx)) >= 1.6) plantCorner(ctx);
}

function furnishOther(ctx: Ctx) {
    if (/manger|repas/i.test(ctx.room.name)) {
        const c = { x: (ctx.rect.x0 + ctx.rect.x1) / 2, y: (ctx.rect.y0 + ctx.rect.y1) / 2 };
        placeDining(ctx, p => -0.3 * dist(p, c), ctx.area >= 12);
        place(ctx, wallCands(ctx, "sideboard", () => 0), 1);
    }
    plantCorner(ctx);
}

const PROGRAMS: Record<RoomKind, (ctx: Ctx) => void> = {
    sejour: furnishLiving,
    cuisine: furnishKitchen,
    chambre: furnishBedroom,
    sdb: furnishBathroom,
    wc: furnishWc,
    entree: furnishEntry,
    couloir: furnishHall,
    bureau: furnishOffice,
    dressing: furnishDressing,
    cellier: () => undefined,
    buanderie: furnishLaundry,
    balcon: furnishOutdoor,
    terrasse: furnishOutdoor,
    autre: furnishOther,
};

/* ─────────────────────── AMÉNAGEMENT ─────────────────────── */

const round = (v: number, k: number) => Math.round(v * k) / k;

function toFurniture(ctx: Ctx, it: Item): Furniture {
    const p = toPlan(ctx.frame, { x: it.cx, y: it.cy });
    return {
        id: uid("f"),
        type: it.type,
        roomId: ctx.room.id,
        x: round(p.x, 1000),
        y: round(p.y, 1000),
        rotation: round(normAngle(ctx.frame.theta + it.phi), 1e5),
        w: round(it.w, 1000),
        d: round(it.d, 1000),
        h: round(it.h, 1000),
    };
}

/**
 * Aménagement complet du plan (remplace `plan.furniture`) : programme de
 * meubles par nature et surface de pièce, posé pièce par pièce.
 */
export function autoFurnish(plan: Plan3D): Furniture[] {
    const walls = computeWalls(plan);
    const out: Furniture[] = [];
    for (const room of plan.rooms) {
        if (room.polygon.length < 3 || polygonArea(room.polygon) < 0.5) continue;
        const ctx = roomContext(plan, room, walls);
        if (!ctx) continue;
        PROGRAMS[room.kind](ctx);
        for (const it of ctx.items) out.push(toFurniture(ctx, it));
    }
    return out;
}
