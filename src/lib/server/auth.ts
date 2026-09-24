import { createHash, randomBytes } from 'node:crypto';
import { redirect, type Cookies } from '@sveltejs/kit';
import { and, desc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sessions, userVenues, users, venues, type UserRow } from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from '$lib/server/password';

export const SESSION_COOKIE = 'place_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type UserRole = 'user' | 'place_manager' | 'franchise_manager' | 'superuser';
export type AccountKind = 'standard' | 'shop' | 'placement';

export type AuthUser = {
	id: string;
	email: string;
	phone: string | null;
	role: UserRole;
	canCreate: boolean;
	canEdit: boolean;
	firstName: string | null;
	venueId: string | null;
	franchiseId: string | null;
	venueIds: string[];
	emails: string[];
};

export type CreatedPlace = {
	id: string;
	name: string;
	district: string;
	slug: string;
};

export type RegisteredAccount = {
	id: string;
	email: string;
	phone: string | null;
	joinedAt: string;
	lastSeenAt: string | null;
	kind: AccountKind;
	canCreate: boolean;
	canEdit: boolean;
	venueId: string | null;
	managedVenueIds: string[];
	places: CreatedPlace[];
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
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;

	const tokenHash = hashToken(token);
	const now = new Date();
	const [row] = await db
		.select({
			id: users.id,
			email: users.email,
			phone: users.phone,
			role: users.role,
			canCreate: users.canCreate,
			canEdit: users.canEdit,
			firstName: users.firstName,
			venueId: users.venueId,
			franchiseId: users.franchiseId,
			emails: users.emails,
			expiresAt: sessions.expiresAt
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
		.limit(1);

	if (!row) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	return toAuthUser(row, await assignedVenueIds(row));
}

export function hasAdminSession(user: AuthUser | null): boolean {
	return Boolean(user);
}

export function requireAdmin(user: AuthUser | null): void {
	if (!user) redirect(303, '/login');
}

export async function registerUser(input: {
	email: string;
	phone: string;
	password: string;
	firstName: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
	const email = normalizeEmail(input.email);
	const phone = normalizePhone(input.phone);
	const password = input.password;
	const firstName = input.firstName.trim().replace(/\s+/g, ' ');

	if (firstName.length < 1 || firstName.length > 40) {
		return { ok: false, error: 'Enter a first name (up to 40 characters).' };
	}
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
			.values({ email, phone, passwordHash, firstName, role: 'user', canCreate: false, canEdit: false, emails: [] })
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

/** Every account except seeded superusers, with the places each one created. */
export async function listRegisteredUsers(): Promise<RegisteredAccount[]> {
	const roleText = sql<string>`lower(${users.role}::text)`;
	const [people, places, links, seen] = await Promise.all([
		db
			.select({
				id: users.id,
				email: users.email,
				phone: users.phone,
				role: roleText,
				canCreate: users.canCreate,
				canEdit: users.canEdit,
				venueId: users.venueId,
				createdAt: users.createdAt
			})
			.from(users)
			.where(sql`${roleText} <> 'superuser'`)
			.orderBy(desc(users.createdAt)),
		db
			.select({
				id: venues.id,
				name: venues.name,
				district: venues.district,
				slug: venues.slug,
				createdBy: venues.createdBy
			})
			.from(venues)
			.orderBy(venues.name),
		db.select({ userId: userVenues.userId, venueId: userVenues.venueId }).from(userVenues),
		db
			.select({
				userId: sessions.userId,
				lastSeenAt: sql<Date | string | null>`max(${sessions.createdAt})`
			})
			.from(sessions)
			.groupBy(sessions.userId)
	]);

	const lastSeen = new Map(seen.map((row) => [row.userId, row.lastSeenAt]));

	const byCreator = new Map<string, CreatedPlace[]>();
	for (const place of places) {
		if (!place.createdBy) continue;
		const list = byCreator.get(place.createdBy) ?? [];
		list.push({ id: place.id, name: place.name, district: place.district, slug: place.slug });
		byCreator.set(place.createdBy, list);
	}

	const managedByUser = new Map<string, string[]>();
	for (const link of links) {
		const list = managedByUser.get(link.userId) ?? [];
		list.push(link.venueId);
		managedByUser.set(link.userId, list);
	}

	return people.map((row) => {
		const role = String(row.role ?? '').toLowerCase();
		const legacyAdmin = role === 'admin';
		const kind: AccountKind = role === 'manager' ? 'shop' : role === 'editor' ? 'placement' : 'standard';
		return {
			id: row.id,
			email: row.email,
			phone: row.phone,
			joinedAt: formatWhen(row.createdAt) ?? '—',
			lastSeenAt: formatWhen(lastSeen.get(row.id) ?? null),
			kind,
			canCreate: legacyAdmin || row.canCreate,
			canEdit: legacyAdmin || row.canEdit,
			venueId: row.venueId,
			managedVenueIds: managedByUser.get(row.id) ?? [],
			places: byCreator.get(row.id) ?? []
		};
	});
}

export async function setAccountAccess(
	userId: string,
	access: { canCreate: boolean; canEdit: boolean; kind: AccountKind; venueId: string | null; venueIds: string[] }
): Promise<{ ok: true } | { ok: false; error: string }> {
	const [row] = await db
		.select({ id: users.id, role: users.role })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!row) return { ok: false, error: 'That account was not found.' };
	if (row.role === 'superuser') return { ok: false, error: 'Superuser access is not changed here.' };

	const venueIds = [...new Set(access.venueIds)];
	const placementId = access.venueId;
	if (access.kind === 'placement' && !placementId) {
		return { ok: false, error: 'Choose the one placement this account can edit.' };
	}
	const requested = access.kind === 'placement' && placementId ? [placementId] : access.kind === 'shop' ? venueIds : [];
	if (requested.length) {
		const found = await db.select({ id: venues.id }).from(venues).where(inArray(venues.id, requested));
		if (found.length !== requested.length) return { ok: false, error: 'One of those places no longer exists.' };
	}

	const shop = access.kind === 'shop';
	const placement = access.kind === 'placement';
	const role: UserRole = shop ? 'franchise_manager' : placement ? 'place_manager' : 'user';

	await db.transaction(async (tx) => {
		await tx
			.update(users)
			.set({
				canCreate: shop || placement ? false : access.canCreate,
				canEdit: shop || placement ? false : access.canEdit,
				role,
				venueId: placement ? placementId : null,
				updatedAt: new Date()
			})
			.where(eq(users.id, userId));
		await tx.delete(userVenues).where(eq(userVenues.userId, userId));
		if (shop && venueIds.length) {
			await tx.insert(userVenues).values(venueIds.map((venueId) => ({ userId, venueId })));
		}
	});
	return { ok: true };
}

export async function changePassword(
	userId: string,
	current: string,
	next: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (next.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
	const [row] = await db
		.select({ passwordHash: users.passwordHash })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!row || !(await verifyPassword(current, row.passwordHash))) {
		return { ok: false, error: 'Current password is wrong.' };
	}
	await db
		.update(users)
		.set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
		.where(eq(users.id, userId));
	return { ok: true };
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
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: MAX_AGE_MS / 1000
	});
}

export async function clearAdminSession(cookies: Cookies): Promise<void> {
	const token = cookies.get(SESSION_COOKIE);
	if (token) {
		await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
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
	canCreate: boolean | null;
	canEdit: boolean | null;
	firstName: string | null;
	venueId: string | null;
	franchiseId: string | null;
	emails: string[] | null;
}, venueIds: string[] = []): AuthUser {
	const raw = String(row.role ?? '').toLowerCase();
	const role: UserRole =
		raw === 'place_manager' || raw === 'editor'
			? 'place_manager'
			: raw === 'franchise_manager' || raw === 'manager'
				? 'franchise_manager'
				: raw === 'superuser'
					? 'superuser'
					: 'user';
	return {
		id: row.id,
		email: row.email,
		phone: row.phone,
		role,
		canCreate: Boolean(row.canCreate),
		canEdit: Boolean(row.canEdit),
		firstName: row.firstName?.trim() || null,
		venueId: row.venueId,
		franchiseId: row.franchiseId,
		venueIds,
		emails: row.emails ?? []
	};
}

async function assignedVenueIds(row: { id: string; role: string | null; venueId: string | null; franchiseId: string | null }): Promise<string[]> {
	const role = String(row.role ?? '').toLowerCase();
	if ((role === 'place_manager' || role === 'editor') && row.venueId) return [row.venueId];
	if ((role === 'franchise_manager' || role === 'manager') && row.franchiseId) {
		const places = await db
			.select({ id: venues.id })
			.from(venues)
			.where(eq(venues.franchiseId, row.franchiseId));
		return places.map((place) => place.id);
	}
	if (role === 'manager') {
		const links = await db
			.select({ venueId: userVenues.venueId })
			.from(userVenues)
			.where(eq(userVenues.userId, row.id));
		return links.map((link) => link.venueId);
	}
	return [];
}
