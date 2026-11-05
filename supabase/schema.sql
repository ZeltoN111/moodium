-- Moodium cloud sync. Run once in Supabase → SQL Editor → New query → Run.
-- One row per user per day; every user can only see and change their own rows.

create table if not exists public.entries (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  date       text        not null,               -- YYYY-MM-DD day key
  mood       smallint,
  intensity  smallint,
  note       text,
  sleep_hours real,
  stress     smallint,
  workload   smallint,
  factors    text[]      not null default '{}',  -- factor keys: work, sleep, exercise, social
  tags       text[]      not null default '{}',
  deleted    boolean     not null default false, -- tombstone, so deletions reach other devices
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.entries enable row level security;

drop policy if exists "own entries: select" on public.entries;
drop policy if exists "own entries: insert" on public.entries;
drop policy if exists "own entries: update" on public.entries;
drop policy if exists "own entries: delete" on public.entries;

create policy "own entries: select" on public.entries for select to authenticated using (user_id = auth.uid());
create policy "own entries: insert" on public.entries for insert to authenticated with check (user_id = auth.uid());
create policy "own entries: update" on public.entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own entries: delete" on public.entries for delete to authenticated using (user_id = auth.uid());
