/**
 * The demo home the launcher searches: the documents (documents.ts), the photos,
 * videos, voice memos and songs, and what Super Space reads besides files (apps,
 * Omarchy settings, emoji, clipboard and browser history, folders).
 *
 * Names, folders, times and texts come from omarchy-super-space's demo
 * (demo/make_docs.py, demo/make_media.py, demo/CREDITS.md). The pictures are
 * other people's photos (Wikimedia Commons), so here they are drawn scenes
 * (`scene`) described in words (`sense`), which is what matching by meaning
 * reads. The clipboard's sources and the browser history are made up for the
 * demo, in the shapes Super Space shows them. Like install-to-home.sh on a home
 * that demos these searches, it leaves out the walkthrough video and the run
 * sheet, which spell them out.
 */
import { documents } from './documents';
import type { IconName, Item, Part, Scene } from './types';

/** A file in the demo home, by its path under ~. */
function file(
	path: string,
	fields: Omit<Item, 'key' | 'title' | 'subtitle' | 'where' | 'names'> & {
		names?: string[];
		title?: string;
		subtitle?: string;
	},
): Item {
	const slash = path.lastIndexOf('/');
	const name = path.slice(slash + 1);
	return {
		key: `file:${path}`,
		title: name,
		subtitle: `~/${path.slice(0, slash)}`,
		where: `~/${path}`,
		...fields,
		names: [name, ...(fields.names ?? [])],
	};
}

/** The icon of the app that opens a file of this type on Omarchy. */
function docIcon(path: string): IconName {
	const ext = path.slice(path.lastIndexOf('.') + 1);
	if (ext === 'pdf') return 'pdf';
	if (ext === 'docx' || ext === 'odt') return 'writer';
	if (ext === 'xlsx' || ext === 'ods') return 'calc';
	if (ext === 'pptx' || ext === 'odp') return 'impress';
	if (ext === 'epub') return 'book';
	if (ext === 'html') return 'chromium';
	return 'text';
}

const docs: Item[] = documents.map((d) =>
	file(d.path, {
		kind: 'file',
		icon: docIcon(d.path),
		about: d.about,
		parts: d.parts,
	}),
);

/** Alice's Adventures in Wonderland (Project Gutenberg #11, public domain): a few of its chapters. */
const alice = file('Documents/Books/alice-in-wonderland.epub', {
	kind: 'file',
	icon: 'book',
	about:
		"Alice's Adventures in Wonderland by Lewis Carroll, ebook, a novel, a children's book",
	parts: [
		{
			loc: { page: 1 },
			text: 'Down the Rabbit-Hole\nAlice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do. Suddenly a White Rabbit with pink eyes ran close by her. Down, down, down. Would the fall never come to an end?',
		},
		{
			loc: { page: 6 },
			text: 'Pig and Pepper\nThe Cheshire Cat only grinned when it saw Alice. “All right,” said the Cat; and this time it vanished quite slowly, beginning with the end of the tail, and ending with the grin, which remained some time after the rest of it had gone.',
		},
		{
			loc: { page: 7 },
			text: 'A Mad Tea-Party\nThere was a table set out under a tree in front of the house, and the March Hare and the Hatter were having tea at it: a Dormouse was sitting between them, fast asleep.',
		},
	],
});

/** A photo: its own icon, found by what it shows. */
function photo(path: string, scene: Scene, sense: string, text = ''): Item {
	return file(path, {
		kind: 'image',
		icon: 'photo',
		scene,
		parts: [{ loc: {}, text, sense }],
	});
}

