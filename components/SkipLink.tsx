'use client';

import type { MouseEvent } from 'react';

/**
 * "Skip to content": the first Tab stop, past the socials and tabs, straight to
 * the page. Once the page has loaded it moves focus itself instead of following
 * the #hash, because a history entry the Next.js router did not write breaks
 * Back (the router ignores it, so Back to it would leave the old page on screen).
 */
export function SkipLink({
	target,
	children,
}: {
	target: string;
	children: string;
}) {
	function onClick(e: MouseEvent<HTMLAnchorElement>) {
		const el = document.getElementById(target);
		if (!el) return;
		e.preventDefault();
		// focusable only while focused, so clicks on the page never focus it
		el.setAttribute('tabindex', '-1');
		el.addEventListener('blur', () => el.removeAttribute('tabindex'), {
			once: true,
		});
		el.focus({ preventScroll: true });
		el.scrollIntoView();
	}

	return (
		<a className="skip" href={`#${target}`} onClick={onClick}>
			{children}
		</a>
	);
}
