'use client';

import {
	type DragEvent,
	type MouseEvent,
	type PointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react';
import { prefersReducedMotion } from './DeskProvider';
import {
	angleFrom,
	dot,
	drawHand,
	grip as gripAt,
	type Hand,
	hullOf,
	inside,
	learnHull,
	outermost,
	type Point,
	sideOf,
	swingRoom,
	turn,
} from './fold';

/*
 * Peeling a sticker by hand, from any side. A press on its edge (a grip, the
 * band .stk-grip all round its outline) takes hold of the outline there, and
 * a pull folds the paper back as paper folds (components/fold.ts): the point
 * taken hold of follows the pointer, and the fold is the line halfway between
 * where it lay and where it is now. Let go far enough in, or flick it, and the
 * sticker comes off: `onOff` opens the project, from the peeled pose. Let go
 * before that and it springs back down.
 *
 * Pulled past PEEL_MAX it gives less and less, as a rubber band does, but
 * never stops; pushed back, it comes back with the pointer at once, and works
 * its way back under the pointer from there. Let go while pushing it back
 * down and it stays, however far it was.
 *
 * A finger (or a pen) on an edge may also just be scrolling the page: the
 * first few pixels it moves decide. Into the sticker, and leaning off the
 * screen's vertical, it peels; straight up or down the screen from a top or a
 * bottom edge it peels only when the finger held still a moment first
 * (HOLD_MS), as a hand taking hold of an edge does and a thumb flicking the
 * page does not; any other way it scrolls the page (by the browser, or by
 * hand here, with the glide a flick gives). A peel from the top or the bottom
 * that turns along the screen's vertical before it is far enough to come off
 * (a thumb's arc), or one taken by a held finger that sets off fast (a swipe
 * after a pause), was a scroll after all, and is handed back.
 *
 * The bottom-right corner also lifts by itself (at rest, on hover, in the
 * hint, in a click's lift): that is the stylesheet's own fold, --peel. A press
 * on that corner takes it over as it is (data-took); a press anywhere else
 * lays it down while its own fold lifts. The hand's fold is drawn by script
 * (drawHand), which writes --drag (how far it is peeled) and --fold; the
 * sticker's data-peel says who drives it: "drag" (the pointer), "spring" (the
 * spring laying it down), "off" (let go to open: it stays peeled while it
 * lifts and flies) and "hint" (the once-a-visit hint).
 */

/** Let go with it pulled this far (the pointer's travel, as a peel: a part of the width · √2) and the sticker comes off. */
const PEEL_OPEN = 0.34;
/**
 * Once far enough to come off, it stays so until pushed back this much under
 * PEEL_OPEN (about 6px): a finger resting on the line, with its tremor, does
 * not flicker the cue, and letting go does what the cue last said.
 */
const READY_GIVE = 0.02;
/** How far the paper follows the pointer one to one; past it, it gives less and less. */
const PEEL_MAX = 0.46;
/**
 * The rubber band past PEEL_MAX: the paper gives half of this to the first
 * PEEL_BAND of extra pull, and keeps on giving a little to any more (it never
 * gets all of it). Pushed back, it comes back with the pointer at once.
 */
const PEEL_BAND = 0.15;
/** How far (px) a press on an edge moves before it is a drag rather than a tap; a finger's or a pen's way is read there. */
const SLOP: Record<string, number> = { mouse: 3, pen: 8, touch: 10 };
/** A press that wandered less than this (px) and did not come off is still a tap: the browser's click opens the sticker. */
const TAP_SLOP: Record<string, number> = { mouse: 6, pen: 12, touch: 15 };
/** A finger starts a peel only within this many degrees of the way into the sticker, from where it took hold; any other way, it scrolls. */
const START_CONE = 60;
/**
 * ... and only leaning at least this many degrees off the screen's vertical,
 * whatever the sticker's tilt (a thumb scrolling the page goes up the screen),
 * unless it held still first (HOLD_MS). At the page's end, where nothing
 * scrolls that way, a quick straight flick still does not peel: it is the
 * habit of a thumb asking for more page, not a hand taking hold.
 */
const START_LEAN = 30;
/**
 * A finger that held still this long (ms) on a top or bottom edge before it
 * moved took hold of it: straight in, along the screen's vertical, it peels.
 * A thumb scrolling the page is moving within a frame or two of touching.
 */
const HOLD_MS = 140;
/**
 * ... but a held finger that then sets off faster than this (px/s), before
 * the sticker is far enough to come off, is a swipe after a pause: the paper
 * goes back down and the page scrolls. A hand peeling pulls slower.
 */
const HELD_SWIPE = 1000;
/**
 * Until a finger's peel from the top or the bottom is far enough to come off,
 * it is handed back to scrolling whenever its last this-many px go along the
 * screen's vertical within START_LEAN, the way the page scrolls: a thumb's arc
 * that set off into the sticker and curled.
 */
const TURN_SPAN = 40;
/** How many of a finger's moves the trail recalls, for that. */
const TRAIL = 96;
/**
 * Pulled in again with the paper short of the pointer (pushed back from past
 * the band), it gains this much of each move on it, until it is under the
 * pointer again; a page scrolled by hand gains as much on the finger.
 */
const CATCH_UP = 0.5;
/**
 * How far (degrees) the fold may turn from square to where it took hold, at
 * most. It turns with the pull up to FOLD_KNEE (of FOLD_SWING); a pull that
 * leans further than the fold may turn slides the point taken hold of along
 * the outline instead (as a fingertip slides along an edge it drags
 * sideways), so the paper stays under the pointer and the fold close to
 * square (`regrip`).
 */
const FOLD_SWING = 33;
const FOLD_KNEE = 25;
/**
 * A round sticker has no side for its fold to stay square to (a fold on a
 * disc is the same at any angle), so it turns as far as the pull, up to this,
 * as far as swingRoom lets it.
 */
const FOLD_SWING_DISC = 80;
/**
 * A corner (the point where two sides meet, which no straight run of the
 * outline faces) has no side to slide along either: its fold turns past
 * FOLD_SWING, up to this, as far as swingRoom lets it (to square to the side
 * the pull runs along, and a little past), so a corner pulled along a side
 * stays under the pointer.
 */
const FOLD_SWING_CORNER = 60;
/**
 * A turned fold lifts paper beyond the point taken hold of: a side's, all the
 * way along it. It turns only as far as that paper stays within this much of
 * the fold's depth, so a corner (which has none) turns freely and a side a
 * little more the further it is pulled (components/fold.ts, swingRoom).
 */
const FOLD_ROOM = 1;
/** A flick: let go while the pointer moves in this fast (px/s, the way it has pulled the paper, into the sticker) ... */
const FLING_SPEED = 600;
/** ... after pulling it in this far (px, the same way) ... */
const FLING_PULL = 30;
/** ... and within this many degrees of that way, and the sticker comes off too. */
const FLING_CONE = 30;
/** Let go while the pointer pushes the paper back down this fast (px/s, the way it was pulled) and it stays, however far it was. */
const PUSH_BACK = 400;
/** The spring that lays it back down: stiffness (1/s²) and damping ratio (a little bounce). */
const SPRING_K = 520;
const SPRING_ZETA = 0.6;
/** The fastest it may be thrown into the spring (peel/s). */
const SPRING_V_MAX = 4;
/** How long after a drag the click it makes is still dropped (ms). */
const CLICK_AFTER_DRAG_MS = 700;
/** A page scrolled from an edge glides on after a flick, slowing with this time constant (s) ... */
const GLIDE_TAU = 0.325;
/** ... until it is slower than this (px/s). */
const GLIDE_MIN = 20;
/** How far a mouse over an edge lifts it, where the pointer is (as a peel): enough to see that the edge comes up. */
const HOVER_PEEL = 0.08;
/** The stylesheet's own corner: the bottom-right one, its fold square to the diagonal. */
const CORNER = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
/** A press whose paper faces out within this many degrees of that corner's diagonal takes that corner over. */
const CORNER_TAKE = 25;

/** Which grip a press is on (styles/stickers.css): it says which way the browser scrolls a finger itself. */
type Side = 'top' | 'bottom' | 'left' | 'right';

/**
 * Where a press took hold, in the sticker's own frame (px): the point of the
 * outline (`at`), the way the paper there faces out (`n`), the outline
 * (`hull`, px) and the width. `corner`: the stylesheet's own corner.
 */
type Grab = {
	at: Point;
	n: Point;
	hull: Point[];
	w: number;
	corner: boolean;
	/** a round sticker (--disc): its fold may turn as far as the pull, there being no side to keep square to */
	disc: boolean;
	/** how far (degrees) its fold may turn: a side's FOLD_SWING, a corner's or a disc's more */
	cap: number;
};

type Press = {
	id: number;
	type: string;
	/** where and when the press started */
	x: number;
	y: number;
	t: number;
	/** the sticker's tilt (radians): the drag is read in its own frame */
	tilt: number;
	side: Side;
	g: Grab;
	/** where the paper is held now: `g`, or a point the pointer slid along the outline to (`regrip`) */
	shown: Grab;
	/** the peel the paper already had when it was taken (the corner's own lift): it counts for nothing */
	base: number;
	/**
	 * How far (px, along the way the paper faces out) the paper's tip lies
	 * ahead of the pointer, into the sticker, as it takes hold: a lift taken
	 * over where the pointer is not on the paper it lifted (the mouse over a
	 * lifted corner presses the spot the corner left), or a press on the
	 * grip's band outside the outline; behind it (negative) when the press is
	 * inside the outline, the paper's edge short of the finger. `lift` is the
	 * peel the lift taken over had. The lead eases away over the first
	 * 2 × |lead| px of the pull, so the paper comes to be under the pointer.
	 */
	lead: number;
	lift: number;
	/** how much of the lead (px) it has made up so far: once under the pointer, it stays under it */
	caught: number;
	/** where the paper's tip is now (the sticker's frame) */
	now: Point;
	/** a finger that held still before it moved, straight in from a top or bottom edge (HOLD_MS) */
	held: boolean;
	/** the way into the sticker from where it took hold, on screen */
	inward: Point;
	/** where the point taken hold of was when the press started (it may be lifted already) */
	tip: Point;
	/** still a press (it may be a tap), a peel, or a scroll by hand ("native": the browser scrolls it) */
	mode: 'press' | 'peel' | 'scroll' | 'native';
	peel: number;
	/** how far (degrees) the fold has turned from square to where it took hold */
	a: number;
	/** how far it has travelled, as a peel (the rubber band applied) */
	reach: number;
	/** the same before the rubber band: how far the pointer has pulled it, less `slack` */
	raw: number;
	/** how far the pointer has pulled it (as a peel), slack and all */
	pull: number;
	/**
	 * How much of the pointer's pull (as a peel) the paper has let go of: a
	 * pull past the band that came back again. The pointer slid on the paper
	 * there; the paper follows it back from where it is, at once, and takes the
	 * slack up again as the pointer moves on, either way.
	 */
	slack: number;
	/** far enough to come off (data-ready): letting go now opens it */
	ready: boolean;
	/** the tick that says so has been felt, this press */
	ticked: boolean;
	/** a finger's peel: where it has been (on screen, from the press), for the way it went last */
	trail: Point[];
	/** the farthest (px) the pointer got from where it pressed */
	far: number;
	/** recent moves, for the speed at release: the pointer in the sticker's frame (or on screen, scrolling) */
	samples: { t: number; x: number; y: number; peel: number; reach: number }[];
	/** scrolling by hand: the page's scroll and the finger's y when it started */
	scroll0: number;
	y0: number;
	/** ... how far (px) the page has still to make up on the finger, and where the finger last was */
	owed: number;
	lastY: number;
	/** the pointer is over the sticker when it lets go (the hover peel is where it settles) */
	over: boolean;
};

/** A fold that moves by itself (a spring, the hint's edge): where it is, and how to stop it. */
type Motion = {
	g: Grab;
	took: boolean;
	peel: number;
	a: number;
	/**
	 * The little lift a mouse over an edge gives it (`hoverEdge`): a press
	 * takes it over, as the corner's own lift is. `aim` moves it along the
	 * edge with the pointer, or lays it down (0).
	 */
	hover?: { aim: (g: Grab, to: number) => void };
	stop: () => void;
};

/** The folds moving by themselves, by sticker. */
const moving = new WeakMap<HTMLElement, Motion>();

function stopMotion(el: HTMLElement) {
	moving.get(el)?.stop();
	moving.delete(el);
}

export type Peel = {
	/** A press on the sticker: on a grip it may become a peel (true: it is taken as one that may). */
	onPointerDown: (event: PointerEvent<HTMLElement>) => boolean;
	/** True while the press in hand is still a tap or a click (it has not set off as a peel or a scroll). */
	tapping: () => boolean;
	/** A link dragged out by its edge would carry the link away instead of peeling. */
	onDragStart: (event: DragEvent<HTMLElement>) => void;
	/** True for the click a drag makes when it ends: it is dropped. */
	dragged: (event: MouseEvent<HTMLElement>) => boolean;
	/** Stops the hint or the spring where they are (a click lifts the sticker from there). */
	stop: () => void;
	/** A pointer or the focus came onto the sticker: the hint gives way to the hover (or rest) peel, smoothly. */
	calm: () => void;
	/** The sticker let go to open did not go: lay it back down. */
	drop: () => void;
	/** A mouse moving over the sticker: on an edge, that edge lifts a little (on the corner, the corner does). */
	hover: (event: PointerEvent<HTMLElement>) => void;
	/** The mouse left it: the edge lies back down. */
	unhover: () => void;
};

/** A number custom property of the sticker (--peel, --rest, --hover, --d0, --gz in px), or `fallback`. */
function prop(el: Element, name: string, fallback: number): number {
	const value = Number.parseFloat(getComputedStyle(el).getPropertyValue(name));
	return Number.isFinite(value) ? value : fallback;
}

/** The --peel the sticker's own corner shows now (animations and transitions included). */
const shownPeel = (el: HTMLElement) => prop(el, '--peel', 0);

/** The sticker's tilt (its CSS rotate), in radians. */
function tiltOf(el: HTMLElement): number {
	const m = /^(-?[\d.]+)deg$/.exec(getComputedStyle(el).rotate.trim());
	return m ? (Number(m[1]) * Math.PI) / 180 : 0;
}

/** A move (dx, dy) on screen, in the sticker's own (tilted) frame. */
function local(dx: number, dy: number, tilt: number): Point {
	const cos = Math.cos(tilt);
	const sin = Math.sin(tilt);
	return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
}

/** A way in the sticker's frame, on screen. */
function onScreen(m: Point, tilt: number): Point {
	const cos = Math.cos(tilt);
	const sin = Math.sin(tilt);
	return { x: m.x * cos - m.y * sin, y: m.x * sin + m.y * cos };
}

/** True when a move (dx, dy) on screen leans at least START_LEAN off the vertical. */
const leans = (dx: number, dy: number) =>
	Math.abs(dx) >= Math.tan((START_LEAN * Math.PI) / 180) * Math.abs(dy);

/** True when a finger moving `dy` (down the screen when positive) would scroll the page: it is not at that end of it already. */
function canScroll(dy: number): boolean {
	const page = document.scrollingElement ?? document.documentElement;
	return dy > 0
		? window.scrollY > 0
		: window.scrollY < page.scrollHeight - window.innerHeight - 1;
}

/**
 * The rubber band: one to one up to PEEL_MAX past `base` (the lift the paper
 * had when it was taken), then less and less, but never nothing.
 */
function band(raw: number, base = 0): number {
	if (raw <= base + PEEL_MAX) return Math.max(0, raw);
	const x = raw - base - PEEL_MAX;
	return base + PEEL_MAX + (PEEL_BAND * x) / (PEEL_BAND + x);
}

/** The pull that the rubber band turns into `reach`. */
function unband(reach: number, base = 0): number {
	if (reach <= base + PEEL_MAX) return reach;
	const y = Math.min(reach - base - PEEL_MAX, PEEL_BAND * 0.999);
	return base + PEEL_MAX + (PEEL_BAND * y) / (PEEL_BAND - y);
}

/** How far (degrees) the fold turns for a pull `off` degrees from square, `most` the most it may (of `cap`): as far, up to the knee, then less and less. */
function swing(off: number, most: number, cap = FOLD_SWING): number {
	const a = Math.abs(off);
	const knee = cap > FOLD_SWING ? most * 0.9 : (most * FOLD_KNEE) / FOLD_SWING;
	if (a <= knee) return off;
	const room = most - knee;
	if (room <= 0) return Math.sign(off) * most;
	return Math.sign(off) * (knee + room * Math.tanh((a - knee) / room));
}

/** The way the paper faces out, `a` degrees turned from where it took hold. */
const facing = (g: Grab, a: number) => turn(g.n, a);

/** Where the point taken hold of is for a pose: mirrored across the fold, which lies peel · w / √2 in from it. */
function tipOf(g: Grab, peel: number, a: number): Point {
	const n = facing(g, a);
	const d = Math.SQRT2 * peel * g.w;
	return { x: g.at.x - d * n.x, y: g.at.y - d * n.y };
}

/** A pose to draw (components/fold.ts), in units of the width. */
function handOfPose(g: Grab, peel: number, a: number): Hand {
	const n = facing(g, a);
	return {
		a: Math.atan2(n.y, n.x),
		x: g.at.x / g.w,
		y: g.at.y / g.w,
		p: peel,
	};
}

type Pose = {
	peel: number;
	a: number;
	reach: number;
	raw: number;
	pull: number;
	/** where the paper is held: the grab, or the point slid along the outline to (`regrip`) */
	g: Grab;
};

/**
 * How a pull to `tip` from where `g` took hold folds the paper: the fold is
 * the line halfway between the two, square to the pull, turned (`off`
 * degrees from square) as far as the outline lets it (`kept`: a corner
 * freely, a side a little, swingRoom; FOLD_SWING at most). `len` is the part
 * of the pull the fold takes (all of it when it turns as far as the pull).
 */
function foldOf(g: Grab, tip: Point) {
	const v = { x: g.at.x - tip.x, y: g.at.y - tip.y };
	const length = Math.hypot(v.x, v.y);
	const off = length > 0 ? angleFrom(g.n, v) : 0;
	const depth = Math.max(0, length * Math.cos((off * Math.PI) / 180)) / 2;
	const most = swingRoom(
		g.hull,
		g.at,
		g.n,
		depth,
		FOLD_ROOM,
		g.cap,
		off >= 0 ? 1 : -1,
	);
	const kept = swing(off, most, g.cap);
	return {
		off,
		kept,
		len: length * Math.cos(((off - kept) * Math.PI) / 180),
		lateral: Math.abs(dot(v, { x: -g.n.y, y: g.n.x })),
	};
}

/** The grab slid `s` px along its side (`way` a unit along it). */
function slid(g: Grab, way: Point, s: number): Grab {
	return { ...g, at: { x: g.at.x + way.x * s, y: g.at.y + way.y * s } };
}

/**
 * Where a pull to `tip` holds the paper: where `g` took hold, unless the
 * pull leans further than the fold may turn there. Then the point held
 * slides along the side toward the way the pointer went, just as far as the
 * fold, turned as far as it may, is square to the pull: the paper stays under
 * the pointer (a fingertip dragged sideways slides along the edge), and the
 * fold stays close to square, where dropping the sideways part of the pull
 * would leave the paper behind. It slides no further than the side runs
 * straight. The stylesheet's own corner turns freely and never slides, nor
 * does a round sticker's fold (it turns as far as the pull instead).
 */
function regrip(g: Grab, tip: Point): Grab {
	if (g.corner || g.disc || g.cap > FOLD_SWING) return g;
	const first = foldOf(g, tip);
	if (Math.abs(first.off - first.kept) < 0.25) return g;
	// toward the side the pull leans to (t is n turned a right angle
	// clockwise; a pull leaning that way turns the fold anticlockwise, off < 0)
	const t = { x: -g.n.y, y: g.n.x };
	const sign = first.off < 0 ? 1 : -1;
	const way = { x: t.x * sign, y: t.y * sign };
	// how far the side runs on that way, straight, from where it took hold
	const side = sideOf(g.hull, g.n);
	const along = dot(t, g.at);
	const room = Math.max(0, sign > 0 ? side.hi - along : along - side.lo);
	const fits = (s: number) => {
		const f = foldOf(slid(g, way, s), tip);
		return Math.abs(f.off - f.kept) < 0.25;
	};
	let lo = 0;
	let hi = Math.min(first.lateral, room);
	if (hi <= 0) return g;
	if (!fits(hi)) return slid(g, way, hi);
	for (let i = 0; i < 14; i++) {
		const mid = (lo + hi) / 2;
		if (fits(mid)) hi = mid;
		else lo = mid;
	}
	return slid(g, way, hi);
}

/**
 * The pose that puts the paper held at `tip` (`regrip`: the point taken
 * hold of, or one slid along the outline from it): the fold is the line
 * halfway between it and where it lay, square to the way it was pulled, and
 * its travel, less `slack` (as a peel), takes the rubber band past PEEL_MAX
 * beyond `base` (the lift it had when it was taken). `pull` is the travel
 * before the slack is taken off.
 */
function poseOf(g0: Grab, tip: Point, slack = 0, base = 0): Pose {
	const g = regrip(g0, tip);
	const { kept, len } = foldOf(g, tip);
	const pull = Math.max(0, len / (Math.SQRT2 * g.w));
	const raw = Math.max(0, pull - slack);
	if (raw <= 0) return { peel: 0, a: 0, reach: 0, raw: 0, pull, g };
	const reach = band(raw, base);
	// barely lifted, the fold's angle means little: it eases to square rather than swing
	const shown = reach * Math.SQRT2 * g.w;
	return {
		peel: reach,
		a: kept * Math.min(1, shown / 12),
		reach,
		raw,
		pull,
		g,
	};
}

/** True when two grabs took hold of the same place (a press on a fold still springing back). */
function same(a: Grab, b: Grab): boolean {
	if (a.corner || b.corner) return a.corner === b.corner;
	return (
		Math.abs(angleFrom(a.n, b.n)) < 30 &&
		Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y) < 0.2 * a.w
	);
}

