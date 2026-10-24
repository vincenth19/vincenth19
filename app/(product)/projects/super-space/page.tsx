import type { Metadata } from 'next';
import { AfterLanding } from '@/components/AfterLanding';
import {
	Closing,
	Demo,
	Faq,
	FeatureBeat,
	Hero,
	Install,
} from '@/components/superspace/Sections';
import { superSpace } from '@/content/superspace';
import { getEcbRates } from '@/lib/ecbRates';
import { baseOpenGraph } from '@/lib/metadata';
import { getFilm } from '@/lib/superspaceMedia';
import { fragmentMono, gloock, inter } from './fonts';
// scoped to .ss: Next keeps a route's stylesheet after you leave it
import '@/styles/superspace.css';
import '@/styles/superspace-launcher.css';

const path = '/projects/super-space';

export const metadata: Metadata = {
	title: superSpace.name,
	description: superSpace.subhead,
	alternates: { canonical: path },
	openGraph: {
		...baseOpenGraph,
		title: superSpace.name,
		description: superSpace.subhead,
		url: path,
	},
};

/**
 * Super Space's product page. The desk and the masthead (with the sticker as its
 * header) come from the root layout; below them, instead of the book, a dark stage
 * in Super Space's own identity. Everything on it is in content/superspace.ts.
 */
export default async function SuperSpacePage() {
	// for the launcher's currency answers: the ECB's rates of the day it was built
	const rates = await getEcbRates();
	return (
		<main
			className={`ss ${gloock.variable} ${fragmentMono.variable} ${inter.variable}`}
			id="content"
		>
			<Hero />
			{/* opened in a page transition, the rest comes once the sticker has landed */}
			<AfterLanding>
				<Demo key="demo" film={getFilm()} rates={rates} />
				{superSpace.beats.map((beat) => (
					<FeatureBeat key={beat.key} beat={beat} />
				))}
				<Install key="install" />
				<Faq key="faq" />
				<Closing key="closing" />
			</AfterLanding>
		</main>
	);
}
