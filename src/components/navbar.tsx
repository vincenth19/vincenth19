import { Inria_Serif } from '@next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { FC } from 'react';
import { MENU, ROUTES } from 'utils/constants';

const inriaSerifBold = Inria_Serif({ subsets: ['latin'], weight: '700' });

type TMenu = {
	label: string;
	url: string;
};

const menus: TMenu[] = [
	{
		label: MENU.HOME,
		url: ROUTES.HOME,
	},
	{
		label: MENU.PROJECTS,
		url: ROUTES.PROJECTS,
	},
];

const Navbar: FC = () => {
	return (
		<header className="flex justify-center bg-white shadow-md">
			<div className="flex max-w-4xl flex-1 items-center justify-between p-6">
				<h4
					className={`${inriaSerifBold.className} hidden lg:block lg:w-1/5 lg:text-xl`}
				>
					Vincent Haryadi
				</h4>
				<button className="lg:hidden">
					<Image
						src={'./icons/menu.svg'}
						width={20}
						height={20}
						alt="moon icon"
					/>
				</button>
				<span className="hidden gap-4 lg:flex">
					{menus.map((menu) => (
						<Link href={menu.url}>{menu.label}</Link>
					))}
				</span>
				<button className="flex justify-end lg:w-1/5">
					<Image
						src={'./icons/moon.svg'}
						width={20}
						height={20}
						alt="moon icon"
					/>
				</button>
			</div>
		</header>
	);
};

export default Navbar;
