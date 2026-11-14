-- Meridiano Studio v3 · Supabase schema
-- Access model: the owner shares a document by typing an e-mail. Only that
-- e-mail can sign up / sign in and see the document. No e-mail is sent.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'slides' check (kind in ('slides','doc')),
  tpl text not null default 'blank',
  owner uuid not null references auth.users(id) on delete cascade default auth.uid(),
  ai_mode text not null default 'all' check (ai_mode in ('all','owner')),
  files jsonb not null default '{}'::jsonb,      -- approved content: {slideKey: html}
  slide_order jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invites (
  doc_id uuid not null references public.documents(id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null default 'editor' check (role in ('editor','commenter')),
  invited_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (doc_id, email)
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.documents(id) on delete cascade,
  author uuid not null references auth.users(id) on delete cascade default auth.uid(),
  via text not null default 'human' check (via in ('human','ai','mcp')),
  prompt text,
  files jsonb not null default '{}'::jsonb,       -- proposed html per slide key
  status text not null default 'open' check (status in ('open','approved','rejected','withdrawn')),
  decided_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proposals_doc on public.proposals(doc_id, status);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.documents(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  path text,
  field text,
  author uuid not null references auth.users(id) on delete cascade default auth.uid(),
  body text not null check (length(body) between 1 and 4000),
  resolved boolean not null default false,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_doc on public.comments(doc_id);

create table if not exists public.versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.documents(id) on delete cascade,
  n int not null,
  msg text not null,
  proposed_by uuid references auth.users(id),
  via text not null default 'human',
  approved_by uuid references auth.users(id),
  snap jsonb not null,
  changed jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (doc_id, n)
);

create table if not exists public.events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  email text,
  type text not null,
  doc_id uuid references public.documents(id) on delete set null,
  meta jsonb not null default '{}'::jsonb
);
create index if not exists events_ts on public.events(ts);
create index if not exists events_doc on public.events(doc_id);

-- ---------- helpers ----------
create or replace function public.my_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- role of the caller on a document: owner / editor / commenter / null
create or replace function public.doc_role(d uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from documents where id = d and owner = auth.uid()) then 'owner'
    else (select role from invites where doc_id = d and email = public.my_email())
  end
$$;

-- profile row for every new account
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row level security ----------
alter table public.profiles  enable row level security;
alter table public.documents enable row level security;
alter table public.invites   enable row level security;
alter table public.proposals enable row level security;
alter table public.comments  enable row level security;
alter table public.versions  enable row level security;
alter table public.events    enable row level security;

-- profiles: yourself, and people you share a document with
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from documents d
    where public.doc_role(d.id) is not null
      and (d.owner = profiles.id or exists (select 1 from invites i where i.doc_id = d.id and i.email = profiles.email))
  ));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- documents
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated using (public.doc_role(id) is not null);
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete to authenticated using (owner = auth.uid());
-- (insert goes through create_document)

-- invites: members see who is invited; only the owner adds or removes
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select to authenticated using (public.doc_role(doc_id) is not null);
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated with check (public.doc_role(doc_id) = 'owner');
drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete to authenticated using (public.doc_role(doc_id) = 'owner');
drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update to authenticated using (public.doc_role(doc_id) = 'owner');

-- proposals: everyone in the room sees them; owner and editors propose;
-- AI proposals respect the document's AI mode; decisions only through RPCs
drop policy if exists proposals_select on public.proposals;
create policy proposals_select on public.proposals for select to authenticated using (public.doc_role(doc_id) is not null);
drop policy if exists proposals_insert on public.proposals;
create policy proposals_insert on public.proposals for insert to authenticated with check (
  author = auth.uid() and status = 'open'
  and public.doc_role(doc_id) in ('owner','editor')
  and (via <> 'ai' or public.doc_role(doc_id) = 'owner'
       or (select ai_mode from documents where id = doc_id) = 'all'));
drop policy if exists proposals_update on public.proposals;
create policy proposals_update on public.proposals for update to authenticated
  using (author = auth.uid() and status = 'open')
  with check (author = auth.uid() and status in ('open','withdrawn'));

-- comments: every member reads and writes; owner or author can resolve/edit
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated using (public.doc_role(doc_id) is not null);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check (author = auth.uid() and public.doc_role(doc_id) is not null);
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update to authenticated using (author = auth.uid() or public.doc_role(doc_id) = 'owner');

-- versions: read-only for members (written by approve_proposal)
drop policy if exists versions_select on public.versions;
create policy versions_select on public.versions for select to authenticated using (public.doc_role(doc_id) is not null);

