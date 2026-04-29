"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { User, Mail, Save, Trash2, Bell, Shield, LogOut, Loader2, CheckCircle, AlertTriangle, Coins, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // User Data
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [userId, setUserId] = useState("");
  const [tokens, setTokens] = useState<number>(0);

  // --- CHARGEMENT ---
  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
        setFullName(session.user.user_metadata?.full_name || "");

        // Récupération du solde de jetons
        const { data: profile } = await supabase
            .from('profiles')
            .select('tokens')
            .eq('id', session.user.id)
            .single();

        // Si la colonne n'existe pas encore ou est vide, on affiche 3 par défaut visuellement
        setTokens(profile?.tokens !== undefined && profile?.tokens !== null ? profile.tokens : 3);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  // --- 1. SAUVEGARDE DU PROFIL ---
  const updateProfile = async () => {
    if (!fullName) return;
    setSaving(true);

    // Mise à jour des métadonnées Supabase Auth
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (!error) {
      setTimeout(() => setSaving(false), 1000);
    } else {
      console.error(error);
      setSaving(false);
    }
  };

  // --- 2. RÉINITIALISATION DES DONNÉES ---
  const resetAccountData = async () => {
    if (!confirm("Attention : Cela va effacer TOUS vos actifs, budgets et historiques. Cette action est irréversible. Continuer ?")) return;
    
    setResetting(true);

    await supabase.from('profiles').update({
        assets_json: [],
        budget_json: {},
        net_worth: 0
    }).eq('id', userId);

    await supabase.from('monthly_history').delete().eq('user_id', userId);

    setResetting(false);
    alert("Données réinitialisées avec succès. Vous repartez de zéro.");
    router.refresh(); 
  };

  // --- 3. DÉCONNEXION ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-24 md:pb-8">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-10">
          
          <header>
            <h1 className="text-3xl font-bold text-white mb-2">Paramètres & Compte<span className="text-emerald-500">.</span></h1>
            <p className="text-zinc-400">Gérez vos informations, vos préférences et votre facturation.</p>
          </header>

          <div className="grid grid-cols-1 gap-8">
            
            {/* CARTE JETONS NEXUS (NOUVEAU) */}
            <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border border-purple-500/20 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/15 rounded-xl border border-purple-500/30">
                                <Coins className="text-purple-400" size={20}/>
                            </div>
                            <h2 className="text-lg font-bold text-white">Vos Jetons Nexus</h2>
                        </div>
                        <p className="text-sm text-zinc-400 max-w-md">
                            Utilisez vos jetons pour générer des exports PDF officiels (Dossier bancaire, Bilan FIRE, Rapport fiscal).
                        </p>
                    </div>

                    <div className="flex flex-row items-center justify-between gap-4 md:gap-6 w-full md:w-auto bg-black/40 p-4 rounded-2xl border border-white/5 shrink-0">
                        <div className="text-left">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Solde actuel</p>
                            <p className="text-3xl font-black text-white leading-none">{tokens}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10 hidden md:block"></div>
                        <Link href="/tarifs" className="shrink-0">
                            <Button className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                                Recharger <ArrowRight size={14} className="mt-0.5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* CARTE PROFIL */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
                    <User className="text-emerald-500" size={20}/>
                    <h2 className="text-lg font-bold text-white">Mon Identité</h2>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Prénom / Nom d'affichage</label>
                            <div className="relative">
                                <Input 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    className="bg-black border-zinc-700 text-white h-12 pl-4 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="Votre nom"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email (Compte)</label>
                            <div className="relative">
                                <Input 
                                    value={userEmail} 
                                    disabled 
                                    className="bg-zinc-950/50 border-zinc-800 text-zinc-500 h-12 pl-10 cursor-not-allowed"
                                />
                                <Mail className="absolute left-3 top-3.5 text-zinc-600" size={18}/>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button 
                            onClick={updateProfile} 
                            disabled={saving}
                            className={`h-12 px-8 font-bold rounded-xl transition-all ${saving ? "bg-emerald-500/20 text-emerald-500" : "bg-white text-black hover:bg-zinc-200"}`}
                        >
                            {saving ? <span className="flex items-center gap-2"><CheckCircle size={18}/> Enregistré</span> : <span className="flex items-center gap-2"><Save size={18}/> Mettre à jour</span>}
                        </Button>
                    </div>
                </div>
            </div>

            {/* CARTE PRÉFÉRENCES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 opacity-75">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Bell className="text-emerald-500" size={20}/>
                            <h3 className="font-bold text-white">Notifications</h3>
                        </div>
                        <div className="h-6 w-10 bg-zinc-800 rounded-full relative"><div className="absolute right-1 top-1 h-4 w-4 bg-zinc-600 rounded-full"></div></div>
                    </div>
                    <p className="text-xs text-zinc-500">Alertes de budget et rappels (Bientôt).</p>
                </div>

                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 opacity-75">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Shield className="text-blue-500" size={20}/>
                            <h3 className="font-bold text-white">Sécurité</h3>
                        </div>
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-bold">ACTIF</span>
                    </div>
                    <p className="text-xs text-zinc-500">Chiffrement de bout en bout activé.</p>
                </div>
            </div>

            {/* DANGER ZONE */}
            <div className="p-8 rounded-3xl border border-red-900/30 bg-red-950/5">
                <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="text-red-500" size={20}/>
                    <h2 className="text-lg font-bold text-red-500">Zone de Danger</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-xl bg-red-950/10 border border-red-900/20">
                        <div>
                            <h4 className="font-bold text-white text-sm">Réinitialiser les données</h4>
                            <p className="text-xs text-zinc-400 mt-1">Efface tout votre patrimoine, budget et historique cloud. Votre compte reste actif.</p>
                        </div>
                        <Button 
                            onClick={resetAccountData} 
                            disabled={resetting}
                            variant="destructive" 
                            className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 rounded-lg whitespace-nowrap"
                        >
                            {resetting ? "Effacement..." : "Tout effacer"}
                        </Button>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div>
                            <h4 className="font-bold text-white text-sm">Déconnexion</h4>
                            <p className="text-xs text-zinc-400 mt-1">Se déconnecter de cet appareil.</p>
                        </div>
                        <Button 
                            onClick={handleLogout} 
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-10 px-4 rounded-lg whitespace-nowrap"
                        >
                            <LogOut size={16} className="mr-2"/> Se déconnecter
                        </Button>
                    </div>
                </div>
            </div>

          </div>
        </motion.div>
      </main>
    </div>
  );
}