"use client";

/* ============================================================
   PLAN 3D — MEUBLE RÉALISTE
   Modèle glTF de la bibliothèque, calé sur l'emprise du meuble
   (échelle uniforme bornée, pivoté si ses proportions le
   demandent), posé au sol, ombres portées. Tant qu'il charge, ou
   s'il est indisponible, le meuble simple est affiché à sa place.
   ============================================================ */

import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { Furniture } from "@/lib/plan3d/types";
import { modelUrl } from "@/lib/plan3d/library";

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Fitted({ url, item }: { url: string; item: Furniture }) {
    const { scene } = useGLTF(url);
    const obj = useMemo(() => {
        const root = scene.clone(true);
        root.traverse(o => {
            const m = o as THREE.Mesh;
            if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
        });
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        // Proportions inversées par rapport à l'emprise (meuble modélisé de côté) : quart de tour
        const itemWide = item.w >= item.d, modelWide = size.x >= size.z;
        const turn = Math.abs(item.w - item.d) > 0.15 && Math.abs(size.x - size.z) > 0.15 && itemWide !== modelWide;
        const sx = turn ? size.z : size.x, sz = turn ? size.x : size.z;
        // Échelle uniforme : le modèle garde ses proportions réelles, à ±40 % de sa taille
        const s = Math.min(1.4, Math.max(0.6, Math.min(item.w / Math.max(0.05, sx), item.d / Math.max(0.05, sz))));
        const center = box.getCenter(new THREE.Vector3());
        const wrap = new THREE.Group();
        root.position.set(-center.x, -box.min.y, -center.z);
        const inner = new THREE.Group();
        inner.add(root);
        inner.rotation.y = turn ? Math.PI / 2 : 0;
        inner.scale.setScalar(s);
        wrap.add(inner);
        return wrap;
    }, [scene, item.w, item.d]);
    return <primitive object={obj} />;
}

export default function RealFurniture({ id, item, fallback }: { id: string; item: Furniture; fallback: ReactNode }) {
    const [url, setUrl] = useState<{ id: string; url: string | null; failed: boolean }>({ id, url: null, failed: false });
    useEffect(() => {
        let live = true;
        modelUrl(id).then(u => { if (live) setUrl({ id, url: u, failed: false }); }, () => { if (live) setUrl({ id, url: null, failed: true }); });
        return () => { live = false; };
    }, [id]);
    if (url.id !== id || !url.url) return <>{fallback}</>;
    return (
        <Fallback fallback={fallback}>
            <Suspense fallback={fallback}>
                <Fitted url={url.url} item={item} />
            </Suspense>
        </Fallback>
    );
}
