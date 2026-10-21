'use client';

import Link from 'next/link';
import {
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	useEffect,
	useLayoutEffect,
	useRef,
} from 'react';
import type { Project } from '@/content/projects';
import {
	canAnimate,
	keepScroll,
	lastInput,
	stickerName,
	useDesk,
} from './DeskProvider';
import { usePeel, usePeelHint } from './usePeel';

type Props = Pick<Project, 'sticker'> & {
	href: string;
	stickerKey: Project['key'];
	label: string;
	/**
	 * False for a project with its own product page: prefetching that route
	 * with the page would make this page preload the product page's fonts and
	 * stylesheet. A pointer on the sticker (or the focus) fetches it instead,
	 * and the click waits for it while the sticker lifts.
	 */
	prefetch?: boolean;
};

/**
 * A sticker on the Projects page. A plain click (or Enter, or Space) lifts it
 * off the page, then opens the project in a view transition that flies it into
 * the header (it shares its view-transition-name with the header sticker).
 * Coming back from that project flies it back down onto this spot.
 *
 * It can also be peeled by hand: its bottom-right corner (the grip) follows a
 * mouse or a finger that pulls it, and let go far enough in (or flicked) the
 * sticker comes off and flies from there; let go sooner and the corner springs
 * back down (components/usePeel.ts). A finger on the grip that goes any
 * other way than up the diagonal scrolls the page, as anywhere else on it.
 */
export function StickerLink({
	href,
	stickerKey,
	label,
	sticker,
	prefetch,
}: Props) {
	const desk = useDesk();
	const ref = useRef<HTMLAnchorElement>(null);
	const returning = desk.from === href;
	// Only the sticker that flies is named: one that is not would leave the page
	// in a transition of its own and drift apart from the book.
	const flies = desk.flight ? desk.flight.href === href : returning;
	const lifting = desk.flight?.href === href && desk.flight.lift;
	const waiting = lifting && desk.flight?.waiting;
	// about to be clicked: its page starts loading now
	const intent = prefetch === false ? () => desk.intent(href) : undefined;
	// peeled off by hand: it opens from the pose it was let go in
	const peel = usePeel(ref, () => desk.open(href));
	usePeelHint(ref);

	// The open was called off while it lifted (Back or Forward won): a sticker
	// peeled off by hand goes back down.
	const wasLifting = useRef(false);
	useEffect(() => {
		if (wasLifting.current && !lifting) peel.drop();
		wasLifting.current = Boolean(lifting);
	}, [lifting, peel]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once, when the page mounts after leaving a project
	useLayoutEffect(() => {
		const el = ref.current;
		if (!returning || !el) return;
		// Back from this sticker's project: the page is where it was when the
		// project opened (as the browser's Back would leave it), and the sticker,
		// focused, is in view; only one that would be off screen is brought in.
		// All before the transition captures the page, so it lands there.
		window.scrollTo({
			top: desk.scrollOf(window.location.pathname) ?? 0,
			behavior: 'instant',
		});
		const fit = () => {
			const r = el.getBoundingClientRect();
			if (r.bottom <= 0 || r.top >= window.innerHeight) {
				el.scrollIntoView({ block: 'center', behavior: 'instant' });
			} else if (r.top < 0 || r.bottom > window.innerHeight) {
				el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
			}
		};
		fit();
		keepScroll();
		// Opened with a pointer (a click, a tap, a peel), it comes back focused
		// but quiet: no ring and no lift until a key is pressed, as the focus a
		// tap gives shows none. (Chrome takes a script's focus for the
		// keyboard's when a drag, which focuses nothing, opened the project.)
		const quiet = lastInput() === 'pointer';
		if (quiet) el.dataset.quiet = '';
		el.focus({ preventScroll: true, focusVisible: !quiet } as FocusOptions);
		// the page may still settle (or the browser restore its own scroll) a frame on
		requestAnimationFrame(() => requestAnimationFrame(fit));
	}, []);

	function onClick(e: MouseEvent<HTMLAnchorElement>) {
		if (peel.dragged(e)) {
			// the click a peel makes as it ends: the peel already opened it, or put it back
			e.preventDefault();
			return;
		}
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
			return; // new tab, new window, download: let the browser do it
		}
		peel.stop(); // the hint or a spring stops where it is, and it lifts from there
		if (!canAnimate()) {
			// no transition: the link navigates straight away, and Back comes back here
			desk.remember();
			return;
		}
		e.preventDefault();
		desk.open(href);
	}

	// Space opens it too, as Enter does (on key up, as a button does); it does
	// not scroll the page while a sticker has the focus.
	const space = useRef(false);
	function onKeyDown(e: KeyboardEvent<HTMLAnchorElement>) {
		delete e.currentTarget.dataset.quiet; // a key: the focus shows
		if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
			return; // Shift+Space and the rest keep their own meaning
		}
		e.preventDefault();
		if (!e.repeat) space.current = true;
	}
	function onKeyUp(e: KeyboardEvent<HTMLAnchorElement>) {
		if (e.key !== ' ' || !space.current) return;
		space.current = false;
		e.preventDefault();
		ref.current?.click();
	}
	function onPointerDown(e: PointerEvent<HTMLAnchorElement>) {
		intent?.();
		peel.onPointerDown(e);
	}
	// a pointer or the focus arriving while the hint plays: the hint gives way
	function onPointerEnter() {
		intent?.();
		peel.calm();
	}
	function onFocus() {
		intent?.();
		peel.calm();
	}

	return (
		<Link
			ref={ref}
			className={`stk stk--${stickerKey}${lifting ? ' is-lifting' : ''}${waiting ? ' is-waiting' : ''}`}
			style={
				flies ? { viewTransitionName: stickerName(stickerKey) } : undefined
			}
			href={href}
			prefetch={prefetch}
			scroll={false}
			aria-label={label}
			onClick={onClick}
			onKeyDown={onKeyDown}
			onKeyUp={onKeyUp}
			onBlur={(e) => {
				space.current = false;
				delete e.currentTarget.dataset.quiet;
			}}
			onPointerEnter={onPointerEnter}
			onPointerDown={onPointerDown}
			onDragStart={peel.onDragStart}
			onFocus={onFocus}
		>
			<span className="stk-body">
				<span className="stk-face">
					<img src={sticker.src} alt="" />
				</span>
				<span className="stk-flapwrap">
					{/* the curled-back corner; lazy keeps it out of the page's preloads */}
					<img className="stk-flap" src={sticker.back} alt="" loading="lazy" />
				</span>
				{/* the corner to take hold of: peel it back (usePeel) */}
				<span className="stk-grip" aria-hidden="true" />
			</span>
		</Link>
	);
}
