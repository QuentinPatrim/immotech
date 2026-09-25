import OpenAI from "openai";
import { canonicalListingUrl, type CapturePayload } from "@/lib/marketListings";

/* ============================================================
   EXTRACTION + ANALYSE DES ANNONCES CAPTURÉES (serveur)
   L'extension envoie la page du portail telle que l'agent la voit
   (cartes d'annonces, texte, JSON-LD). Un modèle OpenAI la lit :
   aucun code propre à chaque portail, résistant aux changements
   de mise en page. Il compare aussi chaque annonce au bien estimé.
   ============================================================ */

export interface SubjectProperty {
    propertyType: string;
    surface: number;
    rooms: number;
    city: string;
    address: string;
    features: string[];
    dpe?: string;
    floor?: string;
    lowPrice?: number;
    highPrice?: number;
}

export interface ExtractedListing {
    card: number | null;
    url: string;
    photoUrl?: string;
    title: string;
    price: number | null;
    previousPrice: number | null;
    surface: number | null;
    rooms: number | null;
    bedrooms: number | null;
    propertyType: string | null;
    city: string | null;
    district: string | null;
    floor: string | null;
    dpe: string | null;
    publishedAt: string | null;
    features: string[];
    highlight: string | null;
    pros: string[];
    cons: string[];
    relevance: number;
    /** Même quartier que le bien estimé, ou quartier limitrophe (avis du modèle) */
    sameArea: boolean | null;
    description: string | null;
}

const MODEL = "gpt-4o-mini";
const CARDS_PER_BATCH = 8;

const nullable = (type: string) => ({ type: [type, "null"] });

const SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["listings"],
    properties: {
        listings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["card", "isForSale", "title", "price", "previousPrice", "surface", "rooms", "bedrooms", "propertyType", "city", "district", "floor", "dpe", "publishedAt", "features", "highlight", "pros", "cons", "relevance", "sameArea", "description"],
                properties: {
                    card: { ...nullable("integer"), description: "Numéro de la carte (null = annonce principale de la page)" },
                    isForSale: { type: "boolean", description: "true seulement pour une annonce de VENTE d'un bien (pas location, pas publicité, pas agence)" },
                    title: { type: "string" },
                    price: { ...nullable("number"), description: "Prix de vente affiché, en euros" },
                    previousPrice: { ...nullable("number"), description: "Ancien prix SEULEMENT s'il est affiché (prix barré, « baisse de prix de X € », « ancien prix »)" },
                    surface: { ...nullable("number"), description: "Surface habitable en m²" },
                    rooms: nullable("integer"),
                    bedrooms: nullable("integer"),
                    propertyType: { type: ["string", "null"], enum: ["Appartement", "Maison", "Autre", null] },
                    city: nullable("string"),
                    district: { ...nullable("string"), description: "Quartier si indiqué" },
                    floor: { ...nullable("string"), description: "Étage (ex : « 3e », « RDC », « dernier étage »)" },
                    dpe: { ...nullable("string"), description: "Lettre DPE A à G" },
                    publishedAt: { ...nullable("string"), description: "Date de parution ou de mise en ligne au format AAAA-MM-JJ, calculée à partir de la date de capture si relative (« il y a 3 jours »). null si absente." },
                    features: { type: "array", items: { type: "string" }, description: "Atouts et caractéristiques notables, 1 à 3 mots chacun, 6 maximum" },
                    highlight: { ...nullable("string"), description: "LA particularité de l'annonce par rapport au bien estimé, 90 caractères maximum" },
                    pros: { type: "array", items: { type: "string" }, description: "Avantages par rapport au bien estimé, 3 maximum, 60 caractères maximum chacun" },
                    cons: { type: "array", items: { type: "string" }, description: "Inconvénients par rapport au bien estimé, 3 maximum, 60 caractères maximum chacun" },
                    relevance: { type: "integer", description: "Comparabilité avec le bien estimé de 0 à 100 (type, surface, pièces, localisation, prestations)" },
                    sameArea: { ...nullable("boolean"), description: "true si l'annonce est dans le même quartier que le bien estimé ou un quartier limitrophe (moins d'environ 1,5 km) ; false si c'est un autre secteur de la ville ou une autre commune ; null si la localisation de l'annonce est trop vague pour trancher" },
                    description: { ...nullable("string"), description: "Résumé factuel de l'annonce, 220 caractères maximum" },
                },
            },
        },
    },
} as const;

