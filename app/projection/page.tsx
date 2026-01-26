"use client";

import Sidebar from "@/components/Sidebar";
import ProjectionSimulator from "@/components/ProjectionSimulator";
import { motion } from "framer-motion";

export default function ProjectionPage() {
  return (
    <div className="flex flex-col md:flex-row bg-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto space-y-8"
        >
          <header>
            <h1 className="text-3xl font-bold text-white mb-2">Projection Patrimoniale<span className="text-emerald-500">.</span></h1>
            <p className="text-zinc-400">Visualisez la puissance des intérêts composés sur vos différents actifs.</p>
          </header>

          <ProjectionSimulator />
          
        </motion.div>
      </main>
    </div>
  );
}