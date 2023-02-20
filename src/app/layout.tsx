import { Lexend } from '@next/font/google';
import './globals.css';
import 'tailwindcss/tailwind.css';

// TODO: Uncomment when navbar is used
// import Navbar from '@/components/Navbar';

const lexend = Lexend({ subsets: ['latin'] });

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<head />
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
