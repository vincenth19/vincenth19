import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { site } from '@/content/site';

const copy = site.notFound;

export const metadata: Metadata = { title: copy.title };

export default function NotFound() {
	return (
		<section className="sheet" aria-labelledby="t-not-found">
			<header className="sheet-head">
				<div>
					<h2 className="sheet-title" id="t-not-found">
						{copy.heading}
					</h2>
					<p className="sheet-note">{copy.note}</p>
				</div>
			</header>
			<Link className="btn" href="/">
				<Icon name="arrow-left-long-line" /> {copy.back}
			</Link>
		</section>
	);
}
