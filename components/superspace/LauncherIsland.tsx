'use client';

import {
	Component,
	type ComponentType,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import type { LauncherProps } from './launcher/Launcher';

/**
 * Where the launcher goes on the page. Until it nears the screen, the page
 * shows its first frame (rendered on the server, inert); then it loads the
 * launcher and its demo index (a chunk of their own) and swaps them in. The
 * example searches under it load it at once when pressed first.
 */
export function LauncherIsland({
	initial,
	examples,
	labels,
	children,
}: {
	initial: string;
	examples: string[];
	labels: { caption: string; try: string; show: string };
	/** The first frame: the launcher as it opens, with `initial`'s result. */
	children: ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [Launcher, setLauncher] = useState<ComponentType<LauncherProps> | null>(
		null,
	);
	const [request, setRequest] = useState<{ q: string; n: number }>();
	const [current, setCurrent] = useState(initial);
	const loading = useRef(false);

	const load = useCallback(() => {
		if (loading.current) return;
		loading.current = true;
		import('./launcher/Launcher').then((m) => setLauncher(() => m.Launcher));
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					load();
					observer.disconnect();
				}
			},
			{ rootMargin: '900px 0px' },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [load]);

	return (
		<div className="ssl" ref={ref} data-ready={Launcher ? '' : undefined}>
			{Launcher ? (
				<Fallback to={children}>
					<Launcher initial={initial} request={request} onQuery={setCurrent} />
				</Fallback>
			) : (
				children
			)}
			<p className="ssl-caption">{labels.caption}</p>
			{/* the label sits in the row with the searches it introduces */}
			<ul className="ssl-try" aria-label={labels.show}>
				<li className="ssl-try-label" aria-hidden="true">
					{labels.try}
				</li>
				{examples.map((q) => (
					<li key={q}>
						<button
							type="button"
							className="ssl-try-chip"
							aria-current={q === current || undefined}
							onClick={() => {
								load();
								setRequest((r) => ({ q, n: (r?.n ?? 0) + 1 }));
								setCurrent(q);
							}}
						>
							{q}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

/** Should the launcher ever fail, the page keeps its first frame rather than a hole. */
class Fallback extends Component<
	{ to: ReactNode; children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? this.props.to : this.props.children;
	}
}
