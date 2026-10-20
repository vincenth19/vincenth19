import type { SheetProject } from '@/content/projects';
import { site } from '@/content/site';
import { Command } from './Command';
import { Corners } from './Corners';
import { FocusTitle } from './FocusTitle';
import { Icon } from './Icon';
import { Chip, InlineText } from './InlineText';

/** The project sheet on the leaf. Anything a project does not have is left out. */
export function ProjectDetail({ project: p }: { project: SheetProject }) {
	const titleId = `t-${p.key}`;
	return (
		<article className="sheet detail" aria-labelledby={titleId}>
			<div className="intro">
				<p className="eyebrow tag">
					<Chip {...p.tag} />
					{p.year !== undefined && <span className="tag-year">{p.year}</span>}
				</p>
				<FocusTitle className="detail-title" id={titleId} toTop>
					{p.name}
				</FocusTitle>
				<p className="lede">{p.lede}</p>
				{p.body && (
					<p className="body">
						<InlineText parts={p.body} />
					</p>
				)}
				{p.tries && (
					<div className="tries">
						<p className="tries-label">{p.tries.label}</p>
						<ul>
							{p.tries.items.map((item) => (
								<li key={item}>
									<span className="q">{`“${item}”`}</span>
								</li>
							))}
						</ul>
					</div>
				)}
				{p.links.length > 0 && (
					<ul className="links">
						{p.links.map((link) => (
							<li key={link.href}>
								<a
									className={
										link.variant === 'ghost' ? 'btn btn--ghost' : 'btn'
									}
									href={link.href}
								>
									<Icon name={link.icon} /> {link.label}
								</a>
							</li>
						))}
					</ul>
				)}
			</div>
			<figure className="snap">
				<div className="snap-photo">
					{p.snap.screenshot ? (
						<img
							className="snap-shot"
							src={p.snap.screenshot.src}
							alt={p.snap.screenshot.alt}
						/>
					) : (
						<div className="snap-img">
							<Icon name={p.snap.icon} />
							<span>{site.project.snapPlaceholder}</span>
						</div>
					)}
					<Corners />
				</div>
				<figcaption>{p.snap.caption}</figcaption>
			</figure>
			{p.facts.length > 0 && (
				<dl className="facts">
					{p.facts.map((fact) => (
						<div key={fact.label} className={fact.wide ? 'wide' : undefined}>
							<dt>{fact.label}</dt>
							<dd>
								{'command' in fact ? (
									<span className="cmd">
										<Icon name="terminal-box-fill" />
										<code>
											<Command text={fact.command} />
										</code>
									</span>
								) : (
									fact.value
								)}
							</dd>
						</div>
					))}
				</dl>
			)}
		</article>
	);
}
