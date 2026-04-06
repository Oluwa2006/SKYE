-- Harden team role permissions and use them for Agentica library management.

create or replace function public.current_team_role()
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_role text;
  active_count bigint;
begin
  if auth.uid() is null then
    return 'member';
  end if;

  select tm.role
  into resolved_role
  from public.team_members tm
  where tm.user_id = auth.uid()
    and tm.status = 'active'
  order by case tm.role
    when 'owner' then 1
    when 'admin' then 2
    else 3
  end
  limit 1;

  if resolved_role is not null then
    return resolved_role;
  end if;

  select count(*)
  into active_count
  from public.team_members
  where status = 'active';

  if active_count = 0 then
    return 'owner';
  end if;

  return 'member';
end;
$$;

create or replace function public.can_manage_agentica_library()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_team_role() in ('owner', 'admin');
$$;

grant execute on function public.current_team_role() to authenticated;
grant execute on function public.can_manage_agentica_library() to authenticated;

drop policy if exists "Authenticated users can insert" on public.team_members;
drop policy if exists "Authenticated users can update" on public.team_members;
drop policy if exists "Authenticated users can delete" on public.team_members;

create policy "Admins can insert team members"
  on public.team_members for insert to authenticated
  with check (public.current_team_role() in ('owner', 'admin'));

create policy "Admins can update team members"
  on public.team_members for update to authenticated
  using (public.current_team_role() in ('owner', 'admin'))
  with check (public.current_team_role() in ('owner', 'admin'));

create policy "Admins can delete team members"
  on public.team_members for delete to authenticated
  using (public.current_team_role() in ('owner', 'admin'));

drop policy if exists "Authenticated users can insert base ads" on public.base_ads;
drop policy if exists "Creator can update their own base ads" on public.base_ads;

create policy "Admins can insert base ads"
  on public.base_ads for insert to authenticated
  with check (public.can_manage_agentica_library());

create policy "Admins can update base ads"
  on public.base_ads for update to authenticated
  using (public.can_manage_agentica_library())
  with check (public.can_manage_agentica_library());

create policy "Admins can delete base ads"
  on public.base_ads for delete to authenticated
  using (public.can_manage_agentica_library());
