"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// On définit les couleurs par type d'actif
const COLORS: Record<string, string> = {
  Immobilier: "#10b981", // Emerald
  Bourse: "#3b82f6",     // Blue
  Crypto: "#8b5cf6",     // Violet
  Cash: "#71717a",       // Zinc
  Autre: "#f59e0b",      // Amber
};

// Le composant accepte maintenant une "prop" assets
export default function AssetChart({ assets }: { assets: any[] }) {
  
  // On regroupe les données par TYPE pour le graphique
  // Exemple : Si tu as 2 apparts, on additionne leurs valeurs sous "Immobilier"
  const chartData = assets.reduce((acc: any[], item) => {
    const existing = acc.find((x) => x.name === item.type);
    if (existing) {
      existing.value += item.value;
    } else {
      acc.push({ name: item.type, value: item.value, color: COLORS[item.type] || "#ffffff" });
    }
    return acc;
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="text-zinc-200 font-medium mb-1">{payload[0].name}</p>
          <p className="text-emerald-400 font-mono font-bold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (assets.length === 0) {
    return (
        <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-500 text-sm">Aucun actif. Ajoutez-en un !</p>
        </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}