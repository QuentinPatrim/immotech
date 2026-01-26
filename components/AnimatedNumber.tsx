"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { triggerHaptic } from "@/lib/haptics"; // IMPORT

export default function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(current)
  );

  useEffect(() => {
    spring.set(value);
    
    // Petite vibration quand le chiffre change
    // On met un petit délai pour simuler l'arrivée du chiffre
    const timer = setTimeout(() => {
        triggerHaptic("light"); 
    }, 500);

    return () => clearTimeout(timer);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}