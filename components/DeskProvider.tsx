'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { flushSync } from 'react-dom';
import {
	bezier,
	drawHand,
	type Hand,
	handOf,
	layDown,
	stopLaying,
} from './fold';

/**
 * How long a clicked sticker whose page is not in yet lifts off the page before
 * it may fly (the lift runs 0.1s), so the flight starts from the pose the
 * header sticker takes. A sticker whose page is in flies at once, and one
 * peeled off by hand does not wait either: the peel was its lift.
 */
const LIFT_MS = 110;
/**
 * The longest a lifted sticker waits for its page's data. The page keeps
 * drawing meanwhile (the sticker bobs while it waits); past this, the project
 * opens as a plain navigation, without the flight.
 */
const LOAD_WAIT_MS = 1500;
/** After this much waiting, the lifted sticker starts to bob, so a slow page is seen to be coming. */
const WAIT_BOB_MS = 220;
/**
 * The longest a view transition holds the old page on screen while the next one
 * loads (the browser draws nothing new meanwhile). Past it the transition runs
 * with what is there and the page swaps in when it comes.
 */
const PAGE_TIMEOUT_MS = 1200;
/** The longest it waits for the stickers' images to decode once the page is in. */
const DECODE_TIMEOUT_MS = 250;
/**
 * The longest it waits, once the page is in, for the fonts its first screen
 * needs. They were fetched while the sticker waited (`pageLoaded` waits for
 * the page's preloads), so this is only their swap from the cache; without it
 * the new page's headline would change face during the flight.
 */
const FONT_WAIT_MS = 150;
/**
 * How long a page's data, once fetched, counts as in without asking again:
 * under the five minutes Next.js keeps a prefetched static page.
 */
const FRESH_MS = 4 * 60_000;

/** Which way the sticker flies: up into the header, or back down onto the page. */
type Direction = 'open' | 'close';

type Desk = {
	/** The path of the page we came from on the last client-side navigation; null after a full page load. */
	from: string | null;
	/**
	 * The href of the sticker on the Projects page that flies in the running
	 * transition, and whether it is lifting off the page first (a click whose
	 * page is still loading) or not (a click whose page is in, Forward).
	 * `waiting`: lifted a while, its page still not in. Null when no sticker on
	 * this page is about to fly.
	 */
	flight: { href: string; lift: boolean; waiting?: boolean } | null;
	/**
	 * Open a project from its sticker: fly it into the header, at once when its
	 * page is in, else lifted off the page until it is. Ignored while another
	 * opens: then it returns false. `peeled`: it was peeled off by hand, which
	 * lifted it already, so it flies (from that pose) as soon as its page is in.
	 */
	open: (href: string, peeled?: boolean) => boolean;
	/** A pointer or the focus is on (or a finger down on) a sticker that does not prefetch: its page starts loading. */
	intent: (href: string) => void;
	/**
	 * A link's onNavigate: when the link opens or leaves a project, it takes the
	 * navigation over and runs it as a view transition. Any other navigation
	 * goes ahead as usual, and either way a sticker still lifting is dropped.
	 * `back` (the Back arrow, "All projects"): when the page before this one in
	 * the browser's history is `href`, it steps back to it, as the browser's
	 * Back would, rather than adding a step.
	 */
	navigate: (
		event: { preventDefault: () => void },
		href: string,
		back?: boolean,
	) => void;
	/** Notes where the page is scrolled before a project opens without a transition (reduced motion). */
	remember: () => void;
	/** Where a page was scrolled when it was left to open a project (or left a project for another page). */
	scrollOf: (path: string) => number | undefined;
};

const DeskContext = createContext<Desk>({
	from: null,
	flight: null,
	open: () => false,
	intent: () => {},
	navigate: () => {},
	remember: () => {},
	scrollOf: () => undefined,
});

/**
 * Where each page was scrolled when it was left for (or from) a project, so
 * coming back puts it where it was, as the browser's own Back would.
 */
const scrolled = new Map<string, number>();

const projectPath = /^\/projects\/[^/]+\/?$/;

/**
 * True when the entry before this one in the browser's history is `path` on
 * this page (the Navigation API knows; without it, false). Then the Back arrow
 * steps back to it instead of adding a step that Back would undo.
 */
