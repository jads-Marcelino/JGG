-- Meridiano Studio v4 · applied on top of fonte/v3/schema.sql

-- e-mail of the caller: from the JWT, or from auth.users when an OAuth token has no e-mail claim
create or replace function public.my_email() returns text
language sql stable security definer set search_path = public, auth as $$
  select lower(coalesce(nullif(auth.jwt() ->> 'email', ''),
                        (select u.email from auth.users u where u.id = auth.uid()), ''))
$$;
revoke execute on function public.my_email() from anon, public;
grant execute on function public.my_email() to authenticated;

-- AI keys saved to the account, bound to the sign-in e-mail; never readable by OAuth clients
create table if not exists public.ai_keys (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  provider text not null check (provider in ('claude','openai')),
  email text not null,
  api_key text not null check (length(api_key) between 10 and 400),
  model text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.ai_keys enable row level security;
create policy ai_keys_own on public.ai_keys for all to authenticated
  using (user_id = (select auth.uid()) and (auth.jwt() ->> 'client_id') is null)
  with check (user_id = (select auth.uid()) and email = public.my_email() and (auth.jwt() ->> 'client_id') is null);
grant select, insert, update, delete on public.ai_keys to authenticated;

-- AI and connector (mcp) proposals both respect the owner's AI setting
drop policy if exists proposals_insert on public.proposals;
create policy proposals_insert on public.proposals for insert to authenticated with check (
  author = auth.uid() and status = 'open'
  and public.doc_role(doc_id) in ('owner','editor')
  and (via = 'human' or public.doc_role(doc_id) = 'owner'
       or (select ai_mode from public.documents where id = doc_id) = 'all'));

-- used only to check the hosted endpoints from inside the database
create extension if not exists pg_net with schema extensions;
