import { projects } from '@/content/projects';
import { site } from '@/content/site';
import { getPostSlugs } from '@/lib/posts';
import { Icon } from './Icon';
import { TabLinks } from './TabLinks';

/**
 * Index tabs glued to the top edge of the book; the current section's tab sits on top.
 * A tab is current only on the pages that exist in its section, so a 404 marks none:
 * the 404 page is prerendered without knowing its URL, and the browser has to agree
 * with that HTML when it hydrates.
 */
export function Tabs() {
	const labels = site.tabs;
	return (
		<TabLinks
			label={labels.label}
			tabs={[
				{
					key: 'projects',
					label: labels.projects,
					href: '/',
					icon: <Icon name="sparkling-2-fill" />,
					paths: ['/', ...projects.map((p) => `/projects/${p.slug}`)],
				},
				{
					key: 'writing',
					label: labels.writing,
					href: '/writing',
					icon: <Icon name="pencil-ruler-2-fill" />,
					paths: ['/writing', ...getPostSlugs().map((s) => `/writing/${s}`)],
				},
				{
					key: 'resume',
					label: labels.resume,
					href: '/resume',
					icon: <Icon name="flag-2-fill" />,
					paths: ['/resume'],
				},
			]}
		/>
	);
}
