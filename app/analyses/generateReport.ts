import jsPDF from "jspdf";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface StockInfo { name: string; ticker: string; country: string; sector: string; }
interface LayerSignal { layer: string; name: string; verdict: "bullish" | "bearish" | "neutral"; confidence: number; detail: string; }
interface Confluence { score: number; action: string; layers: LayerSignal[]; bullCount: number; bearCount: number; summary: string; entryZone: { min: number; max: number }; stopLoss: number; targets: number[]; riskReward: number; }
interface Fundamentals { marketCap: number | null; pe: number | null; forwardPe: number | null; eps: number | null; dividendRate: number | null; dividendYield: number | null; exDividendDate: string | null; payoutRatio: number | null; beta: number | null; profitMargin: number | null; debtToEquity: number | null; revenueGrowth: number | null; targetMeanPrice: number | null; recommendationKey: string | null; numberOfAnalysts: number | null; sector: string | null; industry: string | null; }
interface PortfolioPosition { ticker: string; name: string; quantity: number; pru: number; addedAt: string; }
interface Meta { currency: string; curr: number; prev: number; change: number; pct: number; }
interface TechResult { rsi: number[]; stochRsi: { k: number[]; d: number[] }; macd: { macd: number[]; signal: number[]; histogram: number[] }; bb: { upper: number[]; middle: number[]; lower: number[] }; ma20: number[]; ma50: number[]; ma200: number[]; obv: number[]; atr: number[]; ichimoku: { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[] }; fibonacci: { levels: { label: string; price: number }[] }; supports: number[]; resistances: number[]; closes?: number[]; }

// ═══════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════

type RGB = [number, number, number];
const C = {
  black: [20, 20, 35] as RGB, dark: [55, 55, 72] as RGB, mid: [120, 120, 140] as RGB,
  light: [165, 165, 180] as RGB, border: [215, 215, 220] as RGB, bg: [245, 245, 243] as RGB,
  white: [255, 255, 255] as RGB,
  blue: [37, 99, 235] as RGB, blueBg: [235, 243, 254] as RGB,
  green: [5, 150, 105] as RGB, greenBg: [232, 250, 240] as RGB,
  red: [210, 45, 45] as RGB, redBg: [252, 238, 238] as RGB,
  amber: [200, 110, 10] as RGB, amberBg: [255, 249, 232] as RGB,
  purple: [100, 70, 210] as RGB,
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function fmtPrice(v: number, cur = "EUR") { return `${v.toFixed(2)} ${cur}`; }
function fmtMcap(v: number) { return v >= 1e12 ? `${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : `${(v / 1e6).toFixed(0)}M`; }
function fmtPct(v: number) { return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`; }

function safeText(text: string): string {
  return text
    .replace(/↑/g, "^").replace(/↓/g, "v").replace(/→/g, "->").replace(/←/g, "<-")
    .replace(/✓/g, "[OK]").replace(/✗/g, "[X]")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, "");
}

function computeTargets(price: number, confluence: Confluence, _tech: TechResult) {
  return {
    stop: confluence.stopLoss,
    shortTarget: confluence.targets[0] || price,
    midTarget: confluence.targets[1] || price,
    longTarget: confluence.targets[2] || price,
    entry: confluence.entryZone,
    rr: confluence.riskReward,
  };
}

// ═══════════════════════════════════════════════════════════════
// SHARED DRAWING PRIMITIVES
// ═══════════════════════════════════════════════════════════════

/** Helpers bound to a doc instance to avoid repetition */
function makeHelpers(doc: jsPDF) {
  const sc = (c: RGB) => doc.setTextColor(...c);
  const sf = (c: RGB) => doc.setFillColor(...c);
  const sd = (c: RGB) => doc.setDrawColor(...c);
  return { sc, sf, sd };
}

// ═══════════════════════════════════════════════════════════════
// NEXUS LOGO
// ═══════════════════════════════════════════════════════════════

function drawNexusLogo(doc: jsPDF, x: number, y: number, size: number) {
  const s = size;
  const r = s * 0.18;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, s, s, r, r, "D");
  const pad = s * 0.28;
  const x1 = x + pad, x2 = x + s - pad;
  const yT = y + pad, yB = y + s - pad;
  const lw = s * 0.1;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(lw);
  doc.setLineCap("round" as any);
  doc.line(x1, yB, x1, yT);
  doc.line(x1, yT, x2, yB);
  doc.line(x2, yB, x2, yT);
}

