-- Simple to-do list (run in Supabase SQL Editor)

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  priority boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todos_position_idx ON todos (position, created_at);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on todos" ON todos;
CREATE POLICY "Allow all on todos"
  ON todos FOR ALL
  USING (true) WITH CHECK (true);
