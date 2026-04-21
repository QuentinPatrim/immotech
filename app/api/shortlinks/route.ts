import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   API ROUTE : /api/shortlinks
   Crée un lien court pour une URL longue.
   POST body: { targetUrl, estimationId?, kind }
     - kind: "simulation" | "galerie" | "hub"
   Renvoie { slug, shortUrl }.
   Si un lien existe déjà pour ce couple (estimationId, kind),
   on le réutilise au lieu d'en créer un nouveau.
   ============================================================ */

// Alphabet volontairement sans caractères ambigus (pas de 0/O/I/1/l)
// pour que les slugs soient tapables facilement par un humain
const SLUG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SLUG_LENGTH = 4;
// 32^4 = ~1 million de combinaisons : largement suffisant pour tes biens,
// et si jamais ça sature un jour, on passera à 5 caractères (33M combinaisons).

function generateSlug(): string {
    let slug = '';
    for (let i = 0; i < SLUG_LENGTH; i++) {
        slug += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
    }
    return slug;
}

// On initialise Supabase côté serveur avec les variables d'env publiques
// (suffisantes car les policies RLS permettent l'insertion publique)
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
        const { targetUrl, estimationId, kind } = await request.json();

        // Validation
        if (!targetUrl || typeof targetUrl !== 'string') {
            return NextResponse.json({ error: 'targetUrl manquant' }, { status: 400 });
        }
        if (!kind || !['simulation', 'galerie', 'hub'].includes(kind)) {
            return NextResponse.json({ error: 'kind invalide (simulation|galerie|hub)' }, { status: 400 });
        }

        const supabase = getSupabase();

        // Si on a un estimationId + kind, on vérifie d'abord qu'il n'existe pas déjà un lien.
        // Comme ça, on n'accumule pas 50 liens pour le même bien à force de cliquer sur "Générer"
        if (estimationId) {
            const { data: existing } = await supabase
                .from('short_links')
                .select('slug')
                .eq('estimation_id', estimationId)
                .eq('kind', kind)
                .limit(1)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({
                    slug: existing.slug,
                    reused: true,
                });
            }
        }

        // Sinon, on génère un nouveau slug unique
        // On retry jusqu'à 5 fois en cas de collision improbable (32^4 = 1M combinaisons)
        let slug: string | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = generateSlug();
            const { error } = await supabase
                .from('short_links')
                .insert({
                    slug: candidate,
                    target_url: targetUrl,
                    estimation_id: estimationId || null,
                    kind,
                });

            if (!error) {
                slug = candidate;
                break;
            }
            // Si erreur de contrainte unique (code 23505), on retry avec un autre slug
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