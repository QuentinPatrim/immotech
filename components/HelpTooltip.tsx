"use client";

import { useState } from "react";
import { Info } from "lucide-react";

interface HelpTooltipProps {
  /** Titre optionnel affiché en haut de l'infobulle (ex: "RENDEMENT BRUT") */
  title?: string;
  /** Texte principal de l'infobulle */
  text: string;
}

/**
 * Infobulle d'aide réutilisable.
 * Affiche une icône ℹ️ qui révèle un tooltip au hover/touch.
 */
export default function HelpTooltip({ title, text }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center ml-2 flex-shrink-0"
      style={{ zIndex: 9999 }}
    >
      <button
        type="button"
        aria-label="Aide"
        className={`inline-flex items-center justify-center p-1.5 rounded-full transition-colors cursor-pointer ${open ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onTouchStart={(e) => { e.stopPropagation(); setOpen(v => !v); }}
      >
        <Info size={14} />
      </button>

      {open && (
        <span
          className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-64 p-3 bg-[#1A1A1E] border border-zinc-600 rounded-xl text-white text-xs text-center leading-relaxed shadow-2xl pointer-events-none"
          style={{ zIndex: 99999 }}
        >
          {title && <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">{title}</span>}
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1A1A1E]" />
        </span>
      )}
    </span>
  );
}