/** The sticker's size (px), its outline at that size, and the outline's corner rounding for a grip. */
function measure(el: HTMLElement) {
	const body = el.querySelector<HTMLElement>('.stk-body');
	const w = body?.offsetWidth || el.offsetWidth || 1;
	const h = body?.offsetHeight || el.offsetHeight || 1;
	const hull = hullOf(el).map((p) => ({ x: p.x * w, y: p.y * w }));
	const round = prop(body ?? el, '--gz', 0.17 * Math.min(w, h));
	const disc = prop(body ?? el, '--disc', 0) > 0;
	return { w, h, hull, round, disc };
}

/** The stylesheet's own corner, as a grab: where its die-cut meets the diagonal (--d0), square to it. */
function cornerGrab(el: HTMLElement): Grab {
	const { w, h, hull, disc } = measure(el);
	const d = (w * prop(el, '--d0', 0)) / 2;
	return {
		at: { x: w - d, y: h - d },
		n: CORNER,
		hull,
		w,
		corner: true,
		disc,
		cap: disc ? FOLD_SWING_DISC : FOLD_SWING_CORNER,
	};
}

/**
 * How far a grab's fold may turn: a disc's or a corner's more than a side's.
 * A corner is where no long straight run of the outline faces the way the
 * paper does (a rounded corner's, or a stamp's cut one, read off pixels, has
 * short ones: less than a sixth of the width).
 */
