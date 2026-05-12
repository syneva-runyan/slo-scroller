import { supabase } from './supabase.js';

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
 * Submits a completed level score. Fire-and-forget — never throws.
 */
export async function submitScore({ playerId, displayName, trackId, levelId, breaches, rollingAvailability, elapsedSeconds }) {
  if (!supabase) {
    return;
  }

  try {
    await ensurePlayer(playerId, displayName);
    const { error } = await supabase.from('scores').insert({
      player_id: playerId,
      track_id: trackId,
      level_id: levelId,
      breaches,
      rolling_availability: rollingAvailability ?? null,
      elapsed_seconds: elapsedSeconds,
    });

    if (error) {
      console.error('Failed to submit score:', error.message);
    }
  } catch (err) {
    console.error('Score submission error:', err);
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
