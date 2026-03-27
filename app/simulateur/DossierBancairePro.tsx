"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Home, Landmark, PiggyBank, BarChart3, Shield, FileText, Scale } from "lucide-react";
import { NexusLogo } from "@/components/NexusLogo";

// ─── Helpers ───────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtK = (v: number) => `${Math.round(v / 1000)}k€`;

// ─── Calculs amortissement ──────────────────────────────────
function buildSchedule(loanAmount: number, annualRate: number, durationYears: number) {
  const mRate = annualRate / 100 / 12;
  const nMonths = durationYears * 12;
  if (loanAmount <= 0 || mRate <= 0) return [];
  const mensu = loanAmount * (mRate / (1 - Math.pow(1 + mRate, -nMonths)));
  let remaining = loanAmount;
  const rows = [];
  for (let y = 1; y <= durationYears; y++) {
    let interestYear = 0, capitalYear = 0;
    for (let m = 0; m < 12; m++) {
      const interest = remaining * mRate;
      const capital = mensu - interest;
      interestYear += interest;
      capitalYear += capital;
      remaining = Math.max(0, remaining - capital);
    }
    rows.push({
      year: y,
      mensualite: Math.round(mensu),
      capital: Math.round(capitalYear),
      interets: Math.round(interestYear),
      restant: Math.round(remaining),
      cumulInterets: 0,
    });
  }
  // cumul intérêts
  let cumul = 0;
  rows.forEach(r => { cumul += r.interets; r.cumulInterets = Math.round(cumul); });
  return rows;
}

// ─── Calcul fiscal — TOUS les régimes, meilleur déterminé dynamiquement ────
function calcFiscalRegimes(
  annualRent: number,
  annualCharges: number,
  yearOneInterest: number,
  amortissement: number,
  rentalStrategy: string
) {
  const PS_LMNP = 0.186;
  const PS_NUE  = 0.172;
  const TMI     = 0.30;

  // 1. LMNP Micro-BIC 50%
  const microBase = Math.max(0, annualRent * 0.50);
  const microTotal = microBase * (TMI + PS_LMNP);

  // 2. LMNP Réel
  const reelBase = Math.max(0, annualRent - annualCharges - yearOneInterest - amortissement);
  const reelTotal = reelBase * (TMI + PS_LMNP);
  const reelDeficit = (annualRent - annualCharges - yearOneInterest - amortissement) < 0;

  // 3. Location nue micro-foncier 30%
  const nueMicroBase = Math.max(0, annualRent * 0.70);
  const nueMicroTotal = nueMicroBase * (TMI + PS_NUE);

  // 4. Location nue réel foncier
  const nueReelBase = Math.max(0, annualRent - annualCharges - yearOneInterest);
  const nueReelTotal = nueReelBase * (TMI + PS_NUE);

  const all = [
    { key: "LMNP_MICRO",  regime: "LMNP Micro-BIC (50%)",        base: microBase,    total: microTotal,    compatible: rentalStrategy !== "NUE" },
    { key: "LMNP_REEL",   regime: "LMNP Réel (amortissement)",   base: reelBase,     total: reelTotal,     compatible: rentalStrategy !== "NUE",  deficit: reelDeficit },
    { key: "NUE_MICRO",   regime: "Location nue micro (30%)",    base: nueMicroBase, total: nueMicroTotal, compatible: rentalStrategy === "NUE" },
    { key: "NUE_REEL",    regime: "Location nue réel foncier",   base: nueReelBase,  total: nueReelTotal,  compatible: rentalStrategy === "NUE" },
  ];

  // Meilleur régime parmi ceux compatibles avec la stratégie choisie
  const compatibles = all.filter(r => r.compatible);
  const best = compatibles.reduce((a, b) => a.total < b.total ? a : b);

  return { all, best, reelDeficit, nueReelBase };
}

// ─── Types ─────────────────────────────────────────────────
interface DossierData {
  name: string;
  price: number; works: number; notaryFees: number; notaryRate: number;
  apport: number; duration: number; rate: number;
  monthlyPayment: number; totalCreditCost: number;
  revenue: number; credits: number;
  rent: number; charges: number; tax: number;
  cashflowNetImpots: number; yieldNet: number;
  projectType: "LOC" | "RP" | "RS";
  rentalStrategy: string;
  date: string;
}

interface Props {
  data: DossierData | null;
  refProp: React.RefObject<HTMLDivElement | null>;
}

// ─── Sous-composants PDF ────────────────────────────────────
const PageBreak = () => <div style={{ pageBreakBefore: "always" }} />;

const SectionTitle = ({ children, color = "#4f46e5" }: { children: React.ReactNode; color?: string }) => (
  <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 12, marginBottom: 16, marginTop: 24 }}>
    <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color, margin: 0 }}>{children}</p>
  </div>
);

const DataRow = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
    <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
    <span style={{ fontSize: bold ? 14 : 12, fontWeight: bold ? 900 : 600, color: color || "#0f172a" }}>{value}</span>
  </div>
);

const KpiCard = ({ label, value, sub, bg, color }: { label: string; value: string; sub?: string; bg: string; color: string }) => (
  <div style={{ flex: 1, background: bg, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color, marginBottom: 6 }}>{label}</p>
    <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{value}</p>
    {sub && <p style={{ fontSize: 10, color, opacity: 0.7, marginTop: 4 }}>{sub}</p>}
  </div>
);

