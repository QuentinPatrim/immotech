import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   API ROUTE : /api/shortlinks (v2)
   Crée un lien court pour une URL longue.

   POST body: {
     targetUrl: string,
     kind: "simulation" | "galerie" | "hub",
     estimationId?: string,   // si le short_link est pour une estimation
     qrCodeId?: string,       // OU si le short_link est pour un QR code
   }

   Logique :
   - Si un short_link existe déjà pour ce couple (entity, kind), on le réutilise
   - Sinon, on génère un slug unique et on l'enregistre
   ============================================================ */

const SLUG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SLUG_LENGTH = 4;

function generateSlug(): string {
    let slug = '';
    for (let i = 0; i < SLUG_LENGTH; i++) {
        slug += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
    }
    return slug;
}

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error('Variables Supabase manquantes côté serveur');
    }
    return createClient(url, key);
}

export async function POST(request: Request) {
    try {
        const { targetUrl, estimationId, qrCodeId, kind } = await request.json();

        // Validation
        if (!targetUrl || typeof targetUrl !== 'string') {
            return NextResponse.json({ error: 'targetUrl manquant' }, { status: 400 });
        }
        if (!kind || !['simulation', 'galerie', 'hub'].includes(kind)) {
            return NextResponse.json({ error: 'kind invalide (simulation|galerie|hub)' }, { status: 400 });
        }
        // Il faut au moins un des deux IDs (estimation ou QR)
        if (!estimationId && !qrCodeId) {
            return NextResponse.json({ error: 'estimationId ou qrCodeId requis' }, { status: 400 });
        }

        const supabase = getSupabase();

        // --- Recherche d'un short_link existant pour éviter les doublons ---
        let existingQuery = supabase.from('short_links').select('slug').eq('kind', kind);
        if (estimationId) {
            existingQuery = existingQuery.eq('estimation_id', estimationId);
        } else if (qrCodeId) {
            existingQuery = existingQuery.eq('qr_code_id', qrCodeId);
        }

        const { data: existing } = await existingQuery.limit(1).maybeSingle();

        if (existing) {
            return NextResponse.json({ slug: existing.slug, reused: true });
        }

        // --- Création d'un nouveau short_link avec retry en cas de collision ---
        let slug: string | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = generateSlug();
            const insertPayload: any = {
                slug: candidate,
                target_url: targetUrl,
                kind,
            };
            if (estimationId) insertPayload.estimation_id = estimationId;
            if (qrCodeId) insertPayload.qr_code_id = qrCodeId;

            const { error } = await supabase.from('short_links').insert(insertPayload);

            if (!error) {
                slug = candidate;
                break;
            }
            // 23505 = violation de contrainte unique (slug déjà pris)
            if (error.code !== '23505') {
                console.error('[shortlinks] Erreur Supabase:', error);
                return NextResponse.json({ error: 'Erreur lors de la création du lien' }, { status: 500 });
            }
        }

        if (!slug) {
            return NextResponse.json({ error: 'Impossible de générer un slug unique' }, { status: 500 });
        }

        return NextResponse.json({ slug, reused: false });

    } catch (error) {
        console.error('[shortlinks] Erreur:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}