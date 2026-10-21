import type { ReactNode } from 'react';
import type { IconName, Scene } from './types';

/**
 * The launcher's icons, drawn for this page. On a real machine they come from
 * the icon theme (the app that opens each file, the default browser, mpv for
 * media); these stand in for them at the same size, in their colours.
 */

/** Omarchy's mark, left of the query (glyph U+E900 of the `omarchy` font), redrawn on its 52-unit grid. */
export function OmarchyMark() {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 52 52"
			className="ssl-mark-svg"
			fill="currentColor"
		>
			<path d="M0 0h52v3.6H0zM0 0h3.6v52H0zM48.4 0H52v52h-3.6zM0 48.4h28V52H0zM32 48.4h20V52H32zM24 0h4v11H24zM7 7h21v4H7zM37 7h8v4h-8zM7 7h4v38H7zM41 7h4v38h-4zM7 41h38v4H7zM0 24h11v3.6H0zM24 41h4v11h-4z" />
		</svg>
	);
}

/** A document page with its app's colour on the corner fold and a few lines of text. */
function Page({ fold, children }: { fold?: string; children?: ReactNode }) {
	return (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<path
				d="M6.5 2.5h12l6 6v18a1.5 1.5 0 0 1-1.5 1.5h-16A1.5 1.5 0 0 1 5.5 26.5v-22.5a1.5 1.5 0 0 1 1-1.5z"
				fill="#f4f3f1"
				stroke="#cfccc8"
				strokeWidth=".6"
			/>
			<path
				d="M18.5 2.5v4.5a1.5 1.5 0 0 0 1.5 1.5h4.5z"
				fill={fold ?? '#d8d5d1'}
			/>
			{children}
		</svg>
	);
}

const lines = (y: number[], x2 = 21, color = '#cfccc8') =>
	y.map((v) => (
		<path key={v} d={`M8.5 ${v}H${x2}`} stroke={color} strokeWidth="1.3" />
	));

/** A round app icon: a disc in the app's colours with a simple white sign on it. */
function Disc({
	fill,
	ring,
	children,
}: {
	fill: string;
	ring?: string;
	children?: ReactNode;
}) {
	return (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<circle cx="15" cy="15" r="12.5" fill={fill} />
			{ring && (
				<circle
					cx="15"
					cy="15"
					r="12.5"
					fill="none"
					stroke={ring}
					strokeWidth="1.2"
				/>
			)}
			{children}
		</svg>
	);
}

/** A rounded-square app icon with its sign. */
function Tile({ fill, children }: { fill: string; children?: ReactNode }) {
	return (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<rect x="3" y="3" width="24" height="24" rx="6" fill={fill} />
			{children}
		</svg>
	);
}

