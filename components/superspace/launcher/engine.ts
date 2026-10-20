/**
 * The search, in the browser, over the demo home (corpus.ts). It answers the
 * way Super Space's daemon does: an instant phase (names, and quick answers)
 * as you type, then a final phase once typing pauses, with what matches by
 * meaning. Without the model, "meaning" is the words of the query, each with
 * the words that mean the same (concepts.ts), found in each part of each file
 * and weighed by how rare they are. Rows that do not really match are dropped,
 * so a search can find nothing, and says so. The web row is always last.
 */
import { answer as quickAnswer } from './answers';
import { GROUPS } from './concepts';
import { items } from './corpus';
import type { Hit, Item, Kind, Part, Response, Row } from './types';

// ------------------------------------------------------------ words

const STOP = new Set(
	(
		'a an the of for to in on at by with from into about as is are was were be been being am ' +
		'my me i we our us you your it its this that these those there here what which who whom ' +
		'where when how why do does did done much many and or but if then so can could should would ' +
		'will shall may might any some all get got have has had need needs want show find look ' +
		'please one just really very go going went take takes taking took di ke dari yang untuk saat dan atau ini itu dengan pada hari ' +
		'saya aku kami'
	).split(' '),
);
// "why" and "how long" carry meaning for a few questions; they stay words for the concepts
const KEEP = new Set(['why']);