function systemPrompt(capturedAt: string) {
    const day = capturedAt.slice(0, 10);
    return `Tu es l'assistant d'un agent immobilier de l'agence Patrim (Toulouse) qui prépare un avis de valeur.
L'agent a capturé une page d'un portail immobilier (liste de résultats ou annonce). Tu extrais les annonces de biens EN VENTE et tu les compares au bien estimé.

Règles :
- Liste de cartes : renvoie exactement UNE entrée par carte fournie, dans l'ordre, avec son numéro (card) ; isForSale = false pour ce qui n'est pas une vente.
- Les caractéristiques d'une annonce (surface, pièces, étage, DPE, prestations, quartier…) viennent UNIQUEMENT de son propre texte. N'y recopie jamais celles du bien estimé ; null si l'information n'apparaît pas.
- Le bien estimé sert seulement à écrire highlight, pros, cons et relevance. Une information absente de l'annonce n'est ni un avantage ni un inconvénient.
- isForSale = false pour les locations (loyer, « /mois », « charges comprises »), publicités, agences, programmes neufs sans prix, liens de navigation.
- sameArea : appuie-toi sur ta connaissance des quartiers de la ville (déduis celui du bien estimé de son adresse).
- Prix, surfaces : nombres sans espace ni symbole (295000, 68.5).
- Date de capture : ${day}. Convertis les dates relatives (« aujourd'hui », « hier », « il y a 3 jours », « publiée le 12 septembre ») en AAAA-MM-JJ. Sans année indiquée, prends la date passée la plus proche de la date de capture (jamais dans le futur).
- previousPrice uniquement si un ancien prix ou une baisse est explicitement affiché ; sinon null.
- Analyse en français, concise et utile pour argumenter une estimation (prestations en plus ou en moins, état, étage, extérieur, stationnement, DPE, emplacement).`;
}

function subjectText(s: SubjectProperty) {
    const parts = [
        `${s.propertyType || "Bien"} de ${s.surface || "?"} m², ${s.rooms || "?"} pièces`,
        s.address || s.city,
        s.floor ? `étage : ${s.floor}` : "",
        s.dpe ? `DPE ${s.dpe}` : "",
        s.features.length ? `prestations : ${s.features.join(", ")}` : "",
        s.lowPrice && s.highPrice ? `fourchette envisagée : ${s.lowPrice} – ${s.highPrice} €` : "",
    ].filter(Boolean);
    return parts.join(" · ");
}

async function callModel(client: OpenAI, capturedAt: string, content: string): Promise<(ExtractedListing & { isForSale: boolean })[]> {
    const res = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.1,
        max_completion_tokens: 6000,
        response_format: { type: "json_schema", json_schema: { name: "annonces", strict: true, schema: SCHEMA as unknown as Record<string, unknown> } },
        messages: [
            { role: "system", content: systemPrompt(capturedAt) },
            { role: "user", content },
        ],
    });
    const text = res.choices[0]?.message?.content || '{"listings":[]}';
    const parsed = JSON.parse(text) as { listings: (ExtractedListing & { isForSale: boolean })[] };
    return parsed.listings || [];
}

const clip = (s: string | undefined, n: number) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);

/** Numéros de carte fiables : si le modèle renvoie une entrée par carte mais se trompe de numéros, on s'en tient à l'ordre */
function alignCards<T extends { card: number | null }>(rs: T[], ids: number[]): T[] {
    const valid = rs.every(r => r.card !== null && ids.includes(r.card)) && new Set(rs.map(r => r.card)).size === rs.length;
    if (valid) return rs;
    if (rs.length === ids.length) return rs.map((r, k) => ({ ...r, card: ids[k] }));
    return rs.filter(r => r.card !== null && ids.includes(r.card));
}

/** « DPE non précisé », « pas d'ascenseur mentionné » : une absence d'information n'est pas un argument */
const UNKNOWN = /non (précisé|mentionné|indiqué|renseigné|communiqué)|pas .*mentionné|inconnu/i;

