/* ============================================================
   RECHERCHE GUIDÉE SUR LES PORTAILS
   Critères déduits du dossier (type, surface, pièces, budget,
   commune) → adresses de recherche pré-remplies pour chaque
   portail. L'extension Patrim ouvre ces pages et les lit ; le tri
   fin (distance, prix au m²) est refait ensuite côté serveur.
   ============================================================ */

import type { PortalSearch } from "@/lib/extensionBridge";
import { quartiersAround, selogerQuartierId } from "@/lib/toulouseQuartiers";

export interface SearchCriteria {
    propertyType: "Appartement" | "Maison" | null;
    city: string;
    postcode: string;
    /** Code INSEE de la commune (certains portails l'utilisent) */
    inseeCode?: string;
    /** Position du bien (adresse choisie dans les suggestions) */
    lat?: number;
    lon?: number;
    /** Centre de la commune, quand le bien n'a pas de coordonnées */
    centerLat?: number;
    centerLon?: number;
    radiusKm: number;
    surfaceMin?: number;
    surfaceMax?: number;
    roomsMin?: number;
    roomsMax?: number;
    priceMin?: number;
    priceMax?: number;
    /** Pages de résultats lues par portail */
    pages: number;
}

export type PortalKey = "leboncoin" | "seloger" | "bienici";

export const PORTALS: { key: PortalKey; label: string }[] = [
    { key: "leboncoin", label: "Leboncoin" },
    { key: "seloger", label: "SeLoger" },
    { key: "bienici", label: "Bien'ici" },
];

const round = (n: number, step: number) => Math.round(n / step) * step;

/** Commune et code postal lus dans l'adresse (« …, 31000 Toulouse », « Toulouse 31000 », « … CEDEX ») */
export function cityFromAddress(address: string): { city: string; postcode: string } {
    const clean = (s: string) => s.replace(/\s+(france|cedex(\s*\d+)?)\s*$/i, "").trim();
    let m = address.match(/(\d{5})\s+([^,\d][^,]*)/);
    if (m && clean(m[2])) return { postcode: m[1], city: clean(m[2]) };
    m = address.match(/(?:^|,)\s*([^,\d][^,\d]*?)\s+(\d{5})\s*(?:,|$)/);
    return m ? { postcode: m[2], city: clean(m[1]) } : { postcode: "", city: "" };
}

export const isToulouse = (c: Pick<SearchCriteria, "city" | "inseeCode">) => c.inseeCode === "31555" || slug(c.city) === "toulouse";

/** Bornes cohérentes (min ≤ max, valeurs positives) et rayon par défaut, avant de construire les adresses */
export function normalizeCriteria(c: SearchCriteria): SearchCriteria {
    const pos = (n?: number) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined);
    const pair = (a?: number, b?: number): [number | undefined, number | undefined] => {
        const lo = pos(a), hi = pos(b);
        return lo && hi && lo > hi ? [hi, lo] : [lo, hi];
    };
    const [surfaceMin, surfaceMax] = pair(c.surfaceMin, c.surfaceMax);
    const [roomsMin, roomsMax] = pair(c.roomsMin, c.roomsMax);
    const [priceMin, priceMax] = pair(c.priceMin, c.priceMax);
    return {
        ...c, surfaceMin, surfaceMax, roomsMin, roomsMax, priceMin, priceMax,
        radiusKm: pos(c.radiusKm) ?? 2,
        pages: Math.max(1, Math.min(2, Math.round(c.pages) || 1)),
    };
}

export function defaultCriteria(d: {
    propertyType: string; propertyAddress: string; surface: number; rooms: number;
    lowPrice: number; highPrice: number; propertyLat?: number; propertyLon?: number;
}): SearchCriteria {
    const { city, postcode } = cityFromAddress(d.propertyAddress || "");
    const S = Number(d.surface) || 0;
    const R = Number(d.rooms) || 0;
    const low = Number(d.lowPrice) || 0, high = Number(d.highPrice) || 0;
    const central = low && high ? (low + high) / 2 : low || high;
    return {
        propertyType: d.propertyType === "Maison" ? "Maison" : d.propertyType === "Appartement" ? "Appartement" : null,
        city, postcode,
        lat: d.propertyLat, lon: d.propertyLon,
        radiusKm: 2,
        surfaceMin: S ? Math.floor(S * 0.8) : undefined,
        surfaceMax: S ? Math.ceil(S * 1.2) : undefined,
        roomsMin: R ? Math.max(1, R - 1) : undefined,
        roomsMax: R ? R + 1 : undefined,
        priceMin: central ? round(central * 0.7, 5000) : undefined,
        priceMax: central ? round(central * 1.35, 5000) : undefined,
        // Leboncoin et Bien'ici cherchent sur toute la ville : 2 pages pour avoir assez d'annonces proches
        pages: 2,
    };
}