/** A light stemmer: "costs" → "cost", "running" → "run", "tenancies" → "tenancy", "lease" → "leas". */
export function stem(word: string): string {
	let w = word.toLowerCase().replace(/['’]s$/, '');
	if (w.length <= 3 || /\d/.test(w)) return w;
	if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
	if (w.endsWith('sses')) w = w.slice(0, -2);
	else if (/(ch|sh|x|zz)es$/.test(w)) w = w.slice(0, -2);
	else if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
	if (w.endsWith('ing') && w.length > 5) {
		w = w.slice(0, -3);
		if (/([^aeiouls])\1$/.test(w)) w = w.slice(0, -1);
		return w;
	}
	if (w.endsWith('ed') && w.length > 4) {
		w = w.slice(0, -2);
		if (/([^aeiouls])\1$/.test(w)) w = w.slice(0, -1);
		return w;
	}
	if (w.endsWith('e') && w.length > 3) w = w.slice(0, -1);
	return w;
}

/** The words of a text, as they are matched: lowercase, "2,400" as "2400", stemmed. */
export function words(text: string): string[] {
	return (
		text
			.toLowerCase()
			.replace(/(\d),(\d{3})/g, '$1$2')
			.match(/[\p{L}\p{N}]+/gu) ?? []
	);
}

function stems(text: string): string[] {
	return words(text).map(stem);
}

/** As one padded string, so a phrase is found with includes(" a b "). */
function padded(list: string[]) {
	return ` ${list.join(' ')} `;
}

// ------------------------------------------------------------ index

type Indexed = {
	item: Item;
	part: Part;
	/** Index in item.parts; -1 for the item as a whole (its title, what it is). */
	n: number;
	text: string;
	/** How many words it has: a short part that matches is about the query, a long one may only mention it. */
	len: number;
	/** The file's name, folder and what it is: embedded with each part, as the daemon embeds "title: … | text: …". */
	ctx: string;
};

const SYNONYM = 0.85;
/** A phrase ("golden retriever") is more particular than its group's words ("dog"). */
const PHRASE_SYNONYM = 0.75;
const CONTEXT = 0.8;

let built: {
	parts: Indexed[];
	groups: string[][];
	/** Which groups each stemmed phrase is in. */
	member: Map<string, number[]>;
	/** Every stemmed phrase in the groups, longest first, for finding them in a query. */
	phrases: Set<string>;
} | null = null;

function folderWords(item: Item) {
	return item.key.startsWith('file:')
		? item.key.slice(5).split('/').slice(0, -1).join(' ')
		: '';
}

function index() {
	if (built) return built;
	const parts: Indexed[] = [];
	for (const item of items) {
		if (item.kind === 'emoji' || item.kind === 'folder') continue; // found by name only
		const ctx = padded(
			stems(
				[
					item.title.replace(/[-_.]/g, ' '),
					item.kind === 'file' ? item.about : '',
					folderWords(item),
				].join(' '),
			),
		);
		item.parts.forEach((part, n) => {
			const own = stems(`${part.sense ?? ''} ${part.text}`);
			parts.push({ item, part, n, text: padded(own), len: own.length, ctx });
		});
		// the whole: a document's title and kind, an app's comment, a setting's words, a song's tags
		const whole = [item.about ?? '', item.kind === 'file' ? '' : item.title]
			.join(' ')
			.trim();
		if (whole) {
			const own = stems(whole);
			parts.push({
				item,
				part: { loc: {}, text: '' },
				n: -1,
				text: padded(own),
				len: own.length,
				ctx,
			});
		}
	}
	const groups = GROUPS.map((g) => g.map((p) => stems(p).join(' ')));
	const member = new Map<string, number[]>();
	groups.forEach((g, i) => {
		for (const p of g) member.set(p, [...(member.get(p) ?? []), i]);
	});
	built = { parts, groups, member, phrases: new Set(member.keys()) };
	return built;
}

// ------------------------------------------------------------ type words

/**
 * The kind a type word asks for ("videos", "pdf", "songs"), as the daemon
 * reads it (crates/superspace/src/search.rs, `kind_word`).
 */
function kindWord(w: string): Kind | null {
	switch (w.endsWith('s') ? w.slice(0, -1) : w) {
		case 'video':
		case 'movie':
		case 'film':
		case 'footage':
			return 'video';
		case 'photo':
		case 'image':
		case 'picture':
		case 'pic':
		case 'screenshot':
			return 'image';
		case 'audio':
		case 'song':
		case 'music':
		case 'track':
		case 'memo':
		case 'recording':
		case 'podcast':
			return 'audio';
		case 'text':
		case 'doc':
		case 'document':
		case 'file':
		case 'pdf':
		case 'note':
			return 'file';
		case 'folder':
		case 'directory':
		case 'dir':
			return 'folder';
		case 'app':
		case 'application':
			return 'app';
		case 'setting':
			return 'setting';
		case 'clipboard':
			return 'clip';
		case 'emoji':
			return 'emoji';
		case 'history':
		case 'website':
			return 'history';
		default:
			return null;
	}
}

/**
 * Type words at the end of the query ("golden retriever video"), or leading
 * when plural ("apps firefox") or before "of", "about", … ("songs about a
 * breakup"): the rest of the query, the kinds asked for, and whether the files
 * asked for are PDFs. A port of the daemon's `type_words`.
 */
export function typeWords(
	q: string,
): { rest: string; kinds: Kind[]; pdf: boolean } | null {
	const w = q
		.toLowerCase()
		.replace(/[,&]/g, ' , ')
		.split(/\s+/)
		.filter((t) => t && t !== 'only');
	const typeword = (i: number) =>
		kindWord(w[i]) !== null ||
		['and', 'or', ','].includes(w[i]) ||
		(w[i] === 'voice' && w[i + 1]?.replace(/s$/, '') === 'memo');
	let end = w.length;
	while (end > 0 && typeword(end - 1)) end--;
	const folder = end === 0 && kindWord(w[w.length - 1] ?? '') === 'folder';
	if (folder) end = w.length - 1;
	const named =
		end === 0 &&
		(w[0]?.endsWith('s') ?? false) &&
		['app', 'setting'].includes(kindWord(w[0]) ?? '');
	if (named) end = w.length;
	let start = 0;
	while (start < end && typeword(start)) start++;
	let plural = 0;
	while (
		plural < start &&
		(kindWord(w[plural]) === null ||
			w[plural].endsWith('s') ||
			['emoji', 'clipboard', 'folder', 'dir', 'directory'].includes(w[plural]))
	)
		plural++;
	if (named) start = 1;
	else if (folder) start = 0;
	else if (
		!['of', 'about', 'with', 'from', 'on', 'where', 'that'].includes(
			w[start] ?? '',
		)
	)
		start = plural;
	const typed = [...w.slice(0, start), ...w.slice(end)];
	const kinds: Kind[] = [];
	for (const t of typed) {
		const k = kindWord(t);
		if (k && !kinds.includes(k)) kinds.push(k);
	}
	const pdf =
		kinds.includes('file') &&
		typed.every((t) => kindWord(t) !== 'file' || t.startsWith('pdf'));
	return kinds.length && start < end
		? { rest: w.slice(start, end).join(' '), kinds, pdf }
		: null;
}

/** The scope pill: "Videos", "Photos + Text". */
export function filterLabel(kinds: Kind[]): string {
	const names: Record<Kind, string> = {
		app: 'Apps',
		setting: 'Settings',
		file: 'Text',
		folder: 'Folders',
		image: 'Photos',
		video: 'Videos',
		audio: 'Audio',
		clip: 'Clipboard',
		emoji: 'Emoji',
		history: 'History',
		web: 'Web',
	};
	return kinds.map((k) => names[k]).join(' + ');
}

// ------------------------------------------------------------ names

function norm(s: string) {
	return s
		.toLowerCase()
		.replace(/[-_.,/()'’"“”:]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Edits between two words, a swap of neighbours counting as one (Damerau). */
function typos(a: string, b: string): number {
	if (Math.abs(a.length - b.length) > 1) return 2;
	const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
		Array.from({ length: b.length + 1 }, (_, j) =>
			i === 0 ? j : j === 0 ? i : 0,
		),
	);
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i][j] = Math.min(
				d[i - 1][j] + 1,
				d[i][j - 1] + 1,
				d[i - 1][j - 1] + cost,
			);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
			}
		}
	}
	return d[a.length][b.length];
}

