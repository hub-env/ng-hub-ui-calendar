/**

 * @description Defines the available view types and configuration for the calendar component.
 */

/**
 * Enumeration of available calendar view types.
 * Used to switch between different calendar displays.
 *
 * @example
 * ```typescript
 * import { CalendarViewType } from 'ng-hub-ui-calendar';
 *
 * // Set calendar to week view
 * this.currentView = CalendarViewType.WEEK;
 * ```
 */
export enum CalendarViewType {
	/**
	 * Monthly grid view displaying weeks in rows.
	 * Shows an overview of the entire month with day cells.
	 */
	MONTH = 'month',

	/**
	 * Weekly view showing 7 day columns.
	 * Displays a single week with time slots.
	 */
	WEEK = 'week',

	/**
	 * Single day view with hourly time slots.
	 * Detailed view of events for one specific day.
	 */
	DAY = 'day',

	/**
	 * Yearly overview with 12 month mini-calendars.
	 * Provides a high-level view of the entire year.
	 */
	YEAR = 'year'
}

/**
 * Configuration options for the calendar component.
 * All properties are optional and have sensible defaults.
 *
 * @example
 * ```typescript
 * const config: CalendarConfig = {
 *   weekStartsOn: 1, // Monday
 *   showWeekNumbers: true,
 *   dayStartHour: 8,
 *   dayEndHour: 18
 * };
 * ```
 */
export interface CalendarConfig {
	/**
	 * Day the week starts on.
	 * 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
	 * @default 0 (Sunday)
	 */
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;

	/**
	 * Whether to display week numbers in month view.
	 * Week numbers appear in a column on the left side.
	 * @default false
	 */
	showWeekNumbers?: boolean;

	/**
	 * Hour to start the day view (0-23).
	 * Time slots before this hour are hidden.
	 * @default 0
	 */
	dayStartHour?: number;

	/**
	 * Hour to end the day view (0-24).
	 * Time slots after this hour are hidden.
	 * @default 24
	 */
	dayEndHour?: number;

	/**
	 * Available views to show in the view switcher.
	 * Controls which view buttons are displayed.
	 * @default [CalendarViewType.MONTH, CalendarViewType.WEEK, CalendarViewType.DAY, CalendarViewType.YEAR]
	 */
	availableViews?: CalendarViewType[];

	/**
	 * Whether to enable drag and drop for events.
	 * When enabled, events can be dragged to different days.
	 * @default true
	 */
	dragAndDropEnabled?: boolean;
}

/**
 * Default configuration values for the calendar.
 * These are applied when no config is provided.
 */
export const DEFAULT_CALENDAR_CONFIG: Required<CalendarConfig> = {
	weekStartsOn: 0,
	showWeekNumbers: false,
	dayStartHour: 0,
	dayEndHour: 24,
	availableViews: [CalendarViewType.MONTH, CalendarViewType.WEEK, CalendarViewType.DAY, CalendarViewType.YEAR],
	dragAndDropEnabled: true
};
