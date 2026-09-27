import OpenAI from "openai";
import { ROOM_KINDS, type OpeningKind, type RoomKind } from "@/lib/plan3d/types";
import type { ModelPlan, ModelRoom, ModelOpening } from "@/lib/plan3d/modelPlan";

export * from "@/lib/plan3d/modelPlan";

/* ============================================================
   PLAN 3D — LECTURE D'UN PLAN 2D PAR L'IA (serveur)
   Un modèle OpenAI (vision) lit l'image du plan : pièces (contour
   en coordonnées normalisées 0..1000), surfaces écrites, portes et
   fenêtres, cote lisible. On en déduit l'échelle (surfaces écrites,
   cote, surface déclarée), on redresse les murs, on fusionne les
   cloisons partagées et on renvoie un Plan3D en mètres calé sur
   l'image d'origine (source.originPx / pxPerMeter).
   ============================================================ */

const KIND_IDS: RoomKind[] = ROOM_KINDS.map(k => k.id);
const OPENING_KINDS: OpeningKind[] = ["door", "window", "french"];
const coord = (description: string) => ({ type: "number", description });

export const PLAN_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["rooms", "openings", "totalSurfaceOnPlan", "knownDimension", "confidence", "notes"],
    properties: {
        rooms: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "kind", "surfaceOnPlan", "polygon"],
                properties: {
                    name: { type: "string", description: "Nom de la pièce tel qu'écrit sur le plan (« Séjour », « Ch.1 », « SdB »…), ou un nom descriptif s'il n'y en a pas" },
                    kind: { type: "string", enum: KIND_IDS },
                    surfaceOnPlan: { type: ["number", "null"], description: "Surface en m² écrite sur le plan pour cette pièce (ex : 12,45 → 12.45) ; null si aucune" },
                    polygon: {
                        type: "array",
                        description: "Sommets du contour intérieur de la pièce (face intérieure des murs), sens horaire, en coordonnées normalisées 0..1000 de l'image : x depuis le bord gauche, y depuis le bord haut. 4 points pour une pièce rectangulaire, plus pour une pièce en L.",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["x", "y"],
                            properties: { x: coord("0 = bord gauche, 1000 = bord droit"), y: coord("0 = bord haut, 1000 = bord bas") },
                        },
                    },
                },
            },
        },
        openings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["kind", "x1", "y1", "x2", "y2"],
                properties: {
                    kind: { type: "string", enum: OPENING_KINDS, description: "door = porte, window = fenêtre, french = porte-fenêtre / baie vitrée jusqu'au sol" },
                    x1: coord("Extrémité 1 de l'ouverture le long de son mur (0..1000)"),
                    y1: coord("Extrémité 1 (0..1000)"),
                    x2: coord("Extrémité 2 de l'ouverture le long de son mur (0..1000)"),
                    y2: coord("Extrémité 2 (0..1000)"),
                },
            },
        },
        totalSurfaceOnPlan: { type: ["number", "null"], description: "Surface habitable totale écrite sur le plan (m²) ; null si absente" },
        knownDimension: {
            anyOf: [
                {
                    type: "object",
                    additionalProperties: false,
                    required: ["meters", "x1", "y1", "x2", "y2"],
                    description: "Une cote lisible sur le plan (ligne de cote avec sa valeur, ex : « 3,45 ») : valeur en mètres et extrémités de la ligne de cote en coordonnées normalisées",
                    properties: {
                        meters: { type: "number" },
                        x1: coord("0..1000"), y1: coord("0..1000"), x2: coord("0..1000"), y2: coord("0..1000"),
                    },
                },
                { type: "null" },
            ],
        },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        notes: { type: "array", items: { type: "string" }, description: "Remarques courtes en français (lisibilité, éléments incertains), 4 maximum" },
    },
} as const;

