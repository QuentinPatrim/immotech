"use client";

import { motion } from "framer-motion";
import { T, scoreColor, FONT_MONO } from "../theme";

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  thickness?: number;
  delay?: number;
}

export default function ScoreRing({ score, size = 100, label, sublabel, color, thickness = 4, delay = 0 }: ScoreRingProps) {
  const c = color || scoreColor(score);
  const r = (size - thickness * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size + (label ? 28 : 0) }}>
      {/* Ambient glow behind the ring */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="rounded-full" style={{ width: size * 0.7, height: size * 0.7, background: c, filter: "blur(20px)", opacity: 0.08 }} />
      </div>
      <svg width={size} height={size} className="relative z-10 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={thickness * 0.4} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={c} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${c}50)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <motion.span
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.3 }}
          className="font-black tabular-nums leading-none"
          style={{ fontSize: size * 0.3, color: c, fontFamily: FONT_MONO }}
        >
          {score}
        </motion.span>
      </div>
      {label && (
        <div className="text-center mt-1.5 z-10">
          <p className="text-[10px] font-bold" style={{ color: T.text }}>{label}</p>
          {sublabel && <p className="text-[9px]" style={{ color: T.textDim }}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}