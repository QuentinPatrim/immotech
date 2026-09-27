"use client";

/* ============================================================
   PLAN 3D — MEUBLES
   Chaque type de meuble est construit à partir de primitives
   (boîtes arrondies, cylindres, sphères) aux dimensions réelles
   w × d × h, dans un esprit « maquette d'architecte ».
   Repère local : origine au centre de l'emprise, au sol ; largeur
   w le long de X, profondeur d le long de Z (= y du plan), façade
   tournée vers +Z (vers le « bas » du plan quand rotation = 0).
   La scène place le groupe en (x, 0, y) avec rotation.y = -rotation.
   Géométries et matériaux sont partagés (caches de module).
   ============================================================ */

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Furniture, FurnitureType } from "@/lib/plan3d/types";
import type { StylePalette } from "@/lib/plan3d/styles";
import { mixColor } from "@/components/plan3d/materials";

type V3 = [number, number, number];

/* ─────────────────────────── MATÉRIAUX ─────────────────────────── */

type Finish = "fabric" | "wood" | "metal" | "steel" | "ceramic" | "matte" | "stone" | "glass" | "mirror" | "screen" | "light" | "leaf" | "books";

const materialCache = new Map<string, THREE.Material>();

function material(color: string, finish: Finish): THREE.Material {
    const key = `${finish}|${color}`;
    const hit = materialCache.get(key);
    if (hit) return hit;
    let m: THREE.Material;
    switch (finish) {
        case "fabric": m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }); break;
        case "wood": m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0 }); break;
        case "metal": m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.8 }); break;
        case "steel": m = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.9 }); break;
        case "ceramic": m = new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0 }); break;
        case "matte": m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 }); break;
        case "stone": m = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0 }); break;
        case "glass": m = new THREE.MeshStandardMaterial({ color, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }); break;
        case "mirror": m = new THREE.MeshStandardMaterial({ color, roughness: 0.04, metalness: 1 }); break;
        case "screen": m = new THREE.MeshStandardMaterial({ color, roughness: 0.16, metalness: 0.3 }); break;
        case "light": m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.25, roughness: 0.9 }); break;
        case "leaf": m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, flatShading: true }); break;
        case "books": m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.82, metalness: 0, vertexColors: true }); break;
    }
    materialCache.set(key, m);
    return m;
}

interface Mats {
    fabric: THREE.Material; fabricAlt: THREE.Material; wood: THREE.Material; woodDark: THREE.Material;
    metal: THREE.Material; steel: THREE.Material; accent: THREE.Material; counter: THREE.Material;
    ceramic: THREE.Material; basin: THREE.Material; appliance: THREE.Material; front: THREE.Material;
    linen: THREE.Material; white: THREE.Material; dark: THREE.Material; screen: THREE.Material;
    glass: THREE.Material; mirror: THREE.Material; light: THREE.Material; pot: THREE.Material; soil: THREE.Material;
    leaves: THREE.Material[]; rugBorder: THREE.Material; rugField: THREE.Material; ring: THREE.Material; books: THREE.Material;
    bookColors: string[];
}

function paletteMats(p: StylePalette): Mats {
    return {
        fabric: material(p.fabric, "fabric"),
        fabricAlt: material(p.fabricAlt, "fabric"),
        wood: material(p.wood, "wood"),
        woodDark: material(p.woodDark, "wood"),
        metal: material(p.metal, "metal"),
        steel: material("#c9cdd1", "steel"),
        accent: material(p.accent, "fabric"),
        counter: material(p.counter, "stone"),
        ceramic: material(p.ceramic, "ceramic"),
        basin: material(mixColor(p.ceramic, "#9aa3ab", 0.18), "ceramic"),
        appliance: material(p.appliance, "matte"),
        front: material(p.joinery, "matte"),
        linen: material("#eeeae3", "fabric"),
        white: material("#f8f7f4", "fabric"),
        dark: material("#1c1c1e", "matte"),
        screen: material("#0b0c0f", "screen"),
        glass: material("#d4e6ee", "glass"),
        mirror: material("#e6ecef", "mirror"),
        light: material("#ffe2b8", "light"),
        pot: material(mixColor(p.wall, "#8b8378", 0.35), "matte"),
        soil: material("#3b2f25", "fabric"),
        leaves: ["#5d7a4f", "#4a6741", "#6f8d5c"].map(c => material(c, "leaf")),
        rugBorder: material(p.fabricAlt, "fabric"),
        rugField: material(mixColor(p.fabricAlt, "#ffffff", 0.45), "fabric"),
        ring: material("#3a3a3c", "matte"),
        books: material("#ffffff", "books"),
        bookColors: [p.accent, p.fabricAlt, p.fabric, p.woodDark, "#e8e2d6", "#2f3b45", "#b9b2a6", "#6b7a6e", "#c7b08a", "#3d3a36"],
    };
}

/* ─────────────────────────── GÉOMÉTRIES ─────────────────────────── */

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 24, 16);
const UNIT_ICO = new THREE.IcosahedronGeometry(1, 1);
const geometryCache = new Map<string, THREE.BufferGeometry>();
const mm = (v: number) => Math.round(v * 1000);

function roundedGeometry(w: number, h: number, d: number, r: number) {
    const radius = Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 0.0005));
    const key = `rb|${mm(w)}|${mm(h)}|${mm(d)}|${mm(radius)}`;
    let g = geometryCache.get(key);
    if (!g) {
        g = new RoundedBoxGeometry(w, h, d, 3, radius);
        geometryCache.set(key, g);
    }
    return g;
}

function cylinderGeometry(rt: number, rb: number, h: number, seg: number) {
    const key = `cy|${mm(rt)}|${mm(rb)}|${mm(h)}|${seg}`;
    let g = geometryCache.get(key);
    if (!g) {
        g = new THREE.CylinderGeometry(rt, rb, h, seg);
        geometryCache.set(key, g);
    }
    return g;
}

/** Libère géométries et matériaux partagés des meubles */
export function disposeFurnitureResources() {
    for (const g of geometryCache.values()) g.dispose();
    geometryCache.clear();
    for (const m of materialCache.values()) m.dispose();
    materialCache.clear();
}

/* ─────────────────────────── PRIMITIVES ─────────────────────────── */

interface PartProps { p: V3; m: THREE.Material; r?: V3; cast?: boolean }

function Box({ size, p, m, r, cast = true }: PartProps & { size: V3 }) {
    return <mesh geometry={UNIT_BOX} material={m} position={p} rotation={r} scale={size} castShadow={cast} receiveShadow />;
}

function RBox({ size, radius = 0.02, p, m, r, cast = true }: PartProps & { size: V3; radius?: number }) {
    return <mesh geometry={roundedGeometry(size[0], size[1], size[2], radius)} material={m} position={p} rotation={r} castShadow={cast} receiveShadow />;
}

