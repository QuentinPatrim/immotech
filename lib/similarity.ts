/* ============================================================
   SIMILARITÉ D'UNE ANNONCE AVEC LE BIEN ESTIMÉ (serveur)
   Note sur 100 et motifs lisibles par l'agent. Exclusions nettes
   (autre type, neuf, viager, localisation inconnue ou trop loin,
   surface / pièces hors bornes, prix au m² incohérent), puis note
   pondérée : localisation 25, surface 17, prix au m² 13, pièces 8,
   étage 9, extérieur 8, stationnement 6, état 7, DPE 7.
   Une information inconnue vaut moins de la moitié des points : une
   annonce bien documentée et proche passe devant une annonce vague.
   ============================================================ */

export type Strictness = "strict" | "normal" | "large";

export const STRICTNESS_MIN: Record<Strictness, number> = { strict: 72, normal: 65, large: 45 };

export type ExclusionReason =
    | "type" | "neuf" | "viager" | "localisation" | "quartier" | "surface" | "pièces" | "prix" | "score";

export interface SimilaritySubject {
    propertyType: string;          // "Appartement" | "Maison" | ""
    surface: number;
    rooms: number;
    floor?: string;                // « 3 », « 3e », « RDC »…
    hasElevator?: boolean;
    buildYear?: number;
    dpe?: string;
    amenities: string[];           // ids du dossier : balcon, terrasse, jardin, parking, garage…
}

export interface SimilarityListing {
    propertyType: string | null;
    surface: number | null;
    rooms: number | null;
    price: number | null;
    floor: string | null;
    floorNumber: number | null;
    elevator: boolean | null;
    outdoor: boolean | null;
    parking: boolean | null;
    condition: string | null;
    dpe: string | null;
    newBuild: boolean;
    lifeAnnuity: boolean;
    sameArea: boolean | null;
}

export interface SimilarityBounds {
    surfaceMin?: number; surfaceMax?: number;
    roomsMin?: number; roomsMax?: number;
    radiusKm?: number;
}

export interface SimilarityResult {
    score: number;
    /** Points communs (affichés en vert) */
    reasons: string[];
    /** Différences (affichées en orange) */
    warnings: string[];
}

export type SimilarityVerdict = { ok: true; result: SimilarityResult } | { ok: false; reason: ExclusionReason; detail: string };

const OUTDOOR = ["balcon", "terrasse", "loggia", "jardin"];
const PARKING = ["parking", "garage"];

/** « 3 », « 3e étage », « RDC », « rez-de-chaussée » → numéro d'étage */
export function parseFloor(v?: string | null): number | null {
    if (!v) return null;
    const t = v.toLowerCase();
    if (/rdc|rez/.test(t)) return 0;
    const m = t.match(/(\d{1,2})/);
    return m ? Number(m[1]) : null;
}