export const SYSTEM = `Tu es un dessinateur-projeteur qui relève des plans d'appartements et de maisons pour une agence immobilière française.
On te donne l'image d'un plan 2D (plan d'architecte, plan de vente, croquis coté). Tu en extrais la géométrie.

Repère : coordonnées NORMALISÉES de 0 à 1000 sur toute l'image, x depuis le bord gauche, y depuis le bord haut (0,0 = coin haut-gauche de l'image, 1000,1000 = coin bas-droit), quelles que soient les proportions de l'image.

Pièces :
- Relève TOUTES les pièces, y compris entrée, dégagement, placards / rangements cloisonnés, WC, balcon, terrasse, loggia, jardin privatif (kind « balcon », « terrasse » ou « jardin »).
- Lis le nom écrit (« Séjour », « Ch.1 », « SdB », « SdE », « Dgt », « WC », « Cuis. », « Entrée », « Rgt »…) et la surface écrite dans la pièce (ex : « 12,45 m² » → 12.45). surfaceOnPlan = null si aucune surface n'est écrite pour cette pièce.
- Trace le contour le long de la FACE INTÉRIEURE des murs (pas l'axe, pas la face extérieure), sommets dans le sens horaire. 4 points pour une pièce rectangulaire, 6 ou plus pour une pièce en L ou en T. Les pièces voisines partagent la même cloison : leurs contours doivent être parallèles et séparés seulement par l'épaisseur du mur.
- Une cuisine ouverte sur le séjour sans cloison : une seule pièce « sejour » sauf si le plan les nomme séparément avec leurs surfaces.
- Ne trace jamais le contour général du logement comme une pièce.

Ouvertures (extrémités le long du mur, dans l'épaisseur du mur) :
- door : porte (arc de cercle d'ouverture, ou interruption du mur entre deux pièces / vers le palier).
- window : fenêtre (fines lignes doubles ou triples dans un mur extérieur).
- french : porte-fenêtre ou baie vitrée descendant jusqu'au sol, souvent vers un balcon ou une terrasse.

Échelle : si une cote est lisible (ligne de cote avec sa valeur, ex : « 3,45 » ou « 345 »), renvoie-la dans knownDimension (valeur en mètres, extrémités de la ligne). Renvoie la surface totale si elle est écrite (« Surface habitable : 64,20 m² »).

Ignore : meubles et équipements dessinés, hachures, lignes de cote (sauf pour knownDimension), textes et légendes, flèche du nord, cartouche, logo, mobilier extérieur.

Croquis de diagnostiqueur (DDT, mesurage Carrez) : le dessin peut être sommaire, non coté et imparfaitement à l'échelle ; relève-le quand même au mieux, pièce par pièce.
Si un TABLEAU DES SURFACES (mesurage Carrez / surface habitable) est fourni avec l'image, il fait foi : donne à chaque pièce dessinée le nom EXACT de la ligne correspondante et mets sa surface dans surfaceOnPlan (même si elle n'est pas écrite sur le dessin). Associe les lignes aux pièces par leur nom écrit sur le croquis, sinon par leur type et leur taille relative (la plus grande chambre ↔ la plus grande surface « Chambre »…). N'invente pas de pièce absente du dessin.

Si l'image n'est pas un plan de logement, renvoie rooms = [], openings = [] et une note qui l'explique.
confidence : high si le plan est net et coté, medium s'il est lisible sans cote ni surface, low s'il est flou, partiel ou ambigu.`;

/* ─────────────────────────── APPEL OPENAI ─────────────────────────── */

/** Modèles essayés dans l'ordre (repli si l'un n'est pas disponible pour la clé) */
export const MODELS: string[] = Array.from(new Set(
    [process.env.PLAN3D_MODEL, "gpt-4.1", "gpt-4o", "gpt-4o-mini"].filter((m): m is string => !!m && !!m.trim()).map(m => m.trim()),
));

const READ_BUDGET_MS = 54_000;

function errorParts(err: unknown) {
    if (err instanceof OpenAI.APIError) return { status: err.status, code: err.code ?? "", message: err.message || "" };
    return { status: undefined, code: "", message: err instanceof Error ? err.message : String(err) };
}

/** Modèle inexistant ou non autorisé pour cette clé */
function isModelUnavailable(err: unknown): boolean {
    const { status, code, message } = errorParts(err);
    if (status === 404 || code === "model_not_found") return true;
    if (/model_not_found|does not exist|do not have access to (the )?model/i.test(message)) return true;
    return status === 400 && /model/i.test(message) && /invalid|not (found|supported|available)|unsupported/i.test(message);
}

/** Modèles de raisonnement : température non prise en charge */
function isTemperatureUnsupported(err: unknown): boolean {
    const { status, message } = errorParts(err);
    return status === 400 && /temperature/i.test(message);
}

export interface PlanHints { surface?: number; rooms?: number; propertyType?: string; carrez?: string }

