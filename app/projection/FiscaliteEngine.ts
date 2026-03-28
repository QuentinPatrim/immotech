// ─────────────────────────────────────────────────────────────────────────────
// NEXUS INVEST — MOTEUR FISCAL 2026
// Sources : BOFIP · CGI · LFSS 2026 · Arrêté Banque de France 01/02/2026
// ─────────────────────────────────────────────────────────────────────────────

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(v);

export const fmtK = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(2)}M€`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(0)}k€`
    : `${v}€`;

export const fmtPct = (v: number, decimals = 1) => `${v.toFixed(decimals)} %`;

export const getVal = (v: number | string) =>
  (typeof v === "string" ? parseFloat(v) : v) || 0;

// ─── CONSTANTES FISCALES 2026 ─────────────────────────────────────────────────
/**
 * PFU standard 2026 : 31,4 %
 *   IR  : 12,8 % (inchangé)
 *   PS  : 18,6 % (CSG portée de 9,2 % à 10,6 % via PLFSS 2026)
 *
 * Exception AV : PFU dérogatoire maintenu à 30 %
 *   IR  : 12,8 %
 *   PS  : 17,2 % (préservés pour financer la dette via fonds €)
 *
 * PEA après 5 ans : IR exonéré (0 %) + PS 18,6 % uniquement
 * Livret A 2026   : taux 2,4 %, exonéré IR et PS (arrêté BdF 01/02/2026)
 */
export const F = {
  // PFU standard
  IR_PFU: 0.128,
  PS_STD: 0.186,
  PFU: 0.314,       // = IR_PFU + PS_STD

  // Assurance Vie (exception 2026)
  PS_AV: 0.172,
  PFU_AV: 0.300,    // = 0.128 + 0.172
  AV_IR_LONG: 0.075, // IR réduit après 8 ans

  // Abattements AV
  AV_ABAT_CEL: 4_600,    // Célibataire, annuel, sur les gains
  AV_ABAT_COUPLE: 9_200, // Couple marié/pacsé
  AV_ABAT_SUCC: 152_500, // Succession par bénéficiaire (< 70 ans, Art. 990 I CGI)

  // PEA
  PEA_PLAFOND: 150_000,
  PEAPME_PLAFOND: 225_000,

  // Livret A / LDDS
  LA_TAUX: 0.024,   // 2,4 % au 01/02/2026
  LA_PLAFOND: 22_950,
  LDDS_PLAFOND: 12_000,

  // Succession classique — barème enfants (Art. 777 CGI)
  SUCC_ABAT_ENFANT: 100_000,  // Abattement / enfant
  SUCC_TAUX_ENFANT_MAX: 0.45, // Taux marginal enfant (> 1 805 677 €)
  SUCC_TAUX_TIERS: 0.60,      // Taux tiers (sans lien)
};

// ─── PROFILS DE RISQUE ────────────────────────────────────────────────────────
export const PROFILES = [
  {
    id: "prudent",
    label: "Prudent",
    growth: 3.5,
    divYield: 2.5,
    color: "#3b82f6",
    desc: "Fonds € / Obligations — volatilité minimale",
    detail: "Portefeuille composé majoritairement de fonds en euros et d'obligations. Historique : 3-4%/an. Recommandé proche de la retraite.",
  },
  {
    id: "equilibre",
    label: "Équilibré",
    growth: 6.0,
    divYield: 3.5,
    color: "#10b981",
    desc: "Mix 60% actions / 40% obligations",
    detail: "Portefeuille équilibré type MSCI World 60% + obligations 40%. Historique : 5-7%/an. Recommandé horizon 10 ans+.",
  },
  {
    id: "dynamique",
    label: "Dynamique",
    growth: 8.0,
    divYield: 4.5,
    color: "#f59e0b",
    desc: "Majoritairement actions mondiales",
    detail: "Portefeuille orienté actions type MSCI World 80%+. Historique : 7-9%/an. Accepter une volatilité de -20% lors des crises.",
  },
  {
    id: "offensif",
    label: "Offensif",
    growth: 10.5,
    divYield: 5.5,
    color: "#ef4444",
    desc: "100% actions — MSCI World / S&P 500",
    detail: "100% actions mondiales. Historique long terme : 9-12%/an. Risque de -40% lors des krachs. Horizon minimum 15 ans recommandé.",
  },
] as const;

