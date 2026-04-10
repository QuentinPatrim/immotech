"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, GraduationCap, Leaf, X, Check, ChevronRight, Settings } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { T } from "../theme";
import type { InvestorProfile, RiskLevel, Horizon, ExpertiseLevel } from "../types";

const RISK_OPTIONS: { value: RiskLevel; label: string; emoji: string; desc: string; color: string }[] = [
  { value: "conservateur", label: "Conservateur", emoji: "🛡️", desc: "Je privilégie la sécurité. Une perte de 5% me stresse.", color: T.blue },
  { value: "equilibre", label: "Équilibré", emoji: "⚖️", desc: "J'accepte des baisses temporaires pour de meilleurs rendements.", color: T.amber },
  { value: "dynamique", label: "Dynamique", emoji: "🚀", desc: "Les corrections sont des opportunités. -15% ne me fait pas peur.", color: "#f97316" },
  { value: "agressif", label: "Agressif", emoji: "⚡", desc: "Performance maximale. Je supporte les fortes volatilités.", color: T.red },
];
const HORIZON_OPTIONS: { value: Horizon; label: string; desc: string; years: string }[] = [
  { value: "court", label: "Court terme", desc: "Trading actif, swing", years: "< 1 an" },
  { value: "moyen", label: "Moyen terme", desc: "Achat immobilier, projet", years: "1-5 ans" },
  { value: "long", label: "Long terme", desc: "Retraite, patrimoine", years: "5+ ans" },
];
const LEVEL_OPTIONS: { value: ExpertiseLevel; label: string; desc: string }[] = [
  { value: "debutant", label: "Débutant", desc: "Je découvre la bourse" },
  { value: "initie", label: "Initié", desc: "Je connais les bases" },
  { value: "expert", label: "Expert", desc: "Je maîtrise l'analyse technique" },
];
const SECTORS = [
  { id: "armement", label: "Armement & Défense", emoji: "🔫" },
  { id: "tabac", label: "Tabac", emoji: "🚬" },
  { id: "petrole", label: "Pétrole & Gaz", emoji: "🛢️" },
  { id: "jeux", label: "Jeux d'argent", emoji: "🎰" },
  { id: "alcool", label: "Alcool", emoji: "🍷" },
  { id: "nucleaire", label: "Nucléaire", emoji: "☢️" },
  { id: "pharma", label: "Pharma controversée", emoji: "💊" },
  { id: "fast_fashion", label: "Fast fashion", emoji: "👕" },
];

const LS_KEY = "nexus_investor_profile";

async function loadDB(): Promise<InvestorProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("investor_profile_json").eq("id", user.id).single();
    return data?.investor_profile_json || null;
  } catch { return null; }
}
function loadLS(): InvestorProfile | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
async function saveDB(p: InvestorProfile) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ investor_profile_json: p }).eq("id", user.id);
  } catch { /* silent */ }
}
function saveLS(p: InvestorProfile) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* silent */ }
}

interface Props { onProfileLoaded: (p: InvestorProfile | null) => void; }

