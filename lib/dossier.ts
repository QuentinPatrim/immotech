/* ============================================================
   DOSSIERS "MES BIENS" — statuts de suivi & helpers partagés
   (hub /mes-biens + éditeur d'estimation)
   Le statut est stocké dans estimations.data_json (pas de migration).
   ============================================================ */

// --- COLLABORATEURS PATRIM (signataires des avis de valeur) ---
export const PATRIM_AGENTS = [
    { id: "quentin", name: "Quentin Delsol", role: "Service Transaction", signatureUrl: "/signatures/signature-quentin.png" },
    { id: "rebecca", name: "Rebecca Gau", role: "Service Transaction", signatureUrl: "/signatures/signature-rebecca.png" },
    { id: "clement", name: "Clément Monti", role: "Service Transaction", signatureUrl: "/signatures/signature-clement.png" },
    { id: "julien", name: "Julien Passerini", role: "Service Transaction", signatureUrl: "/signatures/signature-julien.png" },
    { id: "sabri", name: "Sabri Abdesselem", role: "Service Transaction", signatureUrl: "/signatures/signature-sabri.png" },
    { id: "catherine", name: "Catherine Leloup", role: "Service Transaction", signatureUrl: "/signatures/signature-catherine.png" },
];

export type DossierStatus = "en_cours" | "remise" | "mandat" | "compromis" | "vendu" | "perdu";

export const DOSSIER_STATUSES: { id: DossierStatus; label: string; short: string; color: string }[] = [
    { id: "en_cours",  label: "Estimation en cours", short: "En cours",   color: "#a1a1aa" },
    { id: "remise",    label: "Avis de valeur remis", short: "Remis",     color: "#60a5fa" },
    { id: "mandat",    label: "Mandat signé",        short: "Mandat",     color: "#d35f52" },
    { id: "compromis", label: "Sous compromis",      short: "Compromis",  color: "#c9a84c" },
    { id: "vendu",     label: "Vendu",               short: "Vendu",      color: "#34d399" },
    { id: "perdu",     label: "Sans suite",          short: "Sans suite", color: "#52525b" },
];

export const statusMeta = (s?: string) =>
    DOSSIER_STATUSES.find(d => d.id === s) ?? DOSSIER_STATUSES[0];

/** Délai (jours) après remise de l'avis de valeur avant de relancer le vendeur. */
export const RELANCE_DELAY_DAYS = 7;

export function daysSince(iso?: string | null) {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return 0;
    return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
}

/** Date de référence pour la relance : dernière relance notée, sinon remise de l'avis. */
export function followUpBase(data: { statusUpdatedAt?: string; lastFollowUpAt?: string } | null | undefined, createdAt?: string) {
    const dates = [data?.lastFollowUpAt, data?.statusUpdatedAt, createdAt].filter(Boolean) as string[];
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

/** Un dossier est à relancer si l'avis est remis (ou la dernière relance faite) depuis ≥ 7 j sans mandat. */
export function needsFollowUp(data: { status?: string; statusUpdatedAt?: string; lastFollowUpAt?: string } | null | undefined, createdAt?: string) {
    if (!data || data.status !== "remise") return false;
    return daysSince(followUpBase(data, createdAt)) >= RELANCE_DELAY_DAYS;
}

export const centralPrice = (low?: number, high?: number) => {
    const l = Number(low) || 0;
    const h = Number(high) || 0;
    if (l && h) return Math.round((l + h) / 2);
    return l || h || 0;
};

/** 67.99 → "67,99" ; 67 → "67" */
export const formatSurface = (v: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(v) || 0).replace(/\u202f/g, "\u00a0");

export const formatEuroShort = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M€`;
    if (v >= 1000) return `${Math.round(v / 1000).toLocaleString("fr-FR")} k€`;
    return `${Math.round(v).toLocaleString("fr-FR")} €`;
};

export function median(values: number[]) {
    const s = values.filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    if (!s.length) return 0;
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** "2022-08-05" → "août 2022" */
export const formatMonthYear = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

/** Pourcentage de complétude d'un dossier d'estimation (pour la liste). */
export function completeness(d: any): { score: number; missing: string[] } {
    const checks: [boolean, string][] = [
        [!!d?.clientName, "client"],
        [!!d?.propertyAddress, "adresse"],
        [Number(d?.surface) > 0, "surface"],
        [!!d?.mainPhoto, "photo"],
        [(d?.soldComparables?.length || 0) + (d?.forSaleComparables?.length || 0) > 0, "comparables"],
        [Number(d?.lowPrice) > 0 && Number(d?.highPrice) > 0, "prix"],
        [!!d?.agentAnalysis, "analyse"],
        [!!d?.agentId, "signataire"],
    ];
    const ok = checks.filter(c => c[0]).length;
    return { score: Math.round((ok / checks.length) * 100), missing: checks.filter(c => !c[0]).map(c => c[1]) };
}
