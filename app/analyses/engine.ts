// ═══════════════════════════════════════════════════════════════
// NEXUS STOCKS — Analysis Engine
// Technical indicators, confluence scoring, 3 visual scores
// ═══════════════════════════════════════════════════════════════

import type { OHLCV, TechResult, LayerSignal, Confluence, Fundamentals, HealthScore, ValuationScore, MomentumScore } from "./types";

// ═══════════════════════════════════════════════════════════════
// TECHNICAL INDICATORS
// ═══════════════════════════════════════════════════════════════

function sma(arr: number[], p: number): number[] {
  return arr.map((_, i) => i < p - 1 ? NaN : arr.slice(i - p + 1, i + 1).reduce((s, v) => s + v, 0) / p);
}

function ema(arr: number[], p: number): number[] {
  const k = 2 / (p + 1), r: number[] = [arr[0]];
  for (let i = 1; i < arr.length; i++) r.push(arr[i] * k + r[i - 1] * (1 - k));
  return r;
}

export function rsiCalc(c: number[], p = 14): number[] {
  const r: number[] = Array(c.length).fill(NaN);
  let gA = 0, lA = 0;
  for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d > 0) gA += d; else lA -= d; }
  gA /= p; lA /= p; r[p] = lA === 0 ? 100 : 100 - 100 / (1 + gA / lA);
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1]; const g = d > 0 ? d : 0; const l = d < 0 ? -d : 0;
    gA = (gA * (p - 1) + g) / p; lA = (lA * (p - 1) + l) / p;
    r[i] = lA === 0 ? 100 : 100 - 100 / (1 + gA / lA);
  }
  return r;
}

function stochRsiCalc(rsi: number[], p = 14, k = 3, d = 3) {
  const sr: number[] = rsi.map((_, i) => {
    if (i < p - 1 || isNaN(rsi[i])) return NaN;
    const sl = rsi.slice(i - p + 1, i + 1).filter(v => !isNaN(v));
    const mn = Math.min(...sl), mx = Math.max(...sl);
    return mx === mn ? 50 : ((rsi[i] - mn) / (mx - mn)) * 100;
  });
  return { k: sma(sr, k), d: sma(sma(sr, k), d) };
}

function macdCalc(c: number[], f = 12, s = 26, sig = 9) {
  const eF = ema(c, f), eS = ema(c, s);
  const m = eF.map((v, i) => v - eS[i]);
  const sg = ema(m, sig);
  return { macd: m, signal: sg, histogram: m.map((v, i) => v - sg[i]) };
}

function bbCalc(c: number[], p = 20, k = 2) {
  const mid = sma(c, p);
  const std = c.map((_, i) => {
    if (i < p - 1) return NaN;
    const sl = c.slice(i - p + 1, i + 1), avg = mid[i];
    return Math.sqrt(sl.reduce((s, v) => s + (v - avg) ** 2, 0) / p);
  });
  return { upper: mid.map((m, i) => m + k * (std[i] || 0)), middle: mid, lower: mid.map((m, i) => m - k * (std[i] || 0)) };
}

function atrCalc(o: OHLCV[], p = 14): number[] {
  const tr = o.map((c, i) => i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - o[i - 1].close), Math.abs(c.low - o[i - 1].close)));
  return sma(tr, p);
}

function ichimokuCalc(o: OHLCV[]) {
  const hs = o.map(c => c.high), ls = o.map(c => c.low);
  const mp = (h: number[], l: number[], p: number, i: number) => i < p - 1 ? NaN : (Math.max(...h.slice(i - p + 1, i + 1)) + Math.min(...l.slice(i - p + 1, i + 1))) / 2;
  const tk = o.map((_, i) => mp(hs, ls, 9, i));
  const kj = o.map((_, i) => mp(hs, ls, 26, i));
  return { tenkan: tk, kijun: kj, senkouA: tk.map((t, i) => isNaN(t) || isNaN(kj[i]) ? NaN : (t + kj[i]) / 2), senkouB: o.map((_, i) => mp(hs, ls, 52, i)) };
}

