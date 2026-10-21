'use client';

import Link from 'next/link';
import { type MouseEvent, useLayoutEffect, useRef } from 'react';
import type { Project } from '@/content/projects';
import { canAnimate, keepScroll, stickerName, useDesk } from './DeskProvider';

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
 * A sticker on the Projects page. A plain click lifts it off the page, then
 * opens the project in a view transition that flies it into the header (it
 * shares its view-transition-name with the header sticker). Coming back from
 * that project flies it back down onto this spot.
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
		el.focus({ preventScroll: true });
		// the page may still settle (or the browser restore its own scroll) a frame on
		requestAnimationFrame(() => requestAnimationFrame(fit));
	}, []);

	function onClick(e: MouseEvent<HTMLAnchorElement>) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
			return; // new tab, new window, download: let the browser do it
		}
		if (!canAnimate()) return; // no transition: the link navigates straight away
		e.preventDefault();
		desk.open(href);
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
			onPointerEnter={intent}
			onPointerDown={intent}
			onFocus={intent}
		>
			<span className="stk-body">
				<span className="stk-face">
					<img src={sticker.src} alt="" />
				</span>
				<span className="stk-flapwrap">
					{/* only seen on hover or lift; lazy keeps it out of the page's preloads */}
					<img className="stk-flap" src={sticker.back} alt="" loading="lazy" />
				</span>
			</span>
		</Link>
	);
}
