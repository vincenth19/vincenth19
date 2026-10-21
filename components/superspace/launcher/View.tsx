import type { ReactNode } from 'react';
import type { LauncherLabels } from '@/content/superspace';
import { filterLabel } from './engine';
import { DesktopIcon, OmarchyMark, Picture, RowIcon } from './icons';
import type { Answer, Hit, Kind, Loc, Response, Row, Scene } from './types';

/**
 * The launcher's panel, drawn as Super Space draws it (SuperSpace.qml,
 * ui/ResultRow.qml, ui/AnswerCard.qml): the query with Omarchy's mark, the
 * scope pill, the answer card, the rows (the matched passage as each row's
 * headline, where Enter lands on the right, pages as chips, a video's moments
 * on its timeline), and the key hints. No state of its own: the launcher
 * (Launcher.tsx) keeps it, and the page's first paint passes it the same way.
 */

export type Mode = 'text' | 'rows' | 'sections';

export type ViewState = {
	shown: Response;
	/** 0 is the answer card when there is one. */
	sel: number;
	/** The selected row's picked hit: an index into its hits. */
	hit: number;
	mode: Mode;
	/** The pointer over a row's timeline: the time under it. */
	hover?: { key: string; t: number };
	/** A timeline's width on screen, to keep its labels apart (measured in the page, from the timelines it shows). */
	width?: number;
	/** The demo's pictures this copy has: a small WebP for each photo and video frame. */
	thumbs?: Thumbs;
};

/** A photo's or video frame's small picture, by its scene. */
export type Thumbs = Partial<Record<Scene, string>>;

export type ViewHandlers = {
	/** A row, or one of its emoji, pages or sections (`pick`), was clicked: open it. */
	onOpen: (index: number, pick: number) => void;
	/** A click on a timeline away from its sections: play from there. */
	onSeek: (index: number, t: number) => void;
	onHover: (key: string, t: number | null) => void;
};

/** A row as the panel draws it: an emoji strip is one row whose hits are its emoji. */
export type DrawnRow = Row & { strip?: Row[]; order: number[] };

// ------------------------------------------------------------ places

/** m:ss, or h:mm:ss from an hour on. */
export function clock(t: number) {
	const s = Math.floor(t);
	const two = (n: number) => String(n).padStart(2, '0');
	return s < 3600
		? `${Math.floor(s / 60)}:${two(s % 60)}`
		: `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
}

/** A hit's place: m:ss–m:ss, page or chapter, slide, sheet row, line. */
export function where(l: Loc, epub = false) {
	if (l.t !== undefined) {
		return (
			clock(l.t) + ((l.tEnd ?? 0) >= l.t + 1 ? `–${clock(l.tEnd ?? 0)}` : '')
		);
	}
	if (l.page) return `${epub ? 'ch.' : 'p.'} ${l.page}`;
	if (l.slide) return `slide ${l.slide}`;
	if (l.sheet) return l.sheet + (l.row ? ` · row ${l.row}` : '');
	if (l.line) return `line ${l.line}`;
	return '';
}

/** A place as it is said: "page 3", "chapter 6", "0:45 to 0:59". */
export function spoken(l: Loc, epub = false) {
	if (l.t !== undefined) return where(l).replace('–', ' to ');
	if (l.page) return `${epub ? 'chapter' : 'page'} ${l.page}`;
	return where(l);
}

/** At most `n` characters, cut at a word with "…". */
function clip(text: string, n: number) {
	const t = text.replace(/\s+/g, ' ').trim();
	if (t.length <= n) return t;
	const cut = t.slice(0, n);
	return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n * 0.6)).trimEnd()}…`;
}

/**
 * A row's name for screen readers, short where the row's text is long: what
 * it is, where Enter lands, and the start of what matched ("…pdf, page 3:
 * Rental bond The tenant must pay…").
 */
export function rowLabel(row: DrawnRow, hit: number): string {
	if (row.strip) {
		return `${kindLabel(row)}: ${row.strip.map((e) => e.title).join(', ')}`;
	}
	const epub = row.key.endsWith('.epub');
	const picked = row.hits[hit];
	const what = [
		row.title,
		row.kind === 'file' || row.kind === 'web' ? '' : kindLabel(row),
		picked ? spoken(picked.loc, epub) : '',
	]
		.filter(Boolean)
		.join(', ');
	const passage = said(row, hit);
	const tail = passage ? clip(passage, 100) : row.subtitle;
	return tail ? `${what}: ${tail}` : what;
}

