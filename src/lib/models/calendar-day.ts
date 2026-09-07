/**

 * @description Defines the structure for calendar day cells and weeks.
 */

import { CalendarEvent } from './calendar-event';

/**
 * Represents a single day cell in the calendar.
 * Contains all information needed to render a day in any calendar view.
 *
 * @template T - Type of custom data in events
 *
 * @example
 * ```typescript
 * const day: CalendarDay = {
 *   date: new Date('2026-01-15'),
 *   events: [{ title: 'Meeting', start: new Date() }],
 *   isToday: true,
 *   isCurrentMonth: true,
 *   isWeekend: false
 * };
 * ```
 */
export interface CalendarDay<T = any> {
	/**
	 * The date represented by this day cell.
	 * Time portion should be set to midnight (00:00:00).
	 */
	date: Date;

	/**
	 * Events occurring on this day.
	 * Filtered from the full event list based on date overlap.
	 */
	events: CalendarEvent<T>[];

	/**
	 * Whether this day is the current date (today).
	 * Used for highlighting the current day.
	 */
	isToday: boolean;

	/**
	 * Whether this day belongs to the currently displayed month.
	 * Useful for styling days from previous/next months in month view.
	 */
	isCurrentMonth: boolean;

	/**
	 * Whether this day is a weekend (Saturday or Sunday).
	 * Can be used for different weekend styling.
	 */
	isWeekend: boolean;

	/**
	 * Whether this day is currently selected by the user.
	 * Updated when user clicks on a day.
	 */
	isSelected?: boolean;
}

/**
 * Represents a week row in the calendar's month view.
 * Contains an array of 7 consecutive days.
 *
 * @template T - Type of custom data in events
 */
export interface CalendarWeek<T = any> {
	/**
	 * Days in this week (always 7 days).
	 * Ordered from the configured week start day.
	 */
	days: CalendarDay<T>[];

	/**
	 * Week number of the year the month grid assigns to this row.
	 * Always populated; `config.showWeekNumbers` only decides whether the
	 * calendar renders it as a leading column.
	 */
	weekNumber?: number;
}

/**
 * Represents a month in the year view.
 * Contains summary information for the month card.
 *
 * This is the shape of every entry of the calendar's public `months` signal, so all four
 * fields are filled whether or not the built-in card draws them.
 */
export interface CalendarMonth {
	/**
	 * The date representing this month (typically the 1st day).
	 * Used for navigation when clicking on the month.
	 */
	date: Date;

	/**
	 * Full name of the month (e.g., "January"), from the `months` dictionary entry.
	 * Localized like every other label, by the `locale` input or an application dictionary.
	 */
	name: string;

	/**
	 * Short name of the month (e.g., "Jan"), from the `monthsShort` dictionary entry.
	 * The built-in month card prints the full `name`; this is what a caller reading `months`
	 * uses to lay the year out in less room than the card takes.
	 */
	shortName: string;

	/**
	 * Number of events occurring in this month.
	 * Displayed as a badge on the month card.
	 */
	eventCount: number;
}