const photos: Item[] = [
	photo(
		'Pictures/Camera/IMG_2041.jpg',
		'retriever-market',
		'a golden retriever dog chewing on something at a farmers market',
	),
	photo(
		'Pictures/Camera/IMG_2047.jpg',
		'retriever-grass',
		'a golden retriever dog sitting on the grass, portrait',
	),
	photo(
		'Pictures/Camera/IMG_2052.jpg',
		'retriever-stick',
		'a golden retriever dog carrying a stick in its mouth',
	),
	photo(
		'Pictures/Camera/IMG_2063.jpg',
		'puppy',
		'a golden retriever puppy, a young dog',
	),
	photo(
		'Pictures/Camera/IMG_2078.jpg',
		'puppy-blanket',
		'a golden retriever puppy lying down, a young dog',
	),
	photo(
		'Pictures/Camera/IMG_2090.jpg',
		'retriever-field',
		'a golden retriever dog standing in a green field',
	),
	photo(
		'Pictures/Camera/IMG_2104.jpg',
		'beagle',
		'a beagle dog sleeping on the floor',
	),
	photo(
		'Pictures/Camera/IMG_2111.jpg',
		'collie',
		'the face of a tricolour border collie dog',
	),
	photo(
		'Pictures/Camera/IMG_2119.jpg',
		'dachshund-beach',
		'a dachshund dog running on the beach by the sea',
	),
	photo(
		'Pictures/Camera/IMG_2126.jpg',
		'terrier-beach',
		'a jack russell terrier dog running on the beach',
	),
	photo(
		'Pictures/Camera/IMG_2133.jpg',
		'cat-bench',
		'a cat sleeping on a stone bench',
	),
	photo(
		'Pictures/Camera/IMG_2140.jpg',
		'black-cat',
		'a black cat sleeping in the sun on a wall',
	),
	photo(
		'Pictures/Camera/IMG_2152.jpg',
		'cat-sleeping',
		'a cat curled up asleep',
	),
	photo(
		'Pictures/Camera/IMG_2158.jpg',
		'tabby',
		'a young tabby cat keeping watch',
	),
	photo(
		'Pictures/Camera/IMG_2167.jpg',
		'beach-winter',
		'an empty sandy beach and the sea on a grey day',
	),
	photo(
		'Pictures/Camera/IMG_2175.jpg',
		'pizza',
		'a margherita pizza on a plate',
	),
	photo(
		'Pictures/Camera/IMG_2181.jpg',
		'sushi',
		'a plate of sushi, salmon and tuna nigiri and rolls',
	),
	photo(
		'Pictures/Camera/IMG_2186.jpg',
		'nasi-goreng',
		'a plate of nasi goreng, Indonesian fried rice with a fried egg',
	),
	photo(
		'Pictures/Camera/IMG_2190.jpg',
		'flat-white',
		'a flat white coffee with latte art, a feather pattern in the milk',
	),
	photo(
		'Pictures/Camera/IMG_2194.jpg',
		'pavlova',
		'a pavlova dessert, meringue topped with cream and fruit',
	),
	photo(
		'Pictures/Camera/IMG_2199.jpg',
		'whiteboard',
		'a whiteboard covered in sticky notes after a retrospective meeting',
	),
	photo('Pictures/Camera/IMG_2203.jpg', 'receipt', 'a printed shop receipt'),
	photo(
		'Pictures/Holidays/Tasmania/IMG_3301.jpg',
		'wineglass-bay',
		'Wineglass Bay in Tasmania: a curved white sand beach and blue water below the mountains',
	),
	photo(
		'Pictures/Holidays/Tasmania/IMG_3315.jpg',
		'cradle-mountain',
		'a boat shed on Dove Lake in front of Cradle Mountain',
	),
	photo(
		'Pictures/Holidays/Bali/IMG_1188.jpg',
		'bali-sunset',
		'sunset over the sea at Kuta beach in Bali, people on the sand',
	),
	// read by OCR: the text in them is matched like a document's
	photo(
		'Downloads/scan0003.jpg',
		'scan',
		'a scanned coffee shop receipt',
		'BEAN THERE COFFEE CO\nSouth Bank - Little Stanley St\n03/10/2026 08:42 Table 7\n2 x Flat white (oat) $11.40\n1 x Banana bread $6.50\n1 x Long black $4.80\nTOTAL incl GST $22.70\nThank you! See you tomorrow',
	),
	photo(
		'Pictures/Screenshots/screenshot-2026-10-12_09-14-33.png',
		'terminal',
		'a screenshot of a terminal window with an error',
		'sam@pi5 ~ $ superspace serve\nerror: failed to bind 127.0.0.1:47801: Address already in use (os error 98)\nhint: another llama-server is already running on this port',
	),
];

/** Spoken or sung lines, from their start second; each ends when its words do. */
function spoken(lines: [number, string][], total: number, perWord = 0.36) {
	return lines.map(([t, text], i): Part => {
		const next = i + 1 < lines.length ? lines[i + 1][0] : total;
		const words = text.split(/\s+/).length;
		const tEnd = Math.min(next - 0.25, t + words * perWord);
		return { loc: { t, tEnd: Math.round(tEnd * 100) / 100 }, text };
	});
}

