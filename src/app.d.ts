// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			admin: boolean;
			user: {
				id: string;
				email: string;
				phone: string | null;
				role: 'user' | 'admin' | 'editor' | 'manager' | 'superuser';
				canCreate: boolean;
				canEdit: boolean;
				firstName: string | null;
				venueId: string | null;
				venueIds: string[];
				emails: string[];
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
