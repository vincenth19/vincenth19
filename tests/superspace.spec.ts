import { expect, type Locator, type Page, test } from '@playwright/test';
import { overflowing } from './overflow';

const path = '/projects/super-space';
const repo = 'https://github.com/vincenth19/omarchy-super-space';
const install = `omarchy plugin add ${repo} --enable`;
const subhead =
	'Super Space is a Super+Space launcher for Omarchy. It finds apps, files, photos, moments in videos, spoken words and songs by what is in them, entirely on your computer.';

/** The launcher, once it has loaded (it loads as it nears the screen). */
async function openLauncher(page: Page): Promise<Locator> {
	const launcher = page.locator('.ssl');
	await launcher.scrollIntoViewIfNeeded();
	await expect(launcher).toHaveAttribute('data-ready', '');
	return launcher;
}

/** Types a search as a person would, then waits for typing to have paused. */
async function search(field: Locator, q: string) {
	await field.click();
	await field.press('ControlOrMeta+a');
	await field.press('Backspace');
	await field.pressSequentially(q, { delay: 20 });
	await expect(field).toHaveValue(q);
	// the final phase lands 150 ms after the last key; the calm ends at 400 ms
	await field.page().waitForTimeout(500);
}

/** All the text on the page, rendered or not (closed FAQ answers included), without scripts. */
function pageText(page: Page) {
	return page.evaluate(() => {
		const copy = document.body.cloneNode(true) as HTMLElement;
		for (const el of copy.querySelectorAll('script, style, template')) {
			el.remove();
		}
		return `${document.title} ${copy.textContent ?? ''}`;
	});
}

