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

/*
 * Peeling a sticker by hand. The sticker's bottom-right corner (its grip,
 * .stk-grip) can be taken with a mouse, a pen or a finger and pulled: the
 * corner's tip follows the pointer, folding along the line halfway between
 * where the tip lies flat and where it is now (--peel and --fold in
 * styles/stickers.css). Let go far enough in, or flick it, and the sticker
 * comes off: `onOff` opens the project, from the peeled pose. Let go before
 * that and the corner springs back down.
 *
 * Pulled past PEEL_MAX the corner gives less and less, as a rubber band
 * does, but never stops; pushed back, it comes back with the pointer at once,
 * and works its way back under the pointer from there. Let go while pushing
 * it back down and it stays, however far it was.
 *
 * A finger (or a pen) on the grip may also just be scrolling the page: the
 * first few pixels it moves decide. Up the diagonal, into the sticker, and
 * leaning off the screen's vertical, it peels; any other way it scrolls the
 * page, by hand here (the grip holds the touch), with the glide a flick
 * gives. A peel that turns up the screen before it is far enough to come off
 * (a thumb's arc) was a scroll after all, and is handed back.
 *
 * The drag writes --drag and --fold on the sticker, and the sticker's
 * data-peel says who drives --peel: "drag" (the pointer), "spring" (the spring
 * laying it down), "off" (let go to open: it stays peeled while it lifts and
 * flies) and "hint" (the once-a-visit hint, a CSS animation).
 */

/** Let go with the corner pulled this far (its tip's travel, as a peel: a fraction of the width) and the sticker comes off. */
const PEEL_OPEN = 0.34;
/**
 * Once far enough to come off, it stays so until pushed back this much under
 * PEEL_OPEN (about 6px): a finger resting on the line, with its tremor, does
 * not flicker the cue, and letting go does what the cue last said.
 */
const READY_GIVE = 0.02;
/** How far the corner follows the pointer one to one; past it, it gives less and less. */
const PEEL_MAX = 0.46;
/**
 * The rubber band past PEEL_MAX: the corner gives half of this to the first
 * PEEL_BAND of extra pull, and keeps on giving a little to any more (it never
 * gets all of it). Pushed back, it comes back with the pointer at once.
 */
const PEEL_BAND = 0.15;
/** How far (px) a press on the corner moves before it is a drag rather than a tap; a finger's or a pen's way is read there. */
const SLOP: Record<string, number> = { mouse: 3, pen: 8, touch: 10 };
/** A press that wandered less than this (px) and did not come off is still a tap: the browser's click opens the sticker. */
const TAP_SLOP: Record<string, number> = { mouse: 6, pen: 12, touch: 15 };
/** A finger starts a peel only within this many degrees of the diagonal (into the sticker); any other way, it scrolls. */
const START_CONE = 25;
/**
 * ... and only leaning at least this many degrees off the screen's vertical,
 * whatever the sticker's tilt: a thumb scrolling the page goes up the screen.
 */
const START_LEAN = 30;
/**
 * Until a finger's peel is far enough to come off, it is handed back to
 * scrolling whenever its last this-many px go up the screen within START_LEAN
 * of the vertical: a thumb's arc that set off up the diagonal and curled up.
 */
const TURN_SPAN = 40;
/** How many of a finger's moves the trail recalls, for that. */
const TRAIL = 96;
/**
 * Pulled in again with the corner short of the pointer (pushed back from past
 * the band), the corner gains this much of each move on it, until it is under
 * the pointer again; a page scrolled by hand gains as much on the finger.
 */
const CATCH_UP = 0.5;
/**
 * How far (degrees) the fold may turn from square to the diagonal, at most;
 * the sideways part of a pull past it is dropped. It turns with the pull up to
 * FOLD_KNEE, then gives way gently, so the corner never stops short.
 */
