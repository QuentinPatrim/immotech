/* ============================================================
   PLAN 3D — GÉOMÉTRIE
   Surfaces, murs (côtés partagés fusionnés), ouvertures, mise à
   l'échelle sur la surface déclarée et plan schématique généré à
   partir des seules surfaces (quand l'agent n'a pas de plan 2D).
   Fonctions pures, sans dépendance à three.js.
   ============================================================ */

import {
    DEFAULT_WALL_HEIGHT, OUTDOOR_KINDS,
    type Opening, type OpeningKind, type Plan3D, type Pt, type Room, type RoomKind, type Wall,
} from "@/lib/plan3d/types";

export const EXTERIOR_WALL = 0.24;
export const INTERIOR_WALL = 0.1;
/** Tolérance d'alignement des côtés (m) : deux côtés à moins de 12 cm sont considérés comme le même mur */
const LINE_TOL = 0.12;
const EPS = 1e-6;

let seq = 0;
/** Identifiant court, stable dans une session */
export const uid = (prefix = "p") => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
export const round2 = (v: number) => Math.round(v * 100) / 100;

/** Aire (m²) d'un polygone simple, formule du lacet */
export function polygonArea(poly: Pt[]): number {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s) / 2;
}

export const roomArea = (r: Room) => polygonArea(r.polygon);
export const isOutdoor = (r: Room | RoomKind) => OUTDOOR_KINDS.includes(typeof r === "string" ? r : r.kind);

/** Surface habitable du plan (pièces intérieures) */
export const indoorArea = (plan: Pick<Plan3D, "rooms">) => plan.rooms.filter(r => !isOutdoor(r)).reduce((s, r) => s + roomArea(r), 0);

/** Centre de gravité d'un polygone (repli sur la moyenne des sommets si aire nulle) */
export function centroid(poly: Pt[]): Pt {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length];
        const f = p.x * q.y - q.x * p.y;
        a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f;
    }
    if (Math.abs(a) < EPS) {
        const n = Math.max(1, poly.length);
        return { x: poly.reduce((s, p) => s + p.x, 0) / n, y: poly.reduce((s, p) => s + p.y, 0) / n };
    }
    return { x: cx / (3 * a), y: cy / (3 * a) };
}

export function bbox(points: Pt[]) {
    if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0, cx: 0, cy: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export const planBBox = (plan: Pick<Plan3D, "rooms">) => bbox(plan.rooms.flatMap(r => r.polygon));

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + EPS) + a.x) inside = !inside;
    }
    return inside;
}

/** Côté `edge` d'une pièce : extrémités et longueur */
export function roomEdge(room: Room, edge: number) {
    const n = room.polygon.length;
    const a = room.polygon[((edge % n) + n) % n], b = room.polygon[(((edge + 1) % n) + n) % n];
    return { a, b, length: dist(a, b) };
}

/** Point à la fraction t (0..1) du côté `edge` */
export function edgePoint(room: Room, edge: number, t: number): Pt {
    const { a, b } = roomEdge(room, edge);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Côté de la pièce le plus proche d'un point : index, fraction t et distance */
export function nearestEdge(room: Room, p: Pt) {
    let best = { edge: 0, t: 0.5, dist: Infinity };
    for (let i = 0; i < room.polygon.length; i++) {
        const { a, b, length } = roomEdge(room, i);
        if (length < EPS) continue;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (length * length)));
        const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        const d = dist(p, q);
        if (d < best.dist) best = { edge: i, t, dist: d };
    }
    return best;
}

/* ─────────────────────────── MURS ─────────────────────────── */

interface EdgeRef { a: Pt; b: Pt; roomId: string; outdoor: boolean }

/**
 * Murs du plan : les côtés de toutes les pièces sont regroupés par droite
 * support (même direction, même position à 12 cm près), puis découpés en
 * tronçons selon le nombre de pièces qui les bordent :
 * - bordé par une seule pièce intérieure → mur extérieur (épais) ;
 * - bordé par deux pièces → cloison (fine), ou façade si l'une est un balcon ;
 * - bordé uniquement par un balcon / une terrasse → garde-corps.
 */
