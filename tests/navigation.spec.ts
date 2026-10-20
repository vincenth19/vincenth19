import { expect, type Page, test } from '@playwright/test';

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

test('peeling Super Space opens its page, then Back re-sticks it', async ({
	page,
}) => {
	const problems = watchConsole(page);
	await page.goto('/');
	const sticker = page.getByRole('link', {
		name: 'Super Space, 2026. Open project',
	});
	await sticker.click();
	await expect(sticker).toHaveClass(/is-peeling/);

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
	await expect(sticker).not.toHaveClass(/is-restick/); // removed once it has played
	// it comes to rest in the middle of the screen (give or take the 2px hover
	// lift, as the pointer may be over it, and whole-pixel scrolling)
	const offCentre = await sticker.evaluate((el) => {
		const r = el.getBoundingClientRect();
		return Math.abs(r.top + r.height / 2 - window.innerHeight / 2);
	});
	expect(offCentre).toBeLessThanOrEqual(4);

	expect(problems).toEqual([]);
});

/** How far the middle of `el` sits from the middle of the viewport, in px. */
async function offCentre(page: Page, selector: string) {
	return page.locator(selector).evaluate((el) => {
		const r = el.getBoundingClientRect();
		return Math.abs(r.top + r.height / 2 - window.innerHeight / 2);
	});
}

test('the Projects tab from a project re-sticks its sticker in view', async ({
	page,
}) => {
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
	await expect(sticker).not.toHaveClass(/is-restick/); // removed once it has played
	await expect(sticker).toBeInViewport();
	expect(await offCentre(page, '.stk--covid')).toBeLessThanOrEqual(4);
});

test("the browser's Back and Forward keep the sticker and the slap in view", async ({
	page,
}) => {
	await page.goto('/');
	// click the sticker while it sits low on the screen: Back must not return there
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

	await page.goBack();
	await expect(page).toHaveURL(at('/'));
	const sticker = page.getByRole('link', {
		name: 'CovidTracker, 2021. Open project',
	});
	await expect(sticker).toBeFocused();
	await expect(sticker).not.toHaveClass(/is-restick/);
	expect(await offCentre(page, '.stk--covid')).toBeLessThanOrEqual(4);

	// Forward opens the project at the top again, where the slap plays
	await page.goForward();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await expect(
		page.getByRole('heading', { level: 2, name: 'CovidTracker' }),
	).toBeFocused();
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('a tab clicked while a sticker peels wins', async ({ page }) => {
	await page.goto('/');
	const tabs = page.getByRole('navigation', { name: 'Book sections' });
	await page.getByRole('link', { name: 'Basilica. Open project' }).click();
	await tabs.getByRole('link', { name: 'Writing' }).click();
	await expect(page).toHaveURL(at('/writing'));
	// the peel would have opened Basilica after 400ms
	await page.waitForTimeout(700);
	await expect(page).toHaveURL(at('/writing'));
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
	await expect(page.locator('.jobs li').first()).toContainText('Alpha Curve');
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

	test('a sticker click navigates straight away, without the peel', async ({
		page,
	}) => {
		await page.goto('/');
		await page.evaluate(() => {
			const w = window as typeof window & { peeled?: boolean };
			w.peeled = false;
			new MutationObserver(() => {
				if (document.querySelector('.is-peeling')) w.peeled = true;
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
				() => (window as typeof window & { peeled?: boolean }).peeled,
			),
		).toBe(false);
		expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
	});
});
