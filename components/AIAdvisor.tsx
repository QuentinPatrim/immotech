"use client";

import { useState, useEffect } from "react";
import { Sparkles, Bot, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AIAdvisor() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState("");

  // Fonction magique pour simuler l'IA
  const generateAdvice = () => {
    setLoading(true);
    setAnalysis(null);
    setDisplayedText("");

    // 1. Récupération des données réelles
    const saved = localStorage.getItem("myAssets");
    const assets = saved ? JSON.parse(saved) : [];
    
    // 2. Analyse des données (Algorithme "Heuristique")
    const total = assets.reduce((acc: number, item: any) => acc + item.value, 0);
    const cash = assets.filter((a: any) => a.type === "Cash").reduce((acc: number, item: any) => acc + item.value, 0);
    const crypto = assets.filter((a: any) => a.type === "Crypto").reduce((acc: number, item: any) => acc + item.value, 0);
    const immo = assets.filter((a: any) => a.type === "Immobilier").reduce((acc: number, item: any) => acc + item.value, 0);

    let message = "";

    // Scénario 0 : Pas d'actifs
    if (total === 0) {
        message = "Je ne peux pas encore vous conseiller. Commencez par ajouter des actifs dans l'onglet 'Patrimoine' pour que j'analyse votre profil de risque.";
    } 
    // Scénario 1 : Trop de Cash (> 30%)
    else if ((cash / total) > 0.3) {
        message = `Attention, vous gardez ${Math.round((cash/total)*100)}% de votre patrimoine en liquidités. En période d'inflation, vous perdez du pouvoir d'achat chaque jour. Je vous suggère d'investir progressivement ce surplus en Bourse (DCA) ou en Immobilier.`;
    }
    // Scénario 2 : Trop de Crypto (> 40%)
    else if ((crypto / total) > 0.4) {
        message = `Votre exposition aux crypto-monnaies est très élevée (${Math.round((crypto/total)*100)}%). C'est une stratégie audacieuse mais risquée. Pensez à sécuriser vos plus-values en les réallouant vers des actifs plus stables comme l'immobilier locatif.`;
    }
    // Scénario 3 : Trop d'Immobilier (> 80%)
    else if ((immo / total) > 0.8) {
        message = `Vous êtes un investisseur "Pierre". C'est solide, mais attention à la liquidité. Si vous avez besoin d'argent rapidement, vendre un bien prend du temps. Pensez à diversifier avec une assurance-vie ou un PEA pour plus de souplesse.`;
    }
    // Scénario 4 : Équilibré
    else {
        message = "Félicitations. Votre allocation d'actifs est remarquablement équilibrée. Vous combinez sécurité (Immo) et performance. Continuez à surveiller vos frais bancaires et optimisez votre fiscalité.";
    }

    // 3. Simulation du temps de réponse (2 secondes)
    setTimeout(() => {
        setLoading(false);
        setAnalysis(message);
    }, 2000);
  };

  // Effet machine à écrire (Typewriter)
  useEffect(() => {
    if (analysis) {
      let i = 0;
      const timer = setInterval(() => {
        setDisplayedText((prev) => prev + analysis.charAt(i));
        i++;
        if (i >= analysis.length) clearInterval(timer);
      }, 30); // Vitesse de frappe (30ms par lettre)
      return () => clearInterval(timer);
    }
  }, [analysis]);

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl overflow-hidden">
      <CardHeader className="border-b border-zinc-800/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
          <Bot className="h-6 w-6 text-emerald-500" />
          ImmoTech AI <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Bêta</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Zone de texte de l'IA */}
        <div className="min-h-[120px] rounded-xl bg-zinc-950/50 border border-zinc-800 p-4 font-mono text-sm leading-relaxed text-zinc-300">
            {!loading && !analysis && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                    <Sparkles size={20} />
                    <p>Cliquez sur "Générer" pour lancer l'analyse.</p>
                </div>
            )}
            
            {loading && (
                <div className="flex items-center gap-2 text-emerald-500 animate-pulse">
                    <Bot size={18} />
                    <span>Analyse de votre portefeuille en cours...</span>
                </div>
            )}

            {!loading && analysis && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span className="text-emerald-500 font-bold mr-2">{">"}</span>
                    {displayedText}
                    <span className="animate-pulse ml-1 inline-block w-2 h-4 bg-emerald-500 align-middle"></span>
                </motion.div>
            )}
        </div>

        {/* Bouton d'action */}
        <Button 
            onClick={generateAdvice} 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-12 relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? "Réflexion..." : "Générer une analyse IA"}
        </Button>

        {/* Disclaimer */}
        <p className="text-[10px] text-zinc-600 text-center">
            Ceci est une simulation basée sur des ratios financiers standards. Ne constitue pas un conseil en investissement.
        </p>
      </CardContent>
    </Card>
  );
}