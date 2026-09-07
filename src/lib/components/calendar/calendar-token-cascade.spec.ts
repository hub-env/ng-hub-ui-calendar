import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubCalendarComponent } from './calendar.component';

/**
 * The one token the calendar DECLARES rather than reads. `--hub-calendar-accent-emphasis`
 * is a role nothing here paints with, declared so a consumer dressing the grid can read it;
 * it is derived on the host from the accent slot, so a `variant` recomputes it.
 *
 * `--hub-calendar-accent` is declared too, but only inside the per-variant blocks: a variant
 * is an explicit instruction on this calendar and is meant to outrank an application default.
 */
const DECLARED_UNCONDITIONALLY = ['--hub-calendar-accent-emphasis'];

/** One `selector { … }` rule of the stylesheet as the build injects it into the document. */
interface StyleRule {
	selector: string;
	body: string;
}

/**
 * The stylesheet the component actually ships, read back from the document. Going through
 * the DOM rather than the `.scss` source is the point: what decides the cascade is the CSS
 * that reaches the page, after the build has compiled it and the emulated-encapsulation
 * shim has rewritten `:host` and `:root` into attribute selectors.
 */
function shippedCss(): string {
	return Array.from(document.querySelectorAll('style'))
		.map((style) => style.textContent ?? '')
		.filter((text) => text.includes('hub-calendar'))
		.join('\n')
		.replace(/\/\*[\s\S]*?\*\//g, '');
}

function shippedRules(): StyleRule[] {
	const rules: StyleRule[] = [];
	// Nested at-rules (`@media`, `@keyframes`) are stepped over rather than parsed: their
	// wrapper never matches this pattern, and the rules inside them do.
	for (const match of shippedCss().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		rules.push({ selector: match[1].trim(), body: match[2] });
	}
	return rules;
}

describe('calendar token cascade', () => {
	let fixture: ComponentFixture<HubCalendarComponent>;
	let componentRef: ComponentRef<HubCalendarComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [HubCalendarComponent] }).compileComponents();

		fixture = TestBed.createComponent(HubCalendarComponent);
		componentRef = fixture.componentRef;
		fixture.detectChanges();
	});

	it('claims no token outside the variant blocks, so an application `:root` reaches the calendar', () => {
		// The variant rules are the deliberate exception, so they are excluded by selector
		// rather than by token: what is being pinned is that nothing else declares.
		const unconditional = shippedRules().filter((rule) => !rule.selector.includes('data-variant'));
		const declared = new Set(
			unconditional.flatMap((rule) => [...rule.body.matchAll(/(--hub-calendar-[a-z-]+)\s*:/g)].map((match) => match[1]))
		);

		// The component uses emulated encapsulation, so a `:root, :host` block is rewritten
		// into a `:root` half matching nothing and a `:host` half landing on the element
		// itself — and a declaration on the element beats any inherited value, whatever its
		// specificity. Every token declared here is one the application cannot change.
		expect([...declared].sort()).toEqual([...DECLARED_UNCONDITIONALLY].sort());
	});

	it('reads each token with its own default rather than a bare value', () => {
		const css = shippedCss();
		const read = new Set([...css.matchAll(/var\((--hub-calendar-[a-z-]+),/g)].map((match) => match[1]));

		// Every hook the calendar paints with, read with a fallback. The list is named because
		// the guarantee is per token: a count would still pass with the wrong ones missing.
		expect([...read]).toEqual(
			expect.arrayContaining([
				'--hub-calendar-bg',
				'--hub-calendar-color',
				'--hub-calendar-border-color',
				'--hub-calendar-border-radius',
				'--hub-calendar-font-family',
				'--hub-calendar-muted',
				'--hub-calendar-btn-transition',
				'--hub-calendar-accent',
				'--hub-calendar-accent-subtle',
				'--hub-calendar-accent-on',
				'--hub-calendar-primary',
				'--hub-calendar-header-bg',
				'--hub-calendar-header-padding-x',
				'--hub-calendar-header-padding-y',
				'--hub-calendar-btn-bg',
				'--hub-calendar-btn-color',
				'--hub-calendar-btn-border-color',
				'--hub-calendar-btn-border-radius',
				'--hub-calendar-btn-padding-x',
				'--hub-calendar-btn-padding-y',
				'--hub-calendar-btn-hover-bg',
				'--hub-calendar-btn-active-bg',
				'--hub-calendar-btn-active-color',
				'--hub-calendar-day-padding-x',
				'--hub-calendar-day-padding-y',
				'--hub-calendar-day-min-height',
				'--hub-calendar-day-hover-bg',
				'--hub-calendar-day-today-bg',
				'--hub-calendar-day-other-month-bg',
				'--hub-calendar-day-other-month-color',
				'--hub-calendar-day-weekend-bg',
				'--hub-calendar-day-selected-bg',
				'--hub-calendar-day-drag-over-bg',
				'--hub-calendar-event-bg',
				'--hub-calendar-event-color',
				'--hub-calendar-event-border-radius',
				'--hub-calendar-event-padding-x',
				'--hub-calendar-event-padding-y',
				'--hub-calendar-event-font-size',
				'--hub-calendar-month-card-bg',
				'--hub-calendar-month-card-hover-bg',
				'--hub-calendar-month-card-padding-x',
				'--hub-calendar-month-card-padding-y',
				'--hub-calendar-week-number-width',
				'--hub-calendar-time-column-width',
				'--hub-calendar-all-day-min-height'
			])
		);
	});

	it('keeps the design-system chain in the defaults it falls back to', () => {
		const css = shippedCss();

		// The defaults used to be declared as `--hub-calendar-bg: var(--hub-sys-surface-page, #fff)`
		// and read as a bare `var(--hub-calendar-bg)`. Moving them into the read has to carry the
		// sys token along, or an application that re-themes through the design system stops moving
		// the calendar with it.
		expect(css).toContain('var(--hub-calendar-bg, var(--hub-sys-surface-page, #ffffff))');
		expect(css).toContain('var(--hub-calendar-color, var(--hub-sys-text-primary, #212529))');
		expect(css).toContain('var(--hub-calendar-border-color, var(--hub-sys-border-color-default, #dee2e6))');
		expect(css).toContain('var(--hub-calendar-accent, var(--hub-sys-color-primary, #0d6efd))');
		expect(css).toContain('var(--hub-calendar-muted, var(--hub-sys-text-muted, #6c757d))');
	});

	it('derives the accent roles from the live slot rather than from a frozen copy', () => {
		const [selected] = shippedRules().filter((rule) => rule.selector.includes('.hub-calendar__day--selected'));

		// Read where it is painted: a consumer that re-bases only `--hub-calendar-accent`
		// gets a selected day, a today tint and chips that follow it, with no second
		// declaration to keep in step.
		expect(selected.body).toContain('var(--hub-calendar-day-selected-bg, var(--hub-calendar-accent-subtle,');
	});

	it('lets a `variant` still outrank an application-wide accent', () => {
		componentRef.setInput('variant', 'success');
		fixture.detectChanges();

		// Sass drops the quotes around the attribute value, so the selector is matched loosely.
		const variantRules = shippedRules().filter((rule) => /data-variant=['"]?success/.test(rule.selector));

		// The rule is wrapped in `:where()`, so it contributes no specificity of its own and
		// stays below anything more targeted the consumer writes — while still beating the
		// inherited `:root` value, because it declares on the element itself.
		expect(variantRules.length).toBe(1);
		expect(variantRules[0].selector).toContain(':where(');
		expect(variantRules[0].body).toContain('--hub-calendar-accent: var(--hub-sys-color-success)');
	});
});