const FOLD_SWING = 33;
const FOLD_KNEE = 25;
/** A flick: let go while the corner moves in this fast (px/s, along the diagonal) ... */
const FLING_SPEED = 600;
/** ... after pulling it in this far (px, along the diagonal) ... */
const FLING_PULL = 30;
/** ... and within this many degrees of the diagonal, and the sticker comes off too. */
const FLING_CONE = 30;
/** Let go while the pointer pushes the corner back down this fast (px/s, the way it was pulled) and it stays, however far it was. */
const PUSH_BACK = 400;
/** The spring that lays the corner back down: stiffness (1/s²) and damping ratio (a little bounce). */
const SPRING_K = 520;
const SPRING_ZETA = 0.6;
/** The fastest the corner may be thrown into the spring (peel/s). */
const SPRING_V_MAX = 4;
/** How long after a drag the click it makes is still dropped (ms). */
const CLICK_AFTER_DRAG_MS = 700;
/** A page scrolled from the grip glides on after a flick, slowing with this time constant (s) ... */
const GLIDE_TAU = 0.325;
/** ... until it is slower than this (px/s). */
const GLIDE_MIN = 20;

type Point = { x: number; y: number };

type Press = {
	id: number;
	type: string;
	/** where and when the press started */
	x: number;
	y: number;
	t: number;
	/** the sticker's tilt (radians), width and height (px): the drag is read in its own frame */
	tilt: number;
	w: number;
	h: number;
	/** where the corner's tip lies flat, in the sticker's frame */
	flat: Point;
	/** where the tip was when the press started (it may already be lifted) */
	tip: Point;
	/** still a press (it may be a tap), a peel, or a scroll by hand ("native": the browser scrolls it) */
	mode: 'press' | 'peel' | 'scroll' | 'native';
	peel: number;
	fold: number;
	/** how far the tip has travelled, as a peel (the rubber band applied) */
	reach: number;
	/** the same before the rubber band: how far the pointer has pulled it, less `slack` */
	raw: number;
	/** how far the pointer has pulled the tip (as a peel), slack and all */
	pull: number;
	/**
	 * How much of the pointer's pull (as a peel) the corner has let go of: a
	 * pull past the band that came back again. The pointer slid on the paper
	 * there; the corner follows it back from where it is, at once, and takes
	 * the slack up again as the pointer moves on, either way.
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

export type Peel = {
	/** A press on the sticker: on its grip it may become a peel. */
	onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	/** A link dragged out by its grip would carry the link away instead of peeling. */
	onDragStart: (event: DragEvent<HTMLElement>) => void;
	/** True for the click a drag makes when it ends: it is dropped. */
	dragged: (event: MouseEvent<HTMLElement>) => boolean;
	/** Stops the hint or the spring where they are (a click lifts the sticker from there). */
	stop: () => void;
	/** A pointer or the focus came onto the sticker: the hint gives way to the hover (or rest) peel, smoothly. */
	calm: () => void;
	/** The sticker let go to open did not go: lay it back down. */
	drop: () => void;
};

/** A number custom property of the sticker (--peel, --rest, --hover, --d0, --fold in degrees), or `fallback`. */
function prop(el: HTMLElement, name: string, fallback: number): number {
	const value = Number.parseFloat(getComputedStyle(el).getPropertyValue(name));
	return Number.isFinite(value) ? value : fallback;
}

/** The --peel the sticker shows now (animations and transitions included). */
const shownPeel = (el: HTMLElement) => prop(el, '--peel', 0);
/** The angle (degrees) its corner folds along now. */
const shownFold = (el: HTMLElement) => prop(el, '--fold', 45);

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

/** How far (px) a move in the sticker's frame goes up the diagonal, into the sticker. */
const along = (m: Point) => -(m.x + m.y) / Math.SQRT2;
/** How many degrees a move in the sticker's frame is off the diagonal into the sticker (180: straight out). */
const offDiagonal = (m: Point) =>
	(Math.atan2(Math.abs(m.x - m.y) / Math.SQRT2, along(m)) * 180) / Math.PI;

/** True when a move (dx, dy) on screen leans at least START_LEAN off the vertical. */
const leans = (dx: number, dy: number) =>
	Math.abs(dx) >= Math.tan((START_LEAN * Math.PI) / 180) * Math.abs(dy);

/** The rubber band: one to one up to PEEL_MAX, then less and less, but never nothing. */
function band(raw: number): number {
	if (raw <= PEEL_MAX) return Math.max(0, raw);
	const x = raw - PEEL_MAX;
	return PEEL_MAX + (PEEL_BAND * x) / (PEEL_BAND + x);
}

/** The pull that the rubber band turns into `reach`. */
function unband(reach: number): number {
	if (reach <= PEEL_MAX) return reach;
	const y = Math.min(reach - PEEL_MAX, PEEL_BAND * 0.999);
	return PEEL_MAX + (PEEL_BAND * y) / (PEEL_BAND - y);
}

