"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, LineChart, Building2, Shield, Brain, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/NexusLogo"; 

export default function LandingPagePro() {
  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-emerald-500/30 overflow-x-hidden font-sans">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#020202]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#020202]/60">
        <div className="max-w-[1200px] mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 text-emerald-500 animate-pulse-slow">
                <NexusLogo className="w-full h-full" />
            </div>
            <span className="text-xl font-bold tracking-tight uppercase hidden md:block">Nexus</span>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Connexion
            </Link>
            <Link href="/login">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full px-4 md:px-6 py-2 md:py-2.5 text-sm transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                Démarrer <ArrowRight size={16} className="ml-2 hidden md:block" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      {/* J'ai réduit le padding-top ici (pt-28 md:pt-40) pour remonter le contenu */}
      <section className="relative pt-28 pb-12 md:pt-40 md:pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none -z-10 opacity-40 mix-blend-screen"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-600/15 blur-[120px] rounded-full pointer-events-none -z-10 opacity-50 mix-blend-screen"></div>

        <div className="max-w-[1000px] mx-auto text-center space-y-8 relative z-10">
          
          {/* ANIMATIONS CORRIGÉES (Directes, anti-bug d'opacité) */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[1.05] text-white"
          >
            Votre patrimoine, <br />
            enfin <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500">clair.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            Adieu Excel. Nexus agrège tous vos comptes, analyse vos investissements et optimise votre fiscalité en temps réel.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 md:h-14 px-8 text-base bg-white hover:bg-zinc-200 text-black font-bold rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]">
                Créer mon compte gratuit
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base text-zinc-300 hover:text-white hover:bg-white/5 font-medium rounded-full transition-all">
                Voir les fonctionnalités <ChevronRight size={18} className="ml-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* --- MOCKUP "BIJOU" AVEC ELEMENTS FLOTTANTS --- */}
      <section className="px-4 md:px-6 pb-24 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }} 
          transition={{ duration: 0.8 }}
          className="max-w-[1100px] mx-auto relative"
        >
          
          {/* ELEMENT FLOTTANT 1 : Bouclier (Top Left) */}
          <motion.div 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden md:flex absolute -left-12 -top-10 w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.2)] z-30"
          >
            <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-md"></div>
            <Shield className="text-indigo-400 relative z-10" size={40} />
          </motion.div>

          {/* ELEMENT FLOTTANT 2 : Éclair (Top Right) */}
          <motion.div 
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="hidden md:flex absolute -right-8 top-20 w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.2)] z-30"
          >
            <div className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-md"></div>
            <Zap className="text-cyan-400 relative z-10" size={32} />
          </motion.div>

          {/* ELEMENT FLOTTANT 3 : Graphique (Bottom Left) */}
          <motion.div 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden md:flex absolute -left-6 bottom-10 w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)] z-30"
          >
            <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-md"></div>
            <LineChart className="text-emerald-400 relative z-10" size={32} />
          </motion.div>

          {/* ECRAN PRINCIPAL */}
          <div className="relative rounded-[24px] md:rounded-[40px] border border-white/[0.08] bg-[#0A0A0A] p-2 shadow-[0_0_100px_-30px_rgba(16,185,129,0.3)] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20"></div>
            
            <div className="aspect-[16/10] md:aspect-[16/9] bg-zinc-900 rounded-[20px] md:rounded-[34px] relative overflow-hidden">
               <Image 
                  src="/dashboard.png" 
                  alt="Dashboard Nexus" 
                  fill
                  className="object-cover opacity-100 transition-all duration-700 hover:scale-[1.01]"
               />
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] opacity-30 pointer-events-none"></div>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 bottom-10 w-[90%] h-20 bg-emerald-500/20 blur-[100px] rounded-[100%] -z-10 md:w-[60%]"></div>
        </motion.div>
      </section>

      {/* --- TRUST BANNER --- */}
      <section className="py-12 border-y border-white/[0.06] bg-zinc-950/50">
        <div className="max-w-[1200px] mx-auto px-6 text-center space-y-4">
          <p className="text-sm uppercase tracking-widest text-zinc-500 font-bold">La technologie au service de votre liberté financière</p>
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
            <div className="flex items-center gap-2 text-zinc-400"><Shield size={18}/> Sécurité Bancaire</div>
            <div className="flex items-center gap-2 text-zinc-400"><CheckCircle2 size={18}/> Données Chiffrées</div>
            <div className="flex items-center gap-2 text-zinc-400"><Brain size={18}/> IA Intégrée</div>
          </div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="py-24 md:py-32 px-6 relative overflow-hidden bg-[#020202]">
        <div className="max-w-[1100px] mx-auto space-y-24 md:space-y-32">
          
          {/* Feature 1: Agrégation */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
            <div className="space-y-6 order-2 md:order-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-8">
                <LineChart className="text-emerald-400" size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tout votre patrimoine. <br/>Au même endroit.</h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Finis les logins multiples. Connectez vos banques, assurances-vie, comptes-titres et plateformes crypto. Nexus calcule votre valeur nette en temps réel.
              </p>
              <ul className="space-y-3 text-zinc-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Synchronisation automatique</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Historique de performance</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Analyse de diversification</li>
              </ul>
            </div>
            
            <div className="aspect-[4/3] rounded-[32px] border border-white/10 relative overflow-hidden order-1 md:order-2 group bg-zinc-900 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
               <Image src="/patrimoine.png" alt="Patrimoine Nexus" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"/>
               <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent opacity-80 pointer-events-none"></div>
            </div>
          </div>

          {/* Feature 2: Immobilier */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
            <div className="aspect-[4/3] rounded-[32px] border border-white/10 relative overflow-hidden group bg-gradient-to-br from-zinc-900 to-[#020202] shadow-[0_0_40px_rgba(59,130,246,0.1)] flex items-center justify-center">
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
               <Building2 className="text-blue-500/20 w-48 h-48 absolute" />
               <Image src="/simulateur.png" alt="Simulateur Immo" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700 z-10" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent opacity-80 pointer-events-none z-20"></div>
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-8">
                <Building2 className="text-blue-400" size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">L'immobilier locatif, <br/>sans les maux de tête.</h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Ne vous fiez plus aux "on-dit". Simulez vos projets avec précision : Cashflow net, fiscalité LMNP vs Nue, et rentabilité réelle après impôts.
              </p>
               <ul className="space-y-3 text-zinc-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-500" /> Comparateur fiscal instantané</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-500" /> Dossiers bancaires PDF en 1 clic</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-500" /> Calcul du cashflow net réel</li>
              </ul>
            </div>
          </div>

           {/* Feature 3: IA & Optimisation */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
            <div className="space-y-6 order-2 md:order-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-8">
                <Brain className="text-indigo-400" size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Anticipez l'avenir <br/>avec précision.</h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Visualisez votre liberté financière. Notre moteur croise vos flux mensuels, le rendement de vos actifs et projette l'évolution de votre patrimoine sur 40 ans.
              </p>
              <ul className="space-y-3 text-zinc-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-indigo-500" /> Projection de la rente mensuelle</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-indigo-500" /> Impact fiscal CTO vs PEA</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-indigo-500" /> Calcul d'intérêts composés</li>
              </ul>
            </div>
            
            <div className="aspect-[4/3] rounded-[32px] border border-white/10 relative overflow-hidden order-1 md:order-2 group bg-zinc-900 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
               <Image src="/projection.png" alt="Projection IA Nexus" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"/>
               <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent opacity-80 pointer-events-none"></div>
            </div>
          </div>

        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 px-6 relative overflow-hidden border-t border-white/[0.06]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-emerald-600/20 to-indigo-600/20 blur-[120px] rounded-full pointer-events-none -z-10 opacity-40"></div>
        <div className="max-w-[800px] mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Arrêtez de naviguer à vue.</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">Rejoignez les investisseurs qui ont repris le contrôle de leur avenir financier avec Nexus.</p>
          <div className="pt-4">
            <Link href="/login">
              <Button className="h-14 px-10 text-lg bg-white hover:bg-zinc-200 text-black font-bold rounded-full transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-[1.02]">
                Commencer maintenant <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Essai gratuit. Pas de carte bancaire requise.</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/[0.06] py-12 px-6 bg-[#010101]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 text-zinc-500 hover:text-emerald-500 transition-colors">
                    <NexusLogo className="w-full h-full" />
                </div>
                <span className="font-bold tracking-widest uppercase text-zinc-300">Nexus</span>
            </div>
            <div className="flex gap-8 text-sm text-zinc-500 font-medium">
              <Link href="#" className="hover:text-white transition-colors">Tarifs</Link>
              <Link href="#" className="hover:text-white transition-colors">Sécurité</Link>
              <Link href="#" className="hover:text-white transition-colors">Légal</Link>
            </div>
            <p className="text-zinc-600 text-sm">© 2026 Nexus Wealth. Fait avec passion.</p>
        </div>
      </footer>

    </div>
  );
}