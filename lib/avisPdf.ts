/* ============================================================
   AVIS DE VALEUR → FICHIER PDF
   Les pages A4 affichées (.print-page) sont photographiées une à
   une (html-to-image, rendu du navigateur : couleurs et polices
   fidèles) puis assemblées en PDF (jsPDF). Sert de pièce jointe
   à l'e-mail d'envoi. Les images d'un autre site qui refusent
   d'être lues sont remplacées par un fond neutre.
   ============================================================ */

/** A4 à 96 ppp */
const PAGE_W = 794;
const PAGE_H = 1123;
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

export async function pagesToPdf(pages: HTMLElement[], onProgress?: (done: number, total: number) => void): Promise<Blob> {
    if (!pages.length) throw new Error("Aucune page à exporter.");
    const [{ toJpeg, getFontEmbedCSS }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
    const options = {
        width: PAGE_W,
        height: PAGE_H,
        pixelRatio: 2,
        quality: 0.9,
        backgroundColor: "#ffffff",
        imagePlaceholder: BLANK,
        style: { margin: "0", boxShadow: "none", borderRadius: "0", transform: "none" },
    };
    // Polices intégrées une seule fois pour toutes les pages
    const fontEmbedCSS = await getFontEmbedCSS(pages[0], options).catch(() => "");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    for (let i = 0; i < pages.length; i++) {
        const img = await toJpeg(pages[i], { ...options, fontEmbedCSS });
        if (i) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        onProgress?.(i + 1, pages.length);
    }
    return pdf.output("blob");
}

/** Nom de fichier lisible : « Avis de valeur - 12 rue des Lilas.pdf » */
export function pdfFileName(address: string): string {
    const street = address.split(",")[0].replace(/\s*\d{5}.*$/, "").trim();
    // Sans accents : certains navigateurs ignorent un nom de fichier accentué (le fichier s'appelle alors « download »)
    const clean = street.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]+/g, "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    return `Avis de valeur${clean ? ` - ${clean}` : ""}.pdf`;
}