function previousEntryIs(path: string): boolean {
	if (!('navigation' in window)) return false;
	const current = navigation.currentEntry;
	if (!current || current.index < 1) return false;
	const prev = navigation.entries()[current.index - 1];
	if (!prev?.url || !prev.sameDocument) return false;
	const url = new URL(prev.url);
	return url.origin === window.location.origin && url.pathname === path;
}

/** Opening a project, or leaving one, morphs its sticker. Other page turns are instant. */
function morphs(from: string, to: string): boolean {
	return from !== to && (projectPath.test(from) || projectPath.test(to));
}

/**
 * True where the page can animate a navigation: the browser has same-document
 * view transitions (Chromium 111+, Safari 18+, Firefox 144+) and the reader has
 * not asked for reduced motion. Elsewhere every navigation is instant.
 */
export function canAnimate(): boolean {
	return (
		typeof document.startViewTransition === 'function' &&
		!prefersReducedMotion()
	);
}

/** The view-transition-name a project's sticker shares between the Projects page and the header. */
export function stickerName(key: string): string {
	return `stk-${key}`;
}

/**
 * What the reader last used on the page: a pointer (a click, a tap, a peel)
 * or the keyboard. A sticker focused back by the page after its project was
 * opened with a pointer shows no focus ring (StickerLink).
 */
let input: 'pointer' | 'key' = 'pointer';
export const lastInput = () => input;
function onPointerInput() {
	input = 'pointer';
}
function onKeyInput() {
	input = 'key';
}

/**
 * The page coasting on after a flick: no finger on it, the last one let go,
 * and it scrolled a moment ago. Read from the touches and the scrolls.
 */
let fingers = 0;
let letGo = false;
let scrolledAt = Number.NEGATIVE_INFINITY;
function onTouches(event: TouchEvent) {
	fingers = event.touches.length;
	letGo = event.type !== 'touchstart' && fingers === 0;
}
function onScrolled() {
	scrolledAt = performance.now();
}

/**
 * Stops the page coasting on after a flick, so a step to another page lands
 * where that page puts itself (the Projects page where it was left, a project
 * at its top) rather than carried on past it. A fling ends when its scroller
 * cannot scroll: the root is held still for a frame the browser draws.
 */
function stopCoasting() {
	if (fingers > 0 || !letGo || performance.now() - scrolledAt > 100) return;
	const root = document.documentElement;
	if (root.style.overflow) return;
	root.style.overflow = 'hidden';
	requestAnimationFrame(() =>
		requestAnimationFrame(() => root.style.removeProperty('overflow')),
	);
}

/**
 * The events a view transition's own animations send to <html> as they start
 * and end (one for each part of each snapshot). Nothing on the site listens
 * for them, but React's root listener would handle each one, on the main
 * thread, as the flight starts: they go no further than the window.
 */
const TRANSITION_EVENTS = [
	'animationstart',
	'animationend',
	'animationiteration',
	'animationcancel',
] as const;

function onTransitionAnimation(event: AnimationEvent) {
	if (event.pseudoElement?.startsWith('::view-transition')) {
		event.stopImmediatePropagation();
	}
}

/** The transition that runs now, so an older one that is skipped leaves the newer one's state alone. */
let running: ViewTransition | null = null;

/**
 * The last click on the page outside a transition (most often the one that
 * started it): a press during the transition close to it is the same click
 * again (the second half of a double click, a re-tap), not a new one.
 */
let lastClick: { x: number; y: number; at: number } | null = null;
/** How near (px) and how soon (ms) a press is the last click again. */
const AGAIN_PX = 12;
const AGAIN_MS = 2500;

/**
 * A press made while a transition runs. The browser sends it to <html> under
 * the transition's snapshots, where it would be lost; it is not allowed to
 * cut the flight short. One thing is worth keeping: a quick press on the new
 * page's Back arrow, the only link that is where it is seen to be. That click
 * goes to the arrow once the flight has landed; any other press is dropped
 * (a sticker, a tab or a link under the pointer on the new page is not what
 * the reader could see there).
 */
let pressed: { x: number; y: number; at: number; again: boolean } | null = null;

function onPressDuringTransition(event: PointerEvent) {
	if (!running || event.button !== 0 || !event.isPrimary) return;
	// a press on the scrollbar is not a click on the page
	if (event.clientX >= document.documentElement.clientWidth) return;
	const now = performance.now();
	const last = lastClick;
	pressed = {
		x: event.clientX,
		y: event.clientY,
		at: now,
		again:
			event.detail >= 2 ||
			(last !== null &&
				now - last.at < AGAIN_MS &&
				Math.hypot(event.clientX - last.x, event.clientY - last.y) <= AGAIN_PX),
	};
}

