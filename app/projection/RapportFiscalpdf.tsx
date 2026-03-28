"use client";

import React from "react";
import {
  fmt, fmtPct, F, BROKERS, PROFILES,
  SimParams, YearPoint, BrokerType, Profile,
} from "./FiscaliteEngine";

// ─────────────────────────────────────────────────────────────────────────────
// STYLES INLINE — 100% hex, zéro Tailwind, zéro oklch/lab
// html2canvas ne supporte que les couleurs CSS standards
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page: {
    width: "794px",
    minHeight: "1123px",
    backgroundColor: "#ffffff",
    color: "#111111",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: "52px 48px",
    boxSizing: "border-box" as const,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "3px solid #10b981",
    paddingBottom: "24px",
    marginBottom: "32px",
  },
  badge: {
    display: "inline-block",
    fontSize: "7px",
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    padding: "2px 8px",
    borderRadius: "4px",
    marginRight: "6px",
  },
  section: { marginBottom: "28px" },
  sectionTitle: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.14em",
    color: "#374151",
    marginBottom: "14px",
    fontFamily: "Arial, sans-serif",
    borderLeft: "3px solid #10b981",
    paddingLeft: "10px",
    lineHeight: 1,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
  },
  card: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "11px",
  },
  th: {
    padding: "8px 10px",
    backgroundColor: "#f3f4f6",
    fontSize: "8px",
    textTransform: "uppercase" as const,
    color: "#6b7280",
    letterSpacing: "0.08em",
    fontWeight: 700,
    borderBottom: "2px solid #e5e7eb",
  },
  td: {
    padding: "9px 10px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "11px",
  },
  disclaimer: {
    fontSize: "7.5px",
    color: "#9ca3af",
    lineHeight: 1.7,
    borderTop: "1px solid #e5e7eb",
    paddingTop: "14px",
    marginTop: "28px",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────
interface RapportFiscalPDFProps {
  divRef: React.RefObject<HTMLDivElement>;
  params: SimParams;
  points: YearPoint[];
  profile: Profile;
  fireYear: number | null;
  fireTarget: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT — rendu invisible sauf lors de la capture html2canvas
// ─────────────────────────────────────────────────────────────────────────────
export default function RapportFiscalPDF({
  divRef, params, points, profile, fireYear, fireTarget,
}: RapportFiscalPDFProps) {
  const last = points[points.length - 1];
  const broker = BROKERS[params.brokerType];
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const totalInvesti = params.capital + params.dca * 12 * params.years;

  const enveloppes = [
    { id: "PEA", val: last?.PEA || 0, color: "#10b981", fiscalite: "18,6% PS uniquement après 5 ans (IR exonéré)" },
    { id: "CTO", val: last?.CTO || 0, color: "#f59e0b", fiscalite: "PFU 31,4% (12,8% IR + 18,6% PS) — dès le 1er euro" },
    { id: "AV",  val: last?.AV  || 0, color: "#ec4899", fiscalite: "7,5% IR + 17,2% PS après 8 ans + abo. 4 600€/an" },
    { id: "PER", val: last?.PER || 0, color: "#6366f1", fiscalite: `TMI ${params.tmi}% sur capital + PFU 31,4% sur PV` },
    { id: "LA",  val: last?.LA  || 0, color: "#3b82f6", fiscalite: "100% exonéré — taux fixe 2,4% garanti BdF 2026" },
  ].sort((a, b) => b.val - a.val);

  const best = enveloppes[0];

  return (
    <div
      ref={divRef}
      style={{
        display: "none",
        position: "absolute",
        left: "-9999px",
        top: 0,
        zIndex: -1,
      }}
    >
      <div style={S.page}>

        {/* ── COUVERTURE ─────────────────────────────────────────────────── */}
        <div style={S.header}>
          <div>
            <p style={{ fontSize: "8px", color: "#9ca3af", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "10px" }}>
              NEXUS INVEST · RAPPORT CONFIDENTIEL
            </p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: "#111", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
              Livre Blanc Patrimonial 2026
            </p>
            <p style={{ fontSize: "16px", fontWeight: 400, color: "#10b981", margin: 0 }}>
              Guide Définitif de la Gestion de Patrimoine & Fiscalité Française
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", color: "#6b7280", margin: "0 0 4px" }}>Généré le {date}</p>
            <p style={{ fontSize: "9px", color: "#9ca3af", margin: 0 }}>Sources : BOFIP · CGI · LFSS 2026</p>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px", justifyContent: "flex-end" }}>
              {["BOFIP", "Art. 990 I CGI", "LFSS 2026"].map(tag => (
                <span key={tag} style={{ ...S.badge, backgroundColor: "#f0fdf4", color: "#15803d" }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── ① HYPOTHÈSES ─────────────────────────────────────────────── */}
        <div style={S.section}>
          <p style={S.sectionTitle}>① Hypothèses de Simulation</p>
          <div style={S.grid3}>
            {[
              { label: "Capital de départ", value: fmt(params.capital) },
              { label: "Versement mensuel (DCA)", value: `${fmt(params.dca)}/mois` },
              { label: "Horizon de projection", value: `${params.years} ans` },
              { label: "Profil de risque", value: `${profile.label} — ${profile.growth}%/an` },
              { label: "Tranche Marginale (TMI)", value: `${params.tmi} %` },
              { label: "Intermédiaire financier", value: broker.label },
            ].map((item, i) => (
              <div key={i} style={S.card}>
                <span style={{ fontSize: "8px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>
                  {item.label}
                </span>
                <span style={{ fontSize: "15px", fontWeight: 900, color: "#111" }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div style={{
            ...S.card,
            backgroundColor: params.isDividend ? "#f0fdf4" : "#fefce8",
            borderColor: params.isDividend ? "#bbf7d0" : "#fef08a",
          }}>
            <span style={{ fontSize: "10px", color: "#374151" }}>
              <strong>Stratégie :</strong>{" "}
              {params.isDividend
                ? `Distribution de dividendes (rendement ${params.divYield}%/an) — Fiscalité CTO impactée par PFU 31,4% sur chaque distribution annuelle.`
                : "Capitalisation pure (Growth) — Réinvestissement automatique sans frottement fiscal annuel sur PEA et AV."}
            </span>
          </div>
        </div>

        {/* ── ② RÉSULTATS COMPARATIFS ──────────────────────────────────── */}
        <div style={S.section}>
          <p style={S.sectionTitle}>② Résultats Comparatifs — Capital Net à {params.years} ans (après impôts & frais)</p>
          <table style={S.table}>
            <thead>
              <tr>
                {[
                  { label: "Enveloppe", align: "left" },
                  { label: "Capital net", align: "right" },
                  { label: "Gain net", align: "right" },
                  { label: "Performance", align: "right" },
                  { label: "Rente /mois (4%)", align: "right" },
                  { label: "Fiscalité de sortie", align: "left" },
                ].map(({ label, align }) => (
                  <th key={label} style={{ ...S.th, textAlign: align as any }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enveloppes.map(({ id, val, color, fiscalite }, i) => {
                const gain = val - totalInvesti;
                const perf = totalInvesti > 0 ? (gain / totalInvesti) * 100 : 0;
                const rente = Math.round(val * 0.04 / 12);
                const isOptimal = i === 0;
                return (
                  <tr key={id} style={{
                    backgroundColor: isOptimal ? "#f0fdf4" : i % 2 === 0 ? "#ffffff" : "#fafafa",
                  }}>
                    <td style={{ ...S.td, fontWeight: 700 }}>
                      {isOptimal && (
                        <span style={{ ...S.badge, backgroundColor: "#dcfce7", color: "#15803d" }}>
                          OPTIMAL
                        </span>
                      )}
                      <span style={{ color }}>{id}</span>
                    </td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 900 }}>{fmt(val)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: gain >= 0 ? "#16a34a" : "#dc2626" }}>
                      {gain >= 0 ? "+" : ""}{fmt(gain)}
                    </td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: perf >= 0 ? "#16a34a" : "#dc2626" }}>
                      {fmtPct(perf)}
                    </td>
                    <td style={{ ...S.td, textAlign: "right" }}>{fmt(rente)}</td>
                    <td style={{ ...S.td, fontSize: "9px", color: "#6b7280" }}>{fiscalite}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── ③ SCÉNARIO OPTIMAL ───────────────────────────────────────── */}
        {best && (
          <div style={{ ...S.section, backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "18px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#15803d", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ③ Scénario Optimal Recommandé : {best.id}
            </p>
            <p style={{ fontSize: "11px", color: "#374151", lineHeight: 1.7, margin: "0 0 8px" }}>
              Sur la base des paramètres — capital{" "}<strong>{fmt(params.capital)}</strong>, DCA{" "}
              <strong>{fmt(params.dca)}/mois</strong>, horizon{" "}<strong>{params.years} ans</strong>,
              profil <strong>{profile.label} ({profile.growth}%/an)</strong>, TMI{" "}
              <strong>{params.tmi}%</strong>, via <strong>{broker.label}</strong> —
              l'enveloppe <strong style={{ color: best.color }}>{best.id}</strong> génère le capital net le plus
              élevé : <strong>{fmt(best.val)}</strong>, soit un gain net de{" "}
              <strong style={{ color: "#16a34a" }}>{fmt(best.val - totalInvesti)}</strong> sur{" "}
              {fmt(totalInvesti)} investis.
              {fireYear != null
                ? ` La cible d'indépendance financière (${fmt(fireTarget)}) est atteinte à l'An ${fireYear} via le PEA.`
                : ""}
            </p>
            <p style={{ fontSize: "11px", color: "#15803d", fontWeight: 700, margin: 0 }}>
              Rente mensuelle estimée (règle des 4%) : {fmt(Math.round(best.val * 0.04 / 12))}
            </p>
          </div>
        )}

        {/* ── ④ FISCALITÉ 2026 ─────────────────────────────────────────── */}
        <div style={S.section}>
          <p style={S.sectionTitle}>④ Rappel Fiscal 2026 — Sources BOFIP / CGI / LFSS 2026</p>
          <div style={S.grid2}>
            {[
              {
                title: "PFU 2026 : 31,4 % (standard)",
                body: "La hausse de la CSG (9,2% → 10,6%) via PLFSS 2026 porte les PS de 17,2% à 18,6% pour CTO, PEA avant 5 ans, PER. Le PFU passe donc de 30% à 31,4% = 12,8% IR + 18,6% PS.",
                accent: "#ef4444",
              },
              {
                title: "PEA — Bouclier Européen (plafond 150 000€)",
                body: "Après 5 ans : exonération totale d'IR, seuls les PS de 18,6% s'appliquent sur les gains. Retrait avant 5 ans : PFU 31,4% + clôture du plan. Dividendes réinvestis sans frottement fiscal.",
                accent: "#10b981",
              },
              {
                title: "Assurance Vie — Exception PS 2026",
                body: "PFU dérogatoire maintenu à 30% (PS 17,2% préservés). Après 8 ans : 7,5% IR + 17,2% PS avec abattement annuel de 4 600€ (célibataire) sur les gains. Le seul produit à ne pas subir la hausse 2026.",
                accent: "#ec4899",
              },
              {
                title: "PER — Effet de Levier Fiscal",
                body: "Versements déductibles du revenu imposable selon la TMI (plafond 10% des revenus, max ~37 094€/2026). Sortie retraite : capital taxé à la TMI + PV au PFU 31,4%. Déductibilité supprimée après 70 ans (nouveauté 2026).",
                accent: "#6366f1",
              },
              {
                title: "CTO — Liberté Absolue",
                body: "PFU 31,4% dès le 1er euro, sans distinction de durée. En stratégie dividende, chaque distribution est taxée annuellement, brisant l'effet des intérêts composés. Avantage : purge IR des plus-values au décès.",
                accent: "#f59e0b",
              },
              {
                title: "Livret A 2026 — Taux 2,4%",
                body: "Taux fixe arrêté par la Banque de France au 01/02/2026. Totalement exonéré d'IR et PS. Plafond 22 950€ (LA) + 12 000€ (LDDS). Idéal pour le matelas de sécurité (3-6 mois de dépenses).",
                accent: "#3b82f6",
              },
            ].map(({ title, body, accent }, i) => (
              <div key={i} style={{ ...S.card, borderLeft: `3px solid ${accent}` }}>
                <p style={{ fontSize: "10px", fontWeight: 700, marginBottom: "5px", color: "#111" }}>{title}</p>
                <p style={{ fontSize: "9px", color: "#6b7280", lineHeight: 1.55, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ⑤ SUCCESSION ─────────────────────────────────────────────── */}
        <div style={S.section}>
          <p style={S.sectionTitle}>⑤ Transmission Successorale — Estimation à {params.years} ans</p>
          <table style={S.table}>
            <thead>
              <tr>
                {[
                  { label: "Enveloppe", align: "left" },
                  { label: "Capital brut", align: "right" },
                  { label: "Abattement", align: "right" },
                  { label: "Net transmis", align: "right" },
                  { label: "Règle applicable", align: "left" },
                ].map(({ label, align }) => (
                  <th key={label} style={{ ...S.th, textAlign: align as any }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: "PEA", capital: last?.PEA || 0, abat: F.SUCC_ABAT_ENFANT, color: "#10b981", regle: "Succession classique. PS 18,6% sur gains. Droits succession jusqu'à 45% (enfants, abatt. 100k€)." },
                { id: "CTO", capital: last?.CTO || 0, abat: F.SUCC_ABAT_ENFANT, color: "#f59e0b", regle: "Purge IR au décès. PS 18,6% dues. Actif successoral. Abatt. 100k€/enfant." },
                { id: "AV",  capital: last?.AV  || 0, abat: F.AV_ABAT_SUCC, color: "#ec4899", regle: "Art. 990 I CGI : 152 500€/bénéf. hors succession (primes < 70 ans). Champion successoral." },
                { id: "PER", capital: last?.PER || 0, abat: F.AV_ABAT_SUCC, color: "#6366f1", regle: "Si décès < 70 ans : même régime AV. Après 70 ans : abatt. global 30 500€. PER assurantiel uniquement." },
                { id: "LA",  capital: last?.LA  || 0, abat: F.SUCC_ABAT_ENFANT, color: "#3b82f6", regle: "Succession classique. Abatt. 100k€/enfant." },
              ].map(({ id, capital, abat, color, regle }, i) => {
                const net = Math.max(0, capital - abat);
                return (
                  <tr key={id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ ...S.td, fontWeight: 700, color }}>{id}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{fmt(capital)}</td>
                    <td style={{ ...S.td, textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{fmt(abat)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 900 }}>{fmt(net)}</td>
                    <td style={{ ...S.td, fontSize: "9px", color: "#6b7280" }}>{regle}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* AV Succession — détail */}
          <div style={{ ...S.card, marginTop: "10px", borderLeft: "3px solid #ec4899", backgroundColor: "#fff1f2" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#be185d", marginBottom: "5px" }}>
              Assurance Vie — Art. 990 I CGI : Stratégie Successorale Optimale
            </p>
            <p style={{ fontSize: "9px", color: "#6b7280", lineHeight: 1.6, margin: "0 0 6px" }}>
              <strong>Avant 70 ans (primes versées) :</strong> 152 500€ exonérés / bénéficiaire désigné.
              De 152 500€ à 1 005 000€ : 20% prélèvement forfaitaire. Au-delà : 31,25%.
            </p>
            <p style={{ fontSize: "9px", color: "#6b7280", lineHeight: 1.6, margin: "0 0 6px" }}>
              <strong>Après 70 ans (primes versées) :</strong> Abattement global 30 500€ (tous bénéficiaires). Reste soumis aux droits de succession.
              <strong style={{ color: "#be185d" }}> Secret de l'Art. 757 B : les plus-values générées sont intégralement exonérées de droits de succession, même après 70 ans.</strong>
            </p>
            <p style={{ fontSize: "9px", color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
              <strong>Stratégie démembrement :</strong> "Conjoint pour l'usufruit, enfants pour la nue-propriété" — Le conjoint reçoit tout (exonéré). Les enfants récupèrent leur créance lors du 2ème décès en franchise d'impôt.
            </p>
          </div>
        </div>

        {/* ── ⑥ GUERRE DES FRAIS ───────────────────────────────────────── */}
        <div style={S.section}>
          <p style={S.sectionTitle}>⑥ Impact Mathématique des Frais — La Guerre Silencieuse</p>
          <div style={{ ...S.card, backgroundColor: "#fff7ed", borderColor: "#fed7aa" }}>
            <p style={{ fontSize: "10px", color: "#374151", lineHeight: 1.7, margin: 0 }}>
              <strong>Démonstration ({params.years} ans) :</strong> {BROKERS.online.label} (0% entrée, 0,6%/an) vs{" "}
              {BROKERS.banque.label} (2% entrée, 1,5%/an). Différence de rendement net : ~
              {fmtPct((BROKERS.banque.fraisAnnuels - BROKERS.online.fraisAnnuels) * 100 + BROKERS.banque.fraisEntree * 10, 1)}/an
              sur {params.years} ans avec capital {fmt(params.capital)} et DCA {fmt(params.dca)}/mois.{" "}
              <strong style={{ color: "#dc2626" }}>
                La performance est incertaine. Les frais, eux, sont garantis — c'est le seul coût certain dans l'investissement.
              </strong>
            </p>
          </div>
        </div>

        {/* ── DISCLAIMER ───────────────────────────────────────────────── */}
        <p style={S.disclaimer}>
          Ce document est généré par Nexus Invest à titre purement informatif et pédagogique. Il ne constitue pas un conseil en
          investissement au sens de la directive MIF2 ni une recommandation personnalisée. Les projections reposent sur la
          fiscalité française en vigueur en mars 2026 (BOFIP, CGI, LFSS 2026) et des hypothèses de rendement qui ne
          constituent aucune garantie de performance future. La valeur des investissements peut fluctuer à la baisse. Consultez
          un Conseiller en Gestion de Patrimoine (CGP) ou Conseiller en Investissements Financiers (CIF) agréé AMF avant toute
          décision. Sources : BOI-RPPM-RCM-40-50-20-10 (PEA) · Art. 125-0 A CGI (AV) · Art. 163 quatervicies CGI (PER) ·
          Art. 990 I CGI & 757 B (succession AV) · PLFSS 2026 · Arrêté BdF 01/02/2026 (Livret A).
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION D'EXPORT PDF — import dynamique jspdf + html2canvas
// Résout l'erreur "unsupported color function lab" :
//   → Le composant RapportFiscalPDF utilise UNIQUEMENT des hex inline
//   → On clone le nœud dans un iframe sandbox pour isoler les styles Tailwind
// ─────────────────────────────────────────────────────────────────────────────
export async function exporterPDF(
  reportEl: HTMLElement | null,
  setExporting: (v: boolean) => void
): Promise<void> {
  if (!reportEl) return;
  setExporting(true);

  try {
    // Import dynamique (côté client uniquement)
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    // ── Rendre visible dans un conteneur isolé ────────────────────────────
    // On crée un wrapper avec fond blanc explicite pour éviter tout héritage
    const wrapper = document.createElement("div");
    wrapper.style.cssText = [
      "position:fixed", "left:0", "top:0", "zIndex:999999",
      "backgroundColor:#ffffff", "width:794px", "overflow:hidden",
    ].join(";");

    // Clone le contenu pour ne pas modifier le DOM original
    const clone = reportEl.cloneNode(true) as HTMLElement;
    clone.style.cssText = "display:block;position:relative;left:0;top:0;zIndex:auto;";

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Attendre le rendu complet
    await new Promise(r => setTimeout(r, 400));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      // Ignorer les éléments qui pourraient avoir des couleurs non supportées
      ignoreElements: (el: Element) => {
        const style = window.getComputedStyle(el);
        // Ignorer si la couleur de fond contient "lab" ou "oklch"
        const bg = style.backgroundColor || "";
        return bg.includes("lab(") || bg.includes("oklch(");
      },
    });

    // Nettoyer
    document.body.removeChild(wrapper);

    // ── Génération PDF ────────────────────────────────────────────────────
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgRatio = canvas.height / canvas.width;
    const imgH = pageW * imgRatio;

    if (imgH <= pageH) {
      // Tient en une page
      pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
    } else {
      // Pagination
      let offsetY = 0;
      while (offsetY < imgH) {
        if (offsetY > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -offsetY, pageW, imgH);
        offsetY += pageH;
      }
    }

    pdf.save("Nexus_LivreBlanc_Patrimonial_2026.pdf");

  } catch (err: any) {
    console.error("[PDF Export Error]", err);
    // Message d'erreur utilisateur
    alert(
      `Erreur lors de la génération du PDF :\n${err?.message || "Erreur inconnue"}\n\n` +
      "Assurez-vous que jspdf et html2canvas sont installés :\nnpm install jspdf html2canvas"
    );
  } finally {
    setExporting(false);
  }
}