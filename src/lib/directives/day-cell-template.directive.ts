/**

 * @description Directive to define a custom template for day cells.
 */

import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Directive to define a custom template for day cells in the calendar.
 * Use this directive on an ng-template to customize how entire day cells are rendered.
 *
 * The template context provides:
 * - `day`: The CalendarDay object for this cell, containing:
 *   - `date`: The Date object
 *   - `events`: Array of events on this day
 *   - `isToday`: Boolean indicating if this is today
 *   - `isCurrentMonth`: Boolean for month view styling
 *   - `isWeekend`: Boolean for weekend styling
 *   - `isSelected`: Boolean for selected state
 *
 * @example Basic usage
 * ```html
 * <hub-calendar [events]="events()">
 *   <ng-template dayCellTpt let-day="day">
 *     <div class="my-day-cell">
 *       <span class="day-number">{{ day.date | date:'d' }}</span>
 *       <span class="event-count">{{ day.events.length }} events</span>
 *     </div>
 *   </ng-template>
 * </hub-calendar>
 * ```
 *
 * @example With conditional styling
 * ```html
 * <hub-calendar [events]="events()">
 *   <ng-template dayCellTpt let-day="day">
 *     <div class="custom-day" [class.has-events]="day.events.length > 0">
 *       <span [class.today]="day.isToday">{{ day.date | date:'d' }}</span>
 *       @if (day.events.length > 0) {
 *         <span class="badge">{{ day.events.length }}</span>
 *       }
 *     </div>
 *   </ng-template>
 * </hub-calendar>
 * ```
 */
@Directive({
	selector: '[dayCellTpt]',
	standalone: true
})
export class HubCalendarDayCellTemplateDirective {
	/**
	 * Reference to the template that will be used to render day cells.
	 * Injected automatically when the directive is applied to an ng-template.
	 */
	readonly template = inject(TemplateRef<any>);
}