export function computeWalls(plan: Pick<Plan3D, "rooms" | "openings">): Wall[] {
    const edges: EdgeRef[] = [];
    for (const r of plan.rooms) {
        const n = r.polygon.length;
        if (n < 3) continue;
        for (let i = 0; i < n; i++) {
            const a = r.polygon[i], b = r.polygon[(i + 1) % n];
            if (dist(a, b) > 0.05) edges.push({ a, b, roomId: r.id, outdoor: isOutdoor(r) });
        }
    }

    // Regroupement par droite support : angle (mod π) et distance signée à l'origine
    type Group = { ux: number; uy: number; nx: number; ny: number; off: number; items: EdgeRef[] };
    const groups: Group[] = [];
    for (const e of edges) {
        let ux = e.b.x - e.a.x, uy = e.b.y - e.a.y;
        const len = Math.hypot(ux, uy);
        ux /= len; uy /= len;
        // Direction canonique (ux > 0, ou ux = 0 et uy > 0)
        if (ux < -EPS || (Math.abs(ux) <= EPS && uy < 0)) { ux = -ux; uy = -uy; }
        const nx = -uy, ny = ux;
        const off = e.a.x * nx + e.a.y * ny;
        const g = groups.find(g => Math.abs(g.ux * uy - g.uy * ux) < 0.03 && Math.abs(g.off - off) < LINE_TOL && g.ux * ux + g.uy * uy > 0);
        if (g) g.items.push(e); else groups.push({ ux, uy, nx, ny, off, items: [e] });
    }

    const walls: Wall[] = [];
    for (const g of groups) {
        // Paramètre le long de la droite : s = p · u ; points reconstruits sur la droite moyenne
        const off = g.items.reduce((s, e) => s + (e.a.x * g.nx + e.a.y * g.ny), 0) / g.items.length;
        const at = (s: number): Pt => ({ x: g.ux * s + g.nx * off, y: g.uy * s + g.ny * off });
        const spans = g.items.map(e => {
            const s1 = e.a.x * g.ux + e.a.y * g.uy, s2 = e.b.x * g.ux + e.b.y * g.uy;
            return { from: Math.min(s1, s2), to: Math.max(s1, s2), roomId: e.roomId, outdoor: e.outdoor };
        });
        const cuts = Array.from(new Set(spans.flatMap(s => [s.from, s.to]))).sort((a, b) => a - b);
        let current: Wall | null = null;
        let currentKey = "";
        for (let k = 0; k < cuts.length - 1; k++) {
            const s0 = cuts[k], s1 = cuts[k + 1];
            if (s1 - s0 < 0.02) continue;
            const mid = (s0 + s1) / 2;
            const cover = spans.filter(s => s.from <= mid && s.to >= mid);
            const rooms = new Set(cover.map(c => c.roomId));
            if (!rooms.size) { current = null; currentKey = ""; continue; }
            const indoor = cover.filter(c => !c.outdoor).length;
            const outdoor = cover.filter(c => c.outdoor).length;
            let kind: "ext" | "int" | "rail" | "none";
            if (indoor >= 2) kind = "int";
            else if (indoor === 1) kind = "ext";
            else kind = outdoor === 1 ? "rail" : "none";
            if (kind === "none") { current = null; currentKey = ""; continue; }
            // Fusion des tronçons contigus de même nature
            if (current && currentKey === kind && dist(current.b, at(s0)) < 0.02) {
                current.b = at(s1);
                continue;
            }
            current = {
                a: at(s0), b: at(s1),
                exterior: kind === "ext",
                thickness: kind === "ext" ? EXTERIOR_WALL : kind === "int" ? INTERIOR_WALL : 0.06,
                railing: kind === "rail",
                openings: [],
            };
            currentKey = kind;
            walls.push(current);
        }
    }

    // Ouvertures : rattachées au mur qui porte leur centre
    for (const o of plan.openings || []) {
        const room = plan.rooms.find(r => r.id === o.roomId);
        if (!room || room.polygon.length < 3) continue;
        const c = edgePoint(room, o.edge, o.t);
        let best: { w: Wall; s: number; d: number } | null = null;
        for (const w of walls) {
            const len = dist(w.a, w.b);
            if (len < EPS) continue;
            const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len;
            const s = (c.x - w.a.x) * ux + (c.y - w.a.y) * uy;
            if (s < -0.05 || s > len + 0.05) continue;
            const d = Math.abs((c.x - w.a.x) * -uy + (c.y - w.a.y) * ux);
            if (d < LINE_TOL * 1.5 && (!best || d < best.d)) best = { w, s, d };
        }
        if (!best) continue;
        const len = dist(best.w.a, best.w.b);
        const half = Math.min(o.width, len - 0.1) / 2;
        if (half <= 0.05) continue;
        const center = Math.max(half + 0.05, Math.min(len - half - 0.05, best.s));
        best.w.openings.push({ kind: o.kind, from: center - half, to: center + half, id: o.id });
    }
    for (const w of walls) {
        // Ouvertures triées, sans chevauchement
        w.openings.sort((a, b) => a.from - b.from);
        for (let i = 1; i < w.openings.length; i++) {
            if (w.openings[i].from < w.openings[i - 1].to + 0.05) w.openings[i].from = w.openings[i - 1].to + 0.05;
        }
        w.openings = w.openings.filter(o => o.to - o.from > 0.3);
    }
    return walls;
}

