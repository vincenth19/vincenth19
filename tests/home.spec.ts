import { test, expect } from '@playwright/test';

//setup home page location
test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/Vincent Haryadi/);
});

//summary content
test.describe('Summary Content', () => {
	test('should show my illustration, subtitle, and summary', async ({
		page,
	}) => {
		await expect(page.getByTestId('illustration')).toBeVisible();
		await expect(page.getByTestId('subtitle')).toHaveText(
			/Front-end developer/
		);
		await expect(page.getByTestId('summary')).toHaveText(/front-end developer/);
		await expect(
			page.getByRole('button', { name: 'My Projects' })
		).toBeVisible();
	});

	test('should go to /projects page', async ({ page }) => {
		await page.getByRole('link', { name: 'My Projects' }).click();
		await expect(page).toHaveURL('/projects');
	});
});
