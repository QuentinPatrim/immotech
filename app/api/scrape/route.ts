import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/* ============================================================
   SCRAPER PATRIM.FR + FALLBACK GÉNÉRIQUE — version cheerio
   Beaucoup plus robuste que les regex précédentes.
   - Si l'URL est patrim.fr → parseur sur-mesure validé en tests
   - Sinon → parseur générique (JSON-LD / OpenGraph / DOM)

   Mode debug : si aucune donnée n'est trouvée, on renvoie un
   échantillon du HTML reçu pour diagnostiquer facilement.
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
    debug?: {
        htmlLength: number;
        htmlSample: string;
        imgCount: number;
        photoboxImgCount: number;
    };
};

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ success: false, error: 'URL manquante', photos: [] }, { status: 400 });

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ success: false, error: 'URL invalide', photos: [] }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: `Le site a répondu avec le code ${response.status}.`,
                photos: [],
            }, { status: 200 });
        }

        const html = await response.text();
        const isPatrim = parsedUrl.hostname.includes('patrim.fr');

        const result: ScrapedData = isPatrim
            ? parsePatrim(html, url)
            : parseGeneric(html, url);

        // Mode debug : si rien n'est trouvé, on renvoie un aperçu du HTML
        // pour que tu puisses me le partager et qu'on diagnostique ensemble.
        const nothingFound = !result.price && !result.title && result.photos.length === 0;
        if (nothingFound) {
            const $ = cheerio.load(html);
            result.debug = {
                htmlLength: html.length,
                htmlSample: html.substring(0, 1500),
                imgCount: $('img').length,
                photoboxImgCount: $('img[src*="photobox"]').length,
            };
            console.log('[scrape] Rien trouvé. HTML length:', html.length, '- img count:', $('img').length);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("[scrape] Erreur:", error);
        return NextResponse.json({
            success: false,
            error: 'Impossible de lire cette URL. Le site est peut-être inaccessible ou bloque les imports automatiques.',
            photos: [],
        }, { status: 200 });
    }
}

/* ============================================================
   PARSEUR PATRIM.FR (avec cheerio)
   ============================================================ */
