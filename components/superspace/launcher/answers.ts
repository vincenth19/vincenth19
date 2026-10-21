/**
 * Quick answers, worked out in the browser as Super Space works them out on
 * your computer: maths, units and time zones, ported from omarchy-super-space's
 * crates/answers (math.rs, convert.rs, time.rs). Currency uses the ECB's rates
 * as they were when the page was built (`Rates`, fetched by lib/ecbRates.ts); a
 * page built without them says so instead of a number.
 */
import type { Answer } from './types';

/** Exchange rates against the euro, with the day the ECB published them ("2026-10-20"). */
export type Rates = {
	date: string;
	eur: Record<string, number>;
};

// ------------------------------------------------------------ numbers

/** `x` to `sig` significant digits, with thousands separators: 4,046.86. */
function num(x: number, sig: number): string {
	const a = Math.abs(x);
	if (a !== 0 && (a < 1e-9 || a >= 1e15)) {
		const [m, e] = x.toExponential(sig - 1).split('e');
		return `${trim(m)}e${Number(e)}`;
	}
	const dec = a === 0 ? 0 : clamp(sig - 1 - Math.floor(Math.log10(a)), 0, 12);
	return group(trim(x.toFixed(dec)));
}

function clamp(v: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, v));
}

function trim(s: string): string {
	const t = s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
	return t === '-0' ? '0' : t;
}

function group(s: string): string {
	const sign = s.startsWith('-') ? '-' : '';
	const [int, frac] = s.replace(/^-/, '').split('.');
	const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return sign + grouped + (frac ? `.${frac}` : '');
}

/** The copy text: the shown number without separators. */
function plain(s: string) {
	return s.replaceAll(',', '');
}

/** Lowercase, one space between words, typographic symbols to ASCII, question wrapping removed. */
function normalize(q: string): string | null {
	let s = q.toLowerCase();
	for (const [a, b] of [
		['×', '*'],
		['÷', '/'],
		['−', '-'],
		['–', '-'],
		['’', "'"],
		['‘', "'"],
		['′', "'"],
		['”', '"'],
		['“', '"'],
		['″', '"'],
		['²', '^2'],
		['³', '^3'],
		['→', ' to '],
		['->', ' to '],
		['π', 'pi'],
		['√', 'sqrt '],
		['º', '°'],
	]) {
		s = s.replaceAll(a, b);
	}
	s = s.split(/\s+/).filter(Boolean).join(' ');
	s = s.replace(/^[?= ]+|[?= ]+$/g, '');
	for (const p of [
		'what is ',
		"what's ",
		'whats ',
		'how much is ',
		'how much ',
		'calculate ',
		'calc ',
		'convert ',
	]) {
		if (s.startsWith(p)) s = s.slice(p.length);
	}
	const many = /^how many (.+?) in (.+)$/.exec(s);
	if (many) s = `${many[2]} to ${many[1]}`;
	return s && s.length <= 120 ? s : null;
}

/** A leading number: "1,000", "1.5", "1e3", ".5", "-40". Value, raw text, rest. */
function number(s: string): [number, string, string] | null {
	// "0x10" is hexadecimal, which this does not read: not 0 times 10
	if (/^[-+]?0x[\da-f]/i.test(s)) return null;
	const m = /^[-+]?[\d.,]*(?:e[-+]?\d+)?/.exec(s);
	if (!m) return null;
	let raw = m[0];
	// "1e" with no digits after is not an exponent
	raw = raw.replace(/[,.]+$/, '');
	if (!/\d/.test(raw)) return null;
	// "1.000,5" is written the European way, which this does not read: not 1.0005
	if (/\..*,/.test(raw)) return null;
	const int = raw.split('.')[0].replace(/^[-+]/, '');
	if (raw.includes(',')) {
		const groups = int.split(',');
		if (
			!groups[0] ||
			groups[0].length > 3 ||
			groups.slice(1).some((g) => g.length !== 3)
		) {
			return null;
		}
	}
	const v = Number(raw.replaceAll(',', ''));
	if (!Number.isFinite(v)) return null;
	return [v, raw, s.slice(raw.length)];
}

// ------------------------------------------------------------ maths

type V = { v: number; pct: boolean };

const FUNCS: Record<string, (x: number) => number> = {
	sqrt: Math.sqrt,
	cbrt: Math.cbrt,
	abs: Math.abs,
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	asin: Math.asin,
	acos: Math.acos,
	atan: Math.atan,
	ln: Math.log,
	log: Math.log10,
	log10: Math.log10,
	log2: Math.log2,
	exp: Math.exp,
	round: Math.round,
	floor: Math.floor,
	ceil: Math.ceil,
};
const CONSTS: Record<string, number> = {
	pi: Math.PI,
	tau: Math.PI * 2,
	e: Math.E,
};

/** A recursive-descent parser for sums: no eval, nothing but numbers and these operators. */
class Parser {
	i = 0;
	ops = 0;
	percent = false;
	constructor(readonly s: string) {}

	rest() {
		return this.s.slice(this.i);
	}
	ws() {
		this.i = this.s.length - this.rest().trimStart().length;
	}
	eat(t: string) {
		this.ws();
		const ok = this.rest().startsWith(t);
		if (ok) this.i += t.length;
		return ok;
	}
	/** The letters (then digits, for log10) at the cursor. */
	word() {
		this.ws();
		const r = this.rest();
		const letters = /^[a-z]*/.exec(r)?.[0] ?? '';
		const withDigits = /^[a-z]+\d*/.exec(r)?.[0] ?? '';
		return letters && withDigits in FUNCS ? withDigits : letters;
	}
	eatWord(w: string) {
		return this.word() === w && this.eat(w);
	}

	expr(): V | null {
		let a: V | null = this.term();
		if (!a) return null;
		for (;;) {
			const sign = this.eat('+') ? 1 : this.eat('-') ? -1 : 0;
			if (!sign) return a;
			const b: V | null = this.term();
			if (!b) return null;
			this.ops++;
			a =
				b.pct && !a.pct
					? { v: a.v * (1 + sign * b.v), pct: false }
					: { v: a.v + sign * b.v, pct: a.pct && b.pct };
		}
	}

