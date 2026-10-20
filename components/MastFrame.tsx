'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { HeaderSticker } from '@/content/projects';

type Props = {
	/** The name and tagline (server-rendered). */
	identity: ReactNode;
	/** The social links (server-rendered). */
	socials: ReactNode;
	/** The Back arrow (server-rendered, so the icon set stays out of the client bundle). */
	backIcon: ReactNode;
	/** The Back arrow's accessible name. */
	backLabel: string;
	stickers: HeaderSticker[];
};

/**
 * The masthead's open/closed state. On /projects/[slug] the peeled sticker becomes
 * the header (the name stays for screen readers, the tagline hides) with Back beside it.
 */
export function MastFrame({
	identity,
	socials,
	backIcon,
	backLabel,
	stickers,
}: Props) {
	const pathname = usePathname();
	const slug = /^\/projects\/([^/]+)\/?$/.exec(pathname)?.[1];
	const open = stickers.find((s) => s.slug === slug);

	return (
		<header className="mast" data-open={open?.key}>
			{identity}
			{open && (
				<div className="slap">
					<Link className="back" href="/" aria-label={backLabel} scroll={false}>
						{backIcon}
					</Link>
					{/* keyed by project, so the slap plays again for each one */}
					<figure key={open.slug} className={`slap-stk stk--${open.key}`}>
						<span className="stk-body">
							<span className="stk-face">
								<img
									src={open.sticker.src}
									alt={open.sticker.alt}
									// the page's largest image when a project link is opened directly
									fetchPriority="high"
								/>
							</span>
						</span>
					</figure>
				</div>
			)}
			{socials}
		</header>
	);
}
