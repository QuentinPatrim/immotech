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
import { NexusLogo } from "@/components/NexusLogo"; // <--- L'IMPORT IMPORTANT
import { supabase } from "@/lib/supabaseClient";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Patrimoine", href: "/patrimoine", icon: Wallet },
  { name: "Budget", href: "/budget", icon: PieChart },
  { name: "Projection", href: "/projection", icon: TrendingUp },
  { name: "Simulateur", href: "/simulateur", icon: Calculator },
  { name: "Réglages", href: "/reglages", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-[#050505] hidden md:flex flex-col">
      
      {/* --- HEADER LOGO --- */}
      <div className="flex items-center gap-3 px-6 py-8 mb-6">
        {/* Le Logo Vectoriel Animé */}
        <NexusLogo className="w-10 h-10" />
        
        {/* Le Texte de la Marque */}
        <span className="text-2xl font-black text-white tracking-widest uppercase">
          Nexus
        </span>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
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
              <item.icon
                size={20}
                className={`transition-colors ${
                  isActive ? "text-emerald-500" : "text-zinc-500 group-hover:text-white"
                }`}
              />
              <span className="font-bold text-sm tracking-wide">{item.name}</span>
            </Link>
          );
        })}

        {/* LIEN ANALYSE IA (Spécial) */}
        <Link
          href="/analyses"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mt-6 group ${
            pathname === "/analyses"
              ? "bg-gradient-to-r from-emerald-900/20 to-blue-900/20 text-white border border-emerald-500/30"
              : "text-zinc-500 hover:text-white hover:bg-white/5"
          }`}
        >
          <BrainCircuit
            size={20}
            className={`transition-colors ${
              pathname === "/analyses" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`}
          />
          <span className="font-bold text-sm tracking-wide">Analyses IA</span>
        </Link>
      </nav>

      {/* --- FOOTER LOGOUT --- */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all group"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Déconnexion</span>
        </button>
        <div className="mt-4 px-4">
            <div className="flex items-center gap-2 opacity-30">
                <div className="h-6 w-6 rounded-full border border-white flex items-center justify-center text-[10px] text-white">N</div>
                <span className="text-[10px] text-zinc-500">Nexus App</span>
            </div>
        </div>
      </div>
    </aside>
  );
}