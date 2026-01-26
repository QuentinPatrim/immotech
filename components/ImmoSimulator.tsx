"use client";

import { useState, useEffect } from "react";
import { Calculator, Building2, AlertTriangle, Wallet, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function ImmoSimulator() {
  const [mode, setMode] = useState<"capacity" | "project">("project");

  // --- ETAT 1 : CAPACITÉ D'EMPRUNT ---
  const [capacity, setCapacity] = useState({
    income: 0,      // Revenus nets mensuels
    charges: 0,     // Charges actuelles (crédits en cours...)
    duration: 25,   // Durée en années
    rate: 4.2       // Taux d'intérêt
  });

  const [capacityResults, setCapacityResults] = useState({
    maxLoan: 0,
    maxMonthly: 0,
    debtRatio: 0
  });

  // --- ETAT 2 : PROJET IMMO (RENTABILITÉ) ---
  const [project, setProject] = useState({
    price: 0,
    works: 0,
    furniture: 0,
    notaryRate: 8,
    contribution: 0,
    rent: 0,
    charges: 0,
    tax: 0,
  });

  const [projectResults, setProjectResults] = useState({
    totalCost: 0,
    notaryFees: 0,
    loanAmount: 0,
    monthlyPayment: 0,
    cashflow: 0,
    yieldBruto: 0,
    yieldNet: 0,
  });

  // --- CALCULS CAPACITÉ ---
  useEffect(() => {
    // Règle des 35% d'endettement max (HCSF)
    const maxMonthly = ((capacity.income || 0) - (capacity.charges || 0)) * 0.35;
    
    // Calcul Montant Empruntable
    const rate = (capacity.rate || 4.2) / 100 / 12;
    const months = (capacity.duration || 25) * 12;
    
    let maxLoan = 0;
    if (rate > 0 && maxMonthly > 0) {
        maxLoan = (maxMonthly * (Math.pow(1 + rate, months) - 1)) / (rate * Math.pow(1 + rate, months));
    }

    setCapacityResults({
        maxMonthly: Math.max(0, maxMonthly),
        maxLoan: Math.max(0, maxLoan),
        debtRatio: 35 // Constante pour l'instant
    });
  }, [capacity]);

  // --- CALCULS PROJET IMMO ---
  useEffect(() => {
    const price = project.price || 0;
    const notaryFees = price * (project.notaryRate / 100);
    const totalCost = price + (project.works || 0) + (project.furniture || 0) + notaryFees;
    const loanAmount = Math.max(0, totalCost - (project.contribution || 0));
    
    const rate = 4.2 / 100 / 12;
    const months = 240; // 20 ans par défaut pour le projet
    let monthlyPayment = 0;
    if (loanAmount > 0) {
        monthlyPayment = loanAmount * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    }

    const annualRent = (project.rent || 0) * 12;
    const annualCharges = ((project.charges || 0) * 12) + (project.tax || 0);
    
    const yieldBruto = totalCost > 0 ? (annualRent / totalCost) * 100 : 0;
    const yieldNet = totalCost > 0 ? ((annualRent - annualCharges) / totalCost) * 100 : 0;
    const cashflow = (project.rent || 0) - monthlyPayment - (project.charges || 0) - ((project.tax || 0) / 12);

    setProjectResults({ totalCost, notaryFees, loanAmount, monthlyPayment, cashflow, yieldBruto, yieldNet });
  }, [project]);

  // --- STYLE & CHARTS ---
  const dataChart = [
    { name: 'Prix', value: project.price || 0, color: '#10b981' }, 
    { name: 'Travaux', value: (project.works || 0) + (project.furniture || 0), color: '#3b82f6' }, 
    { name: 'Frais', value: projectResults.notaryFees || 0, color: '#f59e0b' },
  ];
  const isZeroState = projectResults.totalCost === 0;
  const displayChart = isZeroState ? [{ name: 'Vide', value: 1, color: '#27272a' }] : dataChart;

  const inputStyle = "bg-zinc-900 border-zinc-800 text-white font-semibold pl-3 pr-8 focus:ring-emerald-500/50 placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const InputField = ({ label, value, onChange, suffix, placeholder = "0" }: any) => (
    <div className="space-y-1">
        <label className="text-xs text-zinc-400 font-medium ml-1">{label}</label>
        <div className="relative">
            <Input 
                type="number" 
                value={value === 0 ? "" : value} 
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                placeholder={placeholder}
                className={inputStyle}
            />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">{suffix}</span>}
        </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white">Simulateur Immobilier</h1>
            <p className="text-zinc-400 text-sm">{mode === "capacity" ? "Combien pouvez-vous emprunter ?" : "Analysez la rentabilité d'un bien."}</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button onClick={() => setMode("capacity")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "capacity" ? "bg-zinc-800 text-white shadow ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300"}`}>🏦 Ma Capacité</button>
            <button onClick={() => setMode("project")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "project" ? "bg-emerald-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>🏢 Projet Immo</button>
        </div>
      </div>

      {/* --- VUE 1 : CAPACITÉ D'EMPRUNT --- */}
      {mode === "capacity" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Card className="bg-zinc-950/50 border-zinc-800 h-full">
                <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-2 mb-4 text-blue-400 font-semibold">
                        <Wallet size={18} /> <h3>Votre Profil</h3>
                    </div>
                    <InputField label="Revenus Nets /mois (Couple ou Seul)" value={capacity.income} onChange={(v: number) => setCapacity({...capacity, income: v})} suffix="€" />
                    <InputField label="Charges Actuelles /mois (Crédits...)" value={capacity.charges} onChange={(v: number) => setCapacity({...capacity, charges: v})} suffix="€" />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Durée (Années)" value={capacity.duration} onChange={(v: number) => setCapacity({...capacity, duration: v})} suffix="ans" />
                        <InputField label="Taux (%)" value={capacity.rate} onChange={(v: number) => setCapacity({...capacity, rate: v})} suffix="%" />
                    </div>
                </CardContent>
             </Card>

             <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                <CardContent className="p-8 flex flex-col justify-center h-full space-y-6 relative z-10">
                    <div>
                        <p className="text-sm font-medium text-zinc-400 mb-1">Capacité d'emprunt Max</p>
                        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                            {capacityResults.maxLoan > 0 ? (capacityResults.maxLoan / 1000).toFixed(0) + " k€" : "---"}
                        </h2>
                    </div>
                    
                    <div className="w-full h-px bg-zinc-800" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Mensualité Max</p>
                            <p className="text-xl font-bold text-emerald-400">{capacityResults.maxMonthly.toFixed(0)} €<span className="text-sm text-zinc-500 font-normal">/mois</span></p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Taux Endettement</p>
                            <p className="text-xl font-bold text-white">35 %</p>
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-400 flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 text-yellow-500 shrink-0" />
                        <span>Estimation basée sur les normes HCSF actuelles (35% d'endettement max, assurance comprise).</span>
                    </div>
                </CardContent>
             </Card>
          </div>
      )}


      {/* --- VUE 2 : PROJET IMMO --- */}
      {mode === "project" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* COLONNE GAUCHE (INPUTS) */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="bg-zinc-950/50 border-zinc-800">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2 text-blue-400 font-semibold">
                            <Building2 size={18} /> <h3>Acquisition</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Prix Net Vendeur" value={project.price} onChange={(v: number) => setProject({...project, price: v})} suffix="€" />
                            <InputField label="Travaux & Meubles" value={project.works + project.furniture} onChange={(v: number) => setProject({...project, works: v, furniture: 0})} suffix="€" />
                            <InputField label="Apport Perso" value={project.contribution} onChange={(v: number) => setProject({...project, contribution: v})} suffix="€" />
                            <InputField label="Frais Notaire (%)" value={project.notaryRate} onChange={(v: number) => setProject({...project, notaryRate: v})} suffix="%" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-950/50 border-zinc-800">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400 font-semibold">
                            <Calculator size={18} /> <h3>Exploitation</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <InputField label="Loyer Mensuel (CC)" value={project.rent} onChange={(v: number) => setProject({...project, rent: v})} suffix="€" />
                            </div>
                            <InputField label="Taxe Foncière /an" value={project.tax} onChange={(v: number) => setProject({...project, tax: v})} suffix="€" />
                            <InputField label="Charges Copro /mois" value={project.charges} onChange={(v: number) => setProject({...project, charges: v})} suffix="€" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* COLONNE DROITE (RESULTATS) */}
            <div className="space-y-6">
                <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-6">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Cashflow Net</span>
                        {projectResults.cashflow < 0 ? <AlertTriangle className="text-red-500" size={20}/> : <Building2 className="text-emerald-500" size={20}/>}
                    </div>
                    <div className={`text-4xl font-black mb-1 ${projectResults.cashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {projectResults.cashflow > 0 ? "+" : ""}{projectResults.cashflow.toFixed(0)} €<span className="text-lg text-zinc-500 font-normal">/mois</span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden flex">
                        {isZeroState ? <div className="w-full h-full bg-zinc-700/30" /> : (
                            <>
                                <div className="h-full bg-blue-500" style={{ width: '60%' }} /> 
                                <div className={`h-full ${projectResults.cashflow >= 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: '40%' }} />
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-center">
                        <div className="text-xs text-zinc-400 mb-1">BRUTE</div>
                        <div className="text-xl font-bold text-white">{projectResults.yieldBruto.toFixed(1)}%</div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-center">
                        <div className="text-xs text-zinc-400 mb-1">NETTE</div>
                        <div className={`text-xl font-bold ${projectResults.yieldNet > 4 ? "text-emerald-400" : "text-yellow-400"}`}>{projectResults.yieldNet.toFixed(1)}%</div>
                    </div>
                </div>

                <Card className="bg-black border-zinc-800">
                    <CardContent className="p-6">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-4">Coût Total</h4>
                        <div className="flex items-center gap-4">
                            <div className="h-24 w-24 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={displayChart} innerRadius={25} outerRadius={40} paddingAngle={isZeroState ? 0 : 5} dataKey="value">
                                            {displayChart.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 flex-1">
                                {!isZeroState && dataChart.map((d, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                        <span style={{ color: d.color }}>● {d.name}</span>
                                        <span className="text-white font-medium">{d.value.toLocaleString()} €</span>
                                    </div>
                                ))}
                                <div className="border-t border-zinc-800 pt-2 flex justify-between text-xs font-bold text-white">
                                    <span>TOTAL</span>
                                    <span>{projectResults.totalCost.toLocaleString()} €</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}