function fibCalc(o: OHLCV[]) {
  const r = o.slice(-60);
  const hi = Math.max(...r.map(c => c.high)), lo = Math.min(...r.map(c => c.low)), rng = hi - lo;
  return { levels: [{ label: "0%", price: hi }, { label: "23.6%", price: hi - rng * 0.236 }, { label: "38.2%", price: hi - rng * 0.382 }, { label: "50%", price: hi - rng * 0.5 }, { label: "61.8%", price: hi - rng * 0.618 }, { label: "100%", price: lo }] };
}

function obvCalc(c: number[], v: number[]) {
  const r = [0];
  for (let i = 1; i < c.length; i++) r.push(r[i - 1] + (c[i] > c[i - 1] ? v[i] : c[i] < c[i - 1] ? -v[i] : 0));
  return r;
}

function srCalc(o: OHLCV[], lb = 15) {
  const hs = o.map(c => c.high), ls = o.map(c => c.low);
  const ph: number[] = [], pl: number[] = [];
  for (let i = lb; i < o.length - lb; i++) {
    if (hs[i] === Math.max(...hs.slice(i - lb, i + lb + 1))) ph.push(hs[i]);
    if (ls[i] === Math.min(...ls.slice(i - lb, i + lb + 1))) pl.push(ls[i]);
  }
  const cl = (a: number[]) => {
    const s = [...a].sort((x, y) => x - y), out: number[] = [];
    let i = 0;
    while (i < s.length) { let j = i; while (j < s.length && (s[j] - s[i]) / s[i] < 0.005) j++; out.push(s.slice(i, j).reduce((x, y) => x + y, 0) / (j - i)); i = j; }
    return out.slice(-4);
  };
  return { supports: cl(pl), resistances: cl(ph) };
}

export function computeAll(o: OHLCV[]): TechResult {
  const c = o.map(x => x.close), v = o.map(x => x.volume);
  const { supports, resistances } = srCalc(o);
  return {
    rsi: rsiCalc(c), stochRsi: stochRsiCalc(rsiCalc(c)),
    macd: macdCalc(c), bb: bbCalc(c),
    ma20: sma(c, 20), ma50: sma(c, 50), ma200: sma(c, 200),
    obv: obvCalc(c, v), atr: atrCalc(o),
    ichimoku: ichimokuCalc(o), fibonacci: fibCalc(o),
    supports, resistances,
  };
}

// ═══════════════════════════════════════════════════════════════
// CONFLUENCE ENGINE
// ═══════════════════════════════════════════════════════════════

