/*
 * A sticker folded back by hand, as paper folds: the point taken hold of, P,
 * goes where the pointer takes it, Q, and the fold is the line halfway between
 * them (the perpendicular bisector of PQ). Everything on P's side of it lifts
 * and lies over the rest, mirrored across the fold: the face keeps the side
 * away from P, and the backing's part on P's side, reflected, is the flap.
 * That works from any side of any sticker, because the backing's own alpha
 * draws the outline of whatever is folded.
 *
 * This module holds the geometry (in the sticker's own frame: its box, y
 * down, before its tilt) and draws a fold onto a sticker (`drawHand`). The
 * drag that drives it is in usePeel; DeskProvider hands the pose over to the
 * header sticker, which has another size, so a pose is kept in units of the
 * sticker's width.
 *
 * The fold drawn here is the hand's. The corner that lifts at rest, on hover
 * and in a click's lift is the stylesheet's own (styles/stickers.css), always
 * at the bottom-right corner; each of the two cuts the other's face, so when
 * both show, the deeper one wins.
 */

export type Point = { x: number; y: number };

/**
 * A fold made by hand, in units of the sticker's width: it lifts the paper
 * around (x, y), the point taken hold of, folding along the line square to the
 * angle `a` (radians, the way the lifted part lies from the fold), `p` deep
 * there (as a peel: the fold lies p · width / √2 in from the point, the point
 * itself p · √2 · width from where it lay flat).
 */
export type Hand = { a: number; x: number; y: number; p: number };

export const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

/** `n` turned `deg` degrees (clockwise on screen). */
export function turn(n: Point, deg: number): Point {
	const r = (deg * Math.PI) / 180;
	const cos = Math.cos(r);
	const sin = Math.sin(r);
	return { x: n.x * cos - n.y * sin, y: n.x * sin + n.y * cos };
}

/** The angle (degrees, −180 to 180) from `a` round to `b`. */
export function angleFrom(a: Point, b: Point): number {
	return (Math.atan2(a.x * b.y - a.y * b.x, dot(a, b)) * 180) / Math.PI;
}

function unit(v: Point, fallback: Point): Point {
	const l = Math.hypot(v.x, v.y);
	return l > 1e-9 ? { x: v.x / l, y: v.y / l } : fallback;
}

/** The part of a convex polygon where n · X ≤ c (Sutherland–Hodgman, one edge). */
export function cut(poly: Point[], n: Point, c: number): Point[] {
	const out: Point[] = [];
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		const da = dot(n, a) - c;
		const db = dot(n, b) - c;
		if (da <= 0) out.push(a);
		if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
			const t = da / (da - db);
			out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
		}
	}
	return out;
}

function centroid(poly: Point[]): Point {
	let x = 0;
	let y = 0;
	for (const p of poly) {
		x += p.x;
		y += p.y;
	}
	return { x: x / poly.length, y: y / poly.length };
}