	term(): V | null {
		let a: V | null = this.unary();
		if (!a) return null;
		for (;;) {
			const r = this.rest();
			// "1920x1080" multiplies; "0x10" is hexadecimal, which this does not read
			if (
				/^x[\da-f]/i.test(r) &&
				/(?:^|[^\d.])0$/.test(this.s.slice(0, this.i))
			)
				return null;
			const gluedX = /^x\d/.test(r);
			let op: string;
			if (this.eat('*') || (gluedX && this.eat('x'))) op = '*';
			else if (this.eat('/')) op = '/';
			else if (this.eat('%') || this.eatWord('mod')) op = '%';
			else if (a.pct && this.eatWord('of')) op = 'o';
			else if (a.pct && this.eatWord('off')) op = 'f';
			else if (
				this.rest().startsWith('(') ||
				this.word() in FUNCS ||
				this.word() in CONSTS
			)
				op = '*';
			else return a;
			const b: V | null = this.unary();
			if (!b) return null;
			this.ops++;
			const v: number =
				op === '*' || op === 'o'
					? a.v * b.v
					: op === '/'
						? a.v / b.v
						: op === '%'
							? a.v % b.v
							: b.v * (1 - a.v);
			a = { v, pct: false };
		}
	}

	unary(): V | null {
		if (this.eat('-')) {
			const v: V | null = this.unary();
			return v && { ...v, v: -v.v };
		}
		if (this.eat('+')) return this.unary();
		const a: V | null = this.postfix();
		if (!a) return null;
		if (this.eat('^') || this.eat('**')) {
			const b: V | null = this.unary();
			if (!b) return null;
			this.ops++;
			return { v: a.v ** b.v, pct: false };
		}
		return a;
	}

