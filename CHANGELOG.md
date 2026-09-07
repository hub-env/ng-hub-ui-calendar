# Changelog

All notable changes to this project will be documented in this file.

## [22.7.0] - 2026-09-07

### Added

- **`config.showWeekNumbers` draws the column it always promised.** The option was declared, defaulted
  and documented — the playground even described the column it would add — and no line of the component
  read it, so a consumer who switched it on saw the same grid as before and had nothing to debug. Month
  view now renders a leading week-number column when the option is on: a `rowheader` cell per week row,
  under a column header in the weekday row. The numbering generalizes ISO-8601 instead of hardcoding it —
  a week is numbered within the year of its middle day, which for a Monday-first grid is exactly the
  Thursday ISO-8601 anchors on — so a calendar that starts on Sunday gets numbers that agree with the rows
  they label rather than with a Monday grid it is not drawing. The column is off by default, and its width
  is the new `--hub-calendar-week-number-width` token (`3rem`).

- **Two dictionary keys for the new column**, `weekAbbr` (the short column header) and `weekNumberLabel`
  (the accessible name of a cell, carrying a `{count}` placeholder). Both ship filled in English and
  Spanish, both are reachable from an application dictionary under `HUBUI.CALENDAR.*`, and an unfilled key
  falls back to English rather than rendering blank — the bare number alone would be announced with no
  indication of what it counts.

- **`CalendarWeek.weekNumber` is populated.** It was part of the public type and never filled in, so a
  consumer reading the weeks could not get the number even by computing around the missing column.

- **`CalendarMonth.shortName` is populated, and the year view is typed by the public interface.** The
  same defect one type further down: `CalendarMonth` is exported from the public API and documents four
  fields, but the year view assembled anonymous `{ date, name, eventCount }` objects, so `shortName` was
  declared, documented as the name to use "when space is limited", and written by nothing. It was the
  only reader the `monthsShort` dictionary entry ever had, which left that entry shipping filled in both
  bundled languages, listed in the `CALENDAR_I18N` docs as a translation a new language must supply, and
  read by no line of the component — a key translators were being asked to fill for nothing. The `months`
  signal is now typed `CalendarMonth[]` and fills all four fields, `shortName` from `monthsShort` through
  the same lookup as every other label, so it follows the `locale` input and an application dictionary
  alike. The built-in month card still prints the full name; what changes is that a consumer reading
  `months` to lay the year out in less room than the card takes finally gets the short name the type
  promised.

- **Timed events are placed against the hour ruler in the week and day views.** The ruler was
  drawn and read by nothing: every timed event was stacked from the top of its column in the order
  the caller supplied, so an 11:00 event sat exactly where 00:00 is and a two-hour meeting was the
  same height as a five-minute one. An event now owns the band its own clock gives it — the top
  follows `start`, the height follows the duration — clipped to the part of it that falls inside
  the ruler, so an event that began yesterday starts at the top of today instead of above it. An
  event that declares no `end` is drawn one hour long, which is what FullCalendar assumes for the
  same case (`defaultTimedEventDuration`), and so is one whose `end` precedes its `start`. Three
  tokens size the result: `--hub-calendar-hour-height` (`60px`) is the height of one hour and the
  unit every band is measured in, so re-scaling it moves the events with the ruler;
  `--hub-calendar-event-min-height` (`1.5rem`) keeps a fifteen-minute event legible without
  inflating its duration — the top edge still marks the real start; and
  `--hub-calendar-event-gutter` (`2px`) is the gap between two events sharing a column.

- **Events that overlap in time share the width of the day column.** Two events at the same hour
  cannot both take the whole column, and drawing one over the other hides it. The rule is the
  greedy column packing FullCalendar, Google Calendar and Outlook Web all build on: events are
  grouped into clusters of overlap, each event takes the first column free at its start time, and
  every event of the cluster ends up `1 / columns` wide. So a pair at 09:00 becomes two halves and
  leaves an unrelated event at 17:00 at full width; a column freed by an event that has already
  ended is reused rather than doubling the count; and two events that merely touch — one ending
  where the next starts — are not treated as in conflict. On a tie the longer event takes the
  leftmost column, so short events stack to its right. Two refinements of those calendars are
  deliberately left out and noted here so their absence is not read as an oversight: an event does
  **not** grow rightwards into columns nothing occupies while it runs (FullCalendar's expansion
  step, which buys width at the price of neighbours of unequal width for no reason a reader can
  see), and the bands are **not** offset to show through one another (`slotEventOverlap`, a hint
  that only pays off once the columns are too narrow to read). Both can be added later without
  changing anything a consumer depends on.

