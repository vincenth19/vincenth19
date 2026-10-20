import type { IconName } from '@/components/Icon';
import type { Chip, Inline } from './site';

/**
 * The CSS modifier for a sticker (`.stk--superspace`, `.slot--superspace`, …).
 * Each one has its own measured shape in styles/stickers.css (--ratio, --d0, --hover).
 */
export type StickerKey = 'superspace' | 'basilica' | 'covid';

export type Fact =
	| { label: string; value: string; wide?: boolean }
	/** A shell command, shown in a dark well with a terminal icon. */
	| { label: string; command: string; wide?: boolean };

export type ProjectLink = {
	label: string;
	href: string;
	icon: IconName;
	/** `ghost` is the outlined secondary button. */
	variant?: 'ghost';
};

/** What every project has: its sticker on the Projects page and in the header. */
type ProjectBase = {
	slug: string;
	key: StickerKey;
	name: string;
	year?: number;
	/** Shown under the sticker on the Projects page. */
	caption: string;
	sticker: { src: string; back: string; alt: string };
};

/**
 * A project with its own product page (app/(product)/projects/<slug>) instead of
 * a sheet in the book. Its copy lives with that page (e.g. content/superspace.ts).
 */
export type ProductProject = ProjectBase & { productPage: true };

/** A project whose page is a sheet in the book (app/(book)/projects/[slug]). */
export type SheetProject = ProjectBase & {
	productPage?: never;
	/** The keyword chip above the title. */
	tag: Chip;
	lede: string;
	body?: Inline[];
	tries?: { label: string; items: string[] };
	links: ProjectLink[];
	/** The print on the right. Without a `screenshot` it says "Screenshot coming soon". */
	snap: {
		icon: IconName;
		caption: string;
		screenshot?: { src: string; alt: string };
	};
	facts: Fact[];
};

export type Project = ProductProject | SheetProject;

export const projects: Project[] = [
	{
		slug: 'super-space',
		key: 'superspace',
		name: 'Super Space',
		year: 2026,
		caption: 'Spotlight for Omarchy that gets what you mean.',
		sticker: {
			src: '/img/superspace.svg',
			back: '/img/superspace-back.svg',
			alt: 'Super Space sticker',
		},
		// its page is a product page: app/(product)/projects/super-space, copy in content/superspace.ts
		productPage: true,
	},
	{
		slug: 'basilica',
		key: 'basilica',
		name: 'Basilica',
		// TODO(vincent): add the year Basilica was made (renders next to the tag).
		tag: { chip: 'Omarchy theme', kind: 'web', icon: 'brush-3-fill' },
		caption: 'A theme for the Omarchy desktop.',
		lede: 'A theme for the Omarchy desktop.',
		// TODO(vincent): add a description (`body`): a few sentences about the theme,
		// the mood, what it changes and where the idea came from.
		links: [
			// TODO(vincent): add the repo link once it exists, e.g.
			// { label: 'View on GitHub', href: 'https://github.com/vincenth19/…', icon: 'github-fill' },
		],
		sticker: {
			src: '/img/basilica.svg',
			back: '/img/basilica-back.svg',
			alt: 'Basilica sticker',
		},
		snap: {
			icon: 'palette-fill',
			caption: 'Basilica on the Omarchy desktop',
			// TODO(vincent): add a screenshot, e.g.
			// screenshot: { src: '/img/basilica-screenshot.png', alt: 'Basilica on the Omarchy desktop' },
		},
		facts: [
			{ label: 'Type', value: 'Theme for the Omarchy Linux desktop' },
			// TODO(vincent): add { label: 'Palette', value: '…' } and { label: 'Repo', value: '…' }.
		],
	},
	{
		slug: 'covidtracker',
		key: 'covid',
		name: 'CovidTracker',
		year: 2021,
		tag: { chip: 'Web app', kind: 'mobile', icon: 'global-fill' },
		caption: 'COVID-19 numbers for Indonesia, made readable.',
		lede: 'COVID-19 numbers for Indonesia, made readable.',
		body: [
			'Cases, vaccinations and infection rates for every province on one page. The numbers come through a small proxy API I wrote, plus public health APIs.',
		],
		links: [
			{
				label: 'Visit the site',
				href: 'https://covidtracker.pages.dev',
				icon: 'global-fill',
			},
			{
				label: 'Source',
				href: 'https://github.com/vincenth19/covidtracker',
				icon: 'github-fill',
				variant: 'ghost',
			},
		],
		sticker: {
			src: '/img/covid.svg',
			back: '/img/covid-back.svg',
			alt: 'CovidTracker sticker',
		},
		snap: { icon: 'global-fill', caption: 'covidtracker.pages.dev' },
		facts: [
			{ label: 'Stack', value: 'React, Material UI' },
			{ label: 'Data', value: 'Own proxy API + public health APIs' },
			{ label: 'Hosted on', value: 'Cloudflare Pages' },
		],
	},
];

/** The projects whose page is a sheet in the book. */
export const sheetProjects: SheetProject[] = projects.filter(
	(p): p is SheetProject => !p.productPage,
);

export function getSheetProject(slug: string): SheetProject | undefined {
	return sheetProjects.find((p) => p.slug === slug);
}

/** What the masthead needs to put a sticker in the header (kept small for the client). */
export type HeaderSticker = Pick<Project, 'slug' | 'key' | 'sticker'>;

export const headerStickers: HeaderSticker[] = projects.map(
	({ slug, key, sticker }) => ({ slug, key, sticker }),
);
