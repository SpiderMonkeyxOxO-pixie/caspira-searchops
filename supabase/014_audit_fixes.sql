-- ============================================================
-- Audit fixes — security, authorization, and performance
-- ============================================================

-- ── 1. jarvis_seed_org: was callable for ANY org_id with no
--    membership check — any authenticated (or anon) caller could
--    inject demo data into an org they don't belong to. ─────────
create or replace function public.jarvis_seed_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jarvis_my_role(p_org_id) is null then
    raise exception 'Not a member of this organization';
  end if;

  if exists (select 1 from public.jarvis_sites where org_id = p_org_id) then
    return;
  end if;

  insert into public.jarvis_sites (org_id, name, domain, score, traffic, keys, issues, status) values
    (p_org_id, 'Acme SaaS Blog',       'acmesaas.com',         74, '89K', 312, 6,  'good'),
    (p_org_id, 'Urban Fitness Gear',   'urbanfitnessgear.com', 51, '34K', 121, 27, 'warning'),
    (p_org_id, 'GreenLeaf Home Decor', 'greenleafdecor.com',   38, '19K', 76,  41, 'danger');

  insert into public.jarvis_tasks (org_id, title, assignee, priority, done, section) values
    (p_org_id, 'Fix LCP 4.2s on product landing pages — blocks conversions on mobile',  'Alex Chen',  'critical', false, 'Technical'),
    (p_org_id, 'Publish pillar: "The Ultimate Buyer''s Guide 2026"',                    'Sam Patel',  'high',     false, 'Content'),
    (p_org_id, 'Disavow 120 spam backlinks flagged in link audit',                      'Jordan Lee', 'high',     true,  'Authority'),
    (p_org_id, 'Add updated privacy & cookie disclosure on all landing pages',          'You',        'medium',   false, 'Technical'),
    (p_org_id, 'Build 5 niche edits from industry authority and news publications',     'Morgan',     'low',      false, 'Authority');

  insert into public.jarvis_schedules (org_id, name, freq, day, time_of_day, emails, active, next_run) values
    (p_org_id, 'Monthly SEO Performance Report', 'Monthly', '1st', '9:00 AM', 'client@acmesaas.com',         true, 'Jun 1, 2026'),
    (p_org_id, 'Weekly Rankings Digest',          'Weekly',  'Mon', '8:00 AM', 'team@urbanfitnessgear.com',  true, 'May 18, 2026');
end;
$$;

-- ── 2. Revoke EXECUTE from anon on all SECURITY DEFINER RPCs —
--    none of these should ever run for a logged-out caller.
--    (Each already checks auth.uid() internally, so this wasn't
--    exploitable today — this is defense in depth.) ─────────────
revoke execute on function public.jarvis_create_org(text, text)      from anon;
revoke execute on function public.jarvis_get_my_org()                from anon;
revoke execute on function public.jarvis_get_org_members(uuid)       from anon;
revoke execute on function public.jarvis_handle_new_user()           from anon;
revoke execute on function public.jarvis_my_role(uuid)               from anon;
revoke execute on function public.jarvis_seed_org(uuid)              from anon;

-- ── 3. RLS perf: replace bare auth.uid() with (select auth.uid())
--    so Postgres evaluates it once per query, not once per row. ──

-- jarvis_profiles
drop policy if exists "Own profile: select" on public.jarvis_profiles;
create policy "Own profile: select" on public.jarvis_profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "Own profile: insert" on public.jarvis_profiles;
create policy "Own profile: insert" on public.jarvis_profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists "Own profile: update" on public.jarvis_profiles;
create policy "Own profile: update" on public.jarvis_profiles
  for update using ((select auth.uid()) = id);

-- jarvis_organizations
drop policy if exists "Org: authenticated insert" on public.jarvis_organizations;
create policy "Org: authenticated insert" on public.jarvis_organizations
  for insert with check ((select auth.uid()) = owner_id);

drop policy if exists "Org: owner update" on public.jarvis_organizations;
create policy "Org: owner update" on public.jarvis_organizations
  for update using (owner_id = (select auth.uid()));

-- jarvis_org_members
drop policy if exists "Members: select" on public.jarvis_org_members;
create policy "Members: select" on public.jarvis_org_members
  for select using (
    user_id = (select auth.uid())
    or jarvis_my_role(org_id) is not null
  );

drop policy if exists "Members: insert" on public.jarvis_org_members;
create policy "Members: insert" on public.jarvis_org_members
  for insert with check (
    (select auth.uid()) = user_id
    or jarvis_my_role(org_id) in ('owner','admin')
  );

drop policy if exists "Members: delete" on public.jarvis_org_members;
create policy "Members: delete" on public.jarvis_org_members
  for delete using (
    (select auth.uid()) = user_id
    or jarvis_my_role(org_id) in ('owner','admin')
  );

-- jarvis_rank_keywords
drop policy if exists "Org members can manage rank keywords" on public.jarvis_rank_keywords;
create policy "Org members can manage rank keywords" on public.jarvis_rank_keywords
  for all using (
    exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_rank_keywords.org_id and user_id = (select auth.uid())
    )
  );

-- jarvis_activity_logs
drop policy if exists "read_org_logs" on public.jarvis_activity_logs;
create policy "read_org_logs" on public.jarvis_activity_logs
  for select using (
    expires_at > now()
    and exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_activity_logs.org_id and user_id = (select auth.uid())
    )
  );

drop policy if exists "insert_own_log" on public.jarvis_activity_logs;
create policy "insert_own_log" on public.jarvis_activity_logs
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_activity_logs.org_id and user_id = (select auth.uid())
    )
  );

-- ── 4. jarvis_crawl_jobs: two permissive UPDATE policies were
--    stacked (Postgres ORs them), so the narrower "owner/admin
--    only" policy had no actual effect — any org member could
--    already update via the other one. Consolidate to reflect
--    the effective behavior in a single policy. ─────────────────
drop policy if exists "Crawl jobs: member update audit_status" on public.jarvis_crawl_jobs;
drop policy if exists "crawl_jobs: update" on public.jarvis_crawl_jobs;
create policy "crawl_jobs: update" on public.jarvis_crawl_jobs
  for update using (jarvis_my_role(org_id) is not null);

-- ── 5. Covering indexes for unindexed foreign keys ──────────────
create index if not exists ix_jarvis_activity_logs_user_id  on public.jarvis_activity_logs(user_id);
create index if not exists ix_jarvis_crawl_pages_org_id     on public.jarvis_crawl_pages(org_id);
create index if not exists ix_jarvis_org_invites_invited_by on public.jarvis_org_invites(invited_by);
create index if not exists ix_jarvis_org_invites_org_id     on public.jarvis_org_invites(org_id);
create index if not exists ix_jarvis_org_members_user_id    on public.jarvis_org_members(user_id);
create index if not exists ix_jarvis_organizations_owner_id on public.jarvis_organizations(owner_id);
create index if not exists ix_jarvis_schedules_org_id       on public.jarvis_schedules(org_id);
create index if not exists ix_jarvis_sites_org_id           on public.jarvis_sites(org_id);
create index if not exists ix_jarvis_tasks_org_id           on public.jarvis_tasks(org_id);
