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
 * corner curls back after the pointer, the way the existing peel folds it
 * (--peel in styles/stickers.css, the fold line x + y = k). Let go far enough
 * in, or flick it, and the sticker comes off: `onOff` opens the project, from
 * the peeled pose. Let go before that and the corner springs back down.
 *
 * The drag writes --drag on the sticker, and the sticker's data-peel says who
 * drives --peel: "drag" (the pointer), "spring" (the spring laying it down),
 * "off" (let go to open: it stays peeled while it lifts and flies) and "hint"
 * (the once-a-visit hint, a CSS animation).
 */

/** Let go with the corner peeled this far (--peel, a fraction of the width) and the sticker comes off. */
const PEEL_OPEN = 0.34;
/** How far the corner follows the pointer one to one; past it, it gives less and less. */
const PEEL_MAX = 0.46;
/** How much further than PEEL_MAX the rubber band lets it go, at most. */
const PEEL_BAND = 0.07;
/** How far (px) a press on the corner moves before it is a peel rather than a tap. */
const SLOP: Record<string, number> = { mouse: 3, pen: 4, touch: 6 };
/** A flick: let go while the corner moves in this fast (px/s, along the diagonal) ... */
const FLING_SPEED = 600;
/** ... after pulling it in this far (px), and the sticker comes off too. */
const FLING_PULL = 30;
/** Let go while pushing the corner back down this fast (px/s) and it stays, however far it was. */
const PUSH_BACK = 400;
/** The spring that lays the corner back down: stiffness (1/s²) and damping ratio (a little bounce). */
const SPRING_K = 520;
const SPRING_ZETA = 0.6;
/** The fastest the corner may be thrown into the spring (peel/s). */
const SPRING_V_MAX = 4;
/** How long after a drag the click it makes is still dropped (ms). */
const CLICK_AFTER_DRAG_MS = 700;

type Press = {
	id: number;
	type: string;
	/** where and when the press started */
	x: number;
	y: number;
	t: number;
	/** the sticker's tilt (radians) and width (px): the drag is read in its own frame */
	tilt: number;
	width: number;
	/** --peel when the drag started; null while it is still a press (it may be a tap) */
	base: number | null;
	peel: number;
	pull: number;
	ready: boolean;
	/** recent moves, for the speed at release */
	samples: { t: number; pull: number; peel: number }[];
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
	/** The sticker let go to open did not go: lay it back down. */
	drop: () => void;
};

/** The --peel the sticker shows now (animations and transitions included). */
function shownPeel(el: HTMLElement): number {
	const value = Number.parseFloat(
		getComputedStyle(el).getPropertyValue('--peel'),
	);
	return Number.isFinite(value) ? value : 0;
}

/** A number custom property of the sticker (--rest, --hover), or `fallback`. */
function prop(el: HTMLElement, name: string, fallback: number): number {
	const value = Number.parseFloat(getComputedStyle(el).getPropertyValue(name));
	return Number.isFinite(value) ? value : fallback;
}

/** The sticker's tilt (its CSS rotate), in radians. */
function tiltOf(el: HTMLElement): number {
	const m = /^(-?[\d.]+)deg$/.exec(getComputedStyle(el).rotate.trim());
	return m ? (Number(m[1]) * Math.PI) / 180 : 0;
}

/**
 * How far (px) a pointer that moved by (dx, dy) on screen pulls the corner in,
 * along the sticker's diagonal: the move in the sticker's own (tilted) frame,
 * projected onto the direction the corner folds, up and to the left.
 */
function pullOf(dx: number, dy: number, tilt: number): number {
	const cos = Math.cos(tilt);
	const sin = Math.sin(tilt);
	const x = dx * cos + dy * sin;
	const y = -dx * sin + dy * cos;
	return -(x + y) / Math.SQRT2;
}

/**
 * The peel that puts the corner's tip under the pointer: folding along
 * x + y = k moves the tip twice as far as the fold line, 2 · width · peel in
 * x + y, so √2 · width · peel along the diagonal. Past PEEL_MAX it gives less
 * and less (a rubber band); it cannot go flatter than flat.
 */
function peelOf(base: number, pull: number, width: number): number {
	const raw = base + pull / (Math.SQRT2 * width);
	if (raw <= PEEL_MAX) return Math.max(0, raw);
	return PEEL_MAX + PEEL_BAND * (1 - Math.exp(-(raw - PEEL_MAX) / PEEL_BAND));
}

/**
 * How fast `key` changed over the last 100 ms of the drag, per second. Moves
 * that came in the same frame count as a frame apart.
 */