function onClickDuringTransition(event: MouseEvent) {
	const press = pressed;
	pressed = null;
	const target = event.target;
	const lost = target === document.documentElement || target === document.body;
	if (!press || !lost || performance.now() - press.at > 1500) {
		// a click on the page itself
		if (!running && event.isTrusted) {
			lastClick = {
				x: event.clientX,
				y: event.clientY,
				at: performance.now(),
			};
		}
		return;
	}
	event.preventDefault();
	event.stopImmediatePropagation();
	// the same click again: the first one already went where it was meant to
	if (press.again || event.detail >= 2) return;
	const toBack = () => {
		const el = document.elementFromPoint(press.x, press.y);
		el?.closest<HTMLElement>('.mast .back')?.click();
	};
	const vt = running;
	if (vt) vt.finished.catch(() => {}).finally(toBack);
	else toBack();
}

/**
 * Next.js's requests for a page's data (`?_rsc=`) on their way, by path, so a
 * lifted sticker waits for its page before it flies: once the flight starts,
 * the browser draws nothing new until the page is in. Next.js requests a page
 * with the page's fetch; the count drops when a response's body is read.
 */
const loading = new Map<string, number>();
/** When each path's last request for data finished (performance.now()). */
const loaded = new Map<string, number>();
let fetchWatched = false;

function watchPageData() {
	if (fetchWatched) return;
	fetchWatched = true;
	const fetch0 = window.fetch;
	window.fetch = function fetch(input, init) {
		const res = fetch0.call(this, input, init);
		let path: string | null = null;
		try {
			const url = new URL(
				input instanceof Request ? input.url : String(input),
				window.location.href,
			);
			if (url.searchParams.has('_rsc')) path = url.pathname;
		} catch {}
		if (path === null) return res;
		const key = path;
		loading.set(key, (loading.get(key) ?? 0) + 1);
		const done = () => {
			loading.set(key, Math.max(0, (loading.get(key) ?? 1) - 1));
			loaded.set(key, performance.now());
		};
		res.then((r) => r.clone().arrayBuffer()).then(done, done);
		return res;
	};
	// Every fetch that has finished (Resource Timing), so a preload still on
	// its way can be told from one that is in.
	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) fetched.add(entry.name);
		}).observe({ type: 'resource', buffered: true });
	} catch {}
}

/** The URLs whose fetch has finished. */
const fetched = new Set<string>();

// Watch from the start, before Next.js prefetches the stickers' pages as they
// come into view, so those count too.
if (typeof window !== 'undefined') watchPageData();

/**
 * The stylesheets and fonts a page about to open asked for ahead (Next.js puts
 * a page's preloads in the head as soon as its data comes in) that are still
 * on their way. Waited for before the flight, so the new page is drawn in its
 * own fonts from its first frame.
 */
function preloadsPending(): boolean {
	const now = performance.now();
	for (const link of document.head.querySelectorAll<HTMLLinkElement>(
		'link[rel="preload"][as="font"], link[rel="preload"][as="style"]',
	)) {
		if (!link.href || fetched.has(link.href)) continue;
		// one that never comes in (offline, say) is not waited for again
		const seen = preloadSeen.get(link);
		if (seen === undefined) preloadSeen.set(link, now);
		if (seen === undefined || now - seen < LOAD_WAIT_MS) return true;
	}
	return false;
}

/** When each preload was first found still on its way. */
const preloadSeen = new WeakMap<HTMLLinkElement, number>();

/**
 * True when `path`'s data is in now: it came in lately (Next.js still has it),
 * no request for it is on its way, and nor are the preloads it asked for. Then
 * the transition can start at once without waiting on the network.
 */
function pageReady(path: string): boolean {
	const last = loaded.get(path);
	const age = last === undefined ? -1 : performance.now() - last;
	return (
		// not just now: Next.js may be about to ask for its second part
		age >= 50 &&
		age < FRESH_MS &&
		(loading.get(path) ?? 0) === 0 &&
		!preloadsPending()
	);
}

/**
 * Resolves true once `path`'s data has come in (or needs no request: Next.js
 * has it already), and the stylesheets and fonts it asked for ahead, false if
 * it is still loading after `max` ms. Next.js asks for a page in up to two
 * requests, one after the other, a moment after it is told to: the page
 * counts as in once none has been on its way for 50 ms, or, if none was ever
 * asked for, 200 ms on.
 */
