/* ============================================================
   PLAN 3D — LECTURE D'UN DDT (dossier de diagnostic technique)
   Dans le navigateur, sans IA : texte de chaque page du PDF,
   repérage de la page du croquis / plan et du tableau des
   surfaces du mesurage Carrez (ou Boutin), pièce par pièce.
   ============================================================ */

import type { RoomKind } from "@/lib/plan3d/types";
import { loadPdfjs } from "@/lib/plan3d/pdfjs";

export interface CarrezRoom {
    /** Libellé tel qu'écrit dans le rapport (niveau retiré), ex. « Chambre 1 » */
    name: string;
    kind: RoomKind;
    /** Surface en m² (Carrez pour les pièces, surface au sol pour les annexes) */
    area: number;
}

export interface CarrezTable {
    /** Pièces comptées dans la superficie privative */
    rooms: CarrezRoom[];
    /** Surfaces non prises en compte (balcon, terrasse, loggia…), modélisables en 3D */
    outdoor: CarrezRoom[];
    /** Total écrit dans le rapport, sinon somme des pièces */
    total: number;
    totalWritten: boolean;
    /** « Carrez » ou « habitable » (Boutin) */
    kind: "carrez" | "habitable";
    pages: number[];
}

export interface PdfPageInfo { index: number; text: string; planScore: number }

export interface DdtAnalysis {
    numPages: number;
    pages: PdfPageInfo[];
    /** Index (0-based) de la page la plus probable du croquis / plan */
    planPage: number;
    carrez: CarrezTable | null;
}

type PdfDoc = import("pdfjs-dist").PDFDocumentProxy;

const MAX_PAGES = 80;

/** Ouvre un PDF avec pdf.js (rustine et worker configurés par loadPdfjs) */
export async function openPdf(file: File): Promise<PdfDoc> {
    const pdfjsLib = await loadPdfjs();
    return pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
}

/** Lignes de texte d'une page, dans l'ordre de lecture (regroupement par ordonnée) */
async function pageLines(pdf: PdfDoc, index: number): Promise<string[]> {
    const page = await pdf.getPage(index + 1);
    const content = await page.getTextContent();
    const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
    for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const x = item.transform[4], y = item.transform[5];
        let row = rows.find(r => Math.abs(r.y - y) < 2.5);
        if (!row) { row = { y, parts: [] }; rows.push(row); }
        row.parts.push({ x, s: item.str });
    }
    return rows
        .sort((a, b) => b.y - a.y)
        .map(r => r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(" ").replace(/\s+/g, " ").trim())
        .filter(Boolean);
}

/* ─────────────────────── TYPES DE PIÈCES ─────────────────────── */

