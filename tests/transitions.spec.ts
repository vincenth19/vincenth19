import { expect, type Page, test } from '@playwright/test';
import { recordTransitions } from './viewTransitions';

const at = (path: string) => (url: URL) => url.pathname === path;

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test('the book sticker and the header sticker share a view-transition-name', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'CovidTracker, 2021. Open project',
	});
	// at rest no sticker is named: one that does not fly would drift from the book
	for (const el of await page.locator('.collage .stk').all()) {
		await expect(el).toHaveCSS('view-transition-name', 'none');
	}

	await sticker.click();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	const header = page.locator('header.mast .slap-stk');
	await expect(header).toHaveCSS('view-transition-name', 'stk-covid');
	await vts.settled();
	const [open] = await vts.take();
	// when the transition captured the Projects page, only the clicked sticker had the name
	expect(open.named).toEqual({
		'book stk--superspace': 'none',
		'book stk--basilica': 'none',
		'book stk--covid': 'stk-covid',
	});
	// and the old and new sticker were paired into one morph
	expect(open.pairs).toContain('stk-covid');

	await page.getByRole('link', { name: 'Back', exact: true }).click();
	await expect(page).toHaveURL(at('/'));
	// the sticker coming home carries the same name as the header sticker it was
	await expect(sticker).toHaveCSS('view-transition-name', 'stk-covid');
	await vts.settled();
	const [close] = await vts.take();
	expect(close.named).toEqual({ 'header stk--covid': 'stk-covid' });
	expect(close.pairs).toContain('stk-covid');
});

for (const [trigger, leave] of [
	[
		'the Back arrow',
		(page: Page) =>
			page.getByRole('link', { name: 'Back', exact: true }).click(),
	],
	[
		'the Projects tab',
		(page: Page) =>
			page
				.getByRole('navigation', { name: 'Book sections' })
				.getByRole('link', { name: 'Projects' })
				.click(),
	],
	['history.back()', (page: Page) => page.evaluate(() => history.back())],
] as const) {
	test(`${trigger} flies the header sticker back onto its spot`, async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		await page.getByRole('link', { name: 'Basilica. Open project' }).click();
		await expect(page).toHaveURL(at('/projects/basilica'));
		await vts.settled();
		await vts.take();
		// read down the page first: the sticker flies down from the header above
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		await leave(page);
		await expect(page).toHaveURL(at('/'));
		const sticker = page.getByRole('link', { name: 'Basilica. Open project' });
		await expect(sticker).toBeFocused();
		await expect(sticker).toBeInViewport();
		await vts.settled();
		const [close] = await vts.take();
		expect(close).toMatchObject({
			direction: 'close',
			header: 'basilica',
			finished: true,
		});
		expect(close.pairs).toContain('stk-basilica');
		// it moved: from the header's rect to the sticker's spot on the page
		const flight = close.flights['stk-basilica'];
		expect(flight.from).not.toEqual(flight.to);
	});
}

test('open, history.back() and history.forward() each morph and land in place', async ({
	page,
}) => {
	const problems: string[] = [];
	page.on('console', (m) => {
		if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
	});
	page.on('pageerror', (e) => problems.push(e.message));
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'CovidTracker, 2021. Open project',
	});
	const title = page.getByRole('heading', { level: 2, name: 'CovidTracker' });

	await sticker.scrollIntoViewIfNeeded();
	const left = await scrollY(page);
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await expect(title).toBeFocused();
	await vts.settled();

	// Back puts the Projects page where it was, the sticker in view
	await page.evaluate(() => history.back());
	await expect(page).toHaveURL(at('/'));
	await expect(sticker).toBeFocused();
	await expect.poll(() => scrollY(page)).toBe(left);
	await expect(sticker).toBeInViewport({ ratio: 0.99 });
	await vts.settled();

	await page.evaluate(() => history.forward());
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await expect(title).toBeFocused();
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	await expect(page.locator('header.mast')).toHaveAttribute(
		'data-open',
		'covid',
	);
	await vts.settled();

	const runs = await vts.take();
	expect(runs.map((v) => [v.direction, v.header])).toEqual([
		['open', null],
		['close', 'covid'],
		['open', null],
	]);
	// every step paired the book sticker with the header sticker
	for (const run of runs) expect(run.pairs).toContain('stk-covid');
	// Forward named the sticker it was about to fly before the page was captured
	expect(runs[2].named['book stk--covid']).toBe('stk-covid');
	expect(problems).toEqual([]);
});