	postfix(): V | null {
		const a: V | null = this.primary();
		if (!a) return null;
		for (;;) {
			this.ws();
			const r = this.rest();
			if (r.startsWith('!') && !r.startsWith('!=')) {
				if (!Number.isInteger(a.v) || a.v < 0 || a.v > 170) return null;
				this.i++;
				this.ops++;
				let f = 1;
				for (let k = 2; k <= a.v; k++) f *= k;
				a.v = f;
			} else if (r.startsWith('%') && !/^[\d(.]/.test(r.slice(1).trimStart())) {
				this.i++;
				this.percent = true;
				a.v /= 100;
				a.pct = true;
			} else if (this.eatWord('deg')) {
				a.v = (a.v * Math.PI) / 180;
			} else {
				return a;
			}
		}
	}

	primary(): V | null {
		if (this.eat('(')) {
			const v: V | null = this.expr();
			return v && this.eat(')') ? v : null;
		}
		this.ws();
		if (/^[\d.]/.test(this.rest())) {
			const n = number(this.rest());
			if (!n) return null;
			let v = n[0];
			this.i = this.s.length - n[2].length;
			for (const [w, m] of [
				['k', 1e3],
				['bn', 1e9],
				[' thousand', 1e3],
				[' million', 1e6],
				[' billion', 1e9],
			] as const) {
				const r = this.rest();
				if (r.startsWith(w) && !/^[a-z]/.test(r.slice(w.length))) {
					this.i += w.length;
					v *= m;
				}
			}
			return { v, pct: false };
		}
		const w = this.word();
		if (w in CONSTS) {
			this.i += w.length;
			return { v: CONSTS[w], pct: false };
		}
		const f = FUNCS[w];
		if (!f) return null;
		this.i += w.length;
		const arg: V | null = this.unary();
		if (!arg) return null;
		this.ops++;
		return { v: f(arg.v), pct: false };
	}
}

function maths(q: string): Answer | null {
	let s = ` ${q} `;
	for (const [a, b] of [
		[' plus ', ' + '],
		[' minus ', ' - '],
		[' times ', ' * '],
		[' multiplied by ', ' * '],
		[' x ', ' * '],
		[' divided by ', ' / '],
		[' over ', ' / '],
		[' to the power of ', ' ^ '],
		[' percent ', '% '],
		[' squared ', ' ^ 2 '],
		[' cubed ', ' ^ 3 '],
		['square root of ', 'sqrt '],
		['cube root of ', 'cbrt '],
		['°', ' deg '],
	]) {
		s = s.replaceAll(a, b);
	}
	s = s.trim();
	// dates and phone numbers are not sums
	const dashed = s.split(/[-/]/).length;
	const long = s.includes('-') && s.split('-').some((g) => g.length >= 4);
	if (/^[\d\-/.]+$/.test(s) && (dashed > 2 || long)) return null;
	const p = new Parser(s);
	const v = p.expr();
	p.ws();
	if (!v || p.i !== s.length || p.ops === 0 || !Number.isFinite(v.v)) {
		return null;
	}
	const output = v.pct ? `${num(v.v * 100, 10)}%` : num(v.v, 10);
	return {
		kind: p.percent ? 'percent' : 'math',
		input: q,
		inputLabel: '',
		output,
		outputLabel: '',
		detail: '',
		copy: plain(output),
	};
}

// ------------------------------------------------------------ units

type Dim =
	| 'length'
	| 'mass'
	| 'volume'
	| 'temp'
	| 'speed'
	| 'area'
	| 'data'
	| 'time';

/** `base = value * factor + offset`, in m, kg, L, K, m/s, m², bytes or s. */
type Unit = {
	sym: string;
	names: string[];
	dim: Dim;
	factor: number;
	offset: number;
	label: string;
	/** The unit a bare quantity converts to; empty when it needs a target. */
	pair: string;
	note: string;
};

function u(
	sym: string,
	names: string,
	dim: Dim,
	factor: number,
	label: string,
	pair: string,
	extra: Partial<Unit> = {},
): Unit {
	return {
		sym,
		names: names.split(' '),
		dim,
		factor,
		offset: 0,
		label,
		pair,
		note: '',
		...extra,
	};
}

const UNITS: Unit[] = [
	u('mm', 'mm millimetre millimeter', 'length', 0.001, 'Millimetres', 'in'),
	u('cm', 'cm centimetre centimeter', 'length', 0.01, 'Centimetres', 'in'),
	u('m', 'm metre meter', 'length', 1, 'Metres', 'ft'),
	u('km', 'km kilometre kilometer', 'length', 1000, 'Kilometres', 'mi'),
	u('in', 'in inch inches "', 'length', 0.0254, 'Inches', 'cm'),
	u('ft', "ft foot feet ' feetandinches", 'length', 0.3048, 'Feet', 'm'),
	u('yd', 'yd yard', 'length', 0.9144, 'Yards', 'm'),
	u('mi', 'mi mile', 'length', 1609.344, 'Miles', 'km'),
	u('nmi', 'nmi nauticalmile', 'length', 1852, 'Nautical miles', 'km'),
	u('mg', 'mg milligram', 'mass', 1e-6, 'Milligrams', 'g'),
	u('g', 'g gram gramme', 'mass', 0.001, 'Grams', 'oz'),
	u('kg', 'kg kilo kilogram kilogramme', 'mass', 1, 'Kilograms', 'lb'),
	u('t', 't tonne ton metricton', 'mass', 1000, 'Tonnes', 'kg', {
		note: 'Metric tonne; a US ton is 907.18 kg',
	}),
	u('US ton*', 'uston shortton', 'mass', 907.18474, 'US tons', 'kg'),
	u(
		'long ton*',
		'longton ukton imperialton',
		'mass',
		1016.0469088,
		'Long tons',
		'kg',
	),
	u('lb', 'lb pound', 'mass', 0.45359237, 'Pounds', 'kg'),
	u('oz', 'oz ounce', 'mass', 0.028349523125, 'Ounces', 'g'),
	u('st', 'stone', 'mass', 6.35029318, 'Stone', 'kg'),
	u(
		'mL',
		'ml millilitre milliliter cc',
		'volume',
		0.001,
		'Millilitres',
		'fl oz',
	),
	u('L', 'l litre liter', 'volume', 1, 'Litres', 'gal'),
	u('tsp', 'tsp teaspoon', 'volume', 0.00492892159375, 'US teaspoons', 'mL', {
		note: 'US teaspoon; a metric one is 5 mL',
	}),
	u(
		'tbsp',
		'tbsp tbs tablespoon',
		'volume',
		0.01478676478125,
		'US tablespoons',
		'mL',
		{
			note: 'US tablespoon; Australian is 20 mL, UK 15 mL',
		},
	),
	u(
		'fl oz',
		'floz fluidounce',
		'volume',
		0.0295735295625,
		'US fluid ounces',
		'mL',
		{
			note: 'US fluid ounce; UK is 28.41 mL',
		},
	),
	u('cup*', 'cup', 'volume', 0.2365882365, 'US cups', 'mL', {
		note: 'US cup; a metric cup is 250 mL',
	}),
	u('metric cup*', 'metriccup', 'volume', 0.25, 'Metric cups', 'mL'),
	u('pt', 'pt pint', 'volume', 0.473176473, 'US pints', 'mL', {
		note: 'US pint; UK is 568 mL',
	}),
	u('UK pt', 'ukpint imperialpint', 'volume', 0.56826125, 'UK pints', 'mL'),
	u('qt', 'qt quart', 'volume', 0.946352946, 'US quarts', 'L'),
	u('gal', 'gal gallon', 'volume', 3.785411784, 'US gallons', 'L', {
		note: 'US gallon; UK is 4.546 L',
	}),
	u(
		'UK gal',
		'ukgal ukgallon imperialgallon',
		'volume',
		4.54609,
		'UK gallons',
		'L',
	),
	u('m³', 'm3 m^3 cubicmetre cubicmeter', 'volume', 1000, 'Cubic metres', 'L'),
	u(
		'°C',
		'°c c celsius centigrade degc degreec degreesc degreecelsius degreescelsius',
		'temp',
		1,
		'Celsius',
		'°F',
		{ offset: 273.15 },
	),
	u(
		'°F',
		'°f f fahrenheit degf degreef degreesf degreefahrenheit degreesfahrenheit',
		'temp',
		5 / 9,
		'Fahrenheit',
		'°C',
		{ offset: 273.15 - (32 * 5) / 9 },
	),
	u('K', 'k kelvin', 'temp', 1, 'Kelvin', '°C'),
	u(
		'km/h',
		'km/h kmh kph kmph kmperhour kilometreperhour kilometresperhour kilometerperhour kilometersperhour',
		'speed',
		1 / 3.6,
		'Kilometres per hour',
		'mph',
	),
	u(
		'mph',
		'mph mi/h mileperhour milesperhour',
		'speed',
		0.44704,
		'Miles per hour',
		'km/h',
	),
	u(
		'm/s',
		'm/s mps metrepersecond metrespersecond meterpersecond meterspersecond',
		'speed',
		1,
		'Metres per second',
		'km/h',
	),
	u('kn', 'kn kt knot', 'speed', 1852 / 3600, 'Knots', 'km/h'),
	u(
		'm²',
		'm2 m^2 sqm sqmetre sqmeter squaremetre squaremeter',
		'area',
		1,
		'Square metres',
		'ft²',
	),
	u(
		'km²',
		'km2 km^2 sqkm squarekilometre squarekilometer',
		'area',
		1e6,
		'Square kilometres',
		'mi²',
	),
	u(
		'cm²',
		'cm2 cm^2 sqcm squarecentimetre squarecentimeter',
		'area',
		1e-4,
		'Square centimetres',
		'in²',
	),
	u('ha', 'ha hectare', 'area', 1e4, 'Hectares', 'ac'),
	u('ac', 'ac acre', 'area', 4046.8564224, 'Acres', 'ha'),
	u(
		'ft²',
		'ft2 ft^2 sqft squarefoot squarefeet',
		'area',
		0.09290304,
		'Square feet',
		'm²',
	),
	u(
		'in²',
		'in2 in^2 sqin squareinch',
		'area',
		0.00064516,
		'Square inches',
		'cm²',
	),
	u(
		'mi²',
		'mi2 mi^2 sqmi squaremile',
		'area',
		2589988.110336,
		'Square miles',
		'km²',
	),
	u(
		'yd²',
		'yd2 yd^2 sqyd squareyard',
		'area',
		0.83612736,
		'Square yards',
		'm²',
	),
	u('bit*', 'bit', 'data', 0.125, 'Bits', ''),
	u('B', 'b byte', 'data', 1, 'Bytes', ''),
	u('KB', 'kb kilobyte', 'data', 1e3, 'Kilobytes', ''),
	u('MB', 'mb megabyte', 'data', 1e6, 'Megabytes', ''),
	u('GB', 'gb gigabyte', 'data', 1e9, 'Gigabytes', ''),
	u('TB', 'tb terabyte', 'data', 1e12, 'Terabytes', ''),
	u('PB', 'pb petabyte', 'data', 1e15, 'Petabytes', ''),
	u('KiB', 'kib kibibyte', 'data', 1024, 'Kibibytes', ''),
	u('MiB', 'mib mebibyte', 'data', 1048576, 'Mebibytes', ''),
	u('GiB', 'gib gibibyte', 'data', 1073741824, 'Gibibytes', ''),
	u('TiB', 'tib tebibyte', 'data', 1099511627776, 'Tebibytes', ''),
	u('ms', 'ms millisecond msec', 'time', 0.001, 'Milliseconds', ''),
	u('s', 's sec second', 'time', 1, 'Seconds', ''),
	u('min', 'min minute', 'time', 60, 'Minutes', ''),
	u('h', 'h hr hour', 'time', 3600, 'Hours', ''),
	u('day*', 'd day', 'time', 86400, 'Days', ''),
	u('week*', 'wk week', 'time', 604800, 'Weeks', ''),
	u('fortnight*', 'fortnight', 'time', 1209600, 'Fortnights', ''),
	u('month*', 'mo month', 'time', 2629746, 'Months', '', {
		note: 'An average month, 30.44 days',
	}),
	u('year*', 'yr year', 'time', 31556952, 'Years', '', {
		note: 'An average year, 365.24 days',
	}),
];

/** ECB currencies: code, label, typed names. */
const MONEY: [string, string, string][] = [
	['AUD', 'Australian dollars', 'aud a$ au$ aussiedollar australiandollar'],
	['BRL', 'Brazilian reais', 'brl r$ real reais brazilianreal'],
	['CAD', 'Canadian dollars', 'cad c$ ca$ canadiandollar'],
	['CHF', 'Swiss francs', 'chf franc swissfranc'],
	['CNY', 'Chinese yuan', 'cny yuan rmb renminbi chineseyuan'],
	['CZK', 'Czech koruna', 'czk koruna'],
	['DKK', 'Danish kroner', 'dkk danishkrone'],
	['EUR', 'Euros', 'eur € euro'],
	[
		'GBP',
		'British pounds',
		'gbp £ pound quid sterling poundsterling britishpound',
	],
	['HKD', 'Hong Kong dollars', 'hkd hk$ hongkongdollar'],
	['HUF', 'Hungarian forints', 'huf forint'],
	['IDR', 'Indonesian rupiah', 'idr rp rupiah indonesianrupiah'],
	['ILS', 'Israeli shekels', 'ils ₪ shekel'],
	['INR', 'Indian rupees', 'inr ₹ rupee indianrupee'],
	['ISK', 'Icelandic krónur', 'isk'],
	['JPY', 'Japanese yen', 'jpy ¥ yen japaneseyen'],
	['KRW', 'South Korean won', 'krw ₩ won koreanwon southkoreanwon'],
	['MXN', 'Mexican pesos', 'mxn peso mexicanpeso'],
	['MYR', 'Malaysian ringgit', 'myr rm ringgit malaysianringgit'],
	['NOK', 'Norwegian kroner', 'nok norwegiankrone'],
	['NZD', 'New Zealand dollars', 'nzd nz$ kiwidollar newzealanddollar'],
	['PHP', 'Philippine pesos', 'php ₱ philippinepeso'],
	['PLN', 'Polish złoty', 'pln zł zloty'],
	['RON', 'Romanian lei', 'ron leu lei'],
	['SEK', 'Swedish kronor', 'sek swedishkrona'],
	['SGD', 'Singapore dollars', 'sgd s$ sg$ singaporedollar'],
	['THB', 'Thai baht', 'thb ฿ baht thaibaht'],
	['TRY', 'Turkish lira', 'try lira turkishlira'],
	['USD', 'US dollars', 'usd $ us$ dollar buck usdollar americandollar'],
	['ZAR', 'South African rand', 'zar rand'],
];

/** The home currency by time zone; the first prefix that matches wins. */
const HOME: [string, string][] = [
	['Australia/', 'AUD'],
	['Pacific/Auckland', 'NZD'],
	['Asia/Jakarta', 'IDR'],
	['Asia/Makassar', 'IDR'],
	['Asia/Jayapura', 'IDR'],
	['Asia/Pontianak', 'IDR'],
	['Asia/Singapore', 'SGD'],
	['Asia/Kuala_Lumpur', 'MYR'],
	['Asia/Kuching', 'MYR'],
	['Asia/Bangkok', 'THB'],
	['Asia/Tokyo', 'JPY'],
	['Asia/Seoul', 'KRW'],
	['Asia/Shanghai', 'CNY'],
	['Asia/Hong_Kong', 'HKD'],
	['Asia/Manila', 'PHP'],
	['Asia/Kolkata', 'INR'],
	['Asia/Jerusalem', 'ILS'],
	['Europe/London', 'GBP'],
	['Europe/Zurich', 'CHF'],
	['Europe/Stockholm', 'SEK'],
	['Europe/Oslo', 'NOK'],
	['Europe/Copenhagen', 'DKK'],
	['Europe/Warsaw', 'PLN'],
	['Europe/Prague', 'CZK'],
	['Europe/Budapest', 'HUF'],
	['Europe/Bucharest', 'RON'],
	['Europe/Istanbul', 'TRY'],
	['Atlantic/Reykjavik', 'ISK'],
	['Africa/Johannesburg', 'ZAR'],
	['America/Sao_Paulo', 'BRL'],
	['America/Mexico_City', 'MXN'],
	['America/Toronto', 'CAD'],
	['America/Vancouver', 'CAD'],
	['America/Edmonton', 'CAD'],
	['America/Winnipeg', 'CAD'],
	['America/Halifax', 'CAD'],
	['Europe/', 'EUR'],
];

/** Number words, longest first. */
const WORDS: [string, number][] = [
	['a quarter of a ', 0.25],
	['quarter of a ', 0.25],
	['a quarter ', 0.25],
	['half a ', 0.5],
	['half an ', 0.5],
	['a dozen ', 12],
	['dozen ', 12],
	['half ', 0.5],
	['quarter ', 0.25],
	['a ', 1],
	['an ', 1],
	['one ', 1],
	['two ', 2],
	['three ', 3],
	['four ', 4],
	['five ', 5],
	['six ', 6],
	['seven ', 7],
	['eight ', 8],
	['nine ', 9],
	['ten ', 10],
	['eleven ', 11],
	['twelve ', 12],
];

/** Multipliers after a number: [word, by, must touch the number, needs a currency next]. */
const MULT: [string, number, boolean, boolean][] = [
	['thousand', 1e3, false, false],
	['million', 1e6, false, false],
	['billion', 1e9, false, false],
	['trillion', 1e12, false, false],
	['ribu', 1e3, false, false],
	['juta', 1e6, false, false],
	['dozen', 12, false, false],
	['k', 1e3, true, false],
	['rb', 1e3, true, false],
	['jt', 1e6, true, false],
	['mn', 1e6, true, false],
	['mil', 1e6, true, false],
	['bn', 1e9, true, false],
	['m', 1e6, true, true],
	['b', 1e9, true, true],
];

function findName<T>(key: string, items: [T, string[]][]): T | null {
	for (const k of [key, key.replace(/s$/, ''), key.replace(/es$/, '')]) {
		if (!k) continue;
		const hit = items.find(([, names]) => names.includes(k));
		if (hit) return hit[0];
	}
	return null;
}

const unitNames = UNITS.map((x): [Unit, string[]] => [x, x.names]);
const moneyNames = MONEY.map((m): [string, string[]] => [
	m[0],
	m[2].split(' '),
]);

function unit(key: string) {
	return findName(key, unitNames);
}
function money(key: string) {
	return findName(key, moneyNames);
}
function squash(s: string) {
	return s.replace(/[ .]/g, '');
}

type Amount = {
	v: number;
	unit: Unit | null;
	money: string | null;
	counted: boolean;
	digits: boolean;
	glued: boolean;
	text: string;
	label: string;
};

function show(v: number, x: Unit) {
	const s = x.sym.endsWith('*') ? x.sym.slice(0, -1) : null;
	if (s) return `${num(v, 6)} ${s}${v !== 1 ? 's' : ''}`;
	return `${num(v, 6)} ${x.sym}`;
}

function amount(input: string): Amount | null {
	let s = input.trim();
	// a currency symbol in front: "$20", "a$50", "rp 100k"
	let sym: string | null = null;
	let best = '';
	for (const [code, , names] of MONEY) {
		for (const n of names.split(' ')) {
			const symbolic = /[^a-z]/.test(n) || n === 'rp' || n === 'rm';
			if (
				symbolic &&
				s.startsWith(n) &&
				/^\s*\d/.test(s.slice(n.length)) &&
				n.length > best.length
			) {
				sym = code;
				best = n;
			}
		}
	}
	if (sym) s = s.slice(best.length).trimStart();
	let v: number;
	let raw = '';
	let rest: string;
	let digits: boolean;
	const n = number(s);
	if (n) {
		[v, raw, rest] = n;
		digits = true;
		const frac = rest.startsWith('/') ? number(rest.slice(1)) : null;
		if (frac && frac[0] !== 0) {
			v /= frac[0];
			rest = frac[2];
		}
	} else {
		const w = WORDS.find(([word]) => s.startsWith(word));
		if (w) {
			v = w[1];
			rest = s.slice(w[0].length);
		} else {
			v = 1;
			rest = s;
		}
		digits = false;
	}
	const counted = digits || rest.length < s.length;
	if (digits) {
		const word = /^[a-z]*/.exec(rest.trimStart())?.[0] ?? '';
		const after = rest.trimStart().slice(word.length).trim();
		const tight = !rest.startsWith(' ');
		const m = MULT.find(
			([w, , mustTouch, needsMoney]) =>
				w === word &&
				(tight || !mustTouch) &&
				(!needsMoney || sym !== null || money(squash(after)) !== null),
		);
		if (m) {
			v *= m[1];
			rest = after;
		}
	}
	const glued = !rest.startsWith(' ');
	rest = rest.trim();
	const key = squash(rest.replace(/ of water$/, ''));
	let cur: string | null;
	if (sym) {
		cur = key ? money(key) : sym;
		if (key && !cur) return null;
	} else {
		cur = money(key);
	}
	if (cur === 'IDR' && raw.includes('.') && !raw.includes(',')) {
		// Indonesians write thousands with dots: "Rp 100.000"
		const groups = raw.split('.').slice(1);
		if (groups.every((g) => g.length === 3))
			v *= Number(raw.replaceAll('.', '')) / Number(raw);
	}
	const un = sym || !key ? null : unit(key);
	if (!un && !cur && key) return compound(v, rest, digits);
	return {
		v,
		unit: un,
		money: cur,
		counted,
		digits,
		glued: glued && digits && un !== null && key.length === 1,
		text: un ? show(v, un) : '',
		label: un ? un.label : '',
	};
}

/** Two amounts of one kind written together: 5'11", "5 ft 11", "1 h 30 min". */
function compound(v: number, rest: string, digits: boolean): Amount | null {
	const j = digits ? rest.search(/\d/) : -1;
	if (j < 0) return null;
	const u1 = unit(squash(rest.slice(0, j)));
	if (!u1) return null;
	const second = amount(rest.slice(j));
	if (!second) return null;
	const inch = UNITS.find((x) => x.sym === 'in') ?? null;
	const u2 =
		second.unit ??
		(u1.sym === 'ft' && !second.money && second.digits ? inch : null);
	if (!u2 || u2.dim !== u1.dim || u2.offset !== 0 || u1 === u2) return null;
	const [text, label] = second.unit
		? [second.text, second.label]
		: [show(second.v, u2), u2.label];
	return {
		v: (v * u1.factor) / u2.factor + second.v,
		unit: u2,
		money: null,
		counted: true,
		digits: true,
		glued: false,
		text: `${show(v, u1)} ${text}`,
		label: `${u1.label} and ${label.toLowerCase()}`,
	};
}

function units(a: Amount, to: Unit): Answer | null {
	const from = a.unit;
	if (!from) return null;
	const base = a.v * from.factor + from.offset;
	// nothing is colder than absolute zero
	if (from.dim === 'temp' && base < 0) return null;
	const r = (base - to.offset) / to.factor;
	if (!Number.isFinite(r)) return null;
	const output = show(r, to);
	const decimalData = (x: Unit) => x.dim === 'data' && x.sym.length === 2;
	let detail = '';
	if (from.dim !== to.dim) {
		detail = 'Assuming water (1 mL weighs 1 g); other ingredients differ';
	} else if (from.note || to.note) {
		detail = from.note || to.note;
	} else if (decimalData(from) && decimalData(to)) {
		const p = Math.log10(from.factor) / 3;
		const q = Math.log10(to.factor) / 3;
		const bin = (x: Unit) => `${x.sym[0]}iB`;
		detail = `Binary units: ${num(a.v, 6)} ${bin(from)} = ${num(a.v * 1024 ** (p - q), 6)} ${bin(to)}`;
	} else if (to.sym === 'ft' && from.sym !== 'ft' && Math.abs(r) < 10) {
		const inches = Math.round(r * 120) / 10;
		detail = `${Math.floor(inches / 12)} ft ${num(inches % 12, 3)} in`;
	}
	return {
		kind: 'units',
		input: a.text,
		inputLabel: a.label,
		output,
		outputLabel: to.label,
		detail,
		copy: plain(output.split(' ')[0]),
	};
}

/** "2026-10-20" → "20 Oct 2026". */
function dayMonth(date: string): string {
	const [y, m, d] = date.split('-').map(Number);
	const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
	return m >= 1 && m <= 12 && d ? `${d} ${months[m - 1]} ${y}` : date;
}

/** `x` with exactly `dec` decimals and thousands separators: 1,650,000.00. */
function fixed(x: number, dec: number) {
	return group(x.toFixed(dec));
}

/**
 * Money, at the ECB's rates. The real launcher fetches them on your computer
 * twice a day; this page has the rates of the day it was built, and says
 * which day. Built without them, the card says it cannot convert.
 */
function currency(a: Amount, to: string, rates?: Rates | null): Answer | null {
	const from = a.money;
	if (!from) return null;
	const label = (c: string) => MONEY.find((m) => m[0] === c)?.[1] ?? c;
	const input = `${num(a.v, 10)} ${from}`;
	if (!rates) {
		return {
			kind: 'currency',
			input,
			inputLabel: label(from),
			output: to,
			outputLabel: label(to),
			detail:
				'This copy has no exchange rates to convert with. Super Space uses the day’s ECB rates.',
			copy: '',
		};
	}
	const rate = (c: string) => {
		if (c === 'EUR') return 1;
		const r = rates.eur[c];
		return r && r > 0 ? r : null;
	};
	const rt = rate(to);
	const rf = rate(from);
	if (rt === null || rf === null) return null;
	const per = rt / rf;
	const r = a.v * per;
	if (!Number.isFinite(r)) return null;
	const shown = Math.abs(r) >= 1 ? fixed(r, 2) : num(r, 4);
	const [x, y, one] = per >= 1 ? [from, to, per] : [to, from, 1 / per];
	return {
		kind: 'currency',
		input,
		inputLabel: label(from),
		output: `${shown} ${to}`,
		outputLabel: label(to),
		detail: `1 ${x} = ${num(one, 4)} ${y} · ECB rate of ${dayMonth(rates.date)}`,
		copy: plain(shown),
	};
}

function convert(
	q: string,
	homeZone: string,
	rates?: Rates | null,
): Answer | null {
	// "X to Y": try each "to"/"in" from the right
	for (let i = q.length - 1; i >= 0; i--) {
		for (const sep of [' to ', ' in ', ' into ', ' as ']) {
			if (!q.startsWith(sep, i)) continue;
			const a = amount(q.slice(0, i));
			const key = squash(q.slice(i + sep.length));
			if (!a) continue;
			const to = unit(key);
			if (a.unit && to) {
				const fits =
					a.unit.dim === to.dim ||
					(a.unit.dim === 'volume' && to.dim === 'mass') ||
					(a.unit.dim === 'mass' && to.dim === 'volume');
				if (fits && (a.counted || a.unit !== to)) return units(a, to);
			}
			const cur = money(key);
			if (a.money && cur && (a.counted || a.money !== cur)) {
				return currency(a, cur, rates);
			}
		}
	}
	// a bare amount: "5 km", "72 f", "20 bucks"
	const a = amount(q);
	if (!a?.digits || a.glued) return null;
	if (a.unit?.pair) {
		const to = UNITS.find((x) => x.sym.replace(/\*$/, '') === a.unit?.pair);
		if (to) return units(a, to);
	}
	if (!a.money) return null;
	const home = HOME.find(([zone]) => homeZone.startsWith(zone))?.[1] ?? 'USD';
	return currency(
		a,
		a.money !== home ? home : home !== 'USD' ? 'USD' : 'EUR',
		rates,
	);
}

// ------------------------------------------------------------ time zones

/** Abbreviations as fixed offsets in minutes: "9am PST" means UTC-8 whatever the season. */
const ABBR: Record<string, number> = {
	utc: 0,
	gmt: 0,
	bst: 60,
	ist: 330,
	cet: 60,
	cest: 120,
	est: -300,
	edt: -240,
	cst: -360,
	cdt: -300,
	mst: -420,
	mdt: -360,
	pst: -480,
	pdt: -420,
	wib: 420,
	wita: 480,
	wit: 540,
	sgt: 480,
	hkt: 480,
	awst: 480,
	jst: 540,
	kst: 540,
	acst: 570,
	acdt: 630,
	aest: 600,
	aedt: 660,
	nzst: 720,
	nzdt: 780,
};

/**
 * Places beyond the zones' own city names (crates/answers/src/places.txt, in
 * part), and cities whose zones were renamed: browsers still list some zones
 * by their old names (Asia/Calcutta, Asia/Katmandu, Europe/Kiev, Asia/Saigon,
 * Asia/Rangoon), so the current names are here too.
 */
const PLACES: [string, string][] = [
	[
		'Australia/Sydney',
		'Australia, NSW, New South Wales, Canberra, ACT, Newcastle NSW, Wollongong, Byron Bay',
	],
	['Australia/Melbourne', 'Victoria, VIC, Geelong'],
	[
		'Australia/Brisbane',
		'Queensland, QLD, Gold Coast, Sunshine Coast, Townsville, Cairns, Toowoomba',
	],
	['Australia/Adelaide', 'South Australia, SA'],
	['Australia/Perth', 'Western Australia, WA, Fremantle'],
	['Australia/Darwin', 'Northern Territory, NT, Alice Springs'],
	['Australia/Hobart', 'Tasmania, TAS, Launceston'],
	[
		'Pacific/Auckland',
		'New Zealand, NZ, Aotearoa, Wellington, Christchurch, Queenstown',
	],
	[
		'Asia/Jakarta',
		'Indonesia, Java, Jawa, Sumatra, Bandung, Surabaya, Semarang, Medan, Yogyakarta, Jogja, Bogor, Malang, Solo',
	],
	[
		'Asia/Makassar',
		'Bali, Denpasar, Ubud, Kuta, Seminyak, Canggu, Lombok, Labuan Bajo, Flores, Manado, Sulawesi',
	],
	['Asia/Jayapura', 'Papua, Ambon, Maluku'],
	['Asia/Kuala_Lumpur', 'Malaysia, KL, Penang, Johor Bahru'],
	['Asia/Singapore', 'Singapore, SG'],
	['Asia/Bangkok', 'Thailand, Phuket, Chiang Mai'],
	[
		'Asia/Ho_Chi_Minh',
		'Vietnam, Hanoi, Ho Chi Minh City, Ho Chi Minh, Saigon, HCMC, Da Nang',
	],
	['Asia/Yangon', 'Yangon, Rangoon, Myanmar, Burma'],
	['Asia/Manila', 'Philippines, Cebu'],
	['Asia/Shanghai', 'China, Beijing, Guangzhou, Shenzhen, Chengdu'],
	['Asia/Hong_Kong', 'Hong Kong, HK'],
	['Asia/Taipei', 'Taiwan'],
	['Asia/Tokyo', 'Japan, Osaka, Kyoto, Yokohama, Sapporo, Hokkaido'],
	['Asia/Seoul', 'South Korea, Korea, Busan'],
	[
		'Asia/Kolkata',
		'India, Kolkata, Calcutta, Mumbai, Bombay, Delhi, New Delhi, Bangalore, Bengaluru, Chennai',
	],
	['Asia/Kathmandu', 'Kathmandu, Katmandu, Nepal, Pokhara'],
	['Asia/Dubai', 'UAE, Abu Dhabi'],
	[
		'Europe/London',
		'UK, United Kingdom, England, Britain, Scotland, Edinburgh, Manchester',
	],
	['Europe/Paris', 'France'],
	['Europe/Berlin', 'Germany, Munich, Hamburg'],
	['Europe/Amsterdam', 'Netherlands, Holland'],
	['Europe/Madrid', 'Spain, Barcelona'],
	['Europe/Rome', 'Italy, Milan'],
	['Europe/Kyiv', 'Kyiv, Kiev, Ukraine, Lviv, Odesa'],
	[
		'America/New_York',
		'New York City, NYC, Boston, Washington DC, Miami, Atlanta',
	],
	['America/Chicago', 'Texas, Dallas, Houston, Austin'],
	['America/Denver', 'Colorado'],
	[
		'America/Los_Angeles',
		'California, LA, San Francisco, SF, Seattle, Silicon Valley',
	],
	['America/Toronto', 'Canada, Ontario, Ottawa, Montreal'],
	['America/Sao_Paulo', 'Brazil, Rio de Janeiro, Rio'],
	['America/Mexico_City', 'Mexico'],
];

type Place = { zone: string | number; name: string };

/**
 * Cities whose zones were renamed, by the name browsers still give them
 * (Chromium reports Asia/Kolkata as Asia/Calcutta, Europe/Kyiv as Europe/Kiev):
 * shown by their current names.
 */
const RENAMED: Record<string, string> = {
	Calcutta: 'Kolkata',
	Kiev: 'Kyiv',
	Saigon: 'Ho Chi Minh City',
	Katmandu: 'Kathmandu',
	Rangoon: 'Yangon',
};

/** A zone's city, as it is called now: "Asia/Calcutta" is "Kolkata". */
function cityOf(zone: string): string {
	const city = zone.slice(zone.lastIndexOf('/') + 1).replaceAll('_', ' ');
	return RENAMED[city] ?? city;
}

let placeMap: Map<string, [string, string]> | null = null;

/** Every zone's city ("Sydney", "New York"), then the places above, by lowercase name. */
function places() {
	if (placeMap) return placeMap;
	const map = new Map<string, [string, string]>();
	const zones: string[] =
		typeof Intl.supportedValuesOf === 'function'
			? Intl.supportedValuesOf('timeZone')
			: [];
	for (const zone of zones) {
		if (zone.startsWith('Etc/') || /\d/.test(zone)) continue;
		const city = zone.slice(zone.lastIndexOf('/') + 1).replaceAll('_', ' ');
		map.set(city.toLowerCase(), [zone, cityOf(zone)]);
	}
	for (const [zone, names] of PLACES) {
		for (const n of names.split(', ')) map.set(n.toLowerCase(), [zone, n]);
	}
	placeMap = map;
	return map;
}

function lookup(name: string, home: Place): Place | null {
	const n = name
		.trim()
		.replace(/^the /, '')
		.replace(/ time$/, '')
		.trim();
	if (['here', 'home', 'local', 'my time', 'me'].includes(n)) return home;
	if (n in ABBR) return { zone: ABBR[n] * 60, name: n.toUpperCase() };
	const utc = /^(?:utc|gmt)([+-])(\d{1,2})(?::(\d\d))?$/.exec(n);
	if (utc) {
		const secs =
			(Number(utc[2]) * 3600 + Number(utc[3] ?? 0) * 60) *
			(utc[1] === '-' ? -1 : 1);
		return { zone: secs, name: utcName(secs) };
	}
	const hit = places().get(n);
	return hit ? { zone: hit[0], name: hit[1] } : null;
}

function utcName(secs: number) {
	const a = Math.abs(secs);
	const h = Math.floor(a / 3600);
	const m = Math.floor((a % 3600) / 60);
	if (!h && !m) return 'UTC';
	const sign = secs < 0 ? '-' : '+';
	return m ? `UTC${sign}${h}:${String(m).padStart(2, '0')}` : `UTC${sign}${h}`;
}

const formats = new Map<string, Intl.DateTimeFormat>();

/** One formatter per zone and kind, as making them is the slow part. */
function formatter(key: string, make: () => Intl.DateTimeFormat) {
	let f = formats.get(key);
	if (!f) {
		f = make();
		formats.set(key, f);
	}
	return f;
}

/** Seconds east of UTC in a zone at an instant. */
function offset(zone: string | number, at: number): number {
	if (typeof zone === 'number') return zone;
	const parts = formatter(
		`clock ${zone}`,
		() =>
			new Intl.DateTimeFormat('en-US', {
				timeZone: zone,
				hourCycle: 'h23',
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric',
			}),
	).formatToParts(new Date(at));
	const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
	const local = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second'),
	);
	return Math.round((local - Math.floor(at / 1000) * 1000) / 1000);
}

