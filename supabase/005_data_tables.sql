-- ============================================================
-- JARVIS — Org Data Tables
-- Sites, Tasks, Schedules — all scoped to an organization
-- ============================================================

-- ── Sites ────────────────────────────────────────────────────
create table if not exists public.jarvis_sites (
  id         uuid default gen_random_uuid() primary key,
  org_id     uuid not null references public.jarvis_organizations(id) on delete cascade,
  name       text not null,
  domain     text not null,
  score      int  not null default 0,
  traffic    text not null default '0',
  keys       int  not null default 0,
  issues     int  not null default 0,
  status     text not null default 'good' check (status in ('good','warning','danger')),
  country    text,
  client     text,
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Tasks ────────────────────────────────────────────────────
create table if not exists public.jarvis_tasks (
  id         uuid default gen_random_uuid() primary key,
  org_id     uuid not null references public.jarvis_organizations(id) on delete cascade,
  title      text not null,
  assignee   text not null default '',
  priority   text not null default 'medium' check (priority in ('critical','high','medium','low')),
  done       boolean not null default false,
  section    text not null default '',
  created_at timestamptz default now()
);

-- ── Schedules ────────────────────────────────────────────────
create table if not exists public.jarvis_schedules (
  id         uuid default gen_random_uuid() primary key,
  org_id     uuid not null references public.jarvis_organizations(id) on delete cascade,
  name       text not null,
  freq       text not null,
  day        text not null,
  time_of_day text not null,
  emails     text not null,
  active     boolean not null default true,
  next_run   text not null,
  created_at timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.jarvis_sites     enable row level security;
alter table public.jarvis_tasks     enable row level security;
alter table public.jarvis_schedules enable row level security;

-- Sites: any org member can view; seo_specialist+ can mutate
create policy "Sites: select" on public.jarvis_sites
  for select using (jarvis_my_role(org_id) is not null);

create policy "Sites: insert" on public.jarvis_sites
  for insert with check (
    jarvis_my_role(org_id) in ('owner','admin','seo_specialist','technical')
  );

create policy "Sites: update" on public.jarvis_sites
  for update using (
    jarvis_my_role(org_id) in ('owner','admin','seo_specialist','technical')
  );

create policy "Sites: delete" on public.jarvis_sites
  for delete using (
    jarvis_my_role(org_id) in ('owner','admin')
  );

-- Tasks: all members view; content_writer+ can mutate
create policy "Tasks: select" on public.jarvis_tasks
  for select using (jarvis_my_role(org_id) is not null);

create policy "Tasks: insert" on public.jarvis_tasks
  for insert with check (jarvis_my_role(org_id) is not null);

create policy "Tasks: update" on public.jarvis_tasks
  for update using (jarvis_my_role(org_id) is not null);

create policy "Tasks: delete" on public.jarvis_tasks
  for delete using (
    jarvis_my_role(org_id) in ('owner','admin','seo_specialist')
  );

-- Schedules: all members view; admin+ manage
create policy "Schedules: select" on public.jarvis_schedules
  for select using (jarvis_my_role(org_id) is not null);

create policy "Schedules: insert" on public.jarvis_schedules
  for insert with check (
    jarvis_my_role(org_id) in ('owner','admin','seo_specialist')
  );

create policy "Schedules: update" on public.jarvis_schedules
  for update using (
    jarvis_my_role(org_id) in ('owner','admin','seo_specialist')
  );

create policy "Schedules: delete" on public.jarvis_schedules
  for delete using (
    jarvis_my_role(org_id) in ('owner','admin')
  );

-- ── Seed RPC: populate starter data for a new org ────────────
create or replace function public.jarvis_seed_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only seed if org has no sites yet
  if exists (select 1 from public.jarvis_sites where org_id = p_org_id) then
    return;
  end if;

  insert into public.jarvis_sites (org_id, name, domain, score, traffic, keys, issues, status) values
    (p_org_id, 'India Casino Portal',       'casinoindian.in', 68, '142K', 487, 9,  'good'),
    (p_org_id, 'Indonesia Slot Hub',         'slotindo.com',    44, '28K',  98,  38, 'danger'),
    (p_org_id, 'South Asia Gaming Network', 'sagaming.co',     57, '76K',  234, 22, 'warning');

  insert into public.jarvis_tasks (org_id, title, assignee, priority, done, section) values
    (p_org_id, 'Fix LCP 5.8s on UPI payment landing pages — blocks conversions on mobile (India)', 'Arjun Sharma', 'critical', false, 'Technical'),
    (p_org_id, 'Publish pillar: "Best Online Casino India 2026 — Verified & Safe Reviews"',        'Priya Nair',   'high',     false, 'Content'),
    (p_org_id, 'Disavow 340 Indonesian slot PBN backlinks flagged in link audit',                  'Budi Santoso', 'high',     true,  'Authority'),
    (p_org_id, 'Add responsible gambling disclaimer in Hindi & Bahasa Indonesia on all review pages', 'You',       'medium',   false, 'Technical'),
    (p_org_id, 'Build 5 niche edits from Indian gaming authority and news publications',            'Jordan',      'low',      false, 'Authority');

  insert into public.jarvis_schedules (org_id, name, freq, day, time_of_day, emails, active, next_run) values
    (p_org_id, 'Monthly India iGaming SEO Performance Report', 'Monthly', '1st', '9:00 AM', 'client@casinoindian.in', true, 'Jun 1, 2026'),
    (p_org_id, 'Weekly Indonesia Slot Rankings Digest',        'Weekly',  'Mon', '8:00 AM', 'team@sagaming.co',       true, 'May 18, 2026');
end;
$$;
