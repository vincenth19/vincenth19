'use client';

import {
	Children,
	type ReactNode,
	startTransition,
	useEffect,
	useState,
} from 'react';
import { transitionRunning, whenSettled } from './DeskProvider';

/**
 * The part of a long page below its first screen (Super Space's sections
 * under the hero). Loaded or reloaded, it is all there from the start, as the
 * server rendered it. Opened in a page transition (from the Projects page,
 * or by Back and Forward), the page is put in place inside the transition's
 * update, while the browser draws nothing new: then only its first screen is
 * built there, and the rest is added once the sticker has landed and been
 * pressed down (`whenSettled`), a part at a time (one a frame, each a small
 * task), so neither the screen held still
 * before the flight nor the frames after it wait for eleven thousand pixels of
 * page. Until the last part is in, a screen's height of the stage stands in
 * below the parts that are, so the page scrolls on (and keeps its scrollbar)
 * meanwhile, rather than ending under the hero.
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
			// once the landed sticker has been pressed down too: the press runs
			// on the main thread, and a part laid out meanwhile would stop it
			whenSettled().then(() => {
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
			{!all && <div className="ss-later" aria-hidden="true" />}
		</>
	);
}
