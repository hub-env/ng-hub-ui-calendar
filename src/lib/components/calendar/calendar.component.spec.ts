import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CalendarEvent } from '../../models/calendar-event';
import { CalendarViewType, DEFAULT_CALENDAR_CONFIG } from '../../models/calendar-view';
import { HubCalendarComponent } from './calendar.component';

describe('HubCalendarComponent', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let component: HubCalendarComponent;
	let componentRef: ComponentRef<HubCalendarComponent>;

	/** Fixed reference date: Wednesday, July 15, 2026. */
	const baseDate = new Date(2026, 6, 15);

	const mockEvents: CalendarEvent[] = [
		{ id: 1, title: 'Team sync', start: new Date(2026, 6, 15, 10, 0) },
		{ id: 2, title: 'Release review', start: new Date(2026, 6, 20, 9, 0) }
	];

	/** All rendered month-view day cells. */
	function dayCells(): HTMLElement[] {
		return fixture.debugElement.queryAll(By.css('.hub-calendar__day')).map((de) => de.nativeElement as HTMLElement);
	}

	/** The single tabbable (roving tabindex) day cell. */
	function focusableCell(): HTMLElement {
		return (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__day[tabindex="0"]') as HTMLElement;
	}

	/** Dispatches a keydown on an element and flushes change detection. */
	function keydownOn(el: HTMLElement, key: string): void {
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
		fixture.detectChanges();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HubCalendarComponent]
		}).compileComponents();

		fixture = TestBed.createComponent(HubCalendarComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;

		// Drive signal inputs through the component ref (zoneless-safe).
		componentRef.setInput('selectedDate', new Date(baseDate));
		componentRef.setInput('events', mockEvents);

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('Month view rendering', () => {
		it('renders a 6x7 grid of day cells and 7 weekday headers', () => {
			expect(dayCells().length).toBe(42);
			expect(fixture.debugElement.queryAll(By.css('.hub-calendar__weekday')).length).toBe(7);
		});

		it('shows the localized month and year in the header title', () => {
			const title = (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__title') as HTMLElement;
			expect(title.textContent).toContain('July 2026');
		});
	});

	describe('View switching', () => {
		it('switches views through the setInput API', () => {
			componentRef.setInput('view', CalendarViewType.WEEK);
			fixture.detectChanges();

			expect((fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__week-view')).toBeTruthy();
			expect((fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__month')).toBeFalsy();
		});

		it('switches views by clicking a view-switcher button', () => {
			const buttons = fixture.debugElement
				.queryAll(By.css('.hub-calendar__views .hub-calendar__btn'))
				.map((de) => de.nativeElement as HTMLButtonElement);
			const weekButton = buttons.find((b) => b.textContent?.trim() === 'Week') as HTMLButtonElement;

			weekButton.click();
			fixture.detectChanges();

			expect(component.view()).toBe(CalendarViewType.WEEK);
			expect(weekButton.getAttribute('aria-pressed')).toBe('true');
		});
	});

	describe('Day interaction', () => {
		it('emits dayClick and selects the day when a cell is clicked', () => {
			const emitted: Date[] = [];
			component.dayClick.subscribe((day) => emitted.push(day.date));

			// The cell for July 1st (first current-month cell of the grid).
			const target = dayCells().find(
				(cell) => cell.getAttribute('aria-label') === 'Wednesday, July 1, 2026'
			) as HTMLElement;
			target.click();
			fixture.detectChanges();

			expect(emitted.length).toBe(1);
			expect(emitted[0].getDate()).toBe(1);
			expect(component.selectedDate().getDate()).toBe(1);
		});
	});

	describe('Keyboard navigation (month grid)', () => {
		it('gives the selected day the single tabindex="0" stop', () => {
			const tabbable = dayCells().filter((cell) => cell.getAttribute('tabindex') === '0');
			expect(tabbable.length).toBe(1);
			expect(tabbable[0].getAttribute('aria-label')).toBe('Wednesday, July 15, 2026');
		});

		it('moves the focus stop one day with ArrowRight', () => {
			keydownOn(focusableCell(), 'ArrowRight');

			expect(component.selectedDate().getDate()).toBe(16);
			expect(focusableCell().getAttribute('aria-label')).toBe('Thursday, July 16, 2026');
		});

		it('moves the focus stop one week with ArrowDown', () => {
			keydownOn(focusableCell(), 'ArrowDown');

			expect(component.selectedDate().getDate()).toBe(22);
		});

		it('jumps to the start and end of the week with Home/End', () => {
			keydownOn(focusableCell(), 'Home');
			expect(component.selectedDate().getDate()).toBe(12); // Sunday

			keydownOn(focusableCell(), 'End');
			expect(component.selectedDate().getDate()).toBe(18); // Saturday
		});

		it('moves to the next month with PageDown and emits dateChange', () => {
			const changes: Date[] = [];
			component.dateChange.subscribe((date) => changes.push(date));

			keydownOn(focusableCell(), 'PageDown');

			expect(component.selectedDate().getMonth()).toBe(7); // August
			expect(component.selectedDate().getDate()).toBe(15);
			expect(changes.length).toBe(1);

			const title = (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__title') as HTMLElement;
			expect(title.textContent).toContain('August 2026');
		});

		it('moves to the previous month with PageUp, clamping the day of month', () => {
			componentRef.setInput('selectedDate', new Date(2026, 6, 31)); // July 31
			fixture.detectChanges();

			keydownOn(focusableCell(), 'PageUp');

			expect(component.selectedDate().getMonth()).toBe(5); // June
			expect(component.selectedDate().getDate()).toBe(30); // clamped (June has 30 days)
		});

		it('keeps a focusable cell after crossing a month boundary with arrows', async () => {
			// July 31 + ArrowRight lands on August 1 and re-renders the grid.
			componentRef.setInput('selectedDate', new Date(2026, 6, 31));
			fixture.detectChanges();

			keydownOn(focusableCell(), 'ArrowRight');
			await fixture.whenStable();
			fixture.detectChanges();

			const cell = focusableCell();
			expect(cell).toBeTruthy();
			expect(cell.getAttribute('aria-label')).toBe('Saturday, August 1, 2026');
		});

		it('activates the day with Enter, like a click', () => {
			const emitted: Date[] = [];
			component.dayClick.subscribe((day) => emitted.push(day.date));

			keydownOn(focusableCell(), 'Enter');

			expect(emitted.length).toBe(1);
			expect(emitted[0].getDate()).toBe(15);
		});

		it('activates the day with Space, like a click', () => {
			const emitted: Date[] = [];
			component.dayClick.subscribe((day) => emitted.push(day.date));

			keydownOn(focusableCell(), ' ');

			expect(emitted.length).toBe(1);
		});
	});

	describe('Event chips', () => {
		it('emits eventClick (and not dayClick) when a chip is clicked', () => {
			const clicked: CalendarEvent[] = [];
			const dayClicks: unknown[] = [];
			component.eventClick.subscribe((event) => clicked.push(event));
			component.dayClick.subscribe((day) => dayClicks.push(day));

			const chip = (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__event') as HTMLElement;
			chip.click();
			fixture.detectChanges();

			expect(clicked.length).toBe(1);
			expect(clicked[0].title).toBe('Team sync');
			expect(dayClicks.length).toBe(0);
		});

		it('emits eventClick (and not dayClick) on Enter, via role="button" semantics', () => {
			const clicked: CalendarEvent[] = [];
			const dayClicks: unknown[] = [];
			component.eventClick.subscribe((event) => clicked.push(event));
			component.dayClick.subscribe((day) => dayClicks.push(day));

			const chip = (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__event') as HTMLElement;
			expect(chip.getAttribute('role')).toBe('button');
			expect(chip.getAttribute('tabindex')).toBe('0');

			keydownOn(chip, 'Enter');

			expect(clicked.length).toBe(1);
			expect(clicked[0].title).toBe('Team sync');
			expect(dayClicks.length).toBe(0);
		});
	});

	describe('Year view', () => {
		beforeEach(() => {
			componentRef.setInput('view', CalendarViewType.YEAR);
			fixture.detectChanges();
		});

		it('renders 12 month cards exposed as buttons', () => {
			const cards = fixture.debugElement.queryAll(By.css('.hub-calendar__month-card'));
			expect(cards.length).toBe(12);
			for (const card of cards) {
				expect((card.nativeElement as HTMLElement).getAttribute('role')).toBe('button');
				expect((card.nativeElement as HTMLElement).getAttribute('tabindex')).toBe('0');
			}
		});

		it('opens the month view on Enter on a month card', () => {
			const march = fixture.debugElement
				.queryAll(By.css('.hub-calendar__month-card'))
				.map((de) => de.nativeElement as HTMLElement)[2];

			keydownOn(march, 'Enter');

			expect(component.view()).toBe(CalendarViewType.MONTH);
			expect(component.selectedDate().getMonth()).toBe(2);
		});
	});

	describe('ARIA attributes', () => {
		it('exposes the month view as a labelled grid of rows and gridcells', () => {
			const host = fixture.nativeElement as HTMLElement;
			const grid = host.querySelector('[role="grid"]') as HTMLElement;

			expect(grid).toBeTruthy();
			expect(grid.getAttribute('aria-label')).toBe('July 2026');
			expect(host.querySelectorAll('[role="columnheader"]').length).toBe(7);
			expect(host.querySelectorAll('[role="row"]').length).toBe(7); // 1 header row + 6 week rows
			expect(host.querySelectorAll('[role="gridcell"]').length).toBe(42);
		});

		it('marks the selected day with aria-selected="true"', () => {
			const selected = dayCells().filter((cell) => cell.getAttribute('aria-selected') === 'true');
			expect(selected.length).toBe(1);
			expect(selected[0].getAttribute('aria-label')).toBe('Wednesday, July 15, 2026');
		});

		it('marks today with aria-current="date" when the current month is visible', () => {
			componentRef.setInput('selectedDate', new Date());
			fixture.detectChanges();

			const current = dayCells().filter((cell) => cell.getAttribute('aria-current') === 'date');
			expect(current.length).toBe(1);
			expect(current[0].textContent).toContain(String(new Date().getDate()));
		});

		it('labels the icon-only previous/next navigation buttons', () => {
			const host = fixture.nativeElement as HTMLElement;
			const nav = host.querySelectorAll('.hub-calendar__nav .hub-calendar__btn--nav');

			expect((nav[0] as HTMLElement).getAttribute('aria-label')).toBe('Previous');
			expect((nav[1] as HTMLElement).getAttribute('aria-label')).toBe('Next');
		});
	});

	/**
	 * The header buttons were written into the template by hand — `Today`, and the view names
	 * title-cased off the enum — while the weekday and month names came from the dictionary.
	 * One calendar therefore rendered "Lun, Mar, Mié" beside "Today / Month / Week", and no
	 * input could reconcile the two: not `locale`, not the injected translation service.
	 */
	describe('Header localization', () => {
		/** Visible text of the view switcher, in the order the switcher renders it. */
		function viewButtons(): string[] {
			return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__views .hub-calendar__btn')].map(
				(btn) => (btn.textContent ?? '').trim()
			);
		}

		function todayButton(): string {
			return (
				(fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__btn--today')?.textContent ?? ''
			).trim();
		}

		function weekdays(): string[] {
			return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__weekday')].map((el) =>
				(el.textContent ?? '').trim()
			);
		}

		it('reads the header buttons from the dictionary under the default locale', () => {
			expect(todayButton()).toBe('Today');
			expect(viewButtons()).toEqual(['Month', 'Week', 'Day', 'Year']);
		});

		it('follows the locale input into Spanish', () => {
			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			expect(todayButton()).toBe('Hoy');
			expect(viewButtons()).toEqual(['Mes', 'Semana', 'Día', 'Año']);
		});

		/** The point of the fix: one calendar, one language — chrome and data alike. */
		it('localizes the buttons from the same dictionary as the weekday names', () => {
			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			expect(weekdays()).toEqual(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
			expect([todayButton(), ...viewButtons()].every((text) => /[A-Za-zÀ-ÿ]/.test(text))).toBe(true);
			expect([todayButton(), ...viewButtons()]).not.toContain('Today');
		});

		/** A switcher trimmed by config still labels what it does render. */
		it('labels only the views the config leaves available', () => {
			componentRef.setInput('locale', 'es');
			componentRef.setInput('config', { availableViews: [CalendarViewType.WEEK, CalendarViewType.YEAR] });
			fixture.detectChanges();

			expect(viewButtons()).toEqual(['Semana', 'Año']);
		});
	});

	/**
	 * `locale` is a public input, and half the chrome ignored it: the overflow chip and the
	 * year-view card were English literals, the month-card `aria-label` announced the English
	 * word "events", and the week/day headings read their names off `DatePipe` — that is, the
	 * application `LOCALE_ID` — instead of the calendar dictionary the rest of the view uses.
	 */
	describe('Locale coverage beyond the header', () => {
		/** Five events on July 15, so the month cell overflows its three-chip cap by two. */
		const crowdedDay: CalendarEvent[] = Array.from({ length: 5 }, (_, i) => ({
			id: i + 1,
			title: `Reunion ${i + 1}`,
			start: new Date(2026, 6, 15, 9 + i, 0)
		}));

		function textOf(selector: string): string {
			return ((fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent ?? '').trim();
		}

		function inSpanish(): void {
			componentRef.setInput('locale', 'es');
			fixture.detectChanges();
		}

		describe('Month-view overflow chip', () => {
			beforeEach(() => {
				componentRef.setInput('events', crowdedDay);
				fixture.detectChanges();
			});

			it('counts the hidden events in English by default', () => {
				expect(textOf('.hub-calendar__more')).toBe('+2 more');
			});

			it('follows the locale input', () => {
				inSpanish();

				expect(textOf('.hub-calendar__more')).toBe('+2 más');
			});
		});

		describe('Year-view month cards', () => {
			beforeEach(() => {
				componentRef.setInput('view', CalendarViewType.YEAR);
				fixture.detectChanges();
			});

			/** July holds the two events of the default fixture. */
			function julyCard(): HTMLElement {
				return [
					...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__month-card')
				][6] as HTMLElement;
			}

			function julyCount(): string {
				return (julyCard().querySelector('.hub-calendar__month-events')?.textContent ?? '').trim();
			}

			it('renders the count and its accessible name in English by default', () => {
				expect(julyCount()).toBe('2 events');
				expect(julyCard().getAttribute('aria-label')).toBe('July 2026, 2 events');
			});

			it('localizes the visible count and the accessible name alike', () => {
				inSpanish();

				expect(julyCount()).toBe('2 eventos');
				expect(julyCard().getAttribute('aria-label')).toBe('Julio 2026, 2 eventos');
			});
		});

		describe('Week-view day headers', () => {
			beforeEach(() => {
				componentRef.setInput('view', CalendarViewType.WEEK);
				fixture.detectChanges();
			});

			function dayNames(): string[] {
				return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__day-name')].map((el) =>
					(el.textContent ?? '').trim()
				);
			}

			it('names the days from the dictionary instead of the application LOCALE_ID', () => {
				expect(dayNames()).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

				inSpanish();

				expect(dayNames()).toEqual(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
			});
		});

		describe('Day-view heading', () => {
			beforeEach(() => {
				componentRef.setInput('view', CalendarViewType.DAY);
				fixture.detectChanges();
			});

			it('follows the locale input like the rest of the chrome', () => {
				expect(textOf('.hub-calendar__day-view-header h3')).toBe('Wednesday, July 15, 2026');

				inSpanish();

				// The order is the language's, not English's assembled with Spanish words:
				// see `calendar-compact.spec.ts` for the case that pins it.
				expect(textOf('.hub-calendar__day-view-header h3')).toBe('miércoles, 15 de julio de 2026');
			});
		});

		/** The whole point: with locale="es", nothing rendered or announced is left in English. */
		it('leaves no English word visible or announced in any view', () => {
			const english =
				/\b(more|events?|today|previous|next|month|week|day|year|sun|mon|tue|wed|thu|fri|sat|january|february|march|april|june|july|august|september|october|november|december)\b/i;
			const host = fixture.nativeElement as HTMLElement;

			componentRef.setInput('events', crowdedDay);
			inSpanish();

			for (const view of [CalendarViewType.MONTH, CalendarViewType.WEEK, CalendarViewType.DAY, CalendarViewType.YEAR]) {
				componentRef.setInput('view', view);
				fixture.detectChanges();

				const announced = [...host.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label') ?? '');
				for (const rendered of [host.textContent ?? '', ...announced]) {
					expect(rendered).not.toMatch(english);
				}
			}
		});
	});

	/**
	 * `config.weekStartsOn` was documented as the base value and the input as its override,
	 * but only the input was ever read — a shared `CalendarConfig` silently kept Sunday.
	 */
	describe('First day of the week', () => {
		function weekdayHeaders(): string[] {
			return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__weekday')].map((el) =>
				(el.textContent ?? '').trim()
			);
		}

		it('starts on Sunday when neither the input nor the config says otherwise', () => {
			expect(weekdayHeaders()).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
		});

		it('honours config.weekStartsOn when the input is left unbound', () => {
			componentRef.setInput('config', { weekStartsOn: 1 });
			fixture.detectChanges();

			expect(weekdayHeaders()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
		});

		/** July 2026 opens on a Wednesday, so a Monday-first grid has to start on June 29. */
		it('builds the month grid from the configured first day', () => {
			componentRef.setInput('config', { weekStartsOn: 1 });
			fixture.detectChanges();

			expect(dayCells()[0].textContent).toContain('29');
		});

		it('lets the input override config.weekStartsOn', () => {
			componentRef.setInput('config', { weekStartsOn: 1 });
			componentRef.setInput('weekStartsOn', 3);
			fixture.detectChanges();

			expect(weekdayHeaders()[0]).toBe('Wed');
		});
	});

	/**
	 * `initialView`, `slotDuration` and `eventCreationEnabled` were declared, defaulted and
	 * documented, and no line of the component read any of them — a consumer who set one got
	 * silence. They were withdrawn in 22.7.0 rather than implemented, so this pins the config
	 * surface to what the calendar actually honours: a dead option is easy to reintroduce and
	 * impossible to notice.
	 */
	describe('Configuration surface', () => {
		it('defaults exactly the options the component reads', () => {
			expect(Object.keys(DEFAULT_CALENDAR_CONFIG).sort()).toEqual([
				'availableViews',
				'dayEndHour',
				'dayStartHour',
				'dragAndDropEnabled',
				'showWeekNumbers',
				'weekStartsOn'
			]);
		});
	});

	/**
	 * `CalendarMonth` is exported from the public API and `months` is the signal a consumer reads
	 * to lay the year out in its own markup, yet the year view assembled anonymous objects without
	 * `shortName`. The field, and the `monthsShort` dictionary entry behind it, were declared,
	 * documented, translated into both bundled languages — and written by nothing.
	 */
	describe('Year-view month summaries (CalendarMonth)', () => {
		const SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		const SHORT_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

		it('fills every field the public type declares', () => {
			const months = component.months();

			expect(months.length).toBe(12);
			for (const month of months) {
				expect(Object.keys(month).sort()).toEqual(['date', 'eventCount', 'name', 'shortName']);
			}
		});

		it('takes the short name from the dictionary rather than truncating the full one', () => {
			expect(component.months().map((month) => month.shortName)).toEqual(SHORT_EN);
		});

		it('localizes the short name from the same locale input as the full name', () => {
			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			expect(component.months()[6].name).toBe('Julio');
			expect(component.months().map((month) => month.shortName)).toEqual(SHORT_ES);
		});
	});

	/**
	 * `config.showWeekNumbers` was declared, documented and defaulted, and no line of the
	 * component ever read it: switching it on changed nothing at all.
	 */
	describe('Week numbers (config.showWeekNumbers)', () => {
		/** Visible text of every week-number cell, top row first. */
		function weekNumbers(): string[] {
			return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__week-number')].map((el) =>
				(el.textContent ?? '').trim()
			);
		}

		function showWeekNumbers(weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6): void {
			componentRef.setInput('config', { showWeekNumbers: true, ...(weekStartsOn === undefined ? {} : { weekStartsOn }) });
			fixture.detectChanges();
		}

		it('renders no week-number column while the option is off', () => {
			expect(weekNumbers()).toEqual([]);
			expect((fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__weekday').length).toBe(7);
		});

		/** July 2026 on a Monday-first grid opens on June 29, ISO week 27, and runs to week 32. */
		it('numbers each row of the month grid once the option is on', () => {
			showWeekNumbers(1);

			expect(weekNumbers()).toEqual(['27', '28', '29', '30', '31', '32']);
		});

		/**
		 * A Sunday-first grid is one day ahead of ISO-8601, so its rows cannot simply borrow the
		 * ISO number: the same week that opens on Monday June 29 opens on Sunday June 28 and is
		 * numbered from its own middle day.
		 */
		it('numbers from the configured first day of the week, not from Monday', () => {
			showWeekNumbers(0);

			expect(weekNumbers()).toEqual(['26', '27', '28', '29', '30', '31']);
		});

		/** January 2027 opens on a Friday: its first Monday-first row still belongs to 2026. */
		it('keeps the year-straddling row with the year that owns it', () => {
			componentRef.setInput('selectedDate', new Date(2027, 0, 15));
			showWeekNumbers(1);

			expect(weekNumbers().slice(0, 2)).toEqual(['53', '1']);
		});

		it('widens the grid with a leading track for the column', () => {
			showWeekNumbers(1);
			const host = fixture.nativeElement as HTMLElement;

			expect(host.querySelector('.hub-calendar__weekdays--with-week-numbers')).toBeTruthy();
			expect(host.querySelectorAll('.hub-calendar__week--with-week-numbers').length).toBe(6);
		});

		it('announces the bare number as a week, in the calendar language', () => {
			showWeekNumbers(1);
			const host = fixture.nativeElement as HTMLElement;
			const header = host.querySelector('.hub-calendar__weekday--week-number') as HTMLElement;
			const firstCell = host.querySelector('.hub-calendar__week-number') as HTMLElement;

			expect(header.textContent?.trim()).toBe('Wk');
			expect(header.getAttribute('aria-label')).toBe('Week');
			expect(firstCell.getAttribute('role')).toBe('rowheader');
			expect(firstCell.getAttribute('aria-label')).toBe('Week 27');

			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			expect(header.textContent?.trim()).toBe('Sem');
			expect(header.getAttribute('aria-label')).toBe('Semana');
			expect(firstCell.getAttribute('aria-label')).toBe('Semana 27');
		});
	});

	/**
	 * `CalendarEvent.allDay` was declared and documented as displaying "at the top of day/week
	 * views", and nothing read it: an all-day event rendered exactly like a timed one, wherever
	 * the caller happened to have put it in the array. Giving it a tint of its own did not fix
	 * that either — a chip coloured unlike its neighbours, with nothing saying why, is a riddle.
	 * What every calendar a reader already knows does instead is give all-day events a *place*:
	 * a labelled strip above the hour grid in the week and day views, and — where a month grid
	 * has no room for one — a timed event that states its hour, leaving the hourless ones plain.
	 */
	describe('All-day events', () => {
		const mixedDay: CalendarEvent[] = [
			{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0) },
			{ id: 2, title: 'Company offsite', start: new Date(2026, 6, 15), allDay: true },
			{ id: 3, title: 'Retro', start: new Date(2026, 6, 15, 17, 0) }
		];

		/** Event chips of the July 15 cell (the selected day), in render order. */
		function chips(): HTMLElement[] {
			const cell = dayCells().find((c) => c.getAttribute('aria-selected') === 'true') as HTMLElement;
			return [...cell.querySelectorAll('.hub-calendar__event')] as HTMLElement[];
		}

		/** Every element matching a selector inside the calendar, in document order. */
		function query(selector: string): HTMLElement[] {
			return [...(fixture.nativeElement as HTMLElement).querySelectorAll(selector)] as HTMLElement[];
		}

		/** Titles of a set of chips, ignoring the hour a month-view chip prints in front. */
		function titlesOf(elements: HTMLElement[]): (string | undefined)[] {
			return elements.map((el) => el.querySelector('.hub-calendar__event-title')?.textContent?.trim());
		}

		/** The hour printed in front of a chip, or `undefined` when it prints none. */
		function timeOf(chip: HTMLElement): string | undefined {
			return chip.querySelector('.hub-calendar__event-time')?.textContent?.trim();
		}

		beforeEach(() => {
			componentRef.setInput('events', mixedDay);
			fixture.detectChanges();
		});

		it('puts the all-day event at the top of the cell, whatever the caller order', () => {
			expect(titlesOf(chips())).toEqual(['Company offsite', 'Standup', 'Retro']);
		});

		it('marks the all-day chip, and only it, with its own modifier class', () => {
			const marked = chips().filter((chip) => chip.classList.contains('hub-calendar__event--all-day'));

			expect(marked.length).toBe(1);
			expect(titlesOf(marked)).toEqual(['Company offsite']);
		});

		it('announces the all-day nature, since neither the strip nor a missing hour survives linearization', () => {
			expect(chips()[0].getAttribute('aria-label')).toBe('Company offsite, All day');
			expect(chips()[1].getAttribute('aria-label')).toBe('Standup');

			componentRef.setInput('locale', 'es');
			fixture.detectChanges();

			expect(chips()[0].getAttribute('aria-label')).toBe('Company offsite, Todo el día');
		});

		/**
		 * The month grid cannot host a strip — every cell is a stack of bars — so the contrast is
		 * made the other way round, exactly as FullCalendar, Google Calendar and Outlook make it.
		 */
		describe('Month view', () => {
			it('prints the start hour in front of a timed event and none in front of an all-day one', () => {
				// On the hour the minutes are dropped: a month cell has no room for `9:00 AM` beside
				// a dot and a title, and `9 AM` is what Google Calendar writes in the same place.
				expect(chips().map(timeOf)).toEqual([undefined, '9 AM', '5 PM']);
			});

			it('gives the timed chip its own modifier, so the pair can be dressed separately', () => {
				const timed = chips().filter((chip) => chip.classList.contains('hub-calendar__event--timed'));

				expect(titlesOf(timed)).toEqual(['Standup', 'Retro']);
			});

			it('formats the hour in the calendar language rather than the application LOCALE_ID', () => {
				componentRef.setInput('locale', 'es');
				fixture.detectChanges();

				expect(chips().map(timeOf)).toEqual([undefined, '9', '17']);
			});

			it('prints no hour on a day a multi-day event merely spans', () => {
				componentRef.setInput('events', [
					{ id: 4, title: 'Conference', start: new Date(2026, 6, 14, 8, 0), end: new Date(2026, 6, 16, 18, 0) }
				]);
				fixture.detectChanges();

				const spanned = query('.hub-calendar__event').map(timeOf);

				// Three cells hold the event; only the one it starts in has an hour to state.
				expect(spanned).toEqual(['8 AM', undefined, undefined]);
			});

			// Dropping the minutes is an abbreviation, not a rounding: at half past, `9` would
			// name a different time than the event has.
			it('keeps the minutes when the event does not start on the hour', () => {
				componentRef.setInput('events', [
					{ id: 90, title: 'Standup', start: new Date(2026, 6, 15, 9, 30) }
				] as CalendarEvent[]);
				fixture.detectChanges();

				expect(chips().map(timeOf)).toEqual(['9:30 AM']);
			});
		});

		/**
		 * The strip is where the distinction stops needing an explanation: an event drawn in the
		 * row labelled "all day" *is* an all-day event.
		 */
		describe('Week view', () => {
			beforeEach(() => {
				componentRef.setInput('view', CalendarViewType.WEEK);
				fixture.detectChanges();
			});

			it('draws one all-day strip, labelled in the same margin as the hours', () => {
				expect(query('.hub-calendar__all-day').length).toBe(1);
				expect(query('.hub-calendar__all-day-label')[0].textContent?.trim()).toBe('All day');
			});

			it('places the strip above the hour grid rather than inside it, so it cannot scroll away', () => {
				const view = query('.hub-calendar__week-view')[0];

				expect([...view.children].map((child) => child.className)).toEqual([
					'hub-calendar__week-header',
					'hub-calendar__all-day',
					'hub-calendar__time-grid'
				]);
				expect(query('.hub-calendar__time-grid .hub-calendar__all-day').length).toBe(0);
			});

			it('lifts the all-day event into the strip and leaves the timed ones in the hour columns', () => {
				expect(titlesOf(query('.hub-calendar__all-day-cell .hub-calendar__event'))).toEqual(['Company offsite']);
				expect(titlesOf(query('.hub-calendar__day-events .hub-calendar__event'))).toEqual(['Standup', 'Retro']);
			});

			it('gives every day of the week its own cell in the strip, so an event stays under its day', () => {
				const cells = query('.hub-calendar__all-day-cell');

				expect(cells.length).toBe(7);
				expect(cells.map((cell) => cell.querySelectorAll('.hub-calendar__event').length)).toEqual([
					0, 0, 0, 1, 0, 0, 0
				]);
			});

			/**
			 * FullCalendar, Google Calendar and Outlook all keep the row drawn on an empty week, and
			 * so does this: the label stays where the reader learned it, and the hour grid does not
			 * jump by a row as the week changes.
			 */
			it('keeps the strip drawn on a week with no all-day event at all', () => {
				componentRef.setInput('events', []);
				fixture.detectChanges();

				expect(query('.hub-calendar__all-day').length).toBe(1);
				expect(query('.hub-calendar__all-day-cell .hub-calendar__event').length).toBe(0);
			});

			it('translates the strip label with the rest of the chrome', () => {
				componentRef.setInput('locale', 'es');
				fixture.detectChanges();

				expect(query('.hub-calendar__all-day-label')[0].textContent?.trim()).toBe('Todo el día');
			});
		});

		describe('Day view', () => {
			beforeEach(() => {
				componentRef.setInput('view', CalendarViewType.DAY);
				fixture.detectChanges();
			});

			it('places the strip above the hour grid, under the day heading', () => {
				const view = query('.hub-calendar__day-view')[0];

				expect([...view.children].map((child) => child.className)).toEqual([
					'hub-calendar__day-view-header',
					'hub-calendar__all-day',
					'hub-calendar__time-grid'
				]);
			});

			it('lifts the all-day event into the strip and leaves the timed ones in the hour column', () => {
				expect(titlesOf(query('.hub-calendar__all-day-cell .hub-calendar__event'))).toEqual(['Company offsite']);
				expect(titlesOf(query('.hub-calendar__day-column .hub-calendar__event'))).toEqual(['Standup', 'Retro']);
			});

			it('leads the day too, where the promise was written', () => {
				expect(titlesOf(query('.hub-calendar__event'))).toEqual(['Company offsite', 'Standup', 'Retro']);
			});
		});
	});

	/**
	 * The SCSS emits a `:host([data-variant])` block for each of the nine canonical accents, so
	 * an inline accent written for four of them outranked any consumer rule re-pointing them.
	 */
	describe('Semantic accent', () => {
		const canonical = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'neutral', 'light', 'dark'];

		function inlineAccent(): string {
			return (fixture.nativeElement as HTMLElement).style.getPropertyValue('--hub-calendar-accent');
		}

		it('leaves the nine canonical variants to the stylesheet', () => {
			const written = canonical.map((variant) => {
				componentRef.setInput('variant', variant);
				fixture.detectChanges();
				return inlineAccent();
			});

			expect(written).toEqual(canonical.map(() => ''));
		});

		it('still resolves a custom variant inline, with no stylesheet rule to lean on', () => {
			componentRef.setInput('variant', 'brand');
			fixture.detectChanges();

			expect((fixture.nativeElement as HTMLElement).getAttribute('data-variant')).toBe('brand');
			expect(inlineAccent()).toBe('var(--hub-sys-color-brand)');
		});
	});

	/**
	 * The hour ruler was drawn and read by nothing: every timed event was stacked from the top
	 * of its column in source order, so an 11:00 event sat where 00:00 is and a two-hour one
	 * was as tall as a five-minute one. These specs pin the three claims the ruler makes — the
	 * top marks the start, the height marks the duration, and two events at the same time do
	 * not draw over each other.
	 */
	describe('Timed events placed against the hour ruler', () => {
		/** Every positioned chip of the hour grid, in DOM order. */
		function bands(): HTMLElement[] {
			return [
				...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__day-events > .hub-calendar__event')
			] as HTMLElement[];
		}

		/** Title of a band, so a geometry assertion can name the event it belongs to. */
		function titleOf(band: HTMLElement): string {
			return band.querySelector('.hub-calendar__event-title')?.textContent?.trim() ?? '';
		}

		/** Vertical geometry a band declares, in hours from the top of the ruler. */
		function verticalOf(band: HTMLElement): { offset: string; span: string } {
			return {
				offset: band.style.getPropertyValue('--hub-calendar-event-offset'),
				span: band.style.getPropertyValue('--hub-calendar-event-span')
			};
		}

		/** Horizontal extent of a band as `[left, rightEdge]`, both in percent of the column. */
		function extentOf(band: HTMLElement): [number, number] {
			return [parseFloat(band.style.left), 100 - parseFloat(band.style.right)];
		}

		/** Switches to a view and pushes a fresh event set through the input. */
		function render(view: CalendarViewType, events: CalendarEvent[]): void {
			componentRef.setInput('view', view);
			componentRef.setInput('events', events);
			fixture.detectChanges();
		}

		describe('Vertical placement', () => {
			it('puts an 11:00 event eleven hours below a 00:00 one, instead of stacking both at the top', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Night build', start: new Date(2026, 6, 15, 0, 0), end: new Date(2026, 6, 15, 1, 0) },
					{ id: 2, title: 'Standup', start: new Date(2026, 6, 15, 11, 0), end: new Date(2026, 6, 15, 11, 30) }
				]);

				const placed = bands().map((band) => [titleOf(band), verticalOf(band).offset]);

				expect(placed).toEqual([
					['Night build', '0'],
					['Standup', '11']
				]);
			});

			it('reads the minutes too, not only the hour', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Retro', start: new Date(2026, 6, 15, 14, 8), end: new Date(2026, 6, 15, 15, 0) }
				]);

				expect(verticalOf(bands()[0]).offset).toBe('14.133333333333333');
			});

			it('gives a two-hour event four times the height of a half-hour one', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 9, 30) },
					{ id: 2, title: 'Workshop', start: new Date(2026, 6, 15, 11, 0), end: new Date(2026, 6, 15, 13, 0) }
				]);

				const spans = bands().map((band) => [titleOf(band), verticalOf(band).span]);

				expect(spans).toEqual([
					['Standup', '0.5'],
					['Workshop', '2']
				]);
			});

			/**
			 * `end` is optional in `CalendarEvent` and a band of no height is not a band. One hour
			 * is what FullCalendar assumes for the same case, and long enough to stay readable
			 * without leaning on the CSS floor.
			 */
			it('gives an event with no end the one-hour default rather than no height', () => {
				render(CalendarViewType.DAY, [{ id: 1, title: 'Reminder', start: new Date(2026, 6, 15, 9, 0) }]);

				expect(verticalOf(bands()[0])).toEqual({ offset: '9', span: '1' });
			});

			it('treats an end that precedes its start as no end at all', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Typo', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 8, 0) }
				]);

				expect(verticalOf(bands()[0])).toEqual({ offset: '9', span: '1' });
			});

			it('starts the band at the top of the day for an event that began the day before', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'On call', start: new Date(2026, 6, 14, 22, 0), end: new Date(2026, 6, 15, 2, 0) }
				]);

				expect(verticalOf(bands()[0])).toEqual({ offset: '0', span: '2' });
			});

			it('cuts a band at midnight rather than letting it run past the last hour', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Deploy window', start: new Date(2026, 6, 15, 23, 0), end: new Date(2026, 6, 16, 3, 0) }
				]);

				expect(verticalOf(bands()[0])).toEqual({ offset: '23', span: '1' });
			});

			it('measures the offset from the first hour the ruler draws, not from midnight', () => {
				componentRef.setInput('config', { dayStartHour: 8, dayEndHour: 18 });
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) }
				]);

				expect(verticalOf(bands()[0])).toEqual({ offset: '1', span: '1' });
			});

			it('draws no band for an event the bounded ruler does not reach', () => {
				componentRef.setInput('config', { dayStartHour: 8, dayEndHour: 18 });
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 2, title: 'Night build', start: new Date(2026, 6, 15, 23, 0), end: new Date(2026, 6, 15, 23, 30) }
				]);

				expect(bands().map(titleOf)).toEqual(['Standup']);
			});

			it('tells the grid how many hours it spans, so the columns match the ruler', () => {
				componentRef.setInput('config', { dayStartHour: 8, dayEndHour: 18 });
				render(CalendarViewType.DAY, []);

				const grid = (fixture.nativeElement as HTMLElement).querySelector('.hub-calendar__time-grid') as HTMLElement;

				expect(grid.style.getPropertyValue('--hub-calendar-grid-hours')).toBe('10');
			});
		});

		describe('Overlapping events share the width', () => {
			it('leaves a lone event the whole column', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) }
				]);

				expect(extentOf(bands()[0])).toEqual([0, 100]);
			});

			it('splits the column between two events at the same hour, with no band over another', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 2, title: 'Interview', start: new Date(2026, 6, 15, 9, 30), end: new Date(2026, 6, 15, 10, 30) }
				]);

				const [first, second] = bands().map(extentOf);

				expect([first, second]).toEqual([
					[0, 50],
					[50, 100]
				]);
				expect(first[1], 'the bands must not intersect').toBeLessThanOrEqual(second[0]);
			});

			it('narrows only the events that actually collide, not the whole day', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 2, title: 'Interview', start: new Date(2026, 6, 15, 9, 30), end: new Date(2026, 6, 15, 10, 30) },
					{ id: 3, title: 'Retro', start: new Date(2026, 6, 15, 16, 0), end: new Date(2026, 6, 15, 17, 0) }
				]);

				const placed = bands().map((band) => [titleOf(band), ...extentOf(band)]);

				expect(placed).toEqual([
					['Standup', 0, 50],
					['Interview', 50, 100],
					['Retro', 0, 100]
				]);
			});

			/**
			 * Two events that merely touch — one ending exactly where the next starts — are not
			 * in conflict, and halving both would be the algorithm inventing an overlap.
			 */
			it('treats back-to-back events as free of each other', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 2, title: 'Interview', start: new Date(2026, 6, 15, 10, 0), end: new Date(2026, 6, 15, 11, 0) }
				]);

				expect(bands().map(extentOf)).toEqual([
					[0, 100],
					[0, 100]
				]);
			});

			it('reuses a column freed by an event that has already ended', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'All morning', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 12, 0) },
					{ id: 2, title: 'First half', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 3, title: 'Second half', start: new Date(2026, 6, 15, 10, 0), end: new Date(2026, 6, 15, 11, 0) }
				]);

				const placed = bands().map((band) => [titleOf(band), ...extentOf(band)]);

				// Three events, two columns: the short pair take turns in the second one.
				expect(placed).toEqual([
					['All morning', 0, 50],
					['First half', 50, 100],
					['Second half', 50, 100]
				]);
			});

			it('gives the longer event the leftmost column when two start together', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'Quick', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 9, 30) },
					{ id: 2, title: 'Long', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 12, 0) }
				]);

				expect(bands().map((band) => [titleOf(band), ...extentOf(band)])).toEqual([
					['Long', 0, 50],
					['Quick', 50, 100]
				]);
			});

			it('splits three simultaneous events into three columns', () => {
				render(CalendarViewType.DAY, [
					{ id: 1, title: 'A', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 2, title: 'B', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 3, title: 'C', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) }
				]);

				const extents = bands().map(extentOf);

				expect(extents.map(([left]) => Math.round(left))).toEqual([0, 33, 67]);
				expect(extents[0][1]).toBeCloseTo(extents[1][0], 6);
				expect(extents[1][1]).toBeCloseTo(extents[2][0], 6);
			});
		});

		describe('Week view', () => {
			it('places each day’s events against the ruler, under their own day', () => {
				render(CalendarViewType.WEEK, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 11, 0), end: new Date(2026, 6, 15, 11, 30) },
					{ id: 2, title: 'Retro', start: new Date(2026, 6, 16, 14, 0), end: new Date(2026, 6, 16, 15, 0) }
				]);

				expect(bands().map((band) => [titleOf(band), verticalOf(band).offset, verticalOf(band).span])).toEqual([
					['Standup', '11', '0.5'],
					['Retro', '14', '1']
				]);
			});

			it('keeps a collision inside its own day column', () => {
				render(CalendarViewType.WEEK, [
					{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) },
					{ id: 2, title: 'Interview', start: new Date(2026, 6, 15, 9, 30), end: new Date(2026, 6, 15, 10, 30) },
					{ id: 3, title: 'Elsewhere', start: new Date(2026, 6, 16, 9, 0), end: new Date(2026, 6, 16, 10, 0) }
				]);

				expect(bands().map((band) => [titleOf(band), ...extentOf(band)])).toEqual([
					['Standup', 0, 50],
					['Interview', 50, 100],
					['Elsewhere', 0, 100]
				]);
			});

			it('leaves the all-day strip out of the ruler arithmetic', () => {
				render(CalendarViewType.WEEK, [
					{ id: 1, title: 'Offsite', start: new Date(2026, 6, 15), allDay: true },
					{ id: 2, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) }
				]);

				expect(bands().map(titleOf)).toEqual(['Standup']);
				expect(extentOf(bands()[0]), 'the all-day event takes no share of the column').toEqual([0, 100]);
			});
		});

		/**
		 * Dropping still lands on a day, not on an hour — but the chip being dragged is now an
		 * absolutely positioned band, so the handlers had to keep reaching it.
		 */
		it('still drags a positioned band onto another day', () => {
			const dropped: unknown[] = [];
			component.eventDrop.subscribe((payload) => dropped.push(payload));

			render(CalendarViewType.WEEK, [
				{ id: 1, title: 'Standup', start: new Date(2026, 6, 15, 9, 0), end: new Date(2026, 6, 15, 10, 0) }
			]);

			// jsdom ships no `DragEvent` constructor; the handlers only read the optional
			// `dataTransfer`, so a plain event carries the interaction faithfully enough.
			bands()[0].dispatchEvent(new Event('dragstart', { bubbles: true }));
			const columns = [
				...(fixture.nativeElement as HTMLElement).querySelectorAll('.hub-calendar__day-column')
			] as HTMLElement[];
			columns[5].dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(dropped.length).toBe(1);
		});
	});

	/**
	 * The all-day strip and the hour grid are two lanes of the same column, and a reader reads
	 * them as one: a bar that starts further left than the one above it looks misplaced rather
	 * than different. The week view already wrapped its timed events in `__day-events`, which is
	 * the element carrying the inset and the gap; the day view dropped them straight into the
	 * column and lost both. Sharing the wrapper is what keeps the two views from drifting again.
	 */
	describe('Timed events sit in the same lane as the all-day strip', () => {
		function wrappers(selector: string): HTMLElement[] {
			return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(selector));
		}

		it('wraps the day view timed events the way the week view already did', () => {
			componentRef.setInput('view', CalendarViewType.DAY);
			fixture.detectChanges();

			const column = (fixture.nativeElement as HTMLElement).querySelector(
				'.hub-calendar__day-column--full'
			) as HTMLElement;

			expect(column, 'the day view renders its single column').toBeTruthy();
			expect(
				column.querySelector(':scope > .hub-calendar__day-events'),
				'events go through the padded wrapper'
			).toBeTruthy();
			expect(column.querySelector(':scope > .hub-calendar__event'), 'no event hangs straight off the column').toBeFalsy();
		});

		it('uses that same wrapper in the week view', () => {
			componentRef.setInput('view', CalendarViewType.WEEK);
			fixture.detectChanges();

			expect(wrappers('.hub-calendar__day-events').length).toBeGreaterThan(0);
		});
	});
});
