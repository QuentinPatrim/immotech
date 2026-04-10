"use client";

import { motion } from "framer-motion";
import { T, bubbleCard, FONT_MONO } from "../theme";

interface TradePlanVisualProps {
  price: number;
  stopLoss: number;
  entry: { min: number; max: number };
  targets: number[];
  currency: string;
  riskReward: number;
  isBull: boolean;
}

function fmtPct(v: number) { return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`; }

export default function TradePlanVisual({ price, stopLoss, entry, targets, currency, riskReward, isBull }: TradePlanVisualProps) {
  const allP = [stopLoss, entry.min, entry.max, price, ...targets].filter(v => v > 0);
  const pMin = Math.min(...allP) * 0.996, pMax = Math.max(...allP) * 1.004;
  const range = pMax - pMin || 1;
  const toPercent = (p: number) => ((p - pMin) / range) * 100;

  const levels = [
    { label: "Stop Loss", price: stopLoss, color: T.red, pct: fmtPct(((stopLoss - price) / price) * 100) },
    { label: "Entrée", price: (entry.min + entry.max) / 2, color: T.blueBright, pct: "" },
    ...targets.map((t, i) => ({
      label: `Objectif ${i + 1}`,
      price: t,
      color: i === 0 ? T.green : i === 1 ? T.blueBright : T.violet,
      pct: fmtPct(((t - price) / price) * 100),
    })),
  ];

  return (
    <div className="p-5 overflow-hidden" style={{ ...bubbleCard }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: T.textDim }}>Plan de trade</span>
        <span className="text-[10px] font-mono font-bold px-3 py-1" style={{ borderRadius: 20, background: T.blueBg, color: T.blueBright, border: `1px solid rgba(99,102,241,0.12)` }}>
          R:R 1:{riskReward.toFixed(1)}
        </span>
      </div>
      <div className="relative h-52 ml-3 mr-12">
        <div className="absolute left-7 top-0 bottom-0 w-px" style={{ background: T.border }} />
        {isBull && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="absolute rounded-sm"
            style={{ bottom: `${toPercent(stopLoss)}%`, height: `${toPercent(entry.min) - toPercent(stopLoss)}%`, width: 14, left: 2,
              background: `linear-gradient(to top, ${T.redBg}, transparent)`, borderLeft: `2px solid ${T.red}30` }} />
        )}
        {isBull && targets[0] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="absolute rounded-sm"
            style={{ bottom: `${toPercent(entry.max)}%`, height: `${toPercent(targets[0]) - toPercent(entry.max)}%`, width: 14, left: 2,
              background: `linear-gradient(to top, transparent, ${T.greenBg})`, borderLeft: `2px solid ${T.green}30` }} />
        )}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="absolute flex items-center gap-2" style={{ bottom: `${toPercent(price)}%`, left: 0, right: 0, transform: "translateY(50%)" }}>
          <div className="h-px flex-1" style={{ background: T.textDim }} />
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderRadius: T.rXs, background: T.elevated, border: `1px solid ${T.borderMid}`, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
            <span className="text-[13px] font-black" style={{ color: T.text, fontFamily: FONT_MONO }}>{price.toFixed(2)}</span>
            <span className="text-[9px]" style={{ color: T.textDim }}>{currency}</span>
          </div>
        </motion.div>
        {levels.map((lvl, i) => (
          <motion.div key={lvl.label} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
            className="absolute flex items-center gap-2" style={{ bottom: `${toPercent(lvl.price)}%`, left: 22, right: 0, transform: "translateY(50%)" }}>
            <div className="flex-1 border-t border-dashed" style={{ borderColor: lvl.color + "18" }} />
            <div className="text-right flex-shrink-0">
              <span className="text-[9px] font-bold block" style={{ color: lvl.color }}>{lvl.label}</span>
              <span className="text-[10px] font-mono block" style={{ color: T.textDim }}>
                {lvl.price.toFixed(2)} {lvl.pct && <span style={{ color: lvl.color }}>{lvl.pct}</span>}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-[8px] mt-4 text-center" style={{ color: T.textMuted }}>
        Objectifs théoriques — ne constitue pas un conseil en investissement
      </p>
    </div>
  );
}