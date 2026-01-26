"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, PieChart, TrendingUp, Calculator, Settings, LineChart } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

const MENU_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
  { name: "Patrimoine", icon: Wallet, path: "/patrimoine" },
  { name: "Budget & DCA", icon: PieChart, path: "/budget" },
  { name: "Projection", icon: LineChart, path: "/projection" },
  { name: "Simulateur Immo", icon: Calculator, path: "/simulateur" },
  { name: "Analyses IA", icon: TrendingUp, path: "/analyses" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleNavClick = () => {
    triggerHaptic("light");
  };

  return (
    <>
      {/* --- SIDEBAR DESKTOP (Cachée sur Mobile) --- */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800 bg-black h-screen sticky top-0 left-0 shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-emerald-500" /> ImmoTech<span className="text-emerald-500">.</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* ZONE PARAMÈTRES (Active) */}
        <div className="p-4 border-t border-zinc-800">
          <Link 
            href="/parametres"
            onClick={handleNavClick}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/parametres" 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-500 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Settings size={20} />
            Paramètres
          </Link>
        </div>
      </aside>

      {/* --- BOTTOM BAR MOBILE (Visible uniquement sur Mobile) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-zinc-800 z-50 pb-safe">
        <nav className="flex justify-around items-center h-16 px-2">
            {/* ASTUCE UX : Sur mobile, on affiche les 4 premiers items + Paramètres à la fin 
               pour que l'utilisateur puisse accéder à son profil facilement.
            */}
            {MENU_ITEMS.slice(0, 4).map((item) => {
                const isActive = pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        onClick={handleNavClick}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? "text-emerald-500" : "text-zinc-500"}`}
                    >
                        <item.icon size={isActive ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} className="transition-all"/>
                    </Link>
                )
            })}

            {/* Bouton Paramètres Mobile Spécifique */}
            <Link
                href="/parametres"
                onClick={handleNavClick}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/parametres" ? "text-emerald-500" : "text-zinc-500"}`}
            >
                <Settings size={pathname === "/parametres" ? 24 : 20} strokeWidth={pathname === "/parametres" ? 2.5 : 2} className="transition-all"/>
            </Link>
        </nav>
      </div>
      
      {/* Spacer Mobile */}
      <div className="md:hidden h-16 w-full shrink-0" />
    </>
  );
}