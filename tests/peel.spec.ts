import {
	type BrowserContext,
	type CDPSession,
	expect,
	type Locator,
	type Page,
	test,
} from '@playwright/test';
import { recordTransitions } from './viewTransitions';

const at = (path: string) => (url: URL) => url.pathname === path;

/** components/usePeel.ts: let go with the corner peeled past this and the sticker comes off. */
const PEEL_OPEN = 0.34;

type Point = { x: number; y: number };
type TouchType = 'touchStart' | 'touchMove' | 'touchEnd';

/**
 * The hint lifts a corner once a visit. The tests that drag start with it
 * seen, so no corner moves under them by itself.
 */
async function skipHint(context: BrowserContext) {
	await context.addInitScript(() => {
		try {
			window.sessionStorage.setItem('vh19:peel-hint', '1');
		} catch {}
	});
}

const sticker = (page: Page, key: string) =>
	page.locator(`.collage .stk--${key}`);

/** The --peel a sticker shows now. */
const peelOf = (el: Locator) =>
	el.evaluate((e) =>
		Number.parseFloat(getComputedStyle(e).getPropertyValue('--peel')),
	);

/** The middle of a sticker's grip (the corner to take hold of), with the sticker brought into view. */
async function gripOf(page: Page, key: string): Promise<Point> {
	await sticker(page, key).evaluate((el) =>
		el.scrollIntoView({ block: 'center', behavior: 'instant' }),
	);
	const box = await sticker(page, key).locator('.stk-grip').boundingBox();
	if (!box) throw new Error(`no grip on ${key}`);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** `steps` points from `from` to `distance` px up and to the left: the way a bottom-right corner peels. */
function inwards(from: Point, distance: number, steps: number): Point[] {
	return Array.from({ length: steps }, (_, i) => {
		const d = (distance * (i + 1)) / steps / Math.SQRT2;
		return { x: from.x - d, y: from.y - d };
	});
}

/** A mouse drag along `path`, a frame a step, held still for `hold` ms before it lets go (0: a flick). */
async function mouseDrag(page: Page, from: Point, path: Point[], hold = 200) {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	for (const p of path) {
		await page.mouse.move(p.x, p.y);
		await page.waitForTimeout(16);
	}
	if (hold) await page.waitForTimeout(hold);
	await page.mouse.up();
}

/** Resolves once no page transition runs (a press during one is dropped, on purpose). */
const settled = (page: Page) =>
	page.waitForFunction(() => !('vt' in document.documentElement.dataset));

/**
 * One finger, through Chrome's own input pipeline (CDP), so the page sees
 * real touches: it can scroll, and touch-action applies.
 */
async function touchDrag(
	cdp: CDPSession,
	page: Page,
	from: Point,
	path: Point[],
	hold = 200,
) {
	const touch = (type: TouchType, points: Point[]) =>
		cdp.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: points.map((p) => ({ ...p, id: 1 })),
		});
	await touch('touchStart', [from]);
	for (const p of path) {
		await touch('touchMove', [p]);
		await page.waitForTimeout(16);
	}
	if (hold) await page.waitForTimeout(hold);
	await touch('touchEnd', []);
}

/**
 * Notes, from the first paint on, every data-peel a sticker takes ("drag",
 * "hint", …) and every time it is pulled far enough to come off (data-ready).
 */
async function watchPeel(context: BrowserContext) {
	await context.addInitScript(() => {
		const w = window as unknown as { __peels: string[] };
		w.__peels = [];
		new MutationObserver((records) => {
			for (const r of records) {
				const el = r.target as HTMLElement;
				const key = [...el.classList].find((c) => c.startsWith('stk--'));
				const value = el.getAttribute(r.attributeName ?? '');
				if (value !== null)
					w.__peels.push(`${key} ${r.attributeName}=${value}`);
			}
		}).observe(document, {
			subtree: true,
			attributes: true,
			attributeFilter: ['data-peel', 'data-ready'],
		});
	});
	return (page: Page) =>
		page.evaluate(() => (window as unknown as { __peels: string[] }).__peels);
}

