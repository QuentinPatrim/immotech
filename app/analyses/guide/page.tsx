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
    icon: <Layers size={20} />,
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
    icon: <BarChart3 size={20} />,
    title: "Le Price Action",
    subtitle: "Lire le graphique nu",
    analogy: "Le Price Action, c'est comme lire le langage corporel de quelqu'un. Sans écouter ses mots (les indicateurs), vous observez ses gestes (le prix) pour comprendre ses vraies intentions.",
    whatItIs: "Le Price Action est l'étude du mouvement brut du prix, sans indicateurs. On analyse la forme des bougies (chandeliers japonais), les tendances (plus hauts/plus bas successifs), et les figures chartistes. C'est la couche d'analyse la plus directe car elle montre le résultat réel du combat entre acheteurs et vendeurs.",
    howItWorks: "Chaque bougie raconte une histoire :\n\n• Le corps (rectangle) = la différence entre ouverture et clôture\n• Les mèches (lignes) = les extrêmes atteints puis rejetés\n• La couleur = vert si le prix a monté, rouge s'il a baissé\n\nUne longue mèche basse signifie que les vendeurs ont tenté de pousser le prix vers le bas, mais les acheteurs les ont repoussés avec force.",
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
    icon: <Shield size={20} />,
    title: "Supports & Résistances",
    subtitle: "Les murs invisibles du marché",
    analogy: "Imaginez une balle qui rebondit entre le sol (support) et le plafond (résistance). Le sol empêche la balle de tomber plus bas, le plafond l'empêche de monter plus haut. Quand la balle casse le plafond, l'ancien plafond devient le nouveau sol.",
    whatItIs: "Les supports sont des niveaux de prix où les acheteurs interviennent massivement (le prix rebondit). Les résistances sont des niveaux où les vendeurs prennent le dessus (le prix bloque). Ces niveaux se forment parce que les traders ont une mémoire collective : ils se souviennent des prix importants.",
    howItWorks: "On identifie ces niveaux en repérant les zones où le prix a rebondi ou bloqué plusieurs fois dans le passé. Plus un niveau a été testé et a tenu, plus il est solide. Notre algorithme détecte automatiquement les pivots (points hauts et bas locaux) puis les regroupe en zones.",
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
    icon: <Activity size={20} />,
    title: "RSI (Relative Strength Index)",
    subtitle: "Le thermomètre du momentum",
    analogy: "Le RSI est comme le thermomètre d'un malade. En dessous de 30, le patient a de la fièvre (trop de ventes, épuisement des vendeurs). Au-dessus de 70, il surchauffe (trop d'achats, euphorie). Entre les deux, tout est normal.",
    whatItIs: "Le RSI mesure la vitesse et l'amplitude des mouvements de prix sur 14 périodes. Il oscille entre 0 et 100. Il ne prédit pas la direction du prix mais indique si le mouvement actuel est excessif — et donc susceptible de se corriger.",
    howItWorks: "La formule compare les gains moyens aux pertes moyennes sur les 14 dernières bougies. Si les gains sont beaucoup plus importants que les pertes, le RSI sera élevé (surachat). Si les pertes dominent, le RSI sera bas (survente).",
    howToRead: [
      { signal: "RSI < 30", meaning: "Survente — les vendeurs s'épuisent. Rebond possible.", type: "buy" },
      { signal: "RSI 30-70", meaning: "Zone neutre — pas de signal extrême", type: "neutral" },
      { signal: "RSI > 70", meaning: "Surachat — les acheteurs s'essoufflent. Correction possible.", type: "sell" },
      { signal: "Divergence haussière", meaning: "Le prix baisse mais le RSI remonte — retournement puissant", type: "buy" },
    ],
    proTip: "Un RSI suracheté ne signifie PAS qu'il faut vendre immédiatement. Dans une tendance forte, le RSI peut rester au-dessus de 70 pendant des semaines. Utilisez-le comme complément, jamais seul.",
    visual: "rsi",
  },
  {
    id: "macd",
    category: "indicateur",
    icon: <TrendingUp size={20} />,
    title: "MACD",
    subtitle: "Le détecteur de retournement",
    analogy: "Le MACD est comme deux coureurs à pied : un sprinteur (moyenne courte, 12 jours) et un marathonien (moyenne longue, 26 jours). Quand le sprinteur dépasse le marathonien, le marché accélère à la hausse. Quand il passe derrière, le marché ralentit.",
    whatItIs: "Le MACD (Moving Average Convergence Divergence) est composé de trois éléments : la ligne MACD (différence entre deux moyennes mobiles), la ligne de signal (moyenne de la ligne MACD), et l'histogramme (la différence entre les deux).",
    howItWorks: "Ligne MACD = EMA 12 jours − EMA 26 jours\nLigne Signal = EMA 9 jours de la ligne MACD\nHistogramme = MACD − Signal\n\nQuand les barres de l'histogramme passent de rouge à vert, le momentum change de direction.",
    howToRead: [
      { signal: "MACD croise le signal par le haut", meaning: "Croisement haussier — le momentum s'inverse à la hausse", type: "buy" },
      { signal: "MACD croise le signal par le bas", meaning: "Croisement baissier — le momentum s'inverse à la baisse", type: "sell" },
      { signal: "Histogramme croissant (vert)", meaning: "Le momentum haussier accélère", type: "buy" },
      { signal: "Histogramme décroissant (rouge)", meaning: "Le momentum baissier accélère", type: "sell" },
    ],
    proTip: "Les croisements MACD sont plus fiables quand ils se produisent loin de la ligne zéro. Un croisement haussier très en dessous de zéro est souvent un signal de retournement majeur.",
    visual: "macd",
  },
  {
    id: "bollinger",
    category: "indicateur",
    icon: <Target size={20} />,
    title: "Bandes de Bollinger",
    subtitle: "Le mesureur de volatilité",
    analogy: "Les Bandes de Bollinger sont comme un élastique autour du prix. Plus l'élastique est tendu (bandes serrées), plus l'explosion qui suivra sera forte. Quand le prix touche un bord de l'élastique, il a tendance à revenir vers le centre.",
    whatItIs: "Les Bandes de Bollinger sont composées de trois lignes : une moyenne mobile simple au centre (20 jours), et deux bandes à ±2 écarts-types. 95% du prix devrait se trouver entre les deux bandes.",
    howItWorks: "Bande supérieure = SMA 20 + (2 × écart-type)\nBande inférieure = SMA 20 − (2 × écart-type)\n\nQuand la volatilité augmente, les bandes s'écartent. Quand elle diminue, elles se resserrent (squeeze). Un squeeze précède souvent un mouvement violent.",
    howToRead: [
      { signal: "Prix touche la bande basse", meaning: "Statistiquement bas — rebond vers la moyenne probable", type: "buy" },
      { signal: "Prix touche la bande haute", meaning: "Statistiquement élevé — retour vers la moyenne probable", type: "sell" },
      { signal: "Squeeze (bandes resserrées)", meaning: "Volatilité comprimée — explosion imminente", type: "neutral" },
    ],
    proTip: "Un squeeze Bollinger est l'un des signaux les plus puissants. Quand les bandes se resserrent au maximum, le prochain mouvement sera violent. La direction dépendra des autres couches de confluence.",
    visual: "bollinger",
  },
  {
    id: "moyennes-mobiles",
    category: "indicateur",
    icon: <Minus size={20} />,
    title: "Moyennes Mobiles (MA)",
    subtitle: "Le filtre de tendance",
    analogy: "Une moyenne mobile, c'est comme un GPS qui lisse votre trajectoire. Au lieu de voir chaque virage (volatilité quotidienne), vous voyez la direction générale de votre voyage.",
    whatItIs: "Une moyenne mobile calcule le prix moyen sur les N dernières bougies. On utilise la MA20 (court terme), MA50 (moyen terme) et MA200 (long terme).",
    howItWorks: "MA20 = moyenne des 20 dernières clôtures\nMA50 = moyenne des 50 dernières clôtures\n\nSi le prix est au-dessus de ses moyennes mobiles, la tendance est haussière.",
    howToRead: [
      { signal: "Prix > MA20 > MA50", meaning: "Tendance haussière forte — les acheteurs dominent", type: "buy" },
      { signal: "Prix < MA20 < MA50", meaning: "Tendance baissière forte — les vendeurs dominent", type: "sell" },
      { signal: "Golden Cross (MA50 croise MA200 ↑)", meaning: "Signal haussier majeur à long terme", type: "buy" },
      { signal: "Death Cross (MA50 croise MA200 ↓)", meaning: "Signal baissier majeur à long terme", type: "sell" },
    ],
    proTip: "Les moyennes mobiles fonctionnent mal en range. Elles sont faites pour les marchés en tendance. Si le prix zigzague autour des MAs, concentrez-vous sur les supports/résistances.",
    visual: "ma",
  },
  {
    id: "ichimoku",
    category: "indicateur",
    icon: <Layers size={20} />,
    title: "Ichimoku Kinko Hyo",
    subtitle: "Le système tout-en-un japonais",
    analogy: "L'Ichimoku est comme une carte météo. Le nuage représente la zone de temps incertain. Au-dessus du nuage, le ciel est dégagé (haussier). En dessous, c'est l'orage (baissier). Dans le nuage, c'est le brouillard (incertain).",
    whatItIs: "Développé par le journaliste japonais Goichi Hosoda, l'Ichimoku montre en un coup d'œil la tendance, le momentum, les supports/résistances, et les signaux. Le nuage (entre Senkou A et B) est la zone clé.",
    howItWorks: "• Tenkan-sen (9 périodes) = ligne de conversion rapide\n• Kijun-sen (26 périodes) = ligne de base lente\n• Senkou A = moyenne de Tenkan et Kijun\n• Senkou B = midpoint sur 52 périodes\n• Le nuage = zone entre Senkou A et B",
    howToRead: [
      { signal: "Prix au-dessus du nuage", meaning: "Tendance haussière confirmée", type: "buy" },
      { signal: "Prix dans le nuage", meaning: "Zone d'incertitude — ne pas trader", type: "neutral" },
      { signal: "Prix sous le nuage", meaning: "Tendance baissière confirmée", type: "sell" },
      { signal: "Tenkan croise Kijun ↑", meaning: "Signal d'achat (TK Cross)", type: "buy" },
    ],
    proTip: "L'Ichimoku est conçu pour les marchés en tendance. En range, il génère des faux signaux. Utilisez-le comme confirmateur, pas comme déclencheur unique.",
    visual: "ichimoku",
  },
  {
    id: "volume-obv",
    category: "indicateur",
    icon: <BarChart3 size={20} />,
    title: "Volume & OBV",
    subtitle: "La conviction du marché",
    analogy: "Le volume, c'est comme le nombre de personnes qui votent. Un mouvement de prix avec un volume élevé est comme une élection avec 90% de participation — le résultat est légitime. Avec un faible volume, il ne veut rien dire.",
    whatItIs: "Le volume mesure le nombre d'actions échangées. L'OBV cumule le volume en l'additionnant quand le prix monte et en le soustrayant quand il baisse. Il révèle si de l'argent entre ou sort discrètement d'un actif.",
    howItWorks: "OBV = somme cumulée (volume × direction du prix)\n\nSi le prix baisse mais l'OBV monte, des gros acheteurs accumulent discrètement. C'est un signal puissant d'accumulation institutionnelle.",
    howToRead: [
      { signal: "Volume 1.5× la moyenne + hausse", meaning: "Conviction forte des acheteurs", type: "buy" },
      { signal: "Volume faible + hausse", meaning: "Mouvement peu crédible — risque de faux breakout", type: "neutral" },
      { signal: "OBV monte + prix baisse", meaning: "Accumulation discrète — retournement probable", type: "buy" },
      { signal: "OBV baisse + prix monte", meaning: "Distribution discrète — retournement probable", type: "sell" },
    ],
    proTip: "Le volume est le seul indicateur qui ne peut pas mentir. Le prix peut être manipulé, mais le volume montre toujours la vraie conviction.",
    visual: "volume",
  },
  {
    id: "fibonacci",
    category: "indicateur",
    icon: <Zap size={20} />,
    title: "Fibonacci Retracement",
    subtitle: "Les niveaux naturels du marché",
    analogy: "Après avoir gravi une montagne, il est naturel de redescendre un peu avant de repartir. Fibonacci mesure « de combien » le prix redescend. Les niveaux 38.2%, 50% et 61.8% sont les paliers où le prix reprend le plus souvent son souffle.",
    whatItIs: "Le retracement de Fibonacci est basé sur la suite mathématique de Fibonacci. Le ratio 61.8% (le « nombre d'or ») se retrouve dans la nature et dans les marchés. Les niveaux indiquent où un mouvement est susceptible de se corriger avant de reprendre.",
    howItWorks: "On trace du plus bas au plus haut de la période. Les niveaux clés :\n\n• 23.6% — correction faible (tendance très forte)\n• 38.2% — correction modérée\n• 50% — correction médiane\n• 61.8% — correction profonde (le golden ratio)",
    howToRead: [
      { signal: "Rebond sur le 38.2%", meaning: "Correction faible — reprise rapide probable", type: "buy" },
      { signal: "Prix atteint le 61.8%", meaning: "Correction profonde — zone de décision", type: "neutral" },
      { signal: "Prix casse le 61.8%", meaning: "La tendance est probablement terminée", type: "sell" },
    ],
    proTip: "Les niveaux Fibonacci sont encore plus puissants quand ils coïncident avec un support/résistance ou une MA. Cette double confluence augmente considérablement la probabilité de réaction.",
    visual: "fibonacci",
  },
  {
    id: "atr",
    category: "indicateur",
    icon: <Eye size={20} />,
    title: "ATR (Average True Range)",
    subtitle: "Le baromètre de la volatilité",
    analogy: "L'ATR est comme le compteur de turbulences d'un avion. Il ne dit pas si l'avion monte ou descend, mais à quel point le vol est agité. Plus l'ATR est élevé, plus vous devez élargir votre stop-loss.",
    whatItIs: "L'ATR mesure la volatilité moyenne sur 14 bougies. Un ATR de 2.50€ sur une action à 100€ signifie que le prix bouge de ±2.5% par jour en moyenne.",
    howItWorks: "ATR = Moyenne sur 14 jours du True Range\nTrue Range = max(High−Low, |High−Close₋₁|, |Low−Close₋₁|)\n\nOn l'utilise pour dimensionner les stop-loss et les objectifs.",
    howToRead: [
      { signal: "ATR élevé (> 3% du prix)", meaning: "Forte volatilité — élargir les stops", type: "neutral" },
      { signal: "ATR faible (< 1% du prix)", meaning: "Calme avant la tempête — breakout possible", type: "neutral" },
      { signal: "ATR en hausse soudaine", meaning: "Le marché se réveille — mouvement en cours", type: "neutral" },
    ],
    proTip: "Règle d'or : placez votre stop-loss à au moins 1.5× l'ATR. Un stop trop serré sera déclenché par le bruit normal du marché.",
    visual: "atr",
  },
];

