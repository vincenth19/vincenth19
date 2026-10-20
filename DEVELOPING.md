# Developing vincenth19.com

Next.js 16 (App Router) + React 19, written in TypeScript, styled with plain CSS.
[Bun](https://bun.sh) is the package manager and script runner; Node.js 20.9 or newer
must also be installed (Next.js runs on it). Deployed on Vercel through its Git
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
  `StickerLink` (lift → fly), `MastFrame` (the masthead's open state), `TabLinks`
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
screen.

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
  fonts and stylesheet (and Chrome warns when a preload goes unused). A click calls
  `router.prefetch` instead (`DeskProvider`), so they load while the sticker lifts.

### The launcher

"Press Super+Space" is followed by a copy of the launcher that runs in the browser:
a field you type into, over the demo home, on a screen with Omarchy's bar. It is
recreated from Super Space's own UI (`SuperSpace.qml`, `ui/ResultRow.qml`,
`ui/AnswerCard.qml` in omarchy-super-space) and sized from its screenshots (the panel
is 737px wide at 1x), in the dark warm theme they use.

- `components/superspace/launcher/`: `View.tsx` draws the panel (no state; shared by
  the server and the browser), `Launcher.tsx` runs it (the instant phase on each key,
  the final phase 150 ms after typing pauses, "calm" typing that only adds rows until
  400 ms after the last key, ↑/↓, →/←, Tab, Enter, Esc, Ctrl+1–9), `engine.ts` is the
  search (names, scope words ported from the daemon's `type_words`, and "meaning":
  the query's words and the words in `concepts.ts` that mean the same, weighed by how
  rare they are, with cut-offs so a search can find nothing), `answers.ts` the quick
  answers (maths, units and time zones ported from the daemon's `crates/answers`;
  currency says it needs the day's ECB rates), and `corpus.ts` / `documents.ts` the
  demo home (from the demo's `make_docs.py` and `make_media.py`). The demo's photos are
  other people's, so they are drawn scenes (`icons.tsx`, `.ssl-scene--*`).
- Opening anything only says, in a toast (a polite live region), what the real
  launcher would do ("Would open apartment-lease-new-farm-2026.pdf at page 3");
  Enter on an answer copies it.
- The page draws the launcher's first frame on the server (`LauncherFrame.tsx`,
  inert); `LauncherIsland.tsx` loads the launcher and its index (a chunk of their
  own, about 47 KB gzipped) as they near the screen, or when an example search under
  the screen is pressed, and swaps them in. The field never takes the focus by itself.
- For screen readers the field is a labelled combobox over a listbox of results
  (`aria-activedescendant` once ↓/↑ choose a row), and a status line says how many
  results there are once typing pauses.
- To check the search against the real one, the daemon's golden queries
  (`tests/golden.json` in omarchy-super-space) can be run against `engine.ts`; when you
  change `concepts.ts` or the cut-offs, make sure "apartment lease bond", "golden
  retriever video", "songs about a breakup", "wifi connect", "anjing" and "apps
  firefox" still find what the real launcher does (`tests/superspace.spec.ts`).

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
  4.0, via Wikimedia Commons), cropped and saved as WebP in
  `components/superspace/raspberry-pi-5.webp` and served through `next/image`, with
  the measured numbers set over its foot. Its licence asks for the credit under it
  (and to say it was cropped): keep it there.
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
in and out: a sticker click (the sticker lifts for 0.1s first), the Back arrow, a tab,
and the browser's Back and Forward (a trackpad swipe included).

- The book sticker and the header sticker share one `view-transition-name`,
  `stk-<key>` (`stickerName` in `DeskProvider`), set inline by `StickerLink` and
  `MastFrame`, so a new project needs nothing extra. On the Projects page only the
  sticker that flies carries it (the one clicked, or the one coming home): a named
  sticker that does not fly would leave the page on its own and drift apart from the
  book. The book, a product page's stage and the socials are named only while a
  transition runs, when `<html>` carries `data-vt="open"` or `"close"`. The timing is
  in `styles/transitions.css`.
- The navigation happens inside `document.startViewTransition`, which waits until
  the new page is on screen (its own layout effects have scrolled it and moved focus)
  before it captures it. A project opens at the top with its title focused; coming
  back puts the sticker in the middle of the screen, focused.
- Back and Forward: Next.js handles `popstate` synchronously, which would swap the
  page before the old one could be captured. A capturing `popstate` listener holds the
  event back, starts the transition, and dispatches it again to Next.js from inside
  the transition's update. A step the browser already animated (a swipe that showed
  the page, `hasUAVisualTransition`) is left to Next.js, untouched.
- React's `<ViewTransition>` (React 19.3 with Next.js 16.4) animates link clicks and
  `router.push`, but starts no transition for Back and Forward (React flushes a
  `popstate` update synchronously), so the site does not use it.
- With reduced motion, or in a browser without view transitions (they need Chromium
  111+, Safari 18+ or Firefox 144+), every navigation is instant.
- `tests/transitions.spec.ts` checks that the stickers share the name and that every
  way in and out morphs; `tests/viewTransitions.ts` records what each transition the
  page starts really animated.

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
   the width) and `--hover` (how far the corner lifts).
3. In `styles/projects.css`, place `.slot--<key>` on the 12-column grid and give its
   `.stk` a size (`--sh`) and tilt (`--tilt`), plus the mobile sizes.
4. In `styles/masthead.css`, set the header size: `.slap .stk--<key> .stk-body { --sh }`.
   The flight between the two needs nothing more: both stickers take their shared
   view-transition-name from the key.

