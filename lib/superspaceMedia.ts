import fs from 'node:fs';
import path from 'node:path';

/**
 * Super Space's real screenshots and demo clip are not cleared for publishing yet.
 * The product page shows each one only once its file is in
 * public/projects/super-space/, checked when the page is built, so the page looks
 * complete without them and needs no code change when they arrive. The same goes
 * for the demo home's pictures in the launcher (demo/<scene>.webp).
 */
const dir = path.join(process.cwd(), 'public', 'projects', 'super-space');
const url = (file: string) => `/projects/super-space/${file}`;

export type Shot = { src: string; width?: number; height?: number };

export type Film = { webm?: string; mp4?: string; poster?: Shot };

function has(file: string): boolean {
	return fs.existsSync(path.join(dir, file));
}

/**
 * The pixel size of a WebP, read from its header, so the page can reserve its
 * space before it loads. Undefined when the header is not one we know.
 */
function webpSize(file: string): { width: number; height: number } | undefined {
	let b: Buffer;
	try {
		b = fs.readFileSync(path.join(dir, file));
	} catch {
		return undefined;
	}
	if (
		b.length < 30 ||
		b.toString('ascii', 0, 4) !== 'RIFF' ||
		b.toString('ascii', 8, 12) !== 'WEBP'
	) {
		return undefined;
	}
	const chunk = b.toString('ascii', 12, 16);
	if (chunk === 'VP8X') {
		return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
	}
	if (chunk === 'VP8 ') {
		return {
			width: b.readUInt16LE(26) & 0x3fff,
			height: b.readUInt16LE(28) & 0x3fff,
		};
	}
	if (chunk === 'VP8L') {
		const bits = b.readUInt32LE(21);
		return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
	}
	return undefined;
}

/** A screenshot by file name (e.g. "lease.webp"), if it is there. */
export function getShot(file: string): Shot | undefined {
	if (!has(file)) return undefined;
	return { src: url(file), ...webpSize(file) };
}

/** The demo clip (demo.webm and/or demo.mp4, with poster.webp), if it is there. */
export function getFilm(): Film | undefined {
	const webm = has('demo.webm') ? url('demo.webm') : undefined;
	const mp4 = has('demo.mp4') ? url('demo.mp4') : undefined;
	if (!webm && !mp4) return undefined;
	return { webm, mp4, poster: getShot('poster.webp') };
}

/**
 * The demo home's pictures there are files for: the small WebP of each photo
 * and video frame, by its scene, in public/projects/super-space/demo/. The
 * launcher shows these, and a plain tile for any it does not have.
 */
export function getDemoThumbs(scenes: string[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const scene of scenes) {
		const file = `demo/${scene}.webp`;
		if (has(file)) out[scene] = url(file);
	}
	return out;
}