const icons: Record<Exclude<IconName, 'photo' | 'emoji'>, () => ReactNode> = {
	// GNOME's document viewer: a plain page, a red seal with a written "e", thin blue glasses
	pdf: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<rect x="4.9" y="2.6" width="20.5" height="26" rx="1.6" fill="#c0bfbc" />
			<rect
				x="4.9"
				y="2.1"
				width="20.5"
				height="25.8"
				rx="1.6"
				fill="#f6f5f4"
			/>
			<path d="M6.6 5.4h9.5" stroke="#77767b" strokeWidth=".9" />
			<g fill="#deddda">
				<rect x="6.6" y="7" width="17.1" height="1.6" />
				<rect x="6.6" y="9.6" width="8.6" height="3.4" />
				<rect x="6.6" y="14" width="8.6" height="2.4" />
				<rect x="6.6" y="17.4" width="17.1" height="1.2" />
				<rect x="6.6" y="23.6" width="17.1" height="1.2" />
			</g>
			<rect x="16.2" y="8.8" width="7.5" height="7.9" fill="#f66151" />
			<path
				d="M17.5 13.4c1.4.4 3.3-.2 3.1-1.3-.2-1-1.8-.8-2.5.3-.8 1.3-.1 2.6 1.4 2.5 1 0 1.9-.5 2.8-1.2"
				stroke="#fff"
				strokeWidth=".55"
				fill="none"
				strokeLinecap="round"
			/>
			<g stroke="#1c71d8" strokeWidth=".75" fill="#fff" fillOpacity=".35">
				<rect x="3.4" y="19.3" width="6.9" height="3.3" rx=".7" />
				<rect x="12" y="19.3" width="6.9" height="3.3" rx=".7" />
				<path d="M10.3 19.9c.5-.7 1.2-.7 1.7 0" fill="none" />
			</g>
		</svg>
	),
	writer: () => (
		<Page fold="#3584e4">
			{lines([11.5, 14.5, 17.5, 20.5, 23.5], 21.5, '#9cb9e0')}
		</Page>
	),
	calc: () => (
		<Page fold="#2ec27e">
			<g stroke="#8fd3b0" strokeWidth="1">
				<path d="M8.5 11.5h13M8.5 15.5h13M8.5 19.5h13M8.5 23.5h13M13 10v14M17.5 10v14" />
			</g>
		</Page>
	),
	impress: () => (
		<Page fold="#ff7800">
			<rect x="8.5" y="11" width="13" height="8.5" rx="1" fill="#ffbe6f" />
			{lines([22.5], 18.5)}
		</Page>
	),
	text: () => <Page>{lines([10.5, 13.5, 16.5, 19.5, 22.5], 21.5)}</Page>,
	html: () => (
		<Page fold="#62a0ea">{lines([11.5, 14.5, 17.5, 20.5], 21.5)}</Page>
	),
	book: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<path
				d="M7 4h15.5a1.5 1.5 0 0 1 1.5 1.5v19a1.5 1.5 0 0 1-1.5 1.5H7z"
				fill="#a51d2d"
			/>
			<path d="M7 4h2.6v22H7z" fill="#7a1522" />
			<path d="M7 24h17v2H7z" fill="#f4f3f1" />
			<rect x="12" y="9" width="8.5" height="5" rx="1" fill="#f6d32d" />
		</svg>
	),
	// mpv: a glossy purple disc with a pale rim (thicker on the left), a pale button, a purple
	// play sign; the gloss is layered discs, so many icons on the page share no ids
	mpv: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<circle cx="14.9" cy="15" r="13" fill="#ece5ef" />
			<circle cx="15.4" cy="15" r="12.1" fill="#5e2170" />
			<circle cx="14.6" cy="14.2" r="10.6" fill="#76308a" opacity=".8" />
			<circle cx="13.8" cy="13.2" r="7.6" fill="#8f45a2" opacity=".45" />
			<circle cx="15.5" cy="15.2" r="8.3" fill="#481554" />
			<circle cx="15.2" cy="15.1" r="5.9" fill="#cdc1d4" />
			<circle cx="14.6" cy="14.4" r="4.6" fill="#f3eff5" opacity=".85" />
			<path d="M13.8 12.3v5.6l4.5-2.8z" fill="#5d2069" />
		</svg>
	),
	folder: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<path
				d="M3.5 8a2 2 0 0 1 2-2h6l2.5 2.5h10.5a2 2 0 0 1 2 2V23a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2z"
				fill="#8a5f22"
			/>
			<path
				d="M3.5 11.5a2 2 0 0 1 2-2h19a2 2 0 0 1 2 2V23a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2z"
				fill="#c38c34"
			/>
		</svg>
	),
	gear: () => (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 30 30"
			fill="currentColor"
		>
			<path
				fillRule="evenodd"
				d="M13.2 4h3.6l.6 2.9 2 .9 2.5-1.6 2.6 2.6-1.6 2.5.9 2 2.9.6v3.6l-2.9.6-.9 2 1.6 2.5-2.6 2.6-2.5-1.6-2 .9-.6 2.9h-3.6l-.6-2.9-2-.9-2.5 1.6-2.6-2.6 1.6-2.5-.9-2L4 16.8v-3.6l2.9-.6.9-2-1.6-2.5 2.6-2.6 2.5 1.6 2-.9zM15 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
			/>
		</svg>
	),
	// the default browser's icon, as on the real web row: a soft white seal all round, a black
	// ring, a light face and a black mouse pointer pointing up, from the lower left
	web: () => (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 30 30"
			className="ssl-soft"
		>
			<path
				d="M15.00 1.40L16.39 2.68L18.03 1.74L19.10 3.30L20.90 2.75L21.60 4.50L23.48 4.37L23.77 6.23L25.63 6.52L25.50 8.40L27.25 9.10L26.70 10.90L28.26 11.97L27.32 13.61L28.60 15.00L27.32 16.39L28.26 18.03L26.70 19.10L27.25 20.90L25.50 21.60L25.63 23.48L23.77 23.77L23.48 25.63L21.60 25.50L20.90 27.25L19.10 26.70L18.03 28.26L16.39 27.32L15.00 28.60L13.61 27.32L11.97 28.26L10.90 26.70L9.10 27.25L8.40 25.50L6.52 25.63L6.23 23.77L4.37 23.48L4.50 21.60L2.75 20.90L3.30 19.10L1.74 18.03L2.68 16.39L1.40 15.00L2.68 13.61L1.74 11.97L3.30 10.90L2.75 9.10L4.50 8.40L4.37 6.52L6.23 6.23L6.52 4.37L8.40 4.50L9.10 2.75L10.90 3.30L11.97 1.74L13.61 2.68z"
				fill="#f6f5f4"
			/>
			<circle
				cx="15"
				cy="15"
				r="9.8"
				fill="#ecebe9"
				stroke="#111"
				strokeWidth="2.6"
			/>
			<path d="M15.4 6.4a8.6 8.6 0 0 1 0 17.2z" fill="#c9c7c4" />
			<path d="M15.2 6.4v17.2" stroke="#fff" strokeWidth=".7" />
			<path
				d="M14.6 6.2 6.4 24.6l5-3 1.9 4.6 2.8-1.2-1.9-4.6 5.6-.4z"
				fill="#0c0c0c"
				stroke="#f6f5f4"
				strokeWidth=".5"
				strokeLinejoin="round"
			/>
		</svg>
	),
	paste: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<rect x="6" y="5" width="18" height="21.5" rx="2.5" fill="#986a44" />
			<rect x="8.5" y="8" width="13" height="16" rx="1" fill="#f4f3f1" />
			<rect x="11" y="3.5" width="8" height="4.5" rx="1.2" fill="#c0bfbc" />
			{lines([12.5, 15.5, 18.5], 19)}
		</svg>
	),
	chromium: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<circle cx="15" cy="15" r="12.5" fill="#1a73e8" />
			<path d="M15 2.5a12.5 12.5 0 0 1 10.83 6.25H15z" fill="#8ab4f8" />
			<path d="M4.17 8.75 9.6 18.1 15 8.75z" fill="#4285f4" opacity=".7" />
			<circle cx="15" cy="15" r="5.6" fill="#fff" />
			<circle cx="15" cy="15" r="4.3" fill="#1a73e8" />
		</svg>
	),
	firefox: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<defs>
				<linearGradient id="ssl-ff" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#ffbd4f" />
					<stop offset=".45" stopColor="#ff6a37" />
					<stop offset="1" stopColor="#c61d73" />
				</linearGradient>
			</defs>
			<circle cx="15" cy="15" r="12.5" fill="url(#ssl-ff)" />
			<circle cx="16" cy="15.5" r="7.5" fill="#6f2ad6" />
			<path
				d="M8.5 10.5c3-4.5 9.5-5 12.5-1.5-3.5-1.5-7.5-.5-9 2.5z"
				fill="#ffd56a"
			/>
		</svg>
	),
	zen: () => (
		<Disc fill="#20201f" ring="#5c5a57">
			<circle
				cx="15"
				cy="15"
				r="7.5"
				fill="none"
				stroke="#f4f3f1"
				strokeWidth="1.6"
			/>
			<circle cx="15" cy="15" r="3.3" fill="#f4f3f1" />
		</Disc>
	),
	terminal: () => (
		<Tile fill="#241f31">
			<path
				d="m9 11 4 4-4 4M15 19.5h6"
				stroke="#f6f5f4"
				strokeWidth="1.8"
				fill="none"
			/>
		</Tile>
	),
	files: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<path
				d="M3.5 8a2 2 0 0 1 2-2h6l2.5 2.5h10.5a2 2 0 0 1 2 2V23a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2z"
				fill="#1c71d8"
			/>
			<path
				d="M3.5 11.5a2 2 0 0 1 2-2h19a2 2 0 0 1 2 2V23a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2z"
				fill="#62a0ea"
			/>
		</svg>
	),
	imv: () => (
		<Tile fill="#3d3846">
			<path d="m7 21 5.5-6.5 4 4.5 2.5-3 4 5z" fill="#8ff0a4" />
			<circle cx="19.5" cy="10.5" r="2.2" fill="#f9f06b" />
		</Tile>
	),
	music: () => (
		<Disc fill="#e66100">
			<path d="M13 9.5v8.3a2.6 2.6 0 1 0 1.6 2.4V12.5l5-1.3V9z" fill="#fff" />
		</Disc>
	),
	nvim: () => (
		<Tile fill="#1e2b2a">
			<path
				d="M9 21V9l6 9V9M15 21V12l6 9V9"
				stroke="#57a143"
				strokeWidth="2.2"
				fill="none"
			/>
		</Tile>
	),
	whatsapp: () => (
		<Disc fill="#25d366">
			<path d="M8.6 21.6l1-3.4a7 7 0 1 1 2.7 2.6z" fill="#fff" />
		</Disc>
	),
	signal: () => (
		<Disc fill="#3a76f0">
			<path d="M9 20.5l.8-2.9A6.5 6.5 0 1 1 12.3 20z" fill="#fff" />
		</Disc>
	),
	spotify: () => (
		<Disc fill="#1ed760">
			<path
				d="M9 12c4-1.2 8.6-.8 12 1.2M9.8 15.4c3.3-.9 7-.5 9.8 1.1M10.6 18.6c2.6-.6 5.2-.3 7.4.9"
				stroke="#121212"
				strokeWidth="1.6"
				fill="none"
			/>
		</Disc>
	),
	obsidian: () => (
		<Tile fill="#2a2147">
			<path d="M15 6.5 21 11l-1.5 9.5-4.5 3.5-4.5-3.5L9 11z" fill="#a88bfa" />
		</Tile>
	),
	typora: () => (
		<Tile fill="#f6f5f4">
			<path d="M10 9.5h10M15 9.5v11" stroke="#241f31" strokeWidth="2.2" />
		</Tile>
	),
	localsend: () => (
		<Disc fill="#008080">
			<path
				d="M15 8.5v8M11.5 13l3.5 3.5 3.5-3.5M10 21h10"
				stroke="#fff"
				strokeWidth="1.8"
				fill="none"
			/>
		</Disc>
	),
	obs: () => (
		<Disc fill="#302e31" ring="#5e5c64">
			<circle cx="15" cy="11" r="2.6" fill="#f6f5f4" />
			<circle cx="11.5" cy="17.5" r="2.6" fill="#f6f5f4" />
			<circle cx="18.5" cy="17.5" r="2.6" fill="#f6f5f4" />
		</Disc>
	),
	kdenlive: () => (
		<Tile fill="#3a3a3a">
			<path d="M8 10h14v10H8z" fill="none" stroke="#7fc6e9" strokeWidth="1.6" />
			<path d="M13 12.5v5l4-2.5z" fill="#7fc6e9" />
		</Tile>
	),
	pinta: () => (
		<Disc fill="#f5c211">
			<circle cx="11" cy="12" r="1.8" fill="#c01c28" />
			<circle cx="15.5" cy="9.8" r="1.8" fill="#1c71d8" />
			<circle cx="19.5" cy="12.5" r="1.8" fill="#2ec27e" />
			<circle cx="13" cy="19" r="2.6" fill="#fff" />
		</Disc>
	),
	password: () => (
		<Disc fill="#0572ec">
			<circle
				cx="15"
				cy="15"
				r="7"
				fill="none"
				stroke="#fff"
				strokeWidth="1.6"
			/>
			<path d="M15 11.5v7" stroke="#fff" strokeWidth="2.2" />
		</Disc>
	),
	docker: () => (
		<Tile fill="#1d63ed">
			<path
				d="M7.5 15.5h15c-.6 4-3.8 6.5-8 6.5-3.6 0-6.4-2.4-7-6.5z"
				fill="#fff"
			/>
			<path
				d="M9.5 12h2.6v2.6H9.5zM12.8 12h2.6v2.6h-2.6zM16.1 12h2.6v2.6h-2.6zM12.8 8.7h2.6v2.6h-2.6z"
				fill="#fff"
			/>
		</Tile>
	),
	btop: () => (
		<Tile fill="#11111b">
			<path
				d="M7 19l4-5 3.5 3 4-7 4.5 6"
				stroke="#a6e3a1"
				strokeWidth="1.6"
				fill="none"
			/>
		</Tile>
	),
};

