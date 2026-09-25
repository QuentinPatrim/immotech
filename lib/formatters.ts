/**
 * Formateurs partagés pour l'application Nexus.
 * Centralise les fonctions de formatage de devises, pourcentages, etc.
 */

/** Formate un nombre en euros sans décimales : 1234 → "1 234 €" */
export const formatEuro = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

/** Formate un nombre en euros avec décimales : 1234.56 → "1 234,56 €" */
export const formatEuroDecimal = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(v);

/** Formate un pourcentage : 12.345 → "12,35 %" */
export const formatPercent = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 2 }).format(v / 100);

/** Formate un nombre compact en milliers/millions : 150000 → "150k€" */
export const formatCompact = (v: number) =>
  `${Math.round(v / 1000)}k€`;

/** Formate un nombre sans devise : 1234 → "1 234" */
export const formatNumber = (v: number) =>
  // espace insécable classique (l'espace fine U+202F est quasi invisible dans les polices d'affichage)
  new Intl.NumberFormat("fr-FR").format(v).replace(/\u202f/g, "\u00a0");
