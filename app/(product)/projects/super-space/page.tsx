import type { Metadata } from 'next';
import {
	Closing,
	Demo,
	Faq,
	FeatureBeat,
	Hero,
	Install,
} from '@/components/superspace/Sections';
import { superSpace } from '@/content/superspace';
import { baseOpenGraph } from '@/lib/metadata';
import { getFilm } from '@/lib/superspaceMedia';
import { fragmentMono, gloock } from './fonts';
// scoped to .ss: Next keeps a route's stylesheet after you leave it
import '@/styles/superspace.css';

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
 * Super Space's product page. The desk and the masthead (with the sticker slapped
 * on) come from the root layout; below them, instead of the book, a dark stage in
 * Super Space's own identity. Everything on it is in content/superspace.ts.
 */
export default function SuperSpacePage() {
	return (
		<main
			className={`ss ${gloock.variable} ${fragmentMono.variable}`}
			id="content"
		>
			<Hero />
			<Demo film={getFilm()} />
			{superSpace.beats.map((beat) => (
				<FeatureBeat key={beat.key} beat={beat} />
			))}
			<Install />
			<Faq />
			<Closing />
		</main>
	);
}