/** Code INSEE et centre de la commune (Géoplateforme IGN, appel direct depuis le navigateur) */
export async function resolveCommune(c: SearchCriteria): Promise<{ code?: string; lat?: number; lon?: number }> {
    if (!c.city) return {};
    try {
        const q = encodeURIComponent(`${c.postcode} ${c.city}`.trim());
        const res = await fetch(`https://data.geopf.fr/geocodage/search?q=${q}&type=municipality&limit=1`);
        const json = await res.json() as { features?: { geometry?: { coordinates?: number[] }; properties?: { citycode?: string } }[] };
        const f = json.features?.[0];
        return { code: f?.properties?.citycode || undefined, lon: f?.geometry?.coordinates?.[0], lat: f?.geometry?.coordinates?.[1] };
    } catch {
        return {};
    }
}

/** Nom de commune pour une adresse de portail : « Saint-Jean » → « saint-jean » */
export const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---- Adresses de recherche par portail ----

export function leboncoinUrl(c: SearchCriteria, page = 1): string | null {
    return buildLeboncoin(c, page);
}

export function selogerUrl(c: SearchCriteria, page = 1): string | null {
    return buildSeloger(c, page);
}

export function bieniciUrl(c: SearchCriteria, page = 1): string | null {
    return buildBienici(c, page);
}

const BUILDERS: Record<PortalKey, (c: SearchCriteria, page: number) => string | null> = {
    leboncoin: leboncoinUrl,
    seloger: selogerUrl,
    bienici: bieniciUrl,
};

/** Toutes les recherches à ouvrir (une par portail et par page) et les portails non couverts pour cette commune */
export function buildPortalSearches(raw: SearchCriteria, portals: PortalKey[]): { searches: PortalSearch[]; unsupported: string[] } {
    const c = normalizeCriteria(raw);
    const searches: PortalSearch[] = [];
    const unsupported: string[] = [];
    for (const p of PORTALS.filter(x => portals.includes(x.key))) {
        for (let page = 1; page <= c.pages; page++) {
            const url = BUILDERS[p.key](c, page);
            if (!url) { if (page === 1) unsupported.push(p.label); continue; }
            searches.push({ key: `${p.key}-${page}`, label: page > 1 ? `${p.label} (page ${page})` : p.label, url });
        }
    }
    return { searches, unsupported };
}

// Implémentations (voir la recherche documentée sur les formats d'adresses des portails)
/** Plage Leboncoin « min-max » (« min » / « max » pour une borne ouverte) */
const lbcRange = (a?: number, b?: number) => (a || b ? `${a || "min"}-${b || "max"}` : null);

/**
 * Leboncoin, « Ventes immobilières » (catégorie 9). Le lieu doit être un jeton complet
 * « Ville[_CodePostal]__lat_lng_rayon » : un jeton incomplet est ignoré en silence et la
 * recherche s'étend à toute la France.
 * - Toulouse : jeton relevé sur une vraie adresse Leboncoin (toute la ville) ;
 * - autre commune avec coordonnées : jeton construit (approximatif) ;
 * - sinon : le département (« d_31 »).
 */
const LBC_TOULOUSE = "Toulouse__43.599373754597394_1.435619856703149_9864";