function pageLoaded(path: string, max: number): Promise<boolean> {
	return new Promise((resolve) => {
		const start = performance.now();
		const tick = () => {
			const now = performance.now();
			const last = loaded.get(path);
			if (
				(loading.get(path) ?? 0) === 0 &&
				(last === undefined ? now - start >= 200 : now - last >= 50) &&
				!preloadsPending()
			) {
				finish(true);
				return;
			}
			timer = window.setTimeout(tick, 25);
		};
		let timer = window.setTimeout(tick, 0);
		const limit = window.setTimeout(() => finish(false), max);
		function finish(ok: boolean) {
			window.clearTimeout(timer);
			window.clearTimeout(limit);
			resolve(ok);
		}
	});
}

/** The sticker that flies: the one element on the page named for a sticker. */
function flyingSticker(): HTMLElement | null {
	for (const el of document.querySelectorAll<HTMLElement>('.stk, .slap-stk')) {
		if (el.style.viewTransitionName.startsWith('stk-')) return el;
	}
	return null;
}

/**
 * Runs `update` (which changes the page) as a view transition. <html> carries
 * data-vt while it runs (styles/transitions.css times it). Returns false when
 * the browser refused to start one; `update` has not run then.
 */
function startPageTransition(
	direction: Direction,
	update: () => Promise<void>,
): boolean {
	const root = document.documentElement;
	root.dataset.vt = direction;
	let vt: ViewTransition;
	try {
		vt = document.startViewTransition(update);
	} catch {
		delete root.dataset.vt;
		return false;
	}
	running = vt;
	// a skipped transition rejects these; the navigation itself still happens
	vt.ready.then(
		() => {
			if (running === vt) tuneFlights('vtFar' in root.dataset);
		},
		() => {},
	);
	vt.updateCallbackDone.catch(() => {});
	vt.finished
		.catch(() => {})
		.finally(() => {
			if (running !== vt) return;
			running = null;
			delete root.dataset.vt;
			delete root.dataset.vtFar;
			for (const done of settling.splice(0)) done();
		});
	return true;
}

/** Work waiting for the running transition to end (`whenSettled`). */
const settling: (() => void)[] = [];

/**
 * Resolves once no page transition runs: at once when none does. A new page
 * puts off its heavy work with it (loading a chunk, building an index), so the
 * work does not compete with the flight for the main thread: the main thread
 * is not needed to run the flight, but the new page is live under it, and its
 * work would hold up the frames that show it.
 */
export function whenSettled(): Promise<void> {
	if (!running) return Promise.resolve();
	return new Promise((resolve) => settling.push(resolve));
}

/** A 2D affine transform, as CSS's matrix(a, b, c, d, e, f). */
type Affine = [number, number, number, number, number, number];

function mul(m: Affine, n: Affine): Affine {
	return [
		m[0] * n[0] + m[2] * n[1],
		m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3],
		m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4],
		m[1] * n[4] + m[3] * n[5] + m[5],
	];
}

const shift = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];

function parseAffine(value: unknown): Affine | null {
	const s = String(value ?? '');
	if (s === 'none' || s === '') return [1, 0, 0, 1, 0, 0];
	const m = /^matrix\(([^)]+)\)$/.exec(s);
	if (!m) return null;
	const v = m[1].split(',').map(Number);
	if (v.length !== 6 || v.some((n) => !Number.isFinite(n))) return null;
	return v as Affine;
}

/**
 * A group's keyframes with its size held at the landing size and the change
 * folded into the transform (see `tuneFlights`); `screen`, the screen's
 * height when the flight is to be kept to just past its edge. Null when the
 * keyframes are not the browser's usual ones (a size and a 2D matrix each).
 */
