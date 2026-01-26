"use client";

import { useState, useEffect } from "react";
import { Calculator, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function ImmoSimulator() {
  const [mode, setMode] = useState<"capacity" | "project">("capacity");

  // --- 1. STATE CAPACITÉ (Combien je peux emprunter ?) ---
  const [capacity, setCapacity] = useState({
    income: 0,
    charges: 0,
    duration: 25,
    rate: 3.8
  });

  const [capResults, setCapResults] = useState({
    maxLoan: 0,
    maxMonthly: 0,
    notaryEst: 0,
    totalEnvelope: 0
  });

  // --- 2. STATE PROJET (Rentabilité) ---
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
    // A. Calcul Capacité
    const limit = (capacity.income - capacity.charges) * 0.35; // 35% endettement
    const rateM = (capacity.rate / 100) / 12;
    const months = capacity.duration * 12;
    
    let maxLoan = 0;
    if (rateM > 0 && limit > 0) {
        maxLoan = (limit * (1 - Math.pow(1 + rateM, -months))) / rateM;
    }
    
    // On estime les frais de notaire (~8%) pour donner l'enveloppe "Net Vendeur" (ce qu'on peut vraiment offrir)
    const notaryEst = maxLoan * 0.08; 
    
    setCapResults({
        maxMonthly: limit > 0 ? limit : 0,
        maxLoan: maxLoan,
        notaryEst: notaryEst,
        totalEnvelope: maxLoan // C'est le budget total (crédit)
    });

  }, [capacity]);

  useEffect(() => {
    // B. Calcul Projet
    const notary = project.price * (project.notaryRate / 100);
    const total = project.price + project.works + notary;
    const loan = Math.max(0, total - project.contribution);
    
    // Crédit sur 20 ans à 4.0% (Fixe pour l'exemple projet)
    const rateProj = 4.0 / 100 / 12;
    const payment = loan * (rateProj * Math.pow(1 + rateProj, 240)) / (Math.pow(1 + rateProj, 240) - 1);
    
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

  // --- COMPOSANTS UI ---
  const inputClass = "bg-zinc-900 border border-zinc-800 text-white font-semibold pl-3 pr-4 h-12 rounded-xl focus:ring-1 focus:ring-emerald-500 placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all";
  
  const InputGroup = ({ label, value, onChange, suffix, placeholder }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 ml-1">{label}</label>
        <div className="relative">
            <Input 
                type="number" 
                value={value === 0 ? "" : value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                placeholder={placeholder || "0"}
                className={inputClass}
            />
            {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm font-medium pointer-events-none">{suffix}</span>}
        </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 font-sans">
      
      {/* HEADER & TOGGLE */}
      <div className="flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">Simulateur Immobilier<span className="text-emerald-500">.</span></h1>
            <p className="text-zinc-500 text-sm">Analysez votre potentiel d'investissement.</p>
        </div>

        {/* LE TOGGLE "PREMIUM" */}
        <div className="p-1 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full inline-flex relative">
            <button 
                onClick={() => setMode("capacity")}
                className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${mode === "capacity" ? "text-black bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]" : "text-zinc-400 hover:text-white"}`}
            >
                Ma Capacité
            </button>
            <button 
                onClick={() => setMode("project")}
                className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${mode === "project" ? "text-black bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]" : "text-zinc-400 hover:text-white"}`}
            >
                Projet Immo
            </button>
        </div>
      </div>

      {/* --- VUE 1 : CAPACITÉ --- */}
      {mode === "capacity" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
             
             {/* CARTE RESULTAT (ENVELOPPE) */}
             <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-8 md:p-12 text-center group">
                {/* Glow Effect arrière plan */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/15 transition-all duration-700" />
                
                <p className="text-emerald-500 font-bold tracking-widest text-xs uppercase mb-4 relative z-10">Enveloppe d'Achat Max</p>
                <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] relative z-10">
                    {(capResults.totalEnvelope).toLocaleString("fr-FR")} €
                </h2>
                <p className="text-zinc-500 mt-4 relative z-10">
                    Sur <span className="text-white font-bold">{capacity.duration} ans</span> à <span className="text-white font-bold">{capacity.rate}%</span>
                </p>

                <div className="mt-8 flex justify-center gap-8 relative z-10">
                     <div className="text-center">
                        <div className="text-2xl font-bold text-white">{(capResults.maxMonthly).toFixed(0)} €</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Mensualité Max</div>
                     </div>
                     <div className="w-px bg-zinc-800 h-10" />
                     <div className="text-center">
                        <div className="text-2xl font-bold text-white">35%</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Endettement</div>
                     </div>
                </div>
             </div>

             {/* INPUTS */}
             <Card className="bg-zinc-900/30 border-zinc-800 lg:col-span-2">
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
                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-6 text-white font-bold">
                             <Wallet className="text-emerald-500" size={20} /> Acquisition
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputGroup label="Prix Vendeur" value={project.price} onChange={(v: number) => setProject({...project, price: v})} suffix="€" />
                            <InputGroup label="Travaux" value={project.works} onChange={(v: number) => setProject({...project, works: v})} suffix="€" />
                            <InputGroup label="Apport" value={project.contribution} onChange={(v: number) => setProject({...project, contribution: v})} suffix="€" />
                            <InputGroup label="Notaire (%)" value={project.notaryRate} onChange={(v: number) => setProject({...project, notaryRate: v})} suffix="%" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                         <div className="flex items-center gap-2 mb-6 text-white font-bold">
                             <TrendingUp className="text-blue-500" size={20} /> Exploitation
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
                <Card className={`border-zinc-800 bg-gradient-to-b ${projResults.cashflow >= 0 ? "from-emerald-950/30 to-black" : "from-red-950/30 to-black"}`}>
                    <CardContent className="p-6 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Cashflow Net</p>
                        <div className={`text-4xl font-black ${projResults.cashflow >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                            {projResults.cashflow > 0 && "+"}{projResults.cashflow.toFixed(0)} €
                            <span className="text-sm text-zinc-500 font-normal ml-1">/mois</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-zinc-900/30 border-zinc-800">
                        <CardContent className="p-4 text-center">
                             <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Renta Nette</p>
                             <p className={`text-xl font-bold ${projResults.yieldNet > 4 ? "text-emerald-400" : "text-white"}`}>{projResults.yieldNet.toFixed(1)}%</p>
                        </CardContent>
                    </Card>
                     <Card className="bg-zinc-900/30 border-zinc-800">
                        <CardContent className="p-4 text-center">
                             <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Coût Total</p>
                             <p className="text-xl font-bold text-white">{(projResults.totalCost/1000).toFixed(0)} k€</p>
                        </CardContent>
                    </Card>
                </div>
                
                 <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex gap-3 items-start">
                    <AlertCircle className="text-zinc-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Ces calculs sont des estimations. N'oubliez pas la vacance locative et l'imposition.
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}