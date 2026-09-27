"use client";

/* ============================================================
   PLAN 3D — SCÈNE
   Rendu « maquette d'architecte » d'un Plan3D : socle, sols
   texturés par pièce, murs coupés (arase sombre) avec portes,
   fenêtres, portes-fenêtres et garde-corps vitrés, mobilier,
   étiquettes de pièces, éclairage doux sans fichier externe.
   Vues : maquette (orbite), dessus (plan) et visite (hauteur
   d'œil, déplacement au clic sur le sol).
   Repère : point du plan (x, y) → monde (x - cx, hauteur, y - cy),
   Y vers le haut ; le plan est centré sur l'origine.
   ============================================================ */

import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, Sky } from "@react-three/drei";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { DEFAULT_GEO, localDate, planDirection, sunPosition } from "@/lib/plan3d/sun";
import type { PhotoJob } from "@/components/plan3d/PhotoCapture";
import type { Plan3D, Pt, Room, Wall } from "@/lib/plan3d/types";
import { centroid, computeWalls, edgePoint, isOutdoor, planBBox, pointInPolygon, roomArea } from "@/lib/plan3d/geometry";
import { STYLES, type StylePalette } from "@/lib/plan3d/styles";
import { FLOOR_ROUGHNESS, disposeTextures, makeFloorTexture } from "@/components/plan3d/materials";
import { FurnitureMesh, disposeFurnitureResources } from "@/components/plan3d/furnitureModels";
import EditHandles3D from "@/components/plan3d/EditHandles3D";
import RealFurniture from "@/components/plan3d/RealFurniture";
import FurnitureHandle3D from "@/components/plan3d/FurnitureHandle3D";
import { loadCatalog, modelFor, type LibraryItem } from "@/lib/plan3d/library";

export type ViewMode = "dollhouse" | "top" | "walk";

export interface Scene3DProps {
    plan: Plan3D;
    view?: ViewMode;
    showFurniture?: boolean;
    showLabels?: boolean;
    selectedRoomId?: string | null;
    onSelectRoom?: (id: string | null) => void;
    className?: string;
    theme?: "light" | "dark";
    autoRotate?: boolean;
    /** Édition directe (poignées de murs, d'ouvertures et de pièce) en vues Maquette et Dessus */
    onEdit?: (plan: Plan3D) => void;
    /** Surfaces de référence verrouillées pendant l'édition */
    lockAreas?: boolean;
    /** Visite : angle de vue horizontal (degrés), heure du jour (soleil), étage (hauteur du sol extérieur) */
    walkFov?: number;
    hour?: number;
    floorLevel?: number;
    /** Rendu soigné (occlusion ambiante, anticrénelage) ; désactivable sur appareil modeste */
    quality?: "high" | "low";
    /** Meubles réalistes (bibliothèque 3D) plutôt que simples */
    realFurniture?: boolean;
    /** Meuble sélectionné (déplacement à la pastille, panneau de la page) */
    selectedFurnitureId?: string | null;
    onSelectFurniture?: (id: string | null) => void;
    /** Catalogue chargé (ou échec) : informe la page */
    onCatalog?: (state: "loading" | "ready" | "error") => void;
    /** Photo HD en cours (lancer de rayons) et ses retours */
    photo?: PhotoJob | null;
    onPhotoProgress?: (p: number) => void;
    onPhotoDone?: (dataUrl: string) => void;
    onPhotoFail?: () => void;
    selectedOpeningId?: string | null;
    onSelectOpening?: (id: string | null) => void;
}

const FOV = 40;
/** Vue réelle Google 3D (clé Map Tiles API) : chargée seulement en visite */
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
const GoogleTiles3D = lazy(() => import("@/components/plan3d/GoogleTiles3D"));
/** Photo HD : moteur de lancer de rayons chargé seulement à la première prise */
const PhotoCapture = lazy(() => import("@/components/plan3d/PhotoCapture"));
const EYE = 1.6;
const ACCENT = "#d35f52";
const DOOR_HEAD = 2.1;
const WINDOW_SILL = 0.95;
const WINDOW_HEAD = 2.15;
const RAILING = 1.0;

type BBox = ReturnType<typeof planBBox>;
type Controls = ComponentRef<typeof OrbitControls>;

/* ─────────────────────────── MURS : GÉOMÉTRIE FUSIONNÉE ─────────────────────────── */

/** Accumulateur de triangles (positions + normales) pour fusionner les boîtes en un seul maillage */
class Batch {
    positions: number[] = [];
    normals: number[] = [];

    push(g: THREE.BufferGeometry, start: number, count: number) {
        const p = g.getAttribute("position"), n = g.getAttribute("normal");
        for (let i = start; i < start + count; i++) {
            this.positions.push(p.getX(i), p.getY(i), p.getZ(i));
            this.normals.push(n.getX(i), n.getY(i), n.getZ(i));
        }
    }

    build() {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
        g.setAttribute("normal", new THREE.Float32BufferAttribute(this.normals, 3));
        g.computeBoundingSphere();
        g.computeBoundingBox();
        return g;
    }
}

interface WallGeometries { sides: THREE.BufferGeometry; caps: THREE.BufferGeometry; frames: THREE.BufferGeometry; glass: THREE.BufferGeometry; rails: THREE.BufferGeometry; hedges: THREE.BufferGeometry }

const BOX_TOP_GROUP = 2;

/**
 * Tous les murs du plan en 5 maillages : faces des murs, arases (dessus coupé),
 * menuiseries, vitrages et métal des garde-corps.
 * Chaque mur a son repère local : X le long du mur (de a vers b), Y vertical, Z l'épaisseur.
 */
