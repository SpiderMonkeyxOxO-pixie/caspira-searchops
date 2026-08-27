-- ============================================================
-- Org role permissions — per-role nav section access, editable
-- from Team Management. Referenced by App.tsx / TeamManagement.tsx
-- but the column was never added to the schema.
-- ============================================================

alter table public.jarvis_organizations
  add column if not exists role_permissions jsonb not null default '{}'::jsonb;
