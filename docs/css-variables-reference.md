# ng-hub-ui-calendar - CSS Variables Reference

Complete reference of all CSS custom properties exposed by `ng-hub-ui-calendar`.
Use these variables to customize visual behavior without editing component source code.

---

## Table of Contents

- [How it Works](#how-it-works)
- [Importing Styles](#importing-styles)
- [Base System Fallbacks](#base-system-fallbacks)
- [Calendar Variables](#calendar-variables)
- [Customization Examples](#customization-examples)
- [Best Practices](#best-practices)

---

## How it Works

Calendar styles use this fallback chain:

```text
component token -> sys token -> ref token -> literal fallback
```

This allows runtime theming while keeping defaults stable and self-contained.

### Where to write the override

**Anywhere above the calendar.** Every token below is _read_ where it is painted, as
`var(--token, <default>)`, and none is declared on the `<hub-calendar>` element — so a
value set on `:root`, on a wrapper, on `hub-calendar` itself or on `.hub-calendar` all
reach the grid, and the closest one wins as CSS normally decides.

Until 22.7.0 this was not true: the whole family was declared in a `:root, :host` block,
and under emulated encapsulation that block became a `:root` half matching nothing and a
`:host` half landing on the element itself. A declaration on the element beats any value
inherited from an ancestor whatever its specificity, so an application `:root` never
arrived and a `hub-calendar { … }` rule lost to it too.

The single exception is the `variant` input, which declares `--hub-calendar-accent` on the
element on purpose — asking for a variant is an instruction about that one calendar, and
it is meant to outrank the application-wide default. It is wrapped in `:where()`, so any
rule of yours that targets the calendar more precisely still wins.

---

## Importing Styles

The component ships its own stylesheet, so the tokens below are available with no import at all.
Import the Sass entry only to use the theming mixin:

```scss
@use 'ng-hub-ui-calendar/styles' as calendar;
```

---

## Base System Fallbacks

`ng-hub-ui-calendar` consumes these base tokens as the last link of every default chain:

| Variable                         | Default                                |
| -------------------------------- | -------------------------------------- |
| `--hub-ref-color-white`          | `#ffffff`                              |
| `--hub-ref-space-1`              | `0.25rem`                              |
| `--hub-ref-space-2`              | `0.5rem`                               |
| `--hub-ref-space-3`              | `1rem`                                 |
| `--hub-ref-space-4`              | `1.5rem`                               |
| `--hub-ref-radius-sm`            | `0.25rem`                              |
| `--hub-ref-radius-md`            | `0.5rem`                               |
| `--hub-ref-font-family-base`     | `system-ui, -apple-system, sans-serif` |
| `--hub-ref-font-size-xs`         | `0.625rem`                             |
| `--hub-ref-font-size-sm`         | `0.75rem`                              |
| `--hub-ref-font-size-base`       | `0.875rem`                             |
| `--hub-ref-font-size-lg`         | `1rem`                                 |
| `--hub-sys-surface-page`         | `#ffffff`                              |
| `--hub-sys-surface-elevated`     | `#f9fafb`                              |
| `--hub-sys-text-primary`         | `#1f2937`                              |
| `--hub-sys-text-muted`           | `#6b7280`                              |
| `--hub-sys-border-color-default` | `#e5e7eb`                              |
| `--hub-sys-color-primary`        | `#3b82f6`                              |
| `--hub-sys-color-primary-subtle` | `#dbeafe`                              |
| `--hub-sys-transition-base`      | `all 0.15s ease`                       |

---

## Calendar Variables

Read by `projects/calendar/src/lib/components/calendar/calendar.component.scss`, each at the point it is painted. None is declared on the `<hub-calendar>` element, so the defaults below apply only while you have not set the token.

### Core Container

| Variable                         | Default                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--hub-calendar-bg`              | `var(--hub-sys-surface-page, #ffffff)`                                                                               |
| `--hub-calendar-color`           | `var(--hub-sys-text-primary, #212529)`                                                                               |
| `--hub-calendar-border-color`    | `var(--hub-sys-border-color-default, #dee2e6)`                                                                       |
| `--hub-calendar-border-radius`   | `var(--hub-ref-radius-md, 0.375rem)`                                                                                 |
| `--hub-calendar-accent`          | `var(--hub-sys-color-primary, #0d6efd)`                                                                              |
| `--hub-calendar-accent-emphasis` | `color-mix(in oklch, var(--hub-calendar-accent) 80%, var(--hub-sys-color-ink, #212529))`                             |
| `--hub-calendar-accent-subtle`   | `color-mix(in oklch, var(--hub-calendar-accent) 12%, var(--hub-sys-surface-page, #fff))`                             |
| `--hub-calendar-accent-on`       | `oklch(from var(--hub-calendar-accent) clamp(0, (0.62 - l) * 1000, 1) 0 h)`                                          |
| `--hub-calendar-font-family`     | `var(--hub-ref-font-family-base, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif)` |
| `--hub-calendar-primary`         | `var(--hub-calendar-accent)`                                                                                         |
| `--hub-calendar-muted`           | `var(--hub-sys-text-muted, #6c757d)`                                                                                 |
| `--hub-calendar-height`          | `100%`                                                                                                               |

#### A word about `--hub-calendar-height`

It is a real token — set it on `:root` to give every calendar in the application the same
size — but for one calendar prefer the **`height` input**, which writes this token on that
instance: `[height]="600"`, `height="auto"`, `[height]="'60vh'"`.

**Do not size the calendar with a `hub-calendar { height: … }` rule of your own.** It works,
and then it stops working the day someone adds `display: block` beside the height — which is
the natural thing to write next to it. The calendar lays itself out as a flex column so the
hour grid can own the scroll; a scoped element selector outranks the component's own `:host`,
so that `display` unstacks the column and the grid grows to its full 24 hours instead of
scrolling. The input cannot be got wrong that way.

### Header

| Variable                          | Default                                    |
| --------------------------------- | ------------------------------------------ |
| `--hub-calendar-header-bg`        | `var(--hub-sys-surface-elevated, #f8f9fa)` |
| `--hub-calendar-header-padding-x` | `var(--hub-ref-space-3, 1rem)`             |
| `--hub-calendar-header-padding-y` | `var(--hub-ref-space-3, 1rem)`             |
| `--hub-calendar-header-gap`       | `var(--hub-ref-space-3, 1rem)`             |

The header is three tracks — navigation, title, view switcher — with the two extremes
sharing the free space equally, so the title is centred on the calendar and not on the gap
its neighbours happen to leave. `--hub-calendar-header-gap` is the floor on the distance
between the title and either group. When the room runs out it is the button groups that
give, never the month: a group shrinks, and a button shortens its own label, before anything
is cut off by the calendar's edge.

Below `48rem` of calendar width the header stacks: the title takes a row of its own, still
centred, and the two groups take the next one, which wraps in turn so the view switcher can
never end up outside the calendar. The threshold is the **calendar's** width, asked with a
container query rather than a media query, because the component often sits in a column far
narrower than the window. The month and year are never clipped and never split — if they do
not fit beside the buttons, it is the row that breaks.

Both clusters are drawn as one joined control, input-group style: no gap between the
buttons, one shared border, and rounded corners only at the two ends — logical radii, so a
right-to-left calendar rounds the end the reader sees as last.

### Buttons

| Variable                           | Default                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `--hub-calendar-btn-bg`            | `var(--hub-ref-color-white, #ffffff)`                  |
| `--hub-calendar-btn-color`         | `inherit`                                              |
| `--hub-calendar-btn-border-color`  | `var(--hub-sys-border-color-default, #dee2e6)`         |
| `--hub-calendar-btn-border-radius` | `var(--hub-ref-radius-sm, 0.25rem)`                    |
| `--hub-calendar-btn-padding-x`     | `var(--hub-ref-space-3, 1rem)`                         |
| `--hub-calendar-btn-padding-y`     | `var(--hub-ref-space-2, 0.5rem)`                       |
| `--hub-calendar-btn-hover-bg`      | `var(--hub-sys-state-hover-bg, rgba(0, 0, 0, 0.075))`  |
| `--hub-calendar-btn-active-bg`     | `var(--hub-calendar-accent)`                           |
| `--hub-calendar-btn-active-color`  | `var(--hub-calendar-accent-on)`                        |
| `--hub-calendar-btn-transition`    | `var(--hub-sys-transition-base, all 0.2s ease-in-out)` |

### Day Cells

| Variable                               | Default                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `--hub-calendar-day-padding-x`         | `var(--hub-ref-space-1, 0.25rem)`                                                   |
| `--hub-calendar-day-padding-y`         | `var(--hub-ref-space-1, 0.25rem)`                                                   |
| `--hub-calendar-day-min-height`        | `80px`                                                                              |
| `--hub-calendar-day-hover-bg`          | `var(--hub-sys-state-hover-bg, rgba(0, 0, 0, 0.075))`                               |
| `--hub-calendar-day-today-bg`          | `color-mix(in oklch, var(--hub-calendar-accent) 8%, var(--hub-calendar-bg, #fff))`  |
| `--hub-calendar-day-other-month-bg`    | `var(--hub-sys-surface-elevated, #f8f9fa)`                                          |
| `--hub-calendar-day-other-month-color` | `var(--hub-sys-text-muted, #6c757d)`                                                |
| `--hub-calendar-day-weekend-bg`        | `var(--hub-sys-surface-elevated, #f8f9fa)`                                          |
| `--hub-calendar-day-selected-bg`       | `var(--hub-calendar-accent-subtle)`                                                 |
| `--hub-calendar-day-drag-over-bg`      | `color-mix(in oklch, var(--hub-calendar-accent) 32%, var(--hub-calendar-bg, #fff))` |

### Events

| Variable                               | Default                                |
| -------------------------------------- | -------------------------------------- |
| `--hub-calendar-event-bg`              | `var(--hub-calendar-accent)`           |
| `--hub-calendar-event-color`           | `var(--hub-calendar-accent-on)`        |
| `--hub-calendar-event-border-radius`   | `var(--hub-ref-radius-sm, 0.25rem)`    |
| `--hub-calendar-event-padding-x`       | `var(--hub-ref-space-2, 0.5rem)`       |
| `--hub-calendar-event-padding-y`       | `var(--hub-ref-space-1, 0.25rem)`      |
| `--hub-calendar-event-font-size`       | `var(--hub-ref-font-size-xs, 0.75rem)` |
| `--hub-calendar-event-gap`             | `var(--hub-ref-space-1, 0.25rem)`      |
| `--hub-calendar-event-padding-x-timed` | `var(--hub-ref-space-1, 0.25rem)`      |
| `--hub-calendar-event-time-font-size`  | `0.9em`                                |

The last three dress the month-view timed chip only. It is a row of dot, title and hour, laid
out the way Apple Calendar lays it out: the hour sits at the end of the chip in smaller,
muted type and never gives up its width, so when the room runs out the title is what is
clipped. It carries no filled background either, hence its own gap and horizontal padding.
`--hub-calendar-event-time-font-size` is relative (`em`) on purpose: raise the chip size and
the hour keeps its proportion instead of catching the title up.

The week and day views are deliberately untouched by that order. An event there is placed
against the hour ruler, so its position already states the time and repeating it inside the
chip would say the same thing twice; those chips are the title alone.

### Compact (mini-month)

Read only while the calendar carries `compact`. The defaults are an arithmetic rather than a
taste: six week rows at `2rem`, plus a weekday header row and a caption row, put a whole month
in roughly 250px — the size a dashboard card gives a calendar, and the size at which the
ordinary grid showed one week and scrolled the other five.

`--hub-calendar-day-marker-*` dress the dot a compact cell draws when its day holds events. The
dot takes the accent, so a `variant` marks the month in the colour the chips would have been.

| Variable                                   | Default                                 |
| ------------------------------------------ | --------------------------------------- |
| `--hub-calendar-compact-row-min-height`    | `2rem`                                  |
| `--hub-calendar-compact-padding`           | `var(--hub-ref-space-1, 0.25rem)`       |
| `--hub-calendar-compact-title-font-size`   | `var(--hub-ref-font-size-base, 1rem)`   |
| `--hub-calendar-compact-day-font-size`     | `var(--hub-ref-font-size-sm, 0.875rem)` |
| `--hub-calendar-compact-weekday-font-size` | `var(--hub-ref-font-size-xs, 0.75rem)`  |
| `--hub-calendar-day-marker-size`           | `0.3125rem`                             |
| `--hub-calendar-day-marker-color`          | `var(--hub-calendar-accent)`            |

### Week Numbers

Shown only when `config.showWeekNumbers` is on. The cells reuse `--hub-calendar-header-bg`,
`--hub-calendar-muted` and `--hub-calendar-border-color`; only the track width is its own token.

| Variable                           | Default |
| ---------------------------------- | ------- |
| `--hub-calendar-week-number-width` | `3rem`  |

### Week and Day Time Grids

The hour ruler, the all-day strip that sits above it, and the geometry of the events placed
against it. The strip is drawn whether or not the period holds an all-day event, so its label
stays put and the hour grid never jumps by a row; it shares the ruler's width so the label
lines up with the hours below it.

`--hub-calendar-hour-height` is the unit every timed event is measured in, not just the height
of a ruler row: change it and the bands move with the hours they name. `--hub-calendar-event-min-height`
is a floor on the drawn height, never on the duration — the top edge of a band always marks the
real start time. `--hub-calendar-event-gutter` is the gap between two events that overlap in
time and therefore share the column; set it to `0` to make them touch.

| Variable                            | Default  |
| ----------------------------------- | -------- |
| `--hub-calendar-time-column-width`  | `60px`   |
| `--hub-calendar-all-day-min-height` | `2.5rem` |
| `--hub-calendar-hour-height`        | `60px`   |
| `--hub-calendar-event-min-height`   | `1.5rem` |
| `--hub-calendar-event-gutter`       | `2px`    |

### Year View Month Cards

| Variable                              | Default                                               |
| ------------------------------------- | ----------------------------------------------------- |
| `--hub-calendar-month-card-bg`        | `var(--hub-sys-surface-elevated, #f8f9fa)`            |
| `--hub-calendar-month-card-hover-bg`  | `var(--hub-sys-state-hover-bg, rgba(0, 0, 0, 0.075))` |
| `--hub-calendar-month-card-padding-x` | `var(--hub-ref-space-4, 1.5rem)`                      |
| `--hub-calendar-month-card-padding-y` | `var(--hub-ref-space-4, 1.5rem)`                      |

### Written by the component, not by you

Three more `--hub-calendar-*` names appear in the stylesheet and are **not** hooks:
`--hub-calendar-grid-hours`, `--hub-calendar-event-offset` and `--hub-calendar-event-span`. The
component writes them per element as it lays the hour grid out — how many hours the ruler draws, and
where each timed event's band starts and ends. Setting them from a stylesheet does not theme
anything; it misplaces events. They are listed here only so that seeing one in the DOM does not read
as an undocumented knob.

---

## Customization Examples

### Framework-Agnostic

```scss
hub-calendar {
	--hub-calendar-bg: #ffffff;
	--hub-calendar-border-color: #d0d7de;
	--hub-calendar-btn-active-bg: #0d6efd;
	--hub-calendar-event-bg: #2563eb;
	--hub-calendar-day-today-bg: #e7f1ff;
}
```

### Bootstrap Integration (Optional)

```scss
hub-calendar {
	--hub-calendar-bg: var(--bs-body-bg);
	--hub-calendar-color: var(--bs-body-color);
	--hub-calendar-border-color: var(--bs-border-color);
	--hub-calendar-btn-active-bg: var(--bs-primary);
	--hub-calendar-event-bg: var(--bs-primary);
}
```

### Dense Calendar Layout

```scss
hub-calendar {
	--hub-calendar-header-padding-x: 0.75rem;
	--hub-calendar-header-padding-y: 0.75rem;
	--hub-calendar-day-min-height: 64px;
	--hub-calendar-day-padding-x: 0.125rem;
	--hub-calendar-day-padding-y: 0.125rem;
	--hub-calendar-event-font-size: 0.6875rem;
	--hub-calendar-month-card-padding-x: 1rem;
	--hub-calendar-month-card-padding-y: 1rem;
}
```

---

## Best Practices

- Prefer `--hub-calendar-*` tokens for calendar-specific theming.
- Override `--hub-sys-*` tokens when you want consistent theming across components.
- Keep Bootstrap tokens (`--bs-*`) as optional integration, not as required defaults.
- Use token overrides before using selector-level overrides.
