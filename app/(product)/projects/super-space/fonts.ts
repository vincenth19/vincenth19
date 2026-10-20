import { Fragment_Mono, Gloock } from 'next/font/google';

/*
 * Super Space's own type, loaded for its product page only: Gloock for the big
 * words and the name, Fragment Mono for file names, commands and links.
 */

/** High-contrast display serif. Exposed as --font-gloock (--ss-serif). */
export const gloock = Gloock({
	subsets: ['latin'],
	weight: '400',
	display: 'swap',
	variable: '--font-gloock',
});

/** Exposed as --font-fragment-mono (--ss-mono). */
export const fragmentMono = Fragment_Mono({
	subsets: ['latin'],
	weight: '400',
	display: 'swap',
	variable: '--font-fragment-mono',
});