function buildWalls(walls: Wall[], height: number, ox: number, oy: number): WallGeometries {
    const sides = new Batch(), caps = new Batch(), frames = new Batch(), glass = new Batch(), rails = new Batch(), hedges = new Batch();
    const local = new THREE.Matrix4();
    const matrix = new THREE.Matrix4();

    for (const w of walls) {
        const L = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
        if (L < 0.02) continue;
        const ux = (w.b.x - w.a.x) / L, uz = (w.b.y - w.a.y) / L;
        // rotation.y = θ envoie X local sur (cos θ, 0, -sin θ) = (ux, 0, uz)
        const base = new THREE.Matrix4().makeRotationY(Math.atan2(-uz, ux))
            .setPosition((w.a.x + w.b.x) / 2 - ox, 0, (w.a.y + w.b.y) / 2 - oy);

        /** Boîte de s0 à s1 le long du mur (mètres depuis a), de y0 à y1, épaisseur `depth` */
        const put = (batch: Batch, s0: number, s1: number, y0: number, y1: number, depth: number, capTop = false) => {
            if (s1 - s0 < 0.004 || y1 - y0 < 0.004) return;
            const g = new THREE.BoxGeometry(s1 - s0, y1 - y0, depth).toNonIndexed();
            local.makeTranslation((s0 + s1) / 2 - L / 2, (y0 + y1) / 2, 0);
            matrix.multiplyMatrices(base, local);
            g.applyMatrix4(matrix);
            for (const grp of g.groups) {
                const target = capTop && grp.materialIndex === BOX_TOP_GROUP ? caps : batch;
                target.push(g, grp.start, grp.count);
            }
            g.dispose();
        };

        if (w.railing && w.hedge) {
            // Jardin : haie taillée, légèrement irrégulière
            const parts = Math.max(1, Math.round(L / 0.9));
            for (let i = 0; i < parts; i++) {
                const s0 = (i * L) / parts, s1 = ((i + 1) * L) / parts;
                put(hedges, s0 - 0.02, s1 + 0.02, 0, 1.15 + ((i * 37) % 7) * 0.02, 0.55);
            }
            continue;
        }
        if (w.railing) {
            put(sides, 0, L, 0, 0.05, 0.1, true);
            put(glass, 0, L, 0.05, RAILING - 0.02, 0.012);
            put(rails, 0, L, RAILING - 0.02, RAILING + 0.02, 0.05);
            const posts = Math.max(1, Math.round(L / 1.2));
            for (let i = 0; i <= posts; i++) {
                const s = Math.min(L - 0.02, Math.max(0.02, (i * L) / posts));
                put(rails, s - 0.015, s + 0.015, 0.05, RAILING - 0.02, 0.03);
            }
            continue;
        }

        const t = w.thickness;
        // Prolongement d'une demi-épaisseur aux extrémités pour fermer les angles
        const ext = t / 2;
        const head = (v: number) => Math.min(v, height - 0.08);
        let cursor = -ext;
        for (const o of w.openings) {
            put(sides, cursor, o.from, 0, height, t, true);
            const c = (o.from + o.to) / 2;
            const width = o.to - o.from;
            if (o.kind === "door") {
                const top = head(DOOR_HEAD);
                put(sides, o.from, o.to, top, height, t, true);
                put(frames, o.from, o.from + 0.045, 0, top, t + 0.02);
                put(frames, o.to - 0.045, o.to, 0, top, t + 0.02);
                put(frames, o.from, o.to, top - 0.045, top, t + 0.02);
            } else {
                const sill = o.kind === "window" ? WINDOW_SILL : 0;
                const top = head(WINDOW_HEAD);
                const fd = Math.min(0.07, t);
                if (sill > 0) put(sides, o.from, o.to, 0, sill, t);
                put(sides, o.from, o.to, top, height, t, true);
                put(frames, o.from, o.to, sill, sill + (sill > 0 ? 0.05 : 0.03), fd);
                put(frames, o.from, o.to, top - 0.05, top, fd);
                put(frames, o.from, o.from + 0.05, sill, top, fd);
                put(frames, o.to - 0.05, o.to, sill, top, fd);
                if (width > (o.kind === "window" ? 1.0 : 1.2)) put(frames, c - 0.025, c + 0.025, sill, top, fd);
                put(glass, o.from + 0.05, o.to - 0.05, sill + 0.03, top - 0.05, 0.012);
                // Appui de fenêtre, dans le ton des menuiseries
                if (sill > 0) put(frames, o.from - 0.03, o.to + 0.03, sill - 0.02, sill, t + 0.04);
            }
            cursor = o.to;
        }
        put(sides, cursor, L + ext, 0, height, t, true);
    }
    return { sides: sides.build(), caps: caps.build(), frames: frames.build(), glass: glass.build(), rails: rails.build(), hedges: hedges.build() };
}

function Walls({ plan, palette, ox, oy }: { plan: Pick<Plan3D, "rooms" | "openings" | "wallHeight">; palette: StylePalette; ox: number; oy: number }) {
    const { rooms, openings, wallHeight } = plan;
    const geo = useMemo(
        () => buildWalls(computeWalls({ rooms, openings: openings ?? [] }), wallHeight || 2.5, ox, oy),
        [rooms, openings, wallHeight, ox, oy],
    );
    useEffect(() => () => { for (const g of Object.values(geo)) g.dispose(); }, [geo]);
    const stop = (e: ThreeEvent<MouseEvent>) => e.stopPropagation();
    return (
        <group>
            <mesh geometry={geo.sides} castShadow receiveShadow onClick={stop}>
                <meshStandardMaterial color={palette.wall} roughness={0.92} />
            </mesh>
            <mesh geometry={geo.caps} castShadow receiveShadow onClick={stop}>
                <meshStandardMaterial color={palette.wallCap} roughness={0.7} />
            </mesh>
            <mesh geometry={geo.frames} castShadow receiveShadow onClick={stop}>
                <meshStandardMaterial color={palette.joinery} roughness={0.45} />
            </mesh>
            <mesh geometry={geo.rails} castShadow receiveShadow onClick={stop}>
                <meshStandardMaterial color={palette.metal} roughness={0.35} metalness={0.8} />
            </mesh>
            <mesh geometry={geo.hedges} castShadow receiveShadow onClick={stop}>
                <meshStandardMaterial color="#4f7a36" roughness={1} />
            </mesh>
            <mesh geometry={geo.glass} renderOrder={2} onClick={stop}>
                <meshPhysicalMaterial color="#cfe4ee" transparent opacity={0.25} roughness={0.05} metalness={0} depthWrite={false} side={THREE.DoubleSide} envMapIntensity={1.4} />
            </mesh>
        </group>
    );
}

