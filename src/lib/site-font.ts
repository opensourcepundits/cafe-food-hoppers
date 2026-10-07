export const siteFonts = [
	{ id: 'plex', label: 'IBM Plex', family: '' },
	{ id: 'libron', label: 'Libron', family: 'Libron' },
	{ id: 'lato', label: 'Lato', family: 'Lato' },
	{ id: 'gumbo', label: 'Gumbo', family: 'Gumbo' }
] as const;

export type SiteFont = (typeof siteFonts)[number]['id'];

const sources: Record<Exclude<SiteFont, 'plex'>, { url: string; weight: string; style: string }[]> = {
	libron: [
		{ url: '/fonts/Libron-Regular.woff2', weight: '400', style: 'normal' },
		{ url: '/fonts/Libron-Italic.woff2', weight: '400', style: 'italic' },
		{ url: '/fonts/Libron-Bold.woff2', weight: '700', style: 'normal' },
		{ url: '/fonts/Libron-BoldItalic.woff2', weight: '700', style: 'italic' }
	],
	lato: [
		{ url: '/fonts/Lato-Regular.ttf', weight: '400', style: 'normal' },
		{ url: '/fonts/Lato-Italic.ttf', weight: '400', style: 'italic' },
		{ url: '/fonts/Lato-Bold.ttf', weight: '700', style: 'normal' },
		{ url: '/fonts/Lato-BoldItalic.ttf', weight: '700', style: 'italic' }
	],
	gumbo: [{ url: '/fonts/Gumbo.otf', weight: '400', style: 'normal' }]
};

const loaded = new Set<string>();

export function isSiteFont(value: string | null): value is SiteFont {
	return siteFonts.some((item) => item.id === value);
}

export function siteFontFamily(font: SiteFont): string {
	return siteFonts.find((item) => item.id === font)?.family ?? '';
}

export async function applySiteFont(font: SiteFont): Promise<void> {
	const family = siteFontFamily(font);
	if (family) {
		const weights = (weight: string) => (weight === '700' ? ['500', '600', '700'] : [weight]);
		await Promise.all(
			sources[font].flatMap((file) =>
				weights(file.weight).map(async (weight) => {
					const key = `${family}:${weight}:${file.style}:${file.url}`;
					if (loaded.has(key)) return;
					const face = new FontFace(family, `url("${file.url}")`, { weight, style: file.style });
					document.fonts.add(await face.load());
					loaded.add(key);
				})
			)
		);
	}

	let node = document.getElementById('site-font');
	if (!(node instanceof HTMLStyleElement)) {
		node = document.createElement('style');
		node.id = 'site-font';
	}
	document.head.appendChild(node);
	node.textContent = family
		? `html, body, body * { font-family: "${family}", sans-serif !important; }`
		: '';
}
