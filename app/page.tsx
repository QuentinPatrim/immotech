"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Building, BrainCircuit, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/NexusLogo"; // Assure-toi que ce chemin est correct

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 shrink-0">
                <NexusLogo className="w-full h-full" />
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tighter uppercase">Nexus</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Se connecter
            </Link>
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-zinc-200 font-bold rounded-full px-4 md:px-6 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                Démarrer <ArrowRight size={16} className="ml-2 hidden sm:block" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-5xl mx-auto text-center space-y-8">
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 uppercase tracking-widest backdrop-blur-md mb-4">
            <Sparkles size={14} className="text-emerald-400" /> La nouvelle ère de l'investissement
          </motion.div>
          
          <motion.h1 variants={fadeIn} className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[1.1]">
            Reprenez le contrôle <br className="hidden md:block" />
            de votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500">patrimoine.</span>
          </motion.h1>
          
          <motion.p variants={fadeIn} className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
            Le tableau de bord ultime pour les investisseurs exigeants. Suivi 360°, simulateurs immobiliers avancés et intelligence artificielle fiscale.
          </motion.p>
          
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-14 px-8 text-base bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wide rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all hover:scale-105">
                Créer mon compte gratuit
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-14 px-8 text-base border-white/10 hover:bg-white/5 text-white font-bold rounded-2xl backdrop-blur-md">
                Découvrir l'outil <ChevronRight size={18} className="ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* --- MOCKUP FUTURISTE --- */}
      <section className="px-6 pb-20 md:pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto rounded-[32px] md:rounded-[48px] border border-white/10 bg-[#0A0A0C] p-2 md:p-4 shadow-2xl relative overflow-hidden"
        >
          {/* Fausse barre de menu Mac */}
          <div className="flex gap-2 p-3 md:p-4 border-b border-white/5 bg-black/40 relative z-10">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          
          <div className="aspect-video bg-black rounded-b-[24px] md:rounded-b-[40px] relative overflow-hidden group">
             {/* VRAIE IMAGE FINTECH SOMBRE ET FONCTIONNELLE */}
             <Image 
                src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2560&auto=format&fit=crop" 
                alt="Aperçu du Dashboard Nexus Futuriste" 
                fill
                className="object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700 scale-100 group-hover:scale-105 transition-transform"
             />
             
             {/* Filtre pour assombrir le bas de l'image et la fondre dans le site */}
             <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/20 to-transparent pointer-events-none"></div>
             <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] pointer-events-none rounded-b-[24px] md:rounded-b-[40px]"></div>
          </div>
        </motion.div>
      </section>

      {/* --- FEATURES BENTO BOX --- */}
      <section id="features" className="py-20 md:py-32 px-6 bg-black relative">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">L'arsenal <span className="text-indigo-400">Complet</span></h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Remplacez vos 15 fichiers Excel par un terminal de contrôle unique, conçu pour la performance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-8 md:p-12 rounded-[32px] bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/10 blur-[60px] group-hover:bg-emerald-500/20 transition-all"></div>
              <BarChart3 size={32} className="text-emerald-400 mb-6" />
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4">Vision Patrimoniale 360°</h3>
              <p className="text-zinc-400 leading-relaxed max-w-md">Synchronisez vos actifs immobiliers, boursiers, cryptos et livrets. Suivez votre Net Worth en temps réel et analysez votre diversification comme un Family Office.</p>
            </div>

            <div className="p-8 md:p-12 rounded-[32px] bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 blur-[60px] group-hover:bg-blue-500/20 transition-all"></div>
              <Building size={32} className="text-blue-400 mb-6" />
              <h3 className="text-2xl font-black text-white mb-4">Simulateur Immo PRO</h3>
              <p className="text-zinc-400 leading-relaxed">Générez des dossiers bancaires PDF en un clic. Calculez votre cashflow net d'impôts et simulez la fiscalité LMNP vs Nue instantanément.</p>
            </div>

            <div className="p-8 md:p-12 rounded-[32px] bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
               <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 blur-[60px] group-hover:bg-indigo-500/20 transition-all"></div>
              <BrainCircuit size={32} className="text-indigo-400 mb-6" />
              <h3 className="text-2xl font-black text-white mb-4">Analyses IA</h3>
              <p className="text-zinc-400 leading-relaxed">Un expert fiscal dans votre poche. Notre IA analyse votre profil et vous suggère des stratégies d'optimisation (PEA vs CTO, Assurance Vie).</p>
            </div>

            <div className="md:col-span-2 p-8 md:p-12 rounded-[32px] bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
              <div className="absolute top-1/2 right-10 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 blur-[60px] group-hover:bg-yellow-500/20 transition-all"></div>
              <ShieldCheck size={32} className="text-yellow-400 mb-6" />
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4">Budget & Cashflow Sécurisé</h3>
              <p className="text-zinc-400 leading-relaxed max-w-md">Paramétrez vos flux mensuels, calculez votre capacité d'investissement et sécurisez votre matelas de précaution de manière automatisée.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-20 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Investissez en vous.</h2>
            <p className="text-zinc-400 text-lg">Des tarifs simples, rentabilisés dès la première optimisation fiscale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 md:p-10 rounded-[32px] bg-zinc-900/30 border border-white/10 flex flex-col">
              <h3 className="text-xl font-bold text-zinc-300 uppercase tracking-widest mb-2">Essentiel</h3>
              <div className="text-4xl font-black text-white mb-6">Gratuit</div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-emerald-500" /> Suivi de Patrimoine (Manquant)</li>
                <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-emerald-500" /> Gestion de Budget</li>
                <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-emerald-500" /> Simulateur Immo (Basique)</li>
              </ul>
              <Link href="/login">
                <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 text-white font-bold">Commencer</Button>
              </Link>
            </div>

            <div className="p-8 md:p-10 rounded-[32px] bg-gradient-to-b from-indigo-900/20 to-black border border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.1)] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500"></div>
              <div className="absolute top-6 right-6 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/30">Populaire</div>
              
              <h3 className="text-xl font-bold text-indigo-400 uppercase tracking-widest mb-2">Nexus Premium</h3>
              <div className="text-4xl font-black text-white mb-1">1,99 € <span className="text-lg text-zinc-500 font-normal">/mois</span></div>
              <p className="text-sm text-zinc-400 mb-6">Sans engagement. Rentabilisé au 1er euro.</p>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-zinc-100 font-medium"><Check size={18} className="text-indigo-400" /> Tout le plan Gratuit</li>
                <li className="flex items-center gap-3 text-zinc-100 font-medium"><Check size={18} className="text-indigo-400" /> Projections Financières sur 40 ans</li>
                <li className="flex items-center gap-3 text-zinc-100 font-medium"><Check size={18} className="text-indigo-400" /> Matrice Fiscale LMNP / SCI / Nue</li>
                <li className="flex items-center gap-3 text-zinc-100 font-medium"><Check size={18} className="text-indigo-400" /> Dossiers Bancaires PDF Illimités</li>
                <li className="flex items-center gap-3 text-zinc-100 font-medium"><Check size={18} className="text-indigo-400" /> Intelligence Artificielle Débloquée</li>
              </ul>
              <Link href="/login">
                <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">Devenir Premium</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/5 py-12 px-6 text-center text-zinc-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 shrink-0">
                <NexusLogo className="w-full h-full" />
            </div>
            <span className="font-black tracking-widest uppercase text-white">Nexus</span>
        </div>
        <p>© 2026 Nexus Wealth Management. Tous droits réservés.</p>
        <p className="mt-2 text-xs">Conçu pour les investisseurs déterminés.</p>
      </footer>

    </div>
  );
}