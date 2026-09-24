/**

 * @description Main calendar component supporting month, week, day, and year views.
 * Features native HTML5 drag-and-drop, custom templates, and i18n support.
 */

import { DatePipe, formatDate, NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
	afterNextRender,
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	contentChild,
	ElementRef,
	inject,
	Injector,
	input,
	model,
	output,
	signal,
	TemplateRef
} from '@angular/core';
import { HubOverflowTooltipDirective, HubTooltipDirective, HubTranslationService } from 'ng-hub-ui-utils';

import { HubCalendarDayCellTemplateDirective } from '../../directives/day-cell-template.directive';
import { HubCalendarEventTemplateDirective } from '../../directives/event-template.directive';
import { CALENDAR_I18N } from '../../i18n/calendar-i18n';
import { CalendarDay, CalendarMonth, CalendarWeek } from '../../models/calendar-day';
import { CalendarEvent, CalendarEventPlacement } from '../../models/calendar-event';
import { HubCalendarDateFormat, resolveCalendarHour12 } from '../../models/calendar-format';
import { CalendarConfig, CalendarViewType, DEFAULT_CALENDAR_CONFIG } from '../../models/calendar-view';
import { HUB_CALENDAR_CONFIG } from '../../services/calendar-config';

/**
 * Main calendar component supporting month, week, day, and year views.
 *
 * Features:
 * - Multiple view types: month, week, day, year
 * - Native HTML5 drag-and-drop for event rescheduling (pointer-only)
 * - WAI-ARIA grid semantics and full keyboard navigation in month view
 *   (roving tabindex, arrows, Home/End, PageUp/PageDown, Enter/Space)
 * - Custom templates for events and day cells
 * - Internationalization support via HubTranslationService
 * - CSS variables for complete styling customization
 *
 * @example Basic usage
 * ```html
 * <hub-calendar
 *   [events]="events()"
 *   [view]="CalendarViewType.MONTH"
 *   (eventClick)="onEventClick($event)"
 *   (dayClick)="onDayClick($event)">
 * </hub-calendar>
 * ```
 *
 * @example With custom event template
 * ```html
 * <hub-calendar [events]="events()">
 *   <ng-template eventTpt let-event="event">
 *     <div class="custom-event">
 *       <span>{{ event.title }}</span>
 *     </div>
 *   </ng-template>
 * </hub-calendar>
 * ```
 */
/** Variants with exact design-system token coverage via the SCSS `@each` loop. */
const CALENDAR_BUILT_IN_VARIANTS = new Set<string>([
	'primary',
	'secondary',
	'success',
	'danger',
	'warning',
	'info',
	'neutral',
	'light',
	'dark'
]);

@Component({
	selector: 'hub-calendar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [DatePipe, NgTemplateOutlet, HubOverflowTooltipDirective, HubTooltipDirective],
	templateUrl: './calendar.component.html',
	styleUrl: './calendar.component.scss',
	host: {
		class: 'hub-calendar',
		'[class.hub-calendar--compact]': 'compact()',
		'[attr.data-variant]': 'variant() ?? null',
		'[style.--hub-calendar-accent]': 'customAccent()',
		'[style.--hub-calendar-height]': 'resolvedHeight()'
	}
})
export class HubCalendarComponent<T = any> {
	/** Milliseconds in one hour, the unit the hour grid measures every band in. */
	private static readonly MS_PER_HOUR = 60 * 60 * 1000;

	/** Events a month cell draws before it folds the rest into the "+N more" chip. */
	private static readonly MONTH_CELL_EVENT_LIMIT = 3;

	/**
	 * The same limit, reachable from the template. The chip and `getHiddenEvents()` have to
	 * agree on where the cell stops drawing, so both read it from here.
	 */
	protected readonly monthCellEventLimit = HubCalendarComponent.MONTH_CELL_EVENT_LIMIT;

	/**
	 * Duration assumed for a timed event that declares no `end`.
	 *
	 * `end` is optional in `CalendarEvent`, and a band of zero height is not a band. One
	 * hour is what FullCalendar assumes for the same case (`defaultTimedEventDuration`),
	 * and it is long enough to stay readable at any sane row height instead of relying on
	 * the CSS floor to rescue every such event.
	 */
	private static readonly DEFAULT_TIMED_EVENT_DURATION_MS = HubCalendarComponent.MS_PER_HOUR;

	/**
	 * Translation service injected for i18n support.
	 * Falls back to built-in translations if not available.
	 */
	private readonly translationSvc = inject(HubTranslationService, { optional: true });

	/** Tracks external dictionary emissions so direct calendar lookups refresh OnPush views. */
	private readonly translationSnapshot = this.translationSvc
		? toSignal(this.translationSvc.translationObserver, { initialValue: {} })
		: signal({});

	/**
	 * Host element reference. Used to scope DOM queries (drag-over cleanup,
	 * roving-tabindex focus restoration) to this calendar instance, which also
	 * keeps them SSR-safe (no global `document` access).
	 */
	private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

	/**
	 * Injector handed to `afterNextRender` when restoring keyboard focus after
	 * the month grid re-renders.
	 */
	private readonly injector = inject(Injector);

	/**
	 * Application-wide defaults. Every format axis resolves instance input → this → built-in,
	 * which is the order `<hub-datepicker>` resolves its own in.
	 */
	private readonly globalConfig = inject(HUB_CALENDAR_CONFIG);

	// =========================================================================
	// INPUTS
	// =========================================================================

	/**
	 * Semantic accent of the calendar: `'primary'` · `'secondary'` · `'success'` · `'danger'` ·
	 * `'warning'` · `'info'` · `'neutral'` · `'light'` · `'dark'`, or any custom string
	 * (read as `--hub-sys-color-<variant>`).
	 * Re-bases `--hub-calendar-accent`, which drives the today / selected day, the
	 * active view button and the event chips. Defaults to primary.
	 */
	readonly variant = input<string>();

	/**
	 * Inline accent for custom (non-built-in) variants — the nine canonical ones are
	 * resolved by the SCSS `@each` loop, so this returns `null` for them and leaves a
	 * consumer stylesheet free to re-point their accent.
	 */
	protected readonly customAccent = computed(() => {
		const v = this.variant();
		return v && !CALENDAR_BUILT_IN_VARIANTS.has(v) ? `var(--hub-sys-color-${v})` : null;
	});

	/**
	 * Events to display on the calendar.
	 * Events are filtered and distributed to the appropriate day cells.
	 */
	readonly events = input<CalendarEvent<T>[]>([]);

	/**
	 * Current view type.
	 * Can be bound two-way using [(view)].
	 * @default CalendarViewType.MONTH
	 */
	readonly view = model<CalendarViewType>(CalendarViewType.MONTH);

	/**
	 * Currently selected/focused date.
	 * Controls which month/week/day is displayed.
	 * Can be bound two-way using [(selectedDate)].
	 */
	readonly selectedDate = model<Date>(new Date());

	/**
	 * Configuration options for the calendar.
	 * Merged with DEFAULT_CALENDAR_CONFIG.
	 */
	readonly config = input<CalendarConfig>({});

	/**
	 * CSS class(es) to apply to all events.
	 * Can be a static string or a function for dynamic classes.
	 */
	readonly eventClass = input<string | ((event: CalendarEvent<T>) => string)>();

	/**
	 * Day the week starts on (0 = Sunday, 1 = Monday, etc.).
	 * Overrides config.weekStartsOn if provided; left unset, the config decides.
	 * @default undefined (falls back to `config.weekStartsOn`, itself 0 = Sunday)
	 */
	readonly weekStartsOn = input<0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined>(undefined);

	/**
	 * Language code for i18n.
	 * Falls back to 'en' if the language is not available.
	 * @default 'en'
	 */
	readonly locale = input<string>('en');

	// ---- Formats -----------------------------------------------------------
	// The vocabulary is the datepicker's, deliberately: `ng-hub-ui-forms` already solved this
	// for `<hub-datepicker>`, and a consumer of both should not have to learn a second name for
	// the same idea. Every one of these is `undefined` by default and falls back to
	// `provideHubCalendar()` and then to what the calendar has always done.

