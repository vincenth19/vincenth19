import { Lexend } from 'next/font/google';
import type { Metadata } from 'next';

import './globals.css';
import 'tailwindcss/tailwind.css';

// TODO: Uncomment when navbar is used
// import Navbar from '@/components/Navbar';

const lexend = Lexend({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'Vincent Haryadi',
	description:
		'Personal website of Vincent Haryadi, a full-stack developer from Indonesia. Open to work remotely.',
	viewport: {
		width: 'device-width',
		initialScale: 1,
	},
	icons: {
		icon: '/MyPic.ico',
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={lexend.className}>
				{/* TODO: Uncomment when navbar is used*/}
				{/* <Navbar /> */}

				<div className="lg:flex lg:justify-center">
					<div className="p-6 lg:w-9/12 ">{children}</div>
				</div>
			</body>
		</html>
	);
}
