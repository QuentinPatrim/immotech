import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractListings, type ExtractedListing, type SubjectProperty } from '@/lib/listingExtraction';
import { geocodePoint, listingDistances } from '@/lib/listingArea';
import { portalFromUrl, rowToListing, type CapturePayload, type MarketListing, type PriceEvent } from '@/lib/marketListings';

/* ============================================================
   API : /api/annonces/capture
   Reçoit une page de portail capturée par l'extension Patrim,
   en extrait les annonces (IA), puis les range dans le dossier :
   - même annonce déjà capturée → mise à jour + historique de prix
   - même bien publié sur un autre portail → regroupé (doublon)
   - nouvelle annonce → ajoutée (historique repris si déjà vue
     dans un autre dossier de l'agent)
   ============================================================ */

export const maxDuration = 60;

const ROW_COLS = 'id,url,portal,data,selected,first_seen_at,last_seen_at';
type Row = { id: string; url: string; portal: string | null; data: Record<string, unknown>; selected: boolean; first_seen_at: string; last_seen_at: string };

const norm = (s?: string | null) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Même bien publié sur deux portails : surface, pièces, prix et ville concordants */
function sameProperty(a: Partial<MarketListing>, b: ExtractedListing) {
    const sa = Number(a.surface) || 0, sb = Number(b.surface) || 0;
    const pa = Number(a.price) || 0, pb = Number(b.price) || 0;
    if (!sa || !sb || !pa || !pb) return false;
    if (Math.abs(sa - sb) > Math.max(1.5, sa * 0.02)) return false;
    if (a.rooms && b.rooms && a.rooms !== b.rooms) return false;
    if (Math.abs(pa - pb) / pa > 0.05) return false;
    if (a.city && b.city && norm(a.city) !== norm(b.city)) return false;
    return true;
}

/** Champs renseignés par l'extraction (on ne remplace jamais une valeur connue par du vide) */
function extractedFields(ex: ExtractedListing): Partial<MarketListing> {
    const f: Partial<MarketListing> = {};
    const set = <K extends keyof MarketListing>(k: K, v: MarketListing[K] | null | undefined) => {
        if (v !== null && v !== undefined && !(typeof v === 'string' && !v.trim())) f[k] = v;
    };
    set('title', ex.title);
    set('price', ex.price ?? undefined);
    set('surface', ex.surface ?? undefined);
    set('rooms', ex.rooms ?? undefined);
    set('bedrooms', ex.bedrooms ?? undefined);
    set('propertyType', ex.propertyType ?? undefined);
    set('city', ex.city ?? undefined);
    set('district', ex.district ?? undefined);
    set('floor', ex.floor ?? undefined);
    set('dpe', ex.dpe ?? undefined);
    set('photoUrl', ex.photoUrl);
    set('highlight', ex.highlight ?? undefined);
    set('description', ex.description ?? undefined);
    set('relevance', ex.relevance);
    if (ex.sameArea !== null) f.sameArea = ex.sameArea;
    if (ex.features.length) f.features = ex.features;
    if (ex.pros.length) f.pros = ex.pros;
    if (ex.cons.length) f.cons = ex.cons;
    return f;
}

/* ---------- Tri des annonces similaires au bien estimé ---------- */

const SIMILAR = { surfacePct: 0.2, roomsGap: 1, sqmPct: 0.25, areaKm: 2 };

type SkipReason = 'type' | 'surface' | 'pièces' | 'quartier' | 'prix';

/** Prix au m² de référence : prix central envisagé, sinon médiane des annonces déjà proches (surface, quartier) */
function referenceSqm(subject: SubjectProperty, candidates: ExtractedListing[]): number | null {
    if (subject.surface && subject.lowPrice && subject.highPrice) return (subject.lowPrice + subject.highPrice) / 2 / subject.surface;
    const sqms = candidates
        .filter(ex => ex.price && ex.surface)
        .map(ex => ex.price! / ex.surface!)
        .sort((a, b) => a - b);
    if (sqms.length < 3) return null;
    return sqms[Math.floor(sqms.length / 2)];
}

