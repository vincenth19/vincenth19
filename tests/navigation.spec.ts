import { expect, type Page, test } from '@playwright/test';
import { recordTransitions } from './viewTransitions';

const at = (path: string) => (url: URL) => url.pathname === path;

/** Fails the test on any console error or uncaught exception (hydration errors included). */
function watchConsole(page: Page) {
	const problems: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error' || msg.type() === 'warning') {
			problems.push(`${msg.type()}: ${msg.text()}`);
		}
	});
	page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
	return problems;
}

test('Super Space flies into the header as its page opens, and Back flies it home', async ({
	page,
}) => {
	const problems = watchConsole(page);
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'Super Space, 2026. Open project',
	});
	await sticker.scrollIntoViewIfNeeded();
	const left = await page.evaluate(() => window.scrollY);
	await sticker.click();
	// its page does not prefetch (it only starts to load as the pointer comes
	// onto the sticker): it lifts off the page while it waits for it, then flies
	await expect(sticker).toHaveClass(/is-lifting/);

	await expect(page).toHaveURL(at('/projects/super-space'));
	await expect(page).toHaveTitle('Super Space · Vincent Haryadi');
	const mast = page.locator('header.mast');
	await expect(mast).toHaveAttribute('data-open', 'superspace');
	await expect(
		mast.getByRole('img', { name: 'Super Space sticker' }),
	).toBeVisible();
	await expect(mast.getByRole('link', { name: 'Back' })).toHaveAttribute(
		'href',
		'/',
	);
	await expect(
		page.getByRole('heading', { level: 2, name: 'Super Space' }),
	).toBeFocused();
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
	// the name stays for screen readers, the tagline goes
	await expect(
		page.getByRole('heading', { level: 1, name: 'Vincent Haryadi' }),
	).toBeAttached();
	await expect(page.locator('.tagline')).toBeHidden();

	await mast.getByRole('link', { name: 'Back' }).click();
	await expect(page).toHaveURL(at('/'));
	await expect(mast).not.toHaveAttribute('data-open');
	await expect(sticker).toBeFocused();
	await expect(sticker).toBeInViewport();
	await expect(sticker).not.toHaveClass(/is-lifting/);
	// it comes to rest where it was: the page is scrolled as it was left
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(left);

	// both ways the sticker morphed: the page's and the header's were one element
	await vts.settled();
	const runs = await vts.take();
	expect(
		runs.map((v) => [v.direction, v.pairs.includes('stk-superspace')]),
	).toEqual([
		['open', true],
		['close', true],
	]);
	// the product page's stage (11,000px tall) was never captured on its own:
	// it went, and came, with the page around it; the book, on one side only,
	// went or came with no partner, and the socials moved
	for (const run of runs) {
		expect(
			run.names.filter(
				(n) => !['root', 'book', 'socials', 'stk-superspace'].includes(n),
			),
		).toEqual([]);
		expect(run.pairs).not.toContain('book');
	}
	expect(problems).toEqual([]);
});

/** How much of `el` is on screen, 0 to 1. */
async function onScreen(page: Page, selector: string) {
	return page.locator(selector).evaluate((el) => {
		const r = el.getBoundingClientRect();
		const seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
		return Math.max(0, seen) / r.height;
	});
}

test('the Projects tab from a project flies its sticker back into view', async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'CovidTracker, 2021. Open project',
	});
	await sticker.click();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await expect(
		page.getByRole('heading', { level: 2, name: 'CovidTracker' }),
	).toBeFocused();
	// read down the page, then go back up to the tabs with the keyboard
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	const tabs = page.getByRole('navigation', { name: 'Book sections' });
	await tabs.getByRole('link', { name: 'Projects' }).focus();
	await page.keyboard.press('Enter');

	await expect(page).toHaveURL(at('/'));
	await expect(sticker).toBeFocused();
	await expect(sticker).toBeInViewport();
	await expect.poll(() => onScreen(page, '.stk--covid')).toBeGreaterThan(0.99);
	await vts.settled();
	const close = (await vts.take()).at(-1);
	expect(close?.direction).toBe('close');
	expect(close?.pairs).toContain('stk-covid');
});

