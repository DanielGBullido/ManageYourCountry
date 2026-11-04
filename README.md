# España en tus manos

Web cívica para explorar los ingresos y gastos públicos de España con datos oficiales y probar otros repartos del gasto.

- Guía visual y de voz: [`DESIGN_GUIDE.md`](./DESIGN_GUIDE.md)
- Fuentes, metodología y criterios de lectura: [`DATA_SOURCES.md`](./DATA_SOURCES.md)
- Contexto y reglas para futuras IA: [`AI_CONTEXT.md`](./AI_CONTEXT.md)

## Qué hace

- Muestra las cuentas mensuales de la IGAE (Administración central, comunidades autónomas y Seguridad Social; sin ayuntamientos), en contabilidad nacional SEC 2010, junto con la deuda PDE del Banco de España del mismo mes.
- Permite elegir el mes (`?mes=AAAA-MM`) y ver en el simulador solo ese mes, el **acumulado del año** de enero al mes elegido (`?vista=acumulado`) o el **gasto por función** (sanidad, educación, defensa…) de un año completo y de todas las administraciones, ayuntamientos incluidos (`?vista=funciones`).
- Ofrece un **simulador de reparto**. Por defecto, el tope son los ingresos y el dinero que no se asigna queda sin repartir. Con **«Permitir déficit»** se puede gastar más de lo que entra, y se muestra cuánto habría que pedir prestado. Los escenarios se comparten por URL (`?reparto=…&deficit=1`).
- La sección **«España en contexto»** muestra, con datos anuales de Eurostat, el déficit y la deuda en % del PIB desde 2015 frente a la UE-27, el gasto por función frente a la media europea y el saldo de cada nivel de administración (Estado, comunidades, ayuntamientos y Seguridad Social).
- Cada enlace compartido tiene su propia vista previa (título, descripción e imagen generada en `/og`) con el saldo del escenario y sus mayores cambios.
- Tiene **modo oscuro** automático según el sistema y cumple WCAG AA de contraste en los dos modos (comprobado con axe).
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
- Estilos, en orden de carga: `app/base.css` (variables y estilos base), `app/components.css` (componentes y ajustes adaptativos), `app/spacing.css` (escala de espacios y ritmo de lectura), `app/dark.css` (modo oscuro, **generado** con `npm run styles:dark`; no se edita a mano) y `app/viz-colors.css` (colores de los gráficos para cada modo, validados a mano).
- Las fuentes (Manrope, DM Sans, DM Mono) se sirven desde la propia web con `next/font`; el navegador no contacta con Google.

## Datos y actualización

Las cifras viven en `data/` con su fuente y periodo; la app no consulta las series en directo, salvo los límites del mapa (IGN).

