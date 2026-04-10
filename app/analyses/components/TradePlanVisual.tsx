"use client";

import { motion } from "framer-motion";
import { T, FONT_MONO } from "../theme"; // ⚠️ On importe uniquement ce qui existe dans le nouveau thème

interface TradePlanVisualProps {
  price: number;
  stopLoss: number;
  entry: { min: number; max: number };
  targets: number[];
  currency: string;
  riskReward: number;
  isBull: boolean;
}

export default function TradePlanVisual({ price, stopLoss, entry, targets, currency, riskReward, isBull }: TradePlanVisualProps) {
  // Calcul dynamique des échelles pour que tout rentre parfaitement dans le graphique
  const allPrices = [price, stopLoss, entry.min, entry.max, ...targets].filter(p => p != null && !isNaN(p));
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const padding = (maxPrice - minPrice) * 0.15; // 15% de marge en haut et en bas
  const chartMin = minPrice - padding;
  const chartMax = maxPrice + padding;
  const chartRange = chartMax - chartMin;

  // Calcul de la position Y en pourcentage (0% = haut, 100% = bas)
  const getY = (val: number) => `${100 - ((val - chartMin) / chartRange) * 100}%`;

  const formatPct = (val: number, base: number) => {
    const pct = ((val - base) / base) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  };

  return (
    <div className="p-6 rounded-3xl flex flex-col h-full shadow-lg" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: T.textSub }}>Plan de trade</h3>
        <span className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider" style={{ background: T.elevated, color: T.cyan, border: `1px solid ${T.borderFocus}` }}>
          R:R 1:{riskReward.toFixed(1)}
        </span>
      </div>

      {/* Zone de rendu visuel */}
      <div className="relative flex-1 w-full min-h-[300px] text-[10px] font-mono">
        {/* Ligne verticale (la "Timeline" centrale) */}
        <div className="absolute left-[20%] top-0 bottom-0 w-px" style={{ background: T.borderMid }} />

        {/* 1. Stop Loss */}
        <div className="absolute w-full flex items-center transition-all duration-500" style={{ top: getY(stopLoss), transform: 'translateY(-50%)' }}>
          <div className="w-[20%] h-px" style={{ background: T.red, opacity: 0.4 }} />
          <div className="w-2.5 h-2.5 rounded-full -ml-[5px] z-10" style={{ background: T.red, boxShadow: `0 0 12px ${T.red}` }} />
          <div className="flex-1 border-t border-dashed ml-3" style={{ borderColor: T.red, opacity: 0.2 }} />
          <div className="text-right ml-3">
            <p className="font-bold font-sans uppercase tracking-wider mb-0.5 text-[9px]" style={{ color: T.red }}>Stop Loss</p>
            <p style={{ color: T.textDim }}>{stopLoss.toFixed(2)} <span className="text-[9px] font-bold ml-1">{formatPct(stopLoss, price)}</span></p>
          </div>
        </div>

        {/* 2. Zone d'entrée (Entry Zone) */}
        <div className="absolute w-full flex items-center transition-all duration-500" style={{ top: getY((entry.min + entry.max) / 2), transform: 'translateY(-50%)' }}>
          <div className="w-[20%] h-8 opacity-30" style={{ background: isBull ? T.blue : T.amber, borderTop: `1px solid ${isBull ? T.blueBright : T.amber}`, borderBottom: `1px solid ${isBull ? T.blueBright : T.amber}` }} />
          <div className="w-2 h-2 rounded-full -ml-1 z-10" style={{ background: isBull ? T.blueBright : T.amber }} />
          <div className="flex-1 border-t border-dashed ml-3" style={{ borderColor: T.borderMid }} />
          <div className="text-right ml-3">
            <p className="font-bold font-sans uppercase tracking-wider mb-0.5 text-[9px]" style={{ color: isBull ? T.blueBright : T.amber }}>Entrée Opt.</p>
            <p style={{ color: T.textDim }}>{entry.min.toFixed(2)} - {entry.max.toFixed(2)}</p>
          </div>
        </div>

        {/* 3. Current Price (Prix actuel) */}
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="absolute w-full flex items-center z-20 transition-all duration-500" style={{ top: getY(price), transform: 'translateY(-50%)' }}>
          <div className="w-[20%]" />
          <div className="w-4 h-4 rounded-full -ml-2 flex items-center justify-center" style={{ background: T.text, boxShadow: `0 0 20px ${T.text}` }}>
            <div className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
          </div>
          <div className="flex-1 ml-4 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px" style={{ background: T.text, opacity: 0.1 }} />
            <span className="relative z-10 px-3 py-1.5 rounded-lg text-xs font-black shadow-lg" style={{ background: T.text, color: T.bg }}>
              {price.toFixed(2)}
            </span>
          </div>
        </motion.div>

        {/* 4. Targets (Objectifs) */}
        {targets.map((t, i) => (
          <div key={i} className="absolute w-full flex items-center transition-all duration-500" style={{ top: getY(t), transform: 'translateY(-50%)' }}>
            <div className="w-[20%] h-px" style={{ background: T.green, opacity: 0.4 }} />
            <div className="w-2.5 h-2.5 rounded-full -ml-[5px] z-10" style={{ background: T.green, boxShadow: `0 0 12px ${T.green}` }} />
            <div className="flex-1 border-t border-dashed ml-3" style={{ borderColor: T.green, opacity: 0.2 }} />
            <div className="text-right ml-3">
              <p className="font-bold font-sans uppercase tracking-wider mb-0.5 text-[9px]" style={{ color: T.green }}>Objectif {i + 1}</p>
              <p style={{ color: T.textDim }}>{t.toFixed(2)} <span className="text-[9px] font-bold ml-1">{formatPct(t, price)}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}