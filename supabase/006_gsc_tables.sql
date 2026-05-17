-- ============================================================
-- GSC OAuth connections (one per org)
-- ============================================================
create table if not exists public.jarvis_gsc_connections (
  id              uuid default gen_random_uuid() primary key,
  org_id          uuid not null references public.jarvis_organizations(id) on delete cascade,
  access_token    text not null,
  refresh_token   text not null,
  token_expiry    timestamptz not null,
  selected_site   text,                          -- currently active GSC property URL
  available_sites jsonb default '[]'::jsonb,     -- all properties returned by GSC
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(org_id)
);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.jarvis_gsc_connections enable row level security;

create policy "GSC: select" on public.jarvis_gsc_connections
  for select using (jarvis_my_role(org_id) is not null);

create policy "GSC: insert" on public.jarvis_gsc_connections
  for insert with check (jarvis_my_role(org_id) in ('owner','admin'));

create policy "GSC: update" on public.jarvis_gsc_connections
  for update using (jarvis_my_role(org_id) in ('owner','admin'));

create policy "GSC: delete" on public.jarvis_gsc_connections
  for delete using (jarvis_my_role(org_id) in ('owner','admin'));
