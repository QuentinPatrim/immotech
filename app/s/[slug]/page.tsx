import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   PAGE : /s/[slug]
   Rôle : prendre un slug court (ex: "X7K2") et rediriger
   l'utilisateur vers l'URL longue correspondante.
   Incrémente également le compteur de clics (tracking).
   Server Component : redirection côté serveur, instantanée.
   ============================================================ */

// Désactive le cache pour que les redirections soient toujours à jour
// (si tu changes la cible d'un lien court, ça prend effet immédiatement)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Variables Supabase manquantes');
    return createClient(url, key);
}

export default async function ShortLinkRedirect({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabase = getSupabase();

    // 1. On récupère la cible depuis le slug
    const { data, error } = await supabase
        .from('short_links')
        .select('target_url')
        .eq('slug', slug.toUpperCase()) // on normalise en majuscules pour éviter la casse-sensibilité
        .maybeSingle();

    // 2. Si aucun match, on renvoie vers la page d'accueil
    if (error || !data?.target_url) {
        redirect('/');
    }

    // 3. Incrément des clics (fire-and-forget, on n'attend pas le résultat)
    //    Utilise la fonction SQL increment_short_link_clicks pour un update atomique
    try {
    await supabase.rpc('increment_short_link_clicks', { slug_param: slug.toUpperCase() });
} catch (e) {
    console.error('[shortlinks] clicks++ failed:', e);
}

    // 4. Redirection HTTP 307 vers la cible
    redirect(data.target_url);
}