"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, TrendingUp, BarChart3, Layers, ChevronRight,
  ChevronLeft, ArrowUpRight, ArrowDownRight, Minus, Zap,
  Target, Shield, Eye, BookOpen, ArrowLeft, Search, X,
} from "lucide-react";
import { T, glass, FONT_MONO, FONT_DISPLAY, FONT_BODY } from "../theme";

// ═══════════════════════════════════════════════════════════════
// NEW PREMIUM STYLES
// ═══════════════════════════════════════════════════════════════

const premiumCard = {
  background: T.cardSolid,
  border: `1px solid ${T.borderMid}`,
  borderRadius: "1.5rem",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
};

// ═══════════════════════════════════════════════════════════════
// GUIDE DATA
// ═══════════════════════════════════════════════════════════════

interface GuideSection {
  id: string;
  category: "methode" | "indicateur" | "concept";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  analogy: string;
  whatItIs: string;
  howItWorks: string;
  howToRead: { signal: string; meaning: string; type: "buy" | "sell" | "neutral" }[];
  proTip: string;
  visual: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: "confluence",
    category: "concept",
    icon: <Layers size={18} />,
    title: "La Confluence",
    subtitle: "Le principe fondamental",
    analogy: "Imaginez un tribunal : un seul témoin ne suffit pas pour condamner. Mais si 5 témoins indépendants racontent la même histoire, la probabilité qu'ils disent vrai est très élevée. C'est exactement le principe de la confluence en trading.",
    whatItIs: "La confluence est l'art de superposer plusieurs couches d'analyse indépendantes. Quand le Price Action, les indicateurs techniques, le volume ET la structure de marché pointent tous dans la même direction, la probabilité de succès d'un trade augmente considérablement.",
    howItWorks: "Notre score de confluence (0-100) agrège les signaux de 4 couches :\n\n• Price Action — Ce que fait le prix brut (tendance, chandeliers)\n• Indicateurs — Les formules mathématiques (RSI, MACD, Bollinger)\n• Volume — La conviction derrière les mouvements\n• Structure — Les zones clés du marché (supports, résistances, Ichimoku)",
    howToRead: [
      { signal: "Score ≥ 65", meaning: "Forte confluence haussière — opportunité identifiée", type: "buy" },
      { signal: "Score 36-64", meaning: "Signaux mixtes — attendre une configuration plus claire", type: "neutral" },
      { signal: "Score ≤ 35", meaning: "Forte confluence baissière — configuration risquée", type: "sell" },
    ],
    proTip: "Ne tradez jamais sur un seul indicateur. Un RSI survendu SEUL ne vaut rien. Mais un RSI survendu + un marteau sur un support + un volume en hausse + un prix au-dessus du nuage Ichimoku = confluence forte = probabilité élevée.",
    visual: "confluence",
  },
  {
    id: "price-action",
    category: "methode",
    icon: <BarChart3 size={18} />,
    title: "Le Price Action",
    subtitle: "Lire le graphique nu",
    analogy: "Le Price Action, c'est comme lire le langage corporel de quelqu'un. Sans écouter ses mots (les indicateurs), vous observez ses gestes (le prix) pour comprendre ses vraies intentions.",
    whatItIs: "Le Price Action est l'étude du mouvement brut du prix, sans indicateurs. On analyse la forme des bougies (chandeliers japonais), les tendances (plus hauts/plus bas successifs), et les figures chartistes.",
    howItWorks: "Chaque bougie raconte une histoire :\n\n• Le corps (rectangle) = la différence entre ouverture et clôture\n• Les mèches (lignes) = les extrêmes atteints puis rejetés\n• La couleur = vert si le prix a monté, rouge s'il a baissé",
    howToRead: [
      { signal: "Marteau (longue mèche basse)", meaning: "Les vendeurs s'épuisent — rebond probable", type: "buy" },
      { signal: "Doji (corps très petit)", meaning: "Indécision totale — attendre la prochaine bougie", type: "neutral" },
      { signal: "Englobante haussière", meaning: "Les acheteurs absorbent toute la pression vendeuse", type: "buy" },
      { signal: "Englobante baissière", meaning: "Les vendeurs reprennent le contrôle", type: "sell" },
    ],
    proTip: "Regardez toujours le contexte. Un marteau sur un support majeur est un signal très fort. Le même marteau en pleine tendance haussière n'a presque aucune valeur.",
    visual: "candle",
  },
  {
    id: "supports-resistances",
    category: "methode",
    icon: <Shield size={18} />,
    title: "Supports & Résistances",
    subtitle: "Les murs invisibles du marché",
    analogy: "Imaginez une balle qui rebondit entre le sol (support) et le plafond (résistance). Le sol empêche la balle de tomber plus bas, le plafond l'empêche de monter plus haut.",
    whatItIs: "Les supports sont des niveaux de prix où les acheteurs interviennent massivement. Les résistances sont des niveaux où les vendeurs prennent le dessus.",
    howItWorks: "On identifie ces niveaux en repérant les zones où le prix a rebondi ou bloqué plusieurs fois dans le passé. Plus un niveau a été testé et a tenu, plus il est solide.",
    howToRead: [
      { signal: "Prix arrive sur un support", meaning: "Zone de rebond probable — les acheteurs devraient défendre", type: "buy" },
      { signal: "Prix arrive sur une résistance", meaning: "Zone de rejet probable — les vendeurs devraient apparaître", type: "sell" },
      { signal: "Prix casse une résistance", meaning: "Breakout haussier — l'ancienne résistance devient support", type: "buy" },
      { signal: "Prix casse un support", meaning: "Breakdown baissier — l'ancien support devient résistance", type: "sell" },
    ],
    proTip: "Un support ou une résistance n'est pas un prix exact mais une zone. Ne cherchez pas la précision au centime — cherchez la zone de 1-2% autour du niveau.",
    visual: "sr",
  },
  {
    id: "rsi",
    category: "indicateur",
    icon: <Activity size={18} />,
    title: "RSI",
    subtitle: "Le thermomètre du momentum",
    analogy: "Le RSI est comme le thermomètre d'un malade. En dessous de 30, le patient a de la fièvre. Au-dessus de 70, il surchauffe. Entre les deux, tout est normal.",
    whatItIs: "Le RSI mesure la vitesse et l'amplitude des mouvements de prix sur 14 périodes. Il oscille entre 0 et 100.",
    howItWorks: "La formule compare les gains moyens aux pertes moyennes sur les 14 dernières bougies. Si les gains dominent, le RSI sera élevé (surachat).",
    howToRead: [
      { signal: "RSI < 30", meaning: "Survente — rebond possible", type: "buy" },
      { signal: "RSI 30-70", meaning: "Zone neutre — pas de signal extrême", type: "neutral" },
      { signal: "RSI > 70", meaning: "Surachat — correction possible", type: "sell" },
      { signal: "Divergence haussière", meaning: "Le prix baisse mais le RSI remonte — retournement puissant", type: "buy" },
    ],
    proTip: "Un RSI suracheté ne signifie PAS qu'il faut vendre immédiatement. Dans une tendance forte, le RSI peut rester au-dessus de 70 pendant des semaines.",
    visual: "rsi",
  },
  {
    id: "macd",
    category: "indicateur",
    icon: <TrendingUp size={18} />,
    title: "MACD",
    subtitle: "Le détecteur de retournement",
    analogy: "Le MACD est comme deux coureurs : un sprinteur (12 jours) et un marathonien (26 jours). Quand le sprinteur dépasse le marathonien, le marché accélère.",
    whatItIs: "Le MACD (Moving Average Convergence Divergence) est composé de trois éléments : la ligne MACD, la ligne de signal, et l'histogramme.",
    howItWorks: "Ligne MACD = EMA 12 − EMA 26\nLigne Signal = EMA 9 de la ligne MACD\nHistogramme = MACD − Signal",
    howToRead: [
      { signal: "MACD croise le signal par le haut", meaning: "Croisement haussier — momentum inversé à la hausse", type: "buy" },
      { signal: "MACD croise le signal par le bas", meaning: "Croisement baissier — momentum inversé à la baisse", type: "sell" },
      { signal: "Histogramme croissant (vert)", meaning: "Le momentum haussier accélère", type: "buy" },
    ],
    proTip: "Les croisements MACD sont plus fiables quand ils se produisent loin de la ligne zéro.",
    visual: "macd",
  },
  {
    id: "bollinger",
    category: "indicateur",
    icon: <Target size={18} />,
    title: "Bandes de Bollinger",
    subtitle: "Le mesureur de volatilité",
    analogy: "Les Bandes de Bollinger sont comme un élastique autour du prix. Plus l'élastique est tendu (bandes serrées), plus l'explosion sera forte.",
    whatItIs: "Les Bandes de Bollinger sont composées de trois lignes : une moyenne mobile simple au centre (20 jours), et deux bandes à ±2 écarts-types.",
    howItWorks: "Bande supérieure = SMA 20 + (2 × écart-type)\nBande inférieure = SMA 20 − (2 × écart-type)\n\nQuand la volatilité augmente, les bandes s'écartent.",
    howToRead: [
      { signal: "Prix touche la bande basse", meaning: "Statistiquement bas — rebond vers la moyenne probable", type: "buy" },
      { signal: "Prix touche la bande haute", meaning: "Statistiquement élevé — retour probable", type: "sell" },
      { signal: "Squeeze (bandes resserrées)", meaning: "Volatilité comprimée — explosion imminente", type: "neutral" },
    ],
    proTip: "Un squeeze Bollinger est l'un des signaux les plus puissants. Le prochain mouvement sera violent.",
    visual: "bollinger",
  },
  {
    id: "moyennes-mobiles",
    category: "indicateur",
    icon: <Minus size={18} />,
    title: "Moyennes Mobiles",
    subtitle: "Le filtre de tendance",
    analogy: "Une moyenne mobile, c'est comme un GPS qui lisse votre trajectoire. Au lieu de voir chaque virage, vous voyez la direction générale.",
    whatItIs: "Une moyenne mobile calcule le prix moyen sur les N dernières bougies. On utilise la MA20, MA50 et MA200.",
    howItWorks: "MA20 = moyenne des 20 dernières clôtures\nMA50 = moyenne des 50 dernières clôtures\n\nSi le prix est au-dessus de ses moyennes mobiles, la tendance est haussière.",
    howToRead: [
      { signal: "Prix > MA20 > MA50", meaning: "Tendance haussière forte", type: "buy" },
      { signal: "Prix < MA20 < MA50", meaning: "Tendance baissière forte", type: "sell" },
      { signal: "Golden Cross (MA50 croise MA200 ↑)", meaning: "Signal haussier majeur à long terme", type: "buy" },
    ],
    proTip: "Les moyennes mobiles fonctionnent mal en range. Elles sont faites pour les marchés en tendance.",
    visual: "ma",
  },
  {
    id: "ichimoku",
    category: "indicateur",
    icon: <Layers size={18} />,
    title: "Ichimoku Kinko Hyo",
    subtitle: "Le système tout-en-un japonais",
    analogy: "L'Ichimoku est comme une carte météo. Au-dessus du nuage, le ciel est dégagé. En dessous, c'est l'orage. Dans le nuage, c'est le brouillard.",
    whatItIs: "Développé par le journaliste japonais Goichi Hosoda, l'Ichimoku montre en un coup d'œil la tendance, le momentum, les supports/résistances.",
    howItWorks: "• Tenkan-sen (9 périodes) = ligne de conversion rapide\n• Kijun-sen (26 périodes) = ligne de base lente\n• Senkou A = moyenne de Tenkan et Kijun\n• Senkou B = midpoint sur 52 périodes\n• Le nuage = zone entre Senkou A et B",
    howToRead: [
      { signal: "Prix au-dessus du nuage", meaning: "Tendance haussière confirmée", type: "buy" },
      { signal: "Prix dans le nuage", meaning: "Zone d'incertitude — ne pas trader", type: "neutral" },
      { signal: "Prix sous le nuage", meaning: "Tendance baissière confirmée", type: "sell" },
    ],
    proTip: "L'Ichimoku est conçu pour les marchés en tendance. En range, il génère des faux signaux.",
    visual: "ichimoku",
  },
  {
    id: "volume-obv",
    category: "indicateur",
    icon: <BarChart3 size={18} />,
    title: "Volume & OBV",
    subtitle: "La conviction du marché",
    analogy: "Le volume, c'est comme le nombre de personnes qui votent. Un mouvement avec un volume élevé est légitime. Avec un faible volume, il ne veut rien dire.",
    whatItIs: "Le volume mesure le nombre d'actions échangées. L'OBV cumule le volume en l'additionnant quand le prix monte et en le soustrayant quand il baisse.",
    howItWorks: "OBV = somme cumulée (volume × direction du prix)\n\nSi le prix baisse mais l'OBV monte, des gros acheteurs accumulent discrètement.",
    howToRead: [
      { signal: "Volume 1.5× la moyenne + hausse", meaning: "Conviction forte des acheteurs", type: "buy" },
      { signal: "Volume faible + hausse", meaning: "Mouvement peu crédible — faux breakout", type: "neutral" },
      { signal: "OBV monte + prix baisse", meaning: "Accumulation discrète — retournement probable", type: "buy" },
    ],
    proTip: "Le volume est le seul indicateur qui ne peut pas mentir. Le prix peut être manipulé, mais le volume montre toujours la vraie conviction.",
    visual: "volume",
  },
  {
    id: "fibonacci",
    category: "indicateur",
    icon: <Zap size={18} />,
    title: "Fibonacci Retracement",
    subtitle: "Les niveaux naturels du marché",
    analogy: "Après avoir gravi une montagne, il est naturel de redescendre un peu. Fibonacci mesure « de combien » le prix corrige.",
    whatItIs: "Le retracement de Fibonacci est basé sur la suite mathématique de Fibonacci. Le ratio 61.8% (le « nombre d'or ») se retrouve dans la nature et dans les marchés.",
    howItWorks: "On trace du plus bas au plus haut de la période. Les niveaux clés :\n\n• 23.6% — correction faible\n• 38.2% — correction modérée\n• 50% — correction médiane\n• 61.8% — correction profonde (golden ratio)",
    howToRead: [
      { signal: "Rebond sur le 38.2%", meaning: "Correction faible — reprise rapide probable", type: "buy" },
      { signal: "Prix atteint le 61.8%", meaning: "Correction profonde — zone de décision", type: "neutral" },
      { signal: "Prix casse le 61.8%", meaning: "La tendance est probablement terminée", type: "sell" },
    ],
    proTip: "Les niveaux Fibonacci sont encore plus puissants quand ils coïncident avec un support/résistance ou une MA.",
    visual: "fibonacci",
  },
  {
    id: "atr",
    category: "indicateur",
    icon: <Eye size={18} />,
    title: "ATR",
    subtitle: "Le baromètre de la volatilité",
    analogy: "L'ATR est comme le compteur de turbulences d'un avion. Il ne dit pas si l'avion monte ou descend, mais à quel point le vol est agité.",
    whatItIs: "L'ATR mesure la volatilité moyenne sur 14 bougies. Un ATR de 2.50€ sur une action à 100€ signifie que le prix bouge de ±2.5% par jour.",
    howItWorks: "ATR = Moyenne sur 14 jours du True Range\nTrue Range = max(High−Low, |High−Close₋₁|, |Low−Close₋₁|)",
    howToRead: [
      { signal: "ATR élevé (> 3% du prix)", meaning: "Forte volatilité — élargir les stops", type: "neutral" },
      { signal: "ATR faible (< 1% du prix)", meaning: "Calme avant la tempête — breakout possible", type: "neutral" },
      { signal: "ATR en hausse soudaine", meaning: "Le marché se réveille — mouvement en cours", type: "neutral" },
    ],
    proTip: "Règle d'or : placez votre stop-loss à au moins 1.5× l'ATR.",
    visual: "atr",
  },
];

