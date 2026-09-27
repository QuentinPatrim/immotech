/* ============================================================
   PLAN 3D — PRÉPARATION DE L'IMAGE DU PLAN
   Convertit le fichier importé par l'agent (PDF ou image) en
   JPEG sur fond blanc, côté le plus long ~2400 px, prêt à être
   envoyé au stockage puis à l'analyse IA.
   ============================================================ */

const MAX_SIDE = 2400;
const QUALITY = 0.9;

export interface PlanImage { blob: Blob; width: number; height: number }

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

async function pdfToImage(file: File): Promise<PlanImage> {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    try {
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const scale = MAX_SIDE / Math.max(base.width, base.height, 1);
        const viewport = page.getViewport({ scale });
        const { canvas } = whiteCanvas(Math.round(viewport.width), Math.round(viewport.height));
        await page.render({ canvas, viewport, background: "#ffffff" }).promise;
        return { blob: await toJpeg(canvas), width: canvas.width, height: canvas.height };
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
    return { blob: await toJpeg(canvas), width, height };
}

/** PDF (page 1) ou image → JPEG sur fond blanc, avec ses dimensions en pixels */
export async function fileToPlanImage(file: File): Promise<PlanImage> {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (isPdf) return pdfToImage(file);
    const isImage = file.type ? file.type.startsWith("image/") : /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
    if (!isImage) throw new Error("Format non pris en charge : importez un PDF ou une image.");
    return rasterToImage(file);
}