const pct = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n * 100)} %`;
const km = (d: number) => `${String(Math.round(d * 10) / 10).replace(".", ",")} km`;

export function scoreSimilarity(
    s: SimilaritySubject,
    l: SimilarityListing,
    ctx: { distanceKm: number | null; refSqm: number | null; bounds: SimilarityBounds | null; strictness: Strictness },
): SimilarityVerdict {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const radius = ctx.bounds?.radiusKm ?? 2;

    // ---- Exclusions nettes ----
    if (s.propertyType && l.propertyType && l.propertyType !== "Autre" && l.propertyType !== s.propertyType)
        return { ok: false, reason: "type", detail: l.propertyType.toLowerCase() };
    const subjectIsNew = !!s.buildYear && s.buildYear >= new Date().getFullYear() - 5;
    if (l.newBuild && !subjectIsNew) return { ok: false, reason: "neuf", detail: "programme neuf" };
    if (l.lifeAnnuity) return { ok: false, reason: "viager", detail: "viager / nue-propriété" };

    let location: number;
    if (ctx.distanceKm !== null) {
        if (ctx.distanceKm > radius) return { ok: false, reason: "quartier", detail: `à ${km(ctx.distanceKm)}` };
        location = ctx.distanceKm <= 0.5 ? 25 : ctx.distanceKm <= 1 ? 22 : ctx.distanceKm <= 1.5 ? 17 : 12;
        reasons.push(`à ${km(ctx.distanceKm)}`);
    } else if (l.sameArea) {
        location = 8;
        warnings.push("quartier approximatif");
    } else {
        return { ok: false, reason: "localisation", detail: "quartier non précisé" };
    }

    // ---- Surface ----
    let surface = 8;
    if (!l.surface) return { ok: false, reason: "surface", detail: "surface non indiquée" };
    const bMin = ctx.bounds?.surfaceMin, bMax = ctx.bounds?.surfaceMax;
    if (bMin || bMax) {
        if ((bMin && l.surface < bMin) || (bMax && l.surface > bMax)) return { ok: false, reason: "surface", detail: `${Math.round(l.surface)} m²` };
    }
    if (s.surface) {
        const d = (l.surface - s.surface) / s.surface;
        if (!(bMin || bMax) && Math.abs(d) > 0.2) return { ok: false, reason: "surface", detail: `${Math.round(l.surface)} m² (${pct(d)})` };
        surface = Math.abs(d) <= 0.05 ? 17 : Math.abs(d) <= 0.1 ? 13 : Math.abs(d) <= 0.15 ? 9 : 5;
        if (Math.abs(d) <= 0.1) reasons.push(`${Math.round(l.surface)} m² (${pct(d)})`);
        else warnings.push(`${Math.round(l.surface)} m² (${pct(d)})`);
    }

    // ---- Pièces ----
    let rooms = 4;
    const rMin = ctx.bounds?.roomsMin, rMax = ctx.bounds?.roomsMax;
    if (l.rooms && (rMin || rMax) && ((rMin && l.rooms < rMin) || (rMax && l.rooms > rMax)))
        return { ok: false, reason: "pièces", detail: `${l.rooms} pièces` };
    if (s.rooms && l.rooms) {
        const g = Math.abs(l.rooms - s.rooms);
        if (!(rMin || rMax) && g > 1) return { ok: false, reason: "pièces", detail: `${l.rooms} pièces` };
        rooms = g === 0 ? 8 : 3;
        if (g === 0) reasons.push(`${l.rooms} pièces`);
        else warnings.push(`${l.rooms} pièces`);
    }

    // ---- Prix au m² ----
    let price = 6;
    if (ctx.refSqm && l.price && l.surface) {
        const g = (l.price / l.surface - ctx.refSqm) / ctx.refSqm;
        if (Math.abs(g) > 0.25) return { ok: false, reason: "prix", detail: `${pct(g)} au m²` };
        price = Math.abs(g) <= 0.05 ? 13 : Math.abs(g) <= 0.1 ? 10 : Math.abs(g) <= 0.15 ? 6 : 2;
        if (Math.abs(g) <= 0.1) reasons.push(`prix/m² ${pct(g)}`);
        else warnings.push(`prix/m² ${pct(g)}`);
    }

    // ---- Étage et ascenseur (appartements) ----
    let floor = 9;
    if (s.propertyType !== "Maison") {
        const sf = parseFloor(s.floor);
        const lf = l.floorNumber ?? parseFloor(l.floor);
        if (sf === null || lf === null) floor = 3.5;
        else {
            const band = (f: number) => (f === 0 ? 0 : f <= 2 ? 1 : 2);
            const same = band(sf) === band(lf);
            floor = same ? 7 : band(sf) === 0 || band(lf) === 0 ? 0 : 2;
            const label = lf === 0 ? "rez-de-chaussée" : lf === 1 ? "1er étage" : `${lf}e étage`;
            if (same) reasons.push(lf === 0 ? "rez-de-chaussée aussi" : label);
            else warnings.push(label);
            if (lf >= 3 && s.hasElevator !== undefined && l.elevator !== null) {
                if (l.elevator === s.hasElevator) floor += 2;
                else { floor = Math.max(0, floor - 5); warnings.push(l.elevator ? "avec ascenseur" : "sans ascenseur"); }
            } else floor += 1;
        }
    }

    // ---- Extérieur, stationnement ----
    const has = (ids: string[]) => s.amenities.some(a => ids.includes(a.toLowerCase()));
    const pair = (subjectHas: boolean, listingHas: boolean | null, label: string, max: number) => {
        if (listingHas === null) return max * 0.4;
        if (listingHas === subjectHas) { if (listingHas) reasons.push(label); return max; }
        warnings.push(listingHas ? `avec ${label}` : `sans ${label}`);
        return 0;
    };
    const outdoor = pair(has(OUTDOOR), l.outdoor, "extérieur", 8);
    const parking = pair(has(PARKING), l.parking, "stationnement", 6);

    // ---- État et DPE ----
    let state = 3;
    if (l.condition === "a_renover") { state = 0; warnings.push("à rénover"); }
    else if (l.condition === "neuf" || l.condition === "refait") { state = l.condition === "neuf" ? 3 : 4; warnings.push(l.condition === "neuf" ? "état neuf" : "refait à neuf"); }
    else if (l.condition) state = 7;
    const letters = "ABCDEFG";
    const letter = (v?: string | null) => { const t = (v || "").trim().toUpperCase(); return t.length === 1 ? letters.indexOf(t) : -1; };
    let dpe = 3;
    const sd = letter(s.dpe), ld = letter(l.dpe);
    if (sd >= 0 && ld >= 0) {
        const g = Math.abs(sd - ld);
        dpe = g === 0 ? 7 : g === 1 ? 5 : g === 2 ? 2 : 0;
        if (g <= 1) reasons.push(`DPE ${letters[ld]}`);
        else warnings.push(`DPE ${letters[ld]}`);
    }

    const score = Math.round(location + surface + rooms + price + floor + outdoor + parking + state + dpe);
    if (score < STRICTNESS_MIN[ctx.strictness]) return { ok: false, reason: "score", detail: `similarité ${score}/100` };
    return { ok: true, result: { score, reasons: reasons.slice(0, 6), warnings: warnings.slice(0, 4) } };
}