function parsePatrim(html: string, url: string): ScrapedData {
    const $ = cheerio.load(html);
    const result: ScrapedData = {
        success: true,
        photos: [],
        source: 'patrim',
    };

    // --- TITRE ---
    let title = $('title').text().trim();
    title = title.replace(/\s*(proposé par Patrim|Patrim).*$/i, '').trim();
    title = title.replace(/\s*[-–]\s*T[A-Z]+\d+\s*$/i, '').trim();
    if (title) result.title = title;

    // --- RÉFÉRENCE ---
    const refMatch = url.match(/T[A-Z]+\d+/i);
    if (refMatch) result.reference = refMatch[0];

    // --- PRIX : stratégie 1 → h3 qui contient "€ - Ref." ---
    let price: number | null = null;
    const h3WithRef = $('h3').filter((_, el) => /€\s*[-–]\s*Ref/i.test($(el).text())).first();
    if (h3WithRef.length > 0) {
        const priceMatch = h3WithRef.text().match(/([\d\s.,]+)\s*€/);
        if (priceMatch) {
            const clean = parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10);
            if (clean >= 20000 && clean <= 50000000) price = clean;
        }
    }

    // --- PRIX : stratégie 2 → "prix total de XXX euros" dans le texte ---
    if (!price) {
        const bodyText = $('body').text();
        const m = bodyText.match(/prix\s+total\s+de\s+([\d\s.,]+)\s+euros/i);
        if (m) {
            const clean = parseInt(m[1].replace(/[^\d]/g, ''), 10);
            if (clean >= 20000 && clean <= 50000000) price = clean;
        }
    }

    // --- PRIX : stratégie 3 → le prix qui apparaît le plus souvent dans la page ---
    if (!price) {
        const bodyText = $('body').text();
        const counts = new Map<number, number>();
        const matches = [...bodyText.matchAll(/([\d]{1,3}(?:[\s.,][\d]{3})+)\s*€/g)];
        for (const m of matches) {
            const n = parseInt(m[1].replace(/[^\d]/g, ''), 10);
            if (n >= 20000 && n <= 50000000) {
                counts.set(n, (counts.get(n) || 0) + 1);
            }
        }
        let maxCount = 0;
        for (const [p, c] of counts) {
            if (c > maxCount) { maxCount = c; price = p; }
        }
    }

    if (price) result.price = price;

    // --- CHAMPS STRUCTURÉS ---
    // Pattern patrim.fr : "<li>Label : <strong>Valeur</strong></li>"
    // Cheerio permet de parcourir les <li> et extraire le texte avant <strong>
    const extractByLabel = (labelRegex: RegExp): string | null => {
        let result: string | null = null;
        $('li').each((_, el) => {
            const $el = $(el);
            // Texte de l'élément SANS le contenu des <strong>
            const textWithoutStrong = $el.clone().children('strong').remove().end().text();
            if (labelRegex.test(textWithoutStrong)) {
                const strong = $el.find('strong').first().text().trim();
                if (strong) {
                    result = strong;
                    return false; // break
                }
            }
        });
        return result;
    };

    // Surface
    const surfaceStr = extractByLabel(/Surface Habitable/i);
    if (surfaceStr) {
        const s = parseInt(surfaceStr.replace(/[^\d]/g, ''), 10);
        if (s > 0 && s < 10000) result.surface = s;
    }

    // Pièces
    const roomsStr = extractByLabel(/Nombre de pièce/i);
    if (roomsStr) {
        const r = parseInt(roomsStr.replace(/[^\d]/g, ''), 10);
        if (r > 0 && r < 20) result.rooms = r;
    }

    // Chambres
    const bedroomsStr = extractByLabel(/Nombre de chambre/i);
    if (bedroomsStr) {
        const b = parseInt(bedroomsStr.replace(/[^\d]/g, ''), 10);
        if (b > 0 && b < 20) result.bedrooms = b;
    }

    // Catégorie
    const categoryStr = extractByLabel(/Catégorie/i);
    if (categoryStr) {
        result.propertyType = categoryStr;
    } else {
        // Fallback depuis l'URL
        const urlType = url.match(/vente-(appartement|maison|parking|immeuble|local)/i);
        if (urlType) {
            result.propertyType = urlType[1].charAt(0).toUpperCase() + urlType[1].slice(1).toLowerCase();
        }
    }

    // --- VILLE ---
    if (result.title) {
        // Note : \b ne fonctionne pas bien avec "à" accentué, on utilise un espace littéral
        const cityMatch = result.title.match(/\s+à\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\-\s]+?)\s*$/);
        if (cityMatch) result.city = cityMatch[1].trim();
    }
    if (!result.city) {
        const urlCityMatch = url.match(/-([a-z\-]+)-T[A-Z]+\d+/i);
        if (urlCityMatch) {
            result.city = urlCityMatch[1].split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        }
    }

    // --- ADRESSE / QUARTIER ---
    // Format observé : "APPARTEMENT DE PRESTIGE - ESQUIROL / rue des Marchands : ..."
    $('p').each((_, el) => {
        if (result.address) return false;
        const text = $(el).text().trim();
        const match = text.match(/^(APPARTEMENT|MAISON)[^:]*:/i);
        if (match) {
            const preColon = text.split(':')[0].trim();
            const dashSplit = preColon.split(/\s+[-–]\s+/);
            if (dashSplit.length >= 2) {
                const quartier = dashSplit.slice(1).join(' - ').trim();
                result.address = result.city ? `${quartier} · ${result.city}` : quartier;
                return false;
            }
        }
    });
    if (!result.address && result.city) {
        result.address = result.city;
    }

    // --- PHOTOS ---
    // Toutes les <img> dont le src contient /photobox/ mais PAS /vignettes/
    const seen = new Set<string>();
    $('img').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src.includes('/photobox/') && !src.includes('/vignettes/')) {
            // Résoudre en URL absolue si besoin
            const absolute = resolveUrl(src, url);
            if (absolute && !seen.has(absolute)) {
                seen.add(absolute);
                result.photos.push(absolute);
            }
        }
    });

    // Fallback : si aucune grande photo trouvée, on prend les vignettes
    if (result.photos.length === 0) {
        $('img').each((_, el) => {
            const src = $(el).attr('src') || '';
            if (src.includes('/photobox/')) {
                const absolute = resolveUrl(src, url);
                if (absolute && !seen.has(absolute)) {
                    seen.add(absolute);
                    result.photos.push(absolute);
                }
            }
        });
    }

    return result;
}

