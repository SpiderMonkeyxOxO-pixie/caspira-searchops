-- ============================================================
-- GA4 OAuth connections (one per org)
-- ============================================================
create table if not exists public.jarvis_ga4_connections (
  id                   uuid default gen_random_uuid() primary key,
  org_id               uuid not null references public.jarvis_organizations(id) on delete cascade,
  access_token         text not null,
  refresh_token        text not null,
  token_expiry         timestamptz not null,
  property_id          text,                          -- selected GA4 property e.g. 'properties/123456789'
  property_name        text,                          -- display name of selected property
  available_properties jsonb default '[]'::jsonb,     -- [{id, displayName, accountName}]
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique(org_id)
);

alter table public.jarvis_ga4_connections enable row level security;

create policy "GA4: select" on public.jarvis_ga4_connections
  for select using (jarvis_my_role(org_id) is not null);

create policy "GA4: insert" on public.jarvis_ga4_connections
  for insert with check (jarvis_my_role(org_id) in ('owner','admin'));

create policy "GA4: update" on public.jarvis_ga4_connections
  for update using (jarvis_my_role(org_id) in ('owner','admin'));

create policy "GA4: delete" on public.jarvis_ga4_connections
  for delete using (jarvis_my_role(org_id) in ('owner','admin'));
