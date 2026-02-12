import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexus | Gestion de Patrimoine',
    short_name: 'Nexus',
    description: 'Analysez et optimisez votre patrimoine.',
    start_url: '/',
    display: 'standalone', // Enlève la barre d'URL du navigateur
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      {
        src: '/icon', // Next.js génère automatiquement l'image ici grâce au fichier précédent
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}