- **The new placement is public.** `getTimedEventPlacements(day)` returns the geometry the views
  draw — one `CalendarEventPlacement` per drawable event, with `offset` and `span` in hours from
  the top of the ruler and `left`/`right` in percent of the column — and the interface is exported
  from the public API, so a consumer laying out its own hour grid can reuse the arithmetic instead
  of reimplementing it.

- **An all-day strip above the week and day grids.** Week and day views now open with a row of their
  own above the hour ruler, separated by a rule, labelled "all day" in the same left margin the hours
  use, and all-day events are drawn there instead of in the hour columns. That position is the whole
  explanation: an event sitting in that row _is_ an all-day event, which is why the chip carries no
  badge, no icon and no tooltip saying so — the arrangement FullCalendar, Google Calendar, Outlook
  Web, Kendo and Syncfusion all landed on. The strip is drawn whether or not the period holds an
  all-day event, so the label stays where the reader learned it and the hour grid does not shift by a
  row from one week to the next; it sits outside the scrolling area, so it does not slide away as the
  day is scrolled. The label is the existing `allDay` dictionary key, so it is already translated in
  both bundled languages and overridable from an application dictionary. Two new tokens size the row:
  `--hub-calendar-time-column-width` (`60px`, shared with the hour ruler so the label lines up with
  it) and `--hub-calendar-all-day-min-height` (`2.5rem`).

### Changed

- **`CalendarEvent.allDay` now decides something.** The flag was declared, documented as displaying
  "at the top of day/week views" and shipped with a translated `allDay` label nothing ever rendered:
  an all-day event drew exactly like a timed one, wherever the caller had left it in the array. It
  now decides placement. In the week and day views the event moves into the all-day strip described
  above. In the month view, where a grid of stacked bars leaves no room for a strip, the contrast is
  made the other way round, as every calendar named above makes it: **a timed event prints its start
  time in front of the title, behind a dot in the event colour, on no fill of its own; an all-day
  event keeps the filled bar and states no time.** All-day events still lead their day — the
  partition keeps the caller's order inside each group, so a list already sorted by start time stays
  sorted — still carry a `hub-calendar__event--all-day` modifier class, and still append the
  localized "all day" label to their accessible name, which is the only way a distinction made of
  position and typography reaches a screen reader. The start time is formatted with the `locale`
  input rather than the application `LOCALE_ID`, like every other label, and is printed only on the
  day the event starts: on a later day of a multi-day event it would name an hour of a different day.

- **A timed event outside `config.dayStartHour`–`dayEndHour` is no longer drawn.** While the events
  were merely stacked, an hour the ruler did not reach made no difference to where the chip landed;
  now it does, and a ruler that stops at 18:00 has nowhere honest to put 23:00. The event is left
  out of the grid rather than pinned to an edge that would misstate its time, which is what
  FullCalendar does with `slotMinTime` / `slotMaxTime`. The default ruler covers the whole day, so
  this only reaches a calendar that bounds it. See `BREAKING_CHANGES.md`.

- **Month-view timed chips carry a `hub-calendar__event--timed` modifier**, the counterpart of
  `--all-day`, so the two can be dressed apart from a consumer stylesheet. See `BREAKING_CHANGES.md`:
  the default look of a timed chip in the month view changes, and that is every chip most calendars
  draw.

### Fixed

- **A month chip no longer shrinks below its own text.** The chips are flex children of the cell,
  so a day holding one more event than the cell had room for squashed every chip to half its
  height and let the text spill out of it, rather than hiding the last one behind the "+N more"
  line that exists for exactly that. Chips keep their height; the cell clips.
- **A week row grows when a busy day needs it.** The rows shared the calendar height with
  `flex: 1`, so a cell could not push its row taller and the third chip and the "+N more" line
  were cut off by a row that refused to grow. Rows still fill the calendar on an ordinary month,
  and the month grid scrolls when one needs more room than the calendar has.
