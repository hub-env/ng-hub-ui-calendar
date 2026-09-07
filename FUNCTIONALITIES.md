# Functionalities of Calendar Library

This table details the functionalities of the `ng-hub-ui-calendar` library and indicates which ones are covered by interactive examples.

The library ships one component, `hub-calendar`, plus the two structural directives that let you replace its markup.

## Views and navigation

| Category       | Functionality                                      | Example Covered |
| :------------- | :------------------------------------------------- | :-------------: |
| **Views**      | Month grid (`view="month"`)                        |       ✅        |
|                | Week time grid (`view="week"`)                     |       ✅        |
|                | Day time grid (`view="day"`)                       |       ✅        |
|                | Year overview of month cards (`view="year"`)       |       ✅        |
|                | Two-way `[(view)]` / `viewChange`                  |       ✅        |
|                | Switcher narrowed by `config.availableViews`       |       ❌        |
| **Navigation** | Previous / next period buttons                     |       ✅        |
|                | `Today` shortcut                                   |       ✅        |
|                | Two-way `[(selectedDate)]` / `selectedDateChange`  |       ✅        |
|                | `dateChange` emitted on navigation                 |       ✅        |
|                | Year-view month card drills into that month        |       ❌        |
|                | `months` signal of typed `CalendarMonth` summaries |       ❌        |

## Events

| Category          | Functionality                                                    | Example Covered |
| :---------------- | :--------------------------------------------------------------- | :-------------: |
| **Data**          | Typed `events` input (`CalendarEvent<T>` with a `data` payload)  |       ✅        |
| **Interaction**   | `eventClick` output                                              |       ✅        |
|                   | `dayClick` output                                                |       ✅        |
| **Styling hooks** | `eventClass` input (static string or function)                   |       ✅        |
|                   | Per-event `cssClass` (static string or function)                 |       ✅        |
| **Hour grid**     | Timed events placed against the ruler by start and duration      |       ✅        |
|                   | Overlapping events share the column in equal side-by-side bands  |       ✅        |
|                   | An event with no `end` drawn one hour long                       |       ❌        |
|                   | A band clipped to the ruler (previous day, past the last hour)   |       ❌        |
| **All day**       | `allDay` events lead their day and carry an `--all-day` modifier |       ✅        |
|                   | Labelled all-day strip above the week and day hour grids         |       ✅        |
|                   | The strip is drawn even on a period with no all-day event        |       ✅        |
|                   | Month view prints a timed event's start time behind a colour dot |       ✅        |
|                   | Month-view timed chips carry a `--timed` modifier                |       ✅        |
|                   | Their accessible name appends the localized "all day" label      |       ❌        |
| **Overflow**      | Month cell renders three events and a localized `+N more` label  |       ❌        |
|                   | Tooltip on an event title clipped by its cell                    |       ✅        |
| **Drag & drop**   | Native HTML5 drag of an event onto another day                   |       ✅        |
|                   | `eventDrop` with the previous and the new date                   |       ✅        |
|                   | Turned off with `config.dragAndDropEnabled: false`               |       ❌        |

Dropping an event lands it on a **day**, not on a time slot, in all three views that accept a drop. The
calendar never mutates the `events` array: creating, editing and deleting an event stay in the caller's own
state, driven by the outputs above — there is no create-on-empty-slot affordance, which is why 22.7.0
withdrew the `eventCreationEnabled` option that pretended to govern one. The day and week grids do position
an event against the hour ruler, but at its exact time rather than snapped to a slot, which is why
`slotDuration` went the same way; the ruler is re-scaled with `--hub-calendar-hour-height`.

Overlapping events are laid out by greedy column packing — the rule FullCalendar, Google Calendar and
Outlook Web share — so a cluster of events that collide splits the column into equal side-by-side bands and
leaves the rest of the day at full width. The two refinements those calendars add are **not** implemented:
an event does not grow into columns nothing occupies while it runs, and the bands are not offset to show
through one another. `getTimedEventPlacements(day)` exposes the resulting geometry.

## Templates

