"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import {
    ArrowLeft, Printer, Sparkles, MapPin,
    Maximize, Grid, Layers, Leaf, Banknote,
    Calculator, MousePointerClick, Image as ImageIcon,
    Flame, CloudFog, ArrowUpRight, Home,
    Share2, MessageCircle, Mail, Check, X,
    Download, Loader2, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ============================================================
   PATRIM · Charte couleurs
   ============================================================ */
const COLORS = {
    primary: "#8a0e01",   // ROUGE
    secondary: "#d35f52", // ROSE
    gray: "#393939",      // GRIS
    ivory: "#faf8f6",     // Fond Revolut Metal light
};

const DPE_COLORS: Record<string, string> = {
    "A": "#00A06D", "B": "#52B153", "C": "#A5CC74",
    "D": "#F3E724", "E": "#F0B328", "F": "#EB8235", "G": "#D7221F"
};

const DPE_LABELS: Record<string, string> = {
    "A": "Extrêmement performant",
    "B": "Très performant",
    "C": "Assez performant",
    "D": "Assez peu performant",
    "E": "Peu performant",
    "F": "Très peu performant",
    "G": "Extrêmement peu performant"
};

const GES_LABELS: Record<string, string> = {
    "A": "Très faibles émissions",
    "B": "Faibles émissions",
    "C": "Émissions modérées",
    "D": "Émissions assez élevées",
    "E": "Émissions élevées",
    "F": "Émissions très élevées",
    "G": "Émissions extrêmement élevées"
};