test('Super Space: the launcher works between Back and Forward, and the header sticker still flies', async ({
	page,
}) => {
	const problems: string[] = [];
	page.on('console', (m) => {
		if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
	});
	page.on('pageerror', (e) => problems.push(e.message));
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'Super Space, 2026. Open project',
	});
	const header = page.locator('header.mast .slap-stk');
	const launcher = page.locator('.ssl');
	const field = launcher.getByRole('combobox', {
		name: 'Search the demo files',
	});

	await sticker.click();
	await expect(page).toHaveURL(at('/projects/super-space'));
	await expect(header).toHaveCSS('view-transition-name', 'stk-superspace');
	await vts.settled();

	// type into the launcher, deep down the page
	await launcher.scrollIntoViewIfNeeded();
	await expect(launcher).toHaveAttribute('data-ready', '');
	await field.fill('2+2*3');
	await expect(launcher.locator('.ssl-answer')).toContainText('2+2*3→8');

	// the browser's Back from there flies the sticker home
	await page.evaluate(() => history.back());
	await expect(page).toHaveURL(at('/'));
	await expect(sticker).toBeFocused();
	await vts.settled();

	// Forward flies it back into the header, and the launcher runs again
	await page.evaluate(() => history.forward());
	await expect(page).toHaveURL(at('/projects/super-space'));
	await expect(header).toHaveCSS('view-transition-name', 'stk-superspace');
	await vts.settled();
	await launcher.scrollIntoViewIfNeeded();
	await expect(launcher).toHaveAttribute('data-ready', '');
	await field.fill('anjing');
	await expect(launcher.getByRole('option').first()).toBeVisible();

	const runs = await vts.take();
	expect(runs.map((v) => v.direction)).toEqual(['open', 'close', 'open']);
	for (const run of runs) {
		expect(run.pairs).toContain('stk-superspace');
		// the book gives way to the stage, or the stage to the book, with the
		// page: neither is captured on its own (the stage is 11,000px tall)
		expect([...run.names].sort()).toEqual(['root', 'stk-superspace']);
	}
	expect(problems).toEqual([]);
});

test('Super Space’s “All projects” link flies the sticker home from the foot of the page, the whole flight on screen', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'Super Space, 2026. Open project',
	});
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/super-space'));
	await vts.settled();
	await vts.take();

	// from the foot of a long page the flight would be longer than a screen:
	// where the sticker's flight starts, once it runs
	await page.evaluate(() => {
		const w = window as unknown as { __far: boolean; __from: number | null };
		w.__far = false;
		w.__from = null;
		new MutationObserver(() => {
			if ('vtFar' in document.documentElement.dataset) w.__far = true;
		}).observe(document.documentElement, { attributes: true });
		const tick = () => {
			for (const a of document.documentElement.getAnimations({
				subtree: true,
			})) {
				const e = a.effect as KeyframeEffect | null;
				if (e?.pseudoElement !== '::view-transition-group(stk-superspace)') {
					continue;
				}
				const m = /matrix\(([^)]+)\)/.exec(
					String(e.getKeyframes()[0]?.transform ?? ''),
				);
				if (m) w.__from = Number(m[1].split(',')[5]);
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
	const link = page.getByRole('link', { name: 'All projects' });
	await link.scrollIntoViewIfNeeded();
	await link.click();
	await expect(page).toHaveURL(at('/'));
	await expect(sticker).toBeFocused();
	await expect(sticker).toBeInViewport();
	await vts.settled();
	const [close] = await vts.take();
	expect(close).toMatchObject({ direction: 'close', finished: true });
	const seen = await page.evaluate(() => {
		const w = window as unknown as { __far: boolean; __from: number | null };
		return { far: w.__far, from: w.__from, height: window.innerHeight };
	});
	expect(seen.far).toBe(true);
	// it still flies, but from just above the screen, not ten thousand pixels away,
	// and the socials fade with the page instead of sliding down through it
	expect(close.pairs).toContain('stk-superspace');
	expect(seen.from).not.toBeNull();
	expect(seen.from ?? 0).toBeGreaterThan(-seen.height);
	expect(close.pairs).not.toContain('socials');
});

test('Back from a project opened at the top of the Projects page lands at the top, not scrolled down to the sticker', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	expect(await scrollY(page)).toBe(0);
	// clicked where it is, without scrolling to it first
	await page
		.getByRole('link', { name: 'Super Space, 2026. Open project' })
		.dispatchEvent('click');
	await expect(page).toHaveURL(at('/projects/super-space'));
	await page.getByRole('link', { name: 'Back', exact: true }).click();
	await expect(page).toHaveURL(at('/'));
	await expect(
		page.getByRole('link', { name: 'Super Space, 2026. Open project' }),
	).toBeFocused();
	await expect.poll(() => scrollY(page)).toBe(0);
});

