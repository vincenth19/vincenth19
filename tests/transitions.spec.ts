import { expect, type Page, test } from '@playwright/test';
import { recordTransitions } from './viewTransitions';

const at = (path: string) => (url: URL) => url.pathname === path;

/** How far the middle of the CovidTracker sticker sits from the middle of the viewport, in px. */
function covidOffCentre(page: Page) {
	return page.locator('.collage .stk--covid').evaluate((el) => {
		const r = el.getBoundingClientRect();
		return Math.abs(r.top + r.height / 2 - window.innerHeight / 2);
	});
}

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

	await sticker.click();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await expect(title).toBeFocused();
	await vts.settled();

	await page.evaluate(() => history.back());
	await expect(page).toHaveURL(at('/'));
	await expect(sticker).toBeFocused();
	await expect.poll(() => covidOffCentre(page)).toBeLessThanOrEqual(4);
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
		expect(await covidOffCentre(page)).toBeLessThanOrEqual(4);

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
