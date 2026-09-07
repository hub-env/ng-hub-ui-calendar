/**

 * @description Defines the structure for calendar events.
 */

/**
 * Represents a calendar event that can be displayed on the calendar.
 * Events can span multiple days, be all-day events, or have specific times.
 *
 * @template T - Type of custom data attached to the event
 *
 * @example
 * ```typescript
 * const event: CalendarEvent = {
 *   id: 1,
 *   title: 'Team Meeting',
 *   description: 'Weekly sync',
 *   start: new Date('2026-01-15T10:00:00'),
 *   end: new Date('2026-01-15T11:00:00'),
 *   cssClass: 'event-meeting'
 * };
 *
 * // With dynamic CSS class
 * const dynamicEvent: CalendarEvent<{ priority: string }> = {
 *   id: 2,
 *   title: 'Review',
 *   start: new Date(),
 *   data: { priority: 'high' },
 *   cssClass: (e) => e.data?.priority === 'high' ? 'event-urgent' : 'event-normal'
 * };
 * ```
 */
export interface CalendarEvent<T = any> {
	/**
	 * Unique identifier for the event.
	 * Used for tracking and updating events.
	 */
	id?: number | string;

	/**
	 * Display title of the event.
	 * This is the main text shown on the calendar.
	 */
	title: string;

	/**
	 * Optional description or notes for the event.
	 * May be displayed in tooltips or detail views.
	 */
	description?: string;

	/**
	 * Start date and time of the event.
	 * Required for all events.
	 */
	start: Date;

	/**
	 * End date and time of the event.
	 * If not provided, the event is treated as a point-in-time event.
	 */
	end?: Date;

	/**
	 * Whether this is an all-day event.
	 * All-day events display at the top of day/week views.
	 * @default false
	 */
	allDay?: boolean;

	/**
	 * CSS class(es) to apply to the event element.
	 * Can be a static string or a function that returns a class based on event data.
	 *
	 * @example
	 * ```typescript
	 * // Static class
	 * cssClass: 'event-important'
	 *
	 * // Dynamic class based on event
	 * cssClass: (event) => event.data?.priority === 'high' ? 'event-urgent' : 'event-normal'
	 * ```
	 */
	cssClass?: string | ((event: CalendarEvent<T>) => string);

	/**
	 * Custom data attached to the event.
	 * Useful for storing additional properties used in custom templates.
	 */
	data?: T;
}

/**
 * Geometry of one timed event drawn against the hour ruler of the week and day views.
 *
 * The vertical pair is expressed in **hours**, not pixels, so the row height stays a
 * single CSS token (`--hub-calendar-hour-height`) a consumer can re-scale without the
 * component recomputing anything; the horizontal pair is expressed in **percent of the
 * day column**, which is what makes a set of overlapping events share the width no
 * matter how wide the column happens to be.
 */
export interface CalendarEventPlacement<T = any> {
	/**
	 * The event this band draws.
	 */
	event: CalendarEvent<T>;

	/**
	 * Distance from the top of the ruler to the top of the band, in hours from
	 * `config.dayStartHour`. An event that started on a previous day begins at 0: the
	 * band says where the event is *today*, and today it is already running.
	 */
	offset: number;

	/**
	 * Height of the band, in hours, clipped to the part of the event that falls inside
	 * the ruler. A very short event is kept legible by a CSS floor
	 * (`--hub-calendar-event-min-height`) rather than by inflating this number, so the
	 * top edge never lies about the start time.
	 */
	span: number;

	/**
	 * Left edge of the band, as a percentage of the day column.
	 */
	left: number;

	/**
	 * Right edge of the band, as a percentage of the day column measured from its right
	 * side — the complement of `left` plus the width, kept as an inset so the CSS gutter
	 * between neighbouring bands comes out of the box rather than out of the arithmetic.
	 */
	right: number;
}
