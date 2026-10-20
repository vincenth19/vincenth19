import type { IconName } from '@/components/Icon';

/** Keyword chip colours, taken from the sticker inks (see --k-* in styles/base.css). */
export type ChipKind = 'web' | 'mobile' | 'ui' | 'place';

export type Chip = { chip: string; kind: ChipKind; icon: IconName };

/**
 * A run of inline text. Strings render as-is, a `chip` renders a keyword pill,
 * and `nw` keeps its parts on one line.
 */
export type Inline = string | Chip | { nw: Inline[] } | { kbd: string };

export type Social = { label: string; href: string; icon: IconName };

/** One line of the masthead subtitle: an italic verb, then the rest of the command. */
export type Command = { verb: string; rest: Inline[] };

export type Site = {
	name: string;
	url: string;
	description: string;
	tagline: Command[];
	socials: Social[];
	/** The first Tab stop, which jumps past the masthead to the page. */
	skipLink: string;
	/** The book's index tabs: the nav's accessible name, then each tab's label. */
	tabs: {
		label: string;
		projects: string;
		writing: string;
		resume: string;
	};
	projects: {
		/** The page heading, for screen readers only (the active tab shows it). */
		title: string;
		hint: string;
		/** Ends each sticker's link label: "Super Space, 2026. Open project". */
		open: string;
	};
	project: {
		/** The accessible name of the round arrow back to the Projects page. */
		back: string;
		/** The print on a project without a screenshot. */
		snapPlaceholder: string;
	};
	writing: {
		title: string;
		note: string;
		soon: { title: string; body: string };
		/** The link from a post back to the list. */
		allPosts: string;
	};
	notFound: {
		/** The browser tab title. */
		title: string;
		heading: string;
		note: string;
		back: string;
	};
};

export const site: Site = {
	name: 'Vincent Haryadi',
	url: 'https://vincenth19.com',
	description:
		'Vincent Haryadi, full-stack software engineer and designer in Brisbane. Projects, writing and resume.',
	/** The masthead subtitle: three commands, verbs on one axis. */
	tagline: [
		{
			verb: 'Build',
			rest: [
				' full-stack apps ',
				{
					nw: [
						'for ',
						{ chip: 'web', kind: 'web', icon: 'computer-fill' },
						' and ',
						{ chip: 'mobile', kind: 'mobile', icon: 'smartphone-fill' },
						'.',
					],
				},
			],
		},
		{
			verb: 'Design',
			rest: [
				' the ',
				{ chip: 'interface', kind: 'ui', icon: 'palette-fill' },
				' ',
				{ nw: ['before the API.'] },
			],
		},
		{
			verb: 'Ship',
			rest: [
				' it from ',
				{ chip: 'Brisbane', kind: 'place', icon: 'map-pin-2-fill' },
				'.',
			],
		},
	],
	socials: [
		{
			label: 'GitHub',
			href: 'https://github.com/vincenth19',
			icon: 'github-fill',
		},
		{
			label: 'LinkedIn',
			href: 'https://www.linkedin.com/in/vincenth19/',
			icon: 'linkedin-fill',
		},
		{ label: 'X', href: 'https://x.com/vincenth19_', icon: 'twitter-x-fill' },
		{ label: 'Email', href: 'mailto:me@vincenth19.com', icon: 'mail-fill' },
		{
			label: 'TikTok',
			href: 'https://www.tiktok.com/@vincent.sprint',
			icon: 'tiktok-fill',
		},
		{
			label: 'Instagram',
			href: 'https://www.instagram.com/vincent.sprint/',
			icon: 'instagram-fill',
		},
		{
			label: 'YouTube',
			href: 'https://www.youtube.com/@vincent.sprint',
			icon: 'youtube-fill',
		},
	],
	skipLink: 'Skip to content',
	tabs: {
		label: 'Book sections',
		projects: 'Projects',
		writing: 'Writing',
		resume: 'Resume',
	},
	projects: {
		title: 'Projects',
		hint: 'Peel a sticker to read about it.',
		open: 'Open project',
	},
	project: {
		back: 'Back',
		snapPlaceholder: 'Screenshot coming soon',
	},
	writing: {
		title: 'Writing',
		note: 'Notes on building, designing and shipping software.',
		soon: {
			title: 'Coming soon',
			body: 'The first posts are still being written. This page fills up once they are ready.',
		},
		allPosts: 'All writing',
	},
	notFound: {
		title: 'Not found',
		heading: 'Page not found',
		note: 'This page is not in the book. The link may be old or mistyped.',
		back: 'Back to projects',
	},
};
