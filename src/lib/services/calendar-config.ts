import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { defaultHubCalendarFormats, HubCalendarFormats } from '../models/calendar-format';

/**
 * Application-wide defaults for `ng-hub-ui-calendar`.
 *
 * This is the calendar's counterpart of `HubFormsConfig`: settings an application states once and
 * every calendar inherits. It is **not** {@link CalendarConfig}, the `config` input, which is the
 * behaviour of one calendar — which views its switcher offers, where its hour ruler starts, whether
 * it draws week numbers. Formats are the kind of thing an application decides once; those are not.
 */
export interface HubCalendarConfig {
	/** Global date and time presentation formats. */
	formats: HubCalendarFormats;
}

/** Configuration used when {@link provideHubCalendar} is not called. */
export const defaultHubCalendarConfig: HubCalendarConfig = {
	formats: defaultHubCalendarFormats
};

/**
 * Injection token holding the resolved {@link HubCalendarConfig}.
 *
 * Falls back to {@link defaultHubCalendarConfig} when no provider is registered, so the library
 * works out of the box without bootstrapping — the same contract `HUB_FORMS_CONFIG` offers.
 */
export const HUB_CALENDAR_CONFIG = new InjectionToken<HubCalendarConfig>('HUB_CALENDAR_CONFIG', {
	providedIn: 'root',
	factory: () => defaultHubCalendarConfig
});

/**
 * Registers application-wide calendar defaults.
 *
 * @param config - Partial configuration; unspecified fields keep their defaults.
 * @returns Environment providers to add to `bootstrapApplication` (or a route's providers).
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [
 *     provideHubCalendar({
 *       formats: { hourFormat: '24', weekdayFormat: 'narrow' }
 *     })
 *   ]
 * });
 * ```
 */
export function provideHubCalendar(config?: HubCalendarConfigOverride): EnvironmentProviders {
	const formats: HubCalendarFormats = {
		...defaultHubCalendarConfig.formats,
		...config?.formats
	};

	return makeEnvironmentProviders([
		{
			provide: HUB_CALENDAR_CONFIG,
			useValue: { ...defaultHubCalendarConfig, ...config, formats } as HubCalendarConfig
		}
	]);
}

/** A {@link HubCalendarConfig} with every section and every field optional. */
export interface HubCalendarConfigOverride {
	formats?: Partial<HubCalendarFormats>;
}
