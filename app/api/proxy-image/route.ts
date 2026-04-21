import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('URL manquante', { status: 400 });
    }

    try {
        // On récupère l'image en se faisant passer pour un vrai navigateur
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
        });
        
        const buffer = await response.arrayBuffer();
        
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
        // LA MAGIE EST ICI : On autorise le Canvas à manipuler l'image !
        headers.set('Access-Control-Allow-Origin', '*'); 
        headers.set('Cache-Control', 'public, max-age=31536000');

        return new NextResponse(buffer, { status: 200, headers });
    } catch (error) {
        console.error("Erreur Proxy Image:", error);
        return new NextResponse('Erreur proxy', { status: 500 });
    }
}