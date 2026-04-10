// ═══════════════════════════════════════════════════════════════
// NEXUS STOCKS — Dark Fintech Premium Design System
// Inspiré des tableaux de bord modernes (fonds profonds, halos, glass)
// ═══════════════════════════════════════════════════════════════

export const T = {
  // Surfaces (Ultra Dark)
  bg: "#0B0E14", // Fond principal très profond
  bgSub: "#12151C", // Fond secondaire
  card: "rgba(22, 26, 35, 0.6)", // Cartes avec transparence
  cardSolid: "#161A23", // Cartes pleines
  cardHover: "#1C212D",
  elevated: "#1E2330",

  // Borders (Très subtiles)
  border: "rgba(255, 255, 255, 0.03)",
  borderMid: "rgba(255, 255, 255, 0.08)",
  borderFocus: "rgba(6, 182, 212, 0.3)", // Cyan focus

  // Glassmorphism
  glass: "rgba(18, 21, 28, 0.5)",
  glassBorder: "rgba(255, 255, 255, 0.04)",

  // Text
  text: "#F3F4F6", // Blanc cassé doux
  textSub: "#9CA3AF", // Gris clair
  textDim: "#6B7280", // Gris moyen
  textMuted: "#4B5563", // Gris sombre

  // Accent: Emerald / Neon Green (Hausse / Succès)
  green: "#10B981",
  greenDim: "#059669",
  greenGlow: "rgba(16, 185, 129, 0.15)",
  greenBg: "rgba(16, 185, 129, 0.08)",

  // Accent: Rose / Red (Baisse / Risque)
  red: "#F43F5E",
  redGlow: "rgba(244, 63, 94, 0.15)",
  redBg: "rgba(244, 63, 94, 0.08)",

  // Accent: Cyan / Blue (Primaire / Infos)
  blue: "#3B82F6",
  cyan: "#06B6D4",
  blueBright: "#60A5FA",
  blueGlow: "rgba(59, 130, 246, 0.15)",
  blueBg: "rgba(59, 130, 246, 0.08)",

  // Accent: Gold / Amber (Avertissement / Premium)
  amber: "#F59E0B",
  amberGlow: "rgba(245, 158, 11, 0.15)",
  amberBg: "rgba(245, 158, 11, 0.08)",

  // Accent: Purple (Momentum / Spécial)
  violet: "#8B5CF6",
  violetGlow: "rgba(139, 92, 246, 0.15)",
  violetBg: "rgba(139, 92, 246, 0.08)",

  // Gradients Premium
  gradPrimary: "linear-gradient(135deg, #06B6D4, #3B82F6)", // Cyan to Blue
  gradGreen: "linear-gradient(135deg, #10B981, #059669)",
  gradGlowObj: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(11,14,20,0) 70%)",
};

export const glass = {
  background: T.glass,
  backdropFilter: "blur(32px) saturate(150%)",
  WebkitBackdropFilter: "blur(32px) saturate(150%)",
  border: `1px solid ${T.glassBorder}`,
};

export function scoreColor(s: number) { return s >= 65 ? T.green : s <= 35 ? T.red : T.amber; }
export function scoreGlow(s: number) { return s >= 65 ? T.greenGlow : s <= 35 ? T.redGlow : T.amberGlow; }
export function scoreBg(s: number) { return s >= 65 ? T.greenBg : s <= 35 ? T.redBg : T.amberBg; }
export function scoreLabel(s: number) { return s >= 65 ? "OPPORTUNITÉ" : s <= 35 ? "RISQUÉ" : "ATTENDRE"; }

export const FONT_MONO = "'JetBrains Mono', 'SF Mono', monospace";
export const FONT_DISPLAY = "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif";
export const FONT_BODY = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";