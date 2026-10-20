import { site } from '@/content/site';

/**
 * The Open Graph tags every page shares. Next.js does not merge `openGraph`
 * between the layout and a page: a page that sets one replaces the layout's
 * whole object. So every page with its own title spreads this into its own
 * `openGraph` (with its title, description and url) to keep og:type and
 * og:site_name.
 */
export const baseOpenGraph = {
	type: 'website',
	siteName: site.name,
} as const;
