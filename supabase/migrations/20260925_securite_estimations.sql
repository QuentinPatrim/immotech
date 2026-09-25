-- =====================================================================
-- SÉCURITÉ "MES BIENS" — à exécuter dans Supabase (SQL Editor)
-- APRÈS le déploiement du code de la branche amelioration-mes-biens.
--
-- Problème : la table public.estimations n'a pas de RLS. Avec la clé
-- publique (présente dans le JavaScript du site), n'importe qui peut
-- lire, modifier ou supprimer tous les dossiers (noms et adresses des
-- vendeurs compris).
--
-- Vérifié le 25/09/2026 : aucune politique existante sur estimations,
-- aucune ligne sans user_id.
--
-- Correctif :
--   1. Deux fonctions de lecture "par lien" pour les pages publiques
--      (simulation, galerie, plaquette, brochure) : elles renvoient un
--      seul bien, identifié par son UUID, SANS nom/adresse du vendeur
--      ni suivi interne.
--   2. RLS activé : chaque agent ne voit et ne modifie que ses dossiers.
-- =====================================================================

-- 1) Lecture publique d'une estimation par son id.
-- Liste BLANCHE : uniquement les champs affichés par les pages publiques.
-- Jamais : nom/adresse du vendeur, fourchette basse, points faibles,
-- analyse de l'agent, comparables, suivi commercial.
-- (Si une page publique a besoin d'un nouveau champ, l'ajouter ici.)
create or replace function public.get_shared_estimation(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'propertyAddress', d->'propertyAddress',
    'propertyType',    d->'propertyType',
    'surface',         d->'surface',
    'rooms',           d->'rooms',
    'floor',           d->'floor',
    'buildYear',       d->'buildYear',
    'hasElevator',     d->'hasElevator',
    'plotSurface',     d->'plotSurface',
    'gardenSurface',   d->'gardenSurface',
    'dpe',             d->'dpe',
    'ges',             d->'ges',
    'energieFinale',   d->'energieFinale',
    'features',        d->'features',
    'mainPhoto',       d->'mainPhoto',
    'secondaryPhotos', d->'secondaryPhotos',
    'extraPhotos',     d->'extraPhotos',
    'strengths',       d->'strengths',
    'amenities',       d->'amenities',
    'highPrice',       d->'highPrice',
    'monthlyRent',     d->'monthlyRent',
    'taxeFonciere',    d->'taxeFonciere',
    'isCopropriete',   d->'isCopropriete',
    'coproFees',       d->'coproFees'
  ))
  from (select e.data_json as d from public.estimations e where e.id = p_id) x
$$;

-- 1 bis) Lecture publique d'un QR code par son id (même principe).
-- Aujourd'hui qr_codes n'est lisible que par son propriétaire : un acheteur
-- qui scanne un QR ne voit donc rien sur /simulation/[id].
create or replace function public.get_shared_qr_code(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(q) - 'user_id'
  from public.qr_codes q
  where q.id = p_id
$$;

revoke all on function public.get_shared_estimation(uuid) from public;
revoke all on function public.get_shared_qr_code(uuid) from public;
grant execute on function public.get_shared_estimation(uuid) to anon, authenticated;
grant execute on function public.get_shared_qr_code(uuid) to anon, authenticated;

-- 2) RLS sur estimations : accès réservé au propriétaire du dossier
alter table public.estimations enable row level security;

drop policy if exists "estimations_select_own" on public.estimations;
drop policy if exists "estimations_insert_own" on public.estimations;
drop policy if exists "estimations_update_own" on public.estimations;
drop policy if exists "estimations_delete_own" on public.estimations;

create policy "estimations_select_own" on public.estimations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "estimations_insert_own" on public.estimations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "estimations_update_own" on public.estimations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "estimations_delete_own" on public.estimations
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- (Optionnel, hors Mes biens) La politique "Public profiles are viewable
-- by everyone." rend lisibles par tous les profils Nexus (email, net_worth,
-- assets_json, budget_json). À supprimer si aucune page publique n'en a besoin :
-- drop policy "Public profiles are viewable by everyone." on public.profiles;
-- ---------------------------------------------------------------------
