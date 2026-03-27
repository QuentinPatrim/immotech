"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Zap, Shield, Crown, ArrowLeft, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getAuthHeaders } from "@/lib/apiHelpers";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  // --- FONCTION DE PAIEMENT ---
  const handleCheckout = async () => {
    setLoading(true);
    try {
        // 1. Vérifier si l'utilisateur est connecté
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            // Si pas connecté, rediriger vers la page de connexion
            window.location.href = "/login"; 
            return;
        }

        // 2. Appel à l'API interne pour créer la session Stripe
        const authHeaders = await getAuthHeaders();
        const response = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ 
                email: session.user.email
            })
        });

        const { url, error } = await response.json();

        if (error) {
            console.error("Erreur Stripe:", error);
            alert("Erreur lors de l'initialisation du paiement.");
            return;
        }

        // 3. Redirection vers la page de paiement sécurisée Stripe
        if (url) window.location.href = url;

    } catch (error) {
        console.error("Erreur paiement:", error);
        alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans p-6 md:p-12 relative overflow-hidden flex flex-col items-center">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors z-20 font-bold bg-black/50 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
        <ArrowLeft size={18} /> Retour
      </Link>

      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10 mt-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Star size={12} fill="currentColor"/> Nexus Premium
        </div>
        <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 leading-none">
          Investissez comme <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">un Professionnel</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
          Débloquez l'analyse fiscale experte, les dossiers bancaires PDF illimités et l'intelligence artificielle pour maximiser vos rendements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full relative z-10">
        
        {/* OFFRE GRATUITE */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-8 rounded-[32px] bg-zinc-900/40 border border-white/5 flex flex-col backdrop-blur-sm">
            <div className="mb-8">
                <h3 className="text-lg font-black text-zinc-400 uppercase tracking-widest mb-2">Discovery</h3>
                <div className="text-5xl font-black text-white">0€</div>
                <p className="text-sm text-zinc-500 mt-4 font-medium">L'essentiel pour structurer son patrimoine.</p>
            </div>
            <div className="h-px bg-white/5 mb-8"></div>
            <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-zinc-300 text-sm font-medium"><div className="p-1 bg-white/10 rounded-full"><Check size={12}/></div> Dashboard Patrimoine</li>
                <li className="flex items-center gap-3 text-zinc-300 text-sm font-medium"><div className="p-1 bg-white/10 rounded-full"><Check size={12}/></div> Simulateur Rentabilité (Basique)</li>
                <li className="flex items-center gap-3 text-zinc-300 text-sm font-medium"><div className="p-1 bg-white/10 rounded-full"><Check size={12}/></div> Gestion Budget</li>
                <li className="flex items-center gap-3 text-zinc-600 text-sm"><X size={16}/> Pas d'analyse Fiscale LMNP/SCI</li>
                <li className="flex items-center gap-3 text-zinc-600 text-sm"><X size={16}/> Pas de Dossier PDF Bancaire</li>
                <li className="flex items-center gap-3 text-zinc-600 text-sm"><X size={16}/> Pas de Sauvegarde Cloud</li>
            </ul>
            <Button className="w-full h-14 bg-zinc-800 text-white font-bold rounded-2xl hover:bg-zinc-700 pointer-events-none opacity-50">Offre Actuelle</Button>
        </motion.div>

        {/* OFFRE PRO (1,99€) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-1 rounded-[34px] bg-gradient-to-b from-purple-500 to-indigo-600 relative group shadow-2xl shadow-purple-900/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-lg flex items-center gap-2">
                <Crown size={12}/> Recommandé
            </div>
            <div className="bg-[#09090b] p-8 rounded-[30px] h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-40 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                
                <div className="mb-8 relative z-10">
                    <h3 className="text-lg font-black text-purple-400 uppercase tracking-widest mb-2">Investor Pro</h3>
                    <div className="text-5xl font-black text-white flex items-end gap-2">1,99€ <span className="text-lg text-zinc-500 font-medium mb-1">/mois</span></div>
                    <p className="text-sm text-purple-200/60 mt-4 font-medium">Rentabilisé dès le premier projet optimisé.</p>
                </div>
                
                <div className="h-px bg-gradient-to-r from-purple-500/50 to-transparent mb-8"></div>

                <ul className="space-y-4 mb-10 flex-1 relative z-10">
                    <li className="flex items-center gap-3 text-white text-sm font-bold"><div className="p-1 bg-purple-500 rounded-full text-white"><Check size={12}/></div> Simulations Illimitées & Sauvegarde</li>
                    <li className="flex items-center gap-3 text-white text-sm font-bold"><div className="p-1 bg-purple-500 rounded-full text-white"><Check size={12}/></div> Fiscalité Expert (LMNP, SCI, Holding)</li>
                    <li className="flex items-center gap-3 text-white text-sm font-bold"><div className="p-1 bg-purple-500 rounded-full text-white"><Check size={12}/></div> Dossier Bancaire PDF Pro</li>
                    <li className="flex items-center gap-3 text-white text-sm font-bold"><div className="p-1 bg-purple-500 rounded-full text-white"><Check size={12}/></div> Analyses IA & Conseils</li>
                </ul>

                {/* BOUTON CONNECTÉ À STRIPE */}
                <Button 
                    onClick={handleCheckout} 
                    disabled={loading} 
                    className="w-full h-14 bg-white text-black font-black uppercase tracking-wide rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg relative z-10"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Devenir Membre Pro"}
                </Button>
                
                <p className="text-[10px] text-center text-zinc-600 mt-4 font-medium">Paiement sécurisé via Stripe. Annulable à tout moment.</p>
            </div>
        </motion.div>

      </div>
    </div>
  );
}