/** The animal in a drawn scene, in its own colour (--fig, --fig-2 on the scene). */
const figures = {
	// a dog's head in profile, ear down, looking right
	dog: (
		<>
			<path d="M24 92c-4-22-2-40 8-52 8-10 22-14 34-10 8 2 14 7 18 13 7 2 12 6 12 12 0 7-7 9-13 9-5 5-11 7-16 7-2 8-4 15-5 21z" />
			<path
				className="ssl-fig-2"
				d="M36 40c-9 2-15 15-13 28 1 7 8 8 11 1 2-8 4-16 6-23z"
			/>
			<circle cx="64" cy="44" r="2.6" fill="#1b130c" />
			<circle cx="94" cy="58" r="3.2" fill="#1b130c" />
		</>
	),
	// a smaller, rounder head: a puppy
	puppy: (
		<>
			<path d="M28 90c-4-18-2-34 8-44 9-9 22-11 33-6 7 3 12 9 14 15 6 2 10 6 10 11 0 6-6 8-11 8-5 4-10 6-15 6-2 6-3 11-4 16z" />
			<path
				className="ssl-fig-2"
				d="M38 46c-9 2-14 14-12 25 1 6 8 7 10 1 2-8 3-15 5-21z"
			/>
			<circle cx="64" cy="54" r="3" fill="#1b130c" />
			<circle cx="91" cy="66" r="3.4" fill="#1b130c" />
		</>
	),
	// a dog running, side on
	run: (
		<>
			<path d="M14 62c6-8 16-10 26-9h26c6-6 12-10 18-9l8 4-4 6-6 1c-2 6-6 10-12 11l6 14-6 2-9-13H44l-10 13-6-2 6-14c-8-1-14 0-20 4z" />
			<path className="ssl-fig-2" d="M78 46l6-6 4 8z" />
		</>
	),
	// a cat sitting, facing us
	cat: (
		<>
			<path d="M30 94c-6-20-2-36 10-44-5-6-6-16-3-26l9 9c4-2 9-2 13 0l9-9c3 10 2 20-3 26 12 8 16 24 10 44z" />
			<circle cx="44" cy="38" r="2.4" fill="#c8d34a" />
			<circle cx="56" cy="38" r="2.4" fill="#c8d34a" />
		</>
	),
	// a cat curled up asleep
	curled: (
		<>
			<ellipse cx="50" cy="66" rx="30" ry="18" />
			<path d="M26 58c-2-8 2-15 9-18l2-8 5 7c4-1 8 0 11 2-5 6-13 12-27 17z" />
			<path
				className="ssl-fig-2"
				d="M74 72c8 2 10 10 2 13-10 3-26 3-38-1 14 0 28-3 36-12z"
			/>
		</>
	),
};

