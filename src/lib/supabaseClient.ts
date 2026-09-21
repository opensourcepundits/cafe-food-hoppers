import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

export function getSupabase() {
	const url = env.PUBLIC_SUPABASE_URL?.trim();
	const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
	if (!url || !key) return null;
	return createClient(url, key);
}
