import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HubOverflowTooltipDirective, HubTooltipDirective } from 'ng-hub-ui-utils';
import { CalendarEvent } from '../../models/calendar-event';
import { CalendarViewType } from '../../models/calendar-view';
import { HubCalendarComponent } from './calendar.component';

/**
 * What a chip says when it cannot show everything it holds.
 *
 * Two separate silences were being fixed here: a timed chip whose title is cut showed no
 * tooltip at all, and the "+N more" chip named a number and never the events behind it.
 *
 * jsdom lays nothing out, so `scrollWidth` and `clientWidth` are both zero and no tooltip
 * can be made to appear under test. What is pinned instead is the wiring the tooltip needs
 * to be able to work: which element the truncation is measured on, and that that element is
 * the one shaped to clip.
 */
describe('calendar event tooltips', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let component: HubCalendarComponent;
	let componentRef: ComponentRef<HubCalendarComponent>;

	/** Wednesday, 15 July 2026. */
	const baseDate = new Date(2026, 6, 15);

	/** One all-day event and four timed ones on the same day, so the month cell overflows. */
	const events: CalendarEvent[] = [
		{ id: 'a', title: 'Company offsite', start: new Date(2026, 6, 15), allDay: true },
		{ id: 'b', title: 'Team sync', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
		{ id: 'c', title: 'Client call', start: new Date(2026, 6, 15, 11, 0), end: new Date(2026, 6, 15, 12, 0) },
		{ id: 'd', title: 'Design review', start: new Date(2026, 6, 15, 15, 0), end: new Date(2026, 6, 15, 16, 0) },
		{ id: 'e', title: 'Retro', start: new Date(2026, 6, 15, 17, 0), end: new Date(2026, 6, 15, 18, 0) }
	];

	/** Class list of every element the overflow tooltip is attached to, deduplicated. */
	function overflowTooltipHosts(): string[] {
		const hosts = fixture.debugElement
			.queryAll(By.directive(HubOverflowTooltipDirective))
			.map((de) => (de.nativeElement as HTMLElement).classList[0]);
		return [...new Set(hosts)];
	}

	/** What each attached tooltip has been told to measure, deduplicated. */
	function overflowTooltipTargets(): (string | undefined)[] {
		const targets = fixture.debugElement
			.queryAll(By.directive(HubOverflowTooltipDirective))
			.map((de) => de.injector.get(HubOverflowTooltipDirective).measureTarget());
		return [...new Set(targets)];
	}

	/**
	 * The hour as the calendar itself prints it. Spelling it out in the assertion would pin
	 * the locale's clock format, which is not what these specs are about.
	 */
	function hourOf(id: string): string {
		const event = events.find((candidate) => candidate.id === id)!;
		return component.getEventTime(event, baseDate);
	}

	/**
	 * The clock time the day list writes, built here rather than read off the component: what
	 * is being pinned is the format, and taking it from the code under test would pin nothing.
	 */
	function clockOf(id: string, locale = 'en'): string {
		const event = events.find((candidate) => candidate.id === id)!;
		return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(event.start));
	}

	function setView(view: CalendarViewType): void {
		componentRef.setInput('view', view);
		fixture.detectChanges();
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
	 * The tooltip used to be measured on the chip. That worked while a chip was a plain block
	 * whose own box did the clipping, and stopped working the moment the timed chip became a
	 * flex row: a flex child that clips its own text never lets the overflow reach the parent,
	 * so the chip reported no truncation and retired its own tooltip. All-day chips, still
	 * blocks, kept theirs — which is exactly the half-working state that was reported.
	 */
	describe('Truncation is measured where the text is cut', () => {
		it('covers the whole chip, and measures the title inside it', () => {
			// The chip is one control — it carries `role="button"` — so the pointer must get the
			// same answer over the dot, over the hour and over the title alike.
			expect(overflowTooltipHosts()).toEqual(['hub-calendar__event']);
			// And the measurement stays on the one box that clips. Measuring the chip is the
			// defect this came from: a flex child clipping its own text hides the overflow from
			// its parent, so the chip reports none and retires its own tooltip.
			expect(overflowTooltipTargets()).toEqual(['.hub-calendar__event-title']);
		});

		it('does the same in the week view, for the all-day strip and the hour grid alike', () => {
			setView(CalendarViewType.WEEK);

			// Both kinds of chip are on screen here: the all-day one in the strip, the timed
			// ones against the ruler.
			expect(fixture.debugElement.queryAll(By.css('.hub-calendar__all-day-cell .hub-calendar__event')).length).toBe(1);
			expect(fixture.debugElement.queryAll(By.css('.hub-calendar__day-events > .hub-calendar__event')).length).toBe(4);
			expect(overflowTooltipHosts()).toEqual(['hub-calendar__event']);
			expect(overflowTooltipTargets()).toEqual(['.hub-calendar__event-title']);
		});

		it('does the same in the day view', () => {
			setView(CalendarViewType.DAY);

			expect(overflowTooltipHosts()).toEqual(['hub-calendar__event']);
			expect(overflowTooltipTargets()).toEqual(['.hub-calendar__event-title']);
		});

		it('gives every chip a tooltip, not only the all-day ones', () => {
			const titled = fixture.debugElement.queryAll(By.directive(HubOverflowTooltipDirective));

			// Three chips are drawn in the cell, one title each — the fourth and fifth events
			// are behind the "+N more" chip.
			expect(titled.length).toBe(3);
		});

		it('announces the whole row, title and hour, not just the half that was clipped', () => {
			const said = fixture.debugElement
				.queryAll(By.directive(HubOverflowTooltipDirective))
				.map((de) => de.injector.get(HubOverflowTooltipDirective).text());

			// The hour is the piece a narrow cell squeezes out from beside the title, so it is
			// the piece the tooltip most has to carry. An all-day event has none, and gets no
			// separator left dangling behind it.
			expect(said).toEqual(['Company offsite', `Team sync · ${hourOf('b')}`, `Client call · ${hourOf('c')}`]);
		});

		it('carries the hour into the week and day views as well', () => {
			setView(CalendarViewType.DAY);

			const said = fixture.debugElement
				.queryAll(By.directive(HubOverflowTooltipDirective))
				.map((de) => de.injector.get(HubOverflowTooltipDirective).text());

			expect(said).toContain('Company offsite');
			expect(said).toContain(`Design review · ${hourOf('d')}`);
		});

		it('listens on the element every part of the chip lives inside', () => {
			// A timed chip: the one made of three parts, and the one the defect was seen on.
			const host = fixture.debugElement
				.queryAll(By.directive(HubOverflowTooltipDirective))
				.map((de) => de.nativeElement as HTMLElement)
				.find((el) => el.classList.contains('hub-calendar__event--timed')) as HTMLElement;

			expect(host).toBeDefined();
			const parts = ['.hub-calendar__event-dot', '.hub-calendar__event-title', '.hub-calendar__event-time'].map(
				(selector) => host.querySelector(selector)
			);

			// Where it LISTENS, which is a different question from where it measures: the
			// pointer has to reach the tooltip over the hour and the dot as surely as over the
			// title, and it only does if all three sit inside the element carrying it.
			expect(parts.every((part) => part !== null && host.contains(part))).toBe(true);
		});

		it('makes the parts of a chip inert, so the pointer always lands on the chip', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.filter((text) => text.includes('hub-calendar'))
				.join('\n')
				.replace(/\/\*[\s\S]*?\*\//g, '');
			const inert = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((match) => /pointer-events:\s*none/.test(match[2]));
			const selector = (inert?.[1] ?? '').replace(/\[_ng(content|host)-[^\]]*\]/g, '');

			// Hit-testing otherwise resolves to whichever span the pointer happens to be over,
			// and a control that answers in part of its own area and not the rest is the defect
			// this is here to prevent: the hour reported no tooltip while the dot and the title
			// did.
			expect(selector).toContain('.hub-calendar__event-dot');
			expect(selector).toContain('.hub-calendar__event-time');
			expect(selector).toContain('.hub-calendar__event-title');
		});

		it('has one tooltip per chip, not one per part of it', () => {
			// Two directives on the same chip would mean two bubbles for one control.
			expect(fixture.debugElement.queryAll(By.directive(HubOverflowTooltipDirective)).length).toBe(
				fixture.debugElement.queryAll(By.css('.hub-calendar__day .hub-calendar__event')).length
			);
		});

		it('shapes the title as the box that clips, which is what makes it measurable', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.filter((text) => text.includes('hub-calendar'))
				.join('\n')
				.replace(/\/\*[\s\S]*?\*\//g, '');
			const rule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
				(match) => match[1].replace(/\[_ng(content|host)-[^\]]*\]/g, '').trim() === '.hub-calendar__event-title'
			);

			expect(rule).toBeDefined();
			// An inline element clips nothing and reports both widths as zero, so the tooltip
			// could never fire on it however the chip around it is laid out.
			expect(rule?.[2]).toContain('display: block');
			expect(rule?.[2]).toContain('overflow: hidden');
			expect(rule?.[2]).toContain('text-overflow: ellipsis');
		});
	});

	/**
	 * The "+N more" chip said how many events were missing and never which, so the only way
	 * to find out was to open the day.
	 */
	describe('The "+N more" chip names what it hides', () => {
		function moreChip(): HTMLElement {
			return (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__more') as HTMLElement;
		}

		/** Text the "+N more" chip hands its tooltip. */
		function dayList(): string {
			const tooltip = fixture.debugElement
				.queryAll(By.directive(HubTooltipDirective))
				.find((de) => (de.nativeElement as HTMLElement).classList.contains('hub-calendar__more'));

			expect(tooltip).toBeDefined();
			return tooltip?.injector.get(HubTooltipDirective).text() ?? '';
		}

		it('lists the whole day: the all-day event named, the timed ones under their hour', () => {
			// The day entire — the three chips already on screen and the two behind the label.
			// A list of only the leftovers would have to be added to what is above it by eye,
			// and seeing the day at a glance is the whole reason to hover the chip.
			expect(dayList()).toBe(
				[
					'All day: Company offsite',
					`- ${clockOf('b')}: Team sync`,
					`- ${clockOf('c')}: Client call`,
					`- ${clockOf('d')}: Design review`,
					`- ${clockOf('e')}: Retro`
				].join('\n')
			);
		});

		it('writes the minutes here even where the chip abbreviates them away', () => {
			// The chip drops `:00` because a month cell has no room for it; a list where some
			// lines carry minutes and others do not reads as ragged rather than as brief.
			expect(hourOf('b')).not.toContain(':');
			expect(dayList()).toContain(`- ${clockOf('b')}: Team sync`);
			expect(clockOf('b')).toContain(':');
		});

		it('starts straight at the bullets when the day holds nothing all-day', () => {
			componentRef.setInput(
				'events',
				events.filter((event) => !event.allDay)
			);
			fixture.detectChanges();

			const list = dayList();
			// No header left hanging and no blank first line where the all-day one would be.
			expect(list.startsWith('- ')).toBe(true);
			expect(list).not.toContain('All day');
		});

		it('heads one line per all-day event, so every line is one event', () => {
			componentRef.setInput('events', [
				{ id: 'a', title: 'Company offsite', start: new Date(2026, 6, 15), allDay: true },
				{ id: 'f', title: 'Bank holiday', start: new Date(2026, 6, 15), allDay: true },
				...events.filter((event) => !event.allDay)
			]);
			fixture.detectChanges();

			expect(dayList().split('\n').slice(0, 2)).toEqual(['All day: Company offsite', 'All day: Bank holiday']);
		});

		it('translates the all-day heading rather than printing it in English', () => {
			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			// The dictionary's own `allDay`, the same word the week and day views print in the
			// margin of their all-day strip. A second key for it would be one more thing to
			// translate and one more thing to drift out of step with the strip.
			expect(dayList().split('\n')[0]).toBe('Todo el día: Company offsite');
			// And the hour follows the locale with it: 24-hour in Spanish.
			expect(dayList()).toContain(`- ${clockOf('e', 'es')}: Retro`);
		});

		it('asks the bubble to keep those line breaks, which it otherwise collapses', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.filter((text) => text.includes('hub-calendar'))
				.join('\n');
			const rule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
				(match) => match[1].replace(/\[_ng(content|host)-[^\]]*\]/g, '').trim() === '.hub-calendar__more'
			);

			// The bubble is portaled to `<body>`, so the host is the only element a rule of ours
			// can reach; the directive forwards the tooltip's own custom properties from it onto the bubble.
			expect(rule?.[2]).toContain('--hub-tooltip-white-space: pre-line');
		});

		it('keeps showing the count as its visible text', () => {
			expect(moreChip().textContent?.trim()).toBe('+2 more');
		});

		it('says the same thing to a screen reader, which a hover tooltip never reaches', () => {
			// The chip is not focusable, so the tooltip's `aria-describedby` — wired only while
			// the bubble is up — is a pointer affordance and nothing else. The name carries the
			// count it shows and the same day the tooltip lists.
			expect(moreChip().getAttribute('aria-label')).toBe(
				`+2 more: All day: Company offsite, ${clockOf('b')}: Team sync, ${clockOf('c')}: Client call, ${clockOf('d')}: Design review, ${clockOf('e')}: Retro`
			);
			// A bare `<span>` is `role="generic"`, which prohibits a name — the label would be
			// dropped by the accessibility tree.
			expect(moreChip().getAttribute('role')).toBe('note');
		});

		it('follows the locale, so the count and the titles are not read in two languages', () => {
			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			expect(moreChip().getAttribute('aria-label')).toBe(
				`+2 más: Todo el día: Company offsite, ${clockOf('b', 'es')}: Team sync, ${clockOf('c', 'es')}: Client call, ${clockOf('d', 'es')}: Design review, ${clockOf('e', 'es')}: Retro`
			);
		});
	});
});
