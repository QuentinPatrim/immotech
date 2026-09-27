/* ============================================================
   FISCALITÉ LOCATIVE — COMPARATIF DES RÉGIMES (barème 2026)
   Même référentiel que le simulateur Patrim (Fiscaliteengine) :
   IR au taux marginal (TMI), prélèvements sociaux 17,2 % sur les
   revenus fonciers et 18,6 % sur les BIC (LFSS 2026), IS 15 % /
   25 %, amortissements 85 % bâti / 30 ans.
   Projection année par année sur 10 ans, revente incluse :
   c'est le coût fiscal total qui départage les régimes.
   ============================================================ */

import { PNO, RENT_INDEX, RESALE_FEES, VACANCY, notaryFees, guaranteeFees, type FinancingInputs } from "@/lib/financing";

export const TMI_OPTIONS = [0, 11, 30, 41, 45] as const;
export type Tmi = typeof TMI_OPTIONS[number];

const PS_FONCIER = 0.172;
const PS_BIC = 0.186;
const PS_PV = 0.172;
const IR_PV = 0.19;
const MICRO_FONCIER = { abattement: 0.3, plafond: 15000 };
const MICRO_BIC = { abattement: 0.5, plafond: 77700 };
const DEFICIT_GLOBAL_MAX = 10700;
const IS_SEUIL = 42500;
const PFU = 0.314;
const PART_BATI = 0.85;
const AMO_BATI = 30, AMO_TRAVAUX = 15, AMO_MOBILIER = 7;
const MOBILIER = 5000;
const HORIZON = 10;

export type RegimeId = "micro_foncier" | "reel_foncier" | "micro_bic" | "lmnp_reel" | "sci_is";

export interface RegimeResult {
    id: RegimeId;
    label: string;
    short: string;
    eligible: boolean;
    reason?: string;
    /** Impôt moyen par an pendant la détention (IR + PS, ou IS) */
    taxPerYear: number;
    /** Cash-flow mensuel moyen après impôt pendant la détention */
    cashflowAfterTax: number;
    /** Impôt sur la plus-value à la revente (année 10) */
    exitTax: number;
    /** Coût fiscal total sur 10 ans, revente incluse */
    total10: number;
    /** Enrichissement net sur 10 ans : cash-flows après impôt + produit net de revente − apport */
    netGain10: number;
    pros: string[];
    cons: string[];
}

export interface FiscalComparison {
    tmi: Tmi;
    regimes: RegimeResult[];
    best: RegimeResult | null;
    /** Économie du meilleur régime face au régime par défaut (micro-foncier) */
    savingVsDefault: number;
}

const irIs = (b: number) => (b <= 0 ? 0 : b <= IS_SEUIL ? b * 0.15 : IS_SEUIL * 0.15 + (b - IS_SEUIL) * 0.25);

/** Échéancier annuel du crédit : intérêts, capital remboursé, capital restant dû en fin d'année */
function schedule(loan: number, ratePct: number, years: number) {
    const r = ratePct / 100 / 12, n = years * 12;
    const pmt = loan <= 0 ? 0 : r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
    const out: { interest: number; principal: number; debt: number }[] = [];
    let debt = loan;
    for (let y = 1; y <= HORIZON; y++) {
        let interest = 0, principal = 0;
        for (let m = 0; m < 12; m++) {
            if (debt <= 0.01) break;
            const i = debt * r;
            const p = Math.min(debt, pmt - i);
            interest += i; principal += p; debt -= p;
        }
        out.push({ interest, principal, debt: Math.max(0, debt) });
    }
    return { pmt, rows: out };
}

/** Impôt de plus-value des particuliers après 10 ans de détention (abattements pour durée) */
function pvParticulier(sale: number, basis: number, price: number) {
    // Frais d'acquisition forfaitaires 7,5 % ; travaux forfaitaires 15 % après 5 ans
    const pv = sale - Math.max(basis, price * 1.075 + price * 0.15);
    if (pv <= 0) return 0;
    const abIR = (HORIZON - 5) * 0.06, abPS = (HORIZON - 5) * 0.0165;
    return pv * (1 - abIR) * IR_PV + pv * (1 - abPS) * PS_PV;
}

