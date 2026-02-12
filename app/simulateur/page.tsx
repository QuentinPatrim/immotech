"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Home, Building, Wallet, Landmark, CheckCircle, XCircle, PieChart as PieIcon, ArrowRight, RefreshCw, Layers, Percent, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

export default function SimulateurPage() {
  // FIX: DÉMARRAGE SUR "CAPACITE" PAR DÉFAUT
  const [mode, setMode] = useState<"CAPACITE" | "PROJET">("CAPACITE");
  
  // --- STATE: CAPACITÉ ---
  const [revenue, setRevenue] = useState(2500);
  const [credits, setCredits] = useState(0);
  const [duration, setDuration] = useState(25);
  const [rate, setRate] = useState(3.8);
  const [maxLoan, setMaxLoan] = useState(0);
  const [maxMonthly, setMaxMonthly] = useState(0);

  // --- STATE: PROJET ---
  const [price, setPrice] = useState(200000);
  const [works, setWorks] = useState(0);
  const [apport, setApport] = useState(20000);
  const [notaryRate, setNotaryRate] = useState(8); 
  const [rent, setRent] = useState(1200);
  const [charges, setCharges] = useState(100);
  const [tax, setTax] = useState(800); 

  // Résultats
  const [cashflow, setCashflow] = useState(0);
  const [yieldNet, setYieldNet] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [notaryFees, setNotaryFees] = useState(0);

  // --- CALCULS ---
  useEffect(() => {
    // CAPACITÉ
    const debtRatio = 0.35; 
    const availableIncome = (revenue * debtRatio) - credits;
    const monthlyRate = rate / 100 / 12;
    const months = duration * 12;
    let capacity = 0;
    if (availableIncome > 0) {
        capacity = availableIncome * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
    }
    setMaxLoan(Math.max(0, Math.round(capacity)));
    setMaxMonthly(Math.max(0, Math.round(availableIncome)));

    // PROJET
    const notFees = price * (notaryRate / 100);
    setNotaryFees(notFees);
    const total = price + works + notFees;
    setTotalCost(total);

    const loanAmount = Math.max(0, total - apport);
    let mensu = 0;
    if (loanAmount > 0) {
        mensu = loanAmount * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
    }
    setMonthlyPayment(mensu);

    const totalExpenses = mensu + charges + (tax / 12);
    setCashflow(rent - totalExpenses);

    const netIncomeYear = (rent * 12) - (charges * 12) - tax;
    setYieldNet(total > 0 ? (netIncomeYear / total) * 100 : 0);

  }, [revenue, credits, duration, rate, price, works, apport, notaryRate, rent, charges, tax]);

  const dataCost = [
    { name: 'Prix Net', value: price, color: '#3b82f6' },
    { name: 'Travaux', value: works, color: '#eab308' },
    { name: 'Notaire', value: notaryFees, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        {/* AMBIENT GLOWS */}
        <div className="fixed top-0 left-64 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] mx-auto space-y-12 relative z-10">
          
          {/* HEADER & SWITCHER - CORRECTION TITRE UNIFORME */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 pl-2 border-l-4 border-blue-600 py-2">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Simulateur Immo</span>
              </h1>
              <p className="text-zinc-400 text-lg font-light tracking-wide mt-2">Analysez la rentabilité et votre capacité d'emprunt.</p>
            </div>
            
            {/* SWITCH */}
            <div className="bg-zinc-900/80 backdrop-blur-xl p-2 rounded-2xl border border-white/5 flex relative w-full md:w-auto shadow-2xl">
                <div 
                    className={`absolute top-2 bottom-2 rounded-xl bg-gradient-to-r transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-lg shadow-indigo-500/20 ${mode === "CAPACITE" ? "left-2 w-[calc(50%-8px)] from-indigo-600 to-blue-600" : "left-[50%] w-[calc(50%-8px)] from-emerald-600 to-teal-500"}`}
                />
                <button onClick={() => setMode("CAPACITE")} className="relative z-10 flex-1 px-10 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors">
                    Capacité
                </button>
                <button onClick={() => setMode("PROJET")} className="relative z-10 flex-1 px-10 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors">
                    Rentabilité
                </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
          {mode === "CAPACITE" ? (
            /* --- VUE CAPACITÉ --- */
            <motion.div 
                key="capa"
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
                {/* Inputs */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-white/5 backdrop-blur-md shadow-xl hover:border-white/10 transition-colors">
                        <h3 className="text-xs font-black text-indigo-400 uppercase mb-8 flex items-center gap-3 tracking-widest"><Wallet size={18}/> Finances</h3>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ml-1">Revenus Nets / Mois</label>
                                <div className="relative group">
                                    <Input type="number" value={revenue} onChange={e => setRevenue(Number(e.target.value))} className="bg-black/40 border-white/5 h-16 text-white font-black text-2xl pr-12 focus:border-indigo-500 transition-all rounded-2xl shadow-inner"/>
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 font-bold group-hover:text-indigo-500 transition-colors">€</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ml-1">Crédits en cours</label>
                                <div className="relative group">
                                    <Input type="number" value={credits} onChange={e => setCredits(Number(e.target.value))} className="bg-black/40 border-white/5 h-16 text-white font-black text-2xl pr-12 focus:border-indigo-500 transition-all rounded-2xl shadow-inner"/>
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 font-bold group-hover:text-indigo-500 transition-colors">€</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-white/5 backdrop-blur-md shadow-xl hover:border-white/10 transition-colors">
                        <h3 className="text-xs font-black text-blue-400 uppercase mb-8 flex items-center gap-3 tracking-widest"><Landmark size={18}/> Banque</h3>
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1"><label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Durée</label><span className="text-3xl font-black text-white">{duration}<span className="text-base text-zinc-600 font-medium ml-1">ans</span></span></div>
                                <Slider value={[duration]} min={10} max={30} step={1} onValueChange={v => setDuration(v[0])} className="py-2" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1"><label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Taux</label><span className="text-3xl font-black text-blue-400">{rate}<span className="text-base text-zinc-600 font-medium ml-1">%</span></span></div>
                                <Slider value={[rate]} min={1} max={6} step={0.05} onValueChange={v => setRate(v[0])} className="py-2" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Résultat */}
                <div className="lg:col-span-8 p-12 lg:p-16 rounded-[48px] bg-gradient-to-br from-zinc-900 via-black to-blue-950/20 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl group">
                    <div className="absolute top-0 right-0 p-96 bg-indigo-600/10 blur-[150px] rounded-full group-hover:bg-indigo-600/20 transition-all duration-1000"></div>
                    <div className="absolute bottom-0 left-0 p-64 bg-blue-600/10 blur-[150px] rounded-full group-hover:bg-blue-600/20 transition-all duration-1000"></div>
                    
                    <div className="relative z-10 w-full">
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.4em] mb-8">ENVELOPPE D'ACHAT MAX</p>
                        <div className="text-7xl lg:text-[9rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tracking-tighter drop-shadow-2xl">
                            <AnimatedNumber value={maxLoan} />
                        </div>
                        
                        <div className="mt-16 grid grid-cols-2 gap-8 max-w-2xl mx-auto">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Mensualité Max</p>
                                <div className="text-3xl lg:text-4xl font-black text-white"><AnimatedNumber value={maxMonthly}/></div>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Endettement</p>
                                <div className="text-3xl lg:text-4xl font-black text-indigo-400">35%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
          ) : (
            /* --- VUE PROJET --- */
            <motion.div 
                key="projet"
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-8"
            >
                {/* Inputs */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-white/5 backdrop-blur-md shadow-xl">
                        <h3 className="text-xs font-black text-emerald-500 uppercase flex items-center gap-3 mb-8 tracking-widest"><Home size={18}/> Acquisition</h3>
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Prix du Bien</label>
                                <div className="relative"><Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="bg-black/40 border-white/5 text-white font-bold text-right h-14 pr-12 rounded-xl focus:border-emerald-500 transition-all text-xl"/><span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Travaux</label><div className="relative"><Input type="number" value={works} onChange={e => setWorks(Number(e.target.value))} className="bg-black/40 border-white/5 text-white font-bold text-right h-14 pr-10 rounded-xl"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span></div></div>
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Apport</label><div className="relative"><Input type="number" value={apport} onChange={e => setApport(Number(e.target.value))} className="bg-black/40 border-white/5 text-white font-bold text-right h-14 pr-10 rounded-xl"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span></div></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-white/5 backdrop-blur-md shadow-xl">
                        <h3 className="text-xs font-black text-teal-500 uppercase flex items-center gap-3 mb-8 tracking-widest"><Building size={18}/> Exploitation</h3>
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Loyer Mensuel (CC)</label>
                                <div className="relative"><Input type="number" value={rent} onChange={e => setRent(Number(e.target.value))} className="bg-black/40 border-white/5 text-white font-bold text-right h-14 pr-12 rounded-xl focus:border-teal-500 transition-all text-xl"/><span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Charges /m</label><div className="relative"><Input type="number" value={charges} onChange={e => setCharges(Number(e.target.value))} className="bg-black/40 border-white/5 text-white font-bold text-right h-14 pr-10 rounded-xl"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span></div></div>
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Foncière /an</label><div className="relative"><Input type="number" value={tax} onChange={e => setTax(Number(e.target.value))} className="bg-black/40 border-white/5 text-white font-bold text-right h-14 pr-10 rounded-xl"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span></div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DROITE : RÉSULTATS */}
                <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className={`col-span-1 md:col-span-2 p-12 rounded-[48px] border relative overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-500 group shadow-2xl ${cashflow > 0 ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-red-950/10 border-red-500/20'}`}>
                        <div className={`absolute top-0 right-0 p-80 blur-[150px] rounded-full transition-colors duration-500 ${cashflow > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}></div>
                        <p className={`text-xs font-black uppercase tracking-[0.4em] mb-6 ${cashflow > 0 ? 'text-emerald-500' : 'text-red-500'}`}>CASHFLOW NET / MOIS</p>
                        <div className={`text-8xl lg:text-[8rem] font-black mb-8 tracking-tighter drop-shadow-2xl ${cashflow > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                            {cashflow > 0 ? '+' : ''}<AnimatedNumber value={cashflow}/>
                        </div>
                        <div className={`flex gap-3 items-center px-6 py-3 rounded-full border backdrop-blur-md ${cashflow > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                           {cashflow > 0 ? <CheckCircle size={20} strokeWidth={3}/> : <XCircle size={20} strokeWidth={3}/>}
                           <span className="text-sm font-black uppercase tracking-wide">{cashflow > 0 ? "Autofinancement Validé" : "Effort d'épargne requis"}</span>
                        </div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-white/5 backdrop-blur-md flex flex-col justify-center items-center shadow-lg hover:border-teal-500/30 transition-colors group">
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Rendement Net</p>
                        <div className="text-6xl font-black text-white group-hover:scale-105 transition-transform">{yieldNet.toFixed(2)}<span className="text-3xl text-teal-500 ml-1">%</span></div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-zinc-900/30 border border-white/5 backdrop-blur-md flex flex-col justify-center items-center shadow-lg hover:border-yellow-500/30 transition-colors group">
                         <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Coût Projet</p>
                         <div className="text-6xl font-black text-white group-hover:scale-105 transition-transform">{formatEuro(totalCost / 1000)}<span className="text-3xl text-yellow-500 ml-1">k</span></div>
                    </div>

                    {/* PIE CHART AVEC FIX TOOLTIP */}
                    <div className="col-span-1 md:col-span-2 p-8 rounded-[32px] bg-black/40 border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-lg">
                        <div className="w-full md:w-1/2 space-y-6">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3"><PieIcon size={18} className="text-zinc-500"/> Répartition du Coût</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3"><div className="w-2 h-8 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div><span className="text-xs font-bold text-zinc-300">Prix Net</span></div>
                                    <span className="text-base font-black text-white">{formatEuro(price)}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3"><div className="w-2 h-8 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div><span className="text-xs font-bold text-zinc-300">Travaux</span></div>
                                    <span className="text-base font-black text-white">{formatEuro(works)}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3"><div className="w-2 h-8 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div><span className="text-xs font-bold text-zinc-300">Frais Notaire</span></div>
                                    <span className="text-base font-black text-white">{formatEuro(notaryFees)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dataCost} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={10}>
                                        {dataCost.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                    </Pie>
                                    {/* FIX: itemStyle color white */}
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid #333', color:'#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
                                        itemStyle={{ color: '#fff' }} 
                                        formatter={(value:any) => formatEuro(value)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </motion.div>
          )}
          </AnimatePresence>

        </motion.div>
      </main>
    </div>
  );
}