/** What ←/→ picked in a row, for screen readers: "page 4: Special terms…", "Dog". */
export function partLabel(row: DrawnRow, hit: number): string {
	if (row.strip) return (row.strip[hit] ?? row.strip[0]).title;
	const picked = row.hits[hit];
	if (!picked) return '';
	return `${spoken(picked.loc, row.key.endsWith('.epub'))}: ${clip(picked.text, 100)}`;
}

/** What the place column draws large: a sheet's row (its chip names the sheet), else the place. */
function figure(l: Loc, epub: boolean) {
	return l.sheet && l.row ? `row ${l.row}` : where(l, epub);
}

/** Hits are listed best first; they are drawn and stepped in document or time order. */
export function drawnOrder(hits: Hit[]) {
	const at = (h: Hit) =>
		h.loc.t ?? h.loc.page ?? h.loc.slide ?? h.loc.row ?? h.loc.line ?? 0;
	return hits
		.map((_, i) => i)
		.sort((a, b) => at(hits[a]) - at(hits[b]) || a - b);
}

/** Consecutive emoji rows make one strip of up to 8. */
export function drawRows(rows: Row[]): DrawnRow[] {
	const out: DrawnRow[] = [];
	for (const r of rows) {
		const last = out[out.length - 1];
		if (r.kind !== 'emoji') out.push({ ...r, order: drawnOrder(r.hits) });
		else if (last?.kind !== 'emoji') out.push({ ...r, strip: [r], order: [0] });
		else if ((last.strip?.length ?? 0) < 8) {
			last.strip?.push(r);
			last.order = last.strip?.map((_, i) => i) ?? [];
		}
	}
	// the web row is always last
	return [
		...out.filter((r) => r.kind !== 'web'),
		...out.filter((r) => r.kind === 'web'),
	];
}

/** What ←/→ step in a row, for the key hints. */
export function partsOf(row: DrawnRow | undefined): string {
	if (!row) return '';
	if (row.strip) return row.strip.length > 1 ? 'emoji' : '';
	const h = row.hits;
	const l = h[0]?.loc ?? {};
	if (h.length < 2) return '';
	return l.t !== undefined
		? 'sections'
		: l.page
			? 'pages'
			: l.slide
				? 'slides'
				: l.sheet
					? 'sheets'
					: l.line
						? 'lines'
						: 'matches';
}

function kindLabel(row: Row) {
	const audio = /^(Song|Recording) ·/.exec(row.subtitle);
	if (audio) return audio[1];
	const dot = row.title.lastIndexOf('.');
	if (row.kind === 'file' && dot > 0)
		return row.title.slice(dot + 1).toUpperCase();
	const names: Record<Kind, string> = {
		app: 'App',
		setting: 'Setting',
		file: 'File',
		folder: 'Folder',
		image: 'Photo',
		video: 'Video',
		audio: 'Audio',
		clip: 'Clipboard',
		emoji: 'Emoji',
		history: 'History',
		web: 'Web',
	};
	return names[row.kind];
}

// ------------------------------------------------------------ the passage

/** Where one of `words` starts a word, as [start, end] to the end of that word. */
function spans(text: string, words: string[]) {
	const lower = text.toLowerCase();
	const sorted = [...words].sort((a, b) => b.length - a.length);
	const out: [number, number][] = [];
	for (let i = 0; i < text.length; i++) {
		if (i > 0 && /\w/.test(text[i - 1])) continue;
		const w = sorted.find((x) => lower.startsWith(x, i));
		if (!w) continue;
		let end = i + w.length;
		while (end < text.length && /\w/.test(text[end])) end++;
		out.push([i, end]);
		i = end - 1;
	}
	return out;
}

/** The quote starts at the sentence with the most matched words, after "…" when that is not the first. */
export function lead(text: string, words: string[]) {
	const starts = [0];
	const re = /[.!?…]\s+|\n\s*/g;
	for (let m = re.exec(text); m; m = re.exec(text)) {
		if (re.lastIndex < text.length) starts.push(re.lastIndex);
	}
	const count = (i: number) =>
		spans(text.slice(starts[i], starts[i + 1]), words).length;
	let best = 0;
	for (let i = 1; i < starts.length; i++) if (count(i) > count(best)) best = i;
	return best ? `…${text.slice(starts[best])}` : text;
}