test('a click while the sticker flies is not lost: Back pressed at once goes back', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', { name: 'Basilica. Open project' });
	// where the project page's Back arrow is
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/basilica'));
	await vts.settled();
	const back = page.getByRole('link', { name: 'Back', exact: true });
	const box = await back.boundingBox();
	if (!box) throw new Error('no Back arrow');
	await back.click();
	await expect(page).toHaveURL(at('/'));
	await vts.settled();
	await vts.take();

	// open again, and press where the Back arrow will be while the sticker is in the air
	await page.evaluate(() => window.scrollTo(0, 0));
	await sticker.click({ noWaitAfter: true });
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.some((a) =>
				(a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
					'::view-transition',
				),
			),
	);
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await expect(page).toHaveURL(at('/'));
	await vts.settled();
	await expect(sticker).toBeFocused();
});

test('a second press during the flight neither cuts it short nor clicks the page coming in', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	const vts = await recordTransitions(page);
	const external: string[] = [];
	const site = /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/;
	page.on('request', (r) => {
		if (r.isNavigationRequest() && !site.test(r.url())) external.push(r.url());
	});
	// a press must never reach a link off the site: keep the run offline
	await page.route(
		(url) => !site.test(url.href),
		(r) => r.abort(),
	);
	await page.goto('/');
	const entries = await page.evaluate(() => history.length);
	const sticker = page.getByRole('link', { name: 'Basilica. Open project' });
	const box = await sticker.boundingBox();
	if (!box) throw new Error('no sticker');
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	const flying = () =>
		page.waitForFunction(() =>
			document
				.getAnimations()
				.some((a) =>
					(a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
						'::view-transition',
					),
				),
		);

	// a slow double tap on the sticker: the second lands on the page coming in
	await page.mouse.click(x, y);
	await flying();
	await page.mouse.click(x, y);
	await vts.settled();
	await page.waitForTimeout(300);
	await expect(page).toHaveURL(at('/projects/basilica'));
	expect(await page.evaluate(() => history.length)).toBe(entries + 1);
	const [open] = await vts.take();
	expect(open.skipped).toBe(false);

	// a double click on the Projects tab flies home once, all the way
	await page
		.getByRole('navigation', { name: 'Book sections' })
		.getByRole('link', { name: 'Projects' })
		.dblclick();
	await expect(page).toHaveURL(at('/'));
	await vts.settled();
	await page.waitForTimeout(300);
	await expect(page).toHaveURL(at('/'));
	const runs = await vts.take();
	expect(runs).toHaveLength(1);
	expect(runs[0].skipped).toBe(false);

	// Back, then at once a tab where it was: the page coming in is not what was
	// under it, so the press is dropped rather than opening whatever is there now
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/basilica'));
	await vts.settled();
	await vts.take();
	const writing = await page
		.getByRole('navigation', { name: 'Book sections' })
		.getByRole('link', { name: 'Writing' })
		.boundingBox();
	if (!writing) throw new Error('no Writing tab');
	await page.getByRole('link', { name: 'Back', exact: true }).click();
	await flying();
	await page.mouse.click(
		writing.x + writing.width / 2,
		writing.y + writing.height / 2,
	);
	await vts.settled();
	await page.waitForTimeout(300);
	await expect(page).toHaveURL(at('/'));
	const [close] = await vts.take();
	expect(close.skipped).toBe(false);
	expect(external).toEqual([]);
});

