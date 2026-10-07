export const siteFonts = [
	{ id: 'plex', label: 'IBM Plex', family: '' },
	{ id: 'libron', label: 'Libron', family: 'Libron' },
	{ id: 'lato', label: 'Lato', family: 'Lato' },
	{ id: 'gumbo', label: 'Gumbo', family: 'Gumbo' }
] as const;

export type SiteFont = (typeof siteFonts)[number]['id'];

const stacks: Record<Exclude<SiteFont, 'plex'>, string> = {
	libron: '"Libron", ui-sans-serif, system-ui, sans-serif',
	lato: '"Lato", ui-sans-serif, system-ui, sans-serif',
	gumbo: '"Gumbo", ui-sans-serif, system-ui, sans-serif'
};

export function isSiteFont(value: string | null): value is SiteFont {
	return siteFonts.some((item) => item.id === value);
}

export function siteFontFamily(font: SiteFont): string {
	return siteFonts.find((item) => item.id === font)?.family ?? '';
}

export function applySiteFont(font: SiteFont): void {
	const root = document.documentElement;
	const stack = font === 'plex' ? '' : stacks[font];
	if (stack) root.setAttribute('data-font', font);
	else root.removeAttribute('data-font');

	if (stack) {
		root.style.setProperty('--font-sans', stack);
		root.style.setProperty('--font-mono', stack);
	} else {
		root.style.removeProperty('--font-sans');
		root.style.removeProperty('--font-mono');
	}

	let node = document.getElementById('site-font');
	if (!(node instanceof HTMLStyleElement)) {
		node = document.createElement('style');
		node.id = 'site-font';
		document.head.appendChild(node);
	}
	node.textContent = stack ? `html, body, body *, body *::before, body *::after { font-family: ${stack} !important; }` : '';
}