test("the browser's Back and Forward fly the sticker and keep it in view", async ({
	page,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	// click the sticker while it sits low on the screen, partly off it
	const box = await page.locator('.stk--covid').evaluate((el) => {
		const r = el.getBoundingClientRect();
		window.scrollBy(0, r.top - (window.innerHeight - 140));
		const s = el.getBoundingClientRect();
		return { x: s.left + s.width / 2, y: s.top + 60 };
	});
	await page.mouse.click(box.x, box.y);
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await expect(
		page.getByRole('heading', { level: 2, name: 'CovidTracker' }),
	).toBeFocused();
	// once it has landed (Back during the flight steps back at once, without one)
	await vts.settled();

	await page.goBack();
	await expect(page).toHaveURL(at('/'));
	const sticker = page.getByRole('link', {
		name: 'CovidTracker, 2021. Open project',
	});
	await expect(sticker).toBeFocused();
	// Back returns the page where it was, just far enough for the whole sticker
	await expect.poll(() => onScreen(page, '.stk--covid')).toBeGreaterThan(0.99);
	await vts.settled();

	// Forward opens the project at the top again, where the sticker lands
	await page.goForward();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await expect(
		page.getByRole('heading', { level: 2, name: 'CovidTracker' }),
	).toBeFocused();
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

	// the click, Back and Forward each ran the morph
	await vts.settled();
	const runs = await vts.take();
	expect(runs.map((v) => [v.direction, v.pairs.includes('stk-covid')])).toEqual(
		[
			['open', true],
			['close', true],
			['open', true],
		],
	);
});

test('a tab clicked while a sticker lifts wins', async ({ page }) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	// both clicks in one go, so the tab lands while the sticker is still lifting
	await page.evaluate(() => {
		const sticker = document.querySelector<HTMLElement>(
			'.collage .stk--basilica',
		);
		const tab = document.querySelector<HTMLElement>('.tabs .tab--writing');
		sticker?.click();
		tab?.click();
	});
	await expect(page).toHaveURL(at('/writing'));
	// the lift would have opened Basilica after 110ms
	await page.waitForTimeout(700);
	await expect(page).toHaveURL(at('/writing'));
	expect(await vts.all()).toEqual([]);
	await expect(page.locator('.is-lifting')).toHaveCount(0);
});

test('a double click opens the project once', async ({ page }) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const entries = await page.evaluate(() => history.length);
	await page.getByRole('link', { name: 'Basilica. Open project' }).dblclick();
	await expect(page).toHaveURL(at('/projects/basilica'));
	await vts.settled();
	expect(await vts.all()).toHaveLength(1);
	expect(await page.evaluate(() => history.length)).toBe(entries + 1);
});

test('a modifier click opens the project in a new tab and leaves this page be', async ({
	page,
	context,
}) => {
	const vts = await recordTransitions(page);
	await page.goto('/');
	const [tab] = await Promise.all([
		context.waitForEvent('page'),
		page
			.getByRole('link', { name: 'CovidTracker, 2021. Open project' })
			.click({ modifiers: ['ControlOrMeta'] }),
	]);
	await expect(tab).toHaveURL(at('/projects/covidtracker'));
	await expect(page).toHaveURL(at('/'));
	await expect(page.locator('.is-lifting')).toHaveCount(0);
	expect(await vts.all()).toEqual([]);
});

test('tabs reach Writing and Resume', async ({ page }) => {
	const problems = watchConsole(page);
	await page.goto('/');
	const tabs = page.getByRole('navigation', { name: 'Book sections' });

	await tabs.getByRole('link', { name: 'Writing' }).click();
	await expect(page).toHaveURL(at('/writing'));
	await expect(page).toHaveTitle('Writing · Vincent Haryadi');
	await expect(page.getByRole('heading', { name: 'Writing' })).toBeVisible();
	await expect(page.getByText('Coming soon')).toBeVisible();
	await expect(tabs.getByRole('link', { name: 'Writing' })).toHaveAttribute(
		'aria-current',
		'page',
	);
	await expect(
		tabs.getByRole('link', { name: 'Projects' }),
	).not.toHaveAttribute('aria-current');

	await tabs.getByRole('link', { name: 'Resume' }).click();
	await expect(page).toHaveURL(at('/resume'));
	await expect(page).toHaveTitle('Resume · Vincent Haryadi');
	await expect(page.getByRole('heading', { name: 'Resume' })).toBeVisible();
	await expect(page.locator('.jobs li')).toHaveCount(5);
	await expect(page.locator('.jobs li').first()).toContainText(
		'Universal Edge AI',
	);
	await expect(tabs.getByRole('link', { name: 'Resume' })).toHaveAttribute(
		'aria-current',
		'page',
	);

	expect(problems).toEqual([]);
});

