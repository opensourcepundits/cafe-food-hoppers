-- Run in the Supabase SQL editor (Supabase project → SQL Editor), not against the app database.
-- The app's data is on Neon. This job only calls the app over HTTP every minute;
-- the app finds due events and signs each push with VAPID.
--
-- The bearer secret lives in Supabase Vault, never in this file. Before or after running it:
--   select vault.create_secret('<same value as CRON_SECRET in Vercel>', 'place_cron_secret');
-- To rotate it later:
--   select vault.update_secret(id, '<new value>') from vault.secrets where name = 'place_cron_secret';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.place_dispatch_push()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	secret text;
BEGIN
	SELECT decrypted_secret INTO secret
	FROM vault.decrypted_secrets
	WHERE name = 'place_cron_secret'
	LIMIT 1;

	IF secret IS NULL OR secret = '' THEN
		RETURN;
	END IF;

	PERFORM net.http_get(
		url := 'https://place.dot42.dev/api/push/dispatch',
		headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
		timeout_milliseconds := 10000
	);
END;
$$;

REVOKE ALL ON FUNCTION public.place_dispatch_push() FROM PUBLIC;

DO $$ BEGIN
	REVOKE ALL ON FUNCTION public.place_dispatch_push() FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('place-push-dispatch', 'place-cron-history');

SELECT cron.schedule('place-push-dispatch', '* * * * *', 'SELECT public.place_dispatch_push()');

-- A run every minute adds 1,440 history rows a day. Keep a week.
SELECT cron.schedule(
	'place-cron-history',
	'17 3 * * *',
	$$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);
