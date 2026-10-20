import type { Chip as ChipData, Inline } from '@/content/site';
import { Icon } from './Icon';

/** A keyword pill: an ink disc with its icon, then the word. */
export function Chip({ chip, kind, icon }: ChipData) {
	return (
		<span className={`kw kw--${kind}`}>
			<span className="dot">
				<Icon name={icon} />
			</span>
			{chip}
		</span>
	);
}

/** Renders a run of typed inline content (see `Inline` in content/site.ts). */
export function InlineText({ parts }: { parts: Inline[] }) {
	return parts.map((part, i) => {
		if (typeof part === 'string') return part;
		// The content is static, so a part's position is a stable key.
		const key = i;
		if ('chip' in part) return <Chip key={key} {...part} />;
		if ('kbd' in part) return <kbd key={key}>{part.kbd}</kbd>;
		return (
			<span key={key} className="nw">
				<InlineText parts={part.nw} />
			</span>
		);
	});
}
