import { Inria_Serif } from "next/font/google";
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
					data-test-id="myName"
					className={`${inriaSerifBold.className} hidden md:block md:w-1/5 md:text-xl`}
				>
					Vincent Haryadi
				</h4>
				<button type='button' data-test-id="hamburgerMenu" className="block md:hidden">
					<Image
						src={'./icons/menu.svg'}
						width={20}
						height={20}
						alt="moon icon"
					/>
				</button>
				<span data-test-id="menuList" className="hidden gap-4 md:flex">
					{menus.map((menu) => (
						<Link key={menu.url} href={menu.url}>
							{menu.label}
						</Link>
					))}
				</span>
				<button
					type="button"
					data-test-id="themeSwitcher"
					className="flex justify-end md:w-1/5"
				>
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
