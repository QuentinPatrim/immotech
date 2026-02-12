"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import SplashScreen from "@/components/SplashScreen";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  
  // On cache la sidebar sur la page de login si besoin
  const showSidebar = pathname !== "/login"; 

  const handleSplashComplete = () => {
    setLoading(false);
  };

  return (
    <>
        {/* Le Splash Screen se gère ici */}
        {loading && <SplashScreen onComplete={handleSplashComplete} />}

        <div className={`flex min-h-screen transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}>
            {/* On affiche la Sidebar seulement si le chargement est fini */}
            {!loading && showSidebar && <Sidebar />} 
            
            <div className={`flex-1 ${!loading && showSidebar ? "md:ml-64" : ""}`}>
                {children}
            </div>
        </div>
    </>
  );
}