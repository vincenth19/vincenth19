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
	launcher,
	children,
}: {
	initial: string;
	examples: string[];
	labels: { caption: string; try: string; show: string };
	/** What the launcher takes from the page: its words, its pictures, the day's rates. */
	launcher: Pick<LauncherProps, 'labels' | 'thumbs' | 'rates'>;
	/** The first frame: the launcher as it opens, with `initial`'s result. */
	children: ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [Launcher, setLauncher] = useState<ComponentType<LauncherProps> | null>(
		null,
	);
	const [request, setRequest] = useState<LauncherProps['request']>();
	const [current, setCurrent] = useState(initial);
	const loading = useRef(false);

	const load = useCallback(() => {
		if (loading.current) return;
		loading.current = true;
		import('./launcher/Launcher').then(
			(m) => setLauncher(() => m.Launcher),
			// offline, or a page older than the site's last deploy: a later try may work
			() => {
				loading.current = false;
			},
		);
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
			{ rootMargin: '300px 0px' },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [load]);

	return (
		<div className="ssl" ref={ref} data-ready={Launcher ? '' : undefined}>
			{Launcher ? (
				<Fallback to={children}>
					<Launcher
						initial={initial}
						request={request}
						onQuery={setCurrent}
						{...launcher}
					/>
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
							// the search on screen, once the launcher is there to show it
							aria-current={(Launcher && q === current) || undefined}
							onClick={(e) => {
								load();
								// with a mouse or a key the caret goes to the field to refine it; a tap
								// leaves the on-screen keyboard closed
								const touch =
									(e.nativeEvent as PointerEvent).pointerType === 'touch';
								setRequest((r) => ({ q, n: (r?.n ?? 0) + 1, focus: !touch }));
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