test.describe('peeling a sticker with a mouse', () => {
	test.use({ viewport: { width: 1440, height: 900 } });
	test.beforeEach(async ({ context }) => skipHint(context));

	test('a drag past the threshold peels it off and opens the project, the morph starting from the peeled pose', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		const grip = basilica.locator('.stk-grip');
		const from = await gripOf(page, 'basilica');
		const entries = await page.evaluate(() => history.length);
		await expect(grip).toHaveCSS('cursor', 'grab');

		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		const path = inwards(from, 150, 15);
		for (const p of path.slice(0, 4)) await page.mouse.move(p.x, p.y);
		// in hand: the corner follows the pointer, not yet far enough to come off
		await expect(basilica).toHaveAttribute('data-peel', 'drag');
		await expect(grip).toHaveCSS('cursor', 'grabbing');
		await expect(basilica).not.toHaveAttribute('data-ready');
		const partway = await peelOf(basilica);
		for (const p of path.slice(4)) await page.mouse.move(p.x, p.y);
		// far enough: let go now and it comes off, and it says so
		await expect(basilica).toHaveAttribute('data-ready', '');
		expect(await peelOf(basilica)).toBeGreaterThan(partway);
		await page.waitForTimeout(200);
		await page.mouse.up();

		await expect(page).toHaveURL(at('/projects/basilica'));
		await expect(
			page.getByRole('heading', { level: 2, name: 'Basilica' }),
		).toBeFocused();
		await vts.settled();
		const [open] = await vts.take();
		expect(open).toMatchObject({ direction: 'open', finished: true });
		expect(open.pairs).toContain('stk-basilica');
		expect(open.named['book stk--basilica']).toBe('stk-basilica');
		// the flight took the sticker as it was let go: peeled, not flat
		expect(open.peel ?? 0).toBeGreaterThanOrEqual(PEEL_OPEN);
		// one step in history, as a click makes
		expect(await page.evaluate(() => history.length)).toBe(entries + 1);
	});

	test('a short drag springs back and stays on the Projects page', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const covid = sticker(page, 'covid');
		const from = await gripOf(page, 'covid');
		await page.mouse.move(from.x, from.y);
		// hovered, the corner lifts
		await expect.poll(() => peelOf(covid)).toBeCloseTo(0.2, 2);

		await page.mouse.down();
		for (const p of inwards(from, 30, 6)) await page.mouse.move(p.x, p.y);
		const pulled = await peelOf(covid);
		expect(pulled).toBeGreaterThan(0.22);
		expect(pulled).toBeLessThan(PEEL_OPEN);
		await page.waitForTimeout(200);
		await page.mouse.up();

		// a short spring back down, to the hover peel (the mouse is still on it)
		await expect(covid).toHaveAttribute('data-peel', 'spring');
		await expect(covid).not.toHaveAttribute('data-peel', { timeout: 1500 });
		expect(await peelOf(covid)).toBeCloseTo(0.2, 2);
		// and flat(ish) again once the mouse leaves
		await page.mouse.move(10, 10);
		await expect.poll(() => peelOf(covid)).toBeCloseTo(0.065, 2);
		await page.waitForTimeout(300);
		await expect(page).toHaveURL(at('/'));
		expect(await vts.all()).toEqual([]);
	});

	test('a click on the sticker or on its corner still opens it, and a modifier click still opens a new tab', async ({
		page,
		context,
	}) => {
		await page.goto('/');
		const covid = sticker(page, 'covid');
		const [tab] = await Promise.all([
			context.waitForEvent('page'),
			covid.click({ modifiers: ['ControlOrMeta'] }),
		]);
		await tab.close();
		await expect(page).toHaveURL(at('/'));

		const from = await gripOf(page, 'covid');
		await page.mouse.click(from.x, from.y);
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await page.getByRole('link', { name: 'Back', exact: true }).click();
		await expect(page).toHaveURL(at('/'));
		await settled(page);
		await covid.click();
		await expect(page).toHaveURL(at('/projects/covidtracker'));
	});
});

