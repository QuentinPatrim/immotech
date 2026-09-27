"use client";

/* ============================================================
   PLAN 3D — DÉPLACEMENT D'UN MEUBLE
   Pastille au-dessus du meuble sélectionné : la glisser déplace
   le meuble au sol (pas de 5 cm), caméra figée pendant le glissé.
   ============================================================ */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { Furniture, Plan3D, Pt } from "@/lib/plan3d/types";
import { pointInPolygon } from "@/lib/plan3d/geometry";

const ACCENT = "#d35f52";
const snap = (v: number) => Math.round(v / 0.05) * 0.05;

export default function FurnitureHandle3D({ plan, item, ox, oy, size, onDraft, onCommit }: {
    plan: Plan3D; item: Furniture; ox: number; oy: number; size: number;
    onDraft: (p: Plan3D | null) => void; onCommit: (p: Plan3D) => void;
}) {
    const get = useThree(s => s.get);
    const y = Math.min(2.2, item.h + 0.25);
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), [y]);
    const live = useRef<{ p0: Pt; last: Plan3D | null; down: { x: number; y: number } } | null>(null);

    const at = (e: ThreeEvent<PointerEvent>): Pt | null => {
        const hit = e.ray.intersectPlane(plane, new THREE.Vector3());
        return hit ? { x: hit.x + ox, y: hit.z + oy } : null;
    };
    const freeze = (on: boolean) => {
        const c = get().controls as { enabled: boolean } | null;
        if (c) c.enabled = !on;
    };
    const moveTo = (p: Pt, p0: Pt): Plan3D => {
        const x = snap(item.x + p.x - p0.x), yy = snap(item.y + p.y - p0.y);
        // Meuble rattaché à la pièce où il se trouve désormais
        const room = plan.rooms.find(r => pointInPolygon({ x, y: yy }, r.polygon));
        return { ...plan, furniture: plan.furniture.map(f => (f.id === item.id ? { ...f, x, y: yy, roomId: room?.id ?? f.roomId } : f)) };
    };

    return (
        <group position={[item.x - ox, y, item.y - oy]} renderOrder={10}>
            <mesh
                onPointerDown={e => {
                    const p = at(e);
                    if (!p) return;
                    e.stopPropagation();
                    (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
                    freeze(true);
                    live.current = { p0: p, last: null, down: { x: e.clientX, y: e.clientY } };
                }}
                onPointerMove={e => {
                    const l = live.current;
                    if (!l) return;
                    e.stopPropagation();
                    const p = at(e);
                    if (!p) return;
                    l.last = moveTo(p, l.p0);
                    onDraft(l.last);
                }}
                onPointerUp={e => {
                    const l = live.current;
                    if (!l) return;
                    e.stopPropagation();
                    (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
                    live.current = null;
                    freeze(false);
                    onDraft(null);
                    if (l.last && Math.hypot(e.clientX - l.down.x, e.clientY - l.down.y) > 4) onCommit(l.last);
                }}>
                <cylinderGeometry args={[size * 0.8, size * 0.8, 0.05, 24]} />
                <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh renderOrder={10}>
                <cylinderGeometry args={[size * 0.42, size * 0.42, 0.03, 28]} />
                <meshBasicMaterial color={ACCENT} depthTest={false} depthWrite={false} transparent toneMapped={false} />
            </mesh>
            {[0, Math.PI / 2].map(rot => (
                <mesh key={rot} rotation={[0, rot, 0]} renderOrder={11}>
                    <boxGeometry args={[size * 0.56, 0.04, size * 0.07]} />
                    <meshBasicMaterial color="#ffffff" depthTest={false} depthWrite={false} transparent toneMapped={false} />
                </mesh>
            ))}
        </group>
    );
}
