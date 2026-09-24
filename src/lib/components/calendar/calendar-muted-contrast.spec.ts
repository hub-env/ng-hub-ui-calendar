import { compile } from 'sass';
import { compositeOver, contrastRatio, oklchToRgb, parseColor, rgbToOklch, toHex, HubRgb } from 'ng-hub-ui-utils';

/**
 * Every quiet label in the calendar — the weekday header, the hour on a timed chip, the
 * "+N more" line — was painted with the application's muted grey, and the surfaces under
 * them are the calendar's own: a header bar, a day tinted with the accent, a day the
 * consumer themed. A grey chosen once against a white page does not survive any of that.
 * Measured on the docs: the hour came out at 1.75:1 on a dark theme's selected day, the
 * weekday names at 3.26:1 on that theme's header, and the hour at 4.16:1 on nothing more
 * exotic than the default accent's today tint.
 *
 * So the pair is measured here, not the token: the sheet is compiled, the ink and the
 * surface under it are resolved the way a browser resolves them — custom properties,
 * `color-mix()`, the alpha a mix with `transparent` leaves behind — and the composite is
 * put on a contrast meter. jsdom lays nothing out and resolves no `color-mix()`, so
 * measuring the element would measure nothing.
 */

/** WCAG AA for text under 24px — the weekday is 0.875rem/600, the hour 0.675rem. */
const MIN_CONTRAST = 4.5;

const sheet = compile('projects/calendar/src/lib/components/calendar/calendar.component.scss').css;

/** The body of a rule, by its exact selector. */
function ruleBody(selector: string): string {
	const start = sheet.indexOf(`${selector} {`);
	expect(start, `${selector} is not in the sheet`).toBeGreaterThan(-1);
	return sheet.slice(start + selector.length + 2, sheet.indexOf('}', start));
}

