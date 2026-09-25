import { supabase } from "@/lib/supabaseClient";

/* ============================================================
   Adresses & photos automatiques (navigateur)
   - Autocomplétion : Géoplateforme IGN (Base Adresse Nationale),
     appel direct depuis le navigateur (CORS ouvert, sans clé).
   - Photo d'une adresse : /api/photo-adresse (vue de rue
     Panoramax, repli vue aérienne IGN).
   ============================================================ */

export interface AddressSuggestion {
    label: string;
    lat: number;
    lon: number;
    city?: string;
    postcode?: string;
}

/** Centre de Toulouse : les suggestions proches remontent en premier */
const DEFAULT_NEAR = { lat: 43.6045, lon: 1.444 };

export async function searchAddresses(query: string, near?: { lat?: number; lon?: number } | null, signal?: AbortSignal): Promise<AddressSuggestion[]> {
    const q = query.trim();
    if (q.length < 3) return [];
    const lat = near?.lat ?? DEFAULT_NEAR.lat;
    const lon = near?.lon ?? DEFAULT_NEAR.lon;
    const url = `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&autocomplete=1&limit=6&index=address&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json: { features?: GeoFeature[] } = await res.json();
    return (json?.features || [])
        .filter(f => f.properties?.label && Array.isArray(f.geometry?.coordinates))
        .map(f => ({
            label: f.properties!.label!,
            lon: f.geometry!.coordinates![0],
            lat: f.geometry!.coordinates![1],
            city: f.properties?.city,
            postcode: f.properties?.postcode,
        }));
}

interface GeoFeature {
    geometry?: { coordinates?: number[] };
    properties?: { label?: string; city?: string; postcode?: string };
}

export interface AutoPhotoResult {
    file: File;
    source: "panoramax" | "ign";
    credit: string;
    variant: number;
    variants: number;
    lat?: number;
    lon?: number;
}

/**
 * Récupère la photo d'une adresse (coordonnées de préférence, sinon texte de l'adresse).
 * `variant` permet de proposer une autre vue (0 = la meilleure).
 */
export async function fetchAddressPhoto(opts: { lat?: number; lon?: number; address?: string; variant?: number; mode?: "auto" | "aerien" }): Promise<AutoPhotoResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Session expirée — reconnectez-vous.");
    const params = new URLSearchParams();
    if (opts.lat && opts.lon) {
        params.set("lat", String(opts.lat));
        params.set("lon", String(opts.lon));
    } else if (opts.address?.trim()) {
        params.set("q", opts.address.trim());
    } else {
        throw new Error("Renseignez d'abord l'adresse.");
    }
    if (opts.variant) params.set("v", String(opts.variant));
    if (opts.mode === "aerien") params.set("mode", "aerien");

    const res = await fetch(`/api/photo-adresse?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
        let message = "Photo introuvable pour cette adresse.";
        try { message = (await res.json()).error || message; } catch { /* réponse non JSON */ }
        throw new Error(message);
    }
    const blob = await res.blob();
    const h = res.headers;
    const num = (k: string) => { const n = Number(h.get(k)); return Number.isFinite(n) ? n : undefined; };
    return {
        file: new File([blob], "photo-adresse.jpg", { type: "image/jpeg" }),
        source: h.get("X-Photo-Source") === "ign" ? "ign" : "panoramax",
        credit: decodeURIComponent(h.get("X-Photo-Credit") || ""),
        variant: num("X-Photo-Variant") ?? 0,
        variants: num("X-Photo-Variants") ?? 1,
        lat: num("X-Photo-Lat"),
        lon: num("X-Photo-Lon"),
    };
}
