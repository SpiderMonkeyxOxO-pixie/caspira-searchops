-- ============================================================
-- CASPIRA SEARCHOPS — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
create table if not exists public.jarvis_profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Organizations ────────────────────────────────────────────
create table if not exists public.jarvis_organizations (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'pro',
  logo_url    text,
  owner_id    uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Org Members ──────────────────────────────────────────────
create table if not exists public.jarvis_org_members (
  id          uuid default gen_random_uuid() primary key,
  org_id      uuid not null references public.jarvis_organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','admin','seo_specialist','technical','content_writer','viewer')),
  joined_at   timestamptz default now(),
  unique(org_id, user_id)
);

-- ── Org Invites ──────────────────────────────────────────────
create table if not exists public.jarvis_org_invites (
  id          uuid default gen_random_uuid() primary key,
  org_id      uuid not null references public.jarvis_organizations(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('admin','seo_specialist','technical','content_writer','viewer')),
  token       text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid references auth.users(id) on delete set null,
  status      text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────
alter table public.jarvis_profiles      enable row level security;
alter table public.jarvis_organizations enable row level security;
alter table public.jarvis_org_members   enable row level security;
alter table public.jarvis_org_invites   enable row level security;

-- Profiles
create policy "Own profile: select" on public.jarvis_profiles
  for select using (auth.uid() = id);
create policy "Own profile: insert" on public.jarvis_profiles
  for insert with check (auth.uid() = id);
create policy "Own profile: update" on public.jarvis_profiles
  for update using (auth.uid() = id);

-- Organizations — members can view; owner can update; authenticated can create
create policy "Org: member select" on public.jarvis_organizations
  for select using (
    exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_organizations.id and user_id = auth.uid()
    )
  );
create policy "Org: authenticated insert" on public.jarvis_organizations
  for insert with check (auth.uid() = owner_id);
create policy "Org: owner update" on public.jarvis_organizations
  for update using (owner_id = auth.uid());

-- Org Members — any member can view; owner/admin insert; owner/admin update; self-remove
create policy "Members: select" on public.jarvis_org_members
  for select using (
    exists (
      select 1 from public.jarvis_org_members m2
      where m2.org_id = jarvis_org_members.org_id and m2.user_id = auth.uid()
    )
  );
create policy "Members: insert (owner/admin or self via invite)" on public.jarvis_org_members
  for insert with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.jarvis_org_members m2
      where m2.org_id = jarvis_org_members.org_id
        and m2.user_id = auth.uid()
        and m2.role in ('owner','admin')
    )
  );
create policy "Members: update role (owner/admin)" on public.jarvis_org_members
  for update using (
    exists (
      select 1 from public.jarvis_org_members m2
      where m2.org_id = jarvis_org_members.org_id
        and m2.user_id = auth.uid()
        and m2.role in ('owner','admin')
    )
  );
create policy "Members: delete (owner/admin or self)" on public.jarvis_org_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.jarvis_org_members m2
      where m2.org_id = jarvis_org_members.org_id
        and m2.user_id = auth.uid()
        and m2.role in ('owner','admin')
    )
  );

-- Invites — members view; owner/admin manage; anyone can look up a pending token
create policy "Invites: member select" on public.jarvis_org_invites
  for select using (
    status = 'pending' and expires_at > now()  -- public token lookup for accepting
    or exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_org_invites.org_id and user_id = auth.uid()
    )
  );
create policy "Invites: owner/admin insert" on public.jarvis_org_invites
  for insert with check (
    exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_org_invites.org_id
        and user_id = auth.uid()
        and role in ('owner','admin')
    )
  );
create policy "Invites: owner/admin update" on public.jarvis_org_invites
  for update using (
    exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_org_invites.org_id
        and user_id = auth.uid()
        and role in ('owner','admin')
    )
  );

-- ── Auto-create profile on signup ────────────────────────────
create or replace function public.jarvis_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.jarvis_profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists jarvis_on_auth_user_created on auth.users;
create trigger jarvis_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.jarvis_handle_new_user();