export type ProfileId = typeof PROFILES[number]["id"];
export type Profile = typeof PROFILES[number];

// ─── BROKERS ─────────────────────────────────────────────────────────────────
export const BROKERS = {
  online: {
    label: "Courtier en ligne",
    fraisEntree: 0,
    fraisAnnuels: 0.006, // 0,6%/an
    detail: "0% frais d'entrée · 0,6%/an gestion · 0€ arbitrage",
  },
  banque: {
    label: "Banque classique",
    fraisEntree: 0.02,   // 2% à l'entrée
    fraisAnnuels: 0.015, // 1,5%/an
    detail: "2% frais d'entrée · 1,5%/an gestion · ~1% arbitrage",
  },
} as const;

export type BrokerType = keyof typeof BROKERS;

// ─── INTERFACES ───────────────────────────────────────────────────────────────
export interface SimParams {
  capital: number;
  dca: number;
  years: number;
  growth: number;       // % annuel brut croissance (hors dividendes)
  divYield: number;     // % annuel rendement dividende
  isDividend: boolean;  // true = stratégie dividende, false = capitalisation
  tmi: number;          // 0 | 11 | 30 | 41 | 45
  brokerType: BrokerType;
}

export interface YearPoint {
  year: number;
  label: string;
  Investi: number;
  PEA: number;
  CTO: number;
  AV: number;
  PER: number;
  LA: number;
}

export interface SuccessionPoint {
  enveloppe: string;
  capital: number;
  abattement: number;
  netTransmis: number;
  regle: string;
  color: string;
}

// ─── MOTEUR PRINCIPAL — calcul mensuel ───────────────────────────────────────
/**
 * Simule l'évolution du capital sur p.years années pour 5 enveloppes :
 * PEA, CTO, Assurance Vie, PER, Livret A.
 *
 * Chaque mois : apport DCA + croissance brute - frais broker - frais gestion
 * En fin d'année : valorisation nette après fiscalité de sortie (pour affichage)
 *
 * La valeur affichée est toujours la valeur NETTE si on sortait ce jour.
 * La capitalisation interne reste brute (pas de frottement fiscal annuel sur PEA/PER).
 */