test('the Back arrow steps back in history rather than adding a step', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	await page.getByRole('link', { name: 'Basilica. Open project' }).click();
	await expect(page).toHaveURL(at('/projects/basilica'));
	await vts.settled();
	const entries = await page.evaluate(() => history.length);
	await page.getByRole('link', { name: 'Back', exact: true }).click();
	await expect(page).toHaveURL(at('/'));
	await vts.settled();
	expect(await page.evaluate(() => history.length)).toBe(entries);
	// so the browser's Forward, not its Back, opens the project again
	await page.evaluate(() => history.forward());
	await expect(page).toHaveURL(at('/projects/basilica'));
	await vts.settled();
	const runs = await vts.take();
	expect(runs.map((v) => v.direction)).toEqual(['open', 'close', 'open']);
	for (const run of runs) expect(run.pairs).toContain('stk-basilica');

	// a project opened straight from its link has no Projects page behind it:
	// the arrow goes there as a new step
	await page.goto('/projects/covidtracker');
	const fresh = await page.evaluate(() => history.length);
	await page.getByRole('link', { name: 'Back', exact: true }).click();
	await expect(page).toHaveURL(at('/'));
	expect(await page.evaluate(() => history.length)).toBe(fresh + 1);
});

test('a sticker opened from far down the Projects page leaves the book where it is', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'CovidTracker, 2021. Open project',
	});
	await sticker.scrollIntoViewIfNeeded();
	expect(await scrollY(page)).toBeGreaterThan(400);
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await vts.settled();
	const [open] = await vts.take();
	// the sticker flies; the book does not slide a screen's height under it: it
	// is never captured on its own, and goes with the page
	expect(open.pairs).toContain('stk-covid');
	expect([...open.names].sort()).toEqual(['root', 'stk-covid']);
});

test('a prefetched sticker flies at once, on the compositor, and the new page waits for it to land', async ({
	page,
}) => {
	// a screen tall enough that the launcher is near it as the page opens: it
	// would start loading at once, but waits for the landing
	await page.setViewportSize({ width: 1440, height: 1300 });
	await page.addInitScript(() => {
		type Seen = {
			clicked: number[];
			started: number[];
			finished: number[];
			lifted: boolean;
			props: string[];
			launcher: number | null;
		};
		const w = window as unknown as { __seen: Seen };
		w.__seen = {
			clicked: [],
			started: [],
			finished: [],
			lifted: false,
			props: [],
			launcher: null,
		};
		const seen = w.__seen;
		window.addEventListener('click', (e) => seen.clicked.push(e.timeStamp), {
			capture: true,
		});
		const start = document.startViewTransition?.bind(document);
		if (!start) return;
		document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
			seen.started.push(performance.now());
			const vt = start(update);
			// what runs, once the page has retimed it
			vt.ready
				.then(() => new Promise((r) => setTimeout(r, 0)))
				.then(() => {
					for (const a of document.documentElement.getAnimations({
						subtree: true,
					})) {
						const effect = a.effect as KeyframeEffect | null;
						if (!effect?.pseudoElement?.startsWith('::view-transition')) {
							continue;
						}
						for (const f of effect.getKeyframes()) {
							for (const p of Object.keys(f)) {
								if (
									['offset', 'easing', 'composite', 'computedOffset'].includes(
										p,
									)
								) {
									continue;
								}
								const what = `${effect.pseudoElement} ${p}`;
								if (!seen.props.includes(what)) seen.props.push(what);
							}
						}
					}
				})
				.catch(() => {});
			vt.finished.finally(() => seen.finished.push(performance.now()));
			return vt;
		}) as typeof document.startViewTransition;
		new MutationObserver(() => {
			if (document.querySelector('.stk.is-lifting')) seen.lifted = true;
			if (
				seen.launcher === null &&
				document.querySelector('.ssl[data-ready]')
			) {
				seen.launcher = performance.now();
			}
		}).observe(document, { subtree: true, attributes: true, childList: true });
	});
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'Super Space, 2026. Open project',
	});
	// the pointer comes onto the sticker, and stays a moment: its page comes in
	await sticker.hover();
	await expect
		.poll(() =>
			page.evaluate(() =>
				performance
					.getEntriesByType('resource')
					.some((r) => r.name.includes('/projects/super-space?_rsc')),
			),
		)
		.toBe(true);
	await page.waitForTimeout(400);
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/super-space'));
	await expect(page.locator('.ssl')).toHaveAttribute('data-ready', '');
	const seen = await page.evaluate(
		() =>
			(
				window as unknown as {
					__seen: {
						clicked: number[];
						started: number[];
						finished: number[];
						lifted: boolean;
						props: string[];
						launcher: number | null;
					};
				}
			).__seen,
	);
	expect(seen.started).toHaveLength(1);
	// no lift first: the transition starts in the click's own task
	expect(seen.lifted).toBe(false);
	expect(seen.started[0] - (seen.clicked.at(-1) ?? 0)).toBeLessThan(100);
	// nothing animates that the compositor cannot run on its own
	const allowed = /\s(transform|translate|opacity|mixBlendMode)$/;
	expect(seen.props.filter((p) => !allowed.test(p))).toEqual([]);
	expect(seen.props).toContain(
		'::view-transition-group(stk-superspace) transform',
	);
	// the launcher loads once the sticker has landed, not during the flight
	expect(seen.launcher).not.toBeNull();
	expect(seen.launcher ?? 0).toBeGreaterThanOrEqual(seen.finished[0]);
});

