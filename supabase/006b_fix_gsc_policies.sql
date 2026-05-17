-- Drop existing GSC policies if they exist, then recreate
drop policy if exists "GSC: select" on public.jarvis_gsc_connections;
drop policy if exists "GSC: insert" on public.jarvis_gsc_connections;
drop policy if exists "GSC: update" on public.jarvis_gsc_connections;
drop policy if exists "GSC: delete" on public.jarvis_gsc_connections;

alter table public.jarvis_gsc_connections enable row level security;

create policy "GSC: select" on public.jarvis_gsc_connections
  for select using (jarvis_my_role(org_id) is not null);

create policy "GSC: insert" on public.jarvis_gsc_connections
  for insert with check (jarvis_my_role(org_id) in ('owner','admin'));

create policy "GSC: update" on public.jarvis_gsc_connections
  for update using (jarvis_my_role(org_id) in ('owner','admin'));

create policy "GSC: delete" on public.jarvis_gsc_connections
  for delete using (jarvis_my_role(org_id) in ('owner','admin'));
