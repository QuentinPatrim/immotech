"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // L'animation dure environ 2.2 secondes au total
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Empêche le scroll pendant le splash screen
  useEffect(() => {
    if (showSplash) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [showSplash]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
            // L'ANIMATION DE SORTIE (Le "Zoom écran et paf")
            exit={{ 
              opacity: 0, 
              scale: 1.5, // Zoom vers l'utilisateur
              filter: "blur(10px)", // Léger flou cinétique
              transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } // Courbe de vitesse "Premium"
            }}
          >
            <div className="relative flex items-end">
              
              {/* PARTIE 1 : "Immo" (Vient de la GAUCHE) */}
              <motion.span
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="text-4xl md:text-6xl font-bold text-white tracking-tighter"
              >
                Immo
              </motion.span>

              {/* PARTIE 2 : "Tech" (Vient de la DROITE) */}
              <motion.span
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="text-4xl md:text-6xl font-bold text-white tracking-tighter"
              >
                Tech
              </motion.span>

              {/* PARTIE 3 : LE POINT VERT (Le "Pop") */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 15, 
                  delay: 0.9 // Arrive juste après que le texte soit calé
                }}
                className="mb-2 ml-1" // Ajustement pour aligner le point avec la ligne de base du texte
              >
                <div className="w-3 h-3 md:w-4 md:h-4 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Le contenu de l'appli apparaît en dessous */}
      {children}
    </>
  );
}