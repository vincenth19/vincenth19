import type { ReactNode } from 'react';

/**
 * A shell command that stays on one line on desktop and, on narrow screens,
 * breaks only at spaces and after the slashes of a URL path.
 */
export function Command({ text }: { text: string }) {
	const parts: ReactNode[] = [];
	// Adjacent plain words join into one text node, so kerning runs across them.
	const push = (part: ReactNode) => {
		const last = parts.length - 1;
		if (typeof part === 'string' && typeof parts[last] === 'string') {
			parts[last] += part;
		} else {
			parts.push(part);
		}
	};
	const nw = (chunk: string) => (
		<span key={parts.length} className="nw">
			{chunk}
		</span>
	);

	text.split(' ').forEach((word, i) => {
		if (i > 0) push(' ');
		const url = /^([a-z]+:\/\/[^/]+\/)(.*)$/i.exec(word);
		if (url) {
			const chunks = [url[1], ...url[2].split(/(?<=\/)/).filter(Boolean)];
			chunks.forEach((chunk, j) => {
				if (j > 0) push(<wbr key={parts.length} />);
				push(nw(chunk));
			});
		} else if (/[^\w]/.test(word)) {
			// hyphens are break opportunities too, so keep flags and names whole
			push(nw(word));
		} else {
			push(word);
		}
	});
	return parts;
}
