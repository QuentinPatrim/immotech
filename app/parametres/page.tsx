"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { User, Download, Upload, Trash2, Save, Info, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { triggerHaptic } from "@/lib/haptics";

export default function SettingsPage() {
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
        setUserName(JSON.parse(savedProfile).firstName || "");
    }
  }, []);

  // --- ACTIONS ---

  const handleSaveProfile = () => {
    setIsLoading(true);
    triggerHaptic("medium");
    localStorage.setItem("userProfile", JSON.stringify({ firstName: userName }));
    
    setTimeout(() => {
        setIsLoading(false);
        window.location.reload(); 
    }, 800);
  };

  const handleExportData = () => {
    triggerHaptic("light");
    const data = {
        assets: localStorage.getItem("myAssets"),
        budget: localStorage.getItem("myBudget"),
        profile: localStorage.getItem("userProfile"),
        dca: localStorage.getItem("dcaStrategy"),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `immotech_backup_${new Date().toLocaleDateString().replace(/\//g, "-")}.json`;
    a.click();
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.assets) localStorage.setItem("myAssets", json.assets);
                if (json.budget) localStorage.setItem("myBudget", json.budget);
                if (json.profile) localStorage.setItem("userProfile", json.profile);
                if (json.dca) localStorage.setItem("dcaStrategy", json.dca);
                
                triggerHaptic("success");
                alert("Données restaurées avec succès !");
                window.location.reload();
            } catch (err) {
                alert("Fichier invalide.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
  };

  const handleResetApp = () => {
    if (confirm("Êtes-vous sûr de vouloir tout effacer ? Cette action est irréversible.")) {
        triggerHaptic("error");
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-zinc-100 font-sans">
      <Sidebar />
      <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden p-3 md:p-8 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* HEADER */}
          <header>
            <h1 className="text-3xl font-bold text-white mb-2">Paramètres<span className="text-zinc-600">.</span></h1>
            <p className="text-zinc-400">Gérez votre profil et vos données locales.</p>
          </header>

          {/* 1. PROFIL */}
          <Card className="border-zinc-800 bg-zinc-900/20">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><User size={20} className="text-blue-500"/> Profil Utilisateur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                          <label className="text-sm text-zinc-400">Prénom</label>
                          <Input 
                            value={userName} 
                            onChange={(e) => setUserName(e.target.value)} 
                            // CORRECTION ICI : Ajout de text-white et placeholder:text-zinc-500
                            className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500 focus:ring-emerald-500"
                            placeholder="Votre prénom"
                          />
                      </div>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={isLoading} className="bg-white text-black hover:bg-zinc-200 font-bold">
                      {isLoading ? "Sauvegarde..." : <><Save size={16} className="mr-2"/> Enregistrer</>}
                  </Button>
              </CardContent>
          </Card>

          {/* 2. DATA MANAGEMENT */}
          <Card className="border-zinc-800 bg-zinc-900/20">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><Shield size={20} className="text-emerald-500"/> Sécurité & Données</CardTitle>
                  <CardDescription>Vos données sont stockées localement sur cet appareil. Pensez à faire des sauvegardes.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={handleExportData} variant="outline" className="border-zinc-700 hover:bg-zinc-800 h-20 flex flex-col gap-2 text-zinc-300 hover:text-white">
                      <Download size={24} className="text-emerald-500"/>
                      <span>Sauvegarder mes données (JSON)</span>
                  </Button>
                  <Button onClick={handleImportData} variant="outline" className="border-zinc-700 hover:bg-zinc-800 h-20 flex flex-col gap-2 text-zinc-300 hover:text-white">
                      <Upload size={24} className="text-blue-500"/>
                      <span>Restaurer une sauvegarde</span>
                  </Button>
              </CardContent>
          </Card>

          {/* 3. INFO APP */}
          <Card className="border-zinc-800 bg-zinc-900/20">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><Info size={20} className="text-zinc-500"/> À propos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Version</span>
                      <Badge variant="outline" className="text-zinc-300 border-zinc-700">v1.0.0 (Beta)</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Mode de stockage</span>
                      <span className="text-emerald-500 text-sm font-bold">Local (Privé)</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                      <span className="text-zinc-400">Développeur</span>
                      <span className="text-white text-sm">ImmoTech Corp.</span>
                  </div>
              </CardContent>
          </Card>

          {/* 4. DANGER ZONE */}
          <div className="pt-8">
              <p className="text-red-500 text-xs uppercase font-bold tracking-widest mb-4">Zone de Danger</p>
              <Button onClick={handleResetApp} variant="destructive" className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50">
                  <Trash2 size={16} className="mr-2"/> Réinitialiser toute l'application
              </Button>
              <p className="text-center text-zinc-600 text-xs mt-4">Toutes vos données seront effacées de cet appareil.</p>
          </div>

        </motion.div>
      </main>
    </div>
  );
}