- **The dot, the hour and the title of a timed chip stop touching.** The chip laid them out as
  inline content with no separation, so the dot read as part of the hour. They sit in a row now,
  with the title as the only part that gives when the cell is narrow.
- **The month grid writes the hour short.** A cell is a hundred-odd pixels wide and the hour
  shares it with a dot and a title, so `9:00 AM` left the title two characters. The minutes are
  dropped when they are zero — `9 AM`, `9` — which is what Google Calendar and FullCalendar both
  do in the same place. At half past they come back: `9` for 9:30 would be a different time, not
  a shorter way of writing the same one.

- **The day view lines its timed events up with the all-day strip.** The strip and the hour grid are
  two lanes of one column, and a bar that starts further left than the one above it reads as
  misplaced rather than as different. The week view had always wrapped its timed events in
  `.hub-calendar__day-events`, the element carrying the inset and the gap; the day view dropped them
  straight into the column and lost both. Both views share the wrapper now, so the two lanes cannot
  drift apart again.

- **The `--hub-calendar-*` tokens could not be set from the application.** The whole family was
  declared in a single `:root, :host` block, and the component uses emulated encapsulation: the
  build rewrote that into a `:root` half compiled to a selector matching nothing, and a `:host` half
  landing on the `<hub-calendar>` element itself. A declaration on an element beats any value
  inherited from an ancestor whatever its specificity, so an application setting a token in its own
  `:root` saw nothing happen, and even the `hub-calendar { … }` recipe both READMEs print lost to it.
  The defaults are now read where they are painted, as `var(--token, <default>)`, so nothing is
  claimed on the host and a rule written anywhere above the calendar takes effect — the same fix
  applied to `ng-hub-ui-action-sheet` and `ng-hub-ui-milestones`. Every default keeps its full chain
  (component token → sys token → ref token → literal), and the derived accent roles now resolve at
  the point of use, so re-basing `--hub-calendar-accent` alone moves the today tint, the selected day
  and the chips with it. Rendering is unchanged; what changes is who wins. See `BREAKING_CHANGES.md`.

### Removed

- **`config.initialView`, `config.slotDuration` and `config.eventCreationEnabled` are gone.** All three
  were declared in `CalendarConfig`, given defaults in `DEFAULT_CALENDAR_CONFIG` and written up in both
  READMEs, and not one of them was read anywhere in the component. Setting them did nothing, silently,
  with no way for a consumer to tell why. They were withdrawn rather than implemented because each is a
  redesign, not an omission: `slotDuration` presumes a time grid that positions events against the hour
  ruler, and this calendar renders a day's events as a flat list beside a decorative ruler — a finer
  ruler would promise a resolution the drop and the layout do not have; `eventCreationEnabled` presumes
  creation affordances and an output the component does not have, and the calendar deliberately never
  mutates the events array; and `initialView` would be a second source of truth for state `view` already
  owns as a two-way `model()`, with no way to tell an unbound `[view]` from one explicitly set to month.
  `[view]` is the migration for the third. See `BREAKING_CHANGES.md`.

## [22.6.4] - 2026-09-06

### Fixed

- **`locale` stopped at the header.** 22.6.1 pulled the header buttons into the dictionary and left the rest behind: the month cell still overflowed into `+2 more`, a year-view card still read `3 events`, that same card announced `, 3 events` to a screen reader, and the week and day headings took their weekday and month names from `DatePipe` — the application's `LOCALE_ID`, not the calendar's `locale`. A calendar set to Spanish therefore mixed both languages inside one grid, and, as in 22.6.1, nothing a consumer passed could reconcile them: the two literals were written into the template and the bundled dictionaries had no key to override them.

    All four now resolve through the same lookup as the weekday and month names. The count labels arrive as two new dictionary keys, `moreEvents` and `eventCount`, each carrying a `{count}` placeholder so a locale can move the number, drop the `+` or add a word after it — a consumer dictionary (`HUBUI.CALENDAR.*`, or the legacy `calendar.*`) can now reach them, and an unfilled key still falls back to English rather than rendering blank. The week-view day names and the day-view heading are built from `weekdays` / `weekdaysFull` / `months`, which is what makes them follow `locale` instead of `LOCALE_ID`; English output is unchanged, and applications whose `LOCALE_ID` already matched their `locale` see no difference either.

