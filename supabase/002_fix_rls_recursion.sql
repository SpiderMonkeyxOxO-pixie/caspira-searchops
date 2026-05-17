-- ============================================================
-- FIX: Infinite recursion in jarvis_org_members RLS policies
-- Root cause: select policy queries jarvis_org_members to check
-- membership, which re-triggers the same policy → infinite loop.
-- Solution: security definer function bypasses RLS entirely.
-- ============================================================

-- Drop all recursive policies
drop policy if exists "Members: select"                              on public.jarvis_org_members;
drop policy if exists "Members: insert (owner/admin or self via invite)" on public.jarvis_org_members;
drop policy if exists "Members: update role (owner/admin)"          on public.jarvis_org_members;
drop policy if exists "Members: delete (owner/admin or self)"       on public.jarvis_org_members;
drop policy if exists "Org: member select"                          on public.jarvis_organizations;
drop policy if exists "Invites: member select"                      on public.jarvis_org_invites;
drop policy if exists "Invites: owner/admin insert"                 on public.jarvis_org_invites;
drop policy if exists "Invites: owner/admin update"                 on public.jarvis_org_invites;

-- ── Security-definer helper (runs as postgres, bypasses RLS) ──
-- Returns the current user's role in a given org, or NULL if not a member.
create or replace function public.jarvis_my_role(p_org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from   public.jarvis_org_members
  where  org_id  = p_org_id
    and  user_id = auth.uid()
  limit  1;
$$;

-- ── jarvis_org_members ────────────────────────────────────────
-- Users can see their own row OR any row in an org they belong to
create policy "Members: select" on public.jarvis_org_members
  for select using (
    user_id = auth.uid()
    or jarvis_my_role(org_id) is not null
  );

-- Insert: self-join (accepting invite) OR owner/admin adding someone
create policy "Members: insert" on public.jarvis_org_members
  for insert with check (
    auth.uid() = user_id
    or jarvis_my_role(org_id) in ('owner', 'admin')
  );

-- Update: only owner/admin can change roles
create policy "Members: update" on public.jarvis_org_members
  for update using (
    jarvis_my_role(org_id) in ('owner', 'admin')
  );

-- Delete: owner/admin can remove anyone; members can remove themselves
create policy "Members: delete" on public.jarvis_org_members
  for delete using (
    auth.uid() = user_id
    or jarvis_my_role(org_id) in ('owner', 'admin')
  );

-- ── jarvis_organizations ──────────────────────────────────────
create policy "Org: member select" on public.jarvis_organizations
  for select using (
    jarvis_my_role(id) is not null
  );

-- ── jarvis_org_invites ────────────────────────────────────────
-- Pending token lookup (unauthenticated, for accepting invite link)
-- OR any org member can view invites for their org
create policy "Invites: select" on public.jarvis_org_invites
  for select using (
    (status = 'pending' and expires_at > now())
    or jarvis_my_role(org_id) is not null
  );

create policy "Invites: insert" on public.jarvis_org_invites
  for insert with check (
    jarvis_my_role(org_id) in ('owner', 'admin')
  );

create policy "Invites: update" on public.jarvis_org_invites
  for update using (
    jarvis_my_role(org_id) in ('owner', 'admin')
  );
