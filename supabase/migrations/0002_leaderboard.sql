-- SignLingo AI: the opt-in leaderboard (see docs/drafts/ADR_backend_sync_DRAFT.md).
-- Run once after 0001: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Only people who switch "join the leaderboard" on appear, and only signed-in people can read it.

-- 1. Accuracy numbers next to the XP numbers. Clients cannot write any of these (no column grant); a trigger fills them.
alter table public.public_profiles
  add column if not exists attempts int not null default 0 check (attempts >= 0),
  add column if not exists correct  int not null default 0 check (correct >= 0),
  add column if not exists sign_acc jsonb not null default '{}'::jsonb check (jsonb_typeof(sign_acc) = 'object');

-- 2. One place that turns a progress backup into scores. A malformed backup yields no scores instead of an error,
--    so saving progress never fails because of this.
create or replace function public.progress_scores(d jsonb)
returns table (total_xp int, week_xp int, current_streak int, attempts int, correct int, sign_acc jsonb)
language plpgsql stable set search_path = public as $$
begin
  total_xp       := greatest(coalesce((d #>> '{stats,total_xp}')::int, 0), 0);
  current_streak := greatest(coalesce((d #>> '{stats,current_streak}')::int, 0), 0);

  select coalesce(sum(greatest((v ->> 'xp_earned')::int, 0)), 0) into week_xp
  from jsonb_each(coalesce(d -> 'daily', '{}'::jsonb)) as e(k, v)
  where k >= to_char((now() at time zone 'utc')::date - 6, 'YYYY-MM-DD');

  -- Per letter: [attempts, correct], never more correct than attempts.
  select coalesce(sum(a), 0), coalesce(sum(c), 0), coalesce(jsonb_object_agg(k, jsonb_build_array(a, c)), '{}'::jsonb)
    into attempts, correct, sign_acc
  from (
    select k, greatest((v ->> 'attempts')::int, 0) as a,
           least(greatest((v ->> 'correct')::int, 0), greatest((v ->> 'attempts')::int, 0)) as c
    from jsonb_each(coalesce(d -> 'sign_stats', '{}'::jsonb)) as e(k, v)
    where k ~ '^[A-Z]$'
  ) s;
  return next;
exception when others then
  return;
end $$;

-- 3. Keep the scores in step with every synced backup (replaces the version from 0001).
create or replace function public.sync_scores() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.public_profiles p
     set total_xp = s.total_xp, week_xp = s.week_xp, current_streak = s.current_streak,
         attempts = s.attempts, correct = s.correct, sign_acc = s.sign_acc, updated_at = now()
    from public.progress_scores(new.data) s
   where p.user_id = new.user_id;
  return new;
end $$;

-- 4. When someone joins (or switches back on) their scores come from their saved backup right away,
--    instead of showing zeros until the next sync.
create or replace function public.fill_scores_on_join() returns trigger
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from public.progress_scores((select b.data from public.user_backups b where b.user_id = new.user_id));
  if found then
    new.total_xp := s.total_xp; new.week_xp := s.week_xp; new.current_streak := s.current_streak;
    new.attempts := s.attempts; new.correct := s.correct; new.sign_acc := s.sign_acc;
  end if;
  return new;
end $$;

drop trigger if exists public_profiles_fill_scores on public.public_profiles;
create trigger public_profiles_fill_scores before insert or update of show_on_leaderboard on public.public_profiles
  for each row when (new.show_on_leaderboard) execute function public.fill_scores_on_join();

-- 5. Only signed-in people may read the leaderboard (replaces the public read from 0001).
drop policy if exists "leaderboard: read" on public.public_profiles;
create policy "leaderboard: read" on public.public_profiles for select to authenticated
  using (show_on_leaderboard or auth.uid() = user_id);
revoke select on public.public_profiles from anon;

-- 6. The ranking itself. kind: week | total | streak | accuracy | letter (letter needs p_letter, A-Y).
--    Accuracy needs at least 20 attempts overall and 5 for a single letter, so one lucky try does not win.
--    Runs with the caller's rights, so Row Level Security still hides everyone who did not opt in.
create or replace function public.get_leaderboard(p_kind text, p_letter text default null, p_limit int default 50)
returns table (rank_no bigint, shown_name text, score numeric, detail int, is_me boolean)
language plpgsql stable security invoker set search_path = public as $$
begin
  if p_kind not in ('week', 'total', 'streak', 'accuracy', 'letter') then
    raise exception 'unknown leaderboard kind %', p_kind;
  end if;
  if p_kind = 'letter' and (p_letter is null or p_letter !~ '^[A-Z]$') then
    raise exception 'a letter A-Z is required';
  end if;

  return query
  with base as (
    select pp.user_id as uid, pp.display_name as nm,
      case p_kind
        when 'week'     then pp.week_xp::numeric
        when 'total'    then pp.total_xp::numeric
        when 'streak'   then pp.current_streak::numeric
        when 'accuracy' then round(pp.correct * 100.0 / nullif(pp.attempts, 0), 1)
        else round((pp.sign_acc -> p_letter ->> 1)::numeric * 100.0 / nullif((pp.sign_acc -> p_letter ->> 0)::numeric, 0), 1)
      end as sc,
      case p_kind
        when 'accuracy' then pp.attempts
        when 'letter'   then (pp.sign_acc -> p_letter ->> 0)::int
      end as dt
    from public.public_profiles pp
    where pp.show_on_leaderboard
      and (p_kind in ('week', 'total', 'streak')
           or (p_kind = 'accuracy' and pp.attempts >= 20)
           or (p_kind = 'letter' and coalesce((pp.sign_acc -> p_letter ->> 0)::int, 0) >= 5))
  ), ranked as (
    select rank() over (order by b.sc desc) as rk, b.uid, b.nm, b.sc, b.dt
    from base b where b.sc > 0
  )
  select r.rk, r.nm, r.sc, r.dt, r.uid = auth.uid()
  from ranked r
  where r.rk <= least(greatest(p_limit, 1), 100) or r.uid = auth.uid()
  order by r.rk, r.dt desc nulls last, r.nm;
end $$;

revoke all on function public.get_leaderboard(text, text, int) from public, anon;
grant execute on function public.get_leaderboard(text, text, int) to authenticated;
