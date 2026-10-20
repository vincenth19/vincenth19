import type { ReactNode } from 'react';
import type { DemoIcon, DemoItem } from '@/content/superspace';
import { MarkedText } from './MarkedText';

/**
 * The launcher's panel, used by the live demo (a client component). No state
 * here: the demo decides what is typed and when the results show.
 */

export type PanelIcons = Record<
	DemoIcon | 'search' | 'enter' | 'play',
	ReactNode
>;

/** The query line: the search glyph, then what is typed. */
export function QueryLine({
	icons,
	children,
}: {
	icons: PanelIcons;
	children: ReactNode;
}) {
	return (
		<div className="ss-query">
			{icons.search}
			<span className="ss-q">{children}</span>
		</div>
	);
}

/** One search's rows: its results, then "Search the web for …", never on top. */
export function Rows({
	item,
	icons,
	web,
}: {
	item: DemoItem;
	icons: PanelIcons;
	/** The web row's label; leave it out for a panel without one. */
	web?: string;
}) {
	return (
		<ul className="ss-rows">
			{item.rows.map((row, j) => (
				<li
					key={`${row.icon} ${row.meta.join()}`}
					className={`ss-row ss-row--${row.icon}${j === 0 ? ' is-sel' : ''}`}
				>
					<span className={row.tile ? 'ss-tile ss-tile--big' : 'ss-tile'}>
						{row.tile ?? icons[row.icon]}
					</span>
					<span className="ss-row-text">
						{/* the text has a box of its own, so a headline too long for the
						    row ends in an ellipsis instead of being cut mid-word */}
						<span className="ss-head">
							{row.moments ? (
								row.moments.map((m) => (
									<span key={m} className="ss-moment">
										{icons.play}
										{m}
									</span>
								))
							) : (
								<span className="ss-head-text">
									<MarkedText parts={row.headline} />
								</span>
							)}
						</span>
						{row.meta.length > 0 && (
							<span className="ss-meta">{row.meta.join(' · ')}</span>
						)}
					</span>
					{j === 0 && row.hint && (
						<span className="ss-hint">
							{icons.enter}
							{row.hint}
						</span>
					)}
				</li>
			))}
			{web && (
				<li className="ss-row ss-row--web">
					<span className="ss-tile">{icons.web}</span>
					<span className="ss-row-text">
						<span className="ss-head">
							<span className="ss-head-text">
								{web} “{item.query}”
							</span>
						</span>
					</span>
				</li>
			)}
		</ul>
	);
}
