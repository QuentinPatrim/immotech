"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  MotionValue,
} from "framer-motion";
import {
  LayoutDashboard, FolderOpen, PieChart, TrendingUp,
  Building, Sparkles, ArrowRight, Check, ChevronDown, 
  ChevronRight, Menu, X, Lock, ShieldCheck, Zap, Cookie,
  Search, Lightbulb, Wallet, LineChart, Brain
} from "lucide-react";
import { NexusLogo } from "@/components/NexusLogo";

// ═══════════════════════════════════════════════════════════════════════════
//   NEXUS — LANDING PAGE V3.2 (LAYOUT CORRIGÉ & DONNÉES ANONYMISÉES)
// ═══════════════════════════════════════════════════════════════════════════

export default function HomePage() {
  const [scrolled, setScrolled]               = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [cookiesAccepted, setCookiesAccepted] = useState<boolean | null>(null);
  const [activeFeature, setActiveFeature]     = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("nexus_cookies") : null;
    if (stored === null) setCookiesAccepted(null);
    else setCookiesAccepted(stored === "true");
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const handleCookies = (accept: boolean) => {
    localStorage.setItem("nexus_cookies", String(accept));
    setCookiesAccepted(accept);
  };

  return (
    <div className="relative min-h-screen bg-[#020203] text-white overflow-x-hidden font-sans antialiased">

      <AnimatedBackground mouseX={smoothMouseX} mouseY={smoothMouseY} />

      <div
        className="fixed inset-0 pointer-events-none z-[2] opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* NAVBAR */}
      <header
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          scrolled ? "w-[94%] max-w-5xl" : "w-[96%] max-w-6xl"
        }`}
      >
        <nav className="relative rounded-2xl bg-zinc-950/70 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <div className="flex items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 relative">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-md group-hover:bg-emerald-500/50 transition-colors" />
                <div className="relative w-full h-full">
                  <NexusLogo className="w-full h-full" />
                </div>
              </div>
              <span className="text-white font-black text-base tracking-[0.15em] uppercase">Nexus</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {[
                { href: "#features", label: "Fonctionnalités" },
                { href: "#how", label: "Comment ça marche" },
                { href: "#values", label: "Sécurité" },
                { href: "#pricing", label: "Tarifs" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-white px-3 py-2 transition-colors">
                Connexion
              </Link>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_4px_20px_-4px_rgba(255,255,255,0.3)]"
              >
                Essayer gratuitement
                <ArrowRight size={14} />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"
              >
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden overflow-hidden border-t border-white/8"
              >
                <div className="p-3 space-y-1">
                  {[
                    { href: "#features", label: "Fonctionnalités" },
                    { href: "#how", label: "Comment ça marche" },
                    { href: "#values", label: "Sécurité" },
                    { href: "#pricing", label: "Tarifs" },
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      <div className="relative z-10">
        <HeroSection mouseX={smoothMouseX} mouseY={smoothMouseY} />

        {/* FEATURES */}
        <section id="features" className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <SectionHeader
              kicker="Fonctionnalités"
              title="Six outils. Une seule app."
              subtitle="Du dashboard temps réel à la projection sur 40 ans, explorez la nouvelle norme de la gestion de patrimoine."
            />

            <div className="mt-16 grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-5 space-y-2">
                {FEATURES.map((f, i) => (
                  <FeatureTab
                    key={f.id}
                    feature={f}
                    active={activeFeature === i}
                    onClick={() => setActiveFeature(i)}
                  />
                ))}
              </div>

              <div className="lg:col-span-7 lg:sticky lg:top-32">
                <FloatingMockup feature={FEATURES[activeFeature]} />
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <SectionHeader
              kicker="Comment ça marche"
              title="Trois étapes. Trois minutes."
              subtitle="Vous avez un patrimoine à suivre. Pas le temps d'apprendre un nouvel outil."
            />

            <div className="mt-16 grid md:grid-cols-3 gap-6 relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative"
                >
                  <motion.div 
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    className="relative z-10 mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center mb-6 shadow-[0_15px_40px_-8px_rgba(16,185,129,0.5)]"
                  >
                    <span className="text-4xl font-black text-white">{s.num}</span>
                  </motion.div>
                  <h3 className="text-center text-white font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-center text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY / VALUES */}
        <section id="values" className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Nos valeurs</span>
                <h2 className="mt-3 text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  Vos données, votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">forteresse.</span>
                </h2>
                <div className="mt-8 space-y-4">
                  {VALUES.map((v) => (
                    <div key={v.title} className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <v.icon size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{v.title}</h4>
                        <p className="text-zinc-500 text-sm leading-relaxed mt-0.5">{v.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                <SecurityVisual />
              </motion.div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <SectionHeader
              kicker="Tarifs"
              title="Simple. Honnête. Sans engagement."
              subtitle="Commencez gratuitement. Passez à Pro quand vos ambitions grandissent."
            />
            <div className="mt-14 grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
              <PricingCard
                tier="Découverte" price="0" period="à vie" desc="Pour comprendre votre patrimoine, en toute sérénité."
                features={["Tableau de bord 360°", "Suivi des actifs financiers", "Allocation visuelle", "Chiffrement AES‑256", "Hébergement UE"]}
                cta="Démarrer gratuitement" ctaHref="/login"
              />
              <PricingCard
                tier="Patrimoine Pro" price="9" period="/ mois" desc="L'arsenal complet pour piloter et optimiser."
                features={["Projection sur 40 ans (5 enveloppes)", "Budget base zéro", "Simulateur Immo & Fiscal", "Suivi illimité d'actifs", "Support prioritaire"]}
                cta="Essayer 14 jours" ctaHref="/login" highlighted
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative py-24 px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <SectionHeader kicker="FAQ" title="Les questions qu'on nous pose." subtitle="" />
            <div className="mt-10 space-y-3">
              {FAQ.map((q, i) => <FAQItem key={i} {...q} />)}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative border-t border-white/8 bg-black/40 backdrop-blur-sm py-14">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
             <div className="flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="flex items-center gap-2.5">
                  <NexusLogo className="w-8 h-8" />
                  <span className="text-white font-black text-base tracking-widest uppercase">Nexus</span>
               </div>
               <p className="text-zinc-600 text-[11px]">© {new Date().getFullYear()} Nexus. Tous droits réservés. Conçu en France 🇫🇷</p>
             </div>
          </div>
        </footer>
      </div>

      {/* COOKIES */}
      <AnimatePresence>
        {cookiesAccepted === null && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-4 left-4 right-4 md:left-6 md:bottom-6 md:right-auto md:max-w-sm z-[60]">
            <div className="rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-5 shadow-2xl">
              <div className="flex items-start gap-3 mb-3">
                <Cookie size={16} className="text-emerald-400 mt-1" />
                <p className="text-zinc-400 text-xs leading-relaxed">Nous utilisons uniquement des cookies essentiels. Aucun traçage publicitaire.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleCookies(false)} className="flex-1 h-10 rounded-xl border border-white/10 text-zinc-400 text-xs font-bold">Essentiels</button>
                <button onClick={() => handleCookies(true)} className="flex-1 h-10 rounded-xl bg-white text-black text-xs font-bold">Tout accepter</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   APERÇU INTERACTIF (MOBILE + DESKTOP) — SYNCHRONISÉ & FIXÉ
// ═══════════════════════════════════════════════════════════════════════════

function InteractiveAppPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveScreen = FEATURES[activeTab].mockup;

  return (
    // CONTENEUR SÉCURISÉ : On limite la taille pour ne pas mordre sur le texte
    <div className="relative w-full max-w-[650px] h-[500px] sm:h-[550px] flex items-center justify-center lg:justify-end mt-12 lg:mt-0">
      
      {/* 💻 MOCKUP DESKTOP (Ancré à l'intérieur de sa colonne) */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        // Modification des coordonnées pour éviter l'overlap :
        className="hidden md:block absolute left-0 lg:left-4 xl:left-10 top-0 w-[480px] xl:w-[580px] h-[340px] xl:h-[380px] rounded-xl bg-[#0a0a0c] border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden z-10"
      >
        <div className="h-8 bg-[#0a0a0c] border-b border-white/5 flex items-center px-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
          </div>
        </div>

        <div className="h-[calc(100%-32px)] flex">
          {/* Sidebar */}
          <div className="w-32 xl:w-40 border-r border-white/5 bg-[#0a0a0c] p-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-6 px-2 mt-1">
               <NexusLogo className="w-4 h-4 text-blue-500" />
               <span className="text-white font-black text-[11px] tracking-widest uppercase">Nexus</span>
            </div>
            {FEATURES.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(i)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                  activeTab === i ? "bg-white/[0.03] shadow-sm" : "hover:bg-white/[0.02]"
                }`}
              >
                <f.icon size={13} style={{ color: activeTab === i ? f.color : "#52525b" }} />
                <span className={`text-[10px] ${activeTab === i ? "text-white font-bold" : "text-zinc-500 font-medium"}`}>
                  {f.title.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
          {/* Main Area */}
          <div className="flex-1 relative bg-[#0a0a0c] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 overflow-y-auto hide-scrollbar"
              >
                <ActiveScreen />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* 📱 MOCKUP MOBILE (Décalé vers la droite) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        // Translation vers le bas et la droite par rapport au conteneur parent
        className="relative z-20 md:translate-x-32 lg:translate-x-44 xl:translate-x-56 translate-y-16 lg:translate-y-24"
      >
        <IPhoneMockup>
          <div className="h-full relative bg-[#0a0a0c]">
            <div className="absolute inset-0 pb-[70px] overflow-hidden">
               <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto hide-scrollbar"
                >
                  <ActiveScreen />
                </motion.div>
              </AnimatePresence>
            </div>
            {/* Navbar Mobile cliquable (Affiche 5 icônes max) */}
            <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-[#0a0a0c]/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 rounded-b-[50px] pb-2">
              {FEATURES.slice(0, 5).map((f, i) => (
                <button key={f.id} onClick={() => setActiveTab(i)} className="flex flex-col items-center justify-center w-12 h-12 relative">
                  <f.icon size={18} className="relative z-10 mb-1" style={{ color: activeTab === i ? f.color : "#52525b" }} />
                  <span className="text-[6px] text-zinc-500 uppercase tracking-widest">{f.title.substring(0,4)}</span>
                </button>
              ))}
            </div>
          </div>
        </IPhoneMockup>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   ÉCRANS DES MOCKUPS (DONNÉES ANONYMISÉES "ALEXANDRE")
// ═══════════════════════════════════════════════════════════════════════════

function DashboardScreen() {
  return (
    <div className="h-full w-full bg-[#0a0a0c] p-4 text-white font-sans flex flex-col gap-4">
      <header>
        <p className="text-[7px] text-zinc-500 tracking-widest uppercase mb-0.5">Mardi 28 Avril</p>
        <h1 className="text-sm font-bold">Bonjour, <span className="text-emerald-400">Alexandre.</span></h1>
      </header>

      {/* Main Card */}
      <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        {/* Donut Chart */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="6" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#dashGrad)" strokeWidth="6" strokeDasharray="264" strokeDashoffset="60" strokeLinecap="round" />
            <defs>
              <linearGradient id="dashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <div className="flex items-center gap-1 mb-0.5"><div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"/><span className="text-[6px] text-emerald-400 uppercase tracking-widest font-bold">Live</span></div>
             <span className="text-lg font-black tracking-tighter leading-none">142 500 €</span>
             <span className="text-[5px] text-zinc-500 tracking-widest uppercase mt-0.5">Patrimoine Net</span>
          </div>
        </div>
        
        {/* Details right */}
        <div className="flex-1 w-full">
          <p className="text-[6px] text-emerald-400 tracking-widest uppercase mb-1 flex items-center gap-1"><span>—</span> Synthèse · Avr. 2026</p>
          <p className="text-[9px] text-zinc-300 leading-relaxed mb-3">Votre patrimoine net s'élève à <strong className="text-white">142 500 €</strong>, avec une épargne mensuelle de <strong className="text-emerald-400">1 200 €</strong>.</p>
          
          <div className="flex justify-between text-[6px] text-zinc-500 uppercase tracking-widest mb-1">
            <span>Évolution · 12 mois</span><span className="text-emerald-400 font-bold">+14,2 %</span>
          </div>
          {/* Fake line chart */}
          <div className="w-full h-4 mb-3 border-b border-white/5 relative">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full absolute bottom-0">
               <path d="M0,15 Q10,12 20,14 T40,10 T60,8 T80,5 L100,2" fill="none" stroke="#10b981" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
            </svg>
          </div>

          <p className="text-[6px] text-zinc-500 tracking-widest uppercase mb-2">Allocation</p>
          <div className="space-y-1.5">
             <div className="flex justify-between items-center text-[7px] font-bold"><span className="text-zinc-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Bourse</span><span>45%</span></div>
             <div className="flex justify-between items-center text-[7px] font-bold"><span className="text-zinc-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"/>Cash</span><span>50%</span></div>
          </div>
        </div>
      </div>

      {/* Prochain Palier */}
      <div>
         <div className="flex justify-between text-[7px] font-bold mb-1.5 uppercase tracking-widest">
            <span className="text-purple-400 flex items-center gap-1">Prochain Palier</span>
            <span className="text-zinc-400">142 500 € → 200 000 € <span className="text-purple-400">71%</span></span>
         </div>
         <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full w-[71%]" />
         </div>
      </div>

      {/* Insight */}
      <div className="bg-[#111113] border border-emerald-500/20 border-l-2 border-l-emerald-500 rounded-lg p-3 flex gap-3 items-start">
         <Lightbulb size={12} className="text-emerald-400 shrink-0 mt-0.5" />
         <div>
            <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Excellent taux d'épargne</p>
            <p className="text-[8px] text-zinc-400 leading-relaxed">Avec ce taux d'épargne, vous faites partie des plus performants. Pensez à diversifier vers le PEA ou l'assurance-vie.</p>
         </div>
      </div>
    </div>
  );
}

function PatrimoineScreen() {
  return (
    <div className="h-full w-full bg-[#0a0a0c] p-4 text-white font-sans flex flex-col gap-4">
      <header>
        <h1 className="text-sm font-bold uppercase tracking-widest">Mon Patrimoine</h1>
        <p className="text-[7px] text-zinc-500">L'inventaire de tout ce que vous possédez, simplifié.</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Total box */}
        <div className="flex-1 bg-gradient-to-br from-[#111113] to-[#0a0a0c] border border-white/5 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-3 right-3 text-[6px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+2 450 € P&L</div>
          <div className="text-[6px] text-emerald-400 tracking-widest uppercase mb-1 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Votre Richesse
          </div>
          <p className="text-2xl font-black tracking-tighter">142 500 €</p>
        </div>
        {/* Security Box */}
        <div className="sm:w-1/3 bg-[#111113] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <p className="text-[6px] text-pink-400 tracking-widest uppercase mb-1">Matelas sécu</p>
          <p className="text-lg font-black tracking-tighter">15 000 €</p>
          <div className="w-full h-1 bg-zinc-900 rounded-full mt-2"><div className="h-full bg-pink-500 rounded-full w-[49%]"/></div>
        </div>
      </div>

      <div className="bg-[#111113] border border-white/5 rounded-xl p-3">
        <div className="flex justify-between items-center mb-3">
           <span className="text-[8px] font-bold uppercase tracking-widest border-l-2 border-emerald-500 pl-2">Vos Investissements</span>
           <span className="text-[7px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md font-bold">+ Ajouter</span>
        </div>
        
        <div className="space-y-2">
          {/* Section PEA */}
          <div className="text-[6px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <div className="w-1 h-1 bg-emerald-500 rounded-full"/>PEA <span className="text-zinc-600 ml-auto font-normal">45 000 €</span>
          </div>
          {[
            ["iShares EURO STOXX", "14 245 €", "+3.39%"],
            ["Sanofi", "8 727 €", "+2.39%"],
            ["AXA SA", "5 038 €", "+6.23%"],
            ["L'Air Liquide S.A.", "7 199 €", "+10.19%"]
          ].map(([n, v, p]) => (
            <div key={n} className="flex justify-between items-center border-b border-white/5 pb-2">
               <span className="text-[8px] font-bold text-zinc-300">{n}</span>
               <div className="text-right">
                  <span className="text-[8px] font-bold block">{v}</span>
                  <span className="text-[6px] text-emerald-400">{p}</span>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetScreen() {
  return (
    <div className="h-full w-full bg-[#0a0a0c] p-4 text-white font-sans flex flex-col gap-4">
      <header>
        <p className="text-[6px] text-zinc-500 tracking-widest uppercase mb-1">— Module · Budget Base Zéro</p>
        <h1 className="text-sm font-bold">Donnez un rôle à <span className="text-yellow-500">chaque euro.</span></h1>
      </header>

      {/* Etape 1 */}
      <div>
         <div className="text-[6px] font-bold text-yellow-500 tracking-widest uppercase mb-2 flex items-center gap-2">
            Étape 01 <span className="text-zinc-600">— Vos revenus</span>
         </div>
         <div className="bg-[#111113] border border-yellow-500/20 rounded-xl p-3 flex justify-between items-center">
            <div>
               <p className="text-[10px] font-bold">Avril 2026</p>
               <p className="text-[6px] text-emerald-400 flex items-center gap-1 mt-0.5"><span className="w-1 h-1 bg-emerald-400 rounded-full inline-block"/> Données enregistrées</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[7px] text-zinc-500 uppercase tracking-widest">Revenus</span>
               <span className="bg-zinc-900 px-2 py-1 rounded-md text-[10px] font-bold">3 200 €</span>
               <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check size={10}/></div>
            </div>
         </div>
      </div>

      {/* Etape 2 */}
      <div className="flex-1">
         <div className="text-[6px] font-bold text-blue-500 tracking-widest uppercase mb-2 flex items-center gap-2">
            Étape 02 <span className="text-zinc-600">— Vos dépenses du mois</span>
         </div>
         <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-[#111113] border border-blue-500/20 rounded-xl p-3">
               <p className="text-[7px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Building size={8}/> Charges Fixes & Besoins</p>
               <div className="space-y-2">
                 {[["Courses", "450 €"], ["Loyer", "850 €"], ["Charges", "120 €"], ["Abonnement tél.", "25 €"]].map(([n,v]) => (
                   <div key={n} className="flex justify-between items-center bg-[#0a0a0c] p-2 rounded-lg border border-white/5">
                     <span className="text-[8px] font-bold text-zinc-300">{n}</span>
                     <span className="text-[8px] font-bold">{v}</span>
                   </div>
                 ))}
               </div>
            </div>
            <div className="flex-1 bg-[#111113] border border-yellow-500/20 rounded-xl p-3">
               <p className="text-[7px] font-bold text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Sparkles size={8}/> Loisirs & Envies</p>
               <div className="space-y-2">
                 {[["Restaurants", "150 €"], ["Essence", "80 €"]].map(([n,v]) => (
                   <div key={n} className="flex justify-between items-center bg-[#0a0a0c] p-2 rounded-lg border border-white/5">
                     <span className="text-[8px] font-bold text-zinc-300">{n}</span>
                     <span className="text-[8px] font-bold">{v}</span>
                   </div>
                 ))}
               </div>
            </div>
         </div>
      </div>

      <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 text-center flex flex-col items-center justify-center mt-2">
         <Search size={14} className="text-purple-400 mb-1" />
         <p className="text-[9px] font-bold text-white">Scanner un ticket de caisse.</p>
         <p className="text-[6px] text-purple-400 uppercase tracking-widest mt-1">Reconnaissance automatique</p>
      </div>
    </div>
  );
}

function ProjectionScreen() {
  return (
    <div className="h-full w-full bg-[#0a0a0c] p-4 text-white font-sans flex flex-col gap-4 overflow-y-auto hide-scrollbar">
      <header className="flex justify-between items-start">
        <div>
          <p className="text-[6px] text-zinc-500 tracking-widest uppercase mb-1">Nexus Invest · PFU 30%</p>
          <h1 className="text-sm font-bold text-blue-400">Bilan Patrimonial</h1>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-2 py-1 rounded-md border border-emerald-500/20">
          Générer PDF
        </div>
      </header>

      {/* 2x2 Grid KPI */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#111113] border border-yellow-500/20 rounded-xl p-2 relative overflow-hidden">
           <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-yellow-500/10" />
           <p className="text-[5px] text-yellow-500 font-bold uppercase tracking-widest">Enveloppe Optimale</p>
           <p className="text-sm font-black mt-1">CTO</p>
           <p className="text-[6px] text-zinc-500">280 500 €</p>
        </div>
        <div className="bg-[#111113] border border-emerald-500/20 rounded-xl p-2 relative overflow-hidden">
           <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500/10" />
           <p className="text-[5px] text-emerald-500 font-bold uppercase tracking-widest">Capital PEA Final</p>
           <p className="text-sm font-black mt-1">452 000 €</p>
           <p className="text-[6px] text-zinc-500">18.6% PS · IR exonéré · 20 ans</p>
        </div>
        <div className="bg-[#111113] border border-blue-500/20 rounded-xl p-2 relative overflow-hidden">
           <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500/10" />
           <p className="text-[5px] text-blue-500 font-bold uppercase tracking-widest">Rente Mensuelle</p>
           <p className="text-sm font-black mt-1">2 150 €</p>
           <p className="text-[6px] text-zinc-500">Règle des 4% · PEA</p>
        </div>
        <div className="bg-[#111113] border border-white/5 rounded-xl p-2 relative overflow-hidden">
           <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white/5" />
           <p className="text-[5px] text-zinc-400 font-bold uppercase tracking-widest">Indépendance (FIRE)</p>
           <p className="text-sm font-black mt-1">En bonne voie</p>
           <p className="text-[6px] text-zinc-500">Cible : 600 000 € (25x dép.)</p>
        </div>
      </div>

      {/* Menu / Tabs sous les KPI */}
      <div className="flex bg-[#111113] rounded-lg p-1 border border-white/5">
         <div className="flex-1 bg-indigo-500 rounded-md py-1.5 flex justify-center items-center"><LineChart size={10} className="text-white"/></div>
         <div className="flex-1 rounded-md py-1.5 flex justify-center items-center text-zinc-500"><TrendingUp size={10}/></div>
         <div className="flex-1 rounded-md py-1.5 flex justify-center items-center text-zinc-500"><Sparkles size={10}/></div>
         <div className="flex-1 rounded-md py-1.5 flex justify-center items-center text-zinc-500"><Building size={10}/></div>
      </div>

      {/* Chart */}
      <div className="bg-[#111113] border border-white/5 rounded-xl p-3 flex flex-col">
          <p className="text-[7px] font-bold flex items-center gap-1 mb-1"><TrendingUp size={10} className="text-emerald-400"/> Capital net après impôts & frais — 20 ans</p>
          <p className="text-[5px] text-zinc-500 mb-3">Capital investi : <strong className="text-white">180 000 €</strong> · Équilibré 6%/an</p>
          <div className="relative h-32 border-l border-b border-white/10 pb-2 pl-2 mt-2">
             <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full absolute bottom-2 left-2">
               <path d="M0,50 Q40,35 100,5" fill="none" stroke="#eab308" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
               <path d="M0,50 Q40,38 100,10" fill="none" stroke="#ec4899" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
               <path d="M0,50 Q40,42 100,20" fill="none" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
               <path d="M0,50 Q40,45 100,30" fill="none" stroke="#52525b" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
               <line x1="0" y1="8" x2="100" y2="8" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2" vectorEffect="non-scaling-stroke" />
             </svg>
             <span className="absolute top-[2px] left-[15px] text-[4px] font-bold text-blue-500 bg-[#111113] px-1">FIRE</span>
             <div className="absolute top-0 -left-6 text-[4px] text-zinc-600">600k€</div>
             <div className="absolute top-[33%] -left-6 text-[4px] text-zinc-600">450k€</div>
             <div className="absolute top-[66%] -left-6 text-[4px] text-zinc-600">300k€</div>
             <div className="absolute bottom-2 -left-6 text-[4px] text-zinc-600">150k€</div>
          </div>
          <div className="flex flex-wrap gap-2 text-[5px] text-zinc-500 mt-2">
              <span className="flex items-center gap-0.5"><div className="w-2 h-0.5 bg-emerald-500"/> PEA</span>
              <span className="flex items-center gap-0.5 text-yellow-500"><div className="w-2 h-0.5 bg-yellow-500"/> CTO ★</span>
              <span className="flex items-center gap-0.5"><div className="w-2 h-0.5 bg-pink-500"/> Assurance Vie</span>
              <span className="flex items-center gap-0.5"><div className="w-2 h-0.5 bg-zinc-500"/> PER</span>
          </div>
      </div>
    </div>
  );
}

function SimulateurScreen() {
  return (
    <div className="h-full w-full bg-[#0a0a0c] p-4 text-white font-sans flex flex-col gap-4 overflow-y-auto hide-scrollbar">
      <header>
        <p className="text-[6px] text-zinc-500 tracking-widest uppercase mb-1">— Module · Simulateur Immobilier</p>
        <h1 className="text-sm font-bold">Construisez votre <span className="text-blue-500">projet immobilier.</span></h1>
      </header>

      <div className="flex gap-4 border-b border-white/5 pb-2 text-[7px] font-bold uppercase tracking-widest">
         <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Capacité</span>
         <span className="text-zinc-500 py-1">Rentabilité</span>
         <span className="text-zinc-500 py-1">Fiscalité</span>
      </div>

      <div className="flex flex-col gap-3">
         {/* Inputs Crédit et Apport */}
         <div className="bg-[#111113] border border-white/5 rounded-xl p-3 space-y-3">
            <div>
               <p className="text-[6px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Crédits en cours</p>
               <div className="bg-[#0a0a0c] border border-white/10 rounded-lg p-2 text-[10px] font-bold">0</div>
            </div>
            <div>
               <p className="text-[6px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Apport Personnel</p>
               <div className="bg-[#0a0a0c] border border-emerald-500/30 rounded-lg p-2 text-[10px] font-bold text-emerald-400">40 000</div>
            </div>
         </div>

         {/* Conditions Banque */}
         <div className="bg-[#111113] border border-white/5 rounded-xl p-3">
            <p className="text-[6px] font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5"><div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center"><Building size={10}/></div> Conditions Banque</p>
            <div className="space-y-4">
               <div>
                   <div className="flex justify-between items-center text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2"><span>Durée</span><span className="text-white text-[10px]">25 <span className="text-[6px] text-zinc-500 lowercase">ans</span></span></div>
                   <div className="w-full h-1 bg-zinc-800 rounded relative">
                      <div className="absolute left-0 top-0 h-full w-[80%] bg-white rounded">
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-black" />
                      </div>
                   </div>
               </div>
               <div>
                   <div className="flex justify-between items-center text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2"><span>Taux</span><span className="text-white text-[10px]">3.8 <span className="text-[6px] text-zinc-500">%</span></span></div>
                   <div className="w-full h-1 bg-zinc-800 rounded relative">
                      <div className="absolute left-0 top-0 h-full w-[40%] bg-white rounded">
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-black" />
                      </div>
                   </div>
               </div>
            </div>
         </div>

         {/* Résultat Enveloppe d'achat */}
         <div className="bg-gradient-to-br from-[#111113] to-[#0a0a0c] border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden mb-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 w-full">
                <div className="flex items-center justify-center gap-2 mb-2">
                   <div className="h-px w-4 bg-blue-500/30" />
                   <p className="text-[6px] text-blue-400 font-bold tracking-widest uppercase">Enveloppe d'achat globale</p>
                   <div className="w-3 h-3 rounded-full border border-white/10 flex items-center justify-center text-[5px] text-zinc-500">i</div>
                   <div className="h-px w-4 bg-white/10" />
                </div>
                
                <p className="text-[5px] text-zinc-500 uppercase tracking-widest mb-4">Apport + Prêt Maximum</p>
                <p className="text-4xl font-black tracking-tighter mb-8">260 000 €</p>

                <div className="w-full">
                   <div className="flex h-1.5 rounded-full overflow-hidden mb-3">
                      <div className="bg-blue-500 h-full w-[85%]" />
                      <div className="bg-emerald-500 h-full w-[15%]" />
                   </div>
                   <div className="flex justify-between text-left">
                      <div>
                         <div className="text-[6px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-blue-500"/> Prêt Bancaire</div>
                         <p className="text-[11px] font-black">220 000 €</p>
                         <p className="text-[5px] text-zinc-600 mt-0.5">25 ans · 3.8% · 1 138 €/mois</p>
                      </div>
                      <div className="text-right">
                         <div className="text-[6px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5 flex items-center justify-end gap-1">Apport <div className="w-1 h-1 rounded-full bg-emerald-500"/></div>
                         <p className="text-[11px] font-black text-emerald-400">40 000 €</p>
                         <p className="text-[5px] text-zinc-600 mt-0.5">15% du total</p>
                      </div>
                   </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function NexusStocksScreen() {
  return (
    <div className="h-full w-full bg-[#0a0a0c] p-4 text-white font-sans flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
         <Brain size={24} className="text-white" />
      </div>
      <h1 className="text-lg font-black tracking-tight mb-2">Nexus IA & Analyses</h1>
      <p className="text-[10px] text-zinc-400 max-w-[200px] leading-relaxed">
        Connectez vos portefeuilles et laissez notre IA analyser votre exposition sectorielle et vos frais cachés.
      </p>
      <button className="mt-6 bg-white text-black text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg">
         Lancer l'analyse
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//   ANIMATED BACKGROUND ET AUTRES COMPOSANTS SIMPLES
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedBackground({ mouseX, mouseY }: { mouseX: MotionValue<number>; mouseY: MotionValue<number>; }) {
  const x1 = useTransform(mouseX, [-1, 1], [-40, 40]);
  const y1 = useTransform(mouseY, [-1, 1], [-40, 40]);
  const x2 = useTransform(mouseX, [-1, 1], [30, -30]);
  const y2 = useTransform(mouseY, [-1, 1], [30, -30]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[#020203]" />
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <motion.div style={{ x: x1, y: y1 }} className="absolute -top-40 -right-40 w-[600px] h-[600px]">
        <div className="w-full h-full rounded-full blur-[140px]" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)" }} />
      </motion.div>
      <motion.div style={{ x: x2, y: y2 }} className="absolute top-1/3 -left-40 w-[550px] h-[550px]">
        <div className="w-full h-full rounded-full blur-[140px]" style={{ background: "radial-gradient(circle, rgba(20,184,166,0.15), transparent 70%)" }} />
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}

function HeroSection({ mouseX, mouseY }: { mouseX: MotionValue<number>; mouseY: MotionValue<number>; }) {
  const phoneX = useTransform(mouseX, [-1, 1], [15, -15]);
  const phoneY = useTransform(mouseY, [-1, 1], [15, -15]);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const phoneScrollY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <section ref={heroRef} className="relative pt-36 md:pt-44 pb-20 md:pb-32 px-4 md:px-8">
      {/* Modification de la grille : le texte prend 5 colonnes, le visuel prend 7 colonnes pour éviter tout chevauchement */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        <div className="lg:col-span-5 relative z-30">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Tout votre patrimoine, une seule app</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tighter leading-[1.0] text-white">
              Votre patrimoine,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">enfin clair.</span>
            </h1>
            <p className="mt-6 text-zinc-400 text-lg max-w-xl leading-relaxed">Nexus agrège vos actifs, structure votre budget et projette votre avenir sur 40 ans. <span className="text-white font-semibold">100 % chiffré.</span></p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/login" className="h-14 px-8 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_30px_-8px_rgba(16,185,129,0.6)]">Démarrer gratuitement <ArrowRight size={16} /></Link>
              <Link href="/login" className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center hover:bg-white/10 transition-colors">Connexion</Link>
            </div>
          </motion.div>
        </div>

        <motion.div style={{ x: phoneX, y: phoneScrollY }} className="lg:col-span-7 relative flex justify-center lg:justify-end z-20">
          <motion.div style={{ y: phoneY }} className="w-full">
             <InteractiveAppPreview />
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}

function FeatureTab({ feature, active, onClick }: { feature: any; active: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick} className={`w-full text-left rounded-2xl border p-5 transition-all ${active ? "bg-white/5 border-white/15 shadow-lg" : "bg-white/[0.02] border-white/5 hover:bg-white/5"}`}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${feature.color}15`, color: feature.color, border: `1px solid ${feature.color}30` }}>
          <feature.icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-base ${active ? "text-white" : "text-zinc-400"}`}>{feature.title}</h3>
          <AnimatePresence initial={false}>
            {active && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-zinc-500 text-sm mt-2 leading-relaxed overflow-hidden">
                {feature.desc}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
}

function FloatingMockup({ feature }: { feature: any }) {
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div key={feature.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, y: [0, -15, 0] }} exit={{ opacity: 0, scale: 0.95 }} transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }} className="flex justify-center">
          <IPhoneMockup>
            <div className="h-full relative bg-[#0a0a0c] overflow-y-auto hide-scrollbar">
              <feature.mockup />
            </div>
          </IPhoneMockup>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function IPhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[300px] sm:w-[340px]">
      <div className="relative rounded-[55px] p-[3px] bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-2xl">
        <div className="relative rounded-[52px] bg-black overflow-hidden aspect-[9/19.5]">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-30 flex items-center justify-end px-2 gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
             <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
          </div>
          <div className="absolute inset-0 pt-10 pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string; }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-3 block">{kicker}</span>
      <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">{title}</h2>
      <p className="mt-4 text-zinc-500 text-lg">{subtitle}</p>
    </div>
  );
}

function PricingCard({ tier, price, period, desc, features, cta, ctaHref, highlighted = false }: any) {
  return (
    <div className={`rounded-3xl p-8 border transition-all ${highlighted ? "bg-emerald-950/20 border-emerald-500/30 shadow-[0_10px_40px_rgba(16,185,129,0.15)]" : "bg-zinc-950/40 border-white/10"}`}>
      <h3 className="text-white font-bold">{tier}</h3>
      <div className="mt-4 flex items-end gap-1">
        <span className="text-5xl font-black text-white">{price}€</span>
        <span className="text-zinc-600 text-sm mb-2">{period}</span>
      </div>
      <p className="text-zinc-500 text-sm mt-3">{desc}</p>
      <Link href={ctaHref} className={`mt-6 w-full h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-transform active:scale-95 hover:scale-[1.02] ${highlighted ? "bg-white text-black" : "bg-white/5 text-white"}`}>{cta}</Link>
      <div className="mt-7 space-y-3">
        {features.map((f: string, i: number) => (
          <div key={i} className="flex gap-2 text-sm text-zinc-400"><Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />{f}</div>
        ))}
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-6 py-5 flex items-center justify-between text-left">
        <span className="text-white font-bold text-sm">{q}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
             <p className="px-6 pb-5 text-zinc-500 text-sm leading-relaxed">{a}</p>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SecurityVisual() {
  return (
    <div className="relative aspect-square max-w-md mx-auto">
      <div className="absolute inset-0 rounded-full border border-emerald-500/10" />
      <div className="absolute inset-16 rounded-full border border-emerald-500/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_60%)]" />

      <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} className="absolute inset-0">
        {[
          { label: "AES‑256", angle: -30 },
          { label: "RGPD", angle: 60 },
          { label: "Hébergement UE", angle: 150 },
          { label: "Zero‑Knowledge", angle: 240 },
        ].map((tag, i) => {
          const rad = (tag.angle * Math.PI) / 180;
          const x = (50 + 45 * Math.cos(rad)).toFixed(2);
          const y = (50 + 45 * Math.sin(rad)).toFixed(2);
          return (
            <motion.div
              key={i}
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-emerald-500/30 backdrop-blur-md"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="text-[10px] font-bold text-emerald-400">{tag.label}</span>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-[0_20px_60px_rgba(16,185,129,0.5)]">
          <Lock size={48} className="text-white" />
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   DONNÉES STATIQUES
// ═══════════════════════════════════════════════════════════════════════════

const FEATURES = [
  { id: "dashboard", icon: LayoutDashboard, title: "Tableau de bord 360", desc: "Tout consolidé, toujours à jour. Une vue panoramique de votre richesse en temps réel.", color: "#10b981", mockup: DashboardScreen },
  { id: "patrimoine", icon: FolderOpen, title: "Suivi des actifs", desc: "Inventaire complet. Bourse, immo, cash. Retrouvez tout votre patrimoine au même endroit.", color: "#10b981", mockup: PatrimoineScreen },
  { id: "budget", icon: PieChart, title: "Budget Base Zéro", desc: "Besoin, envie, épargne. Chaque euro a un rôle précis pour optimiser votre capacité d'épargne.", color: "#eab308", mockup: BudgetScreen },
  { id: "projection", icon: TrendingUp, title: "Bilan Patrimonial", desc: "Découvrez précisément quand vous atteignez l'indépendance financière avec notre simulateur d'intérêts composés.", color: "#a855f7", mockup: ProjectionScreen },
  { id: "simulateur", icon: Building, title: "Projet Immobilier", desc: "De la capacité d'emprunt au dossier bancaire et calcul de rentabilité LMNP/SCI.", color: "#3b82f6", mockup: SimulateurScreen },
  { id: "analyses", icon: Brain, title: "Analyse & IA", desc: "Audit de portefeuille, optimisation des frais et conseils d'allocation générés par IA.", color: "#a855f7", mockup: NexusStocksScreen },
];

const STEPS = [
  { num: "01", title: "Compte gratuit", desc: "Email, mot de passe, c'est tout. Aucune connexion bancaire requise pour démarrer." },
  { num: "02", title: "Saisie rapide", desc: "Ajoutez vos comptes et biens immobiliers en quelques clics via notre interface fluide." },
  { num: "03", title: "Pilotez", desc: "Tableau de bord, budget, projections : tout est calculé et synchronisé automatiquement." },
];

const VALUES = [
  { icon: Lock, title: "Chiffrement AES-256", desc: "Vos chiffres ne transitent jamais en clair. Vos données vous appartiennent intégralement." },
  { icon: ShieldCheck, title: "Conforme RGPD", desc: "Hébergement strict en Europe, droit à l'oubli instantané et respect total de votre vie privée." },
  { icon: Zap, title: "Zéro revente de données", desc: "Notre seul revenu est votre abonnement. Pas de publicité, pas de tiers, aucune monétisation cachée." },
];

const FAQ = [
  { q: "Dois-je connecter ma banque ?", a: "Non. Nexus est volontairement déconnecté pour garantir votre souveraineté. Vous pouvez synchroniser manuellement ou utiliser nos imports sécurisés." },
  { q: "Mes données sont-elles vraiment privées ?", a: "Oui. Aucun employé de Nexus ne peut consulter vos montants grâce au chiffrement côté client. L'architecture est pensée Zero-Knowledge." },
  { q: "Quelles enveloppes sont simulées dans les projections ?", a: "Nous gérons nativement le PEA, CTO, Assurance-Vie, PER, Livrets réglementés et Immobilier (Physique & Papier) avec la fiscalité française à jour." },
];