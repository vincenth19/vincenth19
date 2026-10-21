import Image from 'next/image';
import type { ReactNode } from 'react';
import { BackToProjects } from '@/components/BackToProjects';
import { FocusTitle } from '@/components/FocusTitle';
import { Icon } from '@/components/Icon';
import {
	type Beat,
	type Copy,
	type DemoItem,
	type Stat,
	type StatGroup,
	superSpace,
} from '@/content/superspace';
import { type Film, getDemoThumbs, getShot } from '@/lib/superspaceMedia';
import { CommandBox } from './CommandBox';
import { Glyph } from './Glyph';
import { LauncherFrame } from './LauncherFrame';
import { LauncherIsland } from './LauncherIsland';
import { Logo } from './Logo';
import type { Rates } from './launcher/answers';
import { MarkedText, plain } from './MarkedText';
import piPhoto from './raspberry-pi-5.webp';

const s = superSpace;

/**
 * A one-line list, its items joined by " · ". The dot is not read out; the
 * spaces around it are real, so the items do not run together for screen readers.
 */
function Joined({ items }: { items: string[] }) {
	return items.map((item, i) => (
		<span key={item}>
			{i > 0 && (
				<>
					{' '}
					<span aria-hidden="true">{s.sep}</span>{' '}
				</>
			)}
			{item}
		</span>
	));
}

/** A headline in Gloock that ends on a full stop; `accent` makes the stop amber. */
function Line({
	id,
	text,
	accent = false,
	size,
}: {
	id: string;
	text: string;
	accent?: boolean;
	/** The demo's line and "Free." are a step up from a feature's. */
	size?: 'lg' | 'xl';
}) {
	return (
		<h3 className={size ? `ss-line ss-line--${size}` : 'ss-line'} id={id}>
			{text}
			<span className={accent ? 'ss-dot' : undefined}>.</span>
		</h3>
	);
}

function Text({ copy }: { copy: Copy }) {
	return (
		<p className="ss-text">
			<span className="ss-lead">{copy.lead}</span>
			{copy.rest && ` ${copy.rest}`}
		</p>
	);
}

export function Hero() {
	return (
		<section className="ss-hero" aria-labelledby="ss-title">
			{/* the product's lockup: the tile, with the name beside it */}
			<div className="ss-brand">
				<Logo id="ss-logo-hero" className="ss-logo" />
				<FocusTitle id="ss-title" className="ss-name" toTop>
					{s.name}
				</FocusTitle>
			</div>
			<p className="ss-headline">
				{s.headline}
				<span className="ss-dot">.</span>
			</p>
			<p className="ss-sub">{s.subhead}</p>
			<div className="ss-actions">
				<CommandBox
					id="ss-cmd-hero"
					command={s.install}
					what={s.ui.copyInstall}
				/>
				<a className="ss-gh" href={s.repo}>
					<Icon name="github-fill" />
					{s.ui.github}
					<Glyph name="arrow" />
				</a>
			</div>
			<p className="ss-version">
				<Joined items={s.meta} />
			</p>
		</section>
	);
}

/**
 * The launcher itself, in the page: a copy that runs in the browser over the
 * demo home, on a screen of its own. Its first frame is drawn here; the
 * launcher loads as it nears the screen (LauncherIsland).
 */
export function Demo({ film, rates }: { film?: Film; rates?: Rates | null }) {
	const d = s.demo;
	const thumbs = getDemoThumbs([...d.pictures.map((p) => p.scene), ...d.own]);
	const credited = d.pictures.filter((p) => thumbs[p.scene]);
	return (
		<section className="ss-beat ss-demo" aria-labelledby="ss-demo-title">
			<Line id="ss-demo-title" text={d.title} size="lg" />
			<LauncherIsland
				initial={d.initial}
				examples={d.examples}
				labels={{ caption: d.caption, try: d.try, show: d.show }}
				launcher={{ labels: d.labels, thumbs, rates }}
			>
				<LauncherFrame
					q={d.initial}
					labels={d.labels}
					thumbs={thumbs}
					rates={rates}
				/>
			</LauncherIsland>
			{/* the pictures' licences ask for their credit: each one the launcher shows */}
			{credited.length > 0 && (
				<p className="ssl-credits">
					{d.credit.lead}{' '}
					{credited.map((p, i) => (
						<span key={p.scene}>
							{i > 0 && '; '}
							<a href={p.source}>{p.title}</a> {d.credit.by} {p.author},{' '}
							{d.licences[p.licence] ? (
								<a href={d.licences[p.licence]}>{p.licence}</a>
							) : (
								p.licence
							)}
							{p.at !== undefined && ` ${d.credit.frame}`}
						</span>
					))}
				</p>
			)}
			{film && (
				<figure className="ss-film">
					{/* biome-ignore lint/a11y/useMediaCaption: the demo clip has no speech */}
					<video
						controls
						playsInline
						preload="none"
						poster={film.poster?.src}
						width={film.poster?.width}
						height={film.poster?.height}
						aria-label={s.film.label}
					>
						{film.webm && <source src={film.webm} type="video/webm" />}
						{film.mp4 && <source src={film.mp4} type="video/mp4" />}
					</video>
					<figcaption>{s.film.title}</figcaption>
				</figure>
			)}
		</section>
	);
}

