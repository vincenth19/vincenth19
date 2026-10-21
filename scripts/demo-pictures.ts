/**
 * Makes the launcher's small pictures of the demo home's photos and video
 * frames, from their sources on Wikimedia Commons (omarchy-super-space's
 * demo/CREDITS.md, listed in content/superspace.ts as `demo.pictures`):
 * public/projects/super-space/demo/<scene>.webp, 122×122 for a photo and
 * 174×98 for a video's frame (twice their size in the launcher). The page
 * shows each one, and its credit, once its file is there.
 *
 *   bun scripts/demo-pictures.ts            every picture not made yet
 *   bun scripts/demo-pictures.ts --force    all of them again
 *
 * It needs the network (commons.wikimedia.org) and, for the video frames,
 * ffmpeg. Check each picture before you commit it. It uses the copy of sharp
 * that Next.js installs (an optional dependency of next, for its image
 * optimisation), so it adds no dependency of its own.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { superSpace } from '../content/superspace';

const out = path.join(
	process.cwd(),
	'public',
	'projects',
	'super-space',
	'demo',
);
const force = process.argv.includes('--force');
const agent = 'vincenth19.com demo pictures (https://vincenth19.com)';

/** The file's original and a thumbnail `width` wide, from the Commons API. */
async function info(source: string, width: number) {
	const title = decodeURIComponent(source.slice(source.indexOf('File:')));
	const api = new URL('https://commons.wikimedia.org/w/api.php');
	api.search = new URLSearchParams({
		action: 'query',
		format: 'json',
		prop: 'imageinfo',
		iiprop: 'url',
		iiurlwidth: String(width),
		titles: title,
	}).toString();
	const res = await fetch(api, { headers: { 'User-Agent': agent } });
	if (!res.ok) throw new Error(`${res.status} from the Commons API`);
	const json = (await res.json()) as {
		query: {
			pages: Record<
				string,
				{ imageinfo?: { url: string; thumburl?: string }[] }
			>;
		};
	};
	const page = Object.values(json.query.pages)[0];
	const ii = page?.imageinfo?.[0];
	if (!ii) throw new Error(`not on Commons: ${title}`);
	return ii;
}

async function download(url: string): Promise<Buffer> {
	const res = await fetch(url, { headers: { 'User-Agent': agent } });
	if (!res.ok) throw new Error(`${res.status} for ${url}`);
	return Buffer.from(await res.arrayBuffer());
}

mkdirSync(out, { recursive: true });
for (const p of superSpace.demo.pictures) {
	const file = path.join(out, `${p.scene}.webp`);
	if (existsSync(file) && !force) continue;
	try {
		if (p.at === undefined) {
			// a photo: its middle, square
			const ii = await info(p.source, 480);
			const img = await download(ii.thumburl ?? ii.url);
			await sharp(img)
				.resize(122, 122, { fit: 'cover' })
				.webp({ quality: 80 })
				.toFile(file);
		} else {
			// a video: the frame at `at` seconds, 16:9
			const ii = await info(p.source, 320);
			const dir = mkdtempSync(path.join(tmpdir(), 'frame-'));
			const png = path.join(dir, 'frame.png');
			execFileSync('ffmpeg', [
				'-loglevel',
				'error',
				'-ss',
				String(p.at),
				'-i',
				ii.url,
				'-frames:v',
				'1',
				png,
			]);
			await sharp(png)
				.resize(174, 98, { fit: 'cover' })
				.webp({ quality: 82 })
				.toFile(file);
			rmSync(dir, { recursive: true, force: true });
		}
		console.log(`made ${path.relative(process.cwd(), file)}`);
	} catch (e) {
		console.error(`skipped ${p.scene}: ${(e as Error).message}`);
	}
}
