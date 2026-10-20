import { expect, type Page, test } from '@playwright/test';
import { overflowing } from './overflow';

const path = '/projects/super-space';
const repo = 'https://github.com/vincenth19/omarchy-super-space';
const install = `omarchy plugin add ${repo} --enable`;
const subhead =
	'Super Space is a Super+Space launcher for Omarchy. It finds apps, files, photos, moments in videos, spoken words and songs by what is in them, entirely on your computer.';

/** All the text on the page, rendered or not (closed FAQ answers included), without scripts. */
function pageText(page: Page) {
	return page.evaluate(() => {
		const copy = document.body.cloneNode(true) as HTMLElement;
		for (const el of copy.querySelectorAll('script, style, template')) {
			el.remove();
		}
		return `${document.title} ${copy.textContent ?? ''}`;
	});
}

test.describe('Super Space product page', () => {
	test('has its own title, description and Open Graph tags', async ({
		page,
	}) => {
		await page.goto(path);
		await expect(page).toHaveTitle('Super Space · Vincent Haryadi');
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			subhead,
		);
		const og = (property: string) =>
			page.locator(`meta[property="og:${property}"]`);
		await expect(og('title')).toHaveAttribute(
			'content',
			'Super Space · Vincent Haryadi',
		);
		await expect(og('description')).toHaveAttribute('content', subhead);
		await expect(og('url')).toHaveAttribute(
			'content',
			`https://vincenth19.com${path}`,
		);
		await expect(og('site_name')).toHaveAttribute('content', 'Vincent Haryadi');
		await expect(og('type')).toHaveAttribute('content', 'website');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://vincenth19.com${path}`,
		);
	});

	test('keeps the masthead with its sticker, Back and socials, in place of the book', async ({
		page,
	}) => {
		await page.goto(path);
		const mast = page.locator('header.mast');
		await expect(mast).toHaveAttribute('data-open', 'superspace');
		await expect(
			mast.getByRole('img', { name: 'Super Space sticker' }),
		).toBeVisible();
		await expect(mast.getByRole('link', { name: 'Back' })).toHaveAttribute(
			'href',
			'/',
		);
		await expect(page.locator('.socials a')).toHaveCount(7);
		await expect(
			page.getByRole('navigation', { name: 'Book sections' }),
		).toHaveCount(0);
		await expect(page.getByRole('main')).toHaveAttribute('id', 'content');
	});

	test('shows the headline and the install command, and Copy copies it', async ({
		page,
		context,
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto(path);
		await expect(
			page.getByRole('heading', { level: 2, name: 'Super Space' }),
		).toBeVisible();
		await expect(
			page.getByText('Search what you mean.', { exact: true }),
		).toBeVisible();
		await expect(page.getByText(subhead, { exact: true })).toBeVisible();

		const hero = page.locator('.ss-hero');
		await expect(hero.locator('code')).toHaveText(install);
		await expect(
			hero.getByRole('link', { name: 'View on GitHub' }),
		).toHaveAttribute('href', repo);
		await expect(hero.getByText('v0.1.4 · MIT · Omarchy 4')).toBeVisible();
		// the dots are hidden from screen readers, the spaces around them are not
		await expect(hero.locator('.ss-version')).toMatchAriaSnapshot(
			'- paragraph: v0.1.4 MIT Omarchy 4',
		);

		const copy = hero.getByRole('button', { name: 'Copy install command' });
		await expect(copy).toBeVisible();
		// the button works once the page has hydrated, so keep clicking until it does
		await expect(async () => {
			await copy.click();
			await expect(hero.getByRole('status')).toHaveText('Copied', {
				timeout: 1000,
			});
		}).toPass();
		await expect(hero.locator('.ss-copy')).toContainText('Copied');
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			install,
		);
	});

	test('install section has the requirements, sizes, uninstall and licence', async ({
		page,
	}) => {
		await page.goto(path);
		const section = page.locator('#install');
		await expect(section.locator('#ss-cmd-install')).toHaveText(install);
		await expect(section.locator('#ss-cmd-uninstall')).toHaveText(
			'superspace-setup uninstall',
		);
		await expect(
			section.getByRole('button', { name: 'Copy uninstall command' }),
		).toBeVisible();
		for (const text of [
			'Omarchy 4 (Hyprland and its Quickshell shell)',
			'8.5 MB',
			'9.0 MB',
			'310 MB',
			'555 MB',
			'82 MB',
			'not been run on x86 hardware',
			'under Google’s Gemma terms',
		]) {
			await expect(section).toContainText(text);
		}
		// one size per line, and a comma between them for screen readers (the
		// snapshot puts a space before it: the comma is out of the text flow)
		await expect(section.locator('.ss-size-app dd')).toMatchAriaSnapshot(
			'- definition: /8\\.5 MB arm64 ?, 9\\.0 MB x64/',
		);
		// the licence is as plain to see as the rest of the specs
		const licence = section.locator('.ss-licence dd');
		await expect(licence).toBeVisible();
		expect(await licence.evaluate((el) => getComputedStyle(el).color)).toBe(
			'rgb(236, 232, 225)',
		);
	});

	test('FAQ answers open and close', async ({ page }) => {
		await page.goto(path);
		const items = page.locator('.ss-faq details');
		await expect(items).toHaveCount(6);
		const item = items.filter({ hasText: 'Does it send my files anywhere?' });
		const answer = item.getByText(/read and indexed on your machine/);
		await expect(answer).toBeHidden();
		await item.getByText('Does it send my files anywhere?').click();
		await expect(item).toHaveAttribute('open', '');
		await expect(answer).toBeVisible();
		await item.getByText('Does it send my files anywhere?').click();
		await expect(item).not.toHaveAttribute('open');
		await expect(answer).toBeHidden();
	});

	test('never mentions what is not released yet', async ({ page }) => {
		await page.goto(path);
		const text = await pageText(page);
		expect(text).toContain('Search what you mean.');
		for (const word of [
			/preview/i,
			/translat/i,
			/your place/i,
			/\bEsc\b/,
			/escape key/i,
		]) {
			expect(text).not.toMatch(word);
		}
	});

	test('screen readers get the example searches as a list, not the animation', async ({
		page,
	}) => {
		await page.goto(path);
		const list = page.getByRole('list', { name: 'Example searches' });
		await expect(list.getByRole('listitem')).toHaveCount(5);
		await expect(list).toContainText(
			'finds the lease, page 3: “rental bond of $2,400”',
		);
		await expect(list).toContainText('weekend-clips-oct-2026.mp4');
		await expect(list).toContainText('11:00 am in Jakarta');
		await expect(page.locator('.ss-launcher .ss-panel')).toHaveAttribute(
			'aria-hidden',
			'true',
		);
	});

	test('the demo types through the searches and can be paused', async ({
		page,
	}) => {
		await page.goto(path);
		await page.locator('.ss-launcher').scrollIntoViewIfNeeded();
		const query = page.locator('.ss-launcher .ss-q');
		await expect(query).toHaveText('apartment lease bond', {
			timeout: 12_000,
		});
		// the chip marks the search on screen, without a pressed state that would
		// change by itself
		const chip = page.getByRole('button', { name: /apartment lease bond/ });
		await expect(chip).toHaveAttribute('aria-current', 'true');
		await expect(chip).not.toHaveAttribute('aria-pressed');
		await expect(page.locator('.ss-launcher .ss-panel')).toContainText(
			'rental bond of $2,400',
		);

		await page.getByRole('button', { name: 'Pause the demo' }).click();
		await expect(
			page.getByRole('button', { name: 'Play the demo' }),
		).toBeVisible();
		await page.waitForTimeout(4500);
		await expect(query).toHaveText('apartment lease bond');

		await page.getByRole('button', { name: /wifi connect/ }).click();
		await expect(query).toHaveText('wifi connect');
		await expect(page.locator('.ss-launcher .ss-panel')).toContainText('Wi-Fi');
		// the panel is hidden from screen readers, so a chip says what it shows
		await expect(page.locator('.ss-launcher [aria-live="polite"]')).toHaveText(
			'“wifi connect” finds the Omarchy Wi-Fi setting.',
		);
		// the pause control sits under the panel, not inside it
		await expect(
			page.locator('.ss-panel').getByRole('button', { name: /demo/ }),
		).toHaveCount(0);
	});

	test('each feature shows its real result, without repeating the demo’s panel', async ({
		page,
	}) => {
		await page.goto(path);
		// the launcher's panel is the demo's alone: the beats set the result in type
		await expect(page.locator('.ss-panel')).toHaveCount(1);
		const files = page.locator('.ss-beat--files .ss-find');
		await expect(files).toBeVisible();
		await expect(files).toContainText('apartment lease bond');
		await expect(files).toContainText('“…rental bond of $2,400…”');
		await expect(files).toContainText('The lease · page 3');
		const moments = page.locator('.ss-beat--moments .ss-find');
		await expect(moments).toContainText('golden retriever video');
		await expect(moments).toContainText('0:10–0:30');
		await expect(moments).toContainText('0:45–0:59');
		await expect(moments).toContainText('weekend-clips-oct-2026.mp4');
		// screen readers already have these searches, in the demo's list
		for (const find of [files, moments]) {
			await expect(find).toHaveAttribute('aria-hidden', 'true');
		}

		const everything = page.locator('.ss-beat--everything');
		await expect(everything).toContainText('emoji in any language');
		await expect(everything).toContainText('Omarchy settings by meaning');
		await expect(everything).toContainText('folders by name');
		await expect(everything).toContainText(
			'quick answers: maths, units, currency, time zones',
		);
		await expect(everything).toContainText('Firefox and Zen');
		const scopes = page.locator('.ss-beat--scopes');
		await expect(
			scopes.getByRole('heading', { name: 'Scope words narrow a search.' }),
		).toBeVisible();
		await expect(scopes.getByRole('listitem')).toHaveCount(5);
		await expect(scopes).toContainText('camera folder');
		// the song search is an example, not a search box with nothing found
		const speech = page.locator('.ss-beat--speech');
		await expect(speech.getByText('songs about a breakup')).toBeVisible();
		await expect(speech.locator('.ss-panel')).toHaveCount(0);
	});

	test('the demo’s first search is not the one the next beat sets out', async ({
		page,
	}) => {
		await page.goto(path);
		const first = await page.locator('.ss-launcher .ss-q').textContent();
		const next = await page.locator('.ss-beat--files .ss-find-q').textContent();
		expect(first?.trim()).toBe('golden retriever video');
		expect(next?.trim()).toBe('apartment lease bond');
	});

	test('the headline and the install command are on the first screen', async ({
		page,
	}) => {
		for (const viewport of [
			{ width: 1440, height: 900 },
			{ width: 1280, height: 800 },
			{ width: 1920, height: 1080 },
		]) {
			await page.setViewportSize(viewport);
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const command = await page.locator('.ss-hero .ss-cmd').boundingBox();
			const headline = await page.locator('.ss-headline').boundingBox();
			expect(command && headline).toBeTruthy();
			if (command && headline) {
				expect(headline.y, `${viewport.width}`).toBeGreaterThanOrEqual(0);
				expect(command.y + command.height, `${viewport.width}`).toBeLessThan(
					viewport.height,
				);
			}
		}
	});

	test('the home page does not fetch this page’s fonts or stylesheet ahead', async ({
		page,
	}) => {
		const preloads = () =>
			page.evaluate(() =>
				[
					...document.querySelectorAll(
						'link[rel="preload"]:is([as="font"], [as="style"])',
					),
				].map((l) => `${l.getAttribute('as')} ${l.getAttribute('href')}`),
			);
		// the site's own preloads, on a page without the Super Space sticker
		await page.goto('/writing');
		const site = await preloads();
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1500); // links in view prefetch once the page is idle
		for (const preload of await preloads()) {
			expect(site).toContain(preload);
		}
	});

	test('the search speed says where it was measured before the numbers', async ({
		page,
	}) => {
		await page.goto(path);
		// measured on the VM, not the Pi: out of the Pi's band, in a beat of its own
		const band = page.locator('.ss-beat--pi');
		await expect(band).toContainText('Indexing, measured on the Pi');
		await expect(band).not.toContainText(/\bms\b/);
		await expect(band).not.toContainText('Try Omarchy VM');
		const beat = page.locator('.ss-beat--speed');
		await expect(beat).not.toHaveClass(/ss-band/);
		const label = beat.getByText(
			'Search speed, measured on the Try Omarchy VM (Apple Silicon)',
		);
		const number = beat.locator('.ss-stat-num', { hasText: '73' });
		await expect(label).toBeVisible();
		const [l, n] = await Promise.all([
			label.boundingBox(),
			number.boundingBox(),
		]);
		expect(l && n && l.y + l.height <= n.y).toBe(true);
	});

	test('the demo waits while it is off screen', async ({ page }) => {
		await page.goto(path);
		await page.waitForTimeout(5000); // longer than one search is held
		await expect(page.locator('.ss-launcher .ss-q')).toHaveText(
			'golden retriever video',
		);
	});

	test('the example chips and Pause are one row, at every width', async ({
		page,
	}) => {
		for (const width of [390, 768, 820, 1024, 1180, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const pause = page.getByRole('button', { name: 'Pause the demo' });
			await expect(pause).toBeVisible();
			const tops = await page
				.locator('.ss-demo-controls :is(.ss-chip, .ss-pause)')
				.evaluateAll((els) =>
					els.map((el) => Math.round(el.getBoundingClientRect().top)),
				);
			expect(tops, `${width}`).toHaveLength(6);
			expect(new Set(tops).size, `${width}`).toBe(1);
		}
	});

	test.describe('with reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('the demo is still and complete', async ({ page }) => {
			await page.goto(path);
			const panel = page.locator('.ss-launcher .ss-panel');
			await panel.scrollIntoViewIfNeeded();
			const query = page.locator('.ss-launcher .ss-q');
			await expect(query).toHaveText('golden retriever video');
			await expect(panel).toContainText('0:10–0:30');
			await expect(panel).toContainText('0:45–0:59');
			await expect(panel).toContainText('weekend-clips-oct-2026.mp4');
			await expect(panel).toHaveAttribute('data-phase', 'shown');
			// nothing moves, so there is nothing to pause
			await expect(
				page.getByRole('button', { name: 'Pause the demo' }),
			).toHaveCount(0);
			await page.waitForTimeout(4500);
			await expect(query).toHaveText('golden retriever video');
			expect(
				await panel.evaluate(
					(el) => el.getAnimations({ subtree: true }).length,
				),
			).toBe(0);

			// a chip shows its search at once
			await page.getByRole('button', { name: /3pm sydney in jakarta/ }).click();
			await expect(query).toHaveText('3pm sydney in jakarta');
			await expect(panel).toContainText('11:00 am in Jakarta');
		});

		// No result is ever cut short: not the passage, a moment, a file name or
		// the query. Only the web row, which repeats the query, may end in "…".
		test('the launcher shows every result whole, from phones to laptops', async ({
			page,
		}) => {
			for (const width of [320, 360, 390, 768, 901, 960, 1024, 1100, 1440]) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(path);
				await page.evaluate(() => document.fonts.ready);
				const chips = page.locator('.ss-chip');
				for (let i = 0; i < 5; i++) {
					await chips.nth(i).click();
					const cut = await page
						.locator('.ss-launcher')
						.evaluate((launcher) =>
							[
								...launcher.querySelectorAll(
									'.ss-q, .ss-row:not(.ss-row--web) :is(.ss-head-text, .ss-moment, .ss-meta)',
								),
							]
								.filter((el) => el.scrollWidth > el.clientWidth + 1)
								.map((el) => el.textContent),
						);
					expect(cut, `${width}px, search ${i + 1}`).toEqual([]);
				}
				const panel = page.locator('.ss-launcher .ss-panel');
				await chips.nth(1).click();
				await expect(panel).toContainText('rental bond of $2,400');
				// and nothing on the stage sticks out past the screen's edges
				expect(await overflowing(page, '.ss'), `${width}px`).toEqual([]);
			}
		});
	});

	test.describe('at 390px wide', () => {
		test.use({ viewport: { width: 390, height: 844 } });

		test('fits: no sideways scroll, the command wraps in its box, tap targets are 44px', async ({
			page,
		}) => {
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(600); // the header slap
			const { scrollWidth, clientWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
			}));
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
			// and nothing on the stage sticks out to be clipped by the desk
			expect(await overflowing(page, '.ss')).toEqual([]);

			// the install command wraps inside its box
			const box = await page.locator('.ss-hero .ss-cmd').boundingBox();
			const code = await page.locator('.ss-hero .ss-cmd code').boundingBox();
			expect(box && code).toBeTruthy();
			if (box && code) {
				expect(box.x).toBeGreaterThanOrEqual(0);
				expect(box.x + box.width).toBeLessThanOrEqual(clientWidth);
				expect(code.x + code.width).toBeLessThanOrEqual(box.x + box.width);
			}

			// the launcher fits the screen
			const panel = await page.locator('.ss-launcher .ss-panel').boundingBox();
			expect(panel).toBeTruthy();
			if (panel) {
				expect(panel.x).toBeGreaterThanOrEqual(0);
				expect(panel.x + panel.width).toBeLessThanOrEqual(clientWidth);
			}

			const targets = page.locator(
				'.ss :is(button, summary, a.ss-gh, a.ss-button, a.ss-foot-link)',
			);
			const count = await targets.count();
			expect(count).toBeGreaterThan(10);
			for (let i = 0; i < count; i++) {
				const t = await targets.nth(i).boundingBox();
				expect(t, `target ${i}`).toBeTruthy();
				if (t) expect(t.height, `target ${i}`).toBeGreaterThanOrEqual(44);
			}
		});
	});
});
