-- =====================================================================
-- AVIS PARTAGÉ : AJOUT DE LA VISITE 3D (data_json.plan3d)
-- Le plan 3D (pièces, ouvertures, meubles, style) est lisible par le
-- client ; l'image du plan d'origine (source) n'est pas exposée.
-- =====================================================================
-- AVIS DE VALEUR PARTAGÉ AVEC LE CLIENT (lien /avis/[id])
-- Lecture publique d'un dossier UNIQUEMENT si l'agent a activé le
-- partage (data_json.shareAvis = true, bouton « Partager l'avis » du
-- mode rendez-vous). Renvoie ce que le client a vu en rendez-vous :
-- valeur, marché, atouts, stratégie. Jamais : nom du client, adresse
-- du client, suivi commercial, notes internes.
-- =====================================================================
create or replace function public.get_shared_avis(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'propertyAddress',    d->'propertyAddress',
    'propertyType',       d->'propertyType',
    'surface',            d->'surface',
    'rooms',              d->'rooms',
    'floor',              d->'floor',
    'buildYear',          d->'buildYear',
    'hasElevator',        d->'hasElevator',
    'dpe',                d->'dpe',
    'mainPhoto',          d->'mainPhoto',
    'amenities',          d->'amenities',
    'strengths',          d->'strengths',
    'weaknesses',         d->'weaknesses',
    'agentAnalysis',      d->'agentAnalysis',
    'lowPrice',           d->'lowPrice',
    'highPrice',          d->'highPrice',
    'soldComparables',    d->'soldComparables',
    'forSaleComparables', d->'forSaleComparables',
    'marketStats',        d->'marketStats',
    'agentId',            d->'agentId',
    'express',            d->'express',
    'meeting',            d->'meeting',
    'plan3d',             (d->'plan3d') - 'source'
  ))
  from (select e.data_json as d from public.estimations e
        where e.id = p_id and coalesce((e.data_json->>'shareAvis')::boolean, false)) x
$$;

revoke all on function public.get_shared_avis(uuid) from public;
grant execute on function public.get_shared_avis(uuid) to anon, authenticated;
