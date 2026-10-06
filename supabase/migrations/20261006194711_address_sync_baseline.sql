-- The previous UI was read-only: its last loaded addresses are the safe baseline
-- for detecting edits when enabling two-way address synchronization.
update public.google_contact_links l
set snapshot=l.snapshot || jsonb_build_object('google_addresses',m.google_addresses)
from public.members m
where m.id=l.member_id and m.google_addresses is not null
  and not (l.snapshot ? 'google_addresses');