const videos: Item[] = [
	file('Videos/weekend-clips-oct-2026.mp4', {
		kind: 'video',
		icon: 'mpv',
		duration: 59,
		parts: [
			{
				loc: { t: 0, tEnd: 10 },
				text: 'beach and waves',
				sense: 'waves breaking on a beach, the sea',
				thumb: 'waves',
			},
			{
				loc: { t: 10, tEnd: 30 },
				text: 'dog swimming',
				sense: 'a golden retriever dog swimming',
				thumb: 'dog-swimming',
			},
			{
				loc: { t: 30, tEnd: 45 },
				text: 'traffic',
				sense: 'traffic on a city street, cars and buses on the road',
				thumb: 'traffic',
			},
			{
				// the closer shot: the best match, as on the real index
				loc: { t: 45, tEnd: 59 },
				text: 'dog swimming',
				sense: 'a golden retriever dog swimming close up',
				thumb: 'dog-swimming',
			},
		],
	}),
	file('Videos/home-video-sept-2026.mp4', {
		kind: 'video',
		icon: 'mpv',
		duration: 32.9,
		parts: [
			{
				loc: { t: 0, tEnd: 14 },
				text: 'cat playing',
				sense: 'a cat chasing a laser pointer',
				thumb: 'cat-laser',
			},
			{
				loc: { t: 14, tEnd: 24.9 },
				text: 'pot on a stove',
				sense: 'milk boiling over in a pot on the stove',
				thumb: 'milk-pot',
			},
			{
				loc: { t: 24.9, tEnd: 32.9 },
				text: 'cat playing',
				sense: 'a cat playing',
				thumb: 'cat-play',
			},
		],
	}),
];

/** A voice memo: its file name over "Recording · day · length". */
function memo(
	name: string,
	day: string,
	total: number,
	lines: [number, string][],
) {
	const length = `0:${String(total).padStart(2, '0')}`;
	return file(`Music/Voice Memos/${name}`, {
		kind: 'audio',
		icon: 'mpv',
		subtitle: `Recording · ${day} · ${length}`,
		duration: total,
		parts: spoken(lines, total),
	});
}

/** A song: its title over "Song · Kitchen Radio · length", its lyrics a part and each line a section. */
function song(title: string, step: number, lyrics: string[]): Item {
	const total = 2 + lyrics.length * step;
	return file(`Music/Kitchen Radio - ${title}.mp3`, {
		kind: 'audio',
		icon: 'mpv',
		title,
		subtitle: `Song · Kitchen Radio · 0:${String(total).padStart(2, '0')}`,
		duration: total,
		parts: [
			{ loc: {}, text: lyrics.join(' / '), whole: true },
			...spoken(
				lyrics.map((l, i): [number, string] => [2 + i * step, l]),
				total,
				0.43,
			),
		],
	});
}

const audio: Item[] = [
	memo('2026-10-05 meetup budget.m4a', '5 Oct', 43, [
		[0, 'Okay, quick voice memo about the meetup budget.'],
		[4, 'Sure. What have we got so far?'],
		[8, 'The sponsor is giving us six hundred dollars.'],
		[13, 'And the venue?'],
		[
			16,
			'The venue costs five hundred dollars, and that includes the projector.',
		],
		[22, 'Then the pizza is about two hundred and eighty.'],
		[
			27,
			"So we are over by two hundred and seventy five. Let's find another sponsor for the stickers.",
		],
		[35, 'I will email the library about a free room as a backup.'],
	]),
	memo('2026-10-08 groceries.m4a', '8 Oct', 19, [
		[0, 'Note to self for the shops after work.'],
		[4, 'Oat milk, sourdough bread, three avocados and a bag of coffee beans.'],
		[11, 'Also pick up the dry cleaning before six.'],
	]),
	memo('2026-10-11 app idea.m4a', '11 Oct', 25, [
		[0, 'App idea.'],
		[
			2.5,
			'A little sensor in each plant pot that sends a message when the soil is dry.',
		],
		[
			9,
			'It could learn how often each plant needs water, and remind me on my phone.',
		],
		[17, 'Call it Thirsty Fern.'],
	]),
	memo('2026-10-12 pengingat.m4a', '12 Oct', 19, [
		[0, 'Pengingat untuk hari Jumat.'],
		[4, 'Bayar sewa apartemen, enam ratus dua puluh dolar per minggu.'],
		[11, 'Dan telepon Nenek di Bali hari Minggu.'],
	]),
	song('Keys on the Counter', 8, [
		'You took the spare key and left the light on',
		'Your keys are on the counter by the door',
		'We broke up over dinner at the old cafe',
		'I kept your jumper but I gave back the ring',
		'Our song comes on the radio and I turn it off',
		'Goodbye to the summer we spent together',
	]),
	song('Empty Side of the Bed', 9, [
		'You packed your boxes on a Sunday afternoon',
		'Now the empty side of the bed is cold',
		'I still make two cups of coffee every morning',
		'We said goodbye at the station in the rain',
		'I deleted all your photos then I found them again',
		'Maybe one day I will stop missing you',
	]),
	song('Saturday Market Morning', 11, [
		'Saturday morning at the farmers market',
		'Fresh bread and mangoes and a coffee in my hand',
		'The kids are dancing and the band is playing',
		'Sunshine on the river, what a lovely day',
	]),
	song('Ferry to the City', 8, [
		'Riding the ferry to the city every morning',
		'Pelicans are floating by the bridge',
		'The river is shining and the boats are going',
		'Home again by six for dinner with my friends',
	]),
	// public-domain recordings with no lyrics: their tags are all there is
	file("Music/Marion Harris - After You've Gone (1918).mp3", {
		kind: 'audio',
		icon: 'mpv',
		title: "After You've Gone",
		subtitle: 'Song · Marion Harris',
		about: "After You've Gone, Marion Harris, 1918",
		parts: [],
	}),
	file('Music/Edward Meeker - Take Me Out to the Ball Game (1908).mp3', {
		kind: 'audio',
		icon: 'mpv',
		title: 'Take Me Out to the Ball Game',
		subtitle: 'Song · Edward Meeker',
		about: 'Take Me Out to the Ball Game, Edward Meeker, 1908, baseball',
		parts: [],
	}),
];

