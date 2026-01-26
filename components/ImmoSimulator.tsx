"use client";

import { useState, useEffect } from "react";
import { Calculator, Building2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function ImmoSimulator() {
  const [mode, setMode] = useState<"capacity" | "project">("project");

  // ETAT INITIAL VIERGE (Tout est à 0)
  const [project, setProject] = useState({
    price: 0,
    works: 0,
    furniture: 0,
    notaryRate: 8, // On garde 8% par défaut car c'est une constante utile
    contribution: 0,
    rent: 0,
    charges: 0, // Charges copro
    tax: 0, // Taxe foncière annuelle
  });

  // RESULTATS
  const [results, setResults] = useState({
    totalCost: 0,
    notaryFees: 0,
    loanAmount: 0,
    monthlyPayment: 0,
    cashflow: 0,
    yieldBruto: 0,
    yieldNet: 0,
  });

  useEffect(() => {
    // Calculs sécurisés (si 0, on renvoie 0)
    const price = project.price || 0;
    const notaryFees = price * (project.notaryRate / 100);
    const totalCost = price + (project.works || 0) + (project.furniture || 0) + notaryFees;
    const loanAmount = Math.max(0, totalCost - (project.contribution || 0));
    
    // Crédit sur 20 ans à 4.2% (Hypothèse fixe)
    const rate = 4.2 / 100 / 12;
    const months = 240;
    let monthlyPayment = 0;
    
    if (loanAmount > 0) {
        monthlyPayment = loanAmount * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    }

    const annualRent = (project.rent || 0) * 12;
    const annualCharges = ((project.charges || 0) * 12) + (project.tax || 0);
    
    // Rentabilités (protection division par zéro)
    const yieldBruto = totalCost > 0 ? (annualRent / totalCost) * 100 : 0;
    const yieldNet = totalCost > 0 ? ((annualRent - annualCharges) / totalCost) * 100 : 0;
    const cashflow = (project.rent || 0) - monthlyPayment - (project.charges || 0) - ((project.tax || 0) / 12);

    setResults({
        totalCost,
        notaryFees,
        loanAmount,
        monthlyPayment,
        cashflow,
        yieldBruto,
        yieldNet
    });
  }, [project]);

  // Données pour le graph (si tout est vide, on met un placeholder)
  const dataChart = [
    { name: 'Prix', value: project.price || 0, color: '#10b981' }, 
    { name: 'Travaux', value: (project.works || 0) + (project.furniture || 0), color: '#3b82f6' }, 
    { name: 'Frais', value: results.notaryFees || 0, color: '#f59e0b' },
  ];
  
  // Si le total est 0 (page vierge), on affiche un cercle gris pour faire joli
  const isZeroState = results.totalCost === 0;
  const displayChart = isZeroState ? [{ name: 'Vide', value: 1, color: '#27272a' }] : dataChart;

  const InputField = ({ label, value, onChange, suffix }: any) => (
    <div className="space-y-1">
        <label className="text-xs text-zinc-400 font-medium ml-1">{label}</label>
        <div className="relative">
            <Input 
                type="number" 
                // Si la valeur est 0, on affiche "" (vide) pour le placeholder, sauf si c'est le taux notaire
                value={value === 0 ? "" : value} 
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="bg-zinc-900 border-zinc-800 text-white font-semibold pl-3 pr-8 focus:ring-emerald-500/50 placeholder:text-zinc-700" 
            />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{suffix}</span>}
        </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white">Simulateur Immobilier</h1>
            <p className="text-zinc-400 text-sm">Analysez la rentabilité de vos futurs investissements.</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button onClick={() => setMode("capacity")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "capacity" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>🏦 Ma Capacité</button>
            <button onClick={() => setMode("project")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "project" ? "bg-emerald-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>🏢 Projet Immo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SAISIE */}
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

        {/* RESULTATS */}
        <div className="space-y-6">
            
            {/* CASHFLOW CARD */}
            <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-6">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Cashflow Net</span>
                    {results.cashflow < 0 ? <AlertTriangle className="text-red-500" size={20}/> : <Building2 className="text-emerald-500" size={20}/>}
                </div>
                <div className={`text-4xl font-black mb-1 ${results.cashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {results.cashflow > 0 ? "+" : ""}{results.cashflow.toFixed(0)} €<span className="text-lg text-zinc-500 font-normal">/mois</span>
                </div>
                
                {/* Visual Bar */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden flex">
                    {/* Si tout est à 0, barre grise */}
                    {isZeroState ? (
                        <div className="w-full h-full bg-zinc-700/30" />
                    ) : (
                        <>
                            <div className="h-full bg-blue-500" style={{ width: '60%' }} /> 
                            <div className={`h-full ${results.cashflow >= 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: '40%' }} />
                        </>
                    )}
                </div>
                {!isZeroState && (
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                        <span>CRÉDIT ({(results.monthlyPayment).toFixed(0)}€)</span>
                        <span>MARGE</span>
                    </div>
                )}
            </div>

            {/* RENTABILITÉS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-center">
                    <div className="text-xs text-zinc-400 mb-1">BRUTE</div>
                    <div className="text-xl font-bold text-white">{results.yieldBruto.toFixed(1)}%</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-center">
                    <div className="text-xs text-zinc-400 mb-1">NETTE</div>
                    <div className={`text-xl font-bold ${results.yieldNet > 4 ? "text-emerald-400" : "text-yellow-400"}`}>{results.yieldNet.toFixed(1)}%</div>
                </div>
            </div>

            {/* GRAPHIQUE */}
            <Card className="bg-black border-zinc-800">
                <CardContent className="p-6">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase mb-4">Répartition Coût Total</h4>
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
                            {isZeroState ? (
                                <p className="text-xs text-zinc-600 italic">Remplissez les champs à gauche pour voir l'analyse.</p>
                            ) : (
                                <>
                                    {dataChart.map((d, i) => (
                                        <div key={i} className="flex justify-between text-xs">
                                            <span style={{ color: d.color }}>● {d.name}</span>
                                            <span className="text-white font-medium">{d.value.toLocaleString()} €</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-zinc-800 pt-2 flex justify-between text-xs font-bold text-white">
                                        <span>TOTAL</span>
                                        <span>{results.totalCost.toLocaleString()} €</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}