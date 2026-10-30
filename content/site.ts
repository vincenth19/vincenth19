import type { IconName } from '@/components/Icon';

/**
 * Keyword chip colours, taken from the sticker inks: each is the --k-<kind> token
 * in styles/base.css (stamp indigo, health-card green, seal yellow, orchid, and
 * seal red for the product).
 */
export type ChipKind = 'web' | 'mobile' | 'ui' | 'ai' | 'product';

export type Chip = { chip: string; kind: ChipKind; icon: IconName };

/**
 * A run of inline text. Strings render as-is, a `chip` renders a keyword pill,
 * and `nw` keeps its parts on one line.
 */
export type Inline = string | Chip | { nw: Inline[] } | { kbd: string };

export type Social = { label: string; href: string; icon: IconName };

/** One line of the masthead subtitle: an italic verb, then the rest of the command. */
export type Command = { verb: string; rest: Inline[] };

/** A tool's title, shown to the user, and its description, for the agent. */
export type AgentTool = { title: string; description: string };

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
	/**
	 * The tools an AI agent in the browser can use on the site (WebMCP,
	 * lib/webmcp/tools.ts): a title shown to the user, and a description that
	 * tells the agent what each does and when to use it.
	 */
	agentTools: {
		listProjects: AgentTool;
		/** `project`: what its one input is. */
		openProject: AgentTool & { project: string };
		getResume: AgentTool;
		getContact: AgentTool;
	};
};

export const site: Site = {
	name: 'Vincent Haryadi',
	url: 'https://vincenth19.com',
	description:
		'Vincent Haryadi, full-stack web, mobile and AI engineer in Brisbane, product- and design-minded. Projects, writing and resume.',
	/**
	 * The masthead subtitle: three commands, one verb each on one axis, each
	 * keyword a whole idea. The `nw` runs are where a line may not break, so a
	 * command that wraps on a phone breaks at a phrase ("full-stack" / "web and
	 * mobile apps.", "people rely on.", "and product sense.").
	 */
	tagline: [
		{
			verb: 'Build',
			rest: [
				' ',
				{ nw: ['full-stack'] },
				' ',
				{
					nw: [
						{ chip: 'web', kind: 'web', icon: 'computer-fill' },
						' and ',
						{ chip: 'mobile', kind: 'mobile', icon: 'smartphone-fill' },
						' apps.',
					],
				},
			],
		},
		{
			verb: 'Ship',
			rest: [
				' ',
				{
					nw: [
						{ chip: 'AI', kind: 'ai', icon: 'sparkling-2-fill' },
						' features',
					],
				},
				' ',
				{ nw: ['people rely on.'] },
			],
		},
		{
			verb: 'Design',
			rest: [
				' ',
				{ nw: ['with ', { chip: 'taste', kind: 'ui', icon: 'palette-fill' }] },
				' ',
				{
					nw: [
						'and ',
						{
							chip: 'product',
							kind: 'product',
							icon: 'lightbulb-flash-fill',
						},
						' sense.',
					],
				},
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
	agentTools: {
		listProjects: {
			title: 'List projects',
			description:
				"Lists Vincent Haryadi's projects, in the order the site's Projects page shows them. For each: its slug (the id open_project takes), name, year when known, a one-line summary, the absolute URL of its page, and its outbound links (label and href) where it has any; Super Space also gives its install command. Use it to answer what Vincent has built, or to find a project's slug before opening it.",
		},
		openProject: {
			title: 'Open a project',
			description:
				"Opens one of Vincent Haryadi's projects in this tab, the way a visitor clicking its sticker would, and waits until its page is shown. Returns the opened page's url and title. Use it when the user wants to see a project; list_projects gives the slugs and what each project is. It only changes the page this tab shows.",
			project: 'The slug of the project to open, as list_projects gives it.',
		},
		getResume: {
			title: 'Get resume',
			description:
				"Returns Vincent Haryadi's resume as the site shows it: a one-line summary (note) and every job, in the order the resume page lists them, each with when, role, org and, where known, where; plus the absolute URL of the resume page. Use it for questions about Vincent's experience, roles or work history.",
		},
		getContact: {
			title: 'Get contact details',
			description:
				"Returns how to reach Vincent Haryadi: the email address, every profile linked from the site's header (label and href, the email's mailto: link among them) and the site's URL. It only reads: it sends nothing. Use it when the user wants to contact Vincent or find Vincent elsewhere; the user writes the message themselves.",
		},
	},
};
