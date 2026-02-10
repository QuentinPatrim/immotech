"use client";

import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <motion.div 
        // Cette ligne permet la sortie élégante
        exit={{ opacity: 0, transition: { duration: 0.5 } }}
        className="fixed inset-0 bg-black z-[99999] flex items-center justify-center"
    >
      <div className="relative">
          {/* Lueur verte d'ambiance */}
          <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.4, 0.2], scale: [0.5, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 2 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 bg-emerald-500/30 blur-[60px] rounded-full"
          />

          {/* Conteneur Texte */}
          <motion.div
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="relative z-10 text-5xl md:text-7xl font-black text-white tracking-tighter flex items-end"
          >
             <span>NEXUS</span>
             
             {/* Le Point Vert (Pop) */}
             <motion.span
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ 
                   delay: 0.4, 
                   type: "spring", 
                   stiffness: 200, 
                   damping: 15 
               }}
               className="text-emerald-500 inline-block ml-1"
             >
               .
             </motion.span>
          </motion.div>
      </div>
    </motion.div>
  );
}