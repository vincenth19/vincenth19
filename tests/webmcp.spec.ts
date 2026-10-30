import { type Browser, expect, type Page, test } from '@playwright/test';
import { recordTransitions } from './viewTransitions';

/**
 * The tools an AI agent in the browser gets on the site (WebMCP,
 * lib/webmcp/tools.ts). The Chromium the tests run has no WebMCP, so each
 * test that needs it puts in a stand-in for `document.modelContext` that
 * does what the spec says (registerTool returns a promise, refuses a name
 * that is taken, and lets go of a tool when its signal aborts) and keeps
 * the tools on window, where the tests list them and call them as an
 * agent would.
 */

const at = (path: string) => (url: URL) => url.pathname === path;

const NAMES = ['list_projects', 'open_project', 'get_resume', 'get_contact'];

/** Each project's name, and its sticker's key (`.stk--<key>`, `stk-<key>`), by slug. */
const PROJECTS: Record<string, { name: string; key: string }> = {
	'super-space': { name: 'Super Space', key: 'superspace' },
	basilica: { name: 'Basilica', key: 'basilica' },
	covidtracker: { name: 'CovidTracker', key: 'covid' },
};

type Tool = {
	name: string;
	title?: string;
	description: string;
	inputSchema?: unknown;
	annotations?: Record<string, boolean>;
	execute: (
		input: Record<string, unknown>,
		client: { signal: AbortSignal },
	) => Promise<unknown>;
};

/** What the stand-in keeps on window. */
type Fake = {
	__webmcp: {
		tools: Map<string, Tool>;
		/** The name of every registerTool call, in order, refused or not. */
		calls: string[];
	};
};

/**
 * Puts the WebMCP stand-in on `document.modelContext` (or, as Chrome's
 * earlier preview had it, `navigator.modelContext`) before the page's own
 * scripts run. `taken`: names some other script registered first.
 * `throws`: registerTool throws instead of returning, as early previews did.
 */
async function installWebMcp(
	page: Page,
	{
		on = 'document',
		taken = [],
		throws = false,
	}: {
		on?: 'document' | 'navigator';
		taken?: string[];
		throws?: boolean;
	} = {},
) {
	await page.addInitScript(
		({ on, taken, throws }) => {
			const tools = new Map<string, Tool>();
			const calls: string[] = [];
			for (const name of taken) {
				tools.set(name, {
					name,
					description: 'Someone else’s',
					execute: async () => null,
				});
			}
			const refuse = (message: string) =>
				Promise.reject(new DOMException(message, 'InvalidStateError'));
			const context = {
				registerTool(tool: Tool, options: { signal?: AbortSignal } = {}) {
					calls.push(String(tool?.name));
					if (throws)
						throw new DOMException('No tools here', 'NotAllowedError');
					const { signal } = options;
					if (signal?.aborted) return Promise.reject(signal.reason);
					const name = tool?.name;
					if (typeof name !== 'string' || !/^[\w.-]{1,128}$/.test(name)) {
						return refuse(`Invalid tool name "${name}"`);
					}
					if (!tool.description) return refuse(`"${name}" has no description`);
					if (tools.has(name)) return refuse(`"${name}" is already registered`);
					// the schema must survive JSON
					JSON.parse(JSON.stringify(tool.inputSchema ?? {}));
					tools.set(name, tool);
					signal?.addEventListener(
						'abort',
						() => {
							if (tools.get(name) === tool) tools.delete(name);
						},
						{ once: true },
					);
					return Promise.resolve(undefined);
				},
			};
			Object.defineProperty(
				on === 'document' ? document : navigator,
				'modelContext',
				{
					value: context,
					configurable: true,
				},
			);
			(window as unknown as Fake).__webmcp = { tools, calls };
		},
		{ on, taken, throws },
	);
}

/** The names of the tools registered now. */
const toolNames = (page: Page) =>
	page.evaluate(() => [...(window as unknown as Fake).__webmcp.tools.keys()]);

