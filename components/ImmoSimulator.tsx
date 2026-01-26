"use client";

import { useState, useEffect } from "react";
import { Wallet, Building2, Calculator, AlertCircle, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// --- CORRECTION CRUCIALE : Ce composant DOIT être à l'extérieur ---
const InputGroup = ({ label, value, onChange, suffix, placeholder }: any) => (
  <div className="flex flex-col gap-2">
      <label className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 ml-1">{label}</label>
      <div className="relative group">
          <Input 
              type="number" 
              value={value === 0 ? "" : value}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              placeholder={placeholder || "0"}
              className="bg-zinc-900/50 border border-zinc-800 text-white font-semibold pl-4 pr-8 h-12 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-zinc-700 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm font-medium pointer-events-none group-focus-within:text-emerald-500 transition-colors">{suffix}</span>}
      </div>
  </div>
);

export default function ImmoSimulator() {
  const [mode, setMode] = useState<"capacity" | "project">("capacity");

  // --- STATE CAPACITÉ ---
  const [capacity, setCapacity] = useState({
    income: 0,
    charges: 0,
    duration: 25,
    rate: 3.8
  });

  const [capResults, setCapResults] = useState({
    maxLoan: 0,
    maxMonthly: 0,
    totalEnvelope: 0
  });

  // --- STATE PROJET ---
  const [project, setProject] = useState({
    price: 0,
    works: 0,
    contribution: 0,
    notaryRate: 8,
    rent: 0,
    charges: 0,
    tax: 0,
  });

  const [projResults, setProjResults] = useState({
    totalCost: 0,
    cashflow: 0,
    yieldNet: 0,
    monthlyPayment: 0
  });

  // --- CALCULS ---
  useEffect(() => {
    // Capacité
    const limit = Math.max(0, (capacity.income - capacity.charges) * 0.35);
    const rateM = (capacity.rate / 100) / 12;
    const months = capacity.duration * 12;
    
    let maxLoan = 0;
    if (rateM > 0 && limit > 0) {
        maxLoan = (limit * (1 - Math.pow(1 + rateM, -months))) / rateM;
    }
    
    setCapResults({
        maxMonthly: limit,
        maxLoan: maxLoan,
        totalEnvelope: maxLoan
    });
  }, [capacity]);

  useEffect(() => {
    // Projet
    const notary = project.price * (project.notaryRate / 100);
    const total = project.price + project.works + notary;
    const loan = Math.max(0, total - project.contribution);
    
    const rateProj = 4.0 / 100 / 12; 
    let payment = 0;
    if (loan > 0) {
        payment = loan * (rateProj * Math.pow(1 + rateProj, 240)) / (Math.pow(1 + rateProj, 240) - 1);
    }
    
    const chargesM = (project.charges + (project.tax / 12));
    const cashflow = project.rent - payment - chargesM;
    const yieldN = total > 0 ? ((project.rent * 12) - (chargesM * 12)) / total * 100 : 0;

    setProjResults({
        totalCost: total,
        cashflow,
        yieldNet: yieldN,
        monthlyPayment: payment
    });
  }, [project]);

  return (
    <div className="space-y-8 pb-20 font-sans max-w-5xl mx-auto">
      
      {/* HEADER & TOGGLE (Titre doublon supprimé) */}
      <div className="flex flex-col items-center gap-6 mb-4">
        
        {/* TOGGLE PILULE PREMIUM */}
        <div className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-full inline-flex relative shadow-inner">
            <button 
                onClick={() => setMode("capacity")}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${mode === "capacity" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                Ma Capacité
            </button>
            <button 
                onClick={() => setMode("project")}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${mode === "project" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                Projet Immo
            </button>
        </div>
      </div>

      {/* --- VUE 1 : CAPACITÉ --- */}
      {mode === "capacity" && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
             
             {/* RESULTAT HERO (En haut, centré, massif) */}
             <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-10 md:p-14 text-center group">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-emerald-500/10 blur-[90px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700" />
                
                <p className="text-emerald-500 font-bold tracking-[0.2em] text-xs uppercase mb-4 relative z-10">Enveloppe d'Achat Max</p>
                <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(16,185,129,0.2)] relative z-10">
                    {(capResults.totalEnvelope).toLocaleString("fr-FR")} €
                </h2>
                
                <div className="mt-8 flex justify-center gap-8 md:gap-16 relative z-10 border-t border-zinc-900 pt-6 max-w-lg mx-auto">
                     <div className="text-center">
                        <div className="text-2xl font-bold text-white">{(capResults.maxMonthly).toFixed(0)} €</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Mensualité Max</div>
                     </div>
                     <div className="w-px bg-zinc-900 h-10" />
                     <div className="text-center">
                        <div className="text-2xl font-bold text-white">35%</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Endettement</div>
                     </div>
                </div>
             </div>

             {/* INPUTS (En bas, large) */}
             <Card className="bg-zinc-900/30 border-zinc-800">
                <CardContent className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup label="Revenus Net / Mois" value={capacity.income} onChange={(v: number) => setCapacity({...capacity, income: v})} suffix="€" />
                        <InputGroup label="Charges Crédits Actuels" value={capacity.charges} onChange={(v: number) => setCapacity({...capacity, charges: v})} suffix="€" />
                        <InputGroup label="Durée (Années)" value={capacity.duration} onChange={(v: number) => setCapacity({...capacity, duration: v})} suffix="ans" />
                        <InputGroup label="Taux Intérêt (%)" value={capacity.rate} onChange={(v: number) => setCapacity({...capacity, rate: v})} suffix="%" />
                    </div>
                </CardContent>
             </Card>
          </div>
      )}

      {/* --- VUE 2 : PROJET IMMO --- */}
      {mode === "project" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            
            {/* INPUTS */}
            <div className="lg:col-span-2 space-y-4">
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-zinc-800">
                             <Building2 className="text-emerald-500" size={20} /> 
                             <h3 className="font-bold text-white">Acquisition</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputGroup label="Prix Vendeur" value={project.price} onChange={(v: number) => setProject({...project, price: v})} suffix="€" />
                            <InputGroup label="Travaux" value={project.works} onChange={(v: number) => setProject({...project, works: v})} suffix="€" />
                            <InputGroup label="Apport" value={project.contribution} onChange={(v: number) => setProject({...project, contribution: v})} suffix="€" />
                            <InputGroup label="Notaire (%)" value={project.notaryRate} onChange={(v: number) => setProject({...project, notaryRate: v})} suffix="%" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-6">
                         <div className="flex items-center gap-2 mb-6 pb-2 border-b border-zinc-800">
                             <TrendingUp className="text-blue-500" size={20} /> 
                             <h3 className="font-bold text-white">Exploitation</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <InputGroup label="Loyer Mensuel CC" value={project.rent} onChange={(v: number) => setProject({...project, rent: v})} suffix="€" />
                            </div>
                            <InputGroup label="Charges Copro /mois" value={project.charges} onChange={(v: number) => setProject({...project, charges: v})} suffix="€" />
                            <InputGroup label="Taxe Foncière /an" value={project.tax} onChange={(v: number) => setProject({...project, tax: v})} suffix="€" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* RESULTATS */}
            <div className="space-y-4">
                <Card className={`border-zinc-800 overflow-hidden relative ${projResults.cashflow >= 0 ? "bg-emerald-950/10" : "bg-red-950/10"}`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${projResults.cashflow >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                    <CardContent className="p-8 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Cashflow Net</p>
                        <div className={`text-4xl md:text-5xl font-black ${projResults.cashflow >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                            {projResults.cashflow > 0 && "+"}{projResults.cashflow.toFixed(0)} €
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">par mois</p>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4 text-center">
                             <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Renta Nette</p>
                             <p className={`text-2xl font-bold ${projResults.yieldNet > 4 ? "text-emerald-400" : "text-white"}`}>{projResults.yieldNet.toFixed(1)}%</p>
                        </CardContent>
                    </Card>
                     <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4 text-center">
                             <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Coût Total</p>
                             <p className="text-2xl font-bold text-white">{(projResults.totalCost/1000).toFixed(0)} k€</p>
                        </CardContent>
                    </Card>
                </div>
                
                 <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex gap-3 items-start">
                    <AlertCircle className="text-zinc-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Le cashflow est calculé après crédit, charges et taxe foncière.
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}