/** A feature's section, labelled by its line. */
function BeatSection({
	beat,
	className,
	children,
}: {
	beat: Beat;
	className?: string;
	children: ReactNode;
}) {
	const cls = `ss-beat ss-beat--${beat.key}`;
	return (
		<section
			className={className ? `${cls} ${className}` : cls}
			aria-labelledby={`ss-${beat.key}`}
		>
			{children}
		</section>
	);
}

/** A real screenshot of the feature, once it is published. */
function Shot({ beat }: { beat: Beat }) {
	const shot = beat.shot && getShot(beat.shot.file);
	if (!shot || !beat.shot) return null;
	return (
		<figure className="ss-shot">
			<img
				src={shot.src}
				alt={beat.shot.alt}
				width={shot.width}
				height={shot.height}
				loading="lazy"
				decoding="async"
			/>
		</figure>
	);
}

/**
 * One search's result, set large in type rather than in the launcher's panel,
 * so the launcher is not shown twice: what was typed, small, then what it
 * found. Hidden from screen readers, who can run the same search in the launcher.
 */
function Find({ item }: { item: DemoItem }) {
	const row = item.rows[0];
	return (
		<div className="ss-find ss-split-media" aria-hidden="true">
			<p className="ss-find-q">
				<Glyph name="search" />
				{item.query}
			</p>
			{row.moments ? (
				<ul className="ss-find-a ss-find-moments">
					{row.moments.map((m) => (
						<li key={m}>
							<Glyph name="play" />
							{m}
						</li>
					))}
				</ul>
			) : (
				<p className="ss-find-a">
					<MarkedText parts={row.headline} />
				</p>
			)}
			{/* what Enter does is the beat's own sentence, so only where it was found */}
			<p className="ss-find-meta">
				<Glyph name={row.icon} />
				<span>
					<Joined items={row.meta} />
				</span>
			</p>
		</div>
	);
}

/**
 * One feature: a line, a sentence or two, and something the demo above does not
 * show. The beats take turns in how they are laid out (side by side either way,
 * centred, a band of numbers), so the page builds instead of repeating one block.
 */
export function FeatureBeat({ beat }: { beat: Beat }) {
	const title = <Line id={`ss-${beat.key}`} text={beat.title} />;
	const text = beat.copy && <Text copy={beat.copy} />;

	switch (beat.key) {
		// side by side: the words, then the result (the agents' run is a table)
		case 'agents':
			return (
				<BeatSection beat={beat} className="ss-split">
					<div className="ss-split-copy">
						{title}
						{text}
					</div>
					<Agents />
				</BeatSection>
			);
		case 'files':
		case 'moments':
			return (
				<BeatSection
					beat={beat}
					className={`ss-split${beat.key === 'moments' ? ' ss-split--flip' : ''}`}
				>
					<div className="ss-split-copy">
						{title}
						{text}
						{beat.key === 'files' && <Formats />}
					</div>
					<Find item={s.finds[beat.key]} />
					<Shot beat={beat} />
				</BeatSection>
			);
		// a search for songs, as it is typed: there is no result to show for it
		case 'speech':
			return (
				<BeatSection beat={beat}>
					{title}
					{text}
					<p className="ss-typed">
						<Glyph name="search" />
						<span className="ss-typed-q">{s.speech.query}</span>
						<span className="ss-typed-caret" aria-hidden="true" />
					</p>
					<Shot beat={beat} />
				</BeatSection>
			);
		// what else it finds, set large: the key words in full ink
		case 'everything':
			return (
				<BeatSection beat={beat}>
					{title}
					<p className="ss-wall">
						<MarkedText parts={s.everything.finds} />
					</p>
					<p className="ss-note ss-note--line">{s.everything.note}</p>
				</BeatSection>
			);
		case 'scopes':
			return (
				<BeatSection beat={beat} className="ss-split ss-split--flip">
					<div className="ss-split-copy">{title}</div>
					<Scopes />
				</BeatSection>
			);
		// the one full-bleed moment: the Pi itself, its numbers set over it
		case 'pi':
			return (
				<BeatSection beat={beat} className="ss-band">
					{title}
					<Pi />
				</BeatSection>
			);
		// measured on the VM, not the Pi: out of the Pi's band
		case 'speed':
			return (
				<BeatSection beat={beat}>
					{title}
					<Stats group={s.speed} />
				</BeatSection>
			);
		default:
			return (
				<BeatSection beat={beat}>
					{title}
					{text}
					{beat.key === 'private' && <Private />}
				</BeatSection>
			);
	}
}