/** A declaration's value inside a rule body. */
function declared(body: string, property: string): string {
	const match = new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`).exec(body);
	expect(match, `${property} is not declared`).not.toBeNull();
	return match![1].replace(/\s+/g, ' ').trim();
}

/** Splits a function's arguments on top-level commas. */
function args(inner: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of inner) {
		if (char === '(') depth++;
		if (char === ')') depth--;
		if (char === ',' && depth === 0) {
			out.push(current.trim());
			current = '';
			continue;
		}
		current += char;
	}
	out.push(current.trim());
	return out;
}

/** The contents of `name(...)` when `value` is exactly that call. */
function call(value: string, name: string): string | null {
	if (!value.toLowerCase().startsWith(`${name}(`) || !value.endsWith(')')) {
		return null;
	}
	return value.slice(name.length + 1, -1).trim();
}

/** Interpolates two colours in OKLCh, the way `color-mix(in oklch, …)` does. */
function mixOklch(first: HubRgb, second: HubRgb, weight: number): HubRgb {
	const a = rgbToOklch(first);
	const b = rgbToOklch(second);
	let delta = b.h - a.h;
	if (delta > 180) delta -= 360;
	if (delta < -180) delta += 360;
	const mixed = oklchToRgb({
		l: a.l * weight + b.l * (1 - weight),
		c: a.c * weight + b.c * (1 - weight),
		h: (a.h + delta * (1 - weight) + 360) % 360,
		a: 1
	});
	return {
		r: Math.min(255, Math.max(0, mixed.r)),
		g: Math.min(255, Math.max(0, mixed.g)),
		b: Math.min(255, Math.max(0, mixed.b)),
		a: 1
	};
}

/**
 * Resolves a colour-valued declaration the way a browser would: substituting custom
 * properties from the theme, falling back where the theme has nothing, evaluating
 * `color-mix()` and carrying the alpha a mix with `transparent` produces.
 *
 * `ink` is what `currentColor` stands for at the point of use — the ink of the cell the
 * label sits in, which is the whole reason the mute is written against it.
 */
function resolveColor(value: string, theme: Record<string, string>, ink: string): HubRgb {
	const trimmed = value.trim();

	if (trimmed.toLowerCase() === 'currentcolor') {
		return resolveColor(ink, theme, ink);
	}
	if (trimmed.toLowerCase() === 'transparent') {
		return { r: 0, g: 0, b: 0, a: 0 };
	}

	const variable = call(trimmed, 'var');
	if (variable) {
		const [name, ...fallback] = args(variable);
		return resolveColor(theme[name] ?? fallback.join(', '), theme, ink);
	}

	const mix = call(trimmed, 'color-mix');
	if (mix) {
		const [space, first, second] = args(mix);
		const percentage = /\s([\d.]+)%$/.exec(first);
		expect(percentage, `${first} carries no percentage`).not.toBeNull();
		const weight = Number(percentage![1]) / 100;
		const a = resolveColor(first.slice(0, percentage!.index), theme, ink);
		const b = resolveColor(second, theme, ink);

		// A mix with `transparent` is premultiplied, so what comes out is the first colour
		// carrying the weight as its alpha — which is exactly what makes it read against
		// whatever surface it lands on instead of against one chosen in advance.
		if (b.a === 0) {
			return { ...a, a: weight };
		}

		// Every opaque mix in this sheet is written `in oklch`; the space is read only so a
		// future one in another space is not silently interpolated in the wrong one.
		expect(space.trim()).toBe('in oklch');
		return mixOklch(a, b, weight);
	}

	const parsed = parseColor(trimmed);
	expect(parsed, `${trimmed} is not a colour this resolver knows`).not.toBeNull();
	return parsed!;
}

/** A theme: the custom properties in force, plus what the cells under the labels are. */
interface Theme {
	readonly name: string;
	readonly tokens: Record<string, string>;
}

/** The ds light theme, which is what a calendar dropped into a page gets. */
const DS_LIGHT: Record<string, string> = {
	'--hub-sys-surface-page': '#ffffff',
	'--hub-sys-surface-elevated': '#f8f9fa',
	'--hub-sys-text-primary': '#212529',
	'--hub-sys-text-muted': '#6a737b',
	'--hub-sys-color-primary': '#0d6efd'
};

/** The ds dark theme, same tokens, the other way up. */
const DS_DARK: Record<string, string> = {
	'--hub-sys-surface-page': '#121212',
	'--hub-sys-surface-elevated': '#1e1e1e',
	'--hub-sys-text-primary': '#f8f9fa',
	'--hub-sys-text-muted': '#adb5bd',
	'--hub-sys-color-primary': '#0d6efd'
};

/**
 * The calendar the docs' own styling example paints: a consumer re-theming the component
 * with `--hub-calendar-*` alone, which is what the README tells them to do. It sets the
 * surfaces and the ink and — reasonably — says nothing about a muted alias, which is how
 * the light theme's grey ended up on a dark brown day.
 */
const DOCS_DUSK: Record<string, string> = {
	...DS_LIGHT,
	'--hub-calendar-bg': '#1f1a17',
	'--hub-calendar-color': '#f8efe7',
	'--hub-calendar-header-bg': '#2a211d',
	'--hub-calendar-day-today-bg': '#4a2f1f',
	'--hub-calendar-day-selected-bg': '#6d4329',
	'--hub-calendar-day-weekend-bg': '#2a201a',
	'--hub-calendar-day-hover-bg': '#352820'
};

const THEMES: readonly Theme[] = [
	{ name: 'ds light', tokens: DS_LIGHT },
	{ name: 'ds dark', tokens: DS_DARK },
	{ name: 'the docs dusk theme', tokens: DOCS_DUSK }
];

/** The surfaces a day-cell label can land on, read off the sheet rather than assumed. */
const DAY_SURFACES: ReadonlyArray<readonly [string, string]> = [
	['an ordinary day', ':host'],
	['today', '.hub-calendar__day--today'],
	['the selected day', '.hub-calendar__day--selected'],
	['a weekend day', '.hub-calendar__day--weekend']
];

/** The ink of a day cell: the calendar's own colour, which every cell inherits. */
const DAY_INK = 'var(--hub-calendar-color, var(--hub-sys-text-primary, #212529))';

function surface(selector: string, theme: Theme): HubRgb {
	return resolveColor(declared(ruleBody(selector), 'background'), theme.tokens, DAY_INK);
}

/** What the reader actually sees: the label composited onto the surface it sits on. */
function measured(ink: HubRgb, background: HubRgb): number {
	return contrastRatio(compositeOver(ink, background), background)!;
}

describe('calendar muted text contrast', () => {
	describe.each(THEMES)('under $name', (theme) => {
		it('reads the weekday names on the header bar', () => {
			const ink = resolveColor(declared(ruleBody('.hub-calendar__weekday'), 'color'), theme.tokens, DAY_INK);
			const background = surface('.hub-calendar__weekdays', theme);

			expect(measured(ink, background)).toBeGreaterThanOrEqual(MIN_CONTRAST);
		});

		it.each(DAY_SURFACES)('reads the hour of a timed chip on %s', (_label, selector) => {
			const ink = resolveColor(
				declared(ruleBody('.hub-calendar__event--timed .hub-calendar__event-time'), 'color'),
				theme.tokens,
				DAY_INK
			);

			expect(measured(ink, surface(selector, theme))).toBeGreaterThanOrEqual(MIN_CONTRAST);
		});

		it.each(DAY_SURFACES)('reads the overflow line on %s', (_label, selector) => {
			const ink = resolveColor(declared(ruleBody('.hub-calendar__more'), 'color'), theme.tokens, DAY_INK);

			expect(measured(ink, surface(selector, theme))).toBeGreaterThanOrEqual(MIN_CONTRAST);
		});
	});

	/** The consumer keeps the last word on both: the token is read before any default. */
	it('leaves the override hooks at the head of their chains', () => {
		expect(declared(ruleBody('.hub-calendar__weekday'), 'color')).toMatch(/^var\(--hub-calendar-muted,/);
		expect(declared(ruleBody('.hub-calendar__more'), 'color')).toMatch(/^var\(--hub-calendar-day-muted,/);
	});
});
