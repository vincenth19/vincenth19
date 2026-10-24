'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import type { HeaderSticker } from '@/content/projects';
import { stickerName, useDesk } from './DeskProvider';

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
 * The masthead's open/closed state. On /projects/[slug] the project's sticker
 * becomes the header (the name stays for screen readers, the tagline hides) with
 * Back beside it. The header sticker shares its view-transition-name with the
 * sticker on the Projects page, so opening and leaving the project fly one into
 * the other (DeskProvider runs the transition).
 */
export function MastFrame({
	identity,
	socials,
	backIcon,
	backLabel,
	stickers,
}: Props) {
	const pathname = usePathname();
	const { navigate } = useDesk();
	const slug = /^\/projects\/([^/]+)\/?$/.exec(pathname)?.[1];
	const open = stickers.find((s) => s.slug === slug);

	return (
		<header className="mast" data-open={open?.key}>
			{identity}
			{open && (
				<div className="slap">
					<Link
						className="back"
						href="/"
						aria-label={backLabel}
						scroll={false}
						onNavigate={(e) => navigate(e, '/', true)}
					>
						{backIcon}
					</Link>
					<figure
						className={`slap-stk stk--${open.key}`}
						style={{ viewTransitionName: stickerName(open.key) }}
					>
						<span
							className="stk-body"
							style={
								{ '--back': `url("${open.sticker.back}")` } as CSSProperties
							}
						>
							<span className="stk-face">
								<span className="stk-cut">
									<img
										src={open.sticker.src}
										alt={open.sticker.alt}
										// the page's largest image when a project link is opened directly
										fetchPriority="high"
									/>
								</span>
							</span>
							{/* the corner it lands with, if it was lifted (DeskProvider); flat, nothing shows */}
							<span className="stk-flapwrap">
								<span className="stk-cut">
									<img
										className="stk-flap"
										src={open.sticker.back}
										alt=""
										loading="lazy"
									/>
								</span>
							</span>
							{/* the fold it lands with, if it was peeled by hand (components/fold.ts) */}
							<span className="stk-handwrap">
								<span className="stk-hold">
									<span className="stk-hand" />
								</span>
							</span>
						</span>
					</figure>
				</div>
			)}
			{socials}
		</header>
	);
}
