/* ============================================================
   ANNONCES EN VENTE (portails) — types et calculs partagés
   Capturées par l'extension Patrim, stockées dans market_listings,
   affichées à l'étape « Marché » de l'estimation.
   ============================================================ */

export interface PriceEvent {
    date: string;                 // ISO
    price: number;
    source: "capture" | "annonce"; // constaté entre deux captures, ou affiché sur l'annonce (« ancien prix »)
}

export interface MarketListing {
    id: string;                   // id de la ligne market_listings
    url: string;
    portal: string;
    otherPortals: { portal: string; url: string; price?: number }[]; // même bien publié ailleurs
    title?: string;
    price: number;
    surface: number;
    rooms?: number;
    bedrooms?: number;
    propertyType?: string;
    city?: string;
    district?: string;
    floor?: string;
    dpe?: string;
    photoUrl?: string;
    publishedAt?: string;         // date de parution (si le portail l'affiche)
    firstSeenAt: string;          // 1re capture
    lastSeenAt: string;           // dernière capture
    priceHistory: PriceEvent[];
    features: string[];           // atouts / caractéristiques (terrasse, parking…)
    highlight?: string;           // particularité (analyse IA)
    pros: string[];               // + par rapport au bien estimé
    cons: string[];               // − par rapport au bien estimé
    relevance?: number;           // 0–100 : comparabilité avec le bien estimé
    sameArea?: boolean;           // même quartier ou limitrophe (analyse IA)
    distanceKm?: number;          // distance au bien estimé (quartier géolocalisé)
    description?: string;
    selected: boolean;            // retenue dans l'avis de valeur
}

/** Données envoyées par l'extension (page du portail consultée par l'agent) */
export interface CapturePayload {
    v: 1;
    url: string;
    title: string;
    host: string;
    capturedAt: string;
    cards: { href: string; text: string; img?: string }[];
    text: string;
    jsonLd: string[];
    meta: { ogTitle?: string; ogImage?: string; ogDescription?: string; description?: string };
    images: string[];
    /** Page de vérification anti-robot détectée par l'extension */
    blocked?: boolean;
}

const PORTALS: [RegExp, string][] = [
    [/leboncoin\./, "Leboncoin"],
    [/seloger\./, "SeLoger"],
    [/bienici\./, "Bien'ici"],
    [/logic-immo\./, "Logic-Immo"],
    [/(^|\.)pap\.fr$/, "PAP"],
    [/lefigaro\./, "Figaro Immo"],
    [/paruvendu\./, "ParuVendu"],
    [/notaires\./, "Notaires"],
    [/ouestfrance-immo\./, "Ouest-France Immo"],
    [/superimmo\./, "Superimmo"],
    [/green-acres\./, "Green-Acres"],
    [/avendrealouer\./, "AVendreALouer"],
    [/entreparticuliers\./, "EntreParticuliers"],
    [/century21\./, "Century 21"],
    [/orpi\./, "Orpi"],
    [/laforet\./, "Laforêt"],
    [/guy-hoquet\./, "Guy Hoquet"],
    [/iadfrance\./, "iad"],
    [/safti\./, "Safti"],
    [/capifrance\./, "Capifrance"],
    [/stephaneplazaimmobilier\./, "Stéphane Plaza"],
    [/era-immobilier\./, "ERA"],
];

export function portalFromUrl(url: string): string {
    let host = "";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return "Annonce"; }
    for (const [re, name] of PORTALS) if (re.test(host)) return name;
    return host;
}

/**
 * Adresse stable d'une annonce : les portails ajoutent à leurs liens des
 * paramètres de recherche ou de suivi qui changent d'une capture à l'autre.
 * Quand l'identifiant de l'annonce est dans le chemin, on retire la requête.
 */
export function canonicalListingUrl(url: string): string {
    try {
        const u = new URL(url);
        u.hash = "";
        if (/\d{5,}/.test(u.pathname)) u.search = "";
        else [...u.searchParams.keys()].filter(k => /^(utm_|xtor|at_|gclid|fbclid)/i.test(k)).forEach(k => u.searchParams.delete(k));
        return u.toString();
    } catch {
        return url;
    }
}

/** Prix de départ connu (le plus ancien relevé) */
export function initialPrice(l: Pick<MarketListing, "price" | "priceHistory">): number {
    const events = [...(l.priceHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
    return events[0]?.price || l.price;
}

/** Baisse depuis le prix de départ (null si aucune) */
export function priceDrop(l: Pick<MarketListing, "price" | "priceHistory">): { amount: number; pct: number; from: number; count: number } | null {
    const from = initialPrice(l);
    if (!from || !l.price || l.price >= from) return null;
    const events = [...(l.priceHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
    let count = 0;
    for (let i = 1; i < events.length; i++) if (events[i].price < events[i - 1].price) count++;
    return { amount: from - l.price, pct: Math.round(((from - l.price) / from) * 1000) / 10, from, count: Math.max(1, count) };
}

/** Nombre de jours en ligne (date de parution, sinon première capture) */
export function daysOnline(l: Pick<MarketListing, "publishedAt" | "firstSeenAt">, now = Date.now()): number | null {
    const ref = l.publishedAt || l.firstSeenAt;
    const t = ref ? new Date(ref).getTime() : NaN;
    if (!Number.isFinite(t)) return null;
    return Math.max(0, Math.floor((now - t) / (24 * 3600 * 1000)));
}

export const pricePerSqm = (l: Pick<MarketListing, "price" | "surface">) => (l.price > 0 && l.surface > 0 ? l.price / l.surface : 0);

/** Ligne Supabase → fiche annonce */
export function rowToListing(row: { id: string; url: string; portal: string | null; data: Record<string, unknown> | null; selected: boolean; first_seen_at: string; last_seen_at: string }): MarketListing {
    const d = (row.data || {}) as Partial<MarketListing>;
    return {
        id: row.id,
        url: row.url,
        portal: row.portal || portalFromUrl(row.url),
        otherPortals: d.otherPortals ?? [],
        title: d.title,
        price: Number(d.price) || 0,
        surface: Number(d.surface) || 0,
        rooms: d.rooms,
        bedrooms: d.bedrooms,
        propertyType: d.propertyType,
        city: d.city,
        district: d.district,
        floor: d.floor,
        dpe: d.dpe,
        photoUrl: d.photoUrl,
        publishedAt: d.publishedAt,
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
        priceHistory: d.priceHistory ?? [],
        features: d.features ?? [],
        highlight: d.highlight,
        pros: d.pros ?? [],
        cons: d.cons ?? [],
        relevance: d.relevance,
        sameArea: d.sameArea,
        distanceKm: typeof d.distanceKm === "number" ? d.distanceKm : undefined,
        description: d.description,
        selected: row.selected,
    };
}