| Category      | Functionality                                                | Example Covered |
| :------------ | :----------------------------------------------------------- | :-------------: |
| **Templates** | `eventTpt` replaces the event chip (context `{ event }`)     |       ✅        |
|               | `dayCellTpt` replaces the whole day cell (context `{ day }`) |       ✅        |

## Configuration

| Category         | Functionality                                                 | Example Covered |
| :--------------- | :------------------------------------------------------------ | :-------------: |
| **Week start**   | `weekStartsOn` input                                          |       ✅        |
|                  | `config.weekStartsOn` used when the input is not bound        |       ❌        |
| **Week numbers** | `config.showWeekNumbers` draws a leading column in month view |       ✅        |
|                  | Numbering derived from the configured first day of the week   |       ✅        |
| **Time grid**    | `config.dayStartHour` / `config.dayEndHour`                   |       ✅        |
|                  | Events outside the bounded ruler are left undrawn             |       ❌        |
| **Views**        | `config.availableViews`                                       |       ❌        |
| **Drag & drop**  | `config.dragAndDropEnabled`                                   |       ❌        |

## Internationalization

| Category        | Functionality                                             | Example Covered |
| :-------------- | :-------------------------------------------------------- | :-------------: |
| **Bundled**     | `locale` with the bundled `en` and `es` dictionaries      |       ✅        |
|                 | Fallback to English for a locale that is not bundled      |       ✅        |
|                 | `weekAbbr` / `weekNumberLabel` for the week-number column |       ❌        |
|                 | `monthsShort` behind `CalendarMonth.shortName`            |       ❌        |
| **Application** | `HUBUI.CALENDAR.*` through `HubTranslationService`        |       ❌        |
|                 | Legacy top-level `calendar.*` branch as the fallback      |       ❌        |
|                 | Labels re-render when the dictionary source emits         |       ❌        |

## Accessibility

| Category      | Functionality                                                              | Example Covered |
| :------------ | :------------------------------------------------------------------------- | :-------------: |
| **Semantics** | Month view as a labelled `role="grid"` with row / columnheader / gridcell  |       ❌        |
|               | `aria-selected`, `aria-current="date"` and localized full-date cell labels |       ❌        |
|               | Week-number cells as `role="rowheader"` announced as "Week N"              |       ❌        |
|               | `aria-live` header title announcing each period change                     |       ❌        |
|               | `aria-pressed` view switcher and labelled prev / next buttons              |       ❌        |
| **Keyboard**  | Roving tabindex on the month grid                                          |       ❌        |
|               | Arrows, `Home`/`End`, `PageUp`/`PageDown`, `Enter`/`Space`                 |       ❌        |
|               | Event chips and year-view month cards activatable with `Enter`/`Space`     |       ❌        |
| **Focus**     | `:focus-visible` rings derived from the accent tokens                      |       ❌        |

The accessibility layer has no example of its own: it is exercised by the library's own unit suite
(`calendar.component.spec.ts`). Rescheduling by drag and drop remains **pointer-only** — there is no
keyboard equivalent.

## Styling

| Category          | Functionality                                                 | Example Covered |
| :---------------- | :------------------------------------------------------------ | :-------------: |
| **Accent**        | `variant` input with the nine canonical accents               |       ✅        |
|                   | Custom accent read as `--hub-sys-color-<variant>`             |       ✅        |
| **CSS variables** | `--hub-calendar-*` token overrides                            |       ✅        |
|                   | Overrides written above the calendar (`:root`, wrapper, host) |       ✅        |
| **Sass**          | `hub-calendar-theme()` mixin from `ng-hub-ui-calendar/styles` |       ✅        |

No `--hub-calendar-*` token is declared on the `<hub-calendar>` element: each is read where it is
painted, so a rule written anywhere above the calendar takes effect. The only deliberate exception is
`variant`, which declares the accent on the element and is wrapped in `:where()` so a more targeted
consumer rule still wins.

The complete token catalogue lives in [`docs/css-variables-reference.md`](./docs/css-variables-reference.md).
