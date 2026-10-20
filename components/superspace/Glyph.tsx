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
	video: (
		<>
			<rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
			<path d="M10.5 9.6v4.8l4-2.4z" fill="currentColor" />
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
	play: <path d="M8 5.8v12.4L18 12z" fill="currentColor" />,
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