/** The passage, one line of spaces, each matched word in bold to its end. */
function Marked({ text, words }: { text: string; words: string[] }) {
	const t = text.replace(/\s+/g, ' ');
	const out: ReactNode[] = [];
	let at = 0;
	for (const [a, b] of spans(t, words)) {
		out.push(t.slice(at, a), <b key={a}>{t.slice(a, b)}</b>);
		at = b;
	}
	out.push(t.slice(at));
	return out;
}

/** The headline: what matched (quoted; a video section's label is not), or the title. */
function said(row: DrawnRow, hit: number): string {
	if (
		!['file', 'image', 'video', 'audio'].includes(row.kind) ||
		row.why === 'name'
	) {
		return '';
	}
	const picked = row.hits[hit];
	const text =
		(hit > 0 && picked?.text) || row.snippet?.text || picked?.text || '';
	return text ? lead(text, row.snippet?.words ?? []) : '';
}

// ------------------------------------------------------------ the timeline

/** Rough widths of caption figures, to keep the labels under a timeline apart. */
function captionWidth(s: string) {
	let w = 0;
	for (const c of s)
		w += /\d/.test(c) ? 6.6 : c === ':' ? 3.2 : c === '–' ? 6.9 : 5;
	return w;
}

/** Under the timeline: the picked section's times first, then the others, then the length, each where it overlaps none placed. */
function timeLabels(row: DrawnRow, hit: number, width: number) {
	const out: { i: number; x: number; w: number; s: string }[] = [];
	const duration = row.duration ?? 1;
	for (const i of [hit, ...row.order.filter((i) => i !== hit), -1]) {
		const l = i < 0 ? { t: duration } : (row.hits[i]?.loc ?? {});
		if (l.t === undefined) continue;
		const s = i < 0 ? clock(l.t) : where(l);
		const w = captionWidth(s);
		const x = Math.max(0, Math.min(width - w, (width * l.t) / duration));
		if (out.every((o) => x + w + 9 <= o.x || x >= o.x + o.w + 9)) {
			out.push({ i, x, w, s });
		}
	}
	return out;
}

function Timeline({
	row,
	hit,
	selected,
	hoverT,
	index,
	width = 470,
	handlers,
}: {
	row: DrawnRow;
	hit: number;
	selected: boolean;
	hoverT: number | null;
	index: number;
	width?: number;
	handlers?: ViewHandlers;
}) {
	const duration = row.duration ?? 1;
	const pct = (t: number) => `${(100 * t) / duration}%`;
	const labels = timeLabels(row, hit, width);
	const at = (e: { clientX: number; currentTarget: HTMLElement }) => {
		const r = e.currentTarget.getBoundingClientRect();
		return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration;
	};
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a mouse's way to a moment; the keyboard steps them with ←/→ from the field
		<div
			className="ssl-timeline"
			onPointerMove={handlers && ((e) => handlers.onHover(row.key, at(e)))}
			onPointerLeave={handlers && (() => handlers.onHover(row.key, null))}
			onClick={
				handlers &&
				((e) => {
					e.stopPropagation();
					const t = at(e);
					const w = e.currentTarget.getBoundingClientRect().width;
					const near = row.order.find((i) => {
						const l = row.hits[i].loc;
						const gap = Math.max((l.t ?? 0) - t, t - (l.tEnd ?? l.t ?? 0), 0);
						return (gap * w) / duration <= 4;
					});
					if (near !== undefined) handlers.onOpen(index, near);
					else handlers.onSeek(index, t);
				})
			}
		>
			<div className="ssl-bar">
				<span className="ssl-track" />
				{row.hits.map((h, i) => {
					const l = h.loc;
					if (l.t === undefined) return null;
					const picked = i === hit;
					return (
						<span
							key={`${l.t}-${l.tEnd}`}
							className={`ssl-seg${picked ? ' is-picked' : ''}${selected && !picked ? ' is-other' : ''}`}
							style={{
								left: pct(l.t),
								width: `max(4px, ${pct((l.tEnd ?? l.t) - l.t)})`,
							}}
						/>
					);
				})}
				{hoverT !== null && (
					<span className="ssl-pointer" style={{ left: pct(hoverT) }} />
				)}
			</div>
			<div className="ssl-times" aria-hidden="true">
				{labels.map((l) => (
					<span
						key={l.s + l.i}
						className={l.i === hit ? 'is-picked' : undefined}
						style={{
							left: `min(${((100 * l.x) / width).toFixed(2)}%, calc(100% - ${l.w}px))`,
						}}
					>
						{l.s}
					</span>
				))}
			</div>
		</div>
	);
}

