import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarEvent } from '../../models/calendar-event';
import { CalendarViewType } from '../../models/calendar-view';
import { provideHubCalendar } from '../../services/calendar-config';
import { HubCalendarComponent } from './calendar.component';

/**
 * The presentation formats, one axis per describe.
 *
 * Two claims are pinned throughout and are worth stating once. The first is that **no default
 * moves**: every axis is `undefined` out of the box and the calendar writes exactly what it wrote
 * before any of this existed, so no existing calendar changes appearance. The second is the
 * resolution order — instance input, else `provideHubCalendar()`, else the built-in — which is the
 * order `<hub-datepicker>` resolves its own formats in, because a consumer of both should not have
 * to learn two.
 */
describe('calendar formats', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let componentRef: ComponentRef<HubCalendarComponent>;

	/** Wednesday, 15 July 2026. */
	const baseDate = new Date(2026, 6, 15);

	const events: CalendarEvent[] = [
		{ id: 'a', title: 'Company offsite', start: new Date(2026, 6, 15), allDay: true },
		{ id: 'b', title: 'Team sync', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
		{ id: 'c', title: 'Client call', start: new Date(2026, 6, 15, 13, 40), end: new Date(2026, 6, 15, 14, 0) }
	];

	function text(selector: string): string {
		return ((fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent ?? '').trim();
	}

	function all(selector: string): string[] {
		return [...(fixture.nativeElement as HTMLElement).querySelectorAll(selector)].map((el) =>
			(el.textContent ?? '').trim()
		);
	}

	/** The day list the "+N more" chip carries, read off its accessible name. */
	function dayList(): string {
		return (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__more')?.getAttribute('aria-label') ?? '';
	}

	function setInputs(inputs: Record<string, unknown>): void {
		for (const [name, value] of Object.entries(inputs)) {
			componentRef.setInput(name, value);
		}
		fixture.detectChanges();
	}

	/** Builds the fixture, optionally under an application-wide configuration. */
	async function build(providers: unknown[] = []): Promise<void> {
		TestBed.resetTestingModule();
		await TestBed.configureTestingModule({
			imports: [HubCalendarComponent],
			providers: providers as never[]
		}).compileComponents();

		fixture = TestBed.createComponent(HubCalendarComponent);
		componentRef = fixture.componentRef;
		componentRef.setInput('selectedDate', new Date(baseDate));
		componentRef.setInput('events', events);
		fixture.detectChanges();
	}

	beforeEach(async () => {
		await build();
	});

	describe('Nothing configured', () => {
		it('writes every date and time exactly as it did before the axes existed', () => {
			expect(text('.hub-calendar__title')).toBe('July 2026');
			expect(all('.hub-calendar__weekday')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

			setInputs({ view: CalendarViewType.WEEK });
			// The bare number and a literal `:00`: not a clock, not localized, and not to be lost.
			expect(all('.hub-calendar__time-slot').slice(0, 2)).toEqual(['0:00', '1:00']);

			setInputs({ view: CalendarViewType.YEAR });
			expect(all('.hub-calendar__month-name').slice(0, 2)).toEqual(['January', 'February']);
		});

		it('keeps the month chip abbreviating a whole hour and the tooltip spelling it out', () => {
			// The abbreviation is not an oversight to be levelled up: a month cell is a hundred
			// pixels wide and the hour shares it with a dot and a title.
			expect(all('.hub-calendar__event-time')).toEqual(['9 AM', '1:40 PM']);
		});
	});

	describe('hourFormat', () => {
		it('forces a 24-hour clock on every clock the calendar writes', () => {
			setInputs({ hourFormat: '24' });

			expect(all('.hub-calendar__event-time')).toEqual(['09', '13:40']);
		});

		it('forces a 12-hour clock on a locale that would not have one', () => {
			setInputs({ locale: 'es', hourFormat: '12' });

			expect(all('.hub-calendar__event-time')).toEqual(['9 a. m.', '1:40 p. m.']);
		});

		it('turns the hour ruler into a real clock, which unset it is not', () => {
			setInputs({ view: CalendarViewType.WEEK, hourFormat: '12' });

			// A consumer who says the calendar runs on a 12-hour clock has said it about the
			// ruler too, so this is the one thing `hourFormat` alone changes there.
			expect(all('.hub-calendar__time-slot').slice(0, 2)).toEqual(['12 AM', '1 AM']);
		});

		it('leaves the clock to the language when nothing is forced', () => {
			setInputs({ locale: 'es' });

			expect(all('.hub-calendar__event-time')).toEqual(['9', '13:40']);
		});
	});

	describe('displayFormat', () => {
		it('accepts Intl options for the header title', () => {
			setInputs({ displayFormat: { year: 'numeric', month: 'short' } });

			expect(text('.hub-calendar__title')).toBe('Jul 2026');
		});

		it('accepts an Angular date pattern', () => {
			setInputs({ displayFormat: 'MMMM yyyy' });

			expect(text('.hub-calendar__title')).toBe('July 2026');
		});

		it('accepts a function, and hands it the date rather than a string', () => {
			setInputs({ displayFormat: (date: Date) => `Week of ${date.getDate()}` });

			expect(text('.hub-calendar__title')).toBe('Week of 15');
		});

		it('leaves the year view alone, whose title names a year', () => {
			setInputs({ view: CalendarViewType.YEAR, displayFormat: { year: 'numeric', month: 'long' } });

			// Narrowed like the datepicker narrows against its granularity: a month-shaped format
			// here would print a month nobody chose.
			expect(text('.hub-calendar__title')).toBe('2026');
		});
	});

	describe('timeDisplayFormat', () => {
		it('writes the clock of the day tooltip', () => {
			// A fourth event so the cell overflows and the "+N more" chip, which carries the day
			// list, is drawn at all. Its accessible name holds the same lines the tooltip does.
			componentRef.setInput('events', [...events, { id: 'd', title: 'Retro', start: new Date(2026, 6, 15, 17, 0) }]);
			setInputs({ timeDisplayFormat: { hour: '2-digit', minute: '2-digit' } });

			expect(dayList()).toContain('09:00 AM: Team sync');
		});

		it('is composed with hourFormat rather than taken as written', () => {
			componentRef.setInput('events', [...events, { id: 'd', title: 'Retro', start: new Date(2026, 6, 15, 17, 0) }]);
			setInputs({ timeDisplayFormat: { hour: '2-digit', minute: '2-digit' }, hourFormat: '24' });

			expect(dayList()).toContain('09:00: Team sync');
		});
	});

	describe('eventTimeFormat', () => {
		it('replaces the month chip abbreviation without touching the tooltip', () => {
			componentRef.setInput('events', [...events, { id: 'd', title: 'Retro', start: new Date(2026, 6, 15, 17, 0) }]);
			setInputs({ eventTimeFormat: { hour: '2-digit', minute: '2-digit' } });

			expect(all('.hub-calendar__event-time')).toEqual(['09:00 AM', '01:40 PM']);
			// The tooltip has its own axis and did not move with it.
			expect(dayList()).toContain('9:00 AM: Team sync');
		});

		it('accepts a pattern, which is used as written', () => {
			setInputs({ eventTimeFormat: 'HH:mm' });

			expect(all('.hub-calendar__event-time')).toEqual(['09:00', '13:40']);
		});
	});

	describe('slotLabelFormat', () => {
		it('writes the hour ruler', () => {
			setInputs({ view: CalendarViewType.WEEK, slotLabelFormat: 'HH:mm' });

			expect(all('.hub-calendar__time-slot').slice(0, 2)).toEqual(['00:00', '01:00']);
		});

		it('wins over hourFormat, which only decides the built-in shape', () => {
			setInputs({ view: CalendarViewType.DAY, slotLabelFormat: 'HH', hourFormat: '12' });

			expect(all('.hub-calendar__time-slot').slice(0, 2)).toEqual(['00', '01']);
		});
	});

	describe('weekdayFormat', () => {
		it('spells the weekday headers out', () => {
			setInputs({ weekdayFormat: 'long' });

			expect(all('.hub-calendar__weekday').slice(0, 2)).toEqual(['Sunday', 'Monday']);
		});

		it('narrows them to a letter, taken from the locale for want of a dictionary entry', () => {
			setInputs({ weekdayFormat: 'narrow' });

			expect(all('.hub-calendar__weekday')).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
		});

		it('reaches the week view day headers too', () => {
			setInputs({ view: CalendarViewType.WEEK, weekdayFormat: 'long' });

			expect(all('.hub-calendar__day-name').slice(0, 1)).toEqual(['Sunday']);
		});

		it('leaves the accessible column names spelled out whatever it says', () => {
			setInputs({ weekdayFormat: 'narrow' });

			const headers = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__weekday')];
			expect(headers[1].getAttribute('aria-label')).toBe('Monday');
		});
	});

	describe('monthFormat', () => {
		it('abbreviates the header title', () => {
			setInputs({ monthFormat: 'short' });

			expect(text('.hub-calendar__title')).toBe('Jul 2026');
		});

		it('abbreviates the year view cards', () => {
			setInputs({ view: CalendarViewType.YEAR, monthFormat: 'short' });

			expect(all('.hub-calendar__month-name').slice(0, 2)).toEqual(['Jan', 'Feb']);
		});

		it('leaves the grid accessible name spelled out', () => {
			setInputs({ monthFormat: 'short' });

			const grid = (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__month');
			expect(grid?.getAttribute('aria-label')).toBe('July 2026');
		});
	});

	describe('provideHubCalendar', () => {
		it('sets the defaults for every calendar in the application', async () => {
			await build([provideHubCalendar({ formats: { monthFormat: 'short', hourFormat: '24' } })]);

			expect(text('.hub-calendar__title')).toBe('Jul 2026');
			expect(all('.hub-calendar__event-time')).toEqual(['09', '13:40']);
		});

		it('is outranked by the instance that says otherwise', async () => {
			await build([provideHubCalendar({ formats: { monthFormat: 'short' } })]);
			setInputs({ monthFormat: 'long' });

			expect(text('.hub-calendar__title')).toBe('July 2026');
		});

		it('leaves untouched axes at their built-in defaults', async () => {
			await build([provideHubCalendar({ formats: { monthFormat: 'short' } })]);

			expect(all('.hub-calendar__weekday').slice(0, 1)).toEqual(['Sun']);
		});
	});
});
