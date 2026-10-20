import type { Marked } from '@/content/superspace';

/**
 * Renders a run of text: `mark` parts highlighted, `code` parts in Fragment
 * Mono, `word` parts as key words (in full ink, where the run is dimmed).
 */
export function MarkedText({ parts }: { parts: Marked[] }) {
	return parts.map((part, i) => {
		if (typeof part === 'string') return part;
		// The content is static, so a part's position is a stable key.
		const key = i;
		if ('mark' in part) return <mark key={key}>{part.mark}</mark>;
		if ('word' in part) return <b key={key}>{part.word}</b>;
		return <code key={key}>{part.code}</code>;
	});
}

/** The same run as plain text. */
export function plain(parts: Marked[]): string {
	return parts
		.map((part) => {
			if (typeof part === 'string') return part;
			if ('mark' in part) return part.mark;
			if ('word' in part) return part.word;
			return part.code;
		})
		.join('');
}
