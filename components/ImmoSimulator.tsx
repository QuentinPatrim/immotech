"use client";

import { useState, useEffect } from "react";
import { Wallet, TrendingUp, AlertCircle, Building2, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
        totalEnvelope: maxLoan // On simplifie : Enveloppe = Emprunt Max
    });
  }, [capacity]);

  useEffect(() => {
    // Projet
    const notary = project.price * (project.notaryRate / 100);
    const total = project.price + project.works + notary;
    const loan = Math.max(0, total - project.contribution);
    
    const rateProj = 4.0 / 100 / 12; // Taux fixe 4% pour l'exemple
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

  // --- COMPOSANT INPUT REUTILISABLE ---
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

  return (
    <div className="space-y-8 pb-20 font-sans max-w-5xl mx-auto">
      
      {/* HEADER GLOBAL & TOGGLE */}
      <div className="flex flex-col items-center gap-6 mb-10">
        <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Simulateur Immobilier<span className="text-emerald-500">.</span>
            </h1>
            <p className="text-zinc-500 text-sm max-w-md mx-auto">
                Calculez votre capacité d'emprunt et analysez la rentabilité de vos futurs investissements.
            </p>
        </div>

        {/* TOGGLE PILULE PREMIUM */}
        <div className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-full inline-flex relative shadow-inner">
            <button 
                onClick={() => setMode("capacity")}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${mode === "capacity" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                <Wallet size={16} /> Ma Capacité
            </button>
            <button 
                onClick={() => setMode("project")}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${mode === "project" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                <Building2 size={16} /> Projet Immo
            </button>
        </div>
      </div>

      {/* --- VUE 1 : CAPACITÉ --- */}
      {mode === "capacity" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
             
             {/* INPUTS (Gauche) */}
             <Card className="bg-zinc-950 border border-zinc-800 shadow-xl">
                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-zinc-800 mb-2">
                        <Wallet className="text-emerald-500" size={20} />
                        <h3 className="font-bold text-white">Profil Emprunteur</h3>
                    </div>

                    <div className="space-y-6">
                        <InputGroup label="Revenus Net / Mois" value={capacity.income} onChange={(v: number) => setCapacity({...capacity, income: v})} suffix="€" />
                        <InputGroup label="Charges Crédits Actuels" value={capacity.charges} onChange={(v: number) => setCapacity({...capacity, charges: v})} suffix="€" />
                        
                        {/* Sliders simulés par des inputs pour l'instant (plus clean) */}
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Durée (ans)" value={capacity.duration} onChange={(v: number) => setCapacity({...capacity, duration: v})} suffix="ans" />
                            <InputGroup label="Taux (%)" value={capacity.rate} onChange={(v: number) => setCapacity({...capacity, rate: v})} suffix="%" />
                        </div>
                    </div>
                </CardContent>
             </Card>

             {/* RESULTAT HERO (Droite) */}
             <div className="flex flex-col gap-4">
                <div className="flex-1 relative overflow-hidden rounded-3xl bg-zinc-900/50 border border-zinc-800 p-8 md:p-12 text-center group flex flex-col justify-center items-center">
                    {/* Glow Effect */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-500/20 blur-[80px] rounded-full group-hover:bg-emerald-500/30 transition-all duration-700" />
                    
                    <p className="text-emerald-500 font-bold tracking-[0.2em] text-xs uppercase mb-6 relative z-10">Enveloppe d'Achat Max</p>
                    
                    <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_25px_rgba(16,185,129,0.2)] relative z-10">
                        {(capResults.totalEnvelope).toLocaleString("fr-FR")} €
                    </h2>
                    
                    <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700 text-xs text-zinc-400 relative z-10">
                        <span>Sur {capacity.duration} ans</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-600" />
                        <span>Taux {capacity.rate}%</span>
                    </div>
                </div>

                {/* KPI Secondaires */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Mensualité Max</p>
                                <p className="text-xl font-bold text-white mt-1">{(capResults.maxMonthly).toFixed(0)} €</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Calculator size={16} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Endettement</p>
                                <p className="text-xl font-bold text-white mt-1">35 %</p>
                            </div>
                             <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <AlertCircle size={16} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
             </div>
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
                        Le cashflow est calculé après crédit, charges et taxe foncière. N'inclut pas l'impôt sur le revenu.
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}