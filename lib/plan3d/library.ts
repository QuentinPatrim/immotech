/* ============================================================
   PLAN 3D — BIBLIOTHÈQUE DE MEUBLES (navigateur)
   Catalogue et URL des modèles réalistes via /api/plan3d/models,
   mis en cache pour la session. Choix automatique d'un modèle
   pour chaque meuble de l'aménagement (par mots-clés).
   ============================================================ */

import { getAuthHeaders } from "@/lib/apiHelpers";
import type { Furniture, FurnitureType } from "@/lib/plan3d/types";

export interface LibraryItem {
    id: string;
    name: string;
    categories: string[];
    tags: string[];
    dims: [number, number, number] | null;
    thumb: string;
}

let catalogPromise: Promise<LibraryItem[]> | null = null;
const urls = new Map<string, Promise<string>>();

/** Fichiers publics du stockage (pages partagées, visiteur non connecté) */
const STORE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/plan3d-models`;
const publicGltf = (id: string) => `${STORE}/ph/${id}/1k/${id}_1k.gltf`;

export function loadCatalog(): Promise<LibraryItem[]> {
    if (!catalogPromise) {
        catalogPromise = (async () => {
            const headers = await getAuthHeaders();
            if (headers.Authorization) {
                const res = await fetch("/api/plan3d/models", { headers });
                const json = await res.json().catch(() => ({}));
                if (res.ok && Array.isArray(json.items)) return json.items as LibraryItem[];
            }
            // Sans session : catalogue déjà publié dans le stockage
            const res = await fetch(`${STORE}/catalog.json`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !Array.isArray(json.items)) throw new Error("Bibliothèque indisponible.");
            return json.items as LibraryItem[];
        })();
        catalogPromise.catch(() => { catalogPromise = null; });
    }
    return catalogPromise;
}

/** URL du glTF : copié dans notre stockage au premier appel (session requise), sinon copie publique existante */
export function modelUrl(id: string): Promise<string> {
    let p = urls.get(id);
    if (!p) {
        p = (async () => {
            const headers = await getAuthHeaders();
            if (headers.Authorization) {
                const res = await fetch(`/api/plan3d/models?id=${encodeURIComponent(id)}`, { headers });
                const json = await res.json().catch(() => ({}));
                if (res.ok && typeof json.url === "string") return json.url as string;
                throw new Error(json.error || "Modèle indisponible.");
            }
            const head = await fetch(publicGltf(id), { method: "HEAD" });
            if (!head.ok) throw new Error("Modèle indisponible.");
            return publicGltf(id);
        })();
        urls.set(id, p);
        p.catch(() => urls.delete(id));
    }
    return p;
}

/** Mots-clés par type de meuble (nom, catégories, étiquettes du catalogue) ; exclusions */
const MATCH: Partial<Record<FurnitureType, { any: RegExp; not?: RegExp }>> = {
    sofa: { any: /\bsofa|couch|settee/i, not: /chair|table/i },
    armchair: { any: /armchair|arm_chair|lounge.?chair|club.?chair/i },
    coffee_table: { any: /coffee.?table|side.?table|low.?table/i },
    dining_table: { any: /dining.?table|wooden.?table|round.?table|\btable\b/i, not: /coffee|side|bedside|night|lamp|tennis|pool|picnic/i },
    chair: { any: /\bchair\b|dining.?chair|stool/i, not: /arm|office|lounge|garden|outdoor/i },
    bed_double: { any: /\bbed\b|double.?bed/i, not: /bedside|single/i },
    bed_single: { any: /single.?bed|\bbed\b/i, not: /bedside/i },
    nightstand: { any: /nightstand|night.?stand|bedside/i },
    wardrobe: { any: /wardrobe|armoire|closet/i },
    bookshelf: { any: /bookshel|book.?case|shelf|shelving/i, not: /wall.?shelf/i },
    desk: { any: /\bdesk\b|writing.?table|secretary/i },
    office_chair: { any: /office.?chair|desk.?chair|swivel/i },
    tv_unit: { any: /tv.?(unit|stand|cabinet)|media.?(unit|console)/i },
    sideboard: { any: /sideboard|buffet|dresser|chest.?of.?drawers|cabinet/i, not: /kitchen|bathroom|medicine/i },
    console: { any: /console|hall.?table/i },
    plant: { any: /potted|plant|ficus|monstera|palm/i, not: /tree_trunk|shrub/i },
    floor_lamp: { any: /floor.?lamp|standing.?lamp|\blamp\b/i, not: /desk|table|ceiling|chandelier|street/i },
    rug: { any: /\brug\b|carpet/i },
    outdoor_table: { any: /garden.?table|outdoor.?table|patio.?table|bistro/i },
    lounger: { any: /lounger|sun.?bed|deck.?chair|chaise/i },
};

const haystack = (i: LibraryItem) => `${i.id.replace(/_/g, " ")} ${i.name} ${i.categories.join(" ")} ${i.tags.join(" ")}`;

/** Modèles possibles pour un type de meuble */
export function candidatesFor(items: LibraryItem[], type: FurnitureType): LibraryItem[] {
    const rule = MATCH[type];
    if (!rule) return [];
    return items.filter(i => {
        const h = haystack(i);
        return rule.any.test(h) && !(rule.not && rule.not.test(h));
    });
}

/**
 * Modèle choisi pour un meuble : celui posé à la main, sinon un modèle du
 * catalogue proche de ses dimensions (choix stable d'une visite à l'autre).
 */
export function modelFor(items: LibraryItem[], f: Furniture): string | null {
    if (f.model) return f.model;
    const cands = candidatesFor(items, f.type);
    if (!cands.length) return null;
    const want = [Math.max(f.w, f.d), f.h];
    const scored = cands.map(c => {
        if (!c.dims) return { c, s: 1 };
        const long = Math.max(c.dims[0], c.dims[2]), hh = c.dims[1];
        return { c, s: Math.abs(Math.log(long / want[0])) + 0.5 * Math.abs(Math.log(hh / Math.max(0.05, want[1]))) };
    }).sort((p, q) => p.s - q.s);
    // Parmi les plus proches, variété déterministe selon le meuble
    const pool = scored.slice(0, Math.min(3, scored.length));
    let h = 0;
    for (const ch of f.type) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return pool[h % pool.length].c.id;
}

/** Libellés de rayon pour le catalogue */
export const SHELVES: { id: string; label: string; test: RegExp }[] = [
    { id: "seating", label: "Assises", test: /sofa|couch|chair|armchair|stool|bench|seat/i },
    { id: "tables", label: "Tables", test: /table|desk/i },
    { id: "storage", label: "Rangements", test: /shelf|cabinet|drawer|wardrobe|dresser|sideboard|storage|bookcase/i },
    { id: "beds", label: "Lits", test: /\bbed\b/i },
    { id: "lighting", label: "Luminaires", test: /lamp|light|chandelier|lantern/i },
    { id: "plants", label: "Plantes", test: /plant|potted|flower|ficus|cactus/i },
    { id: "decor", label: "Décoration", test: /decor|vase|rug|carpet|frame|clock|book|mirror|cushion|basket/i },
];

/** Type de meuble le plus proche d'un modèle du catalogue (meuble simple de secours, aménagement) */
export function typeFor(item: LibraryItem): FurnitureType {
    const h = haystack(item);
    for (const [type, rule] of Object.entries(MATCH) as [FurnitureType, { any: RegExp; not?: RegExp }][]) {
        if (rule.any.test(h) && !(rule.not && rule.not.test(h))) return type;
    }
    return /plant|flower|potted/i.test(h) ? "plant" : /lamp|light/i.test(h) ? "floor_lamp" : "console";
}
