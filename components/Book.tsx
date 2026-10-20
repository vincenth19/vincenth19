import type { ReactNode } from 'react';
import { Tabs } from './Tabs';

/**
 * The book on the desk: index tabs on top, and the leaf (the top page) that each
 * route fills. The (book) route group renders it once, so it stays mounted while
 * you turn its pages; the 404 page renders its own.
 */
export function Book({ children }: { children: ReactNode }) {
	return (
		<main className="book">
			<Tabs />
			<div className="board">
				<div className="leaf" id="content">
					{children}
				</div>
			</div>
		</main>
	);
}