function capOf(hull: Point[], n: Point, disc: boolean, w: number): number {
	if (disc) return FOLD_SWING_DISC;
	const side = sideOf(hull, n);
	return side.hi - side.lo < w / 6 ? FOLD_SWING_CORNER : FOLD_SWING;
}

/** A press at (x, y) on screen: where it takes hold of the sticker. */
function grabAt(el: HTMLElement, x: number, y: number, tilt: number): Grab {
	const { w, h, hull, round, disc } = measure(el);
	const r = el.getBoundingClientRect();
	const m = local(x - (r.left + r.width / 2), y - (r.top + r.height / 2), tilt);
	const d = { x: w / 2 + m.x, y: h / 2 + m.y };
	const found = gripAt(hull, d, round);
	if (Math.abs(angleFrom(CORNER, found.n)) <= CORNER_TAKE) {
		return cornerGrab(el);
	}
	return {
		at: found.at,
		n: found.n,
		hull,
		w,
		corner: false,
		disc,
		cap: capOf(hull, found.n, disc, w),
	};
}

/**
 * How fast the samples moved over the last 100 ms (per second): their x, y,
 * peel and reach. Moves that came in the same frame count as a frame apart.
 */
function velocity(samples: Press['samples'], now: number) {
	const recent = samples.filter((s) => now - s.t <= 100);
	if (recent.length < 2) return { x: 0, y: 0, peel: 0, reach: 0 };
	const first = recent[0];
	const last = recent[recent.length - 1];
	const dt = Math.max((last.t - first.t) / 1000, 1 / 60);
	return {
		x: (last.x - first.x) / dt,
		y: (last.y - first.y) / dt,
		peel: (last.peel - first.peel) / dt,
		reach: (last.reach - first.reach) / dt,
	};
}

