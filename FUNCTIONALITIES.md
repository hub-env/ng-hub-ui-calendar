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

## Size and layout

| Category   | Functionality                                                           | Example Covered |
| :--------- | :---------------------------------------------------------------------- | :-------------: |
| **Height** | `height` input in pixels (`[height]="600"`, `height="600"`)             |       ✅        |
|            | Any CSS length (`'32rem'`, `'60vh'`) and `'auto'` for grow-don't-scroll |       ❌        |
|            | Unset: the calendar fills its container, as it always has               |       ✅        |
|            | `--hub-calendar-height` for sizing every calendar from `:root`          |       ❌        |
| **Scroll** | Week and day: the hour grid scrolls, headers and all-day strip stay put |       ✅        |
|            | Month: the grid scrolls under a weekday row pinned to the top of it     |       ✅        |
| **Header** | Title centred on the calendar, not on the gap its neighbours leave      |       ✅        |
|            | Header stacks into rows below 48rem of calendar width, title on its own |       ❌        |
|            | Breakpoint keyed to the calendar's own width, not the viewport's        |       ❌        |
|            | The month is never clipped and never split; the row breaks instead      |       ❌        |
|            | View switcher never leaves the calendar: it wraps, then shortens labels |       ❌        |
|            | Navigation and view switcher drawn as joined button groups              |       ✅        |
|            | Group corners rounded logically, so right-to-left flips on its own      |       ❌        |

Sizing the calendar from a consumer stylesheet is possible and is a trap worth naming: a scoped
`hub-calendar { … }` selector outranks the component's own `:host`, so a `display` written beside the
height unstacks the flex column the scrolling is built on and the hour grid grows to its full day
instead of scrolling. `[height]` is the route that cannot be got wrong that way.

## Events

| Category          | Functionality                                                     | Example Covered |
| :---------------- | :---------------------------------------------------------------- | :-------------: |
| **Data**          | Typed `events` input (`CalendarEvent<T>` with a `data` payload)   |       ✅        |
| **Interaction**   | `eventClick` output                                               |       ✅        |
|                   | `dayClick` output                                                 |       ✅        |
| **Styling hooks** | `eventClass` input (static string or function)                    |       ✅        |
|                   | Per-event `cssClass` (static string or function)                  |       ✅        |
| **Hour grid**     | Timed events placed against the ruler by start and duration       |       ✅        |
|                   | Overlapping events share the column in equal side-by-side bands   |       ✅        |
|                   | An event with no `end` drawn one hour long                        |       ❌        |
|                   | A band clipped to the ruler (previous day, past the last hour)    |       ❌        |
| **All day**       | `allDay` events lead their day and carry an `--all-day` modifier  |       ✅        |
|                   | Labelled all-day strip above the week and day hour grids          |       ✅        |
|                   | The strip is drawn even on a period with no all-day event         |       ✅        |
|                   | Month view prints a timed event's start time behind a colour dot  |       ✅        |
|                   | Month-view timed chips carry a `--timed` modifier                 |       ✅        |
|                   | Their accessible name appends the localized "all day" label       |       ❌        |
| **Overflow**      | Month cell renders three events and a localized `+N more` label   |       ❌        |
|                   | `+N more` lists the day's whole agenda, one event per line        |       ✅        |
|                   | All-day events headed by the localized label, timed ones bulleted |       ❌        |
|                   | That list writes the minutes the chip abbreviates away            |       ❌        |
|                   | Chip parts inert, so the pointer always lands on the chip itself  |       ❌        |
|                   | `+N more` carries that list as its accessible name                |       ❌        |
|                   | Tooltip over the whole chip, measured on the title it clips       |       ✅        |
|                   | That tooltip says the chip's whole row: title and hour            |       ✅        |
| **Drag & drop**   | Native HTML5 drag of an event onto another day                    |       ✅        |
|                   | `eventDrop` with the previous and the new date                    |       ✅        |
|                   | Turned off with `config.dragAndDropEnabled: false`                |       ❌        |

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

## Formats

| Category       | Functionality                                                                   | Example Covered |
| :------------- | :------------------------------------------------------------------------------ | :-------------: |
| **Vocabulary** | Datepicker names and types: `displayFormat`, `timeDisplayFormat`, `hourFormat`… |       ✅        |
|                | Each stated as `Intl` options, an Angular date pattern, or a function           |       ❌        |
|                | `parse` / `valueFormat` absent: every edge of this component speaks `Date`      |       ❌        |
| **Surfaces**   | `displayFormat` — the header title (the year view keeps its year)               |       ✅        |
|                | `timeDisplayFormat` — the clock in the chip and day tooltips                    |       ❌        |
|                | `eventTimeFormat` — the hour a month chip prints, abbreviated by default        |       ❌        |
|                | `slotLabelFormat` — the hour ruler of the week and day views                    |       ✅        |
|                | `weekdayFormat` — the weekday column headers (`narrow` from the locale)         |       ✅        |
|                | `monthFormat` — the header month and the year view's cards                      |       ✅        |
| **Clock**      | `hourFormat: '12' \| '24' \| undefined`, `undefined` meaning "ask the language" |       ✅        |
|                | It reaches every clock at once, ruler included                                  |       ✅        |
| **Global**     | `provideHubCalendar()` / `HUB_CALENDAR_CONFIG` for application-wide defaults    |       ❌        |
|                | Resolution order: instance input → global config → built-in default             |       ❌        |
| **Stability**  | Every default is what the calendar drew before the axes existed                 |       ✅        |

The formats example drives `displayFormat`, `slotLabelFormat`, `weekdayFormat`, `monthFormat` and
`hourFormat` from live controls, and starts every one of them at its default so the "nothing changes
until you ask" claim is the first thing on screen. `timeDisplayFormat` and `eventTimeFormat` are
real and specced but have no control there, and the pattern form is the only one the controls offer
— the `Intl` and function forms appear in the code tab, not in the demo.

Accessible names are deliberately outside all of this: the month grid's label and the weekday column
names stay spelled out whatever `monthFormat` and `weekdayFormat` say, because an abbreviation is a
way of saving room on screen and a name read aloud has none to save.

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
