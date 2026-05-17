-- Run this query ALONE first (select all, run)
select
  policyname,
  cmd,
  roles::text,
  qual       as using_expr,
  with_check as with_check_expr
from pg_policies
where tablename in ('jarvis_organizations', 'jarvis_org_members')
order by tablename, cmd;
