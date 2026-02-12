"use client";

import { useState, useEffect } from "react";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import Sidebar from "@/components/Sidebar"; // Si tu utilises la sidebar ici

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  // On simule un petit délai ou on attend que l'animation finisse
  const handleSplashComplete = () => {
    setLoading(false);
  };

  return (
    <html lang="fr" className="dark">
      <body className="bg-[#050505] text-white overflow-x-hidden">
        
        {/* L'écran de démarrage se superpose à tout */}
        {loading && <SplashScreen onComplete={handleSplashComplete} />}

        {/* Le contenu de l'app n'apparait (visuellement) qu'après, ou en dessous */}
        <div className={`transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}>
            {/* Ici tu mets ton Layout habituel */}
            <div className="flex">
                {/* On cache la sidebar pendant le loading si nécessaire, ou on la laisse apparaitre en fade-in */}
               {!loading && <SidebarWrapper />} 
               <div className="flex-1">
                   {children}
               </div>
            </div>
        </div>
      </body>
    </html>
  );
}

// Petit wrapper pour éviter les erreurs d'hydratation sur la sidebar
const SidebarWrapper = () => {
    // Logique pour afficher la sidebar
    return null; // À remplacer par <Sidebar /> si c'est ton composant
}