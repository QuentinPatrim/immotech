import {
    autoOpenings, bbox, centroid, dist, emptyPlan, isOutdoor, kindLabel, normalizeOrigin,
    pointInPolygon, polygonArea, round2, roomEdge, scaleToArea, segDist, uid,
} from "@/lib/plan3d/geometry";
import {
    DEFAULT_WALL_HEIGHT, ROOM_KINDS,
    type Opening, type OpeningKind, type Plan3D, type Pt, type Room, type RoomKind,
} from "@/lib/plan3d/types";

/* ============================================================
   PLAN 3D — RELEVÉ D'UN PLAN → PLAN EN MÈTRES (sans dépendance serveur)
   Un relevé (pièces en coordonnées normalisées 0..1000 sur l'image,
   surfaces écrites, ouvertures, cote) venant de l'IA ou de la lecture
   directe du dessin est mis à l'échelle (surfaces, cote, surface
   déclarée), redressé, ses cloisons fusionnées, puis converti en
   Plan3D calé sur l'image d'origine (source.originPx / pxPerMeter).
   ============================================================ */

/* ─────────────────────────── RÉPONSE DU MODÈLE ─────────────────────────── */

export interface ModelPoint { x: number; y: number }

export interface ModelRoom {
    name: string;
    kind: RoomKind;
    /** Surface (m²) écrite sur le plan pour cette pièce */
    surfaceOnPlan: number | null;
    /** Contour en coordonnées normalisées 0..1000 (x depuis la gauche, y depuis le haut) */
    polygon: ModelPoint[];
}

export interface ModelOpening { kind: OpeningKind; x1: number; y1: number; x2: number; y2: number }

export interface ModelDimension { meters: number; x1: number; y1: number; x2: number; y2: number }

export interface ModelPlan {
    rooms: ModelRoom[];
    openings: ModelOpening[];
    totalSurfaceOnPlan: number | null;
    knownDimension: ModelDimension | null;
    confidence: "high" | "medium" | "low";
    notes: string[];
}

const KIND_IDS: RoomKind[] = ROOM_KINDS.map(k => k.id);

/* ─────────────────────────── NOMS DES PIÈCES ─────────────────────────── */

const ABBREVIATIONS: Record<string, string> = {
    ch: "Chambre", chb: "Chambre", chbre: "Chambre", chamb: "Chambre", chambre: "Chambre",
    sdb: "Salle de bain", "s.d.b": "Salle de bain", sde: "Salle d'eau", "s.d.e": "Salle d'eau", sdd: "Salle de douche",
    dgt: "Dégagement", dgmt: "Dégagement", deg: "Dégagement", "dég": "Dégagement", degt: "Dégagement", "dégt": "Dégagement", degagement: "Dégagement", "dégagement": "Dégagement",
    cuis: "Cuisine", cuisine: "Cuisine",
    sej: "Séjour", "séj": "Séjour", sejour: "Séjour", "séjour": "Séjour",
    sam: "Salle à manger", "s.a.m": "Salle à manger", "s.à.m": "Salle à manger",
    rgt: "Rangement", rgmt: "Rangement", rang: "Rangement",
    plac: "Placard", plc: "Placard", pl: "Placard",
    buand: "Buanderie", bur: "Bureau", dress: "Dressing", terr: "Terrasse", bal: "Balcon", balc: "Balcon",
    cel: "Cellier", cell: "Cellier", ent: "Entrée", entr: "Entrée", entree: "Entrée", "entrée": "Entrée",
    wc: "WC", "w.c": "WC", sal: "Salon",
};

