import fs from 'node:fs';
import path from 'node:path';
import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

// lib/posts.ts imports posts with `import(`@/content/writing/${slug}.mdx`)`, which
// the bundler can only compile while the folder holds at least one .mdx file.
// Without one the build stops with a bare "Module not found", so say why here.
const writing = path.join(process.cwd(), 'content', 'writing');
const hasMdx =
	fs.existsSync(writing) &&
	fs.readdirSync(writing).some((file) => file.endsWith('.mdx'));
if (!hasMdx) {
	throw new Error(
		'content/writing has no .mdx file. Restore content/writing/_template.mdx: the posts loader needs at least one .mdx file there to build, and files starting with "_" are never published.',
	);
}

const nextConfig: NextConfig = {
	reactStrictMode: true,
	// `next dev` would otherwise write an AGENTS.md into the repo
	agentRules: false,
	// The old site had a /projects page. Its projects now live on the home page,
	// and the Projects tab marks /projects/* as part of it.
	async redirects() {
		return [{ source: '/projects', destination: '/', permanent: true }];
	},
	// The stickers and textures in public/img keep their names when they change,
	// so they are not cached forever: a day fresh, then reused while the browser
	// checks for a new version in the background.
	async headers() {
		return [
			{
				source: '/img/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=86400, stale-while-revalidate=2592000',
					},
				],
			},
		];
	},
};

// Writing posts are .mdx files in content/writing, compiled by @next/mdx and
// rendered with the components in mdx-components.tsx. remark-gfm adds GitHub's
// Markdown extras: tables, ~~strikethrough~~, task lists and bare-URL links.
// Plugins are named as strings so Turbopack can pass them to its MDX loader.
const withMDX = createMDX({ options: { remarkPlugins: ['remark-gfm'] } });

export default withMDX(nextConfig);
