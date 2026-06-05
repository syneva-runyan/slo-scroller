This repo started as a vibe-coded prototype and hasn't fully recovered yet.

## Local development

```
nvm use
pnpm install
npm start
```

## Supabase setup

The leaderboard requires a Supabase project. Do this once before running the game locally.

**1. Create a project** at [supabase.com](https://supabase.com). When creating it, uncheck "Automatically expose new tables" and check "Enable Data API" and "Enable automatic RLS".

**2. Run the schema** in the Supabase SQL Editor:

```sql
CREATE TABLE players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  TEXT,
  auth_user_id  UUID UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id            UUID NOT NULL REFERENCES players(id),
  track_id             TEXT NOT NULL,
  level_id             TEXT NOT NULL,
  breaches             INT  NOT NULL,
  rolling_availability NUMERIC,
  obstacles_cleared    INT  NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT scores_player_level_unique UNIQUE (player_id, track_id, level_id)
);

CREATE INDEX ON scores (track_id, level_id, breaches, elapsed_seconds);
```

**3. Set RLS policies** in the SQL Editor:

```sql
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read players"          ON players FOR SELECT TO anon USING (true);
CREATE POLICY "Players can insert"           ON players FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Players can update own record" ON players FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public read scores"           ON scores  FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can submit score"      ON scores  FOR INSERT TO anon WITH CHECK (true);
```

**4. Grant table privileges to the anon role** in the SQL Editor:

```sql
-- players needs UPDATE because upsert on conflict does an UPDATE
GRANT SELECT, INSERT, UPDATE ON public.players TO anon;
GRANT SELECT, INSERT ON public.scores TO anon;
```

RLS policies control which rows the anon role can access, but Postgres also requires explicit table-level privileges. Without this step all requests return a 401. `players` needs `UPDATE` because the upsert does an `UPDATE` on conflict when the player already exists.

**5. Add a validation trigger and personal-best upsert function** in the SQL Editor:

```sql
CREATE OR REPLACE FUNCTION validate_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.breaches < 0 THEN RAISE EXCEPTION 'Invalid score: negative breaches'; END IF;
  IF NEW.elapsed_seconds <= 0 THEN RAISE EXCEPTION 'Invalid score: non-positive elapsed time'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_score_before_insert
  BEFORE INSERT ON scores FOR EACH ROW EXECUTE FUNCTION validate_score();

-- Conditional upsert: only replaces an existing score if the new run is better.
-- Runs as SECURITY DEFINER (db owner) so no UPDATE grant is needed on scores.
CREATE OR REPLACE FUNCTION submit_score(
  p_player_id          UUID,
  p_track_id           TEXT,
  p_level_id           TEXT,
  p_breaches           INT,
  p_rolling_availability NUMERIC,
  p_obstacles_cleared  INT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO scores (player_id, track_id, level_id, breaches, rolling_availability, obstacles_cleared)
  VALUES (p_player_id, p_track_id, p_level_id, p_breaches, p_rolling_availability, p_obstacles_cleared)
  ON CONFLICT (player_id, track_id, level_id)
  DO UPDATE SET
    breaches             = EXCLUDED.breaches,
    rolling_availability = EXCLUDED.rolling_availability,
    obstacles_cleared    = EXCLUDED.obstacles_cleared,
    created_at           = now()
  WHERE
    EXCLUDED.breaches < scores.breaches
    OR (EXCLUDED.breaches = scores.breaches AND EXCLUDED.obstacles_cleared > scores.obstacles_cleared);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_score(UUID, TEXT, TEXT, INT, NUMERIC, INT) TO anon;
```

**6. Add credentials** — copy the Project URL and publishable API key from **Project Settings → API**, then create `.env.local` at the repo root:

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-publishable-key>
```

`.env.local` is gitignored. Never use the `service_role` key here.

