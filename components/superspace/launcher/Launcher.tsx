'use client';

import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react';
import { search } from './engine';
import type { Loc, Response, Row } from './types';
import {
	Bar,
	clock,
	type DrawnRow,
	drawRows,
	type Mode,
	Panel,
	partsOf,
	type ViewState,
	where,
} from './View';

/**
 * Super Space's launcher, running in the page over the demo home. It behaves
 * as SuperSpace.qml does: each keystroke shows the instant phase (names,
 * answers) at once and the final phase (by meaning) 150 ms after typing
 * pauses; while typing, results only add, and 400 ms after the last key they
 * show as they are, so typing is calm. ↓/↑ choose a row, →/← step its pages or
 * sections, Tab lists them, Enter opens. Opening anything here only says what
 * the real launcher would do.
 */

const FINAL_MS = 150;
const CALM_MS = 400;

const blank: Response = {
	q: '',
	phase: 'final',
	rows: [],
	answer: null,
	empty: false,
	filter: null,
};

const rowsOf = (v: ViewState) => drawRows(v.shown.rows);
const offsetOf = (v: ViewState) => (v.shown.answer ? 1 : 0);
function currentOf(v: ViewState): DrawnRow | undefined {
	const o = offsetOf(v);
	return v.sel >= o ? rowsOf(v)[v.sel - o] : undefined;
}

/** For screen readers: how many results, once they settle, and the first. */
function statusOf(r: Response) {
	const local = r.rows.filter((x) => x.kind !== 'web');
	const top = r.answer
		? `${r.answer.input} is ${r.answer.output}`
		: (local[0]?.title ?? '');
	return r.empty
		? 'Nothing on this computer matches'
		: `${local.length + (r.answer ? 1 : 0)} results. First: ${top}`;
}

export type LauncherProps = {
	/** The query it opens with: the page's first paint showed its result. */
	initial: string;
	/** A query to show, from the example chips under the screen. */
	request?: { q: string; n: number };
	/** Tells the page what is in the field, so its chips can mark the one on screen. */
	onQuery?: (q: string) => void;
};

