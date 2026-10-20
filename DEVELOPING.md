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
  the posts in `writing/`.
- `components/` are server components except the few that need the browser:
  `StickerLink` (peel → fly), `MastFrame` (the masthead's open state), `TabLinks`
  (current tab), `FocusTitle` (a project or post title takes focus when it opens),
  `SkipLink` (Skip to content) and `DeskProvider` (remembers where you came from, so
  the open sticker re-sticks after Back, and runs the peel, so clicking a tab mid-peel
  cancels it). Client components get their text as props from a server parent, like
  their icons.
- `styles/` is plain global CSS, one file per part of the page, imported in cascade
  order by `app/layout.tsx`. `base.css` holds the colour and font tokens.
- Icons are inline SVGs from [Remix Icon](https://remixicon.com) in
  `components/Icon.tsx`. To add one, copy its `<path d="…">` from the icon set into the
  `paths` map. Only server components import `Icon`; a client component gets its icons
  as props (see `Tabs` → `TabLinks`), so the icon set stays out of the browser bundle.
- Fonts (Fraunces and Bricolage Grotesque) load through `next/font/google` in
  `app/fonts.ts` and are exposed as `--display` and `--sans`.

## The Super Space product page

`/projects/super-space` is a product page in Super Space's own identity rather than a
sheet in the book. The masthead still slaps the peeled sticker on (the root layout
keeps it mounted); below it, in place of the book, a dark stage that the desk's lamp
light fades into.

- Copy, numbers and the launcher demo's searches are typed data in
  `content/superspace.ts`. Keep each number exactly as measured, with its qualifier
  ("in our test", "measured on the Pi", "on the Try Omarchy VM"), and mention nothing
  that is not released.
- The page is `app/(product)/projects/super-space/page.tsx`; its sections are in
  `components/superspace/`. Two parts run in the browser: `CopyButton` and
  `LauncherDemo` (the launcher in HTML, which types the example searches while it is
  on screen, and stands still with reduced motion).
- Its fonts, Gloock and Fragment Mono, load in that route's `fonts.ts`, for this page
  only, and `styles/superspace.css` is imported by the page alone. Next keeps a
  route's stylesheet after you leave it, so every rule there is scoped to `.ss`.
- On purpose, the home page still fetches them early: the Super Space sticker is a
  `next/link`, and prefetching its route brings the route's preloads (the two fonts,
  about 15 KB and 17.5 KB, and the stylesheet, about 6 KB gzipped) once the home page
  is idle. That keeps the sticker's peel-and-slap free of a font swap on arrival. If
  home-page weight ever matters more, set `prefetch={false}` on that sticker's link.
- Each example search appears once, in the launcher demo; the feature beats below it
  show other moments of the product (the file tiles, the Enter key, a query line, the
  scope words), so the page does not tell the same story twice.
- Media slots: the screenshots and demo clip appear once their files are in
  `public/projects/super-space/` (`demo.webm` and/or `demo.mp4` with `poster.webp`;
  `lease.webp`, `video.webp`, `songs.webp`). The page checks at build time, so add the
  files and rebuild; without them it leaves those slots out.

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

