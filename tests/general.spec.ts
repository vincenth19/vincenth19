import { test, expect } from '@playwright/test';

//setup home page location
test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/Vincent Haryadi/);
});

//navbar test
test.describe('Navbar Test', () => {
	test.describe('Theme Switcher', () => {
		test('should show theme switcher', async ({ page }) => {
			await expect(page.getByTestId('themeSwitcher')).toBeVisible();
		});

		//dark mode test

		//light mode test
	});
	test.describe('Web Mobile Responsive', () => {
		test.use({ viewport: { width: 400, height: 900 } });
		test('should show hamburger menu only', async ({ page }) => {
			await expect(page.getByTestId('myName')).toBeHidden();
			await expect(page.getByTestId('menuList')).toBeHidden();
			await expect(page.getByTestId('hamburgerMenu')).toBeVisible();
		});
		//display drawer test

		//close drawer test
	});
	test.describe('Web Desktop', () => {
		test('should show name and hide hamburger menu', async ({
			page,
			isMobile,
		}) => {
			if (!isMobile) {
				await expect(page.getByTestId('myName')).toBeVisible();
				await expect(page.getByTestId('hamburgerMenu')).toBeHidden();
			}
		});
		test('should go to Projects page', async ({ page, isMobile }) => {
			if (!isMobile) {
				await expect(page.getByTestId('menuList')).toBeVisible();
				await page
					.locator('[data-test-id="menuList"]')
					.getByRole('link', { name: 'Projects' })
					.click();
				await expect(page).toHaveURL('/projects');
			}
		});
		test('should go to Home page', async ({ page, isMobile }) => {
			if (!isMobile) {
				await expect(page.getByTestId('menuList')).toBeVisible();
				await page.getByRole('link', { name: 'Home' }).click();
				await expect(page).toHaveURL('/');
			}
		});
	});
});
