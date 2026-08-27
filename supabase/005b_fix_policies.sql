-- ============================================================
-- FIX: Drop and recreate all data table policies + seed RPC
-- Run this if 005_data_tables.sql failed midway
-- ============================================================

-- ── Drop existing policies ────────────────────────────────────
drop policy if exists "Sites: select"  on public.jarvis_sites;
drop policy if exists "Sites: insert"  on public.jarvis_sites;
drop policy if exists "Sites: update"  on public.jarvis_sites;
drop policy if exists "Sites: delete"  on public.jarvis_sites;

drop policy if exists "Tasks: select"  on public.jarvis_tasks;
drop policy if exists "Tasks: insert"  on public.jarvis_tasks;
drop policy if exists "Tasks: update"  on public.jarvis_tasks;
drop policy if exists "Tasks: delete"  on public.jarvis_tasks;

drop policy if exists "Schedules: select" on public.jarvis_schedules;
drop policy if exists "Schedules: insert" on public.jarvis_schedules;
drop policy if exists "Schedules: update" on public.jarvis_schedules;
drop policy if exists "Schedules: delete" on public.jarvis_schedules;

-- ── Recreate RLS ─────────────────────────────────────────────
alter table public.jarvis_sites     enable row level security;
alter table public.jarvis_tasks     enable row level security;
alter table public.jarvis_schedules enable row level security;

-- Sites
create policy "Sites: select" on public.jarvis_sites
  for select using (jarvis_my_role(org_id) is not null);
create policy "Sites: insert" on public.jarvis_sites
  for insert with check (jarvis_my_role(org_id) in ('owner','admin','seo_specialist','technical'));
create policy "Sites: update" on public.jarvis_sites
  for update using (jarvis_my_role(org_id) in ('owner','admin','seo_specialist','technical'));
create policy "Sites: delete" on public.jarvis_sites
  for delete using (jarvis_my_role(org_id) in ('owner','admin'));

-- Tasks
create policy "Tasks: select" on public.jarvis_tasks
  for select using (jarvis_my_role(org_id) is not null);
create policy "Tasks: insert" on public.jarvis_tasks
  for insert with check (jarvis_my_role(org_id) is not null);
create policy "Tasks: update" on public.jarvis_tasks
  for update using (jarvis_my_role(org_id) is not null);
create policy "Tasks: delete" on public.jarvis_tasks
  for delete using (jarvis_my_role(org_id) in ('owner','admin','seo_specialist'));

-- Schedules
create policy "Schedules: select" on public.jarvis_schedules
  for select using (jarvis_my_role(org_id) is not null);
create policy "Schedules: insert" on public.jarvis_schedules
  for insert with check (jarvis_my_role(org_id) in ('owner','admin','seo_specialist'));
create policy "Schedules: update" on public.jarvis_schedules
  for update using (jarvis_my_role(org_id) in ('owner','admin','seo_specialist'));
create policy "Schedules: delete" on public.jarvis_schedules
  for delete using (jarvis_my_role(org_id) in ('owner','admin'));

-- ── Seed RPC ──────────────────────────────────────────────────
create or replace function public.jarvis_seed_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.jarvis_sites where org_id = p_org_id) then
    return;
  end if;

  insert into public.jarvis_sites (org_id, name, domain, score, traffic, keys, issues, status) values
    (p_org_id, 'Acme SaaS Blog',       'acmesaas.com',         74, '89K', 312, 6,  'good'),
    (p_org_id, 'Urban Fitness Gear',   'urbanfitnessgear.com', 51, '34K', 121, 27, 'warning'),
    (p_org_id, 'GreenLeaf Home Decor', 'greenleafdecor.com',   38, '19K', 76,  41, 'danger');

  insert into public.jarvis_tasks (org_id, title, assignee, priority, done, section) values
    (p_org_id, 'Fix LCP 4.2s on product landing pages',                      'Alex Chen',  'critical', false, 'Technical'),
    (p_org_id, 'Publish pillar: "The Ultimate Buyer''s Guide 2026"',         'Sam Patel',  'high',     false, 'Content'),
    (p_org_id, 'Disavow 120 spam backlinks',                                 'Jordan Lee', 'high',     true,  'Authority'),
    (p_org_id, 'Add updated privacy & cookie disclosure on landing pages',   'You',        'medium',   false, 'Technical'),
    (p_org_id, 'Build 5 niche edits from industry authority publications',   'Morgan',     'low',      false, 'Authority');

  insert into public.jarvis_schedules (org_id, name, freq, day, time_of_day, emails, active, next_run) values
    (p_org_id, 'Monthly SEO Performance Report', 'Monthly', '1st', '9:00 AM', 'client@acmesaas.com',        true, 'Jun 1, 2026'),
    (p_org_id, 'Weekly Rankings Digest',          'Weekly',  'Mon', '8:00 AM', 'team@urbanfitnessgear.com', true, 'May 18, 2026');
end;
$$;
