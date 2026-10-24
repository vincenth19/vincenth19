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

/** How far a fold by hand peels a sticker now (its --drag; components/fold.ts), or NaN without one. */
const handOf = (el: Locator) =>
	el.evaluate((e) =>
		Number.parseFloat(getComputedStyle(e).getPropertyValue('--drag')),
	);

/** How far a sticker shows peeled: its fold by hand's, or else its own corner's. */
const shownOf = (el: Locator) =>
	el.evaluate((e) =>
		Number.parseFloat(
			getComputedStyle(e).getPropertyValue(
				e.hasAttribute('data-hand') ? '--drag' : '--peel',
			),
		),
	);

/** The angle (degrees) a sticker's fold by hand lies at (--fold). */
const foldOf = (el: Locator) =>
	el.evaluate((e) =>
		Number.parseFloat(getComputedStyle(e).getPropertyValue('--fold')),
	);

/** A side or a corner of a sticker. */
type Where =
	| 'top'
	| 'right'
	| 'bottom'
	| 'left'
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right';

const R = Math.SQRT1_2;
/** The way into a sticker from each side and corner, in its own frame (y down). */
const INTO: Record<Where, Point> = {
	top: { x: 0, y: 1 },
	right: { x: -1, y: 0 },
	bottom: { x: 0, y: -1 },
	left: { x: 1, y: 0 },
	'top-left': { x: R, y: R },
	'top-right': { x: -R, y: R },
	'bottom-left': { x: R, y: -R },
	'bottom-right': { x: -R, y: -R },
};
/** The angle (degrees) the paper there faces out: the fold's, square to the pull (components/fold.ts's --fold). */
const FACING: Record<Where, number> = {
	top: -90,
	right: 0,
	bottom: 90,
	left: 180,
	'top-left': -135,
	'top-right': -45,
	'bottom-left': 135,
	'bottom-right': 45,
};
/** How far apart two angles (degrees) are, either way round. */
const apart = (a: number, b: number) =>
	Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/** A sticker in its own frame: its middle on screen, its tilt, its size, and a round one's radius (--disc, of the width). */
type Frame = {
	cx: number;
	cy: number;
	tilt: number;
	w: number;
	h: number;
	disc: number;
};

/** A sticker's frame, the sticker brought into view (centred, or at the foot of the screen). */
function frameOf(
	page: Page,
	key: string,
	block: 'center' | 'end' | 'nearest' = 'center',
): Promise<Frame> {
	return sticker(page, key).evaluate((el, block) => {
		el.scrollIntoView({ block, behavior: 'instant' });
		const body = el.querySelector('.stk-body') as HTMLElement;
		const r = el.getBoundingClientRect();
		const m = /^(-?[\d.]+)deg$/.exec(getComputedStyle(el).rotate.trim());
		const disc = Number.parseFloat(
			getComputedStyle(body).getPropertyValue('--disc'),
		);
		return {
			cx: r.left + r.width / 2,
			cy: r.top + r.height / 2,
			tilt: m ? (Number(m[1]) * Math.PI) / 180 : 0,
			w: body.offsetWidth,
			h: body.offsetHeight,
			disc: Number.isFinite(disc) ? disc : 0,
		};
	}, block);
}

/** A way in a sticker's frame, on screen (turned by its tilt). */
const turned = (f: Frame, v: Point): Point => ({
	x: v.x * Math.cos(f.tilt) - v.y * Math.sin(f.tilt),
	y: v.x * Math.sin(f.tilt) + v.y * Math.cos(f.tilt),
});

/** A point in a sticker's frame, on screen. */
function onScreen(f: Frame, p: Point): Point {
	const d = turned(f, { x: p.x - f.w / 2, y: p.y - f.h / 2 });
	return { x: f.cx + d.x, y: f.cy + d.y };
}

/**
 * Where to take hold of a sticker from a side or a corner, `inset` px in from
 * its outline (on a round one, its disc), and the way into it from there, on
 * screen (a unit), the sticker brought into view.
 */
async function edgeOf(
	page: Page,
	key: string,
	where: Where,
	inset = 8,
	block: 'center' | 'end' | 'nearest' = 'center',
): Promise<{ from: Point; inward: Point }> {
	const f = await frameOf(page, key, block);
	const into = INTO[where];
	let p: Point;
	if (f.disc > 0) {
		const r = f.disc * f.w - inset;
		p = { x: f.w / 2 - into.x * r, y: f.h / 2 - into.y * r };
	} else {
		const x = into.x > 0 ? 0 : into.x < 0 ? f.w : f.w / 2;
		const y = into.y > 0 ? 0 : into.y < 0 ? f.h : f.h / 2;
		p = { x: x + Math.sign(into.x) * inset, y: y + Math.sign(into.y) * inset };
	}
	return { from: onScreen(f, p), inward: turned(f, into) };
}

/** Where a sticker's bottom-right corner is taken hold of (the corner that lifts by itself), the sticker brought into view. */
async function gripOf(
	page: Page,
	key: string,
	block: 'center' | 'end' | 'nearest' = 'center',
): Promise<Point> {
	return (await edgeOf(page, key, 'bottom-right', 12, block)).from;
}

/** `steps` points from `from`, `distance` px along `way` (a unit) in all. */
function along(
	from: Point,
	way: Point,
	distance: number,
	steps: number,
): Point[] {
	return Array.from({ length: steps }, (_, i) => {
		const d = (distance * (i + 1)) / steps;
		return { x: from.x + way.x * d, y: from.y + way.y * d };
	});
}

