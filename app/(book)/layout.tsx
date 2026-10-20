import type { ReactNode } from 'react';
import { Book } from '@/components/Book';

/** Every page that is a leaf of the book: Projects, a project sheet, Writing, Resume. */
export default function BookLayout({ children }: { children: ReactNode }) {
	return <Book>{children}</Book>;
}
