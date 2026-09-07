// Public API for ng-hub-ui-calendar

// Module
export { CalendarModule } from './lib/calendar.module';

// Components
export { HubCalendarComponent } from './lib/components/calendar/calendar.component';

// Directives
export { DayCellTemplateDirective } from './lib/directives/day-cell-template.directive';
export { EventTemplateDirective } from './lib/directives/event-template.directive';

// Models
export type { CalendarDay, CalendarMonth, CalendarWeek } from './lib/models/calendar-day';
export type { CalendarEvent, CalendarEventPlacement } from './lib/models/calendar-event';
export { CalendarViewType, DEFAULT_CALENDAR_CONFIG } from './lib/models/calendar-view';
export type { CalendarConfig } from './lib/models/calendar-view';

// i18n
export { CALENDAR_I18N } from './lib/i18n/calendar-i18n';
