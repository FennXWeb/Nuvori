-- Nuvori: private account saves and authenticated shared-world presence.
create table if not exists public.keeper_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and (data->>'version') = '1' and octet_length(data::text) < 2000000),
  updated_at timestamptz not null default now()
);
alter table public.keeper_saves enable row level security;
revoke all on public.keeper_saves from anon;
grant select, insert, update on public.keeper_saves to authenticated;
create policy "Keepers read only their own save" on public.keeper_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Keepers create only their own save" on public.keeper_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Keepers update only their own save" on public.keeper_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Realtime private channels require authenticated access in both directions.
create policy "Nuvori keepers receive presence" on realtime.messages for select to authenticated using (realtime.topic() = 'nuvori:auralis' and extension = 'presence');
create policy "Nuvori keepers publish presence" on realtime.messages for insert to authenticated with check (realtime.topic() = 'nuvori:auralis' and extension = 'presence');