function flatten(
	frames: ComputedKeyframe[],
	screen: number | null,
): ComputedKeyframe[] | null {
	const end = frames.at(-1);
	const w1 = Number.parseFloat(String(end?.width ?? ''));
	const h1 = Number.parseFloat(String(end?.height ?? ''));
	if (!(w1 > 0 && h1 > 0)) return null;
	const next: ComputedKeyframe[] = [];
	for (const f of frames) {
		const w = Number.parseFloat(String(f.width ?? ''));
		const hh = Number.parseFloat(String(f.height ?? ''));
		const m = parseAffine(f.transform);
		if (!(w > 0 && hh > 0) || !m) return null;
		const s = w / w1;
		// the browser's: m about the centre of a w × hh box; this one: about the
		// centre of the w1 × h1 box, scaled by s from its top left
		let t = mul(mul(shift(w / 2, hh / 2), m), shift(-w / 2, -hh / 2));
		t = mul(t, [s, 0, 0, s, 0, 0]);
		t = mul(mul(shift(-w1 / 2, -h1 / 2), t), shift(w1 / 2, h1 / 2));
		if (screen !== null) {
			// where the box is placed (its top, before it turns): to just past the edge
			const y = Math.min(Math.max(m[5], -hh - 24), screen + 24);
			t[5] += y - m[5];
		}
		const {
			width: _w,
			height: _h,
			backdropFilter,
			...rest
		} = f as ComputedKeyframe & { backdropFilter?: string };
		const keep: ComputedKeyframe = {
			...rest,
			transform: `matrix(${t.join(', ')})`,
		};
		// a backdrop filter that changes would be kept (none does, on this site)
		if (backdropFilter && backdropFilter !== 'none') {
			keep.backdropFilter = backdropFilter;
		}
		next.push(keep);
	}
	return next;
}

/**
 * Makes every flight a compositor animation, and shortens one longer than a
 * screen.
 *
 * Where the two ends of a morph differ in size (the sticker on the page and in
 * the header), the browser animates its group's width and height along with
 * its transform, and that runs on the main thread: anything the new page does
 * meanwhile would make the flight stutter. Here each group keeps its landing
 * size the whole way and the change in size goes into its transform, as a
 * scale (the same picture, moved and scaled by the compositor alone). The
 * group's transform turns about its centre, so the scale is set about the top
 * left corner, where the browser's own size change grows from. The scale is
 * the change in width, kept square: a snapshot fills its group's width and
 * keeps its own proportions, so one whose height changes is not stretched.
 *
 * `far`: a sticker flying further than a screen (back from far down a long
 * page) would be off screen for most of its flight, then streak in. Its far
 * end is moved to just past the edge of the screen, so the whole flight is
 * seen: it comes in from above (or below) and lands.
 */
function tuneFlights(far: boolean) {
	const h = window.innerHeight;
	for (const a of document.documentElement.getAnimations({ subtree: true })) {
		const effect = a.effect as KeyframeEffect | null;
		const pseudo = effect?.pseudoElement ?? '';
		if (!effect || !pseudo.startsWith('::view-transition-group(')) continue;
		const next = flatten(
			effect.getKeyframes(),
			far && pseudo.startsWith('::view-transition-group(stk-') ? h : null,
		);
		if (next) effect.setKeyframes(next);
	}
}

/**
 * How a sticker is peeled: its own corner's --peel (lifted by a click, or at
 * rest), and the fold by hand, from whichever side it was peeled (or null).
 */
type Pose = { peel: number; hand: Hand | null };

/** The pose the Projects page's flying sticker is in now (lifted, or peeled off by hand), or null. */
function bookPose(): Pose | null {
	const el = flyingSticker();
	if (!el?.classList.contains('stk')) return null;
	const peel = Number.parseFloat(
		getComputedStyle(el).getPropertyValue('--peel'),
	);
	if (!Number.isFinite(peel)) return null;
	return { peel, hand: handOf(el) };
}

/** How the header sticker's corner and fold are pressed down once it has landed (as --peel's transition there, styles/masthead.css). */
const PRESS_MS = 420;
const pressEase = bezier(0.3, 0.7, 0.35, 1);

/**
 * The header sticker, flying in from the Projects page, takes the pose that
 * sticker was captured in, so the two images the transition cross-fades are
 * one and the same: the paper never dissolves from one pose to the other. A
 * fold by hand is drawn again at the header sticker's own size (it is kept in
 * units of the width). It is laid down once it has landed (`pressDown`).
 */
function takePose(pose: Pose | null): HTMLElement | null {
	const el = flyingSticker();
	if (!pose || !el?.classList.contains('slap-stk')) return null;
	delete el.dataset.press;
	el.dataset.posed = '';
	el.style.setProperty('--peel', pose.peel.toFixed(4));
	stopLaying(el);
	drawHand(el, pose.hand);
	// the backing, folded over, is in the picture now
	const flap = el.querySelector<HTMLImageElement>('.stk-flap');
	if (flap) flap.loading = 'eager';
	return el;
}