test('project pages keep the Projects tab current', async ({ page }) => {
	await page.goto('/projects/covidtracker');
	await expect(page).toHaveTitle('CovidTracker · Vincent Haryadi');
	await expect(
		page
			.getByRole('navigation', { name: 'Book sections' })
			.getByRole('link', { name: 'Projects' }),
	).toHaveAttribute('aria-current', 'page');
});

test('an unknown project is a 404', async ({ page }) => {
	const response = await page.goto('/projects/not-a-project');
	expect(response?.status()).toBe(404);
	await expect(
		page.getByRole('heading', { name: 'Page not found' }),
	).toBeVisible();
	await expect(page.locator('header.mast')).not.toHaveAttribute('data-open');
	// a 404 is in no section, in the prerendered HTML and after hydration alike
	await expect(
		page
			.getByRole('navigation', { name: 'Book sections' })
			.locator('[aria-current]'),
	).toHaveCount(0);
});

test('the old /projects page redirects to the Projects tab', async ({
	page,
}) => {
	const response = await page.goto('/projects');
	expect(response?.status()).toBe(200);
	expect(response?.request().redirectedFrom()?.url()).toMatch(/\/projects$/);
	await expect(page).toHaveURL(at('/'));
});

test('an unknown post is a 404', async ({ page }) => {
	const response = await page.goto('/writing/not-a-post');
	expect(response?.status()).toBe(404);
});

test('Skip to content is the first Tab stop and lands on the page', async ({
	page,
}) => {
	await page.goto('/');
	await page.keyboard.press('Tab');
	const skip = page.getByRole('link', { name: 'Skip to content' });
	await expect(skip).toBeFocused();
	await expect(skip).toBeInViewport();
	await page.keyboard.press('Enter');
	await page.keyboard.press('Tab');
	await expect(
		page.getByRole('link', { name: 'Super Space, 2026. Open project' }),
	).toBeFocused();
	// no #hash entry in the history: Back would not work with one
	await expect(page).toHaveURL((url) => url.pathname === '/' && !url.hash);
});

test('pages have their own Open Graph tags', async ({ page }) => {
	for (const [path, title] of [
		['/resume', 'Resume · Vincent Haryadi'],
		['/writing', 'Writing · Vincent Haryadi'],
		['/projects/basilica', 'Basilica · Vincent Haryadi'],
	]) {
		await page.goto(path);
		const og = (property: string) =>
			page.locator(`meta[property="og:${property}"]`);
		await expect(og('title')).toHaveAttribute('content', title);
		await expect(og('url')).toHaveAttribute(
			'content',
			`https://vincenth19.com${path}`,
		);
		await expect(og('site_name')).toHaveAttribute('content', 'Vincent Haryadi');
		await expect(og('type')).toHaveAttribute('content', 'website');
	}
});

test.describe('with reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('a sticker click navigates straight away, without the lift or a transition', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		await page.evaluate(() => {
			const w = window as typeof window & { lifted?: boolean };
			w.lifted = false;
			new MutationObserver(() => {
				if (document.querySelector('.is-lifting')) w.lifted = true;
			}).observe(document.body, {
				subtree: true,
				attributes: true,
				attributeFilter: ['class'],
			});
		});
		await page
			.getByRole('link', { name: 'CovidTracker, 2021. Open project' })
			.click();
		await expect(page).toHaveURL(at('/projects/covidtracker'), {
			timeout: 2000,
		});
		await expect(
			page.getByRole('heading', { level: 2, name: 'CovidTracker' }),
		).toBeFocused();
		expect(
			await page.evaluate(
				() => (window as typeof window & { lifted?: boolean }).lifted,
			),
		).toBe(false);
		expect(await vts.all()).toEqual([]);
		expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
	});
});
