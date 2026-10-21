import { expect, test } from '@playwright/test';

test.describe('home (Projects)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('shows the name and the three stickers in order, with captions', async ({
		page,
	}) => {
		await expect(page).toHaveTitle('Vincent Haryadi');
		await expect(
			page.getByRole('heading', { level: 1, name: 'Vincent Haryadi' }),
		).toBeVisible();

		const stickers = page.locator('.collage').getByRole('link');
		await expect(stickers).toHaveCount(3);
		const expected = [
			['Super Space, 2026. Open project', '/projects/super-space'],
			['Basilica. Open project', '/projects/basilica'],
			['CovidTracker, 2021. Open project', '/projects/covidtracker'],
		];
		for (const [i, [label, href]] of expected.entries()) {
			await expect(stickers.nth(i)).toHaveAccessibleName(label);
			await expect(stickers.nth(i)).toHaveAttribute('href', href);
		}

		await expect(page.locator('.cap-name')).toHaveText([
			'Super Space',
			'Basilica',
			'CovidTracker',
		]);
		await expect(page.locator('.cap-desc')).toHaveText([
			'Spotlight for Omarchy that gets what you mean.',
			'A theme for the Omarchy desktop.',
			'COVID-19 numbers for Indonesia, made readable.',
		]);
		await expect(
			page.getByText('Peel a sticker to read about it.'),
		).toHaveCount(1);
	});

	test('says what Vincent does: three commands, verbs on one axis', async ({
		page,
	}) => {
		const lines = page.locator('.tagline .cl');
		await expect(lines).toHaveText([
			'Build full-stack web and mobile apps.',
			'Ship AI features people rely on.',
			'Design with taste and product sense.',
		]);
		await expect(page.locator('.tagline .kw')).toHaveText([
			'web',
			'mobile',
			'AI',
			'taste',
			'product',
		]);
		// one verb per line, and every chip in an ink of its own
		await expect(page.locator('.tagline .verb')).toHaveText([
			'Build',
			'Ship',
			'Design',
		]);
		const inks = await page
			.locator('.tagline .kw')
			.evaluateAll((els) =>
				els.map((el) => getComputedStyle(el).getPropertyValue('--c')),
			);
		expect(new Set(inks).size).toBe(5);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			'Vincent Haryadi, full-stack web, mobile and AI engineer in Brisbane, product- and design-minded. Projects, writing and resume.',
		);
	});

	test('the tagline wraps at its phrases on a phone', async ({ page }) => {
		for (const width of [390, 320]) {
			await page.setViewportSize({ width, height: 844 });
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);
			// a chip never breaks from the words it belongs with, nor sticks out
			const right = await page.evaluate(() =>
				Math.max(
					...[...document.querySelectorAll('.tagline .kw')].map(
						(el) => el.getBoundingClientRect().right,
					),
				),
			);
			expect(right, `${width}px`).toBeLessThanOrEqual(width);
			const nw = await page
				.locator('.tagline .nw')
				.evaluateAll((els) => els.map((el) => el.getClientRects().length));
			expect(
				nw.every((n) => n === 1),
				`${width}px`,
			).toBe(true);
		}
	});

	test('has all seven social links, labelled', async ({ page }) => {
		const socials = page.locator('.socials a');
		const expected = [
			['GitHub', 'https://github.com/vincenth19'],
			['LinkedIn', 'https://www.linkedin.com/in/vincenth19/'],
			['X', 'https://x.com/vincenth19_'],
			['Email', 'mailto:me@vincenth19.com'],
			['TikTok', 'https://www.tiktok.com/@vincent.sprint'],
			['Instagram', 'https://www.instagram.com/vincent.sprint/'],
			['YouTube', 'https://www.youtube.com/@vincent.sprint'],
		];
		await expect(socials).toHaveCount(expected.length);
		for (const [i, [label, href]] of expected.entries()) {
			await expect(socials.nth(i)).toHaveAttribute('aria-label', label);
			await expect(socials.nth(i)).toHaveAttribute('href', href);
		}
	});

	test('marks the Projects tab as the current page', async ({ page }) => {
		const tabs = page.getByRole('navigation', { name: 'Book sections' });
		await expect(tabs.getByRole('link', { name: 'Projects' })).toHaveAttribute(
			'aria-current',
			'page',
		);
		await expect(
			tabs.getByRole('link', { name: 'Writing' }),
		).not.toHaveAttribute('aria-current');
	});
});
