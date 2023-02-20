import { test, expect } from '@playwright/test';

//setup project page location
test.beforeEach(async ({ page }) => {
	await page.goto('/projects');
	await expect(page).toHaveTitle(/Vincent Haryadi/);
});

//projects header content
test.describe('Projects Header Content', () => {
	test('should bulb icon and title', async ({ page }) => {
		await expect(page.getByTestId('iconBulb')).toBeVisible();
		const heading = page.getByRole('heading', { name: 'Projects' });
		await expect(heading).toBeVisible();
		await expect(heading).toHaveText(/Projects/);
		await expect(page.locator('[data-test-id="projectSubtitle"]')).toHaveText(
			/Collection/
		);
	});
	test('should go to home page', async ({ page }) => {
		await page.locator('[data-test-id="btnBackHome"]').click();
		await expect(page).toHaveURL('/');
	});
});

//project content