function Cyl({ rt, rb, h, p, m, r, s, seg = 28, cast = true }: PartProps & { rt: number; rb?: number; h: number; s?: V3; seg?: number }) {
    return <mesh geometry={cylinderGeometry(rt, rb ?? rt, h, seg)} material={m} position={p} rotation={r} scale={s} castShadow={cast} receiveShadow />;
}

function Ball({ radius, p, m, s, ico = false, cast = true }: PartProps & { radius: number; s?: V3; ico?: boolean }) {
    const scale: V3 = s ? [s[0] * radius, s[1] * radius, s[2] * radius] : [radius, radius, radius];
    return <mesh geometry={ico ? UNIT_ICO : UNIT_SPHERE} material={m} position={p} scale={scale} castShadow={cast} receiveShadow />;
}

/** Quatre pieds cylindriques, en retrait `inset` des bords */
function Legs({ w, d, h, inset, radius, m, taper = 1 }: { w: number; d: number; h: number; inset: number; radius: number; m: THREE.Material; taper?: number }) {
    const x = w / 2 - inset, z = d / 2 - inset;
    return (
        <>
            {([[-x, -z], [x, -z], [-x, z], [x, z]] as const).map(([lx, lz]) => (
                <Cyl key={`${lx}|${lz}`} rt={radius} rb={radius * taper} h={h} p={[lx, h / 2, lz]} m={m} seg={14} />
            ))}
        </>
    );
}

/** Joint vertical ou horizontal (fente sombre) sur une façade */
function Gap({ x = 0, y, z, w = 0.005, h }: { x?: number; y: number; z: number; w?: number; h: number }) {
    return <mesh geometry={UNIT_BOX} material={material("#1c1c1e", "matte")} position={[x, y, z]} scale={[w, h, 0.004]} />;
}

/* ─────────────────────────── ALÉATOIRE DÉTERMINISTE ─────────────────────────── */

function hashId(s: string) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}