test.describe('peeling a sticker on a phone', () => {
	test.use({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
	});
	test.beforeEach(async ({ context }) => skipHint(context));

	test('the corner is a grip of at least 44px, slightly lifted at rest; only it holds a touch', async ({
		page,
	}) => {
		await page.goto('/');
		for (const key of ['superspace', 'basilica', 'covid']) {
			const el = sticker(page, key);
			const size = await el
				.locator('.stk-grip')
				.evaluate((g) => [
					(g as HTMLElement).offsetWidth,
					(g as HTMLElement).offsetHeight,
				]);
			expect(Math.min(...size), key).toBeGreaterThanOrEqual(44);
			expect(await peelOf(el), key).toBeGreaterThan(0.04);
			await expect(el.locator('.stk-grip')).toHaveCSS('touch-action', 'none');
			await expect(el).toHaveCSS('touch-action', 'auto');
		}
	});

	test('a touch drag from the corner peels it off and opens the project', async ({
		page,
		context,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const from = await gripOf(page, 'covid');
		await touchDrag(cdp, page, from, inwards(from, 150, 15));
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await vts.settled();
		const [open] = await vts.take();
		expect(open.pairs).toContain('stk-covid');
		expect(open.peel ?? 0).toBeGreaterThanOrEqual(PEEL_OPEN);
	});

	test('a quick flick of the corner peels it off, short of the threshold', async ({
		page,
		context,
	}) => {
		const vts = await recordTransitions(page);
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const from = await gripOf(page, 'covid');
		// a flick is over in a frame or two: the moves go out back to back
		const touch = (type: TouchType, points: Point[]) =>
			cdp.send('Input.dispatchTouchEvent', {
				type,
				touchPoints: points.map((p) => ({ ...p, id: 1 })),
			});
		await touch('touchStart', [from]);
		const path = inwards(from, 50, 4);
		await Promise.all(path.map((p) => touch('touchMove', [p])));
		await touch('touchEnd', []);
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await vts.settled();
		const [open] = await vts.take();
		expect(open.pairs).toContain('stk-covid');
		// it was never pulled as far as letting go would open it: the flick did
		const seen = await peels(page);
		expect(seen).toContain('stk--covid data-peel=off');
		expect(seen).not.toContain('stk--covid data-ready=');
	});

	test('a short touch drag springs back', async ({ page, context }) => {
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const superspace = sticker(page, 'superspace');
		const from = await gripOf(page, 'superspace');
		await touchDrag(cdp, page, from, inwards(from, 36, 6));
		await expect(superspace).not.toHaveAttribute('data-peel', {
			timeout: 1500,
		});
		expect(await peelOf(superspace)).toBeCloseTo(0.055, 2);
		await page.waitForTimeout(300);
		await expect(page).toHaveURL(at('/'));
	});

	test('a vertical swipe across a sticker scrolls the page, and neither peels nor opens it', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const basilica = sticker(page, 'basilica');
		await basilica.evaluate((el) =>
			el.scrollIntoView({ block: 'center', behavior: 'instant' }),
		);
		const box = await basilica.boundingBox();
		if (!box) throw new Error('no sticker');
		const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		const before = await page.evaluate(() => window.scrollY);
		// up the screen, as a thumb scrolls down the page
		const path = Array.from({ length: 12 }, (_, i) => ({
			x: from.x,
			y: from.y - (i + 1) * 15,
		}));
		await touchDrag(cdp, page, from, path, 0);
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(before + 100);
		await page.waitForTimeout(500);
		await expect(page).toHaveURL(at('/'));
		expect(await peels(page)).toEqual([]);
	});

	test('a second finger is not a peel', async ({ page, context }) => {
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const covid = sticker(page, 'covid');
		const from = await gripOf(page, 'covid');
		const touch = (type: TouchType, points: Point[]) =>
			cdp.send('Input.dispatchTouchEvent', {
				type,
				touchPoints: points.map((p, i) => ({ ...p, id: i + 1 })),
			});
		const path = inwards(from, 160, 16);
		const other = { x: 40, y: 200 };
		await touch('touchStart', [from]);
		for (const p of path.slice(0, 5)) await touch('touchMove', [p]);
		await expect(covid).toHaveAttribute('data-peel', 'drag');
		// a pinch: the second finger lands, and the first goes on as far as would open it
		await touch('touchStart', [path[4], other]);
		for (const p of path.slice(5)) await touch('touchMove', [p, other]);
		await touch('touchEnd', [path[15]]);
		await touch('touchEnd', []);
		await expect(covid).not.toHaveAttribute('data-peel', { timeout: 1500 });
		await page.waitForTimeout(400);
		await expect(page).toHaveURL(at('/'));
	});

	test('a tap opens it, on the sticker or on its corner', async ({ page }) => {
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		await basilica.tap();
		await expect(page).toHaveURL(at('/projects/basilica'));
		await page.getByRole('link', { name: 'Back', exact: true }).tap();
		await expect(page).toHaveURL(at('/'));
		await settled(page);
		const from = await gripOf(page, 'basilica');
		await page.touchscreen.tap(from.x, from.y);
		await expect(page).toHaveURL(at('/projects/basilica'));
	});
});