/** How many times the site called registerTool. */
const registerCalls = (page: Page) =>
	page.evaluate(() => (window as unknown as Fake).__webmcp.calls.length);

/** Waits for the site's tools, every one in NAMES. */
async function toolsIn(page: Page) {
	await expect
		.poll(async () => (await toolNames(page)).sort())
		.toEqual([...NAMES].sort());
}

/**
 * Calls tools as an agent does, all in the same moment (an agent may send
 * several in one turn): what each returns comes back through JSON, and a
 * rejection only as an OperationError, as the spec has it (its message
 * stays in the page).
 */
async function callAtOnce<T = Record<string, unknown>>(
	page: Page,
	calls: { name: string; input?: Record<string, unknown> }[],
): Promise<{ result?: T; error?: string }[]> {
	return page.evaluate(
		(calls) =>
			Promise.all(
				calls.map(async ({ name, input = {} }) => {
					const tool = (window as unknown as Fake).__webmcp.tools.get(name);
					if (!tool) return { error: `no tool ${name}` };
					try {
						const out = await tool.execute(input, {
							signal: new AbortController().signal,
						});
						return { result: JSON.parse(JSON.stringify(out)) };
					} catch {
						return { error: 'OperationError' };
					}
				}),
			),
		calls,
	);
}

/** Calls one tool as an agent does (see callAtOnce). */
async function call<T = Record<string, unknown>>(
	page: Page,
	name: string,
	input: Record<string, unknown> = {},
): Promise<{ result?: T; error?: string }> {
	const [answer] = await callAtOnce<T>(page, [{ name, input }]);
	return answer;
}

/** The tools as the agent sees them: everything but `execute`, through JSON. */
const definitions = (page: Page) =>
	page.evaluate(() =>
		[...(window as unknown as Fake).__webmcp.tools.values()].map((tool) =>
			JSON.parse(JSON.stringify({ ...tool, execute: undefined })),
		),
	);

/** Fails the test on any console error or warning, or uncaught exception (a rejection nobody caught included). */
function watchConsole(page: Page) {
	const problems: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error' || msg.type() === 'warning') {
			problems.push(`${msg.type()}: ${msg.text()}`);
		}
	});
	page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
	return problems;
}

/** The Projects page's stickers, in page order: href, slug, name, year and caption. */
function stickersOnPage(page: Page) {
	return page.locator('.collage .slot').evaluateAll((slots) =>
		slots.map((slot) => {
			const a = slot.querySelector<HTMLAnchorElement>('a.stk');
			const href = a?.getAttribute('href') ?? '';
			const year = /, (\d{4})\./.exec(a?.getAttribute('aria-label') ?? '')?.[1];
			return {
				href,
				slug: href.replace('/projects/', ''),
				name: slot.querySelector('.cap-name')?.textContent ?? '',
				year: year ? Number(year) : undefined,
				caption: slot.querySelector('.cap-desc')?.textContent ?? '',
			};
		}),
	);
}

/** Opens `slug` with open_project and checks that its page is the one shown, and the transition that ran. */
async function opens(
	page: Page,
	slug: string,
	vts: Awaited<ReturnType<typeof recordTransitions>>,
	{ animated = true } = {},
) {
	await vts.take();
	const { result, error } = await call<{ url: string; title: string }>(
		page,
		'open_project',
		{ project: slug },
	);
	expect(error).toBeUndefined();
	const path = `/projects/${slug}`;
	// resolved with the page in place: no waiting needed for any of this
	expect(new URL(result?.url ?? '').pathname).toBe(path);
	expect(page.url()).toBe(result?.url);
	expect(await page.title()).toBe(result?.title);
	const { name, key } = PROJECTS[slug];
	expect(result?.title).toBe(`${name} · Vincent Haryadi`);
	expect(
		await page.getByRole('heading', { level: 2, name, exact: true }).count(),
	).toBe(1);
	expect(await page.locator('header.mast').getAttribute('data-open')).toBe(key);
	const runs = await vts.take();
	if (animated) {
		// the site's own project transition ran, and it is over
		expect(runs.map((r) => r.direction)).toEqual(['open']);
		expect(runs[0].finished).toBe(true);
	} else {
		expect(runs).toEqual([]);
	}
	return runs[0];
}

