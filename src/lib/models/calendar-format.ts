/**
 * @description Date and time presentation formats of the calendar.
 *
 * The vocabulary is deliberately the datepicker's. `ng-hub-ui-forms` already solved this problem
 * for `<hub-datepicker>` — `displayFormat`, `timeDisplayFormat`, `hourFormat`, `weekdayFormat`,
 * `monthFormat`, each resolvable per instance or globally — and a consumer using both should not
 * have to learn a second name for the same idea. The names, the types and the resolution order
 * (instance input → global config → built-in default) are the same here.
 *
 * Two of the datepicker's axes have no surface in this component and are deliberately absent:
 * `parse` and `valueFormat` describe text coming in and text going out, and the calendar speaks
 * `Date` at every edge — `CalendarEvent.start` / `end` are `Date`, and `eventClick`, `dayClick`,
 * `eventDrop`, `dateChange`, `view` and `selectedDate` emit `Date` or objects holding one. There
 * is nothing to parse and nothing to serialize, so inventing a text layer to justify the names
 * would add a contract nobody asked for. `rangeSeparator` is absent for the same reason: the
 * calendar never displays a range as text.
 *
 * Two axes have no datepicker counterpart because the surfaces are the calendar's own — the hour
 * ruler of the week and day views (`slotLabelFormat`, named as FullCalendar names it) and the hour
 * a month chip prints (`eventTimeFormat`).
 */

/**
 * A format stated in any of the three ways the datepicker accepts: `Intl` options, an Angular date
 * pattern such as `'HH:mm'`, or a function that formats the date itself.
 *
 * A pattern or a function is never composed with anything: the caller said exactly what they
 * wanted, so `hourFormat` does not reach inside it either.
 */
export type HubCalendarDateFormat = Intl.DateTimeFormatOptions | string | ((date: Date) => string);

/**
 * Every date or time the calendar writes, and how.
 *
 * Each field's default is exactly what the calendar did before it was configurable, so an
 * application that sets none of them sees no change at all.
 */
export interface HubCalendarFormats {
	/**
	 * The header title — the month and year the calendar is showing.
	 *
	 * `undefined` keeps the built-in composition: the month name from the calendar's own
	 * dictionary (so it follows `locale` and an application dictionary alike) and the year.
	 * The year view's title names a year and is left alone, the way the datepicker narrows its
	 * display to the granularity rather than showing a day nobody chose.
	 */
	displayFormat: HubCalendarDateFormat | undefined;

	/**
	 * The clock in the tooltips — the chip's own and the day list behind the "+N more" label.
	 *
	 * `Intl` options only, like the datepicker's, because this one is composed with the resolved
	 * `hourFormat` rather than taken as written.
	 */
	timeDisplayFormat: Intl.DateTimeFormatOptions;

	/**
	 * The hour a month-view chip prints in front of a timed event.
	 *
	 * `undefined` keeps the abbreviation the month grid was given on purpose: the minutes are
	 * dropped when they are zero (`9 AM`, `9`) because a month cell is a hundred-odd pixels wide
	 * and the hour shares it with a dot and a title. That it can now be configured is not a
	 * reason to level it up to the tooltip's: the cell is still narrow.
	 */
	eventTimeFormat: HubCalendarDateFormat | undefined;

	/**
	 * The labels down the hour ruler of the week and day views.
	 *
	 * `undefined` keeps the bare `9:00` the ruler has always printed — a plain number and a
	 * literal `:00`, which is neither locale-aware nor a clock. Setting `hourFormat` alone is
	 * enough to turn it into one; this field is for saying exactly what it should be.
	 */
	slotLabelFormat: HubCalendarDateFormat | undefined;

	/**
	 * Force a 12- or 24-hour clock everywhere the calendar prints one. `undefined` derives it
	 * from the locale, which is the datepicker's meaning of the same value and the answer to
	 * "should it say 9:00 or 9:00 AM": whatever the reader's language says.
	 */
	hourFormat: '12' | '24' | undefined;

	/**
	 * Width of the weekday column headers.
	 *
	 * `short` and `long` read the calendar's own dictionary (`weekdays` / `weekdaysFull`), so an
	 * application dictionary reaches them. `narrow` has no dictionary entry — adding one would be
	 * a translation asked of every language for a single letter — so it is derived from the
	 * `locale` through `Intl`, which is where the datepicker takes all of its weekday names.
	 */
	weekdayFormat: 'short' | 'narrow' | 'long';

	/**
	 * How the month is written in the header title and on the year view's month cards.
	 *
	 * `long` by default, unlike the datepicker's `short`, because that is what the calendar has
	 * always printed and no existing calendar may change appearance. `short` reads the
	 * dictionary's `monthsShort`.
	 */
	monthFormat: 'short' | 'long';
}

/** Built-in formats: each one is what the calendar did before any of this was configurable. */
export const defaultHubCalendarFormats: HubCalendarFormats = {
	displayFormat: undefined,
	timeDisplayFormat: { hour: 'numeric', minute: '2-digit' },
	eventTimeFormat: undefined,
	slotLabelFormat: undefined,
	hourFormat: undefined,
	weekdayFormat: 'short',
	monthFormat: 'long'
};

/**
 * Whether a clock is 12-hour, given an explicit `hourFormat` or, failing that, the locale.
 *
 * The same rule as `resolveHour12` in `ng-hub-ui-forms`
 * (`projects/forms/src/lib/components/datepicker/time-utils.ts`), restated here rather than
 * imported: the calendar does not depend on `forms`, and a shared dependency between two sibling
 * libraries for six lines would cost more than it saves.
 *
 * @param locale - BCP-47 locale the calendar is rendering in.
 * @param hourFormat - Explicit clock, or `undefined` to let the language decide.
 * @returns `true` for a 12-hour clock.
 */
export function resolveCalendarHour12(locale: string, hourFormat: '12' | '24' | undefined): boolean {
	if (hourFormat === '12') {
		return true;
	}

	if (hourFormat === '24') {
		return false;
	}

	try {
		return !!new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;
	} catch {
		return !!new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
	}
}
