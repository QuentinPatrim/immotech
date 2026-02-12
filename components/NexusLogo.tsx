import React from "react";

export const NexusLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      {/* Le Dégradé Signature NEXUS (Émeraude vers Bleu) */}
      <linearGradient id="nexusGradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10b981" /> {/* Emerald-500 */}
        <stop offset="50%" stopColor="#3b82f6" /> {/* Blue-500 */}
        <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet-500 */}
      </linearGradient>

      {/* L'effet de Lueur (Glow) */}
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* La Forme : Un "N" abstrait formé par des courbes de croissance */}
    <path
      d="M25 80 L25 30 L75 80 L75 20"
      stroke="url(#nexusGradient)"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#glow)"
    />
    
    {/* Petit accent futuriste (point ou ligne) */}
    <circle cx="75" cy="20" r="6" fill="#3b82f6" filter="url(#glow)" />
  </svg>
);