/** The convex hull of `points` (Andrew's monotone chain), with no three in a line. */
function convexHull(points: Point[]): Point[] {
	const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
	if (pts.length < 3) return pts;
	const cross = (o: Point, a: Point, b: Point) =>
		(a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	const lower: Point[] = [];
	for (const p of pts) {
		while (
			lower.length >= 2 &&
			cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
		) {
			lower.pop();
		}
		lower.push(p);
	}
	const upper: Point[] = [];
	for (let i = pts.length - 1; i >= 0; i--) {
		const p = pts[i];
		while (
			upper.length >= 2 &&
			cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
		) {
			upper.pop();
		}
		upper.push(p);
	}
	lower.pop();
	upper.pop();
	return lower.concat(upper);
}

/* ── the outline: the hull of the backing's opaque pixels ── */

/** Each backing's outline (its convex hull, in units of its width), by the image's URL. */
const hulls = new Map<string, Point[]>();

/**
 * Reads a sticker's outline off its backing image (the flap's <img>), once
 * it has loaded: the convex hull of its opaque pixels. Same-origin SVG, so
 * the canvas can be read.
 */
export function learnHull(img: HTMLImageElement) {
	const src = img.src;
	if (!src || hulls.has(src) || !img.complete || !img.naturalWidth) return;
	try {
		const w = img.naturalWidth;
		const h = img.naturalHeight;
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const g = canvas.getContext('2d', { willReadFrequently: true });
		if (!g) return;
		g.drawImage(img, 0, 0, w, h);
		const alpha = g.getImageData(0, 0, w, h).data;
		const edge: Point[] = [];
		for (let y = 0; y < h; y++) {
			let first = -1;
			let last = -1;
			for (let x = 0; x < w; x++) {
				if (alpha[(y * w + x) * 4 + 3] > 127) {
					if (first < 0) first = x;
					last = x;
				}
			}
			if (first < 0) continue;
			edge.push(
				{ x: first, y },
				{ x: first, y: y + 1 },
				{ x: last + 1, y },
				{ x: last + 1, y: y + 1 },
			);
		}
		const hull = convexHull(edge).map((p) => ({ x: p.x / w, y: p.y / w }));
		if (hull.length >= 3) hulls.set(src, hull);
	} catch {
		// unreadable: the shape the stylesheet gives it stands in
	}
}

function num(style: CSSStyleDeclaration, name: string, fallback: number) {
	const v = Number.parseFloat(style.getPropertyValue(name));
	return Number.isFinite(v) ? v : fallback;
}

/**
 * The outline the stylesheet gives a sticker for its grip (styles/stickers.css):
 * a circle (--disc, its radius as a part of the width) or a rectangle with
 * rounded corners (--round). It stands in until the backing has been read.
 */
function shapeHull(root: HTMLElement): Point[] {
	const body = root.querySelector<HTMLElement>('.stk-body') ?? root;
	const style = getComputedStyle(body);
	const ratio = num(style, '--ratio', 1);
	const disc = num(style, '--disc', 0);
	if (disc > 0) {
		return Array.from({ length: 48 }, (_, i) => {
			const t = (i / 48) * 2 * Math.PI;
			return {
				x: 0.5 + disc * Math.cos(t),
				y: ratio / 2 + disc * Math.sin(t),
			};
		});
	}
	const r = Math.min(num(style, '--round', 0), 0.5, ratio / 2);
	const corners = [
		{ x: 1 - r, y: ratio - r, from: 0 },
		{ x: r, y: ratio - r, from: 90 },
		{ x: r, y: r, from: 180 },
		{ x: 1 - r, y: r, from: 270 },
	];
	return corners.flatMap(({ x, y, from }) =>
		Array.from({ length: r > 0 ? 7 : 1 }, (_, i) => {
			const t = ((from + i * 15) * Math.PI) / 180;
			return { x: x + r * Math.cos(t), y: y + r * Math.sin(t) };
		}),
	);
}

/** A sticker's outline (units of its width): read off its backing, or the stylesheet's shape until then. */
export function hullOf(root: HTMLElement): Point[] {
	const flap = root.querySelector<HTMLImageElement>('img.stk-flap');
	const known = flap ? hulls.get(flap.src) : undefined;
	return known ?? shapeHull(root);
}

/** How far the outline reaches along `n`: the support line n · X = h, h the largest n · X on it. */
export function reach(hull: Point[], n: Point): number {
	let h = Number.NEGATIVE_INFINITY;
	for (const v of hull) h = Math.max(h, dot(n, v));
	return h;
}

/**
 * The part of the outline furthest along `n`: its support line n · X = h,
 * and where along that line (t = n turned a right angle clockwise, t · X)
 * the outline runs on it, from `lo` to `hi`: a straight edge square to `n`
 * (a side), or a single point (a corner, or a round outline).
 */
export function sideOf(
	hull: Point[],
	n: Point,
): { h: number; lo: number; hi: number } {
	const h = reach(hull, n);
	const t = { x: -n.y, y: n.x };
	let lo = Number.POSITIVE_INFINITY;
	let hi = Number.NEGATIVE_INFINITY;
	// within a pixel or so: a straight edge read off pixels steps a little
	for (const v of hull) {
		if (dot(n, v) >= h - 0.75) {
			const s = dot(t, v);
			lo = Math.min(lo, s);
			hi = Math.max(hi, s);
		}
	}
	return { h, lo, hi };
}

/**
 * The point of the outline furthest along `n`, the one nearest to `near` where
 * a straight edge lies square to `n` (a side, rather than a corner).
 */
export function outermost(hull: Point[], n: Point, near: Point): Point {
	const { h, lo, hi } = sideOf(hull, n);
	const t = { x: -n.y, y: n.x };
	const s = Math.min(hi, Math.max(lo, dot(t, near)));
	return { x: n.x * h + t.x * s, y: n.y * h + t.y * s };
}

/** The outline taken in by `d` all round (it keeps its corners: a convex polygon's inner offset). */
function inset(hull: Point[], d: number): Point[] {
	const m = centroid(hull);
	let poly = hull;
	for (let i = 0; i < hull.length && poly.length >= 3; i++) {
		const a = hull[i];
		const b = hull[(i + 1) % hull.length];
		let n = unit({ x: b.y - a.y, y: a.x - b.x }, { x: 0, y: 0 });
		if (n.x === 0 && n.y === 0) continue;
		if (dot(n, { x: m.x - a.x, y: m.y - a.y }) > 0) n = { x: -n.x, y: -n.y };
		poly = cut(poly, n, dot(n, a) - d);
	}
	return poly;
}

function contains(poly: Point[], p: Point): boolean {
	let sign = 0;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
		if (Math.abs(c) < 1e-9) continue;
		if (sign === 0) sign = Math.sign(c);
		else if (Math.sign(c) !== sign) return false;
	}
	return true;
}

