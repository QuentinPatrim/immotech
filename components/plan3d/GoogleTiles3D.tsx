"use client";

/* ============================================================
   PLAN 3D — VUE RÉELLE DEPUIS LES FENÊTRES (Google 3D)
   Tuiles 3D photoréalistes de Google autour de l'adresse du bien :
   - recentrées sur l'adresse (nord vers +Z, ouest vers +X), puis
     tournées selon l'orientation du plan (cap du haut du plan) ;
   - le sol réel (rue) est calé à la hauteur de l'étage : on relève
     l'altitude de la rue tout autour du bâtiment ;
   - le bâtiment lui-même est découpé (boîte de coupe autour du
     logement) pour ne pas masquer les fenêtres ;
   - attributions Google affichées sur la vue (obligatoires).
   Active seulement en visite, avec une clé Map Tiles API.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { TilesAttributionOverlay, TilesPlugin, TilesRenderer } from "3d-tiles-renderer/r3f";
import { GLTFExtensionsPlugin, GoogleCloudAuthPlugin, ReorientationPlugin, TileCompressionPlugin, TilesFadePlugin } from "3d-tiles-renderer/plugins";
import type { TilesRenderer as TilesRendererImpl } from "3d-tiles-renderer/three";

const DEG = Math.PI / 180;

export default function GoogleTiles3D({ apiKey, lat, lng, north, groundY, halfX, halfZ }: {
    apiKey: string;
    lat: number;
    lng: number;
    /** Cap (degrés) du haut du plan */
    north: number;
    /** Hauteur de la rue dans la scène (sous le logement) */
    groundY: number;
    /** Demi-emprise du logement (m), marge comprise : zone découpée */
    halfX: number;
    halfZ: number;
}) {
    const get = useThree(s => s.get);
    // Découpe par plans : à activer sur le moteur de rendu
    useEffect(() => {
        const renderer = get().gl;
        const prev = renderer.localClippingEnabled;
        renderer.localClippingEnabled = true;
        return () => { renderer.localClippingEnabled = prev; };
    }, [get]);

    const draco = useMemo(() => new DRACOLoader().setDecoderPath("/draco/"), []);
    useEffect(() => () => { draco.dispose(); }, [draco]);

    // Boîte de coupe (repère de la scène) : tout ce qui est dans la boîte et au-dessus de la rue disparaît
    const planes = useMemo(() => [
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), -halfX),
        new THREE.Plane(new THREE.Vector3(1, 0, 0), -halfX),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), -halfZ),
        new THREE.Plane(new THREE.Vector3(0, 0, 1), -halfZ),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), groundY + 0.6),
    ], [halfX, halfZ, groundY]);

    const tiles = useRef<TilesRendererImpl>(null);
    const wrap = useRef<THREE.Group>(null);
    const [lift, setLift] = useState<number | null>(null);
    const measured = useRef(0);

    /** Altitude de la rue : rayons verticaux sur un anneau autour du bâtiment, point le plus bas */
    const measureGround = () => {
        const t = tiles.current;
        if (!t || measured.current > 6) return;
        measured.current++;
        const ray = new THREE.Raycaster();
        const hits: number[] = [];
        const r0 = Math.max(halfX, halfZ) + 8;
        for (const r of [r0, r0 + 12]) {
            for (let k = 0; k < 12; k++) {
                const a = (k / 12) * Math.PI * 2;
                ray.set(new THREE.Vector3(Math.cos(a) * r, 2000, Math.sin(a) * r), new THREE.Vector3(0, -1, 0));
                const hit = ray.intersectObject(t.group, true)[0];
                // Altitude dans le repère des tuiles (sans le décalage déjà appliqué)
                if (hit) hits.push(hit.point.y - (wrap.current?.position.y ?? 0));
            }
        }
        if (hits.length < 6) return;
        hits.sort((a, b) => a - b);
        const street = hits[Math.floor(hits.length * 0.15)];
        setLift(groundY - street);
    };

    const applyClip = (scene: THREE.Object3D) => {
        scene.traverse(o => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                m.clippingPlanes = planes;
                m.clipIntersection = true;
                m.needsUpdate = true;
            }
        });
    };

    return (
        // Nord des tuiles (+Z) aligné sur le plan : rotation d'un demi-tour plus le cap du haut du plan
        <group ref={wrap} rotation={[0, north * DEG + Math.PI, 0]} position={[0, lift ?? 0, 0]} visible={lift !== null}>
            <TilesRenderer ref={tiles} errorTarget={4}
                onLoadModel={e => applyClip(e.scene)}
                onTilesLoadEnd={measureGround}>
                <TilesPlugin plugin={GoogleCloudAuthPlugin} args={[{ apiToken: apiKey, autoRefreshToken: true }]} />
                <TilesPlugin plugin={GLTFExtensionsPlugin} args={[{ dracoLoader: draco }]} />
                <TilesPlugin plugin={TileCompressionPlugin} />
                <TilesPlugin plugin={TilesFadePlugin} />
                <TilesPlugin plugin={ReorientationPlugin} args={[{ lat: lat * DEG, lon: lng * DEG, height: 0 }]} />
                <TilesAttributionOverlay style={{ fontSize: 10, opacity: 0.85 }} />
            </TilesRenderer>
        </group>
    );
}
