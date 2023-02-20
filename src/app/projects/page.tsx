import { FC } from 'react';
import { Inria_Serif } from '@next/font/google';
import Image from 'next/image';
import Link from 'next/link';

const inriaSerifBold = Inria_Serif({ subsets: ['latin'], weight: '700' });

const Projects: FC = () => {
	return (
		<main>
			<Link
				href={'/'}
				data-test-id="btnBackHome"
				className={
					'flex w-max flex-row gap-x-2 rounded-md px-4 py-2 text-green-700 transition ease-in-out hover:bg-green-100'
				}
			>
				<Image
					src={'/icons/arrow-left-line.svg'}
					width={20}
					height={20}
					alt="instagram-icon"
				/>
				<p className="transition-all duration-300 ease-out hover:pl-2 hover:ease-in">
					Home
				</p>
			</Link>
			<ProjectHeader />
			<hr className="my-4" />
			<p>No projects to be displayed yet</p>
			<p>Stay tune.</p>
		</main>
	);
};

const ProjectHeader: FC = () => {
	return (
		<section className="mt-4">
			<Image
				data-test-id="iconBulb"
				src={'/icons/bulb.svg'}
				width={75}
				height={75}
				alt={'green bulb icon'}
			/>
			<h1 className={`${inriaSerifBold.className} my-2 text-3xl`}>Projects</h1>
			<text data-test-id="projectSubtitle" className="text-neutral-500">
				Collection of my personal projects
			</text>
		</section>
	);
};

export default Projects;
