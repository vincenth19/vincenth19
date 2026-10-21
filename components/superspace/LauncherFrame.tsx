import type { LauncherLabels } from '@/content/superspace';
import type { Rates } from './launcher/answers';
import { search } from './launcher/engine';
import { Bar, Desktop, Panel, type Thumbs } from './launcher/View';

/**
 * The launcher's first frame, drawn on the server: the screen with the panel
 * open on `q` and its result, exactly as the launcher opens once it has loaded,
 * so nothing moves when it takes over. Inert until then.
 */
export function LauncherFrame({
	q,
	labels,
	thumbs,
	rates,
}: {
	q: string;
	labels: LauncherLabels;
	thumbs?: Thumbs;
	rates?: Rates | null;
}) {
	const shown = search(q, true, { rates });
	return (
		<div className="ssl-screen" inert>
			<Bar now="" />
			<Desktop />
			<div className="ssl-stage">
				<Panel
					state={{ shown, sel: 0, hit: 0, mode: 'text', thumbs }}
					ids={{ list: 'ssl-first-list', option: (i) => `ssl-first-${i}` }}
					labels={labels}
					field={
						<input
							className="ssl-q"
							type="text"
							value={q}
							readOnly
							tabIndex={-1}
							aria-label={labels.field}
						/>
					}
				/>
			</div>
			<p className="ssl-toast" />
		</div>
	);
}