export function compareRegimes(i: FinancingInputs, rate: number, tmiPct: Tmi): FiscalComparison {
    const tmi = tmiPct / 100;
    const notary = notaryFees(i.price, i.newBuild);
    const base = i.price + notary + i.works;
    const loan0 = Math.max(0, base - i.downPayment);
    const guarantee = guaranteeFees(loan0);
    const loan = loan0 > 0 ? loan0 + guarantee : 0;
    const { pmt, rows } = schedule(loan, rate, i.years);
    const insurance = (loan * i.insuranceRate) / 100;
    const sale = i.price * Math.pow(1 + i.appreciation / 100, HORIZON);
    const debt10 = rows[HORIZON - 1]?.debt ?? 0;
    const netSale = sale * (1 - RESALE_FEES) - debt10;

    const years = Array.from({ length: HORIZON }, (_, k) => {
        const idx = Math.pow(1 + RENT_INDEX, k);
        const rent = i.rent * 12 * (1 - VACANCY) * idx;
        const costs = (i.charges * 12 + i.propertyTax + PNO) * idx;
        const paid = k < i.years ? pmt * 12 + insurance : 0;
        return { rent, costs, interest: rows[k]?.interest ?? 0, insurance: k < i.years ? insurance : 0, paid };
    });
    const preTaxCash = years.map(y => y.rent - y.costs - y.paid);

    const make = (id: RegimeId, label: string, short: string, taxes: number[], exitTax: number, pros: string[], cons: string[], eligible = true, reason?: string, cashAdj = 0): RegimeResult => {
        const holdTax = taxes.reduce((a, b) => a + b, 0);
        const cash = preTaxCash.reduce((a, c, k) => a + c - taxes[k], 0) - cashAdj;
        return {
            id, label, short, eligible, reason,
            taxPerYear: holdTax / HORIZON,
            cashflowAfterTax: cash / HORIZON / 12,
            exitTax,
            total10: holdTax + exitTax,
            netGain10: cash + netSale - exitTax - i.downPayment,
            pros, cons,
        };
    };

    const regimes: RegimeResult[] = [];
    const yearlyRent = i.rent * 12;

    // ── Location nue, micro-foncier ──
    regimes.push(make("micro_foncier", "Location nue · micro-foncier", "Micro-foncier",
        years.map(y => y.rent * (1 - MICRO_FONCIER.abattement) * (tmi + PS_FONCIER)),
        pvParticulier(sale, i.price + i.works, i.price),
        ["Aucune comptabilité", "Abattement forfaitaire de 30 %"],
        ["Charges et intérêts réels non déduits"],
        yearlyRent <= MICRO_FONCIER.plafond, yearlyRent > MICRO_FONCIER.plafond ? "Loyers au-delà de 15 000 €/an" : undefined));

    // ── Location nue, régime réel (déficit foncier) ──
    {
        let carry = 0;
        const taxes = years.map((y, k) => {
            const works = k === 0 ? i.works : 0;
            const other = y.costs + y.insurance + works;
            const result = y.rent - y.interest - other;
            if (result >= 0) {
                const taxable = Math.max(0, result - carry);
                carry = Math.max(0, carry - result);
                return taxable * (tmi + PS_FONCIER);
            }
            // Déficit : la part hors intérêts s'impute sur le revenu global (10 700 € max)
            const deficit = -result;
            const fromOther = y.rent - y.interest >= 0 ? deficit : Math.min(deficit, other);
            const toGlobal = Math.min(DEFICIT_GLOBAL_MAX, fromOther);
            carry += deficit - toGlobal;
            return -toGlobal * tmi;
        });
        regimes.push(make("reel_foncier", "Location nue · régime réel", "Foncier réel", taxes,
            pvParticulier(sale, i.price + i.works, i.price),
            ["Intérêts, charges et travaux déduits", "Déficit imputable sur le revenu global (10 700 €/an)"],
            ["Engagement de 3 ans", "Loyers imposés à la TMI + 17,2 %"]));
    }

    // ── LMNP micro-BIC ──
    regimes.push(make("micro_bic", "Meublé LMNP · micro-BIC", "LMNP micro",
        years.map(y => y.rent * (1 - MICRO_BIC.abattement) * (tmi + PS_BIC)),
        pvParticulier(sale, i.price + i.works, i.price),
        ["Abattement forfaitaire de 50 %", "Aucune comptabilité"],
        ["Meubler le logement (~5 000 €)", "Prélèvements sociaux 18,6 %"],
        yearlyRent <= MICRO_BIC.plafond, yearlyRent > MICRO_BIC.plafond ? "Loyers au-delà de 77 700 €/an" : undefined, MOBILIER));

    // ── LMNP réel (amortissements) ──
    {
        const amort = (i.price * PART_BATI) / AMO_BATI + i.works / AMO_TRAVAUX + MOBILIER / AMO_MOBILIER;
        let deficit = 0, amoCarry = 0, amoUsed = 0;
        const taxes = years.map((y, k) => {
            const fees = k === 0 ? notary + guarantee : 0;
            const amoY = amort - (k >= AMO_MOBILIER ? MOBILIER / AMO_MOBILIER : 0);
            let result = y.rent - y.costs - y.interest - y.insurance - fees - 600; // 600 € : expert-comptable (déductible)
            if (result < 0) { deficit += -result; amoCarry += amoY; return 0; }
            const d = Math.min(deficit, result); deficit -= d; result -= d;
            const avail = amoY + amoCarry;
            const a = Math.min(avail, result); amoCarry = avail - a; amoUsed += a; result -= a;
            return result * (tmi + PS_BIC);
        });
        // Depuis 2025, les amortissements déduits sont réintégrés dans la plus-value
        const exitTax = pvParticulier(sale + amoUsed, i.price + i.works, i.price);
        regimes.push(make("lmnp_reel", "Meublé LMNP · régime réel", "LMNP réel", taxes, exitTax,
            ["Amortissement du bien : loyers peu ou pas imposés", "Frais de notaire et charges déduits"],
            ["Comptabilité (~600 €/an)", "Amortissements réintégrés dans la plus-value (LF 2025)"],
            true, undefined, MOBILIER + 600 * HORIZON));
    }

    // ── SCI à l'IS ──
    {
        const amort = (i.price * PART_BATI) / AMO_BATI + i.works / AMO_TRAVAUX;
        let loss = 0;
        const taxes = years.map((y, k) => {
            const fees = k === 0 ? notary + guarantee : 0;
            let result = y.rent - y.costs - y.interest - y.insurance - fees - amort - 1200; // 1 200 € : comptabilité et frais de société
            if (result < 0) { loss += -result; return 0; }
            const d = Math.min(loss, result); loss -= d; result -= d;
            return irIs(result);
        });
        const vnc = i.price + i.works - amort * HORIZON;
        const pvPro = sale * (1 - RESALE_FEES) - vnc;
        const isPv = irIs(Math.max(0, pvPro - loss));
        // Sortie : l'associé récupère le boni de liquidation, taxé au PFU
        const retained = preTaxCash.reduce((a, c, k) => a + c - taxes[k], 0) - 1200 * HORIZON;
        const exitTax = isPv + Math.max(0, retained + pvPro - isPv) * PFU;
        regimes.push(make("sci_is", "SCI à l'impôt sur les sociétés", "SCI IS", taxes, exitTax,
            ["IS à 15 % jusqu'à 42 500 € de bénéfice", "Amortissement du bien", "Transmission facilitée"],
            ["Plus-value calculée sur la valeur amortie", "Sortie des gains taxée au PFU (31,4 %)", "Frais de société (~1 200 €/an)"],
            true, undefined, 1200 * HORIZON));
    }

    const eligible = regimes.filter(r => r.eligible);
    const best = eligible.length ? eligible.reduce((a, b) => (b.netGain10 > a.netGain10 ? b : a)) : null;
    const ref = regimes.find(r => r.id === "micro_foncier" && r.eligible) || regimes.find(r => r.id === "reel_foncier")!;
    return { tmi: tmiPct, regimes, best, savingVsDefault: best ? Math.max(0, best.netGain10 - ref.netGain10) : 0 };
}