export function simuler(p: SimParams): YearPoint[] {
  const broker = BROKERS[p.brokerType];
  const gMensuel = p.growth / 100 / 12;
  const divMensuel = p.isDividend ? p.divYield / 100 / 12 : 0;
  const fraisBrokerMensuel = broker.fraisAnnuels / 12;

  // Capital initial après frais d'entrée broker
  const cap0 = p.capital * (1 - broker.fraisEntree);

  // États bruts internes (avant fiscalité de sortie)
  let capPEA = cap0, versePEA = cap0;
  let capCTO = cap0, verseCTO = cap0;
  let capAV  = cap0, verseAV  = cap0;
  let capPER = cap0, versePER = cap0;
  let capLA  = Math.min(cap0, F.LA_PLAFOND);

  const points: YearPoint[] = [];

  for (let y = 0; y <= p.years; y++) {

    // ── Calcul valeur nette à la sortie à l'année y ──────────────────────────

    // PEA : IR exonéré après 5 ans, PS 18,6% sur gains / PFU 31,4% avant
    const gainPEA = Math.max(0, capPEA - versePEA);
    const tauxPEA = y >= 5 ? F.PS_STD : F.PFU;
    const netPEA  = capPEA - gainPEA * tauxPEA;

    // CTO : PFU 31,4% toujours, dividendes taxés en temps réel si stratégie div
    const gainCTO = Math.max(0, capCTO - verseCTO);
    const netCTO  = capCTO - gainCTO * F.PFU;

    // AV : PFU dérogatoire 30% avant 8 ans
    //      Après 8 ans : 7,5% IR sur gains (- abattement 4 600€) + 17,2% PS sur tous les gains
    const gainAV = Math.max(0, capAV - verseAV);
    let netAV: number;
    if (y >= 8) {
      const gainsApreAbat  = Math.max(0, gainAV - F.AV_ABAT_CEL);
      const taxeIR         = gainsApreAbat * F.AV_IR_LONG;
      const taxePS         = gainAV * F.PS_AV; // PS sur la totalité du gain
      netAV = capAV - taxeIR - taxePS;
    } else {
      netAV = capAV - gainAV * F.PFU_AV;
    }

    // PER : déduction TMI à l'entrée (économie réinvestie 50%)
    //       Sortie : capital reconstitué taxé à la TMI + PV taxées au PFU 31,4%
    const gainPER = Math.max(0, capPER - versePER);
    const economieEntree = versePER * (p.tmi / 100) * 0.35;
    const netPER = Math.max(0,
      gainPER * (1 - F.PFU) +           // plus-values nettes PFU
      versePER * (1 - p.tmi / 100) +     // capital récupéré net TMI
      economieEntree                      // bonus économie fiscale entrée
    );

    // Livret A : exonéré, taux fixe garanti
    const netLA = capLA;

    const investi = Math.round(p.capital + p.dca * 12 * y);

    points.push({
      year: y,
      label: y === 0 ? "Départ" : `An ${y}`,
      Investi: investi,
      PEA: Math.round(Math.max(0, netPEA)),
      CTO: Math.round(Math.max(0, netCTO)),
      AV:  Math.round(Math.max(0, netAV)),
      PER: Math.round(Math.max(0, netPER)),
      LA:  Math.round(Math.max(0, netLA)),
    });

    if (y >= p.years) break;

    // ── Capitalisation mensuelle ─────────────────────────────────────────────
    for (let m = 0; m < 12; m++) {
      const apport = p.dca * (1 - broker.fraisEntree);

      // PEA : réinvestissement total, aucun frottement fiscal en cours de vie
      capPEA   = capPEA * (1 + gMensuel + divMensuel - fraisBrokerMensuel) + apport;
      versePEA += apport;

      // CTO : dividendes taxés au PFU 31,4% en temps réel (si stratégie dividende)
      if (p.isDividend) {
        const divNetMensuel = divMensuel * (1 - F.PFU);
        capCTO = capCTO * (1 + gMensuel + divNetMensuel - fraisBrokerMensuel) + apport;
      } else {
        capCTO = capCTO * (1 + gMensuel - fraisBrokerMensuel) + apport;
      }
      verseCTO += apport;

      // AV : frais gestion assureur (0,7%/an) en plus du broker
      const fraisAVMensuel = 0.007 / 12 + fraisBrokerMensuel;
      capAV  = capAV * (1 + gMensuel + divMensuel - fraisAVMensuel) + apport;
      verseAV += apport;

      // PER : frais gestion assureur (0,7%/an) + économie fiscale TMI réinvestie à 50%
      const fraisPERMensuel = 0.007 / 12 + fraisBrokerMensuel;
      const ecoMensuelle    = p.dca * (p.tmi / 100) / 12 * 0.5;
      capPER   = capPER * (1 + gMensuel + divMensuel - fraisPERMensuel) + apport + ecoMensuelle;
      versePER += apport;

      // Livret A : taux fixe 2,4%/an, plafonné à 22 950€
      capLA = Math.min(capLA * (1 + F.LA_TAUX / 12) + apport, F.LA_PLAFOND);
    }
  }

  return points;
}

