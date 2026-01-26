"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

type CryptoData = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
};

export default function MarketWidget() {
  const [data, setData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=bitcoin,ethereum,solana&order=market_cap_desc&per_page=3&page=1&sparkline=false"
        );
        
        if (!response.ok) throw new Error("Erreur API");

        const result = await response.json();
        setData(result);
      } catch (error) {
        // CORRECTION ICI : console.warn au lieu de console.error
        console.warn("API Limitée : Affichage des données de démonstration.");
        
        setData([
          { id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 64230, price_change_percentage_24h: 2.4, image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
          { id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 3450, price_change_percentage_24h: -1.2, image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
          { id: "solana", symbol: "sol", name: "Solana", current_price: 145, price_change_percentage_24h: 5.7, image: "https://assets.coingecko.com/coins/images/4128/large/solana.png" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  if (loading) return <div className="h-32 w-full animate-pulse bg-zinc-900 rounded-xl" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.map((coin, i) => (
        <motion.div
          key={coin.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center gap-3">
            <img src={coin.image} alt={coin.name} className="h-10 w-10 rounded-full" />
            <div>
              <p className="font-bold text-white">{coin.name}</p>
              <p className="text-xs text-zinc-500 uppercase">{coin.symbol}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-mono font-bold text-white">
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(coin.current_price)}
              </p>
              <p className={`flex items-center justify-end text-xs font-bold ${coin.price_change_percentage_24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {coin.price_change_percentage_24h >= 0 ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}