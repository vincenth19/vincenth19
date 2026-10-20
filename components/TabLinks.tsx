'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useDesk } from './DeskProvider';

export type Tab = {
	key: string;
	label: string;
	href: string;
	/** Rendered on the server, so the icon set stays out of the client bundle. */
	icon: ReactNode;
	/** The pages on which this tab is the current one. */
	paths: string[];
};

/** The tab links; the client part of Tabs, because the current tab follows the URL. */
export function TabLinks({ label, tabs }: { label: string; tabs: Tab[] }) {
	const pathname = usePathname();
	const { navigate } = useDesk();
	return (
		<nav className="tabs" aria-label={label}>
			{tabs.map((t) => (
				<Link
					key={t.key}
					className={`tab tab--${t.key}`}
					href={t.href}
					aria-current={t.paths.includes(pathname) ? 'page' : undefined}
					// A tab turns the page and leaves the scroll where it is. Next's
					// scroll-to-top would also undo the re-stuck sticker, which the
					// Projects tab scrolls to the middle when it leaves a project.
					scroll={false}
					// Leaving a project runs as a view transition (the Projects tab flies
					// its sticker back onto the page), and a tab clicked while a sticker
					// lifts wins over the sticker's project.
					onNavigate={(e) => navigate(e, t.href)}
				>
					{t.icon}
					<span>{t.label}</span>
				</Link>
			))}
		</nav>
	);
}
