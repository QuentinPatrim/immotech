import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ error: 'URL manquante' }, { status: 400 });

        // Simule un navigateur
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9'
            }
        });
        const html = await response.text();

        // ==========================================
        // 1. RECHERCHE DU PRIX (Destruction des espaces invisibles)
        // ==========================================
        // On nettoie le HTML et on force tous les espaces bizarres (&nbsp;, &#160;, \u00A0) à devenir des espaces normaux
        const cleanHtml = html.replace(/&nbsp;/gi, ' ').replace(/&#160;/gi, ' ').replace(/\u00A0/g, ' ');
        const textOnly = cleanHtml.replace(/<[^>]*>/g, ' ');
        
        let price = null;
        
        // On cherche des nombres de 5 à 7 chiffres suivis de €
        const priceRegexes = [
            /([\d\s.,]{5,10})\s*€/i,
            /([\d\s.,]{5,10})\s*euros/i,
            /([\d\s.,]{5,10})\s*FAI/i,
            /(?:prix|price)[^\d]*([\d\s.,]{5,10})/i
        ];

        for (const regex of priceRegexes) {
            const match = textOnly.match(regex);
            if (match) {
                // Ne garde que les chiffres purs
                const cleanPrice = parseInt(match[1].replace(/[^\d]/g, ''), 10);
                if (cleanPrice > 10000 && cleanPrice < 10000000) {
                    price = cleanPrice;
                    break;
                }
            }
        }

        // ==========================================
        // 2. RECHERCHE DU TITRE / ADRESSE
        // ==========================================
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let title = titleMatch ? titleMatch[1].trim() : '';
        title = title.split('-')[0].split('|')[0].trim(); // Enlève le nom de l'agence à la fin

        // ==========================================
        // 3. RECHERCHE DES PHOTOS (Anti-DPE)
        // ==========================================
        let rawImages: string[] = [];

        // A. La balise officielle
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (ogImageMatch) rawImages.push(ogImageMatch[1]);

        // B. Tous les liens qui pointent vers des images (souvent utilisé pour les galeries HD en plein écran)
        const hrefRegex = /href=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/gi;
        let match;
        while ((match = hrefRegex.exec(html)) !== null) {
            rawImages.push(match[1]);
        }

        // C. Toutes les sources d'images (y compris le lazy-loading)
        const srcRegex = /(?:src|data-src|data-lazy|data-original|data-lazy-src)=["']([^"']+)["']/gi;
        while ((match = srcRegex.exec(html)) !== null) {
            rawImages.push(match[1]);
        }

        // D. Les images en fond d'écran CSS
        const bgRegex = /background-image\s*:\s*url\(['"]?([^'"()]+)['"]?\)/gi;
        while ((match = bgRegex.exec(html)) !== null) {
            rawImages.push(match[1]);
        }

        // --- Nettoyage ---
        let cleanImages = rawImages
            .map(src => {
                let cleanSrc = src.replace(/&amp;/g, '&');
                if (cleanSrc.startsWith('//')) return 'https:' + cleanSrc;
                if (cleanSrc.startsWith('/')) {
                    try { return new URL(cleanSrc, url).href; } catch { return ''; }
                }
                return cleanSrc;
            })
            .filter(src => {
                if (!src.startsWith('http')) return false;
                
                // Rejette ce qui n'est pas une image
                if (src.match(/\.(js|css|woff|ttf|svg|ico|json)$/i)) return false;
                
                // LE FILTRE ANTI-DPE / LOGOS
                if (src.match(/(logo|icon|avatar|marker|pin|favicon|dpe|ges|diag|energie|climat|bandeau)/i)) return false;
                
                return src.match(/\.(jpe?g|png|webp)/i) || src.includes('image');
            });

        // Supprime les doublons
        cleanImages = [...new Set(cleanImages)];

        return NextResponse.json({
            success: true,
            title: title,
            price: price,
            photos: cleanImages
        });

    } catch (error) {
        console.error("Erreur scraping:", error);
        return NextResponse.json({ error: 'Impossible de lire cette URL' }, { status: 500 });
    }
}