// ═══════════════════════════════════════════════════════════════
// SHARED: HEADER BAND
// ═══════════════════════════════════════════════════════════════

function drawHeader(
  doc: jsPDF,
  stock: StockInfo,
  subtitle: string,
  logoSize: number,
  bandH: number,
): number {
  const { sc, sf } = makeHelpers(doc);
  const W = 210, M = 15;
  sf(C.blue); doc.rect(0, 0, W, bandH, "F");
  drawNexusLogo(doc, M, bandH * 0.14, logoSize);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(logoSize < 22 ? 16 : 18); doc.setFont("helvetica", "bold");
  doc.text("NEXUS STOCKS", M + logoSize + 5, bandH * 0.43);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(subtitle, M + logoSize + 5, bandH * 0.63);
  doc.text(
    new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    M + logoSize + 5, bandH * 0.85
  );
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(stock.ticker, W - M, bandH * 0.43, { align: "right" });
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text(safeText(`${stock.sector} - ${stock.country}`), W - M, bandH * 0.63, { align: "right" });
  sc(C.black);
  return bandH + 8; // return starting y
}

// ═══════════════════════════════════════════════════════════════
// SHARED: SCORE BOX
// ═══════════════════════════════════════════════════════════════

function drawScoreBox(
  doc: jsPDF, confluence: Confluence, y: number, boxH: number, scoreNumSize: number
): void {
  const { sc, sf, sd } = makeHelpers(doc);
  const M = 15, CW = 180;
  const scoreC = confluence.score >= 65 ? C.green : confluence.score <= 35 ? C.red : C.amber;
  const scoreBg = confluence.score >= 65 ? C.greenBg : confluence.score <= 35 ? C.redBg : C.amberBg;

  sf(scoreBg); sd(scoreC); doc.setLineWidth(0.7);
  doc.roundedRect(M, y, CW, boxH, 3, 3, "FD");

  // Score number
  sc(scoreC); doc.setFontSize(scoreNumSize); doc.setFont("helvetica", "bold");
  doc.text(`${confluence.score}`, M + 8, y + boxH * 0.62);
  sc(C.mid); doc.setFontSize(scoreNumSize * 0.33);
  doc.text("/100", M + scoreNumSize * 0.72, y + boxH * 0.62);

  // Action + summary
  const textX = M + scoreNumSize * 0.9 + 10;
  const summaryW = CW - (textX - M) - 4;
  sc(scoreC); doc.setFontSize(scoreNumSize * 0.37); doc.setFont("helvetica", "bold");
  doc.text(safeText(confluence.action), textX, y + boxH * 0.38);
  sc(C.dark); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  const sl = doc.splitTextToSize(safeText(confluence.summary), summaryW);
  doc.text(sl, textX, y + boxH * 0.54);

  // Bull/bear bar
  const bTotal = Math.max(1, confluence.bullCount + confluence.bearCount);
  const bPct = confluence.bullCount / bTotal;
  const barY = y + boxH - 5, barX = textX, barW = summaryW;
  sf(C.greenBg); doc.rect(barX, barY, barW * bPct, 2, "F");
  sf(C.redBg); doc.rect(barX + barW * bPct, barY, barW * (1 - bPct), 2, "F");
  sc(C.mid); doc.setFontSize(5.5); doc.setFont("helvetica", "normal");
  doc.text(`${confluence.bullCount} haussiers`, barX, barY + 4.5);
  doc.text(`${confluence.bearCount} baissiers`, barX + barW, barY + 4.5, { align: "right" });
}

// ═══════════════════════════════════════════════════════════════
// SHARED: PRICE SPARKLINE (mini chart from closes)
// ═══════════════════════════════════════════════════════════════

