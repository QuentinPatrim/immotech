"use client";

import { Moon, Sun } from "lucide-react";
import { usePatrimTheme } from "@/lib/patrimTheme";

/** Bouton soleil / lune : bascule l'espace agent entre thème sombre et clair */
export default function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggle } = usePatrimTheme();
    const light = theme === "light";
    return (
        <button
            type="button"
            onClick={toggle}
            title={light ? "Passer en thème sombre" : "Passer en thème clair"}
            aria-label={light ? "Passer en thème sombre" : "Passer en thème clair"}
            className={`w-9 h-9 rounded-full flex items-center justify-center border border-[var(--p-line)] text-[var(--p-muted)] hover:text-[var(--p-fg)] hover:bg-[var(--p-hover)] transition-colors ${className ?? ""}`}>
            {light ? <Moon size={15}/> : <Sun size={15}/>}
        </button>
    );
}