// ═══════════════════════════════════════════════════════════════
// SVG MINI ILLUSTRATIONS — dark theme
// ═══════════════════════════════════════════════════════════════

function MiniViz({ type }: { type: string }) {
  const w = 320, h = 120;
  const c = { width: w, height: h, viewBox: `0 0 ${w} ${h}` };
  const bg = T.bgSub; // Changé pour coller au nouveau fond

  if (type === "confluence") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      {[
        { label: "Price Action", pct: 0.78, color: T.blue, y: 16 },
        { label: "Indicateurs",  pct: 0.65, color: T.violet, y: 34 },
        { label: "Volume",       pct: 0.82, color: T.green, y: 52 },
        { label: "Structure",    pct: 0.70, color: T.amber, y: 70 },
      ].map(({ label, pct, color, y: ly }) => (
        <g key={label}>
          <text x={8} y={ly + 8} fontSize={7} fill={T.textDim} fontWeight={500}>{label}</text>
          <rect x={90} y={ly} width={180} height={9} rx={4.5} fill={T.border} />
          <rect x={90} y={ly} width={180 * pct} height={9} rx={4.5} fill={color} opacity={0.7} />
          <text x={276} y={ly + 8} fontSize={7} fill={color} fontWeight={700}>{Math.round(pct * 100)}%</text>
        </g>
      ))}
      <rect x={118} y={92} width={84} height={20} rx={10} fill={T.green} opacity={0.9} />
      <text x={160} y={106} textAnchor="middle" fontSize={11} fill="#fff" fontWeight={800}>Score : 74</text>
    </svg>
  );

  if (type === "rsi") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <line x1={20} y1={20} x2={300} y2={20} stroke={`${T.red}20`} strokeWidth={0.5} />
      <line x1={20} y1={55} x2={300} y2={55} stroke={`${T.textMuted}`} strokeWidth={0.5} strokeDasharray="4 3" />
      <line x1={20} y1={95} x2={300} y2={95} stroke={`${T.green}20`} strokeWidth={0.5} />
      <text x={6} y={24} fontSize={7} fill={T.red} fontWeight={500}>70</text>
      <text x={6} y={99} fontSize={7} fill={T.green} fontWeight={500}>30</text>
      <polyline points="20,68 52,64 84,50 116,28 148,20 172,26 196,44 220,60 244,72 268,88 292,96" fill="none" stroke={T.blue} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={148} cy={20} r={4} fill="none" stroke={T.red} strokeWidth={1.5} />
      <text x={120} y={16} fontSize={7} fill={T.red} fontWeight={600}>Surachat</text>
      <circle cx={292} cy={96} r={4} fill={T.green} />
      <text x={262} y={112} fontSize={7} fill={T.green} fontWeight={600}>Survente</text>
    </svg>
  );

  if (type === "macd") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <line x1={20} y1={60} x2={300} y2={60} stroke={T.border} />
      {[25,42,59,76,93,110,127,144,161,178,195,212,229,246,263,280].map((x, i) => {
        const v = Math.sin(i * 0.4 - 1) * 24;
        return <rect key={i} x={x} y={v > 0 ? 60 - v : 60} width={10} height={Math.abs(v)} rx={3} fill={v > 0 ? `${T.green}50` : `${T.red}50`} />;
      })}
      <polyline points="25,70 59,74 93,66 127,46 161,36 195,40 229,54 263,64 297,58" fill="none" stroke={T.blue} strokeWidth={1.5} strokeLinecap="round" />
      <polyline points="25,66 59,68 93,62 127,50 161,42 195,44 229,52 263,58 297,56" fill="none" stroke={T.amber} strokeWidth={1} strokeDasharray="4 3" />
      <circle cx={161} cy={36} r={4} fill={T.blue} />
      <text x={132} y={28} fill={T.blue} fontSize={8} fontWeight={600}>Croisement ↑</text>
    </svg>
  );

  if (type === "bollinger") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <path d="M20,25 Q90,16 160,24 T300,18" fill="none" stroke={`${T.violet}30`} strokeWidth={1} strokeDasharray="4 4" />
      <path d="M20,90 Q90,100 160,92 T300,96" fill="none" stroke={`${T.violet}30`} strokeWidth={1} strokeDasharray="4 4" />
      <path d="M20,25 Q90,16 160,24 T300,18 L300,96 Q240,92 160,92 T20,90 Z" fill={`${T.violet}06`} />
      <polyline points="20,52 50,46 80,60 110,74 140,88 165,80 195,62 225,46 255,35 285,42" fill="none" stroke={T.text} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={140} cy={88} r={5} fill="none" stroke={T.green} strokeWidth={1.5} />
      <text x={100} y={112} fill={T.green} fontSize={8} fontWeight={600}>Rebond bande basse</text>
    </svg>
  );

  if (type === "candle") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <g transform="translate(25, 0)">
        <line x1={22} y1={12} x2={22} y2={88} stroke={T.green} strokeWidth={1.5} />
        <rect x={12} y={30} width={20} height={35} rx={3} fill={T.green} />
        <text x={10} y={108} fill={T.textSub} fontSize={8} fontWeight={600}>Haussière</text>
      </g>
      <g transform="translate(100, 0)">
        <line x1={22} y1={12} x2={22} y2={88} stroke={T.red} strokeWidth={1.5} />
        <rect x={12} y={24} width={20} height={35} rx={3} fill={T.red} />
        <text x={10} y={108} fill={T.textSub} fontSize={8} fontWeight={600}>Baissière</text>
      </g>
      <g transform="translate(175, 0)">
        <line x1={22} y1={22} x2={22} y2={88} stroke={T.green} strokeWidth={1.5} />
        <rect x={14} y={22} width={16} height={12} rx={3} fill={T.green} />
        <text x={10} y={108} fill={T.textSub} fontSize={8} fontWeight={600}>Marteau</text>
      </g>
      <g transform="translate(245, 0)">
        <line x1={18} y1={22} x2={18} y2={82} stroke={T.amber} strokeWidth={1.5} />
        <rect x={12} y={50} width={12} height={4} rx={2} fill={T.amber} />
        <text x={10} y={108} fill={T.textSub} fontSize={8} fontWeight={600}>Doji</text>
      </g>
    </svg>
  );

  if (type === "sr") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <rect x={20} y={18} width={280} height={6} rx={3} fill={`${T.red}15`} />
      <text x={24} y={16} fontSize={7} fill={T.red} fontWeight={700}>RÉSISTANCE</text>
      <rect x={20} y={90} width={280} height={6} rx={3} fill={`${T.green}15`} />
      <text x={24} y={108} fontSize={7} fill={T.green} fontWeight={700}>SUPPORT</text>
      <polyline points="20,88 50,72 80,56 100,38 120,26 135,22 148,26 162,46 180,72 200,88 220,92 240,82 260,64 275,38 290,24" fill="none" stroke={T.text} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (type === "ma") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <polyline points="20,82 80,76 140,72 200,66 260,60 300,58" fill="none" stroke={T.amber} strokeWidth={1} strokeDasharray="5 3" />
      <polyline points="20,74 80,68 140,58 200,48 260,42 300,38" fill="none" stroke={T.violet} strokeWidth={1} strokeDasharray="3 2" />
      <polyline points="20,68 60,56 100,44 140,36 180,30 220,26 260,22 300,20" fill="none" stroke={T.blue} strokeWidth={1.2} />
      <polyline points="20,72 50,58 80,44 110,34 140,28 170,22 200,18 230,15 260,13 290,11" fill="none" stroke={T.green} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={130} cy={52} r={6} fill="none" stroke={T.amber} strokeWidth={1.2} />
      <text x={106} y={70} fontSize={7} fill={T.amber} fontWeight={700}>Golden Cross</text>
    </svg>
  );

  if (type === "ichimoku") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <path d="M20,50 Q80,40 140,45 T260,36 L260,72 Q200,80 140,76 T20,80 Z" fill={`${T.green}08`} stroke={`${T.green}20`} strokeWidth={0.5} />
      <polyline points="20,68 80,64 140,60 200,54 260,50 300,46" fill="none" stroke={T.red} strokeWidth={1} />
      <polyline points="20,58 60,50 100,42 140,38 180,32 220,28 260,22 300,18" fill="none" stroke={T.blue} strokeWidth={1.2} />
      <polyline points="100,26 130,18 160,12 190,8 220,6 250,5 280,4" fill="none" stroke={T.green} strokeWidth={1.5} strokeLinecap="round" />
      <text x={22} y={30} fontSize={7} fill={T.green} fontWeight={700}>Au-dessus du nuage ↑</text>
    </svg>
  );

  if (type === "volume") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      {[20,38,56,74,92,110,128,146,164,182,200,218,236,254,272].map((x, i) => {
        const h2 = [18,12,24,16,10,30,14,36,20,26,14,42,22,16,32][i];
        const isUp = [1,0,1,1,0,1,0,1,1,0,0,1,1,0,1][i];
        return <rect key={i} x={x} y={80 - h2} width={12} height={h2} rx={2} fill={isUp ? `${T.green}45` : `${T.red}35`} />;
      })}
      <polyline points="20,95 38,92 56,88 74,85 92,89 110,82 128,86 146,74 164,68 182,72 200,76 218,62 236,56 254,60 272,50" fill="none" stroke={T.blue} strokeWidth={1.5} strokeLinecap="round" />
      <text x={220} y={48} fontSize={7} fill={T.blue} fontWeight={600}>OBV ↑</text>
    </svg>
  );

  if (type === "fibonacci") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      {[
        { label: "0%", y: 12, color: T.textDim },
        { label: "23.6%", y: 32, color: T.blue },
        { label: "38.2%", y: 46, color: T.violet },
        { label: "61.8%", y: 72, color: T.red, bold: true },
        { label: "100%", y: 100, color: T.textDim },
      ].map(({ label, y: ly, color, bold }) => (
        <g key={label}>
          <line x1={40} y1={ly} x2={290} y2={ly} stroke={color} strokeWidth={bold ? 1 : 0.5} strokeDasharray={bold ? "none" : "4 3"} opacity={0.5} />
          <text x={4} y={ly + 3} fontSize={7} fill={color} fontWeight={bold ? 800 : 500}>{label}</text>
        </g>
      ))}
      <polyline points="50,12 80,8 110,6 140,10 165,20 180,34 190,46 195,60 192,66 188,72 185,76 190,64 200,48 215,36 235,22 260,12 285,8" fill="none" stroke={T.text} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={188} cy={72} r={4} fill="none" stroke={T.red} strokeWidth={1.2} />
      <text x={194} y={78} fontSize={7} fill={T.red} fontWeight={600}>Golden ratio</text>
    </svg>
  );

  if (type === "atr") return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      {[20,40,60,80,100,120,140,160,180,200,220,240,260,280].map((x, i) => {
        const r = [16,14,18,13,10,8,6,7,5,18,24,30,26,22][i];
        return <line key={i} x1={x + 6} y1={58 - r} x2={x + 6} y2={58 + r} stroke={T.violet} strokeWidth={1.5} strokeLinecap="round" opacity={0.5 + i * 0.03} />;
      })}
      <polyline points="26,44 46,42 66,46 86,40 106,36 126,30 146,28 166,30 186,28 206,44 226,54 246,60 266,56 286,50" fill="none" stroke={T.violet} strokeWidth={1.5} strokeLinecap="round" />
      <text x={210} y={44} fontSize={7} fill={T.red} fontWeight={600}>Volatilité ↑</text>
    </svg>
  );

  return (
    <svg {...c}>
      <rect width={w} height={h} rx={14} fill={bg} />
      <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill={T.textMuted} fontSize={11}>{type}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

const categoryLabel: Record<string, string> = { methode: "Méthode", indicateur: "Indicateur", concept: "Concept" };
const categoryColor: Record<string, string> = { methode: T.cyan, indicateur: T.violet, concept: T.green };

export default function GuidePage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "methode" | "indicateur" | "concept">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const base = SECTIONS.filter(s => filter === "all" || s.category === filter);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(s => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q) || s.whatItIs.toLowerCase().includes(q));
  }, [filter, query]);

  const active = SECTIONS.find(s => s.id === activeId);
  const activeIndex = activeId ? SECTIONS.findIndex(s => s.id === activeId) : -1;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: T.bg, color: T.text, fontFamily: FONT_BODY }}>
      {/* ── AMBIENT GLOWS (Premium Background) ── */}
      <div className="fixed top-[10%] right-[10%] w-[40%] h-[40%] rounded-full blur-[140px] pointer-events-none opacity-20 mix-blend-screen" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(0,0,0,0) 70%)" }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none opacity-20 mix-blend-screen" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(0,0,0,0) 70%)" }} />

      <Sidebar />
      <main className="md:ml-64 px-5 pt-8 pb-24 md:px-10 relative z-10 min-h-screen flex flex-col">
        <div className="max-w-4xl mx-auto w-full">

          {/* Back */}
          <Link href="/analyses" className="inline-flex items-center gap-2 text-xs font-bold mb-8 transition-opacity hover:opacity-70" style={{ color: T.cyan }}>
            <ArrowLeft size={14} /> Retour au radar financier
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-12 w-12 flex items-center justify-center rounded-2xl shadow-lg shadow-cyan-500/20" style={{ background: T.gradPrimary }}>
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>
                  La base de connaissances
                </h1>
                <p className="text-[11px] uppercase tracking-widest font-bold mt-1" style={{ color: T.textDim }}>{SECTIONS.length} modules d'intelligence de marché</p>
              </div>
            </div>
            <p className="text-sm font-medium leading-relaxed max-w-2xl" style={{ color: T.textSub }}>
              Chaque indicateur est un outil. Seul, il est imprécis. Combinés intelligemment (confluence), ils deviennent de puissantes armes d'analyse.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <div className="flex items-center gap-3 px-5 py-4 rounded-3xl shadow-xl transition-all" style={{ background: T.cardSolid, border: `1px solid ${T.borderMid}` }}>
              <Search size={16} style={{ color: T.textSub }} />
              <input type="text" placeholder="Rechercher un concept, un indicateur..." value={query}
                onChange={e => { setQuery(e.target.value); setActiveId(null); }}
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-600" style={{ color: T.text }} />
              {query && <button onClick={() => setQuery("")} className="hover:bg-white/10 p-1.5 rounded-full transition-colors"><X size={14} style={{ color: T.textDim }} /></button>}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {([["all", "Tout l'univers"], ["concept", "Concepts"], ["methode", "Méthodes"], ["indicateur", "Indicateurs"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setFilter(k); setActiveId(null); setQuery(""); }}
                className="px-5 py-2.5 text-[11px] font-bold transition-all duration-300 rounded-full"
                style={{ background: filter === k ? T.blueBg : "transparent", color: filter === k ? T.cyan : T.textDim, border: `1px solid ${filter === k ? T.borderFocus : T.border}` }}>
                {l}
              </button>
            ))}
          </div>

          {/* Progress */}
          {active && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: T.textDim }}>Module {activeIndex + 1} / {SECTIONS.length}</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: T.cyan }}>{Math.round(((activeIndex + 1) / SECTIONS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: T.borderMid }}>
                <motion.div className="h-full rounded-full" style={{ background: T.gradPrimary }}
                  initial={{ width: 0 }} animate={{ width: `${((activeIndex + 1) / SECTIONS.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }} />
              </div>
            </div>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            {!active ? (
              <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {filtered.length === 0 ? (
                  <div className="text-center py-24">
                    <p className="text-sm font-medium" style={{ color: T.textDim }}>Aucun résultat pour &quot;{query}&quot;</p>
                    <button onClick={() => setQuery("")} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold transition-colors hover:bg-white/5" style={{ color: T.cyan, border: `1px solid ${T.borderFocus}` }}>Effacer la recherche</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((s, i) => (
                      <motion.button key={s.id} onClick={() => setActiveId(s.id)}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="text-left p-6 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
                        style={{ ...premiumCard }}>
                        
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                          <div style={{ color: categoryColor[s.category] }}>{s.icon}</div>
                        </div>

                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 flex items-center justify-center rounded-xl"
                              style={{ background: categoryColor[s.category] + "15", color: categoryColor[s.category], border: `1px solid ${categoryColor[s.category]}30` }}>
                              {s.icon}
                            </div>
                            <div>
                              <h3 className="text-base font-bold tracking-wide" style={{ color: T.text }}>{s.title}</h3>
                              <p className="text-[11px] font-medium mt-0.5" style={{ color: T.textSub }}>{s.subtitle}</p>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: T.text }} />
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed line-clamp-2 font-medium relative z-10" style={{ color: T.textDim }}>
                          {s.analogy.slice(0, 120)}…
                        </p>
                        <span className="inline-block mt-4 text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg relative z-10"
                          style={{ background: categoryColor[s.category] + "15", color: categoryColor[s.category], border: `1px solid ${categoryColor[s.category]}20` }}>
                          {categoryLabel[s.category]}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                <button onClick={() => setActiveId(null)} className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-opacity mb-4" style={{ color: T.cyan }}>
                  <ChevronLeft size={16} /> Revenir à l'index
                </button>

                {/* Header */}
                <div className="flex items-start gap-5 p-6 rounded-3xl relative overflow-hidden" style={{ ...premiumCard, borderLeft: `4px solid ${categoryColor[active.category]}` }}>
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at right, ${categoryColor[active.category]}, transparent 60%)` }} />
                  <div className="h-16 w-16 flex items-center justify-center shrink-0 rounded-2xl relative z-10"
                    style={{ background: categoryColor[active.category] + "15", color: categoryColor[active.category], border: `1px solid ${categoryColor[active.category]}30` }}>
                    {active.icon}
                  </div>
                  <div className="relative z-10">
                    <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 mb-2 rounded-lg"
                      style={{ background: categoryColor[active.category] + "15", color: categoryColor[active.category] }}>
                      {categoryLabel[active.category]}
                    </span>
                    <h2 className="text-3xl font-black tracking-tight mb-1" style={{ fontFamily: FONT_DISPLAY }}>{active.title}</h2>
                    <p className="text-sm font-medium" style={{ color: T.textSub }}>{active.subtitle}</p>
                  </div>
                </div>

                {/* Analogy */}
                <div className="p-6 rounded-3xl" style={{ ...premiumCard }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3 flex items-center gap-2" style={{ color: T.cyan }}><Eye size={14} /> En une image</p>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: T.textSub }}>{active.analogy}</p>
                </div>

                {/* SVG */}
                <div className="flex justify-center p-6 rounded-3xl overflow-hidden" style={{ ...premiumCard }}>
                  <MiniViz type={active.visual} />
                </div>

                {/* What it is */}
                <div className="p-6 rounded-3xl" style={{ ...premiumCard }}>
                  <h3 className="text-sm font-black tracking-wide mb-3 flex items-center gap-2" style={{ color: T.text }}><Target size={16} style={{ color: T.blue }} /> Qu&apos;est-ce que c&apos;est ?</h3>
                  <p className="text-xs font-medium leading-relaxed" style={{ color: T.textSub }}>{active.whatItIs}</p>
                </div>

                {/* How it works */}
                <div className="p-6 rounded-3xl" style={{ ...premiumCard }}>
                  <h3 className="text-sm font-black tracking-wide mb-3 flex items-center gap-2" style={{ color: T.text }}><Activity size={16} style={{ color: T.violet }} /> Comment ça fonctionne ?</h3>
                  <p className="text-xs leading-relaxed whitespace-pre-line p-4 rounded-2xl" style={{ background: T.elevated, color: T.textDim, fontFamily: FONT_MONO, border: `1px solid ${T.borderMid}` }}>
                    {active.howItWorks}
                  </p>
                </div>

                {/* How to read */}
                <div className="p-6 rounded-3xl" style={{ ...premiumCard }}>
                  <h3 className="text-sm font-black tracking-wide mb-5 flex items-center gap-2" style={{ color: T.text }}><BarChart3 size={16} style={{ color: T.green }} /> Comment le lire ?</h3>
                  <div className="space-y-2">
                    {active.howToRead.map((h, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-white/5" style={{ background: T.elevated, border: `1px solid ${T.border}` }}>
                        <div className="mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: h.type === "buy" ? T.greenBg : h.type === "sell" ? T.redBg : T.amberBg }}>
                          {h.type === "buy" && <ArrowUpRight size={16} style={{ color: T.green }} />}
                          {h.type === "sell" && <ArrowDownRight size={16} style={{ color: T.red }} />}
                          {h.type === "neutral" && <Minus size={16} style={{ color: T.amber }} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold mb-1" style={{ color: T.text }}>{h.signal}</p>
                          <p className="text-[11px] font-medium" style={{ color: T.textSub }}>{h.meaning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro tip */}
                <div className="p-6 rounded-3xl relative overflow-hidden" style={{ ...premiumCard, border: `1px solid ${T.amber}30` }}>
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at left, ${T.amber}, transparent 50%)` }} />
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3 relative z-10 flex items-center gap-2" style={{ color: T.amber }}><Zap size={14} /> Conseil de pro</p>
                  <p className="text-sm font-medium leading-relaxed relative z-10" style={{ color: T.text }}>{active.proTip}</p>
                </div>

                {/* Prev / Next */}
                <div className="flex justify-between pt-6">
                  {(() => {
                    const idx = SECTIONS.findIndex(s => s.id === activeId);
                    const prev = idx > 0 ? SECTIONS[idx - 1] : null;
                    const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
                    return (
                      <>
                        {prev ? (
                          <button onClick={() => setActiveId(prev.id)} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-bold transition-all hover:bg-white/5" style={{ color: T.textSub, border: `1px solid ${T.borderMid}` }}>
                            <ChevronLeft size={16} /> {prev.title}
                          </button>
                        ) : <div />}
                        {next && (
                          <button onClick={() => setActiveId(next.id)} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-bold transition-all" style={{ background: T.cyan + "15", color: T.cyan, border: `1px solid ${T.borderFocus}` }}>
                            {next.title} <ChevronRight size={16} />
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}