/**
 * How well the query names the item: the whole name (1), the start of it, every
 * word the start of a word of it, and a word of five letters or more one typo
 * away ("chromum" is Chromium). 0 when it does not.
 */
function nameScore(q: string, item: Item): number {
	const qn = norm(q);
	if (!qn) return 0;
	const qw = qn.split(' ');
	let best = 0;
	for (const name of [item.title, ...item.names]) {
		const n = norm(name);
		if (!n) continue;
		if (n === qn) return 1;
		if (n.startsWith(qn)) {
			best = Math.max(best, 0.92);
			continue;
		}
		const nw = n.split(' ');
		let exact = 0;
		let close = 0;
		for (const w of qw) {
			if (nw.some((x) => x.startsWith(w) && (w.length > 1 || x === nw[0])))
				exact++;
			else if (w.length >= 5 && nw.some((x) => typos(w, x) <= 1)) close++;
		}
		if (exact === qw.length) best = Math.max(best, 0.85);
		else if (exact + close === qw.length) best = Math.max(best, 0.75);
		else if ((exact + close) / qw.length >= 0.5 && close > 0) {
			best = Math.max(best, 0.4);
		}
	}
	return best;
}

// ------------------------------------------------------------ meaning

type Term = {
	/** The query's own words for it, stemmed. */
	self: string;
	/** What it matches: itself (1), its group's words (less). */
	alts: Map<string, number>;
	idf: number;
};

/** The query's words, a phrase in a group kept whole ("fried rice", "golden retriever"). */
function terms(q: string): Term[] {
	const { groups, member, phrases, parts } = index();
	// small numbers ("2+2*3", "3pm") are in every document: they are not what a search is about
	const ws = words(q)
		.filter((w) => KEEP.has(w) || !STOP.has(w))
		.filter((w) => w.length > 1 && !/^\d{1,2}$/.test(w))
		.map(stem);
	const out: Term[] = [];
	for (let i = 0; i < ws.length; ) {
		let len = Math.min(3, ws.length - i);
		while (len > 1 && !phrases.has(ws.slice(i, i + len).join(' '))) len--;
		const self = ws.slice(i, i + len).join(' ');
		i += len;
		if (out.some((t) => t.self === self)) continue;
		const alts = new Map<string, number>([[self, 1]]);
		const weight = self.includes(' ') ? PHRASE_SYNONYM : SYNONYM;
		for (const g of member.get(self) ?? []) {
			for (const p of groups[g]) if (!alts.has(p)) alts.set(p, weight);
		}
		out.push({ self, alts, idf: 0 });
	}
	// rarer words weigh more: in how many parts any of a term's words are written
	for (const t of out) {
		let df = 0;
		for (const p of parts) {
			for (const a of t.alts.keys()) {
				if (p.text.includes(` ${a} `)) {
					df++;
					break;
				}
			}
		}
		t.idf = Math.log(1 + parts.length / (1 + df));
	}
	return out;
}

