-- Google sign-in. Accounts created this way have no password until they set one.
-- Existing password accounts stay as they are; the first Google sign-in with the same email links them.

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users (google_sub);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