/** The zone's abbreviation ("AEDT", "WIB"), as the locale that names it knows it, else UTC+N. */
function abbr(zone: string, at: number, secs: number) {
	for (const locale of [
		'en-US',
		'en-GB',
		'en-AU',
		'en-NZ',
		'id-ID',
		'ja-JP',
		'en-SG',
		'en-IN',
	]) {
		const name = formatter(
			`${locale} ${zone}`,
			() =>
				new Intl.DateTimeFormat(locale, {
					timeZone: zone,
					timeZoneName: 'short',
				}),
		)
			.formatToParts(new Date(at))
			.find((p) => p.type === 'timeZoneName')?.value;
		if (name && /^[A-Z]{2,5}$/.test(name) && name !== 'GMT' && name !== 'UTC') {
			return name;
		}
	}
	return utcName(secs);
}

function label(p: Place, at: number): [number, string] {
	if (typeof p.zone === 'number') {
		return [
			p.zone,
			p.name === utcName(p.zone) ? p.name : `${p.name}, ${utcName(p.zone)}`,
		];
	}
	const secs = offset(p.zone, at);
	const short = abbr(p.zone, at, secs);
	// a zone named for its offset ("UTC") is said once
	return [secs, short === p.name ? p.name : `${p.name}, ${short}`];
}

