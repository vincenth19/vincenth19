import { FC } from 'react';

import { Inria_Serif } from '@next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import BtnLink, { btnLinkProps } from '@/components/BtnLink';

const inriaSerifBold = Inria_Serif({ subsets: ['latin'], weight: '700' });

const MY_EXPERIENCES: TExperience[] = [
	{
		jobTitle: 'Front-end Developer Lead',
		companyName: 'IFG Life',
		companyCountryISOCode: 'ID',
		dateStart: {
			month: 'January',
			year: 2023,
		},
		dateEnd: 'Present',
		jobDescription: [
			'Lead and distributed tasks to multiple frontend developers to develop new cross platform mobile app (React Native) project for insurance agents',
			'Collaborated directly under product owner and tribe leader to align project timeline, task management, review project documents, and improve UI/UX of the app',
			'Reviewed frontend developers code and guided developers to improve component structure in the project',
			'Managed project repository and application deployment in App Center, Google Play Store, and Apple App Store',
			'Collaborated with front-end developers and quality assurance team to test, debug, and addressed issues within the same day',
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
			'Delivered early phase revamped robo advisor feature to help user invest easily and increase asset under management from retail users',
			'Assisting head of product to identify project requirements, analyze business requirements, and enhanced UI/UX of application features',
			'Lead daily scrum a team of 12 developers and managed 2 projects simultaneously to develop web and mobile application projects (NextJS/React Typescript & React Native)',
			'Continued and finished rebranded landing page with IT and marketing team',
			'Initiated project and product documentation',
			'Experienced with project management tool such as Jira, YouTrack, Miro, and LucidChart',
		],
	},
	{
		jobTitle: 'Aigens',
		companyName: 'Software Engineer',
		companyCountryISOCode: 'HK',
		dateStart: {
			month: 'May',
			year: 2022,
		},
		dateEnd: {
			month: 'Dec',
			year: 2022,
		},
		jobDescription: [
			'Created and prototype console UI that is use by internal and external user for application across multiple countries in Asia',
			'Conduct business requirement gathering while working under project managers and reporting to product manager in Hong Kong ',
			'Styled multiple components for web, web responsive, and mobile app (Angular, CSS, SCSS)',
			'Designed and created prototypes for internal application (Figma)',
			'Experienced with project management tool such as Jira, YouTrack, Miro, and LucidChart',
		],
	},
	{
		jobTitle: 'Dell Technologies',
		companyName: 'Software Engineer',
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
			'Designed, prototyped, developed, and integrated UI for internal automation application that helps reducing manual labour by more than 50% with intuitive and easy-to-use user interface. (ReactJS, Figma)',
			'Worked with clients, directors, and business analysts to determine software requirements and system impacts',
			'Onboarded, trained, and managed front-end development developers within the same team',
			'Planned and developed on ongoing feature development and product maintenance',
		],
	},
];

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
				Front-end developer at heart
			</text>
			<text className="py-2 text-neutral-500">
				Front-end developer lead - IFG Life
			</text>
			<text className="text-neutral-500">Jakarta, Indonesia</text>
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
			<Link
				href="/projects"
				passHref
				className="w-full"
				data-test-id="btnToProjects"
			>
				<button className="mt-5 w-full rounded-md bg-green-700 py-2 px-4 text-white transition ease-in-out hover:bg-green-900 sm:w-max">
					My Projects
				</button>
			</Link>
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
									return <li key={i}>{desc}</li>;
								})}
							</ul>
						</div>
					);
				})}
			</div>
		</section>
	);
};