test.describe('with WebMCP', () => {
	test('the four tools register once on load and stay through every way round the site', async ({
		page,
	}) => {
		const problems = watchConsole(page);
		await installWebMcp(page);
		await page.goto('/');
		await toolsIn(page);
		expect(await registerCalls(page)).toBe(NAMES.length);

		const tabs = page.getByRole('navigation', { name: 'Book sections' });
		await tabs.getByRole('link', { name: 'Resume' }).click();
		await expect(page).toHaveURL(at('/resume'));
		await tabs.getByRole('link', { name: 'Writing' }).click();
		await expect(page).toHaveURL(at('/writing'));
		await tabs.getByRole('link', { name: 'Projects' }).click();
		await expect(page).toHaveURL(at('/'));
		// a project opens, and Back (the arrow, then the browser's) comes home
		await page
			.getByRole('link', { name: 'CovidTracker, 2021. Open project' })
			.click();
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await page.getByRole('link', { name: 'Back', exact: true }).click();
		await expect(page).toHaveURL(at('/'));
		await page.goForward();
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		await page.goBack();
		await expect(page).toHaveURL(at('/'));
		// and as the agent opens one itself
		const { error } = await call(page, 'open_project', {
			project: 'basilica',
		});
		expect(error).toBeUndefined();
		await page.goBack();
		await expect(page).toHaveURL(at('/'));

		expect((await toolNames(page)).sort()).toEqual([...NAMES].sort());
		expect(await registerCalls(page)).toBe(NAMES.length);
		expect(problems).toEqual([]);
	});

	test('each tool has a snake_case name, a title and a description, and a schema that survives JSON', async ({
		page,
	}) => {
		await installWebMcp(page);
		await page.goto('/');
		await toolsIn(page);
		const tools = await definitions(page);
		expect(tools.map((t) => t.name).sort()).toEqual([...NAMES].sort());
		for (const tool of tools) {
			// the spec's rule, and snake_case within it
			expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
			expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)*$/);
			expect(tool.title?.trim()).toBeTruthy();
			expect(tool.description.trim().length).toBeGreaterThan(40);
			expect(tool.inputSchema).toMatchObject({ type: 'object' });
		}
		const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
		for (const name of ['list_projects', 'get_resume', 'get_contact']) {
			expect(byName[name].annotations).toEqual({ readOnlyHint: true });
			expect(byName[name].inputSchema).toEqual({
				type: 'object',
				properties: {},
				additionalProperties: false,
			});
		}
		expect(byName.open_project.annotations).toEqual({
			readOnlyHint: false,
			consequentialHint: false,
		});
		// open_project takes one of the slugs the Projects page links to
		const slugs = (await stickersOnPage(page)).map((s) => s.slug);
		expect(slugs).toHaveLength(3);
		expect(byName.open_project.inputSchema).toEqual({
			type: 'object',
			properties: {
				project: {
					type: 'string',
					enum: slugs,
					description: expect.any(String),
				},
			},
			required: ['project'],
			additionalProperties: false,
		});
		// what the agent is told carries no secret
		expect(JSON.stringify(tools)).not.toMatch(
			/api.?key|token|secret|password/i,
		);
	});

	test('list_projects gives the stickers on the Projects page, in order, with absolute URLs and only the links the site shows', async ({
		page,
	}) => {
		await installWebMcp(page);
		await page.goto('/');
		await toolsIn(page);
		const stickers = await stickersOnPage(page);
		const { result } = await call<
			{
				slug: string;
				name: string;
				year?: number;
				summary: string;
				url: string;
				links?: { label: string; href: string }[];
				install?: string;
			}[]
		>(page, 'list_projects');
		expect(result).toBeDefined();
		const projects = result ?? [];
		expect(projects.map((p) => p.name)).toEqual(stickers.map((s) => s.name));
		for (const [i, p] of projects.entries()) {
			const sticker = stickers[i];
			expect(p.slug).toBe(sticker.slug);
			expect(p.year).toBe(sticker.year);
			expect(p.summary).toBe(sticker.caption);
			expect(p.url).toBe(`https://vincenth19.com${sticker.href}`);
		}
		// Basilica has no year and no links yet: nothing is made up for it
		const basilica = projects.find((p) => p.slug === 'basilica');
		expect(basilica).toBeDefined();
		expect(basilica && 'year' in basilica).toBe(false);
		expect(basilica && 'links' in basilica).toBe(false);

		// a project's links are on its own page: on a sheet, exactly the ones it
		// shows (none for Basilica yet); on Super Space's product page, among the
		// rest of it, with its install command
		for (const p of projects) {
			await page.goto(new URL(p.url).pathname);
			if (p.slug === 'super-space') {
				for (const link of p.links ?? []) {
					await expect(
						page
							.locator(`a[href="${link.href}"]`)
							.filter({ hasText: link.label }),
					).not.toHaveCount(0);
				}
			} else {
				await expect(page.locator('article.detail')).toHaveCount(1);
				const shown = await page
					.locator('article.detail ul.links a')
					.evaluateAll((links) =>
						links.map((a) => ({
							label: a.textContent?.trim() ?? '',
							href: a.getAttribute('href') ?? '',
						})),
					);
				expect(p.links ?? []).toEqual(shown);
			}
			if (p.install) {
				await expect(page.getByText(p.install).first()).toBeAttached();
			}
		}
		expect(
			projects.find((p) => p.slug === 'super-space')?.links?.length,
		).toBeGreaterThan(0);
	});

	test('get_resume gives what the resume page shows', async ({ page }) => {
		await installWebMcp(page);
		await page.goto('/resume');
		await toolsIn(page);
		const shown = {
			note: await page.locator('.sheet-note').textContent(),
			jobs: await page.locator('.jobs li').evaluateAll((items) =>
				items.map((li) => {
					const text = (cls: string) =>
						li.querySelector(`.${cls}`)?.textContent ?? '';
					const where = text('where');
					return {
						when: text('when'),
						role: text('role'),
						org: text('org'),
						...(where && { where }),
					};
				}),
			),
		};
		expect(shown.jobs.length).toBeGreaterThan(0);
		const { result } = await call(page, 'get_resume');
		expect(result).toEqual({ ...shown, url: 'https://vincenth19.com/resume' });
	});

	test("get_contact gives the email address and the masthead's links, and goes nowhere", async ({
		page,
	}) => {
		await installWebMcp(page);
		await page.goto('/writing');
		await toolsIn(page);
		const socials = await page
			.locator('header.mast .socials a')
			.evaluateAll((links) =>
				links.map((a) => ({
					label: a.getAttribute('aria-label'),
					href: a.getAttribute('href'),
				})),
			);
		expect(socials.length).toBeGreaterThan(1);
		const { result } = await call(page, 'get_contact');
		expect(result).toEqual({
			email: 'me@vincenth19.com',
			socials,
			url: 'https://vincenth19.com',
		});
		await expect(page).toHaveURL(at('/writing'));
	});

	test('open_project from the Projects page flies the sticker into the header, as a click does', async ({
		page,
	}) => {
		const problems = watchConsole(page);
		const vts = await recordTransitions(page);
		await installWebMcp(page);
		for (const [slug, { key }] of Object.entries(PROJECTS)) {
			await page.goto('/');
			await toolsIn(page);
			const run = await opens(page, slug, vts);
			// only that sticker was named, and it morphed into the header sticker
			expect(
				Object.entries(run.named).filter(([, name]) => name !== 'none'),
			).toEqual([[`book stk--${key}`, `stk-${key}`]]);
			expect(run.pairs).toContain(`stk-${key}`);
			// Back flies it home to its spot
			await page.getByRole('link', { name: 'Back', exact: true }).click();
			await expect(page).toHaveURL(at('/'));
		}
		expect(problems).toEqual([]);
	});

	for (const [from, targets] of [
		['/resume', ['super-space', 'basilica', 'covidtracker']],
		['/writing', ['basilica']],
		['/projects/basilica', ['covidtracker', 'super-space']],
		['/projects/covidtracker', ['basilica']],
		['/projects/super-space', ['basilica', 'covidtracker']],
		['/no-such-page', ['covidtracker']],
	] as const) {
		test(`open_project from ${from} runs the site's project transition`, async ({
			page,
		}) => {
			const problems = watchConsole(page);
			const vts = await recordTransitions(page);
			await installWebMcp(page);
			for (const slug of targets) {
				await page.goto(from);
				await toolsIn(page);
				await opens(page, slug, vts);
			}
			// (the 404 page's own load logs its 404)
			expect(problems.filter((p) => !/404/.test(p))).toEqual([]);
		});
	}

	test('open_project on the project already shown resolves at once with it', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await installWebMcp(page);
		await page.goto('/projects/super-space');
		await toolsIn(page);
		const started = Date.now();
		await opens(page, 'super-space', vts, { animated: false });
		expect(Date.now() - started).toBeLessThan(1000);
	});

	test('open_project waits for a sticker already on its way, then opens its project', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await installWebMcp(page);
		await page.goto('/');
		await toolsIn(page);
		// Super Space's page is not fetched ahead: its sticker lifts and waits
		const sticker = page.getByRole('link', {
			name: 'Super Space, 2026. Open project',
		});
		await sticker.click();
		await expect(sticker).toHaveClass(/is-lifting/);
		const { result, error } = await call<{ url: string }>(
			page,
			'open_project',
			{ project: 'covidtracker' },
		);
		expect(error).toBeUndefined();
		expect(new URL(result?.url ?? '').pathname).toBe('/projects/covidtracker');
		await expect(page).toHaveURL(at('/projects/covidtracker'));
		// Super Space opened first, its flight was not cut short; then CovidTracker
		const runs = await vts.all();
		expect(
			runs.map((r) => [r.direction, r.pairs.includes('stk-superspace')]),
		).toEqual([
			['open', true],
			['open', false],
		]);
		expect(runs.every((r) => r.finished && !r.skipped)).toBe(true);
		await page.goBack();
		await expect(page).toHaveURL(at('/projects/super-space'));
	});

	for (const from of ['/', '/resume'] as const) {
		test(`two open_project calls at once from ${from} open one project, then the other over it`, async ({
			page,
		}) => {
			const problems = watchConsole(page);
			const vts = await recordTransitions(page);
			await installWebMcp(page);
			await page.goto(from);
			await toolsIn(page);
			// sent in one turn: the second waits for the first, which the desk,
			// busy with it, would otherwise drop it for
			const answers = await callAtOnce<{ url: string }>(page, [
				{ name: 'open_project', input: { project: 'basilica' } },
				{ name: 'open_project', input: { project: 'covidtracker' } },
			]);
			expect(answers.map((a) => a.error)).toEqual([undefined, undefined]);
			// each answered on its own page: the first was shown before the second opened
			expect(answers.map((a) => new URL(a.result?.url ?? '').pathname)).toEqual(
				['/projects/basilica', '/projects/covidtracker'],
			);
			await expect(page).toHaveURL(at('/projects/covidtracker'));
			const runs = await vts.all();
			expect(runs.map((r) => [r.direction, r.header])).toEqual([
				['open', null],
				['open', 'basilica'],
			]);
			expect(runs.every((r) => r.finished && !r.skipped)).toBe(true);
			await page.goBack();
			await expect(page).toHaveURL(at('/projects/basilica'));
			expect(problems).toEqual([]);
		});
	}

	test('open_project refuses a project the site does not have, and goes nowhere', async ({
		page,
	}) => {
		await installWebMcp(page);
		await page.goto('/resume');
		await toolsIn(page);
		// the agent learns only that the call failed: the slugs reach it through
		// the input schema's enum (checked above) and list_projects
		for (const input of [
			{ project: 'nope' },
			{ project: 'CovidTracker' },
			{},
		]) {
			expect(await call(page, 'open_project', input)).toEqual({
				error: 'OperationError',
			});
		}
		await expect(page).toHaveURL(at('/resume'));
	});

	test('open_project stops when the agent aborts it, and does not wait forever', async ({
		page,
	}) => {
		await installWebMcp(page);
		await page.goto('/resume');
		await toolsIn(page);
		// called off before it starts: it rejects with the reason, and opens nothing
		const aborted = await page.evaluate(async () => {
			const tool = (window as unknown as Fake).__webmcp.tools.get(
				'open_project',
			);
			const stop = new AbortController();
			stop.abort(new DOMException('The agent stopped', 'AbortError'));
			try {
				await tool?.execute({ project: 'basilica' }, { signal: stop.signal });
				return 'resolved';
			} catch (error) {
				return error instanceof DOMException ? error.name : String(error);
			}
		});
		expect(aborted).toBe('AbortError');
		await expect(page).toHaveURL(at('/resume'));

		// a page that never comes: it gives up after a few seconds (the agent
		// gets an OperationError; the rejection in the page says why)
		await page.route('**/projects/basilica?_rsc=*', () => {});
		const started = Date.now();
		const why = await page.evaluate(async () => {
			const tool = (window as unknown as Fake).__webmcp.tools.get(
				'open_project',
			);
			try {
				await tool?.execute(
					{ project: 'basilica' },
					{ signal: new AbortController().signal },
				);
				return 'resolved';
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		});
		expect(why).toMatch(/did not open within \d+ seconds/);
		expect(Date.now() - started).toBeLessThan(10_000);
		await expect(page).toHaveURL(at('/resume'));
	});

	test('with only navigator.modelContext (the earlier preview), the tools still register', async ({
		page,
	}) => {
		await installWebMcp(page, { on: 'navigator' });
		await page.goto('/');
		await toolsIn(page);
		expect(await registerCalls(page)).toBe(NAMES.length);
		const { result } = await call(page, 'get_contact');
		expect(result?.email).toBe('me@vincenth19.com');
	});

	test('a browser that refuses a tool, or throws, troubles nobody', async ({
		page,
	}) => {
		const problems = watchConsole(page);
		// another script on the page has a list_projects already: that one is refused
		await installWebMcp(page, { taken: ['list_projects'] });
		await page.goto('/');
		await expect.poll(() => registerCalls(page)).toBe(NAMES.length);
		expect((await toolNames(page)).sort()).toEqual([...NAMES].sort());
		const tools = await definitions(page);
		expect(tools.find((t) => t.name === 'list_projects')?.description).toBe(
			'Someone else’s',
		);
		expect(problems).toEqual([]);

		const throwing = await page.context().newPage();
		const thrown = watchConsole(throwing);
		await installWebMcp(throwing, { throws: true });
		await throwing.goto('/');
		await expect.poll(() => registerCalls(throwing)).toBe(NAMES.length);
		expect(await toolNames(throwing)).toEqual([]);
		await throwing
			.getByRole('navigation', { name: 'Book sections' })
			.getByRole('link', { name: 'Resume' })
			.click();
		await expect(throwing).toHaveURL(at('/resume'));
		expect(thrown).toEqual([]);
	});
});

