import { Fragment } from 'react';
import { Command } from '@/components/Command';
import { superSpace } from '@/content/superspace';
import { CopyButton } from './CopyButton';
import { Glyph } from './Glyph';

/**
 * A shell command in Fragment Mono with a Copy button. On narrow screens the
 * command wraps inside its box, at spaces and after the slashes of a URL.
 * Several commands, to run one after the other, go one a line, each with its
 * prompt, and Copy copies them all, a line each.
 */
export function CommandBox({
	id,
	command,
	what,
	size = 'lg',
}: {
	/** Unique on the page: the button selects this element if copying fails. */
	id: string;
	command: string | readonly string[];
	/** What is copied, for screen readers: "install command". */
	what: string;
	size?: 'lg' | 'sm';
}) {
	const { ui } = superSpace;
	const one = typeof command === 'string';
	return (
		<div className={`ss-cmd ss-cmd--${size}${one ? '' : ' ss-cmd--lines'}`}>
			{one && (
				<span className="ss-prompt" aria-hidden="true">
					$
				</span>
			)}
			<code id={id}>
				{typeof command === 'string' ? (
					<Command text={command} />
				) : (
					command.map((line, i) => (
						<Fragment key={line}>
							{/* a line break in the text (copied by hand), not on screen */}
							{i > 0 && '\n'}
							<span className="ss-cmd-line">
								<Command text={line} />
							</span>
						</Fragment>
					))
				)}
			</code>
			<CopyButton
				text={typeof command === 'string' ? command : command.join('\n')}
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