function speed(
	samples: Press['samples'],
	now: number,
	key: 'pull' | 'peel',
): number {
	const recent = samples.filter((s) => now - s.t <= 100);
	if (recent.length < 2) return 0;
	const first = recent[0];
	const last = recent[recent.length - 1];
	const dt = Math.max((last.t - first.t) / 1000, 1 / 60);
	return (last[key] - first[key]) / dt;
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
			el.style.removeProperty('--drag');
			el.style.removeProperty('--lift');
		},
		[stopSpring],
	);

	/** Lays the corner back down from `from`, thrown at `velocity` (peel/s), with a short spring. */
	const springBack = useCallback(
		(el: HTMLElement, from: number, velocity: number, over: boolean) => {
			stopSpring();
			delete el.dataset.ready;
			// where it comes to rest: the hover peel under a mouse still on it, or flat(ish)
			const hovers =
				(over && matchMedia('(hover: hover) and (pointer: fine)').matches) ||
				el.matches(':focus-visible');
			const target = hovers ? prop(el, '--hover', 0) : prop(el, '--rest', 0);
			if (prefersReducedMotion()) {
				settle(el);
				return;
			}
			el.dataset.peel = 'spring';
			el.style.removeProperty('--lift');
			const damping = 2 * SPRING_ZETA * Math.sqrt(SPRING_K);
			let x = from - target;
			let v = Math.max(-SPRING_V_MAX, Math.min(SPRING_V_MAX, velocity));
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
					dt -= h;
				}
				if (Math.abs(x) < 0.001 && Math.abs(v) < 0.02) {
					settle(el);
					return;
				}
				el.style.setProperty('--drag', String(Math.max(0, target + x)));
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
			const target = event.target;
			if (!(target instanceof Element) || !target.closest('.stk-grip')) return;
			// a sticker already lifting or flying is not in hand
			if (el.classList.contains('is-lifting') || el.dataset.peel === 'off') {
				return;
			}
			if ('vt' in document.documentElement.dataset) return;
			const body = el.querySelector<HTMLElement>('.stk-body');
			const p: Press = {
				id: event.pointerId,
				type: event.pointerType,
				x: event.clientX,
				y: event.clientY,
				t: event.timeStamp,
				tilt: tiltOf(el),
				width: body?.offsetWidth || el.offsetWidth || 1,
				base: null,
				peel: 0,
				pull: 0,
				ready: false,
				samples: [],
				over: true,
			};
			press.current = p;

			const begin = () => {
				// from wherever the corner is now: at rest, hovered, mid-hint or mid-spring
				stopSpring();
				p.base = shownPeel(el);
				p.peel = p.base;
				// from the press: a flick can be over in a frame or two
				p.samples.push({ t: p.t, pull: 0, peel: p.base });
				el.style.setProperty('--drag', String(p.base));
				el.dataset.peel = 'drag';
				markHinted(); // it has been found: no need to show it
				try {
					el.setPointerCapture(p.id);
				} catch {}
			};

			const move = (e: globalThis.PointerEvent) => {
				if (e.pointerId !== p.id) return;
				const dx = e.clientX - p.x;
				const dy = e.clientY - p.y;
				if (p.base === null) {
					if (Math.hypot(dx, dy) < (SLOP[p.type] ?? 4)) return;
					begin();
				}
				const base = p.base ?? 0;
				p.pull = pullOf(dx, dy, p.tilt);
				p.peel = peelOf(base, p.pull, p.width);
				p.samples.push({ t: e.timeStamp, pull: p.pull, peel: p.peel });
				if (p.samples.length > 12) p.samples.shift();
				el.style.setProperty('--drag', p.peel.toFixed(4));
				const ready = p.peel >= PEEL_OPEN;
				if (ready !== p.ready) {
					p.ready = ready;
					if (ready) {
						el.dataset.ready = '';
						if (p.type === 'touch') tick();
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

			/** Lets go: open (`commit` and far or fast enough) or lay it back down. */
			const release = (commit: boolean, at: number) => {
				finish();
				if (p.base === null) return; // a tap: the click opens it
				clickUntil.current = performance.now() + CLICK_AFTER_DRAG_MS;
				const pullSpeed = speed(p.samples, at, 'pull');
				const peelSpeed = speed(p.samples, at, 'peel');
				const opens =
					commit &&
					((p.peel >= PEEL_OPEN && pullSpeed > -PUSH_BACK) ||
						(pullSpeed >= FLING_SPEED && p.pull >= FLING_PULL));
				if (opens) {
					// it stays as peeled as it was let go (a flick carries it on to the
					// lift's peel) while it comes off and flies
					delete el.dataset.ready;
					el.style.setProperty('--drag', p.peel.toFixed(4));
					el.style.setProperty(
						'--lift',
						Math.max(p.peel, PEEL_OPEN).toFixed(4),
					);
					el.dataset.peel = 'off';
					if (off.current()) return;
				}
				springBack(el, p.peel, opens ? 0 : peelSpeed, commit && p.over);
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
				if (p.base !== null) {
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

	const drop = useCallback(() => {
		const el = ref.current;
		if (el?.dataset.peel === 'off') springBack(el, shownPeel(el), 0, false);
	}, [ref, springBack]);

	return useMemo(
		() => ({ onPointerDown, onDragStart, dragged, stop, drop }),
		[onPointerDown, onDragStart, dragged, stop, drop],
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

/** Lifts the corner of the first sticker in full view (in reading order), once. */
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
		el.matches(':hover, :focus-visible')
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