test.describe('opening a sticker from the keyboard', () => {
	test.beforeEach(async ({ context }) => skipHint(context));

	test('Enter opens it, and Space does too, without scrolling the page', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		await basilica.focus();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(at('/projects/basilica'));
		await vts.settled();

		await page.getByRole('link', { name: 'Back', exact: true }).click();
		await expect(page).toHaveURL(at('/'));
		await expect(basilica).toBeFocused();
		await vts.settled();
		const scrolled = await page.evaluate(() => window.scrollY);
		await page.keyboard.down(' ');
		await page.waitForTimeout(100);
		expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
		await page.keyboard.up(' ');
		await expect(page).toHaveURL(at('/projects/basilica'));
		await vts.settled();
		const runs = await vts.take();
		expect(runs.map((v) => v.direction)).toEqual(['open', 'close', 'open']);
		for (const run of runs) expect(run.pairs).toContain('stk-basilica');
	});
});

test.describe('with reduced motion', () => {
	test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
	test.beforeEach(async ({ context }) => skipHint(context));

	test('a drag still peels it off, and the project opens without the morph', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		const from = await gripOf(page, 'basilica');
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		for (const p of inwards(from, 150, 12)) await page.mouse.move(p.x, p.y);
		// it follows the pointer all the same: the reader moves it, not the page
		await expect(basilica).toHaveAttribute('data-ready', '');
		await page.mouse.up();
		await expect(page).toHaveURL(at('/projects/basilica'), { timeout: 2000 });
		await expect(
			page.getByRole('heading', { level: 2, name: 'Basilica' }),
		).toBeFocused();
		expect(await vts.all()).toEqual([]);

		// a short one goes straight back down
		await page.getByRole('link', { name: 'Back', exact: true }).click();
		await expect(page).toHaveURL(at('/'), { timeout: 2000 });
		const again = await gripOf(page, 'basilica');
		await mouseDrag(page, again, inwards(again, 30, 4));
		await expect(basilica).not.toHaveAttribute('data-peel');
		await expect(page).toHaveURL(at('/'));
		expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
	});
});

test('the hint lifts the first sticker in view once a visit', async ({
	page,
	context,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	const peels = await watchPeel(context);
	await page.goto('/');
	await expect
		.poll(() => peels(page))
		.toEqual(['stk--superspace data-peel=hint']);
	const superspace = sticker(page, 'superspace');
	// it lifts and settles back by itself
	await expect(superspace).not.toHaveAttribute('data-peel', { timeout: 3000 });
	expect(await peelOf(superspace)).toBeCloseTo(0.055, 2);
	// once a visit: not again on this tab, nor when the stickers come back into view
	await page.reload();
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(1500);
	expect(await peels(page)).toEqual([]);
});

test.describe('the hint, with reduced motion', () => {
	test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });

	test('does not play', async ({ page, context }) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		await page.waitForTimeout(1500);
		expect(await peels(page)).toEqual([]);
	});
});
