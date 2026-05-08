"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ArrowLeft, Loader2, Coins, FileText, Download, Building,
  ArrowRight, Gift, Sparkles, Star, Infinity as InfinityIcon,
  Zap, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getAuthHeaders } from "@/lib/apiHelpers";

// ═══════════════════════════════════════════════════════════════════════════
//   NEXUS TARIFS V2 — REFONTE VISUELLE
//   Direction : Cinématique éditorial · Sérénité maîtrisée
//   Modèle : Jetons à l'usage (pay-per-export), logiciel 100% gratuit
//
//   Toute la logique Stripe et auth est INCHANGÉE.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Données des packs ─────────────────────────────────────────────────────
const PACKS = [
  {
    id: "token_1",
    kicker: "Besoin ponctuel",
    price: "0,99",
    tokens: 1,
    pricePerToken: null,
    description: "Idéal pour un export unique sans engagement.",
    features: [
      { icon: Check, label: "1 export PDF au choix", strong: false },
      { icon: FileText, label: "Dossier bancaire ou rapport fiscal", strong: false },
    ],
    accent: "#71717a", // zinc neutre
    highlighted: false,
    cta: "Acheter 1 jeton",
  },
  {
    id: "tokens_5",
    kicker: "Investisseur",
    price: "4,49",
    tokens: 5,
    pricePerToken: "0,89",
    description: "Parfait pour comparer plusieurs scénarios d'investissement avec votre banquier.",
    features: [
      { icon: Check, label: "5 exports PDF au choix", strong: true },
      { icon: Building, label: "Multiples dossiers bancaires", strong: false },
      { icon: FileText, label: "Bilan patrimonial FIRE", strong: false },
    ],
    accent: "#a855f7", // purple
    highlighted: true,
    cta: "Acheter 5 jetons",
    badge: "Populaire",
  },
  {
    id: "tokens_100",
    kicker: "Multi-propriétaire",
    price: "49,99",
    tokens: 100,
    pricePerToken: "0,49",
    description: "L'arsenal complet pour enchaîner les acquisitions et gérer sa fiscalité sans se brider.",
    features: [
      { icon: Check, label: "100 exports PDF", strong: true },
      { icon: InfinityIcon, label: "Sérénité absolue, illimitée", strong: false },
      { icon: Check, label: "Jetons valables à vie", strong: false },
    ],
    accent: "#10b981", // emerald
    highlighted: false,
    cta: "Acheter 100 jetons",
  },
];

const FAQ = [
  {
    q: "Et si je n'ai jamais besoin d'export PDF ?",
    a: "Alors vous ne payez rien. Le logiciel complet — simulations, projections, budget, dashboard — reste 100% gratuit, à vie. Les jetons ne servent qu'à générer un PDF officiel pour la banque ou les impôts.",
  },
  {
    q: "Combien de jetons un investisseur utilise-t-il en moyenne ?",
    a: "Pour un projet immobilier classique : 1 dossier bancaire, parfois 2-3 si vous comparez. Pour la déclaration fiscale annuelle : 1 rapport. La plupart de nos utilisateurs consomment entre 3 et 8 jetons par an.",
  },
  {
    q: "Pourquoi pas un abonnement mensuel comme tout le monde ?",
    a: "Parce que nous trouvons malhonnête de facturer chaque mois un service que vous n'utilisez peut-être que 2 fois par an. Avec les jetons, vous payez uniquement la valeur livrée. C'est un choix de transparence.",
  },
  {
    q: "Les jetons expirent-ils vraiment jamais ?",
    a: "Jamais. Achetez 100 jetons aujourd'hui, utilisez-les sur 10 ans si vous voulez. Aucune date limite, aucune dégradation. C'est notre engagement écrit dans nos CGV.",
  },
  {
    q: "Que se passe-t-il avec mes 3 jetons offerts à l'inscription ?",
    a: "Ils sont crédités automatiquement sur votre compte dès la création. Aucune carte requise, aucun engagement. Vous pouvez tester nos exports immédiatement, et n'acheter un pack qu'ensuite si le service vous plaît.",
  },
];