/** A folder: found by its name only. Enter opens it. */
function folder(path: string): Item {
	const slash = path.lastIndexOf('/');
	return {
		key: `file:${path}`,
		kind: 'folder',
		title: path.slice(slash + 1),
		subtitle: slash < 0 ? '~' : `~/${path.slice(0, slash)}`,
		icon: 'folder',
		names: [],
		parts: [],
		where: `~/${path}`,
	};
}

const folders: Item[] = [
	'Documents',
	'Documents/Books',
	'Documents/Career',
	'Documents/Finance',
	'Documents/Finance/Invoices',
	'Documents/Health',
	'Documents/Home',
	'Documents/Meetup',
	'Documents/Notes',
	'Documents/Personal',
	'Documents/Recipes',
	'Documents/Study',
	'Documents/Travel',
	'Documents/Work',
	'Downloads',
	'Music',
	'Music/Voice Memos',
	'Pictures',
	'Pictures/Camera',
	'Pictures/Holidays',
	'Pictures/Holidays/Bali',
	'Pictures/Holidays/Tasmania',
	'Pictures/Screenshots',
	'Videos',
].map(folder);

/** An app: its name over its comment (or generic name), found by both and its keywords. */
function app(
	id: string,
	title: string,
	subtitle: string,
	icon: IconName,
	names: string[],
): Item {
	return {
		key: `app:${id}`,
		kind: 'app',
		title,
		subtitle,
		icon,
		names,
		about: `${title}. ${subtitle}. ${names.join(', ')}`,
		parts: [],
		where: title,
	};
}

const apps: Item[] = [
	app('chromium', 'Chromium', 'Access the Internet', 'chromium', [
		'Web Browser',
		'browser',
		'internet',
	]),
	app('firefox', 'Firefox', 'Browse the World Wide Web', 'firefox', [
		'Web Browser',
		'browser',
		'internet',
	]),
	app(
		'zen',
		'Zen Browser',
		'Experience tranquillity while browsing the web',
		'zen',
		['Web Browser', 'browser'],
	),
	app(
		'Alacritty',
		'Alacritty',
		'A fast, cross-platform, OpenGL terminal emulator',
		'terminal',
		['Terminal', 'console', 'shell'],
	),
	app('org.gnome.Nautilus', 'Files', 'Access and organize files', 'files', [
		'File Manager',
		'folders',
		'nautilus',
	]),
	app(
		'org.gnome.Evince',
		'Document Viewer',
		'View multi-page documents',
		'pdf',
		['PDF viewer', 'evince'],
	),
	app('imv', 'imv', 'Image viewer', 'imv', [
		'photo viewer',
		'image viewer',
		'pictures',
	]),
	app('mpv', 'mpv Media Player', 'Play movies and songs', 'mpv', [
		'Multimedia player',
		'video player',
	]),
	app('cliamp', 'cliamp', 'Music player', 'music', [
		'music',
		'music player',
		'songs',
	]),
	app('nvim', 'Neovim', 'Edit text files', 'nvim', [
		'Text Editor',
		'vim',
		'editor',
	]),
	app(
		'libreoffice-writer',
		'LibreOffice Writer',
		'Create and edit text and graphics in letters, reports, documents and Web pages',
		'writer',
		['Word Processor', 'word', 'docx'],
	),
	app(
		'libreoffice-calc',
		'LibreOffice Calc',
		'Perform calculations, analyze information and manage lists in spreadsheets',
		'calc',
		['Spreadsheet', 'excel', 'xlsx'],
	),
	app(
		'libreoffice-impress',
		'LibreOffice Impress',
		'Create and edit presentations for slideshows, meetings and Web pages',
		'impress',
		['Presentation', 'slides', 'powerpoint'],
	),
	app('obsidian', 'Obsidian', 'Obsidian', 'obsidian', [
		'notes',
		'knowledge base',
		'markdown',
	]),
	app(
		'typora',
		'Typora',
		'A minimal Markdown reading & writing app',
		'typora',
		['markdown editor'],
	),
	app('signal', 'Signal', 'Private messenger', 'signal', [
		'chat',
		'messages',
		'messenger',
	]),
	app('WhatsApp', 'WhatsApp', 'web.whatsapp.com', 'whatsapp', [
		'chat',
		'messages',
		'web app',
	]),
	app('spotify', 'Spotify', 'Music for everyone', 'spotify', [
		'music',
		'songs',
		'podcasts',
	]),
	app('localsend', 'LocalSend', 'Share files to nearby devices', 'localsend', [
		'share',
		'send files',
		'airdrop',
	]),
	app(
		'com.obsproject.Studio',
		'OBS Studio',
		'Free and Open Source Streaming/Recording Software',
		'obs',
		['screen recorder', 'streaming', 'record'],
	),
	app('org.kde.kdenlive', 'Kdenlive', 'Video editor', 'kdenlive', [
		'video editor',
		'edit videos',
	]),
	app('pinta', 'Pinta', 'Easily create and edit images', 'pinta', [
		'image editor',
		'paint',
		'drawing',
	]),
	app('1password', '1Password', 'Password manager', 'password', [
		'passwords',
		'vault',
	]),
	app('lazydocker', 'Docker', 'Terminal app', 'docker', [
		'containers',
		'lazydocker',
	]),
	app('btop', 'btop++', 'Resource monitor', 'btop', [
		'System Monitor',
		'task manager',
		'processes',
	]),
];

