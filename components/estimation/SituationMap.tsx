"use client";

/* ============================================================
   PLAN DE SITUATION (avis de valeur, page « Le bien »)
   Tuiles Google Maps 2D (Map Tiles API, même clé que la vue 3D),
   centrées sur l'adresse du bien, repère Patrim au centre ; à
   défaut de clé ou si Google ne répond pas : Plan IGN
   (Géoplateforme, sans clé). Simples images : s'impriment et se
   capturent comme le reste de la page (CORS autorisé).
   ============================================================ */

import { useEffect, useState } from "react";

const TILE = 256;
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
const SESSION_KEY = "patrim:g2dSession";

/** Coordonnées de tuile (fractionnaires) d'un point au niveau de zoom `z` */
function tileXY(lat: number, lon: number, z: number) {
    const n = 2 ** z;
    const rad = (lat * Math.PI) / 180;
    return {
        x: ((lon + 180) / 360) * n,
        y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
    };
}

let sessionPromise: Promise<string> | null = null;

/** Session de tuiles Google (valable ~2 semaines), gardée sur l'appareil */
function googleSession(): Promise<string> {
    if (!GOOGLE_KEY) return Promise.reject(new Error("Pas de clé"));
    try {
        const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as { session: string; expiry: number } | null;
        if (saved?.session && saved.expiry * 1000 > Date.now() + 3600_000) return Promise.resolve(saved.session);
    } catch { /* stockage indisponible */ }
    sessionPromise ??= fetch(`https://tile.googleapis.com/v1/createSession?key=${GOOGLE_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            mapType: "roadmap", language: "fr-FR", region: "FR", scale: "scaleFactor2x", highDpi: true,
            // Carte sobre : commerces et lieux masqués
            styles: [{ featureType: "poi.business", stylers: [{ visibility: "off" }] }],
        }),
    })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Session ${r.status}`))))
        .then((j: { session: string; expiry: string }) => {
            try { localStorage.setItem(SESSION_KEY, JSON.stringify({ session: j.session, expiry: Number(j.expiry) })); } catch { /* rien */ }
            return j.session;
        })
        .catch(e => { sessionPromise = null; throw e; });
    return sessionPromise;
}

const ignTile = (z: number, x: number, y: number) =>
    `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILECOL=${x}&TILEROW=${y}&FORMAT=image/png`;

export default function SituationMap({ lat, lon, zoom = 16, color = "#8a0e01" }: { lat: number; lon: number; zoom?: number; color?: string }) {
    // Source : session Google prête, IGN (sans clé ou en cas d'échec), ou en attente
    const [source, setSource] = useState<{ kind: "google"; session: string } | { kind: "ign" } | null>(GOOGLE_KEY ? null : { kind: "ign" });
    useEffect(() => {
        if (!GOOGLE_KEY) return;
        let live = true;
        googleSession().then(s => { if (live) setSource({ kind: "google", session: s }); }, () => { if (live) setSource({ kind: "ign" }); });
        return () => { live = false; };
    }, []);

    // Google : tuiles 512 px affichées sur 256 px (nettes à l'impression) ; IGN : niveau +1 affiché à demi-taille
    const z = source?.kind === "ign" ? zoom + 1 : zoom;
    const size = source?.kind === "ign" ? TILE / 2 : TILE;
    const { x, y } = tileXY(lat, lon, z);
    const reach = source?.kind === "ign" ? { x: 6, y: 4 } : { x: 3, y: 2 };
    const tiles: { tx: number; ty: number }[] = [];
    if (source) for (let dy = -reach.y; dy <= reach.y; dy++) for (let dx = -reach.x; dx <= reach.x; dx++) tiles.push({ tx: Math.floor(x) + dx, ty: Math.floor(y) + dy });
    const url = (tx: number, ty: number) => (source?.kind === "google"
        ? `https://tile.googleapis.com/v1/2dtiles/${z}/${tx}/${ty}?session=${source.session}&key=${GOOGLE_KEY}`
        : ignTile(z, tx, ty));

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#f2f1ed]">
            {tiles.map(({ tx, ty }) => (
                // eslint-disable-next-line @next/next/no-img-element -- tuiles cartographiques externes
                <img key={`${source?.kind}-${tx}-${ty}`} alt="" draggable={false}
                    src={url(tx, ty)}
                    onError={source?.kind === "google" ? () => setSource({ kind: "ign" }) : e => { e.currentTarget.style.visibility = "hidden"; }}
                    className="absolute max-w-none select-none"
                    style={{ width: size, height: size, left: `calc(50% + ${(tx - x) * size}px)`, top: `calc(50% + ${(ty - y) * size}px)` }}/>
            ))}
            {/* Repère du bien */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92px] h-[92px] rounded-full" style={{ backgroundColor: color, opacity: 0.12 }}/>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46px] h-[46px] rounded-full" style={{ backgroundColor: color, opacity: 0.18 }}/>
                <span className="relative block w-[18px] h-[18px] rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]" style={{ backgroundColor: color }}/>
            </div>
            {source && (
                <span className="absolute right-2 bottom-1.5 text-[6.5px] text-[#5f6368] bg-white/80 px-1.5 py-0.5 rounded">
                    {source.kind === "google" ? <><b className="font-semibold">Google</b> · Données cartographiques © {new Date().getFullYear()} Google</> : "© IGN – Plan IGN"}
                </span>
            )}
        </div>
    );
}
