-- Run once in Supabase → SQL Editor.
-- Safe to run again.

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users (google_sub);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
