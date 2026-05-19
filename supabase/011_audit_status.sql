-- Add audit workflow status to crawl jobs.
-- Tracks whether a crawl result has been reviewed and sent to dev team for fixing.
alter table public.jarvis_crawl_jobs
  add column if not exists audit_status text not null default 'new'
    check (audit_status in ('new', 'pending', 'completed'));

-- Allow any org member to update audit_status on their org's crawl jobs
create policy if not exists "Crawl jobs: member update audit_status" on public.jarvis_crawl_jobs
  for update using (
    exists (
      select 1 from public.jarvis_org_members
      where org_id = jarvis_crawl_jobs.org_id
        and user_id = auth.uid()
    )
  );
