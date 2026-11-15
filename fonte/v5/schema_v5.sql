-- Meridiano Studio v5 · applied on top of schema_v4.sql
-- proposals can redesign whole slides, add/remove/reorder slides, and come as options
alter table public.proposals add column if not exists slide_order jsonb;      -- null = keep current order
alter table public.proposals add column if not exists option_group text;     -- options for the same request
alter table public.proposals add column if not exists option_label text;     -- "A", "B", ...

create or replace function public.approve_proposal(p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare p proposals; nv int; msg text; mins int; changed jsonb;
begin
  select * into p from proposals where id = p_id for update;
  if not found then raise exception 'proposal not found'; end if;
  if coalesce(public.doc_role(p.doc_id), '') <> 'owner' then raise exception 'only the owner can approve'; end if;
  if p.status <> 'open' then raise exception 'proposal is %', p.status; end if;
  update documents set files = files || p.files,
         slide_order = case when p.slide_order is not null and jsonb_typeof(p.slide_order) = 'array' and jsonb_array_length(p.slide_order) > 0
                            then p.slide_order else slide_order end,
         updated_at = now()
   where id = p.doc_id;
  select coalesce(max(n), 0) + 1 into nv from versions where doc_id = p.doc_id;
  msg := coalesce(p.prompt, 'Edits by ' || coalesce((select name from profiles where id = p.author), 'member'))
         || case when p.option_label is not null then ' · option ' || p.option_label else '' end;
  changed := (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p.files) k);
  insert into versions (doc_id, n, msg, proposed_by, via, approved_by, snap, changed)
  values (p.doc_id, nv, msg, p.author, p.via, auth.uid(), (select files from documents where id = p.doc_id), changed);
  update proposals set status = 'approved', decided_by = auth.uid(), updated_at = now() where id = p_id;
  if p.option_group is not null then
    update proposals set status = 'rejected', decided_by = auth.uid(), updated_at = now()
     where doc_id = p.doc_id and option_group = p.option_group and id <> p_id and status = 'open';
  end if;
  mins := extract(epoch from (now() - p.created_at)) / 60;
  insert into events (user_id, email, type, doc_id, meta)
  values (auth.uid(), public.my_email(), 'approve', p.doc_id, jsonb_build_object('version', nv, 'minutes_open', mins, 'option', p.option_label));
  return nv;
end $$;