const KIND_RULES: { kind: RoomKind; re: RegExp }[] = [
    { kind: "sejour", re: /s[ée]jour|salon|living|pi[èe]ce (?:de vie|principale)|salle [àa] manger|\bs\.?[àa]\.?m\b/i },
    { kind: "cuisine", re: /cuisine|kitchenette|\bcuis\b/i },
    { kind: "chambre", re: /chambre|\bchb?r?e?\.?\s*\d/i },
    { kind: "sdb", re: /salle (?:de bains?|d['’ ]?eau|de douche)|\bs\.?d\.?[bde]\b|douche|\bsdb\b|\bsde\b/i },
    { kind: "wc", re: /\bw\.?\s?c\b|toilettes?/i },
    { kind: "entree", re: /entr[ée]e|\bhall\b|vestibule/i },
    { kind: "couloir", re: /d[ée]gagement|couloir|circulation|palier|\bdgt\b|escalier/i },
    { kind: "bureau", re: /bureau/i },
    { kind: "dressing", re: /dressing/i },
    { kind: "buanderie", re: /buanderie|lingerie/i },
    { kind: "cellier", re: /placard|rangement|cellier|d[ée]barras|\brgt\b|remise/i },
    { kind: "jardin", re: /jardin|pelouse|espace vert/i },
    { kind: "terrasse", re: /terrasse/i },
    { kind: "balcon", re: /balcon|loggia/i },
    { kind: "autre", re: /mezzanine|v[ée]randa|pi[èe]ce|biblioth[èe]que|salle de jeux|atelier/i },
];
/** Annexes non modélisées (hors appartement) */
const ANNEX = /\bcave\b|garage|parking|\bbox\b|grenier|combles?|jardin|\bcour\b|local|sous-sol|abri/i;
const TOTAL = /total|superficie privative|surface privative|surface (?:loi )?carrez|surface habitable (?:totale|du lot)|superficie habitable/i;
const NOT_PRIVATE_TOTAL = /au sol|hors carrez|non (?:prise|comptabilis)|emprise|terrain|b[âa]timent|annexe/i;
const LEVEL = /^(?:rez[- ]de[- ](?:chauss[ée]e|jardin)|r\.?d\.?c\.?|(?:\d+|premier|deuxi[èe]me|second|troisi[èe]me)(?:er|e|ème|eme)?\s*[ée]tage|niveau\s*\d+|sous-sol|combles?)\s*[-–:/|]?\s*/i;

export function kindFromLabel(label: string): RoomKind | null {
    for (const r of KIND_RULES) if (r.re.test(label)) return r.kind;
    return null;
}

const NUMBER = /(\d{1,3}(?:[   ]\d{3})*[.,]\d{1,2}|\d{1,4}(?=\s*m\s*[²2]))/g;
const toNumber = (s: string) => Number(s.replace(/[   ]/g, "").replace(",", "."));

/** Nom lisible : niveau et ponctuation de tableau retirés, première lettre en capitale */
function cleanLabel(raw: string): string {
    const s = raw.replace(LEVEL, "").replace(/[|:;•·\-–_]+\s*$/g, "").replace(/^[\s|:;•·\-–_]+/, "").replace(/\s+/g, " ").trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Tableau des surfaces à partir des lignes de texte des pages de mesurage.
 * Une ligne « Libellé  12,34 [surface au sol] [motif] » donne une pièce ;
 * une surface Carrez nulle avec une surface au sol, ou un libellé de balcon /
 * terrasse / loggia, donne une surface extérieure (hors Carrez).
 */
export function parseCarrez(lines: string[], kind: "carrez" | "habitable" = "carrez", pages: number[] = []): CarrezTable | null {
    const rooms: CarrezRoom[] = [], outdoor: CarrezRoom[] = [];
    const seen = new Set<string>();
    let total = 0, totalWritten = false, totalRank = 0;
    for (const line of lines) {
        const nums = Array.from(line.matchAll(NUMBER)).map(m => ({ v: toNumber(m[1]), i: m.index ?? 0 }));
        if (!nums.length) continue;
        const label = cleanLabel(line.slice(0, nums[0].i));
        if (TOTAL.test(line) && !kindFromLabel(label.replace(TOTAL, ""))) {
            // Totaux « au sol », « hors Carrez », terrain ou bâtiment : ce ne sont pas la superficie privative
            if (NOT_PRIVATE_TOTAL.test(line)) continue;
            const t = Math.max(...nums.map(n => n.v).filter(v => v > 5 && v < 3000), 0);
            const rank = /privative|carrez|habitable/i.test(line) ? 2 : 1;
            if (t > 0 && rank >= totalRank) { total = t; totalWritten = true; totalRank = rank; }
            continue;
        }
        if (!label || label.length > 60 || ANNEX.test(label)) continue;
        const k = kindFromLabel(label);
        if (!k) continue;
        const first = nums[0].v, second = nums[1]?.v ?? 0;
        const isOutdoor = k === "balcon" || k === "terrasse" || k === "jardin";
        const area = isOutdoor ? (first > 0 ? first : second) : first > 0 ? first : 0;
        if (!(area > 0.2 && area < 500)) continue;
        const key = `${label.toLowerCase()}|${area}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (isOutdoor || (first === 0 && second > 0)) outdoor.push({ name: label, kind: isOutdoor ? k : "autre", area });
        else rooms.push({ name: label, kind: k, area });
    }
    if (rooms.length < 2) return null;
    const sum = rooms.reduce((s, r) => s + r.area, 0);
    // Un total très éloigné de la somme est sans doute un autre chiffre (surface du terrain, du bâtiment…)
    if (!totalWritten || Math.abs(total - sum) / sum > 0.15) { total = Math.round(sum * 100) / 100; totalWritten = false; }
    return { rooms, outdoor, total, totalWritten, kind, pages };
}

/* ─────────────────────── ANALYSE DU DOSSIER ─────────────────────── */

const PLAN_WORDS = /croquis|plan (?:de rep[ée]rage|du logement|du bien|des locaux|sch[ée]matique)|sch[ée]ma|esquisse|plan\b/gi;
const CARREZ_WORDS = /carrez|loi n[°o]?\s*96[- ]?1107|superficie privative|mesurage/i;
const BOUTIN_WORDS = /boutin|surface habitable/i;

/** Score « page de croquis » : mots-clés, peu de texte, libellés de pièces dispersés */
function planScore(lines: string[]): number {
    const text = lines.join(" ");
    const words = (text.match(PLAN_WORDS) || []).length;
    const roomLabels = lines.filter(l => l.length < 30 && kindFromLabel(l)).length;
    const len = text.length;
    return words * 3 + Math.min(roomLabels, 10) * 1.2 + (len < 400 ? 3 : len < 1200 ? 1.5 : len > 3500 ? -3 : 0);
}

/** Lit un DDT : textes, page du croquis la plus probable et tableau des surfaces */
export async function analyzeDdt(pdf: PdfDoc): Promise<DdtAnalysis> {
    const n = Math.min(pdf.numPages, MAX_PAGES);
    const pages: PdfPageInfo[] = [];
    const carrezLines: string[] = [], boutinLines: string[] = [];
    const carrezPages: number[] = [], boutinPages: number[] = [];
    for (let i = 0; i < n; i++) {
        let lines: string[] = [];
        try { lines = await pageLines(pdf, i); } catch { /* page illisible : ignorée */ }
        const text = lines.join("\n");
        pages.push({ index: i, text, planScore: planScore(lines) });
        if (CARREZ_WORDS.test(text)) { carrezLines.push(...lines); carrezPages.push(i); }
        else if (BOUTIN_WORDS.test(text)) { boutinLines.push(...lines); boutinPages.push(i); }
    }
    const carrez = parseCarrez(carrezLines, "carrez", carrezPages) ?? parseCarrez(boutinLines, "habitable", boutinPages);
    // Le croquis suit souvent le tableau des surfaces : léger bonus aux pages voisines
    const near = new Set((carrez?.pages ?? []).flatMap(p => [p, p + 1, p + 2]));
    const best = pages.reduce((a, b) => ((b.planScore + (near.has(b.index) ? 1 : 0)) > (a.planScore + (near.has(a.index) ? 1 : 0)) ? b : a), pages[0] ?? { index: 0, text: "", planScore: 0 });
    return { numPages: pdf.numPages, pages, planPage: best?.index ?? 0, carrez };
}

/** Miniature d'une page (data URL JPEG), côté le plus long ≈ maxSide px */
export async function pageThumbnail(pdf: PdfDoc, index: number, maxSide = 240): Promise<string> {
    const page = await pdf.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: maxSide / Math.max(base.width, base.height, 1) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport, background: "#ffffff" }).promise;
    return canvas.toDataURL("image/jpeg", 0.7);
}

const fr = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Tableau des surfaces en texte, transmis à l'IA pour nommer et mettre à l'échelle les pièces du croquis */
export function carrezHint(t: CarrezTable): string {
    const lines = [
        ...t.rooms.map(r => `- ${r.name} : ${fr(r.area)} m²`),
        ...t.outdoor.map(r => `- ${r.name} : ${fr(r.area)} m² (hors ${t.kind === "carrez" ? "Carrez" : "surface habitable"})`),
    ];
    return `${lines.join("\n")}\nTotal ${t.kind === "carrez" ? "Carrez" : "habitable"} : ${fr(t.total)} m²`;
}