export default function InvestorProfileManager({ onProfileLoaded }: Props) {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const cbRef = useRef(onProfileLoaded);
  cbRef.current = onProfileLoaded;

  const [risk, setRisk] = useState<RiskLevel>("equilibre");
  const [horizon, setHorizon] = useState<Horizon>("moyen");
  const [level, setLevel] = useState<ExpertiseLevel>("debutant");
  const [excluded, setExcluded] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const p = (await loadDB()) || loadLS();
      setProfile(p);
      cbRef.current(p);
      if (!p) setOpen(true);
      setReady(true);
    })();
  }, []);

  const close = useCallback(() => { setOpen(false); setSuccess(false); setStep(0); }, []);

  const save = async () => {
    setSaving(true);
    const p: InvestorProfile = { risk, horizon, level, excludedSectors: excluded, createdAt: profile?.createdAt || new Date().toISOString() };
    saveLS(p);
    await saveDB(p);
    setProfile(p);
    cbRef.current(p);
    setSuccess(true);
    setSaving(false);
    setTimeout(close, 1000);
  };

  const edit = () => {
    if (profile) { setRisk(profile.risk); setHorizon(profile.horizon); setLevel(profile.level); setExcluded(profile.excludedSectors); }
    setStep(0); setSuccess(false); setOpen(true);
  };

  const tog = (id: string) => setExcluded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (!ready) return null;

  const Badge = () => {
    if (!profile) return (
      <button onClick={() => { setStep(0); setOpen(true); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all hover:brightness-110" style={{ background: T.violetBg, border: `1px solid rgba(168,85,247,0.15)`, color: T.violet }}>
        <Shield size={12} /> Mon profil
      </button>
    );
    const ro = RISK_OPTIONS.find(r => r.value === profile.risk);
    return (
      <button onClick={edit} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] transition-all group hover:brightness-110" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}` }}>
        <span className="text-sm">{ro?.emoji}</span>
        <span style={{ color: T.textSub }}>{ro?.label}</span>
        <div className="w-px h-3" style={{ background: T.border }} />
        <span style={{ color: T.textDim }}>{HORIZON_OPTIONS.find(h => h.value === profile.horizon)?.years}</span>
        <Settings size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: T.textDim }} />
      </button>
    );
  };

  const Opt = ({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) => (
    <motion.button onClick={onClick} whileTap={{ scale: 0.98 }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all" style={{ background: active ? `${color || T.blue}12` : "rgba(255,255,255,0.01)", border: `1px solid ${active ? (color || T.blue) + "35" : T.border}` }}>
      {children}
      {active && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}><Check size={14} style={{ color: color || T.blue }} /></motion.div>}
    </motion.button>
  );

  const stepsContent = [
    <div key="0">
      <div className="flex items-center gap-2 mb-3"><Shield size={15} style={{ color: T.violet }} /><h3 className="text-sm font-black" style={{ color: T.text }}>Appétence au risque</h3></div>
      <p className="text-[11px] mb-4" style={{ color: T.textDim }}>Votre portefeuille perd 15% en un mois. Que faites-vous ?</p>
      <div className="space-y-2">{RISK_OPTIONS.map(o => <Opt key={o.value} active={risk === o.value} onClick={() => setRisk(o.value)} color={o.color}><span className="text-xl">{o.emoji}</span><div className="flex-1"><p className="text-xs font-bold" style={{ color: risk === o.value ? o.color : T.text }}>{o.label}</p><p className="text-[10px]" style={{ color: T.textDim }}>{o.desc}</p></div></Opt>)}</div>
    </div>,
    <div key="1">
      <div className="flex items-center gap-2 mb-3"><Clock size={15} style={{ color: T.blue }} /><h3 className="text-sm font-black" style={{ color: T.text }}>Horizon de placement</h3></div>
      <div className="space-y-2">{HORIZON_OPTIONS.map(o => <Opt key={o.value} active={horizon === o.value} onClick={() => setHorizon(o.value)} color={T.blue}><div className="flex-1"><p className="text-xs font-bold" style={{ color: horizon === o.value ? T.blueBright : T.text }}>{o.label}</p><p className="text-[10px]" style={{ color: T.textDim }}>{o.desc}</p></div><span className="text-[10px] font-mono px-2 py-0.5 rounded-lg" style={{ background: T.cardSolid, color: T.textSub }}>{o.years}</span></Opt>)}</div>
    </div>,
    <div key="2">
      <div className="flex items-center gap-2 mb-3"><GraduationCap size={15} style={{ color: T.cyan }} /><h3 className="text-sm font-black" style={{ color: T.text }}>Votre niveau</h3></div>
      <div className="space-y-2">{LEVEL_OPTIONS.map(o => <Opt key={o.value} active={level === o.value} onClick={() => setLevel(o.value)} color={T.cyan}><div className="flex-1"><p className="text-xs font-bold" style={{ color: level === o.value ? T.cyan : T.text }}>{o.label}</p><p className="text-[10px]" style={{ color: T.textDim }}>{o.desc}</p></div></Opt>)}</div>
    </div>,
    <div key="3">
      <div className="flex items-center gap-2 mb-3"><Leaf size={15} style={{ color: T.green }} /><h3 className="text-sm font-black" style={{ color: T.text }}>Vos valeurs (ESG)</h3></div>
      <p className="text-[11px] mb-3" style={{ color: T.textDim }}>Secteurs à exclure :</p>
      <div className="grid grid-cols-2 gap-2">{SECTORS.map(s => {
        const on = excluded.includes(s.id);
        return <motion.button key={s.id} onClick={() => tog(s.id)} whileTap={{ scale: 0.96 }} className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all" style={{ background: on ? T.redBg : "rgba(255,255,255,0.01)", border: `1px solid ${on ? "rgba(239,68,68,0.2)" : T.border}` }}><span className="text-sm">{s.emoji}</span><span className="text-[10px] font-medium flex-1" style={{ color: on ? T.red : T.textSub }}>{s.label}</span>{on && <X size={10} style={{ color: T.red }} />}</motion.button>;
      })}</div>
    </div>,
  ];

  return (
    <>
      <Badge />
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(4,4,12,0.88)", backdropFilter: "blur(8px)" }}
            onClick={() => { if (profile) close(); }}>
            <motion.div
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="w-full max-w-md rounded-3xl p-6 relative overflow-hidden"
              style={{ background: T.elevated, border: `1px solid ${T.borderMid}`, boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}
              onClick={e => e.stopPropagation()}>

              {profile && <button onClick={close} className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center z-40 hover:bg-white/5 transition-all"><X size={12} style={{ color: T.textDim }} /></button>}

              {/* Success overlay */}
              <AnimatePresence>
                {success && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", damping: 18, stiffness: 350 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl" style={{ background: T.elevated }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, stiffness: 250, delay: 0.05 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: T.greenBg, boxShadow: `0 0 50px ${T.greenGlow}` }}>
                      <Check size={28} style={{ color: T.green }} />
                    </motion.div>
                    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-sm font-black" style={{ color: T.green }}>Profil enregistré !</motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress */}
              <div className="flex gap-1.5 mb-5">{[0, 1, 2, 3].map(i => <motion.div key={i} className="flex-1 h-1 rounded-full" animate={{ background: i <= step ? T.violet : "rgba(255,255,255,0.04)" }} />)}</div>

              {/* Step */}
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ type: "spring", damping: 25, stiffness: 250 }}>
                  {stepsContent[step]}
                </motion.div>
              </AnimatePresence>

              {/* Nav */}
              <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
                {step > 0 ? <button onClick={() => setStep(step - 1)} className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-white/[0.02]" style={{ color: T.textSub }}>Retour</button>
                  : profile ? <button onClick={close} className="text-xs px-3 py-2 rounded-lg" style={{ color: T.textDim }}>Annuler</button> : <div />}
                {step < 3 ? (
                  <motion.button onClick={() => setStep(step + 1)} whileTap={{ scale: 0.97 }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-white hover:brightness-110 transition-all" style={{ background: T.gradPrimary }}>
                    Suivant <ChevronRight size={12} />
                  </motion.button>
                ) : (
                  <motion.button onClick={save} disabled={saving} whileTap={{ scale: 0.97 }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-white hover:brightness-110 transition-all" style={{ background: T.gradGreen, opacity: saving ? 0.6 : 1 }}>
                    {saving ? "..." : <><Check size={12} /> Enregistrer</>}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}