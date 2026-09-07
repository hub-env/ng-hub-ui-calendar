import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarViewType } from '../../models/calendar-view';
import { HubCalendarComponent } from './calendar.component';

/**
 * The layout contract of the calendar chrome: where the header title sits, how the two
 * button clusters are joined, and what a fixed height does to the scrolling.
 *
 * These are read off the stylesheet the build actually injects rather than off the `.scss`
 * source, the same way `calendar-token-cascade.spec.ts` does: what decides the result on a
 * page is the CSS after Sass and the emulated-encapsulation shim have had their turn. The
 * test environment is jsdom, which lays nothing out — so what is pinned here is the rule,
 * which is where each of these three defects lived.
 */

/** One `selector { … }` rule of the shipped stylesheet, with the encapsulation attributes stripped. */
interface StyleRule {
	selector: string;
	body: string;
}

function shippedCss(): string {
	return Array.from(document.querySelectorAll('style'))
		.map((style) => style.textContent ?? '')
		.filter((text) => text.includes('hub-calendar'))
		.join('\n')
		.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * The stylesheet split in two: the rules that always apply, and the ones nested inside a
 * conditional at-rule. Keeping them apart is what lets a rule be looked up unambiguously —
 * the header and the title are each written twice now, once for a calendar with room for one
 * row and once for a calendar without.
 */
function splitCss(): { base: string; conditional: string; preludes: string[] } {
	const css = shippedCss();
	let base = '';
	let conditional = '';
	const preludes: string[] = [];

	for (let i = 0; i < css.length;) {
		const at = css.indexOf('@', i);
		const open = at < 0 ? -1 : css.indexOf('{', at);
		if (at < 0 || open < 0) {
			base += css.slice(i);
			break;
		}
		base += css.slice(i, at);
		preludes.push(css.slice(at, open).trim());

		// Walk the braces, so a rule nested inside the at-rule does not end it early.
		let depth = 0;
		let end = open;
		for (; end < css.length; end++) {
			if (css[end] === '{') depth++;
			else if (css[end] === '}' && --depth === 0) break;
		}
		conditional += css.slice(open + 1, end);
		i = end + 1;
	}
	return { base, conditional, preludes };
}

function parseRules(css: string): StyleRule[] {
	const rules: StyleRule[] = [];
	for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		rules.push({
			// `[_ngcontent-x]` / `[_nghost-x]` carry a build-specific id, so they are removed
			// rather than matched: the assertions are about selectors, not about that id.
			selector: match[1]
				.replace(/\[_ng(content|host)-[^\]]*\]/g, '')
				.replace(/\s+/g, ' ')
				.trim(),
			body: match[2]
		});
	}
	return rules;
}

/** Rules that apply whatever the calendar's width. */
function shippedRules(): StyleRule[] {
	return parseRules(splitCss().base);
}

/** Rules that apply only inside a conditional at-rule — here, the stacked header. */
function conditionalRules(): StyleRule[] {
	return parseRules(splitCss().conditional);
}

/** Body of the single conditional rule whose selector is exactly `selector`. */
function stackedBody(selector: string): string {
	const found = conditionalRules().filter((rule) => rule.selector === selector);
	expect(found.length, `expected exactly one stacked rule for "${selector}"`).toBe(1);
	return found[0].body;
}

/** Body of the single rule whose selector is exactly `selector`. */
function ruleBody(selector: string): string {
	const found = shippedRules().filter((rule) => rule.selector === selector);
	expect(found.length, `expected exactly one rule for "${selector}"`).toBe(1);
	return found[0].body;
}

/** Bodies of every rule whose selector mentions `token`, joined. */
function rulesMentioning(token: string): string {
	return shippedRules()
		.filter((rule) => rule.selector.includes(token))
		.map((rule) => rule.body)
		.join('\n');
}