/** How far (degrees) the fold turns for a pull `off` degrees from the diagonal: as far, up to FOLD_KNEE, then less and less, up to FOLD_SWING. */
function swing(off: number): number {
	const a = Math.abs(off);
	if (a <= FOLD_KNEE) return off;
	const room = FOLD_SWING - FOLD_KNEE;
	return (
		Math.sign(off) * (FOLD_KNEE + room * Math.tanh((a - FOLD_KNEE) / room))
	);
}

/**
 * Where the tip is for a pose: the flat tip mirrored across the fold. The
 * fold crosses the diagonal at w · (d0 + peel) / 2 in from the box's corner
 * on each axis, so it lies w · peel · (cos + sin) / 2 from the flat tip, and
 * the tip twice that.
 */
function tipOf(flat: Point, w: number, peel: number, fold: number): Point {
	const a = (fold * Math.PI) / 180;
	const d = w * peel * (Math.cos(a) + Math.sin(a));
	return { x: flat.x - d * Math.cos(a), y: flat.y - d * Math.sin(a) };
}

/**
 * The pose that puts the tip at `tip`: the fold is the line halfway between
 * it and where it lies flat, square to the way it was pulled. It turns at
 * most FOLD_SWING from the diagonal (past that, the pull's sideways part is
 * dropped), and the tip's travel, less `slack` (as a peel), takes the rubber
 * band past PEEL_MAX. `pull` is the travel before the slack is taken off.
 */