const sceneFigure: Partial<Record<Scene, keyof typeof figures>> = {
	'retriever-market': 'dog',
	'retriever-grass': 'dog',
	'retriever-stick': 'dog',
	'retriever-field': 'dog',
	puppy: 'puppy',
	'puppy-blanket': 'puppy',
	beagle: 'curled',
	collie: 'dog',
	'dachshund-beach': 'run',
	'terrier-beach': 'run',
	'cat-bench': 'curled',
	'black-cat': 'curled',
	'cat-sleeping': 'curled',
	tabby: 'cat',
	'cat-laser': 'cat',
	'cat-play': 'cat',
	'dog-swimming': 'puppy',
};

/**
 * A photo or video frame: its small picture when the page has one (`src`),
 * drawn over its scene, which stays as the stand-in for any it does not have.
 */
export function SceneArt({
	scene,
	src,
	className = '',
}: {
	scene: Scene;
	src?: string;
	className?: string;
}) {
	const fig = sceneFigure[scene];
	return (
		<span className={`ssl-scene ssl-scene--${scene} ${className}`.trim()}>
			{fig && !src && (
				<svg
					aria-hidden="true"
					focusable="false"
					viewBox="0 0 100 100"
					className="ssl-fig"
				>
					{figures[fig]}
				</svg>
			)}
			{src && <img src={src} alt="" loading="lazy" decoding="async" />}
		</span>
	);
}