/**
 * The header sticker has landed: its corner and its fold are pressed down
 * flat (data-press eases the corner, styles/masthead.css; the fold is laid
 * down by script, as fast); then the flaps are put away.
 */
function pressDown(el: HTMLElement) {
	delete el.dataset.posed;
	el.dataset.press = '';
	el.style.removeProperty('--peel');
	layDown(el, PRESS_MS, pressEase);
	const done = (event?: TransitionEvent) => {
		if (event && event.propertyName !== '--peel') return;
		window.clearTimeout(timer);
		el.removeEventListener('transitionend', done);
		el.removeEventListener('transitioncancel', done);
		if (!('posed' in el.dataset)) delete el.dataset.press;
	};
	el.addEventListener('transitionend', done);
	el.addEventListener('transitioncancel', done);
	const timer = window.setTimeout(done, 1000);
}

/** Resolves once the stickers on screen have decoded, so the transition never captures a blank one. */
function stickersDecoded(): Promise<unknown> {
	// the header sticker's and the Projects page's, and a header sticker's flap that shows
	const images = document.querySelectorAll<HTMLImageElement>(
		'.stk-face img, .slap-stk[data-posed] .stk-flap',
	);
	return Promise.race([
		Promise.all([...images].map((img) => img.decode().catch(() => {}))),
		new Promise((resolve) => window.setTimeout(resolve, DECODE_TIMEOUT_MS)),
	]);
}

/**
 * Resolves once the fonts the new page is laid out in have loaded (or after
 * FONT_WAIT_MS), so it is captured in its own faces rather than swapping them
 * in during the flight. Call it once the page has been laid out: that is when
 * the browser asks for the fonts it uses.
 */
function fontsIn(): Promise<unknown> {
	void document.documentElement.offsetHeight; // laid out (already, most often)
	if (document.fonts?.status !== 'loading') {
		return Promise.resolve();
	}
	return Promise.race([
		document.fonts.ready,
		new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS)),
	]);
}

/**
 * Lives in the root layout, so it survives navigations: it remembers where the
 * reader came from, which lets the Projects page put the open sticker back in
 * place, and it runs every navigation that opens or leaves a project (a sticker,
 * the Back arrow, a tab, the browser's Back and Forward) as a view transition.
 */