function drawSparkline(
  doc: jsPDF,
  closes: number[],
  supports: number[],
  resistances: number[],
  x: number, y: number, w: number, h: number,
  currency: string,
): void {
  if (!closes || closes.length < 2) return;
  const { sf, sd, sc } = makeHelpers(doc);
  const pad = { t: 6, b: 10, l: 14, r: 6 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const px = (i: number) => x + pad.l + (i / (closes.length - 1)) * cw;
  const py = (v: number) => y + pad.t + ch - ((v - min) / range) * ch;

  // Background
  sf(C.bg); doc.roundedRect(x, y, w, h, 2, 2, "F");

  // Support/resistance lines (up to 2 each)
  const drawLevel = (levels: number[], color: RGB) => {
    levels.slice(0, 2).forEach(lvl => {
      if (lvl >= min && lvl <= max) {
        sd(color); doc.setLineWidth(0.3);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.line(x + pad.l, py(lvl), x + pad.l + cw, py(lvl));
        doc.setLineDashPattern([], 0);
        sc(color); doc.setFontSize(4.5); doc.setFont("helvetica", "normal");
        doc.text(lvl.toFixed(1), x + pad.l + cw + 1, py(lvl) + 1);
      }
    });
  };
  drawLevel(supports, C.green);
  drawLevel(resistances, C.red);

  // Price area fill
  const isUp = closes[closes.length - 1] >= closes[0];
  const lineColor: RGB = isUp ? C.green : C.red;
  const fillColorHex = isUp ? "#05966912" : "#d22d2d12";

  // Build path points
  const pts = closes.map((v, i) => [px(i), py(v)]);

  // Gradient fill (simulate with light rect)
  sf([isUp ? 5 : 210, isUp ? 150 : 45, isUp ? 105 : 45] as RGB);
  doc.setGState(doc.GState({ opacity: 0.07 }));
  // Close the path: go right-bottom, left-bottom
  const pathX = pts.map(p => p[0]);
  const pathY = pts.map(p => p[1]);
  // Draw fill as polygon
  doc.setFillColor(fillColorHex.slice(1, 7));
  doc.setGState(doc.GState({ opacity: 1 }));

  // Sparkline line
  sd(lineColor); doc.setLineWidth(0.8);
  for (let i = 1; i < pts.length; i++) {
    doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }

  // Last price dot
  const lastPt = pts[pts.length - 1];
  sf(lineColor); doc.circle(lastPt[0], lastPt[1], 1.2, "F");

  // Axis labels
  sc(C.mid); doc.setFontSize(4.5); doc.setFont("helvetica", "normal");
  doc.text(`${min.toFixed(1)}`, x + 1, y + pad.t + ch + 0.5);
  doc.text(`${max.toFixed(1)}`, x + 1, y + pad.t + 2);
  doc.text(`${closes[closes.length - 1].toFixed(2)} ${currency}`, lastPt[0], lastPt[1] - 2.5, { align: "center" });

  // Border
  sd(C.border); doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, "D");
}

// ═══════════════════════════════════════════════════════════════
// SHARED: TARGETS SECTION
// ═══════════════════════════════════════════════════════════════

function drawTargets(
  doc: jsPDF,
  tgt: ReturnType<typeof computeTargets>,
  price: number, cur: string,
  y: number, isBull: boolean,
): number {
  const { sc, sf, sd } = makeHelpers(doc);
  const M = 15, CW = 180;

  sf(C.bg); doc.roundedRect(M, y, CW, 38, 2, 2, "F");

  // Left: stop + entry
  sc(C.red); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text("STOP LOSS", M + 4, y + 6);
  sc(C.dark); doc.setFontSize(10);
  doc.text(`${tgt.stop.toFixed(2)} ${cur}`, M + 4, y + 11);
  sc(C.red); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
  doc.text(fmtPct(((tgt.stop - price) / price) * 100), M + 4, y + 15);
  sc(C.blue); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text("ZONE D'ENTREE", M + 4, y + 22);
  doc.setFontSize(9);
  doc.text(`${tgt.entry.min.toFixed(2)} - ${tgt.entry.max.toFixed(2)}`, M + 4, y + 27);

  // Right: targets
  const tLabel = isBull ? "COURT TERME (1-4 sem.)" : "OBJ. BAISSIER COURT TERME";
  sc(C.green); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text(tLabel, M + 75, y + 5);
  doc.setFontSize(10);
  doc.text(`${tgt.shortTarget.toFixed(2)} ${cur}  ${fmtPct(((tgt.shortTarget - price) / price) * 100)}`, M + 75, y + 11);

  sc(C.blue); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text(isBull ? "MOYEN TERME (1-3 mois)" : "OBJ. BAISSIER MOYEN TERME", M + 75, y + 18);
  doc.setFontSize(10);
  doc.text(`${tgt.midTarget.toFixed(2)} ${cur}  ${fmtPct(((tgt.midTarget - price) / price) * 100)}`, M + 75, y + 24);

  sc(C.purple); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text(isBull ? "LONG TERME (3-6 mois)" : "OBJ. BAISSIER LONG TERME", M + 75, y + 31);
  doc.setFontSize(10);
  doc.text(`${tgt.longTarget.toFixed(2)} ${cur}  ${fmtPct(((tgt.longTarget - price) / price) * 100)}`, M + 75, y + 37);

  return y + 42;
}