test.describe('with WebMCP and reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('open_project navigates straight away, from the Projects page and from elsewhere', async ({
		page,
	}) => {
		const vts = await recordTransitions(page);
		await installWebMcp(page);
		await page.goto('/');
		await toolsIn(page);
		await opens(page, 'basilica', vts, { animated: false });
		await page.goto('/resume');
		await toolsIn(page);
		await opens(page, 'super-space', vts, { animated: false });
		await opens(page, 'covidtracker', vts, { animated: false });
	});
});

/**
 * Opens a fresh page that loads the site and goes round it (a tab, a
 * project, Back), and collects every script it downloaded, with its text.
 */
async function scriptsLoaded(browser: Browser, webmcp: boolean) {
	const context = await browser.newContext();
	const page = await context.newPage();
	const problems = watchConsole(page);
	if (webmcp) await installWebMcp(page);
	const bodies: Promise<{ url: string; text: string }>[] = [];
	page.on('response', (response) => {
		if (response.request().resourceType() !== 'script') return;
		bodies.push(
			response
				.text()
				.then((text) => ({ url: response.url(), text }))
				.catch(() => ({ url: response.url(), text: '' })),
		);
	});
	await page.goto('/');
	if (webmcp) await toolsIn(page);
	const tabs = page.getByRole('navigation', { name: 'Book sections' });
	await tabs.getByRole('link', { name: 'Resume' }).click();
	await expect(page).toHaveURL(at('/resume'));
	await tabs.getByRole('link', { name: 'Projects' }).click();
	await expect(page).toHaveURL(at('/'));
	await page
		.getByRole('link', { name: 'CovidTracker, 2021. Open project' })
		.click();
	await expect(page).toHaveURL(at('/projects/covidtracker'));
	await page.waitForLoadState('networkidle');
	const scripts = await Promise.all(bodies);
	const registered = await page.evaluate(
		() => (window as unknown as Partial<Fake>).__webmcp?.calls.length ?? 0,
	);
	await context.close();
	return { scripts, problems, registered };
}