/* ─────────────────────── MISE À L'ÉCHELLE ─────────────────────── */

/** Met le plan à l'échelle pour que la surface habitable corresponde à la surface déclarée */
export function scaleToArea(plan: Plan3D, targetArea: number): Plan3D {
    const current = indoorArea(plan);
    if (!(targetArea > 0) || !(current > 0)) return plan;
    const k = Math.sqrt(targetArea / current);
    if (Math.abs(k - 1) < 0.002) return plan;
    return {
        ...plan,
        rooms: plan.rooms.map(r => ({ ...r, polygon: r.polygon.map(p => ({ x: round2(p.x * k), y: round2(p.y * k) })) })),
        openings: plan.openings,
        furniture: plan.furniture.map(f => ({ ...f, x: f.x * k, y: f.y * k })),
        source: plan.source ? { ...plan.source, pxPerMeter: plan.source.pxPerMeter / k } : plan.source,
    };
}

/** Recale le plan pour que son coin haut-gauche soit à (0, 0) */
export function normalizeOrigin(plan: Plan3D): Plan3D {
    const bb = planBBox(plan);
    if (Math.abs(bb.minX) < 0.01 && Math.abs(bb.minY) < 0.01) return plan;
    const dx = -bb.minX, dy = -bb.minY;
    return {
        ...plan,
        rooms: plan.rooms.map(r => ({ ...r, polygon: r.polygon.map(p => ({ x: round2(p.x + dx), y: round2(p.y + dy) })) })),
        furniture: plan.furniture.map(f => ({ ...f, x: f.x + dx, y: f.y + dy })),
        source: plan.source ? { ...plan.source, originPx: { x: plan.source.originPx.x - dx * plan.source.pxPerMeter, y: plan.source.originPx.y - dy * plan.source.pxPerMeter } } : plan.source,
    };
}

/* ─────────────────────── PLAN SCHÉMATIQUE ─────────────────────── */

export interface RoomSpec { kind: RoomKind; name?: string; area: number }

const KIND_LABEL: Record<RoomKind, string> = {
    sejour: "Séjour", cuisine: "Cuisine", chambre: "Chambre", sdb: "Salle d'eau", wc: "WC", entree: "Entrée",
    couloir: "Dégagement", bureau: "Bureau", dressing: "Dressing", cellier: "Rangement", buanderie: "Buanderie",
    balcon: "Balcon", terrasse: "Terrasse", autre: "Pièce",
};
export const kindLabel = (k: RoomKind) => KIND_LABEL[k];

/**
 * Répartition des pièces d'un appartement à partir du nombre de pièces et
 * de la surface (quand seules ces informations sont connues).
 */
export function defaultRoomSpecs(surface: number, rooms: number): RoomSpec[] {
    const S = Math.max(15, surface || 50);
    const bedrooms = Math.max(0, Math.round(rooms || 2) - 1);
    const specs: RoomSpec[] = [];
    const entry = Math.max(3, S * 0.06);
    const bath = Math.max(3.5, Math.min(7, S * 0.07));
    const wc = S >= 55 ? 1.6 : 0;
    const kitchen = Math.max(5, Math.min(12, S * 0.1));
    const bedroom = Math.max(9, Math.min(14, S * 0.14));
    const rest = S - entry - bath - wc - kitchen - bedroom * bedrooms;
    const living = Math.max(12, rest);
    specs.push({ kind: "sejour", area: living });
    specs.push({ kind: "cuisine", area: kitchen });
    for (let i = 0; i < bedrooms; i++) specs.push({ kind: "chambre", name: bedrooms > 1 ? `Chambre ${i + 1}` : "Chambre", area: bedroom });
    specs.push({ kind: "sdb", area: bath });
    if (wc) specs.push({ kind: "wc", area: wc });
    specs.push({ kind: "entree", area: entry });
    // Ajuste pour retomber exactement sur la surface
    const total = specs.reduce((s, r) => s + r.area, 0);
    return specs.map(r => ({ ...r, area: round2((r.area * S) / total) }));
}

