"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, User, Building2, Crown, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, ChevronRight, ChevronDown, Info, Lightbulb,
  ArrowRight, Sparkles, Shield, BarChart3, Landmark, Home, BookOpen,
  Calculator, FileText, Star, Zap, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================
// DONNÉES FISCALES 2026 — À JOUR MARS 2026
// ============================================================

// Barème IR 2026 (revenus 2025, revalorisation +0.9%)
const TRANCHES_IR_2026 = [
  { max: 11497, rate: 0 },
  { max: 29315, rate: 0.11 },
  { max: 83824, rate: 0.30 },
  { max: 180294, rate: 0.41 },
  { max: Infinity, rate: 0.45 },
];

// Prélèvements sociaux 2026
const PS_LMNP_2026 = 0.186;   // ⬆️ +1.4pt depuis la LFSS 2026 (était 17.2%)
const PS_FONCIER_2026 = 0.172; // Revenus fonciers (location nue, inchangé)
const PS_PV_2026 = 0.186;      // Plus-value LMNP (nouvelle hausse 2026)

// Abattements Micro-BIC 2026
const MICRO_BIC_ABATTEMENTS = {
  LMNP_LONGUE:    { abattement: 0.50, plafond: 77700 },
  LMNP_CLASSE:    { abattement: 0.50, plafond: 77700 },
  LCD_NON_CLASSE: { abattement: 0.30, plafond: 15000 }, // ⬇️ Durcissement loi Le Meur 2024-2026
  LCD_CLASSE:     { abattement: 0.50, plafond: 77700 },
};

// Abattement Micro-Foncier 2026 (location nue)
const MICRO_FONCIER = { abattement: 0.30, plafond: 15000 };

// IS 2026 (inchangé)
const IS_TAUX_REDUIT = 0.15;    // ≤ 42 500€ de bénéfice
const IS_TAUX_NORMAL = 0.25;    // > 42 500€
const IS_SEUIL_REDUIT = 42500;
const FLAT_TAX = 0.30;          // PFU sur dividendes SCI IS

// Amortissement LMNP réel
const AMO_BATI_DUREE = 30;      // ans
const AMO_MOBILIER_DUREE = 7;
const AMO_TRAVAUX_DUREE = 15;
const AMO_FRAIS_DUREE = 25;
const PART_BATI = 0.85;         // 85% du prix = bâti (hors terrain)

// Plus-value immobilière — barème 2026 (inchangé)
const PV_ABATTEMENT_IR = (years: number) => {
  if (years <= 5) return 0;
  if (years <= 21) return (years - 5) * 0.06;
  if (years === 22) return 0.96;
  return 1.0; // exonéré IR après 22 ans
};
const PV_ABATTEMENT_PS = (years: number) => {
  if (years <= 5) return 0;
  if (years <= 21) return (years - 5) * 0.0165;
  if (years <= 22) return 0.2640 + (years - 22) * 0.09;
  if (years <= 30) return 0.2640 + (years - 22) * 0.09; // 1.6% => 9% entre 22-30ans
  return 1.0; // exonéré PS après 30 ans
};

// ============================================================
// FONCTIONS DE CALCUL
// ============================================================

function calcIR(revenuImposable: number, tmiBracket: number): number {
  // Calcul simplifié sur la tranche marginale
  return Math.max(0, revenuImposable * (tmiBracket / 100));
}

function calcIS(benefice: number): number {
  if (benefice <= 0) return 0;
  if (benefice <= IS_SEUIL_REDUIT) return benefice * IS_TAUX_REDUIT;
  return IS_SEUIL_REDUIT * IS_TAUX_REDUIT + (benefice - IS_SEUIL_REDUIT) * IS_TAUX_NORMAL;
}

function calcAmortissement(price: number, works: number, notaryFees: number): number {
  const bati = price * PART_BATI;
  return (bati / AMO_BATI_DUREE) + (works / AMO_TRAVAUX_DUREE) + (5000 / AMO_MOBILIER_DUREE) + (notaryFees / AMO_FRAIS_DUREE);
}

function calcIFI(val: number): number {
  const tranches = [
    { min: 800000,    max: 1300000,   rate: 0.005  },
    { min: 1300000,   max: 2570000,   rate: 0.007  },
    { min: 2570000,   max: 5000000,   rate: 0.01   },
    { min: 5000000,   max: 10000000,  rate: 0.0125 },
    { min: 10000000,  max: Infinity,  rate: 0.015  },
  ];
  if (val <= 800000) return 0;
  return tranches.reduce((tax, t) => {
    if (val <= t.min) return tax;
    return tax + (Math.min(val, t.max) - t.min) * t.rate;
  }, 0);
}

// ============================================================
// TYPES
// ============================================================

type Structure = "NOM_PROPRE" | "SCI_IR" | "SCI_IS" | "SARL_FAMILLE";
type RegimeLoc = "LMNP_MICRO" | "LMNP_REEL" | "NUE_MICRO" | "NUE_REEL" | "LCD_NON_CLASSE" | "LCD_CLASSE";
type Strategie = "LONGUE_DUREE" | "SAISONNIERE" | "COLOCATION" | "RESIDENT_PRINCIPALE";

interface FiscalResult {
  label: string;
  regime: string;
  impotAnnuel: number;
  psAnnuel: number;
  totalFiscalAnnuel: number;
  cashflowNetMois: number;
  baseImposable: number;
  details: string[];
  avantages: string[];
  inconvenients: string[];
  score: number; // 0-100
  tag?: "OPTIMAL" | "SIMPLE" | "RISQUE" | "COMPLEXE";
}

interface FiscaliteEngineProps {
  // Données du simulateur parent
  price: number;
  works: number;
  notaryFees: number;
  rent: number;         // mensuel
  charges: number;      // mensuel
  tax: number;          // annuel
  monthlyPayment: number;
  duration: number;
  yearOneInterest: number;
  totalCost: number;
  projectType: "LOC" | "RP" | "RS";
  // helper
  formatEuro: (val: number) => string;
  HelpTooltip: React.ComponentType<{ text: string; title?: string }>;
}

// ============================================================
// COMPOSANTS UI INTERNES
// ============================================================

