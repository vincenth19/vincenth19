'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useDesk } from './DeskProvider';

/**
 * A link back to the Projects page from a project's own page (Super Space's
 * foot): it flies the sticker home, as the Back arrow does.
 */
export function BackToProjects({
	className,
	children,
}: {
	className: string;
	children: ReactNode;
}) {
	const { navigate } = useDesk();
	return (
		<Link
			className={className}
			href="/"
			scroll={false}
			onNavigate={(e) => navigate(e, '/')}
		>
			{children}
		</Link>
	);
}
