"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "./SplashScreen";

export default function ClientSplash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // On force l'affichage pendant 2500ms (2.5 secondes)
    const timer = setTimeout(() => {
      setShow(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && <SplashScreen />}
    </AnimatePresence>
  );
}