/** The kinds of document it reads inside. */
function Formats() {
	return (
		<ul className="ss-formats">
			{s.formats.map((f) => (
				<li key={f}>{f}</li>
			))}
		</ul>
	);
}

/** Five searches, as they are typed: the scope word in each in full ink. */
function Scopes() {
	return (
		<ul className="ss-scopes ss-split-media">
			{s.scopes.map((scope) => (
				<li key={plain(scope)}>
					<Glyph name="search" />
					<span>
						<MarkedText parts={scope} />
					</span>
				</li>
			))}
		</ul>
	);
}

function Private() {
	return (
		<dl className="ss-promises">
			{s.private.map((p) => (
				<div key={p.title}>
					<dt>{p.title}</dt>
					<dd>
						<MarkedText parts={p.text} />
					</dd>
				</div>
			))}
		</dl>
	);
}

function Agents() {
	const a = s.agents;
	return (
		<figure className="ss-vs">
			<table>
				<caption>
					<span className="ss-vs-cap">{a.caption}</span> {a.setup}
				</caption>
				<thead>
					<tr>
						<td />
						{a.columns.map((c) => (
							<th key={c} scope="col">
								{c}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{a.rows.map((r) => (
						<tr key={r.label}>
							<th scope="row">{r.label}</th>
							<td className="ss-vs-with">
								<Score text={r.with} />
							</td>
							<td className="ss-vs-without">
								<Score text={r.without} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<figcaption className="ss-note">{a.note}</figcaption>
		</figure>
	);
}

/** "10 of 10": the "of" in small mono, so the two numbers do not run together. */
function Score({ text }: { text: string }) {
	const [n, of] = text.split(' of ');
	if (of === undefined) return text;
	return (
		<>
			{n}
			<span className="ss-vs-of"> of </span>
			{of}
		</>
	);
}

/**
 * The Raspberry Pi 5, large, its board fading into the band, with what it
 * measured set over its foot. The photo's licence asks for the credit under it.
 */
function Pi() {
	const p = s.pi;
	return (
		<div className="ss-pi">
			<figure className="ss-pi-figure">
				<Image
					src={piPhoto}
					alt={p.photo.alt}
					sizes="(max-width: 760px) 100vw, 1040px"
					placeholder="blur"
					// far down the page: it loads as you near it
					className="ss-pi-photo"
				/>
			</figure>
			<div className="ss-statgroup ss-pi-stats">
				<h4 className="ss-statgroup-title">{p.on}</h4>
				<ul className={`ss-stats ss-stats--${p.stats.length}`}>
					{p.stats.map((st) => (
						<StatItem key={st.label} st={st} />
					))}
				</ul>
				{p.note && <p className="ss-note">{p.note}</p>}
			</div>
			<p className="ss-credit">
				{p.photo.credit.before}
				<a href={p.photo.credit.licenceUrl}>{p.photo.credit.licence}</a>
				{', via '}
				<a href={p.photo.credit.source}>{p.photo.credit.where}</a>
				{p.photo.credit.after}
			</p>
		</div>
	);
}

/** A measurement: "about" sits on the number's own line, so it is read with it. */
function StatItem({ st }: { st: Stat }) {
	return (
		<li>
			<span className="ss-stat-num">
				{st.about && <span className="ss-stat-about">{s.ui.about} </span>}
				{st.value}
				<span className="ss-stat-unit"> {st.unit}</span>
			</span>
			<span className="ss-stat-label">
				{st.label}
				{st.detail && <span className="ss-stat-detail">{st.detail}</span>}
			</span>
		</li>
	);
}

/** A group of numbers, headed by what it was measured on. */
function Stats({ group }: { group: StatGroup }) {
	return (
		<div className="ss-statgroup">
			<h4 className="ss-statgroup-title">{group.on}</h4>
			<ul className={`ss-stats ss-stats--${group.stats.length}`}>
				{group.stats.map((st) => (
					<StatItem key={st.label} st={st} />
				))}
			</ul>
			{group.note && <p className="ss-note">{group.note}</p>}
		</div>
	);
}

/** One size per line; screen readers hear a comma between them. */
function Sizes({ sizes }: { sizes: { size: string; arch?: string }[] }) {
	return sizes.map((a, k) => (
		<span key={a.size + (a.arch ?? '')} className="ss-size">
			{a.size}
			{a.arch && (
				<>
					{' '}
					<span className="ss-arch">{a.arch}</span>
				</>
			)}
			{k < sizes.length - 1 && <span className="sr-only">,</span>}
		</span>
	));
}

export function Install() {
	const i = s.installSection;
	return (
		<section
			className="ss-beat ss-install"
			id="install"
			aria-labelledby="ss-install-title"
		>
			<Line id="ss-install-title" text={i.title} />
			<CommandBox
				id="ss-cmd-install"
				command={s.install}
				what={s.ui.copyInstall}
			/>
			<div className="ss-specs">
				<div className="ss-spec">
					<h4>{i.requirements.title}</h4>
					<ul>
						{i.requirements.items.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
					<p className="ss-spec-note">{i.requirements.note}</p>
				</div>
				<div className="ss-spec">
					<h4>{i.download.title}</h4>
					<dl className="ss-sizes">
						<div className="ss-size-app">
							<dt>{i.download.app.label}</dt>
							<dd>
								<Sizes sizes={i.download.app.sizes} />
							</dd>
						</div>
					</dl>
					<p className="ss-spec-note">{i.download.setupLead}</p>
					<dl className="ss-sizes">
						{i.download.parts.map((part) => (
							<div key={part.label}>
								<dt>{part.label}</dt>
								<dd>
									<Sizes sizes={part.size.map((size) => ({ size }))} />
								</dd>
							</div>
						))}
					</dl>
				</div>
				{/* across both columns: how to remove it, and the licence, as plainly as "MIT" */}
				<dl className="ss-spec ss-spec--wide">
					<div>
						<dt>{i.uninstall.title}</dt>
						<dd>
							<CommandBox
								id="ss-cmd-uninstall"
								command={s.uninstall}
								what={s.ui.copyUninstall}
								size="sm"
							/>
						</dd>
					</div>
					<div className="ss-licence">
						<dt>{i.licence.title}</dt>
						<dd>{i.licence.text}</dd>
					</div>
				</dl>
			</div>
		</section>
	);
}

export function Faq() {
	return (
		<section className="ss-beat ss-faq" aria-labelledby="ss-faq-title">
			<Line id="ss-faq-title" text={s.faqTitle} />
			<div className="ss-faq-list">
				{s.faq.map((f) => (
					<details key={f.q} className="ss-faq-item">
						<summary>
							<span>{f.q}</span>
							<span className="ss-faq-icon" aria-hidden="true" />
						</summary>
						<p>
							<MarkedText parts={f.a} />
						</p>
					</details>
				))}
			</div>
		</section>
	);
}

export function Closing() {
	return (
		<>
			<section className="ss-cta" aria-labelledby="ss-cta-title">
				<Logo id="ss-logo-cta" className="ss-logo ss-logo--cta" />
				<Line id="ss-cta-title" text={s.cta.title} accent size="xl" />
				<p className="ss-text">{s.cta.copy}</p>
				<a className="ss-button" href={s.repo}>
					<Icon name="github-fill" />
					{s.ui.github}
				</a>
				<p className="ss-repo">{s.repoLabel}</p>
			</section>
			<footer className="ss-foot">
				<p>
					<Joined items={[s.name, ...s.meta]} />
				</p>
				<BackToProjects className="ss-foot-link">
					<Icon name="arrow-left-long-line" />
					{s.ui.backToProjects}
				</BackToProjects>
			</footer>
		</>
	);
}