test.describe('Super Space product page', () => {
	test('has its own title, description and Open Graph tags', async ({
		page,
	}) => {
		await page.goto(path);
		await expect(page).toHaveTitle('Super Space · Vincent Haryadi');
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			subhead,
		);
		const og = (property: string) =>
			page.locator(`meta[property="og:${property}"]`);
		await expect(og('title')).toHaveAttribute(
			'content',
			'Super Space · Vincent Haryadi',
		);
		await expect(og('description')).toHaveAttribute('content', subhead);
		await expect(og('url')).toHaveAttribute(
			'content',
			`https://vincenth19.com${path}`,
		);
		await expect(og('site_name')).toHaveAttribute('content', 'Vincent Haryadi');
		await expect(og('type')).toHaveAttribute('content', 'website');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://vincenth19.com${path}`,
		);
	});

	test('keeps the masthead with its sticker, Back and socials, in place of the book', async ({
		page,
	}) => {
		await page.goto(path);
		const mast = page.locator('header.mast');
		await expect(mast).toHaveAttribute('data-open', 'superspace');
		await expect(
			mast.getByRole('img', { name: 'Super Space sticker' }),
		).toBeVisible();
		await expect(mast.getByRole('link', { name: 'Back' })).toHaveAttribute(
			'href',
			'/',
		);
		await expect(page.locator('.socials a')).toHaveCount(7);
		await expect(
			page.getByRole('navigation', { name: 'Book sections' }),
		).toHaveCount(0);
		await expect(page.getByRole('main')).toHaveAttribute('id', 'content');
	});

	test('shows the headline and the install command, and Copy copies it', async ({
		page,
		context,
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto(path);
		await expect(
			page.getByRole('heading', { level: 2, name: 'Super Space' }),
		).toBeVisible();
		await expect(
			page.getByText('Search what you mean.', { exact: true }),
		).toBeVisible();
		await expect(page.getByText(subhead, { exact: true })).toBeVisible();

		const hero = page.locator('.ss-hero');
		await expect(hero.locator('code')).toHaveText(install);
		await expect(
			hero.getByRole('link', { name: 'View on GitHub' }),
		).toHaveAttribute('href', repo);
		await expect(hero.getByText('v0.1.4 · MIT · Omarchy 4')).toBeVisible();
		// the dots are hidden from screen readers, the spaces around them are not
		await expect(hero.locator('.ss-version')).toMatchAriaSnapshot(
			'- paragraph: v0.1.4 MIT Omarchy 4',
		);

		const copy = hero.getByRole('button', { name: 'Copy install command' });
		await expect(copy).toBeVisible();
		// the button works once the page has hydrated, so keep clicking until it does
		await expect(async () => {
			await copy.click();
			await expect(hero.getByRole('status')).toHaveText('Copied', {
				timeout: 1000,
			});
		}).toPass();
		await expect(hero.locator('.ss-copy')).toContainText('Copied');
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			install,
		);
	});

	test('install section has the requirements, sizes, uninstall and licence', async ({
		page,
	}) => {
		await page.goto(path);
		const section = page.locator('#install');
		await expect(section.locator('#ss-cmd-install')).toHaveText(install);
		await expect(section.locator('#ss-cmd-uninstall')).toHaveText(
			'superspace-setup uninstall',
		);
		await expect(
			section.getByRole('button', { name: 'Copy uninstall command' }),
		).toBeVisible();
		for (const text of [
			'Omarchy 4 (Hyprland and its Quickshell shell)',
			'8.5 MB',
			'9.0 MB',
			'310 MB',
			'555 MB',
			'82 MB',
			'not been run on x86 hardware',
			'under Google’s Gemma terms',
		]) {
			await expect(section).toContainText(text);
		}
		// one size per line, and a comma between them for screen readers (the
		// snapshot puts a space before it: the comma is out of the text flow)
		await expect(section.locator('.ss-size-app dd')).toMatchAriaSnapshot(
			'- definition: /8\\.5 MB arm64 ?, 9\\.0 MB x64/',
		);
		// the licence is as plain to see as the rest of the specs
		const licence = section.locator('.ss-licence dd');
		await expect(licence).toBeVisible();
		expect(await licence.evaluate((el) => getComputedStyle(el).color)).toBe(
			'rgb(236, 232, 225)',
		);
	});

	test('FAQ answers open and close', async ({ page }) => {
		await page.goto(path);
		const items = page.locator('.ss-faq details');
		await expect(items).toHaveCount(6);
		const item = items.filter({ hasText: 'Does it send my files anywhere?' });
		const answer = item.getByText(/read and indexed on your machine/);
		await expect(answer).toBeHidden();
		await item.getByText('Does it send my files anywhere?').click();
		await expect(item).toHaveAttribute('open', '');
		await expect(answer).toBeVisible();
		await item.getByText('Does it send my files anywhere?').click();
		await expect(item).not.toHaveAttribute('open');
		await expect(answer).toBeHidden();
	});

	test('never mentions what is not released yet', async ({ page }) => {
		await page.goto(path);
		const text = await pageText(page);
		expect(text).toContain('Search what you mean.');
		for (const word of [
			/preview/i,
			/translat/i,
			/your place/i,
			/\bEsc\b/,
			/escape key/i,
		]) {
			expect(text).not.toMatch(word);
		}
	});

	test('the launcher is a search field over a list of results, as screen readers need', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox', {
			name: 'Search the demo files',
		});
		await expect(field).toHaveValue('golden retriever video');
		// it does not take the focus on its own
		await expect(field).not.toBeFocused();
		const list = launcher.getByRole('listbox', { name: 'Results' });
		await expect(field).toHaveAttribute(
			'aria-controls',
			(await list.getAttribute('id')) ?? '',
		);
		await expect(list.getByRole('option')).toHaveCount(2);
		// ↓ chooses a row: the field points at it
		await field.focus();
		await field.press('ArrowDown');
		const first = list.getByRole('option').first();
		await expect(field).toHaveAttribute(
			'aria-activedescendant',
			(await first.getAttribute('id')) ?? '',
		);
		await expect(first).toHaveAttribute('aria-selected', 'true');
		// what Enter would do is said politely
		await field.press('Enter');
		await expect(launcher.locator('.ssl-toast')).toHaveAttribute(
			'aria-live',
			'polite',
		);
		await expect(launcher.locator('.ssl-toast')).toHaveText(
			'Would play weekend-clips-oct-2026.mp4 from 0:45 in mpv',
		);
	});

	test('typing searches the demo files, as the real launcher finds them', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		const rows = launcher.getByRole('option');

		// inside your files: the lease, at page 3, its bond in bold
		await search(field, 'apartment lease bond document');
		await expect(launcher.locator('.ssl-pill')).toHaveText('Text');
		await expect(rows).toHaveCount(2);
		await expect(rows.first()).toContainText(
			'Rental bond The tenant must pay a rental bond of $2,400',
		);
		await expect(rows.first().locator('b').first()).toHaveText('bond');
		await expect(rows.first()).toContainText(
			'apartment-lease-new-farm-2026.pdf  ·  ~/Documents/Home',
		);
		await expect(rows.first().locator('.ssl-place')).toHaveText('p. 3');
		await expect(rows.first().locator('.ssl-chip')).toHaveText([
			'1',
			'2',
			'3',
			'4',
			'5',
		]);
		// the web row is always last
		await expect(rows.last()).toContainText(
			'Search the web for “apartment lease bond document”',
		);
		await expect(rows.last()).toContainText('DuckDuckGo');
		await expect(launcher.locator('.ssl-hints')).toContainText(
			'↵ open→ pages↓ ↑ rowstab list themctrl ↵ revealesc close',
		);
		// → at the end of the text steps the pages; Enter opens there
		await field.press('ArrowRight');
		await expect(rows.first().locator('.ssl-place')).toHaveText('p. 4');
		await field.press('Enter');
		await expect(launcher.locator('.ssl-toast')).toHaveText(
			'Would open apartment-lease-new-farm-2026.pdf at page 4',
		);

		// video moments, on the video's timeline
		await search(field, 'golden retriever video');
		await expect(launcher.locator('.ssl-pill')).toHaveText('Videos');
		await expect(rows.first()).toContainText('dog swimming');
		await expect(rows.first().locator('.ssl-place')).toHaveText('0:45–0:59');
		await expect(rows.first().locator('.ssl-times')).toContainText('0:10–0:30');
		// Tab lists the top row's sections, as the real one does; Shift+Tab puts them away
		await field.press('Tab');
		await expect(rows.first().locator('.ssl-part')).toHaveCount(2);
		await expect(field).toBeFocused();
		await field.press('Shift+Tab');
		await expect(rows.first().locator('.ssl-part')).toHaveCount(0);
		await expect(field).toBeFocused();
		// and from a row chosen with ↓; Tab again moves on through the page
		await field.press('ArrowDown');
		await field.press('Tab');
		await expect(rows.first().locator('.ssl-part')).toHaveCount(2);
		await field.press('Tab');
		await expect(field).not.toBeFocused();
		await expect(rows.first().locator('.ssl-part')).toHaveCount(0);
		await field.focus();

		// songs by their lyrics
		await search(field, 'songs about a breakup');
		await expect(launcher.locator('.ssl-pill')).toHaveText('Audio');
		await expect(rows).toHaveCount(3);
		await expect(rows.nth(0)).toContainText('Keys on the Counter');
		await expect(rows.nth(0)).toContainText('Song · Kitchen Radio · 0:50');
		await expect(rows.nth(1)).toContainText('Empty Side of the Bed');

		// settings by meaning, emoji in Indonesian, scope words
		await search(field, 'wifi connect');
		await expect(rows.first()).toContainText(
			'Network' + 'Wi-Fi list and connection state',
		);
		await search(field, 'anjing');
		await expect(rows.first().locator('.ssl-emoji').first()).toHaveText('🐶');
		await expect(launcher.locator('.ssl-list')).toContainText('IMG_2041.jpg');
		await search(field, 'apps firefox');
		await expect(launcher.locator('.ssl-pill')).toHaveText('Apps');
		await expect(rows.first()).toContainText('Firefox');
		await search(field, 'camera folder');
		await expect(launcher.locator('.ssl-pill')).toHaveText('Folders');
		await expect(rows.first()).toContainText('Camera~/Pictures');
	});

	test('quick answers are worked out in the page, currency at the ECB’s rates of the day it was built', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		const card = launcher.locator('.ssl-answer');
		const local = launcher.getByRole('option').filter({
			hasNotText: 'Search the web',
		});
		await search(field, '2+2*3');
		await expect(card).toContainText('2+2*3→8');
		await search(field, '5\'11" in cm');
		await expect(card).toContainText('180.34 cm');
		await search(field, '3pm sydney in jakarta');
		await expect(card).toContainText('3:00 PM');
		await expect(card).toContainText('11:00 AM');
		await expect(card).toContainText('Jakarta is 4 h behind Sydney');
		// a 24-hour time and a place
		await search(field, '17:30 berlin');
		await expect(card).toContainText('17:30');
		await expect(card).toContainText('Berlin');
		// under a sum, nothing found by its operator words ("times" is not "time")
		await search(field, 'what is 12 times 12');
		await expect(card).toContainText('144');
		await expect(local).toHaveCount(1);
		await search(field, '100k idr in usd');
		const text = (await card.textContent()) ?? '';
		if (text.includes('ECB rate of')) {
			// built with the ECB's rates: a number, and whose rates of which day
			expect(text).toMatch(/\d[\d,]*\.\d\d USD/);
			expect(text).toMatch(/ECB rate of \d{1,2} \w{3} \d{4}/);
			await expect(launcher.locator('.ssl-hints')).toContainText('↵ copy');
		} else {
			// built without them (offline): it says so in words, and offers nothing to copy
			expect(text).toContain('100,000 IDR');
			expect(text).toContain('no exchange rates');
			expect(text).not.toContain('–');
			await expect(launcher.locator('.ssl-hints')).not.toContainText('copy');
		}
	});

	test('it finds what the demo holds in other languages, and through a typo', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		const list = launcher.locator('.ssl-list');
		for (const q of ['perro', 'chien', 'Hund', '犬', 'собака']) {
			await search(field, q);
			await expect(list, q).toContainText('🐶');
			await expect(list, q).toContainText('IMG_2041.jpg');
		}
		await search(field, 'golden retreiver video');
		await expect(launcher.locator('.ssl-pill')).toHaveText('Videos');
		await expect(launcher.getByRole('option').first()).toContainText(
			'weekend-clips-oct-2026.mp4',
		);
		// a kind word on its own lists that kind
		await search(field, 'settings');
		await expect(launcher.locator('.ssl-pill')).toHaveText('Settings');
		await expect(launcher.getByRole('option').first()).toContainText('Network');
	});

	test('Enter opens the page or moment the row shows', async ({ page }) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		const row = launcher.getByRole('option').first();
		await search(field, 'apartment lease bond');
		await field.press('ArrowDown');
		await field.press('ArrowRight');
		await field.press('ArrowRight');
		await expect(row.locator('.ssl-place')).toHaveText('p. 5');
		await field.press('Enter');
		await expect(launcher.locator('.ssl-toast')).toHaveText(
			'Would open apartment-lease-new-farm-2026.pdf at page 5',
		);
		await expect(row.locator('.ssl-place')).toHaveText('p. 5');
		// screen readers hear a short name for the row, not its whole passage
		const name = (await row.getAttribute('aria-label')) ?? '';
		expect(name).toMatch(/^apartment-lease-new-farm-2026\.pdf, page 5: /);
		expect(name.length).toBeLessThan(160);
	});

	test('it says when nothing matches, and Esc closes it, as the real one does', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		await search(field, 'zzzz');
		await expect(launcher.locator('.ssl-notice p').first()).toHaveText(
			'Nothing on this computer matches',
		);
		// gibberish or an English word is just not here: no word about languages
		await expect(launcher.locator('.ssl-notice-note')).toHaveCount(0);
		await expect(launcher.getByRole('option')).toHaveCount(1);
		await expect(launcher.getByRole('status').last()).toContainText(
			'Nothing on this computer matches',
		);
		// a language this copy has not the words of: it says so
		await search(field, 'Hündchen');
		await expect(launcher.locator('.ssl-notice-note')).toHaveText(
			'This copy knows the demo’s words in English and Indonesian, and the main ones in ten other languages.',
		);
		// Esc closes the launcher: the desktop, and the keys that open it again
		await field.press('Escape');
		await expect(launcher.locator('.ssl-card')).toBeHidden();
		const reopen = launcher.getByRole('button', {
			name: 'Open the launcher again (Super+Space)',
		});
		await expect(reopen).toBeFocused();
		await reopen.press('Enter');
		await expect(field).toBeFocused();
		await expect(field).toHaveValue('');
		await expect(launcher.getByRole('option')).toHaveCount(0);
	});

	test('free searches find what they mean, not a word one letter off', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		const list = launcher.locator('.ssl-list');
		const rows = launcher.getByRole('option');
		// "cute" is not "cut", and says how it looks, not what it is
		for (const q of ['cute dog', 'anjing lucu']) {
			await search(field, q);
			await expect(list, q).toContainText('IMG_2041.jpg');
			await expect(list, q).not.toContainText('okrs-2026-q4.md');
		}
		await search(field, 'tax return');
		await expect(rows.first()).toContainText(
			'tax-2025-26-home-office-notes.md',
		);
		await search(field, 'what did i say about rent');
		await expect(list).toContainText('apartment-lease-new-farm-2026.pdf');
		await expect(list).toContainText('2026-10-12 pengingat.m4a');
		await expect(list).not.toContainText('best-man-speech');
		// not "paste": there is no pasta in the demo
		await search(field, 'pasta');
		await expect(launcher.locator('.ssl-notice p').first()).toHaveText(
			'Nothing on this computer matches',
		);
	});

	test('searches find what is there, and only that', async ({ page }) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		const list = launcher.locator('.ssl-list');
		const rows = launcher.getByRole('option');
		const card = launcher.locator('.ssl-answer');
		// a photo this copy has no picture of is left out: no blank tiles
		for (const q of ['photos beach', 'cat', 'photos food', 'dog']) {
			await search(field, q);
			await expect(rows.first(), q).not.toContainText('Search the web');
			await expect(list.locator('.ssl-pic.is-none'), q).toHaveCount(0);
		}
		// what it means, in other words
		await search(field, 'security deposit');
		await expect(rows.first()).toContainText(
			'apartment-lease-new-farm-2026.pdf',
		);
		await search(field, 'job application');
		await expect(launcher.locator('.ssl-pill')).toHaveCount(0);
		await expect(rows.first()).toContainText('cover-letter');
		// where a copy came from, and which browser a page was seen in
		await search(field, 'copied from signal');
		await expect(rows.first()).toContainText('Flat white with oat milk');
		await search(field, 'firefox history');
		await expect(launcher.locator('.ssl-pill')).toHaveText('History');
		await expect(rows.first()).toContainText('Firefox ·');
		// a small word is not what a search is about; an emoji's name is not a typo
		await search(field, 'thumbs up');
		await expect(rows).toHaveCount(2);
		await search(field, 'folder');
		await expect(list).not.toContainText('Folded hands');
		// an emoji is what it shows: 🐶 finds the dogs, not a face
		await search(field, '🐶');
		await expect(rows.filter({ hasText: 'IMG_2041.jpg' })).toHaveCount(1);
		await expect(rows.filter({ hasText: 'IMG_2078.jpg' })).toHaveCount(1);
		// a kind's word at the end of a long sentence is a word of it, not a scope
		await search(field, 'the moon keeps whispering about yesterday text');
		await expect(launcher.locator('.ssl-pill')).toHaveCount(0);
		await expect(rows.first()).toContainText('Search the web');
		// past four photos, other kinds' best come first, then the photos again:
		// not the rest of the files
		await search(field, 'cute dog');
		const titles = await rows.allTextContents();
		const last = titles.findIndex((t) => t.includes('IMG_2111'));
		const lease = titles.findIndex((t) => t.includes('apartment-lease'));
		expect(last).toBeGreaterThan(0);
		if (lease >= 0) expect(lease).toBeGreaterThan(last);
		// hexadecimal is not read as a sum
		await search(field, '0x10 + 1');
		await expect(card).toHaveCount(0);
		await search(field, '1 fl oz to ml');
		await expect(card).toContainText('29.5735 mL');
		await expect(rows).toHaveCount(2);
	});

	test('→ steps the opening search’s sections, round from the last', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const field = launcher.getByRole('combobox');
		const row = launcher.getByRole('option').first();
		await field.click();
		await field.press('End');
		await expect(row.locator('.ssl-place')).toHaveText('0:45–0:59');
		await field.press('ArrowRight');
		await expect(row.locator('.ssl-place')).toHaveText('0:10–0:30');
		await expect(launcher.getByRole('status').last()).toContainText('0:10');
		await field.press('ArrowRight');
		await expect(row.locator('.ssl-place')).toHaveText('0:45–0:59');
	});

	test('the example searches under it run in the launcher', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		const examples = page.getByRole('list', { name: 'Example searches' });
		await expect(examples.getByRole('button')).toHaveCount(6);
		const chip = examples.getByRole('button', { name: 'wifi connect' });
		await chip.click();
		await expect(chip).toHaveAttribute('aria-current', 'true');
		const field = launcher.getByRole('combobox');
		await expect(field).toHaveValue('wifi connect');
		// the search is there to refine: the caret is in the field, at its end
		await expect(field).toBeFocused();
		await field.press('End');
		await field.pressSequentially(' settings');
		await expect(field).toHaveValue('wifi connect settings');
		await chip.click();
		await expect(launcher.getByRole('option').first()).toContainText('Network');
		await expect(page.locator('.ssl-caption')).toHaveText(
			'A copy of the launcher running in your browser, over the demo files. The real one runs a model on your computer.',
		);
	});

	test('the demo’s pictures it has are real, and credited', async ({
		page,
	}) => {
		await page.goto(path);
		const launcher = await openLauncher(page);
		// the opening search's frame: the dog swimming, a frame of the real video
		const frame = launcher.locator('.ssl-frame img');
		await expect(frame).toHaveAttribute(
			'src',
			'/projects/super-space/demo/dog-swimming.webp',
		);
		// the credits are folded under the example searches, one press away
		const credits = page.locator('.ssl-credits');
		await expect(credits.locator('p')).toBeHidden();
		await credits.getByText('Picture credits').click();
		const source = credits.getByRole('link', {
			name: 'Golden retriever swimming the doggy paddle',
		});
		await expect(source).toBeVisible();
		await expect(source).toHaveAttribute(
			'href',
			'https://commons.wikimedia.org/wiki/File:Golden_retriever_swimming_the_doggy_paddle.webm',
		);
		await expect(credits).toContainText('by Golden Woofs');
		// they are cropped to fit their tiles, and the credit says so
		await expect(credits).toContainText('cropped and scaled down');
		await expect(
			credits
				.locator('span', { hasText: 'Golden Woofs' })
				.getByRole('link', { name: 'CC BY 3.0' }),
		).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/3.0/');
		// a photo is its own picture, never a drawing of one
		const field = launcher.getByRole('combobox');
		await search(field, 'golden retriever');
		const photo = launcher
			.getByRole('option')
			.filter({ hasText: 'IMG_2041.jpg' })
			.locator('.ssl-icon img');
		await expect(photo).toHaveAttribute(
			'src',
			'/projects/super-space/demo/retriever-market.webp',
		);
		await expect(
			credits.getByRole('link', {
				name: 'Golden retriever gnawing at the farmer’s market',
			}),
		).toBeVisible();
		await expect(launcher.locator('.ssl-fig')).toHaveCount(0);
	});

	test('before it loads, the page already draws its first frame', async ({
		browser,
	}) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto(path);
		const frame = page.locator('.ssl-screen');
		await expect(frame).toHaveAttribute('inert', '');
		await expect(frame.locator('.ssl-q')).toHaveValue('golden retriever video');
		await expect(frame).toContainText('dog swimming');
		await expect(frame).toContainText('0:45–0:59');
		await context.close();
	});

	test('each feature shows its real result, without repeating the launcher', async ({
		page,
	}) => {
		await page.goto(path);
		// the launcher's panel is the demo's alone: the beats set the result in type
		await expect(page.locator('.ssl-card')).toHaveCount(1);
		const files = page.locator('.ss-beat--files .ss-find');
		await expect(files).toBeVisible();
		await expect(files).toContainText('apartment lease bond');
		await expect(files).toContainText('“…rental bond of $2,400…”');
		await expect(files).toContainText('The lease · page 3');
		const moments = page.locator('.ss-beat--moments .ss-find');
		await expect(moments).toContainText('golden retriever video');
		await expect(moments).toContainText('0:10–0:30');
		await expect(moments).toContainText('0:45–0:59');
		await expect(moments).toContainText('weekend-clips-oct-2026.mp4');
		// screen readers can run these searches in the launcher itself
		for (const find of [files, moments]) {
			await expect(find).toHaveAttribute('aria-hidden', 'true');
		}

		const everything = page.locator('.ss-beat--everything');
		await expect(everything).toContainText('emoji in any language');
		await expect(everything).toContainText('Omarchy settings by meaning');
		await expect(everything).toContainText('folders by name');
		await expect(everything).toContainText(
			'quick answers: maths, units, currency, time zones',
		);
		await expect(everything).toContainText('Firefox and Zen');
		const scopes = page.locator('.ss-beat--scopes');
		await expect(
			scopes.getByRole('heading', { name: 'Scope words narrow a search.' }),
		).toBeVisible();
		await expect(scopes.getByRole('listitem')).toHaveCount(5);
		await expect(scopes).toContainText('camera folder');
		// the song search is an example, not a search box with nothing found
		const speech = page.locator('.ss-beat--speech');
		await expect(speech.getByText('songs about a breakup')).toBeVisible();
		await expect(speech.locator('.ssl-card')).toHaveCount(0);
	});

	test('the launcher’s first search is not the one the next beat sets out', async ({
		page,
	}) => {
		await page.goto(path);
		const first = await page.locator('.ssl .ssl-q').inputValue();
		const next = await page.locator('.ss-beat--files .ss-find-q').textContent();
		expect(first).toBe('golden retriever video');
		expect(next?.trim()).toBe('apartment lease bond');
	});

	test('the Pi is the beat: its photo, its numbers over it, and the photo’s credit', async ({
		page,
	}) => {
		await page.goto(path);
		const band = page.locator('.ss-beat--pi');
		const photo = band.getByRole('img', {
			name: 'A Raspberry Pi 5 board, seen from above',
		});
		await expect(photo).toBeVisible();
		await expect(band.locator('.ss-stat-num')).toHaveText([
			'about 3 s',
			'about 1 min',
			'about 12 min',
		]);
		await expect(band).toContainText(
			'With the demo home: about 80 documents, photos, songs and videos.',
		);
		const credit = band.locator('.ss-credit');
		await expect(credit).toHaveText(
			'Raspberry Pi 5 photo: Simon Waldherr, CC BY-SA 4.0, via Wikimedia Commons (cropped)',
		);
		await expect(
			credit.getByRole('link', { name: 'CC BY-SA 4.0' }),
		).toHaveAttribute(
			'href',
			'https://creativecommons.org/licenses/by-sa/4.0/',
		);
		await expect(
			credit.getByRole('link', { name: 'Wikimedia Commons' }),
		).toHaveAttribute(
			'href',
			'https://commons.wikimedia.org/wiki/File:Raspberry_Pi_5_Board.jpg',
		);
		// small, but as legible as the notes beside it
		expect(await credit.evaluate((el) => getComputedStyle(el).color)).toBe(
			'rgb(138, 133, 125)',
		);
	});

	test('the headline and the install command are on the first screen', async ({
		page,
	}) => {
		for (const viewport of [
			{ width: 1440, height: 900 },
			{ width: 1280, height: 800 },
			{ width: 1920, height: 1080 },
			// laptops' windows, less the browser's bars
			{ width: 1366, height: 657 },
			{ width: 1280, height: 649 },
			{ width: 1536, height: 730 },
			{ width: 1024, height: 640 },
		]) {
			await page.setViewportSize(viewport);
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const command = await page.locator('.ss-hero .ss-cmd').boundingBox();
			const headline = await page.locator('.ss-headline').boundingBox();
			expect(command && headline).toBeTruthy();
			if (command && headline) {
				expect(headline.y, `${viewport.width}`).toBeGreaterThanOrEqual(0);
				expect(command.y + command.height, `${viewport.width}`).toBeLessThan(
					viewport.height,
				);
			}
		}
	});

	test('the home page does not fetch this page’s fonts or stylesheet ahead', async ({
		page,
	}) => {
		const preloads = () =>
			page.evaluate(() =>
				[
					...document.querySelectorAll(
						'link[rel="preload"]:is([as="font"], [as="style"])',
					),
				].map((l) => `${l.getAttribute('as')} ${l.getAttribute('href')}`),
			);
		// the site's own preloads, on a page without the Super Space sticker
		await page.goto('/writing');
		const site = await preloads();
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1500); // links in view prefetch once the page is idle
		for (const preload of await preloads()) {
			expect(site).toContain(preload);
		}
	});

	test('the search speed says where it was measured before the numbers', async ({
		page,
	}) => {
		await page.goto(path);
		// measured on the VM, not the Pi: out of the Pi's band, in a beat of its own
		const band = page.locator('.ss-beat--pi');
		await expect(band).toContainText(
			'Indexing at idle priority, measured on the Pi',
		);
		await expect(band).not.toContainText(/\bms\b/);
		await expect(band).not.toContainText('Try Omarchy VM');
		const beat = page.locator('.ss-beat--speed');
		await expect(beat).not.toHaveClass(/ss-band/);
		const label = beat.getByText(
			'Search speed, measured on the Try Omarchy VM (Apple Silicon)',
		);
		const number = beat.locator('.ss-stat-num', { hasText: '73' });
		await expect(label).toBeVisible();
		const [l, n] = await Promise.all([
			label.boundingBox(),
			number.boundingBox(),
		]);
		expect(l && n && l.y + l.height <= n.y).toBe(true);
	});

	test.describe('with reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('nothing in the launcher moves', async ({ page }) => {
			await page.goto(path);
			const launcher = await openLauncher(page);
			await search(launcher.getByRole('combobox'), 'apartment lease bond');
			await launcher.getByRole('combobox').press('Enter');
			await expect(launcher.locator('.ssl-toast')).toHaveText(
				'Would open apartment-lease-new-farm-2026.pdf at page 3',
			);
			expect(
				await launcher.evaluate(
					(el) => el.getAnimations({ subtree: true }).length,
				),
			).toBe(0);
		});
	});

	// No result sticks out of its row, and the screen never out of the page.
	test('the launcher fits, from phones to laptops', async ({ page }) => {
		test.setTimeout(90_000);
		for (const width of [320, 360, 390, 768, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const launcher = await openLauncher(page);
			for (const q of [
				'golden retriever video',
				'apartment lease bond',
				'songs about a breakup',
				'anjing',
				'3pm sydney in jakarta',
			]) {
				// pasted rather than typed: the size is what is tested here
				await launcher.getByRole('combobox').fill(q);
				await page.waitForTimeout(450);
				await expect(launcher.getByRole('combobox')).toHaveValue(q);
				const cut = await launcher.evaluate((el) =>
					[...el.querySelectorAll('.ssl-row, .ssl-answer')]
						.filter((row) => row.scrollWidth > row.clientWidth + 1)
						.map((row) => row.textContent),
				);
				expect(cut, `${width}px, ${q}`).toEqual([]);
				// from a phone's width up, the query fits its field whole
				if (width >= 390) {
					const field = launcher.getByRole('combobox');
					expect(
						await field.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
						`${width}px, ${q}`,
					).toBe(true);
				}
			}
			expect(await overflowing(page, '.ss'), `${width}px`).toEqual([]);
		}
	});

	// on a phone an answer wraps under what was typed; it is never cut
	for (const width of [375, 390]) {
		test(`answers are never cut off at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 800 });
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const launcher = await openLauncher(page);
			const field = launcher.getByRole('combobox');
			for (const q of [
				'72 f',
				'sqrt 2',
				'3pi',
				'30 mph',
				'1 acre to m2',
				'2 l to cups',
				'100k rupiah',
				'12 times 12',
				'1/7',
				'12345678 * 87654321',
			]) {
				await field.fill(q);
				await expect(launcher.locator('.ssl-answer'), q).toBeVisible();
				const cut = await launcher
					.locator('.ssl-answer-big, .ssl-answer-label')
					.evaluateAll((els) =>
						els
							.filter((el) => el.scrollWidth > el.clientWidth + 1)
							.map((el) => el.textContent),
					);
				expect(cut, q).toEqual([]);
			}
		});
	}

	test.describe('at 375 × 667, touch', () => {
		test.use({
			viewport: { width: 375, height: 667 },
			hasTouch: true,
			isMobile: true,
		});

		test('an example tapped under the screen brings the panel back into view', async ({
			page,
		}) => {
			await page.goto(path);
			await openLauncher(page);
			const chip = page.getByRole('button', { name: 'songs about a breakup' });
			// scrolled down to the chips: the panel has gone up off the screen
			await chip.evaluate((el) =>
				el.scrollIntoView({ block: 'end', behavior: 'instant' }),
			);
			const card = page.locator('.ssl-card');
			expect((await card.boundingBox())?.y ?? 0).toBeLessThan(0);
			await chip.tap();
			await expect(page.getByRole('combobox')).toHaveValue(
				'songs about a breakup',
			);
			await expect
				.poll(async () => (await card.boundingBox())?.y ?? -1)
				.toBeGreaterThanOrEqual(0);
		});

		test('the search row takes a finger: a tap beside the field puts the caret in it', async ({
			page,
		}) => {
			await page.goto(path);
			const launcher = await openLauncher(page);
			const field = launcher.getByRole('combobox');
			await launcher
				.locator('.ssl-field')
				.evaluate((el) =>
					el.scrollIntoView({ block: 'center', behavior: 'instant' }),
				);
			const hit = await launcher
				.locator('.ssl-field')
				.evaluate((el) => getComputedStyle(el, '::before').height);
			expect(Number.parseFloat(hit)).toBeGreaterThanOrEqual(44);
			const row = await launcher.locator('.ssl-field').boundingBox();
			expect(row).toBeTruthy();
			if (!row) return;
			// 10px above the row, over its mark: still the search row
			await page.touchscreen.tap(row.x + 14, row.y - 10);
			await expect(field).toBeFocused();
		});
	});

	test.describe('at 390px wide', () => {
		test.use({ viewport: { width: 390, height: 844 } });

		test('fits: no sideways scroll, the command wraps in its box, tap targets are 44px', async ({
			page,
		}) => {
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const { scrollWidth, clientWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
			}));
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
			// and nothing on the stage sticks out to be clipped by the desk
			expect(await overflowing(page, '.ss')).toEqual([]);

			// the install command wraps inside its box
			const box = await page.locator('.ss-hero .ss-cmd').boundingBox();
			const code = await page.locator('.ss-hero .ss-cmd code').boundingBox();
			expect(box && code).toBeTruthy();
			if (box && code) {
				expect(box.x).toBeGreaterThanOrEqual(0);
				expect(box.x + box.width).toBeLessThanOrEqual(clientWidth);
				expect(code.x + code.width).toBeLessThanOrEqual(box.x + box.width);
			}

			// the launcher's screen fits the screen
			const panel = await page.locator('.ssl-screen').boundingBox();
			expect(panel).toBeTruthy();
			if (panel) {
				expect(panel.x).toBeGreaterThanOrEqual(0);
				expect(panel.x + panel.width).toBeLessThanOrEqual(clientWidth);
			}

			const targets = page.locator(
				'.ss :is(button, summary, a.ss-gh, a.ss-button, a.ss-foot-link)',
			);
			const count = await targets.count();
			expect(count).toBeGreaterThan(10);
			for (let i = 0; i < count; i++) {
				const t = await targets.nth(i).boundingBox();
				expect(t, `target ${i}`).toBeTruthy();
				if (t) expect(t.height, `target ${i}`).toBeGreaterThanOrEqual(44);
			}
		});
	});
});