/** 0 to 1: how much of the query a part holds, the rare words counting most. */
function cover(terms: Term[], p: Indexed, lexical = false): number {
	let got = 0;
	let all = 0;
	for (const t of terms) {
		all += t.idf;
		let m = 0;
		for (const [a, w] of t.alts) {
			if (lexical && w < 1) continue;
			if (p.text.includes(` ${a} `)) m = Math.max(m, w);
			else if (!lexical && p.ctx.includes(` ${a} `))
				m = Math.max(m, w * CONTEXT);
			if (m === 1) break;
		}
		got += t.idf * m;
	}
	return all ? got / all : 0;
}

/** How much of the query the part's own text holds, without its file's name. */
function ownCover(terms: Term[], p: Indexed) {
	return cover(terms, { ...p, ctx: ' ' });
}

/** How often the query's words (and theirs) are in the part's own text. */
function mentions(terms: Term[], p: Indexed): number {
	let n = 0;
	for (const t of terms) {
		for (const a of t.alts.keys()) n += p.text.split(` ${a} `).length - 1;
	}
	return n;
}

/**
 * A small lift for the query's words written next to each other in the part,
 * and for a part whose file is named for them too ("best-man-speech…" for
 * "wedding speech"), as the daemon embeds a part with its file's title.
 */
function together(terms: Term[], p: Indexed) {
	const next =
		terms.length > 1 &&
		p.text.includes(` ${terms.map((t) => t.self).join(' ')} `);
	return (
		(next ? 0.05 : 0) + 0.05 * cover(terms, { ...p, text: p.ctx, ctx: ' ' })
	);
}

/** Below this, a row does not really match: it is dropped, so nothing found says so. */
function cutoff(terms: Term[]) {
	return terms.length === 1 ? 0.8 : 0.5;
}

/** And a row this far below the best match is a near miss, not a match. */
const NEAR_MISS = 0.25;

/**
 * For the order only: a photo of a dog is more about "dog" than a page that
 * mentions one, and a page that says "bond" five times more than one that says it once.
 */
function focus(terms: Term[], p: Indexed) {
	return (
		0.9 +
		0.1 *
			Math.min(1, (20 * Math.max(1, mentions(terms, p))) / Math.max(1, p.len))
	);
}

const KIND_WEIGHT: Partial<Record<Kind, number>> = {
	file: 0.95,
	image: 0.97,
	video: 0.98,
	audio: 0.98,
	setting: 0.97,
	app: 0.94,
	clip: 0.9,
	history: 0.86,
};

const KIND_ORDER: Kind[] = [
	'app',
	'setting',
	'file',
	'image',
	'video',
	'audio',
	'folder',
	'emoji',
	'clip',
	'history',
	'web',
];

type Scored = { part: Indexed; score: number };

/** Sections of a video or recording: the parts close to the best, neighbours merged, best first. */
function sections(scored: Scored[], best: number): Hit[] {
	const near = scored
		.filter((s) => s.part.n >= 0 && s.score >= best - 0.05)
		.sort((a, b) => a.part.n - b.part.n);
	const merged: { hit: Hit; score: number; last: number }[] = [];
	for (const s of near) {
		const prev = merged[merged.length - 1];
		const loc = s.part.part.loc;
		if (prev && prev.last === s.part.n - 1 && prev.hit.loc.tEnd !== undefined) {
			prev.hit.loc = { ...prev.hit.loc, tEnd: loc.tEnd };
			if (s.score > prev.score) {
				prev.score = s.score;
				prev.hit.text = s.part.part.text;
			}
			prev.last = s.part.n;
		} else {
			merged.push({
				hit: {
					loc: { ...loc },
					text: s.part.part.text,
					thumb: s.part.part.thumb,
				},
				score: s.score,
				last: s.part.n,
			});
		}
	}
	// on a tie the tighter section first: it is the closer answer
	const span = (h: Hit) => (h.loc.tEnd ?? 0) - (h.loc.t ?? 0);
	return merged
		.sort((a, b) => b.score - a.score || span(a.hit) - span(b.hit))
		.map((m) => m.hit);
}

