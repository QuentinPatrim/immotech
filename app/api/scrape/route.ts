import { NextResponse } from 'next/server';

/* ============================================================
   SCRAPER PATRIM.FR + FALLBACK GÉNÉRIQUE
   Architecture : 
   - On détecte le domaine de l'URL
   - Si patrim.fr → parseur sur-mesure (très fiable)
   - Sinon → parseur générique (JSON-LD / OpenGraph / regex)
   ============================================================ */

type ScrapedData = {
    success: boolean;
    title?: string;
    address?: string;
    city?: string;
    price?: number;
    propertyType?: string;
    rooms?: number;
    surface?: number;
    bedrooms?: number;
    reference?: string;
    photos: string[];
    source: 'patrim' | 'generic' | 'error';
    error?: string;
};

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ success: false, error: 'URL manquante' }, { status: 400 });

        // Validation URL
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ success: false, error: 'URL invalide' }, { status: 400 });
        }

        // Fetch du HTML avec un User-Agent de vrai navigateur
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            // Next.js App Router supporte le cache, on désactive pour avoir toujours les dernières données
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: `Le site a répondu avec le code ${response.status}. Vérifiez l'URL ou essayez à nouveau.`,
            }, { status: 200 });
        }

        const html = await response.text();

        // Détection du site pour router vers le bon parseur
        const isPatrim = parsedUrl.hostname.includes('patrim.fr');

        const result: ScrapedData = isPatrim
            ? parsePatrim(html, url)
            : parseGeneric(html, url);

        return NextResponse.json(result);

    } catch (error) {
        console.error("Erreur scraping:", error);
        return NextResponse.json({
            success: false,
            error: 'Impossible de lire cette URL. Le site est peut-être inaccessible ou bloque les imports automatiques.',
            photos: [],
        }, { status: 200 });
    }
}

/* ============================================================
   PARSEUR SPÉCIALISÉ PATRIM.FR
   Exploite la structure HTML connue du site pour une extraction
   ultra-fiable. Patterns identifiés par inspection manuelle du HTML.
   ============================================================ */
