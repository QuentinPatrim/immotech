export const NexusLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    // C'est ces deux lignes qui forcent le logo à remplir son conteneur :
    width="100%" 
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    className={className}
  >
    <defs>
      <linearGradient id="nexusGradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <path
      d="M25 80 L25 30 L75 80 L75 20"
      stroke="url(#nexusGradient)"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="75" cy="20" r="8" fill="#3b82f6" />
  </svg>
);