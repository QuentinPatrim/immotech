import { ImageResponse } from 'next/og'

// Taille de l'image (haute qualité pour les écrans rétina)
export const size = {
  width: 512,
  height: 512,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      // Fond noir de l'application (style carré arrondi type iOS)
      <div
        style={{
          fontSize: 24,
          background: '#050505',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%', // Arrondi style App mobile
        }}
      >
        {/* Le Logo SVG intégré directement ici */}
        <svg
          width="300"
          height="300"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nexusGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Forme du N */}
          <path
            d="M25 80 L25 30 L75 80 L75 20"
            stroke="url(#nexusGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Point accent */}
          <circle cx="75" cy="20" r="8" fill="#3b82f6" />
        </svg>
      </div>
    ),
    { ...size }
  )
}