function parsePatrim(html: string, url: string): ScrapedData {
    const result: ScrapedData = {
        success: true,
        photos: [],
        source: 'patrim',
    };

    // --- TITRE ---
    // Format observé : "Appartement 5 pièces de 152m2 à Toulouse proposé par Patrim - TAPP99892"
    // On nettoie les suffixes marketing pour garder l'essentiel
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
        let title = decodeHtmlEntities(titleMatch[1].trim());
        // Retirer "proposé par Patrim - TAPPxxxxx" en fin de titre
        title = title.replace(/\s*(proposé par Patrim|Patrim).*$/i, '').trim();
        // Retirer la référence en fin si présente
        title = title.replace(/\s*[-–]\s*T[A-Z]+\d+\s*$/i, '').trim();
        result.title = title;
    }

    // --- RÉFÉRENCE DE L'ANNONCE ---
    // Pattern observé dans l'URL et le HTML : TAPPxxxxx, TMAIxxxxx, etc.
    const refMatch = url.match(/T[A-Z]+\d+/i) || html.match(/\bT[A-Z]{2,4}\d{4,}\b/);
    if (refMatch) result.reference = refMatch[0];

    // --- PRIX ---
    // Pattern très fiable sur patrim.fr : "### 800 000 € - Ref. TAPPxxxxx"
    // ou présence répétée dans les slides des photos (contexte "vente")
    // On cherche en priorité le format "XXX XXX € - Ref." qui est l'indicateur le plus sûr
    let price: number | null = null;

    // Stratégie 1 : prix juste avant "- Ref."
    const priceBeforeRefMatch = html.match(/([\d\s.,]+)\s*€\s*[-–]\s*Ref\./i);
    if (priceBeforeRefMatch) {
        const clean = parseInt(priceBeforeRefMatch[1].replace(/[^\d]/g, ''), 10);
        if (clean >= 20000 && clean <= 50000000) price = clean;
    }

    // Stratégie 2 : prix dans le texte du descriptif "prix total de XXX XXX,00 euros"
    if (!price) {
        const priceTextMatch = html.match(/prix\s+total\s+de\s+([\d\s.,]+)\s+euros/i);
        if (priceTextMatch) {
            const clean = parseInt(priceTextMatch[1].replace(/[^\d]/g, ''), 10);
            if (clean >= 20000 && clean <= 50000000) price = clean;
        }
    }

    // Stratégie 3 : on cherche tous les "XXX XXX €" et on prend le plus FRÉQUENT
    // (car sur patrim.fr, le prix du bien apparaît dans chaque slide photo)
    if (!price) {
        const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
        const allPriceMatches = [...textOnly.matchAll(/([\d]{1,3}(?:[\s.,][\d]{3})+)\s*€/g)];
        const counts = new Map<number, number>();
        for (const m of allPriceMatches) {
            const clean = parseInt(m[1].replace(/[^\d]/g, ''), 10);
            if (clean >= 20000 && clean <= 50000000) {
                counts.set(clean, (counts.get(clean) || 0) + 1);
            }
        }
        // Prendre le prix qui apparaît le plus souvent
        let maxCount = 0;
        for (const [p, c] of counts) {
            if (c > maxCount) { maxCount = c; price = p; }
        }
    }

    if (price) result.price = price;

    // --- INFORMATIONS STRUCTURÉES ---
    // Pattern observé : "Label : <strong>Valeur</strong>" ou "**Label :** <strong>Valeur</strong>"
    const extractField = (labels: string[]): string | null => {
        for (const label of labels) {
            // Capture la valeur dans <strong>...</strong> après le label
            const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`${escapedLabel}\\s*:?\\s*</[^>]+>\\s*<strong[^>]*>([^<]+)</strong>`, 'i');
            const match = html.match(regex);
            if (match) return match[1].trim();
            // Fallback : label suivi directement de strong
            const regex2 = new RegExp(`${escapedLabel}\\s*:?\\s*<strong[^>]*>([^<]+)</strong>`, 'i');
            const match2 = html.match(regex2);
            if (match2) return match2[1].trim();
        }
        return null;
    };

    // Surface habitable
    const surfaceStr = extractField(['Surface Habitable', 'Surface']);
    if (surfaceStr) {
        const sNum = parseInt(surfaceStr.replace(/[^\d]/g, ''), 10);
        if (sNum > 0 && sNum < 10000) result.surface = sNum;
    }

    // Nombre de pièces
    const roomsStr = extractField(['Nombre de pièce\\(s\\)', 'Nombre de pièces']);
    if (roomsStr) {
        const r = parseInt(roomsStr.replace(/[^\d]/g, ''), 10);
        if (r > 0 && r < 20) result.rooms = r;
    }

    // Nombre de chambres
    const bedroomsStr = extractField(['Nombre de chambre\\(s\\)', 'Nombre de chambres']);
    if (bedroomsStr) {
        const b = parseInt(bedroomsStr.replace(/[^\d]/g, ''), 10);
        if (b > 0 && b < 20) result.bedrooms = b;
    }

    // Catégorie (type de bien)
    const categoryStr = extractField(['Catégorie']);
    if (categoryStr) {
        result.propertyType = categoryStr;
    } else {
        // Fallback depuis l'URL ou le titre
        const urlType = url.match(/vente-(appartement|maison|parking|immeuble|local)/i);
        if (urlType) {
            result.propertyType = urlType[1].charAt(0).toUpperCase() + urlType[1].slice(1).toLowerCase();
        }
    }

    // --- VILLE ---
    // Extraction depuis le titre "... à Toulouse" ou l'URL "toulouse-TAPPxxx"
    if (result.title) {
        const cityMatch = result.title.match(/\bà\s+([A-ZÀ-Ÿ][a-zà-ÿ\-\s]+?)(?:\s+proposé|\s*$)/);
        if (cityMatch) result.city = cityMatch[1].trim();
    }
    if (!result.city) {
        const urlCityMatch = url.match(/-([a-z\-]+)-T[A-Z]+\d+/i);
        if (urlCityMatch) {
            // Capitalize
            result.city = urlCityMatch[1].split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        }
    }

    // --- ADRESSE APPROXIMATIVE ---
    // Le site mentionne souvent le quartier dans le descriptif :
    //   "APPARTEMENT DE PRESTIGE - ESQUIROL / rue des Marchands :"
    //   "MAISON FAMILIALE - SAINT-CYPRIEN :"
    // On cherche dans le TEXTE (pas les URLs) une ligne en MAJUSCULES qui précède ":"
    // Cette regex exige que le match soit dans un <p> ou après une balise de fin,
    // donc pas dans une URL encodée.
    const textContent = html.replace(/<a[^>]*>[^<]*<\/a>/gi, ''); // retire les liens
    const descMatch = textContent.match(/>\s*(APPARTEMENT[^<:]*:[^<.]+)/i)
        || textContent.match(/>\s*(MAISON[^<:]*:[^<.]+)/i);
    if (descMatch) {
        // On prend ce qui suit le ":" (le vrai début de description)
        const parts = descMatch[1].split(':');
        if (parts.length >= 2) {
            // parts[0] = "APPARTEMENT DE PRESTIGE - ESQUIROL / rue des Marchands"
            // On extrait la partie quartier/rue après le tiret
            const preColon = parts[0].trim();
            const dashSplit = preColon.split(/\s+[-–]\s+/);
            if (dashSplit.length >= 2) {
                const quartier = dashSplit.slice(1).join(' - ').trim();
                if (result.city) {
                    result.address = `${quartier} · ${result.city}`;
                } else {
                    result.address = quartier;
                }
            }
        }
    }
    // Fallback : si on n'a pas pu extraire le quartier, on met juste la ville
    if (!result.address && result.city) {
        result.address = result.city;
    }

    // --- PHOTOS ---
    // Sur patrim.fr, toutes les photos d'annonce sont dans /photobox/
    // Les vignettes sont dans /photobox/.../vignettes/ — on les ignore
    // Pour récupérer les photos HD
    const photoRegex = /https?:\/\/[^"'\s]*\/photobox\/[^"'\s]+?\.(?:jpe?g|png|webp)/gi;
    const photoMatches = html.match(photoRegex) || [];

    // Déduplication + filtrage des vignettes (on préfère les grandes)
    const uniquePhotos = new Set<string>();
    for (const p of photoMatches) {
        if (!p.includes('/vignettes/')) {
            uniquePhotos.add(p);
        }
    }

    // Si aucune grande version, on prend les vignettes en secours
    if (uniquePhotos.size === 0) {
        for (const p of photoMatches) {
            uniquePhotos.add(p);
        }
    }

    result.photos = Array.from(uniquePhotos);

    return result;
}