/** Nom lisible : abréviations développées, surfaces retirées (« Ch.1 12,4 m² » → « Chambre 1 ») */
export function cleanRoomName(raw: string, kind: RoomKind): string {
    const s = (raw || "")
        .replace(/\d+(?:[.,]\d+)?\s*m(?:²|2)/gi, " ")
        .replace(/[()[\]:]/g, " ")
        .replace(/([a-zà-ÿ]\.)(?=\d)/gi, "$1 ");
    const words = s.split(/(\s+|\/|\+|-)/).map(token => {
        const m = /^([a-zà-ÿ.]+?)\.?(\d+)$/i.exec(token);
        const [word, digits] = m && ABBREVIATIONS[m[1].toLowerCase().replace(/\.+$/, "")] ? [m[1], m[2]] : [token, ""];
        const key = word.toLowerCase().replace(/\.+$/, "");
        let out = ABBREVIATIONS[key] ?? word;
        if (!ABBREVIATIONS[key] && out.length > 3 && out === out.toUpperCase() && /[A-Z]/.test(out)) out = out.charAt(0) + out.slice(1).toLowerCase();
        return digits ? `${out} ${digits}` : out;
    });
    const name = words.join("").replace(/\s+/g, " ").replace(/^[\s.,;/+-]+|[\s.,;/+-]+$/g, "").trim().slice(0, 40);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : kindLabel(kind);
}

/** Noms en double numérotés (« Chambre », « Chambre » → « Chambre 1 », « Chambre 2 ») */
function uniqueNames(names: string[]): string[] {
    const count = new Map<string, number>();
    for (const n of names) count.set(n, (count.get(n) || 0) + 1);
    const seen = new Map<string, number>();
    return names.map(n => {
        if ((count.get(n) || 0) < 2 || /\d$/.test(n)) return n;
        const k = (seen.get(n) || 0) + 1;
        seen.set(n, k);
        return `${n} ${k}`;
    });
}

/* ─────────────────────────── NETTOYAGE GÉOMÉTRIQUE ─────────────────────────── */

const ORTHO_TOL = Math.tan((7 * Math.PI) / 180);
const SNAP = 0.15;
/** Épaisseur maximale d'un mur entre deux pièces (cloison, refend, façade côté balcon) */
const WALL_GAP = 0.3;

interface Work { name: string; kind: RoomKind; surface: number | null; poly: Pt[] }

