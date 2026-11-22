-- SignLingo AI: accounts, progress sync and leaderboard (see docs/drafts/ADR_backend_sync_DRAFT.md).
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Only progress is stored. Camera images and hand landmarks never reach the server.

-- 1. One progress backup per user: the same JSON the app exports (shared/contracts/schemas/backup.schema.json).
create table if not exists public.user_backups (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  schema_version integer not null check (schema_version >= 1),
  data           jsonb   not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 524288),
  updated_at     timestamptz not null default now()
);

-- 2. What other people may see: a name and scores, and only when the user opts in.
create table if not exists public.public_profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 2 and 24),
  show_on_leaderboard boolean not null default false,
  total_xp            integer not null default 0 check (total_xp >= 0),
  week_xp             integer not null default 0 check (week_xp >= 0),
  current_streak      integer not null default 0 check (current_streak >= 0),
  updated_at          timestamptz not null default now()
);
create index if not exists public_profiles_total_xp_idx on public.public_profiles (total_xp desc) where show_on_leaderboard;
create index if not exists public_profiles_week_xp_idx  on public.public_profiles (week_xp desc)  where show_on_leaderboard;

-- 3. Row Level Security: nobody reads or writes another person's backup.
alter table public.user_backups   enable row level security;
alter table public.public_profiles enable row level security;

create policy "own backup: read"   on public.user_backups for select to authenticated using (auth.uid() = user_id);
create policy "own backup: insert" on public.user_backups for insert to authenticated with check (auth.uid() = user_id);
create policy "own backup: update" on public.user_backups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own backup: delete" on public.user_backups for delete to authenticated using (auth.uid() = user_id);

-- The leaderboard is readable by anyone, but only rows whose owner opted in; owners always see their own row.
create policy "leaderboard: read"   on public.public_profiles for select to anon, authenticated using (show_on_leaderboard or auth.uid() = user_id);
create policy "profile: insert"     on public.public_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profile: update"     on public.public_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profile: delete"     on public.public_profiles for delete to authenticated using (auth.uid() = user_id);

-- Scores are copied from the synced backup by the trigger below, so a client cannot write them directly.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
grant insert (user_id, display_name, show_on_leaderboard) on public.public_profiles to authenticated;
grant update (display_name, show_on_leaderboard)         on public.public_profiles to authenticated;
grant delete on public.public_profiles to authenticated;

revoke all on public.user_backups from anon, authenticated;
grant select, insert, update, delete on public.user_backups to authenticated;

-- 4. Keep the leaderboard numbers in step with the backup: total XP, XP of the last 7 days and the current streak.
create or replace function public.sync_scores() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  xp     integer := coalesce((new.data #>> '{stats,total_xp}')::integer, 0);
  streak integer := coalesce((new.data #>> '{stats,current_streak}')::integer, 0);
  week   integer := 0;
begin
  select coalesce(sum(greatest((value ->> 'xp_earned')::integer, 0)), 0) into week
  from jsonb_each(coalesce(new.data -> 'daily', '{}'::jsonb))
  where key >= to_char((now() at time zone 'utc')::date - 6, 'YYYY-MM-DD');

  update public.public_profiles
     set total_xp = greatest(xp, 0), week_xp = week, current_streak = greatest(streak, 0), updated_at = now()
   where user_id = new.user_id;
  return new;
end $$;

drop trigger if exists user_backups_sync_scores on public.user_backups;
create trigger user_backups_sync_scores after insert or update on public.user_backups
  for each row execute function public.sync_scores();

-- 5. A person may delete their account and every row with it.
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