export default function PlaquetteManager() {
    const params = useParams();
    const router = useRouter();
    const estimationId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [baseData, setBaseData] = useState<any>(null);
    const [domain, setDomain] = useState("");

    // --- VARIABLES COMMERCIALES ---
    const [sellingPriceFAI, setSellingPriceFAI] = useState<number>(0);
    const [agencyFees, setAgencyFees] = useState<number>(0);
    const [feeType, setFeeType] = useState<"PERCENT" | "EUROS">("PERCENT");
    const [commercialText, setCommercialText] = useState("");

    // --- PARTAGE ---
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const plaquetteRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setDomain(window.location.origin);
        }
        if (!estimationId) return;
        const fetchEstimation = async () => {
            const { data } = await supabase.from('estimations').select('data_json').eq('id', estimationId).single();
            if (data && data.data_json) {
                setBaseData(data.data_json);
                setSellingPriceFAI(data.data_json.highPrice || 0);
                setCommercialText(data.data_json.features || "");
            }
            setLoading(false);
        };
        fetchEstimation();
    }, [estimationId]);

    // URLs interactives
    const photosUrl = domain ? `${domain}/galerie/${estimationId}` : "";
    const simulationUrl = domain ? `${domain}/simulation/${estimationId}?price=${sellingPriceFAI}` : "";

    const feeAmount = feeType === "PERCENT" ? (sellingPriceFAI * (agencyFees / 100)) : agencyFees;
    const netVendeur = Math.max(0, sellingPriceFAI - feeAmount);
    const pricePerSqm = baseData?.surface > 0 ? Math.round(sellingPriceFAI / baseData.surface) : 0;

    const getDynamicTitle = () => {
        if (!baseData) return "";
        let title = `${baseData.propertyType}`;
        if (baseData.rooms > 0) title += ` T${baseData.rooms}`;
        return title;
    };

    const getCleanAmenities = () => {
        if (!baseData) return [];
        const combined = [...(baseData.strengths || []), ...(baseData.amenities || [])];
        return combined.filter((item, index) => {
            return combined.findIndex(t => t.trim().toLowerCase() === item.trim().toLowerCase()) === index;
        });
    };

    /* ============================================================
       PARTAGE PDF
       -- Mobile : génère le PDF, utilise navigator.share() avec fichier
          → menu natif (WhatsApp, Mail, SMS, AirDrop) avec PDF en pièce jointe
       -- Desktop : génère le PDF, propose actions dédiées
          (télécharger + ouvrir WhatsApp Web / client mail / etc.)
       ============================================================ */

    // Nom du fichier PDF généré
    const getPdfFileName = () => {
        const title = (getDynamicTitle() || "plaquette").replace(/\s+/g, "-").toLowerCase();
        const addr = (baseData?.propertyAddress || "")
            .split(",")[0]
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-]/gi, "")
            .toLowerCase();
        return `patrim-${title}${addr ? "-" + addr : ""}.pdf`;
    };

    // Convertit n'importe quelle string CSS color (oklch, lab, hsl, rgb…) en "rgb(r, g, b)" ou "rgba(r,g,b,a)"
    // Utilise un canvas pour laisser le navigateur faire la conversion.
    const toRgbString = (() => {
        let canvas: HTMLCanvasElement | null = null;
        let ctx: CanvasRenderingContext2D | null = null;
        const cache = new Map<string, string>();

        return (color: string): string => {
            if (!color) return color;
            const trimmed = color.trim();
            if (cache.has(trimmed)) return cache.get(trimmed)!;

            // Si c'est déjà rgb/rgba/hex pur, on renvoie tel quel
            if (/^(rgb\s*\(|rgba\s*\(|#|transparent$|currentcolor$)/i.test(trimmed)) {
                cache.set(trimmed, trimmed);
                return trimmed;
            }

            if (!canvas) {
                canvas = document.createElement("canvas");
                canvas.width = 1;
                canvas.height = 1;
                ctx = canvas.getContext("2d", { willReadFrequently: true });
            }

            if (!ctx) {
                cache.set(trimmed, trimmed);
                return trimmed;
            }

            try {
                ctx.fillStyle = "rgb(0, 0, 0)"; // reset
                ctx.fillStyle = trimmed; // Canvas parse et convertit
                const resolved = ctx.fillStyle as string;
                cache.set(trimmed, resolved);
                return resolved;
            } catch (e) {
                cache.set(trimmed, trimmed);
                return trimmed;
            }
        };
    })();

    // Detecte toute fonction couleur moderne non-supportée par html2canvas
    const hasModernColorFn = (val: string): boolean =>
        /\b(lab|oklch|oklab|color)\s*\(/i.test(val);

    // Remplace toutes les fonctions couleur modernes dans une string (gradients, ombres, etc.)
    const replaceModernColorsInString = (val: string): string => {
        if (!hasModernColorFn(val)) return val;
        // Match récursif de fonctions couleur (on gère les parenthèses internes basiques)
        return val.replace(
            /\b(lab|oklch|oklab|color)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)/gi,
            (match) => toRgbString(match)
        );
    };

    // Propriétés à scanner (simples couleurs)
    const COLOR_PROPS = [
        "color", "background-color",
        "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
        "outline-color", "text-decoration-color", "caret-color",
        "fill", "stroke",
    ];

    // Propriétés qui peuvent contenir des couleurs embarquées dans une string
    const COMPOSITE_PROPS = [
        "background-image", "box-shadow", "text-shadow",
        "background", "border-color", "border",
    ];

    // Parcourt TOUTES les feuilles de style du document et remplace les fonctions couleur modernes
    // par leurs équivalents RGB dans les CSSOM. Évite que html2canvas lise directement oklch/lab
    // depuis les stylesheets.
    // Retourne une fonction de restauration pour remettre les règles d'origine après génération.
    const patchStylesheets = (): (() => void) => {
        const restoreFns: Array<() => void> = [];

        const patchRule = (rule: CSSRule) => {
            // @supports, @media, etc. contiennent d'autres règles
            if ("cssRules" in rule) {
                const groupRule = rule as CSSGroupingRule;
                for (let i = 0; i < groupRule.cssRules.length; i++) {
                    patchRule(groupRule.cssRules[i]);
                }
                return;
            }
            if (!(rule instanceof CSSStyleRule)) return;

            const style = rule.style;
            for (let i = 0; i < style.length; i++) {
                const prop = style[i];
                const val = style.getPropertyValue(prop);
                if (val && hasModernColorFn(val)) {
                    const converted = replaceModernColorsInString(val);
                    if (converted !== val) {
                        const priority = style.getPropertyPriority(prop);
                        const original = val;
                        try {
                            style.setProperty(prop, converted, priority);
                            restoreFns.push(() => {
                                try { style.setProperty(prop, original, priority); } catch (e) {}
                            });
                        } catch (e) {}
                    }
                }
            }
        };

        // Parcours de toutes les stylesheets du document
        for (let s = 0; s < document.styleSheets.length; s++) {
            try {
                const sheet = document.styleSheets[s] as CSSStyleSheet;
                if (!sheet.cssRules) continue;
                for (let r = 0; r < sheet.cssRules.length; r++) {
                    patchRule(sheet.cssRules[r]);
                }
            } catch (e) {
                // Cross-origin stylesheets : on ne peut pas y accéder, on ignore
            }
        }

        // Restauration
        return () => restoreFns.forEach(fn => fn());
    };

    // Génère le PDF à partir du DOM des 2 pages
    const generatePdf = async (): Promise<Blob | null> => {
        if (!plaquetteRef.current) return null;

        // Import dynamique pour éviter SSR issues
        const html2pdf = (await import("html2pdf.js")).default;

        const source = plaquetteRef.current;

        // ÉTAPE 1 : patch global des stylesheets pour remplacer oklch/lab/oklab par rgb
        const restoreStylesheets = patchStylesheets();

        // ÉTAPE 2 : on attend un frame que les stylesheets s'appliquent
        await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

        // ÉTAPE 3 : clone hors écran, en aplatissant les wrappers (qui sont pour l'affichage mobile uniquement)
        const offscreen = document.createElement("div");
        offscreen.style.cssText = `
            position: fixed;
            top: 0;
            left: -99999px;
            width: 210mm;
            background-color: #faf8f6;
            z-index: -1;
        `;

        // Pour chaque wrapper, on extrait uniquement le .print-page sans le wrapper de scaling
        const pages = source.querySelectorAll(".print-page");
        pages.forEach((page) => {
            const clonedPage = page.cloneNode(true) as HTMLElement;
            // On reset tout style inline résiduel du scaling mobile
            clonedPage.style.transform = "none";
            clonedPage.style.position = "static";
            clonedPage.style.width = "210mm";
            clonedPage.style.height = "297mm";
            clonedPage.style.margin = "0";
            clonedPage.style.boxShadow = "none";
            clonedPage.style.overflow = "hidden";
            offscreen.appendChild(clonedPage);
        });

        document.body.appendChild(offscreen);

        const options = {
            margin: 0,
            filename: getPdfFileName(),
            image: { type: "jpeg", quality: 0.96 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#faf8f6",
                logging: false,
                windowWidth: 794, // 210mm en px
                onclone: (clonedDoc: Document) => {
                    // Filet de sécurité : on re-patch les stylesheets du document cloné par html2canvas
                    try {
                        for (let s = 0; s < clonedDoc.styleSheets.length; s++) {
                            const sheet = clonedDoc.styleSheets[s] as CSSStyleSheet;
                            if (!sheet.cssRules) continue;
                            const patchRuleDeep = (rule: CSSRule) => {
                                if ("cssRules" in rule) {
                                    const g = rule as CSSGroupingRule;
                                    for (let i = 0; i < g.cssRules.length; i++) patchRuleDeep(g.cssRules[i]);
                                    return;
                                }
                                if (!(rule instanceof (clonedDoc.defaultView as any).CSSStyleRule)) return;
                                const styleRule = rule as CSSStyleRule;
                                const style = styleRule.style;
                                for (let i = 0; i < style.length; i++) {
                                    const prop = style[i];
                                    const val = style.getPropertyValue(prop);
                                    if (val && hasModernColorFn(val)) {
                                        try {
                                            style.setProperty(prop, replaceModernColorsInString(val), style.getPropertyPriority(prop));
                                        } catch (e) {}
                                    }
                                }
                            };
                            for (let r = 0; r < sheet.cssRules.length; r++) patchRuleDeep(sheet.cssRules[r]);
                        }
                    } catch (e) {
                        console.warn("onclone stylesheet patch failed", e);
                    }

                    // Walk DOM + inline sanitize
                    try {
                        const walk = (el: Element) => {
                            if (el instanceof (clonedDoc.defaultView as any).HTMLElement || el instanceof (clonedDoc.defaultView as any).SVGElement) {
                                const htmlEl = el as HTMLElement;
                                const computed = (clonedDoc.defaultView as any).getComputedStyle(htmlEl);
                                [...COLOR_PROPS, ...COMPOSITE_PROPS].forEach(prop => {
                                    const val = computed.getPropertyValue(prop);
                                    if (val && hasModernColorFn(val)) {
                                        try {
                                            htmlEl.style.setProperty(prop, replaceModernColorsInString(val), "important");
                                        } catch (e) {}
                                    }
                                });
                            }
                            for (let i = 0; i < el.children.length; i++) walk(el.children[i]);
                        };
                        walk(clonedDoc.body);
                    } catch (e) {
                        console.warn("onclone DOM walk failed", e);
                    }
                },
            },
            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait",
                compress: true,
                hotfixes: ["px_scaling"],
            },
            pagebreak: {
                mode: ["css", "legacy"],
                before: ".print-page:not(:first-of-type)"
            },
        };

        try {
            const blob: Blob = await html2pdf()
                .set(options)
                .from(offscreen)
                .outputPdf("blob");
            return blob;
        } catch (err) {
            console.error("Erreur génération PDF", err);
            return null;
        } finally {
            // Restauration des stylesheets d'origine
            restoreStylesheets();
            // Nettoyage du clone hors écran
            if (offscreen.parentNode) {
                offscreen.parentNode.removeChild(offscreen);
            }
        }
    };

    // Point d'entrée : clic sur le bouton Partager de la toolbar
    const handleShare = async () => {
        setIsGeneratingPdf(true);
        try {
            const blob = await generatePdf();
            if (!blob) {
                alert("Impossible de générer le PDF. Veuillez réessayer.");
                return;
            }
            setPdfBlob(blob);

            const fileName = getPdfFileName();
            const pdfFile = new File([blob], fileName, { type: "application/pdf" });
            const shareTitle = `${getDynamicTitle()} · ${baseData?.propertyAddress || ""}`;
            const shareText = `Découvrez ce bien à la vente avec PATRIM Immobilier — ${formatPrice(sellingPriceFAI)} € FAI`;

            // Mobile : navigator.share avec fichier PDF
            const canShareFiles =
                typeof navigator !== "undefined" &&
                (navigator as any).canShare &&
                (navigator as any).canShare({ files: [pdfFile] });

            if (canShareFiles) {
                try {
                    await (navigator as any).share({
                        title: shareTitle,
                        text: shareText,
                        files: [pdfFile],
                    });
                    return;
                } catch (err: any) {
                    if (err?.name === "AbortError") return;
                }
            }

            // Desktop : ouverture du menu custom (avec PDF stocké dans le state)
            setShareMenuOpen(true);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Télécharge le PDF stocké
    const downloadPdf = () => {
        if (!pdfBlob) return;
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = getPdfFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // WhatsApp Web : on télécharge le PDF + on ouvre WhatsApp avec un message pré-rempli
    // L'utilisateur glisse-dépose le PDF (ou clique "joindre") depuis son téléchargement
    const shareViaWhatsApp = () => {
        downloadPdf();
        const text = `${getDynamicTitle()} — ${formatPrice(sellingPriceFAI)} € FAI\n\nPlaquette PDF en pièce jointe (téléchargée).`;
        setTimeout(() => {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        }, 500);
        setShareMenuOpen(false);
    };

    // Email : on télécharge le PDF + on ouvre le client mail avec sujet et corps pré-remplis
    // L'utilisateur ajoute le PDF en pièce jointe depuis son téléchargement
    const shareViaEmail = () => {
        downloadPdf();
        const subject = `${getDynamicTitle()} — ${baseData?.propertyAddress || ""}`;
        const body = `Bonjour,\n\nJe vous invite à découvrir ce bien proposé à la vente par PATRIM Immobilier :\n\n${getDynamicTitle()}\n${baseData?.propertyAddress || ""}\nPrix : ${formatPrice(sellingPriceFAI)} € FAI\n\nVeuillez trouver ci-jointe la plaquette de présentation du bien (téléchargée automatiquement).\n\nCordialement,`;
        setTimeout(() => {
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }, 500);
        setShareMenuOpen(false);
    };

    // SMS : idem, téléchargement + ouverture app Messages
    const shareViaSMS = () => {
        downloadPdf();
        const text = `${getDynamicTitle()} — ${formatPrice(sellingPriceFAI)} € FAI. Plaquette PDF ci-jointe.`;
        setTimeout(() => {
            window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
        }, 500);
        setShareMenuOpen(false);
    };

    /* ============================================================
       COMPOSANT DIAGNOSTIC COMPACT
       ============================================================ */
    const CompactDiagnostic = ({
        currentLetter, title, subtitle, icon, labels
    }: {
        currentLetter: string;
        title: string;
        subtitle: string;
        icon: React.ReactNode;
        labels: Record<string, string>;
    }) => {
        const color = DPE_COLORS[currentLetter] || COLORS.gray;
        const label = labels[currentLetter] || "—";

        return (
            <div className="bg-white rounded-[24px] border border-zinc-200/70 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS.secondary}15`, color: COLORS.primary }}>
                        {icon}
                    </span>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800">{title}</p>
                        <p className="text-[8px] text-zinc-500 font-medium">{subtitle}</p>
                    </div>
                </div>

                <div className="px-5 pb-4 flex items-center gap-4">
                    <div className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color, boxShadow: `0 8px 24px -6px ${color}80` }}>
                        <span className="text-5xl font-black text-white">{currentLetter}</span>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-end h-10 gap-1 mb-2">
                            {["A", "B", "C", "D", "E", "F", "G"].map((letter) => {
                                const isCurrent = letter === currentLetter;
                                return (
                                    <div
                                        key={letter}
                                        className="flex-1 rounded-t-md transition-all"
                                        style={{
                                            backgroundColor: DPE_COLORS[letter],
                                            opacity: isCurrent ? 1 : 0.3,
                                            height: isCurrent ? '100%' : '50%'
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-[8px] font-black text-zinc-400">
                            {["A", "B", "C", "D", "E", "F", "G"].map((letter) => (
                                <span
                                    key={letter}
                                    className="flex-1 text-center"
                                    style={{
                                        color: letter === currentLetter ? DPE_COLORS[letter] : undefined,
                                        fontWeight: letter === currentLetter ? 900 : 700
                                    }}
                                >
                                    {letter}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-5 py-2.5 text-center" style={{ backgroundColor: `${color}12` }}>
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: color }}>
                        {label}
                    </p>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <img src="/logo-patrim.png" className="h-12 object-contain animate-pulse" alt="Patrim"/>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-bold">Chargement de la plaquette…</p>
            </div>
        </div>
    );

    if (!baseData) return <div className="min-h-screen bg-[#faf8f6] p-10">Bien introuvable.</div>;

    return (
        <div className="min-h-screen font-sans pb-32" style={{ backgroundColor: '#e8e8ec' }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700;900&family=JetBrains+Mono:wght@500;700&display=swap');

                /* Desktop : pages A4 centrées à leur taille réelle */
                .print-page-wrapper {
                    width: 210mm;
                    max-width: 100%;
                }

                /* Mobile/tablette : scale visuel des pages pour qu'elles rentrent à l'écran */
                @media screen and (max-width: 820px) {
                    .plaquette-container {
                        padding: 0 0.75rem;
                        width: 100%;
                        max-width: 100vw;
                        overflow: hidden;
                    }
                    .print-page-wrapper {
                        width: 100%;
                        max-width: 100%;
                        /* On calcule l'échelle : largeur dispo / 210mm */
                        --scale: calc((100vw - 1.5rem) / 210mm);
                        /* Hauteur du wrapper = hauteur scalée de la page (A4 = 297mm) */
                        height: calc(297mm * var(--scale));
                        position: relative;
                        overflow: hidden;
                    }
                    .print-page {
                        transform: scale(var(--scale));
                        transform-origin: top left;
                        position: absolute;
                        top: 0;
                        left: 0;
                    }
                }

                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; }
                    .print-hidden { display: none !important; }
                    .print-page-wrapper {
                        width: 210mm !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .print-page {
                        width: 210mm !important;
                        height: 297mm !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        overflow: hidden;
                        transform: none !important;
                        position: static !important;
                    }
                    .print-page:not(:last-child) { page-break-after: always !important; }
                    .print-page:last-child { page-break-after: auto !important; }
                    a { text-decoration: none !important; color: inherit !important; display: block !important; }
                }
                .font-serif { font-family: 'Playfair Display', serif; }
                .font-mono-num { font-family: 'JetBrains Mono', monospace; }
            `}</style>

            {/* ============================================================
                TOOLBAR — version DESKTOP (large, avec titre)
               ============================================================ */}
            <div className="hidden md:flex fixed bottom-10 left-1/2 -translate-x-1/2 text-white px-8 py-4 rounded-full items-center gap-5 shadow-2xl z-50 print-hidden border bg-[#0a0a0c]/95 backdrop-blur-md">
                <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-white rounded-full text-sm">
                    <ArrowLeft size={15} className="mr-2"/> Retour
                </Button>
                <div className="w-px h-5 bg-white/10"></div>
                <span className="text-xs font-bold text-white px-4 tracking-widest uppercase">Brochure Commerciale (2 pages)</span>
                <div className="w-px h-5 bg-white/10"></div>
                <Button
                    onClick={handleShare}
                    disabled={isGeneratingPdf}
                    variant="ghost"
                    className="rounded-full px-5 h-10 font-bold text-sm text-white hover:bg-white/10 border border-white/15 disabled:opacity-60"
                >
                    {isGeneratingPdf ? (
                        <>
                            <Loader2 size={15} className="mr-2 animate-spin"/>
                            Génération…
                        </>
                    ) : (
                        <>
                            <Share2 size={15} className="mr-2"/>
                            Partager
                        </>
                    )}
                </Button>
                <Button onClick={() => window.print()} className="rounded-full px-7 h-10 font-bold text-sm bg-gradient-to-r from-[#8a0e01] to-[#d35f52]">
                    <Printer size={15} className="mr-2"/> Imprimer PDF
                </Button>
            </div>

            {/* ============================================================
                TOOLBAR — version MOBILE (compacte, icônes)
               ============================================================ */}
            <div className="md:hidden fixed bottom-5 left-3 right-3 text-white px-3 py-2.5 rounded-full flex items-center gap-2 shadow-2xl z-50 print-hidden border border-white/10 bg-[#0a0a0c]/95 backdrop-blur-md">
                <button
                    onClick={() => router.back()}
                    className="text-zinc-400 hover:text-white p-2.5 rounded-full shrink-0"
                    aria-label="Retour"
                >
                    <ArrowLeft size={16}/>
                </button>
                <div className="w-px h-5 bg-white/10"></div>
                <button
                    onClick={handleShare}
                    disabled={isGeneratingPdf}
                    className="flex-1 flex items-center justify-center gap-2 px-3 h-10 font-bold text-xs text-white hover:bg-white/10 rounded-full border border-white/15 disabled:opacity-60 min-w-0"
                >
                    {isGeneratingPdf ? (
                        <>
                            <Loader2 size={14} className="animate-spin shrink-0"/>
                            <span className="truncate">Génération…</span>
                        </>
                    ) : (
                        <>
                            <Share2 size={14} className="shrink-0"/>
                            <span>Partager</span>
                        </>
                    )}
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 px-4 h-10 font-bold text-xs rounded-full bg-gradient-to-r from-[#8a0e01] to-[#d35f52] shrink-0"
                >
                    <Printer size={14}/>
                    <span>Imprimer</span>
                </button>
            </div>

            {/* ============================================================
                MENU PARTAGE CUSTOM (desktop uniquement)
                S'ouvre si navigator.share (fichiers) n'est pas disponible
               ============================================================ */}
            {shareMenuOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 print-hidden"
                    style={{ backgroundColor: 'rgba(10, 10, 12, 0.7)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setShareMenuOpen(false)}
                >
                    <div
                        className="bg-white rounded-[28px] w-full max-w-md shadow-2xl overflow-hidden border border-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header menu */}
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                                    <Share2 size={16} className="text-white"/>
                                </span>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Partager la plaquette</h3>
                                    <p className="text-[10px] text-white/80 font-medium">{getDynamicTitle()}</p>
                                </div>
                            </div>
                            <button onClick={() => setShareMenuOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                <X size={18}/>
                            </button>
                        </div>

                        {/* Bandeau info PDF */}
                        <div className="px-5 py-3 flex items-center gap-3 border-b border-zinc-100" style={{ backgroundColor: `${COLORS.primary}08` }}>
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS.primary }}>
                                <FileText size={14} className="text-white"/>
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase font-black tracking-wider" style={{ color: COLORS.primary }}>
                                    PDF prêt à partager
                                </p>
                                <p className="text-[10px] text-zinc-600 font-medium truncate">{getPdfFileName()}</p>
                            </div>
                            <span className="text-[9px] uppercase tracking-widest font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                <Check size={10} className="inline mr-0.5"/> Généré
                            </span>
                        </div>

                        {/* Options de partage */}
                        <div className="p-5 space-y-2">
                            {/* WhatsApp */}
                            <button
                                onClick={shareViaWhatsApp}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                            >
                                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#25D36615' }}>
                                    <MessageCircle size={20} style={{ color: '#25D366' }}/>
                                </span>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-black text-zinc-900">WhatsApp Web</p>
                                    <p className="text-[10px] text-zinc-500 font-medium">Télécharge le PDF & ouvre WhatsApp</p>
                                </div>
                                <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-700 transition-colors"/>
                            </button>

                            {/* Email */}
                            <button
                                onClick={shareViaEmail}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                            >
                                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS.primary}12` }}>
                                    <Mail size={20} style={{ color: COLORS.primary }}/>
                                </span>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-black text-zinc-900">Email</p>
                                    <p className="text-[10px] text-zinc-500 font-medium">Télécharge le PDF & ouvre le mail</p>
                                </div>
                                <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-700 transition-colors"/>
                            </button>

                            {/* SMS */}
                            <button
                                onClick={shareViaSMS}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                            >
                                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS.secondary}15` }}>
                                    <MessageCircle size={20} style={{ color: COLORS.secondary }}/>
                                </span>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-black text-zinc-900">SMS</p>
                                    <p className="text-[10px] text-zinc-500 font-medium">Télécharge le PDF & ouvre Messages</p>
                                </div>
                                <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-700 transition-colors"/>
                            </button>

                            {/* Télécharger uniquement */}
                            <button
                                onClick={() => { downloadPdf(); setShareMenuOpen(false); }}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                            >
                                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS.gray}15` }}>
                                    <Download size={20} style={{ color: COLORS.gray }}/>
                                </span>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-black text-zinc-900">Télécharger le PDF</p>
                                    <p className="text-[10px] text-zinc-500 font-medium">Sauvegarder le fichier sur votre appareil</p>
                                </div>
                                <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-700 transition-colors"/>
                            </button>
                        </div>

                        {/* Note d'usage */}
                        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50">
                            <p className="text-[9px] text-zinc-500 font-medium text-center leading-relaxed">
                                Le PDF sera téléchargé automatiquement avant l'ouverture de l'app.<br/>
                                Joignez-le depuis votre dossier Téléchargements.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* PANNEAU SAISIE */}
            <div className="bg-[#0a0a0c] text-white pt-8 pb-12 px-6 shadow-xl print-hidden mb-12 border-b border-white/10">
                <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8">
                    <div className="col-span-1 space-y-4">
                        <h3 className="text-[11px] uppercase tracking-widest font-bold text-[#d35f52] flex items-center gap-2">
                            <MapPin size={14}/> Transaction
                        </h3>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prix Affiché FAI</label>
                            <Input type="number" value={sellingPriceFAI||""} onChange={e=>setSellingPriceFAI(Number(e.target.value))} className="h-10 bg-black/50 border-white/10 text-sm font-bold focus:border-[#d35f52]"/>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Honoraires Agence</label>
                                <div className="flex bg-white/10 rounded overflow-hidden">
                                    <button onClick={()=>setFeeType("PERCENT")} className={`text-[9px] px-2 py-1 font-bold ${feeType==="PERCENT"?'bg-white text-black':'text-zinc-400'}`}>%</button>
                                    <button onClick={()=>setFeeType("EUROS")} className={`text-[9px] px-2 py-1 font-bold ${feeType==="EUROS"?'bg-white text-black':'text-zinc-400'}`}>€</button>
                                </div>
                            </div>
                            <Input type="number" value={agencyFees||""} onChange={e=>setAgencyFees(Number(e.target.value))} className="h-10 bg-black/50 border-white/10 text-sm"/>
                        </div>
                    </div>
                    <div className="col-span-2 space-y-2 border-l border-white/10 pl-8">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2 mb-2">
                            <Sparkles size={14}/> Accroche Commerciale
                        </label>
                        <textarea value={commercialText} onChange={e=>setCommercialText(e.target.value)} className="w-full h-36 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-zinc-200 outline-none focus:border-[#d35f52] resize-none leading-relaxed" />
                    </div>
                </div>
            </div>

            {/* ============================================================
                RENDU PLAQUETTE — 2 pages A4 portrait
               ============================================================ */}
            <div ref={plaquetteRef} className="plaquette-container flex flex-col items-center gap-10">

                {/* ================================================
                    PAGE 1 — COUVERTURE PREMIUM
                   ================================================ */}
                <div className="print-page-wrapper">
                <div className="print-page w-[210mm] h-[297mm] shadow-2xl relative flex flex-col overflow-hidden" style={{ backgroundColor: COLORS.ivory }}>

                    {/* Hero photo 58% — titre DANS le hero sur zone sombre */}
                    <div className="relative w-full h-[58%] overflow-hidden">
                        <img src={baseData.mainPhoto} className="w-full h-full object-cover" alt={baseData.propertyAddress}/>

                        {/* Overlay renforcé bas pour lisibilité du titre blanc */}
                        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.7) 85%, rgba(0,0,0,0.85) 100%)` }}/>
                        <div className="absolute inset-0 mix-blend-overlay opacity-20" style={{ background: `linear-gradient(135deg, ${COLORS.primary}00 0%, ${COLORS.primary}40 100%)` }}/>

                        {/* Badge Logo */}
                        <div className="absolute top-10 left-10 flex items-center gap-3 bg-white/95 backdrop-blur-xl p-3 pr-5 rounded-2xl border border-white shadow-xl">
                            <img src="/logo-patrim.png" className="h-10 object-contain" alt="Patrim"/>
                            <div className="h-7 w-px bg-zinc-300"/>
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                                <span className="text-[10px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Immobilier</span>
                            </div>
                        </div>

                        {/* Badge À la Vente */}
                        <div className="absolute top-10 right-10 flex items-center gap-2 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-full border border-white shadow-lg">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: COLORS.secondary }}/>
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: COLORS.primary }}/>
                            </span>
                            <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: COLORS.primary }}>À la Vente</span>
                        </div>

                        {/* TITRE + ADRESSE — sur zone sombre du hero */}
                        <div className="absolute bottom-8 left-10 right-10 text-white">
                            <p className="text-[10px] uppercase tracking-[0.25em] font-black mb-2 flex items-center gap-2" style={{ color: COLORS.secondary, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                                <Home size={13}/> Exclusivité
                            </p>
                            <h1 className="font-serif text-5xl font-bold tracking-tight mb-2 uppercase text-white" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)' }}>
                                {getDynamicTitle()}
                            </h1>
                            <p className="text-base font-medium flex items-center gap-2 text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                <MapPin size={16} style={{ color: COLORS.secondary }}/> {baseData.propertyAddress}
                            </p>
                        </div>
                    </div>

                    {/* ZONE IVOIRE 42% — CARTOUCHE PRIX + CHIFFRES CLÉS */}
                    <div className="flex-1 px-10 pt-8 pb-12 relative">
                        <div className="pointer-events-none absolute top-0 -left-40 w-[400px] h-[400px] rounded-full blur-[120px] opacity-20" style={{ background: `radial-gradient(circle, ${COLORS.secondary} 0%, transparent 70%)` }}/>
                        <div className="pointer-events-none absolute bottom-0 -right-40 w-[400px] h-[400px] rounded-full blur-[140px] opacity-15" style={{ background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)` }}/>

                        {/* CARTOUCHE PRIX */}
                        <div className="relative bg-white rounded-[32px] border border-white shadow-[0_30px_60px_-15px_rgba(138,14,1,0.35)] overflow-hidden">
                            <div className="px-8 py-3.5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                <span className="text-[11px] uppercase tracking-[0.3em] font-black text-white">
                                    Prix de Présentation
                                </span>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-white/85 bg-white/15 px-3 py-1 rounded-full">FAI</span>
                            </div>
                            <div className="px-8 py-7 flex items-end justify-between gap-6">
                                <div>
                                    <p className="font-black tracking-tighter leading-none text-zinc-900 text-[5.5rem] font-mono-num">
                                        {formatPrice(sellingPriceFAI)}
                                        <span className="ml-2 text-4xl font-black align-top" style={{ color: COLORS.primary }}>€</span>
                                    </p>
                                    <p className="text-[11px] font-bold text-zinc-500 mt-3 leading-relaxed">
                                        Prix net vendeur : <span className="font-black text-zinc-700">{formatPrice(netVendeur)} €</span>
                                        <br/>
                                        <span className="opacity-80">
                                            + {feeType === "PERCENT" ? agencyFees + "%" : formatPrice(feeAmount)+" €"} d'honoraires à charge acquéreur
                                        </span>
                                    </p>
                                </div>
                                <div className="text-right border-l border-zinc-200 pl-6">
                                    <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Prix au m²</p>
                                    <p className="font-black text-3xl font-mono-num" style={{ color: COLORS.primary }}>
                                        {formatPrice(pricePerSqm)}
                                    </p>
                                    <p className="text-[10px] font-bold text-zinc-400">€/m²</p>
                                </div>
                            </div>
                        </div>

                        {/* 4 CHIFFRES CLÉS */}
                        <div className="grid grid-cols-4 gap-3 mt-6">
                            {[
                                { icon: <Maximize size={13}/>, label: "Surface", value: `${baseData.surface}`, unit: "m²" },
                                { icon: <Grid size={13}/>, label: "Pièces", value: `${baseData.rooms}`, unit: "pces" },
                                { icon: <Layers size={13}/>, label: "Étage", value: baseData.floor || "RDC", unit: "" },
                                { icon: <Leaf size={13}/>, label: "DPE", value: baseData.dpe, unit: "" }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-3.5 border border-zinc-200/70 shadow-sm flex flex-col items-center text-center">
                                    <div className="w-8 h-8 rounded-xl mb-2 flex items-center justify-center text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                        {item.icon}
                                    </div>
                                    <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-0.5">{item.label}</p>
                                    <p className="text-lg font-black text-zinc-900 font-mono-num leading-tight">
                                        {item.value}
                                        {item.unit && <span className="text-[10px] font-bold text-zinc-400 ml-0.5">{item.unit}</span>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Signature bas page */}
                    <div className="absolute bottom-6 left-10 right-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-px w-8" style={{ backgroundColor: COLORS.primary }}/>
                            <span className="text-[9px] uppercase tracking-[0.3em] font-black" style={{ color: COLORS.primary }}>
                                Dossier de présentation
                            </span>
                        </div>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 font-mono-num">
                            01 / 02
                        </span>
                    </div>
                </div>
                </div>

                {/* ================================================
                    PAGE 2 — DESCRIPTION + ÉQUIPEMENTS + COÛTS + DIAGNOSTICS + QR
                   ================================================ */}
                <div className="print-page-wrapper">
                <div className="print-page w-[210mm] h-[297mm] shadow-2xl relative flex flex-col p-12" style={{ backgroundColor: COLORS.ivory }}>

                    <div className="flex justify-between items-end border-b border-zinc-300 pb-4 mb-6">
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.3em] font-black mb-1" style={{ color: COLORS.primary }}>
                                Dossier technique
                            </p>
                            <h2 className="font-serif text-2xl font-black text-zinc-900">{getDynamicTitle()}</h2>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-0.5">{baseData.propertyAddress}</p>
                        </div>
                        <img src="/logo-patrim.png" alt="PATRIM" className="h-10 object-contain"/>
                    </div>

                    {/* DESCRIPTION + ÉQUIPEMENTS */}
                    <div className="grid grid-cols-5 gap-5 mb-5">
                        <div className="col-span-3 bg-white rounded-[24px] p-5 border border-zinc-200/70 shadow-sm">
                            <h3 className="text-[10px] uppercase tracking-[0.25em] font-black mb-3 flex items-center gap-2" style={{ color: COLORS.primary }}>
                                <span className="w-4 h-px" style={{ backgroundColor: COLORS.primary }}/>
                                Description
                            </h3>
                            <p className="text-[11px] text-zinc-700 leading-relaxed whitespace-pre-wrap font-medium text-justify">
                                {commercialText}
                            </p>
                        </div>

                        <div className="col-span-2 bg-white rounded-[24px] p-5 border border-zinc-200/70 shadow-sm">
                            <h3 className="text-[10px] uppercase tracking-[0.25em] font-black mb-3 flex items-center gap-2 text-zinc-700">
                                <Layers size={12}/> Équipements
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {getCleanAmenities().map((item: any, i: number) => (
                                    <span key={i} className="text-[9px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-tight" style={{
                                        backgroundColor: `${COLORS.secondary}08`,
                                        borderColor: `${COLORS.secondary}25`,
                                        color: COLORS.gray
                                    }}>
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COÛTS ANNUELS */}
                    <div className="bg-white rounded-[24px] p-5 border border-zinc-200/70 shadow-sm mb-5">
                        <h3 className="text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-2 mb-3" style={{ color: COLORS.primary }}>
                            <Banknote size={12}/> Coûts Annuels
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                <span className="text-xs text-zinc-500 font-bold">Taxe Foncière</span>
                                <span className="text-base font-black font-mono-num" style={{ color: COLORS.gray }}>
                                    {formatPrice(baseData.taxeFonciere)}
                                    <span className="text-[10px] opacity-60"> €</span>
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                <span className="text-xs text-zinc-500 font-bold">Copropriété</span>
                                <span className="text-base font-black font-mono-num" style={{ color: COLORS.gray }}>
                                    {baseData.isCopropriete ? formatPrice(baseData.coproFees * 12) : "N/A"}
                                    {baseData.isCopropriete && <span className="text-[10px] opacity-60"> €</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* DIAGNOSTICS DPE / GES — version compacte côte à côte */}
                    <div className="mb-5">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-[9px] uppercase tracking-[0.3em] font-black" style={{ color: COLORS.primary }}>
                                Bilan Énergétique
                            </span>
                            <div className="h-px flex-1 bg-zinc-300"/>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <CompactDiagnostic
                                currentLetter={baseData.dpe}
                                title="DPE — Consommation"
                                subtitle="kWh ENp/m²/an"
                                icon={<Flame size={11}/>}
                                labels={DPE_LABELS}
                            />
                            <CompactDiagnostic
                                currentLetter={baseData.ges}
                                title="GES — Émissions"
                                subtitle="kg CO₂/m²/an"
                                icon={<CloudFog size={11}/>}
                                labels={GES_LABELS}
                            />
                        </div>
                    </div>

                    {/* ZONE QR CODES */}
                    <div className="mt-auto">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-[9px] uppercase tracking-[0.3em] font-black" style={{ color: COLORS.primary }}>
                                Accès Interactif
                            </span>
                            <div className="h-px flex-1 bg-zinc-300"/>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <a href={photosUrl} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-[24px] p-4 border border-zinc-200/70 shadow-sm relative overflow-hidden">
                                <span className="opacity-0 absolute text-[1px]">{photosUrl}</span>
                                <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})` }}/>

                                <div className="flex items-center gap-4 pt-1">
                                    <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-100 shrink-0">
                                        {domain && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(photosUrl)}&margin=1&color=8a0e01`} alt="QR Photos" className="w-16 h-16"/>}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <ImageIcon size={10} style={{ color: COLORS.primary }}/>
                                            <span className="text-[8px] uppercase tracking-[0.2em] font-black" style={{ color: COLORS.primary }}>01</span>
                                        </div>
                                        <h3 className="text-sm font-black text-zinc-900 mb-0.5 tracking-tight">Galerie Photos</h3>
                                        <p className="text-[9px] text-zinc-500 font-medium leading-tight">Album HD du bien</p>
                                        <div className="flex items-center gap-1 mt-1.5 text-[9px] font-bold" style={{ color: COLORS.primary }}>
                                            <MousePointerClick size={9}/> Scanner ou cliquer
                                        </div>
                                    </div>
                                </div>
                            </a>

                            <a href={simulationUrl} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-[24px] p-4 border border-zinc-200/70 shadow-sm relative overflow-hidden">
                                <span className="opacity-0 absolute text-[1px]">{simulationUrl}</span>
                                <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})` }}/>

                                <div className="flex items-center gap-4 pt-1">
                                    <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-100 shrink-0">
                                        {domain && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(simulationUrl)}&margin=1&color=8a0e01`} alt="QR Simulation" className="w-16 h-16"/>}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Calculator size={10} style={{ color: COLORS.primary }}/>
                                            <span className="text-[8px] uppercase tracking-[0.2em] font-black" style={{ color: COLORS.primary }}>02</span>
                                        </div>
                                        <h3 className="text-sm font-black text-zinc-900 mb-0.5 tracking-tight">Simulateur de Prêt</h3>
                                        <p className="text-[9px] text-zinc-500 font-medium leading-tight">Mensualité & rentabilité</p>
                                        <div className="flex items-center gap-1 mt-1.5 text-[9px] font-bold" style={{ color: COLORS.primary }}>
                                            <MousePointerClick size={9}/> Scanner ou cliquer
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* FOOTER AGENCE */}
                    <div className="mt-5 pt-4 border-t border-zinc-300 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/logo-patrim.png" className="h-8 object-contain" alt="Patrim"/>
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: COLORS.primary }}>Patrim Immobilier</p>
                                <p className="text-[8px] text-zinc-500 font-medium">Votre expert de la transaction à Toulouse</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ backgroundColor: `${COLORS.secondary}08`, borderColor: `${COLORS.secondary}25` }}>
                            <ArrowUpRight size={10} style={{ color: COLORS.primary }}/>
                            <span className="text-[8px] uppercase tracking-widest font-black" style={{ color: COLORS.primary }}>
                                Document non contractuel
                            </span>
                        </div>
                    </div>

                    {/* Signature bas page */}
                    <div className="absolute bottom-4 left-12 right-12 flex items-center justify-between pointer-events-none">
                        <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-300 font-mono-num">
                            Patrim · {baseData.propertyAddress}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 font-mono-num">
                            02 / 02
                        </span>
                    </div>
                </div>
                </div>

            </div>
        </div>
    );
}