/** Découpe « squarifiée » d'un rectangle en pièces d'aires données */
function squarify(specs: (RoomSpec & { id: string })[], x: number, y: number, w: number, h: number, out: Room[]) {
    if (!specs.length) return;
    if (specs.length === 1) {
        const s = specs[0];
        out.push({ id: s.id, kind: s.kind, name: s.name || kindLabel(s.kind), polygon: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }].map(p => ({ x: round2(p.x), y: round2(p.y) })) });
        return;
    }
    const total = specs.reduce((s, r) => s + r.area, 0);
    // Coupe en deux groupes d'aires proches
    let acc = 0, k = 0;
    while (k < specs.length - 1 && acc + specs[k].area <= total / 2) acc += specs[k++].area;
    if (k === 0) { acc = specs[0].area; k = 1; }
    const f = acc / total;
    if (w >= h) {
        squarify(specs.slice(0, k), x, y, w * f, h, out);
        squarify(specs.slice(k), x + w * f, y, w * (1 - f), h, out);
    } else {
        squarify(specs.slice(0, k), x, y, w, h * f, out);
        squarify(specs.slice(k), x, y + h * f, w, h * (1 - f), out);
    }
}

/**
 * Plan schématique : zone jour (séjour, cuisine, entrée) et zone nuit
 * (chambres, salle d'eau, WC) de part et d'autre d'un dégagement, avec
 * portes et fenêtres placées automatiquement. Aires exactes par pièce.
 */
export function schematicPlan(specs: RoomSpec[]): Plan3D {
    const withIds = specs.filter(s => s.area > 0).map(s => ({ ...s, id: uid("r") }));
    const indoor = withIds.filter(s => !isOutdoor(s.kind));
    const outdoor = withIds.filter(s => isOutdoor(s.kind));
    const total = indoor.reduce((s, r) => s + r.area, 0) || 1;
    const day = indoor.filter(s => ["sejour", "cuisine", "entree", "bureau", "autre"].includes(s.kind)).sort((a, b) => b.area - a.area);
    const night = indoor.filter(s => !day.includes(s)).sort((a, b) => b.area - a.area);
    // Emprise rectangulaire ~ 1,5 : 1
    const W = Math.sqrt(total * 1.5), H = total / W;
    const dayArea = day.reduce((s, r) => s + r.area, 0), nightArea = night.reduce((s, r) => s + r.area, 0);
    const rooms: Room[] = [];
    const dayH = night.length ? H * (dayArea / (dayArea + nightArea)) : H;
    squarify(day, 0, 0, W, dayH, rooms);
    if (night.length) squarify(night, 0, dayH, W, H - dayH, rooms);
    // Balcon / terrasse le long de la façade du séjour
    let ox = 0;
    for (const o of outdoor) {
        const depth = Math.min(2.2, Math.max(1.2, o.area / Math.min(W, 6)));
        const len = o.area / depth;
        rooms.push({ id: o.id, kind: o.kind, name: o.name || kindLabel(o.kind), polygon: [{ x: ox, y: -depth }, { x: ox + len, y: -depth }, { x: ox + len, y: 0 }, { x: ox, y: 0 }].map(p => ({ x: round2(p.x), y: round2(p.y) })) });
        ox += len + 0.2;
    }
    const plan: Plan3D = { version: 1, wallHeight: DEFAULT_WALL_HEIGHT, rooms, openings: [], furniture: [], style: "contemporain", schematic: true, source: null };
    return normalizeOrigin({ ...plan, openings: autoOpenings(plan) });
}

/* ─────────────────────── OUVERTURES AUTOMATIQUES ─────────────────────── */

const WINDOW_KINDS: RoomKind[] = ["sejour", "chambre", "cuisine", "bureau"];
const HUB_KINDS: RoomKind[] = ["entree", "couloir", "sejour"];

