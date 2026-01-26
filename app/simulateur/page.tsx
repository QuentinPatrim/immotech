"use client";

import Sidebar from "@/components/Sidebar";
import ImmoSimulator from "@/components/ImmoSimulator";
import { motion } from "framer-motion";

export default function SimulateurPage() {
  return (
    <div className="flex flex-col md:flex-row bg-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-8"
        >
          <header>
            <h1 className="text-3xl font-bold text-white mb-2">Simulateur Immobilier<span className="text-emerald-500">.</span></h1>
            <p className="text-zinc-400">Calculez votre capacité d'emprunt et analysez la rentabilité de vos futurs investissements.</p>
          </header>

          <ImmoSimulator />
          
        </motion.div>
      </main>
    </div>
  );
}