'use client';

import Link from 'next/link';
import { type MouseEvent, useLayoutEffect, useRef, useState } from 'react';
import type { Project } from '@/content/projects';
import { keepScroll, prefersReducedMotion, useDesk } from './DeskProvider';

type Props = Pick<Project, 'sticker'> & {
	href: string;
	stickerKey: Project['key'];
	label: string;
	/**
	 * False for a project with its own product page: prefetching that route
	 * would make this page preload the product page's fonts and stylesheet. The
	 * peel fetches it instead, while it plays.
	 */
	prefetch?: boolean;
};

/**
 * A sticker on the Projects page. A plain click peels it off the page, then opens
 * the project, where the header slaps it back down. Coming back from that project
 * re-sticks it here.
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
	const peeling = desk.peeling === href;
	const [restick, setRestick] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once, when the page mounts after Back
	useLayoutEffect(() => {
		const el = ref.current;
		if (desk.from !== href || !el) return;
		// Back from this sticker's project: bring it into view and focus it. Scroll first,
		// without smoothing and before the re-stick starts (its first frame is lifted
		// 44px), so the sticker lands centred and the whole re-stick plays in view.
		el.scrollIntoView({ block: 'center' });
		keepScroll();
		el.focus({ preventScroll: true });
		// an update from a layout effect renders before the browser paints
		if (!prefersReducedMotion()) setRestick(true);
	}, []);

	function onClick(e: MouseEvent<HTMLAnchorElement>) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
			return; // new tab, new window, download: let the browser do it
		}
		if (prefersReducedMotion()) return; // no peel: the link navigates straight away
		e.preventDefault();
		setRestick(false);
		desk.peel(href);
	}

	let className = `stk stk--${stickerKey}`;
	if (peeling) className += ' is-peeling';
	else if (restick) className += ' is-restick';

	return (
		<Link
			ref={ref}
			className={className}
			href={href}
			prefetch={prefetch}
			scroll={false}
			aria-label={label}
			onClick={onClick}
			onAnimationEnd={(e) => {
				if (e.animationName === 'restick') setRestick(false);
			}}
		>
			<span className="stk-body">
				<span className="stk-face">
					<img src={sticker.src} alt="" />
				</span>
				<span className="stk-flapwrap">
					{/* only seen on hover or peel; lazy keeps it out of the page's preloads */}
					<img className="stk-flap" src={sticker.back} alt="" loading="lazy" />
				</span>
			</span>
		</Link>
	);
}
