"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SplashScreen } from "@/components/SplashScreen";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // On vérifie si l'intro a DÉJÀ été vue dans cette session
    // (sessionStorage s'efface quand on ferme complètement l'onglet/app)
    const hasSeenIntro = sessionStorage.getItem("intro_seen");
    
    if (hasSeenIntro) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem("intro_seen", "true");
  };

  return (
    <>
      {/* L'animation est ici, au-dessus de tout */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      
      {/* Le contenu de l'app est en dessous. 
          Note : On peut choisir de le cacher pendant l'intro ou pas.
          Ici, on l'affiche pour qu'il soit prêt (chargé) quand l'anim finit. */}
      <div className={showSplash ? "opacity-0" : "opacity-100 transition-opacity duration-700"}>
        {children}
      </div>
    </>
  );
}