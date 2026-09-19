import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { venues, type NewVenue } from './schema';
import { resolveDatabaseUrl } from './env';
import type { OpeningHours, Weekday } from '../../venue';

const WEEK: Weekday[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
];

function hours(open: string, close: string, closed: Weekday[] = []): OpeningHours {
	const next: OpeningHours = { timezone: 'Indian/Mauritius' };
	for (const day of WEEK) {
		next[day] = closed.includes(day)
			? { open: '00:00', close: '00:00', closed: true }
			: { open, close, closed: false };
	}
	return next;
}

function lateOn(base: OpeningHours, close: string, days: Weekday[]): OpeningHours {
	const next: OpeningHours = { ...base };
	for (const day of days) {
		const current = next[day];
		if (current && !current.closed) next[day] = { ...current, close };
	}
	return next;
}

const seedVenues: NewVenue[] = [
	{
		name: 'Bloom',
		slug: 'bloom',
		district: 'Grand Baie',
		lat: -20.01284,
		lng: 57.58092,
		isFeatured: true,
		featuredPriority: 100,
		workInfo: {
			wifi: true,
			wifi_quality: 'fast',
			outlets: true,
			outlet_access: 'plenty',
			laptop_friendly: true,
			noise_level: 'quiet',
			notes: 'Upstairs tables are reserved for laptops. Ask for the password at the bar.'
		},
		openingHours: hours('07:30', '17:00', ['sunday']),
		announcements: [
			{
				id: 'bloom-private-event',
				type: 'event',
				title: 'Private event — upstairs closed',
				body: 'A brand shoot has booked the mezzanine until 16:00. Ground floor seating is open as usual.',
				starts_at: '2026-09-19T12:00:00+04:00',
				ends_at: '2026-09-19T16:00:00+04:00'
			}
		],
		specials: [
			{
				id: 'bloom-pastry-week',
				title: 'Pastry week',
				body: 'Guava danishes and coconut financiers, Rs 85. Pair with any coffee.',
				starts_at: '2026-09-20T07:30:00+04:00',
				ends_at: '2026-09-27T17:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'Espresso', price_mur: 90 },
					{ name: 'Flat white', description: 'Double shot, locally roasted.', price_mur: 140 },
					{ name: 'Iced latte', price_mur: 150, tags: ['cold'] }
				]
			},
			{
				category: 'Food',
				items: [
					{ name: 'Avocado toast', description: 'Sourdough, chilli oil, lime.', price_mur: 280, tags: ['veg'] },
					{ name: 'Banana bread', price_mur: 95 }
				]
			}
		],
		contact: {
			phone: '+230 5720 4411',
			instagram: 'bloomgrandbaie',
			website: 'https://bloom.example.mu'
		}
	},
	{
		name: 'The Workshop',
		slug: 'the-workshop',
		district: 'Ebène',
		lat: -20.24361,
		lng: 57.48942,
		isFeatured: true,
		featuredPriority: 80,
		workInfo: {
			wifi: true,
			wifi_quality: 'fast',
			outlets: true,
			outlet_access: 'plenty',
			laptop_friendly: true,
			noise_level: 'moderate',
			notes: 'Standing desks by the window. Calls are fine with headphones.'
		},
		openingHours: lateOn(hours('07:00', '19:00'), '22:00', ['friday', 'saturday']),
		announcements: [
			{
				id: 'workshop-blend',
				type: 'notice',
				title: 'New house blend',
				body: 'Ebène roast #4 is on bar this week — chocolate and cane sugar.',
				starts_at: '2026-09-15T07:00:00+04:00',
				ends_at: '2026-09-22T19:00:00+04:00'
			}
		],
		specials: [
			{
				id: 'workshop-desk-lunch',
				title: 'Desk lunch Rs 250',
				body: 'Any coffee plus baguette or hummus bowl. Weekdays until 14:00.',
				starts_at: '2026-09-15T07:00:00+04:00',
				ends_at: '2026-09-26T19:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'Batch brew', price_mur: 80 },
					{ name: 'Cappuccino', price_mur: 130 },
					{ name: 'Oat cortado', price_mur: 145, tags: ['vegan'] }
				]
			},
			{
				category: 'Desk lunch',
				items: [
					{ name: 'Chicken baguette', price_mur: 220 },
					{ name: 'Hummus bowl', price_mur: 210, tags: ['vegan'] }
				]
			}
		],
		contact: {
			phone: '+230 468 2201',
			instagram: 'workshop.ebene',
			email: 'desk@workshop.example.mu'
		}
	},
	{
		name: 'Le Caudan Roastery',
		slug: 'le-caudan-roastery',
		district: 'Port Louis',
		lat: -20.16095,
		lng: 57.49874,
		isFeatured: true,
		featuredPriority: 60,
		workInfo: {
			wifi: true,
			wifi_quality: 'ok',
			outlets: true,
			outlet_access: 'some',
			laptop_friendly: true,
			noise_level: 'moderate',
			notes: 'Harbour-facing tables get noisy at lunch. Better after 14:00.'
		},
		openingHours: lateOn(hours('08:00', '18:00', ['sunday']), '23:00', ['friday', 'saturday']),
		announcements: [],
		specials: [
			{
				id: 'caudan-harbour-hour',
				title: 'Harbour hour',
				body: 'Free filter coffee with any bakery item after 16:00.',
				starts_at: '2026-09-18T08:00:00+04:00',
				ends_at: '2026-09-21T18:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'Espresso', price_mur: 85 },
					{ name: 'Long black', price_mur: 110 },
					{ name: 'Vanilla latte', price_mur: 155 }
				]
			},
			{
				category: 'Bakery',
				items: [
					{ name: 'Butter croissant', price_mur: 70 },
					{ name: 'Tuna melt', price_mur: 190 }
				]
			}
		],
		contact: {
			phone: '+230 211 6565',
			instagram: 'caudanroastery',
			website: 'https://caudan.example.mu'
		}
	},
	{
		name: 'Tamarin Coffee Lab',
		slug: 'tamarin-coffee-lab',
		district: 'Tamarin',
		lat: -20.3254,
		lng: 57.3708,
		isFeatured: false,
		featuredPriority: 0,
		workInfo: {
			wifi: true,
			wifi_quality: 'ok',
			outlets: true,
			outlet_access: 'some',
			laptop_friendly: true,
			noise_level: 'quiet',
			notes: 'Small room. Two four-tops max. No speakerphone calls.'
		},
		openingHours: hours('08:00', '16:00', ['monday']),
		announcements: [],
		specials: [
			{
				id: 'tcl-flight',
				title: 'Pour-over flight',
				body: 'Three 150ml pours, Rs 220. Thursday to Sunday.',
				starts_at: '2026-09-24T08:00:00+04:00',
				ends_at: '2026-09-28T16:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'V60', description: 'Rotating African lots.', price_mur: 160 },
					{ name: 'Flat white', price_mur: 135 },
					{ name: 'Cold brew', price_mur: 140, tags: ['cold'] }
				]
			},
			{
				category: 'Food',
				items: [{ name: 'Granola bowl', price_mur: 180, tags: ['veg'] }]
			}
		],
		contact: {
			instagram: 'tamarincoffeelab',
			phone: '+230 483 1090'
		}
	},
	{
		name: 'West Coast Espresso',
		slug: 'west-coast-espresso',
		district: 'Tamarin',
		lat: -20.3281,
		lng: 57.3682,
		isFeatured: false,
		featuredPriority: 0,
		workInfo: {
			wifi: true,
			wifi_quality: 'slow',
			outlets: false,
			outlet_access: 'none',
			laptop_friendly: false,
			noise_level: 'loud',
			notes: 'Sunset terrace. Fine for a short email, not a workday.'
		},
		openingHours: hours('07:00', '14:00'),
		announcements: [],
		specials: [
			{
				id: 'wce-sunrise',
				title: 'Sunrise roll',
				body: 'Bacon roll and espresso Rs 200 before 10:00.',
				starts_at: '2026-09-17T07:00:00+04:00',
				ends_at: '2026-09-21T14:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'Espresso', price_mur: 80 },
					{ name: 'Iced americano', price_mur: 110, tags: ['cold'] }
				]
			},
			{
				category: 'Food',
				items: [{ name: 'Bacon roll', price_mur: 160 }]
			}
		],
		contact: {
			phone: '+230 483 4412',
			instagram: 'westcoastespresso'
		}
	},
	{
		name: 'Port Louis Grounds',
		slug: 'port-louis-grounds',
		district: 'Port Louis',
		lat: -20.1642,
		lng: 57.5011,
		isFeatured: false,
		featuredPriority: 0,
		workInfo: {
			wifi: true,
			wifi_quality: 'fast',
			outlets: true,
			outlet_access: 'plenty',
			laptop_friendly: true,
			noise_level: 'moderate',
			notes: 'AC throughout. Best weekday mornings before court traffic.'
		},
		openingHours: hours('06:30', '17:30', ['sunday']),
		announcements: [
			{
				id: 'plg-roadworks',
				type: 'alert',
				title: 'Street closed on Royal Road',
				body: 'Enter from Queen Street. Takeaway window is unaffected.',
				starts_at: '2026-09-18T06:00:00+04:00',
				ends_at: '2026-09-20T18:00:00+04:00'
			}
		],
		specials: [
			{
				id: 'plg-creole-week',
				title: 'Creole breakfast week',
				body: 'Rougaille eggs and dholl puri set, Rs 140.',
				starts_at: '2026-09-22T06:30:00+04:00',
				ends_at: '2026-09-26T11:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'Espresso', price_mur: 75 },
					{ name: 'Piccolo', price_mur: 100 },
					{ name: 'Iced flat white', price_mur: 145, tags: ['cold'] }
				]
			},
			{
				category: 'Food',
				items: [
					{ name: 'Egg croissant', price_mur: 150 },
					{ name: 'Dhal puri set', price_mur: 120 }
				]
			}
		],
		contact: {
			phone: '+230 208 3300',
			instagram: 'plgrounds',
			email: 'hello@grounds.example.mu'
		}
	},
	{
		name: 'Moka Mill',
		slug: 'moka-mill',
		district: 'Moka',
		lat: -20.2189,
		lng: 57.4961,
		isFeatured: false,
		featuredPriority: 0,
		workInfo: {
			wifi: true,
			wifi_quality: 'ok',
			outlets: true,
			outlet_access: 'some',
			laptop_friendly: true,
			noise_level: 'quiet',
			notes: 'Garden tables have no power. Indoor booths do.'
		},
		openingHours: hours('08:30', '16:30', ['saturday', 'sunday']),
		announcements: [],
		specials: [
			{
				id: 'moka-lemon',
				title: 'Lemon cake + filter',
				body: 'Slice and a mug for Rs 140, Monday to Friday.',
				starts_at: '2026-09-22T08:30:00+04:00',
				ends_at: '2026-09-26T16:30:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'Filter', price_mur: 90 },
					{ name: 'Mocha', price_mur: 155 }
				]
			},
			{
				category: 'Food',
				items: [
					{ name: 'Quiche of the day', price_mur: 200 },
					{ name: 'Lemon cake', price_mur: 90 }
				]
			}
		],
		contact: {
			phone: '+230 433 1188',
			instagram: 'mokamill'
		}
	},
	{
		name: 'Grand Baie Social',
		slug: 'grand-baie-social',
		district: 'Grand Baie',
		lat: -20.0164,
		lng: 57.5781,
		isFeatured: false,
		featuredPriority: 0,
		workInfo: {
			wifi: false,
			outlets: false,
			outlet_access: 'none',
			laptop_friendly: false,
			noise_level: 'loud',
			notes: 'DJ after 18:00 on weekends. Not a work spot.'
		},
		openingHours: hours('09:00', '22:00'),
		announcements: [
			{
				id: 'gbs-party',
				type: 'event',
				title: 'Saturday sessions',
				body: 'Live DJ from 18:00. Kitchen stays open. Laptops put away after 17:00.',
				starts_at: '2026-09-19T17:00:00+04:00',
				ends_at: '2026-09-20T00:00:00+04:00'
			}
		],
		specials: [
			{
				id: 'gbs-tonic',
				title: 'Espresso tonic Rs 140',
				body: 'Happy-hour price from 17:00. Kitchen stays open.',
				starts_at: '2026-09-19T17:00:00+04:00',
				ends_at: '2026-09-20T00:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Drinks',
				items: [
					{ name: 'Espresso tonic', price_mur: 180 },
					{ name: 'Fresh lime soda', price_mur: 90 }
				]
			},
			{
				category: 'Food',
				items: [
					{ name: 'Fish burger', price_mur: 320 },
					{ name: 'Fries', price_mur: 90 }
				]
			}
		],
		contact: {
			phone: '+230 263 9090',
			instagram: 'grandbaiesocial',
			website: 'https://social.example.mu'
		}
	},
	{
		name: 'Ebène Desk',
		slug: 'ebene-desk',
		district: 'Ebène',
		lat: -20.2462,
		lng: 57.4915,
		isFeatured: false,
		featuredPriority: 0,
		workInfo: {
			wifi: true,
			wifi_quality: 'fast',
			outlets: true,
			outlet_access: 'plenty',
			laptop_friendly: true,
			noise_level: 'quiet',
			notes: 'Day-pass coworking in the back room. Cafe seating is first-come.'
		},
		openingHours: hours('07:30', '22:00', ['sunday']),
		announcements: [],
		specials: [
			{
				id: 'desk-pass',
				title: 'Day-pass 20% off',
				body: 'Back-room desk including unlimited batch brew.',
				starts_at: '2026-09-01T07:30:00+04:00',
				ends_at: '2026-09-30T22:00:00+04:00'
			},
			{
				id: 'desk-tasting',
				title: 'Evening espresso tasting',
				body: 'Four shots, guest roaster. Thursday 18:00. Rs 180.',
				starts_at: '2026-09-25T18:00:00+04:00',
				ends_at: '2026-09-25T20:00:00+04:00'
			}
		],
		menu: [
			{
				category: 'Coffee',
				items: [
					{ name: 'Americano', price_mur: 100 },
					{ name: 'Flat white', price_mur: 135 },
					{ name: 'Matcha latte', price_mur: 170 }
				]
			},
			{
				category: 'Food',
				items: [
					{ name: 'Caesar wrap', price_mur: 210 },
					{ name: 'Overnight oats', price_mur: 130, tags: ['veg'] }
				]
			}
		],
		contact: {
			phone: '+230 454 7001',
			instagram: 'ebenedesk',
			website: 'https://desk.example.mu'
		}
	}
];

async function seed() {
	const databaseUrl = resolveDatabaseUrl();
	if (!databaseUrl) throw new Error('DATABASE_URL is not set');

	const client = postgres(databaseUrl, {
		ssl: databaseUrl.includes('neon.tech') ? 'require' : false,
		prepare: databaseUrl.includes('-pooler') ? false : undefined,
		max: 1
	});
	const db = drizzle(client);

	await client.unsafe(`
		ALTER TABLE venues
		ADD COLUMN IF NOT EXISTS specials JSONB NOT NULL DEFAULT '[]'::jsonb;
	`);
	await client.unsafe(`
		CREATE INDEX IF NOT EXISTS idx_venues_specials ON venues USING gin (specials);
	`);

	await db.delete(venues);
	await db.insert(venues).values(seedVenues);

	await client.unsafe(`
		CREATE OR REPLACE FUNCTION set_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await client.unsafe(`
		DROP TRIGGER IF EXISTS venues_updated_at ON venues;
		CREATE TRIGGER venues_updated_at
		BEFORE UPDATE ON venues
		FOR EACH ROW
		EXECUTE FUNCTION set_updated_at();
	`);

	await client.end();
	console.log(`Seeded ${seedVenues.length} venues.`);
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
