'use client';

import Link from 'next/link';
import {
	type CSSProperties,
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

/**
 * How long (ms) a pointer rests on a sticker that does not prefetch before its
 * page starts loading: one passing over it does not fetch a product page's
 * data, stylesheet and fonts for nothing. Resting: it has not moved more than
 * REST_PX since; each move further starts the wait again, so a pointer
 * crossing the sticker, however slowly, never comes to rest on it.
 */
const INTENT_MS = 100;
const REST_PX = 4;
/** How far (px) a press may move and still show pressed: further, it is not a click or a tap. */
const PRESS_SLOP = 10;

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
 * A sticker on the Projects page. A plain click (or Enter, or Space) opens the
 * project in a view transition that flies it into the header (it shares its
 * view-transition-name with the header sticker): at once when the project's
 * page is in, or lifted off the page while it waits for it.
 * Coming back from that project flies it back down onto this spot.
 *
 * It can also be peeled by hand, from any side: its edge, all round (the
 * grips), folds back under a mouse or a finger that pulls it, and let go far
 * enough in (or flicked) the sticker comes off and flies from there; let go
 * sooner and it springs back down (components/usePeel.ts). A mouse over an
 * edge lifts that edge a little. A finger on an edge that goes any other way
 * than into the sticker, leaning (or straight in, after holding still a
 * moment), scrolls the page, as anywhere else on it; the middle is the page.
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
	// about to be clicked: its page starts loading now (a pointer that only
	// passes over it on its way elsewhere fetches nothing: it has to rest on
	// it a moment, INTENT_MS, or press)
	const intent = prefetch === false ? () => desk.intent(href) : undefined;
	/** The pointer's wait to come to rest on it: where it was when the wait began, and whether it asked already. */
	const resting = useRef({ timer: 0, x: 0, y: 0, asked: false });
	useEffect(() => () => window.clearTimeout(resting.current.timer), []);
	/** The pointer is at (x, y): it may come to rest there. */
	function restAt(x: number, y: number) {
		const r = resting.current;
		window.clearTimeout(r.timer);
		if (!intent || r.asked) return;
		r.x = x;
		r.y = y;
		r.timer = window.setTimeout(() => {
			r.asked = true;
			intent();
		}, INTENT_MS);
	}
	// peeled off by hand: it opens from the pose it was let go in, at once
	const peel = usePeel(ref, () => desk.open(href, true));
	usePeelHint(ref);

	/**
	 * Pressed (a click or a tap on its way), it comes up a little at once
	 * (data-pressed, styles/stickers.css): the screen answers the press even
	 * where the flight is slow to start (a slow phone holds the screen still
	 * while the new page is put in place). It stays up for the flight to start
	 * from; a press that does not click (a drag, a scroll) lets it down. A
	 * press on the edge (a grip) may be a peel, and paper being peeled does not
	 * hop first: it comes up only as it lets go, if it was a tap or a click.
	 */
	const pressing = useRef(0);
	const pressedAt = useRef({ x: 0, y: 0 });
	/** The press in hand is on a grip, and comes up only if it lets go as a tap. */
	const gripPress = useRef(false);
	const unpress = () => {
		window.clearTimeout(pressing.current);
		const el = ref.current;
		if (el) delete el.dataset.pressed;
	};
	useEffect(() => () => window.clearTimeout(pressing.current), []);

	// The open was called off before it flew, while it lifted or in the task
	// it was let go in (Back or Forward won): a sticker peeled off by hand goes
	// back down. (Once it flies, the page changes: this one is gone.)
	const opening = desk.flight?.href === href;
	const wasOpening = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: unpress reads only refs
	useEffect(() => {
		if (wasOpening.current && !opening) {
			peel.drop();
			unpress();
		}
		wasOpening.current = opening;
	}, [opening, peel]);

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
			unpress();
			return;
		}
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
			unpress();
			return; // new tab, new window, download: let the browser do it
		}
		peel.stop(); // the hint or a spring stops where it is, and it lifts from there
		if (!canAnimate()) {
			// no transition: the link navigates straight away, and Back comes back here
			desk.remember();
			return;
		}
		e.preventDefault();
		// it flies from the press (kept up for it); another is on its way: a
		// lifted edge goes back down
		window.clearTimeout(pressing.current);
		if (!desk.open(href)) {
			peel.drop();
			unpress();
		}
	}

	// Space opens it too, as Enter does (on key up, as a button does); it does
	// not scroll the page while a sticker has the focus.
	const space = useRef(false);
	function onKeyDown(e: KeyboardEvent<HTMLAnchorElement>) {
		// a key: the focus shows. Browsers will not turn :focus-visible on for
		// focus they already gave quietly, so the sticker says so itself.
		const el = e.currentTarget;
		if ('quiet' in el.dataset) {
			delete el.dataset.quiet;
			el.dataset.keyed = '';
		}
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
		window.clearTimeout(resting.current.timer);
		resting.current.asked = true;
		intent?.();
		const onGrip = peel.onPointerDown(e);
		gripPress.current = false;
		if (
			e.isPrimary &&
			e.button === 0 &&
			!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) &&
			canAnimate()
		) {
			window.clearTimeout(pressing.current);
			pressedAt.current = { x: e.clientX, y: e.clientY };
			if (onGrip) gripPress.current = true;
			else e.currentTarget.dataset.pressed = '';
		}
	}
	// let go: the click comes at once if it is one (it keeps the press up); a
	// press on the edge that stayed a tap comes up now, for the flight to start from
	function onPointerUp(e: PointerEvent<HTMLAnchorElement>) {
		if (gripPress.current) {
			gripPress.current = false;
			if (peel.tapping()) e.currentTarget.dataset.pressed = '';
		}
		window.clearTimeout(pressing.current);
		pressing.current = window.setTimeout(unpress, 200);
	}
	// a pointer or the focus arriving while the hint plays: the hint gives way
	function onPointerEnter(e: PointerEvent<HTMLAnchorElement>) {
		resting.current.asked = false;
		restAt(e.clientX, e.clientY);
		peel.calm();
	}
	function onPointerMove(e: PointerEvent<HTMLAnchorElement>) {
		// a press that sets off (a drag, a finger scrolling by hand) is not a click
		const at = pressedAt.current;
		if (
			'pressed' in e.currentTarget.dataset &&
			Math.hypot(e.clientX - at.x, e.clientY - at.y) > PRESS_SLOP
		) {
			unpress();
		}
		const r = resting.current;
		if (Math.hypot(e.clientX - r.x, e.clientY - r.y) > REST_PX) {
			restAt(e.clientX, e.clientY);
		}
		peel.hover(e);
	}
	function onPointerLeave(e: PointerEvent<HTMLAnchorElement>) {
		window.clearTimeout(resting.current.timer);
		// (a finger leaves as it lifts, before its click: only a mouse dragged off lets go)
		if (e.pointerType === 'mouse') unpress();
		peel.unhover();
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
			// a press off the grips (the seal's ribbon, say) is a click, never a drag of the link
			draggable={false}
			aria-label={label}
			onClick={onClick}
			onKeyDown={onKeyDown}
			onKeyUp={onKeyUp}
			onBlur={(e) => {
				space.current = false;
				delete e.currentTarget.dataset.quiet;
				delete e.currentTarget.dataset.keyed;
			}}
			onPointerEnter={onPointerEnter}
			onPointerMove={onPointerMove}
			onPointerLeave={onPointerLeave}
			onPointerDown={onPointerDown}
			onPointerUp={onPointerUp}
			onPointerCancel={unpress}
			onDragStart={peel.onDragStart}
			onFocus={onFocus}
		>
			<span
				className="stk-body"
				style={{ '--back': `url("${sticker.back}")` } as CSSProperties}
			>
				<span className="stk-face">
					<span className="stk-cut">
						<img src={sticker.src} alt="" />
					</span>
				</span>
				<span className="stk-flapwrap">
					<span className="stk-cut">
						{/* the curled-back corner; lazy keeps it out of the page's preloads */}
						<img
							className="stk-flap"
							src={sticker.back}
							alt=""
							loading="lazy"
						/>
					</span>
				</span>
				{/* a fold by hand, from any side (components/fold.ts) */}
				<span className="stk-handwrap">
					<span className="stk-hold">
						<span className="stk-hand" />
					</span>
				</span>
				{/* the edge to take hold of, all round: peel it back (usePeel) */}
				<span className="stk-grips" aria-hidden="true">
					<span className="stk-grip" data-side="top" />
					<span className="stk-grip" data-side="bottom" />
					<span className="stk-grip" data-side="left" />
					<span className="stk-grip" data-side="right" />
				</span>
				<span className="stk-mid" aria-hidden="true" />
			</span>
		</Link>
	);
}