- **`config.weekStartsOn` decided nothing.** The `weekStartsOn` input documented itself as an override of the config field, but it was the only value any grid ever read — so an application that centralised its calendar settings in a shared `CalendarConfig` still opened every calendar on Sunday, and the only way out was repeating `[weekStartsOn]` on every template. The precedence the JSDoc promised now holds: the input wins when it is bound, the config answers when it is not, and Sunday remains the default of last resort. To tell "not bound" from "explicitly Sunday", the input no longer defaults to `0` — its type is now `0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined`, which only matters to code that reads the signal directly; every template binding keeps working unchanged.

- **Four of the nine accents could not be re-pointed from a stylesheet.** `secondary`, `neutral`, `light` and `dark` were treated as foreign variants, so the component wrote `--hub-calendar-accent` as an inline style on the host — which outranks any consumer rule, including the `hub-calendar[data-variant='…'] { --hub-calendar-accent: … }` recipe the library itself documents. All nine canonical variants now resolve through the stylesheet, as `secondary`/`neutral`/`light`/`dark` already did in the SCSS since 22.2.0. Rendering is unchanged; what changes is that a consumer rule now takes effect. Custom variants keep their inline fallback, since no stylesheet rule backs them.

- **`BREAKING_CHANGES.md` sent readers to a file that no longer exists.** The 21.0.0 migration told them to
  `@use 'ng-hub-ui-calendar/src/lib/styles/calendar.scss'` — a path emptied first by 21.1.1, when the
  stylesheet moved next to the component and stopped needing an import at all, and then by 22.4.0, when the
  theming entry became `ng-hub-ui-calendar/styles`. The same section also filed the `base.scss` rename under
  21.0.0 although it shipped in 22.0.0, and the preamble promised breaking changes "in major versions",
  which this library cannot deliver: its major tracks the Angular major it targets, so a break arrives in a
  minor and this file is the only warning a reader gets. Each break now sits under the version that shipped
  it, with a migration that resolves, and the variable count that used to be quoted as "exactly 37" is gone
  rather than left to drift again.

- **The README omitted `selectedDateChange`** from its outputs table, so a reader working from the table
  alone had no way to know `[(selectedDate)]` had a two-way half. It also documented the translation
  dictionary as the top-level `calendar.*` namespace only, and the `CALENDAR_I18N` JSDoc said the same,
  while 22.6.0 made `HUBUI.CALENDAR.*` resolve first — the namespace that exists precisely so an
  application dictionary need not reserve a top-level `calendar` key. Both now lead with `HUBUI.CALENDAR.*`
  and keep the legacy branch documented as the fallback.

- **Changelog heading order.** The 21.1.1 entry sat between 22.1.0 and 22.0.0, which makes the file
  unreadable as a history and unreliable as a source for the documentation site that mirrors it.

- **The CSS variables reference called itself complete while two accent tokens were missing.**
  `--hub-calendar-accent-emphasis` and `--hub-calendar-accent-on` are declared by the component and were
  announced in 22.2.0 as part of the accent family, yet the only file that catalogues the tokens listed
  neither — and the repo-level parity check cannot catch the omission, because it exempts the accent slots
  and only compares rows that already exist. A reader taking the file at its word had no way to learn the
  two roles are overridable, least of all `-on`, the one that decides whether text on the accent is
  readable. The table now covers all 44 declared tokens.

### Added

- **`FUNCTIONALITIES.md`.** Nine other libraries in the monorepo ship one; the calendar had no single place
  showing what the component actually supports and how much of it a running example demonstrates. The table
  is written against the code, so the accessibility layer and the application-dictionary path are marked as
  supported but unexampled instead of being implied to be covered.

### Changed

- **The component now declares `ChangeDetectionStrategy.OnPush`.** Its own JSDoc and the 22.6.0 entry both
  describe the calendar as running under OnPush, and every sibling library in the monorepo says so in its
  metadata, but this one never did — leaving the reader to guess. Nothing changes at runtime: Angular 22
  already applies OnPush unless a component opts into `Eager`, and every value the template reads is a
  signal. What changes is that the source now states the contract instead of relying on the framework
  default staying where it is.

### Deprecated

