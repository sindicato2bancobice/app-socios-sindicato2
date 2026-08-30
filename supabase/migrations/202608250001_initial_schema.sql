create type public.app_role as enum ('administrator', 'director', 'collaborator', 'member');
create type public.person_status as enum ('active_member', 'adherent', 'inactive_member');
create type public.request_status as enum ('pending', 'approved', 'rejected');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  status public.person_status not null default 'adherent',
  first_name text not null,
  last_name text not null,
  rut text unique,
  email text,
  phone text,
  birth_date date,
  branch text,
  department text,
  job_title text,
  bank_joined_at date,
  union_joined_at date,
  union_left_at date,
  google_resource_name text unique,
  google_etag text,
  google_updated_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rut_format check (rut is null or rut ~ '^[0-9]{7,8}-[0-9Kk]$'),
  constraint union_dates_order check (union_left_at is null or union_joined_at is null or union_left_at >= union_joined_at)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id uuid unique references public.members(id) on delete set null,
  role public.app_role not null default 'member',
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.update_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  proposed_changes jsonb not null,
  status public.request_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  constraint proposed_changes_object check (jsonb_typeof(proposed_changes) = 'object')
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.google_sync_state (
  id boolean primary key default true check (id),
  connected_email text,
  sync_token text,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  updated_at timestamptz not null default now()
);

create index members_status_idx on public.members(status);
create index members_name_idx on public.members(last_name, first_name);
create index members_birth_date_idx on public.members(birth_date);
create index update_requests_status_idx on public.update_requests(status, created_at desc);

alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.update_requests enable row level security;
alter table public.audit_log enable row level security;
alter table public.google_sync_state enable row level security;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.has_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and p.role = any(allowed_roles)
  );
$$;

revoke all on function app_private.has_role(public.app_role[]) from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.has_role(public.app_role[]) to authenticated;

create policy "members_select_own_or_staff" on public.members for select to authenticated
using (user_id = (select auth.uid()) or app_private.has_role(array['administrator','director','collaborator']::public.app_role[]));
create policy "members_staff_insert" on public.members for insert to authenticated
with check (app_private.has_role(array['administrator','director']::public.app_role[]));
create policy "members_staff_update" on public.members for update to authenticated
using (app_private.has_role(array['administrator','director']::public.app_role[]))
with check (app_private.has_role(array['administrator','director']::public.app_role[]));

create policy "profiles_select_own_or_staff" on public.profiles for select to authenticated
using (id = (select auth.uid()) or app_private.has_role(array['administrator','director']::public.app_role[]));
create policy "profiles_admin_update" on public.profiles for update to authenticated
using (app_private.has_role(array['administrator']::public.app_role[]))
with check (app_private.has_role(array['administrator']::public.app_role[]));

create policy "requests_select_own_or_staff" on public.update_requests for select to authenticated
using (requested_by = (select auth.uid()) or app_private.has_role(array['administrator','director','collaborator']::public.app_role[]));
create policy "requests_member_insert" on public.update_requests for insert to authenticated
with check (requested_by = (select auth.uid()) and exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid())));
create policy "requests_staff_update" on public.update_requests for update to authenticated
using (app_private.has_role(array['administrator','director']::public.app_role[]))
with check (app_private.has_role(array['administrator','director']::public.app_role[]));

create policy "audit_staff_select" on public.audit_log for select to authenticated
using (app_private.has_role(array['administrator','director']::public.app_role[]));
create policy "sync_admin_select" on public.google_sync_state for select to authenticated
using (app_private.has_role(array['administrator']::public.app_role[]));

grant usage on schema public to authenticated;
grant select, insert, update on public.members, public.profiles, public.update_requests to authenticated;
grant select on public.audit_log, public.google_sync_state to authenticated;
revoke all on public.members, public.profiles, public.update_requests, public.audit_log, public.google_sync_state from anon;

comment on table public.members is 'Registro maestro de socios, adherentes y exsocios';
comment on column public.members.notes is 'Información interna; nunca se sincroniza con Google Contacts';
