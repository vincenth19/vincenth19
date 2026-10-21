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

/** Resolves once the page has stopped scrolling (a flick that scrolled it glides on a moment). */
async function scrollStill(page: Page) {
	const y = () => page.evaluate(() => window.scrollY);
	let last = await y();
	for (;;) {
		await page.waitForTimeout(150);
		const now = await y();
		if (now === last) return;
		last = now;
	}
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
 * One finger along `path`, each touch stamped `stepMs` after the last (the
 * page reads its speed from those times, not from when they arrive), and
 * lifted one step after the last move.
 */
async function timedTouch(
	cdp: CDPSession,
	from: Point,
	path: Point[],
	stepMs: number,
	/** also wait that long between the moves, as a finger would (else they go out back to back) */
	paced = false,
) {
	let t = Date.now() / 1000;
	const touch = (type: TouchType, points: Point[]) =>
		cdp.send('Input.dispatchTouchEvent', {
			type,
			timestamp: t,
			touchPoints: points.map((p) => ({ ...p, id: 1 })),
		});
	await touch('touchStart', [from]);
	for (const p of path) {
		t += stepMs / 1000;
		await touch('touchMove', [p]);
		if (paced) await new Promise((r) => setTimeout(r, stepMs));
	}
	t += stepMs / 1000;
	await touch('touchEnd', []);
}

/** `steps` points from `from` straight up the screen, `distance` px in all: a thumb scrolling down the page. */
function upwards(from: Point, distance: number, steps: number): Point[] {
	return Array.from({ length: steps }, (_, i) => ({
		x: from.x,
		y: from.y - (distance * (i + 1)) / steps,
	}));
}

/** `steps` points from `from` up the screen, leaning `deg` degrees to the left of vertical, `distance` px in all. */
function leaning(
	from: Point,
	deg: number,
	distance: number,
	steps: number,
): Point[] {
	const a = (deg * Math.PI) / 180;
	return Array.from({ length: steps }, (_, i) => {
		const d = (distance * (i + 1)) / steps;
		return { x: from.x - d * Math.sin(a), y: from.y - d * Math.cos(a) };
	});
}

type Leg = {
	path: Point[];
	/** each move is stamped this long (ms) after the last */
	stepMs: number;
	/** also wait that long between the moves, as a hand would */
	paced?: boolean;
	/** then held still this long (ms) */
	hold?: number;
};

/**
 * A mouse button or a finger pressed at `from`, moved along `legs`, each move
 * stamped with its own time (the page reads speeds from those), and let go
 * one step after the last move, still moving: a gesture's end, as quick as a
 * hand makes it, however busy the machine is.
 */
async function stampedDrag(
	cdp: CDPSession,
	kind: 'mouse' | 'touch',
	from: Point,
	legs: Leg[],
) {
	let t = Date.now() / 1000;
	let at = from;
	const send = (type: 'down' | 'move' | 'up', p: Point) =>
		kind === 'mouse'
			? cdp.send('Input.dispatchMouseEvent', {
					type:
						type === 'down'
							? 'mousePressed'
							: type === 'up'
								? 'mouseReleased'
								: 'mouseMoved',
					x: p.x,
					y: p.y,
					timestamp: t,
					button: 'left',
					buttons: type === 'up' ? 0 : 1,
					clickCount: 1,
				})
			: cdp.send('Input.dispatchTouchEvent', {
					type:
						type === 'down'
							? 'touchStart'
							: type === 'up'
								? 'touchEnd'
								: 'touchMove',
					timestamp: t,
					touchPoints: type === 'up' ? [] : [{ ...p, id: 1 }],
				});
	await send('down', from);
	for (const leg of legs) {
		for (const p of leg.path) {
			t += leg.stepMs / 1000;
			at = p;
			await send('move', p);
			if (leg.paced) await new Promise((r) => setTimeout(r, leg.stepMs));
		}
		if (leg.hold) {
			t += leg.hold / 1000;
			await new Promise((r) => setTimeout(r, leg.hold));
		}
	}
	t += (legs.at(-1)?.stepMs ?? 16) / 1000;
	await send('up', at);
}

/** `steps` points from `from` along the diagonal, from `start` px in to `end` px in (back out, when `end` is less). */
function diagonal(
	from: Point,
	start: number,
	end: number,
	steps: number,
): Point[] {
	return Array.from({ length: steps }, (_, i) => {
		const d = (start + ((end - start) * (i + 1)) / steps) / Math.SQRT2;
		return { x: from.x - d, y: from.y - d };
	});
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
		// and the header sticker it flew into landed in that pose (nothing to
		// cross-fade), then had its corner pressed down
		expect(open.landed ?? 0).toBeCloseTo(open.peel ?? 0, 1);
		const header = page.locator('header.mast .slap-stk');
		await expect.poll(() => peelOf(header)).toBeLessThan(0.005);
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

	test('pulled up or to the side, the fold turns with the pull', async ({
		page,
	}) => {
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		const from = await gripOf(page, 'basilica');
		const fold = () =>
			basilica.evaluate((e) =>
				Number.parseFloat(getComputedStyle(e).getPropertyValue('--fold')),
			);
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		for (let i = 1; i <= 8; i++) {
			await page.mouse.move(from.x, from.y - i * 10);
		}
		// straight up: the fold lies flatter than the diagonal
		expect(await fold()).toBeGreaterThan(60);
		for (let i = 1; i <= 8; i++) {
			await page.mouse.move(from.x - i * 10, from.y);
		}
		// straight left: steeper
		expect(await fold()).toBeLessThan(30);
		await page.mouse.move(from.x, from.y);
		await page.mouse.up();
		// laid back down, square to the diagonal again
		await expect(basilica).not.toHaveAttribute('data-peel', { timeout: 1500 });
		expect(await fold()).toBeCloseTo(45, 0);
		await expect(page).toHaveURL(at('/'));
	});

	test('pulled past the most it follows, the corner still gives a little more, and comes back with the pointer at once', async ({
		page,
	}) => {
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		const from = await gripOf(page, 'basilica');
		const w = await basilica
			.locator('.stk-body')
			.evaluate((e) => (e as HTMLElement).offsetWidth);
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		// out along the diagonal, well past the band's start (about 110px in)
		const seen: number[] = [];
		for (const [i, p] of diagonal(from, 0, 300, 30).entries()) {
			await page.mouse.move(p.x, p.y);
			if ((i + 1) % 5 === 0 && i >= 19) seen.push(await peelOf(basilica));
		}
		// at 200, 250 and 300px: each pull further still lifts it, a little
		expect(seen[1]).toBeGreaterThan(seen[0] + 0.003);
		expect(seen[2]).toBeGreaterThan(seen[1] + 0.003);
		// 20px back, and the corner comes 20px back with it, not a hair
		for (const p of diagonal(from, 300, 280, 4)) {
			await page.mouse.move(p.x, p.y);
		}
		const back = seen[2] - (await peelOf(basilica));
		expect(back).toBeGreaterThan((0.8 * 20) / (Math.SQRT2 * w));
		// all the way back, and let go: it stays
		await page.mouse.move(from.x, from.y, { steps: 6 });
		await page.mouse.up();
		await expect(basilica).not.toHaveAttribute('data-peel', { timeout: 1500 });
		await expect(page).toHaveURL(at('/'));
	});

	test('pushed back from past the band, the corner works its way back under the pointer', async ({
		page,
	}) => {
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		const from = await gripOf(page, 'basilica');
		await page.mouse.move(from.x, from.y);
		await expect.poll(() => peelOf(basilica)).toBeCloseTo(0.2, 2);
		await page.mouse.down();
		const go = async (path: Point[]) => {
			for (const p of path) await page.mouse.move(p.x, p.y);
		};
		await go(diagonal(from, 0, 100, 10));
		const fresh = await peelOf(basilica);
		// out past the band (it held back the last of that), all the way back,
		// and out again as far as before
		await go(diagonal(from, 100, 300, 20));
		await go(diagonal(from, 300, 0, 30));
		const back = await peelOf(basilica);
		await go(diagonal(from, 0, 100, 10));
		// at the press again it is not lying flat, the pointer well up the paper
		expect(back).toBeGreaterThan(0.05);
		// and 100px in, it is where the same pull put it before: under the pointer
		expect(Math.abs((await peelOf(basilica)) - fresh)).toBeLessThan(0.005);
		await go(diagonal(from, 100, 0, 10));
		await page.mouse.up();
		await expect(basilica).not.toHaveAttribute('data-peel', { timeout: 1500 });
		await expect(page).toHaveURL(at('/'));
	});

	test('pulled past the band and let go while pushing it back down, it stays', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const from = await gripOf(page, 'basilica');
		await page.mouse.move(from.x, from.y);
		await page.waitForTimeout(300);
		// 200px out at a hand's pace, held, then 60px back in 40ms, let go moving
		await stampedDrag(cdp, 'mouse', from, [
			{ path: diagonal(from, 0, 200, 20), stepMs: 16, paced: true, hold: 250 },
			{ path: diagonal(from, 200, 140, 5), stepMs: 8 },
		]);
		await page.waitForTimeout(800);
		await expect(page).toHaveURL(at('/'));
		const seen = await peels(page);
		expect(seen).toContain('stk--basilica data-ready=');
		expect(seen).toContain('stk--basilica data-peel=spring');
		expect(seen).not.toContain('stk--basilica data-peel=off');
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

	test('the corner is a grip of at least 44px, slightly lifted at rest; only it reads a touch', async ({
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
			// lifted more than with a mouse (0.055 to 0.065): on a touchscreen it is the only sign
			expect(await peelOf(el), key).toBeGreaterThanOrEqual(0.08);
			// a finger going down scrolls there as anywhere, and two fingers zoom;
			// one going up is read first
			await expect(el.locator('.stk-grip')).toHaveCSS(
				'touch-action',
				'pan-up pinch-zoom',
			);
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
		// a flick is over in a frame or two: 50px in 4 moves 8ms apart (the
		// touches carry their own times, so a busy machine cannot slow it down)
		await timedTouch(cdp, from, inwards(from, 50, 4), 8);
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
		// back to rest, lifted a little more on a touchscreen than with a mouse
		expect(await peelOf(superspace)).toBeCloseTo(0.08, 2);
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

	test('a swipe up the screen that starts on a corner scrolls the page, slow or flicked, and never peels or opens it', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		for (const key of ['superspace', 'basilica']) {
			for (const [distance, steps, stepMs, paced] of [
				[120, 12, 16, true], // a slow swipe
				[200, 12, 16, true],
				[60, 4, 8, false], // a flick
			] as const) {
				const from = await gripOf(page, key);
				const before = await page.evaluate(() => window.scrollY);
				await timedTouch(
					cdp,
					from,
					upwards(from, distance, steps),
					stepMs,
					paced,
				);
				// it scrolls with the finger (less the few pixels it took to tell)
				await expect
					.poll(() => page.evaluate(() => window.scrollY), `${key} ${distance}`)
					.toBeGreaterThan(before + distance - 20);
				await page.waitForTimeout(600);
				await expect(page, `${key} ${distance}`).toHaveURL(at('/'));
			}
		}
		expect(await peels(page)).toEqual([]);
	});

	test('a swipe down the screen from a corner scrolls the page back up', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const from = await gripOf(page, 'basilica');
		const before = await page.evaluate(() => window.scrollY);
		expect(before).toBeGreaterThan(100);
		await timedTouch(cdp, from, upwards(from, -100, 10), 16, true);
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeLessThan(before - 60);
		await page.waitForTimeout(400);
		await expect(page).toHaveURL(at('/'));
		expect(await peels(page)).toEqual([]);
	});

	test('a swipe up that leans a little off the vertical from a corner scrolls, whatever the sticker’s tilt', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		for (const key of ['superspace', 'basilica', 'covid']) {
			for (const deg of [18, 20]) {
				// the grip low on the screen, so the page has room to scroll
				await scrollStill(page);
				await sticker(page, key).evaluate((el) =>
					el.scrollIntoView({ block: 'end', behavior: 'instant' }),
				);
				const box = await sticker(page, key).locator('.stk-grip').boundingBox();
				if (!box) throw new Error(`no grip on ${key}`);
				const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
				const before = await page.evaluate(() => window.scrollY);
				const room = await page.evaluate(
					() =>
						document.documentElement.scrollHeight -
						window.innerHeight -
						window.scrollY,
				);
				expect(room, key).toBeGreaterThan(120);
				await timedTouch(cdp, from, leaning(from, deg, 180, 15), 16, true);
				await expect
					.poll(() => page.evaluate(() => window.scrollY), `${key} ${deg}°`)
					.toBeGreaterThan(before + 100);
				await page.waitForTimeout(500);
				await expect(page, `${key} ${deg}°`).toHaveURL(at('/'));
			}
		}
		expect(await peels(page)).toEqual([]);
	});

	test('a peel that turns straight up the screen in its first pixels was a scroll after all: it is handed back', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const from = await gripOf(page, 'basilica');
		const before = await page.evaluate(() => window.scrollY);
		// the first 12px lean 35° to the left (up the diagonal), then straight up
		const [first] = leaning(from, 35, 12, 1);
		await timedTouch(cdp, from, [first, ...upwards(first, 168, 14)], 16, true);
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(before + 100);
		await page.waitForTimeout(600);
		await expect(page).toHaveURL(at('/'));
		const seen = await peels(page);
		expect(seen).toContain('stk--basilica data-peel=drag');
		expect(seen).not.toContain('stk--basilica data-peel=off');
	});

	test('a thumb’s arc that sets off up the diagonal and curls up the screen scrolls the page, and never opens it', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		for (const key of ['superspace', 'basilica', 'covid']) {
			// [leaning at first, at last (degrees left of vertical), length]: a left
			// thumb scrolling the page curls up and to the left, then up or right
			for (const [first, last, length] of [
				[40, -30, 180],
				[36, 10, 140],
			]) {
				await scrollStill(page);
				await sticker(page, key).evaluate((el) =>
					el.scrollIntoView({ block: 'end', behavior: 'instant' }),
				);
				const box = await sticker(page, key).locator('.stk-grip').boundingBox();
				if (!box) throw new Error(`no grip on ${key}`);
				const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
				const before = await page.evaluate(() => window.scrollY);
				// 4px a move, 120 moves a second
				const steps = length / 4;
				const path: Point[] = [];
				let finger = from;
				for (let i = 0; i < steps; i++) {
					const a =
						((first + ((last - first) * i) / (steps - 1)) * Math.PI) / 180;
					finger = {
						x: finger.x - 4 * Math.sin(a),
						y: finger.y - 4 * Math.cos(a),
					};
					path.push(finger);
				}
				await timedTouch(cdp, from, path, 8, true);
				const label = `${key} ${first}° to ${last}°`;
				await expect
					.poll(() => page.evaluate(() => window.scrollY), label)
					.toBeGreaterThan(before + 100);
				await page.waitForTimeout(500);
				await expect(page, label).toHaveURL(at('/'));
			}
		}
		const seen = await peels(page);
		expect(seen.filter((p) => /data-ready|data-peel=off/.test(p))).toEqual([]);
	});

	test('a finger resting on the line, trembling, neither flickers the cue nor buzzes again, and letting go opens it', async ({
		page,
		context,
	}) => {
		await context.addInitScript(() => {
			const w = window as unknown as { __buzzes: number };
			w.__buzzes = 0;
			navigator.vibrate = () => {
				w.__buzzes++;
				return true;
			};
		});
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		// a tap on the page first (on no link): only then may it vibrate
		const spot = await page.locator('.collage').evaluate((c) => {
			const r = c.getBoundingClientRect();
			for (let y = r.top + 4; y < r.bottom; y += 8) {
				for (let x = r.left + 4; x < r.right; x += 8) {
					const at = document.elementFromPoint(x, y);
					if (at && !at.closest('a, button')) return { x, y };
				}
			}
			return null;
		});
		if (!spot) throw new Error('no empty spot');
		await page.touchscreen.tap(spot.x, spot.y);
		const superspace = sticker(page, 'superspace');
		const from = await gripOf(page, 'superspace');
		await superspace.evaluate((el) => {
			const w = window as unknown as { __flips: number };
			w.__flips = 0;
			new MutationObserver(() => {
				w.__flips++;
			}).observe(el, { attributes: true, attributeFilter: ['data-ready'] });
		});
		const touch = (type: TouchType, points: Point[]) =>
			cdp.send('Input.dispatchTouchEvent', {
				type,
				touchPoints: points.map((p) => ({ ...p, id: 1 })),
			});
		await touch('touchStart', [from]);
		// in, 2px a move, up to the line
		let pulled = 0;
		while ((await superspace.getAttribute('data-ready')) === null) {
			pulled += 2;
			expect(pulled).toBeLessThan(200);
			await touch('touchMove', inwards(from, pulled, 1));
		}
		// held there, trembling 3px either way along the diagonal (the line is crossed each time)
		for (let i = 0; i < 16; i++) {
			await touch('touchMove', inwards(from, pulled + (i % 2 ? 3 : -3), 1));
			await page.waitForTimeout(30);
		}
		const { flips, buzzes } = await page.evaluate(() => {
			const w = window as unknown as { __flips: number; __buzzes: number };
			return { flips: w.__flips, buzzes: w.__buzzes };
		});
		expect(flips).toBe(1);
		expect(buzzes).toBe(1);
		await expect(superspace).toHaveAttribute('data-ready', '');
		await touch('touchEnd', []);
		await expect(page).toHaveURL(at('/projects/super-space'));
	});

	test('pulled past the band and let go while pushing it back down, it stays', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const from = await gripOf(page, 'basilica');
		// 170px out at a finger's pace, held, then 50px back in 40ms, lifted moving
		await stampedDrag(cdp, 'touch', from, [
			{ path: diagonal(from, 0, 170, 20), stepMs: 16, paced: true, hold: 250 },
			{ path: diagonal(from, 170, 120, 5), stepMs: 8 },
		]);
		await page.waitForTimeout(800);
		await expect(page).toHaveURL(at('/'));
		const seen = await peels(page);
		expect(seen).toContain('stk--basilica data-ready=');
		expect(seen).not.toContain('stk--basilica data-peel=off');
	});

	test('two fingers, one of them on a corner, zoom the page, and neither peel nor open the sticker', async ({
		context,
	}) => {
		const peels = await watchPeel(context);
		// the first finger on the corner, then the second
		for (const gripFirst of [true, false]) {
			const page = await context.newPage();
			await page.goto('/');
			const cdp = await context.newCDPSession(page);
			const touch = (type: TouchType, points: Point[]) =>
				cdp.send('Input.dispatchTouchEvent', {
					type,
					touchPoints: points.map((p, i) => ({ ...p, id: i + 1 })),
				});
			const grip = await gripOf(page, 'basilica');
			const other = { x: grip.x - 70, y: grip.y - 90 };
			const [a, b] = gripFirst ? [grip, other] : [other, grip];
			// a pinch: both down, then apart, 60px further apart in all
			const l = Math.hypot(b.x - a.x, b.y - a.y);
			const u = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
			await touch('touchStart', [a]);
			await touch('touchStart', [a, b]);
			for (let i = 1; i <= 10; i++) {
				const d = 3 * i;
				await touch('touchMove', [
					{ x: a.x - u.x * d, y: a.y - u.y * d },
					{ x: b.x + u.x * d, y: b.y + u.y * d },
				]);
				await page.waitForTimeout(16);
			}
			await touch('touchEnd', [b]);
			await touch('touchEnd', []);
			await expect
				.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1))
				.toBeGreaterThan(1.3);
			await page.waitForTimeout(400);
			await expect(page).toHaveURL(at('/'));
			const seen = await peels(page);
			expect(seen.filter((p) => p.includes('data-peel=off'))).toEqual([]);
			await page.close();
		}
	});

	test('a tap on the corner opens it, though the finger rolls a few pixels', async ({
		page,
		context,
	}) => {
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const from = await gripOf(page, 'basilica');
		// a tap: down, a drift of 8px up and to the left, up 60ms later
		await timedTouch(cdp, from, inwards(from, 8, 1), 60, true);
		await expect(page).toHaveURL(at('/projects/basilica'));
	});

	test('after a peel springs back, the next tap opens it', async ({
		page,
		context,
	}) => {
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const covid = sticker(page, 'covid');
		const from = await gripOf(page, 'covid');
		await touchDrag(cdp, page, from, inwards(from, 40, 6), 100);
		await expect(covid).toHaveAttribute('data-peel', 'spring');
		// straight away: the drag's click window does not swallow it
		await page.touchscreen.tap(from.x - 40, from.y - 60);
		await expect(page).toHaveURL(at('/projects/covidtracker'));
	});

	test('back from a peeled-off project, the sticker is focused but shows no ring and no lift', async ({
		page,
		context,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const basilica = sticker(page, 'basilica');
		const from = await gripOf(page, 'basilica');
		await touchDrag(cdp, page, from, inwards(from, 150, 15));
		await expect(page).toHaveURL(at('/projects/basilica'));
		await vts.settled();
		await page.goBack();
		await expect(page).toHaveURL(at('/'));
		await vts.settled();
		await expect(basilica).toBeFocused();
		await expect(basilica).toHaveAttribute('data-quiet', '');
		await expect(basilica.locator('.stk-face')).toHaveCSS(
			'outline-style',
			'none',
		);
		await expect.poll(() => peelOf(basilica)).toBeCloseTo(0.085, 2);
		// a key, and the focus shows again, as the keyboard's does (not a lone
		// modifier: newer Chromium does not count Shift alone as keyboard use)
		await page.keyboard.press('Escape');
		await expect(basilica).not.toHaveAttribute('data-quiet');
		await expect(basilica.locator('.stk-face')).toHaveCSS(
			'outline-style',
			'dashed',
		);
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

test('a pointer arriving while the hint plays takes over from it, without a jump', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.mouse.move(5, 5);
	await page.goto('/');
	const superspace = sticker(page, 'superspace');
	await expect(superspace).toHaveAttribute('data-peel', 'hint', {
		timeout: 4000,
	});
	await page.waitForTimeout(350);
	const box = await superspace.boundingBox();
	if (!box) throw new Error('no sticker');
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
		steps: 4,
	});
	// the hint gives way at once ...
	await expect(superspace).not.toHaveAttribute('data-peel', 'hint', {
		timeout: 300,
	});
	// ... and from where it was then, the corner goes to the hover peel,
	// without sinking to rest first under the pointer (as the rest of the hint
	// would have) or jumping up after it
	const shown = await superspace.evaluate(
		(el) =>
			new Promise<number[]>((resolve) => {
				const seen: number[] = [];
				const frame = () => {
					seen.push(
						Number.parseFloat(getComputedStyle(el).getPropertyValue('--peel')),
					);
					if (seen.length < 60) requestAnimationFrame(frame);
					else resolve(seen);
				};
				requestAnimationFrame(frame);
			}),
	);
	expect(Math.min(...shown)).toBeGreaterThan(Math.min(shown[0], 0.125) - 0.006);
	expect(await peelOf(superspace)).toBeCloseTo(0.13, 2);
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
