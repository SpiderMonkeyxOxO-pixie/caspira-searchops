-- ============================================================
-- Site crawl jobs and per-page results
-- ============================================================
create table if not exists public.jarvis_crawl_jobs (
  id          uuid        default gen_random_uuid() primary key,
  org_id      uuid        not null references public.jarvis_organizations(id) on delete cascade,
  site_url    text        not null,
  status      text        not null default 'running',  -- running | completed | failed
  total_pages int         not null default 0,
  issues      int         not null default 0,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  error       text
);

create table if not exists public.jarvis_crawl_pages (
  id          uuid        default gen_random_uuid() primary key,
  job_id      uuid        not null references public.jarvis_crawl_jobs(id) on delete cascade,
  org_id      uuid        not null references public.jarvis_organizations(id) on delete cascade,
  url         text        not null,
  status_code int,
  title       text,
  title_len   int         default 0,
  meta_desc   text,
  meta_len    int         default 0,
  h1          text,
  h1_count    int         default 0,
  canonical   text,
  is_noindex  boolean     default false,
  word_count  int         default 0,
  img_total   int         default 0,
  img_no_alt  int         default 0,
  issues      jsonb       not null default '[]',
  crawled_at  timestamptz not null default now()
);

create index if not exists jarvis_crawl_pages_job_id on public.jarvis_crawl_pages(job_id);
create index if not exists jarvis_crawl_jobs_org_id  on public.jarvis_crawl_jobs(org_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.jarvis_crawl_jobs  enable row level security;
alter table public.jarvis_crawl_pages enable row level security;

create policy "crawl_jobs: select"  on public.jarvis_crawl_jobs for select using (jarvis_my_role(org_id) is not null);
create policy "crawl_jobs: insert"  on public.jarvis_crawl_jobs for insert with check (jarvis_my_role(org_id) in ('owner','admin'));
create policy "crawl_jobs: update"  on public.jarvis_crawl_jobs for update using (jarvis_my_role(org_id) in ('owner','admin'));
create policy "crawl_jobs: delete"  on public.jarvis_crawl_jobs for delete using (jarvis_my_role(org_id) in ('owner','admin'));

create policy "crawl_pages: select" on public.jarvis_crawl_pages for select using (jarvis_my_role(org_id) is not null);
create policy "crawl_pages: insert" on public.jarvis_crawl_pages for insert with check (jarvis_my_role(org_id) in ('owner','admin'));
create policy "crawl_pages: delete" on public.jarvis_crawl_pages for delete using (jarvis_my_role(org_id) in ('owner','admin'));
