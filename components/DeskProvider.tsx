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
 * The longest a view transition holds the old page on screen while the next one
 * loads. Past it the transition runs with what is there (browsers give up at 4s).
 */
const PAGE_TIMEOUT_MS = 3000;
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
	flight: { href: string; lift: boolean } | null;
	/** Open a project from its sticker: lift it off the page, then fly it into the header. Ignored while another opens. */
	open: (href: string) => void;
	/**
	 * A link's onNavigate: when the link opens or leaves a project, it takes the
	 * navigation over and runs it as a view transition. Any other navigation
	 * goes ahead as usual, and either way a sticker still lifting is dropped.
	 */
	navigate: (event: { preventDefault: () => void }, href: string) => void;
};

const DeskContext = createContext<Desk>({
	from: null,
	flight: null,
	open: () => {},
	navigate: () => {},
});

const projectPath = /^\/projects\/[^/]+\/?$/;

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

/** The transition that runs now, so an older one that is skipped leaves the newer one's state alone. */
let running: ViewTransition | null = null;

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
	vt.ready.catch(() => {});
	vt.updateCallbackDone.catch(() => {});
	vt.finished
		.catch(() => {})
		.finally(() => {
			if (running !== vt) return;
			running = null;
			delete root.dataset.vt;
		});
	return true;
}

/** Resolves once the stickers on screen have decoded, so the transition never captures a blank one. */
function stickersDecoded(): Promise<unknown> {
	// the header sticker's and the Projects page's
	const images = document.querySelectorAll<HTMLImageElement>('.stk-face img');
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
	const liftTimer = useRef<number | undefined>(undefined);

	// The new page is in the DOM, and its own layout effects (which scroll it
	// and move focus) have run: the transition can capture it now.
	useLayoutEffect(() => {
		shown.current = pathname;
		busy.current = false;
		const resolve = waiting.current;
		waiting.current = [];
		for (const done of resolve) done();
	}, [pathname]);

	/**
	 * Changes the page with `go`, as a view transition when the browser can.
	 * `to` says where it goes, asked again when the transition is ready for it.
	 */
	const morph = useCallback((to: () => string, go: () => void) => {
		const update = async () => {
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
			await stickersDecoded();
		};
		const direction = projectPath.test(to()) ? 'open' : 'close';
		if (!startPageTransition(direction, update)) go();
	}, []);

	const cancelLift = useCallback(() => {
		if (liftTimer.current === undefined) return;
		window.clearTimeout(liftTimer.current);
		liftTimer.current = undefined;
		busy.current = false;
		setFlight(null);
	}, []);

	const open = useCallback(
		(href: string) => {
			if (busy.current) return;
			busy.current = true;
			// a link that does not prefetch (a product page) starts fetching now,
			// so it is ready by the end of the lift; for the rest it is a no-op
			router.prefetch(href);
			const go = () => router.push(href, { scroll: false });
			if (!canAnimate()) {
				go();
				return;
			}
			setFlight({ href, lift: true });
			liftTimer.current = window.setTimeout(() => {
				liftTimer.current = undefined;
				morph(() => href, go);
			}, LIFT_MS);
		},
		[router, morph],
	);

	const navigate = useCallback<Desk['navigate']>(
		(event, href) => {
			cancelLift();
			const to = new URL(href, window.location.href).pathname;
			if (!morphs(shown.current, to) || !canAnimate()) return;
			event.preventDefault();
			if (busy.current) return;
			busy.current = true;
			morph(
				() => to,
				() => router.push(href, { scroll: false }),
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
			window.clearTimeout(liftTimer.current);
		};
	}, [cancelLift, morph]);

	const value = useMemo(
		() => ({ from: nav.from, flight, open, navigate }),
		[nav.from, flight, open, navigate],
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
 * Call right after a page has set the scroll position itself (the returning
 * sticker in the middle, a project at the top), so the browser does not undo it.
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
