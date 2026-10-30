import { projects, type StickerKey } from '@/content/projects';
import { resume } from '@/content/resume';
import { site } from '@/content/site';
import { superSpace } from '@/content/superspace';
import type { ModelContext, ModelContextTool } from './types';

/**
 * The tools an AI agent in the browser can use on the site (WebMCP). Loaded
 * only where the browser has WebMCP (components/WebMcp.tsx imports this
 * module once it has found it), so the tools and the content they read are
 * a chunk of their own that other visitors never download. Each answer is
 * read from content/ as the site shows it, nothing typed in here.
 */

/**
 * What open_project needs from the page (components/WebMcp.tsx hands over
 * the desk's own ways): a project opens as it does for a visitor.
 */
export type Desk = {
	/**
	 * DeskProvider's `navigate`, a link's onNavigate: it takes a navigation
	 * that opens a project over (calling preventDefault) and runs it as the
	 * site's project transition. Where it would not animate it leaves the
	 * navigation alone.
	 */
	navigate: (event: { preventDefault: () => void }, href: string) => void;
	/** A plain client-side navigation, for when the desk leaves it alone. */
	push: (href: string) => void;
	/** True while a sticker is about to fly (lifted, waiting for its page). */
	flying: () => boolean;
	/** DeskProvider's `whenSettled`: no transition runs and the landed sticker has been pressed down. */
	settled: () => Promise<void>;
};

/** How long an open_project call waits for its page once its turn comes, all told: a flight already on its way, then its own. */
const OPEN_WAIT_MS = 6000;
/** How often (ms) it looks whether the page it waits for is shown. */
const POLL_MS = 25;

const slugs = projects.map((p) => p.slug);
const projectPath = (slug: string) => `/projects/${slug}`;
const absolute = (path: string) => new URL(path, site.url).href;

type Link = { label: string; href: string };

/**
 * What a product page shows beyond its sticker and caption: its copy lives
 * with that page (content/superspace.ts), not in content/projects.ts.
 */
const productPages: Partial<
	Record<StickerKey, { links: Link[]; install?: string }>
> = {
	superspace: {
		links: [{ label: superSpace.ui.github, href: superSpace.repo }],
		install: superSpace.install,
	},
};

/** Every project, in the Projects page's order, as list_projects gives it. */
export function listProjects() {
	return projects.map((p) => {
		const product = p.productPage ? productPages[p.key] : undefined;
		const links: Link[] = p.productPage
			? (product?.links ?? [])
			: p.links.map(({ label, href }) => ({ label, href }));
		const install = product?.install;
		return {
			slug: p.slug,
			name: p.name,
			...(p.year !== undefined && { year: p.year }),
			summary: p.caption,
			url: absolute(projectPath(p.slug)),
			...(links.length > 0 && { links }),
			...(install !== undefined && { install }),
		};
	});
}

/** The resume page's note and jobs, as content/resume.ts has them. */
export function getResume() {
	return {
		note: resume.note,
		jobs: resume.jobs.map(({ when, role, org, where }) => ({
			when,
			role,
			org,
			...(where !== undefined && { where }),
		})),
		url: absolute('/resume'),
	};
}

/** The masthead's socials, the email address among them, and the site. */
export function getContact() {
	const mail = site.socials.find((s) => s.href.startsWith('mailto:'));
	return {
		...(mail && { email: mail.href.slice('mailto:'.length) }),
		socials: site.socials.map(({ label, href }) => ({ label, href })),
		url: site.url,
	};
}

/**
 * The open_project calls so far, answered or not. Each call waits for the
 * ones before it, so two an agent sends at once open one after the other:
 * the desk, busy with the first, would drop the second.
 */
let opening: Promise<unknown> = Promise.resolve();

/**
 * Opens a project in this tab as a visitor would, once a flight already on
 * its way has landed, and resolves with the page once it is shown and its
 * transition has settled. On the Projects page that is a click on its
 * sticker (StickerLink, which flies it into the header: DeskProvider's
 * `open`); from any other page the desk runs it as the site's project
 * transition (`navigate`), or, where it would not animate, a plain
 * navigation. Calls take turns: one starts once every call before it has
 * answered. Rejects for a slug the site does not have, past OPEN_WAIT_MS
 * from its turn, or when `signal` aborts, its turn come or not (once the
 * click is made, the page may still change).
 */
export async function openProject(
	input: Record<string, unknown>,
	desk: Desk,
	signal?: AbortSignal,
): Promise<{ url: string; title: string }> {
	const slug = input.project;
	if (typeof slug !== 'string' || !slugs.includes(slug)) {
		throw new Error(
			`There is no project "${String(slug)}". The projects are: ${slugs.join(', ')}.`,
		);
	}
	const href = projectPath(slug);
	const before = opening;
	const run = waitFor(before, signal, Number.POSITIVE_INFINITY).then(() =>
		openNow(href, desk, signal),
	);
	// the next call waits for this one and for those before it (this one
	// stops waiting when its signal aborts)
	opening = Promise.allSettled([before, run]);
	return run;
}

