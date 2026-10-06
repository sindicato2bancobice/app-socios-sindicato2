alter table public.members
  add column google_emails jsonb,
  add column google_addresses jsonb;
alter table public.members
  add constraint member_google_emails_array check(google_emails is null or jsonb_typeof(google_emails)='array'),
  add constraint member_google_addresses_array check(google_addresses is null or jsonb_typeof(google_addresses)='array');
comment on column public.members.google_emails is 'All Google email addresses and labels; null means not loaded yet';
comment on column public.members.google_addresses is 'All Google addresses and labels, without inferring a work location';

-- Atomic import: retrying a contact cannot leave a ficha without its Google link.
create or replace function public.google_import_contact(resource text, contact jsonb, contact_etag text default null)
returns text language plpgsql security invoker set search_path='' as $$
declare
  existing public.members;
  matches integer;
  member uuid;
  mail text := lower(trim(coalesce(contact->>'email','')));
  telephone text := regexp_replace(coalesce(contact->>'phone',''),'[^0-9]','','g');
begin
  if resource !~ '^people/[a-zA-Z0-9_-]+$' or trim(coalesce(contact->>'first_name',''))='' then
    raise exception 'Invalid contact';
  end if;
  if exists(select 1 from public.google_contact_links where resource_name=resource) then return 'existing'; end if;
  select count(*) into matches from public.members m
    where m.google_resource_name=resource
      or (mail<>'' and lower(trim(m.email))=mail)
      or (telephone<>'' and regexp_replace(coalesce(m.phone,''),'[^0-9]','','g')=telephone);
  if matches>1 then return 'conflict'; end if;
  if matches=1 then
    select * into existing from public.members m
      where m.google_resource_name=resource
        or (mail<>'' and lower(trim(m.email))=mail)
        or (telephone<>'' and regexp_replace(coalesce(m.phone,''),'[^0-9]','','g')=telephone)
      for update;
    if exists(select 1 from public.google_contact_links where member_id=existing.id)
      or (existing.google_resource_name is not null and existing.google_resource_name<>resource)
      or existing.first_name<>contact->>'first_name'
      or existing.last_name<>coalesce(contact->>'last_name','')
      or coalesce(existing.email,'')<>coalesce(contact->>'email','')
      or coalesce(existing.phone,'')<>coalesce(contact->>'phone','') then return 'conflict'; end if;
    member:=existing.id;
  else
    insert into public.members(first_name,last_name,email,phone,status,google_resource_name,google_etag,google_updated_at,google_emails,google_addresses)
      values(contact->>'first_name',coalesce(contact->>'last_name',''),nullif(contact->>'email',''),nullif(contact->>'phone',''),'active_member',resource,contact_etag,now(),contact->'google_emails',contact->'google_addresses') returning id into member;
  end if;
  insert into public.google_contact_links(member_id,resource_name,snapshot) values(member,resource,contact);
  if matches=1 then
    update public.members set google_resource_name=resource,google_etag=contact_etag,google_updated_at=now(),google_emails=contact->'google_emails',google_addresses=contact->'google_addresses' where id=member;
    return 'linked';
  end if;
  return 'imported';
end;$$;
revoke all on function public.google_import_contact(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.google_import_contact(text,jsonb,text) to service_role;
