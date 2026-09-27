"use client";

/* ============================================================
   PLAN 3D — PHOTO HD (lancer de rayons)
   À la demande, la vue courante est recalculée par un moteur de
   lancer de rayons (three-gpu-pathtracer) : lumière indirecte,
   ombres douces, reflets. Les échantillons s'accumulent image
   après image ; à la fin (ou sur demande), le canevas est
   enregistré en JPEG haute qualité.
   Pendant la prise : ciel remplacé par un dégradé (le shader du
   ciel n'est pas calculable par le moteur), poignées masquées.
   ============================================================ */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GradientEquirectTexture, WebGLPathTracer } from "three-gpu-pathtracer";

export interface PhotoJob {
    /** Numéro de demande (incrémenté à chaque prise) */
    id: number;
    /** Échantillons visés (qualité) */
    samples: number;
    /** Arrêt anticipé demandé : on enregistre l'image en l'état */
    stop: boolean;
}

export default function PhotoCapture({ job, outdoor, onProgress, onDone, onFail }: {
    job: PhotoJob;
    /** Couleurs du ciel (jour / nuit) pour l'éclairage d'ambiance */
    outdoor: { top: string; bottom: string };
    onProgress: (p: number) => void;
    onDone: (dataUrl: string) => void;
    onFail: () => void;
}) {
    const get = useThree(s => s.get);
    const tracer = useRef<{ pt: WebGLPathTracer; ready: boolean; restore: () => void; last: number } | null>(null);

    useEffect(() => {
        const { gl, scene, camera } = get();
        const hidden: THREE.Object3D[] = [];
        // Objets non calculables (shader du ciel, poignées, repères) : masqués le temps de la prise
        scene.traverse(o => {
            const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
            const mats = Array.isArray(m) ? m : m ? [m] : [];
            if (o.visible && mats.some(x => (x as THREE.ShaderMaterial).isShaderMaterial || !x.depthTest)) {
                o.visible = false;
                hidden.push(o);
            }
        });
        const prev = { background: scene.background, environment: scene.environment };
        const sky = new GradientEquirectTexture();
        sky.topColor.set(outdoor.top);
        sky.bottomColor.set(outdoor.bottom);
        sky.update();
        scene.background = sky;
        scene.environment = sky;

        const pt = new WebGLPathTracer(gl);
        pt.tiles.set(2, 2);
        pt.minSamples = 1;
        pt.fadeDuration = 0;
        pt.renderDelay = 0;
        pt.dynamicLowRes = false;
        let restored = false;
        const state = {
            pt, ready: false, last: -1,
            restore: () => {
                if (restored) return;
                restored = true;
                for (const o of hidden) o.visible = true;
                scene.background = prev.background;
                scene.environment = prev.environment;
                sky.dispose();
                pt.dispose();
            },
        };
        tracer.current = state;
        // Préparation de la scène (structure d'accélération) : différée pour laisser s'afficher l'avancement
        const prep = window.setTimeout(() => {
            if (restored) return;
            try {
                pt.setScene(scene, camera);
                state.ready = true;
            } catch (e) {
                console.warn("Photo HD :", e);
                state.restore();
                if (tracer.current === state) tracer.current = null;
                onFail();
            }
        }, 60);
        return () => {
            window.clearTimeout(prep);
            if (tracer.current === state) tracer.current = null;
            state.restore();
        };
        // Une prise par demande : les autres réglages sont figés pendant le calcul
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job.id]);

    // Priorité 1 : ce composant dessine lui-même le canevas pendant la prise
    useFrame(({ gl }) => {
        const t = tracer.current;
        if (!t) return;
        if (t.ready) t.pt.renderSample();
        const p = Math.min(1, t.pt.samples / Math.max(1, job.samples));
        if (Math.round(p * 100) !== t.last) { t.last = Math.round(p * 100); onProgress(p); }
        if (t.ready && (p >= 1 || (job.stop && t.pt.samples >= 1))) {
            const url = gl.domElement.toDataURL("image/jpeg", 0.93);
            tracer.current = null;
            t.restore();
            onDone(url);
        }
    }, 1);

    return null;
}
