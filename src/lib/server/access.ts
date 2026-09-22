import { error, redirect } from '@sveltejs/kit';
import type { AuthUser } from '$lib/server/auth';

export function isSuperuser(user: AuthUser | null): boolean {
	return Boolean(user && user.role === 'superuser');
}

export function isOwner(user: AuthUser | null): boolean {
	return Boolean(user && (user.role === 'admin' || user.role === 'superuser'));
}

export function canEditVenue(user: AuthUser | null, venueId: string): boolean {
	if (!user) return false;
	if (user.role === 'admin' || user.role === 'superuser') return true;
	return user.role === 'editor' && user.venueId === venueId;
}

export function requireOwner(user: AuthUser | null): void {
	if (!user) redirect(303, '/admin/login');
	if (!isOwner(user)) error(403, 'Only site admins can do that.');
}

export function requireSuperuser(user: AuthUser | null): void {
	if (!user) redirect(303, '/admin/login');
	if (!isSuperuser(user)) error(403, 'Only a superuser can view accounts.');
}

export function requireVenueEditor(user: AuthUser | null, venueId: string): void {
	if (!user) redirect(303, '/admin/login');
	if (!canEditVenue(user, venueId)) error(403, 'You can only edit the place assigned to you.');
}
