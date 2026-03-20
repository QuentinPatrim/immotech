"use client";

import { useState, useEffect } from "react";
import { NexusLogo } from "@/components/NexusLogo";

// ─── Helpers ───────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

// ─── Constantes fiscales 2026 ──────────────────────────────
const PS_LMNP = 0.186;
const PS_FONCIER = 0.172;
const PS_PV = 0.186;

function calcAmortissement(price: number, works: number, notaryFees: number) {
  const bati = price * 0.85;
  return (bati / 30) + (works / 15) + (5000 / 7) + (notaryFees / 25);
}

function calcIS(benefice: number) {
  if (benefice <= 0) return 0;
  if (benefice <= 42500) return benefice * 0.15;
  return 42500 * 0.15 + (benefice - 42500) * 0.25;
}

interface Props {
  refProp: React.RefObject<HTMLDivElement>;
  // Données projet
  price: number; works: number; notaryFees: number;
  rent: number; charges: number; tax: number;
  monthlyPayment: number; yearOneInterest: number;
  totalCost: number; projectType: "LOC" | "RP" | "RS";
  rentalStrategy: string;
  duration: number; rate: number;
  // Données emprunteur
  revenue: number;
}

export default function RapportFiscalPDF({ refProp, price, works, notaryFees, rent, charges, tax, monthlyPayment, yearOneInterest, totalCost, projectType, rentalStrategy, duration, rate, revenue }: Props) {
  const [dateStr, setDateStr] = useState("");
  useEffect(() => { setDateStr(new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })); }, []);

  const isLoc = projectType === "LOC";
  const isRP = projectType === "RP";
  const annualRent = rent * 12;
  const annualCharges = (charges * 12) + tax;
  const amortissement = calcAmortissement(price, works, notaryFees);

  // ── Calculs régimes ─────────────────────────────────────
  // TMI estimé à 30% (le plus courant)
  const TMI = 0.30;

  // 1. LMNP Micro-BIC
  const microBase = Math.max(0, annualRent * 0.50);
  const microIR = microBase * TMI;
  const microPS = microBase * PS_LMNP;
  const microTotal = microIR + microPS;

  // 2. LMNP Réel
  const reelResultat = annualRent - annualCharges - yearOneInterest - amortissement;
  const reelBase = Math.max(0, reelResultat);
  const reelIR = reelBase * TMI;
  const reelPS = reelBase * PS_LMNP;
  const reelTotal = reelIR + reelPS;
  const isDeficit = reelResultat < 0;

  // 3. Location nue micro-foncier
  const nueMicroBase = Math.max(0, annualRent * 0.70);
  const nueMicroTotal = nueMicroBase * (TMI + PS_FONCIER);

  // 4. Location nue réel
  const nueReelBase = Math.max(0, annualRent - annualCharges - yearOneInterest);
  const nueReelTotal = nueReelBase * (TMI + PS_FONCIER);
  const deficitFoncier = Math.max(0, -(annualRent - annualCharges - yearOneInterest));

  // 5. SCI IS
  const sciIsBase = Math.max(0, annualRent - annualCharges - yearOneInterest - amortissement);
  const sciIsTotal = calcIS(sciIsBase);

  // ── Meilleur régime ─────────────────────────────────────
  // Meilleur régime NOM PROPRE uniquement (SCI IS exclu — structure incompatible)
  const regimesNomPropre = [
    { name: "LMNP Réel", total: reelTotal },
    { name: "LMNP Micro-BIC", total: microTotal },
    { name: "Location nue Réel", total: nueReelTotal },
    { name: "Location nue Micro", total: nueMicroTotal },
  ];
  const bestNomPropre = regimesNomPropre.reduce((a, b) => a.total < b.total ? a : b);

  // ── Plus-value RS ─────────────────────────────────────
  const pvAbattIR = (years: number) => {
    if (years <= 5) return 0;
    if (years <= 21) return (years - 5) * 0.06;
    return 1;
  };
  const pvAbattPS = (years: number) => {
    if (years <= 5) return 0;
    if (years <= 21) return (years - 5) * 0.0165;
    if (years <= 30) return 0.264 + (years - 22) * 0.09;
    return 1;
  };

  // ── Styles ───────────────────────────────────────────────
  const pageStyle: React.CSSProperties = {
    width: "210mm", minHeight: "297mm", background: "white", color: "#0f172a",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: "14mm 14mm 14mm 14mm", boxSizing: "border-box", position: "relative",
  };
  const PageBreak = () => <div style={{ pageBreakBefore: "always" }} />;
  const Section = ({ title, color = "#4f46e5" }: { title: string; color?: string }) => (
    <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 10, margin: "20px 0 12px" }}>
      <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color, margin: 0 }}>{title}</p>
    </div>
  );
  const Row = ({ l, v, bold, color }: { l: string; v: string; bold?: boolean; color?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 11, color: "#64748b" }}>{l}</span>
      <span style={{ fontSize: bold ? 13 : 11, fontWeight: bold ? 900 : 600, color: color || "#0f172a" }}>{v}</span>
    </div>
  );
  const Chip = ({ label, color }: { label: string; color: string }) => (
    <span style={{ fontSize: 9, fontWeight: 700, color, background: color + "15", border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 8px", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{label}</span>
  );

  const headerBar: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderBottom: "2px solid #e2e8f0", paddingBottom: 10, marginBottom: 18,
  };
  const footerStyle: React.CSSProperties = {
    position: "absolute", bottom: 10, left: 14, right: 14,
    display: "flex", justifyContent: "space-between",
    borderTop: "1px solid #e2e8f0", paddingTop: 6,
    fontSize: 8, color: "#94a3b8",
  };

  const PageHeader = ({ title, page }: { title: string; page: string }) => (
    <div style={headerBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          <NexusLogo className="w-full h-full" />
        </div>
        <div>
          <p style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Nexus Invest · Rapport Fiscal 2026</p>
          <p style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", margin: 0, marginTop: 2 }}>{title}</p>
        </div>
      </div>
      <p style={{ fontSize: 9, color: "#94a3b8", margin: 0 }}>{dateStr} · Page {page}</p>
    </div>
  );

  return (
    <div className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none -z-50 print:static print:w-auto print:h-auto print:opacity-100 print:z-auto" style={{ overflow: "hidden" }}>
      <style type="text/css" media="print">{`
        @page { size: A4 portrait; margin: 0; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
        nav, aside, header, button, .sidebar-mobile { display: none !important; }
      `}</style>

      <div ref={refProp} style={{ background: "white" }}>

        {/* ══ PAGE 1 : COUVERTURE ══════════════════════════════ */}
        <div style={{ ...pageStyle, background: "#0f172a", color: "white", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 0 }}>
          <div style={{ background: "linear-gradient(90deg, #6d28d9, #4f46e5)", height: 6 }} />
          <div style={{ padding: "14mm 16mm", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <NexusLogo className="w-full h-full" />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 900, color: "white", margin: 0, letterSpacing: "-0.02em" }}>NEXUS <span style={{ color: "#818cf8" }}>INVEST</span></p>
                  <p style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0, marginTop: 4 }}>Analyse Fiscale Immobilière 2026</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>Établi le</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: "white", margin: 0, marginTop: 2 }}>{dateStr}</p>
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "28mm 0" }}>
              <div style={{ display: "inline-block", background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.4)", borderRadius: 8, padding: "5px 14px", marginBottom: 18 }}>
                <p style={{ fontSize: 10, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0, fontWeight: 700 }}>Document Client Confidentiel</p>
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.2 }}>Rapport d'Optimisation</h1>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: "#a78bfa", margin: 0, lineHeight: 1.2 }}>Fiscale Immobilière</h1>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, marginTop: 16 }}>Comparatif des régimes · Conseils personnalisés · Législation 2026</p>
            </div>

            {/* Résumé bien */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0, marginBottom: 14 }}>Bien analysé</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                {[
                  { l: "Type", v: projectType === "LOC" ? "Investissement locatif" : projectType === "RP" ? "Résidence principale" : "Résidence secondaire" },
                  { l: "Prix d'acquisition", v: fmt(price) },
                  { l: "Stratégie envisagée", v: rentalStrategy === "LMNP" ? "Meublé (LMNP)" : rentalStrategy === "NUE" ? "Location nue" : rentalStrategy || "—" },
                  { l: "Régime optimal (nom propre)", v: isLoc ? "LMNP Réel" : isRP ? "Exonéré (RP)" : "Abattements PV progressifs" },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, marginBottom: 6 }}>{item.l}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "white", margin: 0 }}>{item.v}</p>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontSize: 8, color: "#475569", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 20 }}>
              Document confidentiel préparé avec Nexus Invest · Ne constitue pas un conseil fiscal juridiquement engageant
            </p>
          </div>
          <div style={{ background: "linear-gradient(90deg, #6d28d9, #4f46e5)", height: 4 }} />
        </div>

        {/* ══ PAGE 2 : CONTEXTE & DONNÉES DU BIEN ════════════ */}
        {isLoc && (
          <>
            <PageBreak />
            <div style={pageStyle}>
              <PageHeader title="Données du Bien & Paramètres" page="2" />

              <Section title="Le Bien Immobilier" color="#6d28d9" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Acquisition</p>
                  <Row l="Prix net vendeur" v={fmt(price)} />
                  <Row l="Travaux" v={fmt(works)} />
                  <Row l="Frais de notaire" v={fmt(notaryFees)} />
                  <Row l="Coût total opération" v={fmt(totalCost)} bold />
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Exploitation Locative</p>
                  <Row l="Loyer mensuel CC" v={fmt(rent)} />
                  <Row l="Loyer annuel" v={fmt(annualRent)} bold />
                  <Row l="Charges annuelles" v={fmt(annualCharges)} />
                  <Row l="Stratégie" v={rentalStrategy === "LMNP" ? "LMNP (Meublé)" : rentalStrategy === "NUE" ? "Location nue" : "Courte durée"} />
                </div>
              </div>

              <Section title="Mécanisme de l'Amortissement LMNP" color="#6d28d9" />
              <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "16px 20px", border: "1px solid #ddd6fe", marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "#4c1d95", lineHeight: 1.7, margin: 0, marginBottom: 12 }}>
                  L'amortissement est le mécanisme le plus puissant du régime LMNP réel. Il permet de déduire chaque année la <strong>dépréciation comptable</strong> de votre bien, sans décaissement réel. Concrètement, vous réduisez votre base imposable sans débourser un centime.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { l: "Bâti (85% × 30 ans)", v: fmt(Math.round(price * 0.85 / 30)) + "/an" },
                    { l: "Travaux (15 ans)", v: fmt(Math.round(works / 15)) + "/an" },
                    { l: "Mobilier (7 ans)", v: fmt(Math.round(5000 / 7)) + "/an" },
                    { l: "TOTAL AMORT.", v: fmt(Math.round(amortissement)) + "/an" },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: "center", background: "white", borderRadius: 8, padding: "10px 8px", border: "1px solid #ede9fe" }}>
                      <p style={{ fontSize: 8, color: "#7c3aed", textTransform: "uppercase", margin: 0, marginBottom: 6, letterSpacing: "0.08em" }}>{item.l}</p>
                      <p style={{ fontSize: i === 3 ? 14 : 12, fontWeight: i === 3 ? 900 : 700, color: "#4c1d95", margin: 0 }}>{item.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Section title="Réformes Fiscales 2025-2026 à Connaître" color="#dc2626" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { n: "1", color: "#dc2626", bg: "#fef2f2", title: "Réintégration amortissements (2025)", text: "Les amortissements LMNP déduits sont désormais réintégrés dans le calcul de la plus-value à la revente. Impact : plus-value fiscale plus élevée à la sortie." },
                  { n: "2", color: "#f59e0b", bg: "#fffbeb", title: "Hausse CSG (LFSS 2026)", text: "Les prélèvements sociaux passent de 17,2% à 18,6% sur les revenus LMNP. Soit +140€/an pour 10 000€ de base imposable." },
                  { n: "3", color: "#f59e0b", bg: "#fffbeb", title: "Loi Le Meur (2024-2026)", text: "Meublés touristiques non classés : abattement micro-BIC réduit de 71% à 30%, plafond de 77 700€ à 15 000€." },
                ].map((item, i) => (
                  <div key={i} style={{ background: item.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${item.color}25` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "white" }}>{item.n}</span>
                      </div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: item.color, margin: 0 }}>{item.title}</p>
                    </div>
                    <p style={{ fontSize: 10, color: "#374151", margin: 0, lineHeight: 1.6 }}>{item.text}</p>
                  </div>
                ))}
              </div>

              <div style={footerStyle}><span>Nexus Invest · Rapport Fiscal Immobilier 2026</span><span>Page 2</span></div>
            </div>
          </>
        )}

        {/* ══ PAGE 3 : COMPARATIF RÉGIMES ═════════════════════ */}
        {isLoc && (
          <>
            <PageBreak />
            <div style={pageStyle}>
              <PageHeader title="Comparatif des Régimes Fiscaux" page="3" />

              {/* Avertissement incompatibilité — message clé */}
              <div style={{ background: "#fff7ed", borderRadius: 12, padding: "14px 18px", border: "1px solid #fed7aa", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 4, borderRadius: 4, background: "#f97316", alignSelf: "stretch", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", margin: 0, marginBottom: 6 }}>Choix structurel préalable obligatoire</p>
                  <p style={{ fontSize: 11, color: "#92400e", margin: 0, lineHeight: 1.7 }}>
                    Les régimes ci-dessous sont répartis en <strong>deux univers incompatibles</strong> : investir <strong>en nom propre</strong> (personne physique) ou <strong>via une société</strong> (personne morale). Ce choix se fait <em>avant l'achat</em> et détermine l'ensemble de votre fiscalité. Il est impossible de cumuler LMNP et SCI à l'IS sur le même bien.
                  </p>
                </div>
              </div>

              {/* ── BLOC 1 : NOM PROPRE ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ background: "#4f46e5", borderRadius: 8, padding: "4px 12px" }}>
                    <p style={{ fontSize: 9, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Voie A — Nom propre (personne physique)</p>
                  </div>
                  <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>Vous achetez directement · Statut LMNP possible</p>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#4f46e5" }}>
                        {["Régime", "Base imposable", "IR (30%)", "Prél. sociaux", "Total impôt/an", "Cashflow net/mois"].map((h, i) => (
                          <th key={i} style={{ padding: "8px 10px", fontSize: 8, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          regime: "LMNP Réel (amortissement)",
                          sub: isDeficit ? `Déficit BIC : ${fmt(Math.abs(Math.round(reelResultat)))} → reportable 10 ans` : "Charges + intérêts + amortissement déduits",
                          base: reelBase, ir: reelIR, ps: reelPS, total: reelTotal,
                          cf: (annualRent - annualCharges - monthlyPayment * 12 - reelTotal) / 12,
                          best: true,
                        },
                        {
                          regime: "LMNP Micro-BIC (abatt. 50%)",
                          sub: "Forfait simple · aucune comptabilité requise",
                          base: microBase, ir: microIR, ps: microPS, total: microTotal,
                          cf: (annualRent - annualCharges - monthlyPayment * 12 - microTotal) / 12,
                          best: false,
                        },
                        {
                          regime: "Location nue Réel foncier",
                          sub: deficitFoncier > 0 ? `Déficit foncier ${fmt(deficitFoncier)} imputable sur revenu global (max 10 700€)` : "Charges + intérêts déduits · pas d'amortissement",
                          base: nueReelBase, ir: nueReelBase * TMI, ps: nueReelBase * PS_FONCIER, total: nueReelTotal,
                          cf: (annualRent - annualCharges - monthlyPayment * 12 - nueReelTotal) / 12,
                          best: false,
                        },
                        {
                          regime: "Location nue Micro-foncier (30%)",
                          sub: "Plafond 15 000€/an · bail 3 ans",
                          base: nueMicroBase, ir: nueMicroBase * TMI, ps: nueMicroBase * PS_FONCIER, total: nueMicroTotal,
                          cf: (annualRent - annualCharges - monthlyPayment * 12 - nueMicroTotal) / 12,
                          best: false,
                        },
                      ].map((row, i) => (
                        <tr key={i} style={{ background: row.best ? "#eff6ff" : i % 2 === 0 ? "white" : "#f8fafc" }}>
                          <td style={{ padding: "8px 10px" }}>
                            <p style={{ fontSize: 11, fontWeight: row.best ? 700 : 500, color: row.best ? "#1d4ed8" : "#374151", margin: 0 }}>{row.regime}{row.best ? " ⭐" : ""}</p>
                            <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, marginTop: 1 }}>{row.sub}</p>
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 11, textAlign: "right" }}>{fmt(Math.round(row.base))}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11, textAlign: "right", color: "#ef4444" }}>{fmt(Math.round(row.ir))}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11, textAlign: "right", color: "#f59e0b" }}>{fmt(Math.round(row.ps))}</td>
                          <td style={{ padding: "8px 10px", fontSize: 12, textAlign: "right", fontWeight: 700, color: row.total < 100 ? "#10b981" : "#ef4444" }}>{fmt(Math.round(row.total))}</td>
                          <td style={{ padding: "8px 10px", fontSize: 12, textAlign: "right", fontWeight: 700, color: row.cf >= 0 ? "#10b981" : "#ef4444" }}>{row.cf >= 0 ? "+" : ""}{fmt(Math.round(row.cf))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── BLOC 2 : EN SOCIÉTÉ ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ background: "#7c3aed", borderRadius: 8, padding: "4px 12px" }}>
                    <p style={{ fontSize: 9, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Voie B — En société (personne morale)</p>
                  </div>
                  <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>Création d'une SCI ou SARL · Formalisme accru</p>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#7c3aed" }}>
                        {["Structure", "Impôt société", "Sur dividendes", "Total fiscal/an", "Cashflow net/mois", "Revente"].map((h, i) => (
                          <th key={i} style={{ padding: "8px 10px", fontSize: 8, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          structure: "SCI à l'IS",
                          sub: "Amortissement libre · IS 15% ≤ 42 500€ puis 25%",
                          is: sciIsTotal,
                          flatTax: sciIsTotal > 0 ? 0 : 0, // dividendes flat tax 30% si distribués
                          total: sciIsTotal,
                          cf: (annualRent - annualCharges - monthlyPayment * 12 - sciIsTotal) / 12,
                          revente: "IS + Flat tax 30%",
                        },
                        {
                          structure: "SCI à l'IR (location nue)",
                          sub: "Transparence fiscale · revenus fonciers remontés aux associés",
                          is: 0,
                          flatTax: nueReelTotal,
                          total: nueReelTotal,
                          cf: (annualRent - annualCharges - monthlyPayment * 12 - nueReelTotal) / 12,
                          revente: "✓ PV particuliers (22/30 ans)",
                        },
                        {
                          structure: "SARL de famille (meublé BIC IR)",
                          sub: "LMNP à plusieurs · amortissement · transparence fiscale",
                          is: 0,
                          flatTax: reelTotal,
                          total: reelTotal,
                          cf: (annualRent - annualCharges - monthlyPayment * 12 - reelTotal) / 12,
                          revente: "Amortissements réintégrés PV",
                        },
                      ].map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                          <td style={{ padding: "8px 10px" }}>
                            <p style={{ fontSize: 11, fontWeight: 500, color: "#374151", margin: 0 }}>{row.structure}</p>
                            <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, marginTop: 1 }}>{row.sub}</p>
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 11, textAlign: "right", color: "#ef4444" }}>{fmt(Math.round(row.is))}</td>
                          <td style={{ padding: "8px 10px", fontSize: 10, textAlign: "right", color: "#f59e0b" }}>+30% si distrib.</td>
                          <td style={{ padding: "8px 10px", fontSize: 12, textAlign: "right", fontWeight: 700, color: row.total < 100 ? "#10b981" : "#ef4444" }}>{fmt(Math.round(row.total))}</td>
                          <td style={{ padding: "8px 10px", fontSize: 12, textAlign: "right", fontWeight: 700, color: row.cf >= 0 ? "#10b981" : "#ef4444" }}>{row.cf >= 0 ? "+" : ""}{fmt(Math.round(row.cf))}</td>
                          <td style={{ padding: "8px 10px", fontSize: 10, textAlign: "right", color: "#64748b" }}>{row.revente}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, marginTop: 8, lineHeight: 1.6 }}>
                  <strong style={{ color: "#6d28d9" }}>Note SCI à l'IS :</strong> l'impôt IS (15-25%) est attractif en phase de détention si vous ne distribuez pas les dividendes. Mais à la revente, la plus-value est calculée après réintégration des amortissements et soumise à IS + Flat Tax 30% sur les dividendes — ce qui peut rendre la sortie très coûteuse. À réserver aux patrimoines importants avec horizon de détention très long.
                </p>
              </div>

              {/* Synthèse recommandation */}
              <div style={{ background: "#eff6ff", borderRadius: 12, padding: "14px 18px", border: "1px solid #bfdbfe" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>Recommandation pour ce projet</p>
                <p style={{ fontSize: 11, color: "#1e40af", margin: 0, lineHeight: 1.7 }}>
                  En nom propre, le <strong>LMNP Réel</strong> est optimal : {isDeficit ? `résultat déficitaire de ${fmt(Math.abs(Math.round(reelResultat)))} → 0€ d'impôt sur vos loyers` : `base imposable réduite à ${fmt(Math.round(reelBase))}, soit ${fmt(Math.round(reelTotal))}/an`}.
                  {" "}Économie estimée vs Micro-BIC : <strong>{fmt(Math.round(microTotal - reelTotal))}/an</strong> soit <strong>{fmt(Math.round((microTotal - reelTotal) * 20))} sur 20 ans</strong>.
                  {" "}La Voie B (SCI IS) peut être pertinente si vous avez plusieurs biens, un TMI ≥ 41% et n'avez pas besoin de distribuer les loyers immédiatement.
                </p>
              </div>

              <div style={footerStyle}><span>Nexus Invest · Rapport Fiscal Immobilier 2026</span><span>Page 3</span></div>
            </div>
          </>
        )}

        {/* ══ PAGE 4 : PLUS-VALUE & TRANSMISSION ══════════════ */}
        <PageBreak />
        <div style={pageStyle}>
          <PageHeader title="Plus-Value & Transmission" page={isLoc ? "4" : "2"} />

          {isRP ? (
            <>
              <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: 14, padding: "20px 24px", color: "white", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.05em" }}>RP</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Avantage fiscal exceptionnel</p>
                    <p style={{ fontSize: 18, fontWeight: 900, margin: 0, marginTop: 4 }}>Exonération totale de plus-value</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", margin: 0, marginTop: 4 }}>La résidence principale bénéficie d'une exonération à 100% de l'IR et des PS sur la plus-value, sans condition de durée de détention.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Section title={`Barème Plus-Value ${isLoc ? "LMNP (avec réintégration amortissements)" : "Résidence Secondaire"}`} color="#0ea5e9" />
              <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#0f172a" }}>
                      {["Durée détention", "Abatt. IR", "Abatt. PS", "IR net (19%)", "PS nettes (18,6%)", "Taux effectif total"].map((h, i) => (
                        <th key={i} style={{ padding: "9px 10px", fontSize: 8.5, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 5, 8, 10, 15, 20, 22, 25, 30].map((y, i) => {
                      const aIR = pvAbattIR(y);
                      const aPS = pvAbattPS(y);
                      const irNet = 0.19 * (1 - aIR);
                      const psNet = PS_PV * (1 - aPS);
                      const totalRate = irNet + psNet;
                      return (
                        <tr key={i} style={{ background: totalRate === 0 ? "#f0fdf4" : i % 2 === 0 ? "white" : "#f8fafc" }}>
                          <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: y === 22 || y === 30 ? 700 : 400, color: "#1e293b" }}>{y} ans {y === 22 ? "→ IR exonéré" : y === 30 ? "→ Exonération totale" : ""}</td>
                          <td style={{ padding: "7px 10px", fontSize: 11, textAlign: "right", color: "#10b981" }}>{fmtPct(aIR * 100)}</td>
                          <td style={{ padding: "7px 10px", fontSize: 11, textAlign: "right", color: "#10b981" }}>{fmtPct(aPS * 100)}</td>
                          <td style={{ padding: "7px 10px", fontSize: 11, textAlign: "right", color: irNet === 0 ? "#10b981" : "#ef4444" }}>{fmtPct(irNet * 100)}</td>
                          <td style={{ padding: "7px 10px", fontSize: 11, textAlign: "right", color: psNet === 0 ? "#10b981" : "#f59e0b" }}>{fmtPct(psNet * 100)}</td>
                          <td style={{ padding: "7px 10px", fontSize: 12, textAlign: "right", fontWeight: 700, color: totalRate === 0 ? "#10b981" : "#374151" }}>{totalRate === 0 ? "0% ✓" : fmtPct(totalRate * 100)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <Section title="Stratégies de Transmission Patrimoniale" color="#8b5cf6" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              {
                num: "01", color: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe",
                title: "Donation progressive (abattement rechargeable)",
                text: "Chaque parent peut donner 100 000€ par enfant tous les 15 ans en franchise de droits. Pour transmettre un bien de " + fmt(price) + ", une SCI permet de fragmenter la donation en parts sociales successives.",
              },
              {
                num: "02", color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd",
                title: "SCI à l'IR + démembrement",
                text: "En donnant la nue-propriété des parts de SCI à vos enfants tout en conservant l'usufruit, la valorisation fiscale de la nue-propriété est réduite (50-70% selon votre âge). Au décès, la pleine propriété se reconstitue sans droits.",
              },
              {
                num: "03", color: "#10b981", bg: "#f0fdf4", border: "#a7f3d0",
                title: isRP ? "Abattement RP en succession (+20%)" : "Assurance-vie complémentaire",
                text: isRP
                  ? "La résidence principale bénéficie d'un abattement de 20% supplémentaire pour le calcul des droits de succession, à condition que le conjoint survivant ou les enfants y habitent au moment du décès."
                  : "L'assurance-vie permet de transmettre jusqu'à 152 500€ par bénéficiaire hors succession (versements avant 70 ans). C'est le complément idéal pour financer les droits de succession des héritiers.",
              },
              {
                num: "04", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
                title: "Abattements en ligne directe (2026)",
                text: "Barème succession enfant : 100 000€ abattement, puis 5% jusqu'à 8 072€, 10% jusqu'à 12 109€, 15% jusqu'à 15 932€, 20% jusqu'à 552 324€, puis 30%-45%. Planifiez la transmission de votre vivant.",
              },
            ].map((item, i) => (
              <div key={i} style={{ background: item.bg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${item.border}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: "white" }}>{item.num}</span>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: item.color, margin: 0, lineHeight: 1.3 }}>{item.title}</p>
                </div>
                <p style={{ fontSize: 10, color: "#374151", margin: 0, lineHeight: 1.7 }}>{item.text}</p>
              </div>
            ))}
          </div>

          <div style={footerStyle}><span>Nexus Invest · Rapport Fiscal Immobilier 2026</span><span>Page {isLoc ? 4 : 2}</span></div>
        </div>

        {/* ══ PAGE FINALE : RECOMMANDATIONS ═══════════════════ */}
        <PageBreak />
        <div style={pageStyle}>
          <PageHeader title="Recommandations & Synthèse" page="finale" />

          {/* Recommandation principale */}
          <div style={{ background: "linear-gradient(135deg, #4f46e5, #1d4ed8)", borderRadius: 14, padding: "20px 24px", color: "white", marginBottom: 12 }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Recommandation Nexus Invest · En nom propre</p>
            <p style={{ fontSize: 16, fontWeight: 900, margin: 0, marginTop: 6 }}>
              {isLoc
                ? `Optez pour le ${bestNomPropre.name} — économie estimée de ${fmt(Math.round(microTotal - bestNomPropre.total))}/an vs Micro-BIC`
                : isRP
                  ? "Profitez de l'exonération totale RP — aucune optimisation fiscale nécessaire à la revente"
                  : "Maximisez la durée de détention pour bénéficier des abattements progressifs de plus-value"
              }
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", margin: 0, marginTop: 8, lineHeight: 1.7 }}>
              {isLoc && <>
                En <strong>nom propre</strong>, le <strong>{bestNomPropre.name}</strong> est le régime optimal : impôt annuel estimé de <strong>{fmt(Math.round(bestNomPropre.total))}</strong> contre {fmt(Math.round(microTotal))} en Micro-BIC.
                Sur 20 ans, cette optimisation représente une économie potentielle de <strong>{fmt(Math.round((microTotal - bestNomPropre.total) * 20))}</strong>.
                {isDeficit ? ` Le résultat déficitaire (${fmt(Math.abs(Math.round(reelResultat)))}) est reportable sur les bénéfices BIC des 10 prochaines années.` : ""}
              </>}
              {isRP && "La résidence principale est le régime fiscal le plus avantageux en France : exonération totale de plus-value, abattement de 20% en succession."}
              {projectType === "RS" && "Pour la résidence secondaire, la durée de détention est le principal levier. Après 22 ans, l'IR est nul ; après 30 ans, les PS aussi."}
            </p>
          </div>

          {/* Mention conditionnelle SCI IS */}
          {isLoc && (
            <div style={{ background: "#faf5ff", borderRadius: 12, padding: "12px 18px", border: "1px solid #ddd6fe", marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6d28d9", marginBottom: 6 }}>Option société (Voie B) — à envisager si votre situation évolue</p>
              <p style={{ fontSize: 10, color: "#374151", margin: 0, lineHeight: 1.7 }}>
                La <strong>SCI à l'IS</strong> ou la <strong>SARL de famille</strong> peuvent devenir pertinentes si : votre <strong>TMI dépasse 41%</strong>, vous possédez <strong>plusieurs biens</strong>, ou vous n'avez pas besoin de distribuer les loyers immédiatement.
                Ces structures nécessitent un <strong>choix préalable à l'achat</strong> et sont incompatibles avec le statut LMNP. Un changement de structure après acquisition implique une revente fictive du bien.
              </p>
            </div>
          )}

          <Section title="Plan d'Action Recommandé" color="#10b981" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              isLoc && {
                step: "01", color: "#4f46e5",
                title: "Opter pour le régime réel LMNP",
                text: "Optez pour le régime réel simplifié BIC avant le 1er février de l'année suivant votre première location. Faites appel à un expert-comptable spécialisé LMNP (600-900€/an, déductible).",
              },
              isLoc && rentalStrategy !== "NUE" && {
                step: "02", color: "#0ea5e9",
                title: "Classer votre bien (si saisonnier)",
                text: "En location saisonnière, le classement meublé de tourisme (300-500€ via Atout France) permet de rester à 50% d'abattement micro-BIC au lieu de 30% suite à la loi Le Meur.",
              },
              {
                step: isLoc ? "03" : "01", color: "#8b5cf6",
                title: "Anticiper la transmission (donations)",
                text: `L'abattement de 100 000€ par enfant se recharge tous les 15 ans. Pour un bien de ${fmt(price)}, planifier des donations progressives peut économiser plusieurs dizaines de milliers d'euros de droits de succession.`,
              },
              {
                step: isLoc ? "04" : "02", color: "#10b981",
                title: "Consulter un CGP ou expert-comptable",
                text: "Ce rapport est à visée pédagogique. Pour toute décision engageante, consultez un Conseiller en Gestion de Patrimoine ou un expert-comptable spécialisé immobilier.",
              },
            ].filter(Boolean).map((item: any, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: "white" }}>{item.step}</span>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", margin: 0, marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 10, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 18px", border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Avertissement légal</p>
            <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, lineHeight: 1.8 }}>
              Ce rapport est généré par Nexus Invest à titre informatif et pédagogique uniquement. Il ne constitue pas un conseil fiscal ou juridique engageant. Les calculs sont basés sur les données saisies et la législation en vigueur en {new Date().getFullYear()}. Les règles fiscales évoluent régulièrement. Consultez un expert-comptable agréé ou un conseiller en gestion de patrimoine (CGP) avant toute décision d'investissement ou de choix de régime fiscal. Les projections présentées ne garantissent pas de performance future.
            </p>
          </div>

          <div style={footerStyle}><span>Nexus Invest · Rapport Fiscal Immobilier 2026 · Document confidentiel</span><span>Page finale</span></div>
        </div>

      </div>
    </div>
  );
}