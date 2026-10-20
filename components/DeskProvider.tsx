'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

/** How long the peel plays before we navigate (the keyframes run 0.42s). */
const PEEL_MS = 400;

type Desk = {
	/** The path of the page we came from on the last client-side navigation; null after a full page load. */
	from: string | null;
	/** The href of the sticker that is peeling off, if one is. */
	peeling: string | null;
	/** Peel the sticker for `href` off the page, then open it. Ignored while another peel is under way. */
	peel: (href: string) => void;
	/** Drop a peel that has not opened its project yet, because the reader went somewhere else. */
	cancelPeel: () => void;
};

const DeskContext = createContext<Desk>({
	from: null,
	peeling: null,
	peel: () => {},
	cancelPeel: () => {},
});

/**
 * Lives in the root layout, so it survives navigations: it remembers where the
 * reader came from, which lets the Projects page re-stick the sticker that was
 * open, and it owns the peel, so another navigation can cancel it.
 */
export function DeskProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const [nav, setNav] = useState<{ path: string; from: string | null }>({
		path: pathname,
		from: null,
	});
	const [peeling, setPeeling] = useState<string | null>(null);
	// Derive "where we came from" during render, so the new page sees it on its first render.
	if (nav.path !== pathname) {
		setNav({ path: pathname, from: nav.path });
		setPeeling(null);
	}

	/** True from the click until the next page (or a cancel), so a second click cannot start another peel. */
	const busy = useRef(false);
	const timer = useRef<number | undefined>(undefined);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new page means any peel has finished
	useEffect(() => {
		busy.current = false;
	}, [pathname]);

	const peel = useCallback(
		(href: string) => {
			if (busy.current) return;
			busy.current = true;
			setPeeling(href);
			// a link that does not prefetch (a product page) starts fetching now,
			// so the page is ready by the end of the peel; for the rest it is a no-op
			router.prefetch(href);
			timer.current = window.setTimeout(() => {
				timer.current = undefined;
				router.push(href, { scroll: false });
			}, PEEL_MS);
		},
		[router],
	);

	const cancelPeel = useCallback(() => {
		if (!busy.current) return;
		window.clearTimeout(timer.current);
		timer.current = undefined;
		busy.current = false;
		setPeeling(null);
	}, []);

	// Browser Back or Forward during the peel wins over the project it was about to open.
	useEffect(() => {
		window.addEventListener('popstate', cancelPeel);
		return () => {
			window.removeEventListener('popstate', cancelPeel);
			window.clearTimeout(timer.current);
		};
	}, [cancelPeel]);

	const value = useMemo(
		() => ({ from: nav.from, peeling, peel, cancelPeel }),
		[nav.from, peeling, peel, cancelPeel],
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
 * Call right after a page has set the scroll position itself (the re-stuck sticker
 * in the middle, a project at the top), so the browser does not undo it. On Back and
 * Forward the browser restores the scroll position it saved for that history entry,
 * and it does so after the new page has rendered, just before the next frame. This
 * puts the page's own position back on that frame, before it paints.
 */
export function keepScroll() {
	const x = window.scrollX;
	const y = window.scrollY;
	requestAnimationFrame(() => {
		if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
	});
}
