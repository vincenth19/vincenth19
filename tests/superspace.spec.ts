import { expect, type Page, test } from '@playwright/test';

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
		const query = page.locator('.ss-q');
		await expect(query).toHaveText('golden retriever video', {
			timeout: 12_000,
		});
		await expect(
			page.getByRole('button', { name: /golden retriever video/ }),
		).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('.ss-launcher .ss-panel')).toContainText(
			'0:45–0:59',
		);

		await page.getByRole('button', { name: 'Pause the demo' }).click();
		await expect(
			page.getByRole('button', { name: 'Play the demo' }),
		).toBeVisible();
		await page.waitForTimeout(4500);
		await expect(query).toHaveText('golden retriever video');

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

	test('each example search appears once, in the demo', async ({ page }) => {
		await page.goto(path);
		const stage = page.locator('main');
		for (const query of [
			'apartment lease bond',
			'golden retriever video',
			'wifi connect',
			'anjing',
			'3pm sydney in jakarta',
		]) {
			await expect(
				stage.locator('section:not(.ss-demo)').getByText(query),
			).toHaveCount(0);
		}
	});

	test('the search speed says where it was measured before the numbers', async ({
		page,
	}) => {
		await page.goto(path);
		const beat = page.locator('.ss-beat--pi');
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
		await expect(page.locator('.ss-q')).toHaveText('apartment lease bond');
	});

	test.describe('with reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('the demo is still and complete', async ({ page }) => {
			await page.goto(path);
			const panel = page.locator('.ss-launcher .ss-panel');
			await panel.scrollIntoViewIfNeeded();
			await expect(page.locator('.ss-q')).toHaveText('apartment lease bond');
			await expect(panel).toContainText('rental bond of $2,400');
			await expect(panel).toHaveAttribute('data-phase', 'shown');
			// nothing moves, so there is nothing to pause
			await expect(
				page.getByRole('button', { name: 'Pause the demo' }),
			).toHaveCount(0);
			await page.waitForTimeout(4500);
			await expect(page.locator('.ss-q')).toHaveText('apartment lease bond');
			expect(
				await panel.evaluate(
					(el) => el.getAnimations({ subtree: true }).length,
				),
			).toBe(0);

			// a chip shows its search at once
			await page.getByRole('button', { name: /3pm sydney in jakarta/ }).click();
			await expect(page.locator('.ss-q')).toHaveText('3pm sydney in jakarta');
			await expect(panel).toContainText('11:00 am in Jakarta');
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