export function analyzeConfluence(ohlcv: OHLCV[], t: TechResult, fund?: Fundamentals | null): Confluence {
  const n = ohlcv.length - 1, price = ohlcv[n].close, layers: LayerSignal[] = [];
  const atr = t.atr[n] || price * 0.02;

  // ══ LAYER 1: PRICE ACTION ══
  const rec = ohlcv.slice(-20), hs = rec.map(c => c.high), ls = rec.map(c => c.low);
  let hh = 0, ll = 0;
  for (let i = 5; i < rec.length; i++) { if (hs[i] > hs[i - 5]) hh++; if (ls[i] < ls[i - 5]) ll++; }
  const ts2 = (hh - ll) / rec.length;
  if (ts2 > 0.15) layers.push({ layer: "price_action", name: "Tendance haussière", verdict: "bullish", confidence: Math.min(0.9, ts2 * 3), detail: "Plus hauts et plus bas ascendants — les acheteurs dominent." });
  else if (ts2 < -0.15) layers.push({ layer: "price_action", name: "Tendance baissière", verdict: "bearish", confidence: Math.min(0.9, Math.abs(ts2) * 3), detail: "Plus bas successifs — les vendeurs contrôlent." });
  else layers.push({ layer: "price_action", name: "Consolidation", verdict: "neutral", confidence: 0.5, detail: "Pas de tendance claire. Phase d'équilibre." });

  const c0 = ohlcv[n], c1 = ohlcv[n - 1];
  const body = Math.abs(c0.close - c0.open), wLo = Math.min(c0.open, c0.close) - c0.low, avgB = rec.slice(-10).reduce((s, c2) => s + Math.abs(c2.close - c2.open), 0) / 10;
  if (wLo > body * 2 && body > 0) layers.push({ layer: "price_action", name: "Marteau", verdict: "bullish", confidence: 0.75, detail: "Longue mèche basse — les vendeurs ont été repoussés." });
  if (body < avgB * 0.15 && avgB > 0) layers.push({ layer: "price_action", name: "Doji", verdict: "neutral", confidence: 0.6, detail: "Indécision. Attendre confirmation." });
  if (c0.close > c0.open && c1.close < c1.open && c0.close > c1.open && c0.open < c1.close) layers.push({ layer: "price_action", name: "Englobante haussière", verdict: "bullish", confidence: 0.8, detail: "Les acheteurs ont absorbé toute la pression vendeuse." });
  if (c0.close < c0.open && c1.close > c1.open && c0.open > c1.close && c0.close < c1.open) layers.push({ layer: "price_action", name: "Englobante baissière", verdict: "bearish", confidence: 0.8, detail: "Les vendeurs reprennent le contrôle." });

  // ══ LAYER 2: STRUCTURE (S/R with breakout logic + Ichimoku) ══
  const nearThreshold = 0.015, breakThreshold = 0.005;
  for (const r of t.resistances) {
    const dist = (price - r) / price;
    if (dist > breakThreshold && dist < 0.04) { layers.push({ layer: "structure", name: "Résistance cassée", verdict: "bullish", confidence: 0.8, detail: `Ancienne résistance à ${r.toFixed(2)} franchie — devient support.` }); break; }
    else if (Math.abs(dist) < nearThreshold && dist <= breakThreshold) { layers.push({ layer: "structure", name: "Résistance proche", verdict: "bearish", confidence: 0.7, detail: `Résistance à ${r.toFixed(2)} — risque de rejet.` }); break; }
  }
  for (const s of [...t.supports].reverse()) {
    const dist = (s - price) / price;
    if (dist > breakThreshold && dist < 0.04) { layers.push({ layer: "structure", name: "Support cassé", verdict: "bearish", confidence: 0.8, detail: `Ancien support à ${s.toFixed(2)} cassé — devient résistance.` }); break; }
    else if (Math.abs(dist) < nearThreshold && dist <= breakThreshold) { layers.push({ layer: "structure", name: "Support proche", verdict: "bullish", confidence: 0.7, detail: `Support à ${s.toFixed(2)} — rebond probable.` }); break; }
  }
  const sa = t.ichimoku.senkouA[n], sb = t.ichimoku.senkouB[n];
  if (!isNaN(sa) && !isNaN(sb)) {
    const cl2 = Math.max(sa, sb), clL = Math.min(sa, sb);
    if (price > cl2) layers.push({ layer: "structure", name: "Au-dessus du nuage", verdict: "bullish", confidence: 0.75, detail: "Ichimoku confirme la tendance haussière." });
    else if (price < clL) layers.push({ layer: "structure", name: "Sous le nuage", verdict: "bearish", confidence: 0.75, detail: "Ichimoku confirme la tendance baissière." });
    else layers.push({ layer: "structure", name: "Dans le nuage", verdict: "neutral", confidence: 0.5, detail: "Zone d'incertitude Ichimoku." });
  }

  // ══ LAYER 3: TECHNICAL ══
  const rsi = t.rsi[n];
  if (!isNaN(rsi)) {
    if (rsi < 30) layers.push({ layer: "technique", name: "RSI survendu", verdict: "bullish", confidence: 0.8, detail: `RSI à ${rsi.toFixed(0)} — les vendeurs s'épuisent.` });
    else if (rsi > 70) layers.push({ layer: "technique", name: "RSI suracheté", verdict: "bearish", confidence: 0.8, detail: `RSI à ${rsi.toFixed(0)} — risque de correction.` });
    else layers.push({ layer: "technique", name: `RSI ${rsi.toFixed(0)}`, verdict: "neutral", confidence: 0.3, detail: "Pas de signal extrême." });
  }
  const mc = t.macd.macd[n], ms = t.macd.signal[n], mcp = t.macd.macd[n - 1], msp = t.macd.signal[n - 1];
  if (!isNaN(mc) && !isNaN(ms) && !isNaN(mcp) && !isNaN(msp)) {
    if (mcp < msp && mc > ms) layers.push({ layer: "technique", name: "MACD croisement haussier", verdict: "bullish", confidence: 0.85, detail: "Retournement du momentum à la hausse." });
    else if (mcp > msp && mc < ms) layers.push({ layer: "technique", name: "MACD croisement baissier", verdict: "bearish", confidence: 0.85, detail: "Retournement du momentum à la baisse." });
    else if (mc > ms) layers.push({ layer: "technique", name: "MACD positif", verdict: "bullish", confidence: 0.5, detail: "Momentum haussier en cours." });
    else layers.push({ layer: "technique", name: "MACD négatif", verdict: "bearish", confidence: 0.5, detail: "Pression vendeuse." });
  }
  const [ma20, ma50] = [t.ma20[n], t.ma50[n]];
  if (!isNaN(ma20) && !isNaN(ma50)) {
    if (price > ma20 && price > ma50) layers.push({ layer: "technique", name: "Prix > MAs", verdict: "bullish", confidence: 0.7, detail: "Au-dessus des moyennes mobiles 20 et 50." });
    else if (price < ma20 && price < ma50) layers.push({ layer: "technique", name: "Prix < MAs", verdict: "bearish", confidence: 0.7, detail: "Sous les moyennes mobiles." });
  }
  if (!isNaN(t.bb.upper[n]) && !isNaN(t.bb.lower[n])) {
    if (price <= t.bb.lower[n]) layers.push({ layer: "technique", name: "Bande basse Bollinger", verdict: "bullish", confidence: 0.65, detail: "Prix extrême bas — rebond probable." });
    else if (price >= t.bb.upper[n]) layers.push({ layer: "technique", name: "Bande haute Bollinger", verdict: "bearish", confidence: 0.65, detail: "Prix extrême haut — retour vers moyenne." });
    const w = ((t.bb.upper[n] - t.bb.lower[n]) / t.bb.middle[n]) * 100;
    if (w < 3) layers.push({ layer: "technique", name: "Squeeze Bollinger", verdict: "neutral", confidence: 0.7, detail: "Volatilité comprimée — explosion imminente." });
  }

  // ══ LAYER 4: VOLUME (with bull trap) ══
  const avgVol = ohlcv.slice(-20).reduce((s, c2) => s + c2.volume, 0) / 20;
  const curVol = ohlcv[n].volume, vR = curVol / (avgVol || 1);
  const obvCh = t.obv[n] - t.obv[Math.max(0, n - 10)];
  const prCh = price - ohlcv[Math.max(0, n - 10)].close;
  const isDayBreakout = Math.abs(prCh / (price || 1)) > 0.02;

  if (vR > 1.5 && prCh > 0) layers.push({ layer: "volume", name: "Volume fort haussier", verdict: "bullish", confidence: Math.min(0.95, 0.6 + vR * 0.1), detail: `Volume ${vR.toFixed(1)}x la moyenne — conviction forte.` });
  else if (vR > 1.5 && prCh < 0) layers.push({ layer: "volume", name: "Volume fort baissier", verdict: "bearish", confidence: Math.min(0.95, 0.6 + vR * 0.1), detail: `Volume ${vR.toFixed(1)}x avec baisse — pression vendeuse.` });
  else if (vR < 0.5 && isDayBreakout && prCh > 0) layers.push({ layer: "volume", name: "Bull trap potentiel", verdict: "bearish", confidence: 0.75, detail: `Cassure sur volume faible (${(vR * 100).toFixed(0)}% moy.) — non validé.` });
  else if (vR < 0.5) layers.push({ layer: "volume", name: "Volume faible", verdict: "bearish", confidence: 0.45, detail: `Volume à ${(vR * 100).toFixed(0)}% de la moyenne — prudence.` });
  else layers.push({ layer: "volume", name: `Volume ${vR.toFixed(1)}x`, verdict: "neutral", confidence: 0.3, detail: "Activité normale." });

  if (obvCh > 0 && prCh < 0) layers.push({ layer: "volume", name: "Accumulation OBV", verdict: "bullish", confidence: 0.8, detail: "OBV monte malgré la baisse — accumulation." });
  else if (obvCh < 0 && prCh > 0) layers.push({ layer: "volume", name: "Distribution OBV", verdict: "bearish", confidence: 0.8, detail: "OBV baisse malgré la hausse — distribution." });

  // ══ LAYER 5: FUNDAMENTALS ══
  if (fund) {
    if (fund.pe != null && fund.pe > 0) {
      if (fund.pe < 12) layers.push({ layer: "fondamental", name: "PER attractif", verdict: "bullish", confidence: 0.65, detail: `PER de ${fund.pe.toFixed(1)} — sous-évaluée.` });
      else if (fund.pe > 35) layers.push({ layer: "fondamental", name: "PER élevé", verdict: "bearish", confidence: 0.5, detail: `PER de ${fund.pe.toFixed(1)} — surévaluation possible.` });
    }
    if (fund.dividendYield != null && fund.dividendYield >= 3) layers.push({ layer: "fondamental", name: "Dividende élevé", verdict: "bullish", confidence: 0.55, detail: `Rendement de ${fund.dividendYield.toFixed(1)}%.` });
    if (fund.revenueGrowth != null) {
      if (fund.revenueGrowth > 5) layers.push({ layer: "fondamental", name: "Croissance CA", verdict: "bullish", confidence: 0.6, detail: `+${fund.revenueGrowth.toFixed(1)}%.` });
      else if (fund.revenueGrowth < -5) layers.push({ layer: "fondamental", name: "CA en baisse", verdict: "bearish", confidence: 0.6, detail: `${fund.revenueGrowth.toFixed(1)}%.` });
    }
    if (fund.debtToEquity != null && fund.debtToEquity > 150) layers.push({ layer: "fondamental", name: "Dette élevée", verdict: "bearish", confidence: 0.5, detail: `D/E ${fund.debtToEquity.toFixed(0)}%.` });
    if (fund.targetMeanPrice != null && price > 0) {
      const up = ((fund.targetMeanPrice - price) / price) * 100;
      if (up > 15) layers.push({ layer: "fondamental", name: "Obj. analystes haussier", verdict: "bullish", confidence: 0.55, detail: `Obj. ${fund.targetMeanPrice.toFixed(2)} (+${up.toFixed(0)}%).` });
      else if (up < -10) layers.push({ layer: "fondamental", name: "Obj. analystes baissier", verdict: "bearish", confidence: 0.5, detail: `Obj. ${fund.targetMeanPrice.toFixed(2)} (${up.toFixed(0)}%).` });
    }
    if (fund.profitMargin != null && fund.profitMargin > 20) layers.push({ layer: "fondamental", name: "Marge élevée", verdict: "bullish", confidence: 0.4, detail: `Marge nette ${fund.profitMargin.toFixed(1)}%.` });
  }

  // ══ SCORING ══
  const bullish = layers.filter(l => l.verdict === "bullish"), bearish = layers.filter(l => l.verdict === "bearish");
  const bS = bullish.reduce((s, l) => s + l.confidence, 0), beS = bearish.reduce((s, l) => s + l.confidence, 0), tot = bS + beS || 1;
  const score = Math.round(Math.min(100, Math.max(0, 50 + ((bS - beS) / tot) * 50)));
  const action: Confluence["action"] = score >= 65 ? "OPPORTUNITÉ" : score <= 35 ? "RISQUÉ" : "ATTENDRE";

  // ══ TRADE PLAN (asset-class-aware) ══
  const isBull = score >= 50;
  const nearSup = t.supports.filter(s => s < price).sort((a, b) => b - a)[0] || (price - atr * 1.5);
  const nearRes = t.resistances.filter(r => r > price).sort((a, b) => a - b)[0] || (price + atr * 1.5);

  const beta = (fund?.beta != null && fund.beta > 0) ? fund.beta : 1.0;
  const isCrypto = !fund;
  const maxStopPct = isCrypto ? 0.12 : beta > 1.3 ? 0.06 : beta > 0.9 ? 0.045 : 0.035;
  const maxT1Pct = isCrypto ? 0.20 : beta > 1.3 ? 0.10 : beta > 0.9 ? 0.07 : 0.05;
  const maxT2Pct = maxT1Pct * 1.6, maxT3Pct = maxT1Pct * 2.5;

  let sl: number, t1: number, t2: number, t3: number;
  if (isBull) {
    sl = Math.max(nearSup - atr * 0.2, price * (1 - maxStopPct), price * 0.85);
    const risk = Math.abs(price - sl);
    t1 = Math.min(price + risk * 2, price * (1 + maxT1Pct));
    t2 = Math.min(price + risk * 3, price * (1 + maxT2Pct));
    t3 = Math.min(price + risk * 4.5, price * (1 + maxT3Pct));
    if (nearRes > price && nearRes < price * (1 + maxT1Pct) && nearRes > price + risk * 1.5) t1 = nearRes;
  } else {
    sl = Math.min(nearRes + atr * 0.2, price * (1 + maxStopPct), price * 1.15);
    const risk = Math.abs(sl - price);
    t1 = Math.max(price - risk * 2, price * (1 - maxT1Pct));
    t2 = Math.max(price - risk * 3, price * (1 - maxT2Pct));
    t3 = Math.max(price - risk * 4.5, price * (1 - maxT3Pct));
    if (nearSup < price && nearSup > price * (1 - maxT1Pct) && nearSup < price - Math.abs(sl - price) * 1.5) t1 = nearSup;
  }
  const riskAmt = Math.abs(price - sl), rewardAmt = Math.abs(t1 - price);
  const rr = riskAmt > 0 ? Math.round((rewardAmt / riskAmt) * 10) / 10 : 0;

  const summary = score >= 65
    ? `${bullish.length} signaux haussiers convergent — opportunité identifiée.`
    : score <= 35
    ? `${bearish.length} signaux baissiers convergent — configuration défavorable.`
    : `Signaux mixtes (${bullish.length} haussiers vs ${bearish.length} baissiers). Attendre clarification.`;

  return {
    score, action, layers, bullCount: bullish.length, bearCount: bearish.length, summary,
    entryZone: { min: Math.max(isBull ? nearSup : price - atr * 0.3, price - atr * 0.5), max: price + atr * 0.3 },
    stopLoss: sl, targets: [t1, t2, t3], riskReward: rr,
  };
}