/** "12pm", "9:30 am", "15:00", "noon" at the start: hour, minute, typed as 12-hour, the rest. */
function clock(s: string): [number, number, boolean, string] | null {
	for (const [w, h] of [
		['noon', 12],
		['midday', 12],
		['midnight', 0],
	] as const) {
		if (s.startsWith(w)) return [h, 0, true, s.slice(w.length)];
	}
	// the space before am/pm is taken only with it: "17:30 berlin" keeps its place
	const m = /^(\d{1,2})(?:[:.](\d\d))?(?:\s*(a\.m\.|p\.m\.|am|pm))?(.*)$/.exec(
		s,
	);
	if (!m) return null;
	const h = Number(m[1]);
	const mins = m[2] ? Number(m[2]) : 0;
	const colon = m[2] !== undefined && s[m[1].length] === ':';
	const rest = m[4];
	if (!(rest === '' || rest.startsWith(' ')) || mins > 59) return null;
	if (m[3]) {
		if (h < 1 || h > 12) return null;
		return [(h % 12) + (m[3].startsWith('p') ? 12 : 0), mins, true, rest];
	}
	if (colon && h < 24) return [h, mins, false, rest];
	return null;
}

const NOW = [
	'what time is it in ',
	'the time in ',
	'current time in ',
	'local time in ',
	'time now in ',
	'time in ',
	'time at ',
	'now in ',
	'clock in ',
	'time now ',
	'time ',
];