/* ============================================================
   PARSEUR GÉNÉRIQUE (FALLBACK)
   Pour les URLs qui ne sont pas sur patrim.fr.
   Stratégie en cascade : JSON-LD > OpenGraph > regex prudentes.
   ============================================================ */
function parseGeneric(html: string, url: string): ScrapedData {
    const result: ScrapedData = {
        success: true,
        photos: [],
        source: 'generic',
    };

    // --- STRATÉGIE 1 : JSON-LD (données structurées schema.org) ---
    // Beaucoup de sites immo modernes exposent des données Product/RealEstateListing
    const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of jsonLdMatches) {
        try {
            const jsonData = JSON.parse(match[1]);
            const items = Array.isArray(jsonData) ? jsonData : [jsonData];
            for (const item of items) {
                const obj = item['@graph'] ? item['@graph'][0] : item;
                if (obj.name && !result.title) result.title = String(obj.name);
                if (obj.address) {
                    result.address = typeof obj.address === 'string'
                        ? obj.address
                        : obj.address.streetAddress || obj.address.addressLocality;
                }
                if (obj.offers?.price) {
                    const p = parseInt(String(obj.offers.price).replace(/[^\d]/g, ''), 10);
                    if (p > 0) result.price = p;
                }
                if (obj.image) {
                    const imgs = Array.isArray(obj.image) ? obj.image : [obj.image];
                    result.photos.push(...imgs.map((i: any) => typeof i === 'string' ? i : i.url).filter(Boolean));
                }
            }
        } catch { /* JSON malformé, on continue */ }
    }

    // --- STRATÉGIE 2 : OpenGraph ---
    if (!result.title) {
        const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
        if (ogTitle) result.title = decodeHtmlEntities(ogTitle[1]);
    }
    if (!result.price) {
        const ogPrice = html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i);
        if (ogPrice) {
            const p = parseInt(ogPrice[1].replace(/[^\d]/g, ''), 10);
            if (p > 0) result.price = p;
        }
    }
    const ogImages = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)];
    result.photos.push(...ogImages.map(m => m[1]));

    // --- STRATÉGIE 3 : Regex HTML (avec prudence) ---
    if (!result.title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            result.title = decodeHtmlEntities(titleMatch[1].trim()).split(/[-|]/)[0].trim();
        }
    }

    if (!result.price) {
        // Recherche du nombre le plus fréquent qui ressemble à un prix immobilier
        const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
        const allMatches = [...textOnly.matchAll(/([\d]{1,3}(?:[\s.,][\d]{3})+)\s*€/g)];
        const counts = new Map<number, number>();
        for (const m of allMatches) {
            const clean = parseInt(m[1].replace(/[^\d]/g, ''), 10);
            if (clean >= 20000 && clean <= 50000000) {
                counts.set(clean, (counts.get(clean) || 0) + 1);
            }
        }
        let maxCount = 0;
        for (const [p, c] of counts) {
            if (c > maxCount) { maxCount = c; result.price = p; }
        }
    }

    // --- PHOTOS (générique) ---
    // On cherche dans l'ordre dans une zone "article" ou "main" (plus fiable que toute la page)
    const bodyZone = extractContentZone(html);

    // Images dans <img src>
    const imgMatches = [...bodyZone.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    for (const m of imgMatches) {
        const src = resolveUrl(m[1], url);
        if (src && isLikelyPropertyPhoto(src)) {
            result.photos.push(src);
        }
    }

    // Déduplication
    result.photos = [...new Set(result.photos)];

    return result;
}

