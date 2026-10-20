import { Icon } from '@/components/Icon';
import { StickerLink } from '@/components/StickerLink';
import { projects } from '@/content/projects';
import { site } from '@/content/site';

export default function ProjectsPage() {
	const { title, hint, open } = site.projects;
	return (
		<section className="sheet" aria-labelledby="t-projects">
			{/* the active Projects tab already names this page, so the title is for screen readers only */}
			<h2 className="sr-only" id="t-projects">
				{title}
			</h2>
			<div className="collage">
				<p className="hint collage-hint">
					<Icon name="sparkling-2-fill" />
					{hint}
				</p>
				{projects.map((p) => (
					<div key={p.slug} className={`slot slot--${p.key}`}>
						<StickerLink
							href={`/projects/${p.slug}`}
							stickerKey={p.key}
							sticker={p.sticker}
							label={`${p.name}${p.year ? `, ${p.year}` : ''}. ${open}`}
							// a product page has its own fonts: fetched on the click, not ahead
							prefetch={'productPage' in p ? false : undefined}
						/>
						<div className="cap">
							<h3 className="cap-name">{p.name}</h3>
							<p className="cap-desc">{p.caption}</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