- `scripts/refresh-igae.mjs` (`npm run data:refresh`) descarga el último PDF mensual de la IGAE, extrae la tabla con `pdftotext` (Poppler) y valida sumas y saldo. Solo avanza a un mes nuevo cuando AEAT, prestaciones y comunidades ya tienen ese mes validado (mostrado o archivado en `data/history/<fuente>/`), y guarda fuente, SHA-256 y una copia en `data/history/igae/`. Esa carpeta se crea la primera vez que se importa un PDF nuevo.
- `scripts/refresh-aeat.mjs` (`npm run data:refresh:aeat`) lee el [catálogo del Informe mensual de recaudación tributaria](https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Informe_mensual_de_Recaudacion_Tributaria.shtml), descarga el último PDF y extrae los ingresos tributarios netos del mes (cuadro 1.1, «TOTAL GENERAL»). Lo comprueba con el título del mes, las sumas por administración y capítulo y el cuadro 1.3 en miles de euros. Solo actualiza `latestMonthly` en `data/recaudacion-tributaria-2025.json`, siempre con el mismo mes que la IGAE; los meses posteriores se archivan en `data/history/aeat/` con su SHA-256. La procedencia del dato mostrado está en `data/provenance/aeat-latest.json`.
- Prestaciones y comunidades tienen un importador por fuente, con el mismo patrón que la AEAT (lectura de Excel oficial sin dependencias en `scripts/lib/xlsx-reader.mjs`):

  | Comando | Fuente oficial | Escribe |
  | --- | --- | --- |
  | `npm run data:refresh:pensiones` | Seguridad Social · [Pensiones contributivas en vigor](https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST24), libro `S<AAAAMM>.xlsx` | ficha `pensions` |
  | `npm run data:refresh:pnc` | Imserso · [Pensiones no contributivas](https://imserso.es/el-imserso/documentacion/estadisticas/pensiones-no-contributivas-jubilacion-incapacidad-pnc), `evolpncs.xlsx` | ficha `non-contributory-pensions` |
  | `npm run data:refresh:imv` | INSS · [sección IMV de la revista de la Seguridad Social](https://revista.seg-social.es/imv), `AAAAMM_IMV - Nómina.xlsx` | ficha `imv` |
  | `npm run data:refresh:paro` | Ministerio de Trabajo · [Estadística de Prestaciones por Desempleo (PRD)](https://www.mites.gob.es/es/estadisticas/prestaciones_SS_otra_proteccion/PRD/welcome.htm), datos del SEPE | ficha `unemployment` |
  | `npm run data:refresh:ccaa` | IGAE · [Administración regional por comunidad](https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/imnofinancierasCA.aspx), `M_CCAA_Sub_Det_AAAA.xlsx` | `igaeMonthly` y columnas `igaeMonthly*` de `data/comunidades-autonomicas.json` |

  Cada uno valida sumas y periodo, archiva en `data/history/<fuente>/` todos los meses iguales o posteriores al de la IGAE y solo escribe el mes de `data/igae-latest.json`. La procedencia del dato mostrado (URL, catálogo, SHA-256, fecha de descarga, lector y tabla) está en `data/provenance/<fuente>-latest.json`. `npm run data:refresh:auxiliares` lanza los seis importadores auxiliares (AEAT incluida).
- `scripts/refresh-eurostat-anual.mjs` (`npm run data:refresh:eurostat`) descarga de Eurostat (`gov_10a_main` y `gov_10a_exp`) los ingresos anuales de todas las Administraciones públicas del mismo año que `data/gasto-funcional-2024.json`. Comprueba que las funciones COFOG coinciden con ese fichero y guarda `data/cuentas-anuales-aapp.json` con las huellas de la descarga.
- `scripts/refresh-eurostat-contexto.mjs` (`npm run data:refresh:contexto`) descarga de Eurostat (`gov_10a_main`, `gov_10dd_edpt1`, `gov_10a_exp`) las series de «España en contexto» desde 2015. Comprueba que ingresos − gastos cuadra con el saldo cada año y que los saldos de los cuatro niveles de administración suman el total. Guarda `data/contexto-eurostat.json` con las huellas de cada descarga.
- `npm run data:snapshot` archiva el mes en `data/dashboard-periods.json` solo si todas las fuentes mensuales coinciden.
- El workflow semanal [`.github/workflows/refresh-official-data.yml`](.github/workflows/refresh-official-data.yml) encadena estos pasos: primero archiva lo nuevo de cada serie auxiliar, después intenta avanzar la IGAE y, si avanza, vuelve a lanzar las series auxiliares para que escriban el mismo mes. El dato que más tarda es el gasto en paro: la PRD lo publica un mes después que los beneficiarios.

## Comandos

```bash
npm run test:e2e          # compila y prueba la interfaz con Playwright: escritorio, móvil, modo oscuro y accesibilidad (axe)
npm run styles:dark       # regenera app/dark.css tras cambiar colores
npm test                  # reglas del simulador, vista acumulada, parsers IGAE, AEAT, prestaciones y comunidades, y periodos
npm run validate:data     # sumas, fuentes, procedencia y periodos de data/
npm run data:refresh      # IGAE (requiere internet y pdftotext de Poppler)
npm run data:refresh:aeat # AEAT (requiere internet y pdftotext de Poppler)
npm run data:refresh:auxiliares # AEAT, pensiones, PNC, IMV, paro y comunidades (requiere internet)
npm run data:refresh:eurostat   # ingresos anuales y población (Eurostat)
npm run data:refresh:contexto   # «España en contexto» (Eurostat)
npm run build
```

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) ejecuta en cada push los tests, la validación de datos, la comprobación del tema oscuro y las pruebas de interfaz. En local, la primera vez, `npx playwright install chromium` descarga el navegador de pruebas.