/** Date de parution plausible : jamais dans le futur */
function plausibleDate(v: string | null | undefined, capturedAt: string): string | null {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const day = capturedAt.slice(0, 10);
    let date = v;
    // Date sans année lue dans le futur (« 28 décembre » capturé en janvier) : année précédente
    if (date > day) date = `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
    return date > day ? null : date;
}

/** Le modèle écrit parfois « null », « N/A » ou « non précisé » au lieu de null */
const cleanText = (v: string | null | undefined) => {
    const t = (v || "").trim();
    return !t || /^(null|n\/?a|nc|non (précisé|renseigné|communiqué)|inconnu|-)$/i.test(t) ? null : t;
};

const LISTING_TYPES = /^(Product|Offer|RealEstateListing|Residence|Apartment|House|SingleFamilyResidence|Accommodation)$/;
const RESULTS_TYPES = /^(ItemList|SearchResultsPage|OfferCatalog)$/;

/** Types schema.org présents dans les données structurées de la page (@graph compris) */
function jsonLdTypes(blocks: string[]): string[] {
    const types: string[] = [];
    const walk = (node: unknown, depth: number) => {
        if (!node || typeof node !== "object" || depth > 3) return;
        if (Array.isArray(node)) { node.forEach(n => walk(n, depth + 1)); return; }
        const o = node as Record<string, unknown>;
        const t = o["@type"];
        if (typeof t === "string") types.push(t);
        else if (Array.isArray(t)) t.forEach(x => typeof x === "string" && types.push(x));
        if (o["@graph"]) walk(o["@graph"], depth + 1);
    };
    for (const b of blocks) {
        try { walk(JSON.parse(b), 0); } catch { /* bloc tronqué ou invalide */ }
    }
    return types;
}

/**
 * Page de résultats (plusieurs cartes) ou fiche d'une annonce ? Une fiche
 * affiche souvent des « annonces similaires » : on regarde la part du texte
 * occupée par les cartes et les données structurées. En cas de doute, on lit
 * les deux et on dédoublonne.
 */
function pageKind(payload: CapturePayload, cardCount: number): "results" | "detail" | "both" {
    if (cardCount < 3) return "detail";
    const cardsLen = (payload.cards || []).reduce((n, c) => n + (c.text || "").length, 0);
    const share = cardsLen / Math.max(1, (payload.text || "").length);
    const types = jsonLdTypes(payload.jsonLd || []);
    const detailSignal = share < 0.25 || (types.some(t => LISTING_TYPES.test(t)) && !types.some(t => RESULTS_TYPES.test(t)));
    const resultsSignal = share >= 0.5 || types.some(t => RESULTS_TYPES.test(t));
    if (resultsSignal && !detailSignal) return "results";
    if (detailSignal && !resultsSignal) return "detail";
    return "both";
}

/**
 * Lit la page capturée : cartes de résultats (par lots traités en parallèle)
 * et/ou annonce principale (page d'une annonce).
 */
export async function extractListings(payload: CapturePayload, subject: SubjectProperty): Promise<ExtractedListing[]> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const header = `BIEN ESTIMÉ : ${subjectText(subject)}\nPAGE : ${clip(payload.title, 200)} (${payload.url})`;

    const cards = (payload.cards || []).slice(0, 48).map((c, i) => ({ ...c, i }));
    const kind = pageKind(payload, cards.length);
    const jobs: Promise<(ExtractedListing & { isForSale: boolean })[]>[] = [];

    if (kind !== "detail") {
        for (let k = 0; k < cards.length; k += CARDS_PER_BATCH) {
            const batch = cards.slice(k, k + CARDS_PER_BATCH);
            const content = `${header}\n\n${batch.length} CARTES D'ANNONCES (une entrée par carte) :\n${batch.map(c => `[carte ${c.i}] ${clip(c.text, 700)}`).join("\n\n")}`;
            jobs.push(callModel(client, payload.capturedAt, content).then(rs => alignCards(rs, batch.map(c => c.i))));
        }
    }
    if (kind !== "results") {
        const content = `${header}\n\nANNONCE PRINCIPALE (card = null). Si cette page est une liste de résultats de recherche et non la fiche d'une seule annonce, renvoie une liste vide ; ignore les « annonces similaires » :
Titre : ${clip(payload.meta?.ogTitle || payload.title, 300)}
Description courte : ${clip(payload.meta?.ogDescription || payload.meta?.description, 600)}
Données structurées : ${clip((payload.jsonLd || []).join("\n"), 6000)}
Texte de la page : ${clip(payload.text, 12000)}`;
        jobs.push(callModel(client, payload.capturedAt, content).then(rs => rs.map(r => ({ ...r, card: null }))));
    }

    const results = (await Promise.all(jobs)).flat();
    const out: ExtractedListing[] = [];
    const seenCards = new Set<number>();
    // Cartes d'abord : si l'annonce principale figure aussi parmi les cartes, on garde la carte
    results.sort((a, b) => (a.card === null ? 1 : 0) - (b.card === null ? 1 : 0));
    for (const r of results) {
        if (!r.isForSale || !r.price || r.price < 10000) continue;
        if (r.card === null && out.some(o => o.price === r.price && Math.abs((o.surface || 0) - (r.surface || 0)) <= 1)) continue;
        let url = payload.url;
        let photoUrl: string | undefined = payload.meta?.ogImage || payload.images?.[0];
        if (r.card !== null && r.card !== undefined) {
            const card = cards.find(c => c.i === r.card);
            if (!card || seenCards.has(card.i)) continue;
            seenCards.add(card.i);
            url = card.href;
            photoUrl = card.img;
        }
        const dpe = (cleanText(r.dpe) || "").toUpperCase();
        out.push({
            ...r,
            url: canonicalListingUrl(url),
            photoUrl,
            title: cleanText(r.title) || "",
            city: cleanText(r.city),
            district: cleanText(r.district),
            floor: cleanText(r.floor),
            dpe: /^[A-G]$/.test(dpe) ? dpe : null,
            highlight: cleanText(r.highlight),
            description: cleanText(r.description),
            relevance: Math.max(0, Math.min(100, Math.round(r.relevance || 0))),
            features: (r.features || []).slice(0, 6),
            pros: (r.pros || []).filter(x => !UNKNOWN.test(x)).slice(0, 3),
            cons: (r.cons || []).filter(x => !UNKNOWN.test(x)).slice(0, 3),
            publishedAt: plausibleDate(r.publishedAt, payload.capturedAt),
        });
    }
    return out;
}
