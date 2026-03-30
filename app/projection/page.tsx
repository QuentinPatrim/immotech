"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Download, Info, Landmark, ShieldCheck,
  BarChart3, Scale, Sparkles, AlertTriangle, Check,
  Loader2, BookOpen, RefreshCw, Coins
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import PremiumGuard from "@/components/PremiumGuard";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtK = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M€` : v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`;
const fmtPct = (v: number, decimals = 1) => `${v.toFixed(decimals)} %`;
const getVal = (v: number | string) => (typeof v === "string" ? parseFloat(v) : v) || 0;

// ─────────────────────────────────────────────────────────────────────────────
// FISCALITÉ 2026 — SOURCE: BOFIP / CGI / LFSS 2026
// PFU standard : 31,4% (IR 12,8% + PS 18,6% après hausse CSG)
// AV exception : PS 17,2% maintenus (PFU dérogatoire 30%)
// ─────────────────────────────────────────────────────────────────────────────
const F = {
  IR_PFU: 0.128,
  PS_STD: 0.186,      // PS standard 2026 (hausse CSG LFSS 2026)
  PS_AV: 0.172,       // PS Assurance Vie (préservé)
  PFU: 0.314,         // PFU standard = 12,8% + 18,6%
  PFU_AV: 0.30,       // PFU dérogatoire AV = 12,8% + 17,2%
  AV_IR_LONG: 0.075,  // IR réduit AV après 8 ans
  AV_ABAT: 4600,      // Abattement annuel AV > 8 ans (célibataire)
  AV_SUCC: 152500,    // Abattement succession AV / bénéficiaire (< 70 ans)
  PEA_PLAFOND: 150000,
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILS DE RISQUE
// ─────────────────────────────────────────────────────────────────────────────
const PROFILES = [
  { id: "prudent",    label: "Prudent",    growth: 3.5,  divYield: 2.5, color: "#3b82f6", desc: "Fonds € / Obligations (3,5%/an)" },
  { id: "equilibre", label: "Équilibré",  growth: 6.0,  divYield: 3.5, color: "#10b981", desc: "Mix actions/obligations (6%/an)" },
  { id: "dynamique", label: "Dynamique",  growth: 8.0,  divYield: 4.5, color: "#f59e0b", desc: "Majoritairement actions (8%/an)" },
  { id: "offensif",  label: "Offensif",   growth: 10.5, divYield: 5.5, color: "#ef4444", desc: "100% actions mondiales (10,5%/an)" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR DE SIMULATION — calcul mensuel précis
// ─────────────────────────────────────────────────────────────────────────────
interface SimParams {
  capital: number;
  dca: number;
  years: number;
  growth: number;       // % annuel brut croissance
  divYield: number;     // % annuel dividende
  isDividend: boolean;  // stratégie dividende vs croissance
  tmi: number;
  brokerType: "online" | "banque";
}

interface YearPoint {
  year: number; label: string;
  Investi: number;
  PEA: number; CTO: number; AV: number; PER: number; LA: number;
}

const BROKERS = {
  online: { label: "Courtier en ligne", fraisEntree: 0,    fraisAnnuels: 0.006 },
  banque: { label: "Banque classique",  fraisEntree: 0.02, fraisAnnuels: 0.015 },
};

function simuler(p: SimParams): YearPoint[] {
  const broker = BROKERS[p.brokerType];
  const gMensuel = p.growth / 100 / 12;
  const divMensuel = p.isDividend ? p.divYield / 100 / 12 : 0;
  const fraisMensuel = broker.fraisAnnuels / 12;

  // États internes par enveloppe
  const cap0 = p.capital * (1 - broker.fraisEntree);
  let capPEA = cap0, versePEA = cap0;
  let capCTO = cap0, verseCTO = cap0;
  let capAV  = cap0, verseAV  = cap0;
  let capPER = cap0, versePER = cap0;
  let capLA  = Math.min(cap0, F.AV_ABAT); // Livret A plafonné 22 950€

  const points: YearPoint[] = [];

  for (let y = 0; y <= p.years; y++) {
    // ── Valeur nette à la sortie (calcul pour affichage) ──
    const gainPEA = Math.max(0, capPEA - versePEA);
    const gainCTO = Math.max(0, capCTO - verseCTO);
    const gainAV  = Math.max(0, capAV  - verseAV);
    const gainPER = Math.max(0, capPER - versePER);

    // PEA : exo IR après 5 ans, PS 18,6% sinon PFU 31,4%
    const tauxPEA = y >= 5 ? F.PS_STD : F.PFU;
    const netPEA = Math.min(capPEA - gainPEA * tauxPEA, F.PEA_PLAFOND + gainPEA * (1 - tauxPEA));

    // CTO : PFU 31,4% toujours
    const netCTO = capCTO - gainCTO * F.PFU;

    // AV : PFU dérogatoire 30% / après 8 ans 7,5% IR + 17,2% PS + abo 4 600€
    let netAV: number;
    if (y >= 8) {
      const gainsTaxables = Math.max(0, gainAV - F.AV_ABAT);
      netAV = capAV - gainsTaxables * (F.AV_IR_LONG + F.PS_AV) - Math.min(gainAV, F.AV_ABAT) * F.PS_AV;
    } else {
      netAV = capAV - gainAV * F.PFU_AV;
    }

    // PER : déduction TMI à l'entrée, sortie IR barème (TMI) + PFU 31,4% sur PV
    // Économie fiscale = versements * TMI → réinvestie
    const economieEntree = versePER * (p.tmi / 100) * 0.35; // 35% de l'éco réinvestie
    const capitalNetPER = Math.max(0,
      (capPER - versePER) * (1 - F.PFU) +          // PV nettes PFU
      versePER * (1 - p.tmi / 100) +                 // capital net de TMI
      economieEntree                                  // bonus économie
    );

    // Livret A : 2,4% garantis, exonéré
    const netLA = capLA;

    const investi = p.capital + p.dca * 12 * y;

    points.push({
      year: y,
      label: y === 0 ? "Départ" : `An ${y}`,
      Investi: Math.round(investi),
      PEA: Math.round(Math.max(0, netPEA)),
      CTO: Math.round(Math.max(0, netCTO)),
      AV: Math.round(Math.max(0, netAV)),
      PER: Math.round(Math.max(0, capitalNetPER)),
      LA: Math.round(Math.max(0, netLA)),
    });

    if (y >= p.years) break;

    // ── Avancer d'un an ──
    for (let m = 0; m < 12; m++) {
      const apport = p.dca * (1 - broker.fraisEntree);

      // PEA : réinvestissement total dividendes + croissance
      capPEA = capPEA * (1 + gMensuel + divMensuel - fraisMensuel) + apport;
      versePEA += apport;

      // CTO : dividendes taxés au PFU 31,4% si stratégie dividende
      if (p.isDividend) {
        const divNet = divMensuel * (1 - F.PFU);
        capCTO = capCTO * (1 + gMensuel + divNet - fraisMensuel) + apport;
      } else {
        capCTO = capCTO * (1 + gMensuel - fraisMensuel) + apport;
      }
      verseCTO += apport;

      // AV : frais gestion 0.7% + broker
      const fraisAV = 0.007 / 12 + fraisMensuel;
      capAV = capAV * (1 + gMensuel + divMensuel - fraisAV) + apport;
      verseAV += apport;

      // PER : frais gestion 0.7% + économie fiscale mensuelle réinvestie
      const ecoBrut = p.dca * (p.tmi / 100) / 12;
      capPER = capPER * (1 + gMensuel + divMensuel - fraisMensuel - 0.007 / 12) + apport + ecoBrut * 0.5;
      versePER += apport;

      // Livret A : taux fixe 2,4% annuel
      capLA = Math.min(capLA * (1 + 0.024 / 12) + apport, 22950);
    }
  }

  return points;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP INFO
// ─────────────────────────────────────────────────────────────────────────────
const Tip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex ml-1">
      <button type="button" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        className="p-0.5 rounded-full text-zinc-700 hover:text-zinc-400 transition-colors">
        <Info size={10} />
      </button>
      {open && (
        <span className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl text-[10px] leading-relaxed text-center pointer-events-none"
          style={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: "#18181b" }} />
        </span>
      )}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PDF — html2canvas + jspdf, styles inline uniquement
// ─────────────────────────────────────────────────────────────────────────────
// Logo SVG Nexus inline (aucune dépendance externe)
// ─── Logo Nexus — SVG inline (identique à NexusLogo.tsx) ──────────────────
// Rendu inline pour html2canvas (pas de <img src=base64>)
const NexusLogoPDF = ({ dark = false, size = 36 }: { dark?: boolean; size?: number }) => {
  const textColor = dark ? "#ffffff" : "#111827";
  const uniqueId = dark ? "nexusGradDark" : "nexusGradLight";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {/* Icône SVG */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"
        width={size} height={size} style={{ display: "block", flexShrink: 0 }}>
        <defs>
          <linearGradient id={uniqueId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path d="M25 80 L25 30 L75 80 L75 20"
          stroke={`url(#${uniqueId})`} strokeWidth="12"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="75" cy="20" r="8" fill="#3b82f6" />
      </svg>
      {/* Texte NEXUS */}
      <span style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        fontWeight: 900,
        fontSize: `${Math.round(size * 0.5)}px`,
        color: textColor,
        letterSpacing: "-0.5px",
        lineHeight: 1,
      }}>NEXUS</span>
    </div>
  );
};


// ─── import useReactToPrint ──────────────────────────────────────────────────
// (ajouté dynamiquement — ne pas mettre dans les imports statiques)

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT PATRIMONIAL PDF — Architecture useReactToPrint identique à RapportFiscalPDF
// 100% React/JSX → window.print() → zéro html2canvas, zéro jsPDF, zéro CSS lab()
// ─────────────────────────────────────────────────────────────────────────────

interface ClientInfo { prenom: string; nom: string; age: string; situation: string; objectif: string; }

// ─────────────────────────────────────────────────────────────────────────────
// MODALE INFOS CLIENT
// ─────────────────────────────────────────────────────────────────────────────
function ClientModal({ onConfirm, onClose }: {
  onConfirm: (data: ClientInfo) => void;
  onClose: () => void;
}) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [age, setAge] = useState("");
  const [situation, setSituation] = useState("Célibataire");
  const [objectif, setObjectif] = useState("");

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-[#0C0C0E] border border-zinc-800/60 rounded-2xl shadow-2xl overflow-hidden z-10">
        <div className="px-6 py-5 border-b border-zinc-800/50">
          <h3 className="text-base font-black text-white">Personnaliser le dossier client</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Ces informations apparaîtront sur la page de couverture du PDF</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Prénom *</label>
              <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="ex: Jean"
                className="w-full h-10 px-3 rounded-xl bg-black/50 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Nom *</label>
              <input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Dupont"
                className="w-full h-10 px-3 rounded-xl bg-black/50 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Âge *</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="ex: 38"
                className="w-full h-10 px-3 rounded-xl bg-black/50 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Situation</label>
              <select value={situation} onChange={e => setSituation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-black/50 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none appearance-none">
                {["Célibataire","Marié(e)","Pacsé(e)","Divorcé(e)","Veuf/Veuve"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Objectif patrimonial</label>
            <input value={objectif} onChange={e => setObjectif(e.target.value)}
              placeholder="ex: Préparer ma retraite et protéger ma famille"
              className="w-full h-10 px-3 rounded-xl bg-black/50 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm hover:bg-zinc-700 transition-colors">Annuler</button>
          <button onClick={() => prenom && nom && age ? onConfirm({ prenom, nom, age, situation, objectif }) : null}
            disabled={!prenom || !nom || !age}
            className="flex-1 h-11 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #065f46, #064e3b)" }}>
            Générer le PDF
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT PDF — composant React pur, déclenché par useReactToPrint
// Même architecture que RapportFiscalPDF (impression navigateur, pas jsPDF)
// ─────────────────────────────────────────────────────────────────────────────
interface RapportProps {
  refProp: React.RefObject<HTMLDivElement | null>;
  client: ClientInfo;
  params: SimParams;
  points: YearPoint[];
  profile: typeof PROFILES[0];
  tmi: number;
  brokerType: "online" | "banque";
  isDividend: boolean;
  fireYear: number | null;
  fireTarget: number;
}

function RapportPatrimonialPDF({ refProp, client, params, points, profile, tmi, brokerType, isDividend, fireYear, fireTarget }: RapportProps) {
  const [dateStr, setDateStr] = useState("");
  useEffect(() => { setDateStr(new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })); }, []);

  const last = points[points.length - 1];
  const broker = BROKERS[brokerType];
  const totalInvesti = params.capital + params.dca * 12 * params.years;
  const ageRetraite = parseInt(client.age || "35") + params.years;
  const isMarie = client.situation === "Marié(e)" || client.situation === "Pacsé(e)";
  const abatAV = isMarie ? 9200 : 4600;
  const fmtE = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

  const enveloppes = [
    { id: "PEA",  label: "PEA",            val: last?.PEA || 0, color: "#0d9488",
      long: "0 % impôt sur le revenu + 18,6 % prélèvements sociaux après 5 ans",
      succession: "Actif successoral — exonération 100 000 € par enfant",
      desc: "Bouclier fiscal n°1. L'État efface totalement l'impôt sur le revenu après 5 ans de détention. Idéal pour les ETF MSCI World (CW8, IWDA)." },
    { id: "CTO",  label: "CTO",            val: last?.CTO || 0, color: "#d97706",
      long: "PFU 31,4 % permanent (12,8 % IR + 18,6 % prélèvements sociaux)",
      succession: "Purge des plus-values au décès — actif successoral classique",
      desc: "Liberté totale (actions mondiales, ETF, produits dérivés) sans avantage fiscal. En dividendes, chaque distribution est taxée à 31,4 %." },
    { id: "AV",   label: "Assurance Vie",  val: last?.AV  || 0, color: "#be185d",
      long: `7,5 % IR + 17,2 % prélèvements sociaux après 8 ans + exonération annuelle ${abatAV.toLocaleString("fr-FR")} €`,
      succession: "152 500 € exonérés par bénéficiaire désigné (Art. 990 I CGI)",
      desc: "Couteau suisse du patrimoine. Prélèvements sociaux maintenus à 17,2 % en 2026 (exception). Champion de la succession." },
    { id: "PER",  label: "PER",            val: last?.PER || 0, color: "#4338ca",
      long: `Déduction tranche marginale ${tmi} % à l'entrée — IR + PFU 31,4 % sur PV à la sortie`,
      succession: "Avant 70 ans : même régime Assurance Vie (152 500 €/bénéficiaire)",
      desc: `À tranche marginale ${tmi} %, chaque 1 000 € versé coûte réellement ${(1000*(1-tmi/100)).toFixed(0)} €. L'économie fiscale immédiate est puissante.` },
    { id: "LA",   label: "Livret A",       val: last?.LA  || 0, color: "#1d4ed8",
      long: "100 % exonéré d'impôt et de prélèvements sociaux — taux 2,4 % garanti",
      succession: "Actif successoral classique",
      desc: "Idéal pour le matelas de précaution (3 à 6 mois de dépenses). Ne jamais l'utiliser comme outil d'enrichissement long terme." },
  ].sort((a, b) => b.val - a.val);

  const best = enveloppes[0];

  // Stratégie personnalisée
  const stratSteps = [
    { n: "01", color: "#1d4ed8", titre: "Constituez votre matelas de précaution",
      corps: `Avant d'investir sur les marchés, sécurisez 3 à 6 mois de dépenses sur Livret A (plafond 22 950 €). Ce capital doit rester disponible immédiatement. Ne jamais investir de l'argent dont vous pourriez avoir besoin dans les 3 prochaines années.` },
    { n: "02", color: "#0d9488", titre: `Ouvrez votre PEA immédiatement — DCA de ${fmtE(params.dca)}/mois`,
      corps: `Le compteur fiscal des 5 ans commence à l'ouverture, pas au premier versement. Ouvrez votre PEA chez un courtier en ligne (Boursorama, Trade Republic, Fortuneo) et investissez ${fmtE(params.dca)}/mois sur un ETF MSCI World (CW8 sur Euronext). Après 5 ans : vos gains ne sont taxés qu'à 18,6 % au lieu de 31,4 %.` },
    tmi >= 30
      ? { n: "03", color: "#4338ca", titre: `Maximisez votre PER — TMI ${tmi} % = levier fiscal puissant`,
          corps: `À tranche marginale ${tmi} %, chaque 1 000 € versé au PER ne vous coûte que ${(1000*(1-tmi/100)).toFixed(0)} € grâce à la déduction immédiate. L'État finance le reste. Versez jusqu'à 10 % de vos revenus imposables (plafond ~37 000 €/an en 2026). L'économie fiscale annuelle estimée sur votre DCA : ${fmtE(Math.round(params.dca * 0.3 * 12 * tmi / 100))}.` }
      : { n: "03", color: "#06b6d4", titre: "Saturez le PEA avant tout — TMI basse = PEA optimal",
          corps: `À tranche marginale ${tmi} %, l'avantage PER est limité. Concentrez votre épargne sur le PEA jusqu'au plafond de 150 000 €. Répartissez votre DCA : 70 % PEA (ETF MSCI World), 30 % Assurance Vie (fonds euros). Une fois le PEA saturé, basculez sur le CTO pour les actions hors Europe.` },
    { n: "04", color: "#be185d", titre: "Ouvrez une Assurance Vie dès maintenant pour la succession",
      corps: `Le délai des 8 ans pour le régime fiscal favorable commence à l'ouverture — agissez aujourd'hui. Chaque bénéficiaire désigné reçoit jusqu'à 152 500 € totalement exonérés de droits de succession (primes avant 70 ans, Art. 990 I CGI). ${isMarie ? "Clause bénéficiaire recommandée : conjoint pour l'usufruit, enfants pour la nue-propriété — zéro impôt en deux temps." : "Désignez vos enfants directement comme bénéficiaires nominatifs."}` },
    fireYear != null
      ? { n: "05", color: "#d97706", titre: `Indépendance financière atteignable à ${parseInt(client.age || "35") + fireYear} ans (An ${fireYear})`,
          corps: `Avec un DCA de ${fmtE(params.dca)}/mois, votre capital PEA atteindra ${fmtE(fireTarget)} à l'An ${fireYear}. La règle des 4 % vous permettra de retirer ${fmtE(Math.round(fireTarget * 0.04 / 12))}/mois sans entamer le capital. Maintenez la discipline — ne vendez pas lors des baisses de marché.` }
      : { n: "05", color: "#d97706", titre: `Augmentez votre DCA pour atteindre l'indépendance financière`,
          corps: `L'objectif de ${fmtE(fireTarget)} n'est pas atteint sur ${params.years} ans avec ${fmtE(params.dca)}/mois. Chaque 100 € supplémentaires par mois représente environ ${fmtE(Math.round(100*12*((Math.pow(1+profile.growth/100,params.years)-1)/(profile.growth/100))))} de capital en plus.` },
  ];

  // ── Styles ──────────────────────────────────────────────────────────────────
  const page: React.CSSProperties = {
    width: "210mm", minHeight: "297mm", background: "white", color: "#0f172a",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: "14mm 16mm 16mm", boxSizing: "border-box", position: "relative",
  };
  const PageBreak = () => <div style={{ pageBreakBefore: "always" }} />;

  const PageHeader = ({ title, pageNum }: { title: string; pageNum: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: 10, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Logo Nexus inline — identique à NexusLogo.tsx */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" width={28} height={28} style={{ display: "block", flexShrink: 0 }}>
          <defs>
            <linearGradient id="ng2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path d="M25 80 L25 30 L75 80 L75 20" stroke="url(#ng2)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="75" cy="20" r="8" fill="#3b82f6" />
        </svg>
        <div>
          <p style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Nexus Invest · Bilan d'Investissement 2026</p>
          <p style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", margin: 0, marginTop: 2 }}>{title}</p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: 9, color: "#94a3b8", margin: 0 }}>{dateStr}</p>
        <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, marginTop: 2 }}>Page {pageNum} · {client.prenom} {client.nom.toUpperCase()}</p>
      </div>
    </div>
  );

  const Section = ({ title, color = "#0d9488" }: { title: string; color?: string }) => (
    <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 10, margin: "18px 0 10px" }}>
      <p style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color, margin: 0 }}>{title}</p>
    </div>
  );

  const Row = ({ l, v, bold, color }: { l: string; v: string; bold?: boolean; color?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 11, color: "#64748b" }}>{l}</span>
      <span style={{ fontSize: bold ? 13 : 11, fontWeight: bold ? 900 : 600, color: color || "#0f172a" }}>{v}</span>
    </div>
  );

  const footerStyle: React.CSSProperties = {
    position: "absolute", bottom: 10, left: 16, right: 16,
    display: "flex", justifyContent: "space-between",
    borderTop: "1px solid #e2e8f0", paddingTop: 6,
    fontSize: 8, color: "#94a3b8",
  };

  return (
    <div className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none -z-50 print:static print:w-auto print:h-auto print:opacity-100 print:z-auto" style={{ overflow: "hidden" }}>
      <style type="text/css" media="print">{`
        @page { size: A4 portrait; margin: 0; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
        nav, aside, header, button, .sidebar-mobile { display: none !important; }
      `}</style>

      <div ref={refProp} style={{ background: "white" }}>

        {/* ══ PAGE 1 : COUVERTURE — fond blanc, accents couleur, imprimable ══ */}
        <div style={{ ...page, padding: 0, display: "flex", flexDirection: "column", background: "white" }}>

          {/* Bandeau top vert plein — s'imprime parfaitement */}
          <div style={{ background: "#0d9488", padding: "10mm 16mm 8mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" width={40} height={40} style={{ display: "block", flexShrink: 0 }}>
                <defs>
                  <linearGradient id="ng1" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#a7f3d0" />
                  </linearGradient>
                </defs>
                <path d="M25 80 L25 30 L75 80 L75 20" stroke="url(#ng1)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="75" cy="20" r="8" fill="white" />
              </svg>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: "white", margin: 0, letterSpacing: "-0.02em" }}>NEXUS INVEST</p>
                <p style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0, marginTop: 3 }}>Conseil Patrimonial & Fiscal</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", margin: 0 }}>Rapport établi le</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "white", margin: 0, marginTop: 2 }}>{dateStr}</p>
              <p style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", margin: 0, marginTop: 2 }}>Document confidentiel</p>
            </div>
          </div>

          {/* Corps blanc — zone centrale */}
          <div style={{ flex: 1, padding: "12mm 16mm", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

            {/* Titre principal */}
            <div style={{ borderLeft: "6px solid #0d9488", paddingLeft: 18, marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.2em", margin: "0 0 8px" }}>Bilan d'Investissement Personnalisé · 2026</p>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>Votre Stratégie</h1>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: "#0d9488", margin: 0, lineHeight: 1.1 }}>Patrimoniale 2026</h1>
              <p style={{ fontSize: 12, color: "#64748b", margin: "10px 0 0" }}>Comparatif des enveloppes fiscales · Fiscalité française à jour · Feuille de route personnalisée</p>
            </div>

            {/* Séparateur */}
            <div style={{ height: 2, background: "#e2e8f0", margin: "6mm 0" }} />

            {/* Card client — fond gris très clair */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #0d9488", borderRadius: 8, padding: "16px 20px", marginBottom: "8mm" }}>
              <p style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px", fontWeight: 700 }}>Préparé pour</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <p style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
                    {client.prenom} <span style={{ color: "#0d9488" }}>{client.nom.toUpperCase()}</span>
                  </p>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>{client.age} ans · {client.situation}</p>
                  {client.objectif && (
                    <p style={{ fontSize: 11, color: "#0d9488", margin: "5px 0 0", fontStyle: "italic" }}>"{client.objectif}"</p>
                  )}
                </div>
                <div style={{ textAlign: "right", borderLeft: "1px solid #e2e8f0", paddingLeft: 20 }}>
                  <p style={{ fontSize: 8, color: "#64748b", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Horizon</p>
                  <p style={{ fontSize: 40, fontWeight: 900, color: "#0d9488", margin: 0, lineHeight: 1 }}>{params.years}</p>
                  <p style={{ fontSize: 10, color: "#64748b", margin: "4px 0 0" }}>ans · objectif {ageRetraite} ans</p>
                </div>
              </div>
            </div>

            {/* KPIs — 3 colonnes fond blanc bordure */}
            <div>
              <p style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px", fontWeight: 700 }}>Résumé de la simulation</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[
                  { l: "Capital de départ", v: fmtE(params.capital), accent: false },
                  { l: "Épargne mensuelle", v: `${fmtE(params.dca)}/mois`, accent: false },
                  { l: "Capital total engagé", v: fmtE(totalInvesti), accent: false },
                  { l: "Enveloppe optimale", v: best.label, accent: true },
                  { l: "Capital net optimal", v: fmtE(best.val), accent: true },
                  { l: "Rente estimée / mois", v: `${fmtE(Math.round(best.val * 0.04 / 12))}/mois`, accent: true },
                ].map((k, i) => (
                  <div key={i} style={{ background: k.accent ? "#f0fdfa" : "white", border: `1px solid ${k.accent ? "#99f6e4" : "#e2e8f0"}`, borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ fontSize: 7.5, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>{k.l}</p>
                    <p style={{ fontSize: 13, fontWeight: 900, color: k.accent ? "#0d9488" : "#0f172a", margin: 0 }}>{k.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bannière FIRE */}
            {fireYear != null && (
              <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderLeft: "4px solid #0d9488", borderRadius: 8, padding: "12px 16px", marginTop: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", margin: "0 0 4px" }}>
                  Indépendance financière atteignable à {parseInt(client.age || "35") + fireYear} ans (An {fireYear})
                </p>
                <p style={{ fontSize: 10, color: "#134e4a", margin: 0, lineHeight: 1.6 }}>
                  Capital cible : <strong>{fmtE(fireTarget)}</strong> · Rente mensuelle : <strong>{fmtE(Math.round(fireTarget * 0.04 / 12))}</strong> · Règle des 4 %
                </p>
              </div>
            )}

            {/* Paramètres clés */}
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6 }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  `Profil : ${profile.label} (${profile.growth} %/an)`,
                  `TMI : ${tmi} %`,
                  `Stratégie : ${isDividend ? `Dividendes ${params.divYield} %` : "Capitalisation"}`,
                  `Intermédiaire : ${broker.label}`,
                ].map((t, i) => (
                  <p key={i} style={{ fontSize: 9, color: "#475569", margin: 0 }}><strong style={{ color: "#0f172a" }}>{t.split(":")[0]} :</strong>{t.split(":")[1]}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Pied de page couverture */}
          <div style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0", padding: "6px 16mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 7.5, color: "#94a3b8", margin: 0 }}>Sources : BOFIP · CGI 2026 · LFSS 2026 · Banque de France</p>
            <p style={{ fontSize: 7.5, color: "#94a3b8", margin: 0 }}>Ne constitue pas un conseil financier juridiquement engageant</p>
          </div>
        </div>

        {/* ══ PAGE 2 : SITUATION & PARAMÈTRES ═════════════════ */}
        <PageBreak />
        <div style={page}>
          <PageHeader title="Situation & Paramètres de Simulation" pageNum="2" />

          <Section title="Profil Personnel" color="#0d9488" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Identité</p>
              <Row l="Prénom & Nom" v={`${client.prenom} ${client.nom}`} />
              <Row l="Âge" v={`${client.age} ans`} />
              <Row l="Situation familiale" v={client.situation} />
              <Row l="Âge à l'horizon" v={`${ageRetraite} ans`} bold />
              {client.objectif && <Row l="Objectif déclaré" v={`"${client.objectif}"`} />}
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Paramètres de Simulation</p>
              <Row l="Capital de départ" v={fmtE(params.capital)} />
              <Row l="Versement mensuel (DCA)" v={`${fmtE(params.dca)}/mois`} bold />
              <Row l="Durée de projection" v={`${params.years} ans`} />
              <Row l="Profil de risque" v={`${profile.label} — ${profile.growth} %/an`} />
              <Row l="Tranche marginale (TMI)" v={`${tmi} %`} />
              <Row l="Intermédiaire financier" v={broker.label} />
              <Row l="Stratégie" v={isDividend ? `Dividendes (${params.divYield} %)` : "Capitalisation"} />
              <Row l="Capital total engagé" v={fmtE(totalInvesti)} bold />
            </div>
          </div>

          <Section title="Ce que ces chiffres représentent concrètement" color="#0d9488" />
          <div style={{ background: "#f0fdfa", borderRadius: 12, padding: "16px 20px", border: "1px solid #99f6e4", marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: "#134e4a", margin: 0, lineHeight: 1.8 }}>
              En versant <strong>{fmtE(params.dca)}/mois</strong> pendant <strong>{params.years} ans</strong> avec un profil {profile.label} ({profile.growth} %/an),
              vous engagez un total de <strong>{fmtE(totalInvesti)}</strong>. La magie des intérêts composés fait que chaque euro investi génère des gains
              qui génèrent à leur tour de nouveaux gains — de façon exponentielle. La seule différence entre les enveloppes : la <strong>fiscalité</strong> et les <strong>frais</strong>.
            </p>
          </div>

          <Section title="Réformes Fiscales 2026 à Connaître" color="#dc2626" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { n: "1", color: "#10b981", bg: "#f0fdfa", title: "PFU 2026 : 31,4 %", text: "La hausse de la CSG (LFSS 2026) porte les prélèvements sociaux de 17,2 % à 18,6 % pour la plupart des produits. Exception : l'Assurance Vie conserve 17,2 % (PFU dérogatoire 30 %)." },
              { n: "2", color: "#4338ca", bg: "#eff6ff", title: "PEA : 0 % IR après 5 ans", text: "Le PEA reste le bouclier fiscal optimal pour les actions européennes et les ETF synthétiques mondiaux. Après 5 ans, seuls 18,6 % de prélèvements sociaux s'appliquent. Plafond : 150 000 €." },
              { n: "3", color: "#be185d", bg: "#fdf2f8", title: "AV : prélèvements préservés", text: "Les prélèvements sociaux de l'Assurance Vie restent à 17,2 % en 2026 (exception à la hausse de la CSG). L'avantage successoral de 152 500 €/bénéficiaire est maintenu." },
            ].map((item, i) => (
              <div key={i} style={{ background: item.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${item.color}25` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: "white" }}>{item.n}</span>
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: item.color, margin: 0 }}>{item.title}</p>
                </div>
                <p style={{ fontSize: 10, color: "#374151", margin: 0, lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>

          <div style={footerStyle}><span>Nexus Invest · Bilan Patrimonial 2026</span><span>Page 2</span></div>
        </div>

        {/* ══ PAGE 3 : COMPARATIF ENVELOPPES ══════════════════ */}
        <PageBreak />
        <div style={page}>
          <PageHeader title="Comparatif des Enveloppes Fiscales" pageNum="3" />
          <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>Capital net après impôts et frais · Horizon {params.years} ans · Capital investi : {fmtE(totalInvesti)}</p>

          <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Rang", "Enveloppe", "Capital net", "Gain net", "Performance", "Rente / mois", "Plafond"].map((h, i) => (
                    <th key={i} style={{ padding: "9px 10px", fontSize: 8, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i <= 1 ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enveloppes.map(({ id, label, val, color }, i) => {
                  const gain = val - totalInvesti;
                  const perf = totalInvesti > 0 ? (gain / totalInvesti) * 100 : 0;
                  const rente = Math.round(val * 0.04 / 12);
                  const plafonds: Record<string, string> = { PEA: "150 000 €", CTO: "Illimité", AV: "Illimité", PER: "~37 000 €/an", LA: "22 950 €" };
                  return (
                    <tr key={id} style={{ background: i === 0 ? "#f0fdfa" : i % 2 === 0 ? "white" : "#f8fafc" }}>
                      <td style={{ padding: "9px 10px", fontSize: i === 0 ? 16 : 11, fontWeight: 900, color: i === 0 ? "#0d9488" : "#94a3b8", textAlign: "center" }}>{i === 0 ? "★" : i + 1}</td>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{label}</span>
                          {i === 0 && <span style={{ fontSize: 7, fontWeight: 900, color: "white", background: "#0d9488", padding: "2px 7px", borderRadius: 20, marginLeft: 4 }}>OPTIMAL</span>}
                        </div>
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: 900, textAlign: "right" }}>{fmtE(val)}</td>
                      <td style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, textAlign: "right", color: gain >= 0 ? "#0d9488" : "#ef4444" }}>{gain >= 0 ? "+" : ""}{fmtE(gain)}</td>
                      <td style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, textAlign: "right", color: perf >= 0 ? "#0d9488" : "#ef4444" }}>{perf.toFixed(1)} %</td>
                      <td style={{ padding: "9px 10px", fontSize: 11, textAlign: "right", color: "#475569" }}>{fmtE(rente)}/mois</td>
                      <td style={{ padding: "9px 10px", fontSize: 10, textAlign: "right", color: "#94a3b8" }}>{plafonds[id]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Section title="Comprendre chaque enveloppe" color="#0d9488" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {enveloppes.map(env => (
              <div key={env.id} style={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${env.color}`, borderRadius: "0 8px 8px 0", padding: "12px 14px", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: env.color, margin: 0 }}>{env.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", margin: 0 }}>{fmtE(env.val)}</p>
                </div>
                <p style={{ fontSize: 10, color: "#475569", margin: 0, lineHeight: 1.6, marginBottom: 7 }}>{env.desc}</p>
                <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, borderTop: "1px solid #e2e8f0", paddingTop: 7 }}>Fiscalité : {env.long}</p>
              </div>
            ))}
          </div>

          <div style={footerStyle}><span>Nexus Invest · Bilan Patrimonial 2026</span><span>Page 3</span></div>
        </div>

        {/* ══ PAGE 4 : FISCALITÉ 2026 & FRAIS ═════════════════ */}
        <PageBreak />
        <div style={page}>
          <PageHeader title="Fiscalité 2026 & Impact des Frais" pageNum="4" />

          <Section title="Le Prélèvement Forfaitaire Unique 2026 (PFU)" color="#0d9488" />
          <div style={{ background: "#f0fdfa", borderRadius: 12, padding: "14px 18px", border: "1px solid #99f6e4", marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: "#134e4a", margin: 0, lineHeight: 1.75, marginBottom: 12 }}>
              En 2026, la hausse de la CSG (9,2 % → 10,6 %) via la loi de financement de la sécurité sociale fait passer le PFU standard de 30 % à <strong>31,4 %</strong> — composé de <strong>12,8 % d'impôt sur le revenu</strong> et <strong>18,6 % de prélèvements sociaux</strong>.
              <strong style={{ color: "#be185d" }}> Exception :</strong> l'Assurance Vie conserve ses prélèvements sociaux à 17,2 % (PFU dérogatoire 30 % maintenu par le législateur).
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { l: "PFU Standard 2026", v: "31,4 %", c: "#ef4444", bg: "#fef2f2" },
                { l: "PEA après 5 ans", v: "18,6 %", c: "#0d9488", bg: "#f0fdfa" },
                { l: `AV après 8 ans (+exo. ${abatAV.toLocaleString("fr-FR")} €)`, v: "~17,2 %", c: "#be185d", bg: "#fdf2f8" },
                { l: "Livret A", v: "0 %", c: "#1d4ed8", bg: "#eff6ff" },
              ].map(item => (
                <div key={item.l} style={{ textAlign: "center", background: item.bg, borderRadius: 8, padding: "12px 8px" }}>
                  <p style={{ fontSize: 8, color: "#64748b", margin: 0, marginBottom: 6, lineHeight: 1.3 }}>{item.l}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: item.c, margin: 0 }}>{item.v}</p>
                </div>
              ))}
            </div>
          </div>

          <Section title="Démonstration chiffrée — 5 000 € de gains sur 10 000 € de capital" color="#0d9488" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Compte-Titres (CTO)", color: "#d97706",
                rows: [["Base imposable","5 000 €",false],["Impôt sur le revenu (12,8 %)","- 640 €",true],["Prélèvements sociaux (18,6 %)","- 930 €",true],["Total prélevé (31,4 %)","- 1 570 €",true],["Net récupéré","13 430 €",false]] },
              { label: "PEA (après 5 ans)", color: "#0d9488",
                rows: [["Base imposable","5 000 €",false],["Impôt sur le revenu (0 %)","0 €",false],["Prélèvements sociaux (18,6 %)","- 930 €",true],["Total prélevé (18,6 %)","- 930 €",true],["Net récupéré","14 070 €",false]] },
              { label: `Assurance Vie (après 8 ans)`, color: "#be185d",
                rows: [["Gains à taxer","5 000 €",false],[`Exonération annuelle (${abatAV.toLocaleString("fr-FR")} €)`,`- ${abatAV.toLocaleString("fr-FR")} €`,false],["Impôt sur le revenu (7,5 %)","- 30 €",true],["Prélèvements sociaux (17,2 %)","- 860 €",true],["Net récupéré","14 110 €",false]] },
            ].map(block => (
              <div key={block.label} style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ background: block.color, padding: "8px 12px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "white", margin: 0 }}>{block.label}</p>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  {block.rows.map(([l, v, neg]: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < block.rows.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <span style={{ fontSize: 10, color: "#64748b" }}>{l}</span>
                      <span style={{ fontSize: i === block.rows.length - 1 ? 12 : 10, fontWeight: i === block.rows.length - 1 ? 900 : 600, color: neg ? "#ef4444" : i === block.rows.length - 1 ? "#0d9488" : "#0f172a" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Section title="La Guerre des Frais — le Piège Silencieux" color="#d97706" />
          <div style={{ background: "#fffbeb", borderRadius: 12, padding: "14px 18px", border: "1px solid #fcd34d", marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[
                { l: "Courtier en ligne", f1: "0 % à l'entrée", f2: "0,6 %/an de gestion", f3: "0 € d'arbitrage", c: "#0d9488", bg: "#f0fdfa" },
                { l: "Banque classique", f1: "2 % sur chaque versement", f2: "1,5 %/an de gestion", f3: "~1 % par arbitrage", c: "#ef4444", bg: "#fef2f2" },
              ].map(b => (
                <div key={b.l} style={{ background: b.bg, borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 8 }}>{b.l}</p>
                  <p style={{ fontSize: 10, color: "#374151", margin: "2px 0" }}>Frais d'entrée : <strong style={{ color: b.c }}>{b.f1}</strong></p>
                  <p style={{ fontSize: 10, color: "#374151", margin: "2px 0" }}>Gestion annuelle : <strong style={{ color: b.c }}>{b.f2}</strong></p>
                  <p style={{ fontSize: 10, color: "#374151", margin: "2px 0" }}>Arbitrage : <strong style={{ color: b.c }}>{b.f3}</strong></p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: "#92400e", margin: 0, lineHeight: 1.7 }}>
              <strong>Règle d'or :</strong> les frais sont le seul coût certain de l'investissement. La performance est incertaine, les frais ne le sont pas. Une différence de 0,9 %/an sur {fmtE(totalInvesti)} représente un manque à gagner considérable sur {params.years} ans. Privilégiez systématiquement un courtier en ligne.
            </p>
          </div>

          <div style={footerStyle}><span>Nexus Invest · Bilan Patrimonial 2026</span><span>Page 4</span></div>
        </div>

        {/* ══ PAGE 5 : SUCCESSION & FEUILLE DE ROUTE ══════════ */}
        <PageBreak />
        <div style={page}>
          <PageHeader title="Succession & Feuille de Route Personnalisée" pageNum="5" />

          <Section title={`Transmission successorale — estimation à ${params.years} ans`} color="#be185d" />
          <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Enveloppe", "Capital", "Exonération", "Imposable", "Règle applicable"].map((h, i) => (
                    <th key={i} style={{ padding: "8px 10px", fontSize: 8, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enveloppes.map(({ id, label, val, color, succession }, i) => {
                  const exo = (label === "Assurance Vie" || label === "PER") ? 152500 : 100000;
                  const imposable = Math.max(0, val - exo);
                  return (
                    <tr key={id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{label}</span>
                          {label === "Assurance Vie" && <span style={{ fontSize: 7, fontWeight: 900, color: "white", background: "#be185d", padding: "2px 6px", borderRadius: 20, marginLeft: 4 }}>CHAMPION</span>}
                        </div>
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, textAlign: "right" }}>{fmtE(val)}</td>
                      <td style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, textAlign: "right", color: "#0d9488" }}>{fmtE(exo)}</td>
                      <td style={{ padding: "9px 10px", fontSize: 11, fontWeight: 900, textAlign: "right", color: imposable === 0 ? "#0d9488" : "#0f172a" }}>{imposable === 0 ? "0 €" : fmtE(imposable)}</td>
                      <td style={{ padding: "9px 10px", fontSize: 9, color: "#64748b", textAlign: "right" }}>{succession}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div style={{ background: "#fdf2f8", borderRadius: 10, padding: "14px 16px", border: "1px solid #fbcfe8" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#be185d", margin: 0, marginBottom: 8 }}>★ Assurance Vie — Champion successoral</p>
              <p style={{ fontSize: 10, color: "#374151", margin: 0, lineHeight: 1.65 }}>
                Primes versées <strong>avant 70 ans</strong> : <strong>152 500 € exonérés par bénéficiaire désigné</strong>, hors succession civile (Art. 990 I CGI). Au-delà : 20 % jusqu'à 1 005 000 €, puis 31,25 %.
              </p>
            </div>
            <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "14px 16px", border: "1px solid #ddd6fe" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", margin: 0, marginBottom: 8 }}>Démembrement de clause bénéficiaire</p>
              <p style={{ fontSize: 10, color: "#374151", margin: 0, lineHeight: 1.65 }}>
                <strong>"Conjoint pour l'usufruit, enfants pour la nue-propriété."</strong> Au 1er décès : conjoint reçoit tout (0 € d'impôt). Au 2ème décès : enfants récupèrent en franchise totale. Double protection optimisée.
              </p>
            </div>
          </div>

          <Section title={`Feuille de Route Personnalisée — ${client.prenom} ${client.nom}`} color="#0d9488" />
          <div style={{ background: "#0f172a", borderRadius: 12, padding: "6px 16px 14px", overflow: "hidden" }}>
            {stratSteps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < stratSteps.length - 1 ? "1px solid #1e293b" : "none" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: step.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: "white" }}>{step.n}</span>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "white", margin: 0, marginBottom: 4 }}>{step.titre}</p>
                  <p style={{ fontSize: 9.5, color: "#94a3b8", margin: 0, lineHeight: 1.65 }}>{step.corps}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={footerStyle}>
            <span>Nexus Invest · Bilan Patrimonial 2026 · Sources : BOFIP · CGI · LFSS 2026</span>
            <span>Page 5 / 5</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ProjectionPage() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [activeTab, setActiveTab] = useState<"comparaison" | "frais" | "fiscalite" | "succession">("comparaison");

  // ── Rapport PDF — useReactToPrint ──────────────────────────────────────
  const reportRef = useRef<HTMLDivElement>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientPrenom, setClientPrenom] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientAge, setClientAge] = useState("");
  const [clientSituation, setClientSituation] = useState("Célibataire");
  const [clientObjectif, setClientObjectif] = useState("");
  const [isPrintReady, setIsPrintReady] = useState(false);

  // Import dynamique de useReactToPrint pour éviter les SSR issues
  const { useReactToPrint } = require("react-to-print");
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Nexus_BDI_${clientPrenom}_${clientNom}_2026`,
    onAfterPrint: () => setIsPrintReady(false),
  });

  useEffect(() => {
    if (isPrintReady) { handlePrint(); }
  }, [isPrintReady]);

  // ── Paramètres ─────────────────────────────────────────────────────────
  const [capital, setCapital]           = useState<number | string>(10000);
  const [dca, setDca]                   = useState<number | string>(500);
  const [years, setYears]               = useState(20);
  const [tmi, setTmi]                   = useState<0 | 11 | 30 | 41 | 45>(30);
  const [profile, setProfile]           = useState(PROFILES[1]);
  const [brokerType, setBrokerType]     = useState<"online" | "banque">("online");
  const [isDividend, setIsDividend]     = useState(false);
  const [divYield, setDivYield]         = useState(3.5);
  const [monthlyExpenses, setMonthlyExpenses] = useState(2000);

  // ── Supabase ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: p } = await supabase.from("profiles")
          .select("is_pro, assets_json, budget_json").eq("id", session.user.id).single();
        if (p) {
          setIsPro(p.is_pro === true);
          const inv = (p.assets_json || [])
            .filter((a: any) => ["Bourse", "Crypto"].includes(a.type))
            .reduce((s: number, a: any) => s + a.value, 0);
          if (inv > 0) setCapital(Math.round(inv));
          const exp = Number((p.budget_json || {}).expenses) || 0;
          if (exp > 0) setMonthlyExpenses(exp);
          const urlDca = new URLSearchParams(window.location.search).get("dca");
          if (urlDca) setDca(Math.max(0, Math.round(parseFloat(urlDca))));
          else {
            const inc = Number((p.budget_json || {}).income) || 0;
            if (inc > exp) setDca(Math.round(inc - exp));
          }
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── useMemo — moteur ────────────────────────────────────────────────────
  const simParams = useMemo<SimParams>(() => ({
    capital: getVal(capital), dca: getVal(dca), years,
    growth: profile.growth,
    divYield: isDividend ? divYield : 0,
    isDividend, tmi, brokerType,
  }), [capital, dca, years, profile, isDividend, divYield, tmi, brokerType]);

  const points = useMemo(() => {
    if (loading) return [];
    return simuler(simParams);
  }, [loading, simParams]);

  // Données allégées pour graphique (max 31 points)
  const chartPoints = useMemo(() => {
    if (!points.length) return [];
    if (points.length <= 31) return points;
    const step = Math.ceil(points.length / 30);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);

  const last = points[points.length - 1];
  const totalInvesti = getVal(capital) + getVal(dca) * 12 * years;
  const fireTarget = monthlyExpenses * 12 * 25;
  const fireYear = points.find(p => p.PEA >= fireTarget && fireTarget > 0)?.year ?? null;

  // Comparatif frais
  const fraisComparaison = useMemo(() => {
    if (loading || !points.length) return null;
    const paramsOnline = { ...simParams, brokerType: "online" as const };
    const paramsBanque = { ...simParams, brokerType: "banque" as const };
    const lastOnline = simuler(paramsOnline)[years];
    const lastBanque = simuler(paramsBanque)[years];
    return { online: lastOnline, banque: lastBanque };
  }, [loading, simParams, years]);

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#030303", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
    </div>
  );

  const ENVS = [
    { key: "PEA", label: "PEA", color: "#10b981" },
    { key: "CTO", label: "CTO", color: "#f59e0b" },
    { key: "AV",  label: "Assurance Vie", color: "#ec4899" },
    { key: "PER", label: "PER", color: "#6366f1" },
    { key: "LA",  label: "Livret A", color: "#3b82f6" },
  ] as const;

  const bestEnvKey = last ? (["PEA","CTO","AV","PER","LA"] as const).reduce((best, k) =>
    (last[k] || 0) > (last[best] || 0) ? k : best, "PEA" as "PEA"|"CTO"|"AV"|"PER"|"LA"
  ) : "PEA";
  const bestEnvConfig = ENVS.find(e => e.key === bestEnvKey)!;

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans pb-24 md:pb-10 overflow-x-hidden">
      <Sidebar />

      {/* Modale infos client */}
      <AnimatePresence>
        {showClientModal && (
          <ClientModal
            onClose={() => setShowClientModal(false)}
            onConfirm={(data) => {
              setClientPrenom(data.prenom);
              setClientNom(data.nom);
              setClientAge(data.age);
              setClientSituation(data.situation);
              setClientObjectif(data.objectif);
              setShowClientModal(false);
              // Déclencher l'impression via useReactToPrint après mise à jour des states
              setTimeout(() => setIsPrintReady(true), 150);
            }}
          />
        )}
      </AnimatePresence>

      {/* Rapport PDF caché — rendu par useReactToPrint (window.print) */}
      <RapportPatrimonialPDF
        refProp={reportRef}
        client={{ prenom: clientPrenom, nom: clientNom, age: clientAge, situation: clientSituation, objectif: clientObjectif }}
        params={simParams}
        points={points}
        profile={profile}
        tmi={tmi}
        brokerType={brokerType}
        isDividend={isDividend}
        fireYear={fireYear}
        fireTarget={fireTarget}
      />

      <main className="md:ml-64 p-4 md:p-8 overflow-x-hidden">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto space-y-6">

          {/* ── HEADER ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-l-2 border-emerald-500/70 pl-4 py-1">
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-bold mb-1">Nexus Invest · PFU 31,4 % · PS 18,6 % · LFSS 2026</p>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Bilan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Patrimonial</span>
              </h1>
              <p className="text-zinc-500 text-xs mt-1">Comparatif fiscal · 5 enveloppes · Succession · Rapport client personnalisé</p>
            </div>
            <button onClick={() => setShowClientModal(true)}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 shrink-0 text-white"
              style={{ background: "linear-gradient(135deg, #065f46, #064e3b)", boxShadow: "0 8px 32px -8px rgba(16,185,129,0.5)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Download size={15} />
              Générer le Dossier Client
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

            {/* ══════════════════════
                PANNEAU CONFIG
            ══════════════════════ */}
            <div className="xl:col-span-3 space-y-4">

              {/* HYPOTHÈSES */}
              <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/50 p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full bg-yellow-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">① Hypothèses</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
                    Capital de départ <Tip text="Somme déjà investie sur les marchés. Ne pas inclure le matelas de sécurité (Livret A)." />
                  </label>
                  <div className="relative">
                    <Input type="number" value={capital} onChange={e => setCapital(e.target.value)}
                      className="bg-black/60 border-zinc-800 text-white font-mono h-11 pr-8 focus:border-emerald-500 rounded-xl text-sm w-full" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono">€</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
                    DCA mensuel <Tip text="Versement mensuel régulier. C'est la clé des intérêts composés : régularité > montant." />
                  </label>
                  <div className="relative">
                    <Input type="number" value={dca} onChange={e => setDca(e.target.value)}
                      className="bg-emerald-950/30 border-emerald-900/50 text-emerald-400 font-mono font-bold h-11 pr-14 focus:border-emerald-500 rounded-xl text-sm w-full" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 text-xs font-bold">€/m</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
                    Dépenses/mois <Tip text="Pour calculer la cible FIRE : 25 × dépenses annuelles (règle des 4%)." />
                  </label>
                  <div className="relative">
                    <Input type="number" value={monthlyExpenses} onChange={e => setMonthlyExpenses(Number(e.target.value))}
                      className="bg-black/60 border-zinc-800 text-white font-mono h-10 pr-8 rounded-xl text-sm w-full" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">€</span>
                  </div>
                </div>

                {/* Horizon slider */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
                      Horizon <Tip text="La bourse récompense la patience. Plus l'horizon est long, plus les intérêts composés font leur magie." />
                    </label>
                    <span className="text-xl font-black text-white">{years} <span className="text-xs text-zinc-500 font-normal">ans</span></span>
                  </div>
                  <Slider value={[years]} min={5} max={40} step={1} onValueChange={v => setYears(v[0])} className="w-full" />
                  <div className="flex justify-between text-[9px] text-zinc-700">
                    <span>5 ans</span><span>20 ans</span><span>40 ans</span>
                  </div>
                </div>

                {/* TMI */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
                    TMI <Tip text="Tranche Marginale d'Imposition. Impact direct sur le PER à l'entrée. TMI 30%+ = PER très avantageux." />
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {([0, 11, 30, 41, 45] as const).map(t => (
                      <button key={t} onClick={() => setTmi(t)}
                        className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${tmi === t ? "bg-indigo-600 text-white" : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-700"}`}>
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STRATÉGIE */}
              <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/50 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full bg-purple-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">② Stratégie</span>
                </div>

                {/* Dividendes toggle */}
                <div className="flex items-center justify-between bg-black/30 px-3 py-3 rounded-xl border border-zinc-800/50">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Coins size={12} className="text-amber-400" />
                      Stratégie Dividendes
                      <Tip text="Dividendes = distribution de revenus réguliers. Taxés au PFU 31,4% sur CTO dès la distribution. Le PEA exonère ces distributions et les réinvestit sans frottement fiscal." />
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-0.5">{isDividend ? "Distribution annuelle taxée (CTO impacté)" : "Capitalisation — réinvestissement automatique"}</p>
                  </div>
                  <Switch checked={isDividend} onCheckedChange={setIsDividend} className="shrink-0 ml-2" />
                </div>

                {isDividend && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Rendement dividende</label>
                      <span className="text-base font-black text-amber-400">{divYield}%</span>
                    </div>
                    <Slider value={[divYield]} min={1} max={10} step={0.5} onValueChange={v => setDivYield(v[0])} className="w-full" />
                    <div className="p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
                      <p className="text-[9px] text-amber-400/80 leading-relaxed">
                        <strong>Impact CTO :</strong> Chaque distribution est taxée à 31,4% PFU, brisant les intérêts composés. Le PEA est ici nettement supérieur.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* PROFIL DE RISQUE */}
              <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/50 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full bg-indigo-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">③ Profil de Risque</span>
                </div>
                {PROFILES.map(p => (
                  <button key={p.id} onClick={() => setProfile(p)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left"
                    style={profile.id === p.id
                      ? { borderColor: p.color + "50", backgroundColor: p.color + "10" }
                      : { borderColor: "rgba(63,63,70,0.5)", backgroundColor: "rgba(0,0,0,0.2)" }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: profile.id === p.id ? p.color : "#52525b" }} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white">{p.label}</p>
                        <p className="text-[9px] text-zinc-600 truncate">{p.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black shrink-0 ml-2" style={{ color: profile.id === p.id ? p.color : "#52525b" }}>{p.growth}%</span>
                  </button>
                ))}
              </div>

              {/* INTERMÉDIAIRE */}
              <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/50 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full bg-red-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">④ Intermédiaire Financier</span>
                </div>
                {(["online", "banque"] as const).map(bt => {
                  const b = BROKERS[bt];
                  const col = bt === "online" ? "#10b981" : "#f59e0b";
                  return (
                    <button key={bt} onClick={() => setBrokerType(bt)}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-xl border transition-all text-left"
                      style={brokerType === bt
                        ? { borderColor: col + "50", backgroundColor: col + "10" }
                        : { borderColor: "rgba(63,63,70,0.5)", backgroundColor: "rgba(0,0,0,0.2)" }}>
                      <div>
                        <p className="text-xs font-bold text-white">{b.label}</p>
                        <p className="text-[9px] text-zinc-600">
                          {bt === "online" ? "0% entrée · 0,6%/an · 0€ arbitrage" : "2% entrée · 1,5%/an · ~1% arbitrage"}
                        </p>
                      </div>
                      {brokerType === bt && <Check size={14} style={{ color: col }} className="shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ══════════════════════
                ZONE PRINCIPALE
            ══════════════════════ */}
            <div className="xl:col-span-9 space-y-5">

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Enveloppe Optimale",
                    value: bestEnvConfig.label,
                    sub: last ? fmt(last[bestEnvKey]) : "—",
                    color: bestEnvConfig.color, icon: Sparkles,
                  },
                  {
                    label: "Capital PEA final",
                    value: last ? fmt(last.PEA) : "—",
                    sub: `18,6% PS · IR exonéré · ${years} ans`,
                    color: "#10b981", icon: TrendingUp,
                  },
                  {
                    label: "Rente mensuelle",
                    value: last ? fmt(Math.round(last[bestEnvKey] * 0.04 / 12)) : "—",
                    sub: "Règle des 4% · " + bestEnvConfig.label,
                    color: "#6366f1", icon: BarChart3,
                  },
                  {
                    label: "Indépendance (FIRE)",
                    value: fireYear != null ? `An ${fireYear}` : "Hors portée",
                    sub: `Cible : ${fmt(fireTarget)} (25× dép.)`,
                    color: fireYear != null ? "#10b981" : "#71717a",
                    icon: fireYear != null ? ShieldCheck : AlertTriangle,
                  },
                ].map((k, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="rounded-2xl border p-4 overflow-hidden relative"
                    style={{ borderColor: k.color + "30", backgroundColor: k.color + "07" }}>
                    <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full opacity-10" style={{ backgroundColor: k.color }} />
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: k.color }}>{k.label}</p>
                    <p className="text-xl font-black text-white leading-tight">{k.value}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{k.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* TABS */}
              <div className="flex gap-1 p-1 rounded-xl border border-zinc-800/50 bg-zinc-900/50">
                {([
                  { id: "comparaison", label: "Comparaison", icon: BarChart3 },
                  { id: "frais",       label: "Guerre des frais", icon: AlertTriangle },
                  { id: "fiscalite",   label: "Fiscalité 2026", icon: Scale },
                  { id: "succession",  label: "Succession", icon: Landmark },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white" : "text-zinc-600 hover:text-zinc-300"}`}>
                    <tab.icon size={11} className="shrink-0" /><span className="truncate">{tab.label}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* ─── TAB COMPARAISON ─── */}
                {activeTab === "comparaison" && (
                  <motion.div key="comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                    {/* Graphique */}
                    <div className="rounded-2xl bg-[#080808] border border-zinc-800/50 p-5 md:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-black text-white flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" />
                            Capital net après impôts & frais — {years} ans
                          </h3>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            Capital investi : <span className="text-zinc-400 font-bold">{fmt(totalInvesti)}</span>
                            {" · "}{profile.label} {profile.growth}%/an
                            {isDividend ? ` · Dividendes ${divYield}%` : " · Croissance"}
                          </p>
                        </div>
                        {fireYear != null && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shrink-0"
                            style={{ backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.2)" }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-400 uppercase">FIRE An {fireYear}</span>
                          </div>
                        )}
                      </div>

                      <div className="h-[360px] md:h-[440px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartPoints} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                            <defs>
                              {ENVS.map(e => (
                                <linearGradient key={e.key} id={`g_${e.key}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={e.color} stopOpacity={0.2} />
                                  <stop offset="100%" stopColor={e.color} stopOpacity={0} />
                                </linearGradient>
                              ))}
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke="#ffffff06" vertical={false} />
                            <XAxis dataKey="label" stroke="#3f3f46" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis stroke="#3f3f46" fontSize={9} tickLine={false} axisLine={false} width={64}
                              tickFormatter={v => fmtK(v)} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "11px", padding: "12px 14px" }}
                              itemStyle={{ color: "#e4e4e7", fontWeight: 600 }}
                              formatter={(v: any, name: string | undefined) => {
                                const env = ENVS.find(e => e.key === name);
                                return [fmt(Number(v)), env?.label || name || ""];
                              }}
                              labelStyle={{ color: "#71717a", fontSize: "10px", marginBottom: "6px" }}
                            />
                            <Area type="monotone" dataKey="Investi" stroke="rgba(255,255,255,0.12)" strokeWidth={1}
                              strokeDasharray="4 4" fill="transparent" name="Investi" />
                            {fireTarget > 0 && (
                              <ReferenceLine y={fireTarget} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1}
                                label={{ position: "insideTopLeft", value: "FIRE", fill: "#3b82f6", fontSize: 9 }} />
                            )}
                            {ENVS.map(e => (
                              <Area key={e.key} type="monotone" dataKey={e.key}
                                stroke={e.color} strokeWidth={e.key === bestEnvKey ? 2.5 : 1.5}
                                fill={`url(#g_${e.key})`} name={e.key}
                                dot={false} activeDot={{ r: 4, fill: e.color, strokeWidth: 0 }}
                                animationDuration={800} />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Légende */}
                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800/30">
                        {ENVS.map(e => (
                          <div key={e.key} className="flex items-center gap-1.5">
                            <div className="w-4 h-[2px] rounded" style={{ backgroundColor: e.color, opacity: e.key === bestEnvKey ? 1 : 0.55 }} />
                            <span className="text-[10px]" style={{ color: e.key === bestEnvKey ? e.color : "#52525b" }}>
                              {e.label}{e.key === bestEnvKey ? " ★" : ""}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-px border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
                          <span className="text-[10px] text-zinc-700">Capital investi</span>
                        </div>
                      </div>
                    </div>

                    {/* Tableau */}
                    <div className="rounded-2xl bg-[#080808] border border-zinc-800/50 overflow-hidden">
                      <div className="px-5 py-3 border-b border-zinc-800/30">
                        <h3 className="text-xs font-black text-white uppercase tracking-wide">
                          Résultats à {years} ans — Net après fiscalité · {isDividend ? `Dividendes ${divYield}%` : "Capitalisation"}
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px]">
                          <thead>
                            <tr className="border-b border-zinc-800/30">
                              {["Enveloppe", "Capital net", "Gain net", "Perf.", "Rente /mois", "vs PEA"].map((h, i) => (
                                <th key={h} className={`px-4 py-2.5 text-[9px] uppercase tracking-widest text-zinc-600 font-bold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ENVS.map(env => ({ env, val: last?.[env.key] || 0 }))
                              .sort((a, b) => b.val - a.val)
                              .map(({ env, val }, i) => {
                                const gain = val - totalInvesti;
                                const perf = totalInvesti > 0 ? (gain / totalInvesti) * 100 : 0;
                                const rente = Math.round(val * 0.04 / 12);
                                const vsPea = val - (last?.PEA || 0);
                                const best = i === 0;
                                return (
                                  <tr key={env.key} className={`border-b border-zinc-800/20 transition-colors hover:bg-white/[0.02] ${best ? "bg-white/[0.015]" : ""}`}>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: env.color }} />
                                        <span className="text-sm font-bold text-white">{env.label}</span>
                                        {best && <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: env.color + "20", color: env.color }}>Optimal</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-black text-white tabular-nums">{fmt(val)}</td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>{gain >= 0 ? "+" : ""}{fmt(gain)}</td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${perf >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtPct(perf)}</td>
                                    <td className="px-4 py-3 text-right text-sm text-zinc-400 tabular-nums">{fmt(rente)}</td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${env.key === "PEA" ? "text-zinc-700" : vsPea >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {env.key === "PEA" ? "—" : `${vsPea >= 0 ? "+" : ""}${fmt(vsPea)}`}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── TAB FRAIS ─── */}
                {activeTab === "frais" && (
                  <motion.div key="frais" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="rounded-2xl border border-amber-500/20 p-5" style={{ backgroundColor: "rgba(120,53,15,0.08)" }}>
                      <h3 className="text-sm font-black text-white mb-1 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-400" />
                        La Guerre Silencieuse des Frais — Démonstration Mathématique
                      </h3>
                      <p className="text-xs text-zinc-500 mb-5">
                        Même capital, même DCA, même rendement, même horizon. Seul l'intermédiaire change. Le résultat est implacable.
                      </p>
                      {fraisComparaison && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {(["online", "banque"] as const).map(bt => {
                              const b = BROKERS[bt];
                              const data = fraisComparaison[bt];
                              const col = bt === "online" ? "#10b981" : "#f59e0b";
                              const manqueGain = bt === "banque" ? (fraisComparaison.online.PEA - data.PEA) : 0;
                              return (
                                <div key={bt} className="rounded-xl border p-5" style={{ borderColor: col + "30", backgroundColor: col + "08" }}>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-black text-white">{b.label}</h4>
                                    {bt === "banque" && <span className="text-[9px] px-2 py-1 rounded-lg font-bold text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>⚠ Destructeur de valeur</span>}
                                  </div>
                                  <div className="space-y-2.5">
                                    {[
                                      { label: "Frais d'entrée", value: bt === "online" ? "0 %" : "2 % sur chaque versement" },
                                      { label: "Frais de gestion/an", value: bt === "online" ? "0,6 %/an" : "1,5 %/an" },
                                      { label: "Arbitrage", value: bt === "online" ? "0 €" : "~1 % par opération" },
                                      { label: "Rendement net annuel", value: bt === "online" ? `${(profile.growth - 0.6).toFixed(1)} %` : `${(profile.growth - 1.5 - 0.2).toFixed(1)} %`, bold: true },
                                      { label: "Capital PEA final", value: fmt(data.PEA), bold: true, highlight: true },
                                      ...(bt === "banque" ? [{ label: "Manque à gagner", value: `− ${fmt(manqueGain)}`, danger: true }] : []),
                                    ].map((row: any, j) => (
                                      <div key={j} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                                        <span className="text-xs text-zinc-500">{row.label}</span>
                                        <span className={`text-sm tabular-nums ${row.danger ? "text-red-400 font-black" : row.highlight ? "text-white font-black" : row.bold ? "text-zinc-200 font-bold" : "text-zinc-400"}`}>
                                          {row.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="rounded-xl border border-red-500/20 p-4" style={{ backgroundColor: "rgba(127,29,29,0.1)" }}>
                            <p className="text-sm font-black text-red-400 mb-1">
                              Manque à gagner total (PEA) : {fmt(Math.abs(fraisComparaison.online.PEA - fraisComparaison.banque.PEA))}
                            </p>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                              <strong className="text-zinc-300">La logique des marchés :</strong> la performance est incertaine, les frais sont garantis.
                              Une différence de {fmtPct(BROKERS.banque.fraisAnnuels * 100 - BROKERS.online.fraisAnnuels * 100)} de frais annuels peut sembler anodine,
                              mais l'épargne obéit aux lois exponentielles. Payer cher un intermédiaire, c'est céder une part croissante de votre patrimoine chaque année.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ─── TAB FISCALITÉ ─── */}
                {activeTab === "fiscalite" && (
                  <motion.div key="fisc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                    {/* PFU 2026 explication */}
                    <div className="rounded-2xl border border-blue-500/20 p-5" style={{ backgroundColor: "rgba(23,37,84,0.2)" }}>
                      <h3 className="text-sm font-black text-blue-400 mb-3">PFU 2026 : 31,4 % = 12,8 % IR + 18,6 % PS</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                        La grande révolution de 2026 réside dans la hausse de la CSG (9,2 % → 10,6 %) via le PLFSS.
                        Les prélèvements sociaux passent de 17,2 % à <strong className="text-white">18,6 %</strong> pour tous les produits,
                        <strong className="text-yellow-400"> sauf l'Assurance Vie</strong> qui conserve ses PS à 17,2 % (PFU dérogatoire 30 %).
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "PFU Standard", value: "31,4 %", sub: "12,8% IR + 18,6% PS", color: "#ef4444" },
                          { label: "PFU Assurance Vie", value: "30,0 %", sub: "12,8% IR + 17,2% PS (préservé)", color: "#ec4899" },
                          { label: "PEA après 5 ans", value: "18,6 %", sub: "PS seuls — IR exonéré", color: "#10b981" },
                          { label: "Livret A", value: "0 %", sub: "100% exonéré garanti", color: "#3b82f6" },
                        ].map(item => (
                          <div key={item.label} className="rounded-xl p-3 border" style={{ borderColor: item.color + "30", backgroundColor: item.color + "08" }}>
                            <p className="text-[9px] text-zinc-500 mb-1">{item.label}</p>
                            <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
                            <p className="text-[9px] text-zinc-600 mt-0.5">{item.sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Calculs chiffrés */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          id: "CTO", color: "#f59e0b",
                          title: "CTO — Calcul chiffré (gains 5 000€)",
                          rows: [
                            { label: "Base taxable", value: "5 000 €" },
                            { label: "IR (12,8 %)", value: "640 €", neg: true },
                            { label: "PS (18,6 %)", value: "930 €", neg: true },
                            { label: "Total prélevé (31,4 %)", value: "1 570 €", neg: true, bold: true },
                            { label: "Capital net récupéré", value: "13 430 €", pos: true, bold: true },
                          ],
                          note: "Même fiscalité le premier jour et 20 ans plus tard. Aucun avantage temporel.",
                        },
                        {
                          id: "PEA", color: "#10b981",
                          title: "PEA — Calcul chiffré (gains 5 000€, après 5 ans)",
                          rows: [
                            { label: "Base taxable", value: "5 000 €" },
                            { label: "IR (0 % — exonéré)", value: "0 €", pos: true },
                            { label: "PS (18,6 %)", value: "930 €", neg: true },
                            { label: "Total prélevé (18,6 %)", value: "930 €", neg: true, bold: true },
                            { label: "Capital net récupéré", value: "14 070 €", pos: true, bold: true },
                          ],
                          note: "Économie de 640 € d'IR par rapport au CTO sur seulement 5 000€ de gains.",
                        },
                        {
                          id: "AV", color: "#ec4899",
                          title: "Assurance Vie — Calcul chiffré (gains 5 000€, après 8 ans)",
                          rows: [
                            { label: "Gains taxables", value: "5 000 €" },
                            { label: "Abattement annuel", value: "− 4 600 €", pos: true },
                            { label: "Base IR (7,5 % sur 400 €)", value: "30 €", neg: true },
                            { label: "PS (17,2 % sur 5 000 €)", value: "860 €", neg: true },
                            { label: "Total prélevé", value: "890 €", neg: true, bold: true },
                            { label: "Capital net récupéré", value: "14 110 €", pos: true, bold: true },
                          ],
                          note: "PS AV préservés à 17,2 % (PFU dérogatoire 30 % maintenu en 2026).",
                        },
                        {
                          id: "PER", color: "#6366f1",
                          title: `PER — Calcul chiffré (TMI ${tmi}%, gains 5 000€)`,
                          rows: [
                            { label: "Versement initial", value: "10 000 €" },
                            { label: `Économie fiscale (TMI ${tmi}%)`, value: `${fmt(10000 * tmi / 100)}`, pos: true },
                            { label: "Effort réel d'épargne", value: `${fmt(10000 * (1 - tmi / 100))}`, bold: true },
                            { label: `Taxation capital (TMI ${tmi}%)`, value: `${fmt(10000 * tmi / 100)}`, neg: true },
                            { label: "Taxation PV (PFU 31,4 %)", value: fmt(5000 * 0.314), neg: true },
                            { label: "Capital net récupéré", value: `${fmt(10000 + 5000 - 10000 * tmi / 100 - 5000 * 0.314)}`, pos: true, bold: true },
                          ],
                          note: `À TMI ${tmi}%${tmi >= 30 ? " : le PER est très avantageux. L'économie à l'entrée compense largement la taxation à la sortie." : " : l'avantage PER est limité. Préférez le PEA."}`,
                        },
                      ].map(block => (
                        <div key={block.id} className="rounded-2xl bg-zinc-900/60 border border-zinc-800/40 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: block.color }} />
                            <h4 className="text-xs font-black text-white">{block.title}</h4>
                          </div>
                          <div className="space-y-1.5 mb-3">
                            {block.rows.map((row, i) => (
                              <div key={i} className="flex justify-between items-center py-1 border-b border-zinc-800/20 last:border-0">
                                <span className="text-[10px] text-zinc-500">{row.label}</span>
                                <span className={`text-sm tabular-nums ${(row as any).bold ? "font-black" : "font-semibold"} ${(row as any).pos ? "text-emerald-400" : (row as any).neg ? "text-red-400" : "text-zinc-300"}`}>
                                  {row.value}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-zinc-600 leading-relaxed px-2 py-1.5 rounded-lg" style={{ backgroundColor: block.color + "08" }}>
                            {block.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── TAB SUCCESSION ─── */}
                {activeTab === "succession" && (
                  <motion.div key="succ" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                    <div className="rounded-2xl bg-[#080808] border border-zinc-800/50 overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-zinc-800/30">
                        <h3 className="text-xs font-black text-white uppercase tracking-wide">Transmission à {years} ans — Estimation par enveloppe</h3>
                        <p className="text-[10px] text-zinc-600 mt-0.5">Droits de succession progressifs jusqu'à 45% pour les enfants (au-delà de l'abattement de 100 000€)</p>
                      </div>
                      <table className="w-full min-w-[520px]">
                        <thead>
                          <tr className="border-b border-zinc-800/30">
                            {["Enveloppe", "Capital brut", "Abattement", "Net transmis", "Règle applicable"].map((h, i) => (
                              <th key={h} className={`px-4 py-2.5 text-[9px] uppercase tracking-widest text-zinc-600 font-bold ${i < 4 && i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "PEA", abat: 100000, regle: "Succession classique. PS 18,6% sur gains, IR effacé au décès. Droits succession jusqu'à 45% au-delà de l'abatt. 100k€/enfant." },
                            { key: "CTO", abat: 100000, regle: "Purge des PV au décès (IR effacé, PS 18,6% dus). Actif successoral. Droits classiques." },
                            { key: "AV",  abat: 152500, regle: "Art. 990 I CGI : 152 500€/bénéf. hors succession (primes < 70 ans). Au-delà : 20% puis 31,25%. Champion successoral absolu." },
                            { key: "PER", abat: 152500, regle: "Si décès avant 70 ans : même régime AV (152 500€/bénéf.). Après 70 ans : succession classique, abatt. global 30 500€." },
                            { key: "LA",  abat: 100000, regle: "Succession classique. Abattement 100k€/enfant." },
                          ].map((row, i) => {
                            const env = ENVS.find(e => e.key === row.key)!;
                            const cap = last?.[row.key as keyof YearPoint] as number || 0;
                            const net = Math.max(0, cap - row.abat);
                            return (
                              <tr key={row.key} className={`border-b border-zinc-800/20 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: env.color }} />
                                    <span className="text-sm font-bold text-white">{env.label}</span>
                                    {row.key === "AV" && <span className="text-[8px] font-black text-pink-400">★ OPTIMAL</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-zinc-300 tabular-nums">{fmt(cap)}</td>
                                <td className="px-4 py-3 text-right text-sm text-emerald-400 font-bold tabular-nums">{fmt(row.abat)}</td>
                                <td className="px-4 py-3 text-right text-sm font-black text-white tabular-nums">{fmt(net)}</td>
                                <td className="px-4 py-3 text-[10px] text-zinc-500 max-w-[240px] leading-relaxed">{row.regle}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-pink-500/20 p-5" style={{ backgroundColor: "rgba(131,24,67,0.08)" }}>
                        <h4 className="text-sm font-bold text-pink-400 mb-3 flex items-center gap-2">
                          <ShieldCheck size={13} /> Assurance Vie — Art. 990 I CGI
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                          Champion absolu de la transmission. Les capitaux transmis aux bénéficiaires désignés sont <strong className="text-white">hors succession civile</strong>.
                        </p>
                        <div className="space-y-2">
                          {[
                            { label: "Primes avant 70 ans", value: "152 500€/bénéf. exonérés" },
                            { label: "De 152 500€ à 1 005 000€", value: "20% prélèvement forfaitaire" },
                            { label: "Au-delà de 1 005 000€", value: "31,25%" },
                            { label: "Primes après 70 ans", value: "Abo. global 30 500€, puis droits succession (mais PV exonérées !)" },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-3">
                              <span className="text-[10px] text-zinc-600">{item.label}</span>
                              <span className="text-[10px] font-bold text-pink-400 text-right">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-purple-500/20 p-5" style={{ backgroundColor: "rgba(88,28,135,0.08)" }}>
                        <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                          <Landmark size={13} /> Démembrement de Clause Bénéficiaire
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                          Stratégie optimale pour protéger le conjoint ET les enfants : <strong className="text-white">"Conjoint pour l'usufruit, enfants pour la nue-propriété."</strong>
                        </p>
                        <div className="space-y-2">
                          {[
                            { label: "1er décès", value: "Conjoint reçoit tout (quasi-usufruit). 0€ d'impôt (exonéré total)." },
                            { label: "Les enfants", value: "Détiennent une créance de restitution sur la succession." },
                            { label: "2ème décès", value: "Enfants récupèrent leur créance en franchise totale d'impôt." },
                            { label: "Résultat", value: "Sécurité conjoint + transmission optimisée en 2 étapes." },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-3">
                              <span className="text-[10px] text-zinc-600 shrink-0">{item.label}</span>
                              <span className="text-[10px] font-bold text-purple-400 text-right">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}