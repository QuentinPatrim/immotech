"use client";

import { useSyncExternalStore } from "react";
import { PATRIM_THEME_KEY } from "@/lib/patrimThemeScript";

/* ============================================================
   Thème de l'espace agent Patrim (sombre / clair)
   L'attribut <html data-patrim-theme> est posé avant l'affichage
   par un petit script dans app/layout.tsx (pas de flash), puis
   modifié ici par le bouton soleil / lune.
   ============================================================ */

export type PatrimTheme = "dark" | "light";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = (): PatrimTheme => (document.documentElement.getAttribute("data-patrim-theme") === "light" ? "light" : "dark");
const getServerSnapshot = (): PatrimTheme => "dark";

export function setPatrimTheme(theme: PatrimTheme) {
    document.documentElement.setAttribute("data-patrim-theme", theme);
    try { localStorage.setItem(PATRIM_THEME_KEY, theme); } catch { /* stockage local indisponible */ }
    listeners.forEach(l => l());
}

export function usePatrimTheme() {
    const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    return { theme, toggle: () => setPatrimTheme(theme === "light" ? "dark" : "light") };
}
