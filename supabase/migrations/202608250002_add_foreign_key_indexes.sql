create index audit_log_actor_id_idx on public.audit_log(actor_id);
create index update_requests_member_id_idx on public.update_requests(member_id);
create index update_requests_requested_by_idx on public.update_requests(requested_by);
create index update_requests_reviewed_by_idx on public.update_requests(reviewed_by) where reviewed_by is not null;
