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
	});

	//TODO: remove this when ready
	test.skip();
	test('should go to project page', async ({ page }) => {
		await page
			.locator('[data-test-id="btnToProjects"]')
			.getByRole('button', { name: 'My Projects' })
			.click();
		await expect(page).toHaveURL('/projects');
	});
});

//experiences content
test.describe('Work Experiences Content', () => {
	test('should show work experiences', async ({ page }) => {
		await expect(page.getByTestId('experiences')).toBeVisible();
	});
});
