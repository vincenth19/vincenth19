/**
 * The Super Space mark: a cream space bar wearing a red cape, on a royal-blue
 * rounded tile (viewBox 512). `id` keeps its gradient ids unique when the page
 * shows it more than once.
 */
export function Logo({ id, className }: { id: string; className?: string }) {
	const tile = `${id}-tile`;
	const cape = `${id}-cape`;
	const skirt = `${id}-skirt`;
	const top = `${id}-top`;
	return (
		<svg
			className={className}
			viewBox="0 0 512 512"
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				<linearGradient id={tile} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#2B43E0" />
					<stop offset="1" stopColor="#141B78" />
				</linearGradient>
				<linearGradient id={cape} x1="1" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#FF4D3B" />
					<stop offset="1" stopColor="#E3271E" />
				</linearGradient>
				<linearGradient id={skirt} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#C9BDA5" />
					<stop offset="1" stopColor="#A99A7E" />
				</linearGradient>
				<linearGradient id={top} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#FFFFFF" />
					<stop offset="1" stopColor="#EFE7D8" />
				</linearGradient>
			</defs>
			<rect width="512" height="512" rx="114" fill={`url(#${tile})`} />
			<g transform="translate(289 196) rotate(-14) scale(1.04) translate(-290 -190)">
				<path
					d="M190 160C162 150 132 148 120 158C104 176 88 206 52 230C90 248 120 266 148 286C174 304 192 324 214 336C232 346 248 356 262 380C284 336 314 312 342 300C376 284 404 254 424 214L420 190Z"
					fill={`url(#${cape})`}
				/>
				<path
					d="M306 230C294 276 256 310 214 336C246 302 266 268 278 230Z"
					fill="#AE1F18"
				/>
				<path
					d="M148 224H418L412 230C406 240 400 246 392 250H172C158 246 150 236 148 224Z"
					fill="#7A140F"
					fillOpacity="0.4"
				/>
				<rect
					x="132"
					y="146"
					width="316"
					height="84"
					rx="24"
					fill={`url(#${skirt})`}
				/>
				<rect
					x="146"
					y="150"
					width="288"
					height="50"
					rx="14"
					fill={`url(#${top})`}
				/>
			</g>
		</svg>
	);
}
