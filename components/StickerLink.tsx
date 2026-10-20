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
	 * would make this page preload the product page's fonts and stylesheet. The
	 * click fetches it instead, while the sticker lifts.
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once, when the page mounts after leaving a project
	useLayoutEffect(() => {
		const el = ref.current;
		if (!returning || !el) return;
		// Back from this sticker's project: bring it into view and focus it, before
		// the transition captures the page, so the sticker lands centred.
		el.scrollIntoView({ block: 'center' });
		keepScroll();
		el.focus({ preventScroll: true });
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
			className={`stk stk--${stickerKey}${lifting ? ' is-lifting' : ''}`}
			style={
				flies ? { viewTransitionName: stickerName(stickerKey) } : undefined
			}
			href={href}
			prefetch={prefetch}
			scroll={false}
			aria-label={label}
			onClick={onClick}
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