/** The words of `text` the query asked for, as they are written there, to set in bold. */
function boldWords(terms: Term[], text: string): string[] {
	const want = new Set(terms.flatMap((t) => t.self.split(' ')));
	const out = new Set<string>();
	for (const w of words(text)) if (want.has(stem(w))) out.add(w);
	return [...out];
}

function webRow(q: string): Row {
	return {
		key: `web:${q}`,
		kind: 'web',
		title: `Search the web for “${q}”`,
		subtitle: 'DuckDuckGo',
		icon: 'web',
		why: 'name',
		hits: [],
		where: 'DuckDuckGo',
		score: 0,
	};
}

/** An item as a row: what is in it that matched, or its name. */
function toRow(item: Item, name: number, matched: Scored[], ts: Term[]): Row {
	const base: Row = {
		key: item.key,
		kind: item.kind,
		title: item.title,
		subtitle: item.subtitle,
		icon: item.icon,
		scene: item.scene,
		why: 'name',
		hits: [],
		duration: item.duration,
		emoji: item.emoji,
		where: item.where,
		score: name,
		named: name > 0,
	};
	if (!matched.length) return base;
	const best = matched[0].score;
	const row: Row = {
		...base,
		why: 'meaning',
		score: Math.max(
			name,
			best * (KIND_WEIGHT[item.kind] ?? 0.9) * focus(ts, matched[0].part),
		),
	};
	const shown = matched.filter((s) => s.part.n >= 0);
	if (item.kind === 'file') {
		// a part is a hit for what it says itself, not for the file's name
		const hits = shown
			.map((s) => ({ ...s, own: ownCover(ts, s.part) }))
			.filter((s) => s.own > 0 && s.score >= Math.max(0.2, best * 0.3))
			.slice(0, 8);
		row.hits = hits.map((s) => ({
			loc: s.part.part.loc,
			text: s.part.part.text,
		}));
		const top = hits[0]?.part.part.text ?? '';
		if (top) row.snippet = { text: top, words: boldWords(ts, top) };
		else row.why = name ? 'name' : 'meaning';
	} else if (item.kind === 'image') {
		const text = item.parts[0]?.text ?? '';
		if (text) row.snippet = { text, words: boldWords(ts, text) };
	} else if (item.kind === 'video' || item.kind === 'audio') {
		const whole = shown.find((s) => s.part.part.whole);
		const parts = shown.filter((s) => !s.part.part.whole);
		// spoken and sung lines by their own words first; a frame by what it shows
		const said = (list: Scored[]) =>
			list
				.filter((s) => s.score >= cutoff(ts))
				.sort((a, b) => b.score - a.score);
		let lines = said(
			parts.map((s) => ({
				...s,
				score: s.part.part.sense ? s.score : cover(ts, s.part, true),
			})),
		);
		// a recording found by meaning shows where; a song found by its theme keeps its whole lyrics
		if (!lines.length && !whole) lines = said(parts);
		if (lines.length && (!whole || lines[0].score >= whole.score)) {
			row.hits = sections(lines, lines[0].score);
			const text = row.hits[0]?.text ?? '';
			row.snippet = { text, words: boldWords(ts, text) };
		} else if (whole) {
			row.snippet = {
				text: whole.part.part.text,
				words: boldWords(ts, whole.part.part.text),
			};
		} else {
			row.why = 'name';
		}
	} else {
		row.why = 'name';
	}
	return row;
}

/**
 * A search, as the daemon answers it: `final` false is the instant phase (names
 * and the answer), true the final one (everything, by meaning too).
 */
export function search(
	query: string,
	final: boolean,
	now = Date.now(),
): Response {
	const q = query.trim();
	if (!q) {
		return {
			q,
			phase: final ? 'final' : 'instant',
			rows: [],
			answer: null,
			empty: false,
			filter: null,
		};
	}
	const ans = quickAnswer(q, now);
	const typed = typeWords(q);
	let res = run(typed ? typed.rest : q, final, typed);
	// a filter that would leave nothing while an app or setting is named falls back to none
	if (typed && !res.rows.length) {
		const all = run(q, final, null);
		if (
			all.rows.some(
				(r) => (r.kind === 'app' || r.kind === 'setting') && r.named,
			)
		) {
			res = all;
			res.filter = null;
		}
	}
	// a quick answer is the answer: under it, rows that only match by meaning must clear more
	const rows = ans
		? res.rows.filter((r) => r.why === 'name' || r.score >= 0.75)
		: res.rows;
	return {
		q,
		phase: final ? 'final' : 'instant',
		rows: [...rows, webRow(q)],
		answer: ans,
		empty: !rows.length && !ans,
		filter: res.filter,
	};
}

