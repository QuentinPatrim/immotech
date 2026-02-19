"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Lock, User, Bot, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface NexusChatProps {
  isPro: boolean;
  financialData: any; // C'est ici que la page parente injecte les chiffres
}

export default function NexusChat({ isPro, financialData }: NexusChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: "Bonjour ! Je suis Nexus, ton CFO personnel. Pose-moi une question ou choisis une analyse rapide ci-dessous. 👇" }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen, loading]);

  // CHANGEMENT ICI : La fonction accepte maintenant un texte optionnel (pour les boutons)
  const sendMessage = async (textToSend?: string) => {
    const userMsg = textToSend || input;
    if (!userMsg.trim() || loading) return;
    
    // On vide l'input seulement si on a tapé manuellement
    if (!textToSend) setInput(""); 
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: userMsg, 
            context: financialData 
        })
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: "Oups, mes circuits surchauffent. Réessaie plus tard." }]);
    } finally {
      setLoading(false);
    }
  };

  // LES QUICK ACTIONS (Suggestions)
  const quickActions = [
    "🔥 Analyse mes dépenses et trouve des économies",
    "💼 Où investir mon cashflow ce mois-ci ?",
    "⚖️ Analyse les risques de mon patrimoine",
  ];

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl z-50 border border-white/10"
      >
        {isOpen ? <X className="text-white" /> : <Sparkles className="text-white" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[550px] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Bot size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Nexus Assistant</h3>
                        <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Données synchronisées
                        </p>
                    </div>
                </div>
                {!isPro && <Lock size={14} className="text-zinc-500"/>}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`p-3 rounded-2xl text-sm max-w-[85%] leading-relaxed ${
                            m.role === 'user' 
                            ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm' 
                            : 'bg-indigo-900/20 text-indigo-100 rounded-tl-sm border border-indigo-500/10'
                        }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3">
                        <div className="bg-indigo-900/10 p-3 rounded-2xl rounded-tl-sm text-xs text-indigo-400 flex items-center gap-2">
                            <Sparkles size={12} className="animate-pulse" /> Analyse en cours...
                        </div>
                    </div>
                )}
            </div>

            {/* Input & Quick Actions */}
            <div className="p-4 border-t border-white/5 bg-zinc-900/30 shrink-0">
                {isPro ? (
                    <div className="flex flex-col gap-3">
                        {/* Barre des Quick Actions (Scrollable horizontalement) */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                            {quickActions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(action)}
                                    disabled={loading}
                                    className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Lightbulb size={12} />
                                    {action}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Input 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Pose ta question..." 
                                className="bg-black/50 border-white/10 text-white h-10"
                                disabled={loading}
                            />
                            <Button 
                                onClick={() => sendMessage()} 
                                disabled={loading || !input.trim()} 
                                className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 w-10 px-0"
                            >
                                <Send size={16} />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Link href="/tarifs" className="w-full">
                        <Button className="w-full bg-white text-black font-bold h-10 rounded-xl text-xs">
                            <Lock size={12} className="mr-2"/> Passer Premium
                        </Button>
                    </Link>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}