function poseOf(
	flat: Point,
	w: number,
	tip: Point,
	slack = 0,
): { peel: number; fold: number; reach: number; raw: number; pull: number } {
	const vx = flat.x - tip.x;
	const vy = flat.y - tip.y;
	let len = Math.hypot(vx, vy);
	let off = len > 0 ? (Math.atan2(vy, vx) * 180) / Math.PI - 45 : 0;
	if (off > 180) off -= 360;
	if (off < -180) off += 360;
	const kept = swing(off);
	len *= Math.cos(((off - kept) * Math.PI) / 180);
	off = kept;
	const pull = Math.max(0, len / (Math.SQRT2 * w));
	const raw = Math.max(0, pull - slack);
	if (raw <= 0) return { peel: 0, fold: 45, reach: 0, raw: 0, pull };
	const reach = band(raw);
	len = reach * Math.SQRT2 * w;
	// barely lifted, the fold's angle means little: it eases to the diagonal rather than swing
	const fold = 45 + off * Math.min(1, len / 12);
	const a = (fold * Math.PI) / 180;
	return {
		peel: len / (w * (Math.cos(a) + Math.sin(a))),
		fold,
		reach,
		raw,
		pull,
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

/** True where a finger going down on the grip scrolls the page by itself (touch-action: pan-up pinch-zoom, styles/stickers.css). */
function nativePanUp(): boolean {
	return (
		typeof CSS !== 'undefined' &&
		CSS.supports('touch-action', 'pan-up pinch-zoom')
	);
}

/** The page gliding on after a flick that scrolled it from a grip: 0 when it is not. */
let gliding = 0;
let stopGlide = () => {};

/** Lets the page glide on at `speed` px/s (down the page when positive), slowing down, as a flicked page does. */
function glide(speed: number) {
	stopGlide();
	if (Math.abs(speed) < GLIDE_MIN * 4 || prefersReducedMotion()) return;
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
 * The drag that peels a sticker by its corner. `onOff` is called when the
 * sticker is let go to come off; it returns false when it cannot open now
 * (another is on its way), and the corner goes back down.
 */
export function usePeel(
	ref: RefObject<HTMLElement | null>,
	onOff: () => boolean,
): Peel {
	const press = useRef<Press | null>(null);
	const spring = useRef(0);
	const clickUntil = useRef(0);
	const off = useRef(onOff);
	useEffect(() => {
		off.current = onOff;
	});
	/** Ends the press in progress (removes its listeners); set while one is. */
	const endPress = useRef<(() => void) | null>(null);

	const stopSpring = useCallback(() => {
		cancelAnimationFrame(spring.current);
		spring.current = 0;
	}, []);

	/** Hands --peel back to the stylesheet (rest, hover, focus or lift). */
	const settle = useCallback(
		(el: HTMLElement) => {
			stopSpring();
			delete el.dataset.peel;
			delete el.dataset.ready;
			for (const name of ['--drag', '--fold', '--lift', '--tip-x', '--tip-y']) {
				el.style.removeProperty(name);
			}
		},
		[stopSpring],
	);

	/**
	 * Lays the corner back down from `from` (folded at `fold`), thrown at
	 * `velocity` (peel/s), with a short spring; the fold turns back square to
	 * the diagonal with it.
	 */
	const springBack = useCallback(
		(
			el: HTMLElement,
			from: number,
			fold: number,
			velocity: number,
			over: boolean,
		) => {
			stopSpring();
			delete el.dataset.ready;
			// where it comes to rest: the hover peel under a mouse still on it, or flat(ish)
			const hovers =
				(over && matchMedia('(hover: hover) and (pointer: fine)').matches) ||
				el.matches(':focus-visible:not([data-quiet]), [data-keyed]:focus');
			const target = hovers ? prop(el, '--hover', 0) : prop(el, '--rest', 0);
			if (prefersReducedMotion()) {
				settle(el);
				return;
			}
			// from where it is, this frame: nothing jumps as the spring takes over
			el.style.setProperty('--drag', from.toFixed(4));
			el.style.setProperty('--fold', `${fold.toFixed(2)}deg`);
			el.dataset.peel = 'spring';
			el.style.removeProperty('--lift');
			const damping = 2 * SPRING_ZETA * Math.sqrt(SPRING_K);
			let x = from - target;
			let v = Math.max(-SPRING_V_MAX, Math.min(SPRING_V_MAX, velocity));
			let a = fold - 45;
			let va = 0;
			let last = 0;
			const step = (now: number) => {
				// a frame's worth on the first frame; never more than three after a stall
				let dt = last
					? Math.min(0.05, Math.max(0, (now - last) / 1000))
					: 1 / 60;
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
				el.style.setProperty('--drag', String(Math.max(0, target + x)));
				el.style.setProperty('--fold', `${(45 + a).toFixed(2)}deg`);
				spring.current = requestAnimationFrame(step);
			};
			spring.current = requestAnimationFrame(step);
		},
		[settle, stopSpring],
	);

	const onPointerDown = useCallback(
		(event: PointerEvent<HTMLElement>) => {
			const el = ref.current;
			if (!el || press.current) return;
			// one pointer at a time, the main button, and no modifier (a new tab)
			if (
				!event.isPrimary ||
				event.button !== 0 ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}
			// a new press: the click an earlier drag made has come by now, if it was to
			clickUntil.current = 0;
			const target = event.target;
			if (!(target instanceof Element) || !target.closest('.stk-grip')) return;
			// a sticker already lifting or flying is not in hand
			if (el.classList.contains('is-lifting') || el.dataset.peel === 'off') {
				return;
			}
			if ('vt' in document.documentElement.dataset) return;
			const body = el.querySelector<HTMLElement>('.stk-body');
			const w = body?.offsetWidth || el.offsetWidth || 1;
			const h = body?.offsetHeight || el.offsetHeight || 1;
			const d0 = prop(el, '--d0', 0);
			const flat = { x: w - (w * d0) / 2, y: h - (w * d0) / 2 };
			const p: Press = {
				id: event.pointerId,
				type: event.pointerType,
				x: event.clientX,
				y: event.clientY,
				t: event.timeStamp,
				tilt: tiltOf(el),
				w,
				h,
				flat,
				tip: flat,
				mode: 'press',
				peel: 0,
				fold: 45,
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

			/**
			 * Shows the pose: --drag and --fold, and where the tip is (--tip-x,
			 * --tip-y, in the sticker's box), for the cue that it is far enough to
			 * come off, which lifts the sticker about its tip, so the tip stays
			 * under the pointer (styles/stickers.css).
			 */
			const show = () => {
				el.style.setProperty('--drag', p.peel.toFixed(4));
				el.style.setProperty('--fold', `${p.fold.toFixed(2)}deg`);
				const tip = tipOf(p.flat, p.w, p.peel, p.fold);
				el.style.setProperty('--tip-x', `${tip.x.toFixed(1)}px`);
				el.style.setProperty('--tip-y', `${tip.y.toFixed(1)}px`);
			};

			const begin = () => {
				// from wherever the corner is now: at rest, hovered, mid-hint or mid-spring
				stopSpring();
				p.mode = 'peel';
				p.peel = shownPeel(el);
				p.fold = shownFold(el);
				p.tip = tipOf(p.flat, p.w, p.peel, p.fold);
				const start = poseOf(p.flat, p.w, p.tip);
				// a corner caught past the band (springing back from there) stays where it is
				p.slack = start.pull > PEEL_MAX ? start.pull - unband(start.pull) : 0;
				p.pull = start.pull;
				p.raw = start.pull - p.slack;
				p.reach = band(p.raw);
				// from the press: a flick can be over in a frame or two
				p.samples.push({ t: p.t, x: 0, y: 0, peel: p.peel, reach: p.reach });
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
			 * A finger's peel: true when the way it went last (its last TURN_SPAN
			 * px, or all of it, if shorter) goes up the screen without leaning,
			 * as a thumb scrolling the page does.
			 */
			const turnsUp = (dx: number, dy: number) => {
				p.trail.push({ x: dx, y: dy });
				if (p.trail.length > TRAIL) p.trail.shift();
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
				return ty < 0 && Math.hypot(tx, ty) >= 1 && !leans(tx, ty);
			};

			const move = (e: globalThis.PointerEvent) => {
				if (e.pointerId !== p.id) return;
				const dx = e.clientX - p.x;
				const dy = e.clientY - p.y;
				p.far = Math.max(p.far, Math.hypot(dx, dy));
				if (p.mode === 'native') return;
				const m = local(dx, dy, p.tilt);
				if (p.mode === 'press') {
					if (p.far < (SLOP[p.type] ?? 4)) return;
					// A finger decides here: up the diagonal it peels, if it leans
					// off the screen's vertical too (a tilted sticker's diagonal may
					// be nearly upright); any other way it scrolls (down, the browser
					// scrolls it itself where it can). A mouse has nothing to
					// scroll: it always takes the corner.
					if (
						p.type === 'mouse' ||
						(offDiagonal(m) <= START_CONE && leans(dx, dy))
					) {
						begin();
					} else if (dy > 0 && nativePanUp()) {
						p.mode = 'native';
						return;
					} else {
						scrollByHand(e);
					}
				} else if (
					p.mode === 'peel' &&
					p.type !== 'mouse' &&
					turnsUp(dx, dy) &&
					!p.ready
				) {
					// It leaned at first but turned up the screen before it was far
					// enough to come off: it was scrolling after all. The corner goes
					// back down and the page scrolls.
					springBack(el, p.peel, p.fold, 0, false);
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
				const tip = { x: p.tip.x + m.x, y: p.tip.y + m.y };
				let pose = poseOf(p.flat, p.w, tip, p.slack);
				if (pose.pull < p.pull && p.raw > PEEL_MAX) {
					// Pushed back from past the band: the corner comes back as far as
					// the pointer does, at once. What the band kept back is let go of.
					const back = Math.max(0, p.reach - (p.raw - pose.raw));
					p.slack = pose.pull - unband(back);
				} else if (p.slack > 0 && pose.pull < p.pull) {
					// pushed back further: the slack shrinks with the pull, so the
					// corner lies flat just as the pointer gets back to where it does
					p.slack *= pose.pull / p.pull;
				} else if (p.slack > 0 && pose.pull > p.pull) {
					// pulled in again: the corner gains on the pointer, until it is under it
					p.slack = Math.max(0, p.slack - CATCH_UP * (pose.pull - p.pull));
				}
				// pushed down flat (or past): pulled out again, it lifts at once
				p.slack = Math.min(p.slack, pose.pull);
				pose = poseOf(p.flat, p.w, tip, p.slack);
				p.peel = pose.peel;
				p.fold = pose.fold;
				p.reach = pose.reach;
				p.raw = pose.raw;
				p.pull = pose.pull;
				p.samples.push({
					t: e.timeStamp,
					x: m.x,
					y: m.y,
					peel: p.peel,
					reach: p.reach,
				});
				if (p.samples.length > 12) p.samples.shift();
				show();
				const ready = p.reach >= PEEL_OPEN - (p.ready ? READY_GIVE : 0);
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
				// the flick: fast up the diagonal, far enough, and not off to one side
				const last = {
					x: p.samples.at(-1)?.x ?? 0,
					y: p.samples.at(-1)?.y ?? 0,
				};
				const pull = along(last);
				const flick = { x: speed.x, y: speed.y };
				const flung =
					along(flick) >= FLING_SPEED &&
					offDiagonal(flick) <= FLING_CONE &&
					pull >= FLING_PULL;
				// Pushed back as it was let go: read from the pointer, which the
				// corner (held back by the band past PEEL_MAX) may hardly show.
				// Its speed the way the tip was pulled, out from where it lies flat.
				const out = {
					x: p.tip.x + last.x - p.flat.x,
					y: p.tip.y + last.y - p.flat.y,
				};
				const len = Math.hypot(out.x, out.y);
				const outwards =
					len > 1 ? (speed.x * out.x + speed.y * out.y) / len : along(flick);
				const pushedBack = outwards <= -PUSH_BACK;
				// far enough as the cue last said (data-ready), or flicked
				const opens = commit && ((p.ready && !pushedBack) || flung);
				if (opens) {
					// It stays as peeled as it was let go (and as lifted, if it was
					// far enough to say so) while it comes off and flies: the flight
					// starts from here, at once (DeskProvider's open).
					show();
					el.style.setProperty('--lift', p.peel.toFixed(4));
					el.dataset.peel = 'off';
					if (off.current()) return;
				}
				springBack(
					el,
					p.peel,
					p.fold,
					opens ? 0 : speed.peel,
					commit && p.over,
				);
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
			// a long press on the corner is the start of a peel, not the link's menu
			const menu = (e: Event) => {
				if (p.type !== 'mouse') e.preventDefault();
			};

			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', up);
			window.addEventListener('pointercancel', cancel);
			window.addEventListener('pointerdown', other, true);
			window.addEventListener('contextmenu', menu, true);
			el.addEventListener('lostpointercapture', lost);
			endPress.current = () => release(false, performance.now());
		},
		[ref, springBack, stopSpring],
	);

	// unmounting mid-drag (the page changed under it): drop the listeners
	useEffect(
		() => () => {
			endPress.current?.();
			stopSpring();
		},
		[stopSpring],
	);

	const onDragStart = useCallback((event: DragEvent<HTMLElement>) => {
		if (press.current) event.preventDefault();
	}, []);

	const dragged = useCallback((event: MouseEvent<HTMLElement>) => {
		// a click from the keyboard (Enter) has no pointer behind it: never dropped
		if (event.detail === 0 || performance.now() > clickUntil.current) {
			return false;
		}
		clickUntil.current = 0;
		return true;
	}, []);

	const stop = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const mode = el.dataset.peel;
		if (mode === 'hint' || mode === 'spring') settle(el);
	}, [ref, settle]);

	const calm = useCallback(() => {
		const el = ref.current;
		if (el?.dataset.peel !== 'hint') return;
		springBack(el, shownPeel(el), 45, 0, true);
	}, [ref, springBack]);

	const drop = useCallback(() => {
		const el = ref.current;
		if (el?.dataset.peel === 'off') {
			springBack(el, shownPeel(el), shownFold(el), 0, false);
		}
	}, [ref, springBack]);

	return useMemo(
		() => ({ onPointerDown, onDragStart, dragged, stop, calm, drop }),
		[onPointerDown, onDragStart, dragged, stop, calm, drop],
	);
}

/* ── the hint: once a visit, one sticker's corner lifts and settles back ── */

const HINT_KEY = 'vh19:peel-hint';
/** How long a sticker is in full view before its corner lifts (ms). */
const HINT_DELAY = 450;
/** The hint's length in styles/stickers.css, plus a margin, in case its end is never heard. */
const HINT_MS = 1600;

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

/**
 * Lifts the corner of the first sticker in full view (in reading order), once.
 * A pointer or the focus arriving on it while it plays ends it (StickerLink
 * calls `calm`), so the hover peel takes over from where the hint was.
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
	const end = (event?: AnimationEvent) => {
		if (event && event.animationName !== 'stk-hint') return;
		window.clearTimeout(timeout);
		el.removeEventListener('animationend', end);
		if (el.dataset.peel === 'hint') delete el.dataset.peel;
	};
	el.addEventListener('animationend', end);
	const timeout = window.setTimeout(end, HINT_MS);
}

/**
 * Teaches the peel once a visit: when the stickers first come into full view,
 * the first of them lifts its corner and lays it back down. Not with reduced
 * motion, and not once the reader has peeled one.
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
			if (el.dataset.peel === 'hint') delete el.dataset.peel;
		};
	}, [ref]);
}
