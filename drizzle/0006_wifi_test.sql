-- Wi-Fi speed-test results. Only the app's superuser form writes these columns.
-- Lighting, toilets, outlet rating, and ergonomic index live in venues.work_info (JSONB).

ALTER TABLE venues ADD COLUMN IF NOT EXISTS wifi_tested_at timestamptz;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wifi_download_mbps numeric(6, 1);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wifi_upload_mbps numeric(6, 1);
