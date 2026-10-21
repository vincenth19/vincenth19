/**
 * Every word on the Super Space product page (/projects/super-space).
 *
 * The only source for these claims is the product facts for the released
 * v0.1.4 (20 Oct 2026). Keep the numbers exactly as measured and keep their
 * qualifiers ("in our test", "measured on the Pi", "on the Try Omarchy VM").
 * Never mention anything that is not released yet.
 */

/**
 * A run of text. `mark` is the part a search matched; `code` is set in Fragment
 * Mono; `word` is a key word, set in full ink among dimmer words.
 */
export type Marked =
	| string
	| { mark: string }
	| { code: string }
	| { word: string };

/** A short paragraph: the first sentence in full ink, the rest dimmed. */
export type Copy = { lead: string; rest?: string };

export type DemoIcon = 'doc' | 'video';

/** What a search found: the matched passage is its headline. */
export type DemoRow = {
	/** The glyph beside where it was found. */
	icon: DemoIcon;
	headline: Marked[];
	/** Under the headline, joined by " · ". Left out when empty. */
	meta: string[];
	/** Video moments that matched, set in place of a headline passage. */
	moments?: string[];
};

/** A search and what it finds, set large in a beat. */
export type DemoItem = {
	query: string;
	rows: DemoRow[];
};

export type Stat = {
	/** "about", set on the number's line, when the measurement is approximate. */
	about?: boolean;
	value: string;
	unit: string;
	label: string;
	/** A qualifier set right under the label, in Fragment Mono. */
	detail?: string;
};

/** A group of measurements, with what they were measured on said first. */
export type StatGroup = {
	/** The group's heading, above its numbers, so it frames them. */
	on: string;
	stats: Stat[];
	note?: string;
};

/**
 * A photo that is not ours, with the credit its licence asks for, set small
 * under it: "<before><licence>, via <where><after>", the licence linked to its
 * terms and `where` to the photo's source.
 */
export type Photo = {
	alt: string;
	credit: {
		before: string;
		licence: string;
		licenceUrl: string;
		where: string;
		source: string;
		after: string;
	};
};

export type Beat = {
	key:
		| 'files'
		| 'moments'
		| 'speech'
		| 'everything'
		| 'scopes'
		| 'private'
		| 'agents'
		| 'pi'
		| 'speed';
	title: string;
	copy?: Copy;
	/** A screenshot slot: shown only when the file is in public/projects/super-space/. */
	shot?: { file: string; alt: string };
};

export type Faq = { q: string; a: Marked[] };

/**
 * The launcher's own words: its field's name and placeholder, what screen
 * readers hear about its keys and results, and what it says when nothing
 * matches. `{n}` is the number of results, `{top}` the first.
 */
export type LauncherLabels = {
	field: string;
	placeholder: string;
	keys: string;
	results: string;
	nothing: string;
	unknown: string;
	one: string;
	many: string;
	/** The button that opens the launcher again once it is closed. */
	reopen: string;
	/** Said when Tab lists a row's parts: "{Parts} listed: {list}". */
	listed: string;
};

/**
 * Where a picture in the demo home comes from (omarchy-super-space's
 * demo/CREDITS.md): shown, with its credit, once its small WebP is in
 * public/projects/super-space/demo/ as `<scene>.webp`. `at` is the second of
 * the source video the frame is taken from.
 */
export type DemoPicture = {
	scene: string;
	title: string;
	author: string;
	licence: string;
	source: string;
	at?: number;
};

const version = '0.1.4';

/**
 * Both, in this order: the plugin, left in place, would set itself up again
 * the next time it loads (the product's README, "Uninstall").
 */
const uninstall = [
	'superspace-setup uninstall',
	'omarchy plugin remove io.github.vincenth19.superspace',
] as const;

