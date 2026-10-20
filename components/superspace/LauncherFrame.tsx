import { search } from './launcher/engine';
import { Bar, Panel } from './launcher/View';

/**
 * The launcher's first frame, drawn on the server: the screen with the panel
 * open on `q` and its result, exactly as the launcher opens once it has loaded,
 * so nothing moves when it takes over. Inert until then.
 */
export function LauncherFrame({ q, label }: { q: string; label: string }) {
	const shown = search(q, true);
	return (
		<div className="ssl-screen" inert>
			<Bar now="" />
			<div className="ssl-stage">
				<Panel
					state={{ shown, sel: 0, hit: 0, mode: 'text' }}
					ids={{ list: 'ssl-first-list', option: (i) => `ssl-first-${i}` }}
					field={
						<input
							className="ssl-q"
							type="text"
							value={q}
							readOnly
							tabIndex={-1}
							aria-label={label}
						/>
					}
				/>
			</div>
			<p className="ssl-toast" />
		</div>
	);
}
