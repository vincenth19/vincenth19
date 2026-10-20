import type { Metadata } from 'next';
import Link from 'next/link';
import { Corners } from '@/components/Corners';
import { Icon } from '@/components/Icon';
import { site } from '@/content/site';
import { baseOpenGraph } from '@/lib/metadata';
import { formatMonth, getPosts } from '@/lib/posts';

export const metadata: Metadata = {
	title: site.writing.title,
	description: site.writing.note,
	alternates: { canonical: '/writing' },
	openGraph: {
		...baseOpenGraph,
		title: site.writing.title,
		description: site.writing.note,
		url: '/writing',
	},
};

export default async function WritingPage() {
	const posts = await getPosts();
	const { title, note, soon } = site.writing;
	return (
		<section className="sheet" aria-labelledby="t-writing">
			<header className="sheet-head">
				<div>
					<h2 className="sheet-title" id="t-writing">
						{title}
					</h2>
					<p className="sheet-note">{note}</p>
				</div>
			</header>
			{posts.length > 0 ? (
				<ol className="posts">
					{posts.map(({ slug, metadata: m }) => (
						<li key={slug} className="post">
							<Link className="post-link" href={`/writing/${slug}`}>
								<time className="post-date" dateTime={m.date}>
									{formatMonth(m.date)}
								</time>
								<span className="post-title">{m.title}</span>
								<span className="post-sum">{m.summary}</span>
							</Link>
						</li>
					))}
				</ol>
			) : (
				<div className="soon">
					<div className="soon-card">
						<Icon name="pencil-ruler-2-fill" />
						<p className="soon-title">{soon.title}</p>
						<p>{soon.body}</p>
						<Corners />
					</div>
				</div>
			)}
		</section>
	);
}
