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

				expect(textOf('.hub-calendar__day-view-header h3')).toBe('Miércoles, Julio 15, 2026');
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
				expect(chips().map(timeOf)).toEqual([undefined, '9:00 AM', '5:00 PM']);
			});

			it('gives the timed chip its own modifier, so the pair can be dressed separately', () => {
				const timed = chips().filter((chip) => chip.classList.contains('hub-calendar__event--timed'));

				expect(titlesOf(timed)).toEqual(['Standup', 'Retro']);
			});

			it('formats the hour in the calendar language rather than the application LOCALE_ID', () => {
				componentRef.setInput('locale', 'es');
				fixture.detectChanges();

				expect(chips().map(timeOf)).toEqual([undefined, '9:00', '17:00']);
			});

			it('prints no hour on a day a multi-day event merely spans', () => {
				componentRef.setInput('events', [
					{ id: 4, title: 'Conference', start: new Date(2026, 6, 14, 8, 0), end: new Date(2026, 6, 16, 18, 0) }
				]);
				fixture.detectChanges();

				const spanned = query('.hub-calendar__event').map(timeOf);

				// Three cells hold the event; only the one it starts in has an hour to state.
				expect(spanned).toEqual(['8:00 AM', undefined, undefined]);
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
});
