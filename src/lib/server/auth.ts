import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { redirect, type Cookies } from '@sveltejs/kit';
import { and, eq, gt, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sessions, users, venues, type UserRow } from '$lib/server/db/schema';

const scrypt = promisify(scryptCallback);
const COOKIE = 'place_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const KEY_LEN = 64;

export type UserRole = 'admin' | 'editor';

export type AuthUser = {
	id: string;
	email: string;
	phone: string | null;
	role: UserRole;
	venueId: string | null;
	emails: string[];
};

export type StaffUser = AuthUser & {
	venueName: string | null;
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

export function parseEmails(value: string): string[] {
	const seen = new Set<string>();
	const emails: string[] = [];
	for (const part of value.split(/[\s,;]+/)) {
		const email = normalizeEmail(part);
		if (!email || seen.has(email)) continue;
		seen.add(email);
		emails.push(email);
	}
	return emails;
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

	return {
		id: row.id,
		email: row.email,
		phone: row.phone,
		role: row.role === 'editor' ? 'editor' : 'admin',
		venueId: row.venueId,
		emails: row.emails ?? []
	};
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

export async function createStaffUser(input: {
	emails: string;
	password: string;
	venueId: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
	const emails = parseEmails(input.emails);
	const password = input.password;
	const venueId = input.venueId.trim();

	if (!emails.length) return { ok: false, error: 'Enter at least one email address.' };
	if (emails.some((email) => !isEmail(email))) return { ok: false, error: 'One of the emails is not valid.' };
	if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
	if (!venueId) return { ok: false, error: 'Assign a place.' };

	try {
		const [venue] = await db.select({ id: venues.id }).from(venues).where(eq(venues.id, venueId)).limit(1);
		if (!venue) return { ok: false, error: 'That place was not found.' };

		for (const email of emails) {
			if (await emailTaken(email)) {
				return { ok: false, error: `${email} is already registered.` };
			}
		}

		const [primary, ...aliases] = emails;
		const passwordHash = await hashPassword(password);
		const [row] = await db
			.insert(users)
			.values({
				email: primary,
				phone: null,
				passwordHash,
				role: 'editor',
				venueId,
				emails: aliases
			})
			.returning();
		if (!row) return { ok: false, error: 'Could not create the user.' };
		return { ok: true, user: toAuthUser(row) };
	} catch (error) {
		console.error(error);
		if (error && typeof error === 'object' && 'cause' in error) console.error((error as { cause: unknown }).cause);
		return { ok: false, error: 'Could not create the user. Run the staff SQL, then try again.' };
	}
}

export async function listStaff(): Promise<StaffUser[]> {
	const rows = await db
		.select({
			id: users.id,
			email: users.email,
			phone: users.phone,
			role: users.role,
			venueId: users.venueId,
			emails: users.emails,
			venueName: venues.name
		})
		.from(users)
		.leftJoin(venues, eq(users.venueId, venues.id))
		.orderBy(users.createdAt);

	return rows.map((row) => ({
		...toAuthUser(row),
		venueName: row.venueName
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

async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = (await scrypt(password, salt, KEY_LEN)) as Buffer;
	return `${salt.toString('hex')}:${key.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const expected = Buffer.from(hashHex, 'hex');
	const salt = Buffer.from(saltHex, 'hex');
	const key = (await scrypt(password, salt, expected.length)) as Buffer;
	if (key.length !== expected.length) return false;
	return timingSafeEqual(key, expected);
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
	return {
		id: row.id,
		email: row.email,
		phone: row.phone,
		role: row.role === 'editor' ? 'editor' : 'admin',
		venueId: row.venueId,
		emails: row.emails ?? []
	};
}
