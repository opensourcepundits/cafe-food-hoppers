import { eq } from 'drizzle-orm';
import {
	DEFAULT_SITE_STATUS_TEXT,
	isSiteSeverity,
	SITE_STATUS_TEXT_LIMIT,
	type PublicSiteStatus,
	type SiteSeverity
} from '$lib/site-status';
import { db } from '$lib/server/db';
import { siteStatus } from '$lib/server/db/schema';

const ROW_ID = 'current';

const hidden: PublicSiteStatus = {
	active: false,
	text: DEFAULT_SITE_STATUS_TEXT,
	severity: 'warning'
};

export async function getSiteStatus(): Promise<PublicSiteStatus> {
	try {
		const [row] = await db.select().from(siteStatus).where(eq(siteStatus.id, ROW_ID)).limit(1);
		if (!row) return hidden;
		return {
			active: row.active,
			text: row.text.trim() || DEFAULT_SITE_STATUS_TEXT,
			severity: isSiteSeverity(row.severity) ? row.severity : 'warning'
		};
	} catch (cause) {
		console.error(cause);
		return hidden;
	}
}

export async function saveSiteStatus(input: {
	active: boolean;
	text: string;
	severity: SiteSeverity;
}): Promise<void> {
	const text = input.text.trim().replace(/\s+/g, ' ');
	if (!text) throw new Error('Write a message for the tag.');
	if (text.length > SITE_STATUS_TEXT_LIMIT) {
		throw new Error(`Keep the message to ${SITE_STATUS_TEXT_LIMIT} characters.`);
	}
	const now = new Date();
	await db
		.insert(siteStatus)
		.values({
			id: ROW_ID,
			active: input.active,
			text,
			severity: input.severity,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: siteStatus.id,
			set: {
				active: input.active,
				text,
				severity: input.severity,
				updatedAt: now
			}
		});
}
