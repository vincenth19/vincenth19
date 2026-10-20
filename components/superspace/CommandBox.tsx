import { Command } from '@/components/Command';
import { superSpace } from '@/content/superspace';
import { CopyButton } from './CopyButton';
import { Glyph } from './Glyph';

/**
 * A shell command in Fragment Mono with a Copy button. On narrow screens the
 * command wraps inside its box, at spaces and after the slashes of a URL.
 */
export function CommandBox({
	id,
	command,
	what,
	size = 'lg',
}: {
	/** Unique on the page: the button selects this element if copying fails. */
	id: string;
	command: string;
	/** What is copied, for screen readers: "install command". */
	what: string;
	size?: 'lg' | 'sm';
}) {
	const { ui } = superSpace;
	return (
		<div className={`ss-cmd ss-cmd--${size}`}>
			<span className="ss-prompt" aria-hidden="true">
				$
			</span>
			<code id={id}>
				<Command text={command} />
			</code>
			<CopyButton
				text={command}
				target={id}
				label={ui.copy}
				doneLabel={ui.copied}
				what={what}
				failed={ui.copyFailed}
				icon={<Glyph name="copy" />}
				doneIcon={<Glyph name="check" />}
			/>
		</div>
	);
}
