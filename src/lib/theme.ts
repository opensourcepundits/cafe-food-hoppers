export type SiteTheme = 'professional' | 'casual';

const storageKey = 'place-theme';

export function readSiteTheme(): SiteTheme {
	if (typeof localStorage === 'undefined') return 'professional';
	return localStorage.getItem(storageKey) === 'casual' ? 'casual' : 'professional';
}

export function applySiteTheme(theme: SiteTheme) {
	if (theme === 'casual') document.documentElement.setAttribute('data-theme', 'casual');
	else document.documentElement.removeAttribute('data-theme');
}

export function saveSiteTheme(theme: SiteTheme) {
	localStorage.setItem(storageKey, theme);
	applySiteTheme(theme);
}