/**
 * An Omarchy setting, as Super Space reads Omarchy's menu and bar panels: its
 * label over where it sits in the menu (or the panel's description), and the
 * everyday words it is looked for by (crates/sources/src/settings.rs).
 */
function setting(
	id: string,
	title: string,
	subtitle: string,
	phrases: string[] = [],
): Item {
	return {
		key: `setting:${id}`,
		kind: 'setting',
		title,
		subtitle,
		icon: 'gear',
		names: phrases,
		about: [title, subtitle, ...phrases].join('. '),
		parts: [],
		where: title,
	};
}

const settings: Item[] = [
	setting('omarchy.network', 'Network', 'Wi-Fi list and connection state', [
		'wifi',
		'wi-fi',
		'wireless network',
		'connect to wifi',
		'internet connection',
	]),
	setting('update.hardware.wifi', 'Wi-Fi', 'Update › Hardware', [
		'restart wifi',
		'wifi not working',
	]),
	setting('omarchy.bluetooth', 'Bluetooth', 'Bluetooth devices', [
		'pair bluetooth device',
		'connect bluetooth headphones',
	]),
	setting('update.hardware.bluetooth', 'Bluetooth', 'Update › Hardware', [
		'restart bluetooth',
		'bluetooth not working',
	]),
	setting('omarchy.audio', 'Audio', 'Volume and sound output', [
		'volume',
		'turn the volume up or down',
		'sound',
		'speakers',
		'mute the sound',
		'sound output',
	]),
	setting('omarchy.monitor', 'Monitor', 'Displays and brightness', [
		'brightness',
		'screen brightness',
		'dim the screen',
	]),
	setting('style.theme', 'Theme', 'Style', [
		'change the theme',
		'colour scheme',
		'color scheme',
		'dark mode',
		'light mode',
	]),
	setting('style.background', 'Background', 'Style', [
		'background',
		'wallpaper',
		'change the wallpaper',
		'desktop background',
		'desktop picture',
	]),
	setting('style.font', 'Font', 'Style', ['change the font', 'typeface']),
	setting('trigger.toggle.nightlight', 'Nightlight', 'Trigger › Toggle', [
		'night light',
		'blue light filter',
		'night mode',
		'night shift',
		'make the screen warmer',
	]),
	setting('trigger.capture.screenshot', 'Screenshot', 'Trigger › Capture', [
		'take a screenshot',
		'screen capture',
		'screen grab',
		'print screen',
	]),
	setting('trigger.capture.screenrecord', 'Screenrecord', 'Trigger › Capture', [
		'record the screen',
		'screen recording',
		'screencast',
	]),
	setting('trigger.emoji', 'Emoji', 'Trigger', [
		'emoji picker',
		'insert an emoji',
	]),
	setting('omarchy-menu-clipboard', 'Clipboard', 'Trigger', [
		'clipboard history',
		'paste history',
	]),
	setting('setup.input', 'Input', 'Setup', [
		'keyboard layout',
		'keyboard language',
		'key repeat',
		'mouse sensitivity',
		'natural scrolling',
		'touchpad',
	]),
	setting('setup.power', 'Power Profile', 'Setup', [
		'battery',
		'performance mode',
	]),
	setting('setup.network.dns', 'DNS', 'Setup › Network', ['dns server']),
	setting('system.lock', 'Lock', 'System', [
		'lock the screen',
		'lock screen',
		'lock the computer',
	]),
	setting('system.suspend', 'Suspend', 'System', ['sleep']),
	setting('system.logout', 'Logout', 'System', ['log out', 'sign out']),
	setting('system.reboot', 'Restart', 'System', [
		'restart the computer',
		'reboot',
	]),
	setting('system.shutdown', 'Shutdown', 'System', [
		'shut down',
		'power off',
		'turn off the computer',
	]),
	setting('update.omarchy', 'Omarchy', 'Update', ['update omarchy', 'upgrade']),
];

