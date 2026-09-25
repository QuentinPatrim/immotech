-- =====================================================================
-- ANNONCES EN VENTE CAPTURÉES SUR LES PORTAILS (outil « Marché »)
--
-- Chaque ligne = une annonce capturée (extension Patrim) pour un dossier
-- d'estimation. data contient la fiche normalisée (prix, surface, photo,
-- date de parution, historique de prix, analyse…).
-- Table séparée de estimations.data_json : l'éditeur ouvert dans un autre
-- onglet ne peut pas écraser les captures.
-- Accès réservé au propriétaire (RLS), comme les estimations.
-- =====================================================================

create table if not exists public.market_listings (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
    estimation_id uuid not null references public.estimations(id) on delete cascade,
    url           text not null,
    portal        text,
    data          jsonb not null default '{}'::jsonb,
    selected      boolean not null default false,
    first_seen_at timestamptz not null default now(),
    last_seen_at  timestamptz not null default now(),
    created_at    timestamptz not null default now(),
    unique (estimation_id, url)
);

create index if not exists market_listings_estimation_idx on public.market_listings (estimation_id);
create index if not exists market_listings_user_url_idx on public.market_listings (user_id, url);

alter table public.market_listings enable row level security;

drop policy if exists "market_listings_select_own" on public.market_listings;
drop policy if exists "market_listings_insert_own" on public.market_listings;
drop policy if exists "market_listings_update_own" on public.market_listings;
drop policy if exists "market_listings_delete_own" on public.market_listings;

create policy "market_listings_select_own" on public.market_listings
  for select to authenticated using ((select auth.uid()) = user_id);
-- Insertion / modification : uniquement vers un dossier dont on est propriétaire
create policy "market_listings_insert_own" on public.market_listings
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.estimations e where e.id = estimation_id and e.user_id = (select auth.uid()))
  );
create policy "market_listings_update_own" on public.market_listings
  for update to authenticated using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.estimations e where e.id = estimation_id and e.user_id = (select auth.uid()))
  );
create policy "market_listings_delete_own" on public.market_listings
  for delete to authenticated using ((select auth.uid()) = user_id);
