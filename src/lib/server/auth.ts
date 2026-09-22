import { createHash, randomBytes } from 'node:crypto';
import { redirect, type Cookies } from '@sveltejs/kit';
import { and, desc, eq, gt, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sessions, users, type UserRow } from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from '$lib/server/password';

const COOKIE = 'place_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type UserRole = 'admin' | 'editor' | 'superuser';

export type AuthUser = {
	id: string;
	email: string;
	phone: string | null;
	role: UserRole;
	venueId: string | null;
	emails: string[];
};

export type PlaceOwnerAccount = {
	id: string;
	email: string;
	phone: string | null;
	joinedAt: string;
	lastSeenAt: string | null;
};

export function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
	return value.replace(/\D/g, '');
}

export function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function readSession(cookies: Cookies): Promise<AuthUser | null> {
	const token = cookies.get(COOKIE);
	if (!token) return null;

	const tokenHash = hashToken(token);
	const now = new Date();
	const [row] = await db
		.select({
			id: users.id,
			email: users.email,
			phone: users.phone,
			role: users.role,
			venueId: users.venueId,
			emails: users.emails,
			expiresAt: sessions.expiresAt
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
		.limit(1);

	if (!row) {
		cookies.delete(COOKIE, { path: '/' });
		return null;
	}

	return toAuthUser(row);
}

export function hasAdminSession(user: AuthUser | null): boolean {
	return Boolean(user);
}

export function requireAdmin(user: AuthUser | null): void {
	if (!user) redirect(303, '/admin/login');
}

export async function registerUser(input: {
	email: string;
	phone: string;
	password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
	const email = normalizeEmail(input.email);
	const phone = normalizePhone(input.phone);
	const password = input.password;

	if (!isEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
	if (phone.length < 8 || phone.length > 15) {
		return { ok: false, error: 'Enter a valid phone number (8–15 digits).' };
	}
	if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

	try {
		const taken = await emailTaken(email);
		if (taken) return { ok: false, error: 'That email is already registered.' };

		const [phoneTaken] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
		if (phoneTaken) return { ok: false, error: 'That phone number is already registered.' };

		const passwordHash = await hashPassword(password);
		const [row] = await db
			.insert(users)
			.values({ email, phone, passwordHash, role: 'admin', emails: [] })
			.returning();
		if (!row) return { ok: false, error: 'Could not create the account.' };
		return { ok: true, user: toAuthUser(row) };
	} catch (error) {
		console.error(error);
		if (error && typeof error === 'object' && 'cause' in error) console.error((error as { cause: unknown }).cause);
		return { ok: false, error: 'Could not create the account. Try again in a moment.' };
	}
}

const MAURITIUS_TIME: Intl.DateTimeFormatOptions = {
	timeZone: 'Indian/Mauritius',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
};

function formatWhen(value: Date | string | null): string | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat('en-GB', MAURITIUS_TIME).format(date);
}

/** Registered place owners. Superusers and place editors are omitted. */
export async function listPlaceOwners(): Promise<PlaceOwnerAccount[]> {
	const lastSeenAt = sql<Date | string | null>`(
		select max(${sessions.createdAt})
		from ${sessions}
		where ${sessions.userId} = ${users.id}
	)`;
	const rows = await db
		.select({
			id: users.id,
			email: users.email,
			phone: users.phone,
			createdAt: users.createdAt,
			lastSeenAt
		})
		.from(users)
		.where(eq(users.role, 'admin'))
		.orderBy(desc(users.createdAt));

	return rows.map((row) => ({
		id: row.id,
		email: row.email,
		phone: row.phone,
		joinedAt: formatWhen(row.createdAt) ?? '—',
		lastSeenAt: formatWhen(row.lastSeenAt)
	}));
}

export async function loginUser(
	identifier: string,
	password: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
	const trimmed = identifier.trim();
	if (!trimmed || !password) return { ok: false, error: 'Enter your email or phone, and password.' };

	try {
		const row = isEmail(trimmed)
			? await findUserByEmail(normalizeEmail(trimmed))
			: (
					await db
						.select()
						.from(users)
						.where(eq(users.phone, normalizePhone(trimmed)))
						.limit(1)
				)[0];

		if (!row || !(await verifyPassword(password, row.passwordHash))) {
			return { ok: false, error: 'Wrong email/phone or password.' };
		}

		return { ok: true, user: toAuthUser(row) };
	} catch (error) {
		console.error(error);
		if (error && typeof error === 'object' && 'cause' in error) console.error((error as { cause: unknown }).cause);
		return { ok: false, error: 'Could not sign in. Try again in a moment.' };
	}
}

export async function createSession(userId: string, cookies: Cookies): Promise<void> {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + MAX_AGE_MS);
	await db.insert(sessions).values({
		userId,
		tokenHash: hashToken(token),
		expiresAt
	});
	cookies.set(COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: MAX_AGE_MS / 1000
	});
}

export async function clearAdminSession(cookies: Cookies): Promise<void> {
	const token = cookies.get(COOKIE);
	if (token) {
		await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
	}
	cookies.delete(COOKIE, { path: '/' });
}

async function findUserByEmail(email: string): Promise<UserRow | undefined> {
	const [row] = await db
		.select()
		.from(users)
		.where(or(eq(users.email, email), sql`${email} = ANY(${users.emails})`))
		.limit(1);
	return row;
}

async function emailTaken(email: string): Promise<boolean> {
	return Boolean(await findUserByEmail(email));
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function toAuthUser(row: {
	id: string;
	email: string;
	phone: string | null;
	role: string | null;
	venueId: string | null;
	emails: string[] | null;
}): AuthUser {
	const role: UserRole = row.role === 'editor' || row.role === 'superuser' ? row.role : 'admin';
	return {
		id: row.id,
		email: row.email,
		phone: row.phone,
		role,
		venueId: row.venueId,
		emails: row.emails ?? []
	};
}
