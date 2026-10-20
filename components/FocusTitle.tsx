'use client';

import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { keepScroll, useDesk } from './DeskProvider';

/**
 * A page title (h2) that takes keyboard focus when the page opens from another
 * page of the site, so the focus does not drop to the start of the document when
 * the clicked link goes away. A fresh page load leaves focus and scroll alone.
 * `toTop` also lands the page at the top: a project opens there, so its sticker
 * lands in the header in view.
 */
export function FocusTitle({
	id,
	className,
	toTop = false,
	children,
}: {
	id: string;
	className: string;
	toTop?: boolean;
	children: ReactNode;
}) {
	const { from } = useDesk();
	const ref = useRef<HTMLHeadingElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once, when the page opens
	useLayoutEffect(() => {
		if (from === null) return;
		if (toTop) {
			window.scrollTo(0, 0);
			keepScroll();
		}
		ref.current?.focus({ preventScroll: true });
	}, []);

	return (
		<h2 ref={ref} className={className} id={id} tabIndex={-1}>
			{children}
		</h2>
	);
}
