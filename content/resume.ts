export type Job = {
	/** Shown in the left column, e.g. "2024 – now". */
	when: string;
	role: string;
	org: string;
	where?: string;
};

export const resume = {
	title: 'Resume',
	note: 'Building for web and mobile since 2020, from design to deploy.',
	jobs: [
		{
			when: '2024 – now',
			role: 'Software Engineer',
			org: 'Universal Edge AI',
			where: 'Brisbane, AU',
		},
		{
			when: '2023',
			role: 'Front-end Developer Lead',
			org: 'IFG Life',
			where: 'Indonesia',
		},
		{ when: '2022', role: 'Project Manager', org: 'Moduit Digital Indonesia' },
		{
			when: '2021 – 22',
			role: 'Software Engineer',
			org: 'Aigens Technology',
			where: 'Hong Kong / Indonesia',
		},
		{
			when: '2020 – 21',
			role: 'Software Engineer',
			org: 'Dell Technologies',
			where: 'Malaysia',
		},
	] satisfies Job[],
};
