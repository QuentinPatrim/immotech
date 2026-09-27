/* ============================================================
   PLAN 3D — PRÉPARATION DE L'IMAGE DU PLAN
   Convertit le fichier importé par l'agent (PDF ou image) en
   JPEG sur fond blanc, côté le plus long ~2400 px, prêt à être
   envoyé au stockage puis à l'analyse IA.
   ============================================================ */

import { loadPdfjs } from "@/lib/plan3d/pdfjs";

const MAX_SIDE = 2400;
const QUALITY = 0.9;

/** Texte de la page (PDF), boîte en pixels de l'image rendue */
export interface PlanText { str: string; x0: number; y0: number; x1: number; y1: number }

export interface PlanImage {
    blob: Blob;
    width: number;
    height: number;
    /** Pixels RGBA de l'image (lecture directe du dessin) */
    pixels: { width: number; height: number; data: Uint8ClampedArray };
    /** Textes positionnés (PDF uniquement) */
    texts: PlanText[];
}

function pixelsOf(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    return { width: canvas.width, height: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Conversion de l'image impossible."))), "image/jpeg", QUALITY);
    });
}

function whiteCanvas(width: number, height: number) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible sur ce navigateur.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    return { canvas, ctx };
}

async function pdfToImage(file: File, pageIndex: number): Promise<PlanImage> {
    const pdfjsLib = await loadPdfjs();
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    try {
        const page = await pdf.getPage(Math.min(Math.max(1, pageIndex + 1), pdf.numPages));
        const base = page.getViewport({ scale: 1 });
        const scale = MAX_SIDE / Math.max(base.width, base.height, 1);
        const viewport = page.getViewport({ scale });
        const { canvas, ctx } = whiteCanvas(Math.round(viewport.width), Math.round(viewport.height));
        await page.render({ canvas, viewport, background: "#ffffff" }).promise;
        // Textes de la page : position de chaque nom de pièce, repère PDF → pixels
        const texts: PlanText[] = [];
        try {
            const content = await page.getTextContent();
            for (const item of content.items) {
                if (!("str" in item) || !item.str.trim()) continue;
                const [a, b, c, d, e, f] = item.transform;
                const h = Math.hypot(c, d) || Math.hypot(a, b) || item.height || 10;
                const p1 = viewport.convertToViewportPoint(e, f), p2 = viewport.convertToViewportPoint(e + (item.width || 0), f + h);
                texts.push({ str: item.str, x0: Math.min(p1[0], p2[0]), y0: Math.min(p1[1], p2[1]), x1: Math.max(p1[0], p2[0]), y1: Math.max(p1[1], p2[1]) });
            }
        } catch { /* page sans texte exploitable */ }
        return { blob: await toJpeg(canvas), width: canvas.width, height: canvas.height, pixels: pixelsOf(canvas, ctx), texts };
    } finally {
        void pdf.destroy();
    }
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible.")); };
        img.src = url;
    });
}

async function rasterToImage(file: File): Promise<PlanImage> {
    const img = await loadImage(file);
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    if (!w0 || !h0) throw new Error("Image illisible.");
    const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    const width = Math.max(1, Math.round(w0 * scale)), height = Math.max(1, Math.round(h0 * scale));
    const { canvas, ctx } = whiteCanvas(width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    return { blob: await toJpeg(canvas), width, height, pixels: pixelsOf(canvas, ctx), texts: [] };
}

export const isPdfFile = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

/** PDF (page choisie, la première par défaut) ou image → JPEG sur fond blanc, avec ses dimensions en pixels */
export async function fileToPlanImage(file: File, opts: { page?: number } = {}): Promise<PlanImage> {
    if (isPdfFile(file)) return pdfToImage(file, opts.page ?? 0);
    const isImage = file.type ? file.type.startsWith("image/") : /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
    if (!isImage) throw new Error("Format non pris en charge : importez un PDF ou une image.");
    return rasterToImage(file);
}