- **`CalendarModule`, marked for removal in 23.0.0.** The class documented itself as the path for
  "legacy applications using NgModule-based architecture" but carried no `@deprecated` tag, so
  neither an editor nor the build warned anyone it was on its way out. It now says so. The module
  imports and exports `HubCalendarComponent`, `EventTemplateDirective` and
  `DayCellTemplateDirective` — all three standalone, all three already exported from the entry
  point — and provides nothing of its own, so importing them directly is the whole migration. See
  `BREAKING_CHANGES.md`.

## [22.6.3] - 2026-09-01

### Changed

- **The `homepage` in the manifest points at this library's own documentation page** rather than at
  the site root. It is the link a registry shows beside the package and the one a reader clicks from
  it, and landing on a front page they then have to search is a worse answer than landing on the
  reference for the package they were already looking at. Metadata only — no code, no types, no
  styles change, and nothing a consumer imports is affected.

## [22.6.2] - 2026-08-17

### Fixed

- **The package shipped without its licence notice.** `package.json` declared MIT, but no `LICENSE` file travelled in the tarball — and MIT itself requires the copyright notice to be included in distributions. The notice ships now.

## [22.6.1] - 2026-08-16

### Fixed

- **The header buttons ignored the locale.** `Today` was written into the template by hand and the view switcher title-cased the enum, while the weekday and month names came from the dictionary — so a calendar with `locale="es"` rendered "Lun, Mar, Mié" underneath "Today / Month / Week / Day / Year". Nothing a consumer passed could reconcile the two: not `locale`, not the injected `HubTranslationService`, not CSS.

    All five labels now resolve through the same lookup as the day and month names, honouring the translation service first and falling back to the built-in dictionary — which is the contract the component already documented. `today`, `week`, `day`, `month` and `year` were present and complete in both bundled locales the whole time; only the template was not asking for them. With `locale="es"` the header now reads Hoy / Mes / Semana / Día / Año, and English is unchanged.

## [22.6.0] - 2026-08-14

### Changed

- **Labels now resolve `HUBUI.CALENDAR.*` before the legacy `calendar.*` branch.** The collision-safe namespace lets an application dictionary feed the calendar through `provideHubTranslationAdapter()` without reserving a top-level `calendar` key. Existing `calendar.*` dictionaries keep working — the legacy branch is still the fallback.
- **Dictionary changes are now reactive.** The component tracks translation-source emissions, so switching language refreshes the calendar labels instead of leaving the strings resolved at first render under `OnPush`.

### Added

- README documentation for the application-wide translation adapter (`provideHubTranslationAdapter()` from `ng-hub-ui-utils`).

## [22.5.1] - 2026-08-08

### Fixed

- Documentation links now point at the canonical localized URLs. The README linked to `https://hubui.dev/<path>` with no locale prefix and no trailing slash, and both forms are 301-redirected, so every reader arriving from npm or GitHub landed on a redirect instead of the canonical page.

## [22.5.0] - 2026-07-28

### Added

- **Accessibility layer (WAI-ARIA grid + keyboard navigation).** The month view is now exposed as a labelled `role="grid"` (accessible name = the visible month/year, localized): weekday headers are `role="columnheader"` cells in a `role="row"`, week rows are `role="row"` inside a `role="rowgroup"`, and day cells are `role="gridcell"` with `aria-selected` (selected day), `aria-current="date"` (today) and a localized full-date `aria-label` (e.g. "Wednesday, July 15, 2026", built from the calendar i18n tables).
- **Keyboard navigation on the month grid** with a roving tabindex — the selected day is the single tabbable cell, so selection follows keyboard focus, matching the existing header navigation model where previous/next also move `selectedDate`. Arrow keys move by day/week, Home/End jump to the start/end of the week, PageUp/PageDown move to the same day in the previous/next month (clamped to the target month's last day, and emitting `dateChange` like the header buttons), and Enter/Space activate the day exactly like a click (`dayClick`). DOM focus is restored on the target cell after the grid re-renders, so it survives month changes.
- **Interactive elements are now real controls.** Event chips (month, week and day views) and year-view month cards expose `role="button"`, `tabindex="0"`, an `aria-label` and Enter/Space activation wired to the same outputs as their click handlers (`eventClick` / month drill-down). The icon-only previous/next header buttons gained localized `aria-label`s (their glyphs are `aria-hidden`), the view-switcher buttons expose `aria-pressed`, and the header title is an `aria-live="polite"` region so month changes are announced.
- **Keyboard focus rings** (`:focus-visible`) on day cells, event chips and month cards, derived from the existing `--hub-calendar-accent` / `--hub-calendar-accent-on` tokens (no new tokens).
- **Starter unit test suite** (`calendar.component.spec.ts`, 23 specs): creation, month grid rendering, view switching, day/event/month-card activation by mouse and keyboard, roving tabindex and month-crossing navigation, and ARIA attribute coverage. The monorepo test runner picks the library up automatically now that it ships specs.

### Fixed

- **SSR-safe drag-end cleanup.** `onDragEnd` cleaned up lingering drag-over classes via a bare `document.querySelectorAll`, which breaks on the server; the query is now scoped to the component's own host element (also preventing one calendar instance from touching another's cells).

