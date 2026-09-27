/* ============================================================
   PLAN 3D — BIBLIOTHÈQUE DE MEUBLES (serveur)
   Modèles 3D réalistes sous licence CC0 (Poly Haven : usage
   commercial libre, sans attribution obligatoire), recopiés à la
   demande dans le stockage Supabase « plan3d-models » : les
   visites ne dépendent jamais d'un site tiers.
   - catalogue : liste filtrée (mobilier, luminaires, plantes,
     décoration…), mise en cache 7 jours dans le stockage ;
   - modèle : glTF 1k + textures + binaire, copiés une fois.
   ============================================================ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "plan3d-models";
const API = "https://api.polyhaven.com";
const UA = "Patrim-Immotech/1.0 (plan 3D immobilier)";
const CATALOG_TTL = 7 * 24 * 3600 * 1000;
/** Au-delà, le modèle est trop lourd pour une visite sur téléphone */
const MAX_MODEL_BYTES = 25 * 1024 * 1024;

/** Catégories Poly Haven retenues (intérieur, extérieur privatif) */
const KEEP = /furniture|seating|chair|sofa|table|storage|shelf|shelv|cabinet|bed|lighting|lamp|decor|plant|appliance|kitchen|bathroom|electronic|rug|carpet|curtain|outdoor|garden/i;
const DROP = /industrial|vehicle|weapon|rock|terrain|tree_trunk|food|tool/i;

export interface LibraryItem {
    id: string;
    name: string;
    categories: string[];
    tags: string[];
    /** Dimensions indicatives (m) : largeur, hauteur, profondeur */
    dims: [number, number, number] | null;
    thumb: string;
}

export interface Catalog { fetchedAt: number; items: LibraryItem[] }

export const isModelId = (id: string) => /^[A-Za-z0-9_-]{2,50}$/.test(id);

function admin(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Stockage indisponible (configuration serveur).");
    return createClient(url, key, { auth: { persistSession: false } });
}

export const publicUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) throw new Error(`Bibliothèque indisponible (${res.status}).`);
    return res.json() as Promise<T>;
}

let memo: Catalog | null = null;

/** Catalogue (mémoire → stockage → Poly Haven) */
export async function getCatalog(): Promise<Catalog> {
    if (memo && Date.now() - memo.fetchedAt < CATALOG_TTL) return memo;
    const sb = admin();
    try {
        const res = await fetch(publicUrl("catalog.json"), { cache: "no-store" });
        if (res.ok) {
            const stored = (await res.json()) as Catalog;
            if (stored?.items?.length && Date.now() - stored.fetchedAt < CATALOG_TTL) return (memo = stored);
        }
    } catch { /* pas encore de catalogue enregistré */ }

    type Info = { name?: string; categories?: string[]; tags?: string[]; dimensions?: number[]; type?: number };
    const all = await getJson<Record<string, Info>>(`${API}/assets?t=models`);
    const items: LibraryItem[] = [];
    for (const [id, a] of Object.entries(all)) {
        if (!isModelId(id)) continue;
        const cats = (a.categories ?? []).map(String);
        const hay = `${cats.join(" ")} ${(a.tags ?? []).join(" ")} ${a.name ?? ""}`;
        if (!KEEP.test(hay) || DROP.test(cats.join(" "))) continue;
        const d = Array.isArray(a.dimensions) && a.dimensions.length === 3 ? a.dimensions.map(v => Number(v) / 1000) : null;
        items.push({
            id,
            name: String(a.name ?? id).slice(0, 80),
            categories: cats.slice(0, 8),
            tags: (a.tags ?? []).map(String).slice(0, 16),
            dims: d && d.every(v => Number.isFinite(v) && v > 0) ? [d[0], d[1], d[2]] : null,
            thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`,
        });
    }
    items.sort((p, q) => p.name.localeCompare(q.name, "fr"));
    const catalog = { fetchedAt: Date.now(), items };
    await sb.storage.from(BUCKET).upload("catalog.json", JSON.stringify(catalog), { upsert: true, contentType: "application/json" });
    return (memo = catalog);
}

const contentType = (path: string) =>
    /\.gltf$/i.test(path) ? "model/gltf+json"
        : /\.jpe?g$/i.test(path) ? "image/jpeg"
            : /\.png$/i.test(path) ? "image/png"
                : "application/octet-stream";

/**
 * URL publique du glTF d'un modèle, recopié dans le stockage au premier appel.
 * Les fichiers annexes (binaire, textures) gardent leurs chemins relatifs.
 */
export async function ensureModel(id: string): Promise<string> {
    if (!isModelId(id)) throw new Error("Modèle inconnu.");
    const base = `ph/${id}/1k`;
    const gltfName = `${id}_1k.gltf`;
    const ready = await fetch(publicUrl(`${base}/ready.json`), { method: "HEAD", cache: "no-store" });
    if (ready.ok) return publicUrl(`${base}/${gltfName}`);

    const catalog = await getCatalog();
    if (!catalog.items.some(i => i.id === id)) throw new Error("Modèle absent de la bibliothèque.");

    type FileRef = { url: string; size?: number; include?: Record<string, { url: string; size?: number }> };
    const files = await getJson<{ gltf?: Record<string, { gltf?: FileRef }> }>(`${API}/files/${id}`);
    const main = files.gltf?.["1k"]?.gltf ?? files.gltf?.["2k"]?.gltf;
    if (!main?.url) throw new Error("Ce modèle n'existe pas au format glTF.");
    const parts = Object.entries(main.include ?? {});
    const total = (main.size ?? 0) + parts.reduce((s, [, f]) => s + (f.size ?? 0), 0);
    if (total > MAX_MODEL_BYTES) throw new Error("Modèle trop lourd pour une visite.");

    const sb = admin();
    const copy = async (url: string, path: string) => {
        const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
        if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}).`);
        const body = new Uint8Array(await res.arrayBuffer());
        const { error } = await sb.storage.from(BUCKET).upload(path, body, { upsert: true, contentType: contentType(path) });
        if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
    };
    // Chemins relatifs uniquement (pas de sortie du dossier du modèle)
    const safe = (rel: string) => rel.split("/").every(seg => seg && seg !== ".." && seg !== ".") && !rel.startsWith("/");
    const queue: [string, string][] = [[main.url, `${base}/${gltfName}`], ...parts.filter(([rel]) => safe(rel)).map(([rel, f]) => [f.url, `${base}/${rel}`] as [string, string])];
    for (let i = 0; i < queue.length; i += 4) await Promise.all(queue.slice(i, i + 4).map(([u, p]) => copy(u, p)));
    await sb.storage.from(BUCKET).upload(`${base}/ready.json`, JSON.stringify({ id, copiedAt: new Date().toISOString(), source: "Poly Haven (CC0)" }), { upsert: true, contentType: "application/json" });
    return publicUrl(`${base}/${gltfName}`);
}
