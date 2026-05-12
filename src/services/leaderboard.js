import { supabase } from './supabase.js';

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
 */
export async function submitScore({ playerId, displayName, trackId, levelId, breaches, rollingAvailability, elapsedSeconds }) {
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
      p_elapsed_seconds: elapsedSeconds,
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
 * Counts how many existing scores are strictly better (fewer breaches, or
 * same breaches but faster), then adds 1.
 */
export async function fetchRank({ trackId, levelId, breaches, elapsedSeconds }) {
  if (!supabase) {
    return null;
  }

  try {
    // Scores that beat this one on breaches
    const { count: betterBreaches, error: e1 } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', trackId)
      .eq('level_id', levelId)
      .lt('breaches', breaches);

    // Scores with same breaches but faster
    const { count: fasterSame, error: e2 } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', trackId)
      .eq('level_id', levelId)
      .eq('breaches', breaches)
      .lt('elapsed_seconds', elapsedSeconds);

    if (e1 || e2) {
      return null;
    }

    return (betterBreaches ?? 0) + (fasterSame ?? 0) + 1;
  } catch (err) {
    console.error('fetchRank error:', err);
    return null;
  }
}

/**
 * Returns the top scores for a given track/level, ordered best-first.
 * "Best" means fewest breaches, then shortest elapsed time.
 */
export async function fetchTopScores({ trackId, levelId, limit = 10 }) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('scores')
    .select('id, breaches, elapsed_seconds, created_at, players(display_name)')
    .eq('track_id', trackId)
    .eq('level_id', levelId)
    .order('breaches', { ascending: true })
    .order('elapsed_seconds', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch scores:', error.message);
    return [];
  }

  return data.map((row) => ({
    displayName: row.players?.display_name ?? 'Anonymous',
    breaches: row.breaches,
    elapsedSeconds: row.elapsed_seconds,
  }));
}