export function DeskProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const [nav, setNav] = useState<{ path: string; from: string | null }>({
		path: pathname,
		from: null,
	});
	const [flight, setFlight] = useState<Desk['flight']>(null);
	// Derive "where we came from" during render, so the new page sees it on its first render.
	if (nav.path !== pathname) {
		setNav({ path: pathname, from: nav.path });
		setFlight(null);
	}

	/** The path on screen: the one the next navigation leaves. */
	const shown = useRef(pathname);
	/** View transitions waiting for the next page to be on screen. */
	const waiting = useRef<(() => void)[]>([]);
	/** True from a sticker click until the next page (or a cancel), so a second click cannot open another. */
	const busy = useRef(false);
	/** The sticker click waiting to fly (lifting, then waiting for its page); null when none is. */
	const lift = useRef<{ cancelled: boolean } | null>(null);
	/** The page the Back arrow stepped back from, until the step lands: a second press is not a second step. */
	const backing = useRef<string | null>(null);

	useEffect(() => {
		watchPageData();
		const capture = { capture: true };
		window.addEventListener('pointerdown', onPressDuringTransition, capture);
		window.addEventListener('click', onClickDuringTransition, capture);
		window.addEventListener('pointerdown', onPointerInput, capture);
		window.addEventListener('keydown', onKeyInput, capture);
		for (const type of TRANSITION_EVENTS) {
			window.addEventListener(type, onTransitionAnimation, capture);
		}
		const watch = { capture: true, passive: true };
		for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) {
			window.addEventListener(type, onTouches, watch);
		}
		window.addEventListener('scroll', onScrolled, watch);
		return () => {
			window.removeEventListener('pointerdown', onPointerInput, capture);
			window.removeEventListener('keydown', onKeyInput, capture);
			for (const type of TRANSITION_EVENTS) {
				window.removeEventListener(type, onTransitionAnimation, capture);
			}
			for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) {
				window.removeEventListener(type, onTouches, watch);
			}
			window.removeEventListener('scroll', onScrolled, watch);
			window.removeEventListener(
				'pointerdown',
				onPressDuringTransition,
				capture,
			);
			window.removeEventListener('click', onClickDuringTransition, capture);
		};
	}, []);

	// The new page is in the DOM, and its own layout effects (which scroll it
	// and move focus) have run: the transition can capture it now.
	useLayoutEffect(() => {
		shown.current = pathname;
		busy.current = false;
		backing.current = null;
		const resolve = waiting.current;
		waiting.current = [];
		for (const done of resolve) done();
	}, [pathname]);

	/**
	 * Changes the page with `go`, as a view transition when the browser can.
	 * `to` says where it goes, asked again when the transition is ready for it.
	 */
	const morph = useCallback(
		(to: () => string, go: () => void, push = false) => {
			const root = document.documentElement;
			const from = window.location.href;
			const before = flyingSticker()?.getBoundingClientRect().top;
			const update = async () => {
				// Back or Forward pressed after the flight began, before the page changed:
				// that step wins, and this one neither pushes nor animates.
				if (push && window.location.href !== from) {
					running?.skipTransition();
					busy.current = false;
					return;
				}
				// the sticker that flies, as the transition captured it
				const pose = projectPath.test(to()) ? bookPose() : null;
				// Unless a newer step (Back pressed twice in a row) already put that
				// page on screen, change the page and wait until it is in.
				if (shown.current !== to()) {
					const shownNext = new Promise<void>((resolve) => {
						const timer = window.setTimeout(done, PAGE_TIMEOUT_MS);
						function done() {
							window.clearTimeout(timer);
							waiting.current = waiting.current.filter((w) => w !== done);
							resolve();
						}
						waiting.current.push(done);
					});
					go();
					await shownNext;
				}
				busy.current = false; // also when the page timed out
				// A sticker that would fly further than a screen (back from far down a
				// long page) would be off screen for most of its flight: its flight is
				// kept to just past the edge of the screen (tuneFlights).
				const after = flyingSticker()?.getBoundingClientRect().top;
				if (
					before !== undefined &&
					after !== undefined &&
					Math.abs(after - before) > window.innerHeight
				) {
					root.dataset.vtFar = '';
				}
				const landing = takePose(pose);
				if (landing) {
					running?.finished.catch(() => {}).finally(() => pressDown(landing));
				}
				// the page has been laid out (above): its fonts are on their way
				await Promise.all([stickersDecoded(), fontsIn()]);
			};
			const direction = projectPath.test(to()) ? 'open' : 'close';
			if (!startPageTransition(direction, update)) go();
		},
		[],
	);

	const cancelLift = useCallback(() => {
		if (!lift.current) return;
		lift.current.cancelled = true;
		lift.current = null;
		busy.current = false;
		setFlight(null);
	}, []);

	const intent = useCallback(
		(href: string) => {
			router.prefetch(href);
		},
		[router],
	);

	const open = useCallback(
		(href: string, peeled = false) => {
			if (busy.current) return false;
			busy.current = true;
			scrolled.set(shown.current, window.scrollY);
			// a link that does not prefetch (a product page) starts fetching now, if
			// a pointer on it has not already; for the rest it is a no-op
			router.prefetch(href);
			const go = () => router.push(href, { scroll: false });
			if (!canAnimate()) {
				go();
				return true;
			}
			// A click, its page in: it flies at once, from the pose it is in (the
			// flight is its lift), so the frame after the click is the flight's
			// first. (One peeled off by hand keeps its lift, below: it flies as
			// soon as its page is in, which it is then.)
			const self = { cancelled: false };
			lift.current = self;
			if (!peeled && pageReady(href)) {
				// (after this task: a tab clicked in the same one still wins)
				queueMicrotask(() => {
					if (self.cancelled) return;
					lift.current = null;
					flushSync(() => setFlight({ href, lift: false }));
					morph(() => href, go, true);
				});
				return true;
			}
			setFlight({ href, lift: true });
			const bob = window.setTimeout(
				() => setFlight({ href, lift: true, waiting: true }),
				WAIT_BOB_MS,
			);
			// Its page is not in yet: the sticker lifts, and waits lifted (the
			// page still drawing) until its page is in, with the stylesheet and
			// fonts it asked for; only then does it fly, so the flight never
			// freezes the screen on a page still loading. A page too slow for
			// that opens without the flight.
			Promise.all([
				new Promise((resolve) =>
					window.setTimeout(resolve, peeled ? 0 : LIFT_MS),
				),
				pageLoaded(href, LOAD_WAIT_MS),
			]).then(([, loaded]) => {
				window.clearTimeout(bob);
				if (self.cancelled) return;
				lift.current = null;
				if (loaded) morph(() => href, go, true);
				else go();
			});
			return true;
		},
		[router, morph],
	);

	const navigate = useCallback<Desk['navigate']>(
		(event, href, back = false) => {
			cancelLift();
			const to = new URL(href, window.location.href).pathname;
			// The page before this one is where the link goes (the project was opened
			// from it): step back, so the browser's Back does not open the project
			// again. The step runs as Back does (popstate, below).
			if (back && previousEntryIs(to)) {
				event.preventDefault();
				if (backing.current === shown.current) return;
				backing.current = shown.current;
				window.history.back();
				return;
			}
			if (!morphs(shown.current, to)) return;
			scrolled.set(shown.current, window.scrollY);
			if (!canAnimate()) return;
			event.preventDefault();
			if (busy.current) return;
			busy.current = true;
			morph(
				() => to,
				() => router.push(href, { scroll: false }),
				true,
			);
		},
		[router, morph, cancelLift],
	);

	// The browser's Back and Forward (and swipes). Next.js handles popstate
	// synchronously, which would swap the page before a view transition could
	// capture the old one. So when the step opens or leaves a project, this
	// listener (capturing, so it runs before Next's) holds the event back, starts
	// the transition, and hands the event to Next.js from inside its update.
	useEffect(() => {
		let replaying = false;
		function onPopState(event: PopStateEvent) {
			if (replaying) return;
			cancelLift(); // Back or Forward wins over a sticker still lifting
			const to = window.location.pathname;
			if (morphs(shown.current, to)) {
				// the page being left (the browser restores the next one's scroll
				// after this event); still coasting from a flick, it stops here,
				// so the next page is where it puts itself
				scrolled.set(shown.current, window.scrollY);
				stopCoasting();
			}
			// Back or Forward during a flight: the flight ends where it is and the
			// step happens at once, rather than a second flight after a pause
			if (running) {
				running.skipTransition();
				return;
			}
			if (
				!morphs(shown.current, to) ||
				!canAnimate() ||
				// the browser already animated it (a swipe that showed the page)
				event.hasUAVisualTransition
			) {
				return;
			}
			event.stopImmediatePropagation();
			// The browser restores the next page's scroll position right after this
			// event, onto the page still on screen. Keep that page where it is until
			// the transition has captured it; the next page sets its own.
			keepScroll();
			busy.current = true;
			// Forward to a project: its sticker on this page is the one that flies,
			// so it takes its name before the transition captures this page.
			if (projectPath.test(to)) {
				flushSync(() => setFlight({ href: to, lift: false }));
			}
			// the entry Back or Forward lands on by the time the transition is ready
			morph(
				() => window.location.pathname,
				() => {
					replaying = true;
					try {
						// the current entry's state, in case another step came in meanwhile
						window.dispatchEvent(
							new PopStateEvent('popstate', { state: window.history.state }),
						);
					} finally {
						replaying = false;
					}
				},
			);
		}
		window.addEventListener('popstate', onPopState, { capture: true });
		return () => {
			window.removeEventListener('popstate', onPopState, { capture: true });
			if (lift.current) lift.current.cancelled = true;
		};
	}, [cancelLift, morph]);

	const value = useMemo(
		() => ({
			from: nav.from,
			flight,
			open,
			intent,
			navigate,
			remember: () => scrolled.set(shown.current, window.scrollY),
			scrollOf: (path: string) => scrolled.get(path),
		}),
		[nav.from, flight, open, intent, navigate],
	);
	return <DeskContext value={value}>{children}</DeskContext>;
}

export function useDesk(): Desk {
	return useContext(DeskContext);
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Call right after a page has set the scroll position itself (the Projects page
 * where it was left, a project at the top), so the browser does not undo it.
 * On Back and Forward the browser restores the scroll position it saved for that
 * history entry, and it does so after the new page has rendered, just before the
 * next frame. This puts the page's own position back on that frame, before it
 * paints.
 */
export function keepScroll() {
	const x = window.scrollX;
	const y = window.scrollY;
	requestAnimationFrame(() => {
		if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
	});
}
