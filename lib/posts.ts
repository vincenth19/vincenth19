import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';

/** What every post exports as `metadata` (see content/writing/README.md). */
export type PostMeta = {
	title: string;
	/** ISO date, YYYY-MM-DD. */
	date: string;
	summary: string;
};

export type Post = {
	slug: string;
	metadata: PostMeta;
	Content: ComponentType;
};

const dir = path.join(process.cwd(), 'content', 'writing');

/**
 * Slugs come from the file names: content/writing/my-post.mdx → /writing/my-post.
 * Files starting with "_" (like _template.mdx) are drafts and never published.
 */
export function getPostSlugs(): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((file) => file.endsWith('.mdx') && !file.startsWith('_'))
		.map((file) => file.replace(/\.mdx$/, ''));
}

function assertMeta(slug: string, meta: unknown): asserts meta is PostMeta {
	const m = meta as Partial<PostMeta> | undefined;
	if (
		!m ||
		typeof m.title !== 'string' ||
		typeof m.summary !== 'string' ||
		typeof m.date !== 'string' ||
		!/^\d{4}-\d{2}-\d{2}$/.test(m.date)
	) {
		throw new Error(
			`content/writing/${slug}.mdx must export metadata = { title, date: 'YYYY-MM-DD', summary }`,
		);
	}
}

export async function getPost(slug: string): Promise<Post | undefined> {
	if (!getPostSlugs().includes(slug)) return undefined;
	// The bundler compiles every content/writing/*.mdx for this import, so the
	// folder must always hold at least one .mdx file: _template.mdx keeps it non-empty.
	const mod = await import(`@/content/writing/${slug}.mdx`);
	assertMeta(slug, mod.metadata);
	return { slug, metadata: mod.metadata, Content: mod.default };
}

/** All posts, newest first. */
export async function getPosts(): Promise<Post[]> {
	const posts = await Promise.all(getPostSlugs().map(getPost));
	return posts
		.filter((p): p is Post => p !== undefined)
		.sort((a, b) => b.metadata.date.localeCompare(a.metadata.date));
}

// en-US gives "Sep" where en-AU and en-GB give "Sept"
const month = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC',
});
const day = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC',
});

/** "Jan 2027", as in the list. */
export function formatMonth(date: string): string {
	return month.format(new Date(`${date}T00:00:00Z`));
}

/** "15 January 2027", on the post itself. */
export function formatDay(date: string): string {
	return day.format(new Date(`${date}T00:00:00Z`));
}