/**
 * Emoji with their names in English and Indonesian (CLDR annotations, as
 * Super Space embeds them): the name, then the words it is found by.
 */
const EMOJI: [string, string, string][] = [
	[
		'🐶',
		'Dog face',
		'dog, face, pet, puppy, anjing, wajah anjing, hewan peliharaan',
	],
	['🐕', 'Dog', 'dog, pet, anjing, hewan'],
	['🦮', 'Guide dog', 'guide dog, dog, blind, anjing pemandu, anjing'],
	['🐩', 'Poodle', 'poodle, dog, pudel, anjing'],
	['🐱', 'Cat face', 'cat, face, pet, kitten, kucing, wajah kucing'],
	['🐈', 'Cat', 'cat, pet, kucing'],
	[
		'😬',
		'Grimacing face',
		'awkward, grimace, nervous, eek, meringis, canggung',
	],
	[
		'😅',
		'Grinning face with sweat',
		'phew, relief, nervous laugh, lega, keringat',
	],
	['😳', 'Flushed face', 'awkward, embarrassed, blush, malu, tersipu'],
	['🫠', 'Melting face', 'embarrassed, melt, awkward, meleleh, malu'],
	['😀', 'Grinning face', 'grin, smile, happy, senyum, gembira'],
	[
		'😄',
		'Grinning face with smiling eyes',
		'smile, happy, laugh, senyum, bahagia',
	],
	[
		'😊',
		'Smiling face with smiling eyes',
		'smile, blush, happy, senyum, tersenyum',
	],
	['🙂', 'Slightly smiling face', 'smile, senyum, senyum tipis'],
	[
		'😂',
		'Face with tears of joy',
		'crying laughing, laugh, lol, tertawa, menangis bahagia',
	],
	['🤣', 'Rolling on the floor laughing', 'rofl, laugh, lol, tertawa terbahak'],
	['😢', 'Crying face', 'sad, cry, tear, sedih, menangis'],
	['😭', 'Loudly crying face', 'sob, sad, cry, menangis, sedih'],
	['😡', 'Enraged face', 'angry, mad, rage, marah'],
	['😴', 'Sleeping face', 'sleep, tired, zzz, tidur, mengantuk'],
	['🤔', 'Thinking face', 'thinking, hmm, wonder, berpikir'],
	['🙃', 'Upside-down face', 'silly, sarcasm, terbalik'],
	['😎', 'Smiling face with sunglasses', 'cool, sunglasses, keren'],
	['🥳', 'Partying face', 'party, celebration, birthday, pesta, perayaan'],
	['🤷', 'Person shrugging', 'shrug, dunno, idk, tidak tahu, mengangkat bahu'],
	['🙈', 'See-no-evil monkey', 'oops, embarrassed, monkey, monyet, malu'],
	['❤️', 'Red heart', 'heart, love, red heart, cinta, hati'],
	[
		'💔',
		'Broken heart',
		'breakup, heartbreak, broken heart, patah hati, putus',
	],
	['👍', 'Thumbs up', 'thumbs up, like, yes, ok, jempol, setuju, bagus'],
	['👎', 'Thumbs down', 'thumbs down, dislike, no, jempol ke bawah'],
	['👋', 'Waving hand', 'wave, hello, bye, halo, dadah'],
	['🙏', 'Folded hands', 'please, thank you, pray, terima kasih, mohon'],
	['👏', 'Clapping hands', 'clap, applause, tepuk tangan'],
	['💪', 'Flexed biceps', 'strong, muscle, kuat, otot'],
	[
		'🎉',
		'Party popper',
		'party, celebration, tada, congratulations, pesta, selamat',
	],
	['🎂', 'Birthday cake', 'birthday, cake, ulang tahun, kue'],
	['🎁', 'Wrapped gift', 'gift, present, hadiah, kado'],
	['💰', 'Money bag', 'money, bag, cash, uang, kantong uang'],
	['💵', 'Dollar banknote', 'money, dollar, banknote, cash, uang, dolar'],
	['💸', 'Money with wings', 'money, spend, bills, uang, terbang'],
	['🤑', 'Money-mouth face', 'money, rich, uang, kaya'],
	['🪙', 'Coin', 'coin, money, gold, koin, uang'],
	['💳', 'Credit card', 'credit card, money, card, pay, kartu kredit, uang'],
	['💴', 'Yen banknote', 'money, yen, banknote, uang, yen'],
	['💶', 'Euro banknote', 'money, euro, banknote, uang, euro'],
	['💷', 'Pound banknote', 'money, pound, banknote, uang, pound'],
	['🏦', 'Bank', 'bank, money, building'],
	['☕', 'Hot beverage', 'coffee, tea, hot drink, kopi, teh'],
	['🍕', 'Pizza', 'pizza, slice, cheese'],
	['🍣', 'Sushi', 'sushi, japanese food'],
	['🍚', 'Cooked rice', 'rice, nasi'],
	['🍛', 'Curry rice', 'curry, rice, kari, nasi kari, rendang'],
	['🍜', 'Steaming bowl', 'noodles, ramen, mi, bakmi'],
	['🍞', 'Bread', 'bread, loaf, roti'],
	['🍌', 'Banana', 'banana, fruit, pisang'],
	['🥑', 'Avocado', 'avocado, fruit, alpukat'],
	['🥛', 'Glass of milk', 'milk, drink, susu'],
	['🥭', 'Mango', 'mango, fruit, mangga'],
	['🏖️', 'Beach with umbrella', 'beach, umbrella, holiday, pantai, liburan'],
	['🌊', 'Water wave', 'wave, ocean, sea, surf, ombak, laut'],
	['🌅', 'Sunrise', 'sunrise, morning, matahari terbit'],
	['🌇', 'Sunset', 'sunset, evening, matahari terbenam, senja'],
	['⛺', 'Tent', 'tent, camping, tenda, berkemah'],
	['⛰️', 'Mountain', 'mountain, gunung'],
	['🏝️', 'Desert island', 'island, beach, pulau'],
	['🚗', 'Automobile', 'car, automobile, mobil'],
	['🚌', 'Bus', 'bus, vehicle, bis'],
	['⛴️', 'Ferry', 'ferry, boat, kapal feri'],
	['✈️', 'Airplane', 'airplane, flight, plane, pesawat'],
	['🏠', 'House', 'house, home, rumah'],
	['🔑', 'Key', 'key, lock, password, kunci'],
	['🎵', 'Musical note', 'music, note, song, musik, lagu'],
	['🎶', 'Musical notes', 'music, notes, song, musik, lagu'],
	['🎸', 'Guitar', 'guitar, music, gitar'],
	['🔥', 'Fire', 'fire, hot, lit, api'],
	['✨', 'Sparkles', 'sparkles, magic, new, berkilau'],
	['💡', 'Light bulb', 'idea, light bulb, ide, lampu'],
	['🚀', 'Rocket', 'rocket, launch, ship it, roket'],
	['🤖', 'Robot', 'robot, ai, bot'],
	['💻', 'Laptop', 'laptop, computer, komputer'],
	['📱', 'Mobile phone', 'phone, mobile, ponsel, telepon'],
	['📷', 'Camera', 'camera, photo, kamera, foto'],
	['📅', 'Calendar', 'calendar, date, kalender, tanggal'],
	['⏰', 'Alarm clock', 'alarm, clock, wake up, jam weker'],
	['✅', 'Check mark button', 'done, check, yes, selesai, centang'],
	['❌', 'Cross mark', 'no, cross, wrong, salah'],
	['⚠️', 'Warning', 'warning, caution, peringatan'],
	['🌧️', 'Cloud with rain', 'rain, weather, hujan'],
	['☀️', 'Sun', 'sun, sunny, weather, matahari, cerah'],
	['🌙', 'Crescent moon', 'moon, night, bulan, malam'],
	['⭐', 'Star', 'star, favourite, bintang'],
	['🦘', 'Kangaroo', 'kangaroo, australia, kanguru'],
	['🐨', 'Koala', 'koala, australia'],
	['🐢', 'Turtle', 'turtle, slow, penyu, kura-kura'],
	['🐳', 'Spouting whale', 'whale, ocean, paus'],
	['🏃', 'Person running', 'running, run, marathon, lari, berlari'],
	['🏄', 'Person surfing', 'surfing, surf, berselancar'],
	['🍻', 'Clinking beer mugs', 'cheers, beer, drinks, bersulang'],
	['💍', 'Ring', 'ring, wedding, engagement, cincin'],
	['💒', 'Wedding', 'wedding, chapel, pernikahan'],
	['🏆', 'Trophy', 'trophy, winner, piala, juara'],
	['📈', 'Chart increasing', 'growth, chart, up, grafik naik'],
	['🧾', 'Receipt', 'receipt, bill, struk, kuitansi'],
	['🛜', 'Wireless', 'wifi, wireless, nirkabel'],
	['🔋', 'Battery', 'battery, power, baterai'],
];

