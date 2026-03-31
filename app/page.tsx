"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ChevronLeft, ChevronRight,
  LineChart, TrendingUp, FileText, Wallet, Brain,
} from "lucide-react";
import { NexusLogo } from "@/components/NexusLogo";
import { supabase } from "@/lib/supabaseClient";

// ─── MOCKUPS ──────────────────────────────────────────────────────────────────

function MockupDashboard() {
  return (
    <div className="w-full bg-[#0a0a0c] p-6 space-y-5 select-none">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-1.5 w-20 bg-zinc-800 rounded-full" />
          <div className="h-6 w-40 bg-zinc-700/80 rounded-lg" />
        </div>
        <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-white/5" />
      </div>
      <div>
        <div className="h-12 w-48 bg-gradient-to-r from-zinc-600 to-zinc-700 rounded-xl mb-3" />
        <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden mb-2">
          <div className="h-full w-[47%] bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" />
        </div>
        <div className="flex gap-5">
          {[["#10b981","BOURSE","37%"],["#eab308","CASH","57%"]].map(([c,l,p])=>(
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:c}}/>
              <span className="text-[9px] font-mono text-zinc-600">{l}</span>
              <span className="text-[9px] font-black" style={{color:c}}>{p}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[["#10b981","Financier","23 623 €"],["#3b82f6","Immobilier","0 €"],["#eab308","Épargne/mois","+1 510 €"]].map(([c,l,v])=>(
          <div key={l} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3">
            <div className="h-1 w-7 rounded-full mb-2" style={{backgroundColor:`${c}40`}}/>
            <p className="text-sm font-black text-white">{v}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{color:`${c}60`}}>{l}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="row-span-2 rounded-2xl border border-purple-500/15 p-4 flex flex-col gap-3" style={{backgroundColor:"#a855f708"}}>
          <div className="h-10 w-10 rounded-2xl bg-purple-500/15 flex items-center justify-center">
            <LineChart size={16} className="text-purple-400"/>
          </div>
          <div>
            <p className="text-sm font-black text-white">Projection</p>
            <p className="text-[9px] text-purple-400/50 mt-0.5">Futur & intérêts</p>
          </div>
          <p className="text-[8px] font-bold text-purple-500/30 uppercase tracking-widest mt-auto">Simuler →</p>
        </div>
        {[["#3b82f6","Simulateur Immo"],["#eab308","Budget"]].map(([c,l])=>(
          <div key={l} className="rounded-2xl bg-zinc-900/60 border border-white/5 p-3 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl shrink-0" style={{backgroundColor:`${c}12`}}/>
            <p className="text-xs font-black text-white">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupProjection() {
  return (
    <div className="w-full bg-[#0a0a0c] p-6 space-y-5 select-none">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-1.5 w-16 bg-zinc-800 rounded-full"/>
          <div className="h-6 w-32 bg-zinc-700/80 rounded-lg"/>
        </div>
        <div className="flex gap-1.5">
          {["#a855f7","#3b82f6","#10b981","#eab308","#6366f1"].map((c,i)=>(
            <div key={i} className="h-2.5 w-2.5 rounded-full border border-white/10" style={{backgroundColor:`${c}50`}}/>
          ))}
        </div>
      </div>
      <div className="relative h-36 w-full rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
        <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0,108 C60,98 120,78 180,55 C240,32 300,14 400,4" stroke="#a855f7" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M0,108 C60,98 120,78 180,55 C240,32 300,14 400,4 L400,120 L0,120Z" fill="url(#pg)"/>
          <path d="M0,112 C60,107 120,98 180,85 C240,72 300,55 400,40" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeDasharray="5,4" opacity="0.4"/>
        </svg>
        <div className="absolute top-3 right-3 bg-purple-500/15 border border-purple-500/20 rounded-xl px-3 py-1.5">
          <p className="text-[9px] font-black text-purple-300">+340% sur 20 ans</p>
        </div>
        <div className="absolute bottom-3 left-3">
          <p className="text-[8px] text-zinc-700 font-mono">Aujourd'hui → 2045</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {[["PEA","#10b981",72],["Assurance Vie","#3b82f6",58],["PER","#a855f7",41],["CTO","#eab308",28],["Livret A","#6366f1",15]].map(([l,c,w])=>(
          <div key={l as string} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-zinc-600 w-24 shrink-0">{l}</span>
            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{width:`${w}%`,backgroundColor:c as string,opacity:0.7}}/>
            </div>
            <span className="text-[9px] text-zinc-700 font-mono w-6">{w}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupBudget() {
  return (
    <div className="w-full bg-[#0a0a0c] p-6 space-y-5 select-none">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-1.5 w-14 bg-zinc-800 rounded-full"/>
          <div className="h-6 w-28 bg-zinc-700/80 rounded-lg"/>
        </div>
        <div className="h-8 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <span className="text-[9px] font-black text-emerald-400">63% ÉP.</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[["BESOIN","#3b82f6","52%"],["ENVIE","#eab308","18%"],["ÉPARGNE","#10b981","30%"]].map(([l,c,p])=>(
          <div key={l} className="rounded-2xl border border-white/5 p-3 text-center" style={{backgroundColor:`${c}06`}}>
            <div className="text-2xl font-black" style={{color:c}}>{p}</div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-zinc-600 mt-1">{l}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[["Logement","#3b82f6",85],["Transport","#3b82f6",40],["Alimentation","#eab308",55],["Investissement","#10b981",70]].map(([l,c,w])=>(
          <div key={l} className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600 w-24 shrink-0">{l}</span>
            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{width:`${w}%`,backgroundColor:c as string,opacity:0.65}}/>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-zinc-900/50 border border-white/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Épargne disponible</p>
          <p className="text-lg font-black text-white">+1 510 €</p>
        </div>
        <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-emerald-500"/>
        </div>
      </div>
    </div>
  );
}

function MockupRapportFiscal() {
  return (
    <div className="w-full bg-[#0a0a0c] p-6 space-y-5 select-none">
      <div className="rounded-2xl border border-blue-500/15 p-4 relative overflow-hidden" style={{backgroundColor:"#3b82f606"}}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15" style={{backgroundColor:"#3b82f6"}}/>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[8px] font-bold text-blue-400/60 uppercase tracking-widest mb-1">Rapport fiscal · 2026</p>
            <p className="text-base font-black text-white">Investissement Locatif</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">T2 · Lyon 6ème · 189 000 €</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-blue-400"/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[["Loyer brut","820 €/mois","#10b981"],["Charges","-210 €/mois","#ef4444"],["Cashflow net","610 €/mois","#10b981"],["Rentabilité nette","3,9%","#3b82f6"]].map(([l,v,c])=>(
            <div key={l} className="bg-black/30 rounded-xl p-2.5 border border-white/5">
              <p className="text-[7px] text-zinc-600 uppercase tracking-widest font-bold mb-1">{l}</p>
              <p className="text-xs font-black" style={{color:c}}>{v}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Comparatif fiscal</p>
        {[["LMNP Réel","1 240 €","#10b981",30],["Location nue","3 890 €","#ef4444",82],["SCI IS","2 100 €","#eab308",52]].map(([l,v,c,w])=>(
          <div key={l} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-zinc-500 w-20 shrink-0">{l}</span>
            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{width:`${w}%`,backgroundColor:c as string,opacity:0.7}}/>
            </div>
            <span className="text-[9px] font-black w-16 text-right" style={{color:c as string}}>{v}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/15">
          <FileText size={10} className="text-blue-400"/>
          <span className="text-[9px] font-black text-blue-400">Exporter en PDF</span>
        </div>
      </div>
    </div>
  );
}

function MockupDossierBancaire() {
  return (
    <div className="w-full bg-[#0a0a0c] p-6 space-y-5 select-none">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">Dossier bancaire</p>
          <p className="text-base font-black text-white">Synthèse Patrimoniale</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Wallet size={16} className="text-emerald-400"/>
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-500/15 p-4" style={{backgroundColor:"#10b98106"}}>
        <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold mb-3">Score de solvabilité</p>
        <div className="flex items-end gap-3 mb-3">
          <span className="text-5xl font-black text-emerald-400">847</span>
          <span className="text-xs text-zinc-500 mb-1">/ 1000 · Excellent</span>
        </div>
        <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full w-[84%] bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[["Patrimoine net","23 623 €","#10b981"],["Revenus / mois","2 400 €","#3b82f6"],["Taux d'endettement","18%","#eab308"],["Capacité emprunt","187 000 €","#a855f7"]].map(([l,v,c])=>(
          <div key={l} className="bg-zinc-900/50 border border-white/5 rounded-xl p-3">
            <p className="text-[7px] text-zinc-600 uppercase tracking-widest font-bold mb-1">{l}</p>
            <p className="text-sm font-black" style={{color:c}}>{v}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/15">
          <FileText size={10} className="text-emerald-400"/>
          <span className="text-[9px] font-black text-emerald-400">Générer le dossier PDF</span>
        </div>
      </div>
    </div>
  );
}

function MockupPlanEpargne() {
  return (
    <div className="w-full bg-[#0a0a0c] p-6 space-y-5 select-none">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] font-bold text-purple-400/60 uppercase tracking-widest mb-1">Plan d'épargne</p>
          <p className="text-base font-black text-white">Projection Patrimoniale</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <TrendingUp size={16} className="text-purple-400"/>
        </div>
      </div>
      <div className="rounded-2xl border border-purple-500/15 p-4 relative overflow-hidden" style={{backgroundColor:"#a855f706"}}>
        <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold mb-3">Objectif indépendance</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-4xl font-black text-white">2041</span>
          <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full">dans 15 ans</span>
        </div>
        <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden mb-1">
          <div className="h-full w-[38%] bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"/>
        </div>
        <div className="flex justify-between">
          <span className="text-[8px] text-zinc-700 font-mono">23k€ aujourd'hui</span>
          <span className="text-[8px] text-zinc-700 font-mono">Objectif 500k€</span>
        </div>
      </div>
      <div className="space-y-3">
        {[["50 000 €","2027","#10b981",true],["100 000 €","2030","#3b82f6",false],["250 000 €","2035","#a855f7",false],["500 000 €","2041","#eab308",false]].map(([val,date,c,done])=>(
          <div key={String(val)} className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full shrink-0 border" style={{backgroundColor:done?c as string:"transparent",borderColor:`${c}60`}}/>
            <span className="text-sm font-black text-white w-20 shrink-0">{val}</span>
            <span className="text-[10px] text-zinc-600">→ {date}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-500/8 border border-purple-500/15">
          <FileText size={10} className="text-purple-400"/>
          <span className="text-[9px] font-black text-purple-400">Télécharger le plan</span>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDES CONFIG ────────────────────────────────────────────────────────────

const SLIDES = [
  { id:"dashboard", label:"Tableau de bord", color:"#10b981", icon:Brain,
    title:"Vue 360° de votre patrimoine.", text:"Financier, immobilier, épargne — tout consolidé, toujours à jour.", component:MockupDashboard },
  { id:"projection", label:"Projection", color:"#a855f7", icon:TrendingUp,
    title:"Votre futur modélisé sur 40 ans.", text:"5 enveloppes fiscales simulées. Découvrez quand vous atteignez l'indépendance financière.", component:MockupProjection },
  { id:"budget", label:"Budget", color:"#eab308", icon:LineChart,
    title:"Budget base zéro.", text:"Besoin, envie, épargne. Chaque euro a un rôle précis.", component:MockupBudget },
  { id:"fiscal", label:"Rapport fiscal", color:"#3b82f6", icon:FileText,
    title:"Compte rendu fiscal immobilier.", text:"LMNP, SCI, location nue — simulez votre imposition et exportez le rapport PDF pour votre comptable.", component:MockupRapportFiscal },
  { id:"bancaire", label:"Dossier bancaire", color:"#10b981", icon:Wallet,
    title:"Dossier bancaire clé en main.", text:"Synthèse patrimoine + revenus + capacité d'emprunt. Prêt à présenter à votre banquier.", component:MockupDossierBancaire },
  { id:"epargne", label:"Plan d'épargne", color:"#a855f7", icon:TrendingUp,
    title:"Plan d'épargne avec projection patrimoniale.", text:"Jalons, objectifs, DCA mensuel. Visualisez exactement quand vous atteignez chaque palier.", component:MockupPlanEpargne },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking]   = useState(true);
  const [active, setActive]       = useState(0);
  const [direction, setDirection] = useState(1); // 1=forward, -1=backward

  // Redirect si connecté
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setChecking(false);
    });
  }, [router]);

  const goTo = useCallback((i: number) => {
    setDirection(i > active ? 1 : -1);
    setActive(i);
  }, [active]);

  const prev = () => active > 0 && goTo(active - 1);
  const next = () => active < SLIDES.length - 1 && goTo(active + 1);

  // Auto-avance toutes les 4s
  useEffect(() => {
    const t = setTimeout(() => {
      setDirection(1);
      setActive(a => (a + 1) % SLIDES.length);
    }, 4000);
    return () => clearTimeout(t);
  }, [active]);

  if (checking) return <div className="min-h-screen bg-[#020202]" />;

  const slide = SLIDES[active];

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit:  (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    // Conteneur racine : pleine largeur, pas de sidebar, pas de ml-64
    <div className="min-h-[100dvh] w-full bg-[#020202] text-white font-sans flex flex-col">

      {/* ── NAVBAR ─────────────────────────────────────────────────── */}
      <nav className="w-full flex items-center justify-between px-6 md:px-16 pt-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 shrink-0"><NexusLogo className="w-full h-full" /></div>
          <span className="text-sm font-black tracking-[0.15em] uppercase">Nexus</span>
        </div>
        <Link href="/login">
          <button className="h-8 px-5 rounded-full border border-white/10 text-xs font-bold tracking-wide hover:bg-white/5 transition-all">
            Connexion
          </button>
        </Link>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          SPLASH — contenu centré absolument
      ══════════════════════════════════════════════════════════════ */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-8 py-12 relative">

        {/* Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="w-[600px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-14 h-14 md:w-20 md:h-20 relative z-10"
        >
          <NexusLogo className="w-full h-full" />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut", delay: 0.15 }}
          className="space-y-3 relative z-10 max-w-3xl"
        >
          <h1 className="text-[clamp(3rem,9vw,6.5rem)] font-black tracking-tighter leading-[0.93] text-white">
            Votre patrimoine,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              enfin clair.
            </span>
          </h1>
          <p className="text-sm md:text-lg text-zinc-500 max-w-md mx-auto leading-relaxed font-medium">
            Nexus agrège vos comptes, projette votre avenir
            et génère vos documents financiers — en temps réel.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3 relative z-10"
        >
          <Link href="/login">
            <button className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-black tracking-wide transition-all hover:shadow-[0_0_28px_rgba(16,185,129,0.3)] active:scale-[0.98]">
              Créer mon compte <ArrowRight size={15} />
            </button>
          </Link>
          <Link href="/login" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-medium">
            Déjà un compte →
          </Link>
        </motion.div>

        {/* Trust pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-2 relative z-10"
        >
          {["Hébergement EU","Données privées","Auth sécurisée"].map(t => (
            <span key={t} className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.12em] border border-white/5 rounded-full px-3 py-1">
              {t}
            </span>
          ))}
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex flex-col items-center gap-1.5 text-zinc-800 relative z-10"
        >
          <span className="text-[8px] uppercase tracking-[0.4em] font-bold">Découvrir</span>
          <div className="h-8 w-px bg-gradient-to-b from-zinc-700 to-transparent" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION CAROUSEL — fondu + slide
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-[#020202] pb-20">

        {/* Header section — aligné avec le carousel */}
        <div className="w-full px-6 md:px-16 pt-16 pb-8 flex justify-center">
        <div className="w-full max-w-2xl flex items-end justify-between">
          <div>
            <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-[0.35em] mb-2">
              {active < 3 ? "Fonctionnalités" : "Documents premium"}
            </p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {active < 3 ? "Tout en un seul endroit." : "Vos documents, générés automatiquement."}
            </h2>
          </div>
          {/* Dots desktop */}
          <div className="hidden md:flex items-center gap-2 pb-1">
            {SLIDES.map((s, i) => (
              <button key={s.id} onClick={() => goTo(i)} className="focus:outline-none">
                <div className="rounded-full transition-all duration-300" style={{
                  width: active === i ? 20 : 6,
                  height: 6,
                  backgroundColor: active === i ? slide.color : "#27272a",
                }}/>
              </button>
            ))}
          </div>
        </div>{/* /max-w-2xl header */}
        </div>{/* /flex justify-center */}

        {/* Carousel centré — max-w pour éviter l'étirement */}
        <div className="w-full px-6 md:px-16 flex flex-col items-center">
          <div className="w-full max-w-2xl">
          <div className="relative w-full overflow-hidden rounded-[28px] border border-white/8"
               style={{ background: "#0a0a0c" }}>

            {/* Barre onglet */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-[#080808]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"/>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"/>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"/>
              </div>
              <div className="flex-1 flex justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/4 border border-white/5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: slide.color}}/>
                    <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">{slide.label}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="w-16 shrink-0"/>
            </div>

            {/* Mockup avec transition fondu+slide */}
            <div className="relative overflow-hidden">
              {/* Glow derrière */}
              <AnimatePresence>
                <motion.div
                  key={`glow-${slide.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
                  style={{ backgroundColor: `${slide.color}18` }}
                />
              </AnimatePresence>

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slide.id}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.38, ease: "easeInOut" }}
                  className="relative z-10 w-full"
                >
                  <slide.component />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Description + navigation */}
          <div className="flex items-start justify-between mt-5 gap-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`desc-${slide.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                <p className="text-base md:text-lg font-black text-white tracking-tight mb-1">{slide.title}</p>
                <p className="text-sm text-zinc-600 leading-relaxed max-w-lg">{slide.text}</p>
              </motion.div>
            </AnimatePresence>

            {/* Flèches nav */}
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <button
                onClick={prev}
                disabled={active === 0}
                className="h-9 w-9 rounded-full border border-white/8 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 disabled:opacity-20 transition-all active:scale-95"
              >
                <ChevronLeft size={15}/>
              </button>
              <button
                onClick={next}
                disabled={active === SLIDES.length - 1}
                className="h-9 w-9 rounded-full border border-white/8 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 disabled:opacity-20 transition-all active:scale-95"
              >
                <ChevronRight size={15}/>
              </button>
            </div>
          </div>

          {/* Dots mobile */}
          <div className="flex justify-center gap-1.5 mt-6 md:hidden">
            {SLIDES.map((s, i) => (
              <button key={s.id} onClick={() => goTo(i)} className="focus:outline-none">
                <div className="rounded-full transition-all duration-300" style={{
                  width: active === i ? 18 : 5,
                  height: 5,
                  backgroundColor: active === i ? slide.color : "#27272a",
                }}/>
              </button>
            ))}
          </div>
          </div>{/* /max-w-2xl */}
        </div>{/* /flex items-center */}

        {/* CTA final */}
        <div className="flex flex-col items-center gap-3 mt-16 px-6">
          <Link href="/login">
            <button className="px-8 py-3.5 rounded-full bg-white hover:bg-zinc-100 text-black text-sm font-black tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]">
              Commencer gratuitement
            </button>
          </Link>
          <p className="text-[10px] text-zinc-800 font-medium">Aucune carte bancaire requise.</p>
        </div>

      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/4 py-6 px-6 md:px-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 shrink-0"><NexusLogo className="w-full h-full" /></div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-700">Nexus</span>
          </div>
          <div className="flex gap-6 text-[10px] text-zinc-800 font-medium">
            {["Contact","Légal"].map(l => (
              <Link key={l} href="#" className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
          <p className="text-[10px] text-zinc-800">© 2026 Nexus Wealth.</p>
        </div>
      </footer>

    </div>
  );
}