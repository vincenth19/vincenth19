import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the production build (`next start`), so run
 * `bun run build` first. Locally an already running server on PORT is reused.
 *
 * PW_CHROMIUM_PATH points Playwright at an already installed Chromium when the
 * browser revision for this @playwright/test version is not installed.
 */
const port = Number(process.env.PORT ?? 3123);
const baseURL = `http://localhost:${port}`;
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI
		? [['github'], ['html', { open: 'never' }]]
		: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL,
		trace: 'retain-on-failure',
		launchOptions: { executablePath },
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `bun run start -- --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
