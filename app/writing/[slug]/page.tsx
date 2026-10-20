import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FocusTitle } from '@/components/FocusTitle';
import { Icon } from '@/components/Icon';
import { site } from '@/content/site';
import { baseOpenGraph } from '@/lib/metadata';
import { formatDay, getPost, getPostSlugs } from '@/lib/posts';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
	return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const post = await getPost((await params).slug);
	if (!post) return {};
	const { title, summary, date } = post.metadata;
	return {
		title,
		description: summary,
		alternates: { canonical: `/writing/${post.slug}` },
		openGraph: {
			...baseOpenGraph,
			type: 'article',
			title,
			description: summary,
			publishedTime: date,
			url: `/writing/${post.slug}`,
		},
	};
}

export default async function PostPage({ params }: Props) {
	const post = await getPost((await params).slug);
	if (!post) notFound();
	const { Content, metadata: m } = post;
	return (
		<article className="sheet article" aria-labelledby="t-post">
			<p className="hint article-back">
				<Link href="/writing">
					<Icon name="arrow-left-long-line" />
					<span>{site.writing.allPosts}</span>
				</Link>
			</p>
			<header className="article-head">
				<time className="article-date" dateTime={m.date}>
					{formatDay(m.date)}
				</time>
				<FocusTitle className="article-title" id="t-post">
					{m.title}
				</FocusTitle>
				<p className="lede">{m.summary}</p>
			</header>
			<div className="prose">
				<Content />
			</div>
		</article>
	);
}
