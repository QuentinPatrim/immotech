"use client";

/* ============================================================
   PLAN 3D — POIGNÉES D'ÉDITION DANS LA SCÈNE
   Sur la pièce sélectionnée (vues Maquette et Dessus) :
   - pastille rouge au milieu de chaque mur : glisser pousse ou
     tire la cloison (la pièce voisine suit) ;
   - pastille ronde sur chaque porte / fenêtre : glisser la déplace
     le long des murs ; ses deux points l'élargissent ;
   - pastille centrale : déplace la pièce.
   Les poignées flottent au-dessus des murs (toujours visibles) ;
   le pointeur est projeté sur le plan horizontal des poignées.
   La caméra est figée pendant un glissé.
   ============================================================ */

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { Plan3D, Pt, Room } from "@/lib/plan3d/types";
import { centroid, edgePoint, pointInPolygon, roomEdge } from "@/lib/plan3d/geometry";
import { grabWall, moveOpening, moveWall, openingEnds, resizeOpening, snapGrid, translateRoom, wallHandleT, wallOffset, type WallGrab } from "@/lib/plan3d/edit";

const ACCENT = "#d35f52";

type Drag =
    | { type: "wall"; grab: WallGrab; off0: number; base: Plan3D }
    | { type: "opening"; id: string; offset: Pt; base: Plan3D }
    | { type: "end"; id: string; end: "a" | "b"; base: Plan3D }
    | { type: "room"; id: string; p0: Pt; base: Plan3D };

interface Props {
    plan: Plan3D;
    room: Room;
    ox: number;
    oy: number;
    /** Taille des poignées (m), selon l'emprise du plan */
    size: number;
    selectedOpeningId: string | null;
    onSelectOpening: (id: string | null) => void;
    onDraft: (plan: Plan3D | null) => void;
    onCommit: (plan: Plan3D) => void;
}

