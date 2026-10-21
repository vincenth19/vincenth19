import { Fragment_Mono, Gloock, Inter } from 'next/font/google';

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

/**
 * The launcher's panel only: Super Space draws in the system's UI sans, which is
 * Adwaita Sans on Omarchy (made from Inter). Exposed as --font-inter. Not
 * preloaded: the launcher is below the first screen, and a preload would vie
 * with the headline's fonts for the first paint.
 */
export const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-inter',
});
