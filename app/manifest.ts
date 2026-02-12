import { MetadataRoute } from 'next'

// CETTE LIGNE EST CRUCIALE : Elle force Next.js à créer un fichier statique
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexus | Gestion de Patrimoine',
    short_name: 'Nexus',
    description: 'Analysez et optimisez votre patrimoine.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}