/** The point of a convex polygon's outline nearest to `p`. */
export function nearestOn(poly: Point[], p: Point): Point {
	let best = poly[0];
	let dist = Number.POSITIVE_INFINITY;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		const ab = { x: b.x - a.x, y: b.y - a.y };
		const len = dot(ab, ab);
		const t =
			len > 0
				? Math.max(
						0,
						Math.min(1, dot({ x: p.x - a.x, y: p.y - a.y }, ab) / len),
					)
				: 0;
		const q = { x: a.x + ab.x * t, y: a.y + ab.y * t };
		const d = Math.hypot(p.x - q.x, p.y - q.y);
		if (d < dist) {
			dist = d;
			best = q;
		}
	}
	return best;
}

/**
 * Where a press at `d` (px, in the sticker's frame) takes hold: the way the
 * paper there faces out (`n`, square to a side, turning round a corner over
 * `round` px), and the point of the outline it takes (`at`), so nothing past
 * the outline is folded before the pointer has moved. `hull` is in px.
 */
export function grip(
	hull: Point[],
	d: Point,
	round: number,
): { n: Point; at: Point } {
	const inner = round > 0 ? inset(hull, round) : [];
	// deep inside (no grip is there), it faces out from the middle
	const from =
		inner.length >= 3 && !contains(inner, d)
			? nearestOn(inner, d)
			: centroid(hull);
	const n = unit(
		{ x: d.x - from.x, y: d.y - from.y },
		{ x: Math.SQRT1_2, y: Math.SQRT1_2 },
	);
	return { n, at: outermost(hull, n, d) };
}

/**
 * How far (degrees, up to `most`) the fold may turn from `n0` toward `sign`
 * (+1 clockwise) for a fold `depth` px in at `at`: as far as the paper beyond
 * the point taken hold of, which a turned fold lifts too, stays within
 * `room` · depth. Round a corner that is no paper at all, so a corner's fold
 * turns freely; along a straight side, a little more the further it is pulled.
 */
export function swingRoom(
	hull: Point[],
	at: Point,
	n0: Point,
	depth: number,
	room: number,
	most: number,
	sign: 1 | -1,
): number {
	const allowed = room * depth + 0.5;
	let before = 0;
	for (let deg = 1; deg <= most; deg++) {
		const n = turn(n0, sign * deg);
		const beyond = reach(hull, n) - dot(n, at);
		if (beyond > allowed) {
			return deg - 1 + (allowed - before) / Math.max(beyond - before, 1e-6);
		}
		before = beyond;
	}
	return most;
}

/* ── drawing a fold ── */

/** The shade of the backing, in from its outer edge (its share of SHADE_SPAN): bright where it was lifted from, dimmer toward the fold. */
const SHADE = [
	['#f8f5ee', 0],
	['#eee9df', 0.177],
	['#d3ccbf', 0.323],
	['#c4bcad', 0.403],
	['#b1a998', 1],
] as const;
/** How far in (a part of the width) the shade reaches, as the corner's backing images draw it. */
const SHADE_SPAN = 0.438;

/** The folds drawn on each sticker, as drawn. */
const drawn = new WeakMap<HTMLElement, Hand>();

/** The fold `drawHand` last drew on a sticker, or null. */
export const handOf = (root: HTMLElement): Hand | null =>
	drawn.get(root) ?? null;

const px = (v: number) => `${v.toFixed(2)}px`;
const polygon = (pts: Point[]) =>
	pts.length >= 3
		? `polygon(${pts.map((p) => `${px(p.x)} ${px(p.y)}`).join(', ')})`
		: 'polygon(0 0, 0 0, 0 0)';

/**
 * Draws a fold by hand on a sticker (.stk on the Projects page, .slap-stk in
 * the header), at the sticker's own size; null puts it away. The face, and
 * the stylesheet's own corner flap, keep the box on the far side of the fold
 * (.stk-cut); the hand's flap (.stk-hand, the backing masked by its own
 * image) is the box on the near side, mirrored across the fold, and shaded in
 * from the outline. The sticker gets --drag (how far it is peeled), --fold
 * (the angle) and --tip-x/--tip-y (where the point taken hold of is now).
 */