// ═══════════════════════════════════════════════════════════════
// SVG MINI ILLUSTRATIONS — toutes implémentées
// ═══════════════════════════════════════════════════════════════

function MiniViz({ type }: { type: string }) {
  const w = 320, h = 130;
  const c = { width: w, height: h, viewBox: `0 0 ${w} ${h}` };

  // ── Confluence: layered signals converging ──
  if (type === "confluence") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#f0fdf4" />
      {/* Layer bars */}
      {[
        { label: "Price Action", pct: 0.78, color: "#2563eb", y: 18 },
        { label: "Indicateurs",  pct: 0.65, color: "#7c3aed", y: 38 },
        { label: "Volume",       pct: 0.82, color: "#059669", y: 58 },
        { label: "Structure",    pct: 0.70, color: "#d97706", y: 78 },
      ].map(({ label, pct, color, y: ly }) => (
        <g key={label}>
          <text x={8} y={ly + 8} fontSize={7.5} fill="#5a5a72" fontWeight={600}>{label}</text>
          <rect x={95} y={ly} width={190} height={10} rx={5} fill="#e5e7eb" />
          <rect x={95} y={ly} width={190 * pct} height={10} rx={5} fill={color} opacity={0.85} />
          <text x={292} y={ly + 8} fontSize={7} fill={color} fontWeight={700}>{Math.round(pct * 100)}%</text>
        </g>
      ))}
      {/* Score badge */}
      <rect x={118} y={98} width={84} height={22} rx={11} fill="#059669" />
      <text x={160} y={113} textAnchor="middle" fontSize={12} fill="white" fontWeight={800}>Score : 74</text>
    </svg>
  );

  // ── RSI ──
  if (type === "rsi") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#eff6ff" />
      <rect x={20} y={18} width={280} height={8} rx={4} fill="#fecaca" opacity={0.6} />
      <rect x={20} y={56} width={280} height={38} rx={4} fill="#f0fdf4" opacity={0.5} />
      <rect x={20} y={104} width={280} height={8} rx={4} fill="#dcfce7" opacity={0.6} />
      <text x={8} y={25} fontSize={7} fill="#dc2626" fontWeight={600}>70</text>
      <text x={8} y={63} fontSize={7} fill="#6b7280">50</text>
      <text x={8} y={116} fontSize={7} fill="#059669" fontWeight={600}>30</text>
      <line x1={20} y1={22} x2={300} y2={22} stroke="#dc262620" strokeWidth={1} />
      <line x1={20} y1={60} x2={300} y2={60} stroke="#6b728030" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={20} y1={108} x2={300} y2={108} stroke="#05966920" strokeWidth={1} />
      <polyline
        points="20,75 52,70 84,55 116,30 148,22 172,28 196,48 220,65 244,80 268,102 292,112"
        fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={148} cy={22} r={5} fill="none" stroke="#dc2626" strokeWidth={2} />
      <text x={118} y={18} fontSize={8} fill="#dc2626" fontWeight={600}>Surachat</text>
      <circle cx={292} cy={112} r={5} fill="#059669" />
      <text x={262} y={126} fontSize={8} fill="#059669" fontWeight={600}>Survente</text>
    </svg>
  );

  // ── MACD ──
  if (type === "macd") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#eff6ff" />
      <line x1={20} y1={65} x2={300} y2={65} stroke="#2563eb10" />
      {[25,42,59,76,93,110,127,144,161,178,195,212,229,246,263,280].map((x, i) => {
        const v = Math.sin(i * 0.4 - 1) * 28;
        return <rect key={i} x={x} y={v > 0 ? 65 - v : 65} width={10} height={Math.abs(v)} rx={3} fill={v > 0 ? "#05966950" : "#dc262650"} />;
      })}
      <polyline points="25,75 59,80 93,70 127,48 161,38 195,42 229,58 263,68 297,62" fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" />
      <polyline points="25,70 59,72 93,66 127,52 161,44 195,46 229,55 263,62 297,60" fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={161} cy={38} r={5} fill="#2563eb" />
      <text x={130} y={28} fill="#2563eb" fontSize={9} fontWeight={600}>Croisement ↑</text>
    </svg>
  );

  // ── Bollinger ──
  if (type === "bollinger") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#faf5ff" />
      <path d="M20,30 Q90,18 160,28 T300,22" fill="none" stroke="#7c3aed30" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d="M20,100 Q90,112 160,102 T300,108" fill="none" stroke="#7c3aed30" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d="M20,30 Q90,18 160,28 T300,22 L300,108 Q240,102 160,102 T20,100 Z" fill="#7c3aed06" />
      <path d="M20,65 Q90,60 160,65 T300,62" fill="none" stroke="#7c3aed18" strokeWidth={1} />
      <polyline points="20,58 50,52 80,68 110,82 140,98 165,90 195,68 225,52 255,40 285,48" fill="none" stroke="#1a1a2e" strokeWidth={2} strokeLinecap="round" />
      {/* Squeeze zone annotation */}
      <rect x={60} y={50} width={50} height={35} rx={4} fill="none" stroke="#7c3aed" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
      <text x={64} y={46} fontSize={7} fill="#7c3aed" fontWeight={600}>Squeeze</text>
      <circle cx={140} cy={98} r={6} fill="none" stroke="#059669" strokeWidth={2} />
      <text x={100} y={120} fill="#059669" fontSize={9} fontWeight={600}>Rebond bande basse</text>
    </svg>
  );

  // ── Candles ──
  if (type === "candle") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#ecfdf5" />
      <g transform="translate(30, 0)">
        <line x1={25} y1={15} x2={25} y2={100} stroke="#059669" strokeWidth={1.5} />
        <rect x={14} y={35} width={22} height={40} rx={4} fill="#059669" />
        <text x={14} y={118} fill="#1a1a2e" fontSize={9} fontWeight={600}>Haussière</text>
      </g>
      <g transform="translate(110, 0)">
        <line x1={25} y1={15} x2={25} y2={100} stroke="#dc2626" strokeWidth={1.5} />
        <rect x={14} y={28} width={22} height={40} rx={4} fill="#dc2626" />
        <text x={14} y={118} fill="#1a1a2e" fontSize={9} fontWeight={600}>Baissière</text>
      </g>
      <g transform="translate(190, 0)">
        <line x1={25} y1={25} x2={25} y2={100} stroke="#059669" strokeWidth={1.5} />
        <rect x={16} y={25} width={18} height={14} rx={4} fill="#059669" />
        <text x={14} y={118} fill="#1a1a2e" fontSize={9} fontWeight={600}>Marteau</text>
      </g>
      <g transform="translate(260, 0)">
        <line x1={20} y1={25} x2={20} y2={95} stroke="#d97706" strokeWidth={1.5} />
        <rect x={13} y={57} width={14} height={4} rx={2} fill="#d97706" />
        <text x={13} y={118} fill="#1a1a2e" fontSize={9} fontWeight={600}>Doji</text>
      </g>
    </svg>
  );

  // ── Supports & Résistances ──
  if (type === "sr") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#fefce8" />
      {/* Resistance zone */}
      <rect x={20} y={22} width={280} height={8} rx={2} fill="#fecaca" opacity={0.7} />
      <text x={24} y={20} fontSize={7.5} fill="#dc2626" fontWeight={700}>RÉSISTANCE</text>
      {/* Support zone */}
      <rect x={20} y={98} width={280} height={8} rx={2} fill="#dcfce7" opacity={0.7} />
      <text x={24} y={120} fontSize={7.5} fill="#059669" fontWeight={700}>SUPPORT</text>
      {/* Bouncing price line */}
      <polyline
        points="20,96 50,78 80,60 100,42 120,30 135,26 148,30 162,50 180,78 200,96 220,100 240,90 260,70 275,42 290,28"
        fill="none" stroke="#1a1a2e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Rejection arrows */}
      <text x={138} y={45} fontSize={12} fill="#dc2626">↓</text>
      <text x={195} y={88} fontSize={12} fill="#059669">↑</text>
    </svg>
  );

  // ── Moyennes Mobiles ──
  if (type === "ma") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#f0fdf4" />
      {/* MA200 */}
      <polyline points="20,90 80,85 140,80 200,74 260,68 300,65" fill="none" stroke="#d97706" strokeWidth={1.5} strokeDasharray="5 3" />
      <text x={250} y={60} fontSize={7} fill="#d97706" fontWeight={600}>MA200</text>
      {/* MA50 */}
      <polyline points="20,82 80,75 140,65 200,55 260,48 300,44" fill="none" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="3 2" />
      <text x={250} y={40} fontSize={7} fill="#7c3aed" fontWeight={600}>MA50</text>
      {/* MA20 */}
      <polyline points="20,75 60,62 100,50 140,42 180,36 220,32 260,28 300,26" fill="none" stroke="#2563eb" strokeWidth={1.5} />
      <text x={250} y={23} fontSize={7} fill="#2563eb" fontWeight={600}>MA20</text>
      {/* Price */}
      <polyline points="20,80 50,65 80,50 110,40 140,35 170,28 200,24 230,20 260,18 290,16" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" />
      {/* Golden cross annotation */}
      <circle cx={130} cy={58} r={7} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={104} y={78} fontSize={7.5} fill="#f59e0b" fontWeight={700}>Golden Cross</text>
    </svg>
  );

  // ── Ichimoku ──
  if (type === "ichimoku") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#f0f9ff" />
      {/* Kumo cloud */}
      <path d="M20,55 Q80,45 140,50 T260,40 L260,80 Q200,90 140,85 T20,90 Z" fill="#05966915" stroke="#05966930" strokeWidth={0.5} />
      {/* Senkou A */}
      <path d="M20,55 Q80,45 140,50 T260,40" fill="none" stroke="#059669" strokeWidth={1} strokeDasharray="3 2" />
      {/* Senkou B */}
      <path d="M20,90 Q80,88 140,85 T260,80" fill="none" stroke="#dc2626" strokeWidth={1} strokeDasharray="3 2" />
      {/* Kijun */}
      <polyline points="20,75 80,72 140,68 200,62 260,58 300,54" fill="none" stroke="#dc2626" strokeWidth={1.5} />
      <text x={264} y={52} fontSize={6.5} fill="#dc2626">Kijun</text>
      {/* Tenkan */}
      <polyline points="20,65 60,58 100,50 140,44 180,38 220,33 260,28 300,24" fill="none" stroke="#2563eb" strokeWidth={1.5} />
      <text x={264} y={22} fontSize={6.5} fill="#2563eb">Tenkan</text>
      {/* Price — above cloud */}
      <polyline points="100,30 130,22 160,16 190,12 220,10 250,8 280,6" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" />
      <text x={22} y={35} fontSize={8} fill="#059669" fontWeight={700}>Prix au-dessus du nuage ↑</text>
    </svg>
  );

  // ── Volume & OBV ──
  if (type === "volume") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#f0fdf4" />
      {/* Volume bars */}
      {[20,38,56,74,92,110,128,146,164,182,200,218,236,254,272].map((x, i) => {
        const h2 = [20,14,28,18,12,35,16,42,22,30,16,50,24,18,38][i];
        const isUp = [1,0,1,1,0,1,0,1,1,0,0,1,1,0,1][i];
        return <rect key={i} x={x} y={88 - h2} width={14} height={h2} rx={2} fill={isUp ? "#05966960" : "#dc262650"} />;
      })}
      {/* OBV line */}
      <polyline
        points="20,105 38,102 56,98 74,95 92,99 110,90 128,95 146,82 164,76 182,80 200,84 218,68 236,62 254,66 272,55"
        fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round"
      />
      <text x={22} y={120} fontSize={7} fill="#6b7280">Volume</text>
      <text x={220} y={52} fontSize={7} fill="#2563eb" fontWeight={600}>OBV ↑ (accumulation)</text>
    </svg>
  );

  // ── Fibonacci ──
  if (type === "fibonacci") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#fff7ed" />
      {/* Levels */}
      {[
        { pct: 0,    label: "0%",    y: 14, color: "#6b7280" },
        { pct: 0.236,label: "23.6%", y: 35, color: "#2563eb" },
        { pct: 0.382,label: "38.2%", y: 52, color: "#7c3aed" },
        { pct: 0.5,  label: "50%",   y: 66, color: "#d97706" },
        { pct: 0.618,label: "61.8%", y: 80, color: "#dc2626", bold: true },
        { pct: 1,    label: "100%",  y: 108,color: "#6b7280" },
      ].map(({ label, y: ly, color, bold }) => (
        <g key={label}>
          <line x1={45} y1={ly} x2={300} y2={ly} stroke={color} strokeWidth={bold ? 1.5 : 0.8} strokeDasharray={bold ? "none" : "4 3"} opacity={0.6} />
          <text x={4} y={ly + 3.5} fontSize={7} fill={color} fontWeight={bold ? 800 : 500}>{label}</text>
        </g>
      ))}
      {/* Price retracement */}
      <polyline
        points="50,14 80,10 110,8 140,12 165,22 180,38 190,52 195,66 192,72 188,78 185,82 190,70 200,55 215,40 235,25 260,15 285,10"
        fill="none" stroke="#1a1a2e" strokeWidth={2} strokeLinecap="round"
      />
      <circle cx={190} cy={80} r={5} fill="none" stroke="#dc2626" strokeWidth={1.5} />
      <text x={195} y={85} fontSize={7.5} fill="#dc2626" fontWeight={600}>Golden ratio</text>
    </svg>
  );

  // ── ATR ──
  if (type === "atr") return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#fdf4ff" />
      {/* Candle range bars representing volatility */}
      {[20,40,60,80,100,120,140,160,180,200,220,240,260,280].map((x, i) => {
        const ranges = [18,16,20,15,12,10,8,9,7,20,28,35,30,25];
        const h2 = ranges[i];
        const midY = 65;
        return (
          <g key={i}>
            <line x1={x + 7} y1={midY - h2} x2={x + 7} y2={midY + h2} stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" opacity={0.6 + i * 0.02} />
          </g>
        );
      })}
      {/* ATR line */}
      <polyline
        points="27,50 47,48 67,52 87,46 107,42 127,36 147,34 167,36 187,34 207,50 227,62 247,68 267,64 287,58"
        fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round"
      />
      <text x={22} y={120} fontSize={7} fill="#7c3aed" fontWeight={600}>ATR — volatilité quotidienne</text>
      <text x={210} y={50} fontSize={7.5} fill="#dc2626" fontWeight={600}>Volatilité ↑</text>
    </svg>
  );

  // Fallback
  return (
    <svg {...c}>
      <rect width={w} height={h} rx={16} fill="#f5f4f1" />
      <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill="#c4c2cc" fontSize={12} fontWeight={500}>{type}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

const categoryLabel: Record<string, string> = { methode: "Méthode", indicateur: "Indicateur", concept: "Concept" };
const categoryColor: Record<string, string> = { methode: "#2563eb", indicateur: "#7c3aed", concept: "#059669" };

export default function GuidePage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "methode" | "indicateur" | "concept">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const base = SECTIONS.filter(s => filter === "all" || s.category === filter);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q) ||
      s.whatItIs.toLowerCase().includes(q)
    );
  }, [filter, query]);

  const active = SECTIONS.find(s => s.id === activeId);

  // Progress tracking — how many sections the user has visited
  const activeIndex = activeId ? SECTIONS.findIndex(s => s.id === activeId) : -1;

  return (
    <div className="min-h-screen" style={{ background: "#faf9f7", color: "#1a1a2e", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar />
      <main className="md:ml-64 px-5 pt-8 pb-20 md:px-10">
        <div className="max-w-3xl mx-auto">

          {/* Back */}
          <Link href="/analyses" className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors hover:opacity-70" style={{ color: "#2563eb" }}>
            <ArrowLeft size={16} /> Retour à l&apos;analyse
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "#dbeafe" }}>
                <BookOpen size={20} style={{ color: "#2563eb" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Comprendre l&apos;analyse technique</h1>
                <p className="text-sm" style={{ color: "#9a98a8" }}>Guide interactif — {SECTIONS.length} fiches · Nexus Stocks</p>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: "#5a5a72" }}>
              Chaque indicateur est un outil. Seul, il est imprécis. Combinés intelligemment (confluence), ils deviennent puissants.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9a98a8" }} />
            <input
              type="text"
              placeholder="Rechercher un indicateur..."
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveId(null); }}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: "#f0eeeb", color: "#1a1a2e", border: "1.5px solid transparent" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#2563eb")}
              onBlur={e => (e.currentTarget.style.borderColor = "transparent")}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-60 transition-opacity">
                <X size={14} style={{ color: "#9a98a8" }} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {([["all", "Tout"], ["concept", "Concepts"], ["methode", "Méthodes"], ["indicateur", "Indicateurs"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setFilter(k); setActiveId(null); setQuery(""); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={filter === k ? { background: "#1a1a2e", color: "#fff" } : { background: "#f5f4f1", color: "#5a5a72" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Progress bar (only in detail view) */}
          {active && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold" style={{ color: "#9a98a8" }}>
                  Fiche {activeIndex + 1} / {SECTIONS.length}
                </span>
                <span className="text-[11px]" style={{ color: "#9a98a8" }}>
                  {Math.round(((activeIndex + 1) / SECTIONS.length) * 100)}% du guide
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#eae8e4" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "#2563eb" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${((activeIndex + 1) / SECTIONS.length) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            {!active ? (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filtered.length === 0 ? (
                  <div className="text-center py-16" style={{ color: "#9a98a8" }}>
                    <p className="text-sm">Aucun résultat pour &quot;{query}&quot;</p>
                    <button onClick={() => setQuery("")} className="mt-3 text-sm font-semibold" style={{ color: "#2563eb" }}>
                      Effacer la recherche
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((s, i) => (
                      <motion.button key={s.id} onClick={() => setActiveId(s.id)}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="text-left rounded-2xl border p-6 transition-all duration-200 hover:shadow-lg hover:shadow-black/[0.04] group"
                        style={{ background: "#fff", borderColor: "#eae8e4" }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: categoryColor[s.category] + "12", color: categoryColor[s.category] }}>
                              {s.icon}
                            </div>
                            <div>
                              <h3 className="text-[15px] font-semibold">{s.title}</h3>
                              <p className="text-xs" style={{ color: "#9a98a8" }}>{s.subtitle}</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="mt-1 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                        <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: "#5a5a72" }}>{s.analogy.slice(0, 130)}…</p>
                        <span className="inline-block mt-3 text-[10px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: categoryColor[s.category] + "10", color: categoryColor[s.category] }}>
                          {categoryLabel[s.category]}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="detail" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="space-y-7">

                <button onClick={() => setActiveId(null)} className="flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: "#2563eb" }}>
                  <ChevronLeft size={16} /> Retour au guide
                </button>

                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: categoryColor[active.category] + "12", color: categoryColor[active.category] }}>
                    {active.icon}
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-lg mb-2" style={{ background: categoryColor[active.category] + "10", color: categoryColor[active.category] }}>
                      {categoryLabel[active.category]}
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight">{active.title}</h2>
                    <p className="text-base" style={{ color: "#5a5a72" }}>{active.subtitle}</p>
                  </div>
                </div>

                {/* Analogy */}
                <div className="rounded-2xl p-6 border-l-4" style={{ background: "#eff6ff", borderColor: "#2563eb" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#2563eb" }}>En une image</p>
                  <p className="text-[15px] leading-relaxed">{active.analogy}</p>
                </div>

                {/* Mini viz */}
                <div className="flex justify-center py-2 rounded-2xl overflow-hidden" style={{ background: "#f5f4f1" }}>
                  <MiniViz type={active.visual} />
                </div>

                <div className="rounded-2xl border p-6" style={{ background: "#fff", borderColor: "#eae8e4" }}>
                  <h3 className="text-sm font-semibold mb-3">Qu&apos;est-ce que c&apos;est ?</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "#5a5a72" }}>{active.whatItIs}</p>
                </div>

                <div className="rounded-2xl border p-6" style={{ background: "#fff", borderColor: "#eae8e4" }}>
                  <h3 className="text-sm font-semibold mb-3">Comment ça fonctionne ?</h3>
                  <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "#5a5a72" }}>{active.howItWorks}</p>
                </div>

                <div className="rounded-2xl border p-6" style={{ background: "#fff", borderColor: "#eae8e4" }}>
                  <h3 className="text-sm font-semibold mb-4">Comment le lire ?</h3>
                  <div className="space-y-1">
                    {active.howToRead.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "#f0eeeb" }}>
                        <div className="mt-0.5 shrink-0">
                          {h.type === "buy" && <ArrowUpRight size={16} style={{ color: "#059669" }} />}
                          {h.type === "sell" && <ArrowDownRight size={16} style={{ color: "#dc2626" }} />}
                          {h.type === "neutral" && <Minus size={16} style={{ color: "#d97706" }} />}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">{h.signal}</p>
                          <p className="text-[13px]" style={{ color: "#5a5a72" }}>{h.meaning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro tip */}
                <div className="rounded-2xl p-6 border-l-4" style={{ background: "#fffbeb", borderColor: "#d97706" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#d97706" }}>Conseil de pro</p>
                  <p className="text-[14px] leading-relaxed">{active.proTip}</p>
                </div>

                {/* Prev / Next */}
                <div className="flex justify-between pt-4 border-t" style={{ borderColor: "#eae8e4" }}>
                  {(() => {
                    const idx = SECTIONS.findIndex(s => s.id === activeId);
                    const prev = idx > 0 ? SECTIONS[idx - 1] : null;
                    const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
                    return (
                      <>
                        {prev ? (
                          <button onClick={() => setActiveId(prev.id)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#5a5a72" }}>
                            <ChevronLeft size={16} /> {prev.title}
                          </button>
                        ) : <div />}
                        {next && (
                          <button onClick={() => setActiveId(next.id)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#2563eb" }}>
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