function hintText(hints: PlanHints) {
    const parts = [
        hints.propertyType ? `Type de bien : ${hints.propertyType}` : "",
        hints.surface ? `Surface habitable déclarée : ${hints.surface} m²` : "",
        hints.rooms ? `Nombre de pièces principales déclaré : ${hints.rooms}` : "",
    ].filter(Boolean);
    const table = hints.carrez ? `\nTABLEAU DES SURFACES du diagnostic (fait foi pour les noms et les surfaces) :\n${hints.carrez}` : "";
    return `Relève ce plan.${parts.length ? `\nInformations de l'agent (indicatives, le plan fait foi) :\n- ${parts.join("\n- ")}` : ""}${table}`;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Réponse du modèle nettoyée (types vérifiés, valeurs non numériques écartées) */
function sanitizeModelPlan(raw: unknown): ModelPlan {
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);
    const rooms: ModelRoom[] = arr(o.rooms).map(r => ({
        name: typeof r.name === "string" ? r.name : "",
        kind: KIND_IDS.includes(r.kind as RoomKind) ? (r.kind as RoomKind) : "autre",
        surfaceOnPlan: num(r.surfaceOnPlan),
        polygon: arr(r.polygon).flatMap(p => {
            const x = num(p.x), y = num(p.y);
            return x === null || y === null ? [] : [{ x, y }];
        }),
    }));
    const openings: ModelOpening[] = arr(o.openings).flatMap(p => {
        const x1 = num(p.x1), y1 = num(p.y1), x2 = num(p.x2), y2 = num(p.y2);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return [];
        return [{ kind: OPENING_KINDS.includes(p.kind as OpeningKind) ? (p.kind as OpeningKind) : "window", x1, y1, x2, y2 }];
    });
    const d = o.knownDimension && typeof o.knownDimension === "object" ? (o.knownDimension as Record<string, unknown>) : null;
    const dm = d ? { meters: num(d.meters), x1: num(d.x1), y1: num(d.y1), x2: num(d.x2), y2: num(d.y2) } : null;
    const knownDimension = dm && dm.meters !== null && dm.x1 !== null && dm.y1 !== null && dm.x2 !== null && dm.y2 !== null
        ? { meters: dm.meters, x1: dm.x1, y1: dm.y1, x2: dm.x2, y2: dm.y2 } : null;
    const confidence = o.confidence === "high" || o.confidence === "low" ? o.confidence : "medium";
    const notes = Array.isArray(o.notes) ? o.notes.filter((n): n is string => typeof n === "string" && !!n.trim()) : [];
    return { rooms, openings, totalSurfaceOnPlan: num(o.totalSurfaceOnPlan), knownDimension, confidence, notes };
}

/**
 * Lit l'image d'un plan (URL https ou data:image/...;base64) avec un modèle
 * vision et renvoie sa géométrie en coordonnées normalisées 0..1000.
 */
export async function readPlanImage(image: string, hints: PlanHints): Promise<ModelPlan> {
    // Budget global sous le maxDuration (60 s) de la route, replis compris
    const deadline = Date.now() + READ_BUDGET_MS;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
    let lastError: unknown = null;
    for (const model of MODELS) {
        let withTemperature = true;
        for (let attempt = 0; attempt < 2; attempt++) {
            const timeout = deadline - Date.now();
            if (timeout < 5000) throw lastError ?? new Error("Délai de lecture du plan dépassé.");
            try {
                const res = await client.chat.completions.create({
                    model,
                    ...(withTemperature ? { temperature: 0.1 } : {}),
                    max_completion_tokens: 8000,
                    response_format: { type: "json_schema", json_schema: { name: "plan", strict: true, schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
                    messages: [
                        { role: "system", content: SYSTEM },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: hintText(hints) },
                                { type: "image_url", image_url: { url: image, detail: "high" } },
                            ],
                        },
                    ],
                }, { timeout });
                const choice = res.choices[0];
                if (choice?.message?.refusal) throw new Error(`Lecture du plan refusée par le modèle : ${choice.message.refusal}`);
                if (choice?.finish_reason === "length") throw new Error("Réponse du modèle tronquée (plan trop chargé).");
                return sanitizeModelPlan(JSON.parse(choice?.message?.content || "{}"));
            } catch (err) {
                if (withTemperature && isTemperatureUnsupported(err)) { withTemperature = false; continue; }
                if (isModelUnavailable(err)) { lastError = err; break; }
                throw err;
            }
        }
    }
    throw lastError ?? new Error("Aucun modèle d'analyse d'image disponible.");
}