/* ============================================================
   HELPERS
   ============================================================ */

// Résout une URL relative en absolue
function resolveUrl(src: string, baseUrl: string): string | null {
    try {
        let clean = src.replace(/&amp;/g, '&').trim();
        if (clean.startsWith('//')) return 'https:' + clean;
        if (clean.startsWith('http')) return clean;
        return new URL(clean, baseUrl).href;
    } catch {
        return null;
    }
}

// Filtre : est-ce probablement une photo d'annonce et pas un logo/icône/pub ?
function isLikelyPropertyPhoto(src: string): boolean {
    if (!src.startsWith('http')) return false;
    if (src.match(/\.(js|css|woff|ttf|svg|ico|json|gif)(\?|$)/i)) return false;
    // Logos, icônes, avatars courants
    if (src.match(/\b(logo|icon|avatar|marker|pin|favicon|banner|sprite|flag|social|facebook|twitter|instagram|linkedin|youtube)\b/i)) return false;
    // On garde si extension photo OU CDN image connu
    return /\.(jpe?g|png|webp)(\?|$)/i.test(src) || /(_next\/image|cdn|cloudfront|imgix|cloudinary)/i.test(src);
}

// Extrait la zone de contenu principale du HTML (pour réduire le bruit sur les photos)
function extractContentZone(html: string): string {
    // On cherche <main>, <article>, ou un div avec classe contenant "content"/"annonce"/"listing"/"property"
    const tagMatches = [
        /<main[^>]*>([\s\S]*?)<\/main>/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*class=["'][^"']*(?:content|annonce|listing|property|bien)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const regex of tagMatches) {
        const match = html.match(regex);
        if (match && match[1].length > 500) return match[1];
    }
    // Fallback : toute la page
    return html;
}

// Décode les entités HTML fréquentes
function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}