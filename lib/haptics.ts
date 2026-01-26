// lib/haptics.ts

export const triggerHaptic = (type: "light" | "medium" | "heavy" | "success" | "error") => {
  // Vérifie si le navigateur supporte la vibration (Surtout Android)
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    switch (type) {
      case "light":
        navigator.vibrate(5); // Vibration très courte (5ms)
        break;
      case "medium":
        navigator.vibrate(15);
        break;
      case "heavy":
        navigator.vibrate(30);
        break;
      case "success":
        navigator.vibrate([10, 30, 10]); // Deux petites secousses
        break;
      case "error":
        navigator.vibrate([50, 50, 50]); // Trois secousses lourdes
        break;
    }
  }
};