/** `way` turned `deg` degrees (clockwise on screen). */
function turn(way: Point, deg: number): Point {
	const a = (deg * Math.PI) / 180;
	return {
		x: way.x * Math.cos(a) - way.y * Math.sin(a),
		y: way.x * Math.sin(a) + way.y * Math.cos(a),
	};
}

/** The cursor the page shows over a point, and what is there. */
const under = (page: Page, p: Point) =>
	page.evaluate(({ x, y }) => {
		const el = document.elementFromPoint(x, y);
		return {
			cursor: el ? getComputedStyle(el).cursor : '',
			grip: el?.classList.contains('stk-grip') ?? false,
			side: (el as HTMLElement | null)?.dataset.side ?? null,
			mid: el?.classList.contains('stk-mid') ?? false,
			touch: el ? getComputedStyle(el).touchAction : '',
		};
	}, p);

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
		const from = await gripOf(page, 'basilica');
		const entries = await page.evaluate(() => history.length);
		expect(await under(page, from)).toMatchObject({
			grip: true,
			cursor: 'grab',
		});

		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		const path = inwards(from, 150, 15);
		for (const p of path.slice(0, 4)) await page.mouse.move(p.x, p.y);
		// in hand: the corner follows the pointer, not yet far enough to come off
		await expect(basilica).toHaveAttribute('data-peel', 'drag');
		// the hand took the corner over as it was (its own fold lies down meanwhile)
		await expect(basilica).toHaveAttribute('data-took', '');
		expect(await under(page, path[3])).toMatchObject({ cursor: 'grabbing' });
		await expect(basilica).not.toHaveAttribute('data-ready');
		const partway = await handOf(basilica);
		for (const p of path.slice(4)) await page.mouse.move(p.x, p.y);
		// far enough: let go now and it comes off, and it says so
		await expect(basilica).toHaveAttribute('data-ready', '');
		expect(await handOf(basilica)).toBeGreaterThan(partway);
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
		expect(open.landedFold ?? 0).toBeCloseTo(open.fold ?? 0, 0);
		const header = page.locator('header.mast .slap-stk');
		await expect(header).not.toHaveAttribute('data-hand');
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
		const pulled = await handOf(covid);
		expect(pulled).toBeGreaterThan(0.22);
		expect(pulled).toBeLessThan(PEEL_OPEN);
		await page.waitForTimeout(200);
		await page.mouse.up();

		// a short spring back down, to the hover peel (the mouse is still on it),
		// and the corner handed back to the stylesheet just as it lies
		await expect(covid).toHaveAttribute('data-peel', 'spring');
		await expect(covid).not.toHaveAttribute('data-peel', { timeout: 3000 });
		await expect(covid).not.toHaveAttribute('data-hand');
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
		const fold = () => foldOf(basilica);
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
		await expect(basilica).not.toHaveAttribute('data-peel', { timeout: 3000 });
		await expect(basilica).not.toHaveAttribute('data-hand');
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
			if ((i + 1) % 5 === 0 && i >= 19) seen.push(await handOf(basilica));
		}
		// at 200, 250 and 300px: each pull further still lifts it, a little
		expect(seen[1]).toBeGreaterThan(seen[0] + 0.003);
		expect(seen[2]).toBeGreaterThan(seen[1] + 0.003);
		// 20px back, and the corner comes 20px back with it, not a hair
		for (const p of diagonal(from, 300, 280, 4)) {
			await page.mouse.move(p.x, p.y);
		}
		const back = seen[2] - (await handOf(basilica));
		expect(back).toBeGreaterThan((0.8 * 20) / (Math.SQRT2 * w));
		// all the way back, and let go: it stays
		await page.mouse.move(from.x, from.y, { steps: 6 });
		await page.mouse.up();
		await expect(basilica).not.toHaveAttribute('data-peel', { timeout: 3000 });
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
		const fresh = await handOf(basilica);
		// out past the band (it held back the last of that), all the way back,
		// and out again as far as before
		await go(diagonal(from, 100, 300, 20));
		await go(diagonal(from, 300, 0, 30));
		const back = await handOf(basilica);
		await go(diagonal(from, 0, 100, 10));
		// at the press again it is not lying flat, the pointer well up the paper
		expect(back).toBeGreaterThan(0.05);
		// and 100px in, it is where the same pull put it before: under the pointer
		expect(Math.abs((await handOf(basilica)) - fresh)).toBeLessThan(0.005);
		await go(diagonal(from, 100, 0, 10));
		await page.mouse.up();
		await expect(basilica).not.toHaveAttribute('data-peel', { timeout: 3000 });
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

