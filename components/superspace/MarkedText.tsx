import type { Marked } from '@/content/superspace';

/** Renders a run of text: `mark` parts highlighted, `code` parts in Fragment Mono. */
export function MarkedText({ parts }: { parts: Marked[] }) {
	return parts.map((part, i) => {
		if (typeof part === 'string') return part;
		// The content is static, so a part's position is a stable key.
		const key = i;
		if ('mark' in part) return <mark key={key}>{part.mark}</mark>;
		return <code key={key}>{part.code}</code>;
	});
}

/** The same run as plain text. */
export function plain(parts: Marked[]): string {
	return parts
		.map((part) => {
			if (typeof part === 'string') return part;
			return 'mark' in part ? part.mark : part.code;
		})
		.join('');
}
