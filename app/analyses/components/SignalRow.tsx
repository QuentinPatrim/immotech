"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { T } from "../theme";
import type { LayerSignal } from "../types";

interface SignalRowProps {
  signal: LayerSignal;
  index: number;
}

export default function SignalRow({ signal, index }: SignalRowProps) {
  const [open, setOpen] = useState(false);
  const vc = signal.verdict === "bullish" ? T.green : signal.verdict === "bearish" ? T.red : T.textDim;
  const bg = signal.verdict === "bullish" ? T.greenBg : signal.verdict === "bearish" ? T.redBg : "rgba(255,255,255,0.01)";
  const VerdictIcon = signal.verdict === "bullish" ? TrendingUp : signal.verdict === "bearish" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="cursor-pointer"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150"
        style={{ background: open ? bg : "transparent" }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <VerdictIcon size={11} style={{ color: vc }} />
        </div>
        <span className="text-[11px] font-medium flex-1" style={{ color: T.textSub }}>{signal.name}</span>
        <div className="w-14 h-0.5 rounded-full overflow-hidden" style={{ background: T.border }}>
          <motion.div className="h-full rounded-full" style={{ background: vc }}
            initial={{ width: 0 }} animate={{ width: `${signal.confidence * 100}%` }}
            transition={{ duration: 0.6, delay: index * 0.03 + 0.1 }} />
        </div>
        <span className="text-[10px] font-mono w-7 text-right tabular-nums font-bold" style={{ color: vc }}>
          {Math.round(signal.confidence * 100)}%
        </span>
        <ChevronDown size={10} style={{ color: T.textMuted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <p className="text-[10px] leading-relaxed px-3 pb-2" style={{ paddingLeft: 44, color: T.textDim }}>{signal.detail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}