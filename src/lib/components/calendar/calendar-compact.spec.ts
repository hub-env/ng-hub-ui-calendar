import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDay } from '../../models/calendar-day';
import { CalendarEvent } from '../../models/calendar-event';
import { CalendarViewType } from '../../models/calendar-view';
import { HubCalendarComponent } from './calendar.component';

/**
 * The mini-month: a calendar that fits a dashboard card.
 *
 * Two defects meet here. The header could not be taken away, so at 260px of height the
 * toolbar spent half of it and one week of the month was visible; and the view switcher
 * rendered a button even when `availableViews` offered a single view, which is a control
 * that can do nothing and still costs a row.
 *
 * The height half is pinned off the stylesheet the build injects rather than off measured
 * boxes, the way `calendar-layout.spec.ts` does it: the test environment is jsdom, which
 * lays nothing out, and what decides the result on a page is the CSS after Sass and the
 * emulated-encapsulation shim have had their turn.
 */

/** One `selector { … }` rule of the shipped stylesheet, with the encapsulation attributes stripped. */
interface StyleRule {
	selector: string;
	body: string;
}

function shippedRules(): StyleRule[] {
	const css = Array.from(document.querySelectorAll('style'))
		.map((style) => style.textContent ?? '')
		.filter((text) => text.includes('hub-calendar'))
		.join('\n')
		.replace(/\/\*[\s\S]*?\*\//g, '');

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

/** Body of the single rule whose selector is exactly `selector`. */
function ruleBody(selector: string): string {
	const found = shippedRules().filter((rule) => rule.selector === selector);
	expect(found.length, `expected exactly one rule for "${selector}"`).toBe(1);
	return found[0].body;
}

/** Value of a declaration inside a rule body, or `undefined` when it is not declared. */
function declaration(body: string, property: string): string | undefined {
	const match = body.match(new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;]+)`));
	return match?.[1].trim();
}

describe('hub-calendar compact month', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let component: HubCalendarComponent;
	let componentRef: ComponentRef<HubCalendarComponent>;

	/** Fixed reference date: Wednesday, July 15, 2026. */
	const baseDate = new Date(2026, 6, 15);

	const events: CalendarEvent[] = [
		{ id: 1, title: 'Team sync', start: new Date(2026, 6, 15, 10, 0) },
		{ id: 2, title: 'Release review', start: new Date(2026, 6, 20, 9, 0) }
	];

	function host(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function query(selector: string): HTMLElement[] {
		return [...host().querySelectorAll<HTMLElement>(selector)];
	}

	function textsOf(selector: string): string[] {
		return query(selector).map((el) => (el.textContent ?? '').trim());
	}

	/** The accessible names of the cells that carry an event marker. */
	function markedDays(): string[] {
		return query('.hub-calendar__day-marker').map((marker) =>
			(marker.closest('.hub-calendar__day') as HTMLElement).getAttribute('aria-label')
		) as string[];
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [HubCalendarComponent] }).compileComponents();

		fixture = TestBed.createComponent(HubCalendarComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;

		componentRef.setInput('selectedDate', new Date(baseDate));
		componentRef.setInput('events', events);
		fixture.detectChanges();
	});

	/**
	 * A control offering one choice is not a control. This half is a defect on its own —
	 * an ordinary, full-size calendar narrowed to one view rendered the button too.
	 */
	describe('View switcher with a single available view', () => {
		it('does not render the switcher at all', () => {
			componentRef.setInput('config', { availableViews: [CalendarViewType.MONTH] });
			fixture.detectChanges();

			expect(query('.hub-calendar__views').length).toBe(0);
			// And nothing else of the header goes with it: the arrows and "today" still work.
			expect(query('.hub-calendar__nav').length).toBe(1);
			expect(textsOf('.hub-calendar__title')).toEqual(['July 2026']);
		});

		it('brings it back the moment there are two views to choose between', () => {
			componentRef.setInput('config', { availableViews: [CalendarViewType.MONTH, CalendarViewType.WEEK] });
			fixture.detectChanges();

			expect(query('.hub-calendar__views').length).toBe(1);
			expect(textsOf('.hub-calendar__views .hub-calendar__btn')).toEqual(['Month', 'Week']);
		});

		it('leaves the default four-view calendar exactly as it was', () => {
			expect(textsOf('.hub-calendar__views .hub-calendar__btn')).toEqual(['Month', 'Week', 'Day', 'Year']);
		});
	});

	describe('Compact chrome', () => {
		beforeEach(() => {
			componentRef.setInput('compact', true);
			fixture.detectChanges();
		});

		it('drops the today shortcut, the arrows and the view switcher, and keeps the month', () => {
			expect(query('.hub-calendar__btn').length).toBe(0);
			expect(query('.hub-calendar__nav').length).toBe(0);
			expect(query('.hub-calendar__views').length).toBe(0);
			// The one thing a month grid cannot be read without.
			expect(textsOf('.hub-calendar__title')).toEqual(['July 2026']);
		});

		it('is reached through the host class, so the stylesheet can find it', () => {
			expect(host().classList.contains('hub-calendar--compact')).toBe(true);
		});

		it('accepts the bare attribute form, not only a bound boolean', () => {
			// `compact` reads as a boolean attribute, so `<hub-calendar compact>` works.
			expect(component.compact()).toBe(true);
			componentRef.setInput('compact', '');
			fixture.detectChanges();
			expect(component.compact()).toBe(true);
		});

		it('still leaves navigation reachable from the outside', () => {
			component.next();
			fixture.detectChanges();

			expect(textsOf('.hub-calendar__title')).toEqual(['August 2026']);
		});
	});

	describe('Compact cells', () => {
		beforeEach(() => {
			componentRef.setInput('compact', true);
			fixture.detectChanges();
		});

		it('draws no event chips — there is no room for a title in a cell this size', () => {
			expect(query('.hub-calendar__event').length).toBe(0);
			expect(query('.hub-calendar__more').length).toBe(0);
			// The month itself is all there: six rows of seven, as always.
			expect(query('.hub-calendar__day').length).toBe(42);
		});

		it('marks the days that hold events, and only those', () => {
			expect(markedDays()).toEqual(['Wednesday, July 15, 2026, 1 events', 'Monday, July 20, 2026, 1 events']);
		});

		it('re-marks the month when the event list changes', () => {
			componentRef.setInput('events', []);
			fixture.detectChanges();
			expect(markedDays()).toEqual([]);

			componentRef.setInput('events', [{ id: 3, title: 'Audit', start: new Date(2026, 6, 2, 9, 0) }]);
			fixture.detectChanges();
			expect(markedDays()).toEqual(['Thursday, July 2, 2026, 1 events']);
		});

		it('says the count in the cell name, since the dot is hidden from assistive technology', () => {
			expect(query('.hub-calendar__day-marker')[0].getAttribute('aria-hidden')).toBe('true');

			const quiet = query('.hub-calendar__day').find(
				(cell) => cell.getAttribute('aria-label') === 'Friday, July 3, 2026'
			);
			// A day with nothing on it says nothing extra.
			expect(quiet).toBeTruthy();
		});

		it('leaves a consumer day-cell template in charge where one is given', () => {
			// Nothing here asserts the template path directly — it is covered in
			// `calendar.component.spec.ts` — but the compact branch must not come first.
			expect(component.dayCellTemplate()).toBeUndefined();
		});
	});

	/**
	 * Initials are a property of the language, not of a translated name. Spanish is the
	 * case that proves it: slicing "Martes" and "Miércoles" gives M for both, and the
	 * language's own answer is M and X.
	 */
	describe('Compact weekday initials', () => {
		beforeEach(() => {
			componentRef.setInput('compact', true);
			fixture.detectChanges();
		});

		it('takes the initials from the locale rather than from the dictionary', () => {
			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			expect(textsOf('.hub-calendar__weekday')).toEqual(['D', 'L', 'M', 'X', 'J', 'V', 'S']);
		});

		it('narrows the English headers too', () => {
			expect(textsOf('.hub-calendar__weekday')).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
		});

		it('yields to an explicit weekdayFormat, which is an instruction and not a default', () => {
			componentRef.setInput('weekdayFormat', 'short');
			fixture.detectChanges();

			expect(textsOf('.hub-calendar__weekday')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
		});
	});

	/**
	 * The height itself. A day cell asks for 80px and a week row for 100px, which is six
	 * hundred-odd pixels of month before a date is drawn — so a calendar given 260px could
	 * only show the first week and scroll the rest.
	 */
	describe('Compact height', () => {
		it('keeps the ordinary floors where they were', () => {
			expect(declaration(ruleBody('.hub-calendar__week'), 'min-height')).toBe('100px');
			expect(declaration(ruleBody('.hub-calendar__day'), 'min-height')).toBe('var(--hub-calendar-day-min-height, 80px)');
		});

		it('lifts both of them off the compact grid', () => {
			// Six rows at 2rem is 192px; the caption and the weekday header add some twenty
			// each, which is the "whole month in about 250px" this exists for.
			expect(declaration(ruleBody('.hub-calendar--compact .hub-calendar__week'), 'min-height')).toBe(
				'var(--hub-calendar-compact-row-min-height, 2rem)'
			);
			expect(declaration(ruleBody('.hub-calendar--compact .hub-calendar__day'), 'min-height')).toBe('0');
		});

		it('draws six rows whatever the month, so the grid never jumps as it is paged', () => {
			componentRef.setInput('compact', true);

			for (const month of [1, 2, 7, 10]) {
				componentRef.setInput('selectedDate', new Date(2026, month, 1));
				fixture.detectChanges();

				expect(query('.hub-calendar__week').length).toBe(6);
			}
		});

		it('declares no `--hub-calendar-*` token of its own, so an application `:root` still reaches it', () => {
			const compact = shippedRules().filter((rule) => rule.selector.includes('.hub-calendar--compact'));

			expect(compact.length).toBeGreaterThan(0);
			for (const rule of compact) {
				expect(rule.body).not.toMatch(/--hub-calendar-[a-z-]+\s*:/);
			}
		});
	});

	/** Compact is a variant. Everything an ordinary calendar drew, it still draws. */
	describe('The ordinary calendar is untouched', () => {
		it('keeps its chips, its toolbar and its short weekday headers', () => {
			expect(query('.hub-calendar__event').length).toBeGreaterThan(0);
			expect(query('.hub-calendar__nav').length).toBe(1);
			expect(query('.hub-calendar__views').length).toBe(1);
			expect(textsOf('.hub-calendar__weekday')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
			expect(query('.hub-calendar__day-marker').length).toBe(0);
		});

		it('keeps the plain full-date name on every cell', () => {
			const labels = query('.hub-calendar__day').map((cell) => cell.getAttribute('aria-label'));

			expect(labels).toContain('Wednesday, July 15, 2026');
		});
	});
	/**
	 * A compact day says what it holds when you point at it.
	 *
	 * The dot is five pixels wide and `aria-hidden`, so on its own it tells a sighted reader that
	 * something is there and never what. A full-size cell has always drawn its chips with the
	 * titles on them; compact trades the chips for the dot, and without this it would have traded
	 * the information away with them. The cell reuses the list the overflow chip already builds,
	 * so the two densities say the same words.
	 */
	describe('Compact day tooltips', () => {
		beforeEach(() => {
			componentRef.setInput('compact', true);
			fixture.detectChanges();
		});

		it('names what a day holds, and says nothing on a day holding nothing', () => {
			const days = component.weeks().flatMap((week) => week.days);
			const busy = days.find((day: CalendarDay<unknown>) => day.events.length > 0);
			const empty = days.find((day: CalendarDay<unknown>) => day.events.length === 0);

			expect(busy, 'a day holding events').toBeTruthy();
			expect(empty, 'a day holding none').toBeTruthy();

			const tooltip = component.getDayEventsTooltip(busy!);

			expect(tooltip.length, 'the day names something').toBeGreaterThan(0);
			expect(tooltip).toContain(busy!.events[0].title);
			expect(component.getDayEventsTooltip(empty!), 'an empty day stays quiet').toBe('');
		});

		it('binds the tooltip to the cell rather than to the dot, which is five pixels of nothing', () => {
			const marker = fixture.nativeElement.querySelector('.hub-calendar__day-marker') as HTMLElement;

			expect(marker, 'a marked day').toBeTruthy();
			expect(marker.getAttribute('aria-hidden'), 'the dot stays out of the accessibility tree').toBe('true');
			expect(marker.closest('.hub-calendar__day'), 'the cell is what carries the hint').toBeTruthy();
		});
	});
});

/**
 * The day view's heading was assembled by hand — weekday, comma, month, day, comma, year.
 * That is English word order and only English word order.
 */
describe('hub-calendar day-view heading', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let componentRef: ComponentRef<HubCalendarComponent>;

	function heading(): string {
		return (
			(fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__day-view-header h3')?.textContent ?? ''
		).trim();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [HubCalendarComponent] }).compileComponents();

		fixture = TestBed.createComponent(HubCalendarComponent);
		componentRef = fixture.componentRef;
		componentRef.setInput('selectedDate', new Date(2026, 8, 20));
		componentRef.setInput('view', CalendarViewType.DAY);
		fixture.detectChanges();
	});

	it('writes the date in the order the language writes it', () => {
		componentRef.setInput('locale', 'es');
		fixture.detectChanges();

		// Not "domingo, septiembre 20, 2026", which is what joining the pieces here produced.
		expect(heading()).toBe('domingo, 20 de septiembre de 2026');
	});

	it('leaves English exactly as it was, down to the comma', () => {
		expect(heading()).toBe('Sunday, September 20, 2026');
	});
});