/** A light tick as the pull crosses the point where letting go opens the sticker, where the device has one. */
function tick() {
	const nav = navigator as Navigator & {
		userActivation?: { hasBeenActive: boolean };
	};
	// a call before the page has had a tap is blocked, with a warning
	if (typeof nav.vibrate === 'function' && nav.userActivation?.hasBeenActive) {
		nav.vibrate(10);
	}
}

/** True where the top and bottom grips let the browser scroll a finger one way (touch-action: pan-down / pan-up, styles/stickers.css). */
function nativePan(): boolean {
	return (
		typeof CSS !== 'undefined' &&
		CSS.supports('touch-action', 'pan-up pinch-zoom')
	);
}

/**
 * True when the browser scrolls a finger's move from this grip itself (its
 * touch-action): the sides let it scroll up and down (pan-y, a move more
 * along the screen's vertical than across it), the top grip a finger going up
 * (pan-down), the bottom one a finger going down (pan-up). The page sees no
 * more of such a touch.
 */
function scrollsItself(side: Side, dx: number, dy: number): boolean {
	if (side === 'left' || side === 'right') {
		return Math.abs(dy) >= Math.abs(dx);
	}
	if (!nativePan()) return false;
	return side === 'bottom' ? dy > 0 : dy < 0;
}

/** The page gliding on after a flick that scrolled it from a grip: 0 when it is not. */
let gliding = 0;
let stopGlide = () => {};

/** Lets the page glide on at `speed` px/s (down the page when positive), slowing down, as a flicked page does. */
function glide(speed: number) {
	stopGlide();
	// (with reduced motion too: a page flicked coasts on, as the browser's own
	// scrolling does there; it is the reader's own motion, not an effect)
	if (Math.abs(speed) < GLIDE_MIN * 4) return;
	let v = speed;
	let top = window.scrollY;
	let last = 0;
	const stop = () => {
		cancelAnimationFrame(gliding);
		gliding = 0;
		window.removeEventListener('pointerdown', stop, true);
		window.removeEventListener('wheel', stop, true);
		window.removeEventListener('keydown', stop, true);
		stopGlide = () => {};
	};
	/** Where the glide last put the page. */
	let put = window.scrollY;
	const step = (now: number) => {
		// scrolled by something else meanwhile (a script, a link, the find bar): that wins
		if (Math.abs(window.scrollY - put) > 2) {
			stop();
			return;
		}
		const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
		last = now;
		top += v * dt;
		v *= Math.exp(-dt / GLIDE_TAU);
		const before = window.scrollY;
		window.scrollTo({ top, behavior: 'instant' });
		put = window.scrollY;
		// at the end of the page, or slow enough: it has stopped
		if (Math.abs(v) < GLIDE_MIN || (window.scrollY === before && dt > 0)) {
			stop();
			return;
		}
		gliding = requestAnimationFrame(step);
	};
	window.addEventListener('pointerdown', stop, true);
	window.addEventListener('wheel', stop, true);
	window.addEventListener('keydown', stop, true);
	stopGlide = stop;
	gliding = requestAnimationFrame(step);
}

/**
 * Hands the sticker back to the stylesheet: no fold by hand, and its own
 * corner at rest, hover, focus or lift. Its corner taken over (data-took)
 * comes back as the hand left it, without a transition: data-took holds the
 * transition off for a frame.
 */
function settle(el: HTMLElement) {
	stopMotion(el);
	const took = 'took' in el.dataset;
	delete el.dataset.peel;
	delete el.dataset.ready;
	drawHand(el, null);
	el.style.removeProperty('--lift');
	if (took) {
		void getComputedStyle(el).getPropertyValue('--peel');
		requestAnimationFrame(() => {
			if (!el.dataset.peel) delete el.dataset.took;
		});
	}
}

/**
 * Lays a fold by hand back down, with a short spring, from `peel` (turned `a`
 * degrees), thrown at `v` (peel/s). A corner taken over goes back to where the
 * stylesheet puts it (the hover peel, under a mouse still on it, or rest),
 * square to the diagonal, and is handed back to it; any other fold lies flat,
 * square to where it took hold, while the stylesheet's corner comes back up.
 */
function springBack(
	el: HTMLElement,
	s: {
		g: Grab;
		took: boolean;
		peel: number;
		a: number;
		v: number;
		over: boolean;
	},
) {
	stopMotion(el);
	delete el.dataset.ready;
	const hovers =
		(s.over && matchMedia('(hover: hover) and (pointer: fine)').matches) ||
		el.matches(':focus-visible:not([data-quiet]), [data-keyed]:focus');
	const target = s.took ? prop(el, hovers ? '--hover' : '--rest', 0) : 0;
	if (prefersReducedMotion()) {
		settle(el);
		return;
	}
	if (s.took) el.dataset.took = '';
	else delete el.dataset.took;
	el.dataset.peel = 'spring';
	el.style.removeProperty('--lift');
	const damping = 2 * SPRING_ZETA * Math.sqrt(SPRING_K);
	let x = s.peel - target;
	let v = Math.max(-SPRING_V_MAX, Math.min(SPRING_V_MAX, s.v));
	let a = s.a;
	let va = 0;
	let last = 0;
	let frame = 0;
	const motion: Motion = {
		g: s.g,
		took: s.took,
		peel: s.peel,
		a: s.a,
		stop: () => cancelAnimationFrame(frame),
	};
	moving.set(el, motion);
	const draw = () => {
		motion.peel = Math.max(0, target + x);
		motion.a = a;
		drawHand(el, handOfPose(s.g, motion.peel, a));
	};
	// from where it is, this frame: nothing jumps as the spring takes over
	draw();
	const step = (now: number) => {
		// a frame's worth on the first frame; never more than three after a stall
		let dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 1 / 60;
		last = now;
		while (dt > 0) {
			const h = Math.min(dt, 1 / 240);
			v += (-SPRING_K * x - damping * v) * h;
			x += v * h;
			va += (-SPRING_K * a - damping * va) * h;
			a += va * h;
			dt -= h;
		}
		if (
			Math.abs(x) < 0.001 &&
			Math.abs(v) < 0.02 &&
			Math.abs(a) < 0.5 &&
			Math.abs(va) < 5
		) {
			settle(el);
			return;
		}
		draw();
		frame = requestAnimationFrame(step);
	};
	frame = requestAnimationFrame(step);
}

/**
 * A mouse over an edge (not the corner, which lifts by itself) lifts that
 * edge a little, by hand, where the pointer is: any side can be taken. It
 * follows the pointer along the edge, and lies back down (`to` 0) when the
 * pointer leaves the edge. A short spring, as the fold's own; at once with
 * reduced motion.
 */