test.describe('peeling a sticker from any side with a mouse', () => {
	test.use({ viewport: { width: 1440, height: 900 } });
	test.beforeEach(async ({ context }) => skipHint(context));

	// each side and corner, across the three outlines (a card, a stamp, a seal)
	const from: [Where, string][] = [
		['top', 'covid'],
		['right', 'covid'],
		['bottom', 'basilica'],
		['left', 'superspace'],
		['top-left', 'basilica'],
		['top-right', 'covid'],
		['bottom-left', 'superspace'],
		['bottom-right', 'covid'],
	];
	for (const [where, key] of from) {
		test(`a drag in from its ${where} ${where.includes('-') ? 'corner' : 'edge'} past the threshold peels it off and opens the project, from that pose (${key})`, async ({
			page,
		}) => {
			const vts = await recordTransitions(page);
			await page.goto('/');
			const el = sticker(page, key);
			const { from, inward } = await edgeOf(page, key, where, 10);
			expect(await under(page, from)).toMatchObject({
				grip: true,
				cursor: 'grab',
			});
			const href = await el.getAttribute('href');
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			for (const p of along(from, inward, 170, 17)) {
				await page.mouse.move(p.x, p.y);
			}
			// the paper on that side folds back toward the pointer, and is far enough
			await expect(el).toHaveAttribute('data-ready', '');
			expect(apart(await foldOf(el), FACING[where])).toBeLessThan(20);
			await page.waitForTimeout(150);
			await page.mouse.up();

			await expect(page).toHaveURL(at(href ?? ''));
			await vts.settled();
			const [open] = await vts.take();
			expect(open).toMatchObject({ direction: 'open', finished: true });
			expect(open.pairs).toContain(`stk-${key}`);
			// the flight starts from the pose it was let go in, that side folded back ...
			expect(open.peel ?? 0).toBeGreaterThanOrEqual(PEEL_OPEN);
			expect(apart(open.fold ?? 0, FACING[where])).toBeLessThan(20);
			// ... and lands in the header in the same pose, which is then pressed flat
			expect(open.landed ?? 0).toBeCloseTo(open.peel ?? 0, 2);
			expect(open.landedFold ?? 0).toBeCloseTo(open.fold ?? 0, 0);
			const header = page.locator('header.mast .slap-stk');
			await expect(header).not.toHaveAttribute('data-hand');
			await expect.poll(() => peelOf(header)).toBeLessThan(0.005);
		});
	}

	test('a short drag from any side springs back flat, and the page stays', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const covid = sticker(page, 'covid');
		for (const where of ['left', 'top', 'right', 'bottom'] as const) {
			const { from, inward } = await edgeOf(page, 'covid', where);
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			for (const p of along(from, inward, 40, 8)) {
				await page.mouse.move(p.x, p.y);
			}
			// that side is lifted, not far enough to come off; the corner lies down
			const pulled = await handOf(covid);
			expect(pulled, where).toBeGreaterThan(0.08);
			expect(pulled, where).toBeLessThan(PEEL_OPEN);
			await expect(covid).not.toHaveAttribute('data-took');
			await page.waitForTimeout(150);
			await page.mouse.up();
			await expect(covid).toHaveAttribute('data-peel', 'spring');
			await expect(covid).not.toHaveAttribute('data-peel', { timeout: 3000 });
			// flat again, nothing of the fold left, the corner back at the hover peel
			await expect(covid).not.toHaveAttribute('data-hand');
			await expect.poll(() => peelOf(covid), where).toBeCloseTo(0.2, 2);
			await page.mouse.move(10, 10);
			await expect.poll(() => peelOf(covid), where).toBeCloseTo(0.065, 2);
		}
		await page.waitForTimeout(300);
		await expect(page).toHaveURL(at('/'));
		expect(await vts.all()).toEqual([]);
	});

	test('a mouse over an edge lifts that edge a little, where it is, and not the corner; over the middle the corner lifts', async ({
		page,
	}) => {
		await page.goto('/');
		for (const key of ['basilica', 'covid', 'superspace']) {
			const el = sticker(page, key);
			const rest = await peelOf(el);
			for (const where of ['left', 'top', 'right', 'bottom'] as const) {
				const { from } = await edgeOf(page, key, where, 6);
				await page.mouse.move(from.x - 40, from.y - 40);
				await page.mouse.move(from.x, from.y, { steps: 4 });
				// that side folds back a little (by hand, square to it) ...
				await expect(el, `${key} ${where}`).toHaveAttribute(
					'data-peel',
					'hover',
				);
				await expect
					.poll(() => handOf(el), `${key} ${where}`)
					.toBeCloseTo(0.08, 2);
				expect(apart(await foldOf(el), FACING[where])).toBeLessThan(20);
				// ... and the corner stays at rest
				expect(await peelOf(el), `${key} ${where}`).toBeCloseTo(rest, 2);
			}
			// the middle: the edge lies back down, and the corner lifts
			const f = await frameOf(page, key);
			const middle = onScreen(f, { x: f.w / 2, y: f.h / 2 });
			await page.mouse.move(middle.x, middle.y, { steps: 4 });
			await expect(el, key).not.toHaveAttribute('data-hand', {
				timeout: 3000,
			});
			await expect.poll(() => peelOf(el), key).toBeGreaterThan(rest + 0.05);
			// and away: flat again
			await page.mouse.move(5, 5);
			await expect.poll(() => peelOf(el), key).toBeCloseTo(rest, 2);
			await expect(el).not.toHaveAttribute('data-peel');
		}
		await expect(page).toHaveURL(at('/'));
	});

	test('a click on a lifted edge flies the sticker from that pose', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const covid = sticker(page, 'covid');
		const { from } = await edgeOf(page, 'covid', 'left', 6);
		await page.mouse.move(from.x, from.y, { steps: 4 });
		await expect.poll(() => handOf(covid)).toBeCloseTo(0.08, 2);
		await page.mouse.down();
		await page.mouse.up();
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await vts.settled();
		const [open] = await vts.take();
		expect(open.pairs).toContain('stk-covid');
		expect(open.peel ?? 0).toBeCloseTo(0.08, 2);
		expect(apart(open.fold ?? 0, FACING.left)).toBeLessThan(20);
		expect(open.landed ?? 0).toBeCloseTo(open.peel ?? 0, 2);
	});

	test('the corner, already lifted on hover, opens after as long a pull as any other side', async ({
		page,
	}) => {
		await page.goto('/');
		const basilica = sticker(page, 'basilica');
		const w = await basilica
			.locator('.stk-body')
			.evaluate((e) => (e as HTMLElement).offsetWidth);
		// the pull that opens it: PEEL_OPEN of the width · √2
		const needed = PEEL_OPEN * Math.SQRT2 * w;
		for (const where of ['bottom-right', 'left'] as const) {
			for (const [share, ready] of [
				[0.8, false],
				[1.15, true],
			] as const) {
				const { from, inward } = await edgeOf(page, 'basilica', where, 10);
				await page.mouse.move(from.x, from.y, { steps: 4 });
				await page.waitForTimeout(400);
				await page.mouse.down();
				for (const p of along(from, inward, needed * share, 12)) {
					await page.mouse.move(p.x, p.y);
				}
				const label = `${where} ${share}`;
				if (ready) {
					await expect(basilica, label).toHaveAttribute('data-ready', '');
				} else {
					await page.waitForTimeout(100);
					await expect(basilica, label).not.toHaveAttribute('data-ready');
				}
				// back where it was taken, and let go: it stays
				await page.mouse.move(from.x, from.y, { steps: 6 });
				await page.mouse.up();
				await expect(basilica).not.toHaveAttribute('data-peel', 'drag');
				await page.mouse.move(5, 5);
				await expect(basilica).not.toHaveAttribute('data-peel', {
					timeout: 3000,
				});
			}
		}
		await expect(page).toHaveURL(at('/'));
	});

	test('the edge shows a grab cursor all round, and the middle is the link', async ({
		page,
	}) => {
		await page.goto('/');
		for (const key of ['superspace', 'basilica', 'covid']) {
			for (const where of Object.keys(INTO) as Where[]) {
				const { from } = await edgeOf(page, key, where, 6);
				expect(await under(page, from), `${key} ${where}`).toMatchObject({
					grip: true,
					cursor: 'grab',
				});
			}
			const f = await frameOf(page, key);
			const middle = onScreen(f, { x: f.w / 2, y: f.h / 2 });
			expect(await under(page, middle), key).toMatchObject({
				mid: true,
				cursor: 'pointer',
			});
		}
	});

	test('pulled across a side at a slant, the fold turns only a little, and more the further it goes, the paper under the pointer', async ({
		page,
	}) => {
		await page.goto('/');
		const covid = sticker(page, 'covid');
		const { from, inward } = await edgeOf(page, 'covid', 'left');
		const slant = turn(inward, -45);
		/** Where the point taken hold of is now, on screen (--tip-x, --tip-y). */
		const tip = () =>
			covid.evaluate((e) => {
				const style = getComputedStyle(e);
				const probe = document.createElement('span');
				probe.style.cssText = `position:absolute;left:${style.getPropertyValue('--tip-x')};top:${style.getPropertyValue('--tip-y')}`;
				e.querySelector('.stk-body')?.append(probe);
				const r = probe.getBoundingClientRect();
				probe.remove();
				return { x: r.left, y: r.top };
			});
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		const path = along(from, slant, 160, 16);
		const turns: number[] = [];
		const offs: Point[] = [];
		for (const [i, p] of path.entries()) {
			await page.mouse.move(p.x, p.y);
			if (i === 3 || i === 15) turns.push(apart(await foldOf(covid), 180));
			if (i >= 3 && i <= 10) {
				const t = await tip();
				offs.push({ x: t.x - p.x, y: t.y - p.y });
			}
		}
		// a straight side: a turned fold would lift paper all along it, so it
		// turns little at first, more as the fold goes deeper, never past 33° ...
		expect(turns[0]).toBeLessThan(12);
		expect(turns[1]).toBeGreaterThan(turns[0]);
		expect(turns[1]).toBeLessThanOrEqual(33.5);
		// ... and the point taken hold of slides along the edge as the pointer
		// leans past that: the paper does not slip out from under it
		for (const o of offs) {
			expect(Math.hypot(o.x - offs[0].x, o.y - offs[0].y)).toBeLessThan(2);
		}
		await page.mouse.move(from.x, from.y, { steps: 8 });
		await page.mouse.up();
		await expect(covid).not.toHaveAttribute('data-peel', { timeout: 3000 });
		await expect(page).toHaveURL(at('/'));
	});

	test('peeled off with its page in, it flies at once from the fold it was let go in: no lift first, on the compositor', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.addInitScript(() => {
			type Seen = {
				inTask: number | null;
				started: number;
				lifted: boolean;
				props: string[];
			};
			const w = window as unknown as { __off: Seen };
			w.__off = { inTask: null, started: 0, lifted: false, props: [] };
			const seen = w.__off;
			// how many transitions had started by the end of the release's own task
			window.addEventListener(
				'pointerup',
				() => {
					window.setTimeout(() => {
						seen.inTask = seen.started;
					}, 0);
				},
				{ capture: true },
			);
			const start = document.startViewTransition?.bind(document);
			if (!start) return;
			document.startViewTransition = ((
				update: ViewTransitionUpdateCallback,
			) => {
				seen.started += 1;
				const vt = start(update);
				// what the flight animates, once the page has retimed it
				vt.ready
					.then(() => new Promise((r) => setTimeout(r, 0)))
					.then(() => {
						for (const a of document.documentElement.getAnimations({
							subtree: true,
						})) {
							const effect = a.effect as KeyframeEffect | null;
							const pseudo = effect?.pseudoElement ?? '';
							if (!pseudo.startsWith('::view-transition-group(stk-')) continue;
							for (const f of effect?.getKeyframes() ?? []) {
								for (const p of Object.keys(f)) {
									if (
										![
											'offset',
											'easing',
											'composite',
											'computedOffset',
										].includes(p) &&
										!seen.props.includes(p)
									) {
										seen.props.push(p);
									}
								}
							}
						}
					})
					.catch(() => {});
				return vt;
			}) as typeof document.startViewTransition;
			new MutationObserver(() => {
				if (document.querySelector('.stk.is-lifting')) seen.lifted = true;
			}).observe(document, {
				subtree: true,
				attributes: true,
				attributeFilter: ['class'],
			});
		});
		await page.goto('/');
		const covid = sticker(page, 'covid');
		const { from, inward } = await edgeOf(page, 'covid', 'left', 10);
		// in view, its page is prefetched: it is in before the peel starts
		await expect
			.poll(() =>
				page.evaluate(() =>
					performance
						.getEntriesByType('resource')
						.some((r) => r.name.includes('/projects/covidtracker?_rsc')),
				),
			)
			.toBe(true);
		await page.waitForTimeout(400);
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		for (const p of along(from, inward, 170, 17)) {
			await page.mouse.move(p.x, p.y);
		}
		await expect(covid).toHaveAttribute('data-ready', '');
		await page.waitForTimeout(150);
		await page.mouse.up();

		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await vts.settled();
		const [open] = await vts.take();
		expect(open).toMatchObject({ direction: 'open', finished: true });
		expect(open.pairs).toContain('stk-covid');
		// the flight starts from the fold it was let go in, the left side folded back,
		// and lands in the header in that pose, then pressed flat
		expect(open.peel ?? 0).toBeGreaterThanOrEqual(PEEL_OPEN);
		expect(apart(open.fold ?? 0, FACING.left)).toBeLessThan(20);
		expect(open.landed ?? 0).toBeCloseTo(open.peel ?? 0, 2);
		expect(open.landedFold ?? 0).toBeCloseTo(open.fold ?? 0, 0);
		const header = page.locator('header.mast .slap-stk');
		await expect(header).not.toHaveAttribute('data-hand');
		await expect.poll(() => peelOf(header)).toBeLessThan(0.005);
		const seen = await page.evaluate(
			() =>
				(
					window as unknown as {
						__off: {
							inTask: number | null;
							started: number;
							lifted: boolean;
							props: string[];
						};
					}
				).__off,
		);
		// no lift and no wait: the transition starts in the release's own task
		expect(seen.lifted).toBe(false);
		expect(seen.inTask).toBe(1);
		expect(seen.started).toBe(1);
		// and the sticker's flight is moved and scaled by the compositor alone
		expect(seen.props).toContain('transform');
		expect(seen.props).not.toContain('width');
		expect(seen.props).not.toContain('height');
	});

	test('peeled off before its page is in, it waits in its fold, its corner down, then flies from it', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		await page.evaluate(() => {
			const w = window as unknown as { __vtAt: number };
			w.__vtAt = 0;
			new MutationObserver(() => {
				if (!w.__vtAt && document.documentElement.dataset.vt) {
					w.__vtAt = performance.now();
				}
			}).observe(document.documentElement, { attributes: true });
		});
		// Super Space's page is fetched only once a pointer comes onto its
		// sticker (it is not prefetched in view); it is held back until let go
		let letIn = () => {};
		const held = new Promise<void>((resolve) => {
			letIn = resolve;
		});
		let released = 0;
		await page.route('**/projects/super-space?_rsc=*', async (route) => {
			await held;
			released = await page.evaluate(() => performance.now());
			await route.continue();
		});
		const ss = sticker(page, 'superspace');
		const { from, inward } = await edgeOf(page, 'superspace', 'left', 10);
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		for (const p of along(from, inward, 170, 17)) {
			await page.mouse.move(p.x, p.y);
		}
		await expect(ss).toHaveAttribute('data-ready', '');
		const fold = await foldOf(ss);
		await page.mouse.up();

		// it waits off the page, bobbing, in the fold it was let go in; its own
		// corner stays down. (Read in one go, in the page, and the page let in at
		// once: a page that takes 1.5 s opens without the flight, and a busy
		// machine's round trips would count against that.)
		const waiting = await page.waitForFunction(() => {
			const el = document.querySelector<HTMLElement>(
				'.collage .stk--superspace',
			);
			if (!el?.classList.contains('is-waiting')) return null;
			const style = getComputedStyle(el);
			return {
				peel: el.dataset.peel ?? null,
				hand: el.hasAttribute('data-hand'),
				corner: Number.parseFloat(style.getPropertyValue('--peel')),
				fold: Number.parseFloat(style.getPropertyValue('--fold')),
			};
		});
		letIn();
		const pose = await waiting.jsonValue();
		expect(pose?.peel).toBe('off');
		expect(pose?.hand).toBe(true);
		expect(pose?.corner ?? 1).toBeLessThan(0.005);
		expect(apart(pose?.fold ?? 0, fold)).toBeLessThan(0.5);

		await expect(page).toHaveURL(at('/projects/super-space'));
		await vts.settled();
		const [open] = await vts.take();
		expect(open).toMatchObject({ direction: 'open', finished: true });
		expect(open.pairs).toContain('stk-superspace');
		const started = await page.evaluate(
			() => (window as unknown as { __vtAt: number }).__vtAt,
		);
		expect(released).toBeGreaterThan(0);
		expect(started).toBeGreaterThan(released);
		// and flies from that pose, and lands in it
		expect(open.peel ?? 0).toBeGreaterThanOrEqual(PEEL_OPEN);
		expect(apart(open.fold ?? 0, fold)).toBeLessThan(0.5);
		expect(open.landed ?? 0).toBeCloseTo(open.peel ?? 0, 2);
		expect(open.landedFold ?? 0).toBeCloseTo(open.fold ?? 0, 0);
	});
});