export const superSpace = {
	name: 'Super Space',
	version,
	headline: 'Search what you mean',
	subhead:
		'Super Space is a Super+Space launcher for Omarchy. It finds apps, files, photos, moments in videos, spoken words and songs by what is in them, entirely on your computer.',
	repo: 'https://github.com/vincenth19/omarchy-super-space',
	repoLabel: 'github.com/vincenth19/omarchy-super-space',
	install:
		'omarchy plugin add https://github.com/vincenth19/omarchy-super-space --enable',
	uninstall,
	/** The small line under the hero's actions. */
	meta: [`v${version}`, 'MIT', 'Omarchy 4'],
	/** Between the items of a one-line list, with a space either side. */
	sep: '·',

	ui: {
		github: 'View on GitHub',
		copy: 'Copy',
		copied: 'Copied',
		copyFailed: 'Could not copy. The command is selected, copy it from there.',
		copyInstall: 'install command',
		copyUninstall: 'uninstall commands',
		about: 'about',
		backToProjects: 'All projects',
	},

	demo: {
		/** How you open it: the product is a Super+Space launcher. */
		title: 'Press Super+Space',
		/**
		 * The search the launcher opens with (and its first frame shows): not the
		 * search the next beat sets out.
		 */
		initial: 'golden retriever video',
		/** Searches to try, under the screen: the product's own first examples, one row. */
		examples: [
			'golden retriever video',
			'apartment lease bond',
			'songs about a breakup',
			'wifi connect',
			'anjing',
			'apps firefox',
		],
		try: 'Try',
		/** Names the row of example searches. */
		show: 'Example searches',
		caption:
			'A copy of the launcher running in your browser, over the demo files. The real one runs a model on your computer.',
		labels: {
			field: 'Search the demo files',
			placeholder: 'Search apps, files, photos, answers…',
			keys: 'Type to search. Down and up arrows choose a result; right and left arrows step through its pages or moments, and Tab lists them (Tab again moves on). Enter opens it.',
			results: 'Results',
			nothing: 'Nothing on this computer matches',
			unknown:
				'This copy knows the demo’s words in English and Indonesian, and the main ones in ten other languages.',
			one: '1 result. First: {top}',
			many: '{n} results. First: {top}',
			reopen: 'Open the launcher again (Super+Space)',
			listed: '{parts} listed: {list}. Tab again moves on.',
		} satisfies LauncherLabels,
		/** The credit line for the demo's pictures: before the list, between title and author, after a video's frame. */
		credit: {
			summary: 'Picture credits',
			lead: 'Pictures in the demo, via Wikimedia Commons, cropped and scaled down:',
			by: 'by',
			frame: '(a frame)',
		},
		/** Licence pages, by the name the credits use. */
		licences: {
			'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
			'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
			'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
			'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
			'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
			CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
		} as Record<string, string>,
		pictures: [
			{
				scene: 'retriever-market',
				title: 'Golden retriever gnawing at the farmer’s market',
				author: 'Grendelkhan',
				licence: 'CC BY-SA 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Golden_retriever_gnawing_at_the_farmer%27s_market.jpg',
			},
			{
				scene: 'retriever-grass',
				title: 'A Golden Retriever-9 (Barras)',
				author: 'Barras',
				licence: 'CC BY 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:A_Golden_Retriever-9_(Barras).JPG',
			},
			{
				scene: 'retriever-stick',
				title: 'Golden Retriever with a stick (Barras)',
				author: 'Barras',
				licence: 'CC BY-SA 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Golden_Retriever_with_a_stick_(Barras).jpg',
			},
			{
				scene: 'puppy',
				title: 'Callie the golden retriever puppy',
				author: 'MichaelMcPhee',
				licence: 'CC BY 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Callie_the_golden_retriever_puppy.jpg',
			},
			{
				scene: 'puppy-blanket',
				title: 'Golden Retriever puppy (3813393)',
				author: 'jaclou-dl',
				licence: 'CC0',
				source:
					'https://commons.wikimedia.org/wiki/File:Golden_Retriever_puppy_(3813393).jpg',
			},
			{
				scene: 'retriever-field',
				title: 'Dülmen, Hausdülmen, Golden Retriever -- 2022 -- 5945',
				author: 'Dietmar Rabich',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:D%C3%BClmen,_Hausd%C3%BClmen,_Golden_Retriever_--_2022_--_5945.jpg',
			},
			{
				scene: 'beagle',
				title: 'Beagle sleeping in Hautmont (DSC07212)',
				author: 'Trougnouf (Benoit Brummer)',
				licence: 'CC BY 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Beagle_sleeping_in_Hautmont_(DSC07212).jpg',
			},
			{
				scene: 'collie',
				title: 'Border-Collie-tri-colour-face-1',
				author: 'Kreuzschnabel',
				licence: 'CC BY-SA 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Border-Collie-tri-colour-face-1.jpg',
			},
			{
				scene: 'dachshund-beach',
				title: 'Running Dachshund at the beach',
				author: 'Dan Bennett',
				licence: 'CC BY 2.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Running_Dachshund_at_the_beach.jpg',
			},
			{
				scene: 'terrier-beach',
				title: 'Jack Russell Terrier Eddi running at the beach',
				author: 'Steve-65',
				licence: 'CC BY-SA 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Jack_Russell_Terrier_Eddi_running_at_the_beach.JPG',
			},
			{
				scene: 'cat-bench',
				title: 'Cat sleeping on a bench, Prazeres Cemetery, Lisbon',
				author: 'Jules Verne Times Two',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Cat_sleeping_on_a_bench,_Prazeres_Cemetery,_Lisbon,_Portugal_julesvernex2.jpg',
			},
			{
				scene: 'black-cat',
				title: 'Black-Cat-Sitia-Crete-Greece-2',
				author: 'Petro Stelte',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Black-Cat-Sitia-Crete-Greece-2.jpg',
			},
			{
				scene: 'cat-sleeping',
				title: 'Kali April 2016-6',
				author: 'Alvesgaspar',
				licence: 'CC BY-SA 4.0',
				source: 'https://commons.wikimedia.org/wiki/File:Kali_April_2016-6.jpg',
			},
			{
				scene: 'tabby',
				title: 'Young tabby cat keeping watch',
				author: 'W.carter',
				licence: 'CC0',
				source:
					'https://commons.wikimedia.org/wiki/File:Young_tabby_cat_keeping_watch.jpg',
			},
			{
				scene: 'beach-winter',
				title: 'Tofta strand November 2023 07',
				author: 'ArildV',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Tofta_strand_November_2023_07.jpg',
			},
			{
				scene: 'pizza',
				title: 'Margherita pizza on plate',
				author: 'Shisma',
				licence: 'CC BY 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Margherita_pizza_on_plate.jpg',
			},
			{
				scene: 'sushi',
				title: 'Sushi Plate in Organic Sushi Prague 4',
				author: 'Mojmir Churavy',
				licence: 'CC0',
				source:
					'https://commons.wikimedia.org/wiki/File:Sushi_Plate_in_Organic_Sushi_Prague_4.jpg',
			},
			{
				scene: 'nasi-goreng',
				title: 'Nasi Goreng Kampung',
				author: 'Supardisahabu',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Nasi_Goreng_Kampung.jpg',
			},
			{
				scene: 'flat-white',
				title: 'Flat white coffee with pretty feather pattern',
				author: 'GeorgeMichaelFarewell',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Flat_white_coffee_with_pretty_feather_pattern.jpg',
			},
			{
				scene: 'pavlova',
				title: 'Pavlova dessert',
				author: 'Hazel Fowler',
				licence: 'Public domain',
				source: 'https://commons.wikimedia.org/wiki/File:Pavlova_dessert.JPG',
			},
			{
				scene: 'whiteboard',
				title:
					'Media Viewer Launch Retrospective Whiteboard - April 11 2014 01',
				author: 'Fabrice Florin, Aaron Arcos',
				licence: 'CC BY-SA 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Media_Viewer_Launch_Retrospective_Whiteboard_-_April_11_2014_01.jpg',
			},
			{
				scene: 'receipt',
				title: 'ReceiptSwiss',
				author: 'Audrius Meskauskas (Audriusa)',
				licence: 'CC BY-SA 3.0',
				source: 'https://commons.wikimedia.org/wiki/File:ReceiptSwiss.jpg',
			},
			{
				scene: 'wineglass-bay',
				title: 'Wineglass Bay, Tasmania',
				author: 'BennyG3255',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Wineglass_Bay,_Tasmania.jpg',
			},
			{
				scene: 'cradle-mountain',
				title: 'Boat shed and Cradle Mountain at Dove Lake, Tas',
				author: 'Thennicke',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Boat_shed_and_Cradle_Mountain_at_Dove_Lake,_Tas.jpg',
			},
			{
				scene: 'bali-sunset',
				title: 'Sunset, Kuta, Bali, Indonesia, 20220825 1752 0877',
				author: 'Jakub Hałun',
				licence: 'CC BY-SA 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Sunset,_Kuta,_Bali,_Indonesia,_20220825_1752_0877.jpg',
			},
			{
				scene: 'waves',
				title:
					'Strong waves from Hurricane Erin lead to beaches in Wellfleet, MA closing on Aug. 22, 2025',
				author: 'Magpieturtle',
				licence: 'CC BY 4.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Strong_waves_from_Hurricane_Erin_lead_to_beaches_in_Wellfleet,_MA_closing_on_Aug._22,_2025.webm',
				at: 5,
			},
			{
				scene: 'dog-swimming',
				title: 'Golden retriever swimming the doggy paddle',
				author: 'Golden Woofs',
				licence: 'CC BY 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Golden_retriever_swimming_the_doggy_paddle.webm',
				at: 27,
			},
			{
				scene: 'traffic',
				title: 'Traffic on Slovenska street 2',
				author: 'Sounds of Changes',
				licence: 'CC BY 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Traffic_on_Slovenska_street_2.webm',
				at: 7,
			},
			{
				scene: 'cat-laser',
				title: 'Cat playing with a laser pointer',
				author: 'Clément Bucco-Lechat',
				licence: 'CC BY-SA 3.0',
				source:
					'https://commons.wikimedia.org/wiki/File:Cat_playing_with_a_laser_pointer.webm',
				at: 10,
			},
			{
				scene: 'milk-pot',
				title: 'Milchkochen',
				author: 'Lulumara',
				licence: 'CC0',
				source: 'https://commons.wikimedia.org/wiki/File:Milchkochen.webm',
				at: 9,
			},
			{
				scene: 'cat-play',
				title: 'Cat Play 03',
				author: 'NairobiPapel (Kamaa)',
				licence: 'CC BY-SA 4.0',
				source: 'https://commons.wikimedia.org/wiki/File:Cat_Play_03.webm',
				at: 4,
			},
		] satisfies DemoPicture[],
		/**
		 * The demo's own pictures (a scanned receipt, a terminal screenshot), drawn
		 * by its make_media.py and CC0: shown, no credit needed.
		 */
		own: ['scan', 'terminal'],
	},

	/**
	 * The result a beat sets large, in type rather than as the launcher's panel,
	 * so the launcher is not shown twice: two of its searches, as they find.
	 */
	finds: {
		files: {
			query: 'apartment lease bond',
			rows: [
				{
					icon: 'doc',
					headline: ['“…rental ', { mark: 'bond' }, ' of $2,400…”'],
					meta: ['The lease', 'page 3'],
				},
			],
		},
		moments: {
			query: 'golden retriever video',
			rows: [
				{
					icon: 'video',
					headline: [],
					moments: ['0:10–0:30', '0:45–0:59'],
					meta: ['weekend-clips-oct-2026.mp4'],
				},
			],
		},
	} satisfies Record<'files' | 'moments', DemoItem>,

	/**
	 * The feature beats, in order. Each shows something the demo does not: the
	 * result of its search set large (see `finds`), the scope words, the numbers.
	 */
	beats: [
		{
			key: 'files',
			title: 'Inside your files',
			copy: {
				lead: 'The text inside your documents, by meaning.',
				rest: 'It opens at the matching page, slide or sheet.',
			},
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
				rest: 'Press Enter and the video plays from there.',
			},
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
			shot: {
				file: 'songs.webp',
				alt: 'Super Space finding songs by their lyrics',
			},
		},
		// its words are `everything.finds`, set large
		{ key: 'everything', title: 'One box for everything else' },
		{ key: 'scopes', title: 'Scope words narrow a search' },
		{
			key: 'private',
			title: 'Local and private',
			copy: {
				lead: 'The models run on your machine: Google’s EmbeddingGemma, through llama.cpp. After setup it works offline.',
				rest: 'It only goes online for the ECB’s exchange rates (through Frankfurter), or when you pick the “search the web” row.',
			},
		},
		{
			key: 'agents',
			title: 'Your AI agents can use it too',
			copy: {
				lead: 'A CLI, an MCP server and an agent skill, set up by the same install.',
			},
		},
		// the photo and its numbers say it: no paragraph
		{ key: 'pi', title: 'Runs on a Raspberry Pi 5' },
		// the search speed was measured on the VM, not the Pi: a beat of its own
		// a word joiner after the hyphen: "single-digit" stays on one line
		{ key: 'speed', title: 'First results in single-\u2060digit milliseconds' },
	] satisfies Beat[],

	/** "Inside your files": the kinds of document it reads. */
	formats: ['PDF', 'Word', 'Excel', 'PowerPoint', 'Markdown', 'Text'],

	/** "Spoken words and songs": a search for songs by their lyrics. */
	speech: { query: 'songs about a breakup' },

	/** "One box for everything else": what else it finds, set large, then the small print. */
	everything: {
		finds: [
			{ word: 'Apps' },
			', ',
			{ word: 'Omarchy settings' },
			' by meaning, ',
			{ word: 'emoji' },
			' in any language, ',
			{ word: 'clipboard' },
			' and ',
			{ word: 'browser history' },
			', ',
			{ word: 'folders' },
			' by name. And quick answers: ',
			{ word: 'maths' },
			', ',
			{ word: 'units' },
			', ',
			{ word: 'currency' },
			', ',
			{ word: 'time zones' },
			'.',
		] satisfies Marked[],
		note: 'Browser history from Chromium, Chrome, Brave, Edge, Firefox and Zen. Clipboard history keeps where each copy came from.',
	},

	/** Scope words: the scope word in each search is marked. */
	scopes: [
		[{ mark: 'apps' }, ' firefox'],
		[{ mark: 'settings' }, ' wifi'],
		[{ mark: 'photos' }, ' beach'],
		[{ mark: 'emoji' }, ' money'],
		['camera ', { mark: 'folder' }],
	] satisfies Marked[][],

	/** "Local and private": what it leaves alone. */
	private: [
		{
			title: 'Skips',
			text: [
				{ code: 'node_modules' },
				', ',
				{ code: '.git' },
				', dot folders and anything gitignored',
			],
		},
		{
			title: 'Never stores',
			text: ['Clipboard copies a password manager marks as secret'],
		},
		{ title: 'Says', text: ['“Nothing found”, honestly'] },
		{ title: 'Web results', text: ['Never on top'] },
	] satisfies { title: string; text: Marked[] }[],

	/** "Your AI agents can use it too": one measured run. */
	agents: {
		caption: 'In our test:',
		setup:
			'Claude Code answered 10 questions about the files on a Raspberry Pi 5, with and without Super Space.',
		columns: ['With Super Space', 'Without'],
		rows: [
			{ label: 'Correct answers', with: '10 of 10', without: '5 of 10' },
			{ label: 'Time', with: '201 s', without: '435 s' },
			{ label: 'Tool calls', with: '30', without: '51' },
		],
		note: 'Measured once. A small sample: 10 questions.',
	},

	/** "Runs on a Raspberry Pi 5": the board, then what was measured on it. */
	pi: {
		photo: {
			alt: 'A Raspberry Pi 5 board, seen from above',
			/** The licence (CC BY-SA 4.0) asks for this credit, and to say the photo was cropped. */
			credit: {
				before: 'Raspberry Pi 5 photo: Simon Waldherr, ',
				licence: 'CC BY-SA 4.0',
				licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
				where: 'Wikimedia Commons',
				// the photo's own page on Commons, "Raspberry Pi 5 Board.jpg"
				source:
					'https://commons.wikimedia.org/wiki/File:Raspberry_Pi_5_Board.jpg',
				after: ' (cropped)',
			},
		},
		// From the product facts (the engineering session, 20 Oct): measured
		// with the demo home. The product README's "The first index" table,
		// written on 18 Oct before this run, still gives estimates for it.
		on: 'Indexing at idle priority, measured on the Pi',
		stats: [
			{ about: true, value: '3', unit: 's', label: 'names searchable' },
			{
				about: true,
				value: '1',
				unit: 'min',
				label: 'every document, by meaning',
			},
			{ about: true, value: '12', unit: 'min', label: 'everything' },
		],
		note: 'With the demo home: about 80 documents, photos, songs and videos.',
	} satisfies StatGroup & { photo: Photo },

	/** The search speed, in a beat of its own: it was measured on the VM, not the Pi. */
	speed: {
		on: 'Search speed, measured on the Try Omarchy VM (Apple Silicon)',
		stats: [
			{ value: '2', unit: 'ms', label: 'to first results, p95' },
			{
				value: '73',
				unit: 'ms',
				label: 'of work for results by meaning, p95',
				detail: 'about 50–75 ms, after a 150 ms pause in typing',
			},
		],
	} satisfies StatGroup,

	installSection: {
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
			app: {
				label: 'The app',
				/** One per line. */
				sizes: [
					{ size: '8.5 MB', arch: 'arm64' },
					{ size: '9.0 MB', arch: 'x64' },
				],
			},
			setupLead:
				'Setup also fetches the models and runtimes, about 1 GB in total:',
			/** Each size is one line; "about" goes with each of them. */
			parts: [
				{ label: 'EmbeddingGemma', size: ['310 MB'] },
				{ label: 'EmbeddingGemma image and audio part', size: ['555 MB'] },
				{ label: 'whisper base', size: ['82 MB'] },
				{
					label: 'llama.cpp and whisper.cpp builds',
					size: ['about 19 MB arm64', 'about 28 MB x64'],
				},
			],
		},
		uninstall: {
			title: 'Uninstall',
			note: 'Run both: a plugin left in place sets itself up again when it next loads.',
		},
		licence: {
			title: 'Licence',
			text: 'The code is MIT-licensed. The model is Google’s EmbeddingGemma, under Google’s Gemma terms: setup downloads it, it is not bundled.',
		},
	},

	faqTitle: 'Questions',
	faq: [
		{
			q: 'Does it send my files anywhere?',
			a: [
				'No. Everything is read and indexed on your machine; after setup it works offline. It only goes online for the ECB’s exchange rates (through Frankfurter), or a web search you pick yourself.',
			],
		},
		{
			q: 'What hardware?',
			a: [
				'Any Omarchy 4 machine on arm64, which is what it’s built and tested on (a Raspberry Pi 5). There is an x86_64 build too, but it has not been run on x86 hardware yet.',
			],
		},
		{
			q: 'Is it fast?',
			a: [
				'First results in single-digit milliseconds; results by meaning land as soon as you pause typing. Indexing runs at idle priority, then only re-\u2060reads changed files.',
			],
		},
		{
			q: 'Does it replace Omarchy’s launcher?',
			a: [
				'Setup asks whether Super+Space should open it. It finds apps too, and uninstalling gives your old binding back.',
			],
		},
		{
			q: 'Can my AI agents use it?',
			a: [
				'Yes: CLI, MCP server and agent skill, registered for the agents you have installed.',
			],
		},
		{
			q: 'How do I remove it?',
			a: [
				'Run ',
				{ code: uninstall[0] },
				', then ',
				{ code: uninstall[1] },
				': a plugin left in place sets itself up again when it next loads.',
			],
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