// ------------------------------------------------------------ rows

function ResultRow({
	row,
	index,
	id,
	selected,
	solid,
	hit,
	expanded,
	notice,
	hoverT,
	width,
	thumbs,
	labels,
	handlers,
}: {
	row: DrawnRow;
	index: number;
	id: string;
	selected: boolean;
	solid: boolean;
	hit: number;
	expanded: boolean;
	notice: '' | 'nothing' | 'unknown';
	hoverT: number | null;
	width?: number;
	thumbs?: Thumbs;
	labels: Pick<LauncherLabels, 'nothing' | 'unknown'>;
	handlers?: ViewHandlers;
}) {
	const epub = row.key.endsWith('.epub');
	const strip = row.strip;
	const picked = row.hits[hit];
	const headline = strip ? '' : said(row, hit);
	const quoted = headline && row.kind !== 'video';
	const timed = !strip && (row.duration ?? 0) > 0 && row.hits.length > 0;
	const chips = strip
		? []
		: row.order.filter((i) => where(row.hits[i].loc, epub) !== '');
	const showChips =
		!strip && !timed && !expanded && (chips.length > 1 || !!picked?.loc.sheet);
	// two headline lines whenever ←/→ can bring a passage that needs them, so stepping never moves the rows below
	const tall =
		!!headline &&
		row.order.length > 1 &&
		[row.snippet?.text ?? '', ...row.hits.map((h) => h.text)].some(
			(t) => lead(t, row.snippet?.words ?? []).length > 58,
		);
	const place = picked ? figure(picked.loc, epub) : '';
	const sizers = row.hits.map((h) => figure(h.loc, epub)).filter(Boolean);
	const framed =
		hoverT !== null && timed
			? row.hits.reduce((best, _, i) => {
					const gap = (j: number) => {
						const l = row.hits[j].loc;
						return Math.max(
							(l.t ?? 0) - hoverT,
							hoverT - (l.tEnd ?? l.t ?? 0),
							0,
						);
					};
					return gap(i) < gap(best) ? i : best;
				}, 0)
			: hit;
	const frame = row.kind !== 'image' ? row.hits[framed]?.thumb : undefined;
	const frameSrc = frame && thumbs?.[frame];
	const loud = place !== '' && (selected || hoverT !== null);
	// under a quoted passage, the file and its folder; the name gives way first, so the folder stays
	const sub = strip
		? [(strip[hit] ?? strip[0]).title, '']
		: headline
			? [row.title, row.subtitle ? `  ·  ${row.subtitle}` : '']
			: [row.subtitle, ''];
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard stays in the field, which chooses and opens rows (↑/↓, Enter)
		<div
			id={id}
			role="option"
			aria-selected={selected}
			aria-label={rowLabel(row, hit)}
			tabIndex={-1}
			className={`ssl-item${notice ? ' has-notice' : ''}`}
			onClick={handlers && (() => handlers.onOpen(index, -1))}
		>
			{notice && (
				<div className="ssl-notice" aria-hidden="true">
					<p>{labels.nothing}</p>
					{notice === 'unknown' && (
						<p className="ssl-notice-note">{labels.unknown}</p>
					)}
				</div>
			)}
			<div
				className={`ssl-row${selected ? ' is-sel' : ''}${solid ? ' is-solid' : ''}${strip ? ' is-strip' : ''}${row.scene ? ' is-photo' : ''}`}
			>
				{!strip && (
					<span className="ssl-icon">
						<RowIcon
							name={row.icon}
							scene={row.scene}
							src={row.scene && thumbs?.[row.scene]}
						/>
					</span>
				)}
				<div className="ssl-body">
					{strip ? (
						<div className="ssl-strip">
							{strip.map((e, i) => (
								// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: ←/→ from the field pick an emoji
								<span
									key={e.key}
									className={`ssl-emoji${selected && i === hit ? ' is-picked' : ''}`}
									onClick={
										handlers &&
										((ev) => {
											ev.stopPropagation();
											handlers.onOpen(index, i);
										})
									}
								>
									{e.emoji}
								</span>
							))}
						</div>
					) : (
						<p
							className={`ssl-head${headline ? ' is-said' : ''}${tall ? ' is-tall' : ''}`}
						>
							{headline ? (
								<>
									{quoted && '“'}
									<Marked text={headline} words={row.snippet?.words ?? []} />
									{quoted && '”'}
								</>
							) : (
								row.title
							)}
						</p>
					)}
					{sub[0] && (
						<p className="ssl-sub">
							<span className="ssl-sub-name">{sub[0]}</span>
							{sub[1] && <span className="ssl-sub-where">{sub[1]}</span>}
						</p>
					)}
					{timed && (
						<Timeline
							row={row}
							hit={hit}
							selected={selected}
							hoverT={hoverT}
							index={index}
							width={width}
							handlers={handlers}
						/>
					)}
					{showChips && (
						<div className="ssl-chips" aria-hidden="true">
							{chips.map((i) => {
								const l = row.hits[i].loc;
								return (
									// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: ←/→ from the field pick a page
									<span
										key={i}
										className={`ssl-chip${i === hit ? ' is-picked' : ''}`}
										onClick={
											handlers &&
											((ev) => {
												ev.stopPropagation();
												handlers.onOpen(index, i);
											})
										}
									>
										{String(l.page ?? l.slide ?? l.line ?? where(l, epub))}
									</span>
								);
							})}
						</div>
					)}
					{expanded &&
						row.order.map((i) => (
							<p key={i} className={`ssl-part${i === hit ? ' is-picked' : ''}`}>
								{strip
									? `${strip[i].emoji}   ${strip[i].title}`
									: `${where(row.hits[i].loc, epub)}   ${row.hits[i].text.replace(/\s+/g, ' ')}`}
							</p>
						))}
				</div>
				<div className="ssl-side">
					<span
						className={`ssl-place${loud ? ' is-loud' : ''}${place ? ' is-figure' : ''}`}
					>
						{hoverT !== null && timed ? clock(hoverT) : place || kindLabel(row)}
					</span>
					{/* as wide as the widest place drawn large, so neither selecting nor stepping reflows it */}
					{sizers.length > 0 && (
						<span className="ssl-sizers" aria-hidden="true">
							{sizers.map((s) => (
								<span key={s}>{s}</span>
							))}
						</span>
					)}
					{/* the frame of the moment, when this copy has its picture */}
					{frameSrc && <Picture src={frameSrc} className="ssl-frame" />}
				</div>
			</div>
		</div>
	);
}