const emoji: Item[] = EMOJI.map(([e, title, words]) => {
	const names = words.split(', ');
	return {
		key: `emoji:${e}`,
		kind: 'emoji',
		title,
		subtitle: names.slice(0, 5).join(' · '),
		icon: 'emoji',
		emoji: e,
		names: [title, ...names],
		parts: [],
		where: e,
	};
});

/** Clipboard history, newest first, with where each copy came from. */
function clip(text: string, from: string, icon: IconName, sense: string): Item {
	return {
		key: `clip:${text}`,
		kind: 'clip',
		title: text,
		subtitle: from,
		icon,
		names: [],
		parts: [{ loc: {}, text, sense: `${text}. ${sense}` }],
		where: text,
	};
}

const clips: Item[] = [
	clip(
		'Tracking number: TT4829103477AU (Australia Post, parcel from Kopi Club)',
		'from Chromium · Track your item · 2 h ago',
		'chromium',
		'parcel tracking number, delivery',
	),
	clip(
		'ssh pi@10.0.0.42 -p 2222',
		'from Alacritty · yesterday',
		'terminal',
		'ssh command to log in to the Raspberry Pi',
	),
	clip(
		'The Precinct, Level 2, 315 Brunswick Street, Fortitude Valley QLD 4006',
		'from Chromium · Meetup notes · yesterday',
		'chromium',
		'the address of the meetup venue',
	),
	clip(
		'Flat white with oat milk, extra hot, for Priya',
		'from Signal · Priya · 3 days ago',
		'signal',
		'a coffee order',
	),
	clip(
		'https://github.com/vincenth19/omarchy-super-space',
		'from Chromium · GitHub · 4 days ago',
		'chromium',
		'link to the Super Space repository on GitHub',
	),
];

