# Breaking Changes in `ng-hub-ui-calendar`

This document details the breaking changes of `ng-hub-ui-calendar` and how to migrate your codebase.

The major version tracks the Angular major the library targets, so it cannot also signal a break: a breaking change ships in a **minor** release and is announced here. This file — not the version number — is the warning.

## [22.7.0] - 2026-09-07

### Removed: three `CalendarConfig` options that never did anything

- **Change**: `initialView`, `slotDuration` and `eventCreationEnabled` are gone from `CalendarConfig` and
  from `DEFAULT_CALENDAR_CONFIG`.
- **Why it is worth saying plainly**: none of the three was ever read by the component. Whatever you set,
  the calendar behaved as if you had set nothing. Removing them takes away no behaviour — it takes away
  the impression that there was some, which is the part that costs a reader an afternoon.
- **Impact**: a `CalendarConfig` object literal that names any of the three stops compiling
  (`Object literal may only specify known properties`). A config typed as `any`, or built up field by
  field, keeps compiling and keeps doing exactly what it did before: nothing.
- **Migration**:
    - `initialView` → bind the `view` input, which is the two-way state the calendar actually reads.
      `[view]="CalendarViewType.WEEK"` opens on the week view; `[(view)]` keeps following it.
    - `slotDuration` → delete it. The same release taught the day and week grids to position an event
      against the ruler, but they place it at its exact time rather than snapping it to a slot, so
      there is still no resolution for the value to change. Use `config.dayStartHour` /
      `config.dayEndHour` to bound the ruler, and `--hub-calendar-hour-height` to re-scale it.
    - `eventCreationEnabled` → delete it. The calendar never creates or mutates events; handle `dayClick`
      and add the event to your own state.

```ts
// Before
const config: CalendarConfig = {
	initialView: CalendarViewType.WEEK,
	slotDuration: 30,
	eventCreationEnabled: true,
	dayStartHour: 8
};

// After
const config: CalendarConfig = { dayStartHour: 8 };
// <hub-calendar [view]="CalendarViewType.WEEK" [config]="config" (dayClick)="createEvent($event)" />
```

### Changed: the month chip's shape, and two token defaults with it

- **Change**: a month-view timed chip now reads dot · title · hour, with the hour at the end of the
  row instead of in front of the title. `--hub-calendar-event-font-size` drops from
  `var(--hub-ref-font-size-sm, 0.875rem)` to `var(--hub-ref-font-size-xs, 0.75rem)`, and
  `--hub-calendar-day-padding-x` / `-y` drop from `var(--hub-ref-space-2, 0.5rem)` to
  `var(--hub-ref-space-1, 0.25rem)`.
- **Why it is worth saying plainly**: nothing stops compiling, so the only notice is here. Every
  month grid gets visibly denser and every timed chip changes the order of its parts. If you were
  sizing a layout around the old cell padding, or writing a rule that leant on the hour coming first
  (`.hub-calendar__event-time + .hub-calendar__event-title`, say), it is this release that moves it.
- **Impact**: visual, and DOM order inside a timed chip. The classes themselves are unchanged.
- **Migration**: none needed to keep working. To keep the old look, set the tokens back — they are
  what they are for:

```scss
hub-calendar {
	--hub-calendar-event-font-size: var(--hub-ref-font-size-sm, 0.875rem);
	--hub-calendar-day-padding-x: var(--hub-ref-space-2, 0.5rem);
	--hub-calendar-day-padding-y: var(--hub-ref-space-2, 0.5rem);
}
```

The order of the parts is not a token; it is the shape of the chip. A consumer who needs the old one
back owns it through `eventTpt`, which replaces the chip's content entirely.

### Changed: the overflow tooltip is measured on the title, not on the chip

- **Change**: `[hubOverflowTooltip]` still sits on `.hub-calendar__event`, so the hover area is the
  whole chip as before, but what decides whether it speaks is now the truncation of
  `.hub-calendar__event-title` inside it — through `hubOverflowTooltipMeasure`, added to the
  directive in `ng-hub-ui-utils` 22.13.0. The text it announces is the chip's whole row, the title
  and the hour, rather than the title alone.
- **Why it is worth saying plainly**: nothing stops compiling, and for the default rendering this is
  purely a repair — the tooltip had stopped appearing on every timed chip. What is worth knowing is
  the new floor on the peer dependency.
- **Impact**: `ng-hub-ui-calendar` now requires `ng-hub-ui-utils >= 22.13.0`. On an older utils the
  extra attribute is simply not an input of the directive and the build fails on the template.
  A chip whose content comes from a custom `eventTpt` has no `.hub-calendar__event-title` for the
  selector to find, so it falls back to measuring the chip — the behaviour it had before 22.7.0.
- **Migration**: update `ng-hub-ui-utils`.

### Changed: the week and day hour grids place their events

- **Change**: a timed event is no longer a chip stacked at the top of its day column. It is a band
  positioned against the ruler — the top follows `start`, the height follows the duration — and the
  events that overlap in time share the width of the column between them, in equal side-by-side
  columns.
