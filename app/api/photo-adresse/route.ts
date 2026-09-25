import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/authGuard';
import { geocode } from '@/lib/dvf';
import { getAddressPhoto } from '@/lib/addressPhoto';

/* ============================================================
   API : /api/photo-adresse
   Photo automatique d'une adresse (vue de rue Panoramax,
   repli vue aérienne IGN) — remplace la capture Google Maps.
   GET ?lat=…&lon=…  (ou ?q=adresse)  [&v=n° de vue] [&mode=aerien]
   Réponse : image/jpeg + en-têtes X-Photo-*.
   ============================================================ */

export const maxDuration = 30;

export async function GET(request: Request) {
    // Réservé aux utilisateurs connectés (téléchargements et calcul côté serveur)
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    let lat = Number(searchParams.get('lat'));
    let lon = Number(searchParams.get('lon'));
    const q = (searchParams.get('q') || '').trim();
    const variant = Math.max(0, Math.floor(Number(searchParams.get('v')) || 0));
    const mode = searchParams.get('mode') === 'aerien' ? 'aerien' : 'auto';

    try {
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
            if (!q) return NextResponse.json({ error: 'Adresse manquante.' }, { status: 400 });
            const found = await geocode(q);
            if (!found) return NextResponse.json({ error: 'Adresse introuvable.' }, { status: 404 });
            lat = found.lat;
            lon = found.lon;
        }
        // France métropolitaine (les sources Panoramax/IGN utilisées ne couvrent pas au-delà)
        if (lat < 41 || lat > 51.5 || lon < -5.5 || lon > 10) {
            return NextResponse.json({ error: 'Adresse hors de France métropolitaine.' }, { status: 400 });
        }

        const photo = await getAddressPhoto(lat, lon, variant, mode);
        return new NextResponse(new Uint8Array(photo.buffer), {
            status: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'private, max-age=3600',
                'X-Photo-Source': photo.source,
                'X-Photo-Credit': encodeURIComponent(photo.credit),
                'X-Photo-Date': photo.date || '',
                'X-Photo-Variant': String(photo.variant),
                'X-Photo-Variants': String(photo.variants),
                'X-Photo-Lat': String(lat),
                'X-Photo-Lon': String(lon),
            },
        });
    } catch (error) {
        console.error('Erreur photo adresse :', error);
        return NextResponse.json({ error: "Aucune photo n'a pu être récupérée pour cette adresse." }, { status: 502 });
    }
}
