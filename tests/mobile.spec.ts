import { expect, test } from '@playwright/test';
import { overflowing } from './overflow';

const routes = [
	'/',
	'/projects/super-space',
	'/projects/basilica',
	'/projects/covidtracker',
	'/writing',
	'/resume',
	'/projects/not-a-project',
];

test.describe('at 390px wide', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	for (const route of routes) {
		test(`${route} does not scroll sideways`, async ({ page }) => {
			await page.goto(route);
			await page.evaluate(() => document.fonts.ready);
			const { scrollWidth, clientWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
			}));
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
			// the desk clips what sticks out, so scrollWidth alone would miss it
			expect(await overflowing(page, '.desk')).toEqual([]);
		});
	}
});
