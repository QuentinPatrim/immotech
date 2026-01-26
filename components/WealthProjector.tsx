"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Coins, PiggyBank, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";

export default function WealthProjector() {
  // --- ÉTATS ---
  const [initialAmount, setInitialAmount] = useState([0]);
  const [monthlyContribution, setMonthlyContribution] = useState([500]);
  const [years, setYears] = useState([20]); // Long terme par défaut
  const [rate, setRate] = useState([8]); // 8% = Moyenne Bourse

  const [chartData, setChartData] = useState<any[]>([]);
  const [finalAmount, setFinalAmount] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);

  // --- CHARGEMENT INTELLIGENT ---
  useEffect(() => {
    // 1. On récupère le Patrimoine Actuel pour le mettre en "Capital de départ"
    const savedAssets = localStorage.getItem("myAssets");
    if (savedAssets) {
      const assets = JSON.parse(savedAssets);
      const total = assets.reduce((acc: number, item: any) => acc + item.value, 0);
      setInitialAmount([total]);
    }

    // 2. On récupère la Capacité d'épargne du Budget pour le "Versement mensuel"
    const savedBudget = localStorage.getItem("myBudget");
    if (savedBudget) {
        const budget = JSON.parse(savedBudget);
        const totalExpenses = (budget.expenses || []).reduce((acc: any, item: any) => acc + item.amount, 0);
        const remaining = Math.max(0, (budget.income || 0) - totalExpenses);
        if (remaining > 0) setMonthlyContribution([remaining]);
    }
  }, []);

  // --- CALCUL DES INTÉRÊTS COMPOSÉS ---
  useEffect(() => {
    const P = initialAmount[0];
    const PMT = monthlyContribution[0];
    const r = rate[0] / 100;
    const t = years[0];
    const n = 12;

    const data = [];
    
    // Pour chaque année
    for (let year = 0; year <= t; year++) {
        // Formule future value avec versements mensuels
        // FV = P * (1 + r/n)^(n*t) + PMT * [ ((1 + r/n)^(n*t) - 1) / (r/n) ]
        
        const months = year * 12;
        const growthFactor = Math.pow(1 + r/n, months);
        
        const futureValuePrincipal = P * growthFactor;
        const futureValueSeries = PMT * ( (growthFactor - 1) / (r/n) );
        
        const total = futureValuePrincipal + futureValueSeries;
        const invested = P + (PMT * months);

        data.push({
            year: `Année ${year}`,
            amount: Math.round(total),
            invested: Math.round(invested),
            interest: Math.round(total - invested)
        });
        
        if (year === t) {
            setFinalAmount(total);
            setTotalInvested(invested);
        }
    }
    setChartData(data);

  }, [initialAmount, monthlyContribution, years, rate]);

  const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl">
            <p className="text-zinc-400 text-xs mb-2">{label}</p>
            <div className="space-y-1">
                <p className="text-emerald-400 font-bold font-mono text-sm">
                    Total: {formatEuro(payload[0].value)}
                </p>
                <p className="text-zinc-500 text-xs">
                    Dont versé: {formatEuro(payload[1].value)}
                </p>
            </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CONTROLES */}
        <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-1 h-fit">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" /> Paramètres
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label className="flex items-center gap-2 text-zinc-400"><PiggyBank size={14}/> Capital départ</Label>
                        <span className="font-mono text-white">{formatEuro(initialAmount[0])}</span>
                    </div>
                    <Slider value={initialAmount} onValueChange={setInitialAmount} max={500000} step={1000} />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label className="flex items-center gap-2 text-zinc-400"><Coins size={14}/> Versement / mois</Label>
                        <span className="font-mono text-white">{formatEuro(monthlyContribution[0])}</span>
                    </div>
                    <Slider value={monthlyContribution} onValueChange={setMonthlyContribution} max={5000} step={50} />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label className="flex items-center gap-2 text-zinc-400"><Calendar size={14}/> Durée</Label>
                        <span className="font-mono text-white">{years[0]} ans</span>
                    </div>
                    <Slider value={years} onValueChange={setYears} max={40} min={5} step={1} />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label className="flex items-center gap-2 text-zinc-400"><TrendingUp size={14}/> Rendement annuel</Label>
                        <span className="font-mono text-white">{rate[0]} %</span>
                    </div>
                    <Slider value={rate} onValueChange={setRate} max={15} step={0.5} />
                    <p className="text-xs text-zinc-500">Moyenne historique Bourse: ~8%</p>
                </div>
            </CardContent>
        </Card>

        {/* GRAPHIQUE & RÉSULTATS */}
        <div className="lg:col-span-2 space-y-6">
            {/* KPI RÉSUMÉ */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <p className="text-sm text-zinc-500 mb-1">Capital Final Estimé</p>
                    <p className="text-3xl font-bold text-emerald-400 tracking-tight">
                        <AnimatedNumber value={finalAmount} />
                    </p>
                </div>
                <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <p className="text-sm text-zinc-500 mb-1">Intérêts Gagnés (Argent gratuit)</p>
                    <p className="text-3xl font-bold text-blue-400 tracking-tight">
                        <AnimatedNumber value={finalAmount - totalInvested} />
                    </p>
                </div>
            </div>

            {/* CHART */}
            <div className="h-[400px] w-full rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 pt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="year" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorAmount)" 
                            name="Total"
                        />
                        <Area 
                            type="monotone" 
                            dataKey="invested" 
                            stroke="#52525b" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="transparent" 
                            name="Versé"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
}