export function Launcher({ initial, request, onQuery }: LauncherProps) {
	const base = useId();
	const ids = {
		list: `${base}-list`,
		option: (i: number) => `${base}-opt-${i}`,
	};
	const card = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState(initial);
	const [view, setView] = useState<ViewState>(() => ({
		shown: initial ? search(initial, true) : blank,
		sel: 0,
		hit: 0,
		mode: 'text',
	}));
	const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
	const [status, setStatus] = useState('');
	const [width, setWidth] = useState<number | undefined>(undefined);
	const [now, setNow] = useState<string>('');

	// what the timers and key handlers read without waiting for a render
	const live = useRef({
		view,
		last: view.shown,
		typing: 0 as number | ReturnType<typeof setTimeout>,
		final: 0 as number | ReturnType<typeof setTimeout>,
		selected: false,
		focusing: false,
		/** Where the field's selection was: a select event that did not move it is no move. */
		caret: [-1, -1] as [number, number],
	});
	live.current.view = view;

	/** Puts a response on screen; while typing it only adds (SuperSpace.qml `show`). */
	const show = useCallback((msg: Response, calm: boolean) => {
		setView((v) => {
			let next = msg;
			if (calm) {
				const local = (r: Row) => r.kind !== 'web';
				const keys = new Set(msg.rows.map((r) => r.key));
				const old = v.shown.rows.filter((r) => local(r) && !keys.has(r.key));
				next = {
					...msg,
					answer: msg.answer ?? v.shown.answer,
					empty: msg.empty && v.shown.empty,
					filter: msg.filter ?? v.shown.filter,
					rows: [
						...msg.rows.filter(local),
						...old,
						...msg.rows.filter((r) => !local(r)),
					],
				};
			}
			// the top until a key chose a row; a chosen row keeps the selection by its key
			const keep = v.mode !== 'text' ? currentOf(v)?.key : undefined;
			const nv: ViewState = { ...v, shown: next, hover: undefined };
			const found = keep
				? drawRows(next.rows).findIndex((r) => r.key === keep)
				: -1;
			if (
				found < 0 ||
				(next.answer &&
					JSON.stringify(next.answer) !== JSON.stringify(v.shown.answer))
			) {
				nv.sel = 0;
				nv.hit = 0;
				nv.mode = 'text';
			} else {
				nv.sel = found + (next.answer ? 1 : 0);
			}
			return nv;
		});
	}, []);

	/** A new query: the instant phase now, the final one once typing pauses. */
	const run = useCallback(
		(q: string) => {
			const l = live.current;
			clearTimeout(l.final);
			clearTimeout(l.typing);
			if (!q.trim()) {
				l.last = blank;
				show(blank, false);
				setStatus('');
				return;
			}
			show(search(q, false), true);
			l.typing = setTimeout(() => {
				l.typing = 0;
				if (l.last.q === q.trim()) {
					show(l.last, false);
					setStatus(statusOf(l.last));
				}
			}, CALM_MS);
			l.final = setTimeout(() => {
				l.final = 0;
				l.last = search(q, true);
				show(l.last, l.typing !== 0);
				if (!l.typing) setStatus(statusOf(l.last));
			}, FINAL_MS);
		},
		[show],
	);

	/** Keys that act on a row end the calm first, so they never act on a row left from an earlier query. */
	function settle(): ViewState {
		const l = live.current;
		const q = query.trim();
		if (!q) return l.view;
		clearTimeout(l.typing);
		l.typing = 0;
		if (l.last.q !== q) {
			clearTimeout(l.final);
			l.final = 0;
			l.last = search(q, true);
		}
		if (l.view.shown !== l.last) {
			show(l.last, false);
			setStatus(statusOf(l.last));
		}
		const v = { ...l.view, shown: l.last };
		const keep = l.view.mode !== 'text' ? currentOf(l.view)?.key : undefined;
		const found = keep
			? drawRows(l.last.rows).findIndex((r) => r.key === keep)
			: -1;
		return found < 0
			? { ...v, sel: 0, hit: 0, mode: 'text' }
			: { ...v, sel: found + (l.last.answer ? 1 : 0) };
	}

	// once mounted: the clock in the bar, and the timeline's width for its labels
	useEffect(() => {
		const l = live.current;
		const tick = () =>
			setNow(
				new Date()
					.toLocaleString('en-AU', {
						weekday: 'long',
						hour: '2-digit',
						minute: '2-digit',
						hour12: false,
					})
					.replace(',', ''),
			);
		tick();
		const timer = setInterval(tick, 15_000);
		const el = card.current;
		const observer = new ResizeObserver(() => {
			const bar = el?.querySelector('.ssl-timeline');
			setWidth(bar ? bar.getBoundingClientRect().width : undefined);
		});
		if (el) observer.observe(el);
		return () => {
			clearInterval(timer);
			observer.disconnect();
			clearTimeout(l.final);
			clearTimeout(l.typing);
		};
	}, []);

	// a chip under the screen asks for a search: shown at once, as if typing had paused
	useEffect(() => {
		if (!request) return;
		const l = live.current;
		clearTimeout(l.final);
		clearTimeout(l.typing);
		l.typing = 0;
		setQuery(request.q);
		l.last = search(request.q, true);
		setView((v) => ({ ...v, shown: l.last, sel: 0, hit: 0, mode: 'text' }));
		setStatus(statusOf(l.last));
	}, [request]);

	// a row chosen with ↓/↑ scrolls into the list's view, the list only
	useEffect(() => {
		if (view.mode === 'text') return;
		const el = document.getElementById(`${base}-opt-${view.sel}`);
		const list = el?.closest<HTMLElement>('[role="listbox"]');
		if (!el || !list) return;
		const top = el.offsetTop - list.offsetTop;
		if (top < list.scrollTop) list.scrollTop = top;
		else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) {
			list.scrollTop = top + el.offsetHeight - list.clientHeight;
		}
	}, [view.sel, view.mode, base]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 4200);
		return () => clearTimeout(t);
	}, [toast]);

	function notify(text: string) {
		setToast((t) => ({ text, n: (t?.n ?? 0) + 1 }));
	}

	/** What Enter (or Ctrl+Enter) would do on the real machine, said plainly. */
	function open(v: ViewState, index: number, pick: number, alt = false) {
		const o = offsetOf(v);
		const answer = v.shown.answer;
		if (index < o && answer) {
			if (!answer.copy) {
				notify(answer.detail);
				return;
			}
			navigator.clipboard?.writeText(answer.copy).then(
				() => notify(`Copied ${answer.copy}`),
				() => notify(`Would copy ${answer.copy}`),
			);
			return;
		}
		const row = rowsOf(v)[index - o];
		if (!row) return;
		const hit = pick >= 0 ? pick : index === v.sel ? v.hit : 0;
		const target = row.strip ? (row.strip[hit] ?? row.strip[0]) : row;
		notify(message(target, row.hits[hit], alt, v.shown.q));
	}

	function seek(v: ViewState, index: number, t: number) {
		const row = rowsOf(v)[index - offsetOf(v)];
		if (row) notify(`Would play ${row.title} from ${clock(t)} in mpv`);
	}

	/** The first ↑/↓ from the field stays on the highlighted row, giving ←/→ to its parts; the next ones move. */
	function move(v: ViewState, step: number): ViewState {
		const count = offsetOf(v) + rowsOf(v).length;
		if (!count) return v;
		const sel =
			v.mode !== 'text'
				? Math.max(0, Math.min(count - 1, v.sel + step))
				: v.sel;
		return { ...v, sel, hit: sel === v.sel ? v.hit : 0, mode: 'rows' };
	}

	/** ←/→ walk the selected row's hits in drawn order. */
	function stepHit(v: ViewState, step: number): ViewState {
		const row = currentOf(v);
		const order = row?.order ?? [];
		if (!order.length) return v;
		const at = order.indexOf(v.hit);
		return {
			...v,
			hit: order[Math.max(0, Math.min(order.length - 1, at + step))],
		};
	}

	function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		const ctrl = e.ctrlKey || e.metaKey;
		const plain = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
		const el = e.currentTarget;
		const atEnd =
			el.selectionStart === el.value.length &&
			el.selectionEnd === el.value.length;
		const v = live.current.view;
		let next: ViewState | null = null;
		if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n'))
			next = move(settle(), 1);
		else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p'))
			next = move(settle(), -1);
		else if (e.key === 'Enter') {
			const s = settle();
			setView(s);
			open(s, s.sel, -1, ctrl);
		} else if (e.key === 'Escape') {
			if (v.mode === 'sections') next = { ...v, mode: 'text' };
			else if (query) {
				setQuery('');
				onQuery?.('');
				run('');
			} else {
				return;
			}
		} else if (
			(e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
			plain &&
			v.mode !== 'text'
		) {
			next = stepHit(v, e.key === 'ArrowLeft' ? -1 : 1);
		} else if (e.key === 'ArrowRight' && plain && atEnd) {
			// → where the cursor cannot go further steps the top row's parts
			const s = settle();
			next = partsOf(currentOf(s)) ? stepHit({ ...s, mode: 'rows' }, 1) : null;
			if (!next) {
				setView(s);
				return;
			}
		} else if (e.key === 'Tab' && !e.shiftKey && !ctrl) {
			const s = settle();
			const row = currentOf(s);
			// a row with parts lists them; otherwise Tab leaves the box, as it should on a page
			if (
				!row ||
				v.mode === 'sections' ||
				(row.hits.length < 2 && (row.strip?.length ?? 0) < 2)
			) {
				return;
			}
			next = { ...s, mode: 'sections' };
		} else if (e.key === 'Tab' && e.shiftKey && v.mode === 'sections') {
			next = { ...v, mode: 'text' };
		} else if (ctrl && /^[1-9]$/.test(e.key)) {
			const s = settle();
			setView(s);
			open(s, offsetOf(s) + Number(e.key) - 1, -1);
		} else {
			return;
		}
		e.preventDefault();
		if (next) setView(next);
	}

	const handlers = {
		onOpen: (index: number, pick: number) => {
			const v = live.current.view;
			const nv = {
				...v,
				sel: index,
				hit: pick >= 0 ? pick : index === v.sel ? v.hit : 0,
			};
			setView(nv);
			open(nv, index, pick);
		},
		onSeek: (index: number, t: number) => seek(live.current.view, index, t),
		onHover: (key: string, t: number | null) =>
			setView((v) => ({ ...v, hover: t === null ? undefined : { key, t } })),
	};

	const current = currentOf(view);
	const offset = offsetOf(view);
	const expanded = view.shown.rows.length > 0 || !!view.shown.answer;
	const active =
		view.mode !== 'text' && (current || view.sel < offset)
			? ids.option(view.sel)
			: undefined;

	return (
		<div className="ssl-screen" ref={card}>
			<Bar now={now} />
			<div className="ssl-stage">
				<Panel
					state={{ ...view, width }}
					ids={ids}
					handlers={handlers}
					field={
						<>
							<label className="sr-only" htmlFor={`${base}-q`}>
								Search the demo files
							</label>
							<input
								id={`${base}-q`}
								className="ssl-q"
								type="text"
								role="combobox"
								aria-expanded={expanded}
								aria-controls={ids.list}
								aria-autocomplete="list"
								aria-activedescendant={active}
								aria-describedby={`${base}-keys`}
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="none"
								spellCheck={false}
								enterKeyHint="search"
								placeholder="Search apps, files, photos, answers…"
								value={query}
								onChange={(e) => {
									setQuery(e.target.value);
									onQuery?.(e.target.value);
									setView((v) => ({ ...v, mode: 'text' }));
									run(e.target.value);
								}}
								onSelect={(e) => {
									// moving the cursor (a click, Shift+arrows) gives ←/→ back to it
									const el = e.currentTarget;
									const at: [number, number] = [
										el.selectionStart ?? 0,
										el.selectionEnd ?? 0,
									];
									const [a, b] = live.current.caret;
									if (at[0] === a && at[1] === b) return;
									live.current.caret = at;
									setView((v) =>
										v.mode === 'rows' ? { ...v, mode: 'text' } : v,
									);
								}}
								onFocus={(e) => {
									// the first time in, the example query is selected, so typing replaces it
									if (!live.current.selected) {
										live.current.selected = true;
										live.current.focusing = true;
										live.current.caret = [0, e.currentTarget.value.length];
										e.currentTarget.select();
									}
								}}
								onMouseUp={(e) => {
									// …and the click that focused it does not put the caret back in it
									if (live.current.focusing) e.preventDefault();
									live.current.focusing = false;
								}}
								onKeyDown={onKeyDown}
							/>
							<span id={`${base}-keys`} className="sr-only">
								Type to search. Down and up arrows choose a result, right and
								left arrows step through its pages or moments, Enter opens it.
							</span>
						</>
					}
				/>
			</div>
			<p
				className="ssl-toast"
				role="status"
				aria-live="polite"
				data-shown={toast ? '' : undefined}
			>
				{toast?.text ?? ''}
			</p>
			<p className="sr-only" role="status" aria-live="polite">
				{status}
			</p>
		</div>
	);
}