function run(
	q: string,
	final: boolean,
	typed: { kinds: Kind[]; pdf: boolean } | null,
): { rows: Row[]; filter: Kind[] | null } {
	const kinds = typed?.kinds ?? null;
	const keep = (item: Item) =>
		!kinds ||
		(kinds.includes(item.kind) &&
			!(item.kind === 'file' && typed?.pdf && !item.key.endsWith('.pdf')));
	const ts = final ? terms(q) : [];
	const cut = cutoff(ts);
	const byItem = new Map<Item, Scored[]>();
	if (ts.length) {
		for (const p of index().parts) {
			if (!keep(p.item)) continue;
			const score = Math.min(1, cover(ts, p) + together(ts, p));
			if (score <= 0) continue;
			byItem.set(p.item, [...(byItem.get(p.item) ?? []), { part: p, score }]);
		}
	}
	let top = 0;
	for (const scored of byItem.values()) {
		scored.sort((a, b) => b.score - a.score);
		top = Math.max(top, scored[0].score);
	}
	const rows: Row[] = [];
	for (const item of items) {
		if (!keep(item)) continue;
		const name = nameScore(q, item);
		const scored = byItem.get(item) ?? [];
		const real = scored[0]?.score >= Math.max(cut, top - NEAR_MISS);
		const matched = real ? scored : [];
		if (!name && !matched.length) continue;
		rows.push(toRow(item, name, matched, ts));
	}
	return { rows: order(rows, kinds), filter: kinds };
}

/**
 * Best first, gently grouped: at most 4 rows of one kind before the best of
 * each other kind, at most 3 emoji (all of them, up to 8, when asked for) and
 * 2 history rows, and an emoji's neighbours drawn as one strip.
 */
function order(rows: Row[], kinds: Kind[] | null): Row[] {
	const sorted = rows.sort(
		(a, b) =>
			b.score - a.score ||
			KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
	);
	const caps: Partial<Record<Kind, number>> = {
		emoji: kinds?.includes('emoji') ? 8 : 3,
		history: kinds?.includes('history') ? 8 : 2,
	};
	const counted: Partial<Record<Kind, number>> = {};
	const kept = sorted.filter((r) => {
		counted[r.kind] = (counted[r.kind] ?? 0) + 1;
		return (counted[r.kind] ?? 0) <= (caps[r.kind] ?? 99);
	});
	const out: Row[] = [];
	const placed: Partial<Record<Kind, number>> = {};
	const pending = [...kept];
	while (pending.length && out.length < 12) {
		const others = new Set(pending.map((r) => r.kind));
		const i = pending.findIndex(
			(r) =>
				(placed[r.kind] ?? 0) < 4 ||
				[...others].every((k) => k === r.kind || (placed[k] ?? 0) > 0),
		);
		const [r] = pending.splice(Math.max(0, i), 1);
		placed[r.kind] = (placed[r.kind] ?? 0) + 1;
		out.push(r);
	}
	// emoji together, where the first one is
	const first = out.findIndex((r) => r.kind === 'emoji');
	if (first < 0) return out;
	const emoji = out.filter((r) => r.kind === 'emoji');
	const rest = out.filter((r) => r.kind !== 'emoji');
	rest.splice(first, 0, ...emoji);
	return rest;
}

/** For tuning: every part's score for a query. */
export function debugParts(q: string) {
	const ts = terms(q);
	return index()
		.parts.map((p) => ({
			key: p.item.key,
			loc: p.part.loc,
			n: p.n,
			score: cover(ts, p) + together(ts, p),
			text: p.text.slice(0, 80),
		}))
		.filter((x) => x.score > 0.3)
		.sort((a, b) => b.score - a.score)
		.slice(0, 12)
		.concat(
			ts.map((t) => ({
				key: 'TERM',
				loc: {},
				n: 0,
				score: t.idf,
				text: t.self,
			})) as never[],
		);
}