function hoverEdge(el: HTMLElement, g: Grab | null, to: number) {
	const now = moving.get(el);
	if (now?.hover) {
		now.hover.aim(g ?? now.g, to);
		return;
	}
	if (!g || !(to > 0)) return;
	let grab = g;
	let target = to;
	let x = 0;
	let v = 0;
	let last = 0;
	let frame = 0;
	const draw = () => {
		motion.peel = Math.max(0, x);
		drawHand(el, handOfPose(grab, motion.peel, 0));
	};
	const damping = 2 * SPRING_ZETA * Math.sqrt(SPRING_K);
	const step = (time: number) => {
		let dt = last ? Math.min(0.05, Math.max(0, (time - last) / 1000)) : 1 / 60;
		last = time;
		while (dt > 0) {
			const h = Math.min(dt, 1 / 240);
			v += (-SPRING_K * (x - target) - damping * v) * h;
			x += v * h;
			dt -= h;
		}
		if (Math.abs(x - target) < 0.001 && Math.abs(v) < 0.02) {
			x = target;
			frame = 0;
			if (target <= 0) {
				settle(el);
				return;
			}
			draw();
			return;
		}
		draw();
		frame = requestAnimationFrame(step);
	};
	const aim = (next: Grab, value: number) => {
		grab = next;
		motion.g = next;
		target = value;
		// lifting, its corner stays at rest; going down, the corner may lift again
		el.dataset.peel = value > 0 ? 'hover' : 'spring';
		if (prefersReducedMotion()) {
			x = value;
			v = 0;
			if (value <= 0) settle(el);
			else draw();
			return;
		}
		if (!frame) {
			last = 0;
			frame = requestAnimationFrame(step);
		}
	};
	const motion: Motion = {
		g,
		took: false,
		peel: 0,
		a: 0,
		hover: { aim },
		stop: () => {
			cancelAnimationFrame(frame);
			frame = 0;
		},
	};
	moving.set(el, motion);
	delete el.dataset.took;
	aim(g, to);
}

/**
 * The drag that peels a sticker from any side. `onOff` is called when the
 * sticker is let go to come off; it returns false when it cannot open now
 * (another is on its way), and it goes back down.
 */