- **Why it is worth saying plainly**: the ruler had never ordered anything. Every timed event was
  stacked from the top of its column in the order the caller supplied them, so an 11:00 event was
  drawn exactly where 00:00 is and a two-hour meeting was the same height as a five-minute one.
  Nothing about the change is subtle: **every week and day view redraws**, and a calendar whose
  events happened to look right because they were listed in order will now find them spread down
  the day.
- **Impact**, point by point:
    - The chips are **absolutely positioned** inside `.hub-calendar__day-events`, which is now the
      positioning surface and is exactly as tall as the ruler. A stylesheet that set a `height`,
      `margin` or `width` on `.hub-calendar__event` inside that wrapper, or relied on the wrapper
      being a flex column with a `gap`, no longer gets what it expected.
    - They render in **start order**, not in the order the `events` array lists them. DOM order no
      longer carries any other meaning.
    - An event with **no `end`** is drawn one hour long instead of taking the same height as every
      other chip. So is one whose `end` precedes its `start`.
    - An event whose hours fall **entirely outside `config.dayStartHour`–`config.dayEndHour`** is not
      drawn at all. It used to appear regardless, because the ruler decided nothing. The default
      ruler covers the whole day, so this only reaches a calendar that bounds it — widen the window
      to bring the event back.
    - An event that **started on a previous day** begins its band at the top of the ruler, and one
      that runs past the last hour is cut there. Neither used to be visible in the geometry, because
      there was none.
    - Drag and drop is unchanged: a drop still lands on a **day**, not on an hour.
- **Migration**: nothing to write for the common case — the geometry arrives on its own. To re-scale
  the grid, set `--hub-calendar-hour-height`; the events follow it, because it is the unit they are
  measured in. To change the floor under a very short event, set `--hub-calendar-event-min-height`;
  to close the gap between two events sharing a column, set `--hub-calendar-event-gutter` to `0`.

```css
hub-calendar {
	/* A denser day: half-height hours, and the bands with them. */
	--hub-calendar-hour-height: 30px;
	--hub-calendar-event-min-height: 1rem;
}
```

A consumer that needs the same arithmetic for a grid of its own can read it off the component:
`getTimedEventPlacements(day)` returns one `CalendarEventPlacement` per drawable event, `offset`
and `span` in hours from the top of the ruler, `left` and `right` in percent of the column.

### Changed: all-day and timed events are drawn, and placed, differently

- **Change**: `CalendarEvent.allDay` finally conditions the rendering, and it does it by giving each
  kind a place rather than a colour.
    - **Week and day views**: a new all-day strip sits above the hour grid, labelled "all day" in the
      hour margin, and all-day events are drawn there instead of in the hour columns. The strip is
      rendered whether or not the period has one.
    - **Month view**: there is no room for a strip, so the contrast is inverted, the way every
      calendar a reader already knows inverts it. A **timed** event now prints its start time in
      front of the title, behind a dot in the event colour, with no fill of its own, and carries a
      new `hub-calendar__event--timed` class. An **all-day** event keeps the filled accent bar and
      shows no time.
    - Everywhere: all-day events lead their day, keep the `hub-calendar__event--all-day` class, and
      append the localized "all day" label to their accessible name.
- **Impact**: this is not confined to events that set `allDay: true`. In the month view **every
  timed chip changes appearance** — from a filled accent bar to a dot, an hour and plain text — so a
  month grid looks materially different even for a calendar that has never used the flag. A
  stylesheet that dresses `.hub-calendar__event` uniformly will now see the two kinds diverge, and
  one that relied on a day's events appearing in the order they were supplied will see all-day
  events move to the front of their group. The week and day views change structurally: the day
  headers moved out of the day columns into a header row of their own, the hour grid is now the
  element that scrolls, and an all-day event is no longer a child of its day column — anything
  reaching into that markup by selector has to be re-pointed.
- **Migration**: to keep a filled chip for timed events in the month view, neutralize the modifier:

```css
.hub-calendar__event--timed {
	background: var(--hub-calendar-event-bg);
	color: var(--hub-calendar-event-color);
}
.hub-calendar__event--timed .hub-calendar__event-dot,
.hub-calendar__event--timed .hub-calendar__event-time {
	display: none;
}
```

There is no opt-out for the placement or the ordering: they are what `allDay` means, and what the
flag was documented to do all along.

### Changed: the calendar no longer declares its token defaults on its own element

- **Change**: the `--hub-calendar-*` defaults used to be declared in a `:root, :host` block in the
  component stylesheet. The component uses emulated encapsulation, so the `:root` half was rewritten
  into a selector that matches nothing and the `:host` half declared the whole family directly on the
  `<hub-calendar>` element. The block is gone: each token is now read where it is painted, as
  `var(--hub-calendar-x, <default>)`, and every default keeps the same chain — component token, then
  design-system token, then literal.
