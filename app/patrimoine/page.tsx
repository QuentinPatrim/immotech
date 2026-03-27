"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Building, Bitcoin, Landmark, Plus, Trash2, TrendingUp, TrendingDown,
  PieChart as PieIcon, ShieldCheck, Loader2, Layers, AlertTriangle, Info, X,
  ArrowRight, Check, BookOpen, ScanLine, RefreshCw, Search, ChevronDown,
  ChevronUp, MoreHorizontal, Zap, Eye, EyeOff, Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import { NexusLogo } from "@/components/NexusLogo";

// ─── Helpers ───────────────────────────────────────────────────────────────
const fileToBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
  const r = new FileReader(); r.readAsDataURL(file);
  r.onload = () => res(r.result as string); r.onerror = rej;
});
const fmt = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const getVal = (v: any) => (typeof v === "string" ? parseFloat(v) : v) || 0;

// ─── Types ─────────────────────────────────────────────────────────────────
type AssetType = "Immobilier" | "Bourse" | "Crypto" | "AssuranceVie" | "Cash" | "Autre";
type Asset = {
  id: string; name: string; value: number; type: AssetType;
  ticker?: string; quantity?: number; unitPrice?: number; buyPrice?: number;
  notaryFees?: number; workCost?: number; loanCost?: number;
  lastRefreshed?: number;
  envelope?: "PEA" | "CTO" | "PEA-PME" | "Autre"; // enveloppe fiscale
};

const ASSET_CONFIG: Record<AssetType, { color: string; bg: string; gradient: string; glow: string; border: string; icon: any; label: string }> = {
  Bourse:       { color: "#10b981", bg: "bg-emerald-500/10", gradient: "from-emerald-600 to-emerald-400", glow: "shadow-[0_0_30px_rgba(16,185,129,0.25)]",  border: "border-emerald-500/30", icon: TrendingUp,  label: "Bourse / Compte Titres" },
  Immobilier:   { color: "#3b82f6", bg: "bg-blue-500/10",    gradient: "from-blue-600 to-blue-400",       glow: "shadow-[0_0_30px_rgba(59,130,246,0.25)]",   border: "border-blue-500/30",    icon: Building,    label: "Immobilier" },
  Cash:         { color: "#f59e0b", bg: "bg-amber-500/10",   gradient: "from-amber-500 to-yellow-400",    glow: "shadow-[0_0_30px_rgba(245,158,11,0.25)]",   border: "border-amber-500/30",   icon: Landmark,    label: "Cash & Livrets" },
  Crypto:       { color: "#8b5cf6", bg: "bg-purple-500/10",  gradient: "from-purple-600 to-purple-400",   glow: "shadow-[0_0_30px_rgba(139,92,246,0.25)]",   border: "border-purple-500/30",  icon: Bitcoin,     label: "Cryptomonnaies" },
  AssuranceVie: { color: "#ec4899", bg: "bg-pink-500/10",    gradient: "from-pink-600 to-pink-400",       glow: "shadow-[0_0_30px_rgba(236,72,153,0.25)]",   border: "border-pink-500/30",    icon: ShieldCheck, label: "Assurance Vie" },
  Autre:        { color: "#71717a", bg: "bg-zinc-500/10",    gradient: "from-zinc-600 to-zinc-400",       glow: "shadow-[0_0_30px_rgba(113,113,122,0.25)]",  border: "border-zinc-500/30",    icon: Layers,      label: "Autre" },
};

// ─── HelpTooltip ───────────────────────────────────────────────────────────
const HelpTooltip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1.5" style={{ zIndex: 9999 }}>
      <button type="button" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="inline-flex items-center justify-center p-1 rounded-full bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
        <Info size={11} />
      </button>
      {open && (
        <span className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-56 p-3 bg-[#1A1A1E] border border-zinc-700 rounded-xl text-white text-xs text-center leading-relaxed shadow-2xl pointer-events-none" style={{ zIndex: 99999 }}>
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1A1A1E]" />
        </span>
      )}
    </span>
  );
};

