create table if not exists public.jarvis_rank_keywords (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.jarvis_organizations(id) on delete cascade,
  kw         text        not null,
  positions  jsonb       not null default '[]'::jsonb,
  created_at timestamptz default now(),
  constraint jarvis_rank_keywords_org_kw_unique unique(org_id, kw)
);

alter table public.jarvis_rank_keywords enable row level security;

drop policy if exists "Org members can manage rank keywords" on public.jarvis_rank_keywords;

create policy "Org members can manage rank keywords"
  on public.jarvis_rank_keywords
  for all
  using (
    exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_rank_keywords.org_id
        and user_id = auth.uid()
    )
  );