	/**
	 * The header title — the month and year on show. `Intl` options, an Angular date pattern
	 * such as `'MMMM yyyy'`, or a function. Leaves the year view's title, which names a year,
	 * alone.
	 */
	readonly displayFormat = input<HubCalendarDateFormat | undefined>(undefined);

	/** The clock in the chip and day tooltips. `Intl` options, composed with `hourFormat`. */
	readonly timeDisplayFormat = input<Intl.DateTimeFormatOptions | undefined>(undefined);

	/**
	 * The hour a month-view chip prints. Unset, it keeps the abbreviation the narrow cell was
	 * given — `9 AM` for a whole hour, `9:30 AM` for a broken one.
	 */
	readonly eventTimeFormat = input<HubCalendarDateFormat | undefined>(undefined);

	/** The labels down the hour ruler of the week and day views. */
	readonly slotLabelFormat = input<HubCalendarDateFormat | undefined>(undefined);

	/** Force a 12- or 24-hour clock. `undefined` lets the locale decide, as in the datepicker. */
	readonly hourFormat = input<'12' | '24' | undefined>(undefined);

	/** Width of the weekday column headers. */
	readonly weekdayFormat = input<'short' | 'narrow' | 'long' | undefined>(undefined);

	/** How the month is written in the header and on the year view's cards. */
	readonly monthFormat = input<'short' | 'long' | undefined>(undefined);

	/**
	 * How tall the calendar is.
	 *
	 * A bare number — or a numeric string, so `height="600"` works as an attribute — is read
	 * as CSS pixels; anything else is passed through as written, so `'auto'`, `'30rem'` and
	 * `'60vh'` all mean what they say. `'auto'` is the one worth naming: the calendar grows to
	 * its content and scrolls nothing, which is what FullCalendar's `height: 'auto'` does.
	 *
	 * Left unset the calendar fills its container, exactly as before this input existed.
	 *
	 * It exists because the CSS route is a trap. Sizing the calendar from a stylesheet needs an
	 * element selector on `hub-calendar`, a scoped one of those outranks the component's own
	 * `:host` rule, and the `display: block` that so naturally travels beside a height unstacks
	 * the flex column the internal scrolling is built on — the hour grid then grows to its full
	 * day instead of scrolling inside the calendar.
	 *
	 * @default undefined (fills the container)
	 */
	readonly height = input<number | string | undefined>(undefined);

	/**
	 * The `height` input as a CSS length, written to `--hub-calendar-height` on the host.
	 *
	 * Returning `null` when nothing was asked for leaves the token unset, so the stylesheet's
	 * own fallback (`100%`) applies and an application-wide `--hub-calendar-height` keeps
	 * working — the input is the per-instance override, not a permanent occupier of the slot.
	 */
	protected readonly resolvedHeight = computed<string | null>(() => {
		const height = this.height();
		if (height === undefined || height === null || height === '') {
			return null;
		}
		if (typeof height === 'number') {
			return Number.isFinite(height) ? `${height}px` : null;
		}
		const trimmed = height.trim();
		return /^-?\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
	});

	/**
	 * Draws the calendar as a mini-month: the dense, chrome-less shape a dashboard card wants.
	 *
	 * It is a **variant**, not a replacement — an unset `compact` leaves every pixel of the
	 * calendar exactly where it was. Switched on, three things change together, because a
	 * mini-month is all three or none of them:
	 *
	 * - the toolbar goes. The "today" shortcut, the previous/next arrows and the view switcher
	 *   were spending half the height of a 260px card on controls a caption-sized month has no
	 *   room for. The title stays: the one thing a month grid cannot be read without is which
	 *   month it is. Navigation is still available to the consumer — `previous()`, `next()` and
	 *   `goToToday()` are public, so `<hub-calendar #cal compact>` reaches them from its own
	 *   chrome, and `[(selectedDate)]` drives them from the outside;
	 * - the grid loses its floors. A day cell demands 80px and a week row 100px in the full
	 *   calendar, which is six hundred-odd pixels before anything is drawn — that is why a
	 *   260px calendar showed one week and scrolled the rest. Compact drops both to a row
	 *   height that puts the whole month, headers included, in about 250px;
	 * - the cells stop drawing chips and mark instead. There is no room for a title at this
	 *   size, so a day that holds events carries a dot and says how many in its accessible
	 *   name.
	 *
	 * The weekday headers narrow to the locale's own single letters unless `weekdayFormat` says
	 * otherwise — see `_weekdayFormat`.
	 *
	 * @default false
	 */
	readonly compact = input(false, { transform: booleanAttribute });

	/**
	 * Whether the header draws its two button clusters.
	 *
	 * Compact is the only thing that takes them away, and it takes both: leaving the arrows
	 * behind a hidden switcher would keep the row of buttons this mode exists to remove.
	 */
	protected readonly showToolbar = computed(() => !this.compact());

	/**
	 * Whether the view switcher is drawn at all.
	 *
	 * A switcher offering one choice is not a switcher. With `availableViews` narrowed to a
	 * single view the button could never do anything but repaint its own pressed state, and it
	 * was still taking a button's worth of the header — which is the height a short calendar
	 * has least of. Two views or more and it comes back untouched.
	 */
	protected readonly showViewSwitcher = computed(() => this.showToolbar() && this.mergedConfig().availableViews.length > 1);

	// =========================================================================
	// OUTPUTS
	// =========================================================================

	/**
	 * Emitted when an event is clicked.
	 * Provides the full event object.
	 */
	readonly eventClick = output<CalendarEvent<T>>();

	/**
	 * Emitted when a day cell is clicked.
	 * Provides the day object with date and events.
	 */
	readonly dayClick = output<CalendarDay<T>>();

	/**
	 * Emitted when an event is dropped on a different day (drag and drop).
	 * Provides the event, new date, and previous date.
	 */
	readonly eventDrop = output<{ event: CalendarEvent<T>; newDate: Date; previousDate: Date }>();

	/**
	 * Emitted when navigation changes the displayed date.
	 */
	readonly dateChange = output<Date>();

	// =========================================================================
	// TEMPLATE REFERENCES
	// =========================================================================

	/**
	 * Custom template for rendering events.
	 * Use with [eventTpt] directive.
	 */
	readonly eventTemplate = contentChild(HubCalendarEventTemplateDirective, { read: TemplateRef });

	/**
	 * Custom template for rendering day cells.
	 * Use with [dayCellTpt] directive.
	 */
	readonly dayCellTemplate = contentChild(HubCalendarDayCellTemplateDirective, { read: TemplateRef });

	// =========================================================================
	// STATE
	// =========================================================================

	/**
	 * Current date (today) for highlighting.
	 */
	readonly today = signal(new Date());

	/**
	 * Currently dragged event during drag operation.
	 * @internal
	 */
	private draggedEvent: CalendarEvent<T> | null = null;

	// =========================================================================
	// COMPUTED PROPERTIES
	// =========================================================================

	/**
	 * Merged configuration with defaults.
	 * User config overrides default values.
	 */
	readonly mergedConfig = computed(() => ({
		...DEFAULT_CALENDAR_CONFIG,
		...this.config()
	}));

	/**
	 * First day of the week every grid is built from. Resolving the input-over-config
	 * precedence once keeps the two sources from drifting apart as views are added.
	 */
	protected readonly firstDayOfWeek = computed<0 | 1 | 2 | 3 | 4 | 5 | 6>(
		() => this.weekStartsOn() ?? this.mergedConfig().weekStartsOn
	);

	// ---- Resolved formats --------------------------------------------------
	// Instance input, else the application-wide config, else the built-in default — the same
	// three-step fallback `<hub-datepicker>` uses, so the two behave alike when both are
	// configured from one `provide…` call.

	protected readonly _displayFormat = computed(() => this.displayFormat() ?? this.globalConfig.formats.displayFormat);
	protected readonly _timeDisplayFormat = computed(
		() => this.timeDisplayFormat() ?? this.globalConfig.formats.timeDisplayFormat
	);
	protected readonly _eventTimeFormat = computed(() => this.eventTimeFormat() ?? this.globalConfig.formats.eventTimeFormat);
	protected readonly _slotLabelFormat = computed(() => this.slotLabelFormat() ?? this.globalConfig.formats.slotLabelFormat);
	protected readonly _hourFormat = computed(() => this.hourFormat() ?? this.globalConfig.formats.hourFormat);
	/**
	 * Compact moves the default to `narrow` rather than the usual `short`: a column two
	 * characters wide is the whole width a mini-month cell has, and `Mié` in it is clipped
	 * type where `X` is a heading. An explicit `weekdayFormat` still wins, in compact as
	 * everywhere else — the narrowing is a default, not an override.
	 */
	protected readonly _weekdayFormat = computed<'short' | 'narrow' | 'long'>(
		() => this.weekdayFormat() ?? (this.compact() ? 'narrow' : this.globalConfig.formats.weekdayFormat)
	);
	protected readonly _monthFormat = computed(() => this.monthFormat() ?? this.globalConfig.formats.monthFormat);

