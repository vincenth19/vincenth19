'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

type Props = {
	/** Exactly what goes on the clipboard. */
	text: string;
	/** The id of the element that shows the text; selected if copying fails. */
	target: string;
	/** The visible label, then the label once copied: "Copy", "Copied". */
	label: string;
	doneLabel: string;
	/** Read after the label, for screen readers: "Copy install command". */
	what: string;
	/** Announced when the clipboard refuses. */
	failed: string;
	/** Rendered on the server, like the rest of the site's icons. */
	icon: ReactNode;
	doneIcon: ReactNode;
};

/** Copies a command, says "Copied" on the button and announces it to screen readers. */
export function CopyButton({
	text,
	target,
	label,
	doneLabel,
	what,
	failed,
	icon,
	doneIcon,
}: Props) {
	const [done, setDone] = useState(false);
	const [message, setMessage] = useState('');
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	async function copy() {
		window.clearTimeout(timer.current);
		// empty the live region first, so a second copy is announced again
		setMessage('');
		let ok = true;
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			ok = false;
			// leave the command selected, ready to copy by hand
			const el = document.getElementById(target);
			const selection = window.getSelection();
			if (el && selection) {
				const range = document.createRange();
				range.selectNodeContents(el);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
		setDone(ok);
		timer.current = window.setTimeout(() => {
			setMessage(ok ? doneLabel : failed);
			timer.current = window.setTimeout(() => {
				setDone(false);
				setMessage('');
			}, 2400);
		}, 40);
	}

	return (
		<>
			<button
				type="button"
				className="ss-copy"
				data-done={done || undefined}
				onClick={copy}
			>
				{done ? doneIcon : icon}
				<span className="ss-copy-label">{done ? doneLabel : label}</span>
				<span className="sr-only"> {what}</span>
			</button>
			<output className="sr-only" aria-live="polite">
				{message}
			</output>
		</>
	);
}
