import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * Components for writing posts (content/writing/*.mdx). The post title is the
 * page's h2, so headings inside a post move down one level: `##` renders as h3.
 */
const components: MDXComponents = {
	h1: (props: ComponentPropsWithoutRef<'h2'>) => <h2 {...props} />,
	h2: (props: ComponentPropsWithoutRef<'h3'>) => <h3 {...props} />,
	h3: (props: ComponentPropsWithoutRef<'h4'>) => <h4 {...props} />,
	h4: (props: ComponentPropsWithoutRef<'h5'>) => <h5 {...props} />,
};

export function useMDXComponents(inherited: MDXComponents = {}): MDXComponents {
	return { ...inherited, ...components };
}
