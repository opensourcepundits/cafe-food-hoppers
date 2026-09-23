import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import type { Announcement, Contact, MenuCategory, OpeningHours, Special, WorkInfo } from '../../venue';

export const venues = pgTable(
	'venues',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		district: text('district').notNull(),
		lat: numeric('lat', { precision: 9, scale: 6, mode: 'number' }),
		lng: numeric('lng', { precision: 9, scale: 6, mode: 'number' }),
		isFeatured: boolean('is_featured').notNull().default(false),
		featuredPriority: integer('featured_priority').notNull().default(0),
		workInfo: jsonb('work_info')
			.$type<WorkInfo>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		openingHours: jsonb('opening_hours')
			.$type<OpeningHours>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		announcements: jsonb('announcements')
			.$type<Announcement[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		specials: jsonb('specials')
			.$type<Special[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		menu: jsonb('menu')
			.$type<MenuCategory[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		contact: jsonb('contact')
			.$type<Contact>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdBy: uuid('created_by').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
		speedVerified: boolean('speed_verified').notNull().default(false),
		noiseVerified: boolean('noise_verified').notNull().default(false),
		wifiTestedAt: timestamp('wifi_tested_at', { withTimezone: true }),
		wifiDownloadMbps: numeric('wifi_download_mbps', { precision: 6, scale: 1, mode: 'number' }),
		wifiUploadMbps: numeric('wifi_upload_mbps', { precision: 6, scale: 1, mode: 'number' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_venues_featured').on(table.isFeatured.desc(), table.featuredPriority.desc()),
		index('idx_venues_district').on(table.district),
		index('idx_venues_work_info').using('gin', table.workInfo),
		index('idx_venues_menu').using('gin', table.menu.op('jsonb_path_ops')),
		index('idx_venues_specials').using('gin', table.specials),
		index('idx_venues_created_by').on(table.createdBy)
	]
);

export type VenueRow = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		email: text('email').notNull().unique(),
		phone: text('phone').unique(),
		passwordHash: text('password_hash').notNull(),
		role: text('role').$type<'user' | 'admin' | 'editor' | 'manager' | 'superuser'>().notNull().default('user'),
		canCreate: boolean('can_create').notNull().default(false),
		canEdit: boolean('can_edit').notNull().default(false),
		venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
		emails: text('emails').array().notNull().default(sql`'{}'::text[]`),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_users_venue').on(table.venueId)]
);

/** Places a shop account can monitor and edit. Placement accounts use users.venue_id instead. */
export const userVenues = pgTable(
	'user_venues',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		venueId: uuid('venue_id')
			.notNull()
			.references(() => venues.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.userId, table.venueId] }), index('idx_user_venues_venue').on(table.venueId)]
);

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_sessions_user').on(table.userId), index('idx_sessions_expires').on(table.expiresAt)]
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
