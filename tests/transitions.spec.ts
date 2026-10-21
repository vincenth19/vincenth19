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
		// the book gives way to the stage, or the stage to the book
		expect(run.names).toEqual(expect.arrayContaining(['book', 'stage']));
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

test('a sticker opened from far down the Projects page leaves the book where it is', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.evaluate(() => {
		const w = window as unknown as { __bookFar: boolean };
		w.__bookFar = false;
		new MutationObserver(() => {
			if ('vtBookFar' in document.documentElement.dataset) w.__bookFar = true;
		}).observe(document.documentElement, { attributes: true });
	});
	const sticker = page.getByRole('link', {
		name: 'CovidTracker, 2021. Open project',
	});
	await sticker.scrollIntoViewIfNeeded();
	expect(await scrollY(page)).toBeGreaterThan(400);
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await vts.settled();
	const [open] = await vts.take();
	expect(
		await page.evaluate(
			() => (window as unknown as { __bookFar: boolean }).__bookFar,
		),
	).toBe(true);
	// the sticker flies; the book does not slide a screen's height under it
	expect(open.pairs).toContain('stk-covid');
	expect(open.pairs).not.toContain('book');
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

		await page.evaluate(() => history.back());
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
});
