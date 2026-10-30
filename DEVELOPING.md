# Developing vincenth19.com

Next.js 16 (App Router) + React 19, written in TypeScript, styled with plain CSS.
[Bun](https://bun.sh) is the package manager and script runner; Node.js 24 must also
be installed (Next.js runs on it). `engines.node` in package.json pins Vercel to Node
24.x, and CI installs the latest Node 24. Deployed on Vercel through its Git
integration, which runs a plain `next build`.

## Commands

| Command | What it does |
| --- | --- |
| `bun install` | Install dependencies (`bun.lock` is the lockfile) |
| `bun run dev` | Dev server on http://localhost:3000 |
| `bun run build` | Production build (also type-checks) |
| `bun run start` | Serve the production build |
| `bun run lint` | Biome lint + format check (`biome check .`) |
| `bun run format` | Format everything with Biome |
| `bun run typecheck` | Generate Next's route types, then `tsc --noEmit` |
| `bun run test` | Playwright end-to-end tests against `next start` (build first) |
| `bun run check` | lint, typecheck, build and test, in that order (the same steps CI runs) |

The first time you run tests, install the browser: `bunx playwright install chromium`.
If you already have a Chromium build that matches, point Playwright at it instead with
`PW_CHROMIUM_PATH=/path/to/chrome bun run test`. Tests start their own server on port
3123 (or `PORT`), or reuse one that is already running there.

TypeScript is 7 (the native compiler); `next build` and `tsc` both use it.

CI pins Bun 1.4.2, the version that wrote `bun.lock` (lockfile v2); update
`bun-version` in `.github/workflows/ci.yml` when you upgrade Bun. Vercel installs with
the Bun in its build image, so after a Bun upgrade check that the install step of the
next preview deploy passes.

## How the site is put together

- `app/layout.tsx` renders the desk and the masthead once, and `app/(book)/layout.tsx`
  the book (`components/Book.tsx`). They stay mounted across navigations; each route
  in the book only swaps the leaf (the top page of the book). The 404 page renders
  outside the `(book)` group, so `app/not-found.tsx` opens its own `Book`.
- Routes: `/` (Projects), `/projects/[slug]`, `/writing`, `/writing/[slug]`, `/resume`
  in `app/(book)/`, and Super Space's product page, `/projects/super-space`, in
  `app/(product)/`. Everything is statically generated.
- `content/` holds every piece of copy as typed data: `site.ts` (name, tagline,
  socials, tab labels and the other interface text), `projects.ts`, `resume.ts`, and
  the posts in `writing/`. A keyword chip (`{ chip, kind, icon }`) takes its ink from
  the `--k-<kind>` token in `styles/base.css`; a new kind needs only a token.
- `components/` are server components except the few that need the browser:
  `StickerLink` (lift → fly, and the peel by hand from any side, `usePeel.ts` and
  `fold.ts`), `MastFrame` (the masthead's open state), `TabLinks`
  (current tab), `FocusTitle` (a project or post title takes focus when it opens),
  `SkipLink` (Skip to content), `WebMcp` (the tools an AI agent in the browser can
  use, see Tools for AI agents) and `DeskProvider` (runs opening and leaving a project
  as a view transition, see below, and remembers where you came from, so the sticker
  flies back to its own spot). Client components get their text as props from a
  server parent, like their icons.
- `styles/` is plain global CSS, one file per part of the page, imported in cascade
  order by `app/layout.tsx`. `base.css` holds the colour and font tokens;
  `transitions.css` the page transitions.
- Icons are inline SVGs from [Remix Icon](https://remixicon.com) in
  `components/Icon.tsx`. To add one, copy its `<path d="…">` from the icon set into the
  `paths` map. Only server components import `Icon`; a client component gets its icons
  as props (see `Tabs` → `TabLinks`), so the icon set stays out of the browser bundle.
- Fonts (Fraunces and Bricolage Grotesque) load through `next/font/google` in
  `app/fonts.ts` and are exposed as `--display` and `--sans`.

## The Super Space product page

`/projects/super-space` is a product page in Super Space's own identity rather than a
sheet in the book. The masthead still takes the sticker as its header (the root layout
keeps it mounted); below it, in place of the book, a dark stage that the desk's lamp
light fades into. On this page the header sticker is smaller than on the other
projects (it scales with the screen's height; the rules are at the top of
`styles/superspace.css`), so the headline and the install command make the first
screen; in a window under 760px tall (a laptop's, less the browser's bars) it gets
smaller still and the hero's gaps tighten, down to a 600px-tall window.

- Copy and numbers are typed data in `content/superspace.ts`. Keep each number
  exactly as measured, with its qualifier ("in our test", "measured on the Pi", "on
  the Try Omarchy VM"), and mention nothing that is not released.
- The page is `app/(product)/projects/super-space/page.tsx`; its sections are in
  `components/superspace/`. Its fonts, Gloock and Fragment Mono (and Inter, for the
  launcher's panel only), load in that route's `fonts.ts`, for this page only, and
  `styles/superspace.css` and `styles/superspace-launcher.css` are imported by the page
  alone. Next keeps a route's stylesheet after you leave it, so every rule there is
  scoped to `.ss`.
- The home page does not fetch them ahead: a project with a product page
  (`productPage: true` in `content/projects.ts`) gets `prefetch={false}` on its
  sticker, because prefetching the route would make the home page preload the route's
  fonts and stylesheet (and Chrome warns when a preload goes unused). A pointer that
  comes to rest on the sticker for 0.1 s (`INTENT_MS` in `StickerLink`: it has not
  moved more than 4px, `REST_PX`, since; each move further starts the wait again, so
  one crossing it on its way elsewhere fetches nothing, however slowly it goes), the
  focus, or a finger going down calls `router.prefetch` instead (`DeskProvider`'s
  `intent`): with a mouse the page, its stylesheet and its fonts are in by the click,
  and the sticker flies at once; a tap waits for them while the sticker lifts (see
  Page transitions). Once they are in, and the main thread is free, they are put to
  use (`putAhead`): the stylesheet goes into the head as React would put it there
  (every rule in it is scoped to the page, so it changes nothing on the Projects
  page), and the preloaded fonts are loaded, so a pointer that rests on the sticker
  and moves on leaves no preload unused for Chrome to warn about (React, rendering
  the page later, takes that stylesheet as its own). Not once the sticker is
  opening: then React puts the stylesheet in as it renders the page, where only the
  new page is styled for it (put in ahead, the Projects page would be restyled too,
  and the flight would start later).
- Opened in a page transition (from the Projects page, or by Back and Forward), the
  page is put in place inside the transition's update, while the browser draws
  nothing new: there only the hero is built. The sections below it
  (`components/AfterLanding.tsx`) are added once the sticker has landed and been
  pressed down (`whenSettled`: the press runs on the main thread, and a section laid
  out meanwhile would stop it), one a frame; until the last is in, a screen of the
  stage stands in below them (`.ss-later`), so the page scrolls on meanwhile. Each is
  a small task because nothing behind them is drawn to the page's height: the desk's
  lamp light and shade, and the stage's fade in from the desk, are tiles of their own
  height (the rest a plain colour, `styles/desk.css`, `.ss::after`), where a
  background as tall as the page would be drawn again, all of it, each time the page
  grew. Loaded or reloaded, the page is all there from the start, as the server sent
  it, every section at its real height (so a reload or the browser's Back puts the
  reader where they were).

### The launcher

"Press Super+Space" is followed by a copy of the launcher that runs in the browser:
a field you type into, over the demo home, on a screen with Omarchy's bar. It is
recreated from Super Space's own UI (`SuperSpace.qml`, `ui/ResultRow.qml`,
`ui/AnswerCard.qml` in omarchy-super-space) and sized from its screenshots (the panel
is 737px wide at 1x), in the dark warm theme they use, on the flat near-black desktop
(#131212) of those captures: the panel, the theme's menu colour at 81%, comes out at
their (28, 24, 20) with a crisp edge, and the folder tiles' names show faintly through
it as they do there (the captures show no blur). It draws its own caret, as the real
one does (2px, the field's height, steady while it moves); the web row's icon is a
20px bitmap drawn large, as the real row's is.

- `components/superspace/launcher/`: `View.tsx` draws the panel (no state; shared by
  the server and the browser), `Launcher.tsx` runs it (the instant phase on each key,
  the final phase 150 ms after typing pauses, "calm" typing that only adds rows until
  400 ms after the last key, ↑/↓, →/←, Enter, Ctrl+1–9; Tab lists the selected (or top)
  row's parts, as the real one does (screen readers hear the list), and Tab again, or
  Tab on a row with nothing to list, moves on through the page, so it never keeps the
  keyboard; Esc puts a list away and otherwise closes the launcher, as v0.1.4's does,
  and a "Super + Space" button opens it again, empty). Differences on purpose: the
  key hints say what Ctrl+Enter does on the row chosen ("reveal" for a file, "copy
  link" on the web row, "copy" on the rest, which is what this copy does with it),
  and "↓ then ← →" shows only while a row ↓ can reach has parts; and → past a
  row's last part goes round to its first (and ← the other way), where the
  real one stops, because the best part is often the last in time order, as the
  opening search's is, and a key that does nothing reads as broken. `engine.ts`
  is the search (names, with the daemon's title-only typo rule; scope words ported
  from the daemon's `type_words`, a lone plural kind word such as "photos" listing
  that kind; and "meaning": the query's words, a word it does not know read as the
  word one typo away, and the words in `concepts.ts` that mean the same, weighed by
  how rare they are, with cut-offs so a search can find nothing; words that only say
  how a thing looks, `MODIFIERS` ("cute", "lucu"), weigh little, and a word under six
  letters is read as a typo only of a group's word, so "pasta" is not "paste"; one of
  three letters only as a swap, one of four never as a changed letter, so "node" is
  not "note"; small words like "up" and "to" count only inside a group's phrase,
  "pick up", "set up"; an emoji's names are matched whole or from four letters, never
  as a typo, and an emoji typed into the query comes first (ahead of another named
  for the same word: 🥳 is "party" and "birthday" too) and searches for what it
  shows, the first of its words ("🐶" for "dog", not "Dog face"); a clipboard copy is found
  by where it came from, a page of history by its browser, Chrome being Chromium;
  scope words narrow by extension, "pdf", and "songs" to songs, "voice memos" to
  recordings, while "notes" and "application" next to other words are what the search
  is about, "rust notes", "job application", and a kind word at the end of a sentence
  of more than four words is a word of it, not a scope; the order allows four rows of
  a kind before the best row of each other kind, and only those best rows go ahead of
  a better row held back),
  `answers.ts` the
  quick answers (maths, units, currency and time zones ported from the daemon's
  `crates/answers`; "0x10" and "1.000,5" are not read as sums, and a home zone the
  browser names by its old name, Asia/Calcutta, is said by its new one, Kolkata), and
  `corpus.ts` / `documents.ts` the demo home (from the demo's `make_docs.py` and
  `make_media.py`). Under an answer the search reads only the words the answer does not
  ("12 times 12" finds no "time", "1 fl oz to ml" no flight).
- `concepts.ts` knows the demo's words in English and Indonesian, and the main ones
  (dog, cat, beach, coffee, money, breakup, …) in ten more languages (`WORLD`); the
  emoji have their names in those languages too (`corpus.ts`). A translation that is
  also an English word ("chat", "pain", "mar") is left out. When nothing matches and
  the query has words this copy does not know written past ASCII ("Hündchen",
  "собака"), the panel says under "Nothing on this computer matches" which languages
  this copy knows; gibberish and English words get the plain notice.
- Currency uses the ECB's euro reference rates (`lib/ecbRates.ts`), fetched when the
  page is built and again once a day (the page revalidates daily); the card names the
  day ("ECB rate of 20 Oct 2026"). A build that cannot reach the ECB gets no rates, and
  the card says it cannot convert instead of showing a number.
  A daily refresh that cannot reach the ECB fails on purpose, so Next.js keeps serving
  the page it has. To check the answers against the real crate, run the cases in
  omarchy-super-space's `crates/answers/tests/table.rs` through `answer()` with that
  test's rates: all 296 match.
- The demo's photos and video frames are other people's (Wikimedia Commons, listed
  with their licences in `content/superspace.ts` as `demo.pictures`). Each one shows
  as its real picture once `public/projects/super-space/demo/<scene>.webp` is there
  (122 × 122 for a photo, 174 × 98 for a frame), with its credit under the screen
  (folded, "Picture credits"). Until then the photo is left out of the demo home, and
  a video's moment without its frame is not found (it keeps its place in the file), so
  a search never shows a blank tile: the page passes the pictures it has to `search`
  (`pictures`), and they come back by themselves once the files are added.
  16 of the 31 are there: the same Commons files, taken from copies that other
  projects host on GitHub (Commons itself could not be reached when they were made),
  checked by eye against their titles, cropped (a photo to its middle square, a
  frame to 16:9) and scaled down, which the credit says; the cat chasing the laser is
  a frame of the real clip, at 10 s. `bun scripts/demo-pictures.ts` makes the rest
  from Commons itself (it needs the network and ffmpeg; check each before you commit
  it; `--force` remakes them all from the originals). The dog swimming
  (`dog-swimming.webp`) is a frame of the real video, from Super Space's own
  screenshot. The scanned receipt and the terminal screenshot (`scan`, `terminal`,
  `demo.own`) are drawn as the demo's own make_media.py draws them (CC0, no credit
  needed).
- Opening anything only says, in a toast (a polite live region), what the real
  launcher would do ("Would open apartment-lease-new-farm-2026.pdf at page 3");
  Enter on an answer copies it.
- The page draws the launcher's first frame on the server (`LauncherFrame.tsx`,
  inert); `LauncherIsland.tsx` loads the launcher and its index (a chunk of their
  own, about 57 KB gzipped) when they come within 300 px of the screen, or when an
  example search under the screen is pressed, and swaps them in (a failed load is
  tried again on the next press). Opened from the Projects page, it starts watching
  for that only once the sticker has landed and been pressed down (`whenSettled` in
  `DeskProvider`), so loading and building it does not take the main thread from the
  flight, nor from the fold being laid down after it. The field never takes the focus by itself; an
  example pressed with a mouse or a key puts the caret at the end of its search. On
  a phone the examples are under a screen taller than the panel: one pressed when
  the panel is above the top of the window scrolls the page back up to it. The
  search row takes a press 44px tall (a `::before` past its edges), and a press
  anywhere on it puts the caret in the field: a mouse's as it goes down, a finger's
  only once it is a tap (a finger going down there may be scrolling the page).
- The launcher's words (the field's name and placeholder, what screen readers hear,
  the empty notice) are `superSpace.demo.labels` in `content/superspace.ts`.
- For screen readers the field is a labelled combobox over a listbox of results
  (`aria-activedescendant` once ↓/↑ choose a row); each result is named shortly (what
  it is, where Enter lands, the start of the passage), and a status line says how many
  results there are once typing pauses, and which page or moment ←/→ picked.
- To check the search against the real one, the daemon's golden queries
  (`tests/golden.json` in omarchy-super-space) can be run against `engine.ts` (183 of
  its 186 pass; the other three need files this copy leaves out); when you change
  `concepts.ts` or the cut-offs, make sure "apartment lease bond", "golden retriever
  video", "songs about a breakup", "wifi connect", "anjing" and "apps firefox" still
  find what the real launcher does (`tests/superspace.spec.ts`).

### The beats

- The beats never show the launcher's panel again: "Inside your files" and "Photos
  and video moments" set their search's result large in type (`superSpace.finds`),
  "One box for everything else" sets what else it finds as one large line, and the
  scope words have a beat of their own. The launcher opens on the video search, so its
  first search is not the one the next beat sets out. The beats take turns in layout
  (side by side either way, centred, the full-bleed band for the Pi, then the search
  speed in a beat of its own, as it was measured on the VM), so the page builds
  instead of repeating one block.
- "Runs on a Raspberry Pi 5" is the Pi itself: a photo by Simon Waldherr (CC BY-SA
  4.0, via Wikimedia Commons, "Raspberry Pi 5 Board.jpg"), cropped (x 104, y 0,
  1680 × 1170 of the 1920 × 1280 original) and saved as WebP in
  `components/superspace/raspberry-pi-5.webp` and served through `next/image` (it
  loads as you near it), with the measured numbers set over its foot. Its licence
  asks for the credit under it (and to say it was cropped): keep it there. The credit
  links "Wikimedia Commons" to the photo's own file page
  (`superSpace.pi.photo.credit.source`).
- Media slots: the screenshots and demo clip appear once their files are in
  `public/projects/super-space/` (`demo.webm` and/or `demo.mp4` with `poster.webp`;
  `lease.webp`, `video.webp`, `songs.webp`). The page checks at build time, so add the
  files and rebuild; without them it leaves those slots out.

## Page transitions

Opening a project and leaving it run as a same-document
[view transition](https://developer.mozilla.org/docs/Web/API/View_Transition_API):
the sticker flies from its spot on the Projects page into the header (and back), the
book and the socials move to where the new page has them, and what differs is swapped
in place, quickly. `DeskProvider` runs it, for every way
in and out: a sticker click or peel (see Peeling a sticker), the Back arrow, a tab,
Super Space's "All projects" link (`BackToProjects`), and the browser's Back and
Forward (a trackpad swipe included).

- The book sticker and the header sticker share one `view-transition-name`,
  `stk-<key>` (`stickerName` in `DeskProvider`), set inline by `StickerLink` and
  `MastFrame`, so a new project needs nothing extra. On the Projects page only the
  sticker that flies carries it (the one clicked, or the one coming home): a named
  sticker that does not fly would leave the page on its own and drift apart from the
  book.
- While a transition runs (`<html data-vt>`) the book (its tabs with it) and the
  masthead's socials are named too (`book`, `socials`, `styles/transitions.css`): both
  pages have them, at different heights (the masthead is taller with a sticker in
  it, 169 px at 1440 wide), so each moves there on the flight's timing, rather than
  the two layouts showing at once, two rows of tabs a fade apart. In the book only
  the leaf's page changes: the old one fades off the new one. They move as far as
  the two pages have them apart (a project opens at the top, so from far down the
  Projects page the book comes down most of a screen, as the page scrolling back up
  would), but from no further than a screen away (`tuneFlights`): back from far down
  a long page, a slide of thousands of pixels would only be a streak. Super Space has
  no book: going there, the old book fades with the old page. Leaving it, the new
  book is not named at all (`data-vt-page`, set in the update, before the new page is
  captured): it is part of the new page, under the old one as that fades off, where
  a named book would be drawn over the old page from the first frame, cutting its
  headline away. Coming back from further than a screen away (from far down a long
  project, or Super Space's foot), the book and the socials are the new page's in
  the same way, in place, rather than sliding a screen over the new header as it
  stands still. Nothing else is named: a product page's
  stage (Super Space's is 11,000 px tall) and the masthead are the page (the
  transition's root). A named element is captured on its own: the book and the
  socials are layers of their own at all times (`will-change: transform`), so the
  capture takes them as they are drawn already, where naming them only as the
  transition starts would have the browser draw them (and the page behind them)
  again, in the moment the screen holds still before the flight.
- The timing is in `styles/transitions.css`: one duration and easing for every
  flight and move, opening and leaving alike (`--vt-dur`, 0.44 s; `--vt-ease`), and
  `--vt-fade` (0.1 s, front-loaded, `--vt-fade-ease`) for the old page and the old
  leaf fading off the new ones: only two frames show the old at more than a third.
  The new page is there from the transition's first frame, under the old one as it
  fades, so no frame shows neither (the screen never dips to the dark under the desk)
  and nothing is blended.
- Only transform and opacity animate, so the compositor runs the flight without the
  main thread. Where the two ends of a morph differ in size (the sticker on the page
  and in the header), the browser would animate its group's width and height, on the
  main thread; once the transition is ready, `tuneFlights` holds each group at its
  landing size and folds the change into its transform as a scale (the same
  picture). The new page is live under the flight, so it puts its work off until
  the sticker has landed and been pressed down (`whenSettled()`, 0.42 s after the
  landing: the press is a main-thread animation): Super Space adds its sections
  below the hero then, and its launcher waits for it before it loads. The page under the snapshots holds still meanwhile
  (`holdScroll`: a wheel, a finger or a scrolling key does not move it), as the
  flight lands where the header was when it started.
- The navigation happens inside `document.startViewTransition`, which waits until the
  new page is on screen (its own layout effects have scrolled it and moved focus) and
  the fonts its first screen is laid out in have loaded (at most 150 ms; they were
  fetched ahead, see below) before it captures it. The browser draws nothing new
  meanwhile, so the flight only starts once the page's data is in. A sticker whose
  page is in (Next.js prefetched it as it came into view, or a pointer on a product
  page's sticker did) flies at once, in the click's own task, from the pose it is in:
  the flight is its lift. So does one peeled off by hand, in the task it is let go in,
  from the fold it was let go in (see Peeling a sticker). One whose page is still on
  its way (a tap on Super Space, which has no hover to fetch it ahead) lifts off the
  page (0.1 s; one peeled off keeps its fold, and flies as soon as the page is in) and
  waits, lifted (and bobbing after 0.2 s, by transform alone, so the compositor
  keeps it going while the page comes in), until the page's data has come in, with
  the stylesheet, fonts and scripts it asked for ahead: `DeskProvider` counts
  Next.js's requests for a page's data (`?_rsc=`) as they go through `fetch`, notes
  each preload and each script of its components that goes into the head while a
  page's data comes in as that page's, and checks a page's own preloads against the
  fetches that have finished (Resource Timing), and its scripts against their `load`:
  a page already in is not held back by another page's fonts still on their way (a
  pointer that crossed Super Space's sticker on its way to Basilica's), and React has
  the page's components to render it with before the screen holds still for it. A
  page that takes more than 1.5 s opens as a plain navigation instead, and a
  transition's update never holds the screen for more than 1.2 s, the page, its
  stickers' images and its fonts all within that one deadline (the browser's capture
  of the two pages comes on top). A press shows at once: a sticker comes up a little
  as the pointer goes down (`data-pressed`, on the sticker itself, so the flight
  starts from it as it is; on its edge, which may be a peel, as it lets go, if it was
  a tap), and a finger on the Back arrow or a tab shows them
  pressed (a touch gets no `:active` until the tap is over), so the screen answers
  before the transition holds it still. A project opens at the top with its title focused;
  coming back puts the Projects page where it was when the project opened (as the
  browser's Back would), the sticker focused, and scrolls only as far as it takes to
  bring the whole sticker on screen (to the middle only for one that would be off it).
  A page still coasting from a flick when Back or Forward is pressed stops there
  (`stopCoasting`: the root is held at `overflow: hidden` for two frames, which ends a
  fling), so the next page lands where it puts itself.
- Back or Forward pressed as the flight starts wins: the flight's own step is
  dropped; pressed during the flight, the flight ends where it is and the step
  happens at once. A flight longer than a screen (back from the foot of a long page,
  `data-vt-far`) starts just past the edge of the screen (`tuneFlights` moves the far
  end of its keyframes). A sticker with no partner (the header sticker, to Writing or
  Resume) sinks away or rises rather than lie over the page.
- The browser sends a click made during a transition to `<html>` under its
  snapshots. A press never cuts the flight short: the click waits for it to land, and
  then goes to the new page's Back arrow if that is what is under the pointer (a quick
  "Back" right after opening). Any other press made during the flight is dropped: what
  is under the pointer on the new page (a sticker, a tab, a social link) is not what
  the reader could see there. The second half of a double click, or a re-tap where
  the click that started the flight was, is dropped too.
- The Back arrow and "All projects" step back in the browser's history when the page
  before is the Projects page (the Navigation API knows; the project was opened from
  it), so the browser's Back does not open the project again; otherwise (a project
  opened from a link elsewhere, or a browser without the Navigation API) they go to the
  Projects page as a new step. Tabs always add a step.
- Back and Forward: Next.js handles `popstate` synchronously, which would swap the
  page before the old one could be captured. A capturing `popstate` listener holds the
  event back, starts the transition, and dispatches it again to Next.js from inside
  the transition's update. A step the browser already animated (a swipe that showed
  the page, `hasUAVisualTransition`) is left to Next.js, untouched.
- React's `<ViewTransition>` (React 19.3 with Next.js 16.4) animates link clicks and
  `router.push`, but starts no transition for Back and Forward (React flushes a
  `popstate` update synchronously), so the site does not use it.
- With reduced motion, or in a browser without view transitions (they need Chromium
  111+, Safari 18+ or Firefox 144+), every navigation is instant; a sticker's click
  still notes where the Projects page was (`desk.remember`), so coming back puts it
  there.
- `tests/transitions.spec.ts` checks that the stickers share the name, that every
  way in and out morphs, that the book and the socials move by transform with the
  flight (from far down the Projects page too, from no further than a screen) and
  the old leaf is gone in 0.1 s, that leaving Super Space the first frame is the old
  page whole (the book under it, not over its headline), that coming back from far
  down a project nothing slides a screen over the header, that a prefetched sticker
  flies at once with nothing but transform
  and opacity animating while the launcher waits for the landing, that one whose
  page is in is not held back by another page's fonts, that a lifted one waits for
  its page's scripts, that a wheel turned during the flight does not scroll the page,
  that a press shows at once, and that Super Space puts in only its hero during the
  transition and until the landed sticker is pressed down (and all of itself on a
  load);
  `tests/viewTransitions.ts` records what each transition the page starts really
  animated. To measure a transition (the time from the click to its first frame, the
  update, long tasks, dropped frames, layout shifts), drive the production build
  with Playwright and Chrome's tracing; headless Chrome without a GPU rasters and
  composites in software, so its frame rates say little about a real screen, but its
  main-thread numbers do. (Do not read a pseudo-element's computed style for a
  name the running transition does not have, `getComputedStyle(html,
  '::view-transition-new(book)')` with no book named: the Chromium the tests use
  crashes on it.) Throttled four times, Super Space's update is mostly React
  putting the new page in place and the style and layout of its first screen
  (forced as its title takes the focus), which the browser must have before it can
  capture the page.

## Peeling a sticker

"Peel a sticker to read about it" is literal: on the Projects page each sticker can be
taken by its edge, from any side or corner, with a mouse or a finger, and peeled back
(`components/usePeel.ts`, used by `StickerLink`; the geometry is in
`components/fold.ts`).

- The fold is a paper fold: the point of the outline taken hold of (P) goes where the
  pointer takes it (Q), and the fold is the line halfway between them (the
  perpendicular bisector of PQ). The face keeps the side of the fold away from P
  (`.stk-cut`, a clip-path polygon); the backing's part on P's side is mirrored
  across the fold (a CSS `matrix()` reflection) and clipped to it, as the flap
  (`.stk-hand`). The flap is the backing image used as a mask (`--back`), so its
  outline is the backing's own alpha whatever the sticker (the seal's points, the
  stamp's perforations, the card's rounded corners), and it is shaded in from the
  outline along the fold's normal with the backing's own gradient (its stops and its
  run, read off the file, `learnShade`: the seal's darkens over less than half the
  distance the card's and the stamp's do), so a corner taken over from the
  stylesheet's flap looks the same. The flap is laid out from the start, with nothing
  to draw until a fold: hidden until the first one, its mask would only be fetched
  then, and the flap would draw nothing for the frames that took (the corner taken
  over cut off, with no flap). A pose is kept in units of the width (`Hand`), so the
  header sticker can draw it again at its own size.
- The outline is read off the backing image once it has loaded (`learnHull`: the
  convex hull of its opaque pixels); until then the stylesheet's shape stands in
  (`--disc` or `--round`). A press takes hold of the point of the outline furthest out
  the way the paper there faces (`grip`: square to a side, turning round a corner
  over `--gz`), so nothing past the outline folds before the pointer moves. The fold
  turns with the pull (`--fold`), up to 33° on a side and 60° at a corner (where no
  straight run of the outline longer than a sixth of the width faces out: a rounded
  corner, or the stamp's cut one, read off pixels), but only as far as the paper it
  would lift beyond P stays within the fold's depth (`swingRoom`): a corner turns
  freely, so one pulled along a side folds square to it and stays under the pointer,
  and a straight side turns only a little at first, more the further it is pulled. A pull that
  leans further than that slides P along the side toward the way the pointer went
  (`regrip`, as a fingertip dragged sideways slides along an edge), just as far as
  the fold is square to the pull: the paper stays under the pointer, and the fold
  close to square, instead of the paper slipping out from under it. A round sticker
  (`--disc`) has no side to stay square to: its fold turns as far as the pull (80° at
  most, as `swingRoom` allows).
- The grip is a band all round the outline (`.stk-grip`, `styles/stickers.css`):
  26px across with a mouse (18px in, 8px out), 46px with a finger (28px in, 18px out),
  a ring round the seal's disc (and round its ribbon's tails, which reach past the
  disc below it) and a rounded rectangle round the others, with a grab cursor. A
  press anywhere else on a sticker is a click, never a drag of the link (it is not
  draggable). Its parts are shapes hit-tested through their clip-paths: `.stk-grips` cuts
  the band's outside, and the middle, `.stk-mid` (on top), is the sticker as a link,
  where a finger scrolls the page and a tap opens it. The band is four grips, each
  letting the browser scroll a finger the way that can never be a peel there
  (`touch-action`, with `pinch-zoom` so two fingers zoom): the sides up and down
  (`pan-y`: a move more along the vertical than across it is the browser's), the top
  a finger going up (`pan-down`), the bottom (which reaches round the bottom corners)
  a finger going down (`pan-up`). On the seal the sides are the sectors within 30° of
  the horizontal, so their way in is always across.
- The rest of a touch is read in its first 10px (`START_CONE` and `START_LEAN` in
  `usePeel.ts`): within 60° of the way into the sticker from where it took hold, and
  leaning at least 30° off the screen's vertical (a tilted sticker's way in can be
  nearly upright, and a thumb scrolling the page goes up the screen), it peels; so it
  does straight along the vertical when the finger held still a moment first
  (`HOLD_MS`, 140 ms: a hand taking hold of an edge does, a thumb flicking the page
  moves within a frame or two); any other way it scrolls, by hand (`usePeel` scrolls
  the page with the finger and lets it glide on after a flick, with reduced motion
  too: momentum is the reader's own motion, and the browser keeps it there). So the
  left and right edges peel across, the corners along their diagonals, and the top
  and bottom edges leaning, or straight in after a moment's hold: a quick straight
  move down the screen from a top edge scrolls the page back up, and at either end of
  the page, where there is nothing to scroll that way, it does nothing (a thumb
  flicking for more page there must not open a project). A held finger's straight
  peel that sets off faster than a swipe (1000 px/s, `HELD_SWIPE`) before it is far
  enough to come off was a swipe after a pause: it is handed back to scrolling; and it
  opens only by being pulled far enough, never by a flick. A peel from the top or the bottom that turns
  along the screen's vertical before it is far enough to come off (its last 40px,
  `TURN_SPAN`, within 30° of the vertical, up from the bottom or down from the top: a
  thumb's arc) is handed back: the paper goes down and the page scrolls, making up
  the way the finger went meanwhile without a jump (half again as fast as the finger,
  until level). Where `pan-up` is not supported, every touch on the top and bottom
  grips is read that way. A mouse has nothing to scroll and takes hold whichever way
  it pulls.
- The paper follows the pointer (in the sticker's own, tilted frame). Its travel gives
  less and less past a peel of 0.46 (a rubber band that never quite stops: half of the
  first 0.15 of extra pull, less of any more). Pushed back from there, it comes back
  with the pointer at once: what the band held back is let go of (`slack`). It then
  works its way back under the pointer: pushed further back, the slack shrinks with
  the pull (so it lies flat just as the pointer reaches where it lies flat), and
  pulled in again, it gains half of each move on the pointer. The drag writes
  `--drag` (how far it is peeled) and `--fold`, and the sticker's `data-peel` says
  what drives the fold: `drag`, `spring` (laid back down), `off` (let go to open),
  `hover` (a mouse over an edge, below) or `hint`; `data-hand` is set while a fold by
  hand is drawn.
- A mouse over an edge (not the bottom-right corner, which lifts by itself) lifts
  that edge a little by hand (0.08, `HOVER_PEEL`, with the spring), and the corner
  stays at rest meanwhile. On a straight side the fold is square to it, so the side
  lifts along its length as one strip (paper folded along a straight line has no
  one place to lift); round a corner, and on the seal, it turns with the pointer. It
  lies back down when the pointer leaves the edge (over the middle the corner lifts,
  as it always has). A press there takes that lift over as it is, and a click flies
  from it.
- The bottom-right corner also lifts by itself: just at rest (`--rest`), so there is
  something to see; a little more on a touchscreen (`pointer: coarse`), where nothing
  else shows it; more on hover (`--hover`) and in a click's lift. That fold is the
  stylesheet's own (the 45° line x + y = k, from `--peel`). A press on that corner
  takes it over as it is (`data-took`: the corner's own fold drops to nothing at once
  and the hand's draws the same pose); a press anywhere else lays the corner down
  (0.16 s) while that side lifts, and it comes back up as the fold springs back. Each
  fold cuts the other's face, so when both show, the deeper one wins. A lift taken
  over (the corner's, or an edge's under the mouse) counts for nothing toward opening
  it, nor toward the band (`base`): every side opens after the same pull. Pressed on
  the spot the lift left (a mouse on a hovered corner is there, short of its curl),
  the pointer has no paper under it: the paper's tip, ahead of it, keeps its place
  at first and then gains on it (`lead`, eased away over twice its length), so after
  a short pull the paper is under the pointer, and stays so; pressed on the curl
  itself, the curl moves with it from the start. The same goes the other way: a press
  inside the outline (a finger's grip reaches 28px in) has the paper's edge behind
  the finger, and the edge gains on it over twice that gap (as does a press on the
  band outside the outline, with the edge ahead), counting for nothing toward
  opening it either.
- Let go with it pulled past 0.34 (the pointer's travel as a part of the width · √2;
  the sticker rises a little there, about the point taken hold of so it stays under
  the pointer, `data-ready`, and a phone that can gives a 10 ms tick, once a press),
  or flick it in (600 px/s the way the pointer has pulled it, within 30° of that way,
  after 30 px, the pull itself within 60° of straight in), and it comes off. The way
  is the pointer's, not the fold's: on a straight side the fold stays close to square
  while the point held slides along it (`regrip`), the paper under the pointer going
  the pointer's way. A finger's flick from a top or a bottom edge must lean to peel
  at all (`START_LEAN`), and that leaning flick, however far it leans (to
  `START_CONE`), opens as one straight in from a side does. Once far enough, it stays so until pushed back 0.02 under the line
  (`READY_GIVE`, about 6px), so a finger resting on the line does not flicker the cue,
  and letting go does what the cue last said. Off, it keeps that pose (its own corner
  stays down, `--lift: 0`) and flies into the header from it (`open(href, true)` in
  `DeskProvider`): with its page in (prefetched as it came into view, or fetched since
  a pointer came onto a product page's sticker), at once, in the task it was let go
  in, as a click's flight starts (see Page transitions); otherwise as soon as the page
  is in, waiting in that pose meanwhile (risen off the page, its corner down, bobbing
  after 0.2 s). Called off before it flies (Back or Forward won), it springs back
  down. The header sticker takes the same pose before the transition captures it
  (`takePose` in `DeskProvider`, which draws the fold again at the header's size), so
  the cross-fade between the two images is between two of the same, from whichever
  side it was peeled, risen as it was (`data-risen`: the same 1.025 about the same
  point of it); once it has landed its fold and corner are pressed down flat, and it
  comes down onto the page (the fold by script, `layDown`; the corner and the rise by
  `data-press`, `styles/masthead.css`).
  A click's pose (at rest or on hover, or lifted while its page loads) hands over the
  same way. Let go sooner, or while pushing it back down (400 px/s, read from the
  pointer, which paper held back by the band may hardly show), and a short spring
  (stiffness 520, damping 0.6) lays it back down: a side flat, square again, and the
  corner to rest (or to the hover peel, under a mouse still on it), handed back to the
  stylesheet just as it lies.
- A press that does not move, or wanders less than a tap does (15px for a finger,
  6px for a mouse), is a tap or a click and opens the sticker as before; so do
  Enter and Space; a modifier or middle click opens a new tab. A drag's own click
  is dropped, but only until the next press, and so is a click while the paper is
  still in hand (the main button let go with another held). A mouse moving with no
  button held lets go of the paper (its button came up where the page did not hear
  it), and opens nothing. A second finger ends a peel without opening anything. A
  press on the middle comes up at once (`data-pressed`, Page transitions); one on the
  edge, which may be a peel, only as it lets go as a tap or a click: paper being
  peeled does not hop first.
- Space opens a sticker, as Enter does, though it is a link: the brief asked for
  "Enter/Space" to open a sticker, so a sticker behaves as a button does there,
  where a link would scroll the page. Every other link keeps the link's keys.
- Once a visit (`sessionStorage`), when the stickers first come into full view,
  the first of them lifts its corner and lays it back down (`stk-hint`), then its left
  edge does the same, as far (0.18, `EDGE_PEEL`), by hand, so it is seen that any side
  lifts: not with
  reduced motion, and not once a sticker has been peeled. A pointer or the focus
  arriving on it while it plays ends it, and the paper goes from where it was to the
  hover (or rest) peel, with the spring.
- After a project opened with a pointer (a click, a tap or a peel), the sticker
  that comes back is focused but quiet (`data-quiet`): no ring and no lift until a
  key is pressed. Chrome would show the ring there after a peel, which focuses
  nothing, so its script focus counts as the keyboard's (`lastInput` in
  `DeskProvider`).
- With reduced motion the paper still follows the pointer (the reader moves it), but
  it goes back down without the spring and opens without the view transition; an
  edge under the mouse lifts at once.
- `tests/peel.spec.ts` drags with a mouse from every side and corner, and with
  touches sent through Chrome's own input (CDP), so touch-action and scrolling are
  real; a flick's touches carry their own times, so its speed does not depend on how
  busy the machine is. By touch it peels the top and bottom edges straight in after a
  hold, opens them by a quick flick that leans, keeps quick straight flicks at the
  page's ends from opening anything, hands a swipe after a pause back to scrolling,
  keeps the paper under a leaning finger, brings it under one that took hold well
  inside the edge or just outside it, and keeps a press that peels from hopping
  first; with a mouse, an edge lifts on hover,
  the hovered corner needs the same pull as any side and comes to be under the
  pointer, a corner pulled along a side stays under it, a click while the paper is in
  hand opens nothing, nor does a peel whose button came up unheard, the hand's flap
  has its mask before the first press and each sticker's own shade, and the seal's
  ribbon tails are grips. It also checks the hand-off: peeled off with its page in,
  the transition starts in the release's own task with no lift, the flight animating
  transform alone; peeled off past the line, the header sticker lands risen as it
  was; peeled off before its page is in, it waits in its fold, its corner down, and
  flies from it once the page comes.

## Tools for AI agents (WebMCP)

The site hands an AI agent in the browser four tools through
[WebMCP](https://github.com/webmachinelearning/webmcp), so it can use the site as a
visitor does:

| Tool | What it does |
| --- | --- |
| `list_projects` | Every project on the Projects page, in its order: slug, name, year (when there is one), caption, the URL of its page on vincenth19.com, and its links where it has any (Super Space's from `content/superspace.ts`, with its install command) |
| `open_project` | Opens a project in the tab (`{ project: "<slug>" }`), as a visitor would, and answers with the page's `url` and `title` once it is shown |
| `get_resume` | The resume page's note and jobs, and its URL |
| `get_contact` | The email address, the masthead's links and the site's URL. It only reads: it sends nothing |

- `lib/webmcp/tools.ts` holds them, as plain data and functions; `lib/webmcp/types.ts`
  types the API (TypeScript does not have it yet). Their titles and descriptions are
  in `content/site.ts` (`agentTools`), with the site's other words. Every answer is
  read from `content/`, the same data the pages show: nothing is typed into a tool,
  so a project without a year or links (Basilica, for now) has none in its answer
  either.
- `components/WebMcp.tsx`, in the root layout inside `DeskProvider`, registers them
  once per page load, so they work from every page, and takes them away when it
  unmounts (it aborts their signal; React's StrictMode and a hot reload in `next dev`
  do that, and register them again). Only a browser with WebMCP downloads them:
  `WebMcp` looks for `document.modelContext` (or `navigator.modelContext`, Chrome's
  earlier preview) and only then imports `lib/webmcp/tools.ts`, which is a chunk of
  its own with the content it reads. (That is why the tools read `content/` directly
  rather than getting their words as props: as props, every visitor would download
  them.) A browser that refuses a tool (its name taken, a page not allowed tools) is
  not the visitor's problem: the refusal is dropped, and nothing is logged.
- `open_project` opens a project the way a visitor would. On the Projects page it
  clicks the project's sticker (scrolled into view first if it is off screen), so the
  sticker flies into the header as it does for a click (`StickerLink`, `DeskProvider`'s
  `open`); from any other page it goes through `DeskProvider`'s `navigate`, which runs
  the project transition a link gets, or, where the desk would not animate (reduced
  motion), a plain navigation. A flight already on its way lands first
  (`whenSettled`), and calls that come together (an agent may send several in one
  turn) take turns, each starting once those before it have answered: the desk,
  busy with the first, would drop the second. It answers once the page is shown and
  its transition has settled, gives up 6 s after its turn comes, and stops waiting
  when the agent aborts it (a sticker already clicked still opens its project). A
  slug the site does not have is refused. The agent learns only that the call failed
  (a rejection reaches it as an `OperationError`, its message stays in the page), so
  what it has to go on is the input schema's `enum` of slugs and `list_projects`; a
  tool that should tell the agent something answers with it rather than rejecting.
- To add a tool, add it to `siteTools` in `lib/webmcp/tools.ts`: a snake_case name, its
  title and description in `site.agentTools` (what it returns or does and when to use
  it, written for the agent; its key goes in the `Site` type's `agentTools` too, in
  `content/site.ts`), an `inputSchema` (a JSON Schema object; one that takes nothing
  is `{ type: 'object', properties: {}, additionalProperties: false }`), `annotations`
  (`readOnlyHint: true` for one that only reads) and `execute`. Read what it returns
  from `content/`. In `tests/webmcp.spec.ts`, add its name to `NAMES` (the tests
  count the tools from it) and a test that compares its answer with what the page
  shows.
- To try them: no browser turns WebMCP on by default yet. In Chrome, turn on
  `chrome://flags/#enable-webmcp-testing` and relaunch, open the site, and use
  Chrome's Model Context Tool Inspector extension (Chrome 150 and later) to list the
  tools and call them.
- `tests/webmcp.spec.ts` gives the page a stand-in for `document.modelContext` (the
  Chromium the tests use has none) that does what the spec says, and calls the tools
  as an agent does (a rejection comes back only as an `OperationError`). It checks
  that the four tools register once and stay through every way round the site, that
  what they answer is what the pages show, that `open_project` opens each project
  from every kind of page with the site's own transition, and two sent at once one
  after the other, and that a browser without WebMCP never downloads them. A test of
  the browser's own WebMCP runs only where the flag is on.

## Where the site differs from the design prototype

On purpose, and nowhere visible in the design's 390px and 1440px frames:

- A "Skip to content" link is the first Tab stop.
- On screens under 760px the Writing list puts each post's date above its title
  (the prototype never showed a post, and its date column leaves the title little room).
- Under 360px a project title drops from 42px to 36px, so "CovidTracker" fits the leaf,
  and the tab labels shrink a little; under 340px the socials split 4 + 3.

## Add a writing post

One file: see [`content/writing/README.md`](content/writing/README.md).

## Add or edit a project

Edit the entry in `content/projects.ts` (for Super Space, `content/superspace.ts`; its
entry in `projects.ts` only holds the sticker and the caption). Leave out the optional fields you don't know
yet (`year`, `body`, `tries`) and use an empty array for `links` or `facts` you don't
have: the page simply omits what is missing. To show a real screenshot instead of the
"Screenshot coming soon" print, put the image in `public/img/` and add
`snap.screenshot: { src, alt }`.

A new project also needs a sticker, because the Projects page is a hand-placed collage:

1. Put the sticker art and its flat backing silhouette in `public/img/`
   (`<key>.svg` and `<key>-back.svg`) and reference them in `sticker`. Browsers cache
   `public/img/` for a day (see `next.config.ts`), so a changed image can take that
   long to reach returning visitors; give it a new file name to show it at once.
2. In `styles/stickers.css`, add `.stk--<key>` with the art's `--ratio` (height / width),
   `--d0` (where the die-cut outline meets the bottom-right diagonal, as a fraction of
   the width), `--rest` (how far the corner is lifted at rest, just enough to see),
   `--hover` (how far the corner lifts on hover), and the outline's shape for its grip:
   `--disc` (a round one: its radius, as a fraction of the width) or `--round` (its
   corner radius, as a fraction of the width; 0 for square corners). Peeling it by
   hand from any side needs nothing more: the fold reads the outline off the backing.
3. In `styles/projects.css`, place `.slot--<key>` on the 12-column grid and give its
   `.stk` a size (`--sh`) and tilt (`--tilt`), plus the mobile sizes.
4. In `styles/masthead.css`, set the header size: `.slap .stk--<key> .stk-body { --sh }`.
   The flight between the two needs nothing more: both stickers take their shared
   view-transition-name from the key.

