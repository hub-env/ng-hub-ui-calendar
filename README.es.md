# ng-hub-ui-calendar

**Español** | [English](./README.md)

[![npm version](https://img.shields.io/npm/v/ng-hub-ui-calendar.svg)](https://www.npmjs.com/package/ng-hub-ui-calendar)
[![license](https://img.shields.io/npm/l/ng-hub-ui-calendar.svg)](https://github.com/hub-env/ng-hub-ui-calendar/blob/main/LICENSE)

> **⚠️ CRÍTICO (RELEASE MAYOR):** La versión 21.0.0 introduce cambios arquitectónicos en la definición de variables SCSS, refactorizándolas a la convención estándar (`--hub-calendar-*`). Por favor, lea [BREAKING_CHANGES.md](./BREAKING_CHANGES.md) antes de actualizar.

Un componente de calendario potente y flexible para aplicaciones Angular con múltiples vistas, funcionalidad de arrastrar y soltar nativa, plantillas personalizadas y soporte completo de internacionalización.

## Documentación y ejemplos en vivo

Este paquete forma parte de [Hub UI](https://hubui.dev/en/), una colección de bibliotecas de componentes Angular para aplicaciones standalone.

- Documentación: https://hubui.dev/en/calendar/overview/
- Ejemplos en vivo: https://hubui.dev/en/calendar/examples/
- Hub UI: https://hubui.dev/en/
- Hub UI en GitHub (incidencias, roadmap y cómo contribuir): https://github.com/hub-env/hub-ui

## 🧩 Familia de librerías `ng-hub-ui`

Esta librería es parte del ecosistema **Hub UI**:

- [**ng-hub-ui-accordion**](https://www.npmjs.com/package/ng-hub-ui-accordion) (obsoleto — usa ng-hub-ui-panels)
- [**ng-hub-ui-action-sheet**](https://www.npmjs.com/package/ng-hub-ui-action-sheet)
- [**ng-hub-ui-avatar**](https://www.npmjs.com/package/ng-hub-ui-avatar)
- [**ng-hub-ui-board**](https://www.npmjs.com/package/ng-hub-ui-board)
- [**ng-hub-ui-breadcrumbs**](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [**ng-hub-ui-calendar**](https://www.npmjs.com/package/ng-hub-ui-calendar) ← Estás aquí
- [**ng-hub-ui-dropdown**](https://www.npmjs.com/package/ng-hub-ui-dropdown)
- [**ng-hub-ui-ds**](https://www.npmjs.com/package/ng-hub-ui-ds)
- [**ng-hub-ui-forms**](https://www.npmjs.com/package/ng-hub-ui-forms)
- [**ng-hub-ui-history**](https://www.npmjs.com/package/ng-hub-ui-history)
- [**ng-hub-ui-milestones**](https://www.npmjs.com/package/ng-hub-ui-milestones)
- [**ng-hub-ui-modal**](https://www.npmjs.com/package/ng-hub-ui-modal)
- [**ng-hub-ui-nav**](https://www.npmjs.com/package/ng-hub-ui-nav)
- [**ng-hub-ui-paginable**](https://www.npmjs.com/package/ng-hub-ui-paginable)
- [**ng-hub-ui-panels**](https://www.npmjs.com/package/ng-hub-ui-panels)
- [**ng-hub-ui-portal**](https://www.npmjs.com/package/ng-hub-ui-portal)
- [**ng-hub-ui-skeleton**](https://www.npmjs.com/package/ng-hub-ui-skeleton)
- [**ng-hub-ui-sortable**](https://www.npmjs.com/package/ng-hub-ui-sortable)
- [**ng-hub-ui-stepper**](https://www.npmjs.com/package/ng-hub-ui-stepper)
- [**ng-hub-ui-utils**](https://www.npmjs.com/package/ng-hub-ui-utils)

## 📑 Tabla de Contenidos

- [Características](#-características)
- [Instalación](#-instalación)
- [Inicio Rápido](#-inicio-rápido)
- [Ejemplos](#-ejemplos)
    - [Calendario Básico](#calendario-básico)
    - [Tipos de Vista](#tipos-de-vista)
    - [Plantillas Personalizadas](#plantillas-personalizadas)
    - [Arrastrar y Soltar](#arrastrar-y-soltar)
    - [Configuración](#configuración)
    - [Internacionalización](#internacionalización)
    - [Manejo de Eventos](#manejo-de-eventos)
- [Referencia de la API](#-referencia-de-la-api)
- [Accesibilidad](#-accesibilidad)
- [Estilos](#-estilos)
- [Soporte y Licencia](#-soporte-y-licencia)

## ✨ Características

- **Múltiples Tipos de Vista**: Vistas de Mes, Semana, Día y Año
- **Mini-mes compacto**: `compact` dibuja un mes entero en unos 250px — sin barra de herramientas, con las iniciales de los días según el idioma y un punto en cada día con eventos
- **Números de Semana**: columna opcional al inicio de la vista de mes (`config.showWeekNumbers`), numerada desde el primer día de semana configurado
- **Eventos de Todo el Día**: los eventos con `allDay` tienen una franja propia y rotulada encima de la rejilla de horas en las vistas de semana y día; en la vista de mes el contraste se invierte — los eventos con hora la muestran detrás de un punto de color y los de todo el día conservan la barra rellena
- **Eventos con Hora sobre la Rejilla**: en las vistas de semana y día un evento con hora ocupa la banda que le marca su propio reloj — el borde superior sigue a `start` y la altura a la duración — y los que se solapan se reparten el ancho de la columna en bandas iguales una al lado de otra
- **Arrastrar y Soltar Nativo**: Reprograma eventos arrastrándolos a diferentes días
- **Plantillas Personalizadas**: Control total sobre la renderización de eventos y celdas de día
- **Internacionalización**: Inglés y Español integrados, extensible para cualquier idioma
- **Variables CSS**: Personalización completa de estilos a través de propiedades personalizadas CSS
- **TypeScript**: Definiciones de tipos completas con CalendarViewType enum
- **Componentes Standalone**: Funciona con la arquitectura standalone moderna de Angular
- **Accesible**: Cuadrícula de mes WAI-ARIA con navegación completa por teclado y controles etiquetados
- **Ligero**: Sin dependencias externas (arrastrar y soltar nativo de HTML5)

## 📦 Instalación

```bash
npm install ng-hub-ui-calendar ng-hub-ui-utils
```

`ng-hub-ui-ds` es una peer dependency **opcional** (`>=22.0.0`). Instálala para dar al calendario la paleta compartida de tokens `--hub-sys-*` y el modo oscuro; sin ella cada lectura de token cae en su valor por defecto y el calendario se dibuja igual.

## 🚀 Inicio Rápido

```typescript
import { Component, signal } from '@angular/core';
import { HubCalendarComponent, CalendarDay, CalendarEvent, CalendarViewType } from 'ng-hub-ui-calendar';

@Component({
	selector: 'app-calendar-demo',
	standalone: true,
	imports: [HubCalendarComponent],
	template: `
		<hub-calendar [events]="events()" [view]="view()" (eventClick)="onEventClick($event)" (dayClick)="onDayClick($event)">
		</hub-calendar>
	`
})
export class CalendarDemoComponent {
	view = signal<CalendarViewType>(CalendarViewType.MONTH);

	events = signal<CalendarEvent[]>([
		{
			id: '1',
			title: 'Reunión de Equipo',
			start: new Date(),
			end: new Date(Date.now() + 2 * 60 * 60 * 1000)
		}
	]);

	onEventClick(event: CalendarEvent): void {
		console.log('Evento clickeado:', event);
	}

	onDayClick(day: CalendarDay): void {
		console.log('Día clickeado:', day);
	}
}
```

## 📚 Ejemplos

### Calendario Básico

```typescript
import { HubCalendarComponent, CalendarEvent } from 'ng-hub-ui-calendar';

@Component({
	standalone: true,
	imports: [HubCalendarComponent],
	template: `<hub-calendar [events]="events()"></hub-calendar>`
})
export class BasicCalendarComponent {
	events = signal<CalendarEvent[]>([
		{ id: '1', title: 'Reunión', start: new Date() },
		{ id: '2', title: 'Almuerzo', start: new Date(), allDay: true }
	]);
}
```

### Tipos de Vista

```typescript
import { CalendarViewType } from 'ng-hub-ui-calendar';

@Component({
	template: `
		<hub-calendar [events]="events()" [view]="currentView()" (viewChange)="currentView.set($event)"> </hub-calendar>

		<div class="controls">
			<button (click)="currentView.set(CalendarViewType.MONTH)">Mes</button>
			<button (click)="currentView.set(CalendarViewType.WEEK)">Semana</button>
			<button (click)="currentView.set(CalendarViewType.DAY)">Día</button>
			<button (click)="currentView.set(CalendarViewType.YEAR)">Año</button>
		</div>
	`
})
export class ViewTypesComponent {
	CalendarViewType = CalendarViewType;
	currentView = signal<CalendarViewType>(CalendarViewType.MONTH);
}
```

### Plantillas Personalizadas

```typescript
import {
	HubCalendarComponent,
	HubCalendarEventTemplateDirective,
	HubCalendarDayCellTemplateDirective
} from 'ng-hub-ui-calendar';

@Component({
	standalone: true,
	imports: [HubCalendarComponent, HubCalendarEventTemplateDirective, HubCalendarDayCellTemplateDirective],
	template: `
		<hub-calendar [events]="events()">
			<!-- Plantilla de Evento Personalizada -->
			<ng-template eventTpt let-event="event">
				<div class="custom-event" [class.important]="event.data?.important">
					<span class="icon">{{ event.data?.important ? '⭐' : '📅' }}</span>
					<span>{{ event.title }}</span>
				</div>
			</ng-template>

			<!-- Plantilla de Celda de Día Personalizada -->
			<ng-template dayCellTpt let-day="day">
				<div class="custom-day">
					<span class="day-number">{{ day.date | date: 'd' }}</span>
					@if (day.events.length > 0) {
						<span class="badge">{{ day.events.length }}</span>
					}
				</div>
			</ng-template>
		</hub-calendar>
	`
})
export class CustomTemplatesComponent {
	events = signal<CalendarEvent<{ important: boolean }>[]>([
		{ id: '1', title: 'Reunión VIP', start: new Date(), data: { important: true } },
		{ id: '2', title: 'Tarea Regular', start: new Date(), data: { important: false } }
	]);
}
```

### Arrastrar y Soltar

```typescript
@Component({
	template: `
		<hub-calendar [events]="events()" [config]="{ dragAndDropEnabled: true }" (eventDrop)="onEventDrop($event)">
		</hub-calendar>
	`
})
export class DragDropComponent {
	events = signal<CalendarEvent[]>([{ id: '1', title: 'Evento Movible', start: new Date() }]);

	onEventDrop(event: { event: CalendarEvent; newDate: Date; previousDate: Date }): void {
		console.log(`Moved "${event.event.title}" from ${event.previousDate} to ${event.newDate}`);

		// Actualiza el evento en tus datos
		this.events.update((events) => events.map((e) => (e.id === event.event.id ? { ...e, start: event.newDate } : e)));
	}
}
```

### Configuración

```typescript
import { CalendarConfig, CalendarViewType } from 'ng-hub-ui-calendar';

@Component({
	template: ` <hub-calendar [events]="events()" [config]="calendarConfig"> </hub-calendar> `
})
export class ConfigurationComponent {
	calendarConfig: CalendarConfig = {
		weekStartsOn: 1, // Lunes
		showWeekNumbers: true,
		dayStartHour: 8,
		dayEndHour: 18,
		availableViews: [CalendarViewType.MONTH, CalendarViewType.WEEK, CalendarViewType.DAY],
		dragAndDropEnabled: true
	};
}
```

### Internacionalización

```typescript
// Usando traducciones integradas
@Component({
	template: ` <hub-calendar [events]="events()" [locale]="'es'"> </hub-calendar> `
})
export class I18nComponent {}

// Con HubTranslationService
// Añade traducciones del calendario a tus archivos i18n bajo HUBUI.CALENDAR:
// {
//   "HUBUI": {
//     "CALENDAR": {
//       "weekdays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
//       "weekdaysFull": ["Sunday", "Monday", ...],
//       "months": ["January", "February", ...],
//       "monthsShort": ["Jan", "Feb", ...],
//       "today": "Today",
//       "previous": "Previous",
//       "next": "Next",
//       "month": "Month", "week": "Week", "day": "Day", "year": "Year",
//       "allDay": "All day",
//       "weekAbbr": "Wk",
//       "weekNumberLabel": "Week {count}",
//       "moreEvents": "+{count} more",
//       "eventCount": "{count} events"
//     }
//   }
// }
```

#### Transloco y ngx-translate

Calendar lee su diccionario desde `HubTranslationService`: busca primero bajo `HUBUI.CALENDAR.*` y recurre a la rama heredada `calendar.*` de nivel superior (desde 22.6.0). Usa preferentemente `HUBUI.CALENDAR.*`, porque así el calendario no reserva una clave `calendar` de nivel superior en el diccionario de la aplicación. Configura `provideHubTranslationAdapter()` una sola vez en `app.config.ts` con el diccionario activo completo y vincula el idioma activo a `locale`. Calendar se vuelve a renderizar cuando el proveedor emite.

```typescript
// La fuente del adaptador emite { HUBUI: { CALENDAR: { ... } } } al cambiar el idioma externo.
// Un diccionario con la forma { calendar: { ... } } sigue funcionando como respaldo.
// Actualiza también [locale] con el código del idioma activo.
```

### Manejo de Eventos

```typescript
@Component({
	template: `
		<hub-calendar
			[events]="events()"
			[(view)]="currentView"
			[(selectedDate)]="selectedDate"
			(eventClick)="onEventClick($event)"
			(dayClick)="onDayClick($event)"
			(eventDrop)="onEventDrop($event)"
			(viewChange)="onViewChange($event)"
			(dateChange)="onDateChange($event)"
		>
		</hub-calendar>
	`
})
export class EventHandlingComponent {
	currentView = signal<CalendarViewType>(CalendarViewType.MONTH);
	selectedDate = signal<Date>(new Date());

	onEventClick(event: CalendarEvent): void {
		// Abrir modal de detalles del evento
	}

	onDayClick(day: CalendarDay): void {
		// Crear nuevo evento en este día
	}

	onEventDrop(data: { event: CalendarEvent; newDate: Date; previousDate: Date }): void {
		// Actualizar fecha del evento en el backend
	}

	onViewChange(view: CalendarViewType): void {
		// Seguir analíticas de vista
	}

	onDateChange(date: Date): void {
		// Cargar eventos para el nuevo rango de fechas
	}
}
```

## 📖 Referencia de la API

### Inputs

| Input               | Tipo                                                               | Por Defecto                              | Descripción                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `events`            | `CalendarEvent[]`                                                  | `[]`                                     | Eventos a mostrar en el calendario                                                                                                                           |
| `view`              | `CalendarViewType`                                                 | `MONTH`                                  | Tipo de vista actual (enlazable en dos direcciones)                                                                                                          |
| `selectedDate`      | `Date`                                                             | `new Date()`                             | Fecha seleccionada/foco (enlazable en dos direcciones)                                                                                                       |
| `config`            | `CalendarConfig`                                                   | `{}`                                     | Opciones de configuración                                                                                                                                    |
| `eventClass`        | `string \| Function`                                               | -                                        | Clase(s) CSS para eventos                                                                                                                                    |
| `weekStartsOn`      | `0-6`                                                              | `config.weekStartsOn`                    | Día en que comienza la semana (0=Domingo); prevalece sobre `config.weekStartsOn` cuando se indica                                                            |
| `locale`            | `string`                                                           | `'en'`                                   | Código de idioma para traducciones                                                                                                                           |
| `variant`           | `string`                                                           | `'primary'`                              | Acento semántico: `primary` / `secondary` / `success` / `danger` / `warning` / `info` / `neutral` / `light` / `dark`, o cualquier nombre `--hub-sys-color-*` |
| `height`            | `number \| string`                                                 | -                                        | Alto del calendario: un número en píxeles, cualquier longitud CSS o `auto` para crecer en lugar de desplazarse. Sin valor, ocupa su contenedor               |
| `compact`           | `boolean`                                                          | `false`                                  | Mini-mes: sin barra de herramientas, iniciales del idioma como cabeceras, un punto en vez de chips, el mes entero en unos 250px                              |
| `displayFormat`     | `Intl.DateTimeFormatOptions \| string \| ((date: Date) => string)` | -                                        | Cómo escribe el título de la cabecera el mes y el año. La vista de año conserva su año                                                                       |
| `timeDisplayFormat` | `Intl.DateTimeFormatOptions`                                       | `{ hour: 'numeric', minute: '2-digit' }` | Reloj de los tooltips del chip y del día, compuesto con `hourFormat`                                                                                         |
| `eventTimeFormat`   | `Intl.DateTimeFormatOptions \| string \| ((date: Date) => string)` | -                                        | Hora que imprime un chip de mes; sin valor conserva la abreviatura (`9 AM`)                                                                                  |
| `slotLabelFormat`   | `Intl.DateTimeFormatOptions \| string \| ((date: Date) => string)` | -                                        | Etiquetas de la regla de horas de las vistas de semana y día                                                                                                 |
| `hourFormat`        | `'12' \| '24'`                                                     | -                                        | Fuerza el reloj en todas partes; sin valor decide el idioma                                                                                                  |
| `weekdayFormat`     | `'short' \| 'narrow' \| 'long'`                                    | `'short'`                                | Ancho de las cabeceras de días de la semana                                                                                                                  |
| `monthFormat`       | `'short' \| 'long'`                                                | `'long'`                                 | Cómo se escribe el mes en la cabecera y en las tarjetas de año                                                                                               |

### Cómo fijar el alto del calendario

`[height]` es la forma admitida de darle un tamaño, y existe porque la vía del CSS es una trampa.
Dimensionarlo desde una hoja de estilos exige un selector de elemento sobre `hub-calendar`; uno de
esos con ámbito gana a la propia regla `:host` del componente, y el `display: block` que tan
naturalmente acompaña a un alto desmonta la columna flex sobre la que se apoya el desplazamiento
interno: la rejilla de horas crece entonces hasta el día entero en vez de desplazarse dentro del
calendario.

```html
<hub-calendar [events]="events()" [height]="600" />
<!-- vale cualquier longitud CSS, y `auto` crece con el contenido y no desplaza nada -->
<hub-calendar [events]="events()" height="auto" />
<hub-calendar [events]="events()" [height]="'60vh'" />
```

Con un alto fijado, el desplazamiento cae donde debe: en la rejilla de horas en las vistas de semana
y día, con la cabecera de días y la franja de todo el día quietas, y en la parrilla en la vista de
mes, bajo una fila de días de la semana anclada a su parte superior. Sin valor, el calendario ocupa
su contenedor igual que antes.

Para dimensionar de una vez todos los calendarios de una aplicación, declara `--hub-calendar-height`
en `:root`; un `[height]` en una instancia concreta sigue prevaleciendo.

### El mini-mes compacto

Fijar el alto no basta para que un calendario quepa. Una celda de día pide 80px y una fila de semana
100px se le diga lo que se le diga, así que seis filas cuestan seiscientos píxeles antes de dibujar
una sola fecha — por eso un calendario al que se le daban 260px en una tarjeta de panel mostraba la
primera semana y desplazaba el resto, con la barra de herramientas gastándose la mitad de lo que
quedaba.

`compact` es la variante que cabe. Quita la barra, elimina los dos mínimos, reduce las cabeceras a las
iniciales del propio idioma y cambia los chips por un punto, porque en una celda de ese tamaño no cabe
más que un número. El rótulo del mes se queda: es lo único sin lo que una rejilla de mes no se puede
leer.

```html
<hub-calendar compact [events]="deadlines()" [height]="250" />
```

La rejilla son seis filas en todos los meses, como siempre, así que no da saltos al pasar de mes. La
navegación sigue siendo tuya — las flechas desaparecen, pero `previous()`, `next()` y `goToToday()`
son métodos públicos y tu propio interfaz puede llamarlos:

```html
<button type="button" (click)="cal.previous()">‹</button>
<hub-calendar #cal compact [events]="deadlines()" [(selectedDate)]="month" />
<button type="button" (click)="cal.next()">›</button>
```

Las iniciales salen de `Intl`, no de recortar un nombre traducido: en español ese recorte da **M**
tanto para martes como para miércoles, y la respuesta del idioma es **M** y **X**. Un `weekdayFormat`
explícito sigue mandando — el estrechamiento es un valor por defecto, no una imposición.

Un día con eventos lleva un punto, leído del mismo input `events` que leen los chips, así que cambiar
la lista vuelve a marcar el mes. El punto queda oculto para los lectores de pantalla; en su lugar, el
recuento se añade al nombre accesible de la celda, donde puede leerse con palabras.

`compact` es una variante, no un reemplazo: déjalo sin poner y cada píxel del calendario sigue donde
ha estado siempre.

### Un calendario estrecho apila su cabecera

La cabecera se reparte en tres pistas —navegación, título y conmutador de vistas— con los dos extremos
compartiendo por igual el hueco libre, así que el mes queda centrado respecto al calendario y no
respecto al hueco que le dejan sus vecinos. Por debajo de **48rem de ancho de calendario** los tres ya
no caben en una fila y la cabecera se apila: el título ocupa una fila propia, centrado igual, y los dos
grupos de botones ocupan la siguiente. Esa fila envuelve a su vez, de modo que un conmutador de cuatro
vistas que no quepa junto a la navegación baja por debajo en lugar de salirse por el borde del
calendario, y un botón acorta su propia etiqueta antes de que nada quede cortado. El mes y el año no se
recortan ni se parten nunca.

El punto de cambio lo decide el ancho del **calendario**, no el de la ventana: se consulta con una
container query, porque este componente vive a menudo en una columna mucho más estrecha que el viewport.
Por eso el calendario se declara contenedor de tamaño en línea: toma su ancho del contenedor igual que
siempre, así que si lo colocas donde el ancho lo decide el contenido, dale uno.

### Formatos de fecha y hora

Todo lo que el calendario escribe —fechas y horas— es una opción, y **cada valor por defecto es lo
que el calendario ha dibujado siempre**: no cambia nada hasta que lo pides.

El vocabulario es deliberadamente el de `<hub-datepicker>`: los mismos nombres, los mismos tipos y
el mismo orden de resolución (entrada de la instancia → configuración de la aplicación → valor
interno), para que quien use los dos no tenga que aprender dos nombres para una misma idea. Cada
formato se expresa de las tres maneras que admite el datepicker: opciones de `Intl`, un patrón de
fecha de Angular o una función.

| Eje                 | Qué escribe                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| `displayFormat`     | el título de la cabecera; la vista de año, cuyo título nombra un año, se queda igual |
| `timeDisplayFormat` | el reloj de los tooltips del chip y del día                                          |
| `eventTimeFormat`   | la hora que un chip de la vista de mes imprime delante de un evento con hora         |
| `slotLabelFormat`   | las etiquetas de la regla de horas de las vistas de semana y día                     |
| `weekdayFormat`     | las cabeceras de los días de la semana                                               |
| `monthFormat`       | el mes en el título de la cabecera y en las tarjetas de la vista de año              |
| `hourFormat`        | 12 o 24 horas, para **todos** los relojes anteriores a la vez                        |

```html
<hub-calendar
	[events]="events()"
	hourFormat="24"
	slotLabelFormat="HH:mm"
	[displayFormat]="{ year: 'numeric', month: 'long' }"
	weekdayFormat="narrow"
/>
```

Dejar `hourFormat` sin valor significa _lo que diga el idioma del lector_ —el mismo significado que
tiene en el datepicker, y la respuesta a si un tooltip debe decir `9:00` o `9:00 AM`—.

Dos de los ejes del datepicker faltan a propósito. `parse` y `valueFormat` describen texto que entra
y texto que sale, y este componente habla `Date` en todos sus bordes: `CalendarEvent.start` y `end`
son `Date`, y `eventClick`, `dayClick`, `eventDrop`, `dateChange`, `view` y `selectedDate` emiten
`Date` u objetos que lo llevan. No hay nada que parsear ni nada que serializar. `rangeSeparator`
falta por lo mismo: el calendario nunca escribe un rango como texto.

Un chip de mes abrevia la hora en punto a `9 AM` por defecto y los tooltips la escriben entera. No
es una incoherencia que haya que zanjar: la celda mide poco más de cien píxeles y la hora la comparte
con una bolita y un título, mientras que una línea de tooltip tiene todo el sitio que necesita.
`eventTimeFormat` cambia lo primero sin tocar lo segundo.

Los nombres accesibles se quedan fuera de todo esto: la etiqueta de la rejilla del mes y los nombres
de las columnas de días se escriben enteros diga lo que diga `monthFormat` o `weekdayFormat`, porque
una abreviatura sirve para ahorrar sitio en pantalla y un nombre que se lee en voz alta no tiene
sitio que ahorrar.

### Configuración global

Declara los formatos una vez y todos los calendarios de la aplicación los heredan: es el equivalente
de `provideHubForms()` para `<hub-datepicker>`, con la misma forma.

```ts
bootstrapApplication(App, {
	providers: [provideHubCalendar({ formats: { hourFormat: '24', weekdayFormat: 'narrow' } })]
});
```

Una instancia que diga otra cosa sigue prevaleciendo, y los ejes que no nombres conservan sus
valores internos. No hay que arrancar nada para que la librería funcione: `HUB_CALENDAR_CONFIG` cae
a esos valores por su cuenta.

> `provideHubCalendar()` es **presentación** para toda la aplicación; la entrada `config` es el
> **comportamiento** de un calendario —qué vistas ofrece su conmutador, dónde empieza su regla de
> horas, si dibuja números de semana—. Son preguntas distintas y siguen separadas.

### Outputs

| Output               | Tipo                               | Descripción                                                              |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `eventClick`         | `CalendarEvent`                    | Emitido cuando se hace clic en un evento                                 |
| `dayClick`           | `CalendarDay`                      | Emitido cuando se hace clic en una celda de día                          |
| `eventDrop`          | `{ event, newDate, previousDate }` | Emitido cuando se suelta un evento en otro día                           |
| `viewChange`         | `CalendarViewType`                 | Emitido cuando cambia el tipo de vista — la mitad `[(view)]` del `model` |
| `selectedDateChange` | `Date`                             | Emitido cuando cambia el día seleccionado — la mitad `[(selectedDate)]`  |
| `dateChange`         | `Date`                             | Emitido cuando la navegación cambia el periodo mostrado                  |

### Interfaces

```typescript
interface CalendarEvent<T = any> {
	id?: number | string;
	title: string;
	description?: string;
	start: Date;
	end?: Date;
	allDay?: boolean;
	cssClass?: string | ((event: CalendarEvent<T>) => string);
	data?: T;
}

interface CalendarDay<T = any> {
	date: Date;
	events: CalendarEvent<T>[];
	isToday: boolean;
	isCurrentMonth: boolean;
	isWeekend: boolean;
	isSelected?: boolean;
}

// Geometría de un evento con hora sobre la rejilla de semana/día, tal como la devuelve
// getTimedEventPlacements(day). offset/span van en horas desde el inicio de la regla,
// left/right en porcentaje de la columna del día.
interface CalendarEventPlacement<T = any> {
	event: CalendarEvent<T>;
	offset: number;
	span: number;
	left: number;
	right: number;
}

interface CalendarWeek<T = any> {
	days: CalendarDay<T>[];
	weekNumber?: number; // siempre relleno; config.showWeekNumbers solo decide si se dibuja
}

// Forma de cada entrada de la señal pública `months` del calendario (vista de año).
interface CalendarMonth {
	date: Date;
	name: string;
	shortName: string; // sale de la entrada monthsShort del diccionario
	eventCount: number;
}

enum CalendarViewType {
	MONTH = 'month',
	WEEK = 'week',
	DAY = 'day',
	YEAR = 'year'
}

interface CalendarConfig {
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	showWeekNumbers?: boolean;
	dayStartHour?: number;
	dayEndHour?: number;
	availableViews?: CalendarViewType[];
	dragAndDropEnabled?: boolean;
}
```

## ♿ Accesibilidad

- **Cuadrícula de mes ARIA**: la vista de mes es un `role="grid"` etiquetado (nombre accesible = el mes/año visible, localizado) con semántica `role="row"` / `role="columnheader"` / `role="gridcell"`, `aria-selected` en el día seleccionado, `aria-current="date"` en el día de hoy y un `aria-label` de fecha completa localizado por celda.
- **Las celdas compactas dicen lo que muestra el punto**: el marcador de eventos es `aria-hidden`, así que un día compacto añade su recuento de eventos localizado al nombre accesible de la celda — la única vía que sobrevive a la linealización.
- **Tabindex itinerante — la selección sigue al foco**: el día seleccionado es la única celda tabulable, de modo que mover el foco con el teclado también mueve la selección, en línea con el modelo de navegación anterior/siguiente de la cabecera.
- **Navegación por teclado**: las flechas mueven por día/semana, `Home`/`End` saltan al inicio/fin de la semana, `PageUp`/`PageDown` van al mismo día del mes anterior/siguiente (ajustado al mes destino, emitiendo `dateChange`) y `Enter`/`Space` activan el día exactamente como un clic (`dayClick`).
- **Controles reales**: los chips de evento (vistas de mes/semana/día) y las tarjetas de mes de la vista de año son botones activables por teclado (`role="button"`, `tabindex="0"`, `Enter`/`Space`); los botones anterior/siguiente de la cabecera, que solo muestran un icono, llevan `aria-label`s localizados y el conmutador de vistas expone `aria-pressed`.
- **Números de semana**: cada celda de número de semana es un `role="rowheader"` anunciado como «Semana 27» (localizado), porque el número a secas no dice qué está contando; la cabecera de la columna lleva la palabra completa en su `aria-label`.
- **Eventos de todo el día**: el chip de un evento de todo el día añade la etiqueta «todo el día» localizada a su nombre accesible. Quien ve la pantalla distingue el evento por la franja en la que está, o por la hora que no lleva delante, y ninguna de las dos cosas sobrevive a la linealización.
- **Arrastrar y soltar solo con puntero**: reprogramar eventos mediante arrastrar y soltar todavía no tiene equivalente de teclado.

## 🎨 Estilos

Catálogo completo de variables CSS:

- [`./docs/css-variables-reference.md`](./docs/css-variables-reference.md)

### Dónde escribir la sobrescritura

**En cualquier sitio por encima del calendario.** Cada token `--hub-calendar-*` se lee donde se pinta,
como `var(--token, <por defecto>)`, y ninguno se declara sobre el elemento `<hub-calendar>`: un valor
puesto en `:root`, en un contenedor, en `hub-calendar` o en `.hub-calendar` llega a la rejilla, y gana
el más cercano, como decide CSS de ordinario. Antes de la 22.7.0 la familia se declaraba en el propio
host, y una declaración sobre un elemento gana a cualquier valor heredado de un ancestro: las reglas
que aparecen aquí abajo estaban escritas y no hacían nada. Véase `BREAKING_CHANGES.md`.

La excepción es `variant`, que declara `--hub-calendar-accent` sobre el elemento a propósito — pedir
una variante es una instrucción sobre ese calendario en concreto. Va envuelta en `:where()`, así que
una regla tuya que apunte al calendario con más precisión sigue ganando.

### Acento Semántico

El input `variant` re-basa un único token de acento, `--hub-calendar-accent`, que controla el día de hoy / día seleccionado, el botón de vista activo y las píldoras de eventos. Los nueve valores integrados (`primary` / `secondary` / `success` / `danger` / `warning` / `info` / `neutral` / `light` / `dark`) se asignan a las familias de color del sistema de diseño desde la hoja de estilos de la librería, de modo que una regla propia puede re-apuntar cualquiera de ellos; cualquier otra cadena se lee en línea como `--hub-sys-color-<variant>`.

```html
<hub-calendar variant="success" [events]="events()"></hub-calendar>
```

Dos tokens de acento respaldan este comportamiento:

| Variable                       | Por Defecto                                                                              | Descripción                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `--hub-calendar-accent`        | `var(--hub-sys-color-primary, #0d6efd)`                                                  | Acento base (botón activo, píldoras de eventos) |
| `--hub-calendar-accent-subtle` | `color-mix(in oklch, var(--hub-calendar-accent) 12%, var(--hub-sys-surface-page, #fff))` | Acento sutil (fondo del día seleccionado)       |

### Mixin Sass `hub-calendar-theme()`

Tematiza un calendario en una sola llamada. Todos los parámetros son opcionales y por defecto valen `null`, por lo que solo se emiten como overrides `--hub-calendar-*` los que pases. Basado en tokens, sin dependencia de Bootstrap.

```scss
@use 'ng-hub-ui-calendar/styles/mixins/calendar-theme' as *;

.planner {
	@include hub-calendar-theme($accent: var(--hub-sys-color-info), $day-min-height: 110px, $event-border-radius: 999px);
}
```

Ejemplo agnóstico de framework:

```scss
hub-calendar {
	--hub-calendar-bg: #ffffff;
	--hub-calendar-border-color: #d0d7de;
	--hub-calendar-btn-active-bg: #0d6efd;
	--hub-calendar-event-bg: #2563eb;
}
```

Ejemplo de integración Bootstrap (opcional):

```scss
hub-calendar {
	--hub-calendar-bg: var(--bs-body-bg);
	--hub-calendar-color: var(--bs-body-color);
	--hub-calendar-border-color: var(--bs-border-color);
	--hub-calendar-btn-active-bg: var(--bs-primary);
}
```

## 💼 Soporte comercial

Mantengo estas librerías yo mismo: soy [Carlos Morcillo Fernández](https://www.carlosmorcillo.com), arquitecto frontend autónomo, y trabajo con equipos que construyen y mantienen aplicaciones Angular.

Si tu equipo depende de Hub-UI y necesita más de lo que se resuelve en un hilo de incidencias, eso es a lo que me dedico: auditorías de arquitectura, sistemas de diseño, migraciones de Angular y mentoría de equipos. Cuando el proyecto pide además diseño y un equipo completo, lo llevo por [Frog Hub](https://froghub.es), mi estudio de desarrollo.

Aquí están [los servicios](https://www.carlosmorcillo.com/servicios/) y aquí puedes [contarme tu proyecto](https://www.carlosmorcillo.com/contacto/).

## 📞 Soporte y Licencia

- **Issues**: [GitHub Issues](https://github.com/hub-env/hub-ui/issues)
- **Autor**: [Carlos Morcillo Fernández](https://www.carlosmorcillo.com)
- **Licencia**: MIT

---

Hecho con ❤️ por el equipo de Hub UI
