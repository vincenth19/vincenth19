'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ModelContext, WithModelContext } from '@/lib/webmcp/types';
import { useDesk, whenSettled } from './DeskProvider';

/**
 * The browser's WebMCP, or null: `document.modelContext`, or
 * `navigator.modelContext` in Chrome's earlier preview (asked only when the
 * first is missing: Chrome keeps it as a deprecated alias).
 */
function modelContext(): ModelContext | null {
	const context =
		(document as WithModelContext).modelContext ??
		(navigator as WithModelContext).modelContext;
	return typeof context?.registerTool === 'function' ? context : null;
}

/**
 * Hands an AI agent in the browser the site's tools (WebMCP,
 * lib/webmcp/tools.ts): list the projects, open one, read the resume and the
 * contact details. Registered once per page load; it lives in the root
 * layout, so they work from every page. Only a browser that has WebMCP
 * downloads them: the rest never fetch the chunk.
 */
export function WebMcp() {
	const desk = useDesk();
	const router = useRouter();
	// the tools are registered once; they reach the desk as it is now
	const now = useRef({ desk, router });
	useLayoutEffect(() => {
		now.current = { desk, router };
	});

	useEffect(() => {
		const context = modelContext();
		if (!context) return;
		const stop = new AbortController();
		let names: string[] = [];
		import('@/lib/webmcp/tools')
			.then(({ registerTools }) => {
				// unmounted while it loaded (StrictMode's second run, a hot reload)
				if (stop.signal.aborted) return;
				names = registerTools(
					context,
					{
						navigate: (event, href) => now.current.desk.navigate(event, href),
						push: (href) => now.current.router.push(href, { scroll: false }),
						flying: () => now.current.desk.flight !== null,
						settled: whenSettled,
					},
					stop.signal,
				);
			})
			// a chunk that does not load leaves the page as it is
			.catch(() => {});
		return () => {
			stop.abort();
			// Chrome's earlier preview ignores the signal
			for (const name of names) {
				try {
					context.unregisterTool?.(name);
				} catch {}
			}
		};
	}, []);

	return null;
}
