-- Tokens are encrypted by the server and inaccessible to browser roles.
create table public.google_connection (
  id boolean primary key default true check(id),
  connected_email text not null check(connected_email = 'directiva@sindicato2bancobice.cl'),
  refresh_token text not null
);
create table public.google_contact_links (
  member_id uuid primary key references public.members(id) on delete cascade,
  resource_name text not null unique,
  snapshot jsonb not null
);
create table public.google_sync_lock (
  id boolean primary key default true check(id),
  owner uuid,
  acquired_at timestamptz
);
insert into public.google_sync_lock(id) values(true);
alter table public.google_connection enable row level security;
alter table public.google_contact_links enable row level security;
alter table public.google_sync_lock enable row level security;
revoke all on public.google_connection,public.google_contact_links,public.google_sync_lock from public,anon,authenticated;
grant all on public.google_connection,public.google_contact_links,public.google_sync_lock to service_role;
create function public.google_sync_acquire(owner uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.google_sync_lock l set owner=google_sync_acquire.owner,acquired_at=now()
    where id=true and (l.owner is null or l.acquired_at < now()-interval '10 minutes');
  return found;
end;$$;
create function public.google_sync_release(owner uuid) returns void language sql security invoker set search_path='' as $$
  update public.google_sync_lock l set owner=null,acquired_at=null where l.owner=google_sync_release.owner;
$$;
revoke all on function public.google_sync_acquire(uuid),public.google_sync_release(uuid) from public,anon,authenticated;
grant execute on function public.google_sync_acquire(uuid),public.google_sync_release(uuid) to service_role;