/** openProject's turn: opens `href`, and resolves once it is shown and settled. */
async function openNow(
	href: string,
	desk: Desk,
	signal: AbortSignal | undefined,
): Promise<{ url: string; title: string }> {
	const until = performance.now() + OPEN_WAIT_MS;
	await settled(desk, signal, until);
	if (window.location.pathname !== href) {
		go(href, desk);
		await waitUntil(() => window.location.pathname === href, signal, until);
		await settled(desk, signal, until);
	}
	return { url: window.location.href, title: document.title };
}

/** Resolves once no sticker is about to fly, no transition runs and the landing has been pressed down. */
async function settled(
	desk: Desk,
	signal: AbortSignal | undefined,
	until: number,
) {
	await waitUntil(() => !desk.flying(), signal, until);
	await waitFor(desk.settled(), signal, until);
}

/** Resolves once `promise` (one that never rejects) has, on waitUntil's terms. */
async function waitFor(
	promise: Promise<unknown>,
	signal: AbortSignal | undefined,
	until: number,
) {
	let done = false;
	promise.then(() => {
		done = true;
	});
	await waitUntil(() => done, signal, until);
}

/** Opens `href` as a visitor would (see openProject). */
function go(href: string, desk: Desk) {
	const sticker = [...document.querySelectorAll<HTMLElement>('a.stk')].find(
		(el) => el.getAttribute('href') === href,
	);
	if (sticker) {
		// a visitor scrolls to a sticker before clicking it, so it flies from
		// where it is seen
		const r = sticker.getBoundingClientRect();
		if (r.top < 0 || r.bottom > window.innerHeight) {
			sticker.scrollIntoView({ block: 'nearest', behavior: 'instant' });
		}
		// clicked as Enter clicks it (no pointer behind it): StickerLink opens
		// it, and it flies into the header as it does for a click
		sticker.click();
		return;
	}
	let taken = false;
	desk.navigate(
		{
			preventDefault: () => {
				taken = true;
			},
		},
		href,
	);
	if (!taken) desk.push(href);
}

/**
 * Resolves once `ready()` is true (asked every POLL_MS); rejects past `until`
 * (performance.now()) or when `signal` aborts, with its reason.
 */
function waitUntil(
	ready: () => boolean,
	signal: AbortSignal | undefined,
	until: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		let timer = 0;
		const finish = (error?: unknown) => {
			window.clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			if (error === undefined) resolve();
			else reject(error);
		};
		const abort = () => finish(signal?.reason ?? new Error('Aborted.'));
		const tick = () => {
			if (ready()) finish();
			else if (performance.now() >= until) {
				finish(
					new Error(
						`The project did not open within ${OPEN_WAIT_MS / 1000} seconds.`,
					),
				);
			} else timer = window.setTimeout(tick, POLL_MS);
		};
		if (signal?.aborted) {
			abort();
			return;
		}
		signal?.addEventListener('abort', abort, { once: true });
		tick();
	});
}

/** Takes no input. */
const noInput = {
	type: 'object',
	properties: {},
	additionalProperties: false,
} as const;

/** The site's tools, as plain data; open_project works through `desk`. */
export function siteTools(desk: Desk): ModelContextTool[] {
	const words = site.agentTools;
	return [
		{
			name: 'list_projects',
			...words.listProjects,
			inputSchema: noInput,
			annotations: { readOnlyHint: true },
			execute: async () => listProjects(),
		},
		{
			name: 'open_project',
			title: words.openProject.title,
			description: words.openProject.description,
			inputSchema: {
				type: 'object',
				properties: {
					project: {
						type: 'string',
						enum: slugs,
						description: words.openProject.project,
					},
				},
				required: ['project'],
				additionalProperties: false,
			},
			annotations: { readOnlyHint: false, consequentialHint: false },
			execute: (input, client) =>
				openProject(input ?? {}, desk, client?.signal),
		},
		{
			name: 'get_resume',
			...words.getResume,
			inputSchema: noInput,
			annotations: { readOnlyHint: true },
			execute: async () => getResume(),
		},
		{
			name: 'get_contact',
			...words.getContact,
			inputSchema: noInput,
			annotations: { readOnlyHint: true },
			execute: async () => getContact(),
		},
	];
}

/**
 * Registers the site's tools with the browser until `signal` aborts, and
 * returns their names. A browser that refuses one (the name still taken
 * after a hot reload, a page not allowed tools) is not the visitor's
 * problem: its refusal is dropped, thrown or rejected.
 */
export function registerTools(
	context: ModelContext,
	desk: Desk,
	signal: AbortSignal,
): string[] {
	const tools = siteTools(desk);
	for (const tool of tools) {
		try {
			Promise.resolve(context.registerTool(tool, { signal })).catch(() => {});
		} catch {}
	}
	return tools.map((t) => t.name);
}
