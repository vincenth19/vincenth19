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
			<rect x="15.4" y="7.4" width="8.6" height="8.8" fill="#f66151" />
			<path
				d="M16.9 12.5c1.6.5 3.8-.2 3.6-1.5-.2-1.1-2.1-.9-2.9.3-.9 1.5-.1 3 1.6 2.9 1.1 0 2.2-.6 3.2-1.4"
				stroke="#fff"
				strokeWidth=".6"
				fill="none"
				strokeLinecap="round"
			/>
			<g stroke="#1c71d8" strokeWidth=".75" fill="#fff" fillOpacity=".35">
				<rect x="3.4" y="19.3" width="6.9" height="3.3" rx=".7" />
				<rect x="12" y="19.3" width="6.9" height="3.3" rx=".7" />
				<path d="M10.3 19.9c.5-.7 1.2-.7 1.7 0" fill="none" />
				<path d="M3.5 19.8 2.4 17.6M18.8 19.8l1.1-2.2" fill="none" />
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
	// mpv: a dark, smooth purple disc with a pale rim (thicker on the left), a dark well a little
	// off centre, a large pale button and a purple play sign; the gloss is layered discs, so the
	// many icons on the page share no ids
	mpv: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<circle cx="14.9" cy="15" r="13" fill="#ece5ef" />
			<circle cx="15.4" cy="15" r="12.1" fill="#4f1d5e" />
			<circle cx="14.4" cy="13.9" r="10" fill="#62286f" opacity=".55" />
			<circle cx="16" cy="15.9" r="8.4" fill="#3a1046" opacity=".85" />
			<circle cx="15.2" cy="15" r="6.5" fill="#f1ecf3" />
			<circle cx="14.7" cy="14.4" r="5.2" fill="#fbf9fc" opacity=".7" />
			<path d="M13.6 12v6l4.9-3z" fill="#5d2069" />
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
	// the default browser's icon, as on the real web row (a small icon drawn large, so soft): a
	// round white halo with one bump on top, a black ring, a face light on the left and grey on
	// the right, and a classic mouse pointer, mirrored: its tip at the top, its straight edge on
	// the right, its tail leaving the ring at the lower left
	web: () => (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 30 30"
			className="ssl-soft ssl-soft--web"
		>
			<rect x="1.4" y="2" width="27.2" height="27.2" rx="11.5" fill="#f6f5f4" />
			<rect x="12.5" y="0.8" width="5" height="3.6" rx="1.6" fill="#f6f5f4" />
			<circle
				cx="15"
				cy="15.6"
				r="9.2"
				fill="#e7e6e4"
				stroke="#111"
				strokeWidth="2.6"
			/>
			<path d="M15.3 6.4a9.2 9.2 0 0 1 0 18.4z" fill="#bab8b5" />
			<path d="M15.6 6.6v18" stroke="#fff" strokeWidth=".8" />
			<path
				d="M15 10.2v15.6l-3.1-2.4-1.9 4.8-2.2-1 1.9-4.6-4.1-.1z"
				fill="#0c0c0c"
				stroke="#f6f5f4"
				strokeWidth=".55"
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

/**
 * A photo or a video's frame: its own small picture, as the real launcher
 * shows the file itself. The demo's pictures are other people's photos
 * (Wikimedia Commons, credited under the screen); one this copy does not ship
 * shows as a plain tile with the theme's image sign, not as a drawing of it.
 */
export function Picture({
	src,
	className = '',
}: {
	src?: string;
	className?: string;
}) {
	return (
		<span className={`ssl-pic${src ? '' : ' is-none'} ${className}`.trim()}>
			{src ? (
				<img src={src} alt="" loading="lazy" decoding="async" />
			) : (
				<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
					<rect x="3.5" y="5" width="17" height="14" rx="2" />
					<path d="m3.5 16 5-5 4 4 2.5-2.5 5 5" />
					<circle cx="15.5" cy="9.5" r="1.5" />
				</svg>
			)}
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
	if (scene) return <Picture src={src} />;
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
