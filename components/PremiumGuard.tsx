"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Lock, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumGuardProps {
  isPro: boolean;
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function PremiumGuard({ isPro, children, title = "Fonctionnalité Premium", description = "Passez à la vitesse supérieure pour débloquer cet outil." }: PremiumGuardProps) {
  // ✅ Si l'utilisateur est PRO, on affiche le contenu normalement
  if (isPro) {
    return <>{children}</>;
  }

  // ✅ SÉCURITÉ : Le contenu premium n'est PAS rendu dans le DOM si !isPro
  return (
    <div className="relative w-full h-full min-h-[400px] rounded-[32px] overflow-hidden group">
      
      {/* Paywall (Overlay) — Aucun contenu premium dans le DOM */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#09090b]/50 via-[#09090b]/80 to-[#09090b]">
        
        {/* Fond décoratif flouté (faux contenu) */}
        <div className="absolute inset-0 -z-10 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
          <div className="absolute top-10 left-10 w-32 h-4 bg-white/10 rounded-full" />
          <div className="absolute top-10 right-10 w-20 h-4 bg-white/10 rounded-full" />
          <div className="absolute top-20 left-10 w-48 h-3 bg-white/5 rounded-full" />
          <div className="absolute top-28 left-10 w-40 h-3 bg-white/5 rounded-full" />
          <div className="absolute top-40 left-10 w-64 h-24 bg-white/5 rounded-xl" />
          <div className="absolute top-40 right-10 w-48 h-24 bg-white/5 rounded-xl" />
        </div>

        <div className="bg-zinc-900/90 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 shadow-2xl max-w-md w-full flex flex-col items-center transform transition-all hover:scale-105 duration-300">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-50 rounded-full animate-pulse"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/20">
                    <Lock className="text-white w-8 h-8" />
                </div>
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-full border-2 border-[#09090b]">
                    <Crown size={12} strokeWidth={3} />
                </div>
            </div>
            
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                {title}
            </h3>
            
            <p className="text-zinc-400 mb-8 leading-relaxed text-sm">
                {description}
            </p>

            <Link href="/tarifs" className="w-full">
                <Button className="w-full h-14 bg-white text-black font-black uppercase tracking-wide rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
                    <Sparkles size={18} className="text-purple-600"/> Débloquer maintenant
                </Button>
            </Link>
            
            <p className="text-[10px] text-zinc-600 mt-4 uppercase tracking-widest font-bold">À partir de 1,99 € / mois</p>
        </div>

      </div>
    </div>
  );
}