const median = (vs: number[]) => {
    const s = [...vs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Sommets confondus (< tol) et sommets alignés retirés */
function simplify(poly: Pt[], tol: number): Pt[] {
    let pts = poly.filter((p, i) => dist(p, poly[(i + 1) % poly.length]) > tol);
    let changed = true;
    while (changed && pts.length > 3) {
        changed = false;
        for (let i = 0; i < pts.length; i++) {
            const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
            const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
            const scale = Math.max(dist(a, b) * dist(b, c), 1e-9);
            if (Math.abs(cross) / scale < 0.01 || dist(a, c) < tol) {
                pts = pts.filter((_, k) => k !== i);
                changed = true;
                break;
            }
        }
    }
    return pts;
}

/**
 * Côtés à moins de 7° de l'horizontale / de la verticale redressés : chaque
 * suite de côtés consécutifs presque horizontaux (resp. verticaux) est posée
 * exactement sur une même droite (moyenne pondérée par la longueur).
 */
function orthogonalize(poly: Pt[]): Pt[] {
    const n = poly.length;
    const pts = poly.map(p => ({ ...p }));
    const cls = poly.map((a, i) => {
        const b = poly[(i + 1) % n];
        const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
        if (dx > 1e-9 && dy <= dx * ORTHO_TOL) return "y" as const;
        if (dy > 1e-9 && dx <= dy * ORTHO_TOL) return "x" as const;
        return null;
    });
    const start = cls.findIndex((c, i) => c !== cls[(i + n - 1) % n]);
    if (start < 0) return pts;
    for (let k = 0; k < n;) {
        const i = (start + k) % n, axis = cls[i];
        let len = 1;
        while (len < n && cls[(i + len) % n] === axis) len++;
        if (axis) {
            let sum = 0, total = 0;
            for (let j = 0; j < len; j++) {
                const a = poly[(i + j) % n], b = poly[(i + j + 1) % n], w = dist(a, b);
                sum += ((a[axis] + b[axis]) / 2) * w;
                total += w;
            }
            for (let j = 0; j <= len; j++) pts[(i + j) % n][axis] = sum / total;
        }
        k += len;
    }
    return pts;
}

function makeUnionFind(n: number) {
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const union = (a: number, b: number) => { parent[find(a)] = find(b); };
    return { find, union };
}

/**
 * Murs partagés alignés : les côtés horizontaux (resp. verticaux) de pièces
 * différentes qui se font face (intérieurs de part et d'autre) à moins de
 * 30 cm — cloison, refend ou façade côté balcon — sont ramenés sur une même
 * droite (moyenne pondérée par la longueur). Une pièce ne peut pas avoir ses
 * deux faces opposées dans un même groupe (pas d'écrasement d'une pièce fine).
 */
function snapSharedLines(rooms: Work[]) {
    for (const axis of ["x", "y"] as const) {
        const other = axis === "x" ? "y" : "x";
        const segs: { room: number; i: number; c: number; lo: number; hi: number; len: number; side: number }[] = [];
        rooms.forEach((r, ri) => r.poly.forEach((a, i) => {
            const b = r.poly[(i + 1) % r.poly.length];
            if (a[axis] !== b[axis]) return;
            const lo = Math.min(a[other], b[other]), hi = Math.max(a[other], b[other]);
            if (hi - lo <= 0.05) return;
            const mid = (lo + hi) / 2;
            const probe = axis === "x" ? { x: a.x + 0.02, y: mid } : { x: mid, y: a.y + 0.02 };
            segs.push({ room: ri, i, c: a[axis], lo, hi, len: hi - lo, side: pointInPolygon(probe, r.poly) ? 1 : -1 });
        }));
        const pairs: { i: number; j: number; gap: number }[] = [];
        for (let i = 0; i < segs.length; i++) {
            for (let j = i + 1; j < segs.length; j++) {
                const s = segs[i], t = segs[j];
                const gap = Math.abs(s.c - t.c);
                if (s.room === t.room || s.side === t.side || gap > WALL_GAP) continue;
                if (Math.min(s.hi, t.hi) - Math.max(s.lo, t.lo) > 0.05) pairs.push({ i, j, gap });
            }
        }
        pairs.sort((p, q) => p.gap - q.gap);
        const group = segs.map((_, i) => i);
        const members = segs.map((_, i) => [i]);
        for (const { i, j } of pairs) {
            const gi = group[i], gj = group[j];
            if (gi === gj) continue;
            const merged = [...members[gi], ...members[gj]];
            if (merged.some(a => merged.some(b => segs[a].room === segs[b].room && segs[a].side !== segs[b].side))) continue;
            for (const k of members[gj]) group[k] = gi;
            members[gi] = merged;
            members[gj] = [];
        }
        for (const list of members) {
            if (list.length < 2) continue;
            const total = list.reduce((s, k) => s + segs[k].len, 0);
            const c = list.reduce((s, k) => s + segs[k].c * segs[k].len, 0) / total;
            for (const k of list) {
                const { room, i } = segs[k];
                const poly = rooms[room].poly;
                poly[i][axis] = c;
                poly[(i + 1) % poly.length][axis] = c;
            }
        }
    }
}

/**
 * Sommets de pièces différentes à moins de 15 cm fusionnés (moyenne). Les
 * côtés horizontaux / verticaux qui partent d'un sommet déplacé suivent, pour
 * rester droits.
 */
function snapVertices(rooms: Work[]) {
    const refs: { room: number; i: number }[] = [];
    rooms.forEach((r, ri) => r.poly.forEach((_, i) => refs.push({ room: ri, i })));
    const pt = (k: number) => rooms[refs[k].room].poly[refs[k].i];
    const uf = makeUnionFind(refs.length);
    for (let a = 0; a < refs.length; a++) {
        for (let b = a + 1; b < refs.length; b++) {
            if (refs[a].room !== refs[b].room && dist(pt(a), pt(b)) <= SNAP) uf.union(a, b);
        }
    }
    const clusters = new Map<number, number[]>();
    refs.forEach((_, k) => clusters.set(uf.find(k), [...(clusters.get(uf.find(k)) || []), k]));
    for (const members of clusters.values()) {
        if (members.length < 2) continue;
        const x = members.reduce((s, k) => s + pt(k).x, 0) / members.length;
        const y = members.reduce((s, k) => s + pt(k).y, 0) / members.length;
        for (const k of members) {
            const poly = rooms[refs[k].room].poly, n = poly.length, i = refs[k].i;
            const p = poly[i];
            for (const q of [poly[(i + n - 1) % n], poly[(i + 1) % n]]) {
                if (q.x === p.x && q.y !== p.y) q.x = x;
                else if (q.y === p.y && q.x !== p.x) q.y = y;
            }
            p.x = x;
            p.y = y;
        }
    }
}

/** Contour général du logement tracé comme une pièce : il contient le centre de plusieurs autres pièces */
function dropEnvelopes(rooms: Work[]): { kept: Work[]; dropped: number } {
    const kept = rooms.filter(r => {
        const area = polygonArea(r.poly);
        const inside = rooms.filter(o => o !== r && polygonArea(o.poly) < area && pointInPolygon(centroid(o.poly), r.poly));
        return !(inside.length >= 2 && inside.reduce((s, o) => s + polygonArea(o.poly), 0) > area * 0.6);
    });
    return { kept, dropped: rooms.length - kept.length };
}

/* ─────────────────────────── OUVERTURES ─────────────────────────── */

function mapOpenings(list: ModelOpening[], rooms: Room[], toMeters: (x: number, y: number) => Pt): Opening[] {
    const out: Opening[] = [];
    for (const o of list) {
        const a = toMeters(o.x1, o.y1), b = toMeters(o.x2, o.y2);
        const len = dist(a, b);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        let best: { room: Room; edge: number; t: number; edgeLength: number; score: number } | null = null;
        for (const room of rooms) {
            for (let i = 0; i < room.polygon.length; i++) {
                const { a: p, b: q, length } = roomEdge(room, i);
                if (length < 0.3) continue;
                const ux = (q.x - p.x) / length, uy = (q.y - p.y) / length;
                // Presque parallèle au côté (±20°)
                if (len > 0.1 && Math.abs(ux * (b.y - a.y) - uy * (b.x - a.x)) / len > 0.35) continue;
                const d = segDist(mid, p, q);
                if (d > 0.7) continue;
                // Fenêtres : côté pièce intérieure plutôt que balcon
                const score = d + (o.kind !== "door" && isOutdoor(room) ? 0.3 : 0);
                if (!best || score < best.score) {
                    const t = ((mid.x - p.x) * ux + (mid.y - p.y) * uy) / length;
                    best = { room, edge: i, t: Math.max(0.05, Math.min(0.95, t)), edgeLength: length, score };
                }
            }
        }
        if (!best) continue;
        let width = Math.max(0.6, Math.min(3, len));
        // Porte : largeur standard si le relevé est incohérent ; au-delà de 1,8 m, passage ouvert conservé (max 2,6 m)
        if (o.kind === "door" && (len < 0.6 || len > 2.6)) width = 0.83;
        const found = best;
        const duplicate = out.some(x => x.roomId === found.room.id && x.edge === found.edge && Math.abs(x.t - found.t) * found.edgeLength < 0.3);
        if (!duplicate) out.push({ id: uid("o"), kind: o.kind, roomId: found.room.id, edge: found.edge, t: Math.round(found.t * 1000) / 1000, width: round2(width) });
    }
    return out;
}

/* ─────────────────────────── CONVERSION ─────────────────────────── */

/** Nombre au format français, 1 décimale au plus (64,2 · 68) */
const fr = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");

type ScaleSource = "surfaces" | "dimension" | "total" | "carrez" | "declared" | "guess";

/**
 * Plan en mètres à partir de la lecture du modèle :
 * échelle (surfaces écrites → cote → surface totale → surface déclarée →
 * largeur supposée de 12 m), redressement, cloisons fusionnées, ouvertures
 * rattachées aux côtés des pièces, calage sur l'image d'origine.
 */
export function planFromModel(
    model: ModelPlan,
    opts: { widthPx: number; heightPx: number; declaredSurface?: number; imageUrl?: string; carrezTotal?: number },
): { plan: Plan3D; notes: string[] } {
    const W = opts.widthPx, H = opts.heightPx;
    const declared = opts.declaredSurface && opts.declaredSurface > 0 ? opts.declaredSurface : undefined;
    const toPx = (x: number, y: number): Pt => ({ x: (x * W) / 1000, y: (y * H) / 1000 });
    const notes: string[] = [];
    const modelNotes = (model.notes || []).map(n => n.trim().slice(0, 160)).filter(Boolean).slice(0, 4);

    const read: Work[] = (model.rooms || []).map(r => ({
        name: r.name,
        kind: KIND_IDS.includes(r.kind) ? r.kind : "autre",
        surface: r.surfaceOnPlan !== null && r.surfaceOnPlan > 0 ? r.surfaceOnPlan : null,
        poly: simplify((r.polygon || []).map(p => toPx(p.x, p.y)), 0.5),
    })).filter(r => r.poly.length >= 3 && polygonArea(r.poly) > 1);
    const { kept, dropped: envelopes } = dropEnvelopes(read);
    if (envelopes) notes.push("Contour général du logement ignoré (ce n'est pas une pièce).");
    if (!kept.length) return { plan: emptyPlan(), notes: [...notes, ...modelNotes] };

    /* Échelle (pixels par mètre) : premier candidat donnant une surface plausible */
    const indoorPx = kept.filter(r => !isOutdoor(r.kind)).reduce((s, r) => s + polygonArea(r.poly), 0) || kept.reduce((s, r) => s + polygonArea(r.poly), 0);
    const plausible = (ppm: number) => Number.isFinite(ppm) && ppm > 0 && indoorPx / (ppm * ppm) >= 5 && indoorPx / (ppm * ppm) <= 2000;
    const candidates: { from: ScaleSource; ppm: number }[] = [];
    const written = kept.filter(r => r.surface);
    if (written.length >= 2) candidates.push({ from: "surfaces", ppm: median(written.map(r => Math.sqrt(polygonArea(r.poly) / (r.surface as number)))) });
    const dim = model.knownDimension;
    if (dim && dim.meters > 0.3) {
        const a = toPx(dim.x1, dim.y1), b = toPx(dim.x2, dim.y2);
        candidates.push({ from: "dimension", ppm: dist(a, b) / dim.meters });
    }
    if (model.totalSurfaceOnPlan && model.totalSurfaceOnPlan > 0) candidates.push({ from: "total", ppm: Math.sqrt(indoorPx / model.totalSurfaceOnPlan) });
    if (opts.carrezTotal && opts.carrezTotal > 0) candidates.push({ from: "carrez", ppm: Math.sqrt(indoorPx / opts.carrezTotal) });
    if (declared) candidates.push({ from: "declared", ppm: Math.sqrt(indoorPx / declared) });
    const pxBox = bbox(kept.flatMap(r => r.poly));
    candidates.push({ from: "guess", ppm: Math.max(pxBox.w, pxBox.h, 1) / 12 });
    const scale = candidates.find(c => plausible(c.ppm)) ?? candidates[candidates.length - 1];
    let ppm = scale.ppm;

    /* Mètres (repère : pixel (0, 0) de l'image), redressement, cloisons fusionnées */
    let rooms: Work[] = kept.map(r => ({ ...r, poly: simplify(orthogonalize(r.poly.map(p => ({ x: p.x / ppm, y: p.y / ppm }))), 0.02) }));
    snapSharedLines(rooms);
    snapVertices(rooms);
    const finish = (list: Work[]) => list.map(r => ({ ...r, poly: simplify(r.poly.map(p => ({ x: round2(p.x), y: round2(p.y) })), 0.01) }));
    rooms = finish(rooms);
    const before = rooms.length;
    // Petites pièces gardées si leur surface est connue (WC de 1 m² d'un diagnostic)
    rooms = rooms.filter(r => r.poly.length >= 3 && (polygonArea(r.poly) >= 0.8 || (!!r.surface && r.surface >= 0.5 && polygonArea(r.poly) >= 0.15)));
    if (rooms.length < before) notes.push(before - rooms.length > 1 ? `${before - rooms.length} petites zones ignorées.` : "1 petite zone ignorée.");

    /* Surfaces écrites : ré-ajustement après fusion des cloisons (les pièces gagnent la moitié du mur) */
    if (scale.from === "surfaces") {
        const withSurface = rooms.filter(r => r.surface);
        if (withSurface.length >= 2) {
            const f = median(withSurface.map(r => Math.sqrt((r.surface as number) / polygonArea(r.poly))));
            if (Number.isFinite(f) && f > 0 && Math.abs(f - 1) > 0.002) {
                rooms = finish(rooms.map(r => ({ ...r, poly: r.poly.map(p => ({ x: p.x * f, y: p.y * f })) })));
                ppm /= f;
            }
        }
    }

    const names = uniqueNames(rooms.map(r => cleanRoomName(r.name, r.kind)));
    const finalRooms: Room[] = rooms.map((r, i) => ({ id: uid("r"), name: names[i], kind: r.kind, polygon: r.poly }));

    const readOpenings = mapOpenings(model.openings || [], finalRooms, (x, y) => { const p = toPx(x, y); return { x: p.x / ppm, y: p.y / ppm }; });
    let plan: Plan3D = {
        version: 1,
        source: { imageUrl: opts.imageUrl ?? "", pxPerMeter: ppm, widthPx: W, heightPx: H, originPx: { x: 0, y: 0 } },
        wallHeight: DEFAULT_WALL_HEIGHT,
        rooms: finalRooms,
        openings: [],
        furniture: [],
        style: "contemporain",
    };
    plan.openings = readOpenings.length ? readOpenings : autoOpenings(plan);
    if (!readOpenings.length) notes.push("Portes et fenêtres placées automatiquement (non lues sur le plan).");
    // Mise à l'échelle autour du pixel (0, 0) : le calage sur l'image est conservé
    if (scale.from === "declared" && declared) plan = scaleToArea(plan, declared);
    if (scale.from === "carrez" && opts.carrezTotal) plan = scaleToArea(plan, opts.carrezTotal);
    plan = normalizeOrigin(plan);

    /* Notes lisibles par l'agent */
    const indoor = plan.rooms.filter(r => !isOutdoor(r)).reduce((s, r) => s + polygonArea(r.polygon), 0);
    const scaleNote: Record<ScaleSource, string> = {
        surfaces: `Échelle déduite des surfaces écrites sur le plan (${written.length} pièces).`,
        dimension: `Échelle déduite de la cote de ${fr(dim?.meters ?? 0)} m lue sur le plan.`,
        total: "Échelle déduite de la surface totale écrite sur le plan.",
        carrez: "Échelle calée sur le total du mesurage Carrez (pièces du croquis non associées au tableau).",
        declared: "Échelle calée sur la surface déclarée (aucune cote ni surface lisible sur le plan).",
        guess: "Aucune échelle lisible : dimensions estimées (plan supposé large de 12 m), à vérifier.",
    };
    notes.unshift(scaleNote[scale.from]);
    const deviations = rooms
        .map((r, i) => ({ name: names[i], surface: r.surface, area: polygonArea(plan.rooms[i].polygon) }))
        .filter(d => d.surface && Math.abs(d.area - d.surface) / d.surface > 0.12)
        .slice(0, 3);
    for (const d of deviations) notes.push(`${d.name} : ${fr(d.surface as number)} m² sur le plan · ${fr(d.area)} m² mesurés.`);
    if (model.totalSurfaceOnPlan && model.totalSurfaceOnPlan > 0 && Math.abs(indoor - model.totalSurfaceOnPlan) / model.totalSurfaceOnPlan > 0.03) {
        notes.push(`Surface totale écrite sur le plan : ${fr(model.totalSurfaceOnPlan)} m² · surface mesurée : ${fr(indoor)} m².`);
    }
    if (declared && Math.abs(indoor - declared) / declared > 0.03) notes.push(`Surface du plan : ${fr(indoor)} m² · surface déclarée : ${fr(declared)} m².`);
    if (model.confidence === "low") notes.push("Plan difficile à lire : vérifiez les pièces et les ouvertures.");

    return { plan, notes: [...notes, ...modelNotes] };
}