export default function Tarifs() {
  const router = useRouter();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  // ─── Logique Stripe : INCHANGÉE ─────────────────────────────────────────
  const handleCheckout = async (packType: string) => {
    setLoadingPack(packType);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          email: session.user.email,
          userId: session.user.id,
          packType: packType,
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error("Erreur Stripe:", error);
        alert("Erreur lors de l'initialisation du paiement.");
        return;
      }

      if (url) window.location.href = url;
    } catch (error) {
      console.error("Erreur paiement:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans relative overflow-hidden selection:bg-purple-500/30 selection:text-white">

      {/* ── ATMOSPHÈRE DE FOND ─────────────────────────────────────────────
          Ambiance violet/indigo pour la page tarifs (cohérent avec
          la DA des autres pages : chaque module a sa couleur dominante)
         ─────────────────────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-screen pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-50"
          style={{
            background: "radial-gradient(ellipse at center, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.04) 30%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute top-[60vh] -right-40 w-[500px] h-[500px] opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute top-[120vh] -left-40 w-[500px] h-[500px] opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Grille subtile (signature DA) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* ── NAVBAR : bouton retour dans le flux (corrige le pb mobile) ───── */}
      <header className="relative z-10 px-4 md:px-8 pt-6 pb-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all backdrop-blur-sm group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold">Retour</span>
          </button>

          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.28em]">
            <Coins size={12} className="text-purple-400" />
            <span>Tarifs · Jetons Nexus</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 md:px-8 pb-20">
        <div className="max-w-6xl mx-auto">

          {/* ══════════════════════════════════════════════════════════════
               HEADER ÉDITORIAL — Hero
             ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-4xl mx-auto mt-12 md:mt-20 mb-14 md:mb-20"
          >
            {/* Kicker éditorial */}
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="block w-6 h-px bg-purple-400/60" />
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em]">
                Sans abonnement · Paiement à l'usage
              </span>
              <span className="block w-6 h-px bg-purple-400/60" />
            </div>

            {/* Titre principal */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1.0] mb-6">
              Le logiciel est{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-400">
                gratuit
              </span>
              .
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-400 to-indigo-400">
                Payez uniquement l'export
              </span>
              <span className="text-purple-400">.</span>
            </h1>

            <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light">
              Toutes nos fonctionnalités de simulation et de suivi sont{" "}
              <span className="text-white font-semibold">100% gratuites</span>. Utilisez nos{" "}
              <span className="text-purple-300 font-semibold">jetons Nexus</span> uniquement quand vous avez besoin d'un PDF officiel pour la banque ou les impôts.
            </p>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
               BANNIÈRE 3 JETONS OFFERTS — refondue
             ══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="max-w-3xl mx-auto mb-12 md:mb-16"
          >
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
              <div className="absolute inset-0 bg-emerald-500/[0.04] backdrop-blur-sm" />
              <div className="absolute inset-0 border border-emerald-500/15 rounded-2xl" />

              {/* Halo discret */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[40px] bg-emerald-500/15 pointer-events-none" />

              <div className="relative z-10 p-4 md:p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <Gift size={18} className="text-emerald-300" />
                </div>
                <div className="flex-1">
                  <h4 className="text-emerald-300 font-bold text-sm flex items-center gap-2 justify-center sm:justify-start mb-0.5">
                    <span>Nouveau sur Nexus ?</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.22em] px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                      Offert
                    </span>
                  </h4>
                  <p className="text-emerald-200/60 text-xs leading-relaxed">
                    Créez votre compte et recevez automatiquement{" "}
                    <span className="text-emerald-300 font-bold">3 jetons gratuits</span>{" "}
                    pour tester nos exports — sans carte bancaire.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════
               CARTES DE TARIFICATION
               ⚠️ Sur mobile : le pack populaire passe en premier
             ══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-20 md:mb-28">
            {PACKS.map((pack, idx) => (
              <PricingCard
                key={pack.id}
                pack={pack}
                index={idx}
                loading={loadingPack === pack.id}
                disabled={loadingPack !== null}
                onCheckout={() => handleCheckout(pack.id)}
              />
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════
               COMPARAISON MODÈLE — vs abonnement classique
             ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20 md:mb-28"
          >
            <div className="text-center max-w-3xl mx-auto mb-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
                <span className="block w-6 h-px bg-zinc-700" />
                Pourquoi des jetons ?
                <span className="block w-6 h-px bg-zinc-700" />
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                Vous payez ce que vous{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-400">
                  utilisez réellement
                </span>
                <span className="text-emerald-400">.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {/* Côté abonnement classique */}
              <div className="relative rounded-[24px] p-6 md:p-7 bg-zinc-900/30 backdrop-blur-sm border border-rose-500/15 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.28em] mb-3">
                  Ailleurs · Abonnement classique
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                  Vous payez chaque mois, même les mois où vous n'utilisez pas l'app.
                </p>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-zinc-500">9€/mois × 12 mois</span>
                    <span className="text-rose-300 font-black tabular-nums">108€/an</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-zinc-500">Si vous n'utilisez rien</span>
                    <span className="text-rose-300 font-black tabular-nums">108€ perdus</span>
                  </div>
                  <div className="h-px bg-white/5 my-2" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Coût annuel moyen</span>
                    <span className="text-2xl font-black text-rose-300 tabular-nums">108€</span>
                  </div>
                </div>
              </div>

              {/* Côté Nexus jetons */}
              <div className="relative rounded-[24px] p-6 md:p-7 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-zinc-900/30 to-teal-950/20 backdrop-blur-sm" />
                <div className="absolute inset-0 border border-emerald-500/25 rounded-[24px]" />
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[50px] bg-emerald-500/15 pointer-events-none" />

                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-[0.28em] mb-3 flex items-center gap-2">
                    <Sparkles size={11} />
                    Avec Nexus · Pay-per-export
                  </p>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                    Vous payez uniquement les exports PDF dont vous avez réellement besoin.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-400">Pack 5 jetons (achat unique)</span>
                      <span className="text-emerald-300 font-black tabular-nums">4,49€</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-400">Aucun engagement, aucune expiration</span>
                      <span className="text-emerald-300 font-black">∞</span>
                    </div>
                    <div className="h-px bg-white/5 my-2" />
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Coût annuel moyen</span>
                      <span className="text-2xl font-black text-emerald-300 tabular-nums">4-9€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-zinc-600 mt-6 max-w-xl mx-auto">
              Économie moyenne par rapport à un abonnement annuel : <span className="text-emerald-300 font-bold">~95%</span> pour un investisseur particulier.
            </p>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
               COMMENT ÇA MARCHE — refondu en éditorial
             ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20 md:mb-28"
          >
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
                <span className="block w-6 h-px bg-zinc-700" />
                Mode d'emploi
                <span className="block w-6 h-px bg-zinc-700" />
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                Le principe des jetons Nexus<span className="text-purple-400">.</span>
              </h2>
            </div>

            {/* 3 étapes connectées par un trait */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 relative max-w-5xl mx-auto">
              {/* Trait connecteur entre les 3 étapes */}
              <div className="hidden md:block absolute top-12 left-[18%] right-[18%] h-px bg-gradient-to-r from-yellow-400/30 via-purple-400/30 to-emerald-400/30" />

              {[
                { num: "01", icon: Coins,    label: "Achetez un pack",    desc: "Fini l'abonnement mensuel oublié. Vous achetez un pack de jetons valables à vie, sans renouvellement automatique.", accent: "#eab308" },
                { num: "02", icon: Building, label: "Simulez gratuitement", desc: "Créez autant de projets immobiliers, boursiers et fiscaux que vous voulez dans le logiciel, sans débourser un centime.", accent: "#a855f7" },
                { num: "03", icon: Download, label: "Dépensez à l'export",  desc: "Dépensez 1 jeton uniquement au moment d'exporter votre rapport PDF prêt pour le banquier ou le comptable.", accent: "#10b981" },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative"
                >
                  {/* Numéro éditorial */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className="relative w-24 h-24 rounded-3xl flex items-center justify-center mb-5 backdrop-blur-sm"
                      style={{
                        backgroundColor: `${step.accent}10`,
                        borderWidth: "1px",
                        borderColor: `${step.accent}25`,
                        boxShadow: `0 0 32px -8px ${step.accent}50`,
                      }}
                    >
                      {/* Numéro en gros au centre */}
                      <span
                        className="text-3xl font-black tabular-nums"
                        style={{ color: step.accent }}
                      >
                        {step.num}
                      </span>
                      {/* Petite icône en bas-droite */}
                      <div
                        className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-[#0a0a0c] border flex items-center justify-center"
                        style={{ borderColor: `${step.accent}30`, color: step.accent }}
                      >
                        <step.icon size={14} strokeWidth={1.8} />
                      </div>
                    </div>
                    <h4 className="font-black text-white text-base mb-2 tracking-tight">
                      {step.label}<span style={{ color: step.accent }}>.</span>
                    </h4>
                    <p className="text-zinc-500 text-sm leading-relaxed max-w-[280px]">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
               FAQ
             ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto mb-20 md:mb-28"
          >
            <div className="text-center mb-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
                <span className="block w-6 h-px bg-zinc-700" />
                FAQ
                <span className="block w-6 h-px bg-zinc-700" />
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Les questions qu'on nous pose<span className="text-purple-400">.</span>
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <FAQItem key={i} {...item} delay={i * 0.05} />
              ))}
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
               CTA FINAL — apothéose
             ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative rounded-[40px] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/80 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-zinc-900/60 to-indigo-950/30 backdrop-blur-sm" />
              <div className="absolute inset-0 border border-purple-500/25 rounded-[40px]" />

              {/* Halos qui pulsent */}
              <motion.div
                animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[100px] bg-purple-500/30 pointer-events-none"
              />

              {/* Cercles décoratifs */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 600 400">
                <circle cx="300" cy="200" r="200" fill="none" stroke="#a855f7" strokeWidth="0.5" />
                <circle cx="300" cy="200" r="280" fill="none" stroke="#a855f7" strokeWidth="0.5" />
              </svg>

              <div className="relative z-10 p-8 md:p-14 text-center">
                <Sparkles className="w-10 h-10 text-purple-300 mx-auto mb-5" />
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                  Prêt à reprendre le contrôle<br />
                  de votre patrimoine<span className="text-purple-400">?</span>
                </h2>
                <p className="text-zinc-400 text-base mt-3 max-w-xl mx-auto font-light leading-relaxed">
                  3 jetons offerts à l'inscription. Aucune carte requise. Le logiciel reste gratuit à vie.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                  <a
                    href="/login"
                    className="group relative inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white text-black font-black uppercase tracking-[0.22em] text-xs hover:scale-[1.02] active:scale-95 transition-all overflow-hidden shadow-[0_8px_40px_-8px_rgba(255,255,255,0.4)]"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-300/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="relative">Créer mon compte gratuit</span>
                    <ArrowRight size={14} className="relative" />
                  </a>
                </div>

                <p className="text-[10px] text-zinc-600 mt-6 uppercase tracking-[0.22em]">
                  Sans engagement · Sans publicité · Sans frais cachés
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   PRICING CARD
// ═══════════════════════════════════════════════════════════════════════════

function PricingCard({
  pack, index, loading, disabled, onCheckout,
}: {
  pack: typeof PACKS[number];
  index: number;
  loading: boolean;
  disabled: boolean;
  onCheckout: () => void;
}) {
  // Sur mobile, le pack populaire (index 1) passe en premier visuellement
  const orderClass = pack.highlighted ? "order-first md:order-none" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`relative ${orderClass} ${pack.highlighted ? "md:scale-[1.03]" : ""}`}
    >
      {/* Badge "Populaire" pour le pack hightlighted */}
      {pack.highlighted && pack.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.22em] text-black"
            style={{
              background: `linear-gradient(135deg, ${pack.accent}, #c084fc)`,
              boxShadow: `0 0 24px -4px ${pack.accent}`,
            }}
          >
            <Star size={10} fill="currentColor" />
            {pack.badge}
          </div>
        </div>
      )}

      <div className="relative rounded-[28px] overflow-hidden h-full flex flex-col">
        {/* Liseré dégradé top + halo */}
        <div
          className="absolute inset-x-0 top-0 h-px z-10"
          style={{
            background: pack.highlighted
              ? `linear-gradient(90deg, transparent, ${pack.accent}, transparent)`
              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
          }}
        />

        {/* Fond verre dépoli */}
        {pack.highlighted ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950/50 via-zinc-900/60 to-indigo-950/30 backdrop-blur-md" />
            <div
              className="absolute inset-0 rounded-[28px]"
              style={{ borderWidth: "1px", borderColor: `${pack.accent}40` }}
            />
            {/* Halo qui pulse pour le pack populaire */}
            <motion.div
              animate={{ opacity: [0.25, 0.4, 0.25], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-[80px] pointer-events-none"
              style={{ backgroundColor: `${pack.accent}40` }}
            />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-[28px]" />
            <div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[50px] pointer-events-none opacity-30"
              style={{ backgroundColor: pack.accent }}
            />
          </>
        )}

        {/* Contenu */}
        <div className="relative z-10 p-7 md:p-8 flex flex-col h-full">
          {/* Kicker */}
          <p
            className="text-[10px] font-black uppercase tracking-[0.28em] mb-4"
            style={{ color: pack.accent }}
          >
            {pack.kicker}
          </p>

          {/* Prix */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-5xl font-black text-white tracking-tighter tabular-nums">
              {pack.price}
              <span className="text-2xl">€</span>
            </span>
          </div>

          {/* Badge jetons */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold w-fit mb-2"
            style={{
              backgroundColor: `${pack.accent}15`,
              borderWidth: "1px",
              borderColor: `${pack.accent}30`,
              color: pack.accent,
            }}
          >
            <Coins size={12} />
            {pack.tokens} jeton{pack.tokens > 1 ? "s" : ""}
          </div>

          {/* Prix par jeton */}
          {pack.pricePerToken && (
            <p
              className="text-[10px] font-black uppercase tracking-[0.22em] mt-2"
              style={{ color: pack.accent }}
            >
              Soit {pack.pricePerToken}€ / jeton
            </p>
          )}

          {/* Description */}
          <p className="text-zinc-400 text-xs mt-4 leading-relaxed font-light">
            {pack.description}
          </p>

          {/* Filet horizontal */}
          <div
            className="h-px my-6"
            style={{ background: `linear-gradient(90deg, ${pack.accent}40, transparent)` }}
          />

          {/* Features */}
          <ul className="space-y-3 mb-8 flex-1">
            {pack.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div
                  className="p-1 rounded-full shrink-0 mt-0.5"
                  style={{
                    backgroundColor: feature.strong ? pack.accent : `${pack.accent}25`,
                    color: feature.strong ? "#000" : pack.accent,
                  }}
                >
                  <feature.icon size={9} strokeWidth={3} />
                </div>
                <span className={`text-xs leading-relaxed ${feature.strong ? "text-white font-bold" : "text-zinc-300 font-medium"}`}>
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            onClick={onCheckout}
            disabled={disabled}
            className={`group/btn relative w-full h-12 font-black uppercase tracking-[0.22em] text-[10px] rounded-xl transition-all hover:scale-[1.02] active:scale-95 overflow-hidden ${
              pack.highlighted
                ? "bg-white text-black hover:bg-zinc-100 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.5)]"
                : "text-white"
            }`}
            style={
              !pack.highlighted
                ? {
                    backgroundColor: `${pack.accent}10`,
                    borderWidth: "1px",
                    borderColor: `${pack.accent}30`,
                  }
                : undefined
            }
          >
            {pack.highlighted && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-300/40 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  {pack.cta}
                  {pack.highlighted && <ArrowRight size={12} />}
                </>
              )}
            </span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   FAQ ITEM
// ═══════════════════════════════════════════════════════════════════════════

function FAQItem({ q, a, delay = 0 }: { q: string; a: string; delay?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="relative rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-white/[0.06] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-white font-bold text-sm">{q}</span>
        <ChevronDown
          size={16}
          className={`text-zinc-500 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-purple-400" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-white/5">
              <p className="text-zinc-400 text-sm leading-relaxed font-light">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}