import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid
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
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_venues_featured').on(table.isFeatured.desc(), table.featuredPriority.desc()),
		index('idx_venues_district').on(table.district),
		index('idx_venues_work_info').using('gin', table.workInfo),
		index('idx_venues_menu').using('gin', table.menu.op('jsonb_path_ops')),
		index('idx_venues_specials').using('gin', table.specials)
	]
);

export type VenueRow = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
