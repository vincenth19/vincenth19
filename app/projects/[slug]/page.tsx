import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectDetail } from '@/components/ProjectDetail';
import { getProject, projects } from '@/content/projects';
import { baseOpenGraph } from '@/lib/metadata';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
	return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const project = getProject((await params).slug);
	if (!project) return {};
	return {
		title: project.name,
		description: project.lede,
		alternates: { canonical: `/projects/${project.slug}` },
		openGraph: {
			...baseOpenGraph,
			title: project.name,
			description: project.lede,
			url: `/projects/${project.slug}`,
		},
	};
}

export default async function ProjectPage({ params }: Props) {
	const project = getProject((await params).slug);
	if (!project) notFound();
	return <ProjectDetail project={project} />;
}