/* ============================================================
   PARSEUR GÉNÉRIQUE (FALLBACK)
   Pour les URLs qui ne sont pas sur patrim.fr.
   ============================================================ */
function parseGeneric(html: string, url: string): ScrapedData {
    const $ = cheerio.load(html);
    const result: ScrapedData = {
        success: true,
        photos: [],
        source: 'generic',
    };

    // --- STRATÉGIE 1 : JSON-LD (données structurées schema.org) ---
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const raw = $(el).html() || '';
            const jsonData = JSON.parse(raw);
            const items = Array.isArray(jsonData) ? jsonData : [jsonData];
            for (const item of items) {
                const obj = item['@graph'] ? item['@graph'][0] : item;
                if (obj.name && !result.title) result.title = String(obj.name);
                if (obj.address && !result.address) {
                    result.address = typeof obj.address === 'string'
                        ? obj.address
                        : (obj.address.streetAddress || obj.address.addressLocality || '');
                }
                if (obj.offers?.price && !result.price) {
                    const p = parseInt(String(obj.offers.price).replace(/[^\d]/g, ''), 10);
                    if (p > 0) result.price = p;
                }
                if (obj.image) {
                    const imgs = Array.isArray(obj.image) ? obj.image : [obj.image];
                    for (const i of imgs) {
                        const src = typeof i === 'string' ? i : i?.url;
                        if (src) result.photos.push(src);
                    }
                }
            }
        } catch { /* JSON malformé, on continue */ }
    });

    // --- STRATÉGIE 2 : OpenGraph ---
    if (!result.title) {
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle) result.title = ogTitle.trim();
    }
    if (!result.price) {
        const ogPrice = $('meta[property="og:price:amount"]').attr('content')
            || $('meta[property="product:price:amount"]').attr('content');
        if (ogPrice) {
            const p = parseInt(ogPrice.replace(/[^\d]/g, ''), 10);
            if (p > 0) result.price = p;
        }
    }
    $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content');
        if (src) result.photos.push(src);
    });

    // --- STRATÉGIE 3 : DOM générique ---
    if (!result.title) {
        let t = $('title').text().trim();
        t = t.split(/[-|]/)[0].trim();
        if (t) result.title = t;
    }

    if (!result.price) {
        const bodyText = $('body').text();
        const counts = new Map<number, number>();
        const matches = [...bodyText.matchAll(/([\d]{1,3}(?:[\s.,][\d]{3})+)\s*€/g)];
        for (const m of matches) {
            const n = parseInt(m[1].replace(/[^\d]/g, ''), 10);
            if (n >= 20000 && n <= 50000000) {
                counts.set(n, (counts.get(n) || 0) + 1);
            }
        }
        let maxCount = 0;
        for (const [p, c] of counts) {
            if (c > maxCount) { maxCount = c; result.price = p; }
        }
    }

    // --- PHOTOS dans <main>, <article> ou body ---
    const scope = $('main').length ? $('main') : $('article').length ? $('article') : $('body');
    scope.find('img').each((_, el) => {
        const src = $(el).attr('src') || '';
        const absolute = resolveUrl(src, url);
        if (absolute && isLikelyPropertyPhoto(absolute)) {
            result.photos.push(absolute);
        }
    });

    result.photos = [...new Set(result.photos)];
    return result;
}

/* ============================================================
   HELPERS
   ============================================================ */
function resolveUrl(src: string, baseUrl: string): string | null {
    try {
        let clean = src.replace(/&amp;/g, '&').trim();
        if (!clean) return null;
        if (clean.startsWith('//')) return 'https:' + clean;
        if (clean.startsWith('http')) return clean;
        return new URL(clean, baseUrl).href;
    } catch {
        return null;
    }
}

function isLikelyPropertyPhoto(src: string): boolean {
    if (!src.startsWith('http')) return false;
    if (src.match(/\.(js|css|woff|ttf|svg|ico|json|gif)(\?|$)/i)) return false;
    if (src.match(/\b(logo|icon|avatar|marker|pin|favicon|banner|sprite|flag|social|facebook|twitter|instagram|linkedin|youtube)\b/i)) return false;
    return /\.(jpe?g|png|webp)(\?|$)/i.test(src) || /(_next\/image|cdn|cloudfront|imgix|cloudinary)/i.test(src);
}