function seeded(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ─────────────────────────── MODÈLES ─────────────────────────── */

interface ModelProps { w: number; d: number; h: number; m: Mats; seed: number }

/** Canapé / fauteuil : socle, accoudoirs, dossier, coussins d'assise et de dossier */
function Upholstered({ w, d, h, m, cover, legs, pillows }: ModelProps & { cover: THREE.Material; legs: THREE.Material; pillows: number }) {
    const legH = 0.07;
    const baseTop = legH + 0.2;
    const armW = Math.min(0.2, w * 0.14);
    const armH = Math.min(0.64, h * 0.78);
    const backD = Math.min(0.22, d * 0.25);
    const iw = w - 2 * armW;
    const n = iw > 1.7 ? 3 : iw > 1 ? 2 : 1;
    const cw = iw / n;
    const seatT = 0.15;
    const seatD = d - backD - 0.02;
    const backCushH = Math.max(0.2, h - baseTop - seatT - 0.03);
    return (
        <>
            <Legs w={w} d={d} h={legH} inset={0.07} radius={0.018} m={legs} taper={0.7} />
            <RBox size={[w, 0.2, d]} radius={0.03} p={[0, legH + 0.1, 0]} m={cover} />
            {[-1, 1].map(s => (
                <RBox key={s} size={[armW, armH - legH, d]} radius={0.06} p={[s * (w / 2 - armW / 2), legH + (armH - legH) / 2, 0]} m={cover} />
            ))}
            <RBox size={[iw + 0.02, h - baseTop, backD]} radius={0.06} p={[0, baseTop + (h - baseTop) / 2, -d / 2 + backD / 2]} m={cover} />
            {Array.from({ length: n }, (_, i) => {
                const x = -iw / 2 + cw * (i + 0.5);
                return (
                    <group key={i}>
                        <RBox size={[cw - 0.012, seatT, seatD]} radius={0.055} p={[x, baseTop + seatT / 2, -d / 2 + backD + seatD / 2 + 0.01]} m={cover} />
                        <RBox size={[cw - 0.02, backCushH, 0.17]} radius={0.07} p={[x, baseTop + seatT + backCushH / 2, -d / 2 + backD + 0.07]} r={[-0.12, 0, 0]} m={cover} />
                    </group>
                );
            })}
            {pillows > 0 && Array.from({ length: pillows }, (_, i) => {
                const side = pillows === 1 ? 0 : i === 0 ? -1 : 1;
                const x = side * Math.max(0, iw / 2 - 0.3);
                return (
                    <RBox key={i} size={[0.42, 0.42, 0.13]} radius={0.06} p={[x, baseTop + seatT + 0.2, -d / 2 + backD + 0.22]} r={[-0.3, 0, side * -0.08]} m={m.accent} />
                );
            })}
        </>
    );
}

function Sofa(props: ModelProps) {
    return <Upholstered {...props} cover={props.m.fabric} legs={props.m.woodDark} pillows={props.w > 1.3 ? 2 : 0} />;
}

function Armchair(props: ModelProps) {
    return <Upholstered {...props} cover={props.m.fabricAlt} legs={props.m.wood} pillows={1} />;
}

/** Petite pile de livres décorative posée en (x, y, z) */
function BookStack({ x, y, z, m }: { x: number; y: number; z: number; m: Mats }) {
    return (
        <>
            <Box size={[0.26, 0.03, 0.19]} p={[x, y + 0.015, z]} m={m.accent} />
            <Box size={[0.22, 0.028, 0.16]} p={[x + 0.01, y + 0.044, z]} r={[0, 0.12, 0]} m={m.linen} />
        </>
    );
}

function CoffeeTable({ w, d, h, m }: ModelProps) {
    const round = Math.abs(w - d) < 0.06;
    if (round) {
        return (
            <>
                <Cyl rt={w / 2} h={0.04} p={[0, h - 0.02, 0]} m={m.wood} seg={48} />
                <Cyl rt={w * 0.2} rb={w * 0.26} h={h - 0.04} p={[0, (h - 0.04) / 2, 0]} m={m.woodDark} seg={36} />
                <BookStack x={w * 0.12} y={h} z={-w * 0.08} m={m} />
                <Cyl rt={0.075} rb={0.05} h={0.06} p={[-w * 0.2, h + 0.03, w * 0.1]} m={m.ceramic} />
            </>
        );
    }
    return (
        <>
            <RBox size={[w, 0.04, d]} radius={0.014} p={[0, h - 0.02, 0]} m={m.wood} />
            <Legs w={w} d={d} h={h - 0.04} inset={0.06} radius={0.016} m={m.metal} />
            <Box size={[w - 0.14, 0.018, d - 0.14]} p={[0, 0.12, 0]} m={m.wood} />
            <BookStack x={w * 0.18} y={h} z={-d * 0.1} m={m} />
            <Cyl rt={0.075} rb={0.05} h={0.06} p={[-w * 0.22, h + 0.03, d * 0.08]} m={m.ceramic} />
        </>
    );
}

function TvUnit({ w, d, h, m }: ModelProps) {
    const legH = Math.min(0.1, h * 0.2);
    const bodyH = h - legH;
    const n = Math.max(2, Math.round(w / 0.6));
    const sw = Math.min(w * 0.8, 1.45);
    const sh = sw * 0.5625;
    const sz = -d / 2 + 0.04;
    return (
        <>
            <Legs w={w} d={d} h={legH} inset={0.06} radius={0.014} m={m.metal} />
            <RBox size={[w, bodyH, d]} radius={0.01} p={[0, legH + bodyH / 2, 0]} m={m.wood} />
            {Array.from({ length: n - 1 }, (_, i) => (
                <Gap key={i} x={-w / 2 + (w * (i + 1)) / n} y={legH + bodyH / 2} z={d / 2 + 0.001} h={bodyH - 0.03} />
            ))}
            {/* Écran mural au-dessus du meuble */}
            <Box size={[sw, sh, 0.035]} p={[0, h + 0.28 + sh / 2, sz]} m={m.dark} />
            <Box size={[sw - 0.016, sh - 0.016, 0.002]} p={[0, h + 0.28 + sh / 2, sz + 0.0185]} m={m.screen} cast={false} />
            <RBox size={[Math.min(0.9, sw * 0.6), 0.065, 0.09]} radius={0.02} p={[0, h + 0.0325, -d * 0.05]} m={m.dark} />
        </>
    );
}

function Rug({ w, d, m }: ModelProps) {
    return (
        <>
            <RBox size={[w, 0.01, d]} radius={0.004} p={[0, 0.009, 0]} m={m.rugBorder} cast={false} />
            <Box size={[Math.max(0.05, w - 0.16), 0.002, Math.max(0.05, d - 0.16)]} p={[0, 0.0145, 0]} m={m.rugField} cast={false} />
        </>
    );
}

function DiningTable({ w, d, h, m }: ModelProps) {
    const round = Math.abs(w - d) < 0.06 && w < 1.4;
    if (round) {
        return (
            <>
                <Cyl rt={w / 2} h={0.04} p={[0, h - 0.02, 0]} m={m.wood} seg={48} />
                <Cyl rt={0.06} h={h - 0.06} p={[0, (h - 0.04) / 2 + 0.01, 0]} m={m.woodDark} />
                <Cyl rt={Math.min(0.3, w * 0.3)} rb={Math.min(0.32, w * 0.32)} h={0.03} p={[0, 0.015, 0]} m={m.woodDark} seg={36} />
                <Cyl rt={0.09} rb={0.06} h={0.07} p={[0, h + 0.035, 0]} m={m.ceramic} />
            </>
        );
    }
    const legH = h - 0.04;
    const lx = w / 2 - 0.08, lz = d / 2 - 0.08;
    return (
        <>
            <RBox size={[w, 0.04, d]} radius={0.012} p={[0, h - 0.02, 0]} m={m.wood} />
            {([[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]] as const).map(([x, z]) => (
                <Box key={`${x}|${z}`} size={[0.05, legH, 0.05]} p={[x, legH / 2, z]} m={m.woodDark} />
            ))}
            <Box size={[w - 0.2, 0.07, d - 0.2]} p={[0, h - 0.075, 0]} m={m.wood} />
            <Box size={[w * 0.5, 0.004, Math.min(0.35, d * 0.35)]} p={[0, h + 0.002, 0]} m={m.linen} cast={false} />
            <Cyl rt={0.1} rb={0.065} h={0.08} p={[w * 0.08, h + 0.04, 0]} m={m.ceramic} />
        </>
    );
}

function Chair({ w, d, h, m }: ModelProps) {
    const seatY = Math.min(0.47, h * 0.55);
    const backH = Math.max(0.15, Math.min(0.36, h - seatY - 0.08));
    const bz = -d / 2 + 0.03;
    return (
        <>
            <Legs w={w} d={d} h={seatY - 0.04} inset={0.035} radius={0.014} m={m.wood} taper={0.75} />
            <RBox size={[w, 0.04, d * 0.94]} radius={0.015} p={[0, seatY - 0.02, 0]} m={m.wood} />
            <RBox size={[w - 0.05, 0.035, d * 0.82]} radius={0.015} p={[0, seatY + 0.0175, 0.01]} m={m.fabric} />
            {[-1, 1].map(s => (
                <Cyl key={s} rt={0.013} h={h - seatY} p={[s * (w / 2 - 0.035), seatY + (h - seatY) / 2 - 0.01, bz]} m={m.wood} seg={12} />
            ))}
            <RBox size={[w * 0.94, backH, 0.03]} radius={0.012} p={[0, h - backH / 2, bz]} r={[-0.08, 0, 0]} m={m.wood} />
        </>
    );
}

/** Lit : sommier tapissier, tête de lit, matelas, couette au rabat replié, plaid et oreillers */
function Bed({ w, d, h, m, double }: ModelProps & { double: boolean }) {
    const legH = 0.08;
    const frameTop = 0.34;
    const matTop = 0.54;
    const headH = Math.max(h, 0.95);
    const headZ = -d / 2 + 0.045;
    const matFrom = -d / 2 + 0.09;
    const duvetFrom = matFrom + 0.6;
    const duvetTo = d / 2 + 0.012;
    const dd = duvetTo - duvetFrom;
    const pw = double ? (w - 0.2) / 2 : Math.min(0.62, w - 0.2);
    return (
        <>
            <Legs w={w} d={d - 0.1} h={legH} inset={0.06} radius={0.02} m={m.woodDark} />
            <RBox size={[w, frameTop - legH, d - 0.08]} radius={0.03} p={[0, legH + (frameTop - legH) / 2, 0.04]} m={m.fabric} />
            <RBox size={[w + 0.02, headH - 0.04, 0.09]} radius={0.035} p={[0, 0.04 + (headH - 0.04) / 2, headZ]} m={m.fabric} />
            <RBox size={[w - 0.05, matTop - frameTop, d - 0.1]} radius={0.05} p={[0, (frameTop + matTop) / 2, 0.04]} m={m.white} />
            {/* Couette tombant sur les côtés */}
            <RBox size={[w + 0.03, 0.27, dd]} radius={0.04} p={[0, matTop + 0.06 - 0.135, duvetFrom + dd / 2]} m={m.linen} />
            <RBox size={[w + 0.036, 0.09, 0.28]} radius={0.04} p={[0, matTop + 0.075, duvetFrom + 0.14]} m={m.white} />
            <RBox size={[w + 0.046, 0.28, 0.44]} radius={0.035} p={[0, matTop + 0.065 - 0.14, duvetTo - 0.22]} m={m.accent} />
            {Array.from({ length: double ? 2 : 1 }, (_, i) => {
                const x = double ? (i === 0 ? -1 : 1) * (pw / 2 + 0.04) : 0;
                return <RBox key={i} size={[pw, 0.13, 0.42]} radius={0.06} p={[x, matTop + 0.085, matFrom + 0.26]} r={[-0.35, 0, 0]} m={m.white} />;
            })}
            {double && <RBox size={[0.42, 0.11, 0.3]} radius={0.05} p={[0, matTop + 0.08, matFrom + 0.52]} r={[-0.55, 0, 0]} m={m.fabricAlt} />}
        </>
    );
}

function Nightstand({ w, d, h, m }: ModelProps) {
    const legH = Math.min(0.12, h * 0.25);
    const bodyH = h - legH;
    const lx = w * 0.12, lz = -d * 0.1;
    return (
        <>
            <Legs w={w} d={d} h={legH} inset={0.04} radius={0.012} m={m.woodDark} />
            <RBox size={[w, bodyH, d]} radius={0.012} p={[0, legH + bodyH / 2, 0]} m={m.wood} />
            <Gap y={legH + bodyH * 0.55} z={d / 2 + 0.001} w={w - 0.04} h={0.005} />
            <Ball radius={0.012} p={[0, legH + bodyH * 0.3, d / 2 + 0.01]} m={m.metal} />
            {/* Lampe de chevet : pied céramique, abat-jour lumineux */}
            <Cyl rt={0.045} rb={0.06} h={0.16} p={[lx, h + 0.08, lz]} m={m.ceramic} />
            <Cyl rt={0.008} h={0.05} p={[lx, h + 0.185, lz]} m={m.metal} seg={10} />
            <Cyl rt={0.09} rb={0.12} h={0.16} p={[lx, h + 0.29, lz]} m={m.light} cast={false} />
        </>
    );
}

function Wardrobe({ w, d, h, m }: ModelProps) {
    const plinth = 0.06;
    const n = Math.max(1, Math.round(w / 0.5));
    const doorW = w / n;
    const fz = d / 2;
    return (
        <>
            <Box size={[w - 0.02, plinth, d - 0.04]} p={[0, plinth / 2, -0.02]} m={m.dark} />
            <Box size={[w, h - plinth, d]} p={[0, plinth + (h - plinth) / 2, 0]} m={m.front} />
            {Array.from({ length: n - 1 }, (_, i) => (
                <Gap key={i} x={-w / 2 + doorW * (i + 1)} y={plinth + (h - plinth) / 2} z={fz + 0.001} h={h - plinth - 0.01} />
            ))}
            {Array.from({ length: n }, (_, i) => {
                // Poignées côte à côte au centre de chaque paire de portes
                const left = -w / 2 + doorW * i;
                const hx = n === 1 ? left + doorW - 0.06 : i % 2 === 0 ? left + doorW - 0.05 : left + 0.05;
                return <Cyl key={i} rt={0.008} h={0.36} p={[hx, Math.min(1.1, h * 0.5), fz + 0.022]} m={m.metal} seg={10} />;
            })}
        </>
    );
}

function Desk({ w, d, h, m }: ModelProps) {
    const lx = w / 2 - 0.05, lz = d / 2 - 0.05;
    return (
        <>
            <RBox size={[w, 0.03, d]} radius={0.01} p={[0, h - 0.015, 0]} m={m.wood} />
            {([[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]] as const).map(([x, z]) => (
                <Box key={`${x}|${z}`} size={[0.03, h - 0.03, 0.03]} p={[x, (h - 0.03) / 2, z]} m={m.metal} />
            ))}
            <Box size={[w - 0.1, 0.03, 0.02]} p={[0, h - 0.06, -lz]} m={m.metal} />
            {/* Ordinateur portable ouvert */}
            <Box size={[0.32, 0.014, 0.22]} p={[w * 0.05, h + 0.007, 0.03]} m={m.appliance} />
            <Box size={[0.32, 0.21, 0.008]} p={[w * 0.05, h + 0.11, -0.085]} r={[-0.22, 0, 0]} m={m.dark} />
            {/* Lampe de bureau */}
            <Cyl rt={0.06} h={0.02} p={[-w / 2 + 0.16, h + 0.01, -d / 2 + 0.13]} m={m.metal} />
            <Cyl rt={0.008} h={0.38} p={[-w / 2 + 0.16, h + 0.2, -d / 2 + 0.13]} m={m.metal} seg={10} />
            <Cyl rt={0.03} rb={0.075} h={0.1} p={[-w / 2 + 0.16, h + 0.42, -d / 2 + 0.13]} m={m.light} cast={false} />
        </>
    );
}

function OfficeChair({ w, d, h, m }: ModelProps) {
    const spoke = Math.min(0.3, w * 0.45);
    const seatY = 0.47;
    const backH = Math.max(0.25, Math.min(0.5, h - seatY - 0.12));
    return (
        <>
            {Array.from({ length: 5 }, (_, k) => {
                const a = (k * Math.PI * 2) / 5;
                return (
                    <group key={k}>
                        <Box size={[spoke, 0.03, 0.04]} p={[Math.cos(a) * spoke / 2, 0.07, Math.sin(a) * spoke / 2]} r={[0, -a, 0]} m={m.metal} />
                        <Ball radius={0.028} p={[Math.cos(a) * spoke, 0.03, Math.sin(a) * spoke]} m={m.dark} />
                    </group>
                );
            })}
            <Cyl rt={0.025} h={seatY - 0.1} p={[0, 0.07 + (seatY - 0.1) / 2, 0]} m={m.steel} seg={16} />
            <RBox size={[w * 0.9, 0.08, d * 0.82]} radius={0.035} p={[0, seatY, 0.02]} m={m.fabricAlt} />
            <Box size={[0.05, backH * 0.8, 0.02]} p={[0, seatY + backH * 0.3, -d / 2 + 0.05]} m={m.metal} />
            <RBox size={[w * 0.82, backH, 0.06]} radius={0.03} p={[0, h - backH / 2, -d / 2 + 0.07]} r={[-0.1, 0, 0]} m={m.fabricAlt} />
        </>
    );
}

/** Livres d'une bibliothèque, fusionnés en une seule géométrie à couleurs de sommets */
function Books({ w, d, shelves, spacing, m, seed }: { w: number; d: number; shelves: number; spacing: number; m: Mats; seed: number }) {
    const colors = m.bookColors;
    const geometry = useMemo(() => {
        const rand = seeded(seed);
        const parts: THREE.BufferGeometry[] = [];
        const color = new THREE.Color();
        const clear = spacing - 0.025;
        for (let s = 0; s < shelves; s++) {
            const yb = 0.025 + s * spacing;
            let x = -w / 2 + 0.03 + rand() * 0.1;
            let run = 3 + Math.floor(rand() * 10);
            while (x < w / 2 - 0.06) {
                if (run <= 0) {
                    // Respiration entre deux rangées de livres
                    x += 0.08 + rand() * 0.18;
                    run = 4 + Math.floor(rand() * 10);
                    continue;
                }
                const bw = 0.02 + rand() * 0.03;
                if (x + bw > w / 2 - 0.03) break;
                const bh = clear * (0.55 + rand() * 0.3);
                const bd = d * (0.62 + rand() * 0.22);
                const g = new THREE.BoxGeometry(bw, bh, bd);
                g.translate(x + bw / 2, yb + bh / 2, -d / 2 + 0.012 + bd / 2);
                color.set(colors[Math.floor(rand() * colors.length)]).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
                const n = g.getAttribute("position").count;
                const arr = new Float32Array(n * 3);
                for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
                g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
                parts.push(g);
                x += bw + 0.002;
                run--;
            }
        }
        const merged = parts.length ? mergeGeometries(parts) : null;
        for (const g of parts) g.dispose();
        return merged;
    }, [w, d, shelves, spacing, seed, colors]);
    useEffect(() => () => geometry?.dispose(), [geometry]);
    if (!geometry) return null;
    return <mesh geometry={geometry} material={m.books} castShadow receiveShadow />;
}

function Bookshelf({ w, d, h, m, seed }: ModelProps) {
    const shelves = Math.max(2, Math.round(h / 0.36));
    const spacing = (h - 0.025) / shelves;
    return (
        <>
            {[-1, 1].map(s => <Box key={s} size={[0.025, h, d]} p={[s * (w / 2 - 0.0125), h / 2, 0]} m={m.wood} />)}
            <Box size={[w, h, 0.01]} p={[0, h / 2, -d / 2 + 0.005]} m={m.woodDark} />
            {Array.from({ length: shelves + 1 }, (_, i) => (
                <Box key={i} size={[w - 0.05, 0.025, d]} p={[0, 0.0125 + i * spacing, 0]} m={m.wood} />
            ))}
            <Books w={w - 0.05} d={d} shelves={shelves} spacing={spacing} m={m} seed={seed} />
        </>
    );
}

/** Linéaire de cuisine : caissons bas, plan de travail, crédence, évier, plaque, four et meubles hauts */
function KitchenRun({ w, d, h, m }: ModelProps) {
    const top = 0.9, wt = 0.04, plinth = 0.1;
    // h = hauteur du plan de travail (0,9 m) ; au-delà de 1,5 m, h donne le haut des meubles hauts
    const upperTop = h > 1.5 ? h : 2.2;
    const upH = 0.72, upD = Math.min(0.35, d * 0.6);
    const bodyH = top - wt - plinth;
    const fz = d / 2 - 0.03;
    const n = Math.max(1, Math.round(w / 0.6));
    const sinkW = Math.min(0.55, w * 0.3), sinkD = Math.min(0.42, d - 0.18);
    const sx = w >= 1.5 ? -w * 0.22 : -w * 0.2;
    const hob = w >= 1.2;
    const hx = w >= 1.5 ? w * 0.22 : w * 0.25;
    return (
        <>
            <Box size={[w, plinth, d - 0.08]} p={[0, plinth / 2, -0.04]} m={m.dark} />
            <Box size={[w, bodyH, d - 0.03]} p={[0, plinth + bodyH / 2, -0.015]} m={m.front} />
            {Array.from({ length: n - 1 }, (_, i) => (
                <Gap key={i} x={-w / 2 + (w * (i + 1)) / n} y={plinth + bodyH / 2} z={fz + 0.002} h={bodyH} />
            ))}
            <Gap y={top - wt - 0.18} z={fz + 0.002} w={w} h={0.005} />
            <Box size={[w, wt, d]} p={[0, top - wt / 2, 0]} m={m.counter} />
            {/* Évier inox et mitigeur */}
            <Box size={[sinkW, 0.004, sinkD]} p={[sx, top + 0.002, 0.03]} m={m.steel} cast={false} />
            <Box size={[sinkW - 0.04, 0.004, sinkD - 0.04]} p={[sx, top + 0.0035, 0.03]} m={m.ring} cast={false} />
            <Cyl rt={0.015} h={0.3} p={[sx, top + 0.15, -d / 2 + 0.07]} m={m.steel} seg={12} />
            <Cyl rt={0.012} h={0.18} p={[sx, top + 0.29, -d / 2 + 0.16]} r={[Math.PI / 2, 0, 0]} m={m.steel} seg={12} />
            {hob && (
                <>
                    <Box size={[0.58, 0.006, 0.5]} p={[hx, top + 0.003, 0.02]} m={m.screen} cast={false} />
                    {([[-0.14, -0.11, 0.1], [0.14, -0.11, 0.08], [-0.14, 0.12, 0.08], [0.14, 0.12, 0.1]] as const).map(([x, z, r]) => (
                        <Cyl key={`${x}|${z}`} rt={r} h={0.001} p={[hx + x, top + 0.0065, 0.02 + z]} m={m.ring} seg={32} cast={false} />
                    ))}
                    {/* Four encastré sous la plaque */}
                    <Box size={[0.58, 0.58, 0.006]} p={[hx, plinth + 0.04 + 0.29, fz + 0.004]} m={m.screen} cast={false} />
                    <Cyl rt={0.009} h={0.5} p={[hx, plinth + 0.04 + 0.54, fz + 0.03]} r={[0, 0, Math.PI / 2]} m={m.steel} seg={10} />
                </>
            )}
            {/* Crédence, meubles hauts et réglette LED en sous-face */}
            <Box size={[w, upperTop - upH - top, 0.015]} p={[0, (top + upperTop - upH) / 2, -d / 2 + 0.0075]} m={m.counter} />
            <Box size={[w, upH, upD]} p={[0, upperTop - upH / 2, -d / 2 + upD / 2]} m={m.front} />
            {Array.from({ length: n - 1 }, (_, i) => (
                <Gap key={`u${i}`} x={-w / 2 + (w * (i + 1)) / n} y={upperTop - upH / 2} z={-d / 2 + upD + 0.002} h={upH} />
            ))}
            <Box size={[w - 0.04, 0.01, 0.02]} p={[0, upperTop - upH - 0.006, -d / 2 + upD - 0.04]} m={m.light} cast={false} />
        </>
    );
}

/** Îlot : caissons, plan en cascade, débord côté +Z avec tabourets */
function KitchenIsland({ w, d, h, m }: ModelProps) {
    const top = Math.max(0.75, Math.min(1.05, h));
    const overhang = d > 0.8 ? 0.28 : 0;
    const bd = d - overhang;
    const bodyZ = -d / 2 + bd / 2;
    const n = Math.max(1, Math.round(w / 0.6));
    const stools = overhang > 0 ? Math.max(1, Math.floor((w - 0.2) / 0.6)) : 0;
    return (
        <>
            <Box size={[w - 0.1, 0.1, bd - 0.08]} p={[0, 0.05, bodyZ]} m={m.dark} />
            <Box size={[w - 0.08, top - 0.14, bd]} p={[0, 0.1 + (top - 0.14) / 2, bodyZ]} m={m.front} />
            {Array.from({ length: n - 1 }, (_, i) => (
                <Gap key={i} x={-w / 2 + 0.04 + ((w - 0.08) * (i + 1)) / n} y={0.1 + (top - 0.14) / 2} z={-d / 2 - 0.002} h={top - 0.15} />
            ))}
            <Box size={[w, 0.04, d]} p={[0, top - 0.02, 0]} m={m.counter} />
            {[-1, 1].map(s => <Box key={s} size={[0.04, top - 0.04, d]} p={[s * (w / 2 - 0.02), (top - 0.04) / 2, 0]} m={m.counter} />)}
            {Array.from({ length: stools }, (_, i) => {
                const x = -((stools - 1) * 0.6) / 2 + i * 0.6;
                const z = d / 2 - overhang + 0.12;
                const sy = top - 0.26;
                return (
                    <group key={i}>
                        <Cyl rt={0.17} h={0.05} p={[x, sy, z]} m={m.fabricAlt} seg={32} />
                        <Cyl rt={0.018} h={sy - 0.03} p={[x, (sy - 0.03) / 2, z]} m={m.metal} seg={12} />
                        <Cyl rt={0.17} rb={0.19} h={0.015} p={[x, 0.0075, z]} m={m.metal} seg={32} />
                    </group>
                );
            })}
        </>
    );
}

function Fridge({ w, d, h, m }: ModelProps) {
    const combi = h > 1.3;
    const split = h * 0.36;
    const hx = w / 2 - 0.06;
    return (
        <>
            <RBox size={[w, h, d]} radius={0.02} p={[0, h / 2, 0]} m={m.appliance} />
            {combi && <Gap y={split} z={d / 2 + 0.001} w={w - 0.01} h={0.005} />}
            <Cyl rt={0.01} h={combi ? 0.45 : 0.3} p={[hx, combi ? split + 0.35 : h * 0.7, d / 2 + 0.025]} m={m.steel} seg={10} />
            {combi && <Cyl rt={0.01} h={0.28} p={[hx, split - 0.22, d / 2 + 0.025]} m={m.steel} seg={10} />}
        </>
    );
}

/** Baignoire : fond et parois céramique formant une vraie cuve */
function Bathtub({ w, d, h, m }: ModelProps) {
    const t = 0.07;
    return (
        <>
            <RBox size={[w, 0.1, d]} radius={0.03} p={[0, 0.05, 0]} m={m.ceramic} />
            {[-1, 1].map(s => <RBox key={`l${s}`} size={[w, h, t]} radius={0.03} p={[0, h / 2, s * (d / 2 - t / 2)]} m={m.ceramic} />)}
            {[-1, 1].map(s => <RBox key={`s${s}`} size={[t, h, d - 0.02]} radius={0.03} p={[s * (w / 2 - t / 2), h / 2, 0]} m={m.ceramic} />)}
            <Box size={[w - 2 * t, 0.004, d - 2 * t]} p={[0, 0.102, 0]} m={m.basin} cast={false} />
            <Cyl rt={0.02} h={0.08} p={[-w / 2 + t / 2, h + 0.04, 0]} m={m.steel} seg={12} />
            <Cyl rt={0.012} h={0.11} p={[-w / 2 + t / 2 + 0.05, h + 0.07, 0]} r={[0, 0, Math.PI / 2]} m={m.steel} seg={12} />
        </>
    );
}

/** Douche à l'italienne : receveur, paroi vitrée fixe, colonne de douche au mur */
function Shower({ w, d, h, m }: ModelProps) {
    const gh = Math.min(Math.max(h, 1.8), 2.0);
    const gw = w * 0.62;
    const gx = w / 2 - gw / 2;
    const cx = -w * 0.15;
    const back = -d / 2 + 0.04;
    return (
        <>
            <RBox size={[w, 0.05, d]} radius={0.012} p={[0, 0.025, 0]} m={m.ceramic} />
            <Cyl rt={0.05} h={0.002} p={[w * 0.25, 0.051, d * 0.2]} m={m.steel} cast={false} />
            <Box size={[gw, gh, 0.008]} p={[gx, 0.05 + gh / 2, d / 2 - 0.01]} m={m.glass} cast={false} />
            <Box size={[gw, 0.02, 0.02]} p={[gx, 0.05 + gh, d / 2 - 0.01]} m={m.steel} />
            <Box size={[0.02, 0.02, d - 0.02]} p={[w / 2 - 0.01, 0.05 + gh, 0]} m={m.steel} />
            <Cyl rt={0.012} h={1.9} p={[cx, 0.05 + 0.95, back]} m={m.steel} seg={12} />
            <RBox size={[0.14, 0.06, 0.05]} radius={0.015} p={[cx, 1.05, back + 0.02]} m={m.steel} />
            <Cyl rt={0.01} h={0.28} p={[cx, 1.94, back + 0.14]} r={[Math.PI / 2, 0, 0]} m={m.steel} seg={10} />
            <Cyl rt={0.12} h={0.012} p={[cx, 1.93, back + 0.28]} m={m.steel} seg={36} />
        </>
    );
}

/** Meuble vasque suspendu, vasque(s) à poser, robinetterie et miroir rétroéclairé */
function Vanity({ w, d, h, m }: ModelProps) {
    const cabTop = h - 0.03;
    const cabBottom = Math.min(0.35, cabTop - 0.2);
    const n = w >= 1.2 ? 2 : 1;
    const br = Math.min(0.21, w * 0.22);
    const mw = Math.max(0.4, w * 0.85);
    const mh = 0.75;
    const my = h + 0.32 + mh / 2;
    return (
        <>
            <Box size={[w, cabTop - cabBottom, d]} p={[0, (cabTop + cabBottom) / 2, 0]} m={m.wood} />
            {w > 0.8 && <Gap y={(cabTop + cabBottom) / 2} z={d / 2 + 0.001} h={cabTop - cabBottom - 0.02} />}
            <Box size={[w, 0.03, d]} p={[0, h - 0.015, 0]} m={m.counter} />
            {Array.from({ length: n }, (_, i) => {
                const bx = n === 2 ? (i === 0 ? -w / 4 : w / 4) : 0;
                return (
                    <group key={i}>
                        <Cyl rt={br} rb={br * 0.78} h={0.13} p={[bx, h + 0.065, 0.02]} m={m.ceramic} seg={40} />
                        <Cyl rt={br * 0.86} h={0.002} p={[bx, h + 0.131, 0.02]} m={m.basin} seg={40} cast={false} />
                        <Cyl rt={0.012} h={0.26} p={[bx, h + 0.13, -d / 2 + 0.06]} m={m.steel} seg={12} />
                        <Cyl rt={0.01} h={0.12} p={[bx, h + 0.25, -d / 2 + 0.12]} r={[Math.PI / 2, 0, 0]} m={m.steel} seg={10} />
                    </group>
                );
            })}
            <Box size={[mw + 0.03, mh + 0.03, 0.015]} p={[0, my, -d / 2 + 0.0075]} m={m.metal} />
            <Box size={[mw, mh, 0.01]} p={[0, my, -d / 2 + 0.02]} m={m.mirror} />
            <Box size={[mw * 0.6, 0.025, 0.04]} p={[0, my + mh / 2 + 0.05, -d / 2 + 0.03]} m={m.light} cast={false} />
        </>
    );
}

function Toilet({ w, d, h, m }: ModelProps) {
    const bowlD = d * 0.72;
    const sz = bowlD / w;
    const bz = d / 2 - bowlD / 2;
    const tankH = Math.max(0.25, h - 0.4);
    return (
        <>
            <Cyl rt={w * 0.3} rb={w * 0.34} h={0.28} p={[0, 0.14, bz - 0.03]} s={[1, 1, 1.25]} m={m.ceramic} seg={32} />
            <Cyl rt={w / 2} rb={w * 0.36} h={0.13} p={[0, 0.335, bz]} s={[1, 1, sz]} m={m.ceramic} seg={40} />
            <Cyl rt={w / 2} h={0.025} p={[0, 0.4125, bz]} s={[1, 1, sz]} m={m.ceramic} seg={40} />
            <RBox size={[w * 0.95, tankH, 0.17]} radius={0.025} p={[0, 0.4 + tankH / 2, -d / 2 + 0.085]} m={m.ceramic} />
            <Cyl rt={0.025} h={0.01} p={[0, 0.4 + tankH + 0.005, -d / 2 + 0.085]} m={m.steel} seg={20} />
        </>
    );
}

function Washer({ w, d, h, m }: ModelProps) {
    const dy = h * 0.45;
    const r = Math.min(0.2, w * 0.34);
    return (
        <>
            <RBox size={[w, h, d]} radius={0.015} p={[0, h / 2, 0]} m={m.appliance} />
            <Box size={[w - 0.04, 0.1, 0.004]} p={[0, h - 0.07, d / 2 + 0.002]} m={m.screen} cast={false} />
            <Cyl rt={0.028} h={0.02} p={[w * 0.28, h - 0.07, d / 2 + 0.01]} r={[Math.PI / 2, 0, 0]} m={m.steel} seg={20} />
            <Cyl rt={r} h={0.03} p={[0, dy, d / 2 + 0.015]} r={[Math.PI / 2, 0, 0]} m={m.steel} seg={40} />
            <Cyl rt={r * 0.74} h={0.034} p={[0, dy, d / 2 + 0.017]} r={[Math.PI / 2, 0, 0]} m={m.screen} seg={40} />
        </>
    );
}

/** Plante : pot, terre et feuillage en sphères facettées (couleurs et positions déterministes) */
function Plant({ w, h, m, seed }: ModelProps) {
    const potH = Math.min(0.42, h * 0.32);
    const rt = w * 0.36;
    const leaves = useMemo(() => {
        const rand = seeded(seed);
        const count = h > 0.9 ? 8 : 5;
        const crown = h - potH;
        return Array.from({ length: count }, (_, i) => {
            const fr = w * (0.17 + rand() * 0.11);
            const a = rand() * Math.PI * 2;
            const rad = w * rand() * 0.22;
            const y = Math.min(h - fr * 0.8, potH + crown * (0.35 + (i / count) * 0.65) + fr * 0.2);
            return { x: Math.cos(a) * rad, y, z: Math.sin(a) * rad, fr, sy: 0.85 + rand() * 0.3, k: i % 3 };
        });
    }, [seed, w, h, potH]);
    return (
        <>
            <Cyl rt={rt} rb={w * 0.28} h={potH} p={[0, potH / 2, 0]} m={m.pot} seg={32} />
            <Cyl rt={rt * 0.92} h={0.01} p={[0, potH - 0.02, 0]} m={m.soil} seg={32} cast={false} />
            <Cyl rt={0.015} h={(h - potH) * 0.6} p={[0, potH + (h - potH) * 0.3, 0]} m={m.woodDark} seg={8} />
            {leaves.map((l, i) => (
                <Ball key={i} radius={l.fr} p={[l.x, l.y, l.z]} s={[1, l.sy, 1]} m={m.leaves[l.k]} ico />
            ))}
        </>
    );
}

function FloorLamp({ w, h, m }: ModelProps) {
    const shadeH = 0.3;
    const rb = Math.min(0.2, w / 2);
    return (
        <>
            <Cyl rt={Math.min(0.14, w * 0.4)} h={0.025} p={[0, 0.0125, 0]} m={m.metal} seg={32} />
            <Cyl rt={0.012} h={h - shadeH} p={[0, (h - shadeH) / 2 + 0.02, 0]} m={m.metal} seg={10} />
            <Cyl rt={rb * 0.75} rb={rb} h={shadeH} p={[0, h - shadeH / 2, 0]} m={m.light} seg={32} cast={false} />
        </>
    );
}

function OutdoorTable({ w, d, h, m }: ModelProps) {
    if (Math.abs(w - d) < 0.06) {
        return (
            <>
                <Cyl rt={w / 2} h={0.03} p={[0, h - 0.015, 0]} m={m.wood} seg={40} />
                <Cyl rt={0.03} h={h - 0.03} p={[0, (h - 0.03) / 2, 0]} m={m.metal} seg={12} />
                <Cyl rt={Math.min(0.28, w * 0.3)} h={0.02} p={[0, 0.01, 0]} m={m.metal} seg={32} />
            </>
        );
    }
    const n = Math.max(4, Math.round(w / 0.1));
    const sw = w / n;
    const lx = w / 2 - 0.05, lz = d / 2 - 0.05;
    return (
        <>
            {Array.from({ length: n }, (_, i) => (
                <Box key={i} size={[sw - 0.012, 0.025, d]} p={[-w / 2 + sw * (i + 0.5), h - 0.0125, 0]} m={m.wood} />
            ))}
            {[-1, 1].map(s => <Box key={s} size={[w - 0.1, 0.04, 0.02]} p={[0, h - 0.045, s * lz]} m={m.metal} />)}
            {([[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]] as const).map(([x, z]) => (
                <Box key={`${x}|${z}`} size={[0.035, h - 0.025, 0.035]} p={[x, (h - 0.025) / 2, z]} m={m.metal} />
            ))}
        </>
    );
}

/** Bain de soleil : grand axe le long de la plus grande dimension, dossier relevé côté arrière */
function Lounger({ w, d, m }: ModelProps) {
    const long = Math.max(w, d), short = Math.min(w, d);
    const frameY = 0.28;
    const flat = long * 0.62;
    const back = long * 0.36;
    const hinge = long / 2 - flat - 0.03;
    const tilt = 0.6;
    const lx = short / 2 - 0.05, lz = long / 2 - 0.08;
    return (
        <group rotation={[0, w > d ? Math.PI / 2 : 0, 0]}>
            {([[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]] as const).map(([x, z]) => (
                <Box key={`${x}|${z}`} size={[0.04, frameY - 0.025, 0.04]} p={[x, (frameY - 0.025) / 2, z]} m={m.wood} />
            ))}
            <RBox size={[short, 0.05, long]} radius={0.015} p={[0, frameY, 0]} m={m.wood} />
            <RBox size={[short - 0.06, 0.07, flat]} radius={0.03} p={[0, frameY + 0.06, long / 2 - flat / 2 - 0.03]} m={m.linen} />
            <RBox size={[short - 0.06, 0.07, back]} radius={0.03} p={[0, frameY + 0.06 + (back / 2) * Math.sin(tilt), hinge - (back / 2) * Math.cos(tilt)]} r={[tilt, 0, 0]} m={m.linen} />
        </group>
    );
}

function Console({ w, d, h, m }: ModelProps) {
    const mr = Math.min(0.38, w * 0.3);
    return (
        <>
            <RBox size={[w, 0.03, d]} radius={0.01} p={[0, h - 0.015, 0]} m={m.wood} />
            <Legs w={w} d={d} h={h - 0.03} inset={0.03} radius={0.012} m={m.metal} />
            <Box size={[w - 0.06, 0.02, d - 0.04]} p={[0, 0.18, 0]} m={m.wood} />
            <Cyl rt={0.05} rb={0.07} h={0.26} p={[-w * 0.3, h + 0.13, 0]} m={m.ceramic} seg={24} />
            <BookStack x={w * 0.22} y={h} z={0} m={m} />
            {/* Miroir rond au-dessus de la console */}
            <Cyl rt={mr + 0.02} h={0.015} p={[0, h + 0.3 + mr, -d / 2 + 0.008]} r={[Math.PI / 2, 0, 0]} m={m.metal} seg={48} />
            <Cyl rt={mr} h={0.012} p={[0, h + 0.3 + mr, -d / 2 + 0.018]} r={[Math.PI / 2, 0, 0]} m={m.mirror} seg={48} />
        </>
    );
}

function Sideboard({ w, d, h, m }: ModelProps) {
    const legH = Math.min(0.14, h * 0.2);
    const bodyH = h - legH;
    const n = Math.max(2, Math.round(w / 0.45));
    return (
        <>
            <Legs w={w} d={d} h={legH} inset={0.06} radius={0.015} m={m.metal} taper={0.65} />
            <RBox size={[w, bodyH, d]} radius={0.012} p={[0, legH + bodyH / 2, 0]} m={m.woodDark} />
            {Array.from({ length: n - 1 }, (_, i) => (
                <Gap key={i} x={-w / 2 + (w * (i + 1)) / n} y={legH + bodyH / 2} z={d / 2 + 0.001} h={bodyH - 0.03} />
            ))}
            {/* Lampe à poser */}
            <Ball radius={0.09} p={[-w * 0.32, h + 0.09, 0]} m={m.ceramic} />
            <Cyl rt={0.11} rb={0.15} h={0.18} p={[-w * 0.32, h + 0.3, 0]} m={m.light} cast={false} />
            <BookStack x={w * 0.24} y={h} z={0} m={m} />
            <Cyl rt={0.11} rb={0.07} h={0.06} p={[w * 0.02, h + 0.03, 0]} m={m.ceramic} />
        </>
    );
}

function Fallback({ w, d, h, m }: ModelProps) {
    return <RBox size={[w, h, d]} radius={0.03} p={[0, h / 2, 0]} m={m.fabric} />;
}

function renderModel(type: FurnitureType, p: ModelProps) {
    switch (type) {
        case "sofa": return <Sofa {...p} />;
        case "armchair": return <Armchair {...p} />;
        case "coffee_table": return <CoffeeTable {...p} />;
        case "tv_unit": return <TvUnit {...p} />;
        case "rug": return <Rug {...p} />;
        case "dining_table": return <DiningTable {...p} />;
        case "chair": return <Chair {...p} />;
        case "bed_double": return <Bed {...p} double />;
        case "bed_single": return <Bed {...p} double={false} />;
        case "nightstand": return <Nightstand {...p} />;
        case "wardrobe": return <Wardrobe {...p} />;
        case "desk": return <Desk {...p} />;
        case "office_chair": return <OfficeChair {...p} />;
        case "bookshelf": return <Bookshelf {...p} />;
        case "kitchen_run": return <KitchenRun {...p} />;
        case "kitchen_island": return <KitchenIsland {...p} />;
        case "fridge": return <Fridge {...p} />;
        case "bathtub": return <Bathtub {...p} />;
        case "shower": return <Shower {...p} />;
        case "vanity": return <Vanity {...p} />;
        case "toilet": return <Toilet {...p} />;
        case "washer": return <Washer {...p} />;
        case "plant": return <Plant {...p} />;
        case "floor_lamp": return <FloorLamp {...p} />;
        case "outdoor_table": return <OutdoorTable {...p} />;
        case "lounger": return <Lounger {...p} />;
        case "console": return <Console {...p} />;
        case "sideboard": return <Sideboard {...p} />;
        default: return <Fallback {...p} />;
    }
}

/**
 * Meuble rendu dans son repère local (origine au centre de l'emprise, au sol,
 * façade vers +Z). Le parent le place et l'oriente.
 */
export function FurnitureMesh({ item, palette }: { item: Furniture; palette: StylePalette }) {
    const m = useMemo(() => paletteMats(palette), [palette]);
    const seed = useMemo(() => hashId(item.id), [item.id]);
    const p: ModelProps = {
        w: Math.max(0.05, item.w),
        d: Math.max(0.05, item.d),
        h: Math.max(0.02, item.h),
        m,
        seed,
    };
    return <group>{renderModel(item.type, p)}</group>;
}
