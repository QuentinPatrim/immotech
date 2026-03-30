"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft, Sparkles, User, TrendingUp, Wallet, Activity } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { NexusLogo } from "@/components/NexusLogo";
import { supabase } from "@/lib/supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  ts: number;
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Wallet, text: "Quel est mon patrimoine net actuel ?" },
  { icon: TrendingUp, text: "Comment optimiser mon épargne mensuelle ?" },
  { icon: Activity, text: "Où vont la plupart de mes dépenses ?" },
  { icon: Sparkles, text: "Donne-moi 3 conseils personnalisés." },
];

// ─── Bulle message ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`shrink-0 h-8 w-8 rounded-2xl flex items-center justify-center ${
        isUser ? "bg-zinc-800 border border-white/10" : "bg-emerald-500/10 border border-emerald-500/20"
      }`}>
        {isUser
          ? <User size={14} className="text-zinc-400" />
          : <div className="w-7 h-7"><NexusLogo className="w-full h-full" /></div>
        }
      </div>
      <div className={`max-w-[80%] md:max-w-[65%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-3 rounded-[18px] text-sm leading-relaxed ${
          isUser
            ? "bg-zinc-800 border border-white/5 text-white rounded-tr-sm"
            : "bg-zinc-900/80 border border-white/5 text-zinc-100 rounded-tl-sm"
        }`}>
          {msg.content.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
        <span className="text-[9px] text-zinc-700 font-mono px-1">
          {new Date(msg.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Indicateur frappe ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      <div className="shrink-0 h-8 w-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <div className="w-7 h-7"><NexusLogo className="w-full h-full" /></div>
      </div>
      <div className="px-4 py-3 rounded-[18px] rounded-tl-sm bg-zinc-900/80 border border-white/5 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-zinc-500"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<object | null>(null);
  const [userName, setUserName] = useState("Investisseur");
  const [authLoading, setAuthLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Chargement contexte Supabase ──────────────────────────────────────────

  const loadContext = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    if (session.user.user_metadata?.full_name) {
      setUserName(session.user.user_metadata.full_name.split(" ")[0]);
    }

    const { data: profile } = await supabase
      .from("profiles").select("assets_json, budget_json")
      .eq("id", session.user.id).maybeSingle();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split("T")[0];

    const { data: history } = await supabase
      .from("monthly_history").select("*")
      .eq("user_id", session.user.id)
      .order("month", { ascending: false }).limit(3);

    const { data: currentMonth } = await supabase
      .from("monthly_history").select("*")
      .eq("user_id", session.user.id).eq("month", startOfMonth).maybeSingle();

    const fmt = (v: number) =>
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

    let totalPatrimoine = 0, totalFinancier = 0, totalImmo = 0;
    if (Array.isArray(profile?.assets_json)) {
      profile.assets_json.forEach((a: { type: string; value: number }) => {
        const v = Number(a.value) || 0;
        totalPatrimoine += v;
        if (a.type === "Immobilier") totalImmo += v; else totalFinancier += v;
      });
    }

    const income = Number(currentMonth?.income || (profile?.budget_json as { income?: number })?.income) || 0;
    const expenses = (() => {
      if (currentMonth) return Number(currentMonth.expenses) || 0;
      const b = profile?.budget_json as { details?: Array<{ amount: number }>; expenses?: number };
      if (Array.isArray(b?.details)) return b.details.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      return Number(b?.expenses) || 0;
    })();
    const epargne = Math.max(0, income - expenses);

    setContext({
      patrimoine: {
        total: fmt(totalPatrimoine),
        financier: fmt(totalFinancier),
        immobilier: fmt(totalImmo),
        actifs: profile?.assets_json || [],
      },
      budget_mensuel: {
        revenus: fmt(income),
        depenses: fmt(expenses),
        epargne: fmt(epargne),
        taux_epargne: income > 0 ? `${((epargne / income) * 100).toFixed(1)}%` : "N/A",
        details: (profile?.budget_json as { details?: unknown[] })?.details || [],
      },
      historique_3_mois: history || [],
    });

    setAuthLoading(false);
  }, [router]);

  useEffect(() => { loadContext(); }, [loadContext]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Envoi ─────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: trimmed, ts: Date.now() }]);
    setInput("");
    // Reset hauteur textarea
    if (inputRef.current) { inputRef.current.style.height = "24px"; }
    setIsLoading(true);

    try {
      // authGuard.ts attend Authorization: Bearer <token> — pas de cookie
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expirée");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, context }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [...prev, {
        id: `b-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Je n'ai pas pu générer de réponse.",
        ts: Date.now(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Désolé, une erreur technique s'est produite. 🔧",
        ts: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, context]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "24px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (authLoading) return <div className="min-h-screen bg-[#050505]" />;

  const isEmpty = messages.length === 0;

  return (
    /*
     * STRUCTURE MOBILE-SAFE :
     * - Le wrapper global est "flex" mais PAS "h-screen" au niveau root
     * - Seul le panneau de droite (.chat-panel) utilise h-[100dvh] avec overflow-hidden
     * - La sidebar est fixed/absolute sur mobile, elle ne prend pas de place dans le flux
     * - L'input est sticky bottom-0 avec pb-safe pour les encoches iOS
     */
    <div className="bg-[#050505] text-zinc-100 font-sans flex min-h-screen">
      <Sidebar />

      {/* Panneau principal — occupe tout l'espace restant, hauteur viewport */}
      {/* Sur mobile : h-[calc(100dvh-4rem)] pour laisser la place à la bottombar h-16 */}
      <div className="md:ml-64 flex-1 flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh] overflow-hidden relative">

        {/* Ambient */}
        <div className="fixed top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-emerald-950/10 to-transparent pointer-events-none z-0" />

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="relative z-20 flex items-center gap-3 px-4 md:px-8 py-4 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl shrink-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="h-9 w-9 rounded-xl bg-zinc-900/70 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all shrink-0"
          >
            <ArrowLeft size={15} />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8"><NexusLogo className="w-full h-full" /></div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#050505]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white tracking-tight leading-none truncate">CFO Assistant</p>
              <p className="text-[10px] text-emerald-500 font-mono mt-0.5">En ligne · Nexus IA</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15 shrink-0">
            <Sparkles size={9} className="text-emerald-400" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">GPT-4o</span>
          </div>
        </header>

        {/* ── ZONE MESSAGES — scrollable ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 min-h-full flex flex-col">

            {isEmpty ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center text-center pt-6 pb-4 flex-1 justify-center"
              >
                <div className="relative mb-5">
                  <div className="w-16 h-16 md:w-20 md:h-20">
                    <NexusLogo className="w-full h-full" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#050505] flex items-center justify-center">
                    <Sparkles size={9} className="text-black" />
                  </div>
                </div>

                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mb-2">
                  Bonjour, {userName} 👋
                </h1>
                <p className="text-zinc-500 text-sm max-w-xs leading-relaxed mb-7">
                  Je suis votre CFO personnel. Je connais votre patrimoine, vos revenus et vos dépenses.
                </p>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 + i * 0.07 }}
                      onClick={() => sendMessage(s.text)}
                      disabled={isLoading}
                      className="flex items-center gap-3 p-3.5 rounded-[16px] bg-zinc-900/60 border border-white/5 hover:border-white/10 hover:bg-zinc-900/80 transition-all duration-200 text-left group disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <s.icon size={14} className="text-emerald-400" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm text-zinc-300 font-medium leading-tight">{s.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
                <AnimatePresence>{isLoading && <TypingIndicator />}</AnimatePresence>
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── INPUT — sticky bottom, au-dessus de la bottom nav mobile ─────── */}
        <div className="relative z-20 shrink-0 px-4 md:px-6 py-3 md:py-4 pb-4 border-t border-white/5 bg-[#050505]/95 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2.5 bg-zinc-900/70 border border-white/8 rounded-[18px] px-3.5 py-2.5 focus-within:border-emerald-500/30 transition-all duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question financière…"
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 resize-none outline-none leading-relaxed disabled:opacity-50"
                style={{ height: "24px", maxHeight: "120px", overflowY: "auto" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="h-8 w-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 flex items-center justify-center text-black transition-all duration-200 shrink-0 disabled:cursor-not-allowed"
              >
                <Send size={13} strokeWidth={2} />
              </button>
            </div>
            <p className="text-[9px] text-zinc-800 font-mono text-center mt-1.5 hidden md:block">
              Entrée · envoyer &nbsp;·&nbsp; Shift+Entrée · nouvelle ligne
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}