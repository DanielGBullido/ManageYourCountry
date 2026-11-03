# España en tus manos

Web cívica para explorar los ingresos y gastos públicos de España con datos oficiales y probar otros repartos del gasto.

- Guía visual y de voz: [`DESIGN_GUIDE.md`](./DESIGN_GUIDE.md)
- Fuentes, metodología y criterios de lectura: [`DATA_SOURCES.md`](./DATA_SOURCES.md)
- Contexto y reglas para futuras IA: [`AI_CONTEXT.md`](./AI_CONTEXT.md)

## Qué hace

- Muestra las cuentas mensuales de la IGAE (Administración central, comunidades autónomas y Seguridad Social; sin ayuntamientos), en contabilidad nacional SEC 2010, junto con la deuda PDE del Banco de España del mismo mes.
- Permite elegir el mes (`?mes=AAAA-MM`) y ver en el simulador solo ese mes o el **acumulado del año** de enero al mes elegido (`?vista=acumulado`).
- Ofrece un **simulador de reparto**. Por defecto, el tope son los ingresos y el dinero que no se asigna queda sin repartir. Con **«Permitir déficit»** se puede gastar más de lo que entra, y se muestra cuánto habría que pedir prestado. Los escenarios se comparten por URL (`?reparto=…&deficit=1`).
- Añade como contexto prestaciones, empleo, población, impuestos anuales, gasto por funciones y un mapa autonómico. Cada serie conserva su propio periodo y no se suma al mes.

## Stack y ejecución

Next.js 16 (App Router), React 19 y TypeScript. Requiere Node.js 20.9 o superior. Sin librerías de componentes ni de gráficos: el gráfico circular usa `conic-gradient`.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Estructura

- `app/page.tsx` compone la página. Los datos locales se tipan en `app/lib/dashboard-data.ts`.
- `app/components/DashboardExperience.tsx` controla el mes y la vista (mes o acumulado).
- `app/components/sections/` contiene un componente por bloque; el simulador está en `sections/budget/`. Solo el simulador, el mapa y la navegación necesitan estado en el navegador.
- `app/lib/budget-scenario.ts` tiene las reglas del simulador como funciones puras: topes, déficit, dinero sin repartir, gráfico y escenarios compartidos.
- `app/lib/year-to-date.ts` suma los meses archivados para la vista acumulada.
- `app/lib/format.ts` reúne los formatos numéricos en español de España.
- Estilos, en orden de carga: `app/base.css` (variables y estilos base), `app/components.css` (componentes y ajustes adaptativos) y `app/spacing.css` (escala de espacios y ritmo de lectura, que se aplica al final).

## Datos y actualización

Las cifras viven en `data/` con su fuente y periodo; la app no consulta las series en directo, salvo los límites del mapa (IGN).

- `scripts/refresh-igae.mjs` (`npm run data:refresh`) descarga el último PDF mensual de la IGAE, extrae la tabla con `pdftotext` (Poppler) y valida sumas y saldo. Además comprueba que el mes coincida con AEAT y prestaciones, y guarda fuente, SHA-256 y una copia en `data/history/igae/`. Esa carpeta se crea la primera vez que se importa un PDF nuevo.
- `npm run data:snapshot` archiva el mes en `data/dashboard-periods.json` solo si todas las fuentes mensuales coinciden.
- El workflow semanal [`.github/workflows/refresh-official-data.yml`](.github/workflows/refresh-official-data.yml) encadena ambos pasos. AEAT, prestaciones y comunidades todavía se actualizan a mano: mientras no se actualicen, no aparece un mes nuevo.

## Comandos

```bash
npm test               # reglas del simulador, vista acumulada, parser IGAE y periodos
npm run validate:data  # sumas, fuentes y periodos de data/
npm run build
```
