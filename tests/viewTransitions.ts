import type { Page } from '@playwright/test';

/** What one view transition looked like, as the page started and ran it. */
export type Recorded = {
	/** <html data-vt> when it started: "open" (into a project) or "close". */
	direction?: string;
	/**
	 * The project whose sticker was the header when it started (the masthead's
	 * data-open), or null on a page that is not a project. Read from the page,
	 * not the URL: on Back and Forward the URL has already moved on.
	 */
	header: string | null;
	/** view-transition-name of each sticker on screen when it started (the old state), by class. */
	named: Record<string, string>;
	/** Every name the transition animated. */
	names: string[];
	/** The names with an old and a new image: shared elements that morph. */
	pairs: string[];
	/** The first and last transform of each sticker's group: where it flew from and to. */
	flights: Record<string, { from: string; to: string }>;
	finished: boolean;
};

type Recorder = { __vts: Recorded[] };

/**
 * Records every view transition the page starts, from the next navigation on
 * (call it before page.goto). The browser's startViewTransition is wrapped, so
 * the record holds what really ran: which elements were paired, and where the
 * sticker flew.
 */
export async function recordTransitions(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as Recorder;
		w.__vts = [];
		const start = document.startViewTransition?.bind(document);
		if (!start) return;
		document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
			const named: Record<string, string> = {};
			for (const el of document.querySelectorAll('.stk, .slap-stk')) {
				const where = el.classList.contains('slap-stk') ? 'header' : 'book';
				const key = [...el.classList].find((c) => c.startsWith('stk--'));
				named[`${where} ${key}`] = getComputedStyle(el).viewTransitionName;
			}
			const rec: Recorded = {
				direction: document.documentElement.dataset.vt,
				header:
					document.querySelector('header.mast')?.getAttribute('data-open') ??
					null,
				named,
				names: [],
				pairs: [],
				flights: {},
				finished: false,
			};
			w.__vts.push(rec);
			const vt = start(update);
			vt.ready
				.then(() => {
					const old = new Set<string>();
					const fresh = new Set<string>();
					for (const a of document.documentElement.getAnimations({
						subtree: true,
					})) {
						const effect = a.effect as KeyframeEffect | null;
						const m = /^::view-transition-(group|old|new)\((.+)\)$/.exec(
							effect?.pseudoElement ?? '',
						);
						if (!m || !effect) continue;
						const [, part, name] = m;
						if (!rec.names.includes(name)) rec.names.push(name);
						if (part === 'old') old.add(name);
						if (part === 'new') fresh.add(name);
						if (part === 'group' && name.startsWith('stk-')) {
							const k = effect.getKeyframes();
							const t = (f: ComputedKeyframe | undefined) =>
								String(f?.transform ?? '');
							rec.flights[name] = { from: t(k[0]), to: t(k.at(-1)) };
						}
					}
					rec.pairs = [...old].filter((n) => fresh.has(n));
				})
				.catch(() => {});
			vt.finished.finally(() => {
				rec.finished = true;
			});
			return vt;
		}) as typeof document.startViewTransition;
	});

	const all = () =>
		page.evaluate(() => (window as unknown as Recorder).__vts ?? []);
	return {
		all,
		/** The transitions recorded so far, then forgets them. */
		take: () =>
			page.evaluate(() => {
				const w = window as unknown as Recorder;
				return (w.__vts ?? []).splice(0);
			}),
		/** Resolves once every transition started so far has finished. */
		settled: () =>
			page.waitForFunction(() =>
				((window as unknown as Recorder).__vts ?? []).every((v) => v.finished),
			),
	};
}
