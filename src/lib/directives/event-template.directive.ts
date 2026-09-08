/**

 * @description Directive to define a custom template for calendar events.
 */

import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Directive to define a custom template for calendar events.
 * Use this directive on an ng-template to customize how events are rendered.
 *
 * The template context provides:
 * - `event`: The CalendarEvent object being rendered
 *
 * @example Basic usage
 * ```html
 * <hub-calendar [events]="events()">
 *   <ng-template eventTpt let-event="event">
 *     <div class="my-event">
 *       <strong>{{ event.title }}</strong>
 *       <span>{{ event.description }}</span>
 *     </div>
 *   </ng-template>
 * </hub-calendar>
 * ```
 *
 * @example With custom data
 * ```html
 * <hub-calendar [events]="events()">
 *   <ng-template eventTpt let-event="event">
 *     <div class="custom-event" [class.important]="event.data?.priority === 'high'">
 *       <span class="icon">{{ event.data?.important ? '⭐' : '📅' }}</span>
 *       <span>{{ event.title }}</span>
 *     </div>
 *   </ng-template>
 * </hub-calendar>
 * ```
 */
@Directive({
	selector: '[eventTpt]',
	standalone: true
})
export class HubCalendarEventTemplateDirective {
	/**
	 * Reference to the template that will be used to render events.
	 * Injected automatically when the directive is applied to an ng-template.
	 */
	readonly template = inject(TemplateRef<any>);
}
