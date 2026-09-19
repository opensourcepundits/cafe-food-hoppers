import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { redirect, type Cookies } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sessions, users, type UserRow } from '$lib/server/db/schema';

const scrypt = promisify(scryptCallback);
const COOKIE = 'place_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const KEY_LEN = 64;

export type AuthUser = {
	id: string;
	email: string;
	phone: string;
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

	return { id: row.id, email: row.email, phone: row.phone };
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
		const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
		if (emailTaken) return { ok: false, error: 'That email is already registered.' };

		const [phoneTaken] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
		if (phoneTaken) return { ok: false, error: 'That phone number is already registered.' };

		const passwordHash = await hashPassword(password);
		const [row] = await db.insert(users).values({ email, phone, passwordHash }).returning();
		if (!row) return { ok: false, error: 'Could not create the account.' };
		return { ok: true, user: toAuthUser(row) };
	} catch (error) {
		console.error(error);
		if (error && typeof error === 'object' && 'cause' in error) console.error((error as { cause: unknown }).cause);
		return { ok: false, error: 'Could not create the account. Try again in a moment.' };
	}
}

export async function loginUser(
	identifier: string,
	password: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
	const trimmed = identifier.trim();
	if (!trimmed || !password) return { ok: false, error: 'Enter your email or phone, and password.' };

	try {
		const [row] = isEmail(trimmed)
			? await db.select().from(users).where(eq(users.email, normalizeEmail(trimmed))).limit(1)
			: await db.select().from(users).where(eq(users.phone, normalizePhone(trimmed))).limit(1);

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

function toAuthUser(row: UserRow): AuthUser {
	return { id: row.id, email: row.email, phone: row.phone };
}
