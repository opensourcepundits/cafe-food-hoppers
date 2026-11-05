export const SITE_SEVERITIES = [
	{ id: 'notice', label: 'Notice', color: '#1d4e89', tint: '#e7eef6' },
	{ id: 'caution', label: 'Caution', color: '#a16207', tint: '#fbf3d8' },
	{ id: 'warning', label: 'Warning', color: '#b4532a', tint: '#fde8dc' },
	{ id: 'critical', label: 'Critical', color: '#b42318', tint: '#fde8e6' }
] as const;

export type SiteSeverity = (typeof SITE_SEVERITIES)[number]['id'];

export const DEFAULT_SITE_STATUS_TEXT = 'Curfew in progress';
export const SITE_STATUS_TEXT_LIMIT = 80;

export type PublicSiteStatus = {
	active: boolean;
	text: string;
	severity: SiteSeverity;
};

export function isSiteSeverity(value: string): value is SiteSeverity {
	return SITE_SEVERITIES.some((item) => item.id === value);
}

export function siteSeverityStyle(severity: SiteSeverity) {
	return SITE_SEVERITIES.find((item) => item.id === severity) ?? SITE_SEVERITIES[2];
}