test('a lifted sticker waits for its page before it flies, so the screen never freezes on a slow page', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	await page.evaluate(() => {
		const w = window as unknown as { __vtAt: number };
		w.__vtAt = 0;
		new MutationObserver(() => {
			if (!w.__vtAt && document.documentElement.dataset.vt) {
				w.__vtAt = performance.now();
			}
		}).observe(document.documentElement, { attributes: true });
	});
	// Super Space's page data comes slowly
	let released = 0;
	await page.route('**/projects/super-space?_rsc=*', async (route) => {
		await new Promise((r) => setTimeout(r, 350));
		released = await page.evaluate(() => performance.now());
		await route.continue();
	});
	const sticker = page.getByRole('link', {
		name: 'Super Space, 2026. Open project',
	});
	await sticker.click();
	// lifted, bobbing while it waits: the page still draws
	await expect(sticker).toHaveClass(/is-waiting/);
	await expect(page).toHaveURL(at('/projects/super-space'));
	await vts.settled();
	const [open] = await vts.take();
	expect(open).toMatchObject({ direction: 'open', finished: true });
	expect(open.pairs).toContain('stk-superspace');
	const started = await page.evaluate(
		() => (window as unknown as { __vtAt: number }).__vtAt,
	);
	expect(released).toBeGreaterThan(0);
	expect(started).toBeGreaterThan(released);
});

test('Back pressed as the sticker starts to fly wins: no page opens behind it', async ({
	page,
}) => {
	await page.goto('/writing');
	await page
		.getByRole('navigation', { name: 'Book sections' })
		.getByRole('link', { name: 'Projects' })
		.click();
	await expect(page).toHaveURL(at('/'));
	// the moment the flight starts, Back
	await page.evaluate(() => {
		new MutationObserver((_, observer) => {
			if (document.documentElement.dataset.vt === 'open') {
				observer.disconnect();
				history.back();
			}
		}).observe(document.documentElement, { attributes: true });
	});
	await page
		.getByRole('link', { name: 'Super Space, 2026. Open project' })
		.click();
	await expect(page).toHaveURL(at('/writing'));
	await page.waitForTimeout(1500);
	await expect(page).toHaveURL(at('/writing'));
	// and the Projects page is still the next step forward
	await page.evaluate(() => history.forward());
	await expect(page).toHaveURL(at('/'));
});

test('Back pressed during the flight steps back at once, without a second flight', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', { name: 'Basilica. Open project' });
	await sticker.click({ noWaitAfter: true });
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.some((a) =>
				(a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
					'::view-transition',
				),
			),
	);
	await page.evaluate(() => history.back());
	await expect(page).toHaveURL(at('/'));
	await expect(sticker).toBeFocused();
	await vts.settled();
	expect((await vts.take()).map((v) => v.direction)).toEqual(['open']);
});

