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

/** The web row's icon, a 20 px bitmap (see `web` below). */
const WEB_ICON =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAAB4FBMVEUAAAD29vP////29fT////////4+Pj29vT29fTx8O/x8O/29fP29PT39vT29fX39/Xo5ubp6Oj39/f////08/P18/L29PT19fX29vP19PP19PT29PT29vP/9PT29fP29PT49PT////29vT29vT29fT19PP29fT29fT////39/f////29fT19fT19fX49PTExML29fP69fX////MzMrT0dD29fTy8fDz8vH39fP////69PTNzMz29fShoKA4NzcREREODg6lpKRYWFgWFhaNjItnZmU5ODdhYWBERERVVFSioaDg393o5+bJx8SRj40jIyKOjY0XFxe3trT08/Hk5OLr6um2tLIbGxuSkZEdHR2ampjZ2Napqafq6eiIh4UkIyPQz84yMTHi4d9aWlqQkI8fHx/U09KTkpJgYF/r6uh1dHQMDAxDQkGXlpVnZmaAf37y8e+RkZBmZWNqaWmFhYRjY2KqqqmIiIexsbCJiYgUFBS0tLPv7u2CgoEsLCwtLS3x8O+5ubd/f34lJSUhISG3tbIbGhqzs7JLS0qHh4YNDQ2VlZN1dXWQj47p6Oejop8oJydTU1Pm5uQ9PTxXV1YzMzOPj4+dnJuBgH45OTlMS0sYGBg5ODinpqbLysrOzc393p69AAAAO3RSTlMAVgz+DQomWrLr6rGjvbB/9vV6AtHEeBlu7u10rRewqEgBpKP57ev6CyAf5eZQR7DdMRGLxOD+/pcHMIumuPkAAAExSURBVBjTY2CAAUZGBgzAxMzMgsxnZWNg5+C0tubiZmRgY4UK8tjw2trZOzjY2zny2fBABfkFnBwcHJxdXN0c3AWFIGLCIh4ODp5e3j6+vn7+HqLCYEGxAIfAoODgkFBfX9+w8AgxoJC4hGSkQ1RwcHRMLFDQNy5eSkKcQcwmwSExODgpOQUs6JuaZiPNIC6T7pARnJmVDRXMyZWRZWCQy3PILyjMhgkWFcuD7ClxKC3LhgvmlINsUqhwqKxCCKZWKzAwKCrV1NZlwwXj6huUFRmYVFQbm1KaW7ILQYKtbe1q6hoMDJpa2h2dXd09vX2+vv0TJupoaYK9pDvJafKUqdOmzyiyz/DRg4Wd/szKWfazHeznzDUwhAeokbGJqdm8+eamFkzI4WzJYGllZQnjAQD3EVarFU/54wAAAABJRU5ErkJggg==';

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
			{/* the temples go down behind the page; the lenses meet at a bridge with a nose pad */}
			<path d="M7.4 22.4v1.6M15.6 22.4v1.6" stroke="#9a9996" strokeWidth=".7" />
			<g stroke="#1c71d8" strokeWidth=".85" fill="#fff" fillOpacity=".35">
				<rect x="3.6" y="19.3" width="6.8" height="3.2" rx=".8" />
				<rect x="12" y="19.3" width="6.8" height="3.2" rx=".8" />
				<path d="M10.4 19.9c.4-.6 1.2-.6 1.6 0" fill="none" />
			</g>
			<circle cx="11.2" cy="19.3" r=".55" fill="#c0bfbc" />
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
	// mpv: a purple disc, lighter to the top left and darker to the bottom right, with a pale
	// rim, a dark well round a lavender-grey button (lighter at its top left) and a purple play
	// sign; the shading is layered discs, so the many icons on the page share no ids
	mpv: () => (
		<svg aria-hidden="true" focusable="false" viewBox="0 0 30 30">
			<circle cx="15" cy="15" r="13" fill="#ece5ef" />
			<circle cx="15" cy="15" r="12.1" fill="#4a1959" />
			<circle cx="14.3" cy="14.3" r="11.2" fill="#6e3080" opacity=".7" />
			<circle cx="13.6" cy="13.6" r="9.4" fill="#7d3c8f" opacity=".45" />
			<circle cx="15.6" cy="15.6" r="8.3" fill="#3a1046" opacity=".55" />
			<circle cx="15" cy="15" r="7" fill="#cbc1d3" />
			<circle cx="14.3" cy="14.3" r="5.8" fill="#e2dce7" opacity=".85" />
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
	// the default browser's icon, as on the real web row: a small bitmap drawn large, so soft and
	// blocky (a 20 px raster of a round white halo with small notches, a thick black ring, a face
	// white on the left and grey on the right, and a classic mouse pointer)
	web: () => (
		<img
			className="ssl-raster"
			src={WEB_ICON}
			alt=""
			width={30}
			height={30}
			decoding="async"
		/>
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
		Downloads: <path d="M15 5.5v10.5M10 11l5 5 5-5M8.4 21.2h13.2" />,
		Music: (
			<>
				<path d="M12 19V8.5l9-2V17" />
				<circle cx="10" cy="19.2" r="2.2" fill="currentColor" />
				<circle cx="19" cy="17.2" r="2.2" fill="currentColor" />
			</>
		),
		Pictures: <path d="M15 7.5 22.5 21h-15z" fill="currentColor" />,
		Projects: null,
		// a film frame: its side strips solid with square sprocket holes, thin edges between
		Videos: (
			<>
				<path d="M9.2 7.65h11.6M9.2 21.35h11.6" />
				<path
					fillRule="evenodd"
					fill="currentColor"
					stroke="none"
					d="M5 7h4.2v15H5zM6.25 9.2h1.7v1.3H6.25zM6.25 12.2h1.7v1.3H6.25zM6.25 15.2h1.7v1.3H6.25zM6.25 18.2h1.7v1.3H6.25zM20.8 7H25v15h-4.2zM22.05 9.2h1.7v1.3H22.05zM22.05 12.2h1.7v1.3H22.05zM22.05 15.2h1.7v1.3H22.05zM22.05 18.2h1.7v1.3H22.05z"
				/>
			</>
		),
	}[name];
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 30 30"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.3"
		>
			{sign}
		</svg>
	);
}