/** "Would open apartment-lease-new-farm-2026.pdf at page 3": what Enter does, on the real machine. */
function message(
	row: Row,
	hit: { loc: Loc } | undefined,
	alt: boolean,
	q: string,
): string {
	const name = row.title;
	if (alt) {
		if (
			row.kind === 'file' ||
			row.kind === 'folder' ||
			row.kind === 'image' ||
			row.kind === 'video' ||
			row.kind === 'audio'
		) {
			const folder = row.where.slice(0, row.where.lastIndexOf('/')) || '~';
			return `Would show ${row.where.slice(row.where.lastIndexOf('/') + 1)} in ${folder}`;
		}
		return `Would copy ${row.where}`;
	}
	const l = hit?.loc;
	const at = l
		? l.t !== undefined
			? ` from ${clock(l.t)}`
			: l.page
				? row.key.endsWith('.epub')
					? ` at chapter ${l.page}`
					: ` at page ${l.page}`
				: l.slide
					? ` at slide ${l.slide}`
					: l.sheet
						? ` at ${where(l)}`
						: l.line
							? ` at line ${l.line}`
							: ''
		: '';
	switch (row.kind) {
		case 'file':
			return `Would open ${name}${at}`;
		case 'image':
			return `Would open ${name} in imv`;
		case 'video':
		case 'audio':
			return `Would play ${name}${at} in mpv`;
		case 'folder':
			return `Would open ${row.where} in Files`;
		case 'app':
			return `Would launch ${name}`;
		case 'setting':
			return `Would open ${name} (${row.subtitle})`;
		case 'emoji':
			return `Would paste ${row.emoji}`;
		case 'clip':
			return `Would paste “${name.length > 48 ? `${name.slice(0, 47)}…` : name}”`;
		case 'history': {
			const browser = row.subtitle.split(' · ')[0];
			return `Would open ${row.where.replace(/^https:\/\//, '')} in ${browser}`;
		}
		case 'web':
			return `Would search DuckDuckGo for “${q}” in your browser`;
		default:
			return `Would open ${name}`;
	}
}

export type { Mode };
