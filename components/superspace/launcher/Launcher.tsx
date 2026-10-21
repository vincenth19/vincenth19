'use client';

import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import type { LauncherLabels } from '@/content/superspace';
import type { Rates } from './answers';
import { search } from './engine';
import type { Loc, Response, Row } from './types';
import {
	answerLabel,
	Bar,
	clock,
	Desktop,
	type DrawnRow,
	drawRows,
	type Mode,
	Panel,
	partLabel,
	partsOf,
	type Thumbs,
	type ViewState,
	where,
} from './View';

/**
 * Super Space's launcher, running in the page over the demo home. It behaves
 * as SuperSpace.qml does: each keystroke shows the instant phase (names,
 * answers) at once and the final phase (by meaning) 150 ms after typing
 * pauses; while typing, results only add, and 400 ms after the last key they
 * show as they are, so typing is calm. ↓/↑ choose a row, →/← step its pages or
 * sections, Tab lists them, Enter opens, Esc closes the launcher (the keys
 * that open it again take its place). On a page Tab must also lead on: Tab
 * again from a row's list, or Tab from a row with nothing to list, moves on
 * through the page. Opening anything here only says what the real launcher
 * would do.
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

/** For screen readers: how many results, once they settle (an emoji strip is one), and the first. */
function statusOf(r: Response, labels: LauncherLabels) {
	const local = drawRows(r.rows).filter((x) => x.kind !== 'web');
	const n = local.length + (r.answer ? 1 : 0);
	const top = r.answer ? answerLabel(r.answer) : (local[0]?.title ?? '');
	if (r.empty)
		return r.unknown ? `${labels.nothing}. ${labels.unknown}` : labels.nothing;
	return (n === 1 ? labels.one : labels.many)
		.replace('{n}', String(n))
		.replace('{top}', top);
}

export type LauncherProps = {
	/** The query it opens with: the page's first paint showed its result. */
	initial: string;
	/** A query to show, from the example chips under the screen; `focus` puts the caret in the field after it. */
	request?: { q: string; n: number; focus?: boolean };
	/** Tells the page what is in the field, so its chips can mark the one on screen. */
	onQuery?: (q: string) => void;
	labels: LauncherLabels;
	/** The demo's photos and video frames there are pictures for. */
	thumbs?: Thumbs;
	/** The ECB's rates when the page was built, for currency answers. */
	rates?: Rates | null;
};