const Badge = ({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) => {
  const colors: Record<string, string> = {
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    red: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    zinc: "bg-zinc-800 text-zinc-400 border-zinc-700",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
};

const ScoreBar = ({ score, label }: { score: number; label: string }) => {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-black ${score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400"}`}>{score}/100</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
};

const Accordion = ({ title, icon: Icon, children, defaultOpen = false, color = "indigo" }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; color?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const colors: Record<string, string> = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${colors[color]}`}>
            <Icon size={16} />
          </div>
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        <ChevronDown size={16} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 md:px-5 md:pb-5 border-t border-white/5 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// MOTEUR FISCAL PRINCIPAL
// ============================================================

export default function FiscaliteEngine({
  price, works, notaryFees, rent, charges, tax,
  monthlyPayment, duration, yearOneInterest, totalCost,
  projectType, formatEuro, HelpTooltip
}: FiscaliteEngineProps) {

  // Step 0: Profil utilisateur
  const [tmiBracket, setTmiBracket] = useState(30);
  const [structure, setStructure] = useState<Structure>("NOM_PROPRE");
  const [strategie, setStrategie] = useState<Strategie>("LONGUE_DUREE");
  const [patrimGlobal, setPatrimGlobal] = useState<"SIMPLE" | "MULTI">("SIMPLE");
  const [objectif, setObjectif] = useState<"CASHFLOW" | "TRANSMISSION" | "DEFISCALISATION">("CASHFLOW");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // États RP/RS (hooks toujours appelés au niveau racine)
  const [rpTab, setRpTab] = useState<"PLUS_VALUE" | "TRANSMISSION" | "IFI">("PLUS_VALUE");
  const [resalePriceRP, setResalePriceRP] = useState(Math.round(price * 1.4));
  const [holdingYears, setHoldingYears] = useState(10);
  const [nbEnfants, setNbEnfants] = useState(2);
  const [patrimTotalImmo, setPatrimTotalImmo] = useState(price);
  const [dettesImmo, setDettesImmo] = useState(Math.round(price * 0.7));

  // Données calculées
  const annualRent = rent * 12;
  const annualCharges = (charges * 12) + tax;
  const annualCredit = monthlyPayment * 12;
  const cfBrutMensuel = (annualRent - annualCharges - annualCredit) / 12;
  const amortissement = calcAmortissement(price, works, notaryFees);

  // ── CALCUL DE TOUS LES RÉGIMES ──────────────────────────────

  const results = useMemo((): FiscalResult[] => {
    if (projectType !== "LOC") return [];

    // Shorthand
    const isLCD = strategie === "SAISONNIERE";
    const R = annualRent;
    const C = annualCharges;
    const I = yearOneInterest;
    const A = amortissement;

    // ─── 1. NOM PROPRE — LMNP MICRO-BIC ─────────────────────
    const microBicAbatt = isLCD ? 0.30 : 0.50;
    const microBicBase = Math.max(0, R * (1 - microBicAbatt));
    const microBicIR = calcIR(microBicBase, tmiBracket);
    const microBicPS = microBicBase * PS_LMNP_2026;
    const microBicTotal = microBicIR + microBicPS;
    const microBicCF = cfBrutMensuel - (microBicTotal / 12);

    const lmnpMicro: FiscalResult = {
      label: "Nom propre — LMNP Micro-BIC",
      regime: isLCD ? "Micro-BIC 30% (location saisonnière non classée)" : "Micro-BIC 50%",
      impotAnnuel: microBicIR,
      psAnnuel: microBicPS,
      totalFiscalAnnuel: microBicTotal,
      cashflowNetMois: microBicCF,
      baseImposable: microBicBase,
      details: [
        `Loyer annuel : ${formatEuro(R)}`,
        `Abattement forfaitaire : ${(microBicAbatt * 100).toFixed(0)}% → -${formatEuro(R * microBicAbatt)}`,
        `Base imposable : ${formatEuro(microBicBase)}`,
        `IR (TMI ${tmiBracket}%) : ${formatEuro(microBicIR)}`,
        `Prélèvements sociaux (18,6%*) : ${formatEuro(microBicPS)}`,
        `* Nouveau taux 2026 (LFSS 2026, +1,4pt)`,
      ],
      avantages: [
        "Simplicité maximale — aucune comptabilité",
        "Pas besoin d'expert-comptable",
        "Idéal si charges réelles < abattement forfaitaire",
      ],
      inconvenients: [
        isLCD ? "Abattement réduit à 30% (loi Le Meur 2024) — saisonnière non classée" : "",
        "Pas de déduction des charges réelles ni des intérêts",
        "Pas d'amortissement",
        "Désavantageux si charges élevées",
      ].filter(Boolean),
      score: (microBicTotal < (R * 0.15)) ? 75 : 55,
      tag: "SIMPLE",
    };

    // ─── 2. NOM PROPRE — LMNP RÉEL ──────────────────────────
    const reelResultat = R - C - I - A;
    const reelBase = Math.max(0, reelResultat);
    const reelIR = calcIR(reelBase, tmiBracket);
    const reelPS = reelBase * PS_LMNP_2026;
    const reelTotal = reelIR + reelPS;
    const reelCF = cfBrutMensuel - (reelTotal / 12);
    const isDeficitaire = reelResultat < 0;

    const lmnpReel: FiscalResult = {
      label: "Nom propre — LMNP Réel",
      regime: "Réel simplifié (BIC)",
      impotAnnuel: reelIR,
      psAnnuel: reelPS,
      totalFiscalAnnuel: reelTotal,
      cashflowNetMois: reelCF,
      baseImposable: reelBase,
      details: [
        `Loyer annuel : ${formatEuro(R)}`,
        `- Charges réelles : -${formatEuro(C)}`,
        `- Intérêts d'emprunt (an 1) : -${formatEuro(Math.round(I))}`,
        `- Amortissement comptable : -${formatEuro(Math.round(A))}`,
        `Résultat comptable : ${formatEuro(Math.round(reelResultat))}`,
        isDeficitaire ? `⚠️ Déficit LMNP → reporté sur BIC futurs (10 ans max)` : `Base imposable : ${formatEuro(reelBase)}`,
        `IR (TMI ${tmiBracket}%) : ${formatEuro(reelIR)}`,
        `Prélèvements sociaux (18,6%*) : ${formatEuro(reelPS)}`,
        `* Nouveau taux 2026 (LFSS 2026)`,
        `⚠️ À la revente : amortissements réintégrés dans la plus-value (réforme 2025)`,
      ],
      avantages: [
        "Amortissement = outil puissant pour neutraliser l'impôt",
        isDeficitaire ? "Résultat déficitaire = 0€ d'impôt sur vos loyers" : "Impôt fortement réduit grâce à l'amortissement",
        "Intérêts 100% déductibles",
        "Toutes les charges réelles déductibles (assurance, gestion, CFE...)",
      ],
      inconvenients: [
        "Comptabilité obligatoire (expert-comptable ~600-900€/an)",
        "Amortissements réintégrés à la revente depuis 2025 → plus-value alourdie",
        "Déficit non imputable sur revenu global (contrairement à la location nue)",
      ],
      score: reelTotal === 0 ? 95 : reelTotal < microBicTotal ? 85 : 65,
      tag: reelTotal === 0 ? "OPTIMAL" : "OPTIMAL",
    };

    // ─── 3. NOM PROPRE — LOCATION NUE MICRO-FONCIER ─────────
    const nueMicroBase = Math.max(0, R * 0.70); // abattement 30%
    const nueMicroIR = calcIR(nueMicroBase, tmiBracket);
    const nueMicroPS = nueMicroBase * PS_FONCIER_2026;
    const nueMicroTotal = nueMicroIR + nueMicroPS;
    const nueMicroCF = cfBrutMensuel - (nueMicroTotal / 12);

    const nueLocMicro: FiscalResult = {
      label: "Nom propre — Location nue Micro-foncier",
      regime: "Micro-foncier (plafond 15 000€)",
      impotAnnuel: nueMicroIR,
      psAnnuel: nueMicroPS,
      totalFiscalAnnuel: nueMicroTotal,
      cashflowNetMois: nueMicroCF,
      baseImposable: nueMicroBase,
      details: [
        `Loyer annuel : ${formatEuro(R)}`,
        `Abattement forfaitaire : 30% → -${formatEuro(R * 0.30)}`,
        `Base imposable : ${formatEuro(nueMicroBase)}`,
        `IR (TMI ${tmiBracket}%) : ${formatEuro(nueMicroIR)}`,
        `Prélèvements sociaux (17,2%) : ${formatEuro(nueMicroPS)}`,
        `Plafond micro-foncier : 15 000€/an`,
      ],
      avantages: [
        "Bail 3 ans (vs 1 an meublé) — davantage de stabilité locative",
        "Simplicité fiscale",
        "Exonération plus-value classique (22 ans IR / 30 ans PS)",
        "Déficit foncier imputable sur revenu global jusqu'à 10 700€",
      ],
      inconvenients: [
        "Loyers inférieurs (-10 à -20% vs meublé)",
        "Pas d'amortissement",
        "Abattement limité à 30% (moins avantageux que LMNP 50%)",
        "Non éligible si loyers > 15 000€/an",
      ],
      score: nueMicroTotal > lmnpReel.totalFiscalAnnuel ? 45 : 60,
      tag: "SIMPLE",
    };

    // ─── 4. NOM PROPRE — LOCATION NUE RÉEL FONCIER ──────────
    const nueReelBase = Math.max(0, R - C - I);
    const nueReelIR = calcIR(nueReelBase, tmiBracket);
    const nueReelPS = nueReelBase * PS_FONCIER_2026;
    const nueReelTotal = nueReelIR + nueReelPS;
    const nueReelCF = cfBrutMensuel - (nueReelTotal / 12);
    const deficitFoncier = Math.max(0, -(R - C - I));

    const nueLocReel: FiscalResult = {
      label: "Nom propre — Location nue Réel foncier",
      regime: "Réel foncier",
      impotAnnuel: nueReelIR,
      psAnnuel: nueReelPS,
      totalFiscalAnnuel: nueReelTotal,
      cashflowNetMois: nueReelCF,
      baseImposable: nueReelBase,
      details: [
        `Loyer annuel : ${formatEuro(R)}`,
        `- Charges réelles : -${formatEuro(C)}`,
        `- Intérêts d'emprunt : -${formatEuro(Math.round(I))}`,
        `Résultat foncier : ${formatEuro(Math.round(R - C - I))}`,
        deficitFoncier > 0 ? `✅ Déficit foncier : ${formatEuro(deficitFoncier)} — imputable sur revenu global (max 10 700€)` : `Base imposable : ${formatEuro(nueReelBase)}`,
        `IR (TMI ${tmiBracket}%) : ${formatEuro(nueReelIR)}`,
        `Prélèvements sociaux (17,2%) : ${formatEuro(nueReelPS)}`,
      ],
      avantages: [
        deficitFoncier > 0 ? `Déficit foncier imputable sur revenu global → économie d'impôt réelle` : "",
        "Pas d'amortissement à réintégrer à la revente",
        "Exonération plus-value favorable (22/30 ans)",
        "Idéal en début de crédit (beaucoup d'intérêts)",
      ].filter(Boolean),
      inconvenients: [
        "Pas d'amortissement (contrairement au LMNP)",
        "Loyers nus inférieurs au meublé",
        "Moins efficace en phase tardive du crédit (moins d'intérêts)",
      ],
      score: deficitFoncier > 0 ? 72 : 55,
      tag: deficitFoncier > 0 ? "OPTIMAL" : undefined,
    };

    // ─── 5. SCI À L'IS ──────────────────────────────────────
    const sciIsBase = Math.max(0, R - C - I - A); // Amortissement garanti, non plafonné
    const sciIsImpot = calcIS(sciIsBase);
    // Dividendes soumis à flat tax si distribués
    const beneficeApresFiscSCI = Math.max(0, R - C - I - A - sciIsImpot);
    const dividendesFlatTax = beneficeApresFiscSCI * FLAT_TAX;
    const sciIsTotal_sans_distrib = sciIsImpot; // si on garde en trésorerie
    const sciIsTotal_avec_distrib = sciIsImpot + dividendesFlatTax;
    const sciIsCF = cfBrutMensuel - (sciIsTotal_sans_distrib / 12);

    const sciIS: FiscalResult = {
      label: "SCI à l'IS",
      regime: "Impôt sur les Sociétés (15% / 25%)",
      impotAnnuel: sciIsImpot,
      psAnnuel: 0,
      totalFiscalAnnuel: sciIsTotal_sans_distrib,
      cashflowNetMois: sciIsCF,
      baseImposable: sciIsBase,
      details: [
        `Loyer annuel : ${formatEuro(R)}`,
        `- Charges : -${formatEuro(C)}`,
        `- Intérêts : -${formatEuro(Math.round(I))}`,
        `- Amortissement (non plafonné) : -${formatEuro(Math.round(A))}`,
        `Bénéfice imposable IS : ${formatEuro(Math.max(0, sciIsBase))}`,
        `IS (15% ≤42 500€ / 25% au-delà) : ${formatEuro(sciIsImpot)}`,
        `⚠️ Si distribution dividendes : Flat Tax 30% supplémentaire`,
        `⚠️ Plus-value à la revente : taxation IS + Flat Tax (coûteux)`,
        `✅ Si réinvestissement : IS seul — optimisation possible`,
        `✅ Transmission facilitée via cession de parts sociales`,
      ],
      avantages: [
        "Amortissement garanti — non plafonné (contrairement au LMNP depuis 2025)",
        "IS 15% très attractif sur les premiers 42 500€ de bénéfice",
        "Si bénéfices réinvestis : pas de flat tax",
        "Transmission facilitée : cession de parts, démembrement",
        "Idéal pour les gros patrimoines ou TMI élevé (41-45%)",
      ],
      inconvenients: [
        "Double imposition à la sortie (IS + Flat tax 30% sur dividendes)",
        "Plus-value calculée sur prix de revente - valeur nette comptable → très coûteuse à la revente",
        "Comptabilité obligatoire et stricte",
        "Création SCI : coût notaire + frais annuels (~1 000-2 000€)",
        "Option IS irrévocable",
        "Flux de trésorerie bloqués si pas de distribution",
      ],
      score: (tmiBracket >= 41 && patrimGlobal === "MULTI") ? 80 : 65,
      tag: (tmiBracket >= 41 && patrimGlobal === "MULTI") ? "OPTIMAL" : "COMPLEXE",
    };

    // ─── 6. SCI À L'IR ──────────────────────────────────────
    const sciIrBase = Math.max(0, R - C - I); // Revenus fonciers, pas d'amortissement
    const sciIrIR = calcIR(sciIrBase, tmiBracket);
    const sciIrPS = sciIrBase * PS_FONCIER_2026;
    const sciIrTotal = sciIrIR + sciIrPS;
    const sciIrCF = cfBrutMensuel - (sciIrTotal / 12);

    const sciIR: FiscalResult = {
      label: "SCI à l'IR",
      regime: "Impôt sur le revenu (revenus fonciers)",
      impotAnnuel: sciIrIR,
      psAnnuel: sciIrPS,
      totalFiscalAnnuel: sciIrTotal,
      cashflowNetMois: sciIrCF,
      baseImposable: sciIrBase,
      details: [
        `Loyer annuel : ${formatEuro(R)}`,
        `- Charges : -${formatEuro(C)}`,
        `- Intérêts : -${formatEuro(Math.round(I))}`,
        `Base imposable (revenus fonciers) : ${formatEuro(sciIrBase)}`,
        `IR (TMI ${tmiBracket}%) : ${formatEuro(sciIrIR)}`,
        `Prélèvements sociaux (17,2%) : ${formatEuro(sciIrPS)}`,
        `⚠️ Pas d'amortissement en SCI à l'IR`,
        `✅ Plus-value : régime particuliers (exonération 22/30 ans)`,
      ],
      avantages: [
        "Souplesse de gestion et transmission",
        "Plus-value favorable (régime des particuliers — 22 ans IR / 30 ans PS)",
        "Déficit foncier imputable sur revenu global (max 10 700€)",
        "Pas d'IS — imposition directe des associés",
        "Idéale pour transmission familiale (donation de parts)",
      ],
      inconvenients: [
        "Pas d'amortissement (contrairement à SCI IS ou LMNP)",
        "Revenus s'ajoutent aux revenus personnels des associés",
        "Peu avantageuse si TMI élevé",
        "Formalisme juridique annuel (AG, comptes, etc.)",
      ],
      score: (patrimGlobal === "MULTI" && objectif === "TRANSMISSION") ? 78 : 58,
      tag: (objectif === "TRANSMISSION") ? "OPTIMAL" : undefined,
    };

    // ─── 7. SARL DE FAMILLE (MEUBLÉ) ─────────────────────────
    const sarlBase = Math.max(0, R - C - I - A);
    const sarlImpot = calcIR(sarlBase, tmiBracket); // transparence fiscale IR
    const sarlPS = sarlBase * PS_LMNP_2026;
    const sarlTotal = sarlImpot + sarlPS;
    const sarlCF = cfBrutMensuel - (sarlTotal / 12);

    const sarlFamille: FiscalResult = {
      label: "SARL de famille",
      regime: "Transparence fiscale (IR) — BIC",
      impotAnnuel: sarlImpot,
      psAnnuel: sarlPS,
      totalFiscalAnnuel: sarlTotal,
      cashflowNetMois: sarlCF,
      baseImposable: sarlBase,
      details: [
        `Même fiscalité que LMNP Réel (BIC IR)`,
        `Amortissement comptable : ${formatEuro(Math.round(A))}`,
        `Base imposable : ${formatEuro(sarlBase)}`,
        `IR (TMI ${tmiBracket}%) : ${formatEuro(sarlImpot)}`,
        `Prélèvements sociaux (18,6%) : ${formatEuro(sarlPS)}`,
        `Idéal pour investir à plusieurs entre membres d'une famille`,
      ],
      avantages: [
        "Amortissement comme en LMNP réel",
        "Investir à plusieurs dans le meublé (LMNP interdit en société par défaut)",
        "Transmission simplifiée des parts",
        "Responsabilité limitée",
      ],
      inconvenients: [
        "Réservée aux membres d'une même famille (ascendants/descendants/conjoints)",
        "Formalisme de création et annuel (comptabilité, AG)",
        "Amortissements réintégrés à la revente (comme LMNP réel)",
      ],
      score: 75,
      tag: "COMPLEXE",
    };

    return [lmnpReel, lmnpMicro, nueLocReel, nueLocMicro, sciIS, sciIR, sarlFamille]
      .sort((a, b) => b.score - a.score);
  }, [
    tmiBracket, structure, strategie, patrimGlobal, objectif,
    annualRent, annualCharges, annualCredit, yearOneInterest,
    amortissement, cfBrutMensuel, projectType, price, works, notaryFees
  ]);

  const bestResult = results[0];
  const economieVsWorst = results.length > 1
    ? results[results.length - 1].totalFiscalAnnuel - (bestResult?.totalFiscalAnnuel || 0)
    : 0;

  // ── CONSEILS PERSONNALISÉS ────────────────────────────────
  const conseils = useMemo(() => {
    const tips: { icon: any; title: string; text: string; color: string; priority: "HIGH" | "MEDIUM" | "LOW" }[] = [];

    // Conseil selon TMI
    if (tmiBracket >= 41) {
      tips.push({
        icon: TrendingDown,
        title: "Votre TMI élevé (41-45%) appelle une optimisation maximale",
        text: "À votre niveau d'imposition, chaque euro de base imposable génère plus de 0,60€ d'impôt (TMI + PS). La SCI à l'IS ou le LMNP réel avec amortissement sont les outils clés pour neutraliser cette charge fiscale.",
        color: "amber",
        priority: "HIGH",
      });
    }

    // Conseil LMNP vs nue
    if (strategie === "LONGUE_DUREE" && annualRent > 0) {
      const gainLMNP = results.find(r => r.label.includes("LMNP Réel"))?.totalFiscalAnnuel || 0;
      const gainNue = results.find(r => r.label.includes("nue Réel"))?.totalFiscalAnnuel || 0;
      if (gainLMNP < gainNue) {
        tips.push({
          icon: Lightbulb,
          title: "LMNP Réel > Location nue pour ce projet",
          text: `Le LMNP réel vous économise ${formatEuro(gainNue - gainLMNP)}/an grâce à l'amortissement. Attention : depuis 2025, ces amortissements seront réintégrés dans la plus-value à la revente. Pensez à calculer le coût à terme.`,
          color: "emerald",
          priority: "HIGH",
        });
      }
    }

    // Conseil SCI IS pour gros patrimoine
    if (patrimGlobal === "MULTI" && tmiBracket >= 30) {
      tips.push({
        icon: Building2,
        title: "Multi-bien : envisagez la SCI à l'IS pour le prochain",
        text: "Au-delà de 2-3 biens, la SCI à l'IS devient très compétitive : taux à 15% sur les premiers 42 500€, amortissement non plafonné, et transmission de parts facilitée. La clé : ne pas distribuer les dividendes pour éviter la double imposition.",
        color: "indigo",
        priority: "MEDIUM",
      });
    }

    // Conseil saisonnière non classée
    if (strategie === "SAISONNIERE") {
      tips.push({
        icon: AlertTriangle,
        title: "Location saisonnière non classée : attention à la loi Le Meur",
        text: "Depuis 2024, l'abattement micro-BIC passe à 30% (contre 50% auparavant) et le plafond à 15 000€ pour les meublés non classés (Airbnb sans étoiles). Le classement de votre logement (300-500€) vous permet de rester à 50% d'abattement.",
        color: "amber",
        priority: "HIGH",
      });
    }

    // Conseil réintégration amortissements
    if (results.find(r => r.label.includes("LMNP Réel"))?.score === 95) {
      tips.push({
        icon: Eye,
        title: "Vigilance : amortissements réintégrés à la revente (2025)",
        text: "Depuis 2025, si vous avez déduit des amortissements en LMNP réel, ils s'ajoutent au calcul de la plus-value à la revente. Cela peut alourdir significativement l'imposition. Stratégie : prévoir une détention longue (22+ ans) ou via une donation.",
        color: "rose",
        priority: "HIGH",
      });
    }

    // Conseil SCI IR transmission
    if (objectif === "TRANSMISSION") {
      tips.push({
        icon: Shield,
        title: "Objectif transmission : la SCI à l'IR est votre alliée",
        text: "La SCI à l'IR permet de donner progressivement des parts sociales à vos enfants (abattement de 100 000€/enfant tous les 15 ans). Vous conservez la gestion via votre rôle de gérant. C'est l'outil de transmission patrimoniale le plus puissant.",
        color: "purple",
        priority: "HIGH",
      });
    }

    // Conseil déficit foncier
    if (tmiBracket >= 30 && strategie !== "SAISONNIERE") {
      const deficitPossible = Math.max(0, -(annualRent - annualCharges - yearOneInterest));
      if (deficitPossible > 0) {
        tips.push({
          icon: Zap,
          title: `Déficit foncier potentiel : ${formatEuro(Math.min(deficitPossible, 10700))} déductibles de vos revenus`,
          text: `En location nue régime réel, vous pourriez imputer jusqu'à 10 700€ de déficit foncier directement sur votre revenu global. Avec votre TMI de ${tmiBracket}%, cela représente une économie de ${formatEuro(Math.min(deficitPossible, 10700) * (tmiBracket/100))}.`,
          color: "emerald",
          priority: "MEDIUM",
        });
      }
    }

    return tips.sort((a, b) => (a.priority === "HIGH" ? -1 : 1));
  }, [tmiBracket, strategie, patrimGlobal, objectif, annualRent, annualCharges, yearOneInterest, results]);

  // ── RENDU RP/RS — MODULE PLUS-VALUE & TRANSMISSION ──────

  if (projectType !== "LOC") {
    const isRP = projectType === "RP";

    // ── Calcul plus-value 2026 ──────────────────────────────
    const acquisitionBase = price + notaryFees + works;
    const grossGain = Math.max(0, resalePriceRP - acquisitionBase);

    const abattIR = Math.min(1, PV_ABATTEMENT_IR(holdingYears));
    const abattPS = Math.min(1, PV_ABATTEMENT_PS(holdingYears));
    const pvBaseIR = grossGain * (1 - abattIR);
    const pvBasePS = grossGain * (1 - abattPS);

    const surtaxe = (() => {
      if (grossGain <= 50000) return 0;
      const pv = grossGain;
      if (pv <= 100000) return pv * 0.02;
      if (pv <= 150000) return pv * 0.03;
      if (pv <= 200000) return pv * 0.04;
      if (pv <= 250000) return pv * 0.05;
      return pv * 0.06;
    })();

    const irPV = isRP ? 0 : pvBaseIR * 0.19;
    const psPV = isRP ? 0 : pvBasePS * PS_PV_2026;
    const totalTax = isRP ? 0 : irPV + psPV + surtaxe;
    const netVendeur = Math.max(0, grossGain - totalTax);

    // ── IFI ────────────────────────────────────────────────
    const rpAbattement = isRP ? patrimTotalImmo * 0.30 : 0;
    const patrimoineNetIFI = Math.max(0, patrimTotalImmo - rpAbattement - dettesImmo);
    const ifiDu = patrimoineNetIFI > 1300000 ? calcIFI(patrimoineNetIFI) : 0;

    // ── Succession ─────────────────────────────────────────
    const calcSuccessionEnfant = (valeur: number, n: number) => {
      const part = valeur / Math.max(1, n);
      const base = Math.max(0, part - 100000);
      if (base <= 8072) return base * 0.05;
      if (base <= 12109) return 404 + (base - 8072) * 0.10;
      if (base <= 15932) return 807 + (base - 12109) * 0.15;
      if (base <= 552324) return 1381 + (base - 15932) * 0.20;
      return 108716 + (base - 552324) * 0.30;
    };
    const droitsParEnfant = calcSuccessionEnfant(price, nbEnfants);
    const totalDroits = droitsParEnfant * nbEnfants;

    return (
      <div className="w-full space-y-6 md:space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center border shrink-0 ${isRP ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
              <Home size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">
                Fiscalité {isRP ? "Résidence Principale" : "Résidence Secondaire"}
              </h2>
              <p className="text-xs text-zinc-500">Plus-value · IFI · Succession · Transmission — Régime 2026</p>
            </div>
          </div>
          {/* Sous-onglets */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5">
            {([
              { id: "PLUS_VALUE", label: "Plus-value", icon: TrendingUp },
              { id: "TRANSMISSION", label: "Transmission", icon: Shield },
              { id: "IFI", label: "IFI", icon: Landmark },
            ] as const).map((t) => (
              <button key={t.id} onClick={() => setRpTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${rpTab === t.id ? (isRP ? "bg-amber-500/80 text-white" : "bg-blue-600 text-white") : "text-zinc-500 hover:text-white hover:bg-white/5"}`}>
                <t.icon size={12} /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── ONGLET PLUS-VALUE ─────────────────────────────── */}
          {rpTab === "PLUS_VALUE" && (
            <motion.div key="pv" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 md:space-y-6">

              {/* RP : exonération totale */}
              {isRP ? (
                <div className="p-6 md:p-10 rounded-[24px] bg-gradient-to-br from-amber-900/20 via-zinc-900 to-black border border-amber-500/30 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                  <div className="relative z-10">
                    <div className="inline-flex p-4 rounded-full bg-amber-500/20 text-amber-400 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                      <CheckCircle size={36} />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase mb-3">Le Graal Fiscal : <span className="text-amber-400">Exonération Totale</span></h3>
                    <p className="text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed mb-6">
                      La plus-value sur Résidence Principale est <strong className="text-white">100% exonérée</strong> d'IR et de prélèvements sociaux, sans condition de durée de détention. C'est l'avantage fiscal le plus puissant du système français.
                    </p>
                    {/* Simulateur chiffré même pour RP */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left mt-6">
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Prix de revente estimé</p>
                        <input type="number" value={resalePriceRP} onChange={e => setResalePriceRP(Number(e.target.value))}
                          className="w-full bg-transparent border-b border-amber-500/30 text-white font-black text-xl pb-1 focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Base d'acquisition</p>
                        <p className="text-xl font-black text-white">{formatEuro(acquisitionBase)}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">Prix + notaire + travaux</p>
                      </div>
                      <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/30 relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1.5 bg-amber-500 rounded-r-2xl" />
                        <p className="text-[10px] text-amber-500 uppercase font-bold mb-2">Gain net — 0€ d'impôt</p>
                        <p className="text-xl font-black text-white">{formatEuro(Math.max(0, resalePriceRP - acquisitionBase))}</p>
                        <p className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1"><CheckCircle size={10}/> Exonéré à 100%</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* RS : calcul progressif avec abattements */
                <>
                  <div className="p-4 md:p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        La résidence secondaire est soumise à la <strong className="text-white">taxe sur les plus-values immobilières</strong> au taux de 19% IR + 18,6% PS, avec des abattements progressifs selon la durée de détention. <strong className="text-white">Exonération totale après 22 ans (IR) et 30 ans (PS)</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Paramètres */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 space-y-4">
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Paramètres de revente</h4>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Prix de revente estimé</label>
                        <input type="number" value={resalePriceRP} onChange={e => setResalePriceRP(Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl text-white font-bold text-lg px-4 py-3 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">Durée de détention</label>
                          <span className="text-white font-black">{holdingYears} ans</span>
                        </div>
                        <input type="range" min={0} max={35} step={1} value={holdingYears}
                          onChange={e => setHoldingYears(Number(e.target.value))}
                          className="w-full accent-blue-500 cursor-pointer" />
                        <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
                          <span>0 an</span>
                          <span className="text-blue-400">22 ans → IR = 0</span>
                          <span className="text-emerald-400">30 ans → Total = 0</span>
                        </div>
                      </div>
                      {/* TMI pour RS */}
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Votre TMI</label>
                        <div className="grid grid-cols-5 gap-1">
                          {[0, 11, 30, 41, 45].map(t => (
                            <button key={t} onClick={() => setTmiBracket(t)}
                              className={`py-2 rounded-lg text-[10px] font-bold transition-all ${tmiBracket === t ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}>
                              {t}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Résultat */}
                    <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 flex flex-col justify-between">
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Calcul de la plus-value</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-zinc-400">Prix de revente</span>
                          <span className="font-bold text-white">{formatEuro(resalePriceRP)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-zinc-400">Base d'acquisition</span>
                          <span className="font-bold text-white">-{formatEuro(acquisitionBase)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-zinc-400 font-bold">Plus-value brute</span>
                          <span className="font-black text-white text-base">{formatEuro(grossGain)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-zinc-400">Abatt. IR ({(abattIR*100).toFixed(0)}%)</span>
                          <span className="text-blue-400 font-bold">-{formatEuro(grossGain * abattIR)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-zinc-400">IR 19% sur base nette</span>
                          <span className={`font-bold ${irPV === 0 ? "text-emerald-400" : "text-rose-400"}`}>{irPV === 0 ? "0 € ✓" : `-${formatEuro(Math.round(irPV))}`}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-zinc-400">PS 18,6% sur base nette</span>
                          <span className={`font-bold ${psPV === 0 ? "text-emerald-400" : "text-rose-400"}`}>{psPV === 0 ? "0 € ✓" : `-${formatEuro(Math.round(psPV))}`}</span>
                        </div>
                        {surtaxe > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-xs text-amber-400">Surtaxe PV {">"} 50k€</span>
                            <span className="text-amber-400 font-bold">-{formatEuro(Math.round(surtaxe))}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-3">
                          <span className="text-sm font-black text-white uppercase">Net vendeur</span>
                          <span className="text-2xl font-black text-emerald-400">{formatEuro(netVendeur)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">Total fiscalité</span>
                          <span className={`font-bold ${totalTax === 0 ? "text-emerald-400" : "text-rose-400"}`}>{totalTax === 0 ? "0 € — Exonéré !" : formatEuro(Math.round(totalTax))}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tableau abattements progressifs */}
                  <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5">
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={14}/> Abattements progressifs par durée de détention</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left text-zinc-500 font-bold pb-2">Années</th>
                            <th className="text-center text-blue-400 font-bold pb-2">Abatt. IR</th>
                            <th className="text-center text-indigo-400 font-bold pb-2">Abatt. PS</th>
                            <th className="text-right text-zinc-400 font-bold pb-2">Impôt estimé</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[0, 5, 10, 15, 22, 25, 30].map(y => {
                            const aIR = Math.min(1, PV_ABATTEMENT_IR(y));
                            const aPS = Math.min(1, PV_ABATTEMENT_PS(y));
                            const estIR = grossGain * (1 - aIR) * 0.19;
                            const estPS = grossGain * (1 - aPS) * PS_PV_2026;
                            const total = estIR + estPS;
                            const isCurrentYear = y === holdingYears || (y < holdingYears && (y === 30 ? holdingYears >= 30 : holdingYears < [0,5,10,15,22,25,30][([0,5,10,15,22,25,30].indexOf(y)+1)]));
                            return (
                              <tr key={y} className={`border-b border-white/5 ${y === holdingYears ? "bg-blue-500/10" : ""}`}>
                                <td className={`py-2 font-bold ${y === holdingYears ? "text-blue-400" : "text-zinc-300"}`}>{y} an{y > 1 ? "s" : ""}{y === holdingYears ? " ◄" : ""}</td>
                                <td className="py-2 text-center text-blue-400">{(aIR*100).toFixed(0)}%</td>
                                <td className="py-2 text-center text-indigo-400">{(aPS*100).toFixed(0)}%</td>
                                <td className={`py-2 text-right font-bold ${total === 0 ? "text-emerald-400" : "text-zinc-300"}`}>{total === 0 ? "0 € ✓" : formatEuro(Math.round(total))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Conseils RS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        icon: Lightbulb, color: "amber",
                        title: "Stratégie : transformer en RP avant de vendre",
                        text: `En habitant votre RS au moins quelques mois avant la vente comme résidence principale, vous pouvez bénéficier de l'exonération totale. Attention : la règle est stricte — le bien doit être votre résidence principale effective au moment de la vente.`,
                      },
                      {
                        icon: Eye, color: "blue",
                        title: "Surtaxe pour les plus-values élevées",
                        text: grossGain > 50000
                          ? `Votre plus-value brute (${formatEuro(grossGain)}) dépasse 50 000€. Une surtaxe progressive s'applique (de 2% à 6% selon le montant), en plus de l'IR et des PS.`
                          : "Si votre plus-value dépasse 50 000€, une surtaxe progressive de 2% à 6% s'ajoute à l'IR et aux PS. Pensez-y dans vos projections de revente.",
                      },
                      {
                        icon: Shield, color: "emerald",
                        title: "Exonération après 22 ans (IR) et 30 ans (PS)",
                        text: `Avec ${holdingYears} an${holdingYears > 1 ? "s" : ""} de détention, vous avez ${(abattIR*100).toFixed(0)}% d'abattement IR et ${(abattPS*100).toFixed(0)}% d'abattement PS. ${holdingYears >= 30 ? "✅ Vous êtes totalement exonéré !" : holdingYears >= 22 ? "✅ Exonéré d'IR — il reste les PS jusqu'à 30 ans." : "Pour minimiser l'imposition, allongez la durée de détention."}`,
                      },
                      {
                        icon: AlertTriangle, color: "rose",
                        title: "Attention : résidence secondaire et location Airbnb",
                        text: "Si vous louez votre RS en courte durée, les revenus sont imposables en BIC. À la revente, si le bien a été loué, l'exonération RS classique s'applique toujours (≠ RP), mais les abattements se calculent normalement.",
                      },
                    ].map((c, i) => (
                      <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 bg-${c.color}-500/5 border-${c.color}-500/20`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-${c.color}-500/15 text-${c.color}-400`}>
                          <c.icon size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm mb-1">{c.title}</p>
                          <p className="text-xs text-zinc-400 leading-relaxed">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── ONGLET TRANSMISSION ───────────────────────────── */}
          {rpTab === "TRANSMISSION" && (
            <motion.div key="trans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 md:space-y-6">

              <div className="p-4 md:p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Shield size={16} className="text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Transmettre un bien immobilier à ses enfants peut se faire <strong className="text-white">de son vivant (donation)</strong> ou au <strong className="text-white">décès (succession)</strong>. Les deux situations ont des fiscalités très différentes — et des opportunités d'optimisation importantes.
                  </p>
                </div>
              </div>

              {/* Simulateur succession */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 space-y-4">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Paramètres succession</h4>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Valeur du bien</p>
                    <p className="text-2xl font-black text-white">{formatEuro(price)}</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Nombre d'enfants héritiers</label>
                      <span className="font-black text-white">{nbEnfants}</span>
                    </div>
                    <input type="range" min={1} max={6} step={1} value={nbEnfants}
                      onChange={e => setNbEnfants(Number(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer" />
                  </div>
                </div>

                <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Droits de succession estimés</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Valeur du bien</span>
                      <span className="font-bold text-white">{formatEuro(price)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Part par enfant</span>
                      <span className="font-bold text-white">{formatEuro(price / nbEnfants)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Abattement /enfant</span>
                      <span className="font-bold text-emerald-400">-{formatEuro(100000)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Base taxable /enfant</span>
                      <span className="font-bold text-white">{formatEuro(Math.max(0, price/nbEnfants - 100000))}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Droits /enfant</span>
                      <span className="font-bold text-amber-400">{formatEuro(Math.round(droitsParEnfant))}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm font-black text-white">Total droits</span>
                      <span className="text-xl font-black text-rose-400">{formatEuro(Math.round(totalDroits))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stratégies de transmission */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} className="text-purple-400"/> Stratégies d'optimisation de la transmission</h4>
                {[
                  {
                    color: "purple", icon: Shield,
                    title: "Donation tous les 15 ans (abattement rechargeable)",
                    text: `L'abattement de 100 000€ par enfant se "recharge" tous les 15 ans. Pour un bien de ${formatEuro(price)}, si vous commencez à donner tôt, vous pouvez transmettre en franchise d'impôt sur 2 cycles (30 ans). Exemple : donnez des parts de SCI progressivement.`,
                    tag: "Stratégie clé",
                  },
                  {
                    color: "blue", icon: Building2,
                    title: "SCI à l'IR + démembrement de propriété",
                    text: "Créez une SCI et donnez la nue-propriété des parts à vos enfants, en conservant l'usufruit. La valorisation fiscale de la nue-propriété est réduite (barème fiscal selon votre âge : 50% entre 51-60 ans, 60% entre 61-70 ans). Au décès, la pleine propriété est reconstituée sans droits.",
                    tag: "Très efficace",
                  },
                  {
                    color: "emerald", icon: Home,
                    title: `Résidence principale : exonération + abattement légal`,
                    text: isRP
                      ? "En plus de l'exonération de plus-value de la RP, la résidence principale bénéficie d'un abattement de 20% sur sa valeur dans le calcul des droits de succession, à condition que le conjoint survivant ou les enfants y habitent au moment du décès."
                      : "La résidence principale du défunt bénéficie d'un abattement de 20% en succession si le conjoint survivant ou les enfants y habitent. Pas applicable à la RS — pensez à une assurance-vie pour compenser.",
                    tag: isRP ? "Applicable" : "Info",
                  },
                  {
                    color: "amber", icon: FileText,
                    title: "Assurance-vie : le complément idéal hors succession",
                    text: "L'assurance-vie permet de transmettre jusqu'à 152 500€ par bénéficiaire hors succession (pour les versements avant 70 ans). Elle est souvent utilisée en complément d'un bien immobilier pour équilibrer la transmission entre héritiers ou financer les droits de succession.",
                    tag: "Complément",
                  },
                ].map((c, i) => (
                  <div key={i} className={`p-4 md:p-5 rounded-2xl border flex items-start gap-4 bg-${c.color}-500/5 border-${c.color}-500/20`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-${c.color}-500/15 text-${c.color}-400`}><c.icon size={18}/></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-white text-sm">{c.title}</p>
                        <Badge color={c.color}>{c.tag}</Badge>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ONGLET IFI ────────────────────────────────────── */}
          {rpTab === "IFI" && (
            <motion.div key="ifi" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 md:space-y-6">

              <div className="p-4 md:p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    L'<strong className="text-white">Impôt sur la Fortune Immobilière (IFI)</strong> s'applique si votre patrimoine immobilier net dépasse <strong className="text-white">1 300 000€</strong>. Il concerne uniquement les actifs immobiliers — contrairement à l'ancien ISF qui incluait aussi les actifs financiers.
                  </p>
                </div>
              </div>

              {/* Simulateur IFI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 space-y-4">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Votre patrimoine immobilier total</h4>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-2">Valeur brute de tous vos biens immo</label>
                    <input type="number" value={patrimTotalImmo} onChange={e => setPatrimTotalImmo(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl text-white font-bold text-lg px-4 py-3 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-2">Dettes immobilières déductibles</label>
                    <input type="number" value={dettesImmo} onChange={e => setDettesImmo(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl text-white font-bold text-lg px-4 py-3 focus:outline-none focus:border-indigo-500" />
                    <p className="text-[10px] text-zinc-600 mt-1">Emprunts immo, travaux à réaliser, etc.</p>
                  </div>
                  {isRP && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <p className="text-[10px] text-amber-400 font-bold uppercase">Abattement RP : -30%</p>
                      <p className="text-xs text-zinc-400 mt-1">La résidence principale bénéficie d'un abattement de 30% sur sa valeur pour le calcul de l'IFI.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Calcul IFI 2026</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Patrimoine brut</span>
                      <span className="font-bold text-white">{formatEuro(patrimTotalImmo)}</span>
                    </div>
                    {isRP && <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-amber-400">Abattement RP (-30%)</span>
                      <span className="font-bold text-amber-400">-{formatEuro(rpAbattement)}</span>
                    </div>}
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Dettes déductibles</span>
                      <span className="font-bold text-emerald-400">-{formatEuro(dettesImmo)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs font-bold text-zinc-400">Patrimoine net IFI</span>
                      <span className={`font-black text-base ${patrimoineNetIFI > 1300000 ? "text-rose-400" : "text-emerald-400"}`}>{formatEuro(patrimoineNetIFI)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-zinc-400">Seuil de déclenchement</span>
                      <span className="font-bold text-zinc-500">1 300 000€</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm font-black text-white">IFI dû / an</span>
                      <span className={`text-2xl font-black ${ifiDu === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {ifiDu === 0 ? "0 € ✓" : formatEuro(Math.round(ifiDu))}
                      </span>
                    </div>
                    {patrimoineNetIFI < 1300000 && (
                      <p className="text-[10px] text-emerald-400 font-bold">✓ Vous n'êtes pas assujetti à l'IFI</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Barème IFI */}
              <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Barème IFI 2026</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-zinc-500 font-bold pb-2">Tranche</th>
                        <th className="text-right text-indigo-400 font-bold pb-2">Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { tranche: "< 800 000€", taux: "0%", note: "Non assujetti" },
                        { tranche: "800 001 — 1 300 000€", taux: "0,5%", note: "" },
                        { tranche: "1 300 001 — 2 570 000€", taux: "0,7%", note: "" },
                        { tranche: "2 570 001 — 5 000 000€", taux: "1%", note: "" },
                        { tranche: "5 000 001 — 10 000 000€", taux: "1,25%", note: "" },
                        { tranche: "> 10 000 000€", taux: "1,5%", note: "Taux max" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-2 text-zinc-300">{row.tranche}</td>
                          <td className="py-2 text-right font-bold text-indigo-400">{row.taux} {row.note && <span className="text-zinc-600 font-normal text-[10px]">— {row.note}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conseils IFI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: Building2, color: "indigo", title: "SCI à l'IS : sortir de l'assiette IFI", text: "Les parts de SCI à l'IS peuvent être exclues de l'assiette IFI si la société a une activité commerciale. À étudier avec un conseiller patrimonial si votre patrimoine dépasse le seuil." },
                  { icon: Shield, color: "emerald", title: "Dettes déductibles : optimisez votre assiette", text: "Tous les emprunts immobiliers contractés pour acquérir, construire ou améliorer un bien soumis à l'IFI sont déductibles. Pensez aussi aux travaux financés à crédit." },
                ].map((c, i) => (
                  <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 bg-${c.color}-500/5 border-${c.color}-500/20`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-${c.color}-500/15 text-${c.color}-400`}><c.icon size={16}/></div>
                    <div>
                      <p className="font-bold text-white text-sm mb-1">{c.title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/5">
                <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                  <strong className="text-zinc-500">Avertissement :</strong> Ces simulations sont fournies à titre pédagogique uniquement et ne constituent pas un conseil fiscal ou juridique. Consultez un expert-comptable ou un CGP avant toute décision.
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 md:space-y-8">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
            <Scale size={22} />
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">
              Optimiseur Fiscal <span className="text-indigo-400">2026</span>
            </h2>
            <p className="text-xs text-zinc-500">
              À jour LFSS 2026 · Loi Le Meur · Réforme amortissements 2025
            </p>
          </div>
        </div>

        {/* Étapes de navigation */}
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5">
          {[
            { id: 0, label: "Mon profil", icon: User },
            { id: 1, label: "Structure", icon: Building2 },
            { id: 2, label: "Résultats", icon: BarChart3 },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                step === s.id
                  ? "bg-indigo-600 text-white shadow-lg"
                  : step > s.id
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {step > s.id ? <CheckCircle size={12} /> : <s.icon size={12} />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── ÉTAPE 0 : PROFIL ───────────────────────────────── */}
        {step === 0 && (
          <motion.div
            key="profil"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="p-4 md:p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-indigo-400" />
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Pourquoi ces questions ?</span>
              </div>
              <p className="text-sm text-zinc-300">
                Votre situation fiscale personnelle change tout. Deux investisseurs avec le même bien peuvent payer des impôts radicalement différents selon leur TMI, leur objectif et leur structure juridique. Répondez en 30 secondes pour obtenir des conseils vraiment personnalisés.
              </p>
            </div>

            {/* TMI */}
            <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Calculator size={16} />
                </div>
                <h3 className="font-bold text-white text-sm">Votre Tranche Marginale d'Imposition (TMI)</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                C'est le taux qui s'applique à votre dernier euro gagné. Si vous ne savez pas exactement, choisissez approximativement selon votre salaire net mensuel.
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { rate: 0, hint: "< 960€/mois" },
                  { rate: 11, hint: "960-2 440€" },
                  { rate: 30, hint: "2 440-7 000€" },
                  { rate: 41, hint: "7 000-15 000€" },
                  { rate: 45, hint: "> 15 000€" },
                ].map(({ rate, hint }) => (
                  <button
                    key={rate}
                    onClick={() => setTmiBracket(rate)}
                    className={`flex flex-col items-center justify-center p-2 md:p-3 rounded-xl border text-center transition-all ${
                      tmiBracket === rate
                        ? "bg-amber-500/20 border-amber-500/50 text-white"
                        : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                    }`}
                  >
                    <span className="text-xl md:text-2xl font-black">{rate}%</span>
                    <span className="text-[9px] md:text-[10px] mt-1 leading-tight">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stratégie locative */}
            <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Home size={16} />
                </div>
                <h3 className="font-bold text-white text-sm">Type de location envisagé</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "LONGUE_DUREE", label: "Location longue durée", sub: "Bail 1 an (meublé) ou 3 ans (nu)", color: "emerald" },
                  { id: "SAISONNIERE", label: "Courte durée / Saisonnière", sub: "Airbnb, Booking, etc.", color: "blue" },
                  { id: "COLOCATION", label: "Colocation", sub: "Plusieurs locataires", color: "indigo" },
                  { id: "RESIDENT_PRINCIPALE", label: "Résidence principale", sub: "Avec chambre louée", color: "purple" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStrategie(s.id as Strategie)}
                    className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${
                      strategie === s.id
                        ? `bg-${s.color}-500/10 border-${s.color}-500/40 text-white`
                        : "bg-black/20 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <span className="font-bold text-sm">{s.label}</span>
                    <span className="text-[11px] mt-1 text-zinc-500">{s.sub}</span>
                    {strategie === s.id && <CheckCircle size={14} className={`text-${s.color}-400 mt-2`} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Objectif et patrimoine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Star size={16} />
                  </div>
                  <h3 className="font-bold text-white text-sm">Votre objectif principal</h3>
                </div>
                {[
                  { id: "CASHFLOW", label: "💸 Maximiser le cashflow mensuel" },
                  { id: "DEFISCALISATION", label: "🛡️ Réduire mes impôts (défiscaliser)" },
                  { id: "TRANSMISSION", label: "🏛️ Transmettre à mes enfants" },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setObjectif(o.id as any)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      objectif === o.id
                        ? "bg-purple-500/15 border-purple-500/40 text-white"
                        : "bg-black/20 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <div className="rounded-[24px] bg-zinc-900/40 border border-white/5 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <h3 className="font-bold text-white text-sm">Taille de votre patrimoine immobilier</h3>
                </div>
                {[
                  { id: "SIMPLE", label: "🏠 Premier investissement ou 1 seul bien" },
                  { id: "MULTI", label: "🏙️ Plusieurs biens (ou objectif multi-biens)" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPatrimGlobal(p.id as any)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      patrimGlobal === p.id
                        ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                        : "bg-black/20 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep(1)}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl text-sm gap-3 shadow-lg shadow-indigo-900/30 transition-all hover:scale-[1.01]"
            >
              Analyser ma structure juridique <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}

        {/* ── ÉTAPE 1 : STRUCTURE JURIDIQUE ─────────────────── */}
        {step === 1 && (
          <motion.div
            key="structure"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="p-4 md:p-6 rounded-2xl bg-zinc-900/40 border border-white/5">
              <h3 className="font-black text-white text-base md:text-lg mb-1">
                Choisissez votre structure d'investissement
              </h3>
              <p className="text-xs text-zinc-400">
                Nom propre vs Société : un choix stratégique qui impacte votre fiscalité pendant toute la durée de détention. Il n'y a pas de mauvaise réponse, seulement le bon choix pour <em className="text-zinc-300">votre</em> situation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: "NOM_PROPRE",
                  label: "Nom propre",
                  sub: "Personne physique (particulier)",
                  icon: User,
                  color: "emerald",
                  avantages: ["Simple et rapide — aucune création de société", "Accès au LMNP (micro ou réel)", "Exonération plus-value après 22/30 ans", "Liquidité totale du cashflow"],
                  inconvenients: ["Revenus s'ajoutent à votre IR personnel", "Transmission plus complexe (indivision)", "Pas de responsabilité limitée"],
                  idéal: "1er investissement, simplification maximale, TMI < 30%",
                },
                {
                  id: "SCI_IR",
                  label: "SCI à l'IR",
                  sub: "Société Civile Immobilière (transparente)",
                  icon: Landmark,
                  color: "blue",
                  avantages: ["Investir à plusieurs sans indivision", "Transmission de parts facilitée (donation)", "Régime plus-value des particuliers conservé", "Déficit foncier imputable sur revenu global"],
                  inconvenients: ["Pas d'amortissement", "Revenus toujours ajoutés à l'IR des associés", "Formalisme annuel (AG, comptes)", "Pas possible en meublé (sauf <10% des recettes)"],
                  idéal: "Objectif transmission patrimoniale, projet familial, location nue",
                },
                {
                  id: "SCI_IS",
                  label: "SCI à l'IS",
                  sub: "Impôt sur les Sociétés",
                  icon: Building2,
                  color: "indigo",
                  avantages: ["Amortissement non plafonné (IS 15% ou 25%)", "TMI personnel préservé si pas de distribution", "Idéal pour réinvestir les bénéfices", "Attractif pour TMI 41-45%"],
                  inconvenients: ["Double imposition : IS + Flat Tax 30% si dividendes", "Plus-value à la revente très lourde", "Option IS irrévocable", "Comptabilité lourde"],
                  idéal: "Gros patrimoine, TMI élevé, réinvestissement prévu, pas de revente",
                },
                {
                  id: "SARL_FAMILLE",
                  label: "SARL de famille",
                  sub: "Société de famille (BIC - meublé)",
                  icon: Crown,
                  color: "purple",
                  avantages: ["LMNP réel en société (amortissement)", "Investir à plusieurs en meublé", "Responsabilité limitée", "Transmission simplifiée"],
                  inconvenients: ["Uniquement pour la famille proche", "Amortissements réintégrés à la revente", "Comptabilité obligatoire", "Création et gestion plus coûteuse"],
                  idéal: "Meublé à plusieurs membres de la famille, TMI moyen-élevé",
                },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStructure(s.id as Structure)}
                  className={`flex flex-col items-start p-5 rounded-[24px] border text-left transition-all hover:scale-[1.01] ${
                    structure === s.id
                      ? `bg-${s.color}-500/10 border-${s.color}-500/40`
                      : "bg-zinc-900/40 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        structure === s.id
                          ? `bg-${s.color}-500/20 border-${s.color}-500/40 text-${s.color}-400`
                          : "bg-zinc-800 border-white/5 text-zinc-500"
                      }`}>
                        <s.icon size={18} />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm">{s.label}</p>
                        <p className="text-[10px] text-zinc-500">{s.sub}</p>
                      </div>
                    </div>
                    {structure === s.id && (
                      <CheckCircle size={20} className={`text-${s.color}-400 shrink-0`} />
                    )}
                  </div>

                  <div className="space-y-1 w-full mb-3">
                    {s.avantages.slice(0, 2).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                        <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                        {a}
                      </div>
                    ))}
                    {s.inconvenients.slice(0, 1).map((ic, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-500">
                        <XCircle size={11} className="text-rose-500 mt-0.5 shrink-0" />
                        {ic}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-3 border-t border-white/5 w-full">
                    <span className="text-[10px] text-zinc-500">
                      <span className="text-zinc-400 font-bold">Idéal si : </span>{s.idéal}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(0)}
                variant="outline"
                className="h-12 px-6 border-white/10 text-zinc-400 hover:text-white rounded-2xl"
              >
                ← Retour
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl text-sm gap-3 shadow-lg shadow-indigo-900/30"
              >
                Voir l'analyse fiscale complète <ArrowRight size={18} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 2 : RÉSULTATS ────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 md:space-y-6"
          >
            {/* Synthèse rapide */}
            {bestResult && (
              <div className="p-4 md:p-6 rounded-[24px] bg-gradient-to-br from-indigo-900/20 via-black to-emerald-900/10 border border-indigo-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-indigo-400" />
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Régime optimal pour votre situation</span>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl md:text-3xl font-black text-white mb-1">{bestResult.label}</h3>
                      <Badge color="indigo">{bestResult.regime}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Économie vs pire option</p>
                      <p className="text-2xl md:text-4xl font-black text-emerald-400">+{formatEuro(Math.max(0, economieVsWorst))}</p>
                      <p className="text-xs text-zinc-500">par an</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-500 mb-1">Impôt annuel</p>
                      <p className="text-lg font-black text-white">{formatEuro(Math.round(bestResult.totalFiscalAnnuel))}</p>
                    </div>
                    <div className="text-center border-x border-white/5">
                      <p className="text-[10px] text-zinc-500 mb-1">Cashflow net</p>
                      <p className={`text-lg font-black ${bestResult.cashflowNetMois > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {bestResult.cashflowNetMois > 0 ? "+" : ""}{Math.round(bestResult.cashflowNetMois)}€/mois
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-500 mb-1">Score optimisation</p>
                      <p className="text-lg font-black text-indigo-400">{bestResult.score}/100</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Paramètres utilisés */}
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Badge color="amber">TMI {tmiBracket}%</Badge>
              <Badge color="blue">{strategie === "LONGUE_DUREE" ? "Longue durée" : strategie === "SAISONNIERE" ? "Saisonnière" : strategie}</Badge>
              <Badge color="purple">{objectif === "CASHFLOW" ? "Objectif cashflow" : objectif === "TRANSMISSION" ? "Objectif transmission" : "Objectif défiscalisation"}</Badge>
              <Badge color="indigo">{patrimGlobal === "SIMPLE" ? "1er bien" : "Multi-biens"}</Badge>
              <button
                onClick={() => setStep(0)}
                className="text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Modifier</span> <ChevronRight size={12} />
              </button>
            </div>

            {/* Tableau comparatif */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={14} /> Comparaison de tous les régimes
              </h3>
              {results.map((r, index) => (
                <div
                  key={r.label}
                  className={`rounded-[20px] border overflow-hidden transition-all ${
                    index === 0
                      ? "border-indigo-500/40 bg-indigo-900/10"
                      : "border-white/5 bg-zinc-900/30"
                  }`}
                >
                  <div className="p-4 md:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          index === 0 ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-bold text-sm text-white">{r.label}</span>
                            {r.tag && (
                              <Badge color={
                                r.tag === "OPTIMAL" ? "green" :
                                r.tag === "SIMPLE" ? "blue" :
                                r.tag === "COMPLEXE" ? "purple" : "red"
                              }>
                                {r.tag}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500">{r.regime}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-6 shrink-0 pl-10 sm:pl-0">
                        <div className="text-right">
                          <p className="text-[9px] text-zinc-600 uppercase">Impôt/an</p>
                          <p className="font-black text-sm text-white">{formatEuro(Math.round(r.totalFiscalAnnuel))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-zinc-600 uppercase">CF net/mois</p>
                          <p className={`font-black text-sm ${r.cashflowNetMois > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {r.cashflowNetMois > 0 ? "+" : ""}{Math.round(r.cashflowNetMois)}€
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDetails(showDetails === r.label ? null : r.label)}
                          className="text-zinc-500 hover:text-white transition-colors ml-2"
                        >
                          {showDetails === r.label ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pl-10">
                      <ScoreBar score={r.score} label="Score d'optimisation" />
                    </div>

                    {/* Détail déroulant */}
                    <AnimatePresence>
                      {showDetails === r.label && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Calcul détaillé */}
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Calcul fiscal</p>
                              {r.details.map((d, i) => (
                                <p key={i} className={`text-xs font-mono ${
                                  d.startsWith("⚠️") ? "text-amber-400" :
                                  d.startsWith("✅") ? "text-emerald-400" :
                                  d.startsWith("*") ? "text-zinc-600 italic" :
                                  "text-zinc-300"
                                }`}>{d}</p>
                              ))}
                            </div>
                            {/* Avantages */}
                            <div>
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Avantages</p>
                              <ul className="space-y-1.5">
                                {r.avantages.map((a, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                    <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" /> {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {/* Inconvénients */}
                            <div>
                              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Inconvénients</p>
                              <ul className="space-y-1.5">
                                {r.inconvenients.map((ic, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                                    <XCircle size={12} className="text-rose-500 mt-0.5 shrink-0" /> {ic}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>

            {/* Conseils personnalisés */}
            {conseils.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-400" /> Conseils personnalisés pour vous
                </h3>
                {conseils.map((c, i) => (
                  <div
                    key={i}
                    className={`p-4 md:p-5 rounded-2xl border flex items-start gap-4 ${
                      c.color === "red" ? "bg-rose-500/5 border-rose-500/20" :
                      c.color === "amber" ? "bg-amber-500/5 border-amber-500/20" :
                      c.color === "emerald" ? "bg-emerald-500/5 border-emerald-500/20" :
                      c.color === "indigo" ? "bg-indigo-500/5 border-indigo-500/20" :
                      c.color === "purple" ? "bg-purple-500/5 border-purple-500/20" :
                      "bg-zinc-900/40 border-white/5"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      c.color === "red" ? "bg-rose-500/15 text-rose-400" :
                      c.color === "amber" ? "bg-amber-500/15 text-amber-400" :
                      c.color === "emerald" ? "bg-emerald-500/15 text-emerald-400" :
                      c.color === "indigo" ? "bg-indigo-500/15 text-indigo-400" :
                      c.color === "purple" ? "bg-purple-500/15 text-purple-400" :
                      "bg-zinc-800 text-zinc-400"
                    }`}>
                      <c.icon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm mb-1">{c.title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{c.text}</p>
                    </div>
                    {c.priority === "HIGH" && (
                      <Badge color="red" >Prioritaire</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* FAQ Accordéons pédagogiques */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={14} /> Comprendre les mécanismes fiscaux
              </h3>

              <Accordion title="L'amortissement LMNP : comment ça marche ?" icon={Calculator} defaultOpen={false} color="indigo">
                <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                  <p>L'amortissement est la <strong className="text-white">magie fiscale du meublé</strong>. Le fisc reconnaît que votre bien perd de la valeur dans le temps. Vous pouvez donc déduire chaque année une fraction de la valeur du bien, sans que ça ne vous coûte un centime.</p>
                  <div className="bg-black/30 rounded-xl p-4 space-y-2 font-mono text-xs">
                    <p>Bien acheté {formatEuro(price)} → Bâti = 85% = {formatEuro(price * 0.85)}</p>
                    <p>Amortissement bâti sur 30 ans = <strong className="text-indigo-400">{formatEuro(Math.round(price * 0.85 / 30))}/an</strong></p>
                    <p>+ Mobilier (7 ans) + Travaux (15 ans) + Notaire (25 ans)</p>
                    <p className="border-t border-white/10 pt-2">Total amortissement : <strong className="text-emerald-400">{formatEuro(Math.round(amortissement))}/an</strong></p>
                  </div>
                  <p className="text-amber-400 text-xs">⚠️ Attention depuis 2025 : les amortissements déduits seront réintégrés dans le calcul de la plus-value à la revente.</p>
                </div>
              </Accordion>

              <Accordion title="SCI à l'IS : le double piège de la revente" icon={AlertTriangle} color="amber">
                <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                  <p>La SCI à l'IS permet d'amortir librement le bien. Mais à la revente, c'est une douche froide :</p>
                  <div className="bg-black/30 rounded-xl p-4 space-y-2 text-xs">
                    <p>Achat : {formatEuro(price)} → après 20 ans d'amortissement, valeur nette comptable ≈ {formatEuro(Math.round(price * 0.85 * (1 - 20/30)))}</p>
                    <p>Revente à {formatEuro(price * 1.5)} → Plus-value professionnelle ≈ {formatEuro(Math.round(price * 1.5 - price * 0.85 * (1 - 20/30)))}</p>
                    <p className="text-rose-400">IS sur cette plus-value : ~25% = {formatEuro(Math.round((price * 1.5 - price * 0.85 * (1 - 20/30)) * 0.25))}</p>
                    <p className="text-rose-400">+ Flat Tax 30% si vous distribuez les gains</p>
                  </div>
                  <p className="text-emerald-400 text-xs">✅ Stratégie : conserver indéfiniment ou transmettre via cession de parts pour éviter la revente directe.</p>
                </div>
              </Accordion>

              <Accordion title="Location nue vs Meublée : comparatif exhaustif" icon={Scale} color="emerald">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {[
                    { label: "Loyer", nue: "Plus bas (-15%)", meuble: "Plus élevé (+15%)", winner: "meuble" },
                    { label: "Durée de bail", nue: "3 ans (stable)", meuble: "1 an (flexible)", winner: "nue" },
                    { label: "Abattement micro", nue: "30%", meuble: "50% (longue durée)", winner: "meuble" },
                    { label: "Amortissement", nue: "Non", meuble: "Oui (réel)", winner: "meuble" },
                    { label: "Déficit imputable", nue: "Oui (10 700€)", meuble: "Non (BIC seulement)", winner: "nue" },
                    { label: "Plus-value revente", nue: "Favorable (22/30 ans)", meuble: "Alourdie (amorts réintégrés)", winner: "nue" },
                    { label: "Charges locataires", nue: "Plus élevées", meuble: "Incluses", winner: "nue" },
                    { label: "Prél. sociaux", nue: "17,2%", meuble: "18,6% (LFSS 2026)", winner: "nue" },
                  ].map((row) => (
                    <div key={row.label} className="col-span-2 flex items-center gap-3 py-2 border-b border-white/5">
                      <span className="text-zinc-500 w-32 shrink-0">{row.label}</span>
                      <span className={`flex-1 ${row.winner === "nue" ? "text-emerald-400 font-bold" : "text-zinc-300"}`}>{row.nue}</span>
                      <span className={`flex-1 ${row.winner === "meuble" ? "text-emerald-400 font-bold" : "text-zinc-300"}`}>{row.meuble}</span>
                    </div>
                  ))}
                </div>
              </Accordion>

              <Accordion title="La réforme 2025-2026 en 3 points clés" icon={Zap} color="blue">
                <div className="space-y-4">
                  {[
                    {
                      n: "1",
                      color: "rose",
                      title: "Réintégration amortissements (2025)",
                      text: "Si vous avez déduit des amortissements en LMNP réel, ils s'ajoutent à la plus-value à la revente depuis 2025. Un bien amorti depuis 10 ans avec 200 000€ d'amortissements verra sa plus-value alourdie d'autant.",
                    },
                    {
                      n: "2",
                      color: "amber",
                      title: "Hausse CSG LMNP (LFSS 2026)",
                      text: "Les prélèvements sociaux en LMNP passent de 17,2% à 18,6% depuis le 1er janvier 2026 (+1,4 point). Pour 10 000€ de base imposable, cela représente 140€ de coût supplémentaire par an.",
                    },
                    {
                      n: "3",
                      color: "amber",
                      title: "Meublé saisonnier non classé durci (Loi Le Meur)",
                      text: "Pour les meublés touristiques non classés (Airbnb sans étoiles), le micro-BIC passe de 71% à 30% d'abattement, et le plafond de 77 700€ à 15 000€. Le classement de votre logement (300-500€) permet d'éviter ce durcissement.",
                    },
                  ].map((item) => (
                    <div key={item.n} className={`flex items-start gap-4 p-4 rounded-xl bg-${item.color}-500/5 border border-${item.color}-500/20`}>
                      <div className={`w-8 h-8 rounded-xl bg-${item.color}-500/20 text-${item.color}-400 font-black text-sm flex items-center justify-center shrink-0`}>{item.n}</div>
                      <div>
                        <p className="font-bold text-white text-sm mb-1">{item.title}</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            </div>

            {/* Disclaimer légal */}
            <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/5">
              <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                <strong className="text-zinc-500">Avertissement légal :</strong> Ces simulations sont fournies à titre pédagogique uniquement. Elles ne constituent pas un conseil fiscal ou juridique. Les règles fiscales évoluent régulièrement. Consultez un expert-comptable ou un conseiller en gestion de patrimoine avant toute décision d'investissement.
              </p>
            </div>

            <Button
              onClick={() => setStep(0)}
              variant="outline"
              className="w-full h-11 border-white/10 text-zinc-400 hover:text-white rounded-2xl"
            >
              ← Modifier mon profil
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}