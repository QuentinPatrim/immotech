"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar"; // ✅ On n'oublie pas d'importer la Sidebar !

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Timer pour l'animation de démarrage
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Bloque le scroll pendant l'animation
  useEffect(() => {
    if (showSplash) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [showSplash]);

  return (
    <>
      {/* --- 1. ÉCRAN DE DÉMARRAGE (SPLASH SCREEN) --- */}
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
            exit={{ 
              opacity: 0, 
              scale: 1.5, 
              filter: "blur(10px)", 
              transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } 
            }}
          >
            <div className="relative flex items-end">
              <motion.span
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="text-4xl md:text-6xl font-bold text-white tracking-tighter"
              >
                Immo
              </motion.span>
              <motion.span
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="text-4xl md:text-6xl font-bold text-white tracking-tighter"
              >
                Tech
              </motion.span>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.9 }}
                className="mb-2 ml-1"
              >
                <div className="w-3 h-3 md:w-4 md:h-4 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
              </motion.div>
            </div>
            
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="absolute bottom-12 text-center"
            >
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
                    by Quentin Delsol
                </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 2. STRUCTURE PRINCIPALE DE L'APP --- */}
      <div className="flex min-h-screen bg-black">
        
        {/* La Sidebar (Fixe à gauche sur PC, Fixe en bas sur Mobile) */}
        <Sidebar />

        {/* LE CONTENU PRINCIPAL */}
        {/* md:ml-64 : Pousse le contenu vers la droite sur PC pour ne pas être sous la barre */}
        {/* pb-24 : Pousse le contenu vers le haut sur Mobile pour ne pas être sous la barre */}
        <main className="flex-1 md:ml-64 pb-24 md:pb-0 p-4 md:p-8 transition-all duration-300">
            {children}
        </main>

      </div>
    </>
  );
}