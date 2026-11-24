import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarEvent } from '../../models/calendar-event';
import { CalendarViewType } from '../../models/calendar-view';
import { HubCalendarComponent } from './calendar.component';

describe('HubCalendarComponent year view, day layout', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let ref: ComponentRef<HubCalendarComponent>;

	const events: CalendarEvent[] = [
		{ id: 1, title: 'Closure', start: new Date(2026, 8, 10), end: new Date(2026, 8, 12), cssClass: 'closure' },
		{ id: 2, title: 'Holiday', start: new Date(2026, 8, 11), cssClass: 'holiday' }
	];

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [HubCalendarComponent] });
		fixture = TestBed.createComponent(HubCalendarComponent);
		ref = fixture.componentRef;
		ref.setInput('view', CalendarViewType.YEAR);
		ref.setInput('selectedDate', new Date(2027, 1, 10));
		ref.setInput('events', events);
	});

	const el = (): HTMLElement => fixture.nativeElement;
	const dayButtons = () => Array.from(el().querySelectorAll<HTMLElement>('.hub-calendar__year-day'));

	it('keeps the month cards by default', () => {
		fixture.detectChanges();
		expect(el().querySelectorAll('.hub-calendar__month-card').length).toBe(12);
		expect(el().querySelector('.hub-calendar__year-days')).toBeNull();
		expect(fixture.componentInstance.months()[0].date).toEqual(new Date(2027, 0, 1));
	});

	it('draws the months from rangeStart to rangeEnd and names a span that crosses years', () => {
		ref.setInput('rangeStart', new Date(2026, 8, 9));
		ref.setInput('rangeEnd', new Date(2027, 5, 20));
		fixture.detectChanges();
		const months = fixture.componentInstance.months();
		expect(months.length).toBe(10);
		expect(months[0].date).toEqual(new Date(2026, 8, 1));
		expect(months[9].date).toEqual(new Date(2027, 5, 1));
		expect(el().querySelector('.hub-calendar__title, .hub-calendar__header')?.textContent).toContain('2026–2027');
	});

	it('shows twelve months from a lone rangeStart, or ending at a lone rangeEnd', () => {
		ref.setInput('rangeStart', new Date(2026, 8, 9));
		fixture.detectChanges();
		let months = fixture.componentInstance.months();
		expect([months.length, months[0].date, months[11].date]).toEqual([12, new Date(2026, 8, 1), new Date(2027, 7, 1)]);

		ref.setInput('rangeStart', null);
		ref.setInput('rangeEnd', new Date(2027, 5, 20));
		fixture.detectChanges();
		months = fixture.componentInstance.months();
		expect([months.length, months[0].date, months[11].date]).toEqual([12, new Date(2026, 6, 1), new Date(2027, 5, 1)]);
	});

	it('cuts a span longer than 24 months', () => {
		ref.setInput('rangeStart', new Date(2024, 0, 1));
		ref.setInput('rangeEnd', new Date(2030, 0, 1));
		expect(fixture.componentInstance.months().length).toBe(24);
	});

	it('moves a plain year on next and previous', () => {
		fixture.componentInstance.next();
		expect(fixture.componentInstance.months()[0].date).toEqual(new Date(2028, 0, 1));
		fixture.componentInstance.previous();
		fixture.componentInstance.previous();
		expect(fixture.componentInstance.months()[0].date).toEqual(new Date(2026, 0, 1));
	});

	it('draws day grids without neighbouring-month days and up to 3 dots per day', () => {
		ref.setInput('yearLayout', 'days');
		ref.setInput('rangeStart', new Date(2026, 8, 1));
		ref.setInput('rangeEnd', new Date(2026, 8, 30));
		fixture.detectChanges();
		expect(dayButtons().length).toBe(30);
		const day = (n: number) => dayButtons()[n - 1];
		expect(day(10).querySelectorAll('.hub-calendar__year-dot').length).toBe(1);
		expect(day(11).querySelectorAll('.hub-calendar__year-dot').length).toBe(2);
		expect(day(12).querySelectorAll('.hub-calendar__year-dot').length).toBe(1);
		expect(day(13).querySelectorAll('.hub-calendar__year-dot').length).toBe(0);
		expect(day(11).querySelector('.hub-calendar__year-dot.holiday')).not.toBeNull();
		expect(day(11).getAttribute('title')).toBe('Closure, Holiday');
		expect(day(11).getAttribute('aria-label')).toContain('Closure, Holiday');
	});

	it('emits dayClick and dayActivate with the cell, and stays in the year view', () => {
		ref.setInput('yearLayout', 'days');
		ref.setInput('rangeStart', new Date(2026, 8, 1));
		ref.setInput('rangeEnd', new Date(2026, 8, 30));
		fixture.detectChanges();
		const activated: { day: any; element: HTMLElement }[] = [];
		const clicked: any[] = [];
		fixture.componentInstance.dayActivate.subscribe((e) => activated.push(e));
		fixture.componentInstance.dayClick.subscribe((d) => clicked.push(d));
		dayButtons()[10].click();
		expect(clicked[0].date).toEqual(new Date(2026, 8, 11));
		expect(activated[0].element).toBe(dayButtons()[10]);
		expect(fixture.componentInstance.view()).toBe(CalendarViewType.YEAR);
	});

	it('disables the days of the first and last month that fall outside the range', () => {
		ref.setInput('yearLayout', 'days');
		ref.setInput('rangeStart', new Date(2026, 8, 5));
		ref.setInput('rangeEnd', new Date(2026, 8, 25));
		fixture.detectChanges();
		const off = dayButtons().filter((b) => (b as HTMLButtonElement).disabled);
		expect(off.length).toBe(4 + 5);

		const emitted: unknown[] = [];
		fixture.componentInstance.dayActivate.subscribe((e) => emitted.push(e));
		dayButtons()[0].click();
		expect(emitted).toEqual([]);
	});
});
