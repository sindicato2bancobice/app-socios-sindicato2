create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function app_private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;

create trigger members_set_updated_at before update on public.members
for each row execute function app_private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function app_private.set_updated_at();

create or replace function app_private.audit_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, entity_type, entity_id, action, old_data, new_data)
  values ((select auth.uid()), 'member', coalesce(new.id, old.id)::text, tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end);
  return coalesce(new, old);
end;
$$;

revoke all on function app_private.audit_member_change() from public, anon, authenticated;

create trigger members_audit after insert or update or delete on public.members
for each row execute function app_private.audit_member_change();
