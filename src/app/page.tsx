import { Inria_Serif } from '@next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { FC } from 'react';

const inriaSerifBold = Inria_Serif({ subsets: ['latin'], weight: '700' });

export default function Home() {
	return (
		<main>
			<Header />
			<hr className="my-8" />
		</main>
	);
}

const Header: FC = () => {
	return (
		<section className="flex flex-col md:flex-row">
			<div className="flex flex-col md:w-1/3">
				<Image
					data-test-id="illustration"
					src={'/icons/MyPic.svg'}
					width={125}
					height={125}
					alt={"Vincent Haryadi's illustration head"}
				/>
				<h1 className={`${inriaSerifBold.className} mt-6 mb-2 text-2xl`}>
					Vincent Haryadi
				</h1>
				<text data-test-id="subtitle" className="text-neutral-500">
					Front-end developer at heart
				</text>
				<text className="text-neutral-500">Jakarta, Indonesia</text>
			</div>
			<div className="flex flex-col justify-center md:w-2/3 md:items-end">
				<div data-test-id="summary" className="md:text-right ">
					<p>
						I am a front-end developer and most of my experience is in web
						applications and always following and keen to learn new tech.
					</p>
					<p className="py-4">
						Currently I am a Frontend Lead at IFG Life Indonesia.
					</p>
					<p>You can reach me out in LinkedIn!</p>
				</div>
				<button className="mt-4 flex justify-center rounded-md bg-green-700 py-2 px-8 md:w-max">
					<Link href="/projects" className={'text-white'}>
						My Projects
					</Link>
				</button>
			</div>
		</section>
	);
};
