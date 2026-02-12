"use client";

import SplashScreen from "@/components/SplashScreen";

export default function Loading() {
  // On passe une fonction vide () => null car Next.js gère lui-même la fin du chargement ici
  return <SplashScreen onComplete={() => null} />;
}