const RiskBadge = ({ level, label }: { level: "LOW" | "MED" | "HIGH"; label: string }) => {
  const cfg = { LOW: { bg: "#f0fdf4", color: "#16a34a", text: "Faible" }, MED: { bg: "#fffbeb", color: "#d97706", text: "Modéré" }, HIGH: { bg: "#fef2f2", color: "#dc2626", text: "Élevé" } };
  const c = cfg[level];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: c.bg, borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: "white", padding: "2px 8px", borderRadius: 20 }}>{c.text}</span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function DossierBancairePro({ data, refProp }: Props) {
  const [dateStr, setDateStr] = useState("");
  useEffect(() => { setDateStr(new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })); }, []);

  if (!data) return null;

  const d = data;
  const isLoc = d.projectType === "LOC";
  const isRP = d.projectType === "RP";
  const totalCost = d.price + d.works + d.notaryFees;
  const loanAmount = Math.max(0, totalCost - d.apport);
  const apportPct = totalCost > 0 ? (d.apport / totalCost) * 100 : 0;
  const endettementAvant = d.revenue > 0 ? (d.credits / d.revenue) * 100 : 0;
  const endettementApres = d.revenue > 0 ? ((d.credits + d.monthlyPayment) / d.revenue) * 100 : 0;
  const annualRent = (d.rent || 0) * 12;
  const annualCharges = ((d.charges || 0) * 12) + (d.tax || 0);

  // Amortissement
  const schedule = buildSchedule(loanAmount, d.rate, d.duration);
  const y1interest = schedule[0]?.interets || 0;

  // Amortissement comptable LMNP
  const bati = d.price * 0.85;
  const amoComptable = (bati / 30) + (d.works / 15) + (5000 / 7) + (d.notaryFees / 25);

  // Fiscal — calcul dynamique, best déterminé par le vrai minimum
  const fiscalData = isLoc ? calcFiscalRegimes(annualRent, annualCharges, y1interest, amoComptable, d.rentalStrategy) : null;
  const best = fiscalData?.best || null;

  // Projections 20 ans
  const buildProjections = () => {
    const rows = [];
    const appreciation = 0.02;
    let cashflowCumul = 0;
    for (let y = 1; y <= 20; y++) {
      const valeur = d.price * Math.pow(1 + appreciation, y);
      const sched = schedule[y - 1];
      const restant = sched?.restant || 0;
      const patrimoineNet = valeur - restant;
      if (isLoc) cashflowCumul += (d.cashflowNetImpots * 12);
      rows.push({ year: y, valeur: Math.round(valeur), restant, patrimoineNet: Math.round(patrimoineNet), cashflowCumul: Math.round(cashflowCumul) });
    }
    return rows;
  };
  const projections = buildProjections();
  const proj10 = projections[9];
  const proj20 = projections[19];

  // GRI = Gain Résiduel Immobilier (patrimoine net à 20 ans)
  const totalInterets = schedule.reduce((s, r) => s + r.interets, 0);

  const typeLabel = isLoc ? "Investissement Locatif" : isRP ? "Résidence Principale" : "Résidence Secondaire";

  // ── STYLE COMMUN ──────────────────────────────────────────
  const pageStyle: React.CSSProperties = {
    width: "210mm", minHeight: "297mm", background: "white", color: "#0f172a",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: "14mm 14mm 12mm 14mm", boxSizing: "border-box", position: "relative",
  };
  const headerBarStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderBottom: "2px solid #e2e8f0", paddingBottom: 10, marginBottom: 20,
  };
  const footerStyle: React.CSSProperties = {
    position: "absolute", bottom: 10, left: 14, right: 14,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderTop: "1px solid #e2e8f0", paddingTop: 6,
  };
  const smallGray = { fontSize: 9, color: "#94a3b8", fontWeight: 500 };

  const PageHeader = ({ page, title }: { page: string; title: string }) => (
    <div style={headerBarStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          <NexusLogo className="w-full h-full" />
        </div>
        <div>
          <p style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Nexus Invest — Dossier de Financement</p>
          <p style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", margin: 0, marginTop: 2 }}>{title}</p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", margin: 0 }}>{d.name}</p>
        <p style={{ ...smallGray, margin: 0, marginTop: 2 }}>{dateStr} · Page {page}</p>
      </div>
    </div>
  );

  const PageFooter = ({ page }: { page: number }) => (
    <div style={footerStyle}>
      <p style={smallGray}>Nexus Invest — Document confidentiel · Ne constitue pas une offre de prêt</p>
      <p style={smallGray}>{page} / {isLoc ? 8 : 6}</p>
    </div>
  );

  return (
    <div
      className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none -z-50 print:static print:w-auto print:h-auto print:opacity-100 print:z-auto"
      style={{ overflow: "hidden" }}
    >
      <style type="text/css" media="print">{`
        @page { size: A4 portrait; margin: 0; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
        nav, aside, header, button, .sidebar-mobile { display: none !important; }
      `}</style>

      <div ref={refProp} style={{ background: "white" }}>

        {/* ══ PAGE 1 : COUVERTURE ══════════════════════════════ */}
        <div style={{ ...pageStyle, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0f172a", color: "white", padding: 0, overflow: "hidden" }}>
          {/* Bande supérieure indigo */}
          <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", height: 8, width: "100%" }} />

          <div style={{ padding: "14mm 16mm", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Logo + date */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, flexShrink: 0 }}>
                  <NexusLogo className="w-full h-full" />
                </div>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: "white", letterSpacing: "-0.03em", margin: 0 }}>NEXUS <span style={{ color: "#818cf8" }}>INVEST</span></p>
                  <p style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0, marginTop: 4 }}>Dossier de Financement Bancaire</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>Document établi le</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "white", margin: 0, marginTop: 2 }}>{dateStr}</p>
              </div>
            </div>

            {/* Titre principal */}
            <div style={{ textAlign: "center", padding: "30mm 0" }}>
              <div style={{ display: "inline-block", background: "rgba(79,70,229,0.15)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, padding: "6px 16px", marginBottom: 20 }}>
                <p style={{ fontSize: 10, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0, fontWeight: 700 }}>{typeLabel}</p>
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{d.name}</h1>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, marginTop: 12 }}>Préparé pour présentation bancaire</p>
            </div>

            {/* 3 KPIs couverture */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Coût total projet", value: fmt(totalCost), color: "#818cf8" },
                { label: "Apport personnel", value: fmt(d.apport), color: "#34d399" },
                { label: isLoc ? "Cashflow net/mois" : "Mensualité", value: isLoc ? `${Math.round(d.cashflowNetImpots) > 0 ? "+" : ""}${Math.round(d.cashflowNetImpots)}€` : fmt(d.monthlyPayment), color: isLoc && d.cashflowNetImpots > 0 ? "#34d399" : "#f87171" },
              ].map((kpi, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
                  <p style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0, marginBottom: 8 }}>{kpi.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 900, color: kpi.color, margin: 0 }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Mention confidentiel */}
            <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
              <p style={{ fontSize: 9, color: "#475569", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>🔒 Document strictement confidentiel · Ne constitue pas une offre de prêt</p>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", height: 4, width: "100%" }} />
        </div>

        {/* ══ PAGE 2 : PROFIL EMPRUNTEUR ══════════════════════ */}
        <PageBreak />
        <div style={pageStyle}>
          <PageHeader page="2/8" title="Profil de l'Emprunteur" />

          <SectionTitle color="#4f46e5">Situation Financière Personnelle</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Revenus</p>
              <DataRow label="Revenu net mensuel" value={fmt(d.revenue)} bold />
              <DataRow label="Revenu net annuel" value={fmt(d.revenue * 12)} />
              <DataRow label="Crédits en cours / mois" value={fmt(d.credits)} />
              <DataRow label="Revenu disponible / mois" value={fmt(d.revenue - d.credits)} bold />
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Apport & Épargne</p>
              <DataRow label="Apport personnel" value={fmt(d.apport)} bold />
              <DataRow label="Part apport / projet" value={`${apportPct.toFixed(1)}%`} />
              <DataRow label="Épargne résiduelle recommandée" value={fmt(d.apport * 0.1)} />
              <DataRow label="Apport net engagé" value={fmt(d.apport * 0.9)} bold />
            </div>
          </div>

          <SectionTitle color="#4f46e5">Analyse du Taux d'Endettement</SectionTitle>
          {/* Visualisation endettement */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px 24px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>Taux d'endettement <strong>avant</strong> acquisition</p>
                <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(endettementAvant, 100)}%`, background: endettementAvant < 33 ? "#10b981" : "#f59e0b", borderRadius: 4 }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, color: endettementAvant < 33 ? "#10b981" : "#f59e0b", margin: 0, marginTop: 6 }}>{fmtPct(endettementAvant)}</p>
                <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>Seuil légal HCSF : 35%</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>Taux d'endettement <strong>après</strong> acquisition</p>
                <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(endettementApres, 100)}%`, background: endettementApres < 35 ? "#10b981" : "#ef4444", borderRadius: 4 }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, color: endettementApres < 35 ? "#10b981" : "#ef4444", margin: 0, marginTop: 6 }}>{fmtPct(endettementApres)}</p>
                <p style={{ fontSize: 10, color: endettementApres < 35 ? "#10b981" : "#ef4444", margin: 0, fontWeight: 600 }}>{endettementApres < 35 ? "✓ Conforme HCSF" : "⚠ Dépassement du seuil réglementaire"}</p>
              </div>
            </div>
            {isLoc && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#ecfdf5", borderRadius: 8, border: "1px solid #a7f3d0" }}>
                <p style={{ fontSize: 11, color: "#065f46", margin: 0 }}>
                  💡 <strong>Argument banque :</strong> En investissement locatif, certaines banques prennent en compte 70% des loyers perçus pour calculer le taux d'endettement réel.
                  Loyer pondéré : <strong>{fmt(annualRent * 0.7 / 12)}/mois</strong> → Endettement effectif : <strong>{fmtPct(Math.max(0, ((d.credits + d.monthlyPayment - annualRent * 0.7 / 12) / d.revenue) * 100))}</strong>
                </p>
              </div>
            )}
          </div>

          <SectionTitle color="#4f46e5">Reste à Vivre</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <KpiCard label="Reste à vivre / mois" value={fmt(d.revenue - d.credits - d.monthlyPayment)} bg="#f0fdf4" color="#15803d" />
            <KpiCard label="Mensualité / revenu" value={fmtPct((d.monthlyPayment / d.revenue) * 100)} bg="#eff6ff" color="#1d4ed8" />
            <KpiCard label="Revenu annuel" value={fmt(d.revenue * 12)} bg="#faf5ff" color="#7c3aed" />
          </div>

          <PageFooter page={2} />
        </div>

        {/* ══ PAGE 3 : PLAN DE FINANCEMENT ════════════════════ */}
        <PageBreak />
        <div style={pageStyle}>
          <PageHeader page="3/8" title="Plan de Financement" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <SectionTitle color="#4f46e5">L'Acquisition</SectionTitle>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
                <DataRow label="Prix net vendeur" value={fmt(d.price)} />
                <DataRow label="Travaux estimés" value={fmt(d.works)} />
                <DataRow label={`Frais de notaire (${d.notaryRate}%)`} value={fmt(d.notaryFees)} />
                <div style={{ borderTop: "2px solid #e2e8f0", marginTop: 8, paddingTop: 8 }}>
                  <DataRow label="COÛT TOTAL OPÉRATION" value={fmt(totalCost)} bold />
                </div>
              </div>

              {/* Répartition visuelle */}
              <div style={{ marginTop: 12, background: "#f8fafc", borderRadius: 12, padding: "14px 18px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Décomposition du coût</p>
                {[
                  { label: "Prix du bien", value: d.price, color: "#4f46e5" },
                  { label: "Travaux", value: d.works, color: "#8b5cf6" },
                  { label: "Frais de notaire", value: d.notaryFees, color: "#a78bfa" },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: "#64748b" }}>{item.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#1e293b" }}>{fmtPct((item.value / totalCost) * 100)}</span>
                    </div>
                    <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${(item.value / totalCost) * 100}%`, background: item.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle color="#10b981">Le Financement</SectionTitle>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
                <DataRow label="Apport personnel" value={fmt(d.apport)} />
                <DataRow label={`Part apport (${fmtPct(apportPct)})`} value={`${fmtPct(apportPct)} du total`} />
                <DataRow label="Emprunt sollicité" value={fmt(loanAmount)} bold />
                <div style={{ borderTop: "2px solid #e2e8f0", marginTop: 8, paddingTop: 8 }}>
                  <DataRow label="Durée" value={`${d.duration} ans`} />
                  <DataRow label="Taux fixe" value={fmtPct(d.rate)} />
                  <DataRow label="MENSUALITÉ HORS ASSURANCE" value={fmt(d.monthlyPayment)} bold />
                </div>
              </div>

              <div style={{ marginTop: 12, background: "#f8fafc", borderRadius: 12, padding: "14px 18px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Coût total du crédit</p>
                <DataRow label="Capital emprunté" value={fmt(loanAmount)} />
                <DataRow label="Total intérêts versés" value={fmt(totalInterets)} />
                <DataRow label="Coût assurance estimé (0.25%/an)" value={fmt(loanAmount * 0.0025 * d.duration)} />
                <div style={{ borderTop: "2px solid #e2e8f0", marginTop: 8, paddingTop: 8 }}>
                  <DataRow label="COÛT TOTAL CRÉDIT" value={fmt(totalInterets + loanAmount * 0.0025 * d.duration)} bold />
                </div>
              </div>
            </div>
          </div>

          <SectionTitle color="#4f46e5">Synthèse Financière</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <KpiCard label="Apport" value={fmt(d.apport)} sub={fmtPct(apportPct)} bg="#eff6ff" color="#1d4ed8" />
            <KpiCard label="Emprunt" value={fmtK(loanAmount)} sub={fmtPct(100 - apportPct)} bg="#f5f3ff" color="#6d28d9" />
            <KpiCard label="Mensualité" value={fmt(d.monthlyPayment)} sub="hors assurance" bg="#fdf4ff" color="#9333ea" />
            <KpiCard label="Coût crédit" value={fmtK(totalInterets)} sub="intérêts totaux" bg="#fff7ed" color="#c2410c" />
          </div>

          <PageFooter page={3} />
        </div>

        {/* ══ PAGE 4 : RENTABILITÉ LOCATIVE (LOC uniquement) ══ */}
        {isLoc && (
          <>
            <PageBreak />
            <div style={pageStyle}>
              <PageHeader page="4/8" title="Analyse de Rentabilité Locative" />

              <SectionTitle color="#10b981">Flux Financiers Locatifs</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Recettes</p>
                  <DataRow label="Loyer mensuel CC" value={fmt(d.rent)} />
                  <DataRow label="Loyer annuel" value={fmt(annualRent)} bold />
                  <DataRow label="Loyer annuel (vacance 5%)" value={fmt(annualRent * 0.95)} />
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Charges Annuelles</p>
                  <DataRow label="Charges de gestion" value={fmt((d.charges || 0) * 12)} />
                  <DataRow label="Taxe foncière" value={fmt(d.tax || 0)} />
                  <DataRow label="Remboursement crédit" value={fmt(d.monthlyPayment * 12)} />
                  <div style={{ borderTop: "2px solid #e2e8f0", marginTop: 8, paddingTop: 8 }}>
                    <DataRow label="TOTAL CHARGES" value={fmt(annualCharges + d.monthlyPayment * 12)} bold />
                  </div>
                </div>
              </div>

              <SectionTitle color="#10b981">Indicateurs de Rentabilité</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                <KpiCard label="Rendement brut" value={fmtPct(d.yieldNet)} bg="#f0fdf4" color="#15803d" />
                <KpiCard label="Cashflow brut/mois" value={`${Math.round(d.cashflowNetImpots + Math.min(0, annualCharges / 12))}€`} bg="#eff6ff" color="#1d4ed8" />
                <KpiCard label="Cashflow net/mois" value={`${Math.round(d.cashflowNetImpots) > 0 ? "+" : ""}${Math.round(d.cashflowNetImpots)}€`} bg={d.cashflowNetImpots >= 0 ? "#f0fdf4" : "#fef2f2"} color={d.cashflowNetImpots >= 0 ? "#15803d" : "#dc2626"} />
                <KpiCard label="Loyer/mensualité" value={fmtPct(d.monthlyPayment > 0 ? (d.rent / d.monthlyPayment) * 100 : 0)} bg="#faf5ff" color="#7c3aed" />
              </div>

              <SectionTitle color="#10b981">Décomposition du Cashflow Mensuel</SectionTitle>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 20px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
                {[
                  { label: "Loyer mensuel", value: d.rent, positive: true },
                  { label: "Remboursement crédit", value: -d.monthlyPayment, positive: false },
                  { label: "Charges mensuelles", value: -(d.charges || 0), positive: false },
                  { label: "Taxe foncière (mensuelle)", value: -(d.tax || 0) / 12, positive: false },
                  { label: "Fiscalité estimée (mensuelle)", value: fiscalData ? -(fiscalData.best.total / 12) : 0, positive: false },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.positive ? "#10b981" : "#ef4444" }}>{item.positive ? "+" : ""}{fmt(item.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 0", borderTop: "2px solid #e2e8f0", marginTop: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#1e293b" }}>CASHFLOW NET / MOIS</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: d.cashflowNetImpots >= 0 ? "#10b981" : "#ef4444" }}>{d.cashflowNetImpots >= 0 ? "+" : ""}{fmt(Math.round(d.cashflowNetImpots))}</span>
                </div>
              </div>

              {d.cashflowNetImpots < 0 && (
                <div style={{ background: "#fffbeb", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a" }}>
                  <p style={{ fontSize: 11, color: "#92400e", margin: 0 }}>
                    ⚠️ <strong>Effort mensuel de {fmt(Math.abs(Math.round(d.cashflowNetImpots)))}/mois.</strong> Cet effort peut être financé par votre épargne personnelle tout en constituant du patrimoine. L'amortissement comptable en LMNP réel peut réduire l'impôt à 0€ sur vos loyers.
                  </p>
                </div>
              )}

              <PageFooter page={4} />
            </div>
          </>
        )}

        {/* ══ PAGE 5 : ANALYSE FISCALE ════════════════════════ */}
        {isLoc && fiscalData && best && (
          <>
            <PageBreak />
            <div style={pageStyle}>
              <PageHeader page="5/8" title="Stratégie Fiscale" />

              {/* Bannière régime optimal — même source que le tableau */}
              <SectionTitle color="#6d28d9">Régime Fiscal Recommandé</SectionTitle>
              <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: 14, padding: "20px 24px", color: "white", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Régime optimal (TMI estimé 30%) · Stratégie {d.rentalStrategy}</p>
                    <p style={{ fontSize: 20, fontWeight: 900, margin: 0, marginTop: 6 }}>{best.regime}</p>
                    {best.deficit && <p style={{ fontSize: 11, color: "#4ade80", margin: 0, marginTop: 6 }}>Résultat déficitaire → 0€ d'impôt · Déficit reportable 10 ans</p>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", margin: 0, textTransform: "uppercase" }}>Impôt annuel estimé</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: best.total < 100 ? "#4ade80" : "#fde68a", margin: 0 }}>{fmt(Math.round(best.total))}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Calcul fiscal détaillé — {best.regime}</p>
                  <DataRow label="Loyer annuel" value={fmt(annualRent)} />
                  <DataRow label="Charges déductibles" value={`-${fmt(annualCharges)}`} />
                  <DataRow label="Intérêts d'emprunt (an 1)" value={`-${fmt(y1interest)}`} />
                  {(best.key === "LMNP_REEL" || best.key === "LMNP_MICRO") && (
                    <DataRow label="Amortissement comptable" value={`-${fmt(Math.round(amoComptable))}`} />
                  )}
                  <div style={{ borderTop: "2px solid #e2e8f0", marginTop: 8, paddingTop: 8 }}>
                    <DataRow label="Base imposable" value={fmt(Math.round(best.base))} bold />
                    <DataRow label={`IR (30%) `} value={fmt(Math.round(best.base * 0.30))} />
                    <DataRow label={`Prél. sociaux (${best.key?.startsWith("NUE") ? "17,2%" : "18,6%"})`} value={fmt(Math.round(best.total - best.base * 0.30))} />
                    <DataRow label="TOTAL IMPÔT/AN" value={fmt(Math.round(best.total))} bold color={best.total < 100 ? "#10b981" : "#dc2626"} />
                  </div>
                </div>

                <div>
                  {/* Avantages selon le régime optimal réel */}
                  {(best.key === "LMNP_REEL" || best.key === "LMNP_MICRO") ? (
                    <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "16px 18px", border: "1px solid #a7f3d0", marginBottom: 12 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Avantages {best.regime}</p>
                      {["Amortissement du bien sur 30 ans", "Amortissement mobilier sur 7 ans", "Intérêts 100% déductibles", "Déficit reportable 10 ans", "Base imposable potentiellement nulle"].map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                          <span style={{ color: "#10b981", fontSize: 12 }}>✓</span>
                          <span style={{ fontSize: 11, color: "#374151" }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "16px 18px", border: "1px solid #a7f3d0", marginBottom: 12 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Avantages {best.regime}</p>
                      {[
                        best.key === "NUE_MICRO" ? "Aucune comptabilité requise" : "Charges et intérêts 100% déductibles",
                        "Déficit foncier imputable sur revenu global (max 10 700€/an)",
                        "Exonération de plus-value après 22 ans (IR) et 30 ans (PS)",
                        "Pas de réintégration d'amortissements à la revente",
                        "Bail 3 ans : stabilité locative",
                      ].map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                          <span style={{ color: "#10b981", fontSize: 12 }}>✓</span>
                          <span style={{ fontSize: 11, color: "#374151" }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ background: "#fff7ed", borderRadius: 12, padding: "14px 18px", border: "1px solid #fed7aa" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Points de vigilance 2026</p>
                    {[
                      best.key?.startsWith("LMNP") ? "Amortissements réintégrés à la revente (réforme 2025)" : "PS 17,2% sur revenus fonciers",
                      "PS 18,6% sur LMNP (LFSS 2026, +1,4pt)",
                      "Durée minimale recommandée : 15 ans+",
                    ].map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                        <span style={{ color: "#f59e0b", fontSize: 12 }}>⚠</span>
                        <span style={{ fontSize: 11, color: "#92400e" }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tableau comparatif — best calculé dynamiquement, même logique que la bannière */}
              <SectionTitle color="#6d28d9">Comparatif des Régimes Compatibles</SectionTitle>
              <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#4f46e5" }}>
                      {["Régime", "Base imposable", "Impôt / an", "Impôt / mois", "Résultat"].map((h, i) => (
                        <th key={i} style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: i === 0 ? "left" : "center" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fiscalData.all.map((row, i) => {
                      const isBest = row.key === best.key;
                      return (
                        <tr key={i} style={{ background: isBest ? "#f0fdf4" : i % 2 === 0 ? "white" : "#f8fafc", opacity: row.compatible ? 1 : 0.4 }}>
                          <td style={{ padding: "9px 12px" }}>
                            <p style={{ fontSize: 11, fontWeight: isBest ? 700 : 500, color: isBest ? "#15803d" : row.compatible ? "#374151" : "#94a3b8", margin: 0 }}>
                              {row.regime}
                            </p>
                            {!row.compatible && <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, marginTop: 1 }}>Non applicable — stratégie {d.rentalStrategy}</p>}
                            {row.deficit && <p style={{ fontSize: 9, color: "#10b981", margin: 0, marginTop: 1 }}>Déficit → 0€ d'impôt · report 10 ans</p>}
                          </td>
                          <td style={{ padding: "9px 12px", fontSize: 11, textAlign: "center", color: "#374151" }}>{fmt(Math.round(row.base))}</td>
                          <td style={{ padding: "9px 12px", fontSize: 11, textAlign: "center", fontWeight: 700, color: row.total < 100 ? "#10b981" : "#dc2626" }}>{fmt(Math.round(row.total))}</td>
                          <td style={{ padding: "9px 12px", fontSize: 11, textAlign: "center", color: "#64748b" }}>{fmt(Math.round(row.total / 12))}</td>
                          <td style={{ padding: "9px 12px", textAlign: "center" }}>
                            {isBest
                              ? <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>✓ Optimal</span>
                              : !row.compatible
                                ? <span style={{ fontSize: 10, color: "#d1d5db" }}>N/A</span>
                                : <span style={{ fontSize: 10, color: "#94a3b8" }}>—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <PageFooter page={5} />
            </div>
          </>
        )}

        {/* ══ PAGE 6 : TABLEAU D'AMORTISSEMENT ════════════════ */}
        <PageBreak />
        <div style={pageStyle}>
          <PageHeader page={`${isLoc ? 6 : 4}/8`} title="Tableau d'Amortissement du Prêt" />

          <SectionTitle color="#0ea5e9">Amortissement Annuel sur {d.duration} ans</SectionTitle>
          <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Année", "Mensualité", "Capital remboursé", "Intérêts payés", "Capital restant dû", "Intérêts cumulés"].map((h, i) => (
                    <th key={i} style={{ padding: "9px 10px", fontSize: 8.5, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "center" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#f8fafc", ...(i === 4 || i === 9 || i === 14 || i === 19 || i === 24 ? { background: "#eff6ff" } : {}) }}>
                    <td style={{ padding: "7px 10px", fontSize: 10, fontWeight: 700, textAlign: "center", color: "#1e293b" }}>An {row.year}</td>
                    <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: "#374151" }}>{fmt(row.mensualite)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: "#10b981", fontWeight: 600 }}>{fmt(row.capital)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: "#ef4444" }}>{fmt(row.interets)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", fontWeight: 700, color: "#1e293b" }}>{fmt(row.restant)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: "#94a3b8" }}>{fmt(row.cumulInterets)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#0f172a" }}>
                  <td style={{ padding: "9px 10px", fontSize: 10, fontWeight: 900, color: "white", textAlign: "center" }}>TOTAL</td>
                  <td style={{ padding: "9px 10px", fontSize: 10, color: "#94a3b8", textAlign: "right" }}>—</td>
                  <td style={{ padding: "9px 10px", fontSize: 10, fontWeight: 700, color: "#4ade80", textAlign: "right" }}>{fmt(Math.round(loanAmount))}</td>
                  <td style={{ padding: "9px 10px", fontSize: 10, fontWeight: 700, color: "#f87171", textAlign: "right" }}>{fmt(totalInterets)}</td>
                  <td style={{ padding: "9px 10px", fontSize: 10, fontWeight: 700, color: "#4ade80", textAlign: "right" }}>0 €</td>
                  <td style={{ padding: "9px 10px", fontSize: 10, fontWeight: 700, color: "#f87171", textAlign: "right" }}>{fmt(totalInterets)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <KpiCard label="Capital remboursé" value={fmt(Math.round(loanAmount))} bg="#f0fdf4" color="#15803d" />
            <KpiCard label="Total intérêts versés" value={fmt(totalInterets)} bg="#fef2f2" color="#dc2626" />
            <KpiCard label="Ratio intérêts/capital" value={fmtPct((totalInterets / loanAmount) * 100)} bg="#fff7ed" color="#c2410c" />
          </div>

          <PageFooter page={isLoc ? 6 : 4} />
        </div>

        {/* ══ PAGE 7 : PROJECTIONS PATRIMONIALES ══════════════ */}
        <PageBreak />
        <div style={pageStyle}>
          <PageHeader page={`${isLoc ? 7 : 5}/8`} title="Projections Patrimoniales" />

          <div style={{ background: "#fffbeb", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: "#92400e", margin: 0 }}>
              📌 Projections basées sur une <strong>appréciation immobilière de +2%/an</strong> (moyenne historique France). Ces projections sont indicatives et ne constituent pas une garantie de performance.
            </p>
          </div>

          <SectionTitle color="#0ea5e9">Évolution du Patrimoine Immobilier</SectionTitle>
          <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {(isLoc
                    ? ["Année", "Valeur bien", "Capital restant dû", "Patrimoine net", "Cashflow cumulé", "Patrimoine total"]
                    : ["Année", "Valeur bien", "Capital restant dû", "Patrimoine net", "Épargne forcée cumulée"]).map((h, i) => (
                    <th key={i} style={{ padding: "9px 10px", fontSize: 8.5, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "center" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 3, 5, 7, 10, 12, 15, 18, 20].filter(y => y <= d.duration).map((y, i) => {
                  const proj = projections[y - 1];
                  if (!proj) return null;
                  const capitalRembourse = loanAmount - proj.restant;
                  return (
                    <tr key={i} style={{ background: y === 10 || y === 20 ? "#eff6ff" : i % 2 === 0 ? "white" : "#f8fafc" }}>
                      <td style={{ padding: "7px 10px", fontSize: 10, fontWeight: 700, textAlign: "center", color: "#1e293b" }}>An {y}</td>
                      <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: "#10b981", fontWeight: 600 }}>{fmt(proj.valeur)}</td>
                      <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: "#ef4444" }}>{fmt(proj.restant)}</td>
                      <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", fontWeight: 700, color: "#1d4ed8" }}>{fmt(proj.patrimoineNet)}</td>
                      {isLoc
                        ? <><td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: proj.cashflowCumul >= 0 ? "#10b981" : "#ef4444" }}>{fmt(proj.cashflowCumul)}</td><td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", fontWeight: 900, color: "#4f46e5" }}>{fmt(proj.patrimoineNet + proj.cashflowCumul)}</td></>
                        : <td style={{ padding: "7px 10px", fontSize: 10, textAlign: "right", color: "#10b981" }}>{fmt(capitalRembourse)}</td>
                      }
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <SectionTitle color="#0ea5e9">Jalons Clés</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            <KpiCard label="Valeur à 10 ans" value={fmt(proj10?.valeur || 0)} sub="+2%/an" bg="#eff6ff" color="#1d4ed8" />
            <KpiCard label="Patrimoine net à 10 ans" value={fmt(proj10?.patrimoineNet || 0)} bg="#f0fdf4" color="#15803d" />
            <KpiCard label="Valeur à 20 ans" value={fmt(proj20?.valeur || d.price)} sub="+2%/an" bg="#faf5ff" color="#7c3aed" />
            <KpiCard label="Patrimoine net à 20 ans" value={fmt(proj20?.patrimoineNet || d.price)} bg="#f0fdf4" color="#15803d" />
          </div>

          {isLoc && (
            <div style={{ background: "#ecfdf5", borderRadius: 12, padding: "16px 20px", border: "1px solid #a7f3d0" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#065f46", marginBottom: 8 }}>📊 Bilan à 20 ans (projection)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div><p style={{ fontSize: 10, color: "#047857" }}>Investissement initial (apport + effort)</p><p style={{ fontSize: 16, fontWeight: 900, color: "#065f46" }}>{fmt(d.apport + Math.abs(Math.min(0, d.cashflowNetImpots)) * 240)}</p></div>
                <div><p style={{ fontSize: 10, color: "#047857" }}>Patrimoine net immobilier à 20 ans</p><p style={{ fontSize: 16, fontWeight: 900, color: "#065f46" }}>{fmt(proj20?.patrimoineNet || d.price)}</p></div>
                <div><p style={{ fontSize: 10, color: "#047857" }}>Loyers perçus en 20 ans</p><p style={{ fontSize: 16, fontWeight: 900, color: "#065f46" }}>{fmt(annualRent * 20)}</p></div>
              </div>
            </div>
          )}

          <PageFooter page={isLoc ? 7 : 5} />
        </div>

        {/* ══ PAGE 8 : RISQUES & CONCLUSION ═══════════════════ */}
        <PageBreak />
        <div style={pageStyle}>
          <PageHeader page={`${isLoc ? 8 : 6}/8`} title="Analyse des Risques & Conclusion" />

          <SectionTitle color="#dc2626">Analyse des Risques</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Risques Identifiés</p>
              {/* Bug 1 fix : seuil strict à 35%, pas "proche" */}
              <RiskBadge level={endettementApres < 33 ? "LOW" : endettementApres < 35 ? "MED" : "HIGH"} label="Risque d'endettement" />
              {/* Bug 2 fix : cashflow & vacance uniquement si LOC */}
              {isLoc && <RiskBadge level={d.rent / d.monthlyPayment > 1.1 ? "LOW" : "MED"} label="Risque de cashflow" />}
              {isLoc && <RiskBadge level="MED" label="Risque de vacance locative" />}
              {!isLoc && <RiskBadge level={endettementApres < 35 ? "LOW" : "MED"} label="Risque d'effort mensuel" />}
              <RiskBadge level="LOW" label="Risque de taux (taux fixe)" />
              <RiskBadge level="MED" label="Risque de marché immobilier" />
              <RiskBadge level={isLoc ? "MED" : "LOW"} label="Risque de liquidité" />
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Facteurs de Protection</p>
              {[
                "Taux fixe : protection contre la hausse des taux",
                "Apport de " + fmtPct(apportPct) + " : coussin de sécurité solide",
                isLoc ? "Loyers : revenus complémentaires réguliers" : "Épargne forcée : constitue du patrimoine",
                // Bug 3 fix : ne jamais afficher "proche des normes" comme facteur positif si >35%
                ...(endettementApres < 35
                  ? ["Taux d'endettement conforme aux normes HCSF (" + fmtPct(endettementApres) + " ≤ 35%)"]
                  : []),
                isRP ? "Exonération de plus-value à la revente (RP)" : "Régime fiscal LMNP : impôt optimisé",
                "Bien immobilier : actif tangible et durable",
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#10b981", fontSize: 12, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 11, color: "#374151" }}>{a}</span>
                </div>
              ))}
              {/* Avertissement explicite si endettement trop élevé */}
              {endettementApres >= 35 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start", marginTop: 4, padding: "8px 10px", background: "#fef2f2", borderRadius: 8 }}>
                  <span style={{ color: "#dc2626", fontSize: 12, marginTop: 1 }}>⚠</span>
                  <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
                    Taux d'endettement de {fmtPct(endettementApres)} — au-delà du seuil HCSF de 35%. Un apport complémentaire ou une durée allongée sera nécessaire.
                  </span>
                </div>
              )}
            </div>
          </div>

          <SectionTitle color="#4f46e5">Synthèse & Recommandation</SectionTitle>
          <div style={{ background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", borderRadius: 14, padding: "20px 24px", border: "1px solid #bae6fd", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#0c4a6e", lineHeight: 1.7, margin: 0 }}>
              Ce dossier présente un projet d'acquisition immobilière de type <strong>{typeLabel.toUpperCase()}</strong> pour un montant total de <strong>{fmt(totalCost)}</strong>, financé à hauteur de <strong>{fmtPct(apportPct)}</strong> par apport personnel et <strong>{fmtPct(100 - apportPct)}</strong> par emprunt bancaire sur <strong>{d.duration} ans</strong> à <strong>{fmtPct(d.rate)}</strong>.
              {isLoc && ` La stratégie locative en régime ${d.rentalStrategy === "LMNP" ? "LMNP Réel" : d.rentalStrategy === "NUE" ? "Location Nue Réel" : "Location Courte Durée"} permet d'optimiser la fiscalité et de générer un cashflow mensuel estimé à ${fmt(Math.round(d.cashflowNetImpots))}.`}
              {isRP && ` L'acquisition en résidence principale offre une épargne forcée de ${fmt(d.monthlyPayment * 0.4 * 12)}/an en capital amorti dès la première année, et une exonération totale de plus-value à la revente.`}
              {" "}À horizon 20 ans, le patrimoine net immobilier est estimé à <strong>{fmt(proj20?.patrimoineNet || d.price)}</strong>, valorisant un effort initial de <strong>{fmt(d.apport)}</strong>.
            </p>
          </div>

          {/* Score global */}
          <div style={{ background: "#0f172a", borderRadius: 14, padding: "20px 24px", color: "white" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16, margin: 0 }}>INDICATEURS CLÉS DU DOSSIER</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 16 }}>
              {[
                { label: "Coût total", value: fmtK(totalCost) },
                { label: "Apport", value: fmtPct(apportPct) },
                { label: "Endettement", value: fmtPct(endettementApres), alert: endettementApres > 35 },
                { label: isLoc ? "Rendement brut" : "Mensualité", value: isLoc ? fmtPct(d.yieldNet) : fmt(d.monthlyPayment) },
                { label: "Patrimoine net 20a", value: fmtK(proj20?.patrimoineNet || d.price) },
              ].map((kpi, i) => (
                <div key={i} style={{ textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 8px" }}>
                  <p style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, marginBottom: 6 }}>{kpi.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 900, color: (kpi as any).alert ? "#f87171" : "white", margin: 0 }}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <p style={{ fontSize: 9, color: "#94a3b8" }}>Dossier généré par Nexus Invest le {dateStr} · Ne constitue pas une offre de prêt ou un conseil en investissement · Données basées sur les informations fournies par l'utilisateur</p>
          </div>

          <PageFooter page={isLoc ? 8 : 6} />
        </div>

      </div>
    </div>
  );
}