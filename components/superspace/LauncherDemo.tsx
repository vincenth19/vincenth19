'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { DemoItem } from '@/content/superspace';
import { type PanelIcons, QueryLine, Rows } from './Panel';

type Props = {
	items: DemoItem[];
	/** The last row's label: "Search the web for". */
	web: string;
	labels: { pause: string; play: string; show: string; chips: string };
	/** Rendered on the server, like the rest of the site's icons. */
	icons: PanelIcons & { pause: ReactNode };
};

type Phase = 'typing' | 'shown' | 'leaving';
type State = { i: number; typed: number; phase: Phase };

/** Per typed character, plus a little unevenness so it reads as a person typing. */
const TYPE_MS = 58;
/** The pause in typing after which results by meaning land. */
const SETTLE_MS = 420;
/** How long each search stays on screen. */
const HOLD_MS = 3600;
/** The results fold away before the next query. */
const LEAVE_MS = 420;

/**
 * The launcher, built in HTML: it types the example searches one after another and
 * shows what each finds. It only runs while it is on screen, the tab is visible
 * and motion is welcome; otherwise (and before hydration) it shows one search,
 * complete and still. The panel is hidden from screen readers: the page gives
 * them the same searches as a plain list.
 */
export function LauncherDemo({ items, web, labels, icons }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const chipsRef = useRef<HTMLUListElement>(null);
	const [state, setState] = useState<State>({
		i: 0,
		typed: items[0].query.length,
		phase: 'shown',
	});
	const [motion, setMotion] = useState(false);
	const [inView, setInView] = useState(false);
	const [visible, setVisible] = useState(true);
	const [paused, setPaused] = useState(false);
	/** What a chip press says to screen readers: the panel itself is hidden from them. */
	const [said, setSaid] = useState('');
	const sayTimer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(sayTimer.current), []);
	const running = motion && inView && visible && !paused;

	useEffect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			setMotion(!query.matches);
			// motion turned off mid-search: finish it, still
			if (query.matches) setState((s) => complete(items, s.i));
		};
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, [items]);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => setInView(entry.isIntersecting),
			{ threshold: 0.3 },
		);
		observer.observe(el);
		const onVisibility = () =>
			setVisible(document.visibilityState === 'visible');
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			observer.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, []);

	useEffect(() => {
		if (!running) return;
		const query = items[state.i].query;
		let delay: number;
		let next: State;
		if (state.phase === 'typing' && state.typed < query.length) {
			delay = TYPE_MS + ((state.typed * 7) % 5) * 14;
			next = { ...state, typed: state.typed + 1 };
		} else if (state.phase === 'typing') {
			delay = SETTLE_MS;
			next = { ...state, phase: 'shown' };
		} else if (state.phase === 'shown') {
			delay = HOLD_MS;
			next = { ...state, phase: 'leaving' };
		} else {
			delay = LEAVE_MS;
			next = { i: (state.i + 1) % items.length, typed: 0, phase: 'typing' };
		}
		const timer = window.setTimeout(() => setState(next), delay);
		return () => window.clearTimeout(timer);
	}, [running, state, items]);

	// Where the chips do not fit one row (phones, tablets) the row scrolls
	// sideways: keep the one on screen in view, by scrolling that row only
	// (never the page).
	useEffect(() => {
		const row = chipsRef.current;
		const chip = row?.children[state.i] as HTMLElement | undefined;
		if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
		// the row is positioned, so a chip's offsetLeft is measured from it
		const left = chip.offsetLeft;
		const right = left + chip.offsetWidth;
		if (left >= row.scrollLeft && right <= row.scrollLeft + row.clientWidth) {
			return;
		}
		row.scrollTo({
			left: Math.max(0, left - 24),
			behavior: motion ? 'smooth' : 'auto',
		});
	}, [state.i, motion]);

	function show(i: number) {
		// empty the live region first, so pressing the same chip again is read again
		setSaid('');
		window.clearTimeout(sayTimer.current);
		sayTimer.current = window.setTimeout(() => setSaid(items[i].said), 40);
		setState(
			motion && !paused ? { i, typed: 0, phase: 'typing' } : complete(items, i),
		);
	}

	function togglePause() {
		// a paused demo shows the whole search it was on
		if (!paused) setState((s) => complete(items, s.i));
		setPaused(!paused);
	}

	const item = items[state.i];
	const typing = state.phase === 'typing' && state.typed < item.query.length;

	return (
		<div className="ss-launcher" ref={ref}>
			{/* the slot keeps the panel's full height, so the page does not move */}
			<div className="ss-slot">
				<div className="ss-panel" data-phase={state.phase} aria-hidden="true">
					<QueryLine icons={icons}>
						{item.query.slice(0, state.typed)}
						<span className={typing ? 'ss-caret' : 'ss-caret is-idle'} />
					</QueryLine>
					<div className="ss-results">
						<Rows item={item} icons={icons} web={web} />
					</div>
				</div>
			</div>
			{/* under the panel, so nothing that is not Super Space's sits inside it */}
			<div className="ss-demo-controls">
				<ul className="ss-chips" aria-label={labels.chips} ref={chipsRef}>
					{items.map((it, i) => (
						<li key={it.query}>
							<button
								type="button"
								className="ss-chip"
								// marks the search on screen; not a pressed state, which
								// would change by itself as the demo moves on
								aria-current={i === state.i || undefined}
								onClick={() => show(i)}
							>
								<span className="sr-only">{labels.show} </span>
								{it.query}
							</button>
						</li>
					))}
				</ul>
				{/* in the server HTML too, unseen until we know motion is welcome, so
				    nothing below moves when the page hydrates; CSS removes it for
				    reduced motion, where nothing moves and there is nothing to pause */}
				<button
					type="button"
					className={motion ? 'ss-pause' : 'ss-pause is-waiting'}
					aria-label={paused ? labels.play : labels.pause}
					onClick={togglePause}
				>
					{paused ? icons.play : icons.pause}
				</button>
			</div>
			<p className="sr-only" aria-live="polite">
				{said}
			</p>
		</div>
	);
}

function complete(items: DemoItem[], i: number): State {
	return { i, typed: items[i].query.length, phase: 'shown' };
}
