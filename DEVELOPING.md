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
  `StickerLink` (lift → fly, and the peel by hand, `usePeel.ts`), `MastFrame` (the masthead's open state), `TabLinks`
  (current tab), `FocusTitle` (a project or post title takes focus when it opens),
  `SkipLink` (Skip to content) and `DeskProvider` (runs opening and leaving a project
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
  fonts and stylesheet (and Chrome warns when a preload goes unused). A pointer on the
  sticker (or the focus, or a press) calls `router.prefetch` instead (`DeskProvider`'s
  `intent`), and a click waits for the page while the sticker lifts (see Page
  transitions).

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
  and a "Super + Space" button opens it again, empty). One difference on purpose: →
  past a row's last part goes round to its first (and ← the other way), where the
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
  as a typo, and an emoji typed into the query comes first and searches for what it
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
  tried again on the next press). The field never takes the focus by itself; an
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
the sticker flies from its spot on the Projects page into the header (and back), while
the book moves to its new place and turns its leaf, Super Space's stage rises where the
book was, and the rest of the desk cross-fades. `DeskProvider` runs it, for every way
in and out: a sticker click (the sticker lifts for 0.1s first) or peel (no lift: the
peel was one, so it flies as soon as its page is in; see Peeling a sticker), the Back
arrow, a tab,
Super Space's "All projects" link (`BackToProjects`), and the browser's Back and
Forward (a trackpad swipe included).

- The book sticker and the header sticker share one `view-transition-name`,
  `stk-<key>` (`stickerName` in `DeskProvider`), set inline by `StickerLink` and
  `MastFrame`, so a new project needs nothing extra. On the Projects page only the
  sticker that flies carries it (the one clicked, or the one coming home): a named
  sticker that does not fly would leave the page on its own and drift apart from the
  book. The book, a product page's stage and the socials are named only while a
  transition runs, when `<html>` carries `data-vt="open"` or `"close"`. The timing is
  in `styles/transitions.css`. The desk's own name and tagline (or a product page's
  headline) fade out before the new page's fade in; between the two the desk shows
  through, as `<html>` takes the desk's background while `data-vt` is set
  (`styles/desk.css`), so the screen never dims.