function buildLeboncoin(c: SearchCriteria, page: number): string | null {
    if (!c.city && !c.postcode) return null;
    let location: string;
    const lat = c.lat ?? c.centerLat, lon = c.lon ?? c.centerLon;
    if (isToulouse(c)) location = LBC_TOULOUSE;
    else if (c.city && c.postcode && lat && lon) location = `${c.city.trim().replace(/\s+/g, "-")}_${c.postcode}__${lat.toFixed(5)}_${lon.toFixed(5)}_5000`;
    else if (c.postcode) location = `d_${c.postcode.slice(0, 2)}`;
    else return null;
    const q = new URLSearchParams({ category: "9", locations: location });
    if (c.propertyType) q.set("real_estate_type", c.propertyType === "Maison" ? "1" : "2");
    const square = lbcRange(c.surfaceMin, c.surfaceMax);
    const rooms = lbcRange(c.roomsMin, c.roomsMax);
    const price = lbcRange(c.priceMin, c.priceMax);
    if (price) q.set("price", price);
    if (square) q.set("square", square);
    if (rooms) q.set("rooms", rooms);
    q.set("sort", "time");
    q.set("order", "desc");
    if (page > 1) q.set("page", String(page));
    return `https://www.leboncoin.fr/recherche?${q.toString()}`;
}

/**
 * SeLoger (format /classified-search, 2024-2026). Les lieux sont des identifiants
 * internes à SeLoger : connus pour Toulouse (ville entière et ses 60 quartiers).
 * Ailleurs, pas de recherche automatique (null).
 */
const SELOGER_MAX_QUARTIERS = 15;

function buildSeloger(c: SearchCriteria, page: number): string | null {
    if (!isToulouse(c)) return null;
    // Quartiers autour du bien ; sans position précise ou rayon très large : toute la ville
    const around = c.lat && c.lon ? quartiersAround({ lat: c.lat, lon: c.lon }, c.radiusKm) : [];
    const locations = around.length && around.length <= SELOGER_MAX_QUARTIERS ? around.map(selogerQuartierId).join(",") : "AD08FR12535";
    const q = new URLSearchParams({ distributionTypes: "Buy" });
    if (c.propertyType) q.set("estateTypes", c.propertyType === "Maison" ? "House" : "Apartment");
    q.set("locations", locations);
    if (c.priceMin) q.set("priceMin", String(c.priceMin));
    if (c.priceMax) q.set("priceMax", String(c.priceMax));
    if (c.surfaceMin) q.set("spaceMin", String(c.surfaceMin));
    if (c.surfaceMax) q.set("spaceMax", String(c.surfaceMax));
    if (c.roomsMin) q.set("numberOfRoomsMin", String(c.roomsMin));
    if (c.roomsMax) q.set("numberOfRoomsMax", String(c.roomsMax));
    q.set("order", "DateDesc");
    if (page > 1) q.set("page", String(page));
    return `https://www.seloger.com/classified-search?${q.toString().replace(/%2C/g, ",")}`;
}
/**
 * Bien'ici : /recherche/achat/{commune-codepostal}/{type}/{pièces}?prix-…&surface-…
 * Toulouse : toujours « toulouse-31000 » (tous ses codes postaux désignent la ville entière).
 */
function bieniciRooms(min: number | undefined, max: number | undefined, type: SearchCriteria["propertyType"]): string | null {
    const lo = min && min > 1 ? min : undefined;
    if (lo && max && lo === max) return `${lo}-pieces`;
    if (lo && max && lo < max) return `de-${lo}-a-${max}-pieces`;
    if (lo) return `${lo}-pieces-et-plus`;
    if (max && max >= 2) return `de-1-a-${max}-pieces`;
    if (max === 1 && type === "Appartement") return "studio";
    return null;
}

function buildBienici(c: SearchCriteria, page: number): string | null {
    if (!c.city || !c.postcode) return null;
    const place = isToulouse(c) ? "toulouse-31000" : `${slug(c.city)}-${c.postcode}`;
    let path = `https://www.bienici.com/recherche/achat/${place}`;
    if (c.propertyType) path += c.propertyType === "Maison" ? "/maisonvilla" : "/appartement";
    const rooms = bieniciRooms(c.roomsMin, c.roomsMax, c.propertyType);
    if (rooms) path += `/${rooms}`;
    const q = new URLSearchParams();
    if (c.priceMin) q.set("prix-min", String(c.priceMin));
    if (c.priceMax) q.set("prix-max", String(c.priceMax));
    if (c.surfaceMin) q.set("surface-min", String(c.surfaceMin));
    if (c.surfaceMax) q.set("surface-max", String(c.surfaceMax));
    q.set("tri", "publication-desc");
    if (page > 1) q.set("page", String(page));
    return `${path}?${q.toString()}`;
}