export function usePeel(
	ref: RefObject<HTMLElement | null>,
	onOff: () => boolean,
): Peel {
	const press = useRef<Press | null>(null);
	const clickUntil = useRef(0);
	/** The fold let go to open: where it lies, should the open not go. */
	const held = useRef<{
		g: Grab;
		took: boolean;
		peel: number;
		a: number;
	} | null>(null);
	const off = useRef(onOff);
	useEffect(() => {
		off.current = onOff;
	});
	/** Ends the press in progress (removes its listeners); set while one is. */
	const endPress = useRef<(() => void) | null>(null);

	// the outline is read off the backing once it has loaded (components/fold.ts)
	useEffect(() => {
		const img = ref.current?.querySelector<HTMLImageElement>('img.stk-flap');
		if (!img) return;
		const read = () => learnHull(img);
		if (img.complete) read();
		else img.addEventListener('load', read, { once: true });
		return () => img.removeEventListener('load', read);
	}, [ref]);

	const onPointerDown = useCallback(
		(event: PointerEvent<HTMLElement>) => {
			const el = ref.current;
			if (!el || press.current) return false;
			// one pointer at a time, the main button, and no modifier (a new tab)
			if (
				!event.isPrimary ||
				event.button !== 0 ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				event.altKey
			) {
				return false;
			}
			// a new press: the click an earlier drag made has come by now, if it was to
			clickUntil.current = 0;
			const target = event.target;
			const grip =
				target instanceof Element
					? target.closest<HTMLElement>('.stk-grip')
					: null;
			if (!grip) return false;
			// a sticker already lifting or flying is not in hand
			if (el.classList.contains('is-lifting') || el.dataset.peel === 'off') {
				return false;
			}
			if ('vt' in document.documentElement.dataset) return false;
			const tilt = tiltOf(el);
			const g = grabAt(el, event.clientX, event.clientY, tilt);
			// where it was pressed, in the sticker's own frame (from its middle)
			const size = measure(el);
			const box = el.getBoundingClientRect();
			const pressed = local(
				event.clientX - (box.left + box.width / 2),
				event.clientY - (box.top + box.height / 2),
				tilt,
			);
			const p: Press = {
				id: event.pointerId,
				type: event.pointerType,
				x: event.clientX,
				y: event.clientY,
				t: event.timeStamp,
				tilt,
				side: (grip.dataset.side as Side | undefined) ?? 'bottom',
				g,
				shown: g,
				base: 0,
				lead: 0,
				lift: 0,
				caught: 0,
				now: g.at,
				held: false,
				inward: onScreen({ x: -g.n.x, y: -g.n.y }, tilt),
				tip: g.at,
				mode: 'press',
				peel: 0,
				a: 0,
				reach: 0,
				raw: 0,
				pull: 0,
				slack: 0,
				ready: false,
				ticked: false,
				trail: [],
				far: 0,
				samples: [],
				scroll0: 0,
				y0: 0,
				owed: 0,
				lastY: 0,
				over: true,
			};
			press.current = p;

			/** Shows the pose (components/fold.ts writes --drag, --fold, --tip-x and --tip-y with it). */
			const show = () => drawHand(el, handOfPose(p.shown, p.peel, p.a));
			/** Takes `pose` as the press's own. */
			const take = (pose: Pose) => {
				p.peel = pose.peel;
				p.a = pose.a;
				p.reach = pose.reach;
				p.raw = pose.raw;
				p.pull = pose.pull;
				p.shown = pose.g;
			};

			const begin = () => {
				// from wherever it is now: at rest, hovered, mid-hint or mid-spring
				const sprung = moving.get(el);
				stopMotion(el);
				p.mode = 'peel';
				/** Caught springing back (or mid-hint): the paper goes on from where it is. */
				const caught = !!sprung && same(sprung.g, p.g) && !sprung.hover;
				if (sprung && same(sprung.g, p.g)) {
					p.g = sprung.g;
					p.tip = tipOf(p.g, sprung.peel, sprung.a);
					// an edge lifted by the mouse over it: that lift is not the pull's
					if (sprung.hover) p.base = sprung.peel;
				} else if (p.g.corner) {
					// The stylesheet's own corner, taken over as it shows now. Its
					// lift (at rest, or hovered) counts for nothing: it opens after
					// as long a pull as any other side does.
					p.base = shownPeel(el);
					p.tip = tipOf(p.g, p.base, 0);
				} else {
					p.tip = p.g.at;
				}
				// The pointer is seldom on the paper's tip as it takes hold. A lift
				// taken over (the corner's, an edge's under the mouse) lies ahead
				// of it, into the sticker, when it presses the spot the paper left
				// (or the grip's band outside the outline); a press inside the
				// outline (a finger's grip reaches 28px in) has the tip behind it,
				// at the edge. Either way the tip eases over to the pointer as it
				// pulls (see Press, `lead`), so after a short pull the paper is
				// under the pointer, and stays so, rather than keeping that gap
				// the whole way. Pressed on the curl itself, the curl moves with
				// it from the start.
				if (!caught) {
					const n = facing(p.g, 0);
					const pointer = {
						x: size.w / 2 + pressed.x,
						y: size.h / 2 + pressed.y,
					};
					const fold = dot(n, p.g.at) - (p.base * p.g.w) / Math.SQRT2;
					// the paper under the pointer, laid flat again: on the flap, it is on the lifted part
					const flat = {
						x: pointer.x - 2 * (dot(n, pointer) - fold) * n.x,
						y: pointer.y - 2 * (dot(n, pointer) - fold) * n.y,
					};
					const onFlap =
						p.base > 0 &&
						dot(n, pointer) < fold &&
						dot(n, flat) > fold &&
						inside(p.g.hull, flat);
					// how far in (px) the tip is, and the pointer, from where the edge lies flat
					const tipIn = Math.SQRT2 * p.base * p.g.w;
					const pointerIn = dot(n, p.g.at) - dot(n, pointer);
					const lead = tipIn - pointerIn;
					if (!onFlap && Math.abs(lead) > 2) {
						p.lead = lead;
						p.lift = p.base;
					}
				}
				const start = poseOf(p.g, p.tip, 0, p.base);
				// paper caught past the band (springing back from there) stays where it is
				p.slack =
					start.pull > p.base + PEEL_MAX
						? start.pull - unband(start.pull, p.base)
						: 0;
				take(poseOf(p.g, p.tip, p.slack, p.base));
				// from the press: a flick can be over in a frame or two
				p.samples.push({ t: p.t, x: 0, y: 0, peel: p.peel, reach: p.reach });
				if (p.g.corner) el.dataset.took = '';
				else delete el.dataset.took;
				show();
				el.dataset.peel = 'drag';
				markHinted(); // it has been found: no need to show it
				try {
					el.setPointerCapture(p.id);
				} catch {}
			};

			/**
			 * Not a peel: the finger scrolls the page, from here on. As a browser
			 * does, it scrolls by what the finger moved past the slop (all of it,
			 * when the moves came in one frame). The page makes that up over the
			 * next moves rather than at once (a peel handed back may have gone a
			 * way): it goes half again as fast as the finger until it has
			 * (CATCH_UP), and glides what is left when the finger lifts.
			 */
			const scrollByHand = (e: globalThis.PointerEvent) => {
				p.mode = 'scroll';
				p.scroll0 = window.scrollY;
				const slop = (SLOP[p.type] ?? 4) / Math.max(p.far, 1);
				p.y0 = e.clientY;
				p.owed = p.y + (e.clientY - p.y) * Math.min(1, slop) - e.clientY;
				p.lastY = e.clientY;
				p.samples = [{ t: e.timeStamp, x: 0, y: e.clientY, peel: 0, reach: 0 }];
				stopGlide();
			};

			/**
			 * A finger's peel from the top or the bottom: true when the way it
			 * went last (its last TURN_SPAN px, or all of it, if shorter) goes
			 * along the screen's vertical without leaning, the way the page
			 * scrolls (up from the bottom, down from the top), and the page can
			 * scroll that way: as a thumb scrolling the page does.
			 */
			const turnsAway = (dx: number, dy: number) => {
				p.trail.push({ x: dx, y: dy });
				if (p.trail.length > TRAIL) p.trail.shift();
				// held, it went straight from the start: it is not a thumb's arc
				if (p.held) return false;
				if (p.side === 'left' || p.side === 'right') return false;
				// from the press, unless it has gone further than the trail recalls
				let from: Point | null = p.trail.length < TRAIL ? { x: 0, y: 0 } : null;
				for (let i = p.trail.length - 2; i >= 0; i--) {
					const q = p.trail[i];
					if (Math.hypot(dx - q.x, dy - q.y) >= TURN_SPAN) {
						from = q;
						break;
					}
				}
				if (!from) return false;
				const tx = dx - from.x;
				const ty = dy - from.y;
				if (Math.hypot(tx, ty) < 1 || leans(tx, ty)) return false;
				if (p.side === 'bottom' ? ty >= 0 : ty <= 0) return false;
				return canScroll(ty);
			};

			/** A held finger's peel: true when it now goes as fast as a swipe does (HELD_SWIPE). */
			const swipes = (e: globalThis.PointerEvent) => {
				if (!p.held) return false;
				const v = velocity(
					[
						...p.samples,
						{
							t: e.timeStamp,
							...local(e.clientX - p.x, e.clientY - p.y, p.tilt),
							peel: 0,
							reach: 0,
						},
					],
					e.timeStamp,
				);
				return Math.hypot(v.x, v.y) > HELD_SWIPE;
			};

			const move = (e: globalThis.PointerEvent) => {
				if (e.pointerId !== p.id) return;
				// A mouse moving with no button held let go without a pointerup the
				// page heard (one lost to another window, say): it is let go now,
				// and opens nothing. (Any button still held keeps the paper in hand,
				// the main one let go with another down.)
				if (p.type === 'mouse' && e.buttons === 0) {
					release(false, e.timeStamp);
					return;
				}
				const dx = e.clientX - p.x;
				const dy = e.clientY - p.y;
				p.far = Math.max(p.far, Math.hypot(dx, dy));
				if (p.mode === 'native') return;
				const m = local(dx, dy, p.tilt);
				if (p.mode === 'press') {
					if (p.far < (SLOP[p.type] ?? 4)) return;
					// A finger decides here: into the sticker it peels, if it leans
					// off the screen's vertical too (a tilted sticker's way in may be
					// nearly upright), or if it held still a moment before it moved
					// (it took hold of the edge: a thumb scrolling the page moves at
					// once); any other way it scrolls, by the browser where the grip
					// lets it. At the page's end too: a quick straight flick there
					// asks for more page, and must not open a project. A mouse has
					// nothing to scroll: it always takes hold.
					const itself = scrollsItself(p.side, dx, dy);
					const into =
						Math.abs(angleFrom(p.inward, { x: dx, y: dy })) <= START_CONE;
					const leaning = leans(dx, dy);
					const still = e.timeStamp - p.t >= HOLD_MS;
					if (p.type === 'mouse' || (!itself && into && (leaning || still))) {
						p.held = p.type !== 'mouse' && !leaning;
						begin();
					} else if (itself || p.side === 'left' || p.side === 'right') {
						// the browser scrolls it (or, across a side, nothing does)
						p.mode = 'native';
						return;
					} else {
						scrollByHand(e);
					}
				} else if (
					p.mode === 'peel' &&
					p.type !== 'mouse' &&
					!p.ready &&
					(turnsAway(dx, dy) || swipes(e))
				) {
					// It leaned at first but turned along the screen before it was far
					// enough to come off, or it was held but set off as fast as a
					// swipe: it was scrolling after all. It goes back down and the
					// page scrolls.
					springBack(el, {
						g: p.shown,
						took: p.g.corner,
						peel: p.peel,
						a: p.a,
						v: 0,
						over: false,
					});
					scrollByHand(e);
				}
				if (p.mode === 'scroll') {
					const gain =
						Math.sign(p.owed) *
						Math.min(
							Math.abs(p.owed),
							CATCH_UP * Math.abs(e.clientY - p.lastY),
						);
					p.y0 += gain;
					p.owed -= gain;
					p.lastY = e.clientY;
					window.scrollTo({
						top: p.scroll0 + p.y0 - e.clientY,
						behavior: 'instant',
					});
					p.samples.push({
						t: e.timeStamp,
						x: 0,
						y: e.clientY,
						peel: 0,
						reach: 0,
					});
					if (p.samples.length > 12) p.samples.shift();
					return;
				}
				// a lead (see Press) eases away as the pointer pulls: the tip keeps
				// its place, then gains on the pointer until it is under it
				let tip = { x: p.tip.x + m.x, y: p.tip.y + m.y };
				if (p.lead !== 0) {
					const span = 2 * Math.abs(p.lead);
					const k = Math.max(0, 1 - Math.hypot(m.x, m.y) / span);
					const caught = p.lead * (1 - k * k);
					if (Math.abs(caught) > Math.abs(p.caught)) p.caught = caught;
					const n = facing(p.g, 0);
					tip = { x: tip.x + n.x * p.caught, y: tip.y + n.y * p.caught };
					// What it caught up counts for nothing toward opening, as the
					// lift did not; nor what it gained: every side opens after the
					// same pull of the pointer.
					p.base = p.lift - p.caught / (Math.SQRT2 * p.g.w);
				}
				p.now = tip;
				let pose = poseOf(p.g, tip, p.slack, p.base);
				if (pose.pull < p.pull && p.raw > p.base + PEEL_MAX) {
					// Pushed back from past the band: the paper comes back as far as
					// the pointer does, at once. What the band kept back is let go of.
					const back = Math.max(0, p.reach - (p.raw - pose.raw));
					p.slack = pose.pull - unband(back, p.base);
				} else if (p.slack > 0 && pose.pull < p.pull) {
					// pushed back further: the slack shrinks with the pull, so the
					// paper lies flat just as the pointer gets back to where it does
					p.slack *= pose.pull / p.pull;
				} else if (p.slack > 0 && pose.pull > p.pull) {
					// pulled in again: the paper gains on the pointer, until it is under it
					p.slack = Math.max(0, p.slack - CATCH_UP * (pose.pull - p.pull));
				}
				// pushed down flat (or past): pulled out again, it lifts at once
				p.slack = Math.min(p.slack, pose.pull);
				pose = poseOf(p.g, tip, p.slack, p.base);
				take(pose);
				p.samples.push({
					t: e.timeStamp,
					x: m.x,
					y: m.y,
					peel: p.peel,
					reach: p.reach,
				});
				if (p.samples.length > 12) p.samples.shift();
				show();
				// (the lift it had when taken, the corner's own, is not the pull's)
				const ready =
					p.reach - p.base >= PEEL_OPEN - (p.ready ? READY_GIVE : 0);
				if (ready !== p.ready) {
					p.ready = ready;
					if (ready) {
						el.dataset.ready = '';
						// felt once a press, however often the line is crossed
						if (p.type === 'touch' && !p.ticked) {
							p.ticked = true;
							tick();
						}
					} else {
						delete el.dataset.ready;
					}
				}
			};

			const finish = () => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('pointerup', up);
				window.removeEventListener('pointercancel', cancel);
				window.removeEventListener('pointerdown', other, true);
				window.removeEventListener('contextmenu', menu, true);
				el.removeEventListener('lostpointercapture', lost);
				endPress.current = null;
				press.current = null;
				try {
					if (el.hasPointerCapture(p.id)) el.releasePointerCapture(p.id);
				} catch {}
			};

			/** Lets go: open (`commit` and far or fast enough), glide on (a scroll) or lay it back down. */
			const release = (commit: boolean, at: number) => {
				finish();
				if (p.mode === 'press' || p.mode === 'native') return; // a tap: the click opens it
				// A press that hardly moved is a tap all the same (a finger rolls a
				// little as it taps): the browser's click opens the sticker. Any
				// more, and the click a drag makes is dropped.
				if (p.far >= (TAP_SLOP[p.type] ?? 8)) {
					clickUntil.current = performance.now() + CLICK_AFTER_DRAG_MS;
				}
				const speed = velocity(p.samples, at);
				if (p.mode === 'scroll') {
					// a glide goes about its speed times GLIDE_TAU: what is owed rides on it
					if (commit) glide(-speed.y + p.owed / GLIDE_TAU);
					return;
				}
				// The flick: fast the way the pointer has pulled the paper, far
				// enough that way, not off to one side of it, and into the sticker
				// (within START_CONE of straight in from where it took hold). The
				// way the pointer pulled it, not the fold's: a pull that leans
				// slides the point held along a straight side (regrip), its fold
				// staying close to square, while the paper under the pointer goes
				// the pointer's way; a finger's flick from a top or a bottom edge
				// must lean to peel at all (START_LEAN), and so opens as one
				// straight in from a side does.
				const inward = { x: -p.g.n.x, y: -p.g.n.y };
				const last = {
					x: p.samples.at(-1)?.x ?? 0,
					y: p.samples.at(-1)?.y ?? 0,
				};
				const travelled = Math.hypot(last.x, last.y);
				const way =
					travelled > 1
						? { x: last.x / travelled, y: last.y / travelled }
						: inward;
				const flick = { x: speed.x, y: speed.y };
				// (a held finger's straight pull opens only by being pulled far enough:
				// flicked, it is too like a thumb asking for more page)
				const flung =
					!p.held &&
					Math.abs(angleFrom(inward, way)) <= START_CONE &&
					dot(flick, way) >= FLING_SPEED &&
					Math.abs(angleFrom(way, flick)) <= FLING_CONE &&
					travelled >= FLING_PULL;
				// Pushed back as it was let go: read from the pointer, which the
				// paper (held back by the band past PEEL_MAX) may hardly show.
				// Its speed the way it was pulled, out from where it lay flat.
				const out = {
					x: p.now.x - p.g.at.x,
					y: p.now.y - p.g.at.y,
				};
				const len = Math.hypot(out.x, out.y);
				const outwards = len > 1 ? dot(flick, out) / len : -dot(flick, inward);
				const pushedBack = outwards <= -PUSH_BACK;
				// far enough as the cue last said (data-ready), or flicked
				const opens = commit && ((p.ready && !pushedBack) || flung);
				if (opens) {
					// It stays as peeled as it was let go (and as lifted, if it was
					// far enough to say so) while it comes off and flies: the flight
					// starts from here, at once (DeskProvider's open). Its own
					// corner stays down (--lift).
					show();
					el.style.setProperty('--lift', '0');
					el.dataset.peel = 'off';
					held.current = {
						g: p.shown,
						took: p.g.corner,
						peel: p.peel,
						a: p.a,
					};
					if (off.current()) return;
				}
				springBack(el, {
					g: p.shown,
					took: p.g.corner,
					peel: p.peel,
					a: p.a,
					v: opens ? 0 : speed.peel,
					over: commit && p.over,
				});
			};

			const up = (e: globalThis.PointerEvent) => {
				if (e.pointerId !== p.id) return;
				const under = document.elementFromPoint(e.clientX, e.clientY);
				p.over = under !== null && el.contains(under);
				release(true, e.timeStamp);
			};
			const cancel = (e: globalThis.PointerEvent) => {
				if (e.pointerId === p.id) release(false, e.timeStamp);
			};
			const lost = (e: globalThis.PointerEvent) => {
				// capture taken away without an up or a cancel (the window lost focus);
				// not the grip's own, which the sticker takes over as the drag begins
				if (e.target === el && e.pointerId === p.id && press.current === p) {
					release(false, e.timeStamp);
				}
			};
			// a second finger (a pinch): this is not a peel
			const other = (e: globalThis.PointerEvent) => {
				if (e.pointerId === p.id) return;
				if (p.mode === 'peel') {
					release(false, e.timeStamp);
				} else {
					finish();
				}
				clickUntil.current = performance.now() + CLICK_AFTER_DRAG_MS;
			};
			// a long press on an edge is the start of a peel, not the link's menu
			const menu = (e: Event) => {
				if (p.type !== 'mouse') e.preventDefault();
			};

			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', up);
			window.addEventListener('pointercancel', cancel);
			window.addEventListener('pointerdown', other, true);
			window.addEventListener('contextmenu', menu, true);
			el.addEventListener('lostpointercapture', lost);
			// (the sticker is going: nothing is laid back down, nothing glides)
			endPress.current = finish;
			return true;
		},
		[ref],
	);

	// Unmounting mid-drag or mid-spring (the page changed under it): drop the
	// listeners and stop what moves. The element is the one the effect saw: by
	// the time this cleanup runs, React has let go of the ref.
	useEffect(() => {
		const el = ref.current;
		return () => {
			endPress.current?.();
			if (el) stopMotion(el);
		};
	}, [ref]);

	const onDragStart = useCallback((event: DragEvent<HTMLElement>) => {
		if (press.current) event.preventDefault();
	}, []);

	const dragged = useCallback((event: MouseEvent<HTMLElement>) => {
		// a click from the keyboard (Enter) has no pointer behind it: never dropped
		if (event.detail === 0) return false;
		// A click while the paper is still in hand (a peel, or a scroll by hand):
		// the main button let go while another is held (chorded buttons) clicks
		// before any pointerup. The pull has not been let go: it opens nothing.
		const p = press.current;
		if (p && (p.mode === 'peel' || p.mode === 'scroll')) return true;
		if (performance.now() > clickUntil.current) return false;
		clickUntil.current = 0;
		return true;
	}, []);

	const tapping = useCallback(() => {
		const p = press.current;
		if (!p) return false;
		// a press that hardly moved is a tap even once it peeled (release)
		return (
			p.mode === 'press' ||
			(p.mode === 'peel' && p.far < (TAP_SLOP[p.type] ?? 8))
		);
	}, []);

	const stop = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const mode = el.dataset.peel;
		const now = moving.get(el);
		if (mode === 'hover' && now && now.peel > 0) {
			// a click on a lifted edge: it flies from that pose, as a peel does
			// (and is laid back down if it does not go: drop)
			stopMotion(el);
			el.dataset.peel = 'off';
			held.current = { g: now.g, took: false, peel: now.peel, a: 0 };
			return;
		}
		if (mode === 'hint' || mode === 'spring' || mode === 'hover') settle(el);
	}, [ref]);

	const calm = useCallback(() => {
		const el = ref.current;
		if (el?.dataset.peel !== 'hint') return;
		// the hint's edge, by hand, goes down; its corner, the stylesheet's, is taken over
		const beat = moving.get(el);
		if (beat) {
			springBack(el, {
				g: beat.g,
				took: false,
				peel: beat.peel,
				a: beat.a,
				v: 0,
				over: true,
			});
		} else {
			springBack(el, {
				g: cornerGrab(el),
				took: true,
				peel: shownPeel(el),
				a: 0,
				v: 0,
				over: true,
			});
		}
	}, [ref]);

	const drop = useCallback(() => {
		const el = ref.current;
		if (el?.dataset.peel !== 'off') return;
		if (held.current) {
			springBack(el, { ...held.current, v: 0, over: false });
		} else {
			settle(el);
		}
	}, [ref]);

	const hover = useCallback(
		(event: PointerEvent<HTMLElement>) => {
			const el = ref.current;
			if (!el || event.pointerType !== 'mouse' || press.current) return;
			// held, springing, lifting, flying or hinting: not now
			if (
				(el.dataset.peel && !moving.get(el)?.hover) ||
				el.classList.contains('is-lifting') ||
				'vt' in document.documentElement.dataset ||
				!matchMedia('(hover: hover) and (pointer: fine)').matches
			) {
				return;
			}
			const grip =
				event.target instanceof Element
					? event.target.closest('.stk-grip')
					: null;
			const g = grip
				? grabAt(el, event.clientX, event.clientY, tiltOf(el))
				: null;
			// over the middle, or over the corner that lifts by itself: the edge lies down
			if (!g || g.corner) hoverEdge(el, null, 0);
			else hoverEdge(el, g, HOVER_PEEL);
		},
		[ref],
	);

	const unhover = useCallback(() => {
		const el = ref.current;
		if (el && moving.get(el)?.hover) hoverEdge(el, null, 0);
	}, [ref]);

	return useMemo(
		() => ({
			onPointerDown,
			tapping,
			onDragStart,
			dragged,
			stop,
			calm,
			drop,
			hover,
			unhover,
		}),
		[
			onPointerDown,
			tapping,
			onDragStart,
			dragged,
			stop,
			calm,
			drop,
			hover,
			unhover,
		],
	);
}

