import { Bricolage_Grotesque, Fraunces } from 'next/font/google';

/**
 * Display serif, soft and wonky (axes SOFT, WONK, opsz). Exposed as --display.
 * Every display style on the site is italic, so only the italic face is preloaded.
 */
export const fraunces = Fraunces({
	subsets: ['latin'],
	style: ['italic'],
	axes: ['SOFT', 'WONK', 'opsz'],
	display: 'swap',
	variable: '--font-fraunces',
});

/**
 * Fraunces' upright face, declared but not preloaded: the browser only downloads
 * it once some upright display text needs it. next/font gives both calls' faces
 * the family name "Fraunces", so --display picks it up without naming it.
 */
export const frauncesUpright = Fraunces({
	subsets: ['latin'],
	style: ['normal'],
	axes: ['SOFT', 'WONK', 'opsz'],
	display: 'swap',
	preload: false,
	variable: '--font-fraunces-upright',
});

/** Body grotesque with optical size and width axes. Exposed as --sans. */
export const bricolage = Bricolage_Grotesque({
	subsets: ['latin'],
	axes: ['opsz', 'wdth'],
	display: 'swap',
	variable: '--font-bricolage',
});
