import { NextResponse } from 'next/server';
import { searchDvfComparables } from '@/lib/dvf';
import { authenticateRequest } from '@/lib/authGuard';

/* ============================================================
   API : /api/comparables
   Ventes réelles DVF autour du bien (fichiers géolocalisés
   data.gouv.fr 2021 → dernière année publiée).
   L'ancienne source api.cquest.org/dvf est hors service.
   ============================================================ */

export const maxDuration = 60;

export async function POST(request: Request) {
    // Réservé aux utilisateurs connectés (téléchargements lourds côté serveur)
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { address, surface, propertyType = 'Appartement', radius = 500, rooms = 0, surfaceTolerance = 0.25, includeVefa = false, knownSales = [] } = body || {};

        if (!address || !surface) {
            return NextResponse.json({ error: "Renseignez l'adresse et la surface du bien (étape 1) avant de lancer la recherche." }, { status: 400 });
        }

        const safeRadius = Math.min(Math.max(Number(radius) || 500, 50), 3000);
        const result = await searchDvfComparables({
            address: String(address),
            surface: Number(surface),
            propertyType: String(propertyType),
            radius: safeRadius,
            rooms: Number(rooms) || 0,
            surfaceTolerance: Math.min(Math.max(Number(surfaceTolerance) || 0.25, 0.05), 0.6),
            includeVefa: !!includeVefa,
            limit: 150,
            knownSales: Array.isArray(knownSales) ? knownSales.slice(0, 30) : [],
        });

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        if (result.sales.length === 0 && Object.keys(result.matches).length === 0) {
            return NextResponse.json({
                error: `Aucune vente comparable trouvée dans un rayon de ${safeRadius} m depuis ${result.years[0] ?? 2021}. Élargissez le rayon ou la tolérance de surface.`,
            }, { status: 404 });
        }

        // Photo Street View optionnelle (si la clé est configurée sur Vercel)
        const GOOGLE_KEY = process.env.GOOGLE_STREET_VIEW_KEY;
        const sales = result.sales.map(s => ({
            ...s,
            photoUrl: GOOGLE_KEY
                ? `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${s.lat},${s.lon}&fov=90&pitch=0&key=${GOOGLE_KEY}`
                : '',
        }));

        return NextResponse.json({
            success: true,
            center: result.center,
            years: result.years,
            radius: safeRadius,
            stats: result.stats,
            sales,
            matches: result.matches,
        });
    } catch (error) {
        console.error('Erreur moteur comparables DVF :', error);
        return NextResponse.json({ error: 'Erreur de traitement des données DVF.' }, { status: 500 });
    }
}
