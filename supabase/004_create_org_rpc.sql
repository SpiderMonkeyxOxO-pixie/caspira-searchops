-- ============================================================
-- RPC: jarvis_create_org
-- Runs as postgres (security definer) — bypasses RLS entirely.
-- Uses auth.uid() to identify the caller, so it's still secure.
-- Atomically creates the org AND adds the caller as owner in one call.
-- ============================================================

create or replace function public.jarvis_create_org(p_name text, p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_uid    uuid := auth.uid();
begin
  -- Must be authenticated
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Insert organization
  insert into public.jarvis_organizations (name, slug, owner_id)
  values (p_name, p_slug, v_uid)
  returning id into v_org_id;

  -- Add caller as owner
  insert into public.jarvis_org_members (org_id, user_id, role)
  values (v_org_id, v_uid, 'owner');

  return json_build_object('id', v_org_id, 'name', p_name, 'slug', p_slug);
end;
$$;
