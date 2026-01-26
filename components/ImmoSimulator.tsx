"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, Building, Banknote, CheckCircle2, AlertTriangle, Home, Wallet, TrendingUp, PieChart as PieIcon, ArrowRight } from "lucide-react";
import AnimatedNumber from "@/components/AnimatedNumber";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function ImmoSimulator() {
  const [activeTab, setActiveTab] = useState<"capacity" | "project">("capacity");

  // --- ÉTATS (Même logique qu'avant) ---
  const [income, setIncome] = useState(2500);
  const [existingCharges, setExistingCharges] = useState(0);
  const [duration, setDuration] = useState(25);
  const [rate, setRate] = useState(3.8);
  const [capacity, setCapacity] = useState(0);
  const [maxMonthly, setMaxMonthly] = useState(0);

  const [price, setPrice] = useState(150000);
  const [works, setWorks] = useState(10000);
  const [notaryRate, setNotaryRate] = useState(8);
  const [apport, setApport] = useState(20000);
  const [rent, setRent] = useState(900);
  const [tf, setTf] = useState(800);
  const [chargesCopro, setChargesCopro] = useState(100);
  const [gestionRate, setGestionRate] = useState(0);

  const [cashflow, setCashflow] = useState(0);
  const [yieldBrut, setYieldBrut] = useState(0);
  const [yieldNet, setYieldNet] = useState(0);
  const [mensualiteCredit, setMensualiteCredit] = useState(0);
  const [totalProject, setTotalProject] = useState(0);
  const [notaryFees, setNotaryFees] = useState(0);

  // --- CALCULS (Identiques) ---
  useEffect(() => {
    const maxPayment = (income - existingCharges) * 0.35;
    setMaxMonthly(Math.max(0, maxPayment));
    const monthlyRate = rate / 100 / 12;
    const months = duration * 12;
    if (monthlyRate === 0) setCapacity(maxPayment * months);
    else setCapacity(Math.max(0, maxPayment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate));
  }, [income, existingCharges, duration, rate]);

  useEffect(() => {
    const nFees = price * (notaryRate / 100);
    setNotaryFees(nFees);
    const totalCost = price + works + nFees;
    setTotalProject(totalCost);
    const loanAmount = totalCost - apport;
    const monthlyRate = rate / 100 / 12;
    const months = duration * 12;
    let payment = 0;
    if (loanAmount > 0) payment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    setMensualiteCredit(payment);
    const annualRent = rent * 12;
    setYieldBrut((annualRent / totalCost) * 100);
    const annualCharges = (chargesCopro * 12) + tf + (annualRent * (gestionRate/100));
    setYieldNet(((annualRent - annualCharges) / totalCost) * 100);
    const monthlyCharges = chargesCopro + (tf/12) + (rent * (gestionRate/100));
    setCashflow(rent - payment - monthlyCharges);
  }, [price, works, notaryRate, apport, rent, tf, chargesCopro, gestionRate, duration, rate]);

  const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  // --- DONNÉES GRAPHIQUES ---
  const projectData = [
    { name: 'Prix Net', value: price, color: '#10b981' }, // Emerald
    { name: 'Travaux', value: works, color: '#3b82f6' }, // Blue
    { name: 'Frais Notaire', value: notaryFees, color: '#f59e0b' }, // Amber
  ];

  const capacityData = [
    { name: 'Capacité Utilisée', value: existingCharges, color: '#ef4444' },
    { name: 'Capacité Dispo', value: maxMonthly, color: '#10b981' },
    { name: 'Reste à Vivre', value: income - existingCharges - maxMonthly, color: '#27272a' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* --- MENU SWITCHER PREMIUM --- */}
      <div className="flex justify-center mb-8">
          <div className="bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800/50 backdrop-blur-md shadow-2xl inline-flex relative">
            <div 
                className={`absolute top-1.5 bottom-1.5 w-[140px] rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg transition-all duration-500 ease-out ${activeTab === "project" ? "translate-x-[140px]" : "translate-x-0"}`}
            ></div>
            <button onClick={() => setActiveTab("capacity")} className="relative z-10 w-[140px] py-2.5 text-sm font-bold text-center text-white flex items-center justify-center gap-2">
                <Banknote size={16}/> Ma Capacité
            </button>
            <button onClick={() => setActiveTab("project")} className="relative z-10 w-[140px] py-2.5 text-sm font-bold text-center text-white flex items-center justify-center gap-2">
                <Building size={16}/> Projet Immo
            </button>
          </div>
      </div>

      {/* --- ONGLET 1 : CAPACITÉ --- */}
      {activeTab === "capacity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GAUCHE : INPUTS */}
            <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm shadow-xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Wallet className="text-emerald-500"/> Profil Emprunteur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Revenus Net / Mois</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <Input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="bg-transparent border-none text-2xl font-bold p-0 h-auto focus-visible:ring-0 text-white" />
                                <span className="text-zinc-500">€</span>
                            </div>
                        </div>
                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Charges Crédits Actuels</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <Input type="number" value={existingCharges} onChange={(e) => setExistingCharges(Number(e.target.value))} className="bg-transparent border-none text-2xl font-bold p-0 h-auto focus-visible:ring-0 text-white" />
                                <span className="text-zinc-500">€</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6 pt-4">
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Durée: {duration} ans</span></div>
                            <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={7} max={30} step={1} className="py-2" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Taux: {rate}%</span></div>
                            <Slider value={[rate]} onValueChange={(v) => setRate(v[0])} min={1} max={6} step={0.1} className="py-2" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* DROITE : RÉSULTATS VISUELS */}
            <div className="space-y-6">
                 {/* BIG NUMBER CARD */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-zinc-900 to-black p-8 text-center shadow-2xl group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                    <div className="absolute -inset-1 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-30 transition duration-1000"></div>
                    
                    <p className="text-emerald-500 text-sm font-bold uppercase tracking-[0.2em] mb-4">Enveloppe d'Achat Max</p>
                    <div className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                        <AnimatedNumber value={capacity} />
                    </div>
                    <p className="text-zinc-500 text-sm mt-4">Sur {duration} ans à {rate}%</p>
                </div>

                {/* GRAPH DE DISTRIBUTION */}
                <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
                    <CardContent className="p-6 flex items-center justify-between gap-4">
                        <div className="h-24 w-24 flex-shrink-0 relative">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={capacityData} innerRadius={30} outerRadius={40} paddingAngle={2} dataKey="value">
                                        {capacityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-500">35%</div>
                        </div>
                        <div className="flex-1 space-y-2">
                             <div className="flex justify-between text-sm items-center">
                                <span className="flex items-center gap-2 text-zinc-400"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Mensualité Max</span>
                                <span className="font-bold text-white">{formatEuro(maxMonthly)}</span>
                             </div>
                             <div className="flex justify-between text-sm items-center">
                                <span className="flex items-center gap-2 text-zinc-400"><div className="w-2 h-2 rounded-full bg-red-500"/> Charges Actuelles</span>
                                <span className="font-bold text-zinc-300">{formatEuro(existingCharges)}</span>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}

      {/* --- ONGLET 2 : PROJET --- */}
      {activeTab === "project" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLONNE GAUCHE (Inputs) - Span 7 */}
            <div className="lg:col-span-7 space-y-6">
                {/* 1. ACQUISITION */}
                <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardHeader><CardTitle className="text-white text-base font-bold flex items-center gap-2"><Home size={16} className="text-blue-500"/> Acquisition</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Prix Net Vendeur</Label>
                            <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Travaux & Meubles</Label>
                            <Input type="number" value={works} onChange={(e) => setWorks(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Apport Perso</Label>
                            <Input type="number" value={apport} onChange={(e) => setApport(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Notaire (%)</Label>
                            <Input type="number" value={notaryRate} onChange={(e) => setNotaryRate(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 focus:border-blue-500 transition-all" />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. EXPLOITATION */}
                <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardHeader><CardTitle className="text-white text-base font-bold flex items-center gap-2"><PieIcon size={16} className="text-emerald-500"/> Exploitation</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center justify-between">
                             <Label className="text-emerald-400 font-bold">Loyer Mensuel (CC)</Label>
                             <div className="flex items-center gap-2">
                                <Input type="number" value={rent} onChange={(e) => setRent(Number(e.target.value))} className="w-28 bg-black border-emerald-900 text-right font-bold text-white focus:border-emerald-500" />
                                <span className="text-emerald-600">€</span>
                             </div>
                        </div>
                        <div><Label className="text-xs text-zinc-500">Taxe Foncière /an</Label><Input type="number" value={tf} onChange={(e) => setTf(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 mt-1" /></div>
                        <div><Label className="text-xs text-zinc-500">Charges Copro /mois</Label><Input type="number" value={chargesCopro} onChange={(e) => setChargesCopro(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 mt-1" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* COLONNE DROITE (Dashboard KPI) - Span 5 */}
            <div className="lg:col-span-5 space-y-4">
                
                {/* 1. CASHFLOW CARD (HERO) */}
                <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-500 ${cashflow >= 0 ? "bg-emerald-950/40 border-emerald-500/30 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]" : "bg-red-950/40 border-red-500/30"}`}>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Cashflow Net</h3>
                        {cashflow >= 0 ? <TrendingUp className="text-emerald-500"/> : <AlertTriangle className="text-red-500"/>}
                    </div>
                    <div className={`text-4xl font-black ${cashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {cashflow > 0 ? "+" : ""}{cashflow.toFixed(0)} €<span className="text-lg font-normal text-zinc-500">/mois</span>
                    </div>
                    
                    {/* MINI CHART BREAKDOWN */}
                    <div className="mt-6 h-1 w-full flex rounded-full overflow-hidden bg-zinc-800">
                        <div style={{ width: `${Math.min(100, (mensualiteCredit / rent) * 100)}%` }} className="bg-blue-500 h-full"/>
                        <div style={{ width: `${Math.min(100, ((cashflow > 0 ? 0 : Math.abs(cashflow)) / rent) * 100)}%` }} className="bg-red-500 h-full"/>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1 uppercase font-bold">
                        <span>Crédit</span>
                        <span>Marge</span>
                    </div>
                </div>

                {/* 2. RENTABILITÉ BOX */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-center">
                        <p className="text-xs text-zinc-500 uppercase">Brute</p>
                        <p className="text-xl font-bold text-white">{yieldBrut.toFixed(1)}%</p>
                     </div>
                     <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-center relative overflow-hidden">
                        <div className={`absolute bottom-0 left-0 h-1 w-full ${yieldNet > 5 ? "bg-emerald-500" : "bg-amber-500"}`}></div>
                        <p className="text-xs text-zinc-500 uppercase">Nette</p>
                        <p className={`text-xl font-bold ${yieldNet > 5 ? "text-emerald-400" : "text-amber-400"}`}>{yieldNet.toFixed(1)}%</p>
                     </div>
                </div>

                {/* 3. PROJET DONUT CHART */}
                <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardHeader className="pb-0"><CardTitle className="text-xs uppercase tracking-wider text-zinc-500">Répartition Coût Total</CardTitle></CardHeader>
                    <CardContent className="h-[140px] flex items-center">
                        <ResponsiveContainer width="40%" height="100%">
                            <PieChart>
                                <Pie data={projectData} innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value">
                                    {projectData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any) => formatEuro(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-1 text-xs pl-2">
                             <div className="flex justify-between"><span className="text-emerald-500">Prix</span> <span className="text-zinc-300">{formatEuro(price)}</span></div>
                             <div className="flex justify-between"><span className="text-blue-500">Travaux</span> <span className="text-zinc-300">{formatEuro(works)}</span></div>
                             <div className="flex justify-between"><span className="text-amber-500">Frais</span> <span className="text-zinc-300">{formatEuro(notaryFees)}</span></div>
                             <div className="border-t border-zinc-800 mt-1 pt-1 flex justify-between font-bold"><span className="text-zinc-400">TOTAL</span> <span className="text-white">{formatEuro(totalProject)}</span></div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
      )}
    </div>
  );
}