export default function EditHandles3D({ plan, room, ox, oy, size, selectedOpeningId, onSelectOpening, onDraft, onCommit }: Props) {
    const get = useThree(s => s.get);
    /** Caméra figée pendant un glissé */
    const freeze = (on: boolean) => {
        const c = get().controls as { enabled: boolean } | null;
        if (c) c.enabled = !on;
    };
    const wallH = plan.wallHeight || 2.5;
    const y = wallH + 0.12;
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), [y]);
    // État du glissé en cours (lu et écrit uniquement dans les gestionnaires d'événements)
    const live = useRef<{ drag: Drag | null; last: Plan3D | null; downAt: { x: number; y: number } | null }>({ drag: null, last: null, downAt: null });
    const [hover, setHover] = useState<string | null>(null);

    /** Point du plan (m) sous le pointeur, à la hauteur des poignées */
    const planPoint = (e: ThreeEvent<PointerEvent>): Pt | null => {
        const hit = e.ray.intersectPlane(plane, new THREE.Vector3());
        return hit ? { x: hit.x + ox, y: hit.z + oy } : null;
    };

    const begin = (e: ThreeEvent<PointerEvent>, d: Drag) => {
        e.stopPropagation();
        (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
        freeze(true);
        live.current.drag = d;
        live.current.last = null;
        live.current.downAt = { x: e.clientX, y: e.clientY };
    };

    const move = (e: ThreeEvent<PointerEvent>) => {
        const d = live.current.drag;
        if (!d) return;
        e.stopPropagation();
        const p = planPoint(e);
        if (!p) return;
        let next: Plan3D;
        if (d.type === "wall") next = moveWall(d.base, d.grab, snapGrid(wallOffset(d.grab, p) - d.off0));
        else if (d.type === "opening") next = moveOpening(d.base, d.id, { x: p.x + d.offset.x, y: p.y + d.offset.y });
        else if (d.type === "end") next = resizeOpening(d.base, d.id, d.end, p);
        else next = translateRoom(d.base, d.id, { x: snapGrid(p.x - d.p0.x), y: snapGrid(p.y - d.p0.y) });
        live.current.last = next;
        onDraft(next);
    };

    const end = (e: ThreeEvent<PointerEvent>) => {
        const d = live.current.drag;
        if (!d) return;
        e.stopPropagation();
        (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
        live.current.drag = null;
        freeze(false);
        const moved = live.current.downAt ? Math.hypot(e.clientX - live.current.downAt.x, e.clientY - live.current.downAt.y) > 4 : false;
        const result = live.current.last;
        live.current.last = null;
        onDraft(null);
        if (moved && result) onCommit(result);
        else if (d.type === "opening") onSelectOpening(d.id);
    };

    const at = (p: Pt): [number, number, number] => [p.x - ox, y, p.y - oy];
    const hoverProps = (key: string) => ({
        onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(key); document.body.style.cursor = "grab"; },
        onPointerOut: () => { setHover(h => (h === key ? null : h)); document.body.style.cursor = ""; },
    });

    const n = room.polygon.length;
    const edges = room.polygon.map((a, i) => {
        const { b, length } = roomEdge(room, i);
        const t = wallHandleT(plan, room, i);
        return { i, a, b, length, mid: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, angle: Math.atan2(-(b.y - a.y), b.x - a.x) };
    }).filter(ed => ed.length >= 0.35);

    const openings = plan.openings.filter(o => o.roomId === room.id);
    const c = centroid(room.polygon);
    // Poignée de déplacement sous l'étiquette de la pièce, si elle tombe dans la pièce
    let mover = { x: c.x, y: c.y + Math.max(0.9, size * 2.6) };
    if (!pointInPolygon(mover, room.polygon)) mover = c;

    const s = size;
    const top = { depthTest: false, depthWrite: false, transparent: true } as const;

    return (
        <group renderOrder={10}>
            {/* Murs */}
            {edges.map(ed => {
                const key = `w${ed.i}`, on = hover === key;
                return (
                    <group key={key} position={at(ed.mid)} rotation={[0, ed.angle, 0]}>
                        <mesh
                            onPointerMove={move} onPointerUp={end} onPointerCancel={end} {...hoverProps(key)}
                            onPointerDown={e => {
                                const g = grabWall(plan, room.id, ed.i);
                                const p = planPoint(e);
                                if (g && p) begin(e, { type: "wall", grab: g, off0: wallOffset(g, p), base: plan });
                            }}>
                            <boxGeometry args={[Math.min(ed.length * 0.8, s * 2.2), 0.05, s * 1.6]}/>
                            <meshBasicMaterial {...top} toneMapped={false} opacity={0} />
                        </mesh>
                        <mesh renderOrder={11} scale={on ? 1.15 : 1}>
                            <boxGeometry args={[Math.min(ed.length * 0.6, s * 1.3), 0.04, s * 0.38]}/>
                            <meshBasicMaterial {...top} toneMapped={false} color={ACCENT} opacity={1} />
                        </mesh>
                        <mesh renderOrder={10} scale={on ? 1.15 : 1}>
                            <boxGeometry args={[Math.min(ed.length * 0.6, s * 1.3) + s * 0.12, 0.03, s * 0.5]}/>
                            <meshBasicMaterial {...top} toneMapped={false} color="#ffffff" opacity={1} />
                        </mesh>
                    </group>
                );
            })}

            {/* Portes et fenêtres */}
            {/* eslint-disable-next-line react-hooks/refs -- la référence n'est lue que dans les gestionnaires de pointeur */}
            {openings.map(o => {
                const r = plan.rooms.find(x => x.id === o.roomId);
                if (!r || o.edge >= r.polygon.length) return null;
                const center = edgePoint(r, o.edge, o.t);
                const key = `o${o.id}`, on = hover === key, sel = o.id === selectedOpeningId;
                const ends = sel ? openingEnds(plan, o) : null;
                return (
                    <group key={key}>
                        <mesh
                            position={at(center)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} {...hoverProps(key)}
                            onPointerDown={e => {
                                const p = planPoint(e);
                                if (p) begin(e, { type: "opening", id: o.id, offset: { x: center.x - p.x, y: center.y - p.y }, base: plan });
                            }}>
                            <cylinderGeometry args={[s * 0.75, s * 0.75, 0.05, 24]}/>
                            <meshBasicMaterial {...top} toneMapped={false} opacity={0} />
                        </mesh>
                        <mesh position={at(center)} renderOrder={11} scale={on ? 1.15 : 1}>
                            <cylinderGeometry args={[s * 0.34, s * 0.34, 0.04, 28]}/>
                            <meshBasicMaterial {...top} toneMapped={false} color={sel ? ACCENT : "#ffffff"} opacity={1} />
                        </mesh>
                        <mesh position={at(center)} renderOrder={10} scale={on ? 1.15 : 1}>
                            <cylinderGeometry args={[s * 0.44, s * 0.44, 0.03, 28]}/>
                            <meshBasicMaterial {...top} toneMapped={false} color={sel ? "#ffffff" : ACCENT} opacity={1} />
                        </mesh>
                        {ends && (["a", "b"] as const).map(k => (
                            <group key={k} position={at(ends[k])}>
                                <mesh
                                    onPointerMove={move} onPointerUp={end} onPointerCancel={end} {...hoverProps(`${key}${k}`)}
                                    onPointerDown={e => begin(e, { type: "end", id: o.id, end: k, base: plan })}>
                                    <sphereGeometry args={[s * 0.6, 12, 12]}/>
                                    <meshBasicMaterial {...top} toneMapped={false} opacity={0} />
                                </mesh>
                                <mesh renderOrder={12}>
                                    <sphereGeometry args={[s * 0.2, 16, 16]}/>
                                    <meshBasicMaterial {...top} toneMapped={false} color={ACCENT} opacity={1} />
                                </mesh>
                            </group>
                        ))}
                    </group>
                );
            })}

            {/* Déplacement de la pièce */}
            {n >= 3 && (
                <group position={at(mover)}>
                    <mesh
                        onPointerMove={move} onPointerUp={end} onPointerCancel={end} {...hoverProps("room")}
                        onPointerDown={e => {
                            const p = planPoint(e);
                            if (p) begin(e, { type: "room", id: room.id, p0: p, base: plan });
                        }}>
                        <cylinderGeometry args={[s * 0.8, s * 0.8, 0.05, 24]}/>
                        <meshBasicMaterial {...top} toneMapped={false} opacity={0} />
                    </mesh>
                    <mesh renderOrder={10} scale={hover === "room" ? 1.12 : 1}>
                        <cylinderGeometry args={[s * 0.42, s * 0.42, 0.03, 28]}/>
                        <meshBasicMaterial {...top} toneMapped={false} color="#1d1d1f" opacity={0.88} />
                    </mesh>
                    {[0, Math.PI / 2].map(rot => (
                        <mesh key={rot} rotation={[0, rot, 0]} renderOrder={11}>
                            <boxGeometry args={[s * 0.56, 0.04, s * 0.07]}/>
                            <meshBasicMaterial {...top} toneMapped={false} color="#ffffff" opacity={1} />
                        </mesh>
                    ))}
                </group>
            )}
        </group>
    );
}
