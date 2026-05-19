-- Step 1: add audit_status column (safe to re-run)
alter table public.jarvis_crawl_jobs
  add column if not exists audit_status text not null default 'new'
    check (audit_status in ('new', 'pending', 'completed'));

-- Step 2: drop old policy if it exists, then recreate cleanly
drop policy if exists "Crawl jobs: member update audit_status" on public.jarvis_crawl_jobs;

create policy "Crawl jobs: member update audit_status"
  on public.jarvis_crawl_jobs
  for update using (
    exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_crawl_jobs.org_id
        and user_id = auth.uid()
    )
  );