/* ─────────────────────────── SOLS ─────────────────────────── */

interface FloorItem { room: Room; geometry: THREE.ShapeGeometry; texture: THREE.Texture; roughness: number }

/**
 * Sol de chaque pièce : forme construite dans le plan XY avec (x, -z) puis
 * tournée de -π/2 autour de X (le Y local devient -Z monde, la normale +Z
 * devient +Y : le sol regarde vers le haut). Les UV de ShapeGeometry sont les
 * coordonnées de la forme, donc des mètres : la texture porte sa propre échelle.
 */
function Floors({ plan, palette, ox, oy, selectedRoomId, onFloorClick, ceilings }: {
    plan: Plan3D; palette: StylePalette; ox: number; oy: number; selectedRoomId: string | null;
    onFloorClick: (e: ThreeEvent<MouseEvent>, room: Room) => void;
    /** Plafonds (visite à hauteur d'œil) */
    ceilings: boolean;
}) {
    const items = useMemo<FloorItem[]>(() => plan.rooms.filter(r => r.polygon.length >= 3).map(room => {
        const shape = new THREE.Shape(room.polygon.map(p => new THREE.Vector2(p.x - ox, -(p.y - oy))));
        const f = palette.floor(room.kind);
        return {
            room,
            geometry: new THREE.ShapeGeometry(shape),
            texture: makeFloorTexture(f.kind, f.base, f.alt),
            roughness: FLOOR_ROUGHNESS[f.kind],
        };
    }), [plan.rooms, palette, ox, oy]);
    useEffect(() => () => { for (const i of items) i.geometry.dispose(); }, [items]);
    return (
        <group>
            {items.map(i => {
                const selected = i.room.id === selectedRoomId;
                return (
                    <mesh
                        key={i.room.id}
                        geometry={i.geometry}
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, 0.003, 0]}
                        receiveShadow
                        onClick={e => onFloorClick(e, i.room)}
                    >
                        <meshStandardMaterial
                            map={i.texture}
                            roughness={i.roughness}
                            envMapIntensity={0.7}
                            emissive={selected ? ACCENT : "#000000"}
                            emissiveIntensity={selected ? 0.28 : 0}
                        />
                    </mesh>
                );
            })}
            {ceilings && items.filter(i => !isOutdoor(i.room)).map(i => (
                // Même forme que le sol, retournée vers le bas à hauteur sous plafond
                <mesh key={`c${i.room.id}`} geometry={i.geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, plan.wallHeight || 2.5, 0]} scale={[1, -1, 1]} receiveShadow>
                    {/* Lumière renvoyée par le sol et les murs : un plafond blanc n'est jamais gris */}
                    <meshStandardMaterial color="#f7f6f3" roughness={0.95} side={THREE.DoubleSide} emissive="#fffaf2" emissiveIntensity={0.42} />
                </mesh>
            ))}
        </group>
    );
}

/* ─────────────────────────── MOBILIER ─────────────────────────── */

function FurnitureLayer({ plan, palette, ox, oy, catalog, selectedId, onSelect }: {
    plan: Plan3D; palette: StylePalette; ox: number; oy: number;
    /** Catalogue chargé : meubles réalistes (sinon meubles simples) */
    catalog: LibraryItem[] | null;
    selectedId?: string | null;
    onSelect?: (id: string) => void;
}) {
    return (
        <group>
            {(plan.furniture ?? []).map(f => {
                const simple = <FurnitureMesh item={f} palette={palette} />;
                const id = catalog ? modelFor(catalog, f) : null;
                return (
                    // Rotation du plan r (sens x → y) = rotation.y de -r en monde (Y vers le haut)
                    <group key={f.id} position={[f.x - ox, 0, f.y - oy]} rotation={[0, -f.rotation, 0]}
                        onClick={onSelect ? e => { if (e.delta > 6) return; e.stopPropagation(); onSelect(f.id); } : undefined}>
                        {id ? <RealFurniture id={id} item={f} fallback={simple} /> : simple}
                        {selectedId === f.id && (
                            // Sélection : cadre au sol autour du meuble
                            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
                                <ringGeometry args={[Math.hypot(f.w, f.d) / 2 + 0.05, Math.hypot(f.w, f.d) / 2 + 0.11, 48]} />
                                <meshBasicMaterial color={ACCENT} transparent opacity={0.9} toneMapped={false} />
                            </mesh>
                        )}
                    </group>
                );
            })}
        </group>
    );
}

/* ─────────────────────────── ÉTIQUETTES ─────────────────────────── */

const areaFmt = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface LabelItem { room: Room; area: number; c: Pt }

const labelItemsOf = (rooms: Room[]): LabelItem[] => rooms
    .filter(r => r.polygon.length >= 3)
    .map(r => ({ room: r, area: roomArea(r), c: centroid(r.polygon) }))
    .filter(i => i.area >= 2);

/**
 * Étiquettes en HTML ordinaire, au-dessus du canevas : chaque image, le centre de
 * chaque pièce est projeté à l'écran et l'étiquette déplacée (pas de <Html> drei,
 * dont le montage perdait parfois une étiquette).
 */
