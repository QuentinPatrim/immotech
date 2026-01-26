"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Zap, ShieldCheck } from "lucide-react";
import AnimatedNumber from "@/components/AnimatedNumber";

export default function ProjectionSimulator() {
  // Paramètres globaux
  const [years, setYears] = useState(20);
  const [initialCapital, setInitialCapital] = useState(10000);
  
  // Apports Mensuels (venant du Budget)
  const [monthlyStock, setMonthlyStock] = useState(150);
  const [monthlyCrypto, setMonthlyCrypto] = useState(50);
  const [monthlySecure, setMonthlySecure] = useState(100);

  // Rendements Hypothétiques (%)
  const [rateStock, setRateStock] = useState(8);    // ETF World moyen
  const [rateCrypto, setRateCrypto] = useState(12); // Optimiste mais risqué
  const [rateSecure, setRateSecure] = useState(3);  // Fonds Euro / Livret

  const [chartData, setChartData] = useState<any[]>([]);
  const [finalTotal, setFinalTotal] = useState(0);

  // Charger la stratégie depuis le Budget (localStorage)
  useEffect(() => {
      const savedStrategy = localStorage.getItem("dcaStrategy");
      if (savedStrategy) {
          const strat = JSON.parse(savedStrategy);
          setMonthlyStock(strat.stock || 0);
          setMonthlyCrypto(strat.crypto || 0);
          setMonthlySecure(strat.secure || 0);
      }
      
      // Charger le patrimoine actuel aussi (pour le capital de départ)
      const savedAssets = localStorage.getItem("myAssets");
      if (savedAssets) {
          const assets = JSON.parse(savedAssets);
          const totalAssets = assets.reduce((acc: number, item: any) => acc + item.value, 0);
          if (totalAssets > 0) setInitialCapital(totalAssets);
      }
  }, []);

  // --- MOTEUR DE CALCUL COMPOSÉ MULTI-ACTIFS ---
  useEffect(() => {
    let data = [];
    let currentStock = initialCapital * 0.4; // On assume une répartition de base du capital existant
    let currentCrypto = initialCapital * 0.1;
    let currentSecure = initialCapital * 0.5;

    // Si on part de 0 capital, on met tout à 0
    if (initialCapital === 0) { currentStock = 0; currentCrypto = 0; currentSecure = 0; }

    for (let year = 1; year <= years; year++) {
        // Formule intérêts composés mensuels pour plus de précision
        // FV = P * (1 + r/12)^(12) + PMT * ...
        
        // 1. STOCK (ETF)
        for (let m = 0; m < 12; m++) {
            currentStock = (currentStock + monthlyStock) * (1 + (rateStock / 100 / 12));
        }

        // 2. CRYPTO
        for (let m = 0; m < 12; m++) {
            currentCrypto = (currentCrypto + monthlyCrypto) * (1 + (rateCrypto / 100 / 12));
        }

        // 3. SECURE
        for (let m = 0; m < 12; m++) {
            currentSecure = (currentSecure + monthlySecure) * (1 + (rateSecure / 100 / 12));
        }

        const total = currentStock + currentCrypto + currentSecure;
        
        data.push({
            year: `An ${year}`,
            Stock: Math.round(currentStock),
            Crypto: Math.round(currentCrypto),
            Secure: Math.round(currentSecure),
            Total: Math.round(total)
        });
    }

    setChartData(data);
    if (data.length > 0) setFinalTotal(data[data.length - 1].Total);

  }, [years, initialCapital, monthlyStock, monthlyCrypto, monthlySecure, rateStock, rateCrypto, rateSecure]);

  const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-black p-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[80px] rounded-full"></div>
                <h3 className="text-zinc-400 font-medium mb-2">Patrimoine Projeté (Brut)</h3>
                <div className="text-5xl md:text-6xl font-black text-white tracking-tight">
                    <AnimatedNumber value={finalTotal} />
                </div>
                <p className="text-emerald-500 mt-2 text-sm font-bold flex items-center gap-2">
                    <TrendingUp size={16}/> Dans {years} ans
                </p>
            </div>
            
            <Card className="border-zinc-800 bg-zinc-900/30">
                <CardHeader><CardTitle className="text-white text-sm">Paramètres Clés</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-2">Capital Départ</div>
                        <div className="text-xl font-bold text-white">{formatEuro(initialCapital)}</div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-2">Apport Mensuel Total</div>
                        <div className="text-xl font-bold text-emerald-400">+{formatEuro(monthlyStock + monthlyCrypto + monthlySecure)}/mo</div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* CHART SECTION */}
        <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2"><TrendingUp className="text-blue-500"/> Projection Multi-Actifs</CardTitle>
                <div className="flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"/> Crypto</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"/> Bourse</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"/> Sécurisé</div>
                </div>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCrypto" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorSecure" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="year" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any) => formatEuro(value)}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        
                        {/* LES 3 COURBES SUPERPOSÉES (Stacked) */}
                        <Area type="monotone" dataKey="Crypto" stackId="1" stroke="#8b5cf6" fill="url(#colorCrypto)" />
                        <Area type="monotone" dataKey="Stock" stackId="1" stroke="#3b82f6" fill="url(#colorStock)" />
                        <Area type="monotone" dataKey="Secure" stackId="1" stroke="#10b981" fill="url(#colorSecure)" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* CONTROLS (SIMULATION EN TEMPS RÉEL) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-zinc-800 bg-zinc-900/30">
                <CardHeader><CardTitle className="text-sm text-zinc-400">Horizon de temps</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex justify-between mb-2 text-white font-bold">{years} ans</div>
                    <Slider value={[years]} onValueChange={(v) => setYears(v[0])} min={5} max={40} step={1} />
                </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/30">
                <CardHeader><CardTitle className="text-sm text-zinc-400">Hypothèses de Rendement</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs text-purple-400 mb-1">Crypto (Volatil) : {rateCrypto}%</div>
                        <Slider value={[rateCrypto]} onValueChange={(v) => setRateCrypto(v[0])} min={0} max={30} className="bg-purple-900/20"/>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-blue-400 mb-1">Bourse (Actions) : {rateStock}%</div>
                        <Slider value={[rateStock]} onValueChange={(v) => setRateStock(v[0])} min={2} max={12} />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}