// ═══════════════════════════════════════════════════════════════
// SHARED: FISCAL OPTIMIZATION SECTION
// ═══════════════════════════════════════════════════════════════

function drawFiscal(doc: jsPDF, stock: StockInfo, y: number): number {
  const { sc, sf, sd } = makeHelpers(doc);
  const M = 15, CW = 180;
  const isCrypto = stock.sector === "Crypto";
  const isEligiblePEA = ["France", "Allemagne", "Italie", "Espagne", "Pays-Bas", "UK", "Belgique", "Portugal"].includes(stock.country);
  const boxW = (CW - 4) / 2, boxH = 20;

  if (isCrypto) {
    sf(C.amberBg); doc.roundedRect(M, y, CW, 14, 2, 2, "F");
    sc(C.amber); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("CRYPTO - Flat tax 30% (PFU)", M + 4, y + 5);
    sc(C.dark); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("Plus-values soumises au PFU de 30% au-dela de 305 EUR de cession annuelle.", M + 4, y + 10);
    return y + 18;
  }

  // PEA box
  sf(isEligiblePEA ? C.greenBg : C.bg); sd(isEligiblePEA ? C.green : C.border);
  doc.setLineWidth(isEligiblePEA ? 0.5 : 0.2);
  doc.roundedRect(M, y, boxW, boxH, 2, 2, "FD");
  sc(isEligiblePEA ? C.green : C.mid); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text(isEligiblePEA ? "[OK] PEA - Recommande" : "PEA - Non eligible", M + 3, y + 5.5);
  sc(C.dark); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
  if (isEligiblePEA) {
    doc.text("17,2% de PS apres 5 ans", M + 3, y + 10);
    doc.text("Exoneration d'IR sur les PV", M + 3, y + 13.5);
    doc.text("Plafond 150 000 EUR versements", M + 3, y + 17);
  } else {
    doc.text("Actif non eligible au PEA", M + 3, y + 10);
    doc.text("(hors UE / EEE)", M + 3, y + 13.5);
  }

  // CTO box
  const ctoRec = !isEligiblePEA;
  sf(ctoRec ? C.blueBg : C.bg); sd(ctoRec ? C.blue : C.border);
  doc.setLineWidth(ctoRec ? 0.5 : 0.2);
  doc.roundedRect(M + boxW + 4, y, boxW, boxH, 2, 2, "FD");
  sc(ctoRec ? C.blue : C.mid); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text(ctoRec ? "[OK] CTO - Recommande" : "CTO - Alternative", M + boxW + 7, y + 5.5);
  sc(C.dark); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
  doc.text("Flat tax 30% (PFU)", M + boxW + 7, y + 10);
  doc.text("Pas de plafond de versement", M + boxW + 7, y + 13.5);
  doc.text("Acces mondial tous les actifs", M + boxW + 7, y + 17);

  return y + boxH + 6;
}

// ═══════════════════════════════════════════════════════════════
// SHARED: SIGNALS DETAIL (page 2 content)
// ═══════════════════════════════════════════════════════════════