/** A row's icon. Photos are their own icon; emoji are drawn as text. */
export function RowIcon({
	name,
	scene,
	src,
}: {
	name: IconName;
	scene?: Scene;
	src?: string;
}) {
	if (scene) return <SceneArt scene={scene} src={src} />;
	if (name === 'photo' || name === 'emoji') return null;
	return icons[name]();
}

/** The signs on Omarchy's desktop folder tiles. */
export function DesktopIcon({
	name,
}: {
	name: 'Downloads' | 'Music' | 'Pictures' | 'Projects' | 'Videos';
}) {
	const sign = {
		Downloads: <path d="M15 6v10m-4.5-4.5L15 16l4.5-4.5M8 21h14" />,
		Music: (
			<>
				<path d="M12 19V8.5l9-2V17" />
				<circle cx="10" cy="19.2" r="2.2" fill="currentColor" />
				<circle cx="19" cy="17.2" r="2.2" fill="currentColor" />
			</>
		),
		Pictures: <path d="M15 7.5 22.5 21h-15z" fill="currentColor" />,
		Projects: null,
		Videos: (
			<path d="M8 8.5h14v12H8zM8 11.5h14M8 17.5h14M11 8.5v3m4-3v3m4-3v3M11 17.5v3m4-3v3m4-3v3" />
		),
	}[name];
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 30 30"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			{sign}
		</svg>
	);
}
