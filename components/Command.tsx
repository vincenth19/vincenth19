import type { ReactNode } from 'react';

/**
 * A shell command that stays on one line on desktop and, on narrow screens,
 * breaks only at spaces, after the slashes of a URL path and after the dots
 * of a reverse-domain id.
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

	/** A word that may break only after the given chunks (a URL's slashes, an id's dots). */
	const chunked = (chunks: string[]) => {
		chunks.forEach((chunk, j) => {
			if (j > 0) push(<wbr key={parts.length} />);
			push(nw(chunk));
		});
	};
	/** The same, held in a .cmd-id, which a stylesheet may keep whole where it fits. */
	const id = (chunks: string[]) => {
		const inner: ReactNode[] = [];
		for (const chunk of chunks) {
			if (inner.length) inner.push(<wbr key={inner.length} />);
			inner.push(
				<span key={inner.length} className="nw">
					{chunk}
				</span>,
			);
		}
		return (
			<span key={parts.length} className="cmd-id">
				{inner}
			</span>
		);
	};

	text.split(' ').forEach((word, i) => {
		if (i > 0) push(' ');
		const url = /^([a-z]+:\/\/[^/]+\/)(.*)$/i.exec(word);
		if (url) {
			chunked([url[1], ...url[2].split(/(?<=\/)/).filter(Boolean)]);
		} else if (/^[a-z\d-]+(\.[a-z\d-]+){2,}$/i.test(word)) {
			// a reverse-domain id (io.github.…): after its dots
			push(id(word.split(/(?<=\.)/)));
		} else if (/[^\w]/.test(word)) {
			// hyphens are break opportunities too, so keep flags and names whole
			push(nw(word));
		} else {
			push(word);
		}
	});
	return parts;
}
