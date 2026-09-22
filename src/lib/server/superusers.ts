import type { Sql } from 'postgres';
import { hashPassword, verifyPassword } from './password';

export type SeedSuperuser = {
	email: string;
	password: string;
};

function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Accounts from env. Registration cannot create this role. */
export function superuserAccounts(env: Record<string, string | undefined>): SeedSuperuser[] {
	const accounts: SeedSuperuser[] = [];
	const seen = new Set<string>();

	const add = (email: string, password: string) => {
		const normalized = email.trim().toLowerCase();
		if (!isEmail(normalized) || password.length < 8 || seen.has(normalized)) return;
		seen.add(normalized);
		accounts.push({ email: normalized, password });
	};

	const json = env.SUPERUSER_ACCOUNTS?.trim();
	if (json) {
		try {
			const parsed = JSON.parse(json) as { email?: string; password?: string }[];
			if (Array.isArray(parsed)) {
				for (const account of parsed) add(account.email ?? '', account.password ?? '');
			}
		} catch (error) {
			console.error('SUPERUSER_ACCOUNTS is not valid JSON.', error);
		}
	}

	add(env.SUPERUSER_EMAIL ?? '', env.SUPERUSER_PASSWORD ?? '');
	return accounts;
}

export async function upsertSuperusers(
	sql: Sql,
	env: Record<string, string | undefined>
): Promise<number> {
	const accounts = superuserAccounts(env);
	for (const account of accounts) {
		const existing = await sql<{ password_hash: string; role: string }[]>`
			SELECT password_hash, role FROM users WHERE email = ${account.email} LIMIT 1
		`;
		const row = existing[0];
		if (row?.role === 'superuser' && (await verifyPassword(account.password, row.password_hash))) {
			continue;
		}

		const passwordHash = await hashPassword(account.password);
		await sql`
			INSERT INTO users (email, phone, password_hash, role, emails)
			VALUES (${account.email}, ${null}, ${passwordHash}, 'superuser', '{}')
			ON CONFLICT (email) DO UPDATE
			SET role = 'superuser',
				password_hash = EXCLUDED.password_hash,
				updated_at = NOW()
		`;
	}
	return accounts.length;
}
