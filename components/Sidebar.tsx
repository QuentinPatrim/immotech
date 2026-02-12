"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  TrendingUp, 
  Calculator, 
  Settings, 
  BrainCircuit,
  LogOut
} from "lucide-react";
import { NexusLogo } from "@/components/NexusLogo";
import { supabase } from "@/lib/supabaseClient";

const menuItems = [
  { name: "Dash", href: "/", icon: LayoutDashboard },
  { name: "Patrimoine", href: "/patrimoine", icon: Wallet },
  { name: "Budget", href: "/budget", icon: PieChart },
  { name: "Projets", href: "/projection", icon: TrendingUp },
  { name: "Simu", href: "/simulateur", icon: Calculator },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* ==============================================================
          1. VERSION MOBILE : JUSTE LA BARRE DU BAS (Tab Bar)
          -> On a supprimé le Header fixe du haut
         ============================================================== */}
      
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] px-2">
        <div className="flex justify-around items-center h-16">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all active:scale-95 ${
                  isActive ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-emerald-500/10" : ""}`}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[9px] font-medium tracking-wide uppercase">{item.name}</span>
              </Link>
            );
          })}
          
          <Link
             href="/reglages"
             className={`flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 ${
                pathname === "/reglages" ? "text-emerald-400" : "text-zinc-500"
             }`}
          >
             <Settings size={20} />
             <span className="text-[9px] font-medium tracking-wide uppercase">Réglages</span>
          </Link>
        </div>
      </nav>

      {/* ==============================================================
          2. VERSION PC : SIDEBAR CLASSIQUE (Inchangée)
         ============================================================== */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-[#050505] hidden md:flex flex-col">
        <div className="flex items-center gap-4 px-8 py-10 mb-2">
          <div className="shrink-0"><NexusLogo className="w-9 h-9" /></div>
          <span className="text-3xl font-black text-white tracking-tighter uppercase font-sans">NEXUS</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
          {[...menuItems, { name: "Réglages", href: "/reglages", icon: Settings }].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon size={20} className={`transition-colors ${isActive ? "text-emerald-500" : "text-zinc-500 group-hover:text-white"}`} />
                <span className="font-bold text-sm tracking-wide">{item.name === "Dash" ? "Dashboard" : item.name === "Projets" ? "Projection" : item.name === "Simu" ? "Simulateur" : item.name}</span>
              </Link>
            );
          })}

          <Link
            href="/analyses"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mt-6 group ${
              pathname === "/analyses"
                ? "bg-gradient-to-r from-emerald-900/20 to-blue-900/20 text-white border border-emerald-500/30"
                : "text-zinc-500 hover:text-white hover:bg-white/5"
            }`}
          >
            <BrainCircuit size={20} className={`transition-colors ${pathname === "/analyses" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"}`} />
            <span className="font-bold text-sm tracking-wide">Analyses IA</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all group">
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Déconnexion</span>
          </button>
          <div className="mt-4 px-4 flex justify-between items-center opacity-30">
              <span className="text-[10px] text-zinc-500">v1.2 • Mobile</span>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
      </aside>
    </>
  );
}