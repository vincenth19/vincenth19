import type { Rates } from '@/components/superspace/launcher/answers';

/**
 * The euro reference rates the European Central Bank publishes each working
 * day, for the launcher's currency answers. Super Space fetches them on your
 * computer; this page fetches them when it is built and again once a day
 * after that, and the answer card says whose rates and from which day. If the
 * ECB cannot be reached, the page is built without them and the card says it
 * cannot convert.
 */
const URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

/** `<Cube time='2026-10-20'>` and `<Cube currency='USD' rate='1.1650'/>` → Rates. */
export function parseEcb(xml: string): Rates | null {
	const date = /time=['"](\d{4}-\d\d-\d\d)['"]/.exec(xml)?.[1];
	if (!date) return null;
	const eur: Record<string, number> = {};
	for (const m of xml.matchAll(
		/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g,
	)) {
		const rate = Number(m[2]);
		if (rate > 0) eur[m[1]] = rate;
	}
	return Object.keys(eur).length ? { date, eur } : null;
}

export async function getEcbRates(): Promise<Rates | null> {
	try {
		const res = await fetch(URL, {
			signal: AbortSignal.timeout(5000),
			next: { revalidate: 86400 },
		});
		return res.ok ? parseEcb(await res.text()) : null;
	} catch {
		return null;
	}
}
