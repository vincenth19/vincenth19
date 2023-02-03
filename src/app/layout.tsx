import Navbar from '@/components/navbar';
import { Lexend } from '@next/font/google';
import './globals.css';
import 'tailwindcss/tailwind.css';

const lexend = Lexend({ subsets: ['latin'] });

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			{/*
        <head /> will contain the components returned by the nearest parent
        head.tsx. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
			<head />
			<body className={lexend.className}>
				<Navbar />
				<div className="lg:flex lg:justify-center">
					<div className="p-6 lg:w-9/12 ">{children}</div>
				</div>
			</body>
		</html>
	);
}
