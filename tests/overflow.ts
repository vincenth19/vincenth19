import type { Page } from '@playwright/test';

/**
 * Visible elements inside `root` that stick out past the left or right edge of
 * the screen. `.desk` clips anything that does (overflow-x: clip), so the page
 * never scrolls sideways and a scrollWidth check alone cannot catch it. An
 * element inside a sideways scroller (the Super Space demo's chips on a phone)
 * is left to the scroller, which is checked itself.
 */
export function overflowing(page: Page, root: string) {
	return page.evaluate((selector) => {
		const width = document.documentElement.clientWidth;
		const out: string[] = [];
		const clips = (el: Element) =>
			['auto', 'scroll', 'hidden', 'clip'].includes(
				getComputedStyle(el).overflowX,
			);
		for (const el of document.querySelectorAll(`${selector} *`)) {
			if (el.closest('.sr-only')) continue;
			let up = el.parentElement;
			let clipped = false;
			while (up && !up.matches(selector)) {
				if (clips(up)) clipped = true;
				up = up.parentElement;
			}
			if (clipped) continue;
			const r = el.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) continue;
			if (getComputedStyle(el).visibility === 'hidden') continue;
			if (r.left < -0.5 || r.right > width + 0.5) {
				out.push(
					`${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''} ${Math.round(r.left)}–${Math.round(r.right)}`,
				);
			}
		}
		return out;
	}, root);
}