-- events: you write your own; owners read events of their documents
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated with check (user_id = auth.uid() and (doc_id is null or public.doc_role(doc_id) is not null));
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated using (
  user_id = auth.uid() or (doc_id is not null and public.doc_role(doc_id) = 'owner')
  or exists (select 1 from documents d join invites i on i.doc_id = d.id
             where d.owner = auth.uid() and i.email = events.email));

-- ---------- RPCs ----------
create or replace function public.create_document(p_name text, p_kind text, p_tpl text, p_ai text, p_files jsonb, p_order jsonb, p_emails text[], p_role text default 'editor')
returns uuid language plpgsql security definer set search_path = public as $$
declare d uuid; e text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into documents (name, kind, tpl, owner, ai_mode, files, slide_order)
  values (p_name, p_kind, p_tpl, auth.uid(), coalesce(p_ai,'all'), p_files, p_order) returning id into d;
  insert into versions (doc_id, n, msg, proposed_by, approved_by, snap, changed)
  values (d, 1, 'Created from template ' || p_tpl, auth.uid(), auth.uid(), p_files,
          (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p_files) k));
  foreach e in array coalesce(p_emails, '{}') loop
    e := lower(trim(e));
    if e <> '' and e <> public.my_email() then
      insert into invites (doc_id, email, role) values (d, e, coalesce(p_role,'editor')) on conflict do nothing;
    end if;
  end loop;
  insert into events (user_id, email, type, doc_id, meta) values (auth.uid(), public.my_email(), 'deck_created', d, jsonb_build_object('template', p_tpl));
  return d;
end $$;

create or replace function public.approve_proposal(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare p proposals; nv int; msg text; mins int;
begin
  select * into p from proposals where id = p_id for update;
  if not found then raise exception 'proposal not found'; end if;
  if public.doc_role(p.doc_id) <> 'owner' or public.doc_role(p.doc_id) is null then raise exception 'only the owner can approve'; end if;
  if p.status <> 'open' then raise exception 'proposal is %', p.status; end if;
  update documents set files = files || p.files, updated_at = now() where id = p.doc_id;
  select coalesce(max(n), 0) + 1 into nv from versions where doc_id = p.doc_id;
  msg := coalesce(p.prompt, 'Edits by ' || coalesce((select name from profiles where id = p.author), 'member'));
  insert into versions (doc_id, n, msg, proposed_by, via, approved_by, snap, changed)
  values (p.doc_id, nv, msg, p.author, p.via, auth.uid(), (select files from documents where id = p.doc_id),
          (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p.files) k));
  update proposals set status = 'approved', decided_by = auth.uid(), updated_at = now() where id = p_id;
  mins := extract(epoch from (now() - p.created_at)) / 60;
  insert into events (user_id, email, type, doc_id, meta) values (auth.uid(), public.my_email(), 'approve', p.doc_id, jsonb_build_object('version', nv, 'minutes_open', mins));
  return nv;
end $$;

create or replace function public.reject_proposal(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p proposals;
begin
  select * into p from proposals where id = p_id for update;
  if not found then raise exception 'proposal not found'; end if;
  if p.status <> 'open' then return; end if;
  if public.doc_role(p.doc_id) = 'owner' then
    update proposals set status = 'rejected', decided_by = auth.uid(), updated_at = now() where id = p_id;
  elsif p.author = auth.uid() then
    update proposals set status = 'withdrawn', updated_at = now() where id = p_id;
  else raise exception 'not allowed'; end if;
  insert into events (user_id, email, type, doc_id, meta) values (auth.uid(), public.my_email(), 'reject', p.doc_id, jsonb_build_object('proposal', p_id));
end $$;

-- can this e-mail open the shared link? (used on the join screen before sign-in)
create or replace function public.invite_status(p_doc uuid, p_email text) returns text
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from invites where doc_id = p_doc and email = lower(trim(p_email))) then 'invited'
              when exists (select 1 from documents d join profiles pr on pr.id = d.owner where d.id = p_doc and pr.email = lower(trim(p_email))) then 'owner'
              else 'not_invited' end
$$;

revoke all on function public.create_document(text,text,text,text,jsonb,jsonb,text[],text) from public, anon;
revoke all on function public.approve_proposal(uuid) from public, anon;
revoke all on function public.reject_proposal(uuid) from public, anon;
grant execute on function public.create_document(text,text,text,text,jsonb,jsonb,text[],text) to authenticated;
grant execute on function public.approve_proposal(uuid) to authenticated;
grant execute on function public.reject_proposal(uuid) to authenticated;
grant execute on function public.invite_status(uuid, text) to anon, authenticated;

-- ---------- realtime ----------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.documents, public.proposals, public.comments, public.versions, public.invites;
    exception when duplicate_object then null; end;
  end if;
end $$;