### Notes

- Drag-and-drop event rescheduling remains **pointer-only**; a keyboard rescheduling interaction is intentionally out of scope for this release.

## [22.4.1] - 2026-07-26

### Fixed

- Declared the real `ng-hub-ui-utils` peer range: `>=22.6.0`. The library imports `HubOverflowTooltipDirective` (utils 22.6.0) and `HubTranslationService`; the previous `>=1.0.0` floor resolved to a utils major that lacks those symbols, producing installs that compile but fail at runtime.

## [22.4.0] - 2026-07-07

### Changed

- **BREAKING (packaging) — SCSS ships at `ng-hub-ui-calendar/styles`.** The theme mixin now builds to `dist/calendar/styles/...` (was `dist/calendar/src/lib/styles/...`), so `@use 'ng-hub-ui-calendar/styles'` resolves. Update any `@use` that reached into `src/lib/styles`.

## [22.3.1] - 2026-07-02

### Fixed

- CSS variable fallbacks realigned to the ds light defaults (`--hub-sys-color-primary`: `#3b82f6` → `#0d6efd`; `--hub-sys-state-hover-bg`: `#f3f4f6` → `rgba(0, 0, 0, 0.075)`; `--hub-sys-transition-base`: `all 0.15s ease` → `all 0.2s ease-in-out`; `--hub-ref-font-family-base`: `system-ui, -apple-system, sans-serif` → `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`); fallbacks only apply when ng-hub-ui-ds is not loaded.
- Stale old-palette inline fallbacks for the today/selected day backgrounds (`#eff6ff`, `#dbeafe`) now mirror the accent-derived host defaults (`color-mix` from `--hub-calendar-accent` / `--hub-calendar-accent-subtle`), so they follow custom accents even if the host declarations are unset.
- The two bare day-cell / day-column hover transitions (`background 0.15s ease`) now match the ds base timing (`background 0.2s ease-in-out`).
- Docs: `docs/css-variables-reference.md` default values resynchronized with the actual code declarations (now guarded by the repo-level `tokens-parity` check F).

## [22.3.0] - 2026-06-30

### Added

- **Tooltip on truncated event titles.** Calendar events already clip their title with an ellipsis when they don't fit the cell; hovering a clipped event now reveals its full title via the hub-ui tooltip — applied automatically through `ng-hub-ui-utils`' `[hubOverflowTooltip]`, only when the title actually overflows. The tooltip is **agnostic**: it defaults to the hub-ui tooltip but is swappable with `provideHubTooltip(...)`. No API changes; requires `ng-hub-ui-utils >= 22.6.0` and the tooltip styles (`@use 'ng-hub-ui-utils/styles/tooltip';`).

## [22.2.0] - 2026-06-26

### Changed

- **Accent system migrated to the open-set "local accent slot" pattern.** `<hub-calendar variant="…">` now re-bases a single `--hub-calendar-accent` slot, and the role family — `--hub-calendar-accent-emphasis`, `--hub-calendar-accent-subtle` and the new `--hub-calendar-accent-on` (contrast colour) — is derived **locally** from it with `color-mix(in oklch, …)` / relative color, mirroring the `ng-hub-ui-ds` engine. The built-in variant list grew from 5 to the **nine canonical accents** (`primary · secondary · success · danger · warning · info · neutral · light · dark`), and a bare `[data-variant]` block re-derives the family from the slot so **any custom accent** the host app adds to the ds `$hub-accents` map (e.g. `brand`) works at runtime with one CSS rule — no library recompilation. The active view button and event chip text now read `--hub-calendar-accent-on` for automatic contrast.

