/**
 * The launcher's data, in the shapes Super Space's daemon sends its UI (its
 * `Row`, `Answer` and search response, in omarchy-super-space's crates/core),
 * cut down to what this copy in the browser draws.
 */

export type Kind =
	| 'app'
	| 'setting'
	| 'file'
	| 'folder'
	| 'image'
	| 'video'
	| 'audio'
	| 'clip'
	| 'emoji'
	| 'history'
	| 'web';

/** Where in a file a part is: a page (or an EPUB's chapter), slide, sheet row, line or time range. */
export type Loc = {
	page?: number;
	slide?: number;
	sheet?: string;
	row?: number;
	line?: number;
	/** Seconds from the start, and to the end of the section. */
	t?: number;
	tEnd?: number;
};

/** A document as the demo home holds it: its parts, as extraction reads them. */
export type DocSource = {
	path: string;
	/** Its title or what kind of document it is, found by meaning only. */
	about?: string;
	/** A sheet's rows carry its name as `sense`: read with the row, not shown. */
	parts: { loc: Loc; text: string; sense?: string }[];
};

/** The drawn stand-ins for the icons the real launcher takes from the icon theme. */
export type IconName =
	| 'pdf'
	| 'writer'
	| 'calc'
	| 'impress'
	| 'text'
	| 'html'
	| 'book'
	| 'mpv'
	| 'folder'
	| 'gear'
	| 'web'
	| 'photo'
	| 'paste'
	| 'chromium'
	| 'firefox'
	| 'zen'
	| 'terminal'
	| 'files'
	| 'imv'
	| 'music'
	| 'nvim'
	| 'whatsapp'
	| 'signal'
	| 'spotify'
	| 'obsidian'
	| 'typora'
	| 'localsend'
	| 'obs'
	| 'kdenlive'
	| 'pinta'
	| 'password'
	| 'docker'
	| 'btop'
	| 'emoji';

/**
 * A small drawn scene, standing in for a photo or a video frame: the demo's
 * pictures are other people's photos, so the page draws their colours instead.
 */
export type Scene =
	| 'retriever-market'
	| 'retriever-grass'
	| 'retriever-stick'
	| 'puppy'
	| 'puppy-blanket'
	| 'retriever-field'
	| 'beagle'
	| 'collie'
	| 'dachshund-beach'
	| 'terrier-beach'
	| 'cat-bench'
	| 'black-cat'
	| 'cat-sleeping'
	| 'tabby'
	| 'beach-winter'
	| 'pizza'
	| 'sushi'
	| 'nasi-goreng'
	| 'flat-white'
	| 'pavlova'
	| 'whiteboard'
	| 'receipt'
	| 'wineglass-bay'
	| 'cradle-mountain'
	| 'bali-sunset'
	| 'scan'
	| 'terminal'
	| 'dog-swimming'
	| 'waves'
	| 'traffic'
	| 'cat-laser'
	| 'milk-pot'
	| 'cat-play'
	| 'title-card';

/** One searchable piece of an item. */
export type Part = {
	loc: Loc;
	/** What the row shows for it: the passage, the lyric line, the video section's label. */
	text: string;
	/** What it shows, for matching by meaning, when that is not its text (a picture). */
	sense?: string;
	/** A video section's frame. */
	thumb?: Scene;
	/** A song's whole lyrics: matched as a theme, never a section of the song. */
	whole?: boolean;
};

export type Item = {
	key: string;
	kind: Exclude<Kind, 'web'>;
	title: string;
	subtitle: string;
	icon: IconName;
	/** A photo is its own icon. */
	scene?: Scene;
	/** Other names it is found by as you type: a file's name, an app's keywords. */
	names: string[];
	/** The whole item, for matching by meaning: a document's title, an app's comment. */
	about?: string;
	parts: Part[];
	/** Video and audio: the whole length, in seconds. */
	duration?: number;
	/** The emoji itself. */
	emoji?: string;
	/** Where it lives, for "Would open …": a path under ~, an app, a URL. */
	where: string;
};

export type Hit = { loc: Loc; text: string; thumb?: Scene };

export type Row = {
	key: string;
	kind: Kind;
	title: string;
	subtitle: string;
	icon: IconName;
	scene?: Scene;
	/** Why it is here: its name, or what is in it. */
	why: 'name' | 'meaning';
	/** The passage that matched, and the words in it to set in bold. */
	snippet?: { text: string; words: string[] };
	/** The parts that matched, best first. */
	hits: Hit[];
	duration?: number;
	emoji?: string;
	where: string;
	score: number;
	/** Found by its name, whatever the headline shows. */
	named?: boolean;
};

export type Answer = {
	kind: 'math' | 'percent' | 'units' | 'time' | 'currency';
	input: string;
	inputLabel: string;
	output: string;
	outputLabel: string;
	detail: string;
	/** What Enter copies. */
	copy: string;
};

export type Response = {
	q: string;
	phase: 'instant' | 'final';
	rows: Row[];
	answer: Answer | null;
	/** Nothing on this computer matches: no local row and no answer. */
	empty: boolean;
	/** The kinds the query's own words limit it to ("golden retriever video"). */
	filter: Kind[] | null;
	/** Nothing matches, and the query has words this copy does not know (the real one reads any language). */
	unknown?: boolean;
};
