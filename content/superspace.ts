/**
 * Every word on the Super Space product page (/projects/super-space).
 *
 * The only source for these claims is the product facts for the released
 * v0.1.4 (20 Oct 2026). Keep the numbers exactly as measured and keep their
 * qualifiers ("in our test", "measured on the Pi", "on the Try Omarchy VM").
 * Never mention anything that is not released yet.
 */

/** A run of text. `mark` is the part a search matched; `code` is set in Fragment Mono. */
export type Marked = string | { mark: string } | { code: string };

/** A short paragraph: the first sentence in full ink, the rest dimmed. */
export type Copy = { lead: string; rest?: string };

export type DemoIcon = 'doc' | 'video' | 'emoji' | 'wifi' | 'time' | 'web';

/** One row of the launcher: the matched passage is its headline. */
export type DemoRow = {
	/** The glyph in the row's tile. */
	icon: DemoIcon;
	headline: Marked[];
	/** Under the headline, joined by " · ". File names are set in Fragment Mono. */
	meta: string[];
	/** Video moments that matched, shown as chips in place of a headline passage. */
	moments?: string[];
	/** On the selected row: what Enter does. */
	hint?: string;
};

export type DemoItem = {
	query: string;
	rows: DemoRow[];
	/** The same result as one plain sentence, for screen readers. */
	said: string;
};

/** A query typed into Super Space and what it finds, as a small example line. */
export type Example = {
	query: string;
	/** What it finds; leave out for a query shown on its own. */
	result?: Marked[];
};

export type Stat = {
	/** "about", when the measurement is approximate. */
	about?: boolean;
	value: string;
	unit: string;
	label: string;
};

export type Beat = {
	key:
		| 'files'
		| 'moments'
		| 'speech'
		| 'everything'
		| 'private'
		| 'agents'
		| 'pi';
	title: string;
	copy: Copy;
	examples?: Example[];
	/** A screenshot slot: shown only when the file is in public/projects/super-space/. */
	shot?: { file: string; alt: string };
};

export type Faq = { q: string; a: Marked[] };

