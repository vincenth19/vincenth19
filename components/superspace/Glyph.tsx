/**
 * Line glyphs for the Super Space product page, drawn for it on a 24px grid
 * (1.6px strokes in currentColor). The rest of the site uses Remix Icon
 * (components/Icon.tsx); these match the launcher's thinner, monospaced look.
 */
const glyphs = {
	search: (
		<>
			<circle cx="10.5" cy="10.5" r="6.5" />
			<path d="m15.5 15.5 5 5" />
		</>
	),
	doc: (
		<>
			<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
			<path d="M13.5 3.5v5h5M8.5 12.5h7M8.5 16h4.5" />
		</>
	),
	sheet: (
		<>
			<rect x="4.5" y="4.5" width="15" height="15" rx="2" />
			<path d="M4.5 9.5h15M4.5 14.5h15M10 9.5v10" />
		</>
	),
	slide: (
		<>
			<rect x="3.5" y="5" width="17" height="11.5" rx="1.8" />
			<path d="M12 16.5V20M8.5 20h7M7.5 9h6M7.5 12.2h4" />
		</>
	),
	video: (
		<>
			<rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
			<path d="M10.5 9.6v4.8l4-2.4z" fill="currentColor" />
		</>
	),
	emoji: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M8.6 14c.8 1.3 2 2 3.4 2s2.6-.7 3.4-2" />
			<path d="M9.2 9.6v.6M14.8 9.6v.6" strokeWidth="2" />
		</>
	),
	wifi: (
		<>
			<path d="M3.8 9.4a11.6 11.6 0 0 1 16.4 0M6.8 12.6a7.4 7.4 0 0 1 10.4 0M9.8 15.8a3.1 3.1 0 0 1 4.4 0" />
			<circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
		</>
	),
	time: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M12 7.5V12l3 2" />
		</>
	),
	web: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M3.5 12h17M12 3.5c2.2 2.4 3.4 5.2 3.4 8.5s-1.2 6.1-3.4 8.5c-2.2-2.4-3.4-5.2-3.4-8.5S9.8 5.9 12 3.5z" />
		</>
	),
	copy: (
		<>
			<rect x="8.5" y="8.5" width="11" height="11" rx="2" />
			<path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
		</>
	),
	check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
	arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
	enter: <path d="M18.5 5.5v6A2.5 2.5 0 0 1 16 14H6m3.5-3.5L6 14l3.5 3.5" />,
	play: <path d="M8 5.8v12.4L18 12z" fill="currentColor" />,
	pause: <path d="M8.5 5.5v13m7-13v13" strokeWidth="2.4" />,
} as const;

export type GlyphName = keyof typeof glyphs;

export function Glyph({ name }: { name: GlyphName }) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			className="ss-g"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{glyphs[name]}
		</svg>
	);
}