- The navigation happens inside `document.startViewTransition`, which waits until
  the new page is on screen (its own layout effects have scrolled it and moved focus)
  before it captures it. The browser draws nothing new meanwhile, so a clicked
  sticker waits, lifted (and bobbing after 0.2 s), until its page's data has come in
  before the flight starts: `DeskProvider` counts Next.js's requests for a page's data
  (`?_rsc=`) as they go through `fetch`. A page that takes more than 1.5 s opens as a
  plain navigation instead, and a transition never holds the screen for more than
  1.2 s. A project opens at the top with its title focused; coming back puts the
  Projects page where it was when the project opened (as the browser's Back would),
  the sticker focused, and scrolls only as far as it takes to bring the whole sticker
  on screen (to the middle only for one that would be off it). A page still coasting
  from a flick when Back or Forward is pressed stops there (`stopCoasting`: the root
  is held at `overflow: hidden` for two frames, which ends a fling), so the next page
  lands where it puts itself.
- Back or Forward pressed as the flight starts wins: the flight's own step is
  dropped; pressed during the flight, the flight ends where it is and the step
  happens at once. A flight longer than a screen (back from the foot of a long page,
  `data-vt-far`) starts just past the edge of the screen (`shortenFlight` moves the
  far end of its keyframes), lands without the overshoot, and the socials fade with
  the page instead of sliding that far. A book that would slide most of a screen (a
  sticker opened from far down the Projects page, `data-vt-book-far`) stays still:
  the old leaf goes and the new page fades in where it is. Elsewhere the leaf turns:
  the old page is wiped off the new one under it, from its outer edge (back the other
  way), so every point of the leaf shows one page or the other, never both. Around
  them the old page (the name and tagline, or a product page's headline) fades out in
  0.12 s before the new one fades in, so the two are never read over each other; a
  sticker with no partner (the header sticker, to Writing or Resume) sinks away or
  rises rather than lie over the page.
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
- `tests/transitions.spec.ts` checks that the stickers share the name and that every
  way in and out morphs; `tests/viewTransitions.ts` records what each transition the
  page starts really animated.

## Peeling a sticker

"Peel a sticker to read about it" is literal: on the Projects page each sticker's
bottom-right corner can be taken with a mouse or a finger and peeled back
(`components/usePeel.ts`, used by `StickerLink`).

- The corner to take hold of is `.stk-grip` (`styles/stickers.css`): a square at
  least 56px across (more with a mouse, which can take the corner as far in as it
  lifts on hover), centred where the corner lifts at rest and never less than 20px
  in from the box's corner, with a grab cursor; on the round Super Space badge it is
  round, on its rim. Every sticker shows its corner just lifted at rest (`--rest`),
  so there is something to see to take; a little more on a touchscreen
  (`pointer: coarse`), where nothing else shows it (no hover lift, no grab cursor).
- A finger on the grip may just be scrolling the page, so its first 10px decide
  (`START_CONE` and `START_LEAN` in `usePeel.ts`): within 25° of the diagonal, up
  and in, and leaning at least 30° off the screen's vertical (a tilted sticker's
  diagonal can be nearly upright, and a thumb scrolling the page goes up the
  screen), it peels; any other way it scrolls. A peel that turns up the screen
  before it is far enough to come off (its last 40px, `TURN_SPAN`, within 30° of
  the vertical: a thumb's arc that set off up the diagonal and curled up) is handed
  back: the corner goes down and the page scrolls, making up the way the finger
  went meanwhile without a jump (half again as fast as the finger, until level). Down the screen the browser scrolls it itself (the grip has
  `touch-action: pan-up pinch-zoom`, so two fingers zoom there as anywhere); up the
  screen, or anywhere where `pan-up` is not supported, `usePeel` scrolls the page
  with the finger and lets it glide on after a flick (until something else scrolls
  it). Off the grip a sticker is the page: a swipe across it scrolls natively. A
  mouse has nothing to scroll and takes the corner whichever way it pulls.
- The corner's tip follows the pointer (in the sticker's own, tilted frame): the
  fold is the line halfway between where the tip lies flat and where it is now, so
  it turns with the pull (`--fold`: as far as the pull up to 25° either side of
  square to the diagonal, then less and less, up to 33°; the sideways part of the
  pull past that is dropped). The tip's travel gives less and less past a peel of
  0.46 (a rubber band that never quite stops: half of the first 0.15 of extra pull,
  less of any more). Pushed back from there, the corner comes back with the
  pointer at once: what the band held back is let go of (`slack`). The corner then
  works its way back under the pointer: pushed further back, the slack shrinks
  with the pull (so the corner lies flat just as the pointer reaches where it lies
  flat), and pulled in again, the corner gains half of each move on the pointer. The geometry is in
  `styles/stickers.css`: the face is clipped to the box on the near side of the
  fold and the backing past it is mirrored across it, both clipped to the box (a
  clip that reaches far outside it makes the view transition's capture of the
  sticker huge and slow). A browser without CSS trig functions keeps the fixed 45°
  fold. The drag writes `--drag` and `--fold`, and the sticker's `data-peel` says
  what drives `--peel`: `drag`, `spring` (laid back down), `off` (let go to open)
  or `hint`.
- Let go with the tip pulled past 0.34 of the width (as a peel; the sticker rises a
  little there, about the tip so the tip stays under the pointer, `data-ready`, and
  a phone that can gives a 10 ms tick, once a press), or flick it in (600 px/s up
  the diagonal, within 30° of it, after 30 px), and it comes off. Once far enough,
  it stays so until pushed back 0.02 under the line (`READY_GIVE`, about 6px), so a
  finger resting on the line does not flicker the cue, and letting go does what the
  cue last said. Off, it keeps that pose (`--lift`)
  and flies into the header as soon as its page is in, without the click's lift
  first (`open(href, true)` in `DeskProvider`). The header
  sticker takes the same pose before the transition captures it (`takePose` in
  `DeskProvider`), so the cross-fade between the two images is between two of the
  same; once it has landed its corner is pressed down flat (`data-press`,
  `styles/masthead.css`). A click's lift hands over the same way. Let go sooner, or
  while pushing it back down (400 px/s, read from the pointer, which a corner held
  back by the band may hardly show), and a short spring (stiffness 520, damping 0.6)
  lays it back to
  rest (or to the hover peel, under a mouse still on it), the fold turning back
  square with it.
- A press that does not move, or wanders less than a tap does (15px for a finger,
  6px for a mouse), is a tap or a click and opens the sticker as before; so do
  Enter and Space; a modifier or middle click opens a new tab. A drag's own click
  is dropped, but only until the next press. A second finger ends a peel without
  opening anything.
- Space opens a sticker, as Enter does, though it is a link: the brief asked for
  "Enter/Space" to open a sticker, so a sticker behaves as a button does there,
  where a link would scroll the page. Every other link keeps the link's keys.
- Once a visit (`sessionStorage`), when the stickers first come into full view,
  the first of them lifts its corner and lays it back down (`stk-hint`): not with
  reduced motion, and not once a sticker has been peeled. A pointer or the focus
  arriving on it while it plays ends it, and the corner goes from where it was to
  the hover (or rest) peel, with the spring.
- After a project opened with a pointer (a click, a tap or a peel), the sticker
  that comes back is focused but quiet (`data-quiet`): no ring and no lift until a
  key is pressed. Chrome would show the ring there after a peel, which focuses
  nothing, so its script focus counts as the keyboard's (`lastInput` in
  `DeskProvider`).
- With reduced motion the corner still follows the pointer (the reader moves it),
  but it goes back down without the spring and opens without the view transition.
- `tests/peel.spec.ts` drags with a mouse, and with touches sent through Chrome's
  own input (CDP), so touch-action and scrolling are real; a flick's touches carry
  their own times, so its speed does not depend on how busy the machine is.

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
   the width), `--rest` (how far the corner is lifted at rest, just enough to see)
   and `--hover` (how far the corner lifts on hover). Peeling it by hand needs
   nothing more.
3. In `styles/projects.css`, place `.slot--<key>` on the 12-column grid and give its
   `.stk` a size (`--sh`) and tilt (`--tilt`), plus the mobile sizes.
4. In `styles/masthead.css`, set the header size: `.slap .stk--<key> .stk-body { --sh }`.
   The flight between the two needs nothing more: both stickers take their shared
   view-transition-name from the key.

