"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, LineChart, Building2, Shield, Brain, CheckCircle2, Zap, Lock, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/NexusLogo";

export default function LandingPagePro() {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- LOGIQUE DE DÉFILEMENT APPLE (Scroll-jacking) ---
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Animations liées au défilement (Disparition du logo d'intro)
  // L'intro s'efface sur les premiers 15% de défilement de la page globale
  const introOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
  const introScale = useTransform(scrollYProgress, [0, 0.05], [1, 0.8]);
  const introBlur = useTransform(scrollYProgress, [0, 0.05], ["blur(0px)", "blur(20px)"]);

  // Apparition du Hero (Le texte "Votre patrimoine...")
  const heroOpacity = useTransform(scrollYProgress, [0.03, 0.08], [0, 1]);
  const heroY = useTransform(scrollYProgress, [0.03, 0.08], [50, 0]);

  return (
    <div ref={containerRef} className="bg-[#020202] text-white selection:bg-emerald-500/30 font-sans relative">
      
      {/* --- NAVBAR FLOTTANTE (Apparaît avec un délai) --- */}
      {isMounted && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[1200px] z-50"
        >
          <nav className="h-14 md:h-16 px-4 md:px-6 rounded-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-2xl flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 md:w-6 md:h-6 text-emerald-500">
                  <NexusLogo className="w-full h-full" />
              </div>
              <span className="text-base md:text-lg font-bold tracking-tight uppercase">Nexus</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
                Connexion
              </Link>
              <Link href="/login">
                <Button className="bg-white hover:bg-zinc-200 text-black font-bold rounded-full px-4 md:px-5 py-2 text-xs md:text-sm transition-all hover:scale-105">
                  Démarrer
                </Button>
              </Link>
            </div>
          </nav>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* 1. SÉQUENCE D'INTRO CINÉMATIQUE (APPLE STYLE)             */}
      {/* ========================================================= */}
      <div className="h-[150vh] relative z-40">
        <motion.div 
          style={{ opacity: introOpacity, scale: introScale, filter: introBlur }}
          className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Fond Premium Optimisé Anti-Lag (Radial au lieu de Blur) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_60%)] pointer-events-none"></div>

          {/* Logo Animé */}
          <motion.div
            initial={{ opacity: 0, filter: "blur(30px)", scale: 0.8 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6 z-10"
          >
            {/* FIX: Suppression du cercle autour du logo (rounded-full & fond shadow enlevés) */}
            <div className="w-24 h-24 md:w-32 md:h-32 text-emerald-500 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]">
              <NexusLogo className="w-full h-full" />
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600">
              Nexus
            </h1>
          </motion.div>

          {/* Indicateur de Scroll */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="absolute bottom-12 flex flex-col items-center gap-3 text-zinc-500"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Défiler pour explorer</span>
            <ChevronDown size={20} className="animate-bounce text-zinc-400" />
          </motion.div>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 2. LE CONTENU PRINCIPAL (Apparaît au scroll)              */}
      {/* ========================================================= */}
      
      {/* HERO SECTION */}
      <section className="relative pb-20 px-6 overflow-hidden flex flex-col items-center justify-center min-h-screen -mt-[50vh] z-30 pointer-events-none">
        <div className="max-w-[1000px] mx-auto text-center space-y-8 relative z-10 pointer-events-auto pt-40">
          
          <motion.div style={{ opacity: heroOpacity, y: heroY }} className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-zinc-300 backdrop-blur-md">
              <Sparkles size={14} className="text-emerald-400" /> L'intelligence financière redéfinie
            </div>

            <h2 className="text-5xl sm:text-7xl md:text-[5.5rem] font-black tracking-tighter leading-[1.05] text-white">
              Votre patrimoine, <br />
              enfin <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500">clair.</span>
            </h2>
            
            <p className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Adieu Excel. Nexus agrège tous vos comptes, analyse vos investissements et optimise votre fiscalité en temps réel.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-14 px-8 text-base bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-full transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.02]">
                  Créer mon compte gratuit <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

        </div>
      </section>

      {/* DASHBOARD MOCKUP */}
      <section className="px-4 pb-20 relative z-30">
        <div className="mt-10 max-w-[1100px] mx-auto w-full relative">
          {/* Fonds optimisés anti-lag */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_60%)] -z-10"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_60%)] -z-10"></div>

          <div className="relative rounded-[24px] md:rounded-[40px] border border-white/10 bg-white/5 p-2 md:p-3 shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)] backdrop-blur-md">
            <div className="aspect-[16/10] md:aspect-[16/9] bg-[#0A0A0A] rounded-[18px] md:rounded-[32px] relative overflow-hidden border border-black shadow-inner">
               <Image 
                  src="/dashboard.png" 
                  alt="Dashboard Nexus" 
                  fill
                  className="object-cover opacity-100" // FIX: Image éclatante (100% d'opacité)
               />
               {/* FIX: Dégradé assombrissant réduit pour plus de visibilité */}
               <div className="absolute inset-0 bg-gradient-to-t from-[#020202]/30 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-10 border-y border-white/5 bg-black/50 backdrop-blur-sm z-30 relative">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 font-medium text-sm md:text-base text-zinc-400">
            <div className="flex items-center gap-2"><Lock size={18}/> Chiffrement AES-256</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={18}/> DSP2 Sécurisé</div>
            <div className="flex items-center gap-2"><Brain size={18}/> IA Prédictive</div>
        </div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section id="features" className="py-32 px-6 max-w-[1200px] mx-auto space-y-6 z-30 relative">
        <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">Tout ce dont vous avez besoin. <br/>Rien de superflu.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento 1: Agrégation */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="col-span-1 md:col-span-2 bg-[#0A0A0C] border border-white/10 rounded-[32px] p-8 md:p-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)] transition-all group-hover:opacity-100 opacity-50"></div>
                <LineChart className="text-emerald-400 mb-6 relative z-10" size={32} />
                <h3 className="text-3xl font-bold mb-4 relative z-10">Vue 360° en temps réel.</h3>
                <p className="text-zinc-400 text-lg mb-8 max-w-md relative z-10">Connectez vos banques, courtiers et portefeuilles crypto. Nexus calcule votre valeur nette à la seconde près.</p>
                {/* FIX: Opacité à 100% sur l'image */}
                <div className="relative h-48 md:h-64 w-full rounded-2xl overflow-hidden border border-white/5 z-10 bg-black/40">
                    <Image src="/patrimoine.png" alt="Patrimoine" fill className="object-cover object-top opacity-100 transition-transform duration-700 group-hover:scale-105" />
                </div>
            </motion.div>

            {/* Bento 2: Immo */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: 0.1 }} className="col-span-1 bg-[#0A0A0C] border border-white/10 rounded-[32px] p-8 md:p-12 relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)] transition-all group-hover:opacity-100 opacity-50"></div>
                <Building2 className="text-blue-400 mb-6 relative z-10" size={32} />
                <h3 className="text-2xl font-bold mb-4 relative z-10">Immobilier <br/> chirurgical.</h3>
                <p className="text-zinc-400 mb-8 relative z-10">Cashflow net, LMNP vs Nu, impôts cachés. Simulez sans faille.</p>
                {/* FIX: Opacité à 100% sur l'image */}
                <div className="relative h-40 w-full rounded-2xl overflow-hidden border border-white/5 z-10 bg-black/40">
                    <Image src="/simulateur.png" alt="Simulateur" fill className="object-cover object-left opacity-100 transition-transform duration-700 group-hover:scale-105" />
                </div>
            </motion.div>

            {/* Bento 3: IA */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="col-span-1 md:col-span-3 bg-gradient-to-br from-zinc-900 to-[#0A0A0C] border border-white/10 rounded-[32px] p-8 md:p-12 relative overflow-hidden group flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6 relative z-10">
                    <Brain className="text-indigo-400" size={40} />
                    <h3 className="text-3xl md:text-4xl font-bold">Votre futur, modélisé par IA.</h3>
                    <p className="text-zinc-400 text-lg max-w-lg">
                        Croisez vos revenus, votre taux d'épargne et les intérêts composés. Découvrez exactement l'année et le mois où vous atteindrez l'indépendance financière.
                    </p>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm font-medium text-zinc-300"><CheckCircle2 size={16} className="text-indigo-400"/> Projection sur 40 ans</li>
                        <li className="flex items-center gap-2 text-sm font-medium text-zinc-300"><CheckCircle2 size={16} className="text-indigo-400"/> Scénarios de crises intégrés</li>
                    </ul>
                </div>
                {/* FIX: Opacité à 100% sur l'image */}
                <div className="flex-1 w-full relative h-64 md:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-10 bg-black/40">
                    <Image src="/projection.png" alt="IA" fill className="object-cover opacity-100 transition-transform duration-700 group-hover:scale-105" />
                </div>
            </motion.div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-32 px-6 relative overflow-hidden z-30">
        <div className="absolute inset-0 bg-[#050505] -z-20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_60%)] -z-10"></div>
        
        <div className="max-w-[800px] mx-auto text-center space-y-8 relative z-10">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white">Prêt à dominer <br/> vos finances ?</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium">Rejoignez les investisseurs qui ont repris le contrôle avec Nexus.</p>
          <div className="pt-8">
            <Link href="/login">
              <Button className="h-14 px-10 text-lg bg-white hover:bg-zinc-200 text-black font-black rounded-full transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Aucune carte bancaire requise.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-12 px-6 bg-[#020202] z-30 relative">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="w-5 h-5 text-zinc-500">
                    <NexusLogo className="w-full h-full" />
                </div>
                <span className="font-bold tracking-widest uppercase text-zinc-300 text-sm">Nexus</span>
            </div>
            <div className="flex gap-8 text-sm text-zinc-500 font-medium">
              <Link href="#" className="hover:text-white transition-colors">Tarifs</Link>
              <Link href="#" className="hover:text-white transition-colors">Sécurité</Link>
              <Link href="#" className="hover:text-white transition-colors">Légal</Link>
            </div>
            <p className="text-zinc-600 text-sm font-medium">© 2026 Nexus Wealth.</p>
        </div>
      </footer>

    </div>
  );
}