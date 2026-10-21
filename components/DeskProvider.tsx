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

/** How long a clicked sticker lifts off the page before it flies (the lift runs 0.1s). */
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

/** Which way the sticker flies: up into the header, or back down onto the page. */
type Direction = 'open' | 'close';

type Desk = {
	/** The path of the page we came from on the last client-side navigation; null after a full page load. */
	from: string | null;
	/**
	 * The href of the sticker on the Projects page that flies in the running
	 * transition, and whether it is lifting off the page first (a click) or not
	 * (Forward). Null when no sticker on this page is about to fly.
	 */
	flight: { href: string; lift: boolean; waiting?: boolean } | null;
	/**
	 * Open a project from its sticker: lift it off the page, then fly it into the
	 * header. Ignored while another opens: then it returns false.
	 */
	open: (href: string) => boolean;
	/** A pointer or the focus is on a sticker that does not prefetch: its page starts loading. */
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
}

/**
 * Resolves true once `path`'s data has come in (or needs no request: Next.js
 * has it already), false if it is still loading after `max` ms. Next.js asks
 * for a page in up to two requests, one after the other, a moment after it is
 * told to: the page counts as in once none has been on its way for 50 ms, or,
 * if none was ever asked for, 200 ms on.
 */
function pageLoaded(path: string, max: number): Promise<boolean> {
	return new Promise((resolve) => {
		const start = performance.now();
		const tick = () => {
			const now = performance.now();
			const last = loaded.get(path);
			if (
				(loading.get(path) ?? 0) === 0 &&
				(last === undefined ? now - start >= 200 : now - last >= 50)
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
 * data-vt while it runs, which names the book and the stage for it
 * (styles/transitions.css). Returns false when the browser refused to start one;
 * `update` has not run then.
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
			if (running === vt && 'vtFar' in root.dataset) shortenFlight();
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
			delete root.dataset.vtBookFar;
		});
	return true;
}

/**
 * A sticker flying further than a screen (back from far down a long page)
 * would be off screen for most of its flight, then streak in. Its far end is
 * moved to just past the edge of the screen, so the whole flight is seen: it
 * comes in from above (or below) and lands.
 */
function shortenFlight() {
	const h = window.innerHeight;
	for (const a of document.documentElement.getAnimations({ subtree: true })) {
		const effect = a.effect as KeyframeEffect | null;
		if (!effect?.pseudoElement?.startsWith('::view-transition-group(stk-')) {
			continue;
		}
		const frames = effect.getKeyframes();
		let changed = false;
		for (const f of frames) {
			const m = /^matrix\(([^)]+)\)$/.exec(String(f.transform ?? ''));
			const size = Number.parseFloat(String(f.height ?? ''));
			if (!m || !Number.isFinite(size)) continue;
			const v = m[1].split(',').map(Number);
			if (v.length !== 6 || v.some((n) => !Number.isFinite(n))) continue;
			const y = Math.min(Math.max(v[5], -size - 24), h + 24);
			if (y === v[5]) continue;
			v[5] = y;
			f.transform = `matrix(${v.join(', ')})`;
			changed = true;
		}
		if (changed) effect.setKeyframes(frames);
	}
}

/** How a sticker's corner is peeled: --peel, and the angle (degrees) it folds along. */
type Pose = { peel: number; fold: number };

/** The pose the Projects page's flying sticker is in now (lifted, or peeled off by hand), or null. */
function bookPose(): Pose | null {
	const el = flyingSticker();
	if (!el?.classList.contains('stk')) return null;
	const style = getComputedStyle(el);
	const peel = Number.parseFloat(style.getPropertyValue('--peel'));
	const fold = Number.parseFloat(style.getPropertyValue('--fold'));
	if (!Number.isFinite(peel)) return null;
	return { peel, fold: Number.isFinite(fold) ? fold : 45 };
}

/**
 * The header sticker, flying in from the Projects page, takes the pose that
 * sticker was captured in, so the two images the transition cross-fades are
 * one and the same: the corner never dissolves from one pose to the other.
 * It lays the corner down once it has landed (`pressDown`).
 */
function takePose(pose: Pose | null): HTMLElement | null {
	const el = flyingSticker();
	if (!pose || !el?.classList.contains('slap-stk')) return null;
	delete el.dataset.press;
	el.dataset.posed = '';
	el.style.setProperty('--peel', pose.peel.toFixed(4));
	el.style.setProperty('--fold', `${pose.fold.toFixed(2)}deg`);
	// the backing, folded over, is in the picture now
	const flap = el.querySelector<HTMLImageElement>('.stk-flap');
	if (flap) flap.loading = 'eager';
	return el;
}

/**
 * The header sticker has landed: its corner is pressed down flat (data-press
 * eases it, styles/masthead.css); then the flap is put away.
 */
function pressDown(el: HTMLElement) {
	delete el.dataset.posed;
	el.dataset.press = '';
	el.style.removeProperty('--peel');
	el.style.removeProperty('--fold');
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
		return () => {
			window.removeEventListener('pointerdown', onPointerInput, capture);
			window.removeEventListener('keydown', onKeyInput, capture);
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
			const bookBefore = document
				.querySelector('.book')
				?.getBoundingClientRect().top;
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
				// long page) would be off screen for most of its flight: it drops onto
				// its spot instead, and the socials stay out of it (transitions.css).
				const after = flyingSticker()?.getBoundingClientRect().top;
				if (
					before !== undefined &&
					after !== undefined &&
					Math.abs(after - before) > window.innerHeight
				) {
					root.dataset.vtFar = '';
				}
				// A book that would slide most of a screen (a sticker opened from far
				// down the Projects page, or back to it) stays still: its old leaf
				// goes, and the new page fades in where it is.
				const bookAfter = document
					.querySelector('.book')
					?.getBoundingClientRect().top;
				if (
					bookBefore !== undefined &&
					bookAfter !== undefined &&
					Math.abs(bookAfter - bookBefore) > window.innerHeight * 0.4
				) {
					root.dataset.vtBookFar = '';
				}
				const landing = takePose(pose);
				if (landing) {
					running?.finished.catch(() => {}).finally(() => pressDown(landing));
				}
				await stickersDecoded();
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
		(href: string) => {
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
			setFlight({ href, lift: true });
			const self = { cancelled: false };
			lift.current = self;
			const bob = window.setTimeout(
				() => setFlight({ href, lift: true, waiting: true }),
				WAIT_BOB_MS,
			);
			// The sticker lifts, and waits lifted (the page still drawing) until
			// its page is in; only then does it fly, so the flight never freezes
			// the screen on a page still loading. A page too slow for that opens
			// without the flight.
			Promise.all([
				new Promise((resolve) => window.setTimeout(resolve, LIFT_MS)),
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
			// the page being left (the browser restores the next one's scroll after this event)
			if (morphs(shown.current, to))
				scrolled.set(shown.current, window.scrollY);
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
