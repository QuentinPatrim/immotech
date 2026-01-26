"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  
  // NOUVEAU : On stocke les positions des particules dans un état
  // Au début c'est vide, donc pas de conflit Serveur/Client
  const [particles, setParticles] = useState<{ x: number; y: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // 1. On génère les particules UNIQUEMENT coté client (navigateur)
    const newParticles = [...Array(20)].map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
    }));
    setParticles(newParticles);

    // 2. Gestion du timer de fin
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 800);
    }, 3500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden perspective-[1000px]"
        >
          {/* FOND AMBIANT */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px]"
          />

          {/* CŒUR DE L'ANIMATION 3D */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-12 transform-style-3d">
            <motion.div
              animate={{ rotateX: [0, 360], rotateY: [0, 180] }}
              transition={{ duration: 3, ease: "linear", repeat: Infinity }}
              className="absolute inset-0 rounded-full border border-emerald-500/30 border-t-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              style={{ rotateX: 45 }}
            />
            <motion.div
              animate={{ rotateY: [0, -360], rotateX: [0, 90] }}
              transition={{ duration: 4, ease: "linear", repeat: Infinity }}
              className="absolute inset-2 rounded-full border border-emerald-400/20 border-r-emerald-300"
            />
            <motion.div
              animate={{ rotateZ: [0, 360] }}
              transition={{ duration: 2, ease: "linear", repeat: Infinity }}
              className="absolute inset-8 rounded-full border border-dashed border-emerald-600/40"
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 bg-gradient-to-br from-emerald-400 to-emerald-900 p-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.6)]"
            >
              <TrendingUp size={40} className="text-white" />
            </motion.div>
          </div>

          {/* TEXTE */}
          <div className="text-center z-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20, letterSpacing: "10px" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "2px" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="text-5xl md:text-7xl font-bold text-white mb-2"
            >
              IMMO
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                TECH
              </span>
            </motion.h1>

            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "200px" }}
              transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
              className="h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto"
            />
            
            <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 1.5, duration: 1 }}
               className="text-emerald-500/60 text-xs font-mono tracking-[0.3em] mt-4 uppercase"
            >
              Systeme Financier v1.0
            </motion.p>
          </div>

          <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 1 }}
              className="absolute bottom-8 text-emerald-500/30 text-[10px] font-mono tracking-widest uppercase z-20"
          >
              By Quentin Delsol
          </motion.div>

          {/* PARTICULES CORRIGÉES (Hydration Safe) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             {particles.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ x: p.x, y: p.y, opacity: 0 }}
                  animate={{ y: "-=100", opacity: [0, 0.5, 0] }}
                  transition={{ 
                    duration: p.duration, 
                    repeat: Infinity, 
                    delay: p.delay 
                  }}
                  className="absolute w-1 h-1 bg-emerald-500 rounded-full"
                />
             ))}
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}