function AnswerCard({
	answer,
	id,
	selected,
	onOpen,
}: {
	answer: Answer;
	id: string;
	selected: boolean;
	onOpen?: () => void;
}) {
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Enter in the field copies the answer
		<div
			id={id}
			role="option"
			aria-selected={selected}
			aria-label={answerLabel(answer)}
			tabIndex={-1}
			className="ssl-item"
			onClick={onOpen}
		>
			<div className={`ssl-answer${selected ? ' is-sel' : ''}`}>
				<div className="ssl-answer-sides">
					<span className="ssl-answer-big ssl-answer-in">{answer.input}</span>
					<span className="ssl-answer-arrow" aria-hidden="true">
						→
					</span>
					<span className="ssl-answer-big ssl-answer-out">{answer.output}</span>
					<span className="ssl-answer-label ssl-answer-inl">
						{answer.inputLabel}
					</span>
					<span className="ssl-answer-label ssl-answer-outl">
						{answer.outputLabel}
					</span>
				</div>
				{answer.detail && <p className="ssl-answer-detail">{answer.detail}</p>}
			</div>
		</div>
	);
}

/** A plural word as one: "feet" → "foot", "inches" → "inch", "dollars" → "dollar"; "yen" stays. */
function singularWord(w: string): string {
	const lower = w.toLowerCase();
	if (lower === 'feet') return w.replace(/eet$/i, 'oot');
	if (/(ch|sh|x|ss)es$/i.test(w)) return w.slice(0, -2);
	if (/ies$/i.test(w)) return `${w.slice(0, -3)}y`;
	if (/[^s]s$/i.test(w)) return w.slice(0, -1);
	return w;
}

