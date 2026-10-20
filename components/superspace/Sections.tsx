import Link from 'next/link';
import { FocusTitle } from '@/components/FocusTitle';
import { Icon } from '@/components/Icon';
import {
	type Beat,
	type Stat,
	type StatGroup,
	superSpace,
} from '@/content/superspace';
import { type Film, getShot } from '@/lib/superspaceMedia';
import { CommandBox } from './CommandBox';
import { Glyph } from './Glyph';
import { LauncherDemo } from './LauncherDemo';
import { Logo } from './Logo';
import { MarkedText, plain } from './MarkedText';

const s = superSpace;

/** A one-line list, its items joined by " · " (the dots are not read out). */
function Joined({ items }: { items: string[] }) {
	return items.map((item, i) => (
		<span key={item}>
			{i > 0 && <span aria-hidden="true">{s.sep}</span>}
			{item}
		</span>
	));
}

/** A headline in Gloock that ends on a full stop; `accent` makes the stop amber. */
function Line({
	id,
	text,
	accent = false,
	className = 'ss-line',
}: {
	id: string;
	text: string;
	accent?: boolean;
	className?: string;
}) {
	return (
		<h3 className={className} id={id}>
			{text}
			<span className={accent ? 'ss-dot' : undefined}>.</span>
		</h3>
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

export function Demo({ film }: { film?: Film }) {
	const d = s.demo;
	return (
		<section className="ss-beat ss-demo" aria-labelledby="ss-demo-title">
			<p className="ss-keys">
				{d.kicker[0]} <kbd>{d.kicker[1]}</kbd>
				<span className="ss-plus">{d.kicker[2]}</span>
				<kbd>{d.kicker[3]}</kbd>
			</p>
			<Line id="ss-demo-title" text={d.title} />
			<ul className="sr-only" aria-label={d.listLabel}>
				{d.items.map((item) => (
					<li key={item.query}>{item.said}</li>
				))}
			</ul>
			<LauncherDemo
				items={d.items}
				web={d.web}
				labels={{
					pause: d.pause,
					play: d.play,
					show: d.show,
					chips: d.chipsLabel,
				}}
				icons={{
					search: <Glyph name="search" />,
					doc: <Glyph name="doc" />,
					video: <Glyph name="video" />,
					emoji: <Glyph name="emoji" />,
					wifi: <Glyph name="wifi" />,
					time: <Glyph name="time" />,
					web: <Glyph name="web" />,
					enter: <Glyph name="enter" />,
					play: <Glyph name="play" />,
					pause: <Glyph name="pause" />,
				}}
			/>
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

/** One feature: a big line, a sentence or two, and a moment of the product. */
export function FeatureBeat({ beat }: { beat: Beat }) {
	const shot = beat.shot && getShot(beat.shot.file);
	const id = `ss-${beat.key}`;
	return (
		<section className={`ss-beat ss-beat--${beat.key}`} aria-labelledby={id}>
			<Line id={id} text={beat.title} />
			{beat.copy && (
				<p className="ss-text">
					<span className="ss-lead">{beat.copy.lead}</span>
					{beat.copy.rest && ` ${beat.copy.rest}`}
				</p>
			)}
			{beat.key === 'files' && <Formats />}
			{beat.key === 'moments' && <EnterKey />}
			{beat.key === 'speech' && <Query text={s.speech.query} />}
			{beat.key === 'everything' && (
				<p className="ss-note">{s.everything.note}</p>
			)}
			{beat.key === 'scopes' && <Scopes />}
			{beat.key === 'private' && <Private />}
			{beat.key === 'agents' && <Agents />}
			{beat.key === 'pi' && <Pi />}
			{shot && beat.shot && (
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
			)}
		</section>
	);
}

/** The kinds of document it reads, as the launcher's file tiles. */
function Formats() {
	return (
		<ul className="ss-formats">
			{s.formats.map((f) => (
				<li key={f.name}>
					<span className="ss-tile">
						<Glyph name={f.icon} />
					</span>
					{f.name}
				</li>
			))}
		</ul>
	);
}

/** What Enter does on a video that matched. */
function EnterKey() {
	return (
		<p className="ss-enter">
			<kbd>{s.moments.key}</kbd>
			<span>{s.moments.text}</span>
		</p>
	);
}

/** A search on its own, in the launcher's query line. */
function Query({ text }: { text: string }) {
	return (
		<p className="ss-panel ss-qline">
			<Glyph name="search" />
			<span>{text}</span>
			<span className="ss-caret" aria-hidden="true" />
		</p>
	);
}

function Scopes() {
	return (
		<ul className="ss-scopes">
			{s.scopes.map((scope) => (
				<li key={plain(scope)}>
					<MarkedText parts={scope} />
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

function StatItem({ st }: { st: Stat }) {
	return (
		<li>
			{st.about && <span className="ss-stat-about">{s.ui.about} </span>}
			<span className="ss-stat-num">
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

/** Each group of numbers is headed by what it was measured on. */
function Pi() {
	return s.pi.map((group: StatGroup) => (
		<div key={group.on} className="ss-statgroup">
			<p className="ss-eyebrow">{group.on}</p>
			<ul className={`ss-stats ss-stats--${group.stats.length}`}>
				{group.stats.map((st) => (
					<StatItem key={st.label} st={st} />
				))}
			</ul>
			{group.note && <p className="ss-note">{group.note}</p>}
		</div>
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
			<p className="ss-eyebrow">{i.eyebrow}</p>
			<Line id="ss-install-title" text={i.title} />
			<CommandBox
				id="ss-cmd-install"
				command={s.install}
				what={s.ui.copyInstall}
			/>
			<div className="ss-specs">
				<div className="ss-specs-col">
					<div className="ss-spec">
						<h4>{i.requirements.title}</h4>
						<ul>
							{i.requirements.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
						<p className="ss-spec-note">{i.requirements.note}</p>
					</div>
					<div className="ss-uninstall">
						<h4>{i.uninstall.title}</h4>
						<CommandBox
							id="ss-cmd-uninstall"
							command={s.uninstall}
							what={s.ui.copyUninstall}
							size="sm"
						/>
					</div>
				</div>
				<div className="ss-spec">
					<h4>{i.download.title}</h4>
					<dl className="ss-sizes">
						<div className="ss-size-app">
							<dt>{i.download.app.label}</dt>
							<dd>
								{i.download.app.sizes.map((a, k) => (
									<span key={a.arch} className="nw">
										{k > 0 && <span aria-hidden="true">{s.sep}</span>}
										{a.size} <span className="ss-arch">{a.arch}</span>
									</span>
								))}
							</dd>
						</div>
					</dl>
					<p className="ss-spec-note">{i.download.setupLead}</p>
					<dl className="ss-sizes">
						{i.download.parts.map((part) => (
							<div key={part.label}>
								<dt>{part.label}</dt>
								<dd>
									{part.size.map((piece, k) => (
										<span key={piece}>
											{k > 0 && ', '}
											<span className="nw">{piece}</span>
										</span>
									))}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>
			<p className="ss-licence">{i.licence}</p>
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
				<Line
					id="ss-cta-title"
					text={s.cta.title}
					accent
					className="ss-line ss-line--xl"
				/>
				<p className="ss-text">{s.cta.copy}</p>
				<a className="ss-button" href={s.repo}>
					<Icon name="github-fill" />
					{s.ui.github}
				</a>
				<p className="ss-repo">{s.repoLabel}</p>
			</section>
			<footer className="ss-foot">
				<p>{s.ui.madeBy}</p>
				<Link className="ss-foot-link" href="/" scroll={false}>
					<Icon name="arrow-left-long-line" />
					{s.ui.backToProjects}
				</Link>
			</footer>
		</>
	);
}