// ─── Yahoo Finance price fetcher ──────────────────────────────────────────
async function fetchLivePrice(ticker: string): Promise<number | null> {
  // 1. Via notre route /api/price
  try {
    const res = await fetch(`/api/price?ticker=${encodeURIComponent(ticker)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.price) return data.price;
    }
  } catch {}

  // 2. Appel direct Yahoo Finance depuis le navigateur
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
                 ?? data?.chart?.result?.[0]?.meta?.previousClose;
      if (price) return Math.round(price * 100) / 100;
    }
  } catch {}

  // 3. Proxy CORS en dernier recours
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
                 ?? data?.chart?.result?.[0]?.meta?.previousClose;
      if (price) return Math.round(price * 100) / 100;
    }
  } catch {}

  return null;
}

// ─── Wizard ────────────────────────────────────────────────────────────────

// ─── Add Asset Modal ──────────────────────────────────────────────────────
function AddAssetModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (a: Asset) => void }) {
  const [type, setType] = useState<AssetType>("Bourse");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [envelope, setEnvelope] = useState<"PEA" | "CTO" | "PEA-PME" | "Autre">("PEA");
  const [value, setValue] = useState("");
  const [qty, setQty] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [notaryFees, setNotaryFees] = useState("");
  const [workCost, setWorkCost] = useState("");
  const [loanCost, setLoanCost] = useState("");
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string; exchange: string; type: string; typeLabel: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStock = type === "Bourse" || type === "Crypto";
  const isImmo = type === "Immobilier";

  const reset = () => {
    setName(""); setTicker(""); setValue(""); setQty(""); setBuyPrice("");
    setUnitPrice(""); setNotaryFees(""); setWorkCost(""); setLoanCost("");
    setSearchResults([]); setShowResults(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // Recherche autocomplete via /api/search
  const handleNameChange = (val: string) => {
    setName(val);
    setTicker("");
    if (!isStock || val.length < 2) { setSearchResults([]); setShowResults(false); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowResults(data.results?.length > 0);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 350);
  };

  // Sélection → prix via /api/price
  const selectResult = async (result: { ticker: string; name: string; type: string }) => {
    setName(result.name);
    setTicker(result.ticker);
    setShowResults(false);
    if (result.type === "Crypto") setType("Crypto");
    setSearching(true);
    setUnitPrice("");
    const price = await fetchLivePrice(result.ticker);
    if (price) setUnitPrice(price.toString());
    setSearching(false);
  };

  const handleAdd = () => {
    if (!name) return;
    let asset: Asset = { id: Date.now().toString(), name, value: 0, type };
    if (isStock) {
      const q = parseFloat(qty) || 0, u = parseFloat(unitPrice) || 0;
      asset = { ...asset, value: q * u, quantity: q, unitPrice: u, buyPrice: parseFloat(buyPrice) || undefined, ticker: ticker || undefined, envelope };
    } else if (isImmo) {
      asset = { ...asset, value: parseFloat(value) || 0, buyPrice: parseFloat(buyPrice) || undefined, notaryFees: parseFloat(notaryFees) || undefined, workCost: parseFloat(workCost) || undefined, loanCost: parseFloat(loanCost) || undefined };
    } else {
      asset = { ...asset, value: parseFloat(value) || 0 };
    }
    onAdd(asset); handleClose();
  };

  const cfg = ASSET_CONFIG[type];
  const envelopeInfo: Record<string, { color: string; tax: string; tip: string }> = {
    PEA:       { color: "#10b981", tax: "17,2% après 5 ans", tip: "Exonéré d'IR après 5 ans, seulement 17,2% de PS. Plafonné à 150 000€." },
    CTO:       { color: "#f59e0b", tax: "Flat tax 30%",      tip: "Flat tax 30% (PFU) sur plus-values et dividendes. Pas de plafond." },
    "PEA-PME": { color: "#8b5cf6", tax: "17,2% après 5 ans", tip: "Même fiscalité que le PEA, dédié aux PME/ETI. Plafond 225 000€." },
    Autre:     { color: "#71717a", tax: "Variable",           tip: "Assurance-vie ou autre enveloppe. Fiscalité spécifique au contrat." },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200]" onClick={handleClose} />

          {/* Modal centré */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0A0A0C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                <h3 className="text-base font-black text-white uppercase tracking-wide">Ajouter un actif</h3>
                <button onClick={handleClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Contenu scrollable */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">

                {/* Sélecteur de type */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
                  {(Object.keys(ASSET_CONFIG) as AssetType[]).map(t => {
                    const c = ASSET_CONFIG[t]; const Icon = c.icon;
                    return (
                      <button key={t} onClick={() => { setType(t); reset(); setName(""); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${type === t ? `${c.bg} border-current` : "bg-white/3 border-white/5 text-zinc-500 hover:border-white/15"}`}
                        style={type === t ? { color: c.color, borderColor: c.color + "50" } : {}}>
                        <Icon size={18} />
                        <span className="text-[8px] font-bold uppercase leading-tight text-center">{c.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Bourse / Crypto — recherche autocomplete */}
                {isStock && (
                  <div className="space-y-4">
                    {/* Champ recherche */}
                    <div className="relative">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1.5">
                        Rechercher un actif
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        <Input value={name} onChange={e => handleNameChange(e.target.value)}
                          onBlur={() => setTimeout(() => setShowResults(false), 150)}
                          placeholder="Ex: Apple, LVMH, Air Liquide, Bitcoin…"
                          className="bg-zinc-900/60 border-white/10 text-white h-11 rounded-xl pl-9 pr-24 focus:border-emerald-500 w-full text-sm" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {searching && <Loader2 size={13} className="animate-spin text-zinc-500" />}
                          {ticker && !searching && (
                            <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">{ticker}</span>
                          )}
                        </div>
                      </div>

                      {/* Dropdown résultats */}
                      <AnimatePresence>
                        {showResults && searchResults.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-[#111113] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                            {searchResults.map((r, i) => (
                              <button key={i} onMouseDown={() => selectResult(r)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{r.name}</p>
                                  <p className="text-[10px] text-zinc-500">{r.exchange}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[9px] font-mono bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded">{r.ticker}</span>
                                  <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase"
                                    style={{ backgroundColor: r.typeLabel === "ETF" ? "#3b82f620" : r.type === "Crypto" ? "#8b5cf620" : "#10b98120", color: r.typeLabel === "ETF" ? "#3b82f6" : r.type === "Crypto" ? "#8b5cf6" : "#10b981" }}>
                                    {r.typeLabel}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Enveloppe fiscale */}
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-2">Enveloppe fiscale</label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {(["PEA", "CTO", "PEA-PME", "Autre"] as const).map(env => (
                          <button key={env} onClick={() => setEnvelope(env)}
                            className={`py-2 rounded-xl border text-xs font-bold uppercase transition-all ${envelope === env ? "border-current" : "bg-white/3 border-white/5 text-zinc-500 hover:border-white/15"}`}
                            style={envelope === env ? { color: envelopeInfo[env].color, backgroundColor: envelopeInfo[env].color + "15", borderColor: envelopeInfo[env].color + "40" } : {}}>
                            {env}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] px-3 py-1.5 rounded-lg bg-white/3 border border-white/5" style={{ color: envelopeInfo[envelope].color }}>
                        <strong>{envelope}</strong> — {envelopeInfo[envelope].tax} · {envelopeInfo[envelope].tip}
                      </p>
                    </div>

                    {/* Quantité / PRU / Prix actuel */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Quantité", val: qty, set: setQty, placeholder: "Ex: 10", emerald: false },
                        { label: "PRU acheté", val: buyPrice, set: setBuyPrice, placeholder: "€/unité", emerald: false },
                        { label: "Prix actuel", val: unitPrice, set: setUnitPrice, placeholder: searching ? "Récup..." : "Auto", emerald: true },
                      ].map(f => (
                        <div key={f.label}>
                          <label className={`text-[9px] font-bold uppercase block mb-1.5 ${f.emerald ? "text-emerald-400" : "text-zinc-500"}`}>{f.label}</label>
                          <Input type="number" placeholder={f.placeholder} value={f.val} onChange={e => f.set(e.target.value)}
                            className={`h-10 rounded-xl text-sm w-full ${f.emerald ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 font-bold" : "bg-zinc-900/60 border-white/10 text-white"}`} />
                        </div>
                      ))}
                    </div>

                    {qty && unitPrice && (
                      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-zinc-400">Valeur totale calculée</span>
                        <span className="text-lg font-black text-emerald-400">{fmt((parseFloat(qty) || 0) * (parseFloat(unitPrice) || 0))}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Immobilier */}
                {isImmo && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1.5">Nom du bien</label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Appartement T2 Toulouse"
                        className="bg-zinc-900/60 border-white/10 text-white h-10 rounded-xl w-full text-sm" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-emerald-400 uppercase block mb-1.5">Valeur actuelle estimée</label>
                      <div className="relative">
                        <Input type="number" placeholder="Ex: 250 000" value={value} onChange={e => setValue(e.target.value)}
                          className="bg-emerald-950/20 border-emerald-500/30 text-emerald-400 font-bold h-11 rounded-xl pr-8 w-full text-lg" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">€</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Prix d'achat", val: buyPrice, set: setBuyPrice },
                        { label: "Frais notaire", val: notaryFees, set: setNotaryFees },
                        { label: "Travaux", val: workCost, set: setWorkCost },
                        { label: "Coût crédit", val: loanCost, set: setLoanCost },
                      ].map(f => (
                        <div key={f.label}>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1.5">{f.label}</label>
                          <div className="relative">
                            <Input type="number" placeholder="0" value={f.val} onChange={e => f.set(e.target.value)}
                              className="bg-zinc-900/60 border-white/10 text-white h-10 rounded-xl text-sm pr-7 w-full" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cash / AssuranceVie / Autre */}
                {!isStock && !isImmo && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1.5">Nom</label>
                      <Input value={name} onChange={e => setName(e.target.value)}
                        placeholder={type === "AssuranceVie" ? "Ex: AV Linxea Spirit" : "Ex: Livret A, LDDS"}
                        className="bg-zinc-900/60 border-white/10 text-white h-10 rounded-xl w-full text-sm" />
                    </div>
                    <div className="relative">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1.5">Montant</label>
                      <Input type="number" placeholder="0" value={value} onChange={e => setValue(e.target.value)}
                        className="bg-zinc-900/60 border-white/10 text-white font-bold h-12 rounded-xl pr-8 w-full text-xl" />
                      <span className="absolute right-3 bottom-3.5 text-zinc-500 font-bold">€</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer sticky */}
              <div className="px-6 py-4 border-t border-white/8 shrink-0">
                <button onClick={handleAdd} disabled={!name}
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 text-white"
                  style={{ background: name ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)` : "#27272a",
                    boxShadow: name ? `0 4px 20px -4px ${cfg.color}60` : "none" }}>
                  Ajouter à mon patrimoine
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
// ─── Asset Card ────────────────────────────────────────────────────────────
function AssetCard({ asset, onRemove, onUpdate, onRefreshPrice }: {
  asset: Asset; onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof Asset, val: any) => void;
  onRefreshPrice: (id: string, ticker: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editQty, setEditQty] = useState(String(asset.quantity ?? ""));
  const [editPru, setEditPru] = useState(String(asset.buyPrice ?? ""));
  const [editPrice, setEditPrice] = useState(String(asset.unitPrice ?? ""));
  const [editValue, setEditValue] = useState(String(asset.value ?? ""));

  const cfg = ASSET_CONFIG[asset.type];
  const isStock = asset.type === "Bourse" || asset.type === "Crypto";
  const isImmo = asset.type === "Immobilier";

  const gainAbs = isStock && asset.buyPrice && asset.quantity
    ? asset.value - asset.buyPrice * asset.quantity
    : isImmo && asset.buyPrice
    ? asset.value - (asset.buyPrice + (asset.notaryFees||0) + (asset.workCost||0) + (asset.loanCost||0))
    : null;
  const gainPct = gainAbs !== null && asset.buyPrice
    ? isStock
      ? ((asset.unitPrice! / asset.buyPrice) - 1) * 100
      : (gainAbs / (asset.buyPrice + (asset.notaryFees||0) + (asset.workCost||0))) * 100
    : null;

  const envelopeColors: Record<string, { bg: string; text: string; dot: string }> = {
    PEA:       { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "#10b981" },
    "PEA-PME": { bg: "bg-purple-500/10",  text: "text-purple-400",  dot: "#8b5cf6" },
    CTO:       { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "#f59e0b" },
    Autre:     { bg: "bg-zinc-500/10",    text: "text-zinc-400",    dot: "#71717a" },
  };
  const ec = asset.envelope ? envelopeColors[asset.envelope] : null;

  const handleSaveEdit = () => {
    if (isStock) {
      const q = parseFloat(editQty) || 0;
      const u = parseFloat(editPrice) || 0;
      onUpdate(asset.id, "quantity", q);
      onUpdate(asset.id, "unitPrice", u);
      if (editPru) onUpdate(asset.id, "buyPrice", parseFloat(editPru));
      onUpdate(asset.id, "value", q * u);
    } else {
      onUpdate(asset.id, "value", parseFloat(editValue) || 0);
      if (editPru) onUpdate(asset.id, "buyPrice", parseFloat(editPru));
    }
    setEditing(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="group relative rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: cfg.color + "80" }} />

      {!editing ? (
        <div className="flex items-center gap-3 px-4 py-3 pl-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-sm font-semibold text-white truncate leading-tight">{asset.name}</span>
              {asset.ticker && <span className="text-[9px] font-mono text-zinc-600 shrink-0">{asset.ticker}</span>}
              {ec && asset.envelope && (
                <span className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: ec.bg, color: ec.text }}>
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: ec.dot }} />{asset.envelope}
                </span>
              )}
            </div>
            {isStock && asset.quantity && asset.unitPrice ? (
              <span className="text-[10px] text-zinc-600 tabular-nums">{asset.quantity} × {asset.unitPrice.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
            ) : isImmo && asset.buyPrice ? (
              <span className="text-[10px] text-zinc-600">Acheté {fmt(asset.buyPrice)}</span>
            ) : null}
          </div>
          {gainPct !== null && (
            <div className="text-xs font-bold tabular-nums" >
              <p className="text-xs font-bold tabular-nums">{gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%</p>
              {gainAbs !== null && <p className="text-[10px] opacity-60 tabular-nums">{gainAbs > 0 ? "+" : ""}{fmt(gainAbs)}</p>}
            </div>
          )}
          <p className="text-sm font-black text-white tabular-nums shrink-0 min-w-[72px] text-right">{fmt(asset.value)}</p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => { setEditing(true); setEditQty(String(asset.quantity??"")); setEditPru(String(asset.buyPrice??"")); setEditPrice(String(asset.unitPrice??"")); setEditValue(String(asset.value??"")); }}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Modifier">
              <Edit3 size={12} />
            </button>
            {asset.ticker && (
              <button onClick={() => onRefreshPrice(asset.id, asset.ticker!)}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                <RefreshCw size={12} />
              </button>
            )}
            <button onClick={() => onRemove(asset.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 pl-5 space-y-3" style={{ backgroundColor: cfg.color + "06" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white truncate">{asset.name}</p>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider shrink-0 ml-2">Édition</span>
          </div>
          {isStock ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Quantité", val: editQty, set: setEditQty, green: false },
                { label: "PRU (€)", val: editPru, set: setEditPru, green: false },
                { label: "Prix actuel (€)", val: editPrice, set: setEditPrice, green: true },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[9px] font-bold uppercase block mb-1">{f.label}</label>
                  <Input type="number" value={f.val} onChange={e => f.set(e.target.value)}
                    className="h-9 rounded-lg text-xs bg-black/40 border-white/10 text-white w-full" />
                </div>
              ))}
              {editQty && editPrice && (
                <div className="col-span-3 flex items-center justify-between bg-white/3 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-zinc-500">Nouvelle valeur calculée</span>
                  <span className="text-sm font-black text-white tabular-nums">{fmt((parseFloat(editQty)||0)*(parseFloat(editPrice)||0))}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-emerald-400 uppercase block mb-1">Valeur actuelle (€)</label>
                <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                  className="h-9 rounded-lg text-xs bg-emerald-950/30 border-emerald-500/30 text-emerald-400 font-bold w-full" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Prix d'achat (€)</label>
                <Input type="number" value={editPru} onChange={e => setEditPru(e.target.value)}
                  className="h-9 rounded-lg text-xs bg-black/40 border-white/10 text-white w-full" />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="flex-1 h-8 rounded-lg text-xs font-bold text-black transition-all hover:opacity-90" style={{ backgroundColor: cfg.color }}>✓ Enregistrer</button>
            <button onClick={() => setEditing(false)} className="px-4 h-8 rounded-lg text-xs font-bold text-zinc-400 bg-white/5 hover:bg-white/10 transition-all">Annuler</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── PAGE PRINCIPALE ───────────────────────────────────────────────────────
export default function PatrimoinePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [liquidCash, setLiquidCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<Asset[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [hideValues, setHideValues] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [netWorthHistory, setNetWorthHistory] = useState<{ date: string; value: number }[]>([]);
  const netWorthHistoryRef = useRef<{ date: string; value: number }[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("assets_json, net_worth_history")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) console.error("fetchData error:", error.message);

      if (data?.assets_json?.length > 0) {
        setAssets(data.assets_json);
        calcTotals(data.assets_json);
        if (data.net_worth_history?.length > 0) {
          setNetWorthHistory(data.net_worth_history);
          netWorthHistoryRef.current = data.net_worth_history;
        }
      }
    } catch (e) {
      console.error("fetchData exception:", e);
    } finally {
      setLoading(false);
    }
  };

  const calcTotals = (a: Asset[]) => {
    setNetWorth(a.reduce((s, x) => s + getVal(x.value), 0));
    setLiquidCash(a.filter(x => x.type === "Cash" || x.type === "AssuranceVie").reduce((s, x) => s + getVal(x.value), 0));
  };

  // Sauvegarde Supabase robuste — utilise un ref pour éviter la closure stale
  const save = async (a: Asset[]) => {
    setSaveStatus("saving");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveStatus("error"); return; }

    const total = a.reduce((s, x) => s + x.value, 0);
    const today = new Date().toISOString().split("T")[0];

    // Utilise le REF (pas le state) pour éviter les closures stales
    const existingHistory = netWorthHistoryRef.current;
    const updatedHistory = [
      ...existingHistory.filter(h => h.date !== today),
      { date: today, value: Math.round(total) }
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(-365);

    // Met à jour state ET ref
    setNetWorthHistory(updatedHistory);
    netWorthHistoryRef.current = updatedHistory;

    // Tentative update
    const { error } = await supabase.from("profiles").update({
      assets_json: a,
      net_worth: total,
      net_worth_history: updatedHistory,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    if (error) {
      console.error("Update failed, trying upsert:", error.message);
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        assets_json: a,
        net_worth: total,
        net_worth_history: updatedHistory,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (upsertError) {
        console.error("Upsert also failed:", upsertError.message);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
        return;
      }
    }

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const addAsset = (asset: Asset) => {
    const updated = [asset, ...assets];
    setAssets(updated); calcTotals(updated); save(updated);
  };

  const addImportedAsset = (asset: Asset) => {
    setAssets(prev => {
      const updated = [asset, ...prev];
      calcTotals(updated); save(updated);
      return updated;
    });
  };

  // Connexion simulateur — après les fonctions pour éviter le hoisting
  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const simData = params.get("import");
    if (simData) {
      try {
        const sim = JSON.parse(decodeURIComponent(simData));
        if (sim.name && sim.price) {
          const asset: Asset = {
            id: Date.now().toString(), name: sim.name, type: "Immobilier",
            value: sim.price, buyPrice: sim.price, notaryFees: sim.notaryFees,
            workCost: sim.works, loanCost: sim.totalCreditCost,
          };
          setTimeout(() => addImportedAsset(asset), 800);
        }
      } catch {}
    }
  }, []);

  const removeAsset = (id: string) => {
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated); calcTotals(updated); save(updated);
  };

  const updateAsset = (id: string, field: keyof Asset, val: any) => {
    const updated = assets.map(a => {
      if (a.id !== id) return a;
      const next = { ...a, [field]: val };
      if ((a.type === "Bourse" || a.type === "Crypto") && (field === "quantity" || field === "unitPrice")) {
        next.value = (parseFloat(String(field === "quantity" ? val : a.quantity)) || 0) * (parseFloat(String(field === "unitPrice" ? val : a.unitPrice)) || 0);
      }
      return next;
    });
    setAssets(updated); calcTotals(updated); save(updated);
  };

  const refreshPrice = async (id: string, ticker: string) => {
    setRefreshingId(id);
    const price = await fetchLivePrice(ticker);
    if (price) updateAsset(id, "unitPrice", price);
    setRefreshingId(null);
  };

  // Scanner IA
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      let b64 = "";
      if (file.type === "application/pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages = Math.min(pdf.numPages, 5);
        const canvases: HTMLCanvasElement[] = [];
        let totalH = 0, maxW = 0;
        for (let i = 1; i <= pages; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 1.5 });
          const c = document.createElement("canvas"); c.height = vp.height; c.width = vp.width;
          await page.render({ canvasContext: c.getContext("2d")!, viewport: vp } as any).promise;
          canvases.push(c); totalH += vp.height; maxW = Math.max(maxW, vp.width);
        }
        const final = document.createElement("canvas"); final.width = maxW; final.height = totalH;
        const ctx = final.getContext("2d")!;
        let y = 0; for (const c of canvases) { ctx.drawImage(c, 0, y); y += c.height; }
        b64 = final.toDataURL("image/jpeg", 0.7);
      } else { b64 = await fileToBase64(file); }

      const res = await fetch("/api/scan-patrimoine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: b64 }) });
      const data = await res.json();
      if (data.assets?.length > 0) {
        setScannedItems(data.assets.map((item: any, i: number) => ({ id: `ai-${Date.now()}-${i}`, name: item.name || "Actif IA", value: Number(item.value) || 0, type: (item.type as AssetType) || "Autre", quantity: item.quantity ? Number(item.quantity) : undefined, unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined })));
        setShowValidation(true);
      } else alert("Aucun actif détecté.");
    } catch (err: any) { alert("Erreur : " + err.message); }
    finally { setIsScanning(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  // Données chart
  const chartData = Object.entries(
    assets.reduce((acc: Record<string, number>, a) => { acc[a.type] = (acc[a.type] || 0) + getVal(a.value); return acc; }, {})
  ).map(([type, value]) => ({ name: ASSET_CONFIG[type as AssetType]?.label || type, value, color: ASSET_CONFIG[type as AssetType]?.color || "#71717a" }));

  // Total P&L global
  const totalGain = assets.reduce((sum, a) => {
    const isStock = a.type === "Bourse" || a.type === "Crypto";
    const isImmo = a.type === "Immobilier";
    if (isStock && a.buyPrice && a.quantity) return sum + (a.value - a.buyPrice * a.quantity);
    if (isImmo && a.buyPrice) return sum + (a.value - (a.buyPrice + (a.notaryFees || 0) + (a.workCost || 0) + (a.loanCost || 0)));
    return sum;
  }, 0);
  const hasGainData = assets.some(a => a.buyPrice);

  if (loading) return <div className="min-h-screen bg-[#030303] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500 w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-emerald-500/30 overflow-x-hidden">

      {/* Scanner overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="flex flex-col items-center gap-6">
              <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                <ScanLine size={36} className="relative z-10" />
                <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,1)] z-20" />
              </motion.div>
              <p className="text-white font-black uppercase tracking-widest">Analyse en cours...</p>
            </div>
          </motion.div>
        )}

        {/* Validation scan IA */}
        {showValidation && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowValidation(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-2xl bg-[#0A0A0C] border border-emerald-500/30 rounded-3xl flex flex-col overflow-hidden max-h-[85vh]">
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-emerald-900/10">
                <div className="flex items-center gap-3">
                  <ScanLine size={18} className="text-emerald-400" />
                  <h3 className="font-black text-white uppercase tracking-wide">{scannedItems.length} actifs détectés</h3>
                </div>
                <button onClick={() => setShowValidation(false)} className="p-2 rounded-xl text-zinc-500 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-2">
                {scannedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Input value={item.name} onChange={e => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                        className="bg-zinc-900 border-white/10 h-9 text-white font-bold text-sm w-full" />
                      <div className="relative">
                        <Input type="number" value={item.value} onChange={e => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, value: Number(e.target.value) } : i))}
                          className="bg-zinc-900 border-white/10 h-9 text-emerald-400 font-black text-sm pr-7 w-full" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs">€</span>
                      </div>
                    </div>
                    <Select value={item.type} onValueChange={val => setScannedItems(scannedItems.map(i => i.id === item.id ? { ...i, type: val as AssetType } : i))}>
                      <SelectTrigger className="w-40 bg-zinc-900 border-white/10 h-9 text-sm shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white z-[999]">
                        {Object.keys(ASSET_CONFIG).map(t => <SelectItem key={t} value={t}>{ASSET_CONFIG[t as AssetType].label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-white/5">
                <Button onClick={async () => { const n = [...assets, ...scannedItems]; setAssets(n); calcTotals(n); await save(n); setShowValidation(false); setScannedItems([]); }}
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-500 text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all">
                  Importer {scannedItems.length} actifs →
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />

      <Sidebar />
      <main className="md:ml-64 flex-1 w-full md:w-auto min-w-0 p-4 md:p-8 relative overflow-x-hidden">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] w-full mx-auto space-y-6 md:space-y-8 relative z-10">

          {/* ── HEADER ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-l-4 border-emerald-500 pl-4 py-2">
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
                Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Patrimoine</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-1">L'inventaire de tout ce que vous possédez, simplifié.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Indicateur de sauvegarde */}
              <AnimatePresence>
                {saveStatus !== "idle" && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                      saveStatus === "saving" ? "bg-zinc-800 text-zinc-400" :
                      saveStatus === "saved"  ? "bg-emerald-500/15 text-emerald-400" :
                                               "bg-red-500/15 text-red-400"
                    }`}>
                    {saveStatus === "saving" && <Loader2 size={11} className="animate-spin" />}
                    {saveStatus === "saved"  && <Check size={11} />}
                    {saveStatus === "error"  && <AlertTriangle size={11} />}
                    {saveStatus === "saving" ? "Sauvegarde..." : saveStatus === "saved" ? "Sauvegardé" : "Erreur"}
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={() => setHideValues(v => !v)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all text-xs font-bold">
                {hideValues ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-emerald-500/30 transition-all text-xs font-bold uppercase tracking-wider">
                <ScanLine size={14} className="text-emerald-400" /> Scanner IA
              </button>
            </div>
          </div>

          {/* ── KPIs HERO ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">

            {/* Net Worth */}
            <div className="lg:col-span-2 relative rounded-[24px] bg-gradient-to-br from-zinc-900 via-[#0A1A0F] to-black border border-emerald-500/20 overflow-hidden p-6 md:p-8 shadow-[0_0_60px_rgba(16,185,129,0.08)]">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px]" />
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Votre Richesse Totale
                </span>
                {hasGainData && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${totalGain >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
                    {totalGain >= 0 ? "+" : ""}{fmt(totalGain)} P&L
                  </span>
                )}
              </div>
              <div className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                {hideValues ? "••••• €" : <AnimatedNumber value={netWorth} />}
              </div>
              {hasGainData && !hideValues && (
                <p className={`text-sm font-bold mt-2 ${totalGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalGain >= 0 ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                  {totalGain >= 0 ? "+" : ""}{fmt(totalGain)} de plus-value latente
                </p>
              )}
            </div>

            {/* Matelas sécurité */}
            <div className="relative rounded-[24px] bg-gradient-to-br from-zinc-900 to-black border border-pink-500/20 overflow-hidden p-6 shadow-[0_0_40px_rgba(236,72,153,0.06)]">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-pink-500/5 rounded-full blur-[60px]" />
              <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-pink-400 uppercase tracking-widest">
                <ShieldCheck size={14} /> Matelas de Sécurité
                <HelpTooltip text="Cash & livrets disponibles immédiatement. Objectif : 3-6 mois de dépenses." />
              </div>
              <div className="text-4xl md:text-5xl font-black text-white">
                {hideValues ? "•••••" : <AnimatedNumber value={liquidCash} />}
              </div>
              <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (liquidCash / (netWorth || 1)) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">{netWorth > 0 ? `${((liquidCash / netWorth) * 100).toFixed(1)}% de votre patrimoine` : "Aucun actif"}</p>
            </div>
          </div>

          {/* ── GRAPHIQUE HISTORIQUE ───────────────────────── */}
          {netWorthHistory.length > 1 && (
            <div className="rounded-[24px] bg-[#0A0A0C] border border-white/8 p-5 md:p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Évolution du patrimoine</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{netWorthHistory.length} points · {netWorthHistory[0]?.date} → aujourd'hui</p>
                </div>
                {netWorthHistory.length >= 2 && (() => {
                  const first = netWorthHistory[0].value;
                  const last = netWorthHistory[netWorthHistory.length - 1].value;
                  const diff = last - first;
                  const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : "0";
                  return (
                    <span className={`text-sm font-black px-3 py-1.5 rounded-xl border ${diff >= 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
                      {diff >= 0 ? "+" : ""}{fmt(diff)} ({diff >= 0 ? "+" : ""}{pct}%)
                    </span>
                  );
                })()}
              </div>
              <div className="h-[160px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netWorthHistory} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="date" stroke="#3f3f46" fontSize={9} tickLine={false} axisLine={false}
                      tickFormatter={d => {
                        const date = new Date(d);
                        return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
                      }}
                      interval="preserveStartEnd"
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                      itemStyle={{ color: "#fff", fontWeight: "bold" }}
                      formatter={(v: any) => [fmt(v), "Patrimoine"]}
                      labelFormatter={d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2}
                      fill="url(#colorNetWorth)" name="Patrimoine" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── MAIN GRID ──────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full min-w-0">

            {/* Liste actifs — 2/3 */}
            <div className="xl:col-span-2 space-y-4 min-w-0">

              {/* Header + bouton ajouter */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-white to-zinc-600 rounded-full" />
                  Vos investissements
                  <span className="text-xs font-normal text-zinc-500 normal-case tracking-normal">{assets.length} actifs</span>
                </h3>
                <button onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: "linear-gradient(135deg, #10b981, #0d9488)", boxShadow: "0 4px 20px -4px rgba(16,185,129,0.5)" }}>
                  <Plus size={15} /> Ajouter
                </button>
              </div>

              {/* Modal */}
              <AddAssetModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addAsset} />

              {/* Groupes par type */}
              {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-white/8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                    <Plus size={28} />
                  </div>
                  <p className="text-white font-bold mb-1">Aucun actif</p>
                  <p className="text-zinc-500 text-sm mb-4">Ajoutez vos premiers investissements</p>
                  <button onClick={() => setModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-black font-bold text-sm hover:bg-emerald-500 transition-all">
                    + Ajouter un actif
                  </button>
                </div>
              ) : (
                <div className="space-y-3 w-full min-w-0">
                  {(Object.keys(ASSET_CONFIG) as AssetType[]).map(type => {
                    const cat = assets.filter(a => a.type === type);
                    if (!cat.length) return null;
                    const cfg = ASSET_CONFIG[type];
                    const catTotal = cat.reduce((s, a) => s + getVal(a.value), 0);
                    const pct = netWorth > 0 ? (catTotal / netWorth) * 100 : 0;
                    const Icon = cfg.icon;

                    // P&L total de la catégorie
                    const catGain = cat.reduce((sum, a) => {
                      const isS = a.type === "Bourse" || a.type === "Crypto";
                      const isI = a.type === "Immobilier";
                      if (isS && a.buyPrice && a.quantity) return sum + (a.value - a.buyPrice * a.quantity);
                      if (isI && a.buyPrice) return sum + (a.value - (a.buyPrice + (a.notaryFees||0) + (a.workCost||0) + (a.loanCost||0)));
                      return sum;
                    }, 0);
                    const hasCatGain = cat.some(a => a.buyPrice);

                    // Grouper par enveloppe si Bourse
                    const envelopeGroups = type === "Bourse" || type === "Crypto"
                      ? Array.from(new Set(cat.map(a => a.envelope || "—")))
                      : null;

                    return (
                      <div key={type} className="rounded-2xl overflow-hidden border border-white/6 bg-[#0B0B0D]">
                        {/* Header catégorie */}
                        <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${cfg.color}20` }}>
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Icône avec accent couleur */}
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.color + "18" }}>
                                <Icon size={15} style={{ color: cfg.color }} />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white">{cfg.label}</p>
                                <span className="text-[9px] text-zinc-600 font-medium">{cat.length} actif{cat.length > 1 ? "s" : ""}</span>
                              </div>
                              {/* Barre de progression inline */}
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                                </div>
                                <span className="text-[9px] text-zinc-600 tabular-nums">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-white tabular-nums">{hideValues ? "•••" : fmt(catTotal)}</p>
                            {hasCatGain && !hideValues && (
                              <p className={`text-[10px] font-bold tabular-nums ${catGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {catGain >= 0 ? "+" : ""}{fmt(catGain)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Sous-groupes par enveloppe (Bourse/Crypto uniquement) */}
                        {envelopeGroups && envelopeGroups.length > 1 ? (
                          <div>
                            {envelopeGroups.map(env => {
                              const envAssets = cat.filter(a => (a.envelope || "—") === env);
                              const envTotal = envAssets.reduce((s, a) => s + getVal(a.value), 0);
                              const envColors: Record<string, { bg: string; color: string; dot: string }> = {
                                PEA:       { bg: "#10b98108", color: "#10b981", dot: "#10b981" },
                                "PEA-PME": { bg: "#8b5cf608", color: "#8b5cf6", dot: "#8b5cf6" },
                                CTO:       { bg: "#f59e0b08", color: "#f59e0b", dot: "#f59e0b" },
                                Autre:     { bg: "#71717a08", color: "#71717a", dot: "#71717a" },
                                "—":       { bg: "#ffffff04", color: "#71717a", dot: "#52525b" },
                              };
                              const ec = envColors[env] || envColors["—"];
                              return (
                                <div key={env} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", backgroundColor: ec.bg }}>
                                  {/* Sous-header enveloppe */}
                                  {env !== "—" && (
                                    <div className="flex items-center justify-between px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ec.dot }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ec.color }}>{env}</span>
                                        <span className="text-[9px] text-zinc-600">{envAssets.length} ligne{envAssets.length > 1 ? "s" : ""}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{hideValues ? "•••" : fmt(envTotal)}</span>
                                    </div>
                                  )}
                                  <div className="px-3 pb-2 space-y-1 pt-1">
                                    <AnimatePresence>
                                      {envAssets.map(a => (
                                        <AssetCard key={a.id} asset={a} onRemove={removeAsset} onUpdate={updateAsset} onRefreshPrice={refreshPrice} />
                                      ))}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="px-3 py-2 space-y-1">
                            <AnimatePresence>
                              {cat.map(a => (
                                <AssetCard key={a.id} asset={a} onRemove={removeAsset} onUpdate={updateAsset} onRefreshPrice={refreshPrice} />
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar droite — 1/3 */}
            <div className="space-y-4 min-w-0">

              {/* Répartition donut + barres */}
              <div className="rounded-2xl bg-[#0A0A0C] border border-white/8 p-5 overflow-hidden">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <PieIcon size={13} /> Allocation
                </p>
                {chartData.length > 0 ? (
                  <>
                    {/* Donut */}
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} innerRadius={42} outerRadius={62} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={3}>
                            {chartData.map((e, i) => <Cell key={i} fill={e.color} style={{ filter: `drop-shadow(0 0 8px ${e.color}60)` }} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: "rgba(10,10,12,1)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "11px", padding: "10px" }} itemStyle={{ color: "#fff", fontWeight: "bold" }} formatter={(v: any) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Barres horizontales */}
                    <div className="space-y-2.5 mt-3">
                      {chartData.sort((a,b) => b.value - a.value).map((e, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                              <span className="text-zinc-400 truncate">{e.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-zinc-600 tabular-nums">{netWorth > 0 ? ((e.value/netWorth)*100).toFixed(1) : 0}%</span>
                              <span className="font-bold text-white tabular-nums">{hideValues ? "•••" : fmt(e.value)}</span>
                            </div>
                          </div>
                          <div className="h-1 bg-white/4 rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${netWorth > 0 ? (e.value/netWorth)*100 : 0}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} style={{ backgroundColor: e.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-36 flex items-center justify-center text-zinc-700 text-sm">Aucun actif</div>
                )}
              </div>

              {/* Répartition par enveloppe */}
              {assets.some(a => a.envelope) && (() => {
                const envData = ["PEA","CTO","PEA-PME","Autre"].map(env => {
                  const total = assets.filter(a => a.envelope === env).reduce((s,a) => s + a.value, 0);
                  return { env, total };
                }).filter(e => e.total > 0);
                const envColors: Record<string,string> = { PEA: "#10b981", CTO: "#f59e0b", "PEA-PME": "#8b5cf6", Autre: "#71717a" };
                return (
                  <div className="rounded-2xl bg-[#0A0A0C] border border-white/8 p-5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Enveloppes fiscales</p>
                    <div className="space-y-3">
                      {envData.map(({ env, total }) => {
                        const pct = netWorth > 0 ? (total / netWorth) * 100 : 0;
                        const taxLabel = env === "PEA" || env === "PEA-PME" ? "17,2% / 5 ans" : env === "CTO" ? "30% PFU" : "Variable";
                        return (
                          <div key={env}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold" style={{ color: envColors[env] }}>{env}</span>
                                <span className="text-zinc-700 text-[9px]">{taxLabel}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-600 tabular-nums text-[10px]">{pct.toFixed(1)}%</span>
                                <span className="font-bold text-white tabular-nums">{hideValues ? "•••" : fmt(total)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-white/4 rounded-full overflow-hidden">
                              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} style={{ backgroundColor: envColors[env] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Ratio PEA/CTO */}
                    {envData.length >= 2 && (() => {
                      const peaTotal = envData.find(e => e.env === "PEA")?.total || 0;
                      const ctoTotal = envData.find(e => e.env === "CTO")?.total || 0;
                      if (!peaTotal && !ctoTotal) return null;
                      const peaPct = peaTotal + ctoTotal > 0 ? (peaTotal/(peaTotal+ctoTotal)*100) : 0;
                      return (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-[9px] text-zinc-600 mb-1.5">Ratio PEA / CTO</p>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${peaPct}%` }} />
                            <div className="h-full bg-amber-500 flex-1" />
                          </div>
                          <div className="flex justify-between text-[9px] mt-1">
                            <span className="text-emerald-500">{peaPct.toFixed(0)}% PEA</span>
                            <span className="text-amber-500">{(100-peaPct).toFixed(0)}% CTO</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Scanner IA */}
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-[#022c22] to-[#0A0515] hover:border-emerald-400/50 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/3 group-hover:bg-emerald-500/6 transition-colors" />
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 relative z-10">
                  <ScanLine size={18} />
                </div>
                <div className="text-left relative z-10 min-w-0">
                  <p className="text-white font-bold text-sm flex items-center gap-2">Scanner un relevé
                    <span className="text-[8px] bg-gradient-to-r from-emerald-500 to-teal-500 text-black px-1.5 py-0.5 rounded font-black uppercase">GPT-4o</span>
                  </p>
                  <p className="text-zinc-500 text-[10px] mt-0.5">PDF ou image</p>
                </div>
              </button>

              {/* KPIs analytiques */}
              {assets.length > 0 && (
                <div className="rounded-2xl bg-[#0A0A0C] border border-white/8 p-5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Analytique</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Nb de positions", value: `${assets.length}`, icon: "▣" },
                      { label: "1ère position", value: hideValues ? "•••" : fmt(Math.max(...assets.map(a => a.value))), icon: "↑" },
                      { label: "Dernière position", value: hideValues ? "•••" : fmt(Math.min(...assets.map(a => a.value))), icon: "↓" },
                      hasGainData ? { label: "P&L latent", value: `${totalGain >= 0 ? "+" : ""}${hideValues ? "•••" : fmt(totalGain)}`, icon: totalGain >= 0 ? "▲" : "▼", color: totalGain >= 0 ? "#10b981" : "#ef4444" } : null,
                      hasGainData && assets.filter(a => (a.type==="Bourse"||a.type==="Crypto") && a.buyPrice && a.quantity).length > 0 ? {
                        label: "Perf. moyenne",
                        value: (() => {
                          const stockAssets = assets.filter(a => (a.type==="Bourse"||a.type==="Crypto") && a.buyPrice && a.quantity && a.unitPrice);
                          if (!stockAssets.length) return "—";
                          const avg = stockAssets.reduce((s, a) => s + ((a.unitPrice!/a.buyPrice!)-1)*100, 0) / stockAssets.length;
                          return `${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%`;
                        })(),
                        icon: "~", color: "#a1a1aa"
                      } : null,
                    ].filter(Boolean).map((s: any, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/4 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-700 w-3 text-center">{s.icon}</span>
                          <span className="text-[11px] text-zinc-500">{s.label}</span>
                        </div>
                        <span className="text-xs font-bold tabular-nums" style={{ color: s.color || "#ffffff" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}