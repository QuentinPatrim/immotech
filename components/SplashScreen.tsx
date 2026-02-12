"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { NexusLogo } from "./NexusLogo"; // On importe notre nouveau logo

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Durée totale de l'animation avant de laisser la main
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Laisse le temps au fade-out de finir
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Lueur d'ambiance derrière */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.4, scale: 1.5 }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px]"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Logo animé */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "backOut" }}
            >
              <NexusLogo className="w-24 h-24 md:w-32 md:h-32" />
            </motion.div>

            {/* Texte NEXUS qui se dévoile */}
            <motion.h1
              initial={{ opacity: 0, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, letterSpacing: "0.2em" }}
              transition={{ delay: 0.5, duration: 1.2 }}
              className="mt-6 text-3xl font-black text-white uppercase tracking-widest"
            >
              NEXUS
            </motion.h1>
            
            {/* Barre de chargement fine */}
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 100 }}
                transition={{ delay: 0.8, duration: 1.5 }}
                className="h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 mt-4 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}