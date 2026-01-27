"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  TrendingUp, 
  Calculator, 
  Settings,
  BrainCircuit
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  // Liste complète des liens
  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Patrimoine", href: "/patrimoine", icon: Wallet },
    { name: "Budget", href: "/budget", icon: PieChart },
    { name: "Projection", href: "/projection", icon: TrendingUp },
    { name: "Simulateur", href: "/simulateur", icon: Calculator }, // ✅ Ajouté ici
    { name: "Réglages", href: "/parametres", icon: Settings }, // ✅ Corrigé vers /reglages
  ];

  // Fonction pour vérifier si un lien est actif
  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* --- VERSION DESKTOP (Latérale Fixe) --- */}
      <div className="hidden md:flex flex-col w-64 bg-zinc-950 border-r border-zinc-800 h-screen fixed left-0 top-0 p-4 z-50">
        <div className="flex items-center gap-2 mb-8 px-2">
           <div className="text-2xl font-bold text-white tracking-tight">
              ImmoTech<span className="text-emerald-500">.</span>
           </div>
        </div>

        <nav className="space-y-1 flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive(link.href) 
                  ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                  : "text-zinc-500 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <link.icon size={20} className={isActive(link.href) ? "text-emerald-500" : "text-zinc-500 group-hover:text-white transition-colors"} />
              <span>{link.name}</span>
            </Link>
          ))}
          
          {/* Lien "Analyses IA" */}
          <Link
              href="/analyses"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mt-4 ${
                isActive("/analyses") 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-zinc-500 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <BrainCircuit size={20} />
              <span>Analyses IA</span>
            </Link>
        </nav>

        <div className="text-xs text-zinc-700 px-3 pb-2">v2.1 • ImmoTech</div>
      </div>

      {/* --- VERSION MOBILE (Barre du bas Fixe) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 pb-safe pt-2 px-2 z-[999]">
        <div className="flex justify-between items-center h-16 max-w-md mx-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full active:scale-95 transition-transform"
            >
              <div className={`p-1.5 rounded-full transition-colors ${
                  isActive(link.href) ? "bg-emerald-500/10" : "bg-transparent"
              }`}>
                  <link.icon 
                    size={22} 
                    className={isActive(link.href) ? "text-emerald-500" : "text-zinc-500"} 
                    strokeWidth={isActive(link.href) ? 2.5 : 2}
                  />
              </div>
              {/* Optimisation mobile : texte plus petit */}
              <span className={`text-[9px] font-medium ${isActive(link.href) ? "text-white" : "text-zinc-600"}`}>
                {link.name === "Simulateur" ? "Simu" : link.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}