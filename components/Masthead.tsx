import { headerStickers } from '@/content/projects';
import { site } from '@/content/site';
import { Icon } from './Icon';
import { InlineText } from './InlineText';
import { MastFrame } from './MastFrame';

export function Masthead() {
	const [first, last] = site.name.split(' ');
	return (
		<MastFrame
			stickers={headerStickers}
			backIcon={<Icon name="arrow-left-long-line" />}
			backLabel={site.project.back}
			identity={
				<div className="mast-id">
					<h1 className="name">
						<span className="w">{first}</span> <span className="w">{last}</span>
					</h1>
					<p className="tagline">
						{site.tagline.map((line) => (
							<span className="cl" key={line.verb}>
								<b className="verb">{line.verb}</b>
								<span className="rest">
									<InlineText parts={line.rest} />
								</span>
							</span>
						))}
					</p>
				</div>
			}
			socials={
				<ul className="socials">
					{site.socials.map((s) => (
						<li key={s.label}>
							<a href={s.href} aria-label={s.label}>
								<Icon name={s.icon} />
							</a>
						</li>
					))}
				</ul>
			}
		/>
	);
}
