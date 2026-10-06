-- Durable tombstones prevent reimport after a local deletion, even if Google is unavailable.
create table public.google_contact_deletions (
  resource_name text primary key,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.google_contact_deletions enable row level security;
revoke all on public.google_contact_deletions from public, anon, authenticated;
grant all on public.google_contact_deletions to service_role;

create function public.delete_member_contact(member uuid, stamp timestamptz, actor uuid, lock_owner uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare resource text;
begin
  if not exists(select 1 from public.profiles where id=actor and active and role in ('administrator','director')) then
    raise exception 'No autorizado';
  end if;
  -- Serialize against import and sync; lock the lease for the transaction.
  perform 1 from public.google_sync_lock where id=true and owner=lock_owner for update;
  if not found then raise exception 'Bloqueo requerido'; end if;
  perform 1 from public.members where id=member and updated_at=stamp for update;
  if not found then return false; end if;
  select resource_name into resource from public.google_contact_links where member_id=member;
  if resource is not null then
    insert into public.google_contact_deletions(resource_name) values(resource) on conflict do nothing;
  end if;
  -- Preserve actor attribution in the existing audit trigger.
  perform set_config('request.jwt.claim.sub',actor::text,true);
  delete from public.members where id=member;
  return true;
end;$$;
revoke all on function public.delete_member_contact(uuid,timestamptz,uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_member_contact(uuid,timestamptz,uuid,uuid) to service_role;