function whyNotSimilar(ex: ExtractedListing, subject: SubjectProperty, refSqm: number | null, km: number | null): SkipReason | null {
    if (subject.propertyType && ex.propertyType && ex.propertyType !== 'Autre' && ex.propertyType !== subject.propertyType) return 'type';
    if (subject.surface) {
        if (!ex.surface || Math.abs(ex.surface - subject.surface) / subject.surface > SIMILAR.surfacePct) return 'surface';
    }
    if (subject.rooms && ex.rooms && Math.abs(ex.rooms - subject.rooms) > SIMILAR.roomsGap) return 'pièces';
    // Distance mesurée si le quartier a pu être localisé ; sinon avis de l'IA, seulement pour une autre commune
    if (km !== null ? km > SIMILAR.areaKm : ex.sameArea === false && !!ex.city && norm(ex.city) !== norm(subject.city)) return 'quartier';
    if (refSqm && ex.price && ex.surface && Math.abs(ex.price / ex.surface - refSqm) / refSqm > SIMILAR.sqmPct) return 'prix';
    return null;
}

const lastPrice = (history: PriceEvent[], fallback: number) =>
    [...history].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.price ?? fallback;

function withAnnouncedPrevious(history: PriceEvent[], ex: ExtractedListing, fallbackDate: string): PriceEvent[] {
    if (!ex.previousPrice || !ex.price || ex.previousPrice <= ex.price) return history;
    if (history.some(h => h.price >= ex.previousPrice!)) return history;
    return [{ date: ex.publishedAt || fallbackDate, price: ex.previousPrice, source: 'annonce' }, ...history];
}

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
    });
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    let body: { estimationId?: string; payload?: CapturePayload; onlySimilar?: boolean };
    try {
        const raw = await request.text();
        if (raw.length > 600_000) return NextResponse.json({ error: 'Page trop volumineuse.' }, { status: 413 });
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }
    const { estimationId, payload } = body;
    const onlySimilar = body.onlySimilar !== false;
    if (!estimationId || !payload || payload.v !== 1 || typeof payload.url !== 'string') {
        return NextResponse.json({ error: 'Capture incomplète.' }, { status: 400 });
    }

    // Dossier cible (RLS : uniquement les dossiers de l'agent)
    const { data: estimation } = await supabase.from('estimations').select('id,address,data_json').eq('id', estimationId).maybeSingle();
    if (!estimation) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    const d = (estimation.data_json || {}) as Record<string, unknown>;
    const subject: SubjectProperty = {
        propertyType: d.propertyType ? String(d.propertyType) : '',
        surface: Number(d.surface) || 0,
        rooms: Number(d.rooms) || 0,
        address: String(d.propertyAddress || estimation.address || ''),
        city: (String(d.propertyAddress || estimation.address || '').match(/\d{5}\s+([^,]+)/)?.[1] || '').trim(),
        features: Array.isArray(d.amenities) ? (d.amenities as string[]) : [],
        dpe: d.dpe ? String(d.dpe) : undefined,
        floor: d.floor ? String(d.floor) : undefined,
        lowPrice: Number(d.lowPrice) || undefined,
        highPrice: Number(d.highPrice) || undefined,
    };

    let extracted: ExtractedListing[];
    try {
        extracted = await extractListings(payload, subject);
    } catch (e) {
        console.error('Extraction annonces :', e);
        return NextResponse.json({ error: "L'analyse de la page a échoué. Réessayez dans un instant." }, { status: 502 });
    }

    const { data: existingData } = await supabase.from('market_listings').select(ROW_COLS).eq('estimation_id', estimationId);
    const rows: Row[] = (existingData as Row[] | null) ?? [];

    // Seulement les biens comparables (surface, pièces, quartier, prix cohérent).
    // Une annonce déjà dans le dossier reste suivie (mise à jour de son prix).
    const subjectPoint = Number(d.propertyLat) && Number(d.propertyLon)
        ? { lat: Number(d.propertyLat), lon: Number(d.propertyLon) }
        : subject.address ? await geocodePoint(subject.address) : null;
    const distances = await listingDistances(subjectPoint, subject.city, extracted);
    const km = new Map(extracted.map((ex, i) => [ex, distances[i]]));

    const skipped: { title: string; price: number | null; surface: number | null; district: string | null; distanceKm: number | null; reason: SkipReason }[] = [];
    if (onlySimilar) {
        const refSqm = referenceSqm(subject, extracted);
        extracted = extracted.filter(ex => {
            if (rows.some(r => r.url === ex.url)) return true;
            const reason = whyNotSimilar(ex, subject, refSqm, km.get(ex) ?? null);
            if (reason) skipped.push({ title: ex.title, price: ex.price, surface: ex.surface, district: ex.district || ex.city, distanceKm: km.get(ex) ?? null, reason });
            return !reason;
        });
    }

    // Même annonce déjà vue dans un autre dossier : on reprend son historique
    const urls = extracted.map(e => e.url).filter(u => !rows.some(r => r.url === u));
    const { data: elsewhereData } = urls.length
        ? await supabase.from('market_listings').select('url,data,first_seen_at').in('url', urls).neq('estimation_id', estimationId)
        : { data: [] as { url: string; data: Record<string, unknown>; first_seen_at: string }[] };
    const elsewhere = new Map((elsewhereData ?? []).map(r => [r.url, r]));

    const now = new Date().toISOString();
    let added = 0, updated = 0, merged = 0;

    for (const ex of extracted) {
        const portal = portalFromUrl(ex.url);
        const fields = extractedFields(ex);
        const dist = km.get(ex);
        if (dist !== null && dist !== undefined) fields.distanceKm = dist;

        // 1) Annonce déjà capturée pour ce dossier
        const same = rows.find(r => r.url === ex.url);
        if (same) {
            const prev = same.data as Partial<MarketListing>;
            let history = withAnnouncedPrevious(prev.priceHistory ?? [], ex, same.first_seen_at);
            if (ex.price && ex.price !== lastPrice(history, Number(prev.price) || 0)) history = [...history, { date: now, price: ex.price, source: 'capture' }];
            const data = { ...prev, ...fields, priceHistory: history, publishedAt: prev.publishedAt || ex.publishedAt || undefined };
            const { error } = await supabase.from('market_listings').update({ data, portal, last_seen_at: now }).eq('id', same.id);
            if (!error) { same.data = data; updated++; }
            continue;
        }

        // 2) Même bien publié sur un autre portail → regroupé
        const dup = rows.find(r => sameProperty(r.data as Partial<MarketListing>, ex));
        if (dup) {
            const prev = dup.data as Partial<MarketListing>;
            const others = prev.otherPortals ?? [];
            if (!others.some(o => o.url === ex.url)) others.push({ portal, url: ex.url, price: ex.price ?? undefined });
            const earliest = [prev.publishedAt, ex.publishedAt].filter(Boolean).sort()[0] || undefined;
            const data = { ...prev, otherPortals: others, publishedAt: earliest, features: prev.features?.length ? prev.features : fields.features };
            const { error } = await supabase.from('market_listings').update({ data, last_seen_at: now }).eq('id', dup.id);
            if (!error) { dup.data = data; merged++; }
            continue;
        }

        // 3) Nouvelle annonce
        const before = elsewhere.get(ex.url);
        const beforeData = (before?.data ?? {}) as Partial<MarketListing>;
        let history = withAnnouncedPrevious(beforeData.priceHistory ?? [], ex, before?.first_seen_at || now);
        if (ex.price && ex.price !== lastPrice(history, 0)) history = [...history, { date: now, price: ex.price, source: 'capture' }];
        const data = { ...fields, otherPortals: [], priceHistory: history, publishedAt: ex.publishedAt || beforeData.publishedAt || undefined };
        const { data: inserted, error } = await supabase.from('market_listings')
            .insert({ estimation_id: estimationId, user_id: user.id, url: ex.url, portal, data, first_seen_at: before?.first_seen_at || now, last_seen_at: now })
            .select(ROW_COLS).single();
        if (!error && inserted) { rows.push(inserted as Row); added++; }
        else if (error) console.error('Insertion annonce :', error.message);
    }

    const { data: all } = await supabase.from('market_listings').select(ROW_COLS).eq('estimation_id', estimationId);
    return NextResponse.json({
        success: true,
        portal: portalFromUrl(payload.url),
        found: extracted.length + skipped.length,
        added, updated, merged,
        skipped,
        listings: ((all as Row[] | null) ?? []).map(rowToListing),
    });
}
