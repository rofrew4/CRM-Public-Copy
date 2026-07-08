-- Priority flag for to-do drag buckets (run if you already ran 20250522_todos.sql)

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false;
