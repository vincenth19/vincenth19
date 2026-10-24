'use client';

import {
	Children,
	type ReactNode,
	startTransition,
	useEffect,
	useState,
} from 'react';
import { transitionRunning, whenLanded } from './DeskProvider';

/**
 * The part of a long page below its first screen (Super Space's sections
 * under the hero). Loaded or reloaded, it is all there from the start, as the
 * server rendered it. Opened in a page transition (from the Projects page,
 * or by Back and Forward), the page is put in place inside the transition's
 * update, while the browser draws nothing new: then only its first screen is
 * built there, and the rest is added once the sticker has landed, a part at a
 * time (one a frame, each a small task), so neither the screen held still
 * before the flight nor the frames after it wait for eleven thousand pixels of
 * page. Until the first part is in, a screen's height of the stage stands in
 * for it, so the page scrolls (and keeps its scrollbar) as it will.
 */
export function AfterLanding({ children }: { children: ReactNode }) {
	const parts = Children.toArray(children);
	// on the server and on a page load, everything; in a transition, nothing yet
	const [shown, setShown] = useState(() =>
		typeof window === 'undefined' || !transitionRunning() ? parts.length : 0,
	);
	const all = shown >= parts.length;

	useEffect(() => {
		if (all) return;
		let gone = false;
		let frame = 0;
		// the next part, in the frame after the last one went in (a transition
		// render, so React gives the frames their turn while it builds it)
		const next = () => {
			frame = requestAnimationFrame(() => {
				if (!gone) startTransition(() => setShown((n) => n + 1));
			});
		};
		if (shown === 0) {
			whenLanded().then(() => {
				if (!gone) next();
			});
		} else {
			next();
		}
		return () => {
			gone = true;
			cancelAnimationFrame(frame);
		};
	}, [shown, all]);

	return (
		<>
			{parts.slice(0, shown)}
			{shown === 0 && <div className="ss-later" aria-hidden="true" />}
		</>
	);
}