// ═══════════════════════════════════════════════════════════════
// 3 VISUAL SCORES (revolutionary stock card)
// ═══════════════════════════════════════════════════════════════

export function computeHealthScore(fund: Fundamentals | null): HealthScore {
  if (!fund) return { score: 50, label: "Données indisponibles", details: [] };
  let score = 50;
  const details: HealthScore["details"] = [];

  // Revenue growth
  if (fund.revenueGrowth != null) {
    const v = fund.revenueGrowth;
    const verdict = v > 10 ? "good" : v > 0 ? "neutral" : v > -5 ? "warning" : "bad";
    score += v > 10 ? 15 : v > 0 ? 5 : v > -5 ? -5 : -15;
    details.push({ name: "Croissance CA", value: `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, verdict });
  }
  // Profit margin
  if (fund.profitMargin != null) {
    const v = fund.profitMargin;
    const verdict = v > 15 ? "good" : v > 5 ? "neutral" : v > 0 ? "warning" : "bad";
    score += v > 15 ? 12 : v > 5 ? 5 : v > 0 ? -5 : -12;
    details.push({ name: "Marge nette", value: `${v.toFixed(1)}%`, verdict });
  }
  // Debt
  if (fund.debtToEquity != null) {
    const v = fund.debtToEquity;
    const verdict = v < 50 ? "good" : v < 100 ? "neutral" : v < 200 ? "warning" : "bad";
    score += v < 50 ? 10 : v < 100 ? 3 : v < 200 ? -5 : -12;
    details.push({ name: "Dette/CP", value: `${v.toFixed(0)}%`, verdict });
  }
  // EPS
  if (fund.eps != null) {
    const verdict = fund.eps > 0 ? "good" : "bad";
    score += fund.eps > 0 ? 8 : -10;
    details.push({ name: "Bénéfice/action", value: `${fund.eps.toFixed(2)}`, verdict });
  }
  // Payout ratio
  if (fund.payoutRatio != null) {
    const v = fund.payoutRatio;
    const verdict = v < 50 ? "good" : v < 80 ? "neutral" : "warning";
    details.push({ name: "Payout ratio", value: `${v}%`, verdict });
  }

  const label = score >= 70 ? "Excellente santé" : score >= 50 ? "Santé correcte" : score >= 30 ? "Fragile" : "Préoccupante";
  return { score: Math.max(0, Math.min(100, score)), label, details };
}

export function computeValuationScore(fund: Fundamentals | null, price: number): ValuationScore {
  if (!fund) return { score: 50, label: "Données indisponibles", details: [] };
  let score = 50;
  const details: ValuationScore["details"] = [];

  // PER
  if (fund.pe != null && fund.pe > 0) {
    const v = fund.pe;
    const verdict = v < 12 ? "good" : v < 20 ? "neutral" : v < 35 ? "warning" : "bad";
    score += v < 12 ? 18 : v < 20 ? 8 : v < 35 ? -5 : -15;
    details.push({ name: "PER", value: v.toFixed(1), verdict });
  }
  // Forward PE
  if (fund.forwardPe != null && fund.forwardPe > 0) {
    const v = fund.forwardPe;
    const verdict = v < 15 ? "good" : v < 25 ? "neutral" : "warning";
    score += v < 15 ? 8 : v < 25 ? 2 : -5;
    details.push({ name: "PER Forward", value: v.toFixed(1), verdict });
  }
  // Target vs price
  if (fund.targetMeanPrice != null && price > 0) {
    const upside = ((fund.targetMeanPrice - price) / price) * 100;
    const verdict = upside > 15 ? "good" : upside > 0 ? "neutral" : upside > -10 ? "warning" : "bad";
    score += upside > 15 ? 12 : upside > 0 ? 4 : upside > -10 ? -4 : -12;
    details.push({ name: "Potentiel analystes", value: `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`, verdict });
  }
  // Dividend yield
  if (fund.dividendYield != null) {
    const v = fund.dividendYield;
    const verdict = v >= 4 ? "good" : v >= 2 ? "neutral" : "neutral";
    if (v >= 3) score += 5;
    details.push({ name: "Rendement div.", value: `${v.toFixed(1)}%`, verdict });
  }

  const label = score >= 70 ? "Sous-évaluée" : score >= 50 ? "Correctement valorisée" : score >= 30 ? "Chère" : "Surévaluée";
  return { score: Math.max(0, Math.min(100, score)), label, details };
}

export function computeMomentumScore(t: TechResult, ohlcv: OHLCV[]): MomentumScore {
  const n = ohlcv.length - 1, price = ohlcv[n].close;
  let score = 50;
  const details: MomentumScore["details"] = [];

  // RSI
  const rsi = t.rsi[n];
  if (!isNaN(rsi)) {
    const verdict = rsi < 30 ? "good" : rsi < 45 ? "neutral" : rsi < 70 ? "neutral" : "bad";
    score += rsi < 30 ? 10 : rsi > 70 ? -10 : 0;
    details.push({ name: "RSI", value: rsi.toFixed(0), verdict });
  }
  // MA trend
  if (!isNaN(t.ma20[n]) && !isNaN(t.ma50[n])) {
    const above = price > t.ma20[n] && price > t.ma50[n];
    const below = price < t.ma20[n] && price < t.ma50[n];
    score += above ? 12 : below ? -12 : 0;
    details.push({ name: "Moy. mobiles", value: above ? "Au-dessus" : below ? "En-dessous" : "Mixte", verdict: above ? "good" : below ? "bad" : "neutral" });
  }
  // MACD
  const mc = t.macd.macd[n], ms2 = t.macd.signal[n];
  if (!isNaN(mc) && !isNaN(ms2)) {
    const bull = mc > ms2;
    score += bull ? 8 : -8;
    details.push({ name: "MACD", value: bull ? "Haussier" : "Baissier", verdict: bull ? "good" : "bad" });
  }
  // Volume
  const avgVol = ohlcv.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
  const vR = ohlcv[n].volume / (avgVol || 1);
  details.push({ name: "Volume", value: `${(vR * 100).toFixed(0)}%`, verdict: vR > 1.2 ? "good" : vR < 0.5 ? "warning" : "neutral" });

  // Ichimoku
  const sa2 = t.ichimoku.senkouA[n], sb2 = t.ichimoku.senkouB[n];
  if (!isNaN(sa2) && !isNaN(sb2)) {
    const above = price > Math.max(sa2, sb2);
    const below = price < Math.min(sa2, sb2);
    score += above ? 10 : below ? -10 : 0;
    details.push({ name: "Ichimoku", value: above ? "Haussier" : below ? "Baissier" : "Neutre", verdict: above ? "good" : below ? "bad" : "neutral" });
  }

  const label = score >= 70 ? "Tendance forte" : score >= 50 ? "Momentum neutre" : score >= 30 ? "Pression vendeuse" : "Tendance baissière";
  return { score: Math.max(0, Math.min(100, score)), label, details };
}

// ═══════════════════════════════════════════════════════════════
// COLLECTIONS
// ═══════════════════════════════════════════════════════════════

import type { Collection } from "./types";

export const COLLECTIONS: Collection[] = [
  { id: "dividendes", name: "Action à dividende", emoji: "", description: "Blue chips avec rendements élevés et réguliers", tickers: ["AI.PA", "TTE.PA", "BNP.PA", "CS.PA", "ENGI.PA", "SAN.PA"], gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  { id: "ia", name: "Action IA", emoji: "", description: "Les leaders de l'intelligence artificielle", tickers: ["NVDA", "MSFT", "GOOGL", "META", "ASML.AS", "SAP.DE"], gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)" },
  { id: "luxe", name: "Luxe français", emoji: "", description: "Le luxe made in France", tickers: ["MC.PA", "RMS.PA", "KER.PA", "OR.PA"], gradient: "linear-gradient(135deg, #ec4899, #f43f5e)" },
  { id: "defense", name: "Défense & Aéro", emoji: "", description: "Sécurité et aérospatiale européenne", tickers: ["AIR.PA", "SAF.PA", "HO.PA"], gradient: "linear-gradient(135deg, #64748b, #475569)" },
  { id: "vert", name: "Transition verte", emoji: "", description: "Énergie et industrie durable", tickers: ["ENGI.PA", "SU.PA", "TTE.PA", "SHEL.L"], gradient: "linear-gradient(135deg, #10b981, #059669)" },
  { id: "crypto", name: "Crypto majeurs", emoji: "", description: "Bitcoin et Ethereum", tickers: ["BTC-EUR", "ETH-EUR"], gradient: "linear-gradient(135deg, #f59e0b, #ea580c)" },
  { id: "us_tech", name: "GAFAM+", emoji: "", description: "Les géants tech américains", tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"], gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" },
];