import { distanceMeters } from "@/lib/dvf";

/* ============================================================
   DISTANCE ANNONCE ↔ BIEN ESTIMÉ (serveur)
   Les portails n'affichent qu'un quartier et une ville : on les
   géolocalise avec le géocodeur de l'IGN (Géoplateforme) pour
   mesurer l'éloignement réel, plutôt que de le deviner.
   ============================================================ */

export interface Point { lat: number; lon: number }

const norm = (s?: string | null) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

interface GeoFeature {
    geometry: { coordinates: [number, number] };
    properties: { city?: string; name?: string; type?: string; score?: number };
}

async function search(q: string, type?: "municipality"): Promise<GeoFeature[]> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3500);
    try {
        const url = `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=8${type ? `&type=${type}` : ""}`;
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return [];
        const data = (await res.json()) as { features?: GeoFeature[] };
        return data.features ?? [];
    } catch {
        return [];
    } finally {
        clearTimeout(t);
    }
}

export async function geocodePoint(address: string): Promise<Point | null> {
    const f = (await search(address))[0];
    return f ? { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } : null;
}

/**
 * Position approximative d'une annonce : quartier dans la ville (rue, place
 * ou lieu-dit qui porte son nom), sinon centre de la commune si elle diffère
 * de celle du bien. null si la localisation est trop vague.
 */
async function locate(district: string | null, city: string | null, subjectCity: string, subject: Point): Promise<Point | null> {
    const c = (city || subjectCity || "").trim();
    const d = (district || "").split(/\s[-–/]\s|,|\(/)[0].trim();
    if (d && c && norm(d) !== norm(c)) {
        // Plusieurs voies portent le nom du quartier (« place des Carmes », « chemin des Carmes ») :
        // on garde la plus proche du bien, les autres étant souvent hors du quartier
        const hits = (await search(`${d} ${c}`))
            .filter(f => (f.properties.score ?? 1) >= 0.45)
            .filter(f => !f.properties.city || norm(f.properties.city) === norm(c) || norm(f.properties.city).startsWith(norm(c)))
            .map(f => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
        if (hits.length) return hits.sort((a, b) => distanceMeters(subject.lat, subject.lon, a.lat, a.lon) - distanceMeters(subject.lat, subject.lon, b.lat, b.lon))[0];
    }
    if (city && norm(city) !== norm(subjectCity)) {
        const town = (await search(city, "municipality"))[0];
        if (town) return { lon: town.geometry.coordinates[0], lat: town.geometry.coordinates[1] };
    }
    return null;
}

/** Distance (km, arrondie à 0,1) de chaque annonce au bien ; null si inconnue */
export async function listingDistances(
    subject: Point | null,
    subjectCity: string,
    items: { district: string | null; city: string | null }[],
): Promise<(number | null)[]> {
    if (!subject) return items.map(() => null);
    const cache = new Map<string, Promise<Point | null>>();
    return Promise.all(items.map(async it => {
        const key = `${norm(it.district)}|${norm(it.city)}`;
        if (!cache.has(key)) cache.set(key, locate(it.district, it.city, subjectCity, subject));
        const p = await cache.get(key)!;
        return p ? Math.round(distanceMeters(subject.lat, subject.lon, p.lat, p.lon) / 100) / 10 : null;
    }));
}
