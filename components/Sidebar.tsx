"use client";

import { User, Bell, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const handleReset = () => {
    if (confirm("Voulez-vous vraiment effacer toutes vos données et recommencer l'intro ?")) {
      localStorage.clear();
      window.location.href = "/"; // Recharge la page pour relancer l'onboarding
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Réglages</h1>
        <p className="text-zinc-400">Gérez vos préférences et vos données.</p>
      </div>

      <div className="space-y-4">
        {/* Section Profil */}
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <User size={24} />
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">Mon Profil</h3>
                    <p className="text-zinc-500 text-sm">Données stockées localement.</p>
                </div>
            </div>
            
            <Button 
                onClick={handleReset} 
                variant="destructive" 
                className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20"
            >
                <LogOut size={18} className="mr-2" /> Réinitialiser l'Application
            </Button>
            <p className="text-xs text-zinc-600 mt-3 text-center">
                Cela effacera votre budget et relancera le questionnaire de démarrage.
            </p>
        </div>

        {/* Section Placeholder (Notifications) */}
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl opacity-50 cursor-not-allowed">
             <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <Bell size={20} />
                </div>
                <h3 className="text-zinc-400 font-bold">Notifications (Bientôt)</h3>
            </div>
        </div>

      </div>
    </div>
  );
}