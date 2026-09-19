import { createHmac, timingSafeEqual } from 'node:crypto';
import { redirect, type Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOKIE = 'place_admin';
const MAX_AGE = 60 * 60 * 24 * 7;

export function adminPassword(): string | undefined {
	const value = env.CAFE_ADMIN_PASSWORD?.trim() || env.ADMIN_PASSWORD?.trim();
	return value ? value : undefined;
}

export function hasAdminSession(cookies: Cookies): boolean {
	const password = adminPassword();
	const token = cookies.get(COOKIE);
	if (!password || !token) return false;
	return safeEqual(token, sign(password));
}

export function requireAdmin(cookies: Cookies): void {
	if (!hasAdminSession(cookies)) {
		redirect(303, '/admin/login');
	}
}

export function attemptLogin(password: string, cookies: Cookies): boolean {
	const expected = adminPassword();
	if (!expected || !safeEqual(password, expected)) return false;
	cookies.set(COOKIE, sign(expected), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: MAX_AGE
	});
	return true;
}

export function clearAdminSession(cookies: Cookies): void {
	cookies.delete(COOKIE, { path: '/' });
}

function sign(password: string): string {
	return createHmac('sha256', password).update('place-admin-v1').digest('hex');
}

function safeEqual(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	if (a.length !== b.length) {
		timingSafeEqual(a, Buffer.alloc(a.length));
		return false;
	}
	return timingSafeEqual(a, b);
}
