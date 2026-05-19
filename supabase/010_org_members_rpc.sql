-- Returns all org members with real emails (reads auth.users via security definer).
-- Only callable by existing org members.
create or replace function public.jarvis_get_org_members(p_org_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists(
    select 1 from public.jarvis_org_members
    where org_id = p_org_id and user_id = auth.uid()
  ) then
    return '[]'::json;
  end if;

  return (
    select coalesce(json_agg(row_data order by (row_data->>'joined_at')), '[]'::json)
    from (
      select json_build_object(
        'id',        m.id,
        'user_id',   m.user_id,
        'role',      m.role,
        'joined_at', m.joined_at,
        'email',     u.email,
        'full_name', p.full_name
      ) as row_data
      from public.jarvis_org_members m
      join auth.users u on u.id = m.user_id
      left join public.jarvis_profiles p on p.id = m.user_id
      where m.org_id = p_org_id
    ) sub
  );
end;
$$;