function LabelProjector({ items, ox, oy, elements }: { items: LabelItem[]; ox: number; oy: number; elements: RefObject<Map<string, HTMLElement>> }) {
    const v = useMemo(() => new THREE.Vector3(), []);
    useFrame(({ camera, size }) => {
        for (const i of items) {
            const el = elements.current?.get(i.room.id);
            if (!el) continue;
            v.set(i.c.x - ox, 0.25, i.c.y - oy).project(camera);
            if (v.z > 1 || v.z < -1) { el.style.visibility = "hidden"; continue; }
            el.style.visibility = "visible";
            el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px, 0) translate(-50%, -50%)`;
        }
    });
    return null;
}

function LabelLayer({ items, selectedRoomId, onSelect, dark, elements }: {
    items: LabelItem[]; selectedRoomId: string | null; onSelect?: (id: string | null) => void; dark: boolean; elements: RefObject<Map<string, HTMLElement>>;
}) {
    return (
        <div aria-hidden={false} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
            {items.map(({ room, area }) => {
                const selected = room.id === selectedRoomId;
                return (
                    <button
                        key={room.id}
                        type="button"
                        ref={el => {
                            const m = elements.current;
                            if (!m) return;
                            if (el) m.set(room.id, el); else m.delete(room.id);
                        }}
                        onClick={e => { e.stopPropagation(); onSelect?.(room.id); }}
                        style={{
                            position: "absolute", left: 0, top: 0, visibility: "hidden", pointerEvents: "auto",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                            padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
                            background: selected ? "#8a0e01" : dark ? "rgba(36, 36, 40, 0.74)" : "rgba(255, 255, 255, 0.84)",
                            color: selected ? "#ffffff" : dark ? "#f5f5f7" : "#1d1d1f",
                            backdropFilter: "blur(14px) saturate(180%)", WebkitBackdropFilter: "blur(14px) saturate(180%)",
                            boxShadow: selected ? "0 6px 18px rgba(138, 14, 1, 0.35)" : "0 4px 14px rgba(0, 0, 0, 0.14), 0 0 0 0.5px rgba(0, 0, 0, 0.06)",
                            fontFamily: "var(--font-ios, -apple-system, BlinkMacSystemFont, system-ui, sans-serif)",
                            lineHeight: 1.15, whiteSpace: "nowrap", userSelect: "none", letterSpacing: "-0.01em",
                            transition: "background 0.2s ease",
                            willChange: "transform",
                        }}
                    >
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{room.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.72 }}>{areaFmt.format(area)} m²</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ─────────────────────────── ÉCLAIRAGE ─────────────────────────── */

/** Soleil dans le repère de la scène : direction (vers le soleil), intensité et teinte selon sa hauteur */
export interface SunLight { dir: THREE.Vector3; altitude: number; intensity: number; color: string; up: boolean }

export function sunLightFor(plan: Pick<Plan3D, "north" | "geo">, hour: number): SunLight {
    const geo = plan.geo ?? DEFAULT_GEO;
    const pos = sunPosition(localDate(hour), geo.lat, geo.lng);
    const h = planDirection(pos.azimuth, plan.north ?? 0);
    const alt = Math.max(-10, pos.altitude) * (Math.PI / 180);
    const dir = new THREE.Vector3(h.x * Math.cos(alt), Math.sin(alt), h.y * Math.cos(alt)).normalize();
    const up = pos.altitude > 1;
    // Lumière chaude au lever / coucher, blanche en journée
    const warm = Math.max(0, Math.min(1, 1 - pos.altitude / 25));
    const color = new THREE.Color("#fff6e8").lerp(new THREE.Color("#ffb070"), warm).getStyle();
    const intensity = up ? 1.2 + 2.2 * Math.min(1, Math.sin(alt) * 1.6) : 0;
    return { dir, altitude: pos.altitude, intensity, color, up };
}

function Lights({ radius, dark, sun, interior }: { radius: number; dark: boolean; sun: SunLight; interior: boolean }) {
    const light = useRef<THREE.DirectionalLight>(null);
    const r = Math.max(6, radius);
    const s = r + 1.5;
    useLayoutEffect(() => {
        light.current?.shadow.camera.updateProjectionMatrix();
    }, [s, r]);
    // Soleil sous l'horizon : lumière de ciel seule (crépuscule / nuit)
    const pos = sun.up ? sun.dir.clone().multiplyScalar(r * 2.2) : new THREE.Vector3(-r * 0.55, r * 1.15, r * 0.7);
    const night = !sun.up;
    return (
        <>
            {/* En visite, lumière de rebond plus forte (pièce éclairée par ses fenêtres) */}
            <hemisphereLight args={[night ? "#9fb3d9" : "#ffffff", "#d8cdbf", (dark || night ? 0.35 : 0.6) * (interior ? 1.5 : 1)]} />
            <ambientLight intensity={dark || night ? 0.12 : 0.16} />
            <directionalLight
                ref={light}
                position={pos}
                intensity={night ? (dark ? 0.6 : 0.8) : sun.intensity * (dark ? 0.8 : 1)}
                color={night ? "#c9d6f0" : sun.color}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-s}
                shadow-camera-right={s}
                shadow-camera-top={s}
                shadow-camera-bottom={-s}
                shadow-camera-near={0.5}
                shadow-camera-far={r * 5}
                shadow-bias={-0.0004}
                shadow-normalBias={0.03}
                shadow-radius={4}
            />
            <Environment resolution={256} environmentIntensity={(dark || night ? 0.5 : 0.85) * (interior ? 1.25 : 1)}>
                <Lightformer form="rect" intensity={2.2} position={[0, 9, 0]} scale={[14, 14, 1]} color="#ffffff" />
                <Lightformer form="rect" intensity={1.3} position={[-9, 3, 5]} scale={[12, 4, 1]} color="#fff0dc" />
                <Lightformer form="rect" intensity={0.8} position={[9, 3, -5]} scale={[12, 4, 1]} color="#e4edfb" />
                <Lightformer form="ring" intensity={1.6} position={[5, 7, 7]} scale={3} color="#ffffff" />
            </Environment>
        </>
    );
}

/* ─────────────────────────── CAMÉRA ─────────────────────────── */

interface Pose { pos: THREE.Vector3; target: THREE.Vector3 }
interface WalkStart { eye: Pt; look: Pt }

/** Point de départ de la visite : dans le séjour (sinon la plus grande pièce), dos à la pièce, face à sa plus grande baie */
function walkStartOf(plan: Pick<Plan3D, "rooms" | "openings">): WalkStart | null {
    const indoor = plan.rooms.filter(r => r.polygon.length >= 3 && !isOutdoor(r));
    if (!indoor.length) return null;
    const room = indoor.find(r => r.kind === "sejour") ?? indoor.reduce((a, b) => (roomArea(b) > roomArea(a) ? b : a));
    const c = centroid(room.polygon);
    const bay = (plan.openings ?? [])
        .filter(o => o.roomId === room.id && o.kind !== "door")
        .sort((a, b) => (b.kind === "french" ? 1 : 0) - (a.kind === "french" ? 1 : 0) || b.width - a.width)[0];
    let look: Pt;
    if (bay) look = edgePoint(room, bay.edge, bay.t);
    else {
        // Sans baie : regarder le long du plus grand axe de la pièce
        const xs = room.polygon.map(p => p.x), ys = room.polygon.map(p => p.y);
        const wide = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
        look = wide ? { x: Math.max(...xs), y: c.y } : { x: c.x, y: Math.max(...ys) };
    }
    const dx = look.x - c.x, dy = look.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const back = Math.min(1.6, len * 0.6);
    let eye = { x: c.x - (dx / len) * back, y: c.y - (dy / len) * back };
    if (!pointInPolygon(eye, room.polygon)) eye = c;
    return { eye, look };
}

/**
 * Départ de la visite, façon photographe immobilier : dans l'angle de la pièce le
 * plus éloigné de sa grande baie, en retrait de 45 cm, regard en diagonale vers la
 * baie — avec un grand angle, toute la pièce est dans le cadre.
 */
function walkCornerOf(plan: Pick<Plan3D, "rooms" | "openings">): WalkStart | null {
    const base = walkStartOf(plan);
    if (!base) return null;
    const room = plan.rooms.find(r => pointInPolygon(base.eye, r.polygon) && !isOutdoor(r))
        ?? plan.rooms.find(r => r.kind === "sejour");
    if (!room) return base;
    const c = centroid(room.polygon);
    const far = room.polygon.reduce((a, p) => (Math.hypot(p.x - base.look.x, p.y - base.look.y) > Math.hypot(a.x - base.look.x, a.y - base.look.y) ? p : a));
    const toC = { x: c.x - far.x, y: c.y - far.y };
    const l = Math.hypot(toC.x, toC.y) || 1;
    let eye = { x: far.x + (toC.x / l) * 0.6, y: far.y + (toC.y / l) * 0.6 };
    if (!pointInPolygon(eye, room.polygon)) eye = base.eye;
    return { eye, look: { x: (c.x + base.look.x) / 2, y: (c.y + base.look.y) / 2 } };
}

function fovs(aspect: number) {
    const v = THREE.MathUtils.degToRad(FOV);
    const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
    return { v, h };
}

/** Pose de caméra pour une vue, plan centré sur l'origine */
function poseFor(view: ViewMode, bb: BBox, wallH: number, aspect: number, walk: WalkStart | null, ox: number, oy: number): Pose {
    const { v, h } = fovs(aspect);
    const w = Math.max(bb.w, 3), d = Math.max(bb.h, 3);
    if (view === "top") {
        const dist = Math.max((d / 2 + 0.6) / Math.tan(v / 2), (w / 2 + 0.6) / Math.tan(h / 2)) + wallH;
        return { pos: new THREE.Vector3(0, dist, dist * 0.002), target: new THREE.Vector3(0, 0, 0) };
    }
    if (view === "walk") {
        // Sans pièce intérieure : départ au centre du plan, regard vers le haut du plan
        const start = walk ?? { eye: { x: ox, y: oy }, look: { x: ox, y: oy - 1 } };
        const eye = new THREE.Vector3(start.eye.x - ox, EYE, start.eye.y - oy);
        const dir = new THREE.Vector3(start.look.x - start.eye.x, 0, start.look.y - start.eye.y);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
        dir.normalize();
        dir.y = -0.12;
        dir.normalize();
        return { pos: eye, target: eye.clone().addScaledVector(dir, 0.1) };
    }
    // Maquette : élévation 45°, caméra du côté de la façade principale (grande baie du séjour,
    // donc balcon ou terrasse visibles) décalée de 35°, distance ajustée à la sphère englobante
    const radius = 0.5 * Math.hypot(w, d, wallH);
    const dist = (radius / Math.sin(Math.min(v, h) / 2)) * 1.02;
    const facade = walk ? Math.atan2(walk.look.x - walk.eye.x, walk.look.y - walk.eye.y) : 0;
    const polar = THREE.MathUtils.degToRad(45), az = facade + THREE.MathUtils.degToRad(35);
    return {
        pos: new THREE.Vector3(Math.sin(polar) * Math.sin(az), Math.cos(polar), Math.sin(polar) * Math.cos(az)).multiplyScalar(dist),
        target: new THREE.Vector3(0, 0, 0),
    };
}

interface Anim { fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3; t: number; dur: number }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function CameraRig({ view, plan, bb, ox, oy, autoRotate, walkRequestRef, walkFov }: {
    view: ViewMode; plan: Plan3D; bb: BBox; ox: number; oy: number; autoRotate: boolean;
    walkRequestRef: RefObject<THREE.Vector3 | null>;
    /** Angle de vue horizontal en visite (degrés) */
    walkFov: number;
}) {
    const controls = useRef<Controls>(null);
    const get = useThree(s => s.get);
    const anim = useRef<Anim | null>(null);
    const first = useRef(true);
    const wallH = plan.wallHeight || 2.5;
    const { rooms, openings } = plan;
    const walk = useMemo(() => walkStartOf({ rooms, openings }), [rooms, openings]);
    const corner = useMemo(() => walkCornerOf({ rooms, openings }), [rooms, openings]);
    const latest = useRef({ bb, wallH, walk, corner, ox, oy });
    useEffect(() => { latest.current = { bb, wallH, walk, corner, ox, oy }; });

    // Grand angle en visite : l'angle horizontal voulu, converti en angle vertical selon le cadre
    const size = useThree(s => s.size);
    useEffect(() => {
        const { camera } = get();
        if (!(camera instanceof THREE.PerspectiveCamera)) return;
        const aspect = size.width / Math.max(1, size.height);
        const h = THREE.MathUtils.degToRad(Math.min(110, Math.max(40, walkFov)));
        const v = view === "walk" ? Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / aspect))) : FOV;
        camera.fov = Math.max(FOV, v);
        camera.updateProjectionMatrix();
    }, [view, walkFov, size, get]);

    // Recadrage uniquement au changement de vue ou d'emprise du plan (pas à chaque édition)
    const fitKey = `${Math.round(bb.w * 2)}|${Math.round(bb.h * 2)}`;
    useEffect(() => {
        const { camera, size } = get();
        const c = controls.current;
        const l = latest.current;
        const to = poseFor(view, l.bb, l.wallH, size.width / Math.max(1, size.height), view === "walk" ? l.corner : l.walk, l.ox, l.oy);
        // Plan proche serré en visite seulement : en vue maquette/dessus, un near plus grand
        // garde la précision du tampon de profondeur (sols à 3 mm du socle, joints de façade…)
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.near = view === "walk" ? 0.05 : 0.2;
            camera.updateProjectionMatrix();
        }
        let fromPos = camera.position.clone();
        const fromTarget = c ? c.target.clone() : new THREE.Vector3();
        if (first.current) {
            // Arrivée : léger travelling depuis plus loin et plus haut
            first.current = false;
            fromPos = to.pos.clone().sub(to.target).multiplyScalar(view === "walk" ? 1 : 1.5).add(to.target);
            if (view !== "walk") fromPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);
        }
        anim.current = { fromPos, fromTarget, toPos: to.pos, toTarget: to.target, t: 0, dur: 0.85 };
    }, [view, fitKey, get]);

    useFrame((state, delta) => {
        const c = controls.current;
        if (!c) return;
        const req = walkRequestRef.current;
        if (req) {
            walkRequestRef.current = null;
            const dir = c.target.clone().sub(state.camera.position);
            const toPos = new THREE.Vector3(req.x, EYE, req.z);
            anim.current = { fromPos: state.camera.position.clone(), fromTarget: c.target.clone(), toPos, toTarget: toPos.clone().add(dir), t: 0, dur: 0.7 };
        }
        const a = anim.current;
        if (!a) return;
        a.t = Math.min(1, a.t + Math.min(delta, 0.05) / a.dur);
        const k = ease(a.t);
        state.camera.position.lerpVectors(a.fromPos, a.toPos, k);
        c.target.lerpVectors(a.fromTarget, a.toTarget, k);
        state.camera.lookAt(c.target);
        c.enabled = a.t >= 1;
        if (a.t >= 1) {
            anim.current = null;
            c.update();
        }
    });

    // Un seul OrbitControls, toutes les options passées dans chaque vue (aucune prop retirée entre deux vues)
    const radius = 0.5 * Math.hypot(Math.max(bb.w, 3), Math.max(bb.h, 3));
    const top = view === "top", walking = view === "walk";
    return (
        <OrbitControls
            ref={controls}
            makeDefault
            enableDamping
            dampingFactor={0.08}
            enableRotate={!top}
            enablePan={!walking}
            enableZoom={!walking}
            screenSpacePanning
            rotateSpeed={walking ? -0.35 : 0.8}
            minDistance={walking ? 0.01 : top ? 2 : Math.max(2, radius * 0.4)}
            maxDistance={walking ? 1 : radius * 8 + 10}
            minPolarAngle={walking ? Math.PI / 2 - 0.9 : top ? 0 : 0.2}
            maxPolarAngle={walking ? Math.PI / 2 + 0.7 : top ? Math.PI : 1.35}
            autoRotate={autoRotate && view === "dollhouse"}
            autoRotateSpeed={0.6}
            mouseButtons={top
                ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
                : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
            touches={top
                ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }
                : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />
    );
}

/* ─────────────────────────── SCÈNE ─────────────────────────── */

function SceneContent({ plan, dragging, onDraft, labels, labelEls, view, showFurniture, selectedRoomId, onSelectRoom, dark, autoRotate, onEdit, lockAreas, selectedOpeningId, onSelectOpening, walkFov, hour, floorLevel, quality, catalog, selectedFurnitureId, onSelectFurniture, photo, onPhotoProgress, onPhotoDone, onPhotoFail }: {
    plan: Plan3D; dragging: boolean; onDraft: (p: Plan3D | null) => void; labels: LabelItem[]; labelEls: RefObject<Map<string, HTMLElement>>;
    walkFov: number; hour: number; floorLevel: number; quality: "high" | "low";
    catalog: LibraryItem[] | null; selectedFurnitureId: string | null; onSelectFurniture?: (id: string | null) => void;
    photo: PhotoJob | null; onPhotoProgress?: (p: number) => void; onPhotoDone?: (dataUrl: string) => void; onPhotoFail?: () => void;
    view: ViewMode; showFurniture: boolean; selectedRoomId: string | null;
    onSelectRoom?: (id: string | null) => void; dark: boolean; autoRotate: boolean;
    onEdit?: (plan: Plan3D) => void; lockAreas: boolean; selectedOpeningId: string | null; onSelectOpening?: (id: string | null) => void;
}) {
    const palette = STYLES[plan.style] ?? STYLES.contemporain;
    const rooms = plan.rooms;
    const bb = useMemo(() => planBBox({ rooms }), [rooms]);
    // Origine de la scène stable pendant l'édition : pousser un mur de façade ne doit pas
    // faire glisser toute la maquette sous le doigt (recentrage au-delà de 1,5 m seulement)
    const [origin, setOrigin] = useState({ x: bb.cx, y: bb.cy });
    if (!dragging && Math.hypot(bb.cx - origin.x, bb.cy - origin.y) > 1.5) setOrigin({ x: bb.cx, y: bb.cy });
    const ox = origin.x, oy = origin.y;
    const editRoom = onEdit && view !== "walk" ? plan.rooms.find(r => r.id === selectedRoomId && r.polygon.length >= 3) ?? null : null;
    const handleSize = Math.min(0.6, Math.max(0.28, Math.max(bb.w, bb.h) / 14));
    const hasRooms = plan.rooms.length > 0;
    const bg = dark ? "#0f0f11" : "#eceae6";
    const radius = 0.5 * Math.hypot(Math.max(bb.w, 3), Math.max(bb.h, 3), plan.wallHeight || 2.5);
    const walkRequestRef = useRef<THREE.Vector3 | null>(null);
    const walking = view === "walk";
    const { north, geo } = plan;
    const sun = useMemo(() => sunLightFor({ north, geo }, hour), [north, geo, hour]);
    // Sol extérieur à la hauteur réelle (3 m par étage) : vue plongeante depuis les fenêtres
    const groundY = -Math.max(0, floorLevel) * 3 - 0.14;

    const onFloorClick = (e: ThreeEvent<MouseEvent>, room: Room) => {
        e.stopPropagation();
        if (e.delta > 6) return;
        if (view === "walk") walkRequestRef.current = e.point.clone();
        else onSelectRoom?.(room.id);
    };

    return (
        <>
            {walking ? (
                <>
                    {/* Visite : vrai ciel, soleil à sa place selon l'adresse, l'orientation et l'heure */}
                    <Sky distance={4500} sunPosition={sun.up ? [sun.dir.x, sun.dir.y, sun.dir.z] : [sun.dir.x, -0.05, sun.dir.z]}
                        turbidity={5} rayleigh={sun.up ? 1.2 : 3} mieCoefficient={0.004} mieDirectionalG={0.85} />
                    <fog attach="fog" args={[sun.up ? "#dfe8ef" : "#2a3444", 60, 900]} />
                    {GOOGLE_KEY && geo && (
                        <Suspense fallback={null}>
                            <GoogleTiles3D apiKey={GOOGLE_KEY} lat={geo.lat} lng={geo.lng} north={north ?? 0} groundY={groundY}
                                halfX={bb.w / 2 + 6} halfZ={bb.h / 2 + 6} />
                        </Suspense>
                    )}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY - (GOOGLE_KEY && geo ? 1.5 : 0), 0]} receiveShadow>
                        <circleGeometry args={[900, 64]} />
                        <meshStandardMaterial color={sun.up ? "#8c9476" : "#2e3326"} roughness={1} />
                    </mesh>
                </>
            ) : (
                <>
                    <color attach="background" args={[bg]} />
                    <fog attach="fog" args={[bg, radius * 8, radius * 20]} />
                </>
            )}
            <Lights radius={radius} dark={dark} sun={sun} interior={walking} />

            {hasRooms && !walking && (
                <>
                    {/* Socle de maquette */}
                    <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
                        <boxGeometry args={[bb.w + 0.6, 0.12, bb.h + 0.6]} />
                        <meshStandardMaterial color={dark ? "#3a3a3f" : "#dddbd7"} roughness={0.9} />
                    </mesh>
                    <ContactShadows
                        key={`${bb.w.toFixed(2)}|${bb.h.toFixed(2)}`}
                        position={[0, -0.128, 0]}
                        scale={[bb.w + 4, bb.h + 4]}
                        resolution={512}
                        blur={2.6}
                        far={0.8}
                        opacity={dark ? 0.75 : 0.45}
                        frames={1}
                    />
                </>
            )}
            {/* Sol récepteur d'ombres, quasi invisible */}
            {!walking && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow>
                    <planeGeometry args={[400, 400]} />
                    <shadowMaterial opacity={dark ? 0.3 : 0.12} />
                </mesh>
            )}
            {walking && hasRooms && (
                // Dalle du logement (vue de l'extérieur par les fenêtres)
                <mesh position={[0, -0.1, 0]} receiveShadow>
                    <boxGeometry args={[bb.w + 0.5, 0.2, bb.h + 0.5]} />
                    <meshStandardMaterial color="#c9c4bc" roughness={0.9} />
                </mesh>
            )}

            <Floors plan={plan} palette={palette} ox={ox} oy={oy} selectedRoomId={selectedRoomId} onFloorClick={onFloorClick} ceilings={walking} />
            <Walls plan={plan} palette={palette} ox={ox} oy={oy} />
            {showFurniture && (
                <FurnitureLayer plan={plan} palette={palette} ox={ox} oy={oy} catalog={catalog}
                    selectedId={selectedFurnitureId} onSelect={onSelectFurniture && view !== "walk" ? id => onSelectFurniture(id) : undefined} />
            )}
            {showFurniture && onEdit && view !== "walk" && (() => {
                const item = selectedFurnitureId ? plan.furniture.find(f => f.id === selectedFurnitureId) : null;
                return item ? <FurnitureHandle3D plan={plan} item={item} ox={ox} oy={oy} size={handleSize} onDraft={onDraft} onCommit={onEdit} /> : null;
            })()}
            <LabelProjector items={labels} ox={ox} oy={oy} elements={labelEls} />
            {editRoom && onEdit && (
                <EditHandles3D
                    plan={plan} room={editRoom} ox={ox} oy={oy} size={handleSize} lock={lockAreas}
                    selectedOpeningId={selectedOpeningId} onSelectOpening={id => onSelectOpening?.(id)}
                    onDraft={onDraft} onCommit={onEdit}/>
            )}
            <CameraRig view={view} plan={plan} bb={bb} ox={ox} oy={oy} autoRotate={autoRotate && view === "dollhouse"} walkRequestRef={walkRequestRef} walkFov={walkFov} />
            {photo && (
                <Suspense fallback={null}>
                    <PhotoCapture job={photo} outdoor={sun.up ? { top: "#8fb4e0", bottom: "#d9d4c7" } : { top: "#1d2740", bottom: "#2a2a2a" }}
                        onProgress={p => onPhotoProgress?.(p)} onDone={u => onPhotoDone?.(u)} onFail={() => onPhotoFail?.()} />
                </Suspense>
            )}
            {quality === "high" && !photo && (
                // Occlusion ambiante (angles, pieds de meubles), anticrénelage, tonalité filmique
                <EffectComposer multisampling={0} enableNormalPass={false}>
                    <N8AO halfRes aoRadius={walking ? 0.8 : 0.6} distanceFalloff={0.6} intensity={walking ? 2.4 : 1.8} quality="performance" />
                    <SMAA />
                    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                </EffectComposer>
            )}
        </>
    );
}

let liveScenes = 0;

export default function Scene3D({
    plan,
    view = "dollhouse",
    showFurniture = true,
    showLabels = true,
    selectedRoomId = null,
    onSelectRoom,
    className,
    theme = "light",
    autoRotate = false,
    onEdit,
    lockAreas = false,
    walkFov = 80,
    hour = 15,
    floorLevel = 1,
    quality = "high",
    realFurniture = false,
    selectedFurnitureId = null,
    onSelectFurniture,
    onCatalog,
    photo = null,
    onPhotoProgress,
    onPhotoDone,
    onPhotoFail,
    selectedOpeningId = null,
    onSelectOpening,
}: Scene3DProps) {
    const dark = theme === "dark";
    const down = useRef<{ x: number; y: number } | null>(null);
    // Aperçu pendant un glissé (le plan enregistré n'est remplacé qu'au relâché)
    const [draft, setDraft] = useState<Plan3D | null>(null);
    const shown = draft ?? plan;
    const labelEls = useRef(new Map<string, HTMLElement>());
    // Bibliothèque de meubles réalistes, chargée à la demande
    const [catalog, setCatalog] = useState<LibraryItem[] | null>(null);
    useEffect(() => {
        if (!realFurniture) return;
        let live = true;
        onCatalog?.("loading");
        loadCatalog().then(
            items => { if (live) { setCatalog(items); onCatalog?.("ready"); } },
            () => { if (live) onCatalog?.("error"); },
        );
        return () => { live = false; };
    }, [realFurniture, onCatalog]);
    const labels = useMemo(() => (showLabels && view !== "walk" ? labelItemsOf(shown.rooms) : []), [shown.rooms, showLabels, view]);

    // Textures et géométries partagées libérées quand la dernière scène disparaît
    useEffect(() => {
        liveScenes++;
        return () => {
            liveScenes--;
            if (liveScenes === 0) {
                disposeTextures();
                disposeFurnitureResources();
            }
        };
    }, []);

    return (
        <div
            className={className}
            style={{ width: "100%", height: "100%", position: "relative", isolation: "isolate", background: dark ? "#0f0f11" : "#eceae6" }}
            onPointerDown={e => { down.current = { x: e.clientX, y: e.clientY }; }}
        >
            <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: true, preserveDrawingBuffer: true }}
                camera={{ fov: FOV, near: 0.05, far: 600, position: [14, 14, 14] }}
                onCreated={({ gl }) => {
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                    gl.toneMappingExposure = 1.02;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                }}
                onPointerMissed={e => {
                    const d = down.current;
                    if (view === "walk" || !onSelectRoom || !d) return;
                    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) { onSelectRoom(null); onSelectOpening?.(null); onSelectFurniture?.(null); }
                }}
            >
                <SceneContent
                    plan={shown}
                    dragging={!!draft}
                    onDraft={setDraft}
                    labels={labels}
                    labelEls={labelEls}
                    view={view}
                    showFurniture={showFurniture}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={onSelectRoom}
                    dark={dark}
                    autoRotate={autoRotate}
                    onEdit={onEdit}
                    lockAreas={lockAreas}
                    walkFov={walkFov}
                    hour={hour}
                    floorLevel={floorLevel}
                    quality={quality}
                    catalog={realFurniture ? catalog : null}
                    photo={photo}
                    onPhotoProgress={onPhotoProgress}
                    onPhotoDone={onPhotoDone}
                    onPhotoFail={onPhotoFail}
                    selectedFurnitureId={selectedFurnitureId}
                    onSelectFurniture={onSelectFurniture}
                    selectedOpeningId={selectedOpeningId}
                    onSelectOpening={onSelectOpening}
                />
            </Canvas>
            <LabelLayer items={labels} selectedRoomId={selectedRoomId} onSelect={onSelectRoom} dark={dark} elements={labelEls} />
        </div>
    );
}