export function drawHand(root: HTMLElement, hand: Hand | null) {
	const body = root.querySelector<HTMLElement>('.stk-body');
	const flap = root.querySelector<HTMLElement>('.stk-hand');
	const cuts = root.querySelectorAll<HTMLElement>('.stk-cut');
	if (!body || !flap) return;
	if (!hand || !(hand.p > 0)) {
		drawn.delete(root);
		delete root.dataset.hand;
		for (const c of cuts) c.style.removeProperty('clip-path');
		for (const name of ['transform', 'clip-path', 'background-image']) {
			flap.style.removeProperty(name);
		}
		for (const name of ['--drag', '--fold', '--tip-x', '--tip-y']) {
			root.style.removeProperty(name);
		}
		return;
	}
	const w = body.offsetWidth || 1;
	const h = body.offsetHeight || 1;
	const n = { x: Math.cos(hand.a), y: Math.sin(hand.a) };
	const at = { x: hand.x * w, y: hand.y * w };
	const c = dot(n, at) - (hand.p * w) / Math.SQRT2;
	const box = [
		{ x: 0, y: 0 },
		{ x: w, y: 0 },
		{ x: w, y: h },
		{ x: 0, y: h },
	];
	const face = polygon(cut(box, n, c));
	for (const el of cuts) el.style.clipPath = face;
	// the reflection across n · X = c: X − 2 (n · X − c) n
	const m = [
		1 - 2 * n.x * n.x,
		-2 * n.x * n.y,
		-2 * n.x * n.y,
		1 - 2 * n.y * n.y,
		2 * c * n.x,
		2 * c * n.y,
	];
	flap.style.transform = `matrix(${m.map((v) => v.toFixed(5)).join(', ')})`;
	flap.style.clipPath = polygon(cut(box, { x: -n.x, y: -n.y }, -c));
	// The shade, in the backing's own frame (the flap before its mirror), runs
	// in from the outline's outer edge along −n: a linear gradient whose line
	// goes through the box's middle, so its stops are placed from there.
	const outer = reach(
		hullOf(root).map((p) => ({ x: p.x * w, y: p.y * w })),
		n,
	);
	const angle = Math.atan2(-n.x, n.y);
	const span = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle));
	const start = -outer + dot(n, { x: w / 2, y: h / 2 }) + span / 2;
	const stops = SHADE.map(
		([colour, at]) => `${colour} ${px(start + at * SHADE_SPAN * w)}`,
	).join(', ');
	flap.style.backgroundImage = `linear-gradient(${((angle * 180) / Math.PI).toFixed(2)}deg, ${stops})`;
	const lift = dot(n, at) - c;
	root.style.setProperty('--tip-x', px(at.x - 2 * lift * n.x));
	root.style.setProperty('--tip-y', px(at.y - 2 * lift * n.y));
	root.style.setProperty('--drag', hand.p.toFixed(4));
	root.style.setProperty(
		'--fold',
		`${((Math.atan2(n.y, n.x) * 180) / Math.PI).toFixed(2)}deg`,
	);
	root.dataset.hand = '';
	drawn.set(root, hand);
}

/** A cubic Bézier easing (as CSS's cubic-bezier()), for folds laid down by script. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
	const at = (a: number, b: number, t: number) =>
		3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let lo = 0;
		let hi = 1;
		for (let i = 0; i < 24; i++) {
			const mid = (lo + hi) / 2;
			if (at(x1, x2, mid) < x) lo = mid;
			else hi = mid;
		}
		return at(y1, y2, (lo + hi) / 2);
	};
}

/** The folds being laid down by script (`layDown`), by sticker: how to stop each. */
const laying = new WeakMap<HTMLElement, () => void>();

/** Stops a fold being laid down by script where it is (a new pose is about to be drawn). */
export function stopLaying(root: HTMLElement) {
	laying.get(root)?.();
	laying.delete(root);
}

/**
 * Lays a fold drawn by hand back down over `ms` (the header sticker, once
 * it has landed: DeskProvider), then puts it away.
 */
export function layDown(
	root: HTMLElement,
	ms: number,
	ease: (t: number) => number,
) {
	stopLaying(root);
	const from = handOf(root);
	if (!from) return;
	let frame = 0;
	let start = 0;
	const step = (now: number) => {
		if (!start) start = now;
		const t = Math.min(1, (now - start) / ms);
		if (t >= 1) {
			laying.delete(root);
			drawHand(root, null);
			return;
		}
		drawHand(root, { ...from, p: from.p * (1 - ease(t)) });
		frame = requestAnimationFrame(step);
	};
	frame = requestAnimationFrame(step);
	laying.set(root, () => cancelAnimationFrame(frame));
}