function drawSignalsDetail(
  doc: jsPDF,
  stock: StockInfo,
  confluence: Confluence,
  checkPage: (n: number) => void,
  yRef: { y: number },
): void {
  const { sc, sf } = makeHelpers(doc);
  const M = 15, CW = 180;
  const sd = (c: RGB) => doc.setDrawColor(...c);
  const hline = () => { sd(C.border); doc.setLineWidth(0.2); doc.line(M, yRef.y, 210 - M, yRef.y); };

  sc(C.blue); doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("Analyse detaillee des signaux", M, yRef.y); yRef.y += 4;
  sc(C.light); doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(`${safeText(stock.name)} (${stock.ticker}) - ${confluence.layers.length} signaux analyses`, M, yRef.y); yRef.y += 6;
  hline(); yRef.y += 6;

  const layerOrder = ["price_action", "technique", "volume", "structure", "fondamental"];
  const layerLabels: Record<string, string> = {
    price_action: "PRICE ACTION", technique: "INDICATEURS TECHNIQUES",
    volume: "ANALYSE DU VOLUME", structure: "STRUCTURE DE MARCHE", fondamental: "DONNEES FONDAMENTALES",
  };
  const layerColors: Record<string, RGB> = {
    price_action: C.blue, technique: C.purple, volume: C.green, structure: C.amber, fondamental: [5, 150, 105],
  };

  for (const layer of layerOrder) {
    const sigs = confluence.layers.filter(s => s.layer === layer);
    if (!sigs.length) continue;
    checkPage(12);
    const lc = layerColors[layer] || C.mid;
    sf(lc); doc.roundedRect(M, yRef.y - 1, 2, 4, 0.5, 0.5, "F");
    sc(lc); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text(layerLabels[layer] || layer.toUpperCase(), M + 5, yRef.y + 1.5);
    yRef.y += 6;

    for (const sig of sigs) {
      checkPage(13);
      const vc = sig.verdict === "bullish" ? C.green : sig.verdict === "bearish" ? C.red : C.mid;
      sc(C.black); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
      doc.text(safeText(sig.name), M + 4, yRef.y);
      const vl = sig.verdict === "bullish" ? "HAUSSIER" : sig.verdict === "bearish" ? "BAISSIER" : "NEUTRE";
      sc(vc); doc.setFontSize(6); doc.setFont("helvetica", "bold");
      doc.text(vl, M + 58, yRef.y);
      sc(C.mid); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      doc.text(`${Math.round(sig.confidence * 100)}%`, M + 82, yRef.y);
      sf(C.bg); doc.roundedRect(M + 90, yRef.y - 2, 25, 2.5, 0.5, 0.5, "F");
      sf(vc); doc.roundedRect(M + 90, yRef.y - 2, 25 * sig.confidence, 2.5, 0.5, 0.5, "F");
      yRef.y += 3.5;
      sc(C.dark); doc.setFontSize(7); doc.setFont("helvetica", "normal");
      const dl = doc.splitTextToSize(safeText(sig.detail), CW - 8);
      doc.text(dl, M + 4, yRef.y);
      yRef.y += dl.length * 3 + 3.5;
    }
    yRef.y += 2;
  }
}

// ═══════════════════════════════════════════════════════════════
// SHARED: FUNDAMENTALS TABLE
// ═══════════════════════════════════════════════════════════════

function drawFundamentals(
  doc: jsPDF,
  fund: Fundamentals,
  price: number,
  cur: string,
  checkPage: (n: number) => void,
  yRef: { y: number },
): void {
  const { sc, sf } = makeHelpers(doc);
  const M = 15, CW = 180;
  const sd = (c: RGB) => doc.setDrawColor(...c);
  const hline = () => { sd(C.border); doc.setLineWidth(0.2); doc.line(M, yRef.y, 210 - M, yRef.y); };

  checkPage(50);
  yRef.y += 4;
  sc(C.black); doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Donnees fondamentales", M, yRef.y); yRef.y += 4; hline(); yRef.y += 5;

  const rows: [string, string, string][] = [];
  if (fund.marketCap) rows.push(["Capitalisation boursiere", `${fmtMcap(fund.marketCap)} ${cur}`, ""]);
  if (fund.pe != null) rows.push(["PER (Price/Earnings)", fund.pe.toFixed(1), fund.pe < 15 ? "Valorisation attractive" : fund.pe > 30 ? "Valorisation tendue" : ""]);
  if (fund.forwardPe != null) rows.push(["PER Forward (estime)", fund.forwardPe.toFixed(1), ""]);
  if (fund.eps != null) rows.push(["Benefice par action (BPA)", `${fund.eps.toFixed(2)} ${cur}`, ""]);
  if (fund.dividendRate != null) rows.push(["Dividende annuel", `${fund.dividendRate.toFixed(2)} ${cur} (${fund.dividendYield != null ? fund.dividendYield.toFixed(1) : "-"}%)`, fund.dividendYield != null && fund.dividendYield > 3 ? "Rendement attractif" : ""]);
  if (fund.exDividendDate) rows.push(["Date ex-dividende", fund.exDividendDate, ""]);
  if (fund.payoutRatio != null) rows.push(["Payout ratio", `${fund.payoutRatio}%`, fund.payoutRatio > 80 ? "Eleve" : fund.payoutRatio < 50 ? "Soutenable" : ""]);
  if (fund.profitMargin != null) rows.push(["Marge nette", `${fund.profitMargin}%`, fund.profitMargin > 15 ? "Excellente" : fund.profitMargin < 5 ? "Faible" : ""]);
  if (fund.debtToEquity != null) rows.push(["Dette / Capitaux propres", `${fund.debtToEquity.toFixed(0)}%`, fund.debtToEquity > 150 ? "Endettement eleve" : ""]);
  if (fund.revenueGrowth != null) rows.push(["Croissance du CA", `${fund.revenueGrowth > 0 ? "+" : ""}${fund.revenueGrowth}%`, fund.revenueGrowth > 5 ? "Dynamique positive" : ""]);
  if (fund.beta != null) rows.push(["Beta (volatilite vs marche)", fund.beta.toFixed(2), fund.beta > 1.3 ? "Volatile" : fund.beta < 0.7 ? "Defensif" : ""]);
  if (fund.targetMeanPrice != null) {
    const up = ((fund.targetMeanPrice - price) / price) * 100;
    rows.push(["Objectif moyen analystes", `${fund.targetMeanPrice.toFixed(2)} ${cur} (${fmtPct(up)})`, fund.numberOfAnalysts ? `${fund.numberOfAnalysts} analystes` : ""]);
  }
  if (fund.recommendationKey) {
    const rm: Record<string, string> = { strong_buy: "Achat fort", buy: "Achat", hold: "Conserver", sell: "Vente", strong_sell: "Vente forte" };
    rows.push(["Consensus analystes", rm[fund.recommendationKey] || fund.recommendationKey, ""]);
  }
  if (fund.sector) rows.push(["Secteur / Industrie", safeText(`${fund.sector}${fund.industry ? " - " + fund.industry : ""}`), ""]);

  let alt = false;
  for (const [label, value, comment] of rows) {
    checkPage(6);
    if (alt) { sf(C.bg); doc.rect(M, yRef.y - 2.5, CW, 6, "F"); }
    alt = !alt;
    sc(C.mid); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(label, M + 2, yRef.y);
    sc(C.black); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text(value, M + 68, yRef.y);
    if (comment) { sc(C.light); doc.setFontSize(6); doc.setFont("helvetica", "italic"); doc.text(comment, M + 125, yRef.y); }
    yRef.y += 6;
  }
}