export const superSpace = {
	name: 'Super Space',
	version: '0.1.4',
	headline: 'Search what you mean',
	subhead:
		'Super Space is a Super+Space launcher for Omarchy. It finds apps, files, photos, moments in videos, spoken words and songs by what is in them, entirely on your computer.',
	repo: 'https://github.com/vincenth19/omarchy-super-space',
	repoLabel: 'github.com/vincenth19/omarchy-super-space',
	install:
		'omarchy plugin add https://github.com/vincenth19/omarchy-super-space --enable',
	uninstall: 'superspace-setup uninstall',
	/** The small line under the hero's actions. */
	meta: ['v0.1.4', 'MIT', 'Omarchy 4'],

	ui: {
		github: 'View on GitHub',
		copy: 'Copy',
		copied: 'Copied',
		copyFailed: 'Could not copy. The command is selected, copy it with Ctrl+C.',
		copyInstall: 'install command',
		copyUninstall: 'uninstall command',
		logoAlt: 'Super Space logo: a space bar key wearing a red cape',
		about: 'about',
		backToProjects: 'All projects',
		madeBy: 'Super Space is made by Vincent Haryadi.',
	},

	demo: {
		kicker: ['Press', 'Super', '+', 'Space'],
		title: 'Type what you remember',
		/** Screen readers get this list instead of the animation. */
		listLabel: 'Example searches',
		/** The last row in the launcher: web results are never on top. */
		web: 'Search the web for',
		pause: 'Pause the demo',
		play: 'Play the demo',
		show: 'Show the search for',
		items: [
			{
				query: 'apartment lease bond',
				rows: [
					{
						icon: 'doc',
						headline: ['“…rental ', { mark: 'bond' }, ' of $2,400…”'],
						meta: ['The lease', 'page 3'],
						hint: 'Opens at page 3',
					},
				],
				said: '“apartment lease bond” finds the lease, page 3: “rental bond of $2,400”.',
			},
			{
				query: 'golden retriever video',
				rows: [
					{
						icon: 'video',
						headline: [],
						moments: ['0:10–0:30', '0:45–0:59'],
						meta: ['weekend-clips-oct-2026.mp4'],
						hint: 'Enter plays it there',
					},
				],
				said: '“golden retriever video” finds weekend-clips-oct-2026.mp4, at 0:10–0:30 and 0:45–0:59. Enter plays it there.',
			},
			{
				query: 'anjing',
				rows: [{ icon: 'emoji', headline: ['🐶'], meta: ['Emoji'] }],
				said: '“anjing”, Indonesian for dog, finds the 🐶 emoji.',
			},
			{
				query: 'wifi connect',
				rows: [{ icon: 'wifi', headline: ['Wi-Fi'], meta: ['Omarchy setting'] }],
				said: '“wifi connect” finds the Omarchy Wi-Fi setting.',
			},
			{
				query: '3pm sydney in jakarta',
				rows: [
					{
						icon: 'time',
						headline: [{ mark: '11:00 am' }, ' in Jakarta'],
						meta: ['3:00 pm in Sydney'],
					},
				],
				said: '“3pm sydney in jakarta” answers 11:00 am in Jakarta.',
			},
		] satisfies DemoItem[],
	},

	beats: [
		{
			key: 'files',
			title: 'Inside your files',
			copy: {
				lead: 'Text inside PDF, Word, Excel, PowerPoint, Markdown and text files.',
				rest: 'It opens at the matching page, slide or sheet.',
			},
			examples: [
				{
					query: 'apartment lease bond',
					result: ['the lease, page 3: “rental bond of $2,400”'],
				},
			],
			shot: {
				file: 'lease.webp',
				alt: 'Super Space finding “rental bond of $2,400” on page 3 of a lease',
			},
		},
		{
			key: 'moments',
			title: 'Photos and video moments',
			copy: {
				lead: 'It finds what a picture shows, and which parts of a video match.',
				rest: 'Enter plays the video there.',
			},
			examples: [
				{
					query: 'golden retriever video',
					result: [
						{ code: 'weekend-clips-oct-2026.mp4' },
						' at 0:10–0:30 and 0:45–0:59',
					],
				},
			],
			shot: {
				file: 'video.webp',
				alt: 'Super Space finding the moments of a video that match “golden retriever video”',
			},
		},
		{
			key: 'speech',
			title: 'Spoken words and songs',
			copy: {
				lead: 'Voice memos and the speech in videos are transcribed on the device, with whisper.cpp.',
				rest: 'Songs are found by their lyrics.',
			},
			examples: [{ query: 'songs about a breakup' }],
			shot: {
				file: 'songs.webp',
				alt: 'Super Space finding songs by their lyrics',
			},
		},
		{
			key: 'everything',
			title: 'One box for everything else',
			copy: {
				lead: 'Apps, Omarchy settings by meaning, emoji in any language, clipboard history with where each copy came from, browser history and folders by name.',
				rest: 'Quick answers for maths, units, currency and time zones.',
			},
			examples: [
				{ query: 'wifi connect', result: ['the Omarchy Wi-Fi setting'] },
				{ query: 'anjing', result: ['🐶'] },
				{ query: '3pm sydney in jakarta', result: ['11:00 am in Jakarta'] },
			],
		},
		{
			key: 'private',
			title: 'Local and private',
			copy: {
				lead: 'The models run on your machine: Google’s EmbeddingGemma, through llama.cpp. After setup it works offline.',
				rest: 'It only goes online for the daily currency rates, or when you pick the “search the web” row.',
			},
		},
		{
			key: 'agents',
			title: 'Your AI agents can use it too',
			copy: {
				lead: 'A CLI, an MCP server and an agent skill, set up by the same install.',
			},
		},
		{
			key: 'pi',
			title: 'Runs on a Raspberry Pi 5',
			copy: {
				lead: 'Indexing runs at idle priority, then only re-reads changed files.',
			},
		},
	] satisfies Beat[],

	/** "One box for everything else": the small print under the examples. */
	everything: {
		scopeLabel: 'Scope words narrow a search',
		scopes: [
			'apps firefox',
			'settings wifi',
			'photos beach',
			'emoji money',
			'camera folder',
		],
		notes: [
			'Browser history from Chromium, Chrome, Brave, Edge, Firefox and Zen.',
			'Currency uses daily ECB rates.',
		],
	},

	/** "Local and private": what it leaves alone. */
	private: [
		{
			title: 'Skips',
			text: ['node_modules', '.git', 'dot folders', 'anything gitignored'],
		},
		{
			title: 'Never stores',
			text: ['clipboard copies a password manager marks as secret'],
		},
		{ title: 'Says', text: ['“nothing found”, honestly'] },
		{ title: 'Web results', text: ['never on top'] },
	],

	/** "Your AI agents can use it too": one measured run. */
	agents: {
		caption: 'In our test',
		setup:
			'Claude Code answering 10 questions about the files on a Raspberry Pi 5.',
		columns: ['With Super Space', 'Without'],
		rows: [
			{ label: 'Correct answers', with: '10 of 10', without: '5 of 10' },
			{ label: 'Time', with: '201 s', without: '435 s' },
			{ label: 'Tool calls', with: '30', without: '51' },
		],
		note: 'Measured once. A small sample: 10 questions.',
	},

	/** "Runs on a Raspberry Pi 5". */
	pi: {
		indexing: [
			{ about: true, value: '3', unit: 's', label: 'names searchable' },
			{
				about: true,
				value: '1',
				unit: 'min',
				label: 'every document, by meaning',
			},
			{ about: true, value: '12', unit: 'min', label: 'everything' },
		] satisfies Stat[],
		indexingNote:
			'Measured on the Pi with the demo home: about 80 documents, photos, songs and videos.',
		speed: [
			{ value: '2', unit: 'ms', label: 'first results, p95' },
			{
				value: '73',
				unit: 'ms',
				label: 'results by meaning, p95: about 50–75 ms of work after a 150 ms pause in typing',
			},
		] satisfies Stat[],
		speedNote: 'Search speed measured on the Try Omarchy VM (Apple Silicon).',
	},

	installSection: {
		eyebrow: 'Install',
		title: 'One command',
		requirements: {
			title: 'Requirements',
			items: [
				'Omarchy 4 (Hyprland and its Quickshell shell)',
				'Linux, arm64 or x86_64',
				'CPU only, no GPU',
			],
			note: 'Tested on a Raspberry Pi 5 (8 GB) and the Try Omarchy VM on an Apple Silicon Mac. The x86_64 build is built by CI but has not been run on x86 hardware.',
		},
		download: {
			title: 'Download',
			app: { label: 'The app', arm: '8.5 MB', x64: '9.0 MB' },
			setupLead:
				'Setup also fetches the models and runtimes, about 1 GB in total:',
			parts: [
				{ label: 'EmbeddingGemma', size: '310 MB' },
				{ label: 'its image and audio part', size: '555 MB' },
				{ label: 'whisper base', size: '82 MB' },
				{
					label: 'llama.cpp and whisper.cpp builds',
					size: 'about 19 MB arm64, 28 MB x64',
				},
			],
		},
		uninstall: { title: 'Uninstall' },
		licence:
			'The code is MIT-licensed. The model is Google’s EmbeddingGemma, under Google’s Gemma terms: setup downloads it, it is not bundled.',
	},

	faqTitle: 'Questions',
	faq: [
		{
			q: 'Does it send my files anywhere?',
			a: [
				'No. Everything is read and indexed on your machine; after setup it works offline. It only goes online for daily currency rates, or a web search you pick yourself.',
			],
		},
		{
			q: 'What hardware?',
			a: [
				'Any Omarchy 4 machine, arm64 or x86_64. It’s built to run on a Raspberry Pi 5.',
			],
		},
		{
			q: 'Is it fast?',
			a: [
				'First results in single-digit milliseconds; results by meaning land as soon as you pause typing. Indexing runs at idle priority, then only re-reads changed files.',
			],
		},
		{
			q: 'Does it replace Omarchy’s launcher?',
			a: ['It takes over Super+Space and finds apps too. You can unbind it.'],
		},
		{
			q: 'Can my AI agents use it?',
			a: [
				'Yes: CLI, MCP server and agent skill, registered for the agents you have installed.',
			],
		},
		{
			q: 'How do I remove it?',
			a: [{ code: 'superspace-setup uninstall' }],
		},
	] satisfies Faq[],

	cta: {
		title: 'Free',
		copy: 'The code is MIT-licensed and on GitHub.',
	},

	/** Media slots, shown only when the files are in public/projects/super-space/. */
	film: {
		title: 'The real thing',
		label: 'Super Space demo video',
	},
};

export type SuperSpace = typeof superSpace;
