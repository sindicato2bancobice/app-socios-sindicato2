-- Called only by the server after a direct Google read confirms deletion or a new identity.
create function public.reconcile_google_contact(member uuid, stamp timestamptz, old_resource text, replacement text, lock_owner uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare target uuid; new_stamp timestamptz;
begin
  perform 1 from public.google_sync_lock where id=true and owner=lock_owner for update;
  if not found then raise exception 'Bloqueo requerido'; end if;
  perform 1 from public.members where id=member and updated_at=stamp for update;
  if not found then return jsonb_build_object('status','changed'); end if;
  perform 1 from public.google_contact_links where member_id=member and resource_name=old_resource for update;
  if not found then return jsonb_build_object('status','changed'); end if;
  if replacement is not null then
    select member_id into target from public.google_contact_links where resource_name=replacement;
    if target is null then
      update public.google_contact_links set resource_name=replacement where member_id=member;
      update public.members set google_resource_name=replacement where id=member returning updated_at into new_stamp;
      return jsonb_build_object('status','relinked','updated_at',new_stamp);
    end if;
    if target=member then return jsonb_build_object('status','unchanged'); end if;
  end if;
  -- Retire only the obsolete identity. Never enqueue deletion of the surviving Google contact.
  insert into public.google_contact_deletions(resource_name,completed_at) values(old_resource,now())
    on conflict(resource_name) do update set completed_at=excluded.completed_at;
  insert into public.audit_log(entity_type,entity_id,action,old_data,new_data)
    select 'member',id::text,'GOOGLE_RECONCILE',to_jsonb(m),jsonb_build_object('replacement',replacement,'survivor_member_id',target)
    from public.members m where id=member;
  delete from public.members where id=member;
  return jsonb_build_object('status','removed');
end;$$;
revoke all on function public.reconcile_google_contact(uuid,timestamptz,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reconcile_google_contact(uuid,timestamptz,text,text,uuid) to service_role;
