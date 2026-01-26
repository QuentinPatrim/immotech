"use client";

import { useState, useEffect } from "react";
import { Euro, Calendar, Percent, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber"; // Import du composant animé

export default function LoanCalculator() {
  // --- ÉTATS ---
  const [amount, setAmount] = useState([200000]);
  const [duration, setDuration] = useState([25]);
  const [interestRate, setInterestRate] = useState([3.5]);
  
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  // --- LOGIQUE DE CALCUL & GÉNÉRATION DATA ---
  useEffect(() => {
    const principal = amount[0];
    const years = duration[0];
    const rate = interestRate[0] / 100 / 12;
    const numberOfPayments = years * 12;

    if (rate > 0) {
        // 1. Calcul Mensualité
        const x = Math.pow(1 + rate, numberOfPayments);
        const monthly = (principal * x * rate) / (x - 1);
        setMonthlyPayment(monthly);
        setTotalCost((monthly * numberOfPayments) - principal);

        // 2. Génération des données pour le Graphique
        let balance = principal;
        const data = [];
        const yearlyDataPoints = years;
        
        for (let i = 0; i <= yearlyDataPoints; i++) {
            data.push({
                year: `Année ${i}`,
                balance: Math.max(0, Math.round(balance)),
            });
            
            // Simulation amortissement annuel
            for(let m=0; m<12; m++) {
                const interest = balance * rate;
                const principalPayment = monthly - interest;
                balance -= principalPayment;
            }
        }
        setChartData(data);
    }
  }, [amount, duration, interestRate]);

  // Fonction de formatage pour les labels statiques (sliders, tooltip)
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

  // Custom Tooltip pour le graph
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
            <p className="text-zinc-400 text-xs mb-1">{label}</p>
            <p className="text-emerald-400 font-bold font-mono">
                {formatCurrency(payload[0].value)}
            </p>
            <p className="text-xs text-zinc-500">Restant dû</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full max-w-4xl border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
      <CardHeader className="border-b border-zinc-800/50 pb-6">
        <CardTitle className="flex items-center gap-2 text-xl font-medium text-white">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          Simulateur d'Emprunt
        </CardTitle>
      </CardHeader>
      
      <CardContent className="grid gap-8 p-6 lg:grid-cols-3">
        {/* COLONNE 1 : CONTROLES */}
        <div className="space-y-8 lg:col-span-1">
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label className="flex items-center gap-2 text-zinc-400"><Euro className="h-4 w-4" /> Montant</Label>
              <span className="font-mono text-white">{formatCurrency(amount[0])}</span>
            </div>
            <Slider value={amount} onValueChange={setAmount} max={1000000} step={1000} className="py-2" />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <Label className="flex items-center gap-2 text-zinc-400"><Calendar className="h-4 w-4" /> Durée</Label>
              <span className="font-mono text-white">{duration[0]} ans</span>
            </div>
            <Slider value={duration} onValueChange={setDuration} max={30} min={5} step={1} className="py-2" />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <Label className="flex items-center gap-2 text-zinc-400"><Percent className="h-4 w-4" /> Taux</Label>
              <span className="font-mono text-white">{interestRate[0]} %</span>
            </div>
            <Slider value={interestRate} onValueChange={setInterestRate} max={10} step={0.1} className="py-2" />
          </div>

          {/* KPI Résumé Rapide (Mobile/Tablette) */}
           <div className="lg:hidden rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 mt-6">
            <p className="text-sm font-medium text-zinc-500">Mensualité</p>
            <p className="text-2xl font-bold text-white tracking-tight">
                <AnimatedNumber value={monthlyPayment} />
            </p>
           </div>
        </div>

        {/* COLONNE 2 & 3 : RÉSULTATS & GRAPHIQUE */}
        <div className="flex flex-col justify-between gap-4 lg:col-span-2 h-auto min-h-[400px]">
            
            {/* BLOC RÉSULTATS CHIFFRÉS (Animé) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm font-medium text-zinc-500">Mensualité estimée</p>
                    <p className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-1">
                        <AnimatedNumber value={monthlyPayment} />
                        <span className="text-lg text-zinc-600 font-normal">/mois</span>
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm font-medium text-zinc-500">Coût total crédit</p>
                    <p className="text-2xl font-semibold text-emerald-400 tracking-tight">
                        <AnimatedNumber value={totalCost} />
                    </p>
                </div>
            </div>

            {/* GRAPHIQUE */}
            <div className="h-full w-full flex-1 rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 pt-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-4 ml-2">Amortissement du Capital</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="year" 
                            stroke="#52525b" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="#52525b" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorBalance)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex justify-end px-2">
                <span className="text-xs text-zinc-700">Taux fixe hors assurance</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}