test('a page turn that does not open or leave a project stays instant', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const tabs = page.getByRole('navigation', { name: 'Book sections' });
	await tabs.getByRole('link', { name: 'Writing' }).click();
	await expect(page).toHaveURL(at('/writing'));
	await tabs.getByRole('link', { name: 'Resume' }).click();
	await expect(page).toHaveURL(at('/resume'));
	await page.goBack();
	await expect(page).toHaveURL(at('/writing'));
	expect(await vts.all()).toEqual([]);
});

test.describe('on a phone', () => {
	test.use({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
	});

	test('Back pressed while the project still coasts from a flick lands where the Projects page was left', async ({
		page,
		context,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const sticker = page.getByRole('link', {
			name: 'Super Space, 2026. Open project',
		});
		await sticker.evaluate((el) =>
			el.scrollIntoView({ block: 'center', behavior: 'instant' }),
		);
		const left = await scrollY(page);
		await sticker.tap();
		await expect(page).toHaveURL(at('/projects/super-space'));
		await vts.settled();
		// a flick up the project page, and Back while it still coasts
		const cdp = await context.newCDPSession(page);
		let t = Date.now() / 1000;
		const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y?: number) =>
			cdp.send('Input.dispatchTouchEvent', {
				type,
				timestamp: t,
				touchPoints: y === undefined ? [] : [{ x: 60, y, id: 1 }],
			});
		await touch('touchStart', 694);
		for (let i = 1; i <= 6; i++) {
			t += 0.01;
			await touch('touchMove', 694 - i * 60);
			await page.waitForTimeout(10);
		}
		t += 0.01;
		await touch('touchEnd');
		await page.waitForTimeout(60);
		const coasting = await page.evaluate(async () => {
			const from = window.scrollY;
			await new Promise((r) =>
				requestAnimationFrame(() => requestAnimationFrame(r)),
			);
			return window.scrollY !== from;
		});
		expect(coasting).toBe(true);
		await page.evaluate(() => history.back());
		await expect(page).toHaveURL(at('/'));
		await vts.settled();
		await page.waitForTimeout(800);
		// where it was left, the sticker in view and focused: the coast stopped with the page it was on
		expect(await scrollY(page)).toBe(left);
		await expect(sticker).toBeFocused();
		await expect(sticker).toBeInViewport({ ratio: 0.9 });
	});
});

test.describe('with reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('opening and leaving a project navigate instantly, without a transition', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const sticker = page.getByRole('link', {
			name: 'CovidTracker, 2021. Open project',
		});
		const title = page.getByRole('heading', {
			level: 2,
			name: 'CovidTracker',
		});

		await sticker.click();
		await expect(page).toHaveURL(at('/projects/covidtracker'), {
			timeout: 2000,
		});
		await expect(title).toBeFocused();
		await expect(sticker).toHaveCount(0);

		await page.getByRole('link', { name: 'Back', exact: true }).click();
		await expect(page).toHaveURL(at('/'), { timeout: 2000 });
		await expect(sticker).toBeFocused();
		await expect(sticker).toBeInViewport({ ratio: 0.99 });

		// the Back arrow stepped back: Forward opens the project again
		await page.evaluate(() => history.forward());
		await expect(page).toHaveURL(at('/projects/covidtracker'), {
			timeout: 2000,
		});
		await expect(title).toBeFocused();
		await page.evaluate(() => history.back());
		await expect(page).toHaveURL(at('/'), { timeout: 2000 });
		await expect(sticker).toBeFocused();

		expect(await vts.all()).toEqual([]);
		expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
	});

	test('Back puts the Projects page where it was when the project opened', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');
		await page.evaluate(() => window.scrollTo(0, 250));
		await expect.poll(() => scrollY(page)).toBe(250);
		const sticker = page.getByRole('link', { name: 'Basilica. Open project' });
		for (const leave of [
			() => page.getByRole('link', { name: 'Back', exact: true }).click(),
			() =>
				page
					.getByRole('navigation', { name: 'Book sections' })
					.getByRole('link', { name: 'Projects' })
					.click(),
		]) {
			await sticker.click();
			await expect(page).toHaveURL(at('/projects/basilica'), {
				timeout: 2000,
			});
			await leave();
			await expect(page).toHaveURL(at('/'), { timeout: 2000 });
			await expect(sticker).toBeFocused();
			await expect.poll(() => scrollY(page)).toBe(250);
		}
	});
});
