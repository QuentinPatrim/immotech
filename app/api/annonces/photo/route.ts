import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/authGuard';

/* ============================================================
   API : /api/annonces/photo?url=…
   Télécharge la photo d'une annonce retenue (images des portails
   non accessibles directement depuis le navigateur) pour la copier
   dans le stockage du dossier : le PDF reste complet même après
   le retrait de l'annonce.
   ============================================================ */

const MAX_BYTES = 10 * 1024 * 1024;

function isPublicHttpsUrl(raw: string) {
    try {
        const u = new URL(raw);
        if (u.protocol !== 'https:') return false;
        const h = u.hostname;
        return !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(h) && h.includes('.');
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url).searchParams.get('url') || '';
    if (!isPublicHttpsUrl(url)) return NextResponse.json({ error: 'Adresse de photo invalide.' }, { status: 400 });

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
            },
            cache: 'no-store',
        });
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.startsWith('image/')) return NextResponse.json({ error: 'Photo indisponible.' }, { status: 502 });
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > MAX_BYTES) return NextResponse.json({ error: 'Photo trop lourde.' }, { status: 413 });
        return new NextResponse(buffer, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' } });
    } catch {
        return NextResponse.json({ error: 'Photo indisponible.' }, { status: 502 });
    }
}
