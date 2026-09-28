export function iosNeedsHomeScreen(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	const ios =
		/iphone|ipad|ipod/i.test(ua) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	if (!ios) return false;
	const standalone =
		window.matchMedia('(display-mode: standalone)').matches ||
		('standalone' in navigator &&
			Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
	return !standalone;
}

export function iosInSafari(): boolean {
	const ua = navigator.userAgent;
	return /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
}