test('without WebMCP nothing registers, nothing is logged, and the tools are never downloaded', async ({
	browser,
}) => {
	// with it, the tools come in a chunk of their own
	const withIt = await scriptsLoaded(browser, true);
	const chunks = withIt.scripts
		.filter((s) => s.text.includes('list_projects'))
		.map((s) => s.url);
	expect(chunks).toHaveLength(1);
	expect(withIt.registered).toBe(NAMES.length);
	expect(withIt.problems).toEqual([]);

	const without = await scriptsLoaded(browser, false);
	expect(without.scripts.length).toBeGreaterThan(0);
	expect(without.scripts.map((s) => s.url)).not.toContain(chunks[0]);
	expect(
		without.scripts.filter((s) => s.text.includes('list_projects')),
	).toEqual([]);
	expect(without.registered).toBe(0);
	expect(without.problems).toEqual([]);
});

test("with the browser's own WebMCP, the four tools are there", async ({
	page,
}) => {
	await page.goto('/');
	// Chromium has it only behind chrome://flags/#enable-webmcp-testing (not set
	// here or in CI), which also gives pages navigator.modelContextTesting to
	// list the tools with
	const testing = await page.evaluate(() => {
		const nav = navigator as Navigator & {
			modelContext?: unknown;
			modelContextTesting?: { listTools?: unknown };
		};
		const doc = document as Document & { modelContext?: unknown };
		return (
			(doc.modelContext ?? nav.modelContext) !== undefined &&
			typeof nav.modelContextTesting?.listTools === 'function'
		);
	});
	test.skip(!testing, 'this browser has no WebMCP');
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const nav = navigator as Navigator & {
					modelContextTesting: {
						listTools: () => { name: string }[] | Promise<{ name: string }[]>;
					};
				};
				const tools = await nav.modelContextTesting.listTools();
				return tools.map((t) => t.name).sort();
			}),
		)
		.toEqual([...NAMES].sort());
});