/**
 * A unit's or currency's name for `n` of it: "5 kilometres", "1 acre", "1 US
 * dollar", "21 degrees Celsius", "1 kilometre per hour".
 */
function unitName(n: string, label: string, currency: boolean): string {
	const one = /^[-−]?1$/.test(n);
	if (/^(Celsius|Fahrenheit)$/.test(label))
		return `${one ? 'degree' : 'degrees'} ${label}`;
	// a unit is said in lower case ("Kilometres"), but not its proper names ("US cups")
	const l = currency
		? label
		: label.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase());
	if (!one) return l;
	const [head, per] = l.split(/ (?=per )/);
	const words = head.split(' ');
	words[words.length - 1] = singularWord(words[words.length - 1]);
	return [words.join(' '), per].filter(Boolean).join(' ');
}

/** An answer, as it is said: "3:00 PM Sydney, AEDT is 11:00 AM Jakarta, WIB". */
export function answerLabel(a: Answer): string {
	// a unit or a currency is said by its name: "5 kilometres", not "5 km Kilometres"
	const named = a.kind === 'units' || a.kind === 'currency';
	const side = (v: string, label: string) => {
		if (!label) return v;
		// feet and inches together: "5 feet 11 inches"
		const fi = /^([-−]?[\d.,]+) ft ([\d.,]+) in$/.exec(v);
		if (named && fi) {
			return `${fi[1]} ${unitName(fi[1], 'Feet', false)} ${fi[2]} ${unitName(fi[2], 'Inches', false)}`;
		}
		const m = named ? /^([-−]?[\d.,]+)\s*([^\d\s].*)$/.exec(v) : null;
		if (!m) return `${v} ${label}`;
		return `${m[1]} ${unitName(m[1], label, a.kind === 'currency')}`;
	};
	// money this copy cannot convert (built without rates): no "is", as there is no number
	if (a.kind === 'currency' && !a.copy) {
		return `${side(a.input, a.inputLabel)} to ${a.outputLabel}. ${a.detail}`;
	}
	return `${side(a.input, a.inputLabel)} is ${side(a.output, a.outputLabel)}${a.detail ? `. ${a.detail}` : ''}`;
}

/** The key hints under the list, for the mode and the selected row (SuperSpace.qml). */
function hints(
	mode: Mode,
	parts: string,
	answer: Answer | null,
	anyParts: boolean,
) {
	if (mode === 'sections')
		return ['← → step', '↵ open there', 'shift tab or esc back to typing'];
	if (mode === 'rows' && parts) {
		return [
			`← → ${parts}`,
			'↵ open there',
			'tab list them',
			'type, home or end to edit',
			'esc close',
		];
	}
	if (parts)
		return [
			'↵ open',
			`→ ${parts}`,
			'↓ ↑ rows',
			'tab list them',
			'ctrl ↵ reveal',
			'esc close',
		];
	return [
		...(answer ? (answer.copy ? ['↵ copy'] : []) : ['↵ open', 'ctrl ↵ reveal']),
		...(anyParts ? ['↓ then ← → pages, sections, emoji'] : []),
		'ctrl 1–9 row',
		'esc close',
	];
}

