import { supabase } from './supabase.js';

const RESPONSE_TIME_TRACK = 'response-time';

export function isLeaderboardEnabled() {
  return supabase !== null;
}

/**
 * Ensures a player row exists in the DB for the given local UUID.
 * Upserts so it is safe to call on every submission.
 */
async function ensurePlayer(playerId, displayName) {
  await supabase
    .from('players')
    .upsert({ id: playerId, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: false });
}

/**
 * Submits a completed level score. Only keeps the personal best per player
 * per level — the DB function handles the conditional upsert server-side.
 * `elapsedSeconds` is only meaningful for the response-time track but is
 * always forwarded so the DB can decide what to keep.
 */
export async function submitScore({ playerId, displayName, trackId, levelId, breaches, rollingAvailability, obstaclesCleared, elapsedSeconds }) {
  if (!supabase) {
    return;
  }

  try {
    await ensurePlayer(playerId, displayName);
    const { error } = await supabase.rpc('submit_score', {
      p_player_id: playerId,
      p_track_id: trackId,
      p_level_id: levelId,
      p_breaches: breaches,
      p_rolling_availability: rollingAvailability ?? null,
      p_obstacles_cleared: obstaclesCleared,
      p_elapsed_seconds: elapsedSeconds ?? null,
    });

    if (error) {
      console.error('Failed to submit score:', error.message);
    }
  } catch (err) {
    console.error('Score submission error:', err);
  }
}

/**
 * Returns the 1-based rank a score would occupy for a given track/level.
 * For response-time: ranked by fastest elapsed_seconds, breaches as tiebreaker.
 * Other tracks: ranked by fewest breaches, then most obstacles cleared.
 */
export async function fetchRank({ trackId, levelId, breaches, obstaclesCleared, elapsedSeconds }) {
  if (!supabase) {
    return null;
  }

  try {
    if (trackId === RESPONSE_TIME_TRACK) {
      if (elapsedSeconds == null) {
        return null;
      }

      const { count: faster, error: e1 } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
        .eq('level_id', levelId)
        .not('elapsed_seconds', 'is', null)
        .lt('elapsed_seconds', elapsedSeconds);

      const { count: sameTimeFewerBreaches, error: e2 } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
        .eq('level_id', levelId)
        .eq('elapsed_seconds', elapsedSeconds)
        .lt('breaches', breaches);

      if (e1 || e2) {
        return null;
      }

      return (faster ?? 0) + (sameTimeFewerBreaches ?? 0) + 1;
    }

    // Scores that beat this one on breaches
    const { count: betterBreaches, error: e1 } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', trackId)
      .eq('level_id', levelId)
      .lt('breaches', breaches);

    // Scores with same breaches but more obstacles cleared
    const { count: betterSame, error: e2 } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', trackId)
      .eq('level_id', levelId)
      .eq('breaches', breaches)
      .gt('obstacles_cleared', obstaclesCleared);

    if (e1 || e2) {
      return null;
    }

    return (betterBreaches ?? 0) + (betterSame ?? 0) + 1;
  } catch (err) {
    console.error('fetchRank error:', err);
    return null;
  }
}

/**
 * Returns the top scores for a given track/level, ordered best-first.
 * Response-time: ordered by elapsed_seconds asc (fastest first), then breaches asc.
 * Other tracks: fewest breaches first, then most obstacles cleared.
 */
export async function fetchTopScores({ trackId, levelId, limit = 10 }) {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from('scores')
    .select('id, breaches, obstacles_cleared, elapsed_seconds, created_at, players(display_name)')
    .eq('track_id', trackId)
    .eq('level_id', levelId)
    .limit(limit);

  if (trackId === RESPONSE_TIME_TRACK) {
    query = query
      .not('elapsed_seconds', 'is', null)
      .order('elapsed_seconds', { ascending: true })
      .order('breaches', { ascending: true });
  } else {
    query = query
      .order('breaches', { ascending: true })
      .order('obstacles_cleared', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch scores:', error.message);
    return [];
  }

  return data.map((row) => ({
    displayName: row.players?.display_name ?? 'Anonymous',
    breaches: row.breaches,
    obstaclesCleared: row.obstacles_cleared,
    elapsedSeconds: row.elapsed_seconds,
  }));
}