// ─── CALCUL SUCCESSION ────────────────────────────────────────────────────────
export function calculerSuccession(last: YearPoint): SuccessionPoint[] {
  return [
    {
      enveloppe: "PEA",
      capital: last.PEA,
      abattement: F.SUCC_ABAT_ENFANT,
      netTransmis: Math.max(0, last.PEA - F.SUCC_ABAT_ENFANT),
      regle: "Succession classique. PS 18,6% sur gains au décès. IR effacé. Droits succession jusqu'à 45% au-delà de l'abattement 100k€/enfant.",
      color: "#10b981",
    },
    {
      enveloppe: "CTO",
      capital: last.CTO,
      abattement: F.SUCC_ABAT_ENFANT,
      netTransmis: Math.max(0, last.CTO - F.SUCC_ABAT_ENFANT),
      regle: "Purge des plus-values au décès (IR effacé, PS 18,6% dus). Actif successoral. Abattement 100k€/enfant.",
      color: "#f59e0b",
    },
    {
      enveloppe: "Assurance Vie",
      capital: last.AV,
      abattement: F.AV_ABAT_SUCC,
      netTransmis: Math.max(0, last.AV - F.AV_ABAT_SUCC),
      regle: "Art. 990 I CGI : 152 500€/bénéficiaire hors succession (primes < 70 ans). Au-delà : 20% jusqu'à 1 005 000€, puis 31,25%. Champion successoral.",
      color: "#ec4899",
    },
    {
      enveloppe: "PER",
      capital: last.PER,
      abattement: F.AV_ABAT_SUCC,
      netTransmis: Math.max(0, last.PER - F.AV_ABAT_SUCC),
      regle: "Si décès avant 70 ans : même régime AV (152 500€/bénéf. hors succession). Après 70 ans : abattement global 30 500€, intégration successorale. PER assurantiel uniquement.",
      color: "#6366f1",
    },
    {
      enveloppe: "Livret A",
      capital: last.LA,
      abattement: F.SUCC_ABAT_ENFANT,
      netTransmis: Math.max(0, last.LA - F.SUCC_ABAT_ENFANT),
      regle: "Succession classique. Intégré à l'actif successoral.",
      color: "#3b82f6",
    },
  ];
}

// ─── CALCULS DÉRIVÉS ──────────────────────────────────────────────────────────
export function getBestEnvKey(last: YearPoint | undefined): keyof Omit<YearPoint, "year" | "label" | "Investi"> {
  if (!last) return "PEA";
  const keys = ["PEA", "CTO", "AV", "PER", "LA"] as const;
  return keys.reduce((best, k) => ((last[k] || 0) > (last[best] || 0) ? k : best), "PEA" as typeof keys[number]);
}

export function getFireYear(points: YearPoint[], fireTarget: number, envKey: string): number | null {
  if (fireTarget <= 0) return null;
  const found = points.find(p => ((p as any)[envKey] || 0) >= fireTarget);
  return found ? found.year : null;
}

export function comparerFrais(params: SimParams): { online: YearPoint; banque: YearPoint } {
  const paramsOnline = { ...params, brokerType: "online" as BrokerType };
  const paramsBanque = { ...params, brokerType: "banque" as BrokerType };
  const resultsOnline = simuler(paramsOnline);
  const resultsBanque = simuler(paramsBanque);
  return {
    online: resultsOnline[resultsOnline.length - 1],
    banque: resultsBanque[resultsBanque.length - 1],
  };
}

// ─── CALCULS FISCAUX DÉTAILLÉS (pour le tab Fiscalité) ───────────────────────
export interface DetailFiscal {
  id: string;
  label: string;
  color: string;
  rows: { label: string; value: string; type: "neutral" | "positive" | "negative" | "bold" }[];
  note: string;
}