test.describe('peeling a sticker on a phone', () => {
	test.use({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
	});
	test.beforeEach(async ({ context }) => skipHint(context));

	test('the edge, all round, is a grip at least 44px across; the corner is slightly lifted at rest; the middle is the page', async ({
		page,
	}) => {
		await page.goto('/');
		// the way the browser scrolls a finger itself on each part of the edge
		// (two fingers zoom there, as anywhere); the rest of a touch is read first
		const scrolls: Record<string, string> = {
			top: 'pan-down pinch-zoom',
			bottom: 'pan-up pinch-zoom',
			left: 'pan-y pinch-zoom',
			right: 'pan-y pinch-zoom',
		};
		for (const key of ['superspace', 'basilica', 'covid']) {
			const el = sticker(page, key);
			for (const where of Object.keys(INTO) as Where[]) {
				// across the outline, from well outside to well inside: how far a
				// finger is on the grip
				const f = await frameOf(page, key);
				const { from } = await edgeOf(page, key, where, 0);
				const into = turned(f, INTO[where]);
				const hits = await page.evaluate(
					({ from, into, key }) => {
						let run = 0;
						let most = 0;
						const sides = new Set<string>();
						for (let s = -40; s <= 90; s += 0.5) {
							const at = document.elementFromPoint(
								from.x + into.x * s,
								from.y + into.y * s,
							);
							const grip = at?.closest('.stk-grip') as HTMLElement | null;
							if (grip?.closest(`.stk--${key}`)) {
								run += 0.5;
								most = Math.max(most, run);
								sides.add(grip.dataset.side ?? '');
							} else {
								run = 0;
							}
						}
						return { most, sides: [...sides] };
					},
					{ from, into, key },
				);
				expect(hits.most, `${key} ${where}`).toBeGreaterThanOrEqual(44);
				for (const side of hits.sides) {
					const grip = el.locator(`.stk-grip[data-side="${side}"]`);
					await expect(grip).toHaveCSS('touch-action', scrolls[side]);
				}
			}
			// lifted more than with a mouse (0.055 to 0.065): on a touchscreen it is the only sign
			expect(await peelOf(el), key).toBeGreaterThanOrEqual(0.08);
			// the middle scrolls and taps as the page does
			const f = await frameOf(page, key);
			const middle = onScreen(f, { x: f.w / 2, y: f.h / 2 });
			expect(await under(page, middle), key).toMatchObject({
				mid: true,
				touch: 'auto',
			});
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

	test('a touch drag in from the left edge peels it off and opens the project', async ({
		page,
		context,
	}) => {
		const vts = await recordTransitions(page);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const { from, inward } = await edgeOf(page, 'covid', 'left', 10);
		await touchDrag(cdp, page, from, along(from, inward, 150, 15));
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await vts.settled();
		const [open] = await vts.take();
		expect(open.pairs).toContain('stk-covid');
		expect(open.peel ?? 0).toBeGreaterThanOrEqual(PEEL_OPEN);
		expect(apart(open.fold ?? 0, FACING.left)).toBeLessThan(20);
		expect(open.landedFold ?? 0).toBeCloseTo(open.fold ?? 0, 0);
	});

	test('from the top edge, a finger straight down scrolls the page back up, and one down and across peels it off and opens the project', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		const vts = await recordTransitions(page);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		// straight down the screen: a thumb scrolling the page back up
		const top = await edgeOf(page, 'basilica', 'top', 10);
		const before = await page.evaluate(() => window.scrollY);
		await timedTouch(
			cdp,
			top.from,
			along(top.from, { x: 0, y: 1 }, 120, 12),
			16,
			true,
		);
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeLessThan(before - 80);
		await page.waitForTimeout(600);
		await expect(page).toHaveURL(at('/'));
		expect(await peels(page)).toEqual([]);
		// down and across, leaning: a peel, its fold turned with the slant
		await scrollStill(page);
		const { from, inward } = await edgeOf(page, 'basilica', 'top', 10);
		await touchDrag(cdp, page, from, along(from, turn(inward, 40), 170, 17));
		await expect(page).toHaveURL(at('/projects/basilica'));
		await vts.settled();
		const [open] = await vts.take();
		expect(open.pairs).toContain('stk-basilica');
		expect(open.peel ?? 0).toBeGreaterThanOrEqual(PEEL_OPEN);
		expect(apart(open.fold ?? 0, FACING.top)).toBeLessThan(40);
	});

	test('from a top or a bottom edge, a finger that holds still a moment first peels it straight in, and it opens', async ({
		page,
		context,
	}) => {
		const vts = await recordTransitions(page);
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		for (const [key, where, way, href] of [
			['basilica', 'top', 1, '/projects/basilica'],
			['covid', 'bottom', -1, '/projects/covidtracker'],
			['superspace', 'top', 1, '/projects/super-space'],
		] as const) {
			const { from, inward } = await edgeOf(page, key, where, 10);
			// straight down (or up) the screen, along the way in: a thumb's way
			expect(Math.abs(inward.y), key).toBeGreaterThan(0.9);
			await stampedDrag(cdp, 'touch', from, [
				{ path: [], stepMs: 16, hold: 220 },
				{
					path: along(from, { x: 0, y: way }, 170, 17),
					stepMs: 16,
					paced: true,
					hold: 150,
				},
			]);
			await expect(page, key).toHaveURL(at(href));
			await vts.settled();
			const [open] = await vts.take();
			expect(open.pairs, key).toContain(`stk-${key}`);
			expect(open.peel ?? 0, key).toBeGreaterThanOrEqual(PEEL_OPEN);
			// the fold square to that side
			expect(apart(open.fold ?? 0, FACING[where]), key).toBeLessThan(20);
			expect(await peels(page), key).toContain(`stk--${key} data-peel=off`);
			await page.goBack();
			await expect(page).toHaveURL(at('/'));
			await vts.settled();
			await vts.take();
		}
	});

	test('at either end of the page, a quick straight flick on a top or a bottom edge neither peels nor opens it', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		// at the top: nothing to scroll back up to, a finger flicks down (or drags)
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
		const top = await edgeOf(page, 'superspace', 'top', 10, 'nearest');
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
		await timedTouch(cdp, top.from, along(top.from, { x: 0, y: 1 }, 60, 6), 8);
		await page.waitForTimeout(500);
		await timedTouch(
			cdp,
			top.from,
			along(top.from, { x: 0, y: 1 }, 150, 15),
			16,
			true,
		);
		await page.waitForTimeout(500);
		await expect(page).toHaveURL(at('/'));
		// at the foot: nothing more to scroll, a thumb flicks up all the same
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		);
		await scrollStill(page);
		const end = await page.evaluate(() => window.scrollY);
		const bottom = await edgeOf(page, 'covid', 'bottom', 10, 'end');
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		);
		await scrollStill(page);
		expect(await page.evaluate(() => window.scrollY)).toBe(end);
		const f = await frameOf(page, 'covid', 'nearest');
		const from = onScreen(f, { x: f.w / 2, y: f.h - 10 });
		for (const [distance, steps, stepMs] of [
			[40, 5, 8],
			[60, 5, 10],
		] as const) {
			await timedTouch(cdp, from, upwards(from, distance, steps), stepMs);
			await page.waitForTimeout(500);
			await expect(page, `${distance}px`).toHaveURL(at('/'));
		}
		expect(bottom.inward.y).toBeLessThan(-0.9);
		expect(
			(await peels(page)).filter((p) => /data-ready|data-peel=off/.test(p)),
		).toEqual([]);
	});

	test('a finger that holds still on a bottom edge, then sets off as fast as a swipe, scrolls the page', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const { from } = await edgeOf(page, 'basilica', 'bottom', 10, 'end');
		const before = await page.evaluate(() => window.scrollY);
		// a pause, then 160px up the screen in 64ms
		await stampedDrag(cdp, 'touch', from, [
			{ path: [], stepMs: 16, hold: 220 },
			{ path: upwards(from, 160, 8), stepMs: 8, paced: true },
		]);
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(before + 100);
		await page.waitForTimeout(500);
		await expect(page).toHaveURL(at('/'));
		expect(
			(await peels(page)).filter((p) => /data-ready|data-peel=off/.test(p)),
		).toEqual([]);
	});

	test('pulled in from a top or a bottom edge at a slant, the paper stays under the finger and the fold close to square', async ({
		page,
		context,
	}) => {
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		for (const [key, where] of [
			['basilica', 'top'],
			['covid', 'bottom'],
		] as const) {
			const el = sticker(page, key);
			const { from, inward } = await edgeOf(page, key, where, 10);
			const touch = (type: TouchType, points: Point[]) =>
				cdp.send('Input.dispatchTouchEvent', {
					type,
					touchPoints: points.map((p) => ({ ...p, id: 1 })),
				});
			/** Where the point taken hold of is now, on screen (--tip-x, --tip-y). */
			const tip = () =>
				el.evaluate((e) => {
					const style = getComputedStyle(e);
					const probe = document.createElement('span');
					probe.style.cssText = `position:absolute;left:${style.getPropertyValue('--tip-x')};top:${style.getPropertyValue('--tip-y')}`;
					e.querySelector('.stk-body')?.append(probe);
					const r = probe.getBoundingClientRect();
					probe.remove();
					return { x: r.left, y: r.top };
				});
			await touch('touchStart', [from]);
			// leaning 40° off the way in, 7px a move
			const path = along(from, turn(inward, 40), 98, 14);
			let first: Point | null = null;
			for (const p of path) {
				await touch('touchMove', [p]);
				if ((await el.getAttribute('data-hand')) === null) continue;
				const t = await tip();
				const off = { x: t.x - p.x, y: t.y - p.y };
				first ??= off;
				// the paper under the finger stays under it (as it was taken)
				expect(
					Math.hypot(off.x - first.x, off.y - first.y),
					`${key} ${where}`,
				).toBeLessThan(2);
			}
			expect(first, `${key} ${where}`).not.toBeNull();
			// the fold turned with the slant, but stayed within 25° of square
			expect(
				apart(await foldOf(el), FACING[where]),
				`${key} ${where}`,
			).toBeLessThan(25);
			await touch('touchMove', [from]);
			await touch('touchEnd', []);
			await expect(el).not.toHaveAttribute('data-peel', { timeout: 3000 });
		}
		await expect(page).toHaveURL(at('/'));
	});

	test('a short touch drag from an edge springs back flat', async ({
		page,
		context,
	}) => {
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const basilica = sticker(page, 'basilica');
		const { from, inward } = await edgeOf(page, 'basilica', 'left', 10);
		await touchDrag(cdp, page, from, along(from, inward, 40, 6));
		await expect(basilica).toHaveAttribute('data-peel', 'spring');
		await expect(basilica).not.toHaveAttribute('data-peel', {
			timeout: 3000,
		});
		await expect(basilica).not.toHaveAttribute('data-hand');
		expect(await peelOf(basilica)).toBeCloseTo(0.085, 2);
		await page.waitForTimeout(300);
		await expect(page).toHaveURL(at('/'));
	});

	test('swipes up and down the sides of a sticker scroll the page, and never peel it', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		for (const where of ['left', 'right'] as const) {
			for (const down of [false, true]) {
				await scrollStill(page);
				const { from } = await edgeOf(page, 'basilica', where, 10);
				const before = await page.evaluate(() => window.scrollY);
				await timedTouch(
					cdp,
					from,
					upwards(from, down ? -120 : 120, 12),
					16,
					true,
				);
				const label = `${where} ${down ? 'down' : 'up'}`;
				await expect
					.poll(() => page.evaluate(() => window.scrollY), label)
					[down ? 'toBeLessThan' : 'toBeGreaterThan'](
						before + (down ? -80 : 80),
					);
				await page.waitForTimeout(400);
				await expect(page, label).toHaveURL(at('/'));
			}
		}
		expect(await peels(page)).toEqual([]);
	});

	test('a swipe up from the bottom edge scrolls the page, straight or as a thumb’s arc, and never opens it', async ({
		page,
		context,
	}) => {
		const peels = await watchPeel(context);
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		for (const key of ['superspace', 'covid']) {
			await scrollStill(page);
			const straight = await edgeOf(page, key, 'bottom', 10, 'end');
			const before = await page.evaluate(() => window.scrollY);
			await timedTouch(
				cdp,
				straight.from,
				upwards(straight.from, 140, 14),
				16,
				true,
			);
			await expect
				.poll(() => page.evaluate(() => window.scrollY), `${key} straight`)
				.toBeGreaterThan(before + 110);
			await page.waitForTimeout(500);
			// leaning 36° at first (into the sticker), curling to 10° off the vertical
			await scrollStill(page);
			const { from } = await edgeOf(page, key, 'bottom', 10, 'end');
			const start = await page.evaluate(() => window.scrollY);
			const path: Point[] = [];
			let finger = from;
			for (let i = 0; i < 35; i++) {
				const a = ((36 - (26 * i) / 34) * Math.PI) / 180;
				finger = {
					x: finger.x - 4 * Math.sin(a),
					y: finger.y - 4 * Math.cos(a),
				};
				path.push(finger);
			}
			await timedTouch(cdp, from, path, 8, true);
			await expect
				.poll(() => page.evaluate(() => window.scrollY), `${key} arc`)
				.toBeGreaterThan(start + 100);
			await page.waitForTimeout(500);
			await expect(page, key).toHaveURL(at('/'));
		}
		const seen = await peels(page);
		expect(seen.filter((p) => /data-ready|data-peel=off/.test(p))).toEqual([]);
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
			timeout: 3000,
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
		await expect(covid).not.toHaveAttribute('data-peel', { timeout: 3000 });
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
				// the corner low on the screen, so the page has room to scroll
				await scrollStill(page);
				const from = await gripOf(page, key, 'end');
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
				const from = await gripOf(page, key, 'end');
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
		// a key, and the focus shows again, as the keyboard's does (the sticker
		// marks it itself: newer Chromium keeps quiet focus out of :focus-visible)
		await page.keyboard.press('Shift');
		await expect(basilica).not.toHaveAttribute('data-quiet');
		await expect(basilica).toHaveAttribute('data-keyed', '');
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
		await expect(page).toHaveURL(at('/projects/basilica'), { timeout: 3000 });
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

test.describe('scrolling from an edge, with reduced motion', () => {
	test.use({
		reducedMotion: 'reduce',
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
	});
	test.beforeEach(async ({ context }) => skipHint(context));

	test('a flick that scrolls the page from a top or bottom edge coasts on, as one anywhere else does', async ({
		page,
		context,
	}) => {
		await page.goto('/');
		const cdp = await context.newCDPSession(page);
		const { from } = await edgeOf(page, 'basilica', 'bottom', 10, 'end');
		const before = await page.evaluate(() => window.scrollY);
		// 12px a move, 12ms apart, and let go moving
		await timedTouch(cdp, from, upwards(from, 144, 12), 12);
		const lifted = await page.evaluate(() => window.scrollY);
		await scrollStill(page);
		const after = await page.evaluate(() => window.scrollY);
		expect(lifted).toBeGreaterThan(before + 100);
		// momentum is the reader's own motion, not an effect: it is kept
		expect(after).toBeGreaterThan(lifted + 60);
		await expect(page).toHaveURL(at('/'));
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
	// would have) or jumping up after it: the hand takes the corner over as it
	// shows, and hands it back where the stylesheet puts it
	const shown = await superspace.evaluate(
		(el) =>
			new Promise<number[]>((resolve) => {
				const seen: number[] = [];
				const frame = () => {
					const by = el.hasAttribute('data-hand') ? '--drag' : '--peel';
					seen.push(
						Number.parseFloat(getComputedStyle(el).getPropertyValue(by)),
					);
					if (seen.length < 60) requestAnimationFrame(frame);
					else resolve(seen);
				};
				requestAnimationFrame(frame);
			}),
	);
	expect(Math.min(...shown)).toBeGreaterThan(Math.min(shown[0], 0.125) - 0.006);
	await expect(superspace).not.toHaveAttribute('data-hand');
	expect(await shownOf(superspace)).toBeCloseTo(0.13, 2);
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