- **Impact**: a rule the application already had now takes effect. That is the fix, but the visible
  result is that a block which had been silently inert starts painting — including the
  `hub-calendar { … }` recipe this library's own README and CSS-variables reference print, which lost
  to the host declaration and therefore did nothing. Check any `:root`, wrapper or `hub-calendar`
  rule you wrote for this library and never saw applied; it applies now. Two smaller consequences:
  reading a token off the element (`getComputedStyle(el).getPropertyValue('--hub-calendar-bg')`)
  returns an empty string, since nothing is declared there any more; and the derived accent roles are
  computed where the colour is painted rather than on the host, so re-basing `--hub-calendar-accent`
  alone now moves the today tint, the selected day and the chips with it.
- **Migration**: none for a calendar themed through `variant`, through the `hub-calendar-theme()`
  mixin or through the design-system tokens — all three behave exactly as before. If a rule for this
  library was written and then abandoned as ineffective, delete it or make it say what you mean.

## [22.6.4] - 2026-09-06

### Announced: `CalendarModule` is removed in 23.0.0

- **Change**: the class is now marked `@deprecated`. Nothing is removed here and nothing changes at runtime — this release is the notice, and the removal lands in 23.0.0, the next version that tracks a new Angular major.
- **Impact**: from 23.0.0 the symbol is gone from the entry point, so `import { CalendarModule }` and `imports: [CalendarModule]` stop compiling.
- **Migration**: import the three standalone declarables the module re-exported. All three come from the same entry point, and the module provided nothing else.

```ts
// Before
@NgModule({ imports: [CalendarModule] })
export class AppModule {}

// After
@Component({
	imports: [HubCalendarComponent, EventTemplateDirective, DayCellTemplateDirective]
})
export class AgendaComponent {}
```

## [22.4.0] - 2026-07-07

### SCSS ships at `ng-hub-ui-calendar/styles` (packaging path)

- **Change**: the theming mixin now builds to `dist/calendar/styles/...` instead of `dist/calendar/src/lib/styles/...`, and a `styles/index.scss` root entry forwards it.
- **Impact**: a `@use` that reached into the old `src/lib/styles/...` path no longer resolves.
- **Migration**: `@use 'ng-hub-ui-calendar/styles' as *;`

## Version 22.1.0

### Removal of Shorthand Padding Tokens

The uniform `padding` shorthand tokens have been removed in favour of the canonical directional `-padding-x` / `-padding-y` token pairs. This brings the calendar in line with the rest of the ecosystem, where every spacing token exposes independent horizontal and vertical control. The default rendering is unchanged.

The following tokens were **removed**:

- `--hub-calendar-day-padding`
- `--hub-calendar-header-padding`
- `--hub-calendar-month-card-padding`

**Migration Steps:**

If you override any of the removed shorthand tokens, replace each one with the corresponding `-padding-x` / `-padding-y` pair:

- `--hub-calendar-day-padding: 0.5rem;` becomes `--hub-calendar-day-padding-x: 0.5rem;` and `--hub-calendar-day-padding-y: 0.5rem;`
- `--hub-calendar-header-padding: 1rem;` becomes `--hub-calendar-header-padding-x: 1rem;` and `--hub-calendar-header-padding-y: 1rem;`
- `--hub-calendar-month-card-padding: 1.5rem;` becomes `--hub-calendar-month-card-padding-x: 1.5rem;` and `--hub-calendar-month-card-padding-y: 1.5rem;`

If you never overrode these tokens, no action is required.

## [22.0.0] - 2026-03-10

### `base.scss` renamed to `calendar.scss`

- **Change**: the global stylesheet `src/lib/styles/base.scss` was renamed to `src/lib/styles/calendar.scss`.
- **Impact**: a `@use` pointing at the old file name no longer resolves.
- **Migration**: none is needed from 21.1.1 onwards — the stylesheet is co-located with the component and
  bundled through `styleUrl`, so no manual import exists to update. The only stylesheet a consumer still
  `@use`s is the theming entry, `ng-hub-ui-calendar/styles` (see 22.4.0).

## Version 21.0.0

### SCSS Variables Standardization

All SCSS custom properties used for overriding `hub-calendar` tokens have been renamed to conform to the ecosystem's strictest naming conventions. The previous namespace strategy used a mix of local variable inclusions that would compile as `--calendar-*` or simply the base element.

All variables have been consolidated to use the strict prefix format `--hub-calendar-*`.
Additionally, all variables are now properly backed by the ecosystem fallback properties (e.g. `var(--hub-sys-surface-elevated)`).

**Migration Steps:**

**Update Variable Names:**
If you override the default variables, you must rename them in your CSS/SCSS selectors pointing to `hub-calendar`.
For instance:

- `var(--calendar-bg)` becomes `var(--hub-calendar-bg)`
- `var(--calendar-month-card-padding)` becomes `var(--hub-calendar-month-card-padding)`
- `var(--calendar-day-hover-bg)` becomes `var(--hub-calendar-day-hover-bg)`

For the complete list of `--hub-calendar-*` variables, consult [`./docs/css-variables-reference.md`](./docs/css-variables-reference.md).
