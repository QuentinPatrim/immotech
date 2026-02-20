"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // Ton lien vers la DB
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Bascule entre Login et Inscription
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (isSignUp) {
        // --- INSCRIPTION ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
                first_name: "Investisseur", // Valeur par défaut
                net_worth: 0 
            } 
          }
        });
        if (error) throw error;
        // Si succès, on connecte et on redirige vers le dashboard
        router.push("/dashboard");
      } else {
        // --- CONNEXION ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // CORRECTION APPLIQUÉE ICI : Redirection vers le dashboard au lieu de la racine
        router.push("/dashboard");
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-white font-sans selection:bg-emerald-500/30">
      
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full opacity-30"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* LOGO */}
        <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter mb-2">
                NEXUS<span className="text-emerald-500">.</span>
            </h1>
            <p className="text-zinc-500">Accédez à votre centre de contrôle.</p>
        </div>

        {/* CARD */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl">
            
            {/* TABS (Login / Sign Up) */}
            <div className="flex bg-zinc-950/50 p-1 rounded-xl mb-6 border border-zinc-800/50">
                <button 
                    onClick={() => { setIsSignUp(false); setErrorMsg(""); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isSignUp ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    Connexion
                </button>
                <button 
                    onClick={() => { setIsSignUp(true); setErrorMsg(""); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isSignUp ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    Créer un compte
                </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <Input 
                            type="email" 
                            required
                            placeholder="votre@email.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-11 h-12 bg-zinc-950 border-zinc-800 text-white focus:ring-emerald-500/50"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <Input 
                            type="password" 
                            required
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-11 h-12 bg-zinc-950 border-zinc-800 text-white focus:ring-emerald-500/50"
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {errorMsg && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center gap-2"
                        >
                            <AlertCircle size={16} /> {errorMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl mt-4 transition-all"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <span className="flex items-center gap-2">
                            {isSignUp ? "Commencer l'aventure" : "Se connecter"} <ArrowRight size={18} />
                        </span>
                    )}
                </Button>

            </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
            Sécurisé par Supabase Auth • Nexus v1.0
        </p>

      </motion.div>
    </div>
  );
}