// ═══════════════════════════════════════════════════════════════
// SHARED: FOOTER (all pages)
// ═══════════════════════════════════════════════════════════════

function drawFooters(doc: jsPDF, ticker: string): void {
  const { sc } = makeHelpers(doc);
  const M = 15, W = 210;
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    sc(C.light); doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("Nexus Stocks - Ce document ne constitue pas un conseil en investissement.", M, 289);
    doc.text(`Page ${i}/${totalPages}`, W - M, 289, { align: "right" });
  }
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY PDF (1 page)
// ═══════════════════════════════════════════════════════════════

export function exportSummaryPDF(
  stock: StockInfo, meta: Meta | null, confluence: Confluence,
  tech: TechResult, fund: Fundamentals | null, position: PortfolioPosition | null,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15, CW = 180;
  const { sc, sf, sd } = makeHelpers(doc);
  const hline = () => { sd(C.border); doc.setLineWidth(0.2); doc.line(M, y, 210 - M, y); };
  const cur = meta?.currency || "EUR";
  const price = meta?.curr || 0;
  const tgt = computeTargets(price, confluence, tech);
  const isBull = confluence.score >= 50;

  // checkPage for summary (single page — guards against overflow on long summaries)
  let y = drawHeader(doc, stock, "Resume executif", 20, 26);

  // Stock name + price
  sc(C.black); doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(safeText(stock.name), M, y); y += 6;
  if (meta) {
    sc(C.dark); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(fmtPrice(price, cur), M, y);
    sc(meta.pct >= 0 ? C.green : C.red);
    doc.text(fmtPct(meta.pct), M + 45, y);
    y += 8;
  }

  // Score box
  drawScoreBox(doc, confluence, y, 22, 30);
  y += 28;

  // Sparkline chart (if closes available)
  if (tech.closes && tech.closes.length >= 10) {
    const chartH = 36;
    drawSparkline(doc, tech.closes, tech.supports, tech.resistances, M, y, CW, chartH, cur);
    y += chartH + 4;
  }

  // Top 5 signals
  sc(C.black); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Signaux principaux", M, y); y += 4; hline(); y += 4;

  const top5 = [...confluence.layers].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  for (const sig of top5) {
    const vc = sig.verdict === "bullish" ? C.green : sig.verdict === "bearish" ? C.red : C.mid;
    sf(vc); doc.circle(M + 2, y - 0.5, 1, "F");
    sc(C.black); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text(safeText(sig.name), M + 6, y);
    sc(vc); doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
    doc.text(sig.verdict === "bullish" ? "HAUSSIER" : sig.verdict === "bearish" ? "BAISSIER" : "NEUTRE", M + 58, y);
    sc(C.dark); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    const dl = doc.splitTextToSize(safeText(sig.detail), CW - 8);
    doc.text(dl[0] || "", M + 6, y + 3.5);
    y += 8;
  }

  // Trade plan
  y += 2;
  sc(C.black); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Plan de trade", M, y); y += 4; hline(); y += 4;

  const planRows = [
    { label: "Zone d'entree", value: `${tgt.entry.min.toFixed(2)} - ${tgt.entry.max.toFixed(2)} ${cur}`, color: C.blue },
    { label: "Stop Loss", value: `${tgt.stop.toFixed(2)} ${cur} (${fmtPct(((tgt.stop - price) / price) * 100)})`, color: C.red },
    { label: isBull ? "Objectif court terme" : "Obj. baissier court terme", value: `${tgt.shortTarget.toFixed(2)} ${cur} (${fmtPct(((tgt.shortTarget - price) / price) * 100)})`, color: C.green },
    { label: isBull ? "Objectif long terme" : "Obj. baissier long terme", value: `${tgt.longTarget.toFixed(2)} ${cur} (${fmtPct(((tgt.longTarget - price) / price) * 100)})`, color: C.purple },
    { label: "Risque / Rendement", value: `1 : ${tgt.rr.toFixed(1)}`, color: C.black },
  ];
  for (const row of planRows) {
    sc(C.mid); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text(row.label, M, y);
    sc(row.color); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text(row.value, M + 52, y);
    y += 5.5;
  }

  // Portfolio
  if (position && meta) {
    sf(C.greenBg); sd(C.green); doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, 14, 2, 2, "FD");
    sc(C.green); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("Position en portefeuille", M + 4, y + 5);
    sc(C.dark); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text(`${position.quantity} actions | PRU ${position.pru.toFixed(2)} ${cur} | Valeur ${(position.quantity * price).toFixed(2)} ${cur}`, M + 4, y + 10);
    const pv = (price - position.pru) * position.quantity;
    const pvP = ((price - position.pru) / position.pru) * 100;
    sc(pv >= 0 ? C.green : C.red); doc.setFont("helvetica", "bold");
    doc.text(`P&L : ${pv >= 0 ? "+" : ""}${pv.toFixed(2)} ${cur} (${fmtPct(pvP)})`, 210 - M - 4, y + 7.5, { align: "right" });
    y += 18;
  }

  drawFooters(doc, stock.ticker);
  doc.save(`Nexus_${stock.ticker.replace(/\./g, "_")}_resume_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ═══════════════════════════════════════════════════════════════
// FULL REPORT (multi-page)
// ═══════════════════════════════════════════════════════════════

export function exportFullPDF(
  stock: StockInfo, meta: Meta | null, confluence: Confluence,
  tech: TechResult, fund: Fundamentals | null, position: PortfolioPosition | null,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15, CW = 180;
  const { sc, sf, sd } = makeHelpers(doc);
  const hline = () => { sd(C.border); doc.setLineWidth(0.2); doc.line(M, yRef.y, 210 - M, yRef.y); };
  const cur = meta?.currency || "EUR";
  const price = meta?.curr || 0;
  const tgt = computeTargets(price, confluence, tech);
  const isBull = confluence.score >= 50;

  // Use ref object so helper functions can mutate y
  const yRef = { y: drawHeader(doc, stock, "Rapport d'analyse complet", 23, 30) };

  const checkPage = (need: number) => {
    if (yRef.y + need > 275) { doc.addPage(); yRef.y = M; }
  };

  // ── Stock name + price ──
  sc(C.black); doc.setFontSize(24); doc.setFont("helvetica", "bold");
  doc.text(safeText(stock.name), M, yRef.y); yRef.y += 7;
  if (meta) {
    sc(C.dark); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(fmtPrice(price, cur), M, yRef.y);
    sc(meta.pct >= 0 ? C.green : C.red); doc.setFontSize(11);
    doc.text(fmtPct(meta.pct), M + 48, yRef.y);
    sc(C.light); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text(`Cloture precedente : ${meta.prev.toFixed(2)} ${cur}`, M, yRef.y + 5);
    yRef.y += 14;
  } else { yRef.y += 4; }

  // ── Score box ──
  drawScoreBox(doc, confluence, yRef.y, 26, 38);
  yRef.y += 32;

  // ── Recommendation ──
  const scoreC = confluence.score >= 65 ? C.green : confluence.score <= 35 ? C.red : C.amber;
  const scoreBg = confluence.score >= 65 ? C.greenBg : confluence.score <= 35 ? C.redBg : C.amberBg;
  const recTitle = confluence.score >= 65 ? "RECOMMANDATION : ACHAT" : confluence.score <= 35 ? "RECOMMANDATION : EVITER" : "RECOMMANDATION : ATTENDRE";
  const recDetail = confluence.score >= 65
    ? `${confluence.bullCount} signaux haussiers sur ${confluence.layers.length} analyses. Configuration technique favorable. Ratio risque/rendement de 1:${tgt.rr.toFixed(1)}.`
    : confluence.score <= 35
    ? `${confluence.bearCount} signaux baissiers sur ${confluence.layers.length} analyses. Configuration defavorable. Eviter toute nouvelle position.`
    : `Signaux partages (${confluence.bullCount} haussiers vs ${confluence.bearCount} baissiers sur ${confluence.layers.length}). Attendre une clarification avant de prendre position.`;

  sf(scoreBg); doc.roundedRect(M, yRef.y, CW, 14, 2, 2, "F");
  sc(scoreC); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text(recTitle, M + 4, yRef.y + 5);
  sc(C.dark); doc.setFontSize(7); doc.setFont("helvetica", "normal");
  const rl = doc.splitTextToSize(recDetail, CW - 8);
  doc.text(rl, M + 4, yRef.y + 10);
  yRef.y += 18;

  // ── Sparkline chart ──
  if (tech.closes && tech.closes.length >= 10) {
    checkPage(48);
    sc(C.black); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Evolution du prix", M, yRef.y); yRef.y += 4; hline(); yRef.y += 5;
    const chartH = 44;
    drawSparkline(doc, tech.closes, tech.supports, tech.resistances, M, yRef.y, CW, chartH, cur);
    yRef.y += chartH + 6;
  }

  // ── Fiscal ──
  checkPage(32);
  sc(C.black); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Optimisation fiscale", M, yRef.y); yRef.y += 4; hline(); yRef.y += 5;
  yRef.y = drawFiscal(doc, stock, yRef.y);

  // ── Targets ──
  checkPage(52);
  sc(C.black); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Objectifs de prix", M, yRef.y); yRef.y += 4; hline(); yRef.y += 5;
  yRef.y = drawTargets(doc, tgt, price, cur, yRef.y, isBull);

  // R/R
  sc(C.dark); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text(`Ratio risque/rendement : 1 : ${tgt.rr.toFixed(1)}`, M, yRef.y);
  yRef.y += 6;

  // ── Portfolio ──
  if (position && meta) {
    checkPage(18);
    sf(C.greenBg); sd(C.green); doc.setLineWidth(0.3);
    doc.roundedRect(M, yRef.y, CW, 14, 2, 2, "FD");
    sc(C.green); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("Position en portefeuille", M + 4, yRef.y + 5);
    sc(C.dark); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text(`${position.quantity} actions | PRU ${position.pru.toFixed(2)} ${cur} | Valeur ${(position.quantity * price).toFixed(2)} ${cur}`, M + 4, yRef.y + 10);
    const pv = (price - position.pru) * position.quantity;
    const pvP = ((price - position.pru) / position.pru) * 100;
    sc(pv >= 0 ? C.green : C.red); doc.setFont("helvetica", "bold");
    doc.text(`P&L : ${pv >= 0 ? "+" : ""}${pv.toFixed(2)} ${cur} (${fmtPct(pvP)})`, 210 - M - 4, yRef.y + 7.5, { align: "right" });
    yRef.y += 18;
  }

  // ══════════════════════════════════════════════
  // PAGE 2 — SIGNALS
  // ══════════════════════════════════════════════
  doc.addPage(); yRef.y = M;
  drawSignalsDetail(doc, stock, confluence, checkPage, yRef);

  // ── Fundamentals ──
  if (fund) {
    drawFundamentals(doc, fund, price, cur, checkPage, yRef);
  }

  drawFooters(doc, stock.ticker);
  doc.save(`Nexus_${stock.ticker.replace(/\./g, "_")}_complet_${new Date().toISOString().split("T")[0]}.pdf`);
}