/** Longueur du côté partagé par deux pièces (0 si aucun) */
function sharedEdge(a: Room, b: Room): { edge: number; t: number; length: number } | null {
    let best: { edge: number; t: number; length: number } | null = null;
    for (let i = 0; i < a.polygon.length; i++) {
        const { a: p, b: q, length } = roomEdge(a, i);
        if (length < 0.6) continue;
        const ux = (q.x - p.x) / length, uy = (q.y - p.y) / length;
        for (let j = 0; j < b.polygon.length; j++) {
            const { a: r, b: s } = roomEdge(b, j);
            // Colinéaires et superposés ?
            const dr = Math.abs((r.x - p.x) * -uy + (r.y - p.y) * ux), ds = Math.abs((s.x - p.x) * -uy + (s.y - p.y) * ux);
            if (dr > LINE_TOL || ds > LINE_TOL) continue;
            const t1 = ((r.x - p.x) * ux + (r.y - p.y) * uy), t2 = ((s.x - p.x) * ux + (s.y - p.y) * uy);
            const lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(length, Math.max(t1, t2));
            const overlap = hi - lo;
            if (overlap > 0.8 && (!best || overlap > best.length)) best = { edge: i, t: (lo + hi) / 2 / length, length: overlap };
        }
    }
    return best;
}

/** Portes entre pièces (vers l'entrée / le séjour) et fenêtres sur les façades */
export function autoOpenings(plan: Pick<Plan3D, "rooms" | "openings">): Opening[] {
    const openings: Opening[] = [];
    const walls = computeWalls({ rooms: plan.rooms, openings: [] });
    const exteriorOf = (room: Room) => {
        const edges: { edge: number; length: number }[] = [];
        for (let i = 0; i < room.polygon.length; i++) {
            const c = edgePoint(room, i, 0.5);
            const { length } = roomEdge(room, i);
            const onExt = walls.some(w => w.exterior && dist(w.a, w.b) > 0.5 && segDist(c, w.a, w.b) < LINE_TOL);
            if (onExt && length > 1) edges.push({ edge: i, length });
        }
        return edges.sort((a, b) => b.length - a.length);
    };
    const hubs = plan.rooms.filter(r => HUB_KINDS.includes(r.kind));
    for (const room of plan.rooms) {
        if (isOutdoor(room)) continue;
        // Porte : vers le couloir / l'entrée / le séjour voisin
        if (!HUB_KINDS.includes(room.kind) || room.kind === "sejour") {
            const candidates = [...hubs, ...plan.rooms.filter(r => r !== room && !isOutdoor(r))].filter(r => r.id !== room.id);
            for (const other of candidates) {
                const sh = sharedEdge(room, other);
                if (sh) {
                    openings.push({ id: uid("o"), kind: "door", roomId: room.id, edge: sh.edge, t: sh.t, width: room.kind === "sejour" ? 0.9 : 0.83 });
                    break;
                }
            }
        }
        // Fenêtre(s) sur la façade
        if (WINDOW_KINDS.includes(room.kind)) {
            const ext = exteriorOf(room);
            const outdoorNeighbour = plan.rooms.find(r => isOutdoor(r) && sharedEdge(room, r));
            if (outdoorNeighbour && room.kind === "sejour") {
                const sh = sharedEdge(room, outdoorNeighbour)!;
                openings.push({ id: uid("o"), kind: "french", roomId: room.id, edge: sh.edge, t: sh.t, width: Math.min(2.4, sh.length * 0.6) });
            } else if (ext[0]) {
                openings.push({ id: uid("o"), kind: room.kind === "sejour" ? "french" : "window", roomId: room.id, edge: ext[0].edge, t: 0.5, width: Math.min(room.kind === "sejour" ? 2.2 : 1.3, ext[0].length * 0.55) });
                if (room.kind === "sejour" && ext[1] && ext[1].length > 2.5) openings.push({ id: uid("o"), kind: "window", roomId: room.id, edge: ext[1].edge, t: 0.5, width: 1.2 });
            }
        }
    }
    return openings;
}

/** Distance d'un point à un segment */
export function segDist(p: Pt, a: Pt, b: Pt): number {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 < EPS) return dist(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
    return dist(p, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
}

/** Type d'ouverture lisible */
export const openingLabel = (k: OpeningKind) => (k === "door" ? "Porte" : k === "window" ? "Fenêtre" : "Porte-fenêtre");

/** Plan vide prêt à éditer */
export const emptyPlan = (): Plan3D => ({ version: 1, wallHeight: DEFAULT_WALL_HEIGHT, rooms: [], openings: [], furniture: [], style: "contemporain", source: null });
