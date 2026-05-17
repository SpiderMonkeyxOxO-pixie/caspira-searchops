-- ============================================================
-- AUDIT: Check exact RLS state and user auth status
-- Run this and share the output
-- ============================================================

-- 1. All policies currently on jarvis_organizations
select
  policyname,
  cmd,
  roles,
  qual       as "using_expr",
  with_check as "with_check_expr"
from pg_policies
where tablename = 'jarvis_organizations'
order by cmd;

-- 2. All policies currently on jarvis_org_members
select
  policyname,
  cmd,
  roles,
  qual       as "using_expr",
  with_check as "with_check_expr"
from pg_policies
where tablename = 'jarvis_org_members'
order by cmd;

-- 3. Check the user's auth status
select
  id,
  email,
  email_confirmed_at,
  role,
  created_at
from auth.users
where email = 'rejekihubmarketing@gmail.com';

-- 4. Check if jarvis_my_role function exists
select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name   = 'jarvis_my_role';
