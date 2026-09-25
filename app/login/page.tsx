"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Lock, Mail, AlertCircle, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NexusLogo } from "@/components/NexusLogo";
import Link from "next/link";

export default function LoginPagePremiumFinal() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Destination après connexion : ?next=/mes-biens (chemins internes uniquement)
  const getNextPath = () => {
    if (typeof window === "undefined") return "/dashboard";
    const next = new URLSearchParams(window.location.search).get("next");
    if (!next) return "/dashboard";
    try {
      const url = new URL(next, window.location.origin);
      return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/dashboard";
    } catch {
      return "/dashboard";
    }
  };

  // Authentification classique (Email / Mot de passe)
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
        router.push(getNextPath());
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(getNextPath());
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  // Authentification via Google OAuth
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Redirige vers la page courante / callback par défaut
          redirectTo: `${window.location.origin}${getNextPath()}`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setErrorMsg(error.message || "Erreur lors de la connexion Google.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020203] flex flex-col items-center justify-center p-4 sm:p-6 text-white font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* --- BACKGROUND DYNAMIQUE (Identique Landing Page) --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Grain */}
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-overlay z-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Grille subtile */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        {/* Halos lumineux */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-emerald-600/20 blur-[120px] rounded-full mix-blend-screen"
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-600/20 blur-[120px] rounded-full mix-blend-screen"
        />
      </div>

      {/* --- BOUTON RETOUR DISCRET --- */}
      <Link href="/" className="absolute top-6 left-6 md:top-10 md:left-10 z-50 flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors group">
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-all shadow-lg">
          <ArrowLeft size={16} />
        </div>
        <span className="hidden sm:inline font-bold uppercase tracking-widest text-[10px] mt-0.5">Retour</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10 mt-8 sm:mt-0"
      >
        {/* LOGO NEXUS */}
        <div className="flex flex-col items-center mb-8">
            <div className="relative p-4 bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl mb-4">
                <NexusLogo className="w-10 h-10 text-white" />
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl -z-10 rounded-[2rem]" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {isSignUp ? "Créer un compte." : "Content de vous revoir."}
            </h2>
            <p className="text-zinc-400 text-[11px] mt-2 text-center uppercase tracking-widest font-bold">
              Portail sécurisé
            </p>
        </div>

        {/* CARTE PRINCIPALE */}
        <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden">
            
            {/* SWITCH LOGIN/SIGNUP DYNAMIQUE (Ton code original adapté aux couleurs) */}
            <div className="flex bg-[#0a0a0c] p-1.5 rounded-2xl mb-6 border border-white/[0.05] relative shadow-inner">
                <button 
                    type="button"
                    onClick={() => { setIsSignUp(false); setErrorMsg(""); }}
                    className={`flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-black rounded-xl transition-all relative z-10 ${!isSignUp ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    Connexion
                    {!isSignUp && (
                      <motion.div layoutId="authTab" className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl -z-10 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                    )}
                </button>
                <button 
                    type="button"
                    onClick={() => { setIsSignUp(true); setErrorMsg(""); }}
                    className={`flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-black rounded-xl transition-all relative z-10 ${isSignUp ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    Inscription
                    {isSignUp && (
                      <motion.div layoutId="authTab" className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl -z-10 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                    )}
                </button>
            </div>

            {/* BOUTON GOOGLE */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-12 mb-6 rounded-xl bg-white text-black font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-zinc-200 active:scale-95 transition-all shadow-[0_5px_20px_rgba(255,255,255,0.15)] disabled:opacity-70"
            >
              {isGoogleLoading ? <Loader2 size={16} className="animate-spin text-black" /> : <GoogleIcon />}
              {isSignUp ? "S'inscrire avec Google" : "Continuer avec Google"}
            </button>

            {/* SÉPARATEUR */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-black">
                Ou par email
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* FORMULAIRE EMAIL */}
            <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1.5 group">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Adresse Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" size={16} />
                        <Input 
                            type="email" required placeholder="alexandre@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="pl-12 h-12 bg-[#0a0a0c]/80 border-white/[0.05] text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl transition-all placeholder:text-zinc-700"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 group">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Mot de passe</label>
                      {!isSignUp && (
                        <Link href="/forgot-password" className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 tracking-wider">
                          Oublié ?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" size={16} />
                        <Input 
                            type="password" required placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="pl-12 h-12 bg-[#0a0a0c]/80 border-white/[0.05] text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl transition-all placeholder:text-zinc-700"
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {errorMsg && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-3 rounded-xl flex items-center gap-2">
                              <AlertCircle size={14} className="shrink-0" /> {errorMsg}
                          </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BOUTON SOUMISSION (Emerald Gradient) */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(16, 185, 129, 0.3)" }}
                  whileTap={{ scale: 0.96 }}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full h-12 mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 relative overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {isLoading ? <Loader2 size={16} className="animate-spin relative z-10" /> : <span className="relative z-10 flex items-center gap-2"> {isSignUp ? "Créer le coffre" : "Accéder au tableau de bord"} <ArrowRight size={14} /> </span>}
                </motion.button>
            </form>
        </div>

        {/* Footer discret */}
        <div className="mt-8 text-center opacity-50">
          <p className="text-zinc-400 text-[8px] font-black uppercase tracking-[0.4em]">
            Chiffrement de bout en bout
          </p>
        </div>

      </motion.div>
    </div>
  );
}

// Logo vectoriel Google officiel
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}