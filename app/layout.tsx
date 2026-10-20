import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { DeskProvider } from '@/components/DeskProvider';
import { Masthead } from '@/components/Masthead';
import { SkipLink } from '@/components/SkipLink';
import { Tabs } from '@/components/Tabs';
import { site } from '@/content/site';
import { baseOpenGraph } from '@/lib/metadata';
import { bricolage, fraunces, frauncesUpright } from './fonts';
// one stylesheet per part of the page, in cascade order
import '@/styles/base.css';
import '@/styles/desk.css';
import '@/styles/masthead.css';
import '@/styles/stickers.css';
import '@/styles/book.css';
import '@/styles/sheets.css';
import '@/styles/projects.css';
import '@/styles/detail.css';
import '@/styles/writing.css';
import '@/styles/resume.css';

export const metadata: Metadata = {
	metadataBase: new URL(site.url),
	title: { default: site.name, template: `%s · ${site.name}` },
	description: site.description,
	// the Projects page's tags; every other page sets its own (see lib/metadata.ts)
	openGraph: {
		...baseOpenGraph,
		title: { default: site.name, template: `%s · ${site.name}` },
		description: site.description,
		url: '/',
	},
};

export const viewport: Viewport = {
	themeColor: '#150e0a',
	colorScheme: 'dark',
};

/**
 * The desk, masthead and book stay mounted across navigations; each route only
 * swaps the leaf (the top page of the book).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`${fraunces.variable} ${frauncesUpright.variable} ${bricolage.variable}`}
		>
			<body>
				<SkipLink target="content">{site.skipLink}</SkipLink>
				<DeskProvider>
					<div className="desk">
						<Masthead />
						<main className="book">
							<Tabs />
							<div className="board">
								<div className="leaf" id="content">
									{children}
								</div>
							</div>
						</main>
					</div>
				</DeskProvider>
			</body>
		</html>
	);
}