export function Launcher({
	initial,
	request,
	onQuery,
	labels,
	thumbs,
	rates,
}: LauncherProps) {
	const base = useId();
	const ids = {
		list: `${base}-list`,
		option: (i: number) => `${base}-opt-${i}`,
	};
	const card = useRef<HTMLDivElement>(null);
	const field = useRef<HTMLInputElement>(null);
	const reopen = useRef<HTMLButtonElement>(null);
	const opts = { rates, pictures: thumbs };
	const [query, setQuery] = useState(initial);
	const [view, setView] = useState<ViewState>(() => ({
		shown: initial ? search(initial, true, opts) : blank,
		sel: 0,
		hit: 0,
		mode: 'text',
	}));
	/** Esc closed it: the desktop shows, with the keys that open it again. */
	const [closed, setClosed] = useState(false);
	const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
	const [status, setStatus] = useState('');
	const [width, setWidth] = useState<number | undefined>(undefined);
	const [now, setNow] = useState<string>('');
	/** The drawn caret: where it is in the field, and how often it moved (each move restarts its blink). */
	const [caret, setCaret] = useState<{ x: number; n: number } | null>(null);
	const pen = useRef<CanvasRenderingContext2D | null>(null);

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
			// what an earlier search would have done is no longer on screen
			setToast(null);
			if (!q.trim()) {
				l.last = blank;
				show(blank, false);
				setStatus('');
				return;
			}
			show(search(q, false, { rates, pictures: thumbs }), true);
			l.typing = setTimeout(() => {
				l.typing = 0;
				if (l.last.q === q.trim()) {
					show(l.last, false);
					setStatus(statusOf(l.last, labels));
				}
			}, CALM_MS);
			l.final = setTimeout(() => {
				l.final = 0;
				l.last = search(q, true, { rates, pictures: thumbs });
				show(l.last, l.typing !== 0);
				if (!l.typing) setStatus(statusOf(l.last, labels));
			}, FINAL_MS);
		},
		[show, rates, thumbs, labels],
	);

	/**
	 * Keys that act on a row end the calm first, so they never act on a row left
	 * from an earlier query. When the final phase is already on screen there is
	 * nothing new to show, and the row and part stepped to stay (SuperSpace.qml).
	 */
	function settle(): ViewState {
		const l = live.current;
		const q = query.trim();
		if (!q) return l.view;
		clearTimeout(l.typing);
		l.typing = 0;
		if (l.last.q !== q) {
			clearTimeout(l.final);
			l.final = 0;
			l.last = search(q, true, opts);
		}
		if (l.view.shown === l.last) return l.view;
		show(l.last, false);
		setStatus(statusOf(l.last, labels));
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
		setToast(null);
		setClosed(false);
		setQuery(request.q);
		l.last = search(request.q, true, { rates, pictures: thumbs });
		setView((v) => ({ ...v, shown: l.last, sel: 0, hit: 0, mode: 'text' }));
		setStatus(statusOf(l.last, labels));
		// pressed with a mouse or a key, the search is there to change: the caret goes to its end
		const el = field.current;
		if (request.focus && el) {
			l.selected = true;
			el.focus({ preventScroll: true });
			el.setSelectionRange(request.q.length, request.q.length);
			l.caret = [request.q.length, request.q.length];
		}
		// The chips are under the screen: on a phone, the panel can be above the
		// top of the window by the time one is pressed, and the search would
		// change where it cannot be seen. The page scrolls back up to it, only
		// as far as it takes.
		const frame = requestAnimationFrame(() => {
			const panel = card.current?.querySelector<HTMLElement>('.ssl-card');
			const top = panel?.getBoundingClientRect().top;
			if (top === undefined || top >= 12) return;
			const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
			window.scrollBy({
				top: top - 12,
				behavior: still ? 'instant' : 'smooth',
			});
		});
		return () => cancelAnimationFrame(frame);
	}, [request, rates, thumbs, labels]);

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

	/** Esc: the launcher closes, as the real one does; the keys that open it again take the focus. */
	function close() {
		setQuery('');
		onQuery?.('');
		run('');
		setClosed(true);
		setStatus('');
		requestAnimationFrame(() => reopen.current?.focus({ preventScroll: true }));
	}

	/** Super+Space again: an empty launcher, its field ready. */
	function open_() {
		setClosed(false);
		live.current.selected = true;
		requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
	}

	function notify(text: string) {
		setToast((t) => ({ text, n: (t?.n ?? 0) + 1 }));
	}

	/**
	 * Puts the drawn caret where the field's cursor is (the real launcher draws its
	 * own: 2px, the field's height). None while text is selected or the field is
	 * not focused.
	 */
	const placeCaret = useCallback(() => {
		const el = field.current;
		const a = el?.selectionStart;
		if (!el || document.activeElement !== el || a == null) {
			setCaret(null);
			return;
		}
		if (a !== el.selectionEnd) {
			setCaret(null);
			return;
		}
		pen.current ??= document.createElement('canvas').getContext('2d');
		const ctx = pen.current;
		if (!ctx) return;
		const cs = getComputedStyle(el);
		ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
		const x = Math.min(
			el.clientWidth - 2,
			Math.max(0, ctx.measureText(el.value.slice(0, a)).width - el.scrollLeft),
		);
		setCaret((c) => (c && c.x === x ? c : { x, n: (c?.n ?? 0) + 1 }));
	}, []);

	// typing moves the cursor: the caret follows once the new text is in the field
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the text changes
	useLayoutEffect(() => {
		placeCaret();
	}, [query, placeCaret]);

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

	/**
	 * ←/→ walk the selected row's hits in drawn order; screen readers hear the
	 * part picked. Past the last part → goes round to the first (and ← from the
	 * first to the last): the best part is often the last in time order, as the
	 * opening search's is, and a key that does nothing reads as broken. (The real
	 * launcher stops at the ends.)
	 */
	function stepHit(v: ViewState, step: number): ViewState {
		const row = currentOf(v);
		const order = row?.order ?? [];
		if (!row || order.length < 2) return v;
		const at = order.indexOf(v.hit);
		const hit = order[(at + step + order.length) % order.length];
		if (hit !== v.hit) setStatus(partLabel(row, hit));
		return { ...v, hit };
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
			else close();
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
			// Tab lists the selected (or top) row's parts; with none to list, or
			// listed already, it moves on through the page, so it never keeps the keyboard
			if (v.mode === 'sections') return;
			const s = settle();
			const row = currentOf(s);
			const parts = partsOf(row);
			if (!row || !parts) return;
			next = { ...s, mode: 'sections' };
			// the list shows; screen readers hear it, and that Tab again moves on
			setStatus(
				labels.listed
					.replace('{parts}', parts[0].toUpperCase() + parts.slice(1))
					.replace(
						'{list}',
						row.order.map((h) => partLabel(row, h)).join('; '),
					),
			);
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
		<div
			className="ssl-screen"
			ref={card}
			data-closed={closed ? '' : undefined}
		>
			<Bar now={now} />
			<Desktop />
			<div className="ssl-stage" inert={closed}>
				<Panel
					state={{ ...view, width, thumbs }}
					ids={ids}
					handlers={handlers}
					labels={labels}
					field={
						<>
							<label className="sr-only" htmlFor={`${base}-q`}>
								{labels.field}
							</label>
							<span className="ssl-qbox">
								<input
									ref={field}
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
									placeholder={labels.placeholder}
									value={query}
									onChange={(e) => {
										setQuery(e.target.value);
										onQuery?.(e.target.value);
										setView((v) => ({ ...v, mode: 'text' }));
										run(e.target.value);
									}}
									onScroll={placeCaret}
									onSelect={(e) => {
										placeCaret();
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
									onBlur={() => {
										setCaret(null);
										// leaving the field leaves the rows as they were before ↓/↑, and Tab's list closed
										setView((v) =>
											v.mode === 'text' ? v : { ...v, mode: 'text' },
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
										placeCaret();
									}}
									onMouseUp={(e) => {
										// …and the click that focused it does not put the caret back in it
										if (live.current.focusing) e.preventDefault();
										live.current.focusing = false;
									}}
									onKeyDown={onKeyDown}
								/>
								{caret && view.mode === 'text' && (
									<span
										key={caret.n}
										className="ssl-caret"
										style={{ transform: `translateX(${caret.x}px)` }}
										aria-hidden="true"
									/>
								)}
							</span>
							<span id={`${base}-keys`} className="sr-only">
								{labels.keys}
							</span>
						</>
					}
				/>
			</div>
			{closed && (
				<button
					ref={reopen}
					type="button"
					className="ssl-reopen"
					aria-label={labels.reopen}
					onClick={open_}
				>
					<kbd>Super</kbd>+<kbd>Space</kbd>
				</button>
			)}
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
	// Ctrl+Enter, as the daemon's `alternative`: a file shows in its folder; for
	// anything else, what the row points at is copied
	if (alt) {
		switch (row.kind) {
			case 'file':
			case 'folder':
			case 'image':
			case 'video':
			case 'audio': {
				const folder = row.where.slice(0, row.where.lastIndexOf('/')) || '~';
				return `Would show ${row.where.slice(row.where.lastIndexOf('/') + 1)} in ${folder}`;
			}
			case 'web':
				return `Would copy https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
			case 'app':
				return `Would copy ${row.key.slice(4)}, ${name}’s app id`;
			case 'setting':
				return `Would copy the command that opens ${name}`;
			case 'emoji':
				return `Would copy ${row.emoji}`;
			case 'clip':
				return `Would copy “${name.length > 48 ? `${name.slice(0, 47)}…` : name}”`;
			case 'history':
				return `Would copy ${row.where}`;
			default:
				return `Would copy ${row.where}`;
		}
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
