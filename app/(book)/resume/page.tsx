import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { resume } from '@/content/resume';
import { baseOpenGraph } from '@/lib/metadata';

export const metadata: Metadata = {
	title: resume.title,
	description: resume.note,
	alternates: { canonical: '/resume' },
	openGraph: {
		...baseOpenGraph,
		title: resume.title,
		description: resume.note,
		url: '/resume',
	},
};

export default function ResumePage() {
	return (
		<section className="sheet" aria-labelledby="t-resume">
			<header className="sheet-head">
				<div>
					<h2 className="sheet-title" id="t-resume">
						{resume.title}
					</h2>
					<p className="sheet-note">{resume.note}</p>
				</div>
			</header>
			<ol className="jobs">
				{resume.jobs.map((job) => (
					<li key={`${job.when} ${job.org}`}>
						<span className="when">{job.when}</span>
						<span className="role">{job.role}</span>
						<span className="where">
							{job.where && (
								<>
									<Icon name="map-pin-2-fill" />
									{job.where}
								</>
							)}
						</span>
						<span className="org">{job.org}</span>
					</li>
				))}
			</ol>
		</section>
	);
}
