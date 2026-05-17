-- Security definer RPC that fetches the current user's org + role.
-- Bypasses all RLS — no more loadOrg race conditions or policy blocks.
create or replace function public.jarvis_get_my_org()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_member record;
  v_org    record;
begin
  if v_uid is null then return null; end if;

  select org_id, role into v_member
  from public.jarvis_org_members
  where user_id = v_uid
  limit 1;

  if not found then return null; end if;

  select * into v_org
  from public.jarvis_organizations
  where id = v_member.org_id;

  if not found then return null; end if;

  return json_build_object(
    'id',       v_org.id,
    'name',     v_org.name,
    'slug',     v_org.slug,
    'owner_id', v_org.owner_id,
    'role',     v_member.role
  );
end;
$$;
