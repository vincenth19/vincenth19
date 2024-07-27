import { FC, ReactNode } from 'react';

import { Inria_Serif } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import BtnLink, { btnLinkProps } from '@/components/BtnLink';

const inriaSerifBold = Inria_Serif({ subsets: ['latin'], weight: '700' });

type TProjects = {
	title: string;
	technologies: string[];
	description: string;
	icon: ReactNode;
	link: string;
};

const EXTERNAL_LINKS: btnLinkProps[] = [
	{
		url: 'https://www.linkedin.com/in/vincenth19/',
		label: 'LinkedIn',
		icon: (
			<Image
				src={'/icons/ic-linkedin.svg'}
				width={20}
				height={20}
				alt="linkedin-icon"
			/>
		),
	},
	{
		url: 'https://github.com/vincenth19',
		label: 'GitHub',
		icon: (
			<Image
				src={'/icons/ic-github.svg'}
				width={20}
				height={20}
				alt="github-icon"
			/>
		),
	},
	{
		url: 'https://www.instagram.com/vincenth19/',
		label: 'Instagram',
		icon: (
			<Image
				src={'/icons/ic-instagram.svg'}
				width={20}
				height={20}
				alt="instagram-icon"
			/>
		),
	},
];

const PROJECTS: TProjects[] = [];

export default function Home() {
	return (
		<main>
			<Header />
			<hr className="my-8" />
			<Experiences experiencesData={MY_EXPERIENCES} />
		</main>
	);
}

const Header: FC = () => {
	return (
		<section className="flex flex-col items-center text-center">
			<Image
				data-test-id="illustration"
				src={'/icons/MyPic.svg'}
				width={125}
				height={125}
				alt={"Vincent Haryadi's illustration head"}
			/>
			<h1 className={`${inriaSerifBold.className} mt-6 mb-2 text-3xl`}>
				Vincent Haryadi
			</h1>
			<text data-test-id="subtitle" className="text-neutral-500">
				Full Stack Software Engineer | Exploring Generative AI
			</text>
			<text className="py-2 px-3 text-green-700 bg-green-50 my-2 rounded-lg">
				<strong>Currently:</strong> Software Engineer - Alpha Curve Pty Ltd
			</text>
			<text className="text-neutral-500">Brisbane, Australia</text>
			<span className="mt-4 flex gap-x-2">
				{EXTERNAL_LINKS.map((link) => {
					return (
						<BtnLink
							key={link.label}
							url={link.url}
							label={link.label}
							icon={link.icon}
						/>
					);
				})}
			</span>

			{PROJECTS.length > 0 && (
				<Link
					href="/projects"
					passHref
					className="w-full"
					data-test-id="btnToProjects"
				>
					<button
						type="button"
						className="mt-5 w-full rounded-md bg-green-700 py-2 px-4 text-white transition ease-in-out hover:bg-green-900 sm:w-max"
					>
						My Projects
					</button>
				</Link>
			)}
		</section>
	);
};

type TDateExp = {
	month: string;
	year: number;
};

type TExperience = {
	jobTitle: string;
	companyName: string;
	companyCountryISOCode: string;
	dateStart: TDateExp;
	dateEnd: TDateExp | 'Present';
	jobDescription: string[];
};

interface PropsExperiences {
	experiencesData: TExperience[];
}

const MY_EXPERIENCES: TExperience[] = [
	{
		jobTitle: 'Software Engineer',
		companyName: 'Alpha Curve Pty Ltd',
		companyCountryISOCode: 'AU',
		dateStart: {
			month: 'April',
			year: 2024,
		},
		dateEnd: 'Present',
		jobDescription: [
			'Developed and maintained front-end components using HTML, CSS, and JavaScript; integrated APIs with AI capabilities using Flask and FastAPI.',
			'Authored comprehensive technical documentation for project workflows and processes.',
			'Independently managed tasks and supervised colleagues to ensure progress and project milestones were met.',
		],
	},
	{
		jobTitle: 'Front-end Developer Lead',
		companyName: 'IFG Life',
		companyCountryISOCode: 'ID',
		dateStart: {
			month: 'January',
			year: 2023,
		},
		dateEnd: {
			month: 'Oct',
			year: 2023,
		},
		jobDescription: [
			'Led a team to build a new mobile app for insurance agents, using React Native and Redux.',
			'Worked with product leaders to keep the project on track, manage tasks, and improve app experience.',
			'Handled app deployment to App Center, Google Play Store, and Apple App Store.',
		],
	},
	{
		jobTitle: 'Project Manager',
		companyName: 'Moduit Digital Indonesia',
		companyCountryISOCode: 'ID',
		dateStart: {
			month: 'May',
			year: 2022,
		},
		dateEnd: {
			month: 'Dec',
			year: 2022,
		},
		jobDescription: [
			'Delivered a revamped robo-advisor feature, making investing more accessible and significantly boosting user investments.',
			'Led the development of a new landing page with IT and marketing teams, increasing site traffic and user engagement.',
			'Partnered with the head of product to refine requirements, improve UI/UX, and manage multiple web and mobile projects.',
		],
	},
	{
		jobTitle: 'Software Engineer',
		companyName: 'Aigens Technology',
		companyCountryISOCode: 'HK, ID Branch',
		dateStart: {
			month: 'October',
			year: 2021,
		},
		dateEnd: {
			month: 'April',
			year: 2022,
		},
		jobDescription: [
			'Developed UI components for a CRM used across Asia, enhancing user experience and efficiency (Angular, RxJS).',
			'Gathered requirements with project managers to align with business goals and ensure timely completion.',
			'Reported directly to the product manager, delivering high-quality software solutions.',
		],
	},
	{
		jobTitle: 'Software Engineer',
		companyName: 'Dell Technologies',
		companyCountryISOCode: 'MY',
		dateStart: {
			month: 'Jan',
			year: 2020,
		},
		dateEnd: {
			month: 'Oct',
			year: 2021,
		},
		jobDescription: [
			'Designed and implemented dell.com maintenance automation app and website health dashboard which reduced manual labor by over 50% (React, Figma).',
			'Collaborated with clients, directors, and analysts to accurately define software requirements and track project success.',
			'Mentored and managed interns and other developers, driving continuous improvement and ensuring successful feature development and maintenance.',
		],
	},
];

const Experiences: FC<PropsExperiences> = ({ experiencesData }) => {
	return (
		<section>
			<span className="flex items-center">
				<Image
					src={'/icons/briefcase.svg'}
					width={50}
					height={50}
					alt={'Briefcase icon'}
				/>
				<h2 className={`${inriaSerifBold.className} ml-4 text-2xl`}>
					Experience
				</h2>
			</span>
			<div className="py-4" data-test-id="experiences">
				{experiencesData.map((experience) => {
					return (
						<div key={experience.companyName} className="py-4">
							<h3 className="text-lg">
								{experience.jobTitle}, {experience.companyName} (
								{experience.companyCountryISOCode})
							</h3>
							<span className="text-neutral-500">
								{experience.dateStart.month} {experience.dateStart.year} -{' '}
								{experience.dateEnd !== 'Present'
									? `${experience.dateEnd.month} ${experience.dateEnd.year}`
									: experience.dateEnd}
							</span>
							<ul className="my-4 list-disc pl-4">
								{experience.jobDescription.map((desc, i) => {
									return <li key={`job-desc-${i}`}>{desc}</li>;
								})}
							</ul>
						</div>
					);
				})}
			</div>
		</section>
	);
};