	/** Whether every clock this calendar prints is a 12-hour one. */
	protected readonly hour12 = computed(() => resolveCalendarHour12(this.locale(), this._hourFormat()));

	/**
	 * Turns a stated format into a function that writes a date.
	 *
	 * The three shapes are the datepicker's: a function is used as it is, a string is an Angular
	 * date pattern, and `Intl` options are composed with the resolved clock — but only when they
	 * name an hour, so a date-only format is not handed an `hour12` it has no use for. A pattern
	 * and a function are never composed with anything: the caller said exactly what they wanted.
	 *
	 * An unusable language tag falls back to the runtime default rather than throwing mid-render,
	 * which is what the calendar's formatters have always done.
	 *
	 * @param format - The format as the consumer stated it
	 * @returns A function writing one date
	 */
	private buildFormatter(format: HubCalendarDateFormat): (date: Date) => string {
		if (typeof format === 'function') {
			return format;
		}

		const locale = this.locale();

		if (typeof format === 'string') {
			return (date: Date) => {
				try {
					return formatDate(date, format, locale);
				} catch {
					return formatDate(date, format, 'en-US');
				}
			};
		}

		const options: Intl.DateTimeFormatOptions = format.hour !== undefined ? { ...format, hour12: this.hour12() } : format;
		let formatter: Intl.DateTimeFormat;
		try {
			formatter = new Intl.DateTimeFormat(locale, options);
		} catch {
			formatter = new Intl.DateTimeFormat(undefined, options);
		}
		return (date: Date) => formatter.format(date);
	}

	/**
	 * Weekday labels based on the resolved first day of the week.
	 * Rotated to start from the configured first day.
	 *
	 * `short` and `long` come from the calendar's own dictionary, so an application dictionary
	 * still reaches them; `narrow` has no entry there and is derived from the locale, which is
	 * where the datepicker takes every weekday name from.
	 */
	readonly weekdayLabels = computed(() => {
		const format = this._weekdayFormat();
		const i18n =
			format === 'long'
				? this.getTranslation('weekdaysFull') || CALENDAR_I18N['en']['weekdaysFull']
				: format === 'narrow'
					? this.narrowWeekdayNames()
					: this.getTranslation('weekdays') || CALENDAR_I18N['en']['weekdays'];
		const start = this.firstDayOfWeek();
		return [...i18n.slice(start), ...i18n.slice(0, start)];
	});