### Added

- New tokens `--hub-calendar-accent-on` (grayscale contrast flip driven by the accent's own lightness) and `--hub-calendar-accent-emphasis`.

### Fixed

- Migrated the accent `color-mix()` derivations from the `srgb` colour space to `oklch` for perceptually uniform tints, matching `ng-hub-ui-ds`.

## [22.1.2] - 2026-06-26

### Fixed

- Corrected the `ng-hub-ui-utils` peer dependency range to `>=1.0.0`. The previous caret range (`^1.x`) resolved to `>=1 <2`, which excluded the current `ng-hub-ui-utils` (22.x) and made the peer impossible to satisfy.

## [22.1.1] - 2026-06-25

### Fixed

- Design-token consistency pass: aligned inline fallback defaults with the canonical `ng-hub-ui-ds` values and routed hardcoded literals (z-index, font-weight, line-height, radii and theme-aware colours) through their `--hub-sys-*` / `--hub-ref-*` tokens, so they follow the active theme. No visual change when the ds tokens are loaded.

## [22.1.0] - 2026-06-24

### Added

- New **`variant` input** on `<hub-calendar>` selecting a **semantic accent**: `<hub-calendar variant="success">` recolours the today / selected day, the active view button and the event chips. The built-in values (`primary` / `success` / `danger` / `warning` / `info`) map to the design-system families via a CSS `@each` loop; **any other string is also accepted** — the accent reads `--hub-sys-color-<variant>`. Defaults to primary. New tokens `--hub-calendar-accent` and `--hub-calendar-accent-subtle`.
- New **`hub-calendar-theme()` Sass mixin** (`styles/mixins/calendar-theme`) — theme a calendar in one call: accent, surfaces, header, nav/view buttons, day cells and event chips. Every parameter is optional and defaults to `null`, so only the ones you pass are emitted as `--hub-calendar-*` overrides. Token-based, no Bootstrap dependency.

### Fixed

- The **today** cell background (`--hub-calendar-day-today-bg`) and the selected-day / active-button / event colours now derive from `--hub-calendar-accent` instead of being hard-wired to a fixed blue, so they follow the `variant` and theme overrides. No visual change with the default (primary) accent.

### Changed

- Replaced the uniform `padding` shorthands (`--hub-calendar-day-padding`, `--hub-calendar-header-padding`, `--hub-calendar-month-card-padding`) with the canonical directional `-padding-x` / `-padding-y` tokens. No visual change. **BREAKING**: set the `-x`/`-y` tokens instead of the removed shorthand.

## [22.0.0] - 2026-03-10

### Changed

- **BREAKING CHANGE:** Renamed the global `src/lib/styles/base.scss` file to `src/lib/styles/calendar.scss`.
- Added host class `.hub-calendar` directly to the `hub-calendar` element for better encapsulation.

## [21.1.1] - 2026-03-19

### Changed

- Moved `calendar.scss` from `src/lib/styles/` to co-locate with the component at
  `src/lib/components/calendar/calendar.component.scss`, referenced via `styleUrl`.
  Styles are now bundled automatically — no manual `@use` import is required.
- Removed hardcoded design system token defaults (`--hub-ref-*`, `--hub-sys-*`) from
  the stylesheet. These tokens are expected from the host application's design system;
  all `--hub-calendar-*` variables retain their literal fallback values.

### Fixed

- Added `min-width: 0` to month grid tracks, day cells, and event containers to prevent
  intrinsic content width from expanding grid columns beyond their allotted space.
- Added `width: 100%; max-width: 100%; box-sizing: border-box` to event elements to
  ensure proper clipping within day cell boundaries.

## [21.0.0] - 2026-03-09

### Changed

- **BREAKING CHANGE:** Consolidated and refactored the SCSS variables to prefix them strictly according to standard (`--hub-calendar-*`). See `BREAKING_CHANGES.md` for migration.

## [19.0.3] - 2026-02-09

### Changed

- Relax Angular peer dependencies to `>=19.0.0`.

## [19.0.2] - 2026-02-05

### Changed

- Documentation updates.
- CI/CD workflow integration.
