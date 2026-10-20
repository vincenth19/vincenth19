'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { DemoIcon, DemoItem } from '@/content/superspace';
import { MarkedText } from './MarkedText';

type Props = {
	items: DemoItem[];
	/** The last row's label: "Search the web for". */
	web: string;
	labels: { pause: string; play: string; show: string };
	/** Rendered on the server, like the rest of the site's icons. */
	icons: Record<DemoIcon | 'search' | 'enter' | 'play' | 'pause', ReactNode>;
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
	const [state, setState] = useState<State>({
		i: 0,
		typed: items[0].query.length,
		phase: 'shown',
	});
	const [motion, setMotion] = useState(false);
	const [inView, setInView] = useState(false);
	const [visible, setVisible] = useState(true);
	const [paused, setPaused] = useState(false);
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

	function show(i: number) {
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
			<div className="ss-panel" data-phase={state.phase} aria-hidden="true">
				<div className="ss-query">
					{icons.search}
					<span className="ss-q">
						{item.query.slice(0, state.typed)}
						<span className={typing ? 'ss-caret' : 'ss-caret is-idle'} />
					</span>
				</div>
				<div className="ss-results">
					<ul className="ss-rows">
						{item.rows.map((row, j) => (
							<li
								// rows are static per search: the search and position identify them
								key={`${item.query}-${j}`}
								className={`ss-row ss-row--${row.icon}${j === 0 ? ' is-sel' : ''}`}
							>
								<span className="ss-tile">{icons[row.icon]}</span>
								<span className="ss-row-text">
									<span className="ss-head">
										{row.moments
											? row.moments.map((m) => (
													<span key={m} className="ss-moment">
														{icons.play}
														{m}
													</span>
												))
											: <MarkedText parts={row.headline} />}
									</span>
									<span className="ss-meta">{row.meta.join(' · ')}</span>
								</span>
								{j === 0 && row.hint && (
									<span className="ss-hint">
										{icons.enter}
										{row.hint}
									</span>
								)}
							</li>
						))}
						<li className="ss-row ss-row--web">
							<span className="ss-tile">{icons.web}</span>
							<span className="ss-row-text">
								<span className="ss-head">
									{web} “{item.query}”
								</span>
							</span>
						</li>
					</ul>
				</div>
			</div>
			<div className="ss-demo-controls">
				<ul className="ss-chips">
					{items.map((it, i) => (
						<li key={it.query}>
							<button
								type="button"
								className="ss-chip"
								aria-pressed={i === state.i}
								onClick={() => show(i)}
							>
								<span className="sr-only">{labels.show} </span>
								{it.query}
							</button>
						</li>
					))}
				</ul>
				{motion && (
					<button
						type="button"
						className="ss-pause"
						aria-label={paused ? labels.play : labels.pause}
						onClick={togglePause}
					>
						{paused ? icons.play : icons.pause}
					</button>
				)}
			</div>
		</div>
	);
}

function complete(items: DemoItem[], i: number): State {
	return { i, typed: items[i].query.length, phase: 'shown' };
}