function fmt(at: number, secs: number, twelve: boolean) {
	const d = new Date(at + secs * 1000);
	const h = d.getUTCHours();
	const m = String(d.getUTCMinutes()).padStart(2, '0');
	if (!twelve) return `${String(h).padStart(2, '0')}:${m}`;
	return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

function card(from: Place, to: Place, at: number, twelve: boolean): Answer {
	const [a, inputLabel] = label(from, at);
	const [b, outputLabel] = label(to, at);
	const output = fmt(at, b, twelve);
	const d = b - a;
	const hours = Math.floor(Math.abs(d) / 3600);
	const mins = Math.floor((Math.abs(d) % 3600) / 60);
	const gap =
		hours && mins
			? `${hours} h ${mins} min`
			: hours
				? `${hours} h`
				: `${mins} min`;
	const relation =
		d === 0
			? `Same time as ${from.name}`
			: `${to.name} is ${gap} ${d > 0 ? 'ahead of' : 'behind'} ${from.name}`;
	const day = new Date(at + b * 1000).toLocaleDateString('en-AU', {
		timeZone: 'UTC',
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});
	return {
		kind: 'time',
		input: fmt(at, a, twelve),
		inputLabel,
		output,
		outputLabel,
		detail: `${day.replace(',', '')} · ${relation}`,
		copy: output,
	};
}

function time(q: string, now: number, homeZone: string): Answer | null {
	const home: Place = {
		zone: homeZone,
		name: cityOf(homeZone),
	};
	// "time in berlin", "now in tokyo", "london time"
	const prefix = NOW.find((p) => q.startsWith(p));
	const named = prefix
		? q.slice(prefix.length)
		: q.endsWith(' time now')
			? q.slice(0, -9)
			: q.endsWith(' time')
				? q.slice(0, -5)
				: null;
	if (named) {
		const to = lookup(named, home);
		if (to) return card(home, to, now, false);
	}
	// "12pm here in london", "3pm sydney in jakarta", "9am pst to aest", "3pm london"
	const c = clock(q);
	if (!c) return null;
	const [h, m, twelve] = c;
	let rest = c[3].trim();
	for (const p of ['here ', 'home ', 'local ']) {
		if (rest.startsWith(p)) rest = rest.slice(p.length);
	}
	const padded = ` ${rest}`;
	const cut = Math.max(padded.lastIndexOf(' in '), padded.lastIndexOf(' to '));
	let from: Place | null;
	let to: Place | null;
	if (cut >= 0) {
		let left = padded.slice(0, cut).trim();
		left = left.replace(/^(in|at) /, '');
		from = left ? lookup(left, home) : home;
		to = lookup(padded.slice(cut + 4), home);
	} else {
		from = lookup(rest, home);
		to = home;
	}
	if (!from || !to) return null;
	// that clock time today, in the place it was given for
	const off = label(from, now)[0];
	const local = new Date(now + off * 1000);
	const wall = Date.UTC(
		local.getUTCFullYear(),
		local.getUTCMonth(),
		local.getUTCDate(),
		h,
		m,
	);
	let at = wall - off * 1000;
	// across a daylight-saving change the offset at that time can differ
	const off2 = label(from, at)[0];
	if (off2 !== off) at = wall - off2 * 1000;
	return card(from, to, at, twelve);
}

/** The answer for a query, or null when it is not a question these answer. */
export function answer(
	q: string,
	now = Date.now(),
	homeZone?: string,
	rates?: Rates | null,
): Answer | null {
	const s = normalize(q);
	if (!s) return null;
	const zone =
		homeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
	return time(s, now, zone) ?? convert(s, zone, rates) ?? maths(s);
}

let syntax: Set<string> | null = null;

/**
 * A word a quick answer reads rather than searches for: an operator ("times",
 * "mod", "off"), a unit or currency ("cm", "usd"), a number word, a clock's
 * ("pm", "noon") or a word that joins them ("in", "to", "what is"). Under an
 * answer card, the launcher searches only for the other words.
 */
export function answerWord(word: string): boolean {
	if (!syntax) {
		syntax = new Set(
			[
				'plus minus times multiplied by x divided over to the power of percent squared cubed square cube root mod off deg degree degrees',
				'to in into as of water and what whats is how much many calculate calc convert equals',
				'am pm noon midday midnight time now here home local current clock at me my',
				Object.keys(FUNCS).join(' '),
				Object.keys(CONSTS).join(' '),
				Object.keys(ABBR).join(' '),
				UNITS.flatMap((x) => x.names).join(' '),
				MONEY.map((m) => m[2]).join(' '),
				WORDS.map((w) => w[0]).join(' '),
				MULT.map((m) => m[0]).join(' '),
			]
				.join(' ')
				.split(/\s+/)
				.filter(Boolean),
		);
	}
	const set = syntax;
	return [word, word.replace(/s$/, ''), word.replace(/es$/, '')].some((k) =>
		set.has(k),
	);
}
