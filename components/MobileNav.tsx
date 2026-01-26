"use client";

import { LayoutDashboard, Wallet, PieChart, TrendingUp, Calculator, LineChart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  const menuItems = [
    { icon: LayoutDashboard, label: "Accueil", href: "/" },
    { icon: Wallet, label: "Actifs", href: "/patrimoine" },
    { icon: LineChart, label: "Projection", href: "/projection" }, // <--- ICI
    { icon: Calculator, label: "Budget", href: "/budget" },
    { icon: TrendingUp, label: "Immo", href: "/simulateur" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-zinc-800 bg-zinc-950/80 px-2 backdrop-blur-xl md:hidden">
      {menuItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-full ${
              isActive ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <item.icon size={20} className={isActive ? "fill-current/10" : ""} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}