/* ── the hint: once a visit, one sticker's corner lifts and settles back,
   then an edge of it does, so it is seen that any side lifts ── */

const HINT_KEY = 'vh19:peel-hint';
/** How long a sticker is in full view before its corner lifts (ms). */
const HINT_DELAY = 450;
/** The corner's part's length in styles/stickers.css, plus a margin, in case its end is never heard. */
const HINT_MS = 1600;
/** The edge's part: how long it takes (ms), and how far it lifts (as a peel). */
const EDGE_MS = 900;
const EDGE_PEEL = 0.18;

/** Set once the hint has played, or the reader has peeled a sticker, on this page load. */
let hinted = false;

function hintDone(): boolean {
	if (hinted) return true;
	try {
		return window.sessionStorage.getItem(HINT_KEY) !== null;
	} catch {
		return false;
	}
}

function markHinted() {
	hinted = true;
	try {
		window.sessionStorage.setItem(HINT_KEY, '1');
	} catch {}
}

/** The stickers in full view, as their observers last saw them. */
const inView = new Set<HTMLElement>();
let hintTimer = 0;

/** (Re)starts the wait before the hint: a sticker has come into full view, or gone. */
function scheduleHint() {
	window.clearTimeout(hintTimer);
	if (inView.size > 0 && !hintDone()) {
		hintTimer = window.setTimeout(playHint, HINT_DELAY);
	}
}

/** How the hint's edge lifts over its time (0 to 1): up as if a nail caught it, a breath, then down. */
function edgeLift(t: number): number {
	if (t < 0.35) return 1 - (1 - t / 0.35) ** 3;
	if (t < 0.5) return 1 - 0.08 * ((t - 0.35) / 0.15);
	const u = (t - 0.5) / 0.5;
	return 0.92 * (1 - u * u * (3 - 2 * u));
}

/**
 * The hint's second part: the sticker's left edge lifts (as far as the corner
 * did, so it reads as a side coming up, not a sliver) and lies
 * back down, by hand (it is the hand's fold that can lift any side). A press
 * or a pointer arriving meanwhile takes it from where it is.
 */
function liftEdge(el: HTMLElement, done: () => void) {
	const { w, h, hull, disc } = measure(el);
	const n = { x: -1, y: 0 };
	const g: Grab = {
		at: outermost(hull, n, { x: 0, y: h / 2 }),
		n,
		hull,
		w,
		corner: false,
		disc,
		cap: capOf(hull, n, disc, w),
	};
	let frame = 0;
	let start = 0;
	const motion: Motion = {
		g,
		took: false,
		peel: 0,
		a: 0,
		stop: () => cancelAnimationFrame(frame),
	};
	moving.set(el, motion);
	const step = (now: number) => {
		if (!start) start = now;
		const t = (now - start) / EDGE_MS;
		if (t >= 1) {
			moving.delete(el);
			drawHand(el, null);
			done();
			return;
		}
		motion.peel = EDGE_PEEL * edgeLift(t);
		drawHand(el, handOfPose(g, motion.peel, 0));
		frame = requestAnimationFrame(step);
	};
	frame = requestAnimationFrame(step);
}

/**
 * Lifts the corner of the first sticker in full view (in reading order),
 * then its left edge, once. A pointer or the focus arriving on it while it
 * plays ends it (StickerLink calls `calm`), so the hover peel takes over from
 * where the hint was.
 */
function playHint() {
	if (hintDone()) return;
	const [el] = [...inView].sort((a, b) =>
		a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
	);
	if (!el) return;
	// not while a page turns or a sticker lifts, nor on one in hand, hovered or focused
	if (
		'vt' in document.documentElement.dataset ||
		document.querySelector('.stk.is-lifting') ||
		el.dataset.peel ||
		el.matches(':hover, :focus-visible:not([data-quiet]), [data-keyed]:focus')
	) {
		hintTimer = window.setTimeout(playHint, HINT_DELAY);
		return;
	}
	markHinted();
	el.dataset.peel = 'hint';
	let timeout = 0;
	const finish = () => {
		window.clearTimeout(timeout);
		if (el.dataset.peel === 'hint') delete el.dataset.peel;
	};
	const end = (event?: AnimationEvent) => {
		if (event && event.animationName !== 'stk-hint') return;
		window.clearTimeout(timeout);
		el.removeEventListener('animationend', end);
		// taken over meanwhile (a press, a pointer): nothing more to show
		if (el.dataset.peel !== 'hint' || moving.has(el)) return;
		liftEdge(el, finish);
		// in case its frames never come (a hidden tab): put it away all the same
		timeout = window.setTimeout(() => {
			if (el.dataset.peel !== 'hint') return;
			stopMotion(el);
			drawHand(el, null);
			finish();
		}, EDGE_MS + 400);
	};
	el.addEventListener('animationend', end);
	timeout = window.setTimeout(end, HINT_MS);
}

/**
 * Teaches the peel once a visit: when the stickers first come into full view,
 * the first of them lifts its corner and lays it back down, then its edge. Not
 * with reduced motion, and not once the reader has peeled one.
 */
export function usePeelHint(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const el = ref.current;
		if (
			!el ||
			hintDone() ||
			prefersReducedMotion() ||
			typeof IntersectionObserver === 'undefined'
		) {
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting && entry.intersectionRatio >= 0.9) {
					inView.add(el);
				} else {
					inView.delete(el);
				}
				scheduleHint();
			},
			{ threshold: [0, 0.9] },
		);
		observer.observe(el);
		return () => {
			observer.disconnect();
			inView.delete(el);
			scheduleHint();
			if (el.dataset.peel === 'hint') {
				stopMotion(el);
				drawHand(el, null);
				delete el.dataset.peel;
			}
		};
	}, [ref]);
}
