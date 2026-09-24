import { error, redirect } from '@sveltejs/kit';
import type { AuthUser } from '$lib/server/auth';

type VenueAccess = { id: string; createdBy: string | null };

export function isSuperuser(user: AuthUser | null): boolean {
	return Boolean(user && user.role === 'superuser');
}

export function isOwner(user: AuthUser | null): boolean {
	return isSuperuser(user);
}

export function canCreateVenue(user: AuthUser | null): boolean {
	if (!user) return false;
	if (user.role === 'superuser') return true;
	return user.canCreate;
}

export function canEditVenue(user: AuthUser | null, venue: VenueAccess): boolean {
	if (!user) return false;
	if (user.role === 'superuser') return true;
	if (user.role === 'franchise_manager' || user.role === 'place_manager') return user.venueIds.includes(venue.id);
	return user.canEdit && venue.createdBy === user.id;
}

export function canDeleteVenue(user: AuthUser | null, venue: VenueAccess): boolean {
	if (!user) return false;
	if (user.role === 'superuser') return true;
	return user.canEdit && venue.createdBy === user.id;
}

export function requireOwner(user: AuthUser | null): void {
	if (!user) redirect(303, '/login');
	if (!isOwner(user)) error(403, 'Only site admins can do that.');
}

export function requireCanCreate(user: AuthUser | null): void {
	if (!user) redirect(303, '/login');
	if (!canCreateVenue(user)) error(403, 'You do not have permission to create a place.');
}

export function requireVenueEditor(user: AuthUser | null, venue: VenueAccess): void {
	if (!user) redirect(303, '/login');
	if (!canEditVenue(user, venue)) error(403, 'You can only edit places you are allowed to change.');
}

export function requireSuperuser(user: AuthUser | null): void {
	if (!user) redirect(303, '/login');
	if (!isSuperuser(user)) error(403, 'Only a superuser can view accounts.');
}