/** Browser history: the page's title over "Browser · page · when". */
function visit(
	title: string,
	page: string,
	browser: 'Chromium' | 'Firefox' | 'Zen',
	when: string,
): Item {
	return {
		key: `history:https://${page}`,
		kind: 'history',
		title,
		subtitle: `${browser} · ${page} · ${when}`,
		icon:
			browser === 'Chromium'
				? 'chromium'
				: browser === 'Firefox'
					? 'firefox'
					: 'zen',
		names: [],
		parts: [{ loc: {}, text: `${title} ${page}` }],
		where: `https://${page}`,
	};
}

const history: Item[] = [
	visit(
		'vincenth19/omarchy-super-space: Search what you mean',
		'github.com/vincenth19/omarchy-super-space',
		'Chromium',
		'4 days ago',
	),
	visit(
		'The Omarchy Manual',
		'learn.omacom.io/2/the-omarchy-manual',
		'Chromium',
		'yesterday',
	),
	visit(
		'Golden Retriever - Wikipedia',
		'en.wikipedia.org/wiki/Golden_Retriever',
		'Firefox',
		'3 days ago',
	),
	visit(
		'Freycinet National Park',
		'parks.tas.gov.au/explore-our-parks/freycinet-national-park',
		'Firefox',
		'last week',
	),
	visit(
		'Cradle Mountain - Dove Lake Circuit',
		'parks.tas.gov.au/explore-our-parks/cradle-mountain/dove-lake-circuit',
		'Zen',
		'last week',
	),
	visit(
		'Rendang - Wikipedia',
		'en.wikipedia.org/wiki/Rendang',
		'Zen',
		'5 days ago',
	),
	visit(
		'WireGuard: Quick Start',
		'www.wireguard.com/quickstart',
		'Chromium',
		'2 weeks ago',
	),
];

export const items: Item[] = [
	...docs,
	alice,
	...photos,
	...videos,
	...audio,
	...folders,
	...apps,
	...settings,
	...emoji,
	...clips,
	...history,
];