	/**
	 * Single-letter weekday names for `weekdayFormat: 'narrow'`, Sunday first like every other
	 * weekday array here, read from the locale rather than from the dictionary.
	 */
	private readonly narrowWeekdayNames = computed<string[]>(() => {
		const build = (locale: string | undefined) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
		let formatter: Intl.DateTimeFormat;
		try {
			formatter = build(this.locale());
		} catch {
			formatter = build(undefined);
		}
		// 2026-02-01 is a Sunday, so the seven days that follow it are Sunday through Saturday.
		return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2026, 1, 1 + index)));
	});

	/**
	 * Full weekday names for accessible column-header labels.
	 * Rotated to the configured first day of the week, mirroring `weekdayLabels`.
	 */
	readonly weekdayFullLabels = computed(() => {
		const i18n = this.getTranslation('weekdaysFull') || CALENDAR_I18N['en']['weekdaysFull'];
		const start = this.firstDayOfWeek();
		return [...i18n.slice(start), ...i18n.slice(0, start)];
	});

	/**
	 * Current month name for header display.
	 * Localized based on locale setting.
	 */
	readonly currentMonthName = computed(() => this.monthName(this.selectedDate().getMonth(), this._monthFormat()));

	/**
	 * A month's name from the dictionary, at the requested width.
	 * @param month - Month index, 0-11
	 * @param format - `long` for the spelled-out name, `short` for the abbreviation
	 * @returns The localized month name
	 */
	private monthName(month: number, format: 'short' | 'long'): string {
		const key = format === 'short' ? 'monthsShort' : 'months';
		const names = this.getTranslation(key) || CALENDAR_I18N['en'][key];
		return names[month];
	}

	/**
	 * Current year for header display.
	 */
	readonly currentYear = computed(() => this.selectedDate().getFullYear());

	/**
	 * The header's title.
	 *
	 * `displayFormat` writes it when one is given; otherwise it is the built-in composition of
	 * the dictionary's month name and the year, which is what the header has always shown. The
	 * year view is left out of it on purpose: its title names a year, and handing a day- or
	 * month-shaped format to it would print a month nobody chose — the same narrowing the
	 * datepicker does against its granularity.
	 */
	readonly headerTitle = computed(() => {
		if (this.view() === CalendarViewType.YEAR) {
			return `${this.currentYear()}`;
		}

		const format = this._displayFormat();
		return format === undefined
			? `${this.currentMonthName()} ${this.currentYear()}`
			: this.buildFormatter(format)(this.selectedDate());
	});

	/**
	 * Accessible name of the month-view grid: the visible month and year
	 * (e.g. "July 2026"), localized like the header title.
	 */
	// The spelled-out month whatever `monthFormat` says: an abbreviation is a way of saving
	// room on screen, and an accessible name has none to save.
	readonly monthGridLabel = computed(() => `${this.monthName(this.selectedDate().getMonth(), 'long')} ${this.currentYear()}`);

	/**
	 * Localized labels for the icon-only previous/next navigation buttons.
	 */
	readonly navLabels = computed(() => ({
		previous: this.label('previous'),
		next: this.label('next')
	}));

	/**
	 * Visible text of the "today" shortcut in the header.
	 */
	readonly todayLabel = computed(() => this.label('today'));

	/**
	 * Visible text in the left margin of the all-day strip, on the same track as the hours.
	 * It is the whole explanation the strip needs: an event drawn in the row this labels is
	 * an all-day event, so the chips themselves carry no badge and no tooltip saying so.
	 */
	readonly allDayLabel = computed(() => this.label('allDay'));

	/**
	 * Formats the start hour the month grid prints in front of a timed event. Bound to the
	 * `locale` input rather than the application `LOCALE_ID`, like every other label, so one
	 * calendar localized on its own does not mix two languages inside a single chip.
	 * An unusable language tag falls back to the runtime default instead of throwing mid-render.
	 */
	private readonly timeFormatter = computed(() => {
		const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
		try {
			return new Intl.DateTimeFormat(this.locale(), options);
		} catch {
			return new Intl.DateTimeFormat(undefined, options);
		}
	});

	/**
	 * The same clock, written short, for the month grid.
	 *
	 * A month cell is a hundred-odd pixels wide and the hour shares it with a dot and a title.
	 * Spelling `9:00 AM` there leaves the title a couple of characters, so the minutes are
	 * dropped when they are zero — `9 AM`, `9` — which is what Google Calendar and FullCalendar
	 * both do in their month grids. On the half hour the minutes come back, because `9` for
	 * 9:30 would be a lie rather than an abbreviation.
	 */
	private readonly shortTimeFormatter = computed(() => {
		const hour12 = this.hour12();
		const build = (locale: string | undefined, minute: boolean) => {
			const options: Intl.DateTimeFormatOptions = minute
				? { hour: 'numeric', minute: '2-digit', hour12 }
				: { hour: 'numeric', hour12 };
			return new Intl.DateTimeFormat(locale, options);
		};
		try {
			return { sharp: build(this.locale(), false), split: build(this.locale(), true) };
		} catch {
			return { sharp: build(undefined, false), split: build(undefined, true) };
		}
	});

	/**
	 * Visible text of each view-switcher button, keyed by the view it selects.
	 *
	 * The dictionary already carries `month` / `week` / `day` / `year` under exactly the enum's
	 * own values, so the switcher reads from the same source as the weekday and month names.
	 * Title-casing the enum instead is what made one calendar render its days in Spanish and its
	 * buttons in English, with nothing a consumer could pass to reconcile them.
	 */
	readonly viewLabels = computed<Record<string, string>>(() =>
		Object.fromEntries(this.mergedConfig().availableViews.map((view) => [view, this.label(view)]))
	);

	/**
	 * Whether the month grid renders its leading week-number column.
	 */
	protected readonly showWeekNumbers = computed(() => this.mergedConfig().showWeekNumbers);

	/**
	 * Header of the week-number column. Abbreviated because it shares the weekday
	 * header row, where a full word would widen the column past the numbers it labels;
	 * the full word reaches assistive technology through `weekColumnLabel`.
	 */
	protected readonly weekNumberHeader = computed(() => this.label('weekAbbr'));

	/**
	 * Accessible name of the week-number column header.
	 */
	protected readonly weekColumnLabel = computed(() => this.label('week'));

	/**
	 * Weeks array for month view.
	 * Each week contains 7 day objects.
	 */
	readonly weeks = computed<CalendarWeek<T>[]>(() => this.generateMonthWeeks());

	/**
	 * Days array for week view.
	 * Contains 7 day objects for the current week.
	 */
	readonly weekDays = computed<CalendarDay<T>[]>(() => this.generateWeekDays());

	/**
	 * Current day object for day view.
	 */
	readonly currentDay = computed<CalendarDay<T>>(() => this.generateDayView());

	/**
	 * Writes a whole date the way the reader's language writes one.
	 *
	 * It follows the `locale` input rather than the application `LOCALE_ID`, like every other
	 * label here, and an unusable language tag falls back to the runtime default instead of
	 * throwing mid-render.
	 */
	private readonly fullDateFormatter = computed(() => {
		const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
		try {
			return new Intl.DateTimeFormat(this.locale(), options);
		} catch {
			return new Intl.DateTimeFormat(undefined, options);
		}
	});

	/**
	 * Heading of the day view.
	 *
	 * It used to be assembled here — weekday, comma, month, day, comma, year — which is English
	 * word order and nothing else's: in Spanish it came out as "miércoles, julio 15, 2026", a
	 * sentence no Spanish calendar has ever printed. Joining the pieces by hand cannot be got
	 * right, because the order is a property of the language and not of the date, so they are
	 * not joined here at all: `Intl` knows where every locale puts them. English is unchanged
	 * down to the comma.
	 */
	readonly currentDayLabel = computed(() => this.fullDateFormatter().format(this.currentDay().date));

	/**
	 * Months array for year view.
	 * Contains 12 month objects with event counts.
	 */
	readonly months = computed<CalendarMonth[]>(() => this.generateYearMonths());

	/**
	 * Hours array for day/week time slots.
	 * Based on dayStartHour and dayEndHour config.
	 */
	readonly hours = computed(() => {
		const config = this.mergedConfig();
		const hours: number[] = [];
		for (let h = config.dayStartHour; h < config.dayEndHour; h++) {
			hours.push(h);
		}
		return hours;
	});

	// =========================================================================
	// PUBLIC METHODS - NAVIGATION
	// =========================================================================

	/**
	 * Navigates the calendar to today's date.
	 * Resets the selectedDate to the current date.
	 */
	goToToday(): void {
		this.selectedDate.set(new Date());
		this.dateChange.emit(this.selectedDate());
	}

	/**
	 * Navigates to the previous period based on current view.
	 * - Month: Goes to previous month
	 * - Week: Goes to previous week
	 * - Day: Goes to previous day
	 * - Year: Goes to previous year
	 */
	previous(): void {
		const current = this.selectedDate();
		const newDate = new Date(current);

		switch (this.view()) {
			case CalendarViewType.MONTH:
				newDate.setMonth(newDate.getMonth() - 1);
				break;
			case CalendarViewType.WEEK:
				newDate.setDate(newDate.getDate() - 7);
				break;
			case CalendarViewType.DAY:
				newDate.setDate(newDate.getDate() - 1);
				break;
			case CalendarViewType.YEAR:
				newDate.setFullYear(newDate.getFullYear() - 1);
				break;
		}

		this.selectedDate.set(newDate);
		this.dateChange.emit(newDate);
	}

	/**
	 * Navigates to the next period based on current view.
	 * - Month: Goes to next month
	 * - Week: Goes to next week
	 * - Day: Goes to next day
	 * - Year: Goes to next year
	 */
	next(): void {
		const current = this.selectedDate();
		const newDate = new Date(current);

		switch (this.view()) {
			case CalendarViewType.MONTH:
				newDate.setMonth(newDate.getMonth() + 1);
				break;
			case CalendarViewType.WEEK:
				newDate.setDate(newDate.getDate() + 7);
				break;
			case CalendarViewType.DAY:
				newDate.setDate(newDate.getDate() + 1);
				break;
			case CalendarViewType.YEAR:
				newDate.setFullYear(newDate.getFullYear() + 1);
				break;
		}

		this.selectedDate.set(newDate);
		this.dateChange.emit(newDate);
	}

	/**
	 * Changes the current calendar view.
	 * @param view - The view type to switch to
	 */
	setView(view: CalendarViewType): void {
		this.view.set(view);
	}

	// =========================================================================
	// PUBLIC METHODS - EVENT HANDLERS
	// =========================================================================

	/**
	 * Handles click on an event element.
	 * Stops propagation to prevent triggering day click.
	 * @param event - The clicked event
	 * @param e - The mouse event
	 */
	onEventClick(event: CalendarEvent<T>, e: MouseEvent): void {
		e.stopPropagation();
		this.eventClick.emit(event);
	}

	/**
	 * Handles click on a day cell.
	 * Updates selectedDate and emits dayClick event.
	 * @param day - The clicked day object
	 */
	onDayClick(day: CalendarDay<T>): void {
		this.selectedDate.set(day.date);
		this.dayClick.emit(day);
	}

	/**
	 * Handles click on a month card in year view.
	 * Navigates to that month in month view.
	 * @param monthDate - The date of the clicked month
	 */
	onMonthClick(monthDate: Date): void {
		this.selectedDate.set(monthDate);
		this.setView(CalendarViewType.MONTH);
	}

	// =========================================================================
	// PUBLIC METHODS - ACCESSIBILITY
	// =========================================================================

	/**
	 * Builds the accessible full-date label of a day cell,
	 * e.g. "Wednesday, July 15, 2026", localized via the calendar i18n.
	 * @param day - The day to describe
	 * @returns Localized full-date string
	 */
	getDayAriaLabel(day: CalendarDay<T>): string {
		const weekdays = this.getTranslation('weekdaysFull') || CALENDAR_I18N['en']['weekdaysFull'];
		const months = this.getTranslation('months') || CALENDAR_I18N['en']['months'];
		const date = day.date;
		return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
	}

	/**
	 * Accessible name of a month-view day cell.
	 *
	 * The full date, and in compact the day's event count after it. A compact cell draws a dot
	 * where the full one draws chips, and a dot is `aria-hidden` — so the name is the only
	 * route a screen-reader user has to "this day has something on it". The count is the
	 * dictionary's existing `eventCount`, the same string the year-view cards announce.
	 *
	 * @param day - The day the cell stands for
	 * @returns Localized full date, with the event count appended in compact
	 */
	protected getDayCellLabel(day: CalendarDay<T>): string {
		const base = this.getDayAriaLabel(day);
		return this.compact() && day.events.length > 0 ? `${base}, ${this.getEventCountLabel(day.events.length)}` : base;
	}

	/**
	 * Builds the accessible label of a year-view month card, appending the
	 * event count when the month has events (mirrors the visible card text).
	 * @param month - The month summary to describe
	 * @returns Month label (e.g. "January 2026, 3 events")
	 */
	getMonthAriaLabel(month: Pick<CalendarMonth, 'date' | 'name' | 'eventCount'>): string {
		const base = `${month.name} ${month.date.getFullYear()}`;
		return month.eventCount > 0 ? `${base}, ${this.getEventCountLabel(month.eventCount)}` : base;
	}

	/**
	 * Short weekday name of a date, taken from the same dictionary the month-view headers use.
	 * The week view read it off `DatePipe` instead, which answers to `LOCALE_ID` and ignores
	 * the `locale` input.
	 * @param date - The date whose weekday is being labelled
	 * @returns Localized short weekday name (e.g. "Wed")
	 */
	getWeekdayLabel(date: Date): string {
		const format = this._weekdayFormat();
		if (format === 'narrow') {
			return this.narrowWeekdayNames()[date.getDay()];
		}
		const key = format === 'long' ? 'weekdaysFull' : 'weekdays';
		const weekdays = this.getTranslation(key) || CALENDAR_I18N['en'][key];
		return weekdays[date.getDay()];
	}

	/**
	 * A label down the hour ruler of the week and day views.
	 *
	 * Unset, it stays the bare `9:00` the ruler has always printed: a plain number and a literal
	 * `:00`, which is neither a clock nor localized, and which no existing calendar may lose.
	 * Asking for a `hourFormat` is enough to turn it into a real clock, because a consumer who
	 * has said "this calendar runs on a 12-hour clock" has said it about the ruler too.
	 *
	 * @param hour - Hour of the day, 0-23
	 * @returns The label for that row of the ruler
	 */
	getSlotLabel(hour: number): string {
		// Any date will do: only the hour is read out of it.
		const slot = new Date(2026, 0, 1, hour);
		const format = this._slotLabelFormat();

		if (format !== undefined) {
			return this.buildFormatter(format)(slot);
		}

		if (this._hourFormat() !== undefined) {
			return this.buildFormatter({ hour: 'numeric' })(slot);
		}

		return `${hour}:00`;
	}

	/**
	 * The name a year-view month card prints, at the width `monthFormat` asks for.
	 * @param month - The month summary being drawn
	 * @returns The localized month name
	 */
	getMonthCardLabel(month: CalendarMonth): string {
		return this._monthFormat() === 'short' ? month.shortName : month.name;
	}

	/**
	 * Accessible name of an event chip. An all-day event appends the localized
	 * "all day" label, which is the only way the distinction reaches a screen
	 * reader: sighted readers get it from the strip the chip sits in, or from the
	 * absence of an hour in front of it, and neither survives linearization.
	 * @param event - The event represented by the chip
	 * @returns Localized accessible name
	 */
	getEventAriaLabel(event: CalendarEvent<T>): string {
		return event.allDay ? `${event.title}, ${this.label('allDay')}` : event.title;
	}

	/**
	 * Accessible name of a week-number cell, e.g. "Week 29" — the bare number the
	 * column shows would be read out with no indication of what it counts.
	 * @param week - The week the cell heads
	 * @returns Localized week label
	 */
	getWeekNumberLabel(week: CalendarWeek<T>): string {
		return this.countLabel('weekNumberLabel', week.weekNumber ?? 0);
	}

	/**
	 * Localized "+N more" chip shown when a day cell holds more events than it can render.
	 * @param count - How many events are hidden
	 * @returns Localized overflow label
	 */
	getMoreEventsLabel(count: number): string {
		return this.countLabel('moreEvents', count);
	}

	/**
	 * Localized event count of a year-view month card, used both as visible text and inside
	 * the card's accessible name.
	 * @param count - How many events the month holds
	 * @returns Localized count label
	 */
	getEventCountLabel(count: number): string {
		return this.countLabel('eventCount', count);
	}

	/**
	 * Events a month cell holds but does not draw — the ones the "+N more" chip stands for.
	 * @param day - The day whose cell overflowed
	 * @returns The events past the third, in the caller's own order
	 */
	getHiddenEvents(day: CalendarDay<T>): CalendarEvent<T>[] {
		return day.events.slice(HubCalendarComponent.MONTH_CELL_EVENT_LIMIT);
	}

	/**
	 * One event as one line: its title and, when it has one, its hour — the same two pieces
	 * the chip shows, in the order it shows them.
	 *
	 * This is what the overflow tooltip announces. Where the truncation is *measured* and
	 * what is *shown* are two different questions: the measurement stays on the title,
	 * because that is the only box that clips, but the answer has to be the whole row —
	 * the hour is exactly what a narrow cell squeezes away from the title beside it. An
	 * all-day event has no hour, so its line is the title alone and no separator is left
	 * dangling behind it.
	 *
	 * The week and day views get the same line even though their chips print no hour: the
	 * ruler states the time by position, but the tooltip is read on its own and two events
	 * that share a title are told apart by nothing else.
	 *
	 * @param event - The event the chip stands for
	 * @param date - The day the chip is drawn in, which decides whether the hour is this day's
	 * @returns The event's row as one line
	 */
	getEventTooltip(event: CalendarEvent<T>, date: Date): string {
		const time = this.getEventTime(event, date);
		return time ? `${event.title} · ${time}` : event.title;
	}

	/**
	 * The whole day, one event per line, as the "+N more" chip's hover text.
	 *
	 * The chip said how many events were missing and never which, so the only way to find out
	 * was to open the day. Google Calendar answers the same question with a popover listing
	 * the rest; a tooltip is the modest version of that — it tells the reader what is behind
	 * the chip without inventing an overlay, a focus trap and a dismissal contract this
	 * component does not otherwise have.
	 *
	 * It lists **every** event of the day, not only the hidden ones: reading a list of the
	 * leftovers means adding it to the three chips above by eye to know what the day holds,
	 * and the point of hovering the chip is to see the day at a glance. The three already on
	 * screen cost one line each and keep the caller's own order.
	 *
	 * It is a plain `[hubTooltip]`, not the overflow one: the chip is a short label that
	 * always fits, so a tooltip that speaks only while its host is truncated would never
	 * speak at all. The line breaks survive because the chip asks for a pre-line white space,
	 * which the directive forwards onto the bubble.
	 *
	 * @param day - The day whose cell overflowed
	 * @returns One line per event of the day
	 */
	getDayEventsTooltip(day: CalendarDay<T>): string {
		return this.getDayEventLines(day, '- ').join('\n');
	}

	/**
	 * The day as a list of lines, one per event, in the order the day holds them — which puts
	 * the all-day events first, as the cell draws them.
	 *
	 * An all-day event has no hour to file it under, so its line is named instead: the
	 * localized "all day" label and the title. One such line per event rather than one line
	 * listing them all, so every line of the list is one event and the eye can count them.
	 * A timed event goes under a bullet, its clock time and a colon.
	 *
	 * The label is the dictionary's existing `allDay` — the same word the week and day views
	 * print in the margin of their all-day strip. A second key holding the same string in
	 * every language would be one more thing for a translator to fill and one more thing to
	 * drift out of step with the strip.
	 *
	 * @param day - The day being listed
	 * @param bullet - Marker in front of a timed line; empty when the list is read aloud
	 * @returns One line per event
	 */
	private getDayEventLines(day: CalendarDay<T>, bullet: string): string[] {
		return day.events.map((event) =>
			event.allDay ? `${this.label('allDay')}: ${event.title}` : `${bullet}${this.getClockTime(event)}: ${event.title}`
		);
	}

	/**
	 * An event's clock time, always with its minutes.
	 *
	 * The chip abbreviates a whole hour to `9 AM` because a month cell is too narrow to spend
	 * three characters on `:00`. A tooltip line has all the room it needs, and a list where
	 * some entries carry minutes and others do not reads as ragged rather than as brief. It
	 * follows the `locale` input like every other label, so it is 24-hour where the language
	 * is and 12-hour where it is not.
	 *
	 * @param event - The event whose start is being written
	 * @returns The localized start time, hour and minutes
	 */
	private getClockTime(event: CalendarEvent<T>): string {
		return this.buildFormatter(this._timeDisplayFormat())(new Date(event.start));
	}

	/**
	 * Accessible name of the "+N more" chip: the count it shows plus the same day the tooltip
	 * lists, because a tooltip is a pointer affordance and the chip is not focusable. The
	 * lines are joined with a comma rather than a newline — an accessible name is read as one
	 * string, and a stray line break in it is announced as nothing at all.
	 * @param day - The day whose cell overflowed
	 * @returns Localized count followed by the day's events
	 */
	getDayEventsLabel(day: CalendarDay<T>): string {
		// The same lines, minus the bullet: a hyphen carries a list on screen and is read out
		// as a stray character or as nothing at all.
		const lines = this.getDayEventLines(day, '');
		return `${this.getMoreEventsLabel(this.getHiddenEvents(day).length)}: ${lines.join(', ')}`;
	}

	// =========================================================================
	// PUBLIC METHODS - EVENT PLACEMENT
	// =========================================================================

	/**
	 * All-day events of a day. The week and day views draw these in the strip above the
	 * hour grid instead of beside the ruler: an event without hours cannot be placed
	 * against one, and its position in that row is what says so — which is why the chip
	 * needs no badge, no icon and no tooltip of its own.
	 * @param day - The day whose events are being placed
	 * @returns The day's all-day events, in the caller's own order
	 */
	getAllDayEvents(day: CalendarDay<T>): CalendarEvent<T>[] {
		return day.events.filter((event) => !!event.allDay);
	}

	/**
	 * Timed events of a day — the complement of `getAllDayEvents`, and what the hour
	 * grid of the week and day views renders.
	 * @param day - The day whose events are being placed
	 * @returns The day's timed events, in the caller's own order
	 */
	getTimedEvents(day: CalendarDay<T>): CalendarEvent<T>[] {
		return day.events.filter((event) => !event.allDay);
	}

	/**
	 * Places the timed events of a day against the hour ruler of the week and day views.
	 *
	 * Vertically each event owns the band its own clock says it owns: the top follows the
	 * start, the height follows the duration. Horizontally the events that overlap in time
	 * share the width of the column, which is the only part of this that needs an algorithm.
	 *
	 * The one used here is the greedy column packing FullCalendar, Google Calendar and
	 * Outlook Web all build on:
	 *
	 * 1. events are cut to the part of them that falls inside the ruler and sorted by start,
	 *    longest first on a tie, so the long event takes the leftmost column and the short
	 *    ones stack to its right rather than the other way round;
	 * 2. they are grouped into clusters of events transitively connected by overlap, so a
	 *    pair at 09:00 never narrows an unrelated event at 17:00;
	 * 3. inside a cluster each event takes the first column already free at its start time,
	 *    opening a new one only when every existing column is still busy;
	 * 4. every event of the cluster is then `1 / columns` wide, at `column / columns` from
	 *    the left.
	 *
	 * Two refinements those calendars add are deliberately left out. FullCalendar lets an
	 * event grow rightwards into columns nothing occupies while it runs, which buys width at
	 * the price of neighbours of unequal width for no reason a reader can see. And it offsets
	 * the bands so each one shows through the next (`slotEventOverlap`), a hint that pays off
	 * only once the columns are too narrow to read; without it every band keeps a whole edge
	 * of its own, which is the more honest of the two pictures. Both stay available later
	 * without changing this contract, since they only move `left`/`right`.
	 *
	 * @param day - The day whose events are being placed
	 * @returns One placement per drawable event, in start order
	 */
	getTimedEventPlacements(day: CalendarDay<T>): CalendarEventPlacement<T>[] {
		const config = this.mergedConfig();
		// Hours are counted as fixed-width offsets from local midnight, which is the same
		// assumption the ruler beside them already makes by drawing one row per hour: on a
		// day with a clock change the two are wrong together rather than out of step.
		const midnight = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate()).getTime();
		const rulerStart = midnight + config.dayStartHour * HubCalendarComponent.MS_PER_HOUR;
		const rulerEnd = midnight + config.dayEndHour * HubCalendarComponent.MS_PER_HOUR;

		const bands = this.getTimedEvents(day)
			.map((event) => this.clipToRuler(event, rulerStart, rulerEnd))
			.filter((band): band is { event: CalendarEvent<T>; start: number; end: number } => band !== null)
			.sort((a, b) => a.start - b.start || b.end - a.end);

		const placements: CalendarEventPlacement<T>[] = [];
		let cluster: { band: (typeof bands)[number]; column: number }[] = [];
		let columnEnds: number[] = [];

		/** Turns the closed cluster into placements, now that its column count is known. */
		const close = (): void => {
			const columns = columnEnds.length;
			for (const { band, column } of cluster) {
				placements.push({
					event: band.event,
					offset: (band.start - rulerStart) / HubCalendarComponent.MS_PER_HOUR,
					span: (band.end - band.start) / HubCalendarComponent.MS_PER_HOUR,
					left: (column / columns) * 100,
					right: ((columns - column - 1) / columns) * 100
				});
			}
			cluster = [];
			columnEnds = [];
		};

		for (const band of bands) {
			// A band starting after every open column has ended shares its width with none
			// of them: the cluster is finished and its width can be divided.
			if (columnEnds.length && band.start >= Math.max(...columnEnds)) {
				close();
			}

			let column = columnEnds.findIndex((end) => end <= band.start);
			if (column === -1) {
				column = columnEnds.length;
				columnEnds.push(band.end);
			} else {
				columnEnds[column] = Math.max(columnEnds[column], band.end);
			}
			cluster.push({ band, column });
		}
		close();

		return placements;
	}

	/**
	 * Cuts an event down to the slice of it the ruler can show.
	 *
	 * An event that started yesterday begins its band at the top of the ruler rather than
	 * above it — the band answers "where is this event today", and today it is already
	 * running — and the same clipping at the bottom keeps a multi-day event from painting
	 * over the rows below. An event landing entirely outside `dayStartHour`–`dayEndHour`
	 * has no band at all: a ruler that stops at 18:00 has nowhere honest to draw 23:00.
	 * @param event - The event being placed
	 * @param rulerStart - Timestamp the ruler starts at
	 * @param rulerEnd - Timestamp the ruler ends at
	 * @returns The visible slice, or `null` when none of the event falls inside the ruler
	 */
	private clipToRuler(
		event: CalendarEvent<T>,
		rulerStart: number,
		rulerEnd: number
	): { event: CalendarEvent<T>; start: number; end: number } | null {
		const start = new Date(event.start).getTime();
		if (!Number.isFinite(start)) {
			return null;
		}

		// A missing, unparsable or backwards `end` all mean the same thing here: the event
		// states no duration, so it gets the default one instead of a band of zero height.
		const declaredEnd = event.end ? new Date(event.end).getTime() : Number.NaN;
		const end =
			Number.isFinite(declaredEnd) && declaredEnd > start
				? declaredEnd
				: start + HubCalendarComponent.DEFAULT_TIMED_EVENT_DURATION_MS;

		const from = Math.max(start, rulerStart);
		const to = Math.min(end, rulerEnd);

		return to > from ? { event, start: from, end: to } : null;
	}

	/**
	 * Start time printed in front of a timed event in the month grid, where there is no
	 * room for an all-day strip and the contrast has to be made the other way round: the
	 * timed event states its hour, the all-day one has none to state.
	 *
	 * Empty for an all-day event, and for a day a multi-day event merely spans — printing
	 * the start time there would name an hour of a different day.
	 * @param event - The event being drawn
	 * @param date - The day cell drawing it
	 * @returns The localized start time, or an empty string when there is none to show
	 */
	getEventTime(event: CalendarEvent<T>, date: Date): string {
		if (event.allDay) {
			return '';
		}

		const start = new Date(event.start);
		if (!this.isSameDay(start, date)) {
			return '';
		}
		const format = this._eventTimeFormat();
		if (format !== undefined) {
			return this.buildFormatter(format)(start);
		}

		const { sharp, split } = this.shortTimeFormatter();
		return (start.getMinutes() === 0 ? sharp : split).format(start);
	}

	// =========================================================================
	// PUBLIC METHODS - KEYBOARD NAVIGATION
	// =========================================================================

	/**
	 * Keyboard handler for month-view day cells, implementing the WAI-ARIA grid
	 * navigation model with a roving tabindex. The selected day is the single
	 * tabbable cell, so selection follows keyboard focus (matching the existing
	 * header navigation, where previous/next also move `selectedDate`):
	 * - Arrow keys move by one day (left/right) or one week (up/down)
	 * - Home/End jump to the start/end of the focused week
	 * - PageUp/PageDown move to the same day in the previous/next month
	 * - Enter/Space activate the day (same behavior as clicking it)
	 *
	 * Crossing a month boundary re-renders the grid on the new month, emits
	 * `dateChange` (mirroring the header previous/next buttons) and restores
	 * DOM focus on the target cell after the re-render.
	 * @param e - The keyboard event
	 * @param day - The day cell that received the key
	 */
	onGridKeydown(e: KeyboardEvent, day: CalendarDay<T>): void {
		// Ignore keys bubbling up from interactive children (e.g. event chips).
		if (e.target !== e.currentTarget) {
			return;
		}

		let target: Date | null = null;

		switch (e.key) {
			case 'ArrowLeft':
				target = this.addDays(day.date, -1);
				break;
			case 'ArrowRight':
				target = this.addDays(day.date, 1);
				break;
			case 'ArrowUp':
				target = this.addDays(day.date, -7);
				break;
			case 'ArrowDown':
				target = this.addDays(day.date, 7);
				break;
			case 'Home':
				target = this.startOfWeek(day.date);
				break;
			case 'End':
				target = this.addDays(this.startOfWeek(day.date), 6);
				break;
			case 'PageUp':
				target = this.addMonths(day.date, -1);
				break;
			case 'PageDown':
				target = this.addMonths(day.date, 1);
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				this.onDayClick(day);
				return;
			default:
				return;
		}

		e.preventDefault();
		this.moveFocusTo(target);
	}

	/**
	 * Keyboard handler for event chips: Enter/Space emit `eventClick`,
	 * mirroring the chip's click behavior. Propagation stops so the
	 * containing day cell is not activated as well.
	 * @param event - The calendar event represented by the chip
	 * @param e - The keyboard event
	 */
	onEventKeydown(event: CalendarEvent<T>, e: KeyboardEvent): void {
		if (e.key !== 'Enter' && e.key !== ' ') {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		this.eventClick.emit(event);
	}

	/**
	 * Keyboard handler for year-view month cards: Enter/Space open the month
	 * in month view, mirroring the card's click behavior.
	 * @param monthDate - The first day of the represented month
	 * @param e - The keyboard event
	 */
	onMonthKeydown(monthDate: Date, e: KeyboardEvent): void {
		if (e.key !== 'Enter' && e.key !== ' ') {
			return;
		}

		e.preventDefault();
		this.onMonthClick(monthDate);
	}

	// =========================================================================
	// PUBLIC METHODS - DRAG AND DROP (Native HTML5)
	// =========================================================================

	/**
	 * Handles the dragstart event when an event starts being dragged.
	 * @param event - The calendar event being dragged
	 * @param e - The drag event
	 */
	onDragStart(event: CalendarEvent<T>, e: DragEvent): void {
		if (!this.mergedConfig().dragAndDropEnabled) {
			e.preventDefault();
			return;
		}

		this.draggedEvent = event;

		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify(event));
		}
	}

	/**
	 * Handles the dragover event on a day cell.
	 * Must call preventDefault to allow dropping.
	 * @param e - The drag event
	 */
	onDragOver(e: DragEvent): void {
		if (this.draggedEvent) {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
		}
	}

	/**
	 * Handles the dragenter event on a day cell.
	 * Adds visual feedback for the drop target.
	 * @param e - The drag event
	 */
	onDragEnter(e: DragEvent): void {
		if (this.draggedEvent) {
			const target = e.currentTarget as HTMLElement;
			target.classList.add('hub-calendar__day--drag-over');
		}
	}

	/**
	 * Handles the dragleave event on a day cell.
	 * Removes visual feedback when leaving the drop target.
	 * @param e - The drag event
	 */
	onDragLeave(e: DragEvent): void {
		const target = e.currentTarget as HTMLElement;
		target.classList.remove('hub-calendar__day--drag-over');
	}

	/**
	 * Handles the drop event when an event is dropped on a day.
	 * Emits the eventDrop event with the event and new date.
	 * @param day - The day where the event was dropped
	 * @param e - The drag event
	 */
	onDrop(day: CalendarDay<T>, e: DragEvent): void {
		e.preventDefault();

		const target = e.currentTarget as HTMLElement;
		target.classList.remove('hub-calendar__day--drag-over');

		if (this.draggedEvent) {
			const previousDate = new Date(this.draggedEvent.start);
			const newDate = new Date(day.date);

			this.eventDrop.emit({
				event: this.draggedEvent,
				newDate,
				previousDate
			});

			this.draggedEvent = null;
		}
	}

	/**
	 * Handles the dragend event when dragging ends.
	 * Cleans up the dragged event state.
	 * @param e - The drag event
	 */
	onDragEnd(e: DragEvent): void {
		this.draggedEvent = null;

		// Remove any lingering drag-over classes. Scoped to this calendar's host
		// element (instead of the global `document`) so it is SSR-safe and never
		// touches other calendar instances on the page.
		const dropZones = this.elementRef.nativeElement.querySelectorAll('.hub-calendar__day--drag-over');
		dropZones.forEach((zone) => zone.classList.remove('hub-calendar__day--drag-over'));
	}

	// =========================================================================
	// PUBLIC METHODS - STYLING
	// =========================================================================

	/**
	 * Gets the CSS class(es) for an event.
	 * Resolves both eventClass input and event-specific cssClass.
	 * @param event - The event to get classes for
	 * @returns Space-separated class string
	 */
	getEventClass(event: CalendarEvent<T>): string {
		const classes: string[] = [];

		// Apply input eventClass
		const eventClassInput = this.eventClass();
		if (typeof eventClassInput === 'function') {
			classes.push(eventClassInput(event));
		} else if (eventClassInput) {
			classes.push(eventClassInput);
		}

		// Apply event-specific cssClass
		if (typeof event.cssClass === 'function') {
			classes.push(event.cssClass(event));
		} else if (event.cssClass) {
			classes.push(event.cssClass);
		}

		return classes.filter(Boolean).join(' ');
	}

	// =========================================================================
	// PRIVATE METHODS - TRANSLATION
	// =========================================================================

	/**
	 * One localized string, falling back to the built-in English entry.
	 *
	 * The extra fallback is not redundant with `getTranslation`: a locale registered with only
	 * some of the keys filled in resolves the rest to `undefined`, and a header button is better
	 * in English than blank.
	 * @param key - The translation key (e.g. `'today'`, `'month'`)
	 * @returns The localized label
	 */
	private label(key: string): string {
		return (this.getTranslation(key) as string) || (CALENDAR_I18N['en'][key] as string);
	}

	/**
	 * One localized string carrying a `{count}` placeholder. Keeping the number inside the
	 * template string is what lets a locale move it, drop the `+` sign or add a word after it.
	 * @param key - The translation key
	 * @param count - The number to interpolate
	 * @returns The localized label with the count substituted
	 */
	private countLabel(key: string, count: number): string {
		return this.label(key).replace(/\{count\}/g, String(count));
	}

	/**
	 * Gets a translation for the given key.
	 * Uses HubTranslationService if available, falls back to CALENDAR_I18N.
	 * @param key - The translation key (e.g., 'weekdays', 'months')
	 * @returns The translated value
	 */
	private getTranslation(key: string): any {
		this.translationSnapshot();
		if (this.translationSvc) {
			const translated =
				this.translationSvc.getTranslation(`HUBUI.CALENDAR.${key}`) ??
				this.translationSvc.getTranslation(`calendar.${key}`);
			// Check if translation exists (not just the key returned back)
			if (translated !== undefined && translated !== `calendar.${key}`) {
				return translated;
			}
		}

		const lang = this.locale();
		const translations = CALENDAR_I18N[lang] || CALENDAR_I18N['en'];
		return translations[key];
	}

	// =========================================================================
	// PRIVATE METHODS - DATA GENERATION
	// =========================================================================

	/**
	 * Generates the weeks array for month view.
	 * Creates 6 rows of 7 days each, including days from adjacent months.
	 * @returns Array of CalendarWeek objects
	 */
	private generateMonthWeeks(): CalendarWeek<T>[] {
		const date = this.selectedDate();
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startOffset = (firstDay.getDay() - this.firstDayOfWeek() + 7) % 7;
		const weeks: CalendarWeek<T>[] = [];

		let currentDate = new Date(firstDay);
		currentDate.setDate(currentDate.getDate() - startOffset);

		while (currentDate <= lastDay || weeks.length < 6) {
			const week: CalendarDay<T>[] = [];

			for (let i = 0; i < 7; i++) {
				const dayDate = new Date(currentDate);
				week.push({
					date: dayDate,
					events: this.getEventsForDate(dayDate),
					isToday: this.isSameDay(dayDate, this.today()),
					isCurrentMonth: dayDate.getMonth() === month,
					isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
					isSelected: this.isSameDay(dayDate, this.selectedDate())
				});
				currentDate.setDate(currentDate.getDate() + 1);
			}

			weeks.push({ days: week, weekNumber: this.getWeekNumber(week[0].date) });
			if (weeks.length >= 6) break;
		}

		return weeks;
	}

	/**
	 * Generates the days array for week view.
	 * Creates 7 consecutive days starting from the week start day.
	 * @returns Array of CalendarDay objects
	 */
	private generateWeekDays(): CalendarDay<T>[] {
		const date = this.selectedDate();
		const start = new Date(date);
		const dayOffset = (start.getDay() - this.firstDayOfWeek() + 7) % 7;
		start.setDate(start.getDate() - dayOffset);

		const days: CalendarDay<T>[] = [];

		for (let i = 0; i < 7; i++) {
			const dayDate = new Date(start);
			dayDate.setDate(start.getDate() + i);
			days.push({
				date: dayDate,
				events: this.getEventsForDate(dayDate),
				isToday: this.isSameDay(dayDate, this.today()),
				isCurrentMonth: true,
				isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
				isSelected: this.isSameDay(dayDate, this.selectedDate())
			});
		}

		return days;
	}

	/**
	 * Generates the day object for day view.
	 * @returns CalendarDay object for the selected date
	 */
	private generateDayView(): CalendarDay<T> {
		const date = this.selectedDate();
		return {
			date,
			events: this.getEventsForDate(date),
			isToday: this.isSameDay(date, this.today()),
			isCurrentMonth: true,
			isWeekend: date.getDay() === 0 || date.getDay() === 6,
			isSelected: true
		};
	}

	/**
	 * Generates the months array for year view.
	 * Creates 12 `CalendarMonth` objects with event counts.
	 *
	 * Every field of the public type is filled, `shortName` included: the type is exported and
	 * `months` is the signal a consumer reads to build its own year layout, so a field left
	 * `undefined` there is a promise the library breaks silently. It is also the only reader of
	 * the `monthsShort` dictionary entry, which ships in both bundled languages and which the
	 * `CALENDAR_I18N` docs ask a new language to supply.
	 * @returns Array of month summaries for the visible year
	 */
	private generateYearMonths(): CalendarMonth[] {
		const year = this.selectedDate().getFullYear();
		const months = this.getTranslation('months') || CALENDAR_I18N['en']['months'];
		const monthsShort = this.getTranslation('monthsShort') || CALENDAR_I18N['en']['monthsShort'];
		const result: CalendarMonth[] = [];

		for (let m = 0; m < 12; m++) {
			const monthDate = new Date(year, m, 1);
			const monthEnd = new Date(year, m + 1, 0);
			const eventCount = this.events().filter((e) => {
				const eventDate = new Date(e.start);
				return eventDate >= monthDate && eventDate <= monthEnd;
			}).length;

			result.push({
				date: monthDate,
				name: months[m],
				shortName: monthsShort[m],
				eventCount
			});
		}

		return result;
	}

	// =========================================================================
	// PRIVATE METHODS - UTILITIES
	// =========================================================================

	/**
	 * Gets all events that occur on a specific date.
	 * Handles both single-day and multi-day events.
	 * @param date - The date to filter events for
	 * @returns Array of events occurring on that date
	 */
	private getEventsForDate(date: Date): CalendarEvent<T>[] {
		const onThatDate = this.events().filter((event) => {
			const eventStart = this.startOfDay(new Date(event.start));
			const eventEnd = event.end ? this.endOfDay(new Date(event.end)) : eventStart;
			const checkDate = this.startOfDay(new Date(date));
			return checkDate >= eventStart && checkDate <= eventEnd;
		});

		// All-day events lead the cell, as the `allDay` contract promises: partitioning
		// keeps the caller's order inside each group, so a list already sorted by start
		// time stays sorted.
		return [...onThatDate.filter((event) => event.allDay), ...onThatDate.filter((event) => !event.allDay)];
	}

	/**
	 * Week number of the week containing the given date, generalized from ISO-8601:
	 * the week is numbered within the year of its middle day (its start plus three),
	 * which for a Monday-start week is exactly the Thursday ISO-8601 anchors on. Deriving
	 * it from the configured first day of the week is what keeps the column from
	 * disagreeing with the row it labels when a calendar starts on Sunday.
	 * @param date - Any date inside the week
	 * @returns The 1-based week number
	 */
	private getWeekNumber(date: Date): number {
		const anchor = this.startOfDay(this.addDays(this.startOfWeek(date), 3));
		const firstOfYear = this.startOfDay(new Date(anchor.getFullYear(), 0, 1));
		// Rounding absorbs the hour a daylight-saving shift adds to or removes from the span.
		const dayOfYear = Math.round((anchor.getTime() - firstOfYear.getTime()) / 86400000) + 1;
		return Math.floor((dayOfYear - 1) / 7) + 1;
	}

	/**
	 * Returns a new date offset by the given number of days.
	 * @param date - The reference date (not mutated)
	 * @param days - Number of days to add (may be negative)
	 * @returns The offset date
	 */
	private addDays(date: Date, days: number): Date {
		const d = new Date(date);
		d.setDate(d.getDate() + days);
		return d;
	}

	/**
	 * Returns the same day-of-month in another month, clamped to the target
	 * month's last day (e.g. Jan 31 + 1 month resolves to Feb 28/29).
	 * @param date - The reference date (not mutated)
	 * @param months - Number of months to add (may be negative)
	 * @returns The offset date
	 */
	private addMonths(date: Date, months: number): Date {
		const d = new Date(date);
		const day = d.getDate();
		d.setDate(1);
		d.setMonth(d.getMonth() + months);
		const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
		d.setDate(Math.min(day, lastDay));
		return d;
	}

	/**
	 * Returns the first day of the week containing the given date,
	 * honoring the resolved first day of the week.
	 * @param date - The reference date (not mutated)
	 * @returns The first day of that week
	 */
	private startOfWeek(date: Date): Date {
		const d = new Date(date);
		const offset = (d.getDay() - this.firstDayOfWeek() + 7) % 7;
		d.setDate(d.getDate() - offset);
		return d;
	}

	/**
	 * Moves the keyboard focus — and the selection, which follows it — to the
	 * given date. Emits `dateChange` when the visible month changes (mirroring
	 * the header previous/next buttons) and restores DOM focus on the target
	 * cell after the grid re-renders.
	 * @param target - The date to focus
	 */
	private moveFocusTo(target: Date): void {
		const current = this.selectedDate();
		const monthChanged = target.getMonth() !== current.getMonth() || target.getFullYear() !== current.getFullYear();

		this.selectedDate.set(target);

		if (monthChanged) {
			this.dateChange.emit(target);
		}

		this.focusSelectedDayCell();
	}

	/**
	 * Focuses the single tabbable day cell (the roving-tabindex stop) after the
	 * next render, so keyboard focus survives grid re-renders and month changes.
	 * `afterNextRender` never runs on the server, keeping this SSR-safe.
	 */
	private focusSelectedDayCell(): void {
		afterNextRender(
			() => {
				this.elementRef.nativeElement.querySelector<HTMLElement>('.hub-calendar__day[tabindex="0"]')?.focus();
			},
			{ injector: this.injector }
		);
	}

	/**
	 * Checks if two dates are the same day.
	 * Ignores time portion.
	 * @param d1 - First date
	 * @param d2 - Second date
	 * @returns True if same day
	 */
	private isSameDay(d1: Date, d2: Date): boolean {
		return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
	}

	/**
	 * Gets the start of a day (midnight).
	 * @param date - The date to normalize
	 * @returns Date set to 00:00:00.000
	 */
	private startOfDay(date: Date): Date {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	/**
	 * Gets the end of a day (23:59:59.999).
	 * @param date - The date to normalize
	 * @returns Date set to 23:59:59.999
	 */
	private endOfDay(date: Date): Date {
		const d = new Date(date);
		d.setHours(23, 59, 59, 999);
		return d;
	}
}