/** Value of a declaration inside a rule body, or `undefined` when it is not declared. */
function declaration(body: string, property: string): string | undefined {
	const match = body.match(new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;]+)`));
	return match?.[1].trim();
}

describe('calendar layout', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let componentRef: ComponentRef<HubCalendarComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [HubCalendarComponent] }).compileComponents();

		fixture = TestBed.createComponent(HubCalendarComponent);
		componentRef = fixture.componentRef;
		fixture.detectChanges();
	});

	/**
	 * The title used to be the middle child of a `space-between` flex row, so it was centred on
	 * whatever gap the navigation and the view switcher left between them. Those two are never
	 * the same width, so it always leaned towards the narrower one and in a tight header it
	 * touched it.
	 */
	describe('Header title centring', () => {
		it('lays the header in three tracks whose two extremes are equal', () => {
			const header = ruleBody('.hub-calendar__header');

			expect(declaration(header, 'display')).toBe('grid');

			const tracks = (declaration(header, 'grid-template-columns') ?? '').split(/\s+/);
			expect(tracks.length).toBe(3);
			// Equal extremes are the whole mechanism: the middle track lands on the centre of
			// the calendar whatever the two groups hold, with one view button or with four.
			expect(tracks[0]).toBe(tracks[2]);
		});

		it('keeps a gutter between the title and either group', () => {
			const gap = declaration(ruleBody('.hub-calendar__header'), 'gap');

			expect(gap).toBeDefined();
			expect(gap).not.toBe('0');
		});

		it('anchors each group to its own end of the header', () => {
			expect(declaration(ruleBody('.hub-calendar__nav'), 'justify-self')).toBe('start');
			expect(declaration(ruleBody('.hub-calendar__views'), 'justify-self')).toBe('end');
		});

		it('never cuts the month and never splits it across two lines', () => {
			const title = ruleBody('.hub-calendar__title');

			expect(declaration(title, 'text-align')).toBe('center');
			expect(declaration(title, 'white-space')).toBe('nowrap');
			// The month is the one thing this header must always show whole. Clipping it was
			// the first attempt and it was worse than the defect it replaced: at 480px the
			// middle track collapsed to zero and the month disappeared outright.
			expect(declaration(title, 'overflow')).toBeUndefined();
			expect(declaration(title, 'text-overflow')).toBeUndefined();
			expect(declaration(title, 'min-width')).toBeUndefined();
		});

		it('makes the button groups the pieces that give, not the title', () => {
			// A grid track cannot shrink under its content unless the item says it may. With
			// this on the two extremes and not on the middle, the pressure lands on the
			// buttons and the month keeps its room.
			expect(declaration(ruleBody('.hub-calendar__nav'), 'min-width')).toBe('0');
			expect(declaration(ruleBody('.hub-calendar__views'), 'min-width')).toBe('0');

			// And a button gives inside its own box rather than past the calendar's edge.
			const btn = ruleBody('.hub-calendar__btn');
			expect(declaration(btn, 'min-width')).toBe('0');
			expect(declaration(btn, 'overflow')).toBe('hidden');
			expect(declaration(btn, 'text-overflow')).toBe('ellipsis');
		});
	});

	/**
	 * At a 480px calendar the three pieces did not fit on one row: the middle track was
	 * squeezed to zero, the month vanished, and the view switcher was cut off by the
	 * calendar's own edge. Below the threshold the header stacks instead.
	 */
	describe('Narrow header', () => {
		it("switches on the calendar's own width, not the window's", () => {
			const { preludes } = splitCss();
			const container = preludes.filter((prelude) => prelude.startsWith('@container'));

			expect(container.length).toBe(1);
			// A media query would answer the wrong question: the calendar often sits in a
			// column far narrower than the viewport, which is what the examples page is.
			expect(preludes.some((prelude) => prelude.startsWith('@media'))).toBe(false);

			// And the container it asks is the calendar itself, named on the host.
			const host = shippedRules().find((rule) => rule.body.includes('--hub-calendar-accent-emphasis:'));
			const name = container[0].match(/@container\s+([a-z-]+)/)?.[1];
			expect(name).toBeDefined();
			expect(declaration(host?.body ?? '', 'container')).toContain(name as string);
			expect(declaration(host?.body ?? '', 'container')).toContain('inline-size');
		});

		it('stacks into rows instead of squeezing the middle one', () => {
			const header = stackedBody('.hub-calendar__header');

			expect(declaration(header, 'display')).toBe('flex');
			// Wrapping, so a switcher that still does not fit beside the navigation drops
			// below it rather than past the calendar's edge.
			expect(declaration(header, 'flex-wrap')).toBe('wrap');
		});

		it('gives the title a row of its own, above the groups and centred on the calendar', () => {
			const title = stackedBody('.hub-calendar__title');

			expect(declaration(title, 'flex')).toBe('1 0 100%');
			// Above them: the month and the year are what the reader came to the header for.
			expect(declaration(title, 'order')).toBe('-1');
			// Alone on that row it squeezes nothing, so it may wrap rather than be cut.
			expect(declaration(title, 'white-space')).toBe('normal');
			// The centring is the base rule's, and the stacked layout does not touch it.
			expect(declaration(ruleBody('.hub-calendar__title'), 'text-align')).toBe('center');
		});

		it('lets each group keep its own size on the second row', () => {
			const groups = conditionalRules().find(
				(rule) => rule.selector.includes('.hub-calendar__nav') && rule.selector.includes('.hub-calendar__views')
			);

			expect(declaration(groups?.body ?? '', 'flex')).toBe('0 1 auto');
		});
	});

	/**
	 * Navigation and view switcher were two loose rows of buttons with a gap between them.
	 * They are one control each now, joined like an input group.
	 */
	describe('Header button groups', () => {
		function group(className: string): HTMLElement {
			return (fixture.nativeElement as HTMLElement).querySelector(`.${className}`) as HTMLElement;
		}

		it('marks both clusters as one joined group', () => {
			expect(group('hub-calendar__nav').classList).toContain('hub-calendar__btn-group');
			expect(group('hub-calendar__views').classList).toContain('hub-calendar__btn-group');
		});

		it('leaves no gap between the buttons of a group', () => {
			expect(declaration(ruleBody('.hub-calendar__nav'), 'gap')).toBeUndefined();
			expect(declaration(ruleBody('.hub-calendar__views'), 'gap')).toBeUndefined();
			expect(declaration(rulesMentioning('.hub-calendar__btn-group'), 'gap')).toBeUndefined();
		});

		it('collapses the border two neighbours share instead of drawing it twice', () => {
			const adjacent = shippedRules().filter(
				(rule) => rule.selector.includes('.hub-calendar__btn-group') && rule.selector.includes('+')
			);

			expect(adjacent.length).toBe(1);
			expect(declaration(adjacent[0].body, 'margin-inline-start')).toBe('-1px');
		});

		it('rounds only the two ends, with logical radii so right-to-left flips on its own', () => {
			const grouped = rulesMentioning('.hub-calendar__btn-group');

			// Squared first, then re-rounded at the ends — otherwise the inner corners keep
			// the radius every button carries on its own.
			expect(declaration(grouped, 'border-radius')).toBe('0');
			expect(grouped).toContain('border-start-start-radius');
			expect(grouped).toContain('border-end-start-radius');
			expect(grouped).toContain('border-start-end-radius');
			expect(grouped).toContain('border-end-end-radius');
			// A physical radius here would round the wrong end of an Arabic calendar.
			expect(grouped).not.toContain('border-top-left-radius');
			expect(grouped).not.toContain('border-bottom-right-radius');
		});

		it('lifts the active button and the focused one above the neighbour that overlaps them', () => {
			const active = shippedRules().find(
				(rule) => rule.selector.includes('.hub-calendar__btn-group') && rule.selector.includes('--active')
			);
			const focused = shippedRules().find(
				(rule) => rule.selector.includes('.hub-calendar__btn-group') && rule.selector.includes(':focus-visible')
			);

			expect(Number(declaration(active?.body ?? '', 'z-index'))).toBeGreaterThan(0);
			// Above the active one too: half a focus ring is not a focus ring.
			expect(Number(declaration(focused?.body ?? '', 'z-index'))).toBeGreaterThan(
				Number(declaration(active?.body ?? '', 'z-index'))
			);
		});

		it('draws the button focus ring inside the button, where a neighbour cannot clip it', () => {
			const focus = ruleBody('.hub-calendar__btn:focus-visible');

			expect(declaration(focus, 'outline')).toBeDefined();
			expect(declaration(focus, 'outline-offset')).toBe('-2px');
		});
	});

	/**
	 * Sizing the calendar used to mean writing CSS at `hub-calendar`, which is a trap: a scoped
	 * element selector outranks the component's own `:host`, so a `display` written beside the
	 * height unstacked the flex column the scrolling depends on.
	 */
	describe('Fixed height', () => {
		/** The `--hub-calendar-height` the component wrote on its host, if any. */
		function hostHeight(): string {
			return (fixture.nativeElement as HTMLElement).style.getPropertyValue('--hub-calendar-height');
		}

		function setHeight(height: number | string | undefined): void {
			componentRef.setInput('height', height);
			fixture.detectChanges();
		}

		it('takes its height from the token, so the input needs no consumer stylesheet', () => {
			// `:host` compiles to a bare `[_nghost-…]`, which the selector normalizer strips to
			// nothing — so the host rule is found by the one token it declares instead.
			const host = shippedRules().find((rule) => rule.body.includes('--hub-calendar-accent-emphasis:'));

			expect(host).toBeDefined();
			expect(declaration(host?.body ?? '', 'height')).toBe('var(--hub-calendar-height, 100%)');
		});

		it('writes nothing while no height is asked for, leaving today’s behaviour alone', () => {
			expect(hostHeight()).toBe('');
		});

		it('reads a number as pixels', () => {
			setHeight(600);
			expect(hostHeight()).toBe('600px');
		});

		it('reads a numeric string as pixels too, so the plain attribute form works', () => {
			setHeight('600');
			expect(hostHeight()).toBe('600px');
		});

		it('passes any other CSS length through as written', () => {
			setHeight('32rem');
			expect(hostHeight()).toBe('32rem');

			setHeight('60vh');
			expect(hostHeight()).toBe('60vh');
		});

		it('accepts `auto`, the FullCalendar spelling of “grow instead of scrolling”', () => {
			setHeight('auto');
			expect(hostHeight()).toBe('auto');
		});

		it('gives the slot back when the height is cleared', () => {
			setHeight(600);
			setHeight(undefined);

			expect(hostHeight()).toBe('');
		});

		it('scrolls the hour grid in the week view and keeps the headers still', () => {
			componentRef.setInput('view', CalendarViewType.WEEK);
			fixture.detectChanges();

			// The outer view clips; the hour grid is the only scroller, so the day headers and
			// the all-day strip above it stay put.
			expect(declaration(ruleBody('.hub-calendar__week-view, .hub-calendar__day-view'), 'overflow')).toBe('hidden');
			expect(declaration(ruleBody('.hub-calendar__time-grid'), 'overflow')).toBe('auto');
			expect(declaration(ruleBody('.hub-calendar__all-day'), 'flex-shrink')).toBe('0');
		});

		it('scrolls the grid in the month view and pins the weekday row to the top of it', () => {
			const weekdays = ruleBody('.hub-calendar__weekdays');

			expect(declaration(ruleBody('.hub-calendar__month'), 'overflow')).toBe('auto');
			// Sticky rather than lifted out of the scroller: sharing it is what keeps the seven
			// headers on the seven columns they label.
			expect(declaration(weekdays, 'position')).toBe('sticky');
			expect(declaration(weekdays, 'top')).toBe('0');
		});
	});
	/**
	 * The month chip, laid out the way Apple Calendar lays it out: a dot, the title, and the
	 * hour pinned to the far end. The hour is what distinguishes a timed event from an all-day
	 * one, so it is the piece that never gives — the title is.
	 */
	describe('Month event chip', () => {
		/** Wednesday, 15 July 2026: one all-day event and one timed one. */
		beforeEach(() => {
			componentRef.setInput('selectedDate', new Date(2026, 6, 15));
			componentRef.setInput('events', [
				{ id: 'a', title: 'Company offsite', start: new Date(2026, 6, 15), allDay: true },
				{ id: 'b', title: 'Team sync', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) }
			]);
			fixture.detectChanges();
		});

		/** Class of each element inside a chip, in document order. */
		function partsOf(chip: Element): string[] {
			return [...chip.children].map((child) => child.className);
		}

		function chips(): HTMLElement[] {
			return [
				...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
					'.hub-calendar__day .hub-calendar__event'
				)
			];
		}

		it('puts the hour after the title, not in front of it', () => {
			const timed = chips().find((chip) => chip.classList.contains('hub-calendar__event--timed'));

			expect(partsOf(timed as Element)).toEqual([
				'hub-calendar__event-dot',
				'hub-calendar__event-title',
				'hub-calendar__event-time'
			]);
		});

		it('leaves an all-day chip a bare title, with no hole where the hour would be', () => {
			const allDay = chips().find((chip) => chip.classList.contains('hub-calendar__event--all-day'));

			expect(partsOf(allDay as Element)).toEqual(['hub-calendar__event-title']);
		});

		it('makes the title the only piece that gives when the chip is narrow', () => {
			const title = ruleBody('.hub-calendar__event-title');
			const time = ruleBody('.hub-calendar__event-time');

			expect(declaration(title, 'flex')).toBe('1 1 auto');
			expect(declaration(title, 'min-width')).toBe('0');
			expect(declaration(title, 'text-overflow')).toBe('ellipsis');
			// The hour keeps its width whatever happens to the title beside it.
			expect(declaration(time, 'flex')).toBe('0 0 auto');
		});

		it('sets the hour smaller than the title, and relative so it re-scales with the chip', () => {
			const size = declaration(ruleBody('.hub-calendar__event-time'), 'font-size') ?? '';

			expect(size).toContain('--hub-calendar-event-time-font-size');
			const fallback = parseFloat(size.replace(/.*,\s*/, ''));
			expect(fallback).toBeGreaterThan(0);
			expect(fallback).toBeLessThan(1);
			expect(size).toContain('em');
		});

		it('prints the chip in smaller type than the day number beside it', () => {
			const chip = declaration(ruleBody('.hub-calendar__event'), 'font-size') ?? '';
			const dayNumber = declaration(ruleBody('.hub-calendar__day-number'), 'font-size') ?? '';

			// Both defaults are rem, so the literal fallbacks are directly comparable.
			const rem = (value: string) => parseFloat(value.replace(/.*?([\d.]+)rem.*/, '$1'));
			expect(rem(chip)).toBeLessThan(rem(dayNumber));
			// And notably smaller, not a hair: the point of the change was density.
			expect(rem(chip)).toBeLessThanOrEqual(0.75);
		});

		it('tightens the day cell so more events fit in it', () => {
			const padding = declaration(ruleBody('.hub-calendar__day'), 'padding') ?? '';

			expect(padding).toContain('--hub-calendar-day-padding-y');
			expect(padding).toContain('--hub-calendar-day-padding-x');

			// Both axes, and read from the literal each token chain ends in.
			const literals = [...padding.matchAll(/([\d.]+)rem/g)].map((match) => parseFloat(match[1]));
			expect(literals.length).toBe(2);
			expect(Math.max(...literals)).toBeLessThan(0.5);
		});

		it('keeps the focus ring inside the smaller chip', () => {
			expect(declaration(ruleBody('.hub-calendar__event:focus-visible'), 'outline-offset')).toBe('-2px');
		});
	});
});