export function Panel({
	state,
	field,
	handlers,
	ids,
	labels,
}: {
	state: ViewState;
	/** The query field itself: the launcher's input, or the first paint's stand-in. */
	field: ReactNode;
	handlers?: ViewHandlers;
	ids: { list: string; option: (i: number) => string };
	labels: Pick<LauncherLabels, 'results' | 'nothing' | 'unknown'>;
}) {
	const { shown, sel, hit, mode, hover } = state;
	const rows = drawRows(shown.rows);
	const offset = shown.answer ? 1 : 0;
	const current = sel >= offset ? rows[sel - offset] : undefined;
	const parts = partsOf(current);
	const anyParts = rows.some(
		(r) => r.hits.length > 1 || (r.strip?.length ?? 0) > 1,
	);
	const pill = shown.filter ? filterLabel(shown.filter) : '';
	const listed = rows.length > 0 || !!shown.answer;
	return (
		<div className="ssl-card">
			{/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the field in it takes the keys; the row only widens where a pointer can press it */}
			<div
				className={`ssl-field${shown.q ? ' has-text' : ''}`}
				// A press anywhere on the search row (its mark, its pill, the space
				// around them) is a press on the field. A mouse's, as it goes down
				// (kept from the row, so the caret stays); a finger's or a pen's only
				// once it is a tap (the click), as a finger going down may be
				// scrolling the page.
				onPointerDown={
					handlers &&
					((e) => {
						const input = e.currentTarget.querySelector('input');
						if (!input || e.target === input || e.button !== 0) return;
						if (e.pointerType !== 'mouse') return;
						e.preventDefault();
						input.focus({ preventScroll: true });
					})
				}
				onClick={
					handlers &&
					((e) => {
						const input = e.currentTarget.querySelector('input');
						if (!input || e.target === input) return;
						if (document.activeElement !== input) {
							input.focus({ preventScroll: true });
						}
					})
				}
			>
				<span className="ssl-mark">
					<OmarchyMark />
				</span>
				{field}
				{pill && <span className="ssl-pill">{pill}</span>}
			</div>
			<div
				className="ssl-list"
				id={ids.list}
				role="listbox"
				aria-label={labels.results}
				hidden={!listed}
				// a click opens a row without taking the keyboard from the field
				onMouseDown={handlers && ((e) => e.preventDefault())}
			>
				{shown.answer && (
					<AnswerCard
						answer={shown.answer}
						id={ids.option(0)}
						selected={sel === 0}
						onOpen={handlers && (() => handlers.onOpen(0, -1))}
					/>
				)}
				{rows.map((row, i) => (
					<ResultRow
						key={row.key}
						row={row}
						index={i + offset}
						id={ids.option(i + offset)}
						selected={i + offset === sel}
						solid={i + offset === sel && mode !== 'text'}
						hit={i + offset === sel ? hit : 0}
						expanded={i + offset === sel && mode === 'sections'}
						notice={
							shown.empty && row.kind === 'web'
								? shown.unknown
									? 'unknown'
									: 'nothing'
								: ''
						}
						hoverT={hover?.key === row.key ? hover.t : null}
						width={state.width}
						thumbs={state.thumbs}
						labels={labels}
						handlers={handlers}
					/>
				))}
			</div>
			{listed && (
				<p className="ssl-hints" aria-hidden="true">
					{hints(mode, parts, sel < offset ? shown.answer : null, anyParts).map(
						(h) => (
							<span
								key={h}
								className={/tab|ctrl/.test(h) ? 'is-keys' : undefined}
							>
								{h}
							</span>
						),
					)}
				</p>
			)}
		</div>
	);
}

/** The desktop under the panel: Omarchy's folder tiles along its top, seen through the panel. */
export function Desktop() {
	return (
		<ul className="ssl-desktop" aria-hidden="true">
			{(['Downloads', 'Music', 'Pictures', 'Projects', 'Videos'] as const).map(
				(name) => (
					<li key={name}>
						<span className="ssl-tile">
							<DesktopIcon name={name} />
						</span>
						<span className="ssl-tile-name">{name}</span>
					</li>
				),
			)}
		</ul>
	);
}

/** Omarchy's bar along the top of the screen: workspaces, the clock, the tray. */
export function Bar({ now }: { now: string }) {
	return (
		<div className="ssl-bar-top" aria-hidden="true">
			<span className="ssl-ws">
				<span className="is-on">1</span>
				<span>2</span>
				<span>3</span>
			</span>
			<span className="ssl-clock">{now}</span>
			<span className="ssl-tray">
				<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
					<path d="M1.5 6a9.2 9.2 0 0 1 13 0M3.8 8.4a6 6 0 0 1 8.4 0M6.1 10.8a2.7 2.7 0 0 1 3.8 0" />
					<circle cx="8" cy="13.2" r="1" />
				</svg>
				<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
					<path d="M2 6h2.5L8 3v10L4.5 10H2zM10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.5a6.2 6.2 0 0 1 0 9" />
				</svg>
			</span>
		</div>
	);
}
