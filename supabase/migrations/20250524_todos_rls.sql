-- Fix: inserts blocked when RLS is on but no policy exists (run if you already ran 20250522_todos.sql)

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on todos" ON todos;
CREATE POLICY "Allow all on todos"
  ON todos FOR ALL
  USING (true) WITH CHECK (true);