export function getDetailsFiscaux(tmi: number): DetailFiscal[] {
  const exemple = { capital: 10000, gains: 5000, retrait: 15000 };

  return [
    {
      id: "CTO", label: "CTO — La Liberté Absolue", color: "#f59e0b",
      rows: [
        { label: "Retrait total", value: fmt(exemple.retrait), type: "neutral" },
        { label: "Base taxable (gains)", value: fmt(exemple.gains), type: "neutral" },
        { label: `IR (${F.IR_PFU * 100}%)`, value: `– ${fmt(exemple.gains * F.IR_PFU)}`, type: "negative" },
        { label: `PS (${F.PS_STD * 100}%)`, value: `– ${fmt(exemple.gains * F.PS_STD)}`, type: "negative" },
        { label: "Total prélevé (PFU 31,4%)", value: fmt(exemple.gains * F.PFU), type: "bold" },
        { label: "Capital net récupéré", value: fmt(exemple.retrait - exemple.gains * F.PFU), type: "positive" },
      ],
      note: "Même taux le premier jour et 30 ans plus tard. Dividendes taxés chaque année si stratégie dividende — brise l'effet boule de neige.",
    },
    {
      id: "PEA", label: "PEA — Le Bouclier Européen (après 5 ans)", color: "#10b981",
      rows: [
        { label: "Retrait total", value: fmt(exemple.retrait), type: "neutral" },
        { label: "Base taxable (gains)", value: fmt(exemple.gains), type: "neutral" },
        { label: "IR (0% — exonéré)", value: "0 €", type: "positive" },
        { label: `PS (${F.PS_STD * 100}%)`, value: `– ${fmt(exemple.gains * F.PS_STD)}`, type: "negative" },
        { label: `Total prélevé (${F.PS_STD * 100}% PS seuls)`, value: fmt(exemple.gains * F.PS_STD), type: "bold" },
        { label: "Capital net récupéré", value: fmt(exemple.retrait - exemple.gains * F.PS_STD), type: "positive" },
      ],
      note: `Économie de ${fmt(exemple.gains * F.IR_PFU)} d'IR vs CTO sur ces 5 000€ de gains. Sur un portefeuille de 150k€, l'impact est colossal.`,
    },
    {
      id: "AV", label: "Assurance Vie — Après 8 ans (célibataire)", color: "#ec4899",
      rows: [
        { label: "Gains totaux", value: fmt(exemple.gains), type: "neutral" },
        { label: "Abattement annuel", value: `– ${fmt(F.AV_ABAT_CEL)}`, type: "positive" },
        { label: `Base IR (${F.AV_IR_LONG * 100}% sur ${fmt(exemple.gains - F.AV_ABAT_CEL)})`, value: `– ${fmt((exemple.gains - F.AV_ABAT_CEL) * F.AV_IR_LONG)}`, type: "negative" },
        { label: `PS (${F.PS_AV * 100}% sur totalité gains)`, value: `– ${fmt(exemple.gains * F.PS_AV)}`, type: "negative" },
        { label: "Total prélevé", value: fmt((exemple.gains - F.AV_ABAT_CEL) * F.AV_IR_LONG + exemple.gains * F.PS_AV), type: "bold" },
        { label: "Capital net récupéré", value: fmt(exemple.retrait - ((exemple.gains - F.AV_ABAT_CEL) * F.AV_IR_LONG + exemple.gains * F.PS_AV)), type: "positive" },
      ],
      note: "PS AV préservés à 17,2% (exception 2026). L'abattement annuel de 4 600€ permet un retrait quasi-exonéré d'IR sur les petits gains.",
    },
    {
      id: "PER", label: `PER — TMI ${tmi}% (à l'entrée et à la sortie)`, color: "#6366f1",
      rows: [
        { label: "Versement initial", value: fmt(exemple.capital), type: "neutral" },
        { label: `Économie fiscale entrée (TMI ${tmi}%)`, value: `+ ${fmt(exemple.capital * tmi / 100)}`, type: "positive" },
        { label: "Effort réel d'épargne net", value: fmt(exemple.capital * (1 - tmi / 100)), type: "bold" },
        { label: `Taxation capital sortie (TMI ${tmi}%)`, value: `– ${fmt(exemple.capital * tmi / 100)}`, type: "negative" },
        { label: "Taxation PV (PFU 31,4%)", value: `– ${fmt(exemple.gains * F.PFU)}`, type: "negative" },
        { label: "Capital net récupéré", value: fmt(exemple.capital + exemple.gains - exemple.capital * tmi / 100 - exemple.gains * F.PFU), type: "positive" },
      ],
      note: tmi >= 30
        ? `À TMI ${tmi}% : le PER est très avantageux. Vous avez fait fructifier l'argent de l'État pendant des années.`
        : `À TMI ${tmi}% : l'avantage PER est limité. Préférez le PEA ou l'AV pour cette tranche.`,
    },
  ];
}