"use client";

/* ============================================================
   ÉDITEUR DE PLAN 2D
   Plan en mètres dessiné en SVG (façon plan d'architecte) :
   pièces colorées par type, murs calculés, portes et fenêtres.
   Souris et tactile (Pointer Events) : sélection, déplacement des
   sommets et des pièces avec magnétisme, ajout / suppression de
   sommets, ajout d'ouvertures, zoom molette / pincement.
   Chaque modification renvoie un nouveau plan via onChange.
   ============================================================ */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
    AppWindow, Check, ChevronDown, ChevronUp, Columns2, Copy, DoorOpen, Lock, LockOpen, Maximize2, Minus, Plus, Redo2, SquarePlus, Trash2, TriangleAlert, Undo2, X,
} from "lucide-react";
import {
    ROOM_KINDS, type Opening, type OpeningKind, type Plan3D, type Pt, type Room, type RoomKind, type Wall,
} from "@/lib/plan3d/types";
import {
    bbox, centroid, computeWalls, dist, edgePoint, indoorArea, isOutdoor, kindLabel, nearestEdge, openingLabel,
    planBBox, pointInPolygon, roomArea, scaleToArea,
} from "@/lib/plan3d/geometry";
import {
    NEW_ROOM, OPENING_WIDTH, addOpening, addRoom, clamp, deleteRoom, deleteVertex, duplicateRoom, grabWall, insertVertex,
    countedArea, dragWall, hasTargets, mapRoom, placardGroups, setRoomTarget, moveOpening, openingEnds, relock, targetGaps, patchOpening as patchOpeningOp, r3, resizeOpening, setRoomArea, setRoomSize,
    setVertex, snapGrid, translateRoom, wallHandleT, wallOffset, type WallGrab,
} from "@/lib/plan3d/edit";

export interface PlanEditor2DProps {
    plan: Plan3D;
    onChange: (plan: Plan3D) => void;
    selectedRoomId: string | null;
    onSelectRoom: (id: string | null) => void;
    declaredSurface?: number;
    showSource?: boolean;
    className?: string;
    /** Historique (tenu par la page, partagé avec la vue 3D) */
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

/* ─────────────────────────── CONSTANTES ─────────────────────────── */

const ACCENT = "#d35f52";
const MIN_K = 4;
const MAX_K = 1200;


/** Teinte des pièces par type (r, g, b) : sable, bleu doux, vert tendre, eau, gris clair, bois… */
const KIND_RGB: Record<RoomKind, [number, number, number]> = {
    sejour: [221, 184, 128],
    cuisine: [132, 190, 138],
    chambre: [124, 160, 222],
    sdb: [94, 194, 206],
    wc: [110, 186, 204],
    entree: [168, 168, 176],
    couloir: [168, 168, 176],
    bureau: [174, 144, 214],
    dressing: [214, 158, 186],
    cellier: [186, 172, 148],
    buanderie: [118, 198, 186],
    balcon: [178, 128, 84],
    terrasse: [178, 128, 84],
    jardin: [118, 176, 96],
    autre: [196, 196, 200],
};
const kindFill = (k: RoomKind, a: number) => `rgba(${KIND_RGB[k].join(", ")}, ${a})`;

const fmt1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/* ─────────────────────────── TYPES LOCAUX ─────────────────────────── */

interface View { cx: number; cy: number; k: number }
interface Size { w: number; h: number }
interface Guide { a: Pt; b: Pt }
interface SnapInfo { lines: Guide[]; point: Pt | null }

type Tap =
    | { kind: "none" }
    | { kind: "empty" }
    | { kind: "place" }
    | { kind: "room"; id: string }
    | { kind: "opening"; id: string; roomId: string };

type Gesture =
    | { type: "pan"; id: number; start: Pt; view: View; thr: number; moved: boolean; tap: Tap }
    | { type: "pinch"; d0: number; mid0: Pt; view: View }
    | {
        type: "vertex"; id: number; start: Pt; thr: number; moved: boolean; inserted: boolean;
        roomId: string; index: number; base: Plan3D; result: Plan3D; points: Pt[]; axes: Pt[];
    }
    | {
        type: "room"; id: number; start: Pt; thr: number; moved: boolean;
        origin: Pt; roomId: string; base: Plan3D; result: Plan3D | null; targets: Pt[];
    }
    | {
        type: "wall"; id: number; start: Pt; thr: number; moved: boolean;
        grab: WallGrab; off0: number; base: Plan3D; result: Plan3D | null; stops: number[]; d: number;
    }
    | {
        type: "opening"; id: number; start: Pt; thr: number; moved: boolean;
        openingId: string; roomId: string; grabOffset: Pt; base: Plan3D; result: Plan3D | null;
    }
    | {
        type: "openingEnd"; id: number; start: Pt; thr: number; moved: boolean;
        openingId: string; end: "a" | "b"; base: Plan3D; result: Plan3D | null;
    };

interface OpeningShape {
    id: string;
    kind: OpeningKind;
    roomId: string;
    a: Pt;
    b: Pt;
    /** Direction du mur et normale tournée vers l'intérieur de la pièce */
    u: Pt;
    n: Pt;
    th: number;
}

const NO_SNAP: SnapInfo = { lines: [], point: null };

/* ─────────────────────────── VUE ─────────────────────────── */

const midPt = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const toWorld = (p: Pt, v: View, s: Size): Pt => ({ x: v.cx + (p.x - s.w / 2) / v.k, y: v.cy + (p.y - s.h / 2) / v.k });
const toScreen = (p: Pt, v: View, s: Size): Pt => ({ x: (p.x - v.cx) * v.k + s.w / 2, y: (p.y - v.cy) * v.k + s.h / 2 });

function zoomAt(v: View, s: Size, p: Pt, factor: number): View {
    const k = clamp(v.k * factor, MIN_K, MAX_K);
    const w = toWorld(p, v, s);
    return { k, cx: w.x - (p.x - s.w / 2) / k, cy: w.y - (p.y - s.h / 2) / k };
}

/** Clé de recadrage automatique : nouvelle image source, ou plan qui passe de vide à rempli */
const fitKeyOf = (plan: Plan3D) => `${plan.source?.imageUrl ?? ""}|${plan.rooms.length > 0}`;

/** Cadrage du plan (ou de l'image source) avec 1 m de marge, sous la barre d'outils */
function fitView(plan: Plan3D, s: Size): View {
    let bb = planBBox(plan);
    if (!plan.rooms.length) {
        const src = plan.source;
        bb = src && src.pxPerMeter > 0
            ? bbox([
                { x: -src.originPx.x / src.pxPerMeter, y: -src.originPx.y / src.pxPerMeter },
                { x: (src.widthPx - src.originPx.x) / src.pxPerMeter, y: (src.heightPx - src.originPx.y) / src.pxPerMeter },
            ])
            : bbox([{ x: 0, y: 0 }, { x: 8, y: 6 }]);
    }
    const top = s.w < 640 ? 112 : 72, bottom = 16, side = 16;
    const aw = Math.max(40, s.w - 2 * side), ah = Math.max(40, s.h - top - bottom);
    const k = clamp(Math.min(aw / (Math.max(bb.w, 1) + 2), ah / (Math.max(bb.h, 1) + 2)), MIN_K, MAX_K);
    const screenCy = (top + s.h - bottom) / 2;
    return { k, cx: bb.cx, cy: bb.cy - (screenCy - s.h / 2) / k };
}

/* ─────────────────────────── MAGNÉTISME ─────────────────────────── */

/** Sommet déplacé : aimant sur les sommets voisins, puis grille de 5 cm et alignement x / y */
function snapPoint(raw: Pt, points: Pt[], axes: Pt[], tol: number): { p: Pt; snap: SnapInfo } {
    let best: Pt | null = null, bd = tol;
    for (const q of points) {
        const d = dist(raw, q);
        if (d < bd) { bd = d; best = q; }
    }
    if (best) return { p: { x: best.x, y: best.y }, snap: { lines: [], point: best } };
    let x = snapGrid(raw.x), y = snapGrid(raw.y);
    let ax: Pt | null = null, ay: Pt | null = null, bx = tol, by = tol;
    for (const q of axes) {
        const dx = Math.abs(q.x - raw.x), dy = Math.abs(q.y - raw.y);
        if (dx < bx) { bx = dx; ax = q; }
        if (dy < by) { by = dy; ay = q; }
    }
    if (ax) x = ax.x;
    if (ay) y = ay.y;
    const p = { x, y };
    const lines: Guide[] = [];
    if (ax) lines.push({ a: ax, b: p });
    if (ay) lines.push({ a: ay, b: p });
    return { p, snap: { lines, point: null } };
}

/** Pièce déplacée : aimant sommet sur sommet, puis grille et alignements */
function snapTranslate(poly: Pt[], raw: Pt, targets: Pt[], tol: number): { d: Pt; snap: SnapInfo } {
    let best: { d: Pt; e: number; q: Pt } | null = null;
    for (const v of poly) {
        for (const q of targets) {
            const d = { x: q.x - v.x, y: q.y - v.y };
            const e = Math.hypot(d.x - raw.x, d.y - raw.y);
            if (e < tol && (!best || e < best.e)) best = { d, e, q };
        }
    }
    if (best) return { d: { x: r3(best.d.x), y: r3(best.d.y) }, snap: { lines: [], point: best.q } };
    let dx = snapGrid(raw.x), dy = snapGrid(raw.y);
    let bx: { v: Pt; q: Pt; e: number } | null = null, by: { v: Pt; q: Pt; e: number } | null = null;
    for (const v of poly) {
        for (const q of targets) {
            const ex = Math.abs(q.x - v.x - raw.x), ey = Math.abs(q.y - v.y - raw.y);
            if (ex < tol && (!bx || ex < bx.e)) bx = { v, q, e: ex };
            if (ey < tol && (!by || ey < by.e)) by = { v, q, e: ey };
        }
    }
    if (bx) dx = r3(bx.q.x - bx.v.x);
    if (by) dy = r3(by.q.y - by.v.y);
    const lines: Guide[] = [];
    if (bx) lines.push({ a: bx.q, b: { x: bx.v.x + dx, y: bx.v.y + dy } });
    if (by) lines.push({ a: by.q, b: { x: by.v.x + dx, y: by.v.y + dy } });
    return { d: { x: dx, y: dy }, snap: { lines, point: null } };
}

/* ─────────────────────────── DESSIN ─────────────────────────── */

/** Murs en tronçons (coupés aux ouvertures), regroupés par épaisseur */
function wallPaths(walls: Wall[]): { key: string; th: number; railing: boolean; d: string }[] {
    const groups = new Map<string, { key: string; th: number; railing: boolean; d: string }>();
    for (const w of walls) {
        const len = dist(w.a, w.b);
        if (len < 1e-6) continue;
        const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len;
        const ext = w.railing ? 0 : w.thickness / 2;
        const spans: [number, number][] = [];
        let s = 0;
        for (const o of w.openings) {
            if (o.from > s) spans.push([s, o.from]);
            s = Math.max(s, o.to);
        }
        if (s < len) spans.push([s, len]);
        const key = `${w.thickness}|${w.railing}`;
        const g = groups.get(key) ?? { key, th: w.thickness, railing: w.railing, d: "" };
        for (const [s0, s1] of spans) {
            const a = s0 <= 0 ? -ext : s0, b = s1 >= len ? len + ext : s1;
            g.d += `M${r3(w.a.x + ux * a)} ${r3(w.a.y + uy * a)}L${r3(w.a.x + ux * b)} ${r3(w.a.y + uy * b)}`;
        }
        groups.set(key, g);
    }
    return Array.from(groups.values()).sort((a, b) => a.th - b.th);
}

/** Géométrie des ouvertures à partir des murs (normale tournée vers la pièce porteuse) */
function openingShapes(walls: Wall[], plan: Plan3D): OpeningShape[] {
    const out: OpeningShape[] = [];
    for (const w of walls) {
        const len = dist(w.a, w.b);
        if (len < 1e-6) continue;
        const u = { x: (w.b.x - w.a.x) / len, y: (w.b.y - w.a.y) / len };
        for (const o of w.openings) {
            const src = plan.openings.find(x => x.id === o.id);
            const room = src ? plan.rooms.find(r => r.id === src.roomId) : undefined;
            const a = { x: w.a.x + u.x * o.from, y: w.a.y + u.y * o.from };
            const b = { x: w.a.x + u.x * o.to, y: w.a.y + u.y * o.to };
            let n = { x: -u.y, y: u.x };
            if (room) {
                const m = midPt(a, b);
                if (!pointInPolygon({ x: m.x + n.x * 0.2, y: m.y + n.y * 0.2 }, room.polygon)) n = { x: -n.x, y: -n.y };
            }
            out.push({ id: o.id, kind: o.kind, roomId: src?.roomId ?? "", a, b, u, n, th: w.thickness });
        }
    }
    return out;
}

/** Symbole d'architecte : porte (battant + arc), fenêtre (double trait), porte-fenêtre (double trait + deux vantaux) */
function OpeningGlyph({ s, selected }: { s: OpeningShape; selected: boolean }) {
    const color = selected ? ACCENT : "var(--p-fg)";
    const { a, b, u, n, th } = s;
    const w = dist(a, b);
    const at = (p: Pt, du: number, dn: number): Pt => ({ x: p.x + u.x * du + n.x * dn, y: p.y + u.y * du + n.y * dn });
    const seg = (p: Pt, q: Pt, key: string, width = 1.2, opacity = 1) => (
        <line key={key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={color} strokeWidth={width} opacity={opacity} vectorEffect="non-scaling-stroke"/>
    );
    const cross = n.x * u.y - n.y * u.x;
    const sweep = cross > 0 ? 1 : 0;
    const jambs = [seg(at(a, 0, -th / 2), at(a, 0, th / 2), "ja"), seg(at(b, 0, -th / 2), at(b, 0, th / 2), "jb")];
    const swingFill = selected ? "rgba(211, 95, 82, 0.12)" : "none";

    if (s.kind === "door") {
        const hinge = at(a, 0, th / 2), tip = at(a, 0, th / 2 + w), end = at(b, 0, th / 2);
        return (
            <g>
                {jambs}
                <path d={`M${hinge.x} ${hinge.y}L${tip.x} ${tip.y}A${w} ${w} 0 0 ${sweep} ${end.x} ${end.y}Z`} fill={swingFill} stroke="none"/>
                {seg(hinge, tip, "leaf", 1.6)}
                <path d={`M${tip.x} ${tip.y}A${w} ${w} 0 0 ${sweep} ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.75} vectorEffect="non-scaling-stroke"/>
            </g>
        );
    }
    const glass = [seg(at(a, 0, -th / 4), at(b, 0, -th / 4), "g1", 1), seg(at(a, 0, th / 4), at(b, 0, th / 4), "g2", 1)];
    if (s.kind === "window") return <g>{jambs}{glass}</g>;
    const r = w / 2;
    const hA = at(a, 0, th / 2), tA = at(a, 0, th / 2 + r), hB = at(b, 0, th / 2), tB = at(b, 0, th / 2 + r), m = at(a, r, th / 2);
    return (
        <g>
            {jambs}
            {glass}
            <path d={`M${hA.x} ${hA.y}L${tA.x} ${tA.y}A${r} ${r} 0 0 ${sweep} ${m.x} ${m.y}ZM${hB.x} ${hB.y}L${tB.x} ${tB.y}A${r} ${r} 0 0 ${1 - sweep} ${m.x} ${m.y}Z`} fill={swingFill} stroke="none"/>
            {seg(hA, tA, "la", 1, 0.8)}
            {seg(hB, tB, "lb", 1, 0.8)}
            <path d={`M${tA.x} ${tA.y}A${r} ${r} 0 0 ${sweep} ${m.x} ${m.y}M${tB.x} ${tB.y}A${r} ${r} 0 0 ${1 - sweep} ${m.x} ${m.y}`} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.65} vectorEffect="non-scaling-stroke"/>
        </g>
    );
}

/** Grille 1 m (0,5 m en traits fins) en coordonnées écran */
function gridPaths(v: View, s: Size): { minor: string; major: string } {
    if (!s.w || !s.h) return { minor: "", major: "" };
    const tl = toWorld({ x: 0, y: 0 }, v, s), br = toWorld({ x: s.w, y: s.h }, v, s);
    const majorStep = v.k >= 6 ? 1 : 5;
    const withMinor = 0.5 * v.k >= 10;
    let minor = "", major = "";
    const step = withMinor ? 0.5 : majorStep;
    const x0 = Math.floor(tl.x / step) * step, y0 = Math.floor(tl.y / step) * step;
    let count = 0;
    for (let x = x0; x <= br.x && count < 800; x += step, count++) {
        const sx = Math.round((x - v.cx) * v.k + s.w / 2) + 0.5;
        const isMajor = Math.abs(x / majorStep - Math.round(x / majorStep)) < 1e-6;
        const d = `M${sx} 0V${s.h}`;
        if (isMajor) major += d; else minor += d;
    }
    for (let y = y0; y <= br.y && count < 1600; y += step, count++) {
        const sy = Math.round((y - v.cy) * v.k + s.h / 2) + 0.5;
        const isMajor = Math.abs(y / majorStep - Math.round(y / majorStep)) < 1e-6;
        const d = `M0 ${sy}H${s.w}`;
        if (isMajor) major += d; else minor += d;
    }
    return { minor, major };
}

/* ─────────────────────────── PANNEAUX ─────────────────────────── */

const glass = "bg-[var(--p-glass)] backdrop-blur-xl border border-[var(--p-line)] shadow-[var(--p-shadow)]";

function ToolButton({ icon: Icon, label, active, disabled, danger, iconOnly, onClick }: {
    icon: typeof Plus; label: string; active?: boolean; disabled?: boolean; danger?: boolean; iconOnly?: boolean; onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={`h-9 shrink-0 ${iconOnly ? "w-9 justify-center" : "px-3"} rounded-full flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors disabled:opacity-35 disabled:pointer-events-none ${
                active
                    ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] shadow-sm"
                    : danger ? "text-[var(--p-negative)] hover:bg-[var(--p-hover)]" : "text-[var(--p-fg-2)] hover:bg-[var(--p-hover)]"
            }`}>
            <Icon size={15} strokeWidth={2.2}/>
            {!iconOnly && label}
        </button>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[14px]">
            <span className="text-[var(--p-muted)]">{label}</span>
            <span className="text-[var(--p-fg)] tabular-nums">{children}</span>
        </div>
    );
}

/** Champ numérique (virgule ou point), validé à la sortie du champ ou sur Entrée */
export function NumberField({ value, unit, onCommit, label, min = 0.1, max = 500, width = "w-[88px]" }: {
    value: number; unit: string; onCommit: (v: number) => void; label: string; min?: number; max?: number; width?: string;
}) {
    const shownValue = fmt2.format(value);
    const [text, setText] = useState<string | null>(null);
    const done = () => {
        if (text === null) return;
        const v = Number(text.replace(/\s/g, "").replace(",", "."));
        setText(null);
        if (Number.isFinite(v) && v >= min && v <= max && Math.abs(v - value) >= 0.005) onCommit(v);
    };
    return (
        <span className="inline-flex items-center gap-1">
            <input
                inputMode="decimal"
                aria-label={label}
                value={text ?? shownValue}
                onFocus={e => { setText(shownValue); requestAnimationFrame(() => e.target.select()); }}
                onChange={e => setText(e.target.value)}
                onBlur={done}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setText(null); (e.target as HTMLInputElement).blur(); } }}
                className={`${width} h-9 px-2 rounded-lg bg-[var(--p-field)] border border-[var(--p-line)] text-right text-[15px] font-semibold tabular-nums text-[var(--p-fg)] outline-none focus:border-[var(--p-accent)]`}/>
            <span className="text-[13px] text-[var(--p-muted)]">{unit}</span>
        </span>
    );
}

/** Pièce rectangulaire alignée sur les axes (dimensions éditables) */
const isAxisRect = (room: Room) => room.polygon.length === 4 && room.polygon.every((p, i) => {
    const q = room.polygon[(i + 1) % 4];
    return Math.abs(p.x - q.x) < 0.02 || Math.abs(p.y - q.y) < 0.02;
});

export function RoomInspector({ room, counted, groupedIn, compact, onTarget, onRename, onKind, onDuplicate, onDelete, onClose, onArea, onSize }: {
    room: Room;
    /** Fiche repliée au départ (peu de place pour le plan) */
    compact?: boolean;
    /** Surface comptée (avec les placards rattachés) */
    counted: number;
    /** Placard compté dans la surface d'une autre pièce (son nom) */
    groupedIn?: string | null;
    onTarget: (target: number | null) => void;
    onRename: (name: string) => void;
    onKind: (kind: RoomKind) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onClose: () => void;
    onArea: (area: number) => void;
    onSize: (axis: "x" | "y", size: number) => void;
}) {
    const bb = bbox(room.polygon);
    const rect = isAxisRect(room);
    // Téléphone : fiche repliée (nom + surface) pour laisser le plan visible
    const [open, setOpen] = useState(() => (compact !== undefined ? !compact : typeof window === "undefined" || window.innerWidth >= 640));
    if (!open) {
        return (
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0 border border-[var(--p-line-strong)]" style={{ backgroundColor: kindFill(room.kind, 1) }}/>
                <span className="flex-1 min-w-0 text-[15px] font-semibold text-[var(--p-fg)] truncate">{room.name}</span>
                {room.targetArea && <Lock size={13} className="shrink-0 text-[var(--p-muted)]" aria-label="Surface verrouillée"/>}
                <NumberField value={counted} unit="m²" label="Surface de la pièce" min={0.5} max={400} onCommit={onArea} width="w-[76px]"/>
                <button type="button" onClick={() => setOpen(true)} aria-label="Plus d'options" className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-fg-2)] hover:text-[var(--p-fg)]">
                    <ChevronUp size={16}/>
                </button>
                <button type="button" onClick={onClose} aria-label="Fermer" className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-muted)] hover:text-[var(--p-fg)]">
                    <X size={15}/>
                </button>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0 border border-[var(--p-line-strong)]" style={{ backgroundColor: kindFill(room.kind, 1) }}/>
                <input
                    value={room.name}
                    onChange={e => onRename(e.target.value)}
                    aria-label="Nom de la pièce"
                    className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-[var(--p-field)] border border-[var(--p-line)] text-[15px] font-semibold text-[var(--p-fg)] outline-none focus:border-[var(--p-accent)]"/>
                <button type="button" onClick={() => setOpen(false)} aria-label="Réduire" className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-fg-2)] hover:text-[var(--p-fg)]">
                    <ChevronDown size={16}/>
                </button>
                <button type="button" onClick={onClose} aria-label="Fermer" className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-muted)] hover:text-[var(--p-fg)]">
                    <X size={15}/>
                </button>
            </div>
            <div>
                <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--p-muted)]">Type de pièce</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {ROOM_KINDS.map(k => {
                        const on = k.id === room.kind;
                        return (
                            <button
                                key={k.id}
                                type="button"
                                onClick={() => onKind(k.id)}
                                aria-pressed={on}
                                aria-label={`Type : ${k.label}`}
                                className={`shrink-0 h-8 px-2.5 rounded-full flex items-center gap-1.5 text-[12.5px] font-medium border transition-colors ${
                                    on ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] border-transparent" : "border-[var(--p-line)] text-[var(--p-fg-2)] hover:bg-[var(--p-hover)]"
                                }`}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: kindFill(k.id, 1) }}/>
                                {k.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="rounded-2xl bg-[var(--p-card)] border border-[var(--p-line)] divide-y divide-[var(--p-line)]">
                <Row label="Surface"><NumberField value={counted} unit="m²" label="Surface de la pièce" min={0.5} max={400} onCommit={onArea}/></Row>
                {groupedIn ? (
                    <div className="px-3.5 py-2.5 text-[12.5px] text-[var(--p-muted)]">Comptée dans la surface de {groupedIn}, comme au DDT.</div>
                ) : room.targetArea ? (
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]">
                        <span className={`flex items-center gap-1.5 ${Math.abs(counted - room.targetArea) > Math.max(0.05, room.targetArea * 0.01) ? "text-[var(--p-warning)] font-semibold" : "text-[var(--p-muted)]"}`}>
                            <Lock size={13}/> Référence {fmt2.format(room.targetArea)} m²
                        </span>
                        <button type="button" onClick={() => onTarget(null)} className="text-[12.5px] font-semibold text-[var(--p-accent)] hover:opacity-80">Libérer</button>
                    </div>
                ) : (
                    <button type="button" onClick={() => onTarget(counted)} className="w-full flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold text-[var(--p-accent)] hover:bg-[var(--p-hover)]">
                        <Lock size={13}/> Verrouiller cette surface
                    </button>
                )}
                {rect ? (
                    <>
                        <Row label="Largeur ↔"><NumberField value={bb.w} unit="m" label="Largeur de la pièce" min={0.5} max={40} onCommit={v => onSize("x", v)}/></Row>
                        <Row label="Profondeur ↕"><NumberField value={bb.h} unit="m" label="Profondeur de la pièce" min={0.5} max={40} onCommit={v => onSize("y", v)}/></Row>
                    </>
                ) : (
                    <Row label="Dimensions">{fmt2.format(bb.w)} × {fmt2.format(bb.h)} m</Row>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onDuplicate} aria-label="Dupliquer la pièce" className="h-10 rounded-xl flex items-center justify-center gap-1.5 text-[14px] font-semibold bg-[var(--p-sunken)] text-[var(--p-fg)] hover:bg-[var(--p-hover)]">
                    <Copy size={15}/> Dupliquer
                </button>
                <button type="button" onClick={onDelete} aria-label="Supprimer la pièce" className="h-10 rounded-xl flex items-center justify-center gap-1.5 text-[14px] font-semibold bg-[var(--p-sunken)] text-[var(--p-negative)] hover:bg-[var(--p-hover)]">
                    <Trash2 size={15}/> Supprimer
                </button>
            </div>
            <p className="px-1 text-[11.5px] leading-snug text-[var(--p-muted)]">
                Tirez une pastille rouge pour pousser un mur : avec les surfaces verrouillées, la pièce garde sa surface (l&apos;autre dimension s&apos;ajuste) et les voisines se recalent. Glissez la pièce pour la déplacer, un sommet pour le tordre ; « + » ajoute un sommet, deux touchers le retirent.
            </p>
        </div>
    );
}

export function OpeningInspector({ opening, room, onPatch, onDelete, onClose }: {
    opening: Opening;
    room: Room | undefined;
    onPatch: (patch: Partial<Opening>) => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const kinds: { id: OpeningKind; icon: typeof Plus }[] = [
        { id: "door", icon: DoorOpen }, { id: "window", icon: AppWindow }, { id: "french", icon: Columns2 },
    ];
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-bold tracking-tight text-[var(--p-fg)] truncate">{openingLabel(opening.kind)}</div>
                    {room && <div className="text-[12.5px] text-[var(--p-muted)] truncate">{room.name}</div>}
                </div>
                <button type="button" onClick={onClose} aria-label="Fermer" className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-muted)] hover:text-[var(--p-fg)]">
                    <X size={15}/>
                </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--p-sunken)]">
                {kinds.map(({ id, icon: Icon }) => {
                    const on = id === opening.kind;
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            aria-label={openingLabel(id)}
                            onClick={() => onPatch(opening.width === OPENING_WIDTH[opening.kind] ? { kind: id, width: OPENING_WIDTH[id] } : { kind: id })}
                            className={`h-9 rounded-lg flex items-center justify-center gap-1 text-[12px] font-semibold transition-colors ${
                                on ? "bg-[var(--p-segment)] text-[var(--p-fg)] shadow-sm" : "text-[var(--p-muted)] hover:text-[var(--p-fg)]"
                            }`}>
                            <Icon size={14}/> <span className="truncate">{openingLabel(id)}</span>
                        </button>
                    );
                })}
            </div>
            <div className="rounded-2xl bg-[var(--p-card)] border border-[var(--p-line)] px-3.5 py-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                    <span className="flex justify-between text-[14px]">
                        <span className="text-[var(--p-muted)]">Largeur</span>
                        <b className="tabular-nums text-[var(--p-fg)]">{fmt2.format(opening.width)} m</b>
                    </span>
                    <input
                        type="range" min={0.6} max={3} step={0.01} value={opening.width}
                        onChange={e => onPatch({ width: Number(e.target.value) })}
                        aria-label="Largeur de l'ouverture"
                        className="w-full accent-[#d35f52]"/>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[14px] text-[var(--p-muted)]">Position sur le mur</span>
                    <input
                        type="range" min={0} max={1} step={0.01} value={opening.t}
                        onChange={e => onPatch({ t: Number(e.target.value) })}
                        aria-label="Position de l'ouverture sur le mur"
                        className="w-full accent-[#d35f52]"/>
                </label>
            </div>
            <button type="button" onClick={onDelete} aria-label="Supprimer l'ouverture" className="h-10 rounded-xl flex items-center justify-center gap-1.5 text-[14px] font-semibold bg-[var(--p-sunken)] text-[var(--p-negative)] hover:bg-[var(--p-hover)]">
                <Trash2 size={15}/> Supprimer
            </button>
            <p className="px-1 text-[11.5px] leading-snug text-[var(--p-muted)]">
                Glissez l&apos;ouverture sur le plan pour la déplacer (d&apos;un mur à l&apos;autre), tirez ses points pour l&apos;élargir.
            </p>
        </div>
    );
}

/* ─────────────────────────── ÉDITEUR ─────────────────────────── */

export default function PlanEditor2D({
    plan, onChange, selectedRoomId, onSelectRoom, declaredSurface, showSource, className, onUndo, onRedo, canUndo, canRedo,
}: PlanEditor2DProps) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [size, setSize] = useState<Size>({ w: 0, h: 0 });
    const [viewState, setViewState] = useState<View | null>(null);
    const [draft, setDraft] = useState<Plan3D | null>(null);
    const [snap, setSnap] = useState<SnapInfo>(NO_SNAP);
    const [mode, setMode] = useState<OpeningKind | null>(null);
    const [missed, setMissed] = useState(false);
    const [openingId, setOpeningId] = useState<string | null>(null);

    const pointers = useRef(new Map<number, Pt>());
    const gesture = useRef<Gesture | null>(null);
    const lastTap = useRef<{ key: string; time: number } | null>(null);

    // Recadrage automatique quand un nouveau plan (ou une nouvelle image source) arrive
    const fitKey = fitKeyOf(plan);
    const [prevFitKey, setPrevFitKey] = useState(fitKey);
    if (prevFitKey !== fitKey) {
        setPrevFitKey(fitKey);
        setViewState(null);
    }

    const shown = draft ?? plan;
    const fit = useMemo(() => fitView(plan, size), [plan, size]);
    const view = viewState ?? fit;

    const live = useRef({ view, size });
    useLayoutEffect(() => {
        live.current = { view, size };
    });

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const r = entries[0].contentRect;
            setSize(s => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Molette : zoom autour du curseur (écouteur non passif pour bloquer le défilement de la page)
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const onWheel = (ev: WheelEvent) => {
            ev.preventDefault();
            const rect = svg.getBoundingClientRect();
            const unit = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1;
            const factor = Math.exp(-ev.deltaY * unit * (ev.ctrlKey ? 0.01 : 0.0015));
            const next = zoomAt(live.current.view, live.current.size, { x: ev.clientX - rect.left, y: ev.clientY - rect.top }, factor);
            live.current = { ...live.current, view: next };
            setViewState(next);
        };
        svg.addEventListener("wheel", onWheel, { passive: false });
        return () => svg.removeEventListener("wheel", onWheel);
    }, []);

    const walls = useMemo(() => computeWalls(shown), [shown]);
    const wallLayer = useMemo(() => ({ paths: wallPaths(walls), openings: openingShapes(walls, shown) }), [walls, shown]);
    const grid = useMemo(() => gridPaths(view, size), [view, size]);

    const selRoom = shown.rooms.find(r => r.id === selectedRoomId) ?? null;
    const selOpening = shown.openings.find(o => o.id === openingId && o.roomId === selectedRoomId) ?? null;

    const area = indoorArea(shown);
    // Surfaces de référence (DDT) : verrouillées sauf si l'utilisateur les libère
    const targeted = hasTargets(shown);
    const lock = targeted && plan.lockAreas !== false;
    const gaps = targeted ? targetGaps(shown) : [];
    const declared = declaredSurface && declaredSurface > 0 ? declaredSurface : null;
    const gap = declared && area > 0 ? Math.abs(area - declared) / declared : 0;

    /* ── actions ── */

    const applyView = (v: View) => {
        live.current = { ...live.current, view: v };
        setViewState(v);
    };
    const commit = (next: Plan3D) => {
        if (!viewState) applyView(view);
        // Une édition interne (1re pièce ajoutée, dernière supprimée) ne doit pas recadrer la vue
        setPrevFitKey(fitKeyOf(next));
        setDraft(null);
        onChange(next);
    };
    const selectRoom = (id: string | null) => {
        setOpeningId(null);
        if (id !== selectedRoomId) onSelectRoom(id);
    };
    const startMode = (k: OpeningKind) => {
        setMissed(false);
        setMode(m => (m === k ? null : k));
    };
    const onAddRoom = () => {
        setMode(null);
        const res = addRoom(plan, { x: view.cx, y: view.cy });
        commit(res.plan);
        selectRoom(res.id);
    };
    const deleteSelection = () => {
        if (selOpening) {
            commit({ ...plan, openings: plan.openings.filter(o => o.id !== selOpening.id) });
            setOpeningId(null);
        } else if (selRoom) {
            commit(deleteRoom(plan, selRoom.id));
            selectRoom(null);
        }
    };
    const patchRoom = (patch: Partial<Room>) => {
        if (selRoom) commit(mapRoom(plan, selRoom.id, r => ({ ...r, ...patch })));
    };
    // L'ouverture reste entière sur son côté (largeur et position)
    const patchOpening = (patch: Partial<Opening>) => {
        if (selOpening) commit(patchOpeningOp(plan, selOpening.id, patch));
    };
    const zoomBy = (factor: number) => applyView(zoomAt(view, size, { x: size.w / 2, y: size.h / 2 }, factor));

    const placeOpening = (p: Pt) => {
        if (!mode) return;
        const tol = Math.max(0.25, 22 / view.k);
        let hit: { room: Room; edge: number; t: number; dist: number } | null = null;
        if (selRoom) {
            const ne = nearestEdge(selRoom, p);
            if (ne.dist < tol * 1.5) hit = { room: selRoom, ...ne };
        }
        if (!hit) {
            for (const r of shown.rooms) {
                const ne = nearestEdge(r, p);
                if (ne.dist < tol && (!hit || ne.dist < hit.dist)) hit = { room: r, ...ne };
            }
        }
        const res = hit ? addOpening(plan, hit.room, hit.edge, hit.t, mode) : null;
        if (!hit || !res) { setMissed(true); return; }
        commit(res.plan);
        if (hit.room.id !== selectedRoomId) onSelectRoom(hit.room.id);
        setOpeningId(res.id);
        setMode(null);
    };

    const handleTap = (tap: Tap, p: Pt) => {
        if (tap.kind === "place") placeOpening(p);
        else if (tap.kind === "empty") selectRoom(null);
        else if (tap.kind === "room") selectRoom(tap.id);
        else if (tap.kind === "opening") {
            if (tap.roomId !== selectedRoomId) onSelectRoom(tap.roomId);
            setOpeningId(tap.id);
        }
    };

    /* ── pointeurs ── */

    const localPt = (e: ReactPointerEvent): Pt => {
        const rect = svgRef.current?.getBoundingClientRect();
        return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
    };

    /** Pincement à partir des deux premiers doigts posés (vue courante, pas celle du dernier rendu) */
    const startPinch = () => {
        const [a, b] = Array.from(pointers.current.values());
        gesture.current = { type: "pinch", d0: Math.max(1, dist(a, b)), mid0: midPt(a, b), view: live.current.view };
    };

    const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
        e.currentTarget.focus({ preventScroll: true });
        const local = localPt(e);
        pointers.current.set(e.pointerId, local);

        if (pointers.current.size === 2) {
            // Deuxième doigt : on abandonne l'édition en cours et on passe au pincement
            setDraft(null);
            setSnap(NO_SNAP);
            startPinch();
            return;
        }
        if (pointers.current.size > 2) return;

        const thr = e.pointerType === "mouse" ? 4 : 9;
        const pan = (tap: Tap) => {
            gesture.current = { type: "pan", id: e.pointerId, start: local, view, thr, moved: false, tap };
        };
        if (e.pointerType === "mouse" && e.button === 1) { e.preventDefault(); pan({ kind: "none" }); return; }
        if (mode) { pan({ kind: "place" }); return; }

        const target = (e.target as Element).closest<SVGElement>("[data-hit]");
        const hit = target?.dataset.hit;
        const world = toWorld(local, view, size);

        if (selRoom && (hit === "vertex" || hit === "mid")) {
            let base = shown, index = Number(target?.dataset.index);
            const inserted = hit === "mid";
            if (inserted) {
                base = insertVertex(shown, selRoom.id, index, 0.5);
                index += 1;
                setDraft(base);
                if (!viewState) applyView(view);
            }
            const others = base.rooms.filter(r => r.id !== selRoom.id).flatMap(r => r.polygon);
            const own = base.rooms.find(r => r.id === selRoom.id)?.polygon.filter((_, i) => i !== index) ?? [];
            gesture.current = {
                type: "vertex", id: e.pointerId, start: local, thr, moved: false, inserted,
                roomId: selRoom.id, index, base, result: base, points: others, axes: [...others, ...own],
            };
            return;
        }
        if (selRoom && hit === "wall") {
            const grab = grabWall(shown, selRoom.id, Number(target?.dataset.index));
            if (grab) {
                // Arrêts magnétiques : alignement sur les autres cloisons parallèles (coordonnée le long de n)
                const moving = new Set(grab.refs.map(r => `${r.roomId}:${r.index}`));
                const stops = shown.rooms.flatMap(r => r.polygon.filter((_, i) => !moving.has(`${r.id}:${i}`)).map(p => wallOffset(grab, p)));
                gesture.current = { type: "wall", id: e.pointerId, start: local, thr, moved: false, grab, off0: wallOffset(grab, world), base: shown, result: null, stops, d: 0 };
                return;
            }
        }
        if (hit === "oend") {
            gesture.current = {
                type: "openingEnd", id: e.pointerId, start: local, thr, moved: false,
                openingId: target?.dataset.id ?? "", end: target?.dataset.end === "a" ? "a" : "b", base: shown, result: null,
            };
            return;
        }
        if (hit === "opening") {
            const oid = target?.dataset.id ?? "", rid = target?.dataset.room ?? "";
            const o = shown.openings.find(x => x.id === oid);
            const room = o && shown.rooms.find(r => r.id === o.roomId);
            const c = o && room ? edgePoint(room, o.edge, o.t) : world;
            gesture.current = {
                type: "opening", id: e.pointerId, start: local, thr, moved: false,
                openingId: oid, roomId: rid, grabOffset: { x: c.x - world.x, y: c.y - world.y }, base: shown, result: null,
            };
            return;
        }
        if (hit === "room") {
            const id = target?.dataset.id ?? "";
            if (selRoom && id === selRoom.id) {
                gesture.current = {
                    type: "room", id: e.pointerId, start: local, thr, moved: false, origin: world, roomId: id, base: shown, result: null,
                    targets: shown.rooms.filter(r => r.id !== id).flatMap(r => r.polygon),
                };
                return;
            }
            pan({ kind: "room", id });
            return;
        }
        pan({ kind: "empty" });
    };

    const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
        if (!pointers.current.has(e.pointerId)) return;
        const local = localPt(e);
        pointers.current.set(e.pointerId, local);
        const g = gesture.current;
        if (!g) return;

        if (g.type === "pinch") {
            if (pointers.current.size < 2) return;
            const [a, b] = Array.from(pointers.current.values());
            const m = midPt(a, b);
            const k = clamp(g.view.k * dist(a, b) / g.d0, MIN_K, MAX_K);
            const w0 = toWorld(g.mid0, g.view, size);
            applyView({ k, cx: w0.x - (m.x - size.w / 2) / k, cy: w0.y - (m.y - size.h / 2) / k });
            return;
        }
        if (g.id !== e.pointerId) return;
        if (!g.moved && dist(local, g.start) < g.thr) return;
        g.moved = true;

        if (g.type === "pan") {
            applyView({ k: g.view.k, cx: g.view.cx - (local.x - g.start.x) / g.view.k, cy: g.view.cy - (local.y - g.start.y) / g.view.k });
            return;
        }
        if (!viewState) applyView(view);
        const tol = clamp(8 / view.k, 0.15, 0.3);
        const world = toWorld(local, view, size);
        if (g.type === "wall") {
            const raw = wallOffset(g.grab, world) - g.off0 + wallOffset(g.grab, g.grab.a);
            // Aimant : autre cloison alignée, sinon pas de 5 cm
            let off = snapGrid(raw), guide: number | null = null, bd = tol;
            for (const st of g.stops) if (Math.abs(st - raw) < bd) { bd = Math.abs(st - raw); off = st; guide = st; }
            const d = clamp(off - wallOffset(g.grab, g.grab.a), g.grab.min, g.grab.max);
            g.d = d;
            // Surfaces verrouillées : aperçu rapide du recalage pendant le glissé
            g.result = dragWall(g.base, g.grab, d, { lock, fast: true });
            setDraft(g.result);
            const { a, b, n } = { ...g.grab };
            setSnap(guide !== null
                ? { lines: [{ a: { x: a.x + n.x * d - (b.x - a.x) * 2, y: a.y + n.y * d - (b.y - a.y) * 2 }, b: { x: b.x + n.x * d + (b.x - a.x) * 2, y: b.y + n.y * d + (b.y - a.y) * 2 } }], point: null }
                : NO_SNAP);
            return;
        }
        if (g.type === "opening") {
            g.result = moveOpening(g.base, g.openingId, { x: world.x + g.grabOffset.x, y: world.y + g.grabOffset.y });
            setDraft(g.result);
            return;
        }
        if (g.type === "openingEnd") {
            g.result = resizeOpening(g.base, g.openingId, g.end, world);
            setDraft(g.result);
            return;
        }
        if (g.type === "vertex") {
            const { p, snap: s } = snapPoint(world, g.points, g.axes, tol);
            g.result = setVertex(g.base, g.roomId, g.index, p);
            setDraft(g.result);
            setSnap(s);
            return;
        }
        const poly = g.base.rooms.find(r => r.id === g.roomId)?.polygon ?? [];
        const { d, snap: s } = snapTranslate(poly, { x: world.x - g.origin.x, y: world.y - g.origin.y }, g.targets, tol);
        g.result = translateRoom(g.base, g.roomId, d);
        setDraft(g.result);
        setSnap(s);
    };

    const endPointer = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
        // pointerup puis lostpointercapture : le second appel est ignoré
        if (!pointers.current.delete(e.pointerId)) return;
        const g = gesture.current;
        if (!g) return;
        if (g.type === "pinch") {
            const rest = Array.from(pointers.current.entries());
            if (rest.length >= 2) startPinch();
            else gesture.current = rest.length === 1
                ? { type: "pan", id: rest[0][0], start: rest[0][1], view: live.current.view, thr: 0, moved: true, tap: { kind: "none" } }
                : null;
            return;
        }
        if (g.id !== e.pointerId) return;
        gesture.current = null;
        setSnap(NO_SNAP);
        if (cancelled) { setDraft(null); return; }

        if (g.type === "pan") {
            if (!g.moved) handleTap(g.tap, toWorld(localPt(e), view, size));
            return;
        }
        if (g.type === "wall" && g.moved && lock) {
            // Relâché : recalage complet (surfaces exactes)
            commit(dragWall(g.base, g.grab, g.d, { lock }));
            return;
        }
        if (g.type === "room" || g.type === "wall" || g.type === "openingEnd") {
            if (g.moved && g.result) commit(g.result);
            else if (g.type === "room") setOpeningId(null);
            else setDraft(null);
            return;
        }
        if (g.type === "opening") {
            if (g.moved && g.result) {
                commit(g.result);
                const moved = g.result.openings.find(o => o.id === g.openingId);
                if (moved && moved.roomId !== selectedRoomId) onSelectRoom(moved.roomId);
                setOpeningId(g.openingId);
            } else {
                setDraft(null);
                handleTap({ kind: "opening", id: g.openingId, roomId: g.roomId }, toWorld(localPt(e), view, size));
            }
            return;
        }
        if (g.moved || g.inserted) { commit(g.result); return; }
        // Double toucher sur un sommet : suppression
        const key = `${g.roomId}:${g.index}`;
        const prev = lastTap.current;
        if (prev && prev.key === key && e.timeStamp - prev.time < 400) {
            lastTap.current = null;
            const next = deleteVertex(g.base, g.roomId, g.index);
            if (next) commit(next);
        } else {
            lastTap.current = { key, time: e.timeStamp };
        }
    };

    const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (e.key === "Escape") {
            if (mode) setMode(null); else selectRoom(null);
        } else if ((e.key === "Delete" || e.key === "Backspace") && (selOpening || selRoom)) {
            e.preventDefault();
            deleteSelection();
        }
    };

    /* ── rendu ── */

    const src = showSource !== false && plan.source?.imageUrl && plan.source.pxPerMeter > 0 ? plan.source : null;
    const T = `translate(${size.w / 2 - view.cx * view.k} ${size.h / 2 - view.cy * view.k}) scale(${view.k})`;
    const S = (p: Pt) => toScreen(p, view, size);

    const labels = shown.rooms.map(r => {
        const bb = bbox(r.polygon);
        const wpx = bb.w * view.k, hpx = bb.h * view.k;
        if (wpx < 36 || hpx < 22) return null;
        const c = S(centroid(r.polygon));
        const withArea = hpx >= 38;
        return (
            <g key={r.id} transform={`translate(${c.x} ${c.y})`} style={{ pointerEvents: "none" }}>
                <text
                    y={withArea ? -7 : 0} textAnchor="middle" dominantBaseline="central"
                    fontSize={12.5} fontWeight={650} letterSpacing="-0.01em"
                    style={{ fill: "var(--p-fg)", stroke: "var(--p-card)", strokeWidth: 3, paintOrder: "stroke", strokeLinejoin: "round" }}>
                    {r.name.length * 7 > wpx ? `${r.name.slice(0, Math.max(3, Math.floor(wpx / 7) - 1))}…` : r.name}
                </text>
                {withArea && (
                    <text
                        y={9} textAnchor="middle" dominantBaseline="central" fontSize={11.5} fontWeight={500}
                        style={{ fill: "var(--p-muted)", stroke: "var(--p-card)", strokeWidth: 3, paintOrder: "stroke", strokeLinejoin: "round", fontVariantNumeric: "tabular-nums" }}>
                        {fmt1.format(roomArea(r))} m²
                    </text>
                )}
            </g>
        );
    });

    let selection: ReactNode = null;
    if (selRoom && !mode) {
        const poly = selRoom.polygon;
        const n = poly.length;
        const edges = poly.map((a, i) => {
            const b = poly[(i + 1) % n];
            const len = dist(a, b);
            const m = midPt(a, b);
            let nx = 0, ny = 0;
            if (len > 1e-6) {
                nx = -(b.y - a.y) / len; ny = (b.x - a.x) / len;
                if (pointInPolygon({ x: m.x + nx * 0.05, y: m.y + ny * 0.05 }, poly)) { nx = -nx; ny = -ny; }
            }
            const q = { x: a.x + (b.x - a.x) * 0.22, y: a.y + (b.y - a.y) * 0.22 };
            const th = wallHandleT(shown, selRoom, i);
            const hm = { x: a.x + (b.x - a.x) * th, y: a.y + (b.y - a.y) * th };
            const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            return { i, len, sm: S(m), sh: S(hm), sq: S(q), ang, nx, ny, px: len * view.k };
        });
        selection = (
            <g>
                {edges.filter(ed => ed.px >= 34).map(ed => (
                    <text
                        key={`l${ed.i}`} x={ed.sm.x + ed.nx * 22} y={ed.sm.y + ed.ny * 22}
                        textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}
                        style={{ pointerEvents: "none", fill: ACCENT, stroke: "var(--p-card)", strokeWidth: 3.5, paintOrder: "stroke", strokeLinejoin: "round", fontVariantNumeric: "tabular-nums" }}>
                        {fmt2.format(ed.len)} m
                    </text>
                ))}
                {!draft && edges.filter(ed => ed.px >= 130).map(ed => (
                    <g key={`m${ed.i}`} data-hit="mid" data-index={ed.i} style={{ cursor: "copy" }} aria-label="Ajouter un sommet">
                        <circle cx={ed.sq.x} cy={ed.sq.y} r={14} fill="transparent" style={{ pointerEvents: "all" }}/>
                        <circle cx={ed.sq.x} cy={ed.sq.y} r={6.5} fill="var(--p-card)" stroke={ACCENT} strokeWidth={1.25} strokeOpacity={0.7}/>
                        <path d={`M${ed.sq.x - 3} ${ed.sq.y}H${ed.sq.x + 3}M${ed.sq.x} ${ed.sq.y - 3}V${ed.sq.y + 3}`} stroke={ACCENT} strokeWidth={1.5} strokeLinecap="round"/>
                    </g>
                ))}
                {/* Poignées de mur : glisser pour pousser / tirer la cloison (la pièce voisine suit) */}
                {edges.filter(ed => ed.px >= 30).map(ed => {
                    const horizontalish = Math.abs(ed.nx) < Math.abs(ed.ny);
                    return (
                        <g key={`w${ed.i}`} data-hit="wall" data-index={ed.i} style={{ cursor: horizontalish ? "ns-resize" : "ew-resize" }} aria-label="Déplacer le mur"
                            transform={`translate(${ed.sh.x} ${ed.sh.y}) rotate(${ed.ang})`}>
                            <rect x={-22} y={-16} width={44} height={32} fill="transparent" style={{ pointerEvents: "all" }}/>
                            <rect x={-13} y={-4.5} width={26} height={9} rx={4.5} fill={ACCENT} stroke="var(--p-card)" strokeWidth={2}
                                style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}/>
                            <path d="M-5 -1.2H5M-5 1.8H5" stroke="var(--p-card)" strokeWidth={1} strokeLinecap="round" opacity={0.9}/>
                        </g>
                    );
                })}
                {poly.map((p, i) => {
                    const s = S(p);
                    return (
                        <g key={`v${i}`} data-hit="vertex" data-index={i} style={{ cursor: "grab" }}>
                            <circle cx={s.x} cy={s.y} r={18} fill="transparent" style={{ pointerEvents: "all" }}/>
                            <circle cx={s.x} cy={s.y} r={7} fill="var(--p-card)" stroke={ACCENT} strokeWidth={2.5} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}/>
                        </g>
                    );
                })}
            </g>
        );
    }

    const hintText = missed ? "Aucun mur ici — touchez un côté de pièce" : "Touchez un mur de la pièce";

    return (
        <div
            ref={wrapRef}
            onKeyDown={onKeyDown}
            className={`relative w-full h-full overflow-hidden select-none bg-[var(--p-card)] ${className ?? ""}`}>
            <svg
                ref={svgRef}
                width={size.w}
                height={size.h}
                tabIndex={0}
                role="application"
                aria-label="Plan 2D éditable"
                className="absolute inset-0 w-full h-full outline-none"
                style={{ touchAction: "none", cursor: mode ? "crosshair" : "default" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={e => endPointer(e, false)}
                onPointerCancel={e => endPointer(e, true)}
                onLostPointerCapture={e => { if (e.target === e.currentTarget) endPointer(e, true); }}
                onContextMenu={e => e.preventDefault()}>
                {!src && (
                    <g style={{ pointerEvents: "none" }}>
                        <path d={grid.minor} stroke="var(--p-line)" strokeWidth={1} fill="none"/>
                        <path d={grid.major} stroke="var(--p-line-strong)" strokeWidth={1} fill="none"/>
                    </g>
                )}
                <g transform={T}>
                    {src && (
                        <image
                            href={src.imageUrl}
                            x={-src.originPx.x / src.pxPerMeter}
                            y={-src.originPx.y / src.pxPerMeter}
                            width={src.widthPx / src.pxPerMeter}
                            height={src.heightPx / src.pxPerMeter}
                            opacity={0.55}
                            preserveAspectRatio="none"
                            style={{ pointerEvents: "none" }}/>
                    )}
                    {shown.rooms.map(r => (
                        <polygon
                            key={r.id}
                            data-hit="room"
                            data-id={r.id}
                            points={r.polygon.map(p => `${p.x},${p.y}`).join(" ")}
                            fill={kindFill(r.kind, r.id === selectedRoomId ? 0.5 : 0.34)}
                            stroke="var(--p-fg)"
                            strokeOpacity={0.3}
                            strokeWidth={1}
                            strokeDasharray={isOutdoor(r) ? "4 3" : undefined}
                            vectorEffect="non-scaling-stroke"
                            style={{ cursor: r.id === selectedRoomId ? "move" : "pointer" }}/>
                    ))}
                    <g style={{ pointerEvents: "none" }}>
                        {wallLayer.paths.map(p => (
                            <path
                                key={p.key} d={p.d} fill="none" stroke="var(--p-fg)" strokeWidth={p.th} strokeLinecap="butt"
                                strokeOpacity={p.railing ? 0.55 : 0.88}/>
                        ))}
                        {wallLayer.openings.map(o => <OpeningGlyph key={o.id} s={o} selected={o.id === selOpening?.id}/>)}
                        {selRoom && (
                            <polygon
                                points={selRoom.polygon.map(p => `${p.x},${p.y}`).join(" ")}
                                fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
                        )}
                    </g>
                </g>
                {labels}
                {!mode && wallLayer.openings.map(o => {
                    const a = S(o.a), b = S(o.b);
                    return (
                        <line
                            key={`h${o.id}`} data-hit="opening" data-id={o.id} data-room={o.roomId}
                            x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={26} strokeLinecap="round"
                            style={{ pointerEvents: "stroke", cursor: "grab" }}/>
                    );
                })}
                {selection}
                {selOpening && !mode && (() => {
                    const ends = openingEnds(shown, selOpening);
                    if (!ends) return null;
                    return (["a", "b"] as const).map(k => {
                        const p = S(ends[k]);
                        return (
                            <g key={k} data-hit="oend" data-id={selOpening.id} data-end={k} style={{ cursor: "col-resize" }} aria-label="Élargir l'ouverture">
                                <circle cx={p.x} cy={p.y} r={16} fill="transparent" style={{ pointerEvents: "all" }}/>
                                <circle cx={p.x} cy={p.y} r={6.5} fill={ACCENT} stroke="var(--p-card)" strokeWidth={2} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}/>
                            </g>
                        );
                    });
                })()}
                {(snap.lines.length > 0 || snap.point) && (
                    <g style={{ pointerEvents: "none" }}>
                        {snap.lines.map((l, i) => {
                            const a = S(l.a), b = S(l.b);
                            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ACCENT} strokeWidth={1} strokeDasharray="4 4" opacity={0.9}/>;
                        })}
                        {snap.lines.map((l, i) => {
                            const a = S(l.a);
                            return <circle key={`p${i}`} cx={a.x} cy={a.y} r={3} fill={ACCENT}/>;
                        })}
                        {snap.point && (() => {
                            const p = S(snap.point);
                            return <circle cx={p.x} cy={p.y} r={12} fill="none" stroke={ACCENT} strokeWidth={1.5} opacity={0.9}/>;
                        })()}
                    </g>
                )}
            </svg>

            {/* Barre d'outils et surface */}
            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className={`order-2 sm:order-1 pointer-events-auto self-start max-w-full rounded-2xl px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${glass}`}>
                    <span className="text-[var(--p-muted)]">Surface habitable</span>
                    <b className="font-bold tabular-nums text-[var(--p-fg)]">{fmt1.format(area)} m²</b>
                    {targeted ? (
                        <>
                            <button
                                type="button"
                                onClick={() => commit({ ...plan, lockAreas: !lock })}
                                aria-pressed={lock}
                                title={lock ? "Les pièces gardent leur surface du DDT quand vous déplacez un mur" : "Surfaces libres"}
                                className={`h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[12px] font-semibold ${lock ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)]" : "bg-[var(--p-sunken)] text-[var(--p-muted)]"}`}>
                                {lock ? <Lock size={12}/> : <LockOpen size={12}/>} Surfaces DDT
                            </button>
                            {gaps.length ? (
                                <>
                                    <span className="flex items-center gap-1 text-[var(--p-warning)] font-semibold">
                                        <TriangleAlert size={13}/>{gaps.length} pièce{gaps.length > 1 ? "s" : ""} à ajuster
                                    </span>
                                    <button type="button" onClick={() => commit(relock(plan))}
                                        className="h-7 px-2.5 rounded-full text-[12px] font-semibold bg-[var(--p-accent-soft)] text-[var(--p-accent)] hover:opacity-85">
                                        Recaler
                                    </button>
                                </>
                            ) : (
                                <span className="flex items-center gap-1 text-[var(--p-positive)] font-semibold"><Check size={13}/> justes</span>
                            )}
                        </>
                    ) : declared && (
                        <span className={`flex items-center gap-1 tabular-nums ${gap > 0.03 ? "text-[var(--p-warning)] font-semibold" : "text-[var(--p-muted)]"}`}>
                            {gap > 0.03 && <TriangleAlert size={13}/>}· déclarée {fmt0.format(declared)} m²
                        </span>
                    )}
                    {!targeted && declared && area > 0 && gap > 0.005 && (
                        <button
                            type="button"
                            onClick={() => { onChange(scaleToArea(plan, declared)); setViewState(null); }}
                            aria-label={`Ajuster le plan à ${fmt0.format(declared)} m²`}
                            className="h-7 px-2.5 rounded-full text-[12px] font-semibold bg-[var(--p-accent-soft)] text-[var(--p-accent)] hover:opacity-85">
                            Ajuster à {fmt0.format(declared)} m²
                        </button>
                    )}
                </div>
                <div className="order-1 sm:order-2 min-w-0 flex flex-col items-stretch sm:items-end gap-2">
                    <div className={`pointer-events-auto max-w-full rounded-full p-1 flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${glass}`}>
                        <ToolButton icon={SquarePlus} label="Pièce" onClick={onAddRoom}/>
                        <ToolButton icon={DoorOpen} label="Porte" active={mode === "door"} onClick={() => startMode("door")}/>
                        <ToolButton icon={AppWindow} label="Fenêtre" active={mode === "window"} onClick={() => startMode("window")}/>
                        <ToolButton icon={Columns2} label="Porte-fenêtre" active={mode === "french"} onClick={() => startMode("french")}/>
                        <ToolButton icon={Trash2} label="Supprimer" danger disabled={!selRoom && !selOpening} onClick={deleteSelection}/>
                    </div>
                    {mode && (
                        <div className={`pointer-events-auto self-center sm:self-end rounded-full pl-3.5 pr-1 py-1 flex items-center gap-2 text-[13px] font-medium ${glass} ${missed ? "text-[var(--p-warning)]" : "text-[var(--p-fg)]"}`}>
                            <span>{hintText}</span>
                            <button type="button" onClick={() => setMode(null)} aria-label="Annuler l'ajout" className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-muted)] hover:text-[var(--p-fg)]">
                                <X size={14}/>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Inspecteur (feuille en bas sur téléphone, carte latérale sur ordinateur) et zoom */}
            <div className="pointer-events-none absolute inset-x-2 bottom-2 top-28 sm:inset-x-auto sm:right-3 sm:bottom-3 sm:top-20 z-10 flex flex-col justify-end items-end gap-2">
                <div className={`order-1 sm:order-2 pointer-events-auto rounded-full p-1 flex items-center gap-0.5 ${glass}`}>
                    {onUndo && (
                        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Annuler" title="Annuler" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--p-fg-2)] hover:bg-[var(--p-hover)] disabled:opacity-30">
                            <Undo2 size={16}/>
                        </button>
                    )}
                    {onRedo && (
                        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Rétablir" title="Rétablir" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--p-fg-2)] hover:bg-[var(--p-hover)] disabled:opacity-30">
                            <Redo2 size={16}/>
                        </button>
                    )}
                    {(onUndo || onRedo) && <span className="w-px h-5 bg-[var(--p-line)] mx-0.5"/>}
                    <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom arrière" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--p-fg-2)] hover:bg-[var(--p-hover)]">
                        <Minus size={16}/>
                    </button>
                    <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom avant" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--p-fg-2)] hover:bg-[var(--p-hover)]">
                        <Plus size={16}/>
                    </button>
                    <button type="button" onClick={() => setViewState(null)} aria-label="Recadrer le plan" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--p-fg-2)] hover:bg-[var(--p-hover)]">
                        <Maximize2 size={15}/>
                    </button>
                </div>
                {(selOpening || selRoom) && !mode && (
                    <div className={`order-2 sm:order-1 pointer-events-auto w-full sm:w-80 min-h-0 max-h-[46vh] sm:max-h-full overflow-y-auto rounded-[24px] p-3 sm:p-4 ${glass}`}>
                        <div className="sm:hidden mx-auto -mt-1.5 mb-2.5 w-9 h-1 rounded-full bg-[var(--p-line-strong)]"/>
                        {selOpening ? (
                            <OpeningInspector
                                opening={selOpening}
                                room={shown.rooms.find(r => r.id === selOpening.roomId)}
                                onPatch={patchOpening}
                                onDelete={deleteSelection}
                                onClose={() => setOpeningId(null)}/>
                        ) : selRoom && (
                            <RoomInspector
                                room={selRoom}
                                onRename={name => patchRoom({ name })}
                                onKind={kind => patchRoom(selRoom.name === NEW_ROOM || selRoom.name === kindLabel(selRoom.kind) ? { kind, name: kindLabel(kind) } : { kind })}
                                onDuplicate={() => {
                                    const res = duplicateRoom(plan, selRoom.id);
                                    if (res) { commit(res.plan); selectRoom(res.id); }
                                }}
                                onDelete={deleteSelection}
                                onClose={() => selectRoom(null)}
                                compact={size.w < 720}
                                counted={countedArea(shown, selRoom)}
                                groupedIn={(() => { const o = placardGroups(shown).get(selRoom.id); return o ? shown.rooms.find(r => r.id === o)?.name ?? null : null; })()}
                                onTarget={t => commit(t ? relock(setRoomTarget(plan, selRoom.id, t)) : setRoomTarget(plan, selRoom.id, null))}
                                onArea={a => commit(setRoomArea(plan, selRoom.id, a))}
                                onSize={(axis, v) => commit(setRoomSize(plan, selRoom.id, axis, v, lock))}/>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
