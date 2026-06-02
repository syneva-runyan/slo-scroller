-- Adds finish-time tracking to the leaderboard so the response-time track can
-- rank players by how quickly they completed a level. Other tracks ignore the
-- column (it stays NULL for runs submitted without an elapsed time).

alter table public.scores
  add column if not exists elapsed_seconds real;

-- Speeds up the response-time leaderboard ordering.
create index if not exists scores_elapsed_idx
  on public.scores (track_id, level_id, elapsed_seconds)
  where elapsed_seconds is not null;

-- submit_score now accepts elapsed seconds. The PB rule is unchanged for the
-- existing breach-based tracks; for response-time, a faster run with the same
-- (or fewer) breaches beats a slower one.
create or replace function public.submit_score(
  p_player_id uuid,
  p_track_id text,
  p_level_id text,
  p_breaches integer,
  p_rolling_availability real,
  p_obstacles_cleared integer,
  p_elapsed_seconds real default null
) returns void
language plpgsql
security definer
as $$
begin
  insert into public.scores (
    player_id, track_id, level_id, breaches, rolling_availability,
    obstacles_cleared, elapsed_seconds
  )
  values (
    p_player_id, p_track_id, p_level_id, p_breaches, p_rolling_availability,
    p_obstacles_cleared, p_elapsed_seconds
  )
  on conflict (player_id, track_id, level_id) do update
  set
    breaches = case
      when p_track_id = 'response-time' then
        case
          when excluded.elapsed_seconds is not null
               and (public.scores.elapsed_seconds is null
                    or excluded.elapsed_seconds < public.scores.elapsed_seconds
                    or (excluded.elapsed_seconds = public.scores.elapsed_seconds
                        and excluded.breaches < public.scores.breaches))
          then excluded.breaches
          else public.scores.breaches
        end
      else least(public.scores.breaches, excluded.breaches)
    end,
    elapsed_seconds = case
      when p_track_id = 'response-time' then
        case
          when excluded.elapsed_seconds is not null
               and (public.scores.elapsed_seconds is null
                    or excluded.elapsed_seconds < public.scores.elapsed_seconds
                    or (excluded.elapsed_seconds = public.scores.elapsed_seconds
                        and excluded.breaches < public.scores.breaches))
          then excluded.elapsed_seconds
          else public.scores.elapsed_seconds
        end
      else coalesce(public.scores.elapsed_seconds, excluded.elapsed_seconds)
    end,
    obstacles_cleared = greatest(public.scores.obstacles_cleared, excluded.obstacles_cleared),
    rolling_availability = case
      when excluded.rolling_availability is not null
       and (public.scores.rolling_availability is null
            or excluded.rolling_availability > public.scores.rolling_availability)
      then excluded.rolling_availability
      else public.scores.rolling_availability
    end;
end;
$$;
