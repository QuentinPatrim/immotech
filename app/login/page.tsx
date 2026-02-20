"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Lock, Mail, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/NexusLogo";
import Link from "next/link";

export default function LoginPagePremiumFinal() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: "Investisseur", net_worth: 0 } }
        });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-violet-500/30 overflow-hidden relative">
      
      {/* --- BOUTON RETOUR DISCRET (HAUT DROITE) --- */}
      <Link href="/" className="absolute top-8 right-8 z-50 group flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-white transition-colors duration-300 opacity-0 group-hover:opacity-100">
          Quitter
        </span>
        <motion.div 
          whileHover={{ rotate: 90, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2.5 bg-white/5 border border-white/10 rounded-full text-zinc-500 group-hover:text-white group-hover:bg-violet-500/20 group-hover:border-violet-500/50 transition-all duration-300 shadow-lg"
        >
          <X size={18} />
        </motion.div>
      </Link>

      {/* --- BACKGROUND DYNAMIQUE --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-violet-600/20 blur-[120px] rounded-full mix-blend-screen"
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen"
          />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* LOGO NEXUS */}
        <div className="flex justify-center mb-10">
            <div className="relative p-4 bg-black border border-white/10 rounded-[2rem] shadow-2xl">
                <NexusLogo className="w-10 h-10 text-white" />
                <div className="absolute inset-0 bg-violet-500/10 blur-2xl -z-10 rounded-full" />
            </div>
        </div>

        <div className="bg-zinc-900/20 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
            
            {/* SWITCH LOGIN/SIGNUP DYNAMIQUE */}
            <div className="flex bg-black/60 p-1.5 rounded-2xl mb-8 border border-white/[0.03] relative">
                <button 
                    onClick={() => { setIsSignUp(false); setErrorMsg(""); }}
                    className={`flex-1 py-3.5 text-[10px] uppercase tracking-[0.2em] font-black rounded-xl transition-all relative z-10 ${!isSignUp ? "text-white" : "text-zinc-500"}`}
                >
                    Connexion
                    {!isSignUp && (
                      <motion.div layoutId="authTab" className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl -z-10 shadow-[0_0_20px_rgba(139,92,246,0.4)]" />
                    )}
                </button>
                <button 
                    onClick={() => { setIsSignUp(true); setErrorMsg(""); }}
                    className={`flex-1 py-3.5 text-[10px] uppercase tracking-[0.2em] font-black rounded-xl transition-all relative z-10 ${isSignUp ? "text-white" : "text-zinc-500"}`}
                >
                    Inscription
                    {isSignUp && (
                      <motion.div layoutId="authTab" className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl -z-10 shadow-[0_0_20px_rgba(139,92,246,0.4)]" />
                    )}
                </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-violet-400 transition-colors" size={18} />
                        <Input 
                            type="email" required placeholder="nom@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="pl-14 h-14 bg-black/50 border-white/[0.05] text-white focus:border-violet-500/50 focus:ring-0 rounded-2xl transition-all placeholder:text-zinc-800"
                        />
                    </div>
                </div>

                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-violet-400 transition-colors" size={18} />
                        <Input 
                            type="password" required placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="pl-14 h-14 bg-black/50 border-white/[0.05] text-white focus:border-violet-500/50 focus:ring-0 rounded-2xl transition-all placeholder:text-zinc-800"
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {errorMsg && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/5 border border-red-500/20 text-red-400 text-[11px] p-4 rounded-2xl flex items-center gap-3">
                            <AlertCircle size={16} className="shrink-0" /> {errorMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BOUTON VIOLET RÉACTIF */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(139, 92, 246, 0.4)" }}
                  whileTap={{ scale: 0.96 }}
                  disabled={isLoading}
                  className="w-full h-15 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <> {isSignUp ? "Créer l'accès" : "Accéder au cockpit"} <ArrowRight size={16} /> </>}
                </motion.button>
            </form>
        </div>

        <p className="text-center text-zinc-700 text-[9px] font-black uppercase tracking-[0.4em] mt-12">
            Nexus Protocol • Terminal de Contrôle